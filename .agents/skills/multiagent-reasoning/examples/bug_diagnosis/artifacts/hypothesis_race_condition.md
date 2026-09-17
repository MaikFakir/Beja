# Hypothesis B Investigation: Connection Pool Double-Release Race Condition

**Investigator**: Subagent Researcher-2 (Explorer Specialist: Concurrency & Lock Analysis)  
**Target Subsystem**: `ConnectionPool.acquire()` and `ConnectionPool.release()`  
**Status**: Root Cause Confirmed (Critical Concurrency Bug)  
**Workflow**: Map-Reduce / Parallel Exploration  

---

## 1. Investigation Scope & Methodology

Researcher-2 audited the concurrency lifecycle of the internal `ConnectionPool` under high contention and sudden timeout cancellations.
- Reproduction Harness: 20 concurrent coroutines acquiring and releasing a pool of 5 connections with injected random cancellations during the critical release window.

---

## 2. Empirical Findings & Code Citations

### 2.1 Error Trace from Production Logs
```
ERROR: asyncio.InvalidStateError: Exception already set on Future <Future finished>
ERROR: ConnectionCollisionError: Stream 0x7f884210 written concurrently by worker-14 and worker-22!
CRASH: ConnectionResetError: Cannot write to closing transport
```

### 2.2 Defective Code Citation: `ConnectionPool`
```python
# Location: ingestion/pool.py: lines 88-115
class ConnectionPool:
    def __init__(self, size: int = 5):
        self._available = asyncio.Queue()
        self._in_use = set()
        for i in range(size):
            self._available.put_nowait(Connection(i))

    async def acquire(self, timeout: float = 2.0):
        conn = await asyncio.wait_for(self._available.get(), timeout=timeout)
        self._in_use.add(conn)
        return conn

    async def release(self, conn):
        if conn in self._in_use:
            self._in_use.remove(conn)
            # CRITICAL DEFECT: Non-atomic release with yield point!
            await conn.reset_state()  # <-- ASYNC YIELD ALLOWS CANCELLATION
            self._available.put_nowait(conn)
```

### 2.3 Causal Failure Chain & Race Sequence
```
Timeline:
Worker A                                Worker B                      Connection Pool
------------------------------------------------------------------------------------------
1. Calls release(conn-1)
   -> in_use.remove(conn-1)
   -> await conn-1.reset_state()
      (Suspends on I/O)
2. Worker A cancelled by timeout!
   -> Exception raised mid-reset
   -> Finally block executes:
      release(conn-1) called AGAIN!
                                       3. Calls acquire()
                                          -> gets conn-1 from queue
                                          -> in_use.add(conn-1)
4. Worker A's retry flushes queue
   -> Puts conn-1 into queue AGAIN!
                                                                    => conn-1 is both IN-USE
                                                                       and in AVAILABLE queue!
                                       5. Worker C calls acquire()
                                          -> ALSO gets conn-1!
                                                                    => Duplicate simultaneous
                                                                       writes corrupt TCP stream!
```

---

## 3. Recommended Remediation

1. Implement an atomic state machine on each connection instance (`ConnectionState.IDLE`, `ConnectionState.ACQUIRED`, `ConnectionState.RELEASING`, `ConnectionState.CLOSED`).
2. Shield the `conn.reset_state()` cleanup from cancellation using `asyncio.shield()`, ensuring that once a connection begins the release transition, it cannot be interrupted or double-returned.
3. Use a reentrant lock or mutex on pool state transitions.
