/**
 * Archivo histórico de incidentes en la nube (colección Firestore `incident_history`).
 *
 * Cuando una alerta sale de la colección de activos (`incidents`) —porque expiró, la atendió una
 * patrulla, se resolvió o se descartó como falsa— se guarda aquí un registro ANÓNIMO: ubicación,
 * categoría, tiempos del ciclo de vida y conteos de consenso, pero nunca los IDs, notas ni datos de
 * los ciudadanos que reportaron (Ley 1581 de 2012). Esta colección alimenta el mapa de calor
 * compartido y es la base para estadísticas y exportación de datos.
 *
 * Lo cargan tanto index.html (app ciudadana) como admin.html (panel), antes de sus bundles.
 */
(function () {
  const COLLECTION = 'incident_history';
  const LIMIT = 1500; // registros más recientes que se cargan para el mapa de calor
  const SCHEMA_VERSION = 1;
  // IDs de los bots de simulación / Inyector Masivo / Modo Pincel del panel y de la app.
  const SIMULATED_USER_RE = /^(bot|paint_bot_|sim_bot_)/i;

  const minutesBetween = (from, to) => (from && to ? Math.round(((to - from) / 60000) * 10) / 10 : null);

  function buildRecord(inc, finalStatus) {
    const createdAt = Number(inc.createdAt) || Date.now();
    const created = new Date(createdAt);
    const hour = created.getHours();
    const reporters = Array.isArray(inc.reporters) ? inc.reporters : [];
    const refutations = Array.isArray(inc.refutations) ? inc.refutations : [];
    const criticalStartedAt = inc.criticalStartedAt || null;
    const dispatchedAt = (inc.assignedUnit && inc.assignedUnit.dispatchedAt) || null;
    const patrolAttendedAt = inc.patrolAttendedAt || null;
    const wasCritical = !!(criticalStartedAt || inc.decayedFromCritical ||
      inc.status === 'CRITICAL_SWARM' || inc.status === 'DISPATCHED');

    let heatWeight = 0.5;
    if (finalStatus === 'FALSE_ALARM') heatWeight = 0; // no pinta zonas con alertas desmentidas
    else if (wasCritical) heatWeight = 0.9;
    else if (patrolAttendedAt) heatWeight = 0.7;

    return {
      id: inc.id,
      lat: Number(inc.lat),
      lng: Number(inc.lng),
      category: inc.category || 'GENERAL',
      finalStatus,
      lastStatus: inc.status || null,
      createdAt,
      archivedAt: Date.now(),
      criticalStartedAt,
      reactivatedAt: inc.reactivatedAt || null,
      dispatchedAt,
      patrolAttendedAt,
      wasCritical,
      wasReactivated: !!inc.reactivatedAt,
      reportCount: reporters.length,
      refutationCount: refutations.length,
      consensusWeight: Number(inc.consensusWeight) || 0,
      minutesToCritical: minutesBetween(createdAt, criticalStartedAt),
      minutesToDispatch: minutesBetween(createdAt, dispatchedAt),
      minutesToAttend: minutesBetween(createdAt, patrolAttendedAt),
      hour,
      dayOfWeek: created.getDay(),
      timeOfDay: hour >= 19 || hour <= 5 ? 'NIGHT' : 'DAY',
      heatWeight,
      simulated: reporters.length > 0 && reporters.every(r => SIMULATED_USER_RE.test(String(r.userId || ''))),
      schemaVersion: SCHEMA_VERSION
    };
  }

  /**
   * Escribe el registro histórico de un incidente antes de borrarlo de `incidents`.
   * Lanza el error de Firestore si falla, para que el llamador decida si reintentar.
   */
  async function archive(db, id, finalStatus, localSnapshot) {
    const cloudSnap = await db.collection('incidents').doc(id).get();
    const historyRef = db.collection(COLLECTION).doc(id);
    let data;
    if (cloudSnap.exists) {
      data = { ...(localSnapshot || {}), ...cloudSnap.data(), id };
      // Las refutaciones pueden existir solo en local (el descarte por consenso no las sube antes de borrar).
      const localRefs = localSnapshot && Array.isArray(localSnapshot.refutations) ? localSnapshot.refutations : [];
      if (localRefs.length > (Array.isArray(data.refutations) ? data.refutations.length : 0)) {
        data.refutations = localRefs;
      }
    } else {
      // Otro dispositivo ya lo sacó de activos: solo lo archivamos si nadie lo hizo todavía.
      if (!localSnapshot) return;
      const existing = await historyRef.get();
      if (existing.exists) return;
      data = { ...localSnapshot, id };
    }
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return;
    await historyRef.set(buildRecord(data, finalStatus), { merge: true });
  }

  /** Todos los registros (para exportar), del más reciente al más antiguo. */
  async function fetchAll(db) {
    const snap = await db.collection(COLLECTION).orderBy('archivedAt', 'desc').get();
    const list = [];
    snap.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
    return list;
  }

  const CSV_COLUMNS = [
    'id', 'category', 'finalStatus', 'lat', 'lng', 'createdAt', 'archivedAt', 'hour', 'dayOfWeek',
    'timeOfDay', 'wasCritical', 'wasReactivated', 'reportCount', 'refutationCount', 'consensusWeight',
    'minutesToCritical', 'minutesToDispatch', 'minutesToAttend', 'simulated'
  ];

  function toCsv(records) {
    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const iso = (ms) => (ms ? new Date(ms).toISOString() : '');
    const rows = records.map(r => CSV_COLUMNS.map(col =>
      esc(col === 'createdAt' || col === 'archivedAt' ? iso(r[col]) : r[col])).join(','));
    return [CSV_COLUMNS.join(','), ...rows].join('\n');
  }

  window.BejaIncidentHistory = { COLLECTION, LIMIT, buildRecord, archive, fetchAll, toCsv };
})();
