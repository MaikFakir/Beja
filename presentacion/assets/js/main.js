/* Beja · interacción y render de contenido (lee window.BEJA desde contenido.js) */
(function () {
  "use strict";
  const C = window.BEJA || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const get = (path, o = C) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  const fmt = (n, d = 0) => n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });

  /* ---------- 1. enlazado de contenido ---------- */
  function bindAll(root = document) {
    $$("[data-t]", root).forEach((el) => { const v = get(el.dataset.t); if (v != null) el.innerHTML = v; });
    $$("[data-src]", root).forEach((el) => { const v = get(el.dataset.src); if (v) el.src = v; });
    $$("[data-href]", root).forEach((el) => { const v = get(el.dataset.href); if (v) el.href = v; });
    $$("[data-flist-root]", root).forEach((ul) => { ul.innerHTML = (get(ul.dataset.flistRoot) || []).map((i) => `<li>${i}</li>`).join(""); });
  }
  function countHTML(valor, sufijo) {
    return `<span class="cv" data-count="${esc(valor)}">${valor}</span>${sufijo ? `<span class="suf">${sufijo}</span>` : ""}`;
  }
  function fillItem(node, item) {
    $$("[data-f]", node).forEach((el) => { const v = item[el.dataset.f]; el.innerHTML = v == null ? "" : v; });
    $$("[data-fcount]", node).forEach((el) => { el.innerHTML = countHTML(item[el.dataset.fcount], item.sufijo); });
    $$("[data-fvar]", node).concat(node.matches && node.matches("[data-fvar]") ? [node] : []).forEach((el) => el.style.setProperty("--v", item[el.dataset.fvar]));
    $$("[data-fpct]", node).forEach((el) => { el.textContent = fmt(+item[el.dataset.fpct], 1) + "%"; });
    $$("[data-flist]", node).forEach((el) => { el.innerHTML = (item[el.dataset.flist] || []).map((i) => `<li>${i}</li>`).join(""); });
    const all = [node, ...$$("*", node)];
    all.forEach((el) => {
      if (!el.dataset) return;
      if (el.dataset.fclass) el.classList.add(item[el.dataset.fclass]);
      if (el.dataset.fflag && item[el.dataset.fflag]) el.classList.add("flag");
      if (el.dataset.ficon) el.setAttribute("href", "#i-" + (item[el.dataset.ficon] || "hex"));
    });
  }
  function renderLists(root = document) {
    $$("[data-list]", root).forEach((box) => {
      const tpl = document.getElementById(box.dataset.tpl);
      const data = get(box.dataset.list) || [];
      box.innerHTML = "";
      data.forEach((item) => {
        const frag = tpl.content.cloneNode(true);
        const node = frag.firstElementChild;
        fillItem(node, item);
        box.appendChild(frag);
      });
    });
  }

  /* ---------- 2. ciudad procedimental (canvas) ---------- */
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const HOT = [ // puntos calientes en coordenadas normalizadas
    [.22, .30, 1], [.35, .52, .8], [.48, .36, 1.2], [.58, .62, .9], [.66, .30, .7], [.30, .76, .8], [.74, .52, 1.1], [.14, .58, .6], [.52, .82, .7], [.84, .72, .6], [.42, .18, .6], [.62, .46, .8]
  ];
  const TRACK = [[.34, .34], [.64, .56], [.42, .70], [.70, .28]];
  function drawCity(cv) {
    const mode = cv.dataset.city;
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const x = cv.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = r.width, H = r.height, R = rng(mode === "before" ? 7 : mode === "track" ? 21 : mode === "phone2" ? 33 : 7);
    const before = mode === "before";
    x.fillStyle = before ? "#07090f" : "#070b14"; x.fillRect(0, 0, W, H);

    // cerros orientales (zona verde)
    if (mode !== "track") {
      x.save();
      x.beginPath(); x.moveTo(W * .78, 0);
      for (let i = 0; i <= 12; i++) { const yy = H * i / 12; x.lineTo(W * (.74 + .06 * Math.sin(i * 1.3) + .03 * R()), yy); }
      x.lineTo(W, H); x.lineTo(W, 0); x.closePath();
      x.fillStyle = before ? "#0c1011" : "#0b1a15"; x.fill();
      x.clip();
      x.strokeStyle = before ? "rgba(120,130,140,.08)" : "rgba(46,230,166,.09)"; x.lineWidth = 1;
      for (let k = 0; k < 14; k++) { x.beginPath(); for (let i = 0; i <= 20; i++) { const yy = H * i / 20, xx = W * (.8 + k * .018) + 10 * Math.sin(i * .9 + k); i ? x.lineTo(xx, yy) : x.moveTo(xx, yy); } x.stroke(); }
      x.restore();
    }
    // manzanas y calles con rotación
    const ang = -0.2, sp = mode === "phone2" || mode === "hero" ? 22 : 30;
    x.save(); x.translate(W / 2, H / 2); x.rotate(ang);
    const D = Math.hypot(W, H);
    for (let gx = -D / 2; gx < D / 2; gx += sp) {
      for (let gy = -D / 2; gy < D / 2; gy += sp * .8) {
        if (R() < .82) { x.fillStyle = before ? `rgba(110,120,140,${.05 + R() * .05})` : `rgba(120,150,210,${.05 + R() * .07})`; x.fillRect(gx + 3, gy + 3, sp - 6, sp * .8 - 6); }
      }
    }
    let i = 0;
    for (let gx = -D / 2; gx < D / 2; gx += sp, i++) { x.strokeStyle = i % 5 === 0 ? (before ? "#1d222c" : "#26314a") : (before ? "#11151c" : "#141c2c"); x.lineWidth = i % 5 === 0 ? 3 : 1; x.beginPath(); x.moveTo(gx, -D / 2); x.lineTo(gx, D / 2); x.stroke(); }
    i = 0;
    for (let gy = -D / 2; gy < D / 2; gy += sp * .8, i++) { x.strokeStyle = i % 6 === 0 ? (before ? "#1d222c" : "#26314a") : (before ? "#11151c" : "#141c2c"); x.lineWidth = i % 6 === 0 ? 3 : 1; x.beginPath(); x.moveTo(-D / 2, gy); x.lineTo(D / 2, gy); x.stroke(); }
    x.restore();
    // avenida diagonal (tipo autopista)
    x.strokeStyle = before ? "#2a2c30" : "#4a3a1e"; x.lineWidth = 7; x.lineCap = "round";
    x.beginPath(); x.moveTo(-10, H * .95); x.bezierCurveTo(W * .3, H * .6, W * .45, H * .35, W * .7, -10); x.stroke();
    x.strokeStyle = before ? "#1a1c20" : "rgba(245,165,36,.25)"; x.lineWidth = 1.5; x.stroke();

    const pts = HOT.map(([a, b, s]) => [a * W, b * H, s]);
    if (before) {
      // solo lo denunciado: unos pocos puntos azules
      [0, 3, 6, 9].forEach((k) => {
        const [px, py] = pts[k];
        x.fillStyle = "rgba(47,123,255,.18)"; x.beginPath(); x.arc(px, py, 14, 0, 7); x.fill();
        x.fillStyle = "#6f9cff"; x.beginPath(); x.arc(px, py, 4, 0, 7); x.fill();
      });
      x.fillStyle = "rgba(4,6,11,.25)"; x.fillRect(0, 0, W, H);
      return;
    }
    // mapa de calor
    const heat = mode === "track" ? pts.slice(0, 5) : pts;
    x.globalCompositeOperation = "lighter";
    heat.forEach(([px, py, s]) => {
      const rr = Math.min(W, H) * (mode === "hero" || mode === "phone2" ? .16 : .13) * s;
      let g = x.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, "rgba(255,90,60,.55)"); g.addColorStop(.35, "rgba(255,77,106,.28)"); g.addColorStop(1, "rgba(255,77,106,0)");
      x.fillStyle = g; x.beginPath(); x.arc(px, py, rr, 0, 7); x.fill();
      g = x.createRadialGradient(px, py, 0, px, py, rr * .35);
      g.addColorStop(0, "rgba(255,170,40,.7)"); g.addColorStop(1, "rgba(255,170,40,0)");
      x.fillStyle = g; x.beginPath(); x.arc(px, py, rr * .35, 0, 7); x.fill();
    });
    // zonas verificadas
    [[.12, .2], [.8, .4], [.45, .6]].forEach(([a, b]) => {
      const px = a * W, py = b * H, rr = Math.min(W, H) * .07;
      const g = x.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, "rgba(46,230,166,.35)"); g.addColorStop(1, "rgba(46,230,166,0)");
      x.fillStyle = g; x.beginPath(); x.arc(px, py, rr, 0, 7); x.fill();
    });
    x.globalCompositeOperation = "source-over";
    // ruta segura
    if (mode !== "track") {
      x.strokeStyle = "#f5a524"; x.lineWidth = 3; x.setLineDash([]); x.shadowColor = "#f5a524"; x.shadowBlur = 10;
      x.beginPath(); x.moveTo(W * .08, H * .92); x.lineTo(W * .08, H * .66); x.lineTo(W * .26, H * .62); x.lineTo(W * .4, H * .44); x.lineTo(W * .42, H * .26); x.lineTo(W * .6, H * .16); x.stroke();
      x.shadowBlur = 0;
      x.fillStyle = "#fff"; x.beginPath(); x.arc(W * .08, H * .92, 5, 0, 7); x.fill();
      x.fillStyle = "#f5a524"; x.beginPath(); x.arc(W * .6, H * .16, 6, 0, 7); x.fill();
    }
    // marcadores numerados
    x.font = "600 10px JetBrains Mono, monospace"; x.textAlign = "center"; x.textBaseline = "middle";
    const marks = mode === "track" ? TRACK.map(([a, b]) => [a * W, b * H]) : pts.slice(0, mode === "hero" || mode === "phone2" ? 7 : 12);
    marks.forEach(([px, py], k) => {
      x.fillStyle = "rgba(255,77,106,.95)"; x.beginPath(); x.arc(px, py, 8, 0, 7); x.fill();
      x.strokeStyle = "rgba(255,255,255,.7)"; x.lineWidth = 1.2; x.stroke();
      x.fillStyle = "#fff"; x.fillText(String((k % 5) + 1), px, py + .5);
    });
  }
  function drawAllCities() { $$("canvas.city").forEach(drawCity); }

  /* ---------- 3. red de la colmena (hero) ---------- */
  function heroNet() {
    const cv = $("#heroNet"); if (!cv) return;
    const x = cv.getContext("2d");
    let W, H, nodes = [], pulses = [], mouse = { x: -999, y: -999 }, run = true, dpr = Math.min(devicePixelRatio || 1, 2);
    function size() {
      const r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(90, Math.round((W * H) / 15000));
      const R = rng(3);
      nodes = Array.from({ length: n }, () => ({ x: R() * W, y: R() * H, vx: (R() - .5) * .25, vy: (R() - .5) * .25, h: R() < .22 }));
    }
    function frame() {
      if (!run) return;
      x.clearRect(0, 0, W, H);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1; if (n.y < 0 || n.y > H) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 150) { x.strokeStyle = `rgba(${a.h || b.h ? "245,165,36" : "120,160,255"},${(1 - d / 150) * .22})`; x.lineWidth = 1; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); }
        }
        const md = Math.hypot(a.x - mouse.x, a.y - mouse.y), near = md < 160;
        x.fillStyle = a.h ? "#f5a524" : near ? "#cfe0ff" : "rgba(141,184,255,.6)";
        x.beginPath(); x.arc(a.x, a.y, a.h ? 2.4 : near ? 2.2 : 1.5, 0, 7); x.fill();
        if (near) { x.strokeStyle = `rgba(245,165,36,${(1 - md / 160) * .5})`; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(mouse.x, mouse.y); x.stroke(); }
      }
      pulses = pulses.filter((p) => p.t < 1);
      for (const p of pulses) {
        p.t += .012;
        x.strokeStyle = `rgba(${p.c},${(1 - p.t) * .7})`; x.lineWidth = 1.5;
        x.beginPath(); x.arc(p.x, p.y, 8 + p.t * 90, 0, 7); x.stroke();
      }
      requestAnimationFrame(frame);
    }
    size(); addEventListener("resize", size);
    if (reduce) { run = true; frame(); run = false; return; }
    setInterval(() => { const n = nodes[(Math.random() * nodes.length) | 0]; if (n) pulses.push({ x: n.x, y: n.y, t: 0, c: Math.random() < .5 ? "255,77,106" : "245,165,36" }); }, 1400);
    const hero = $("#inicio");
    hero.addEventListener("pointermove", (e) => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener("pointerleave", () => { mouse.x = mouse.y = -999; });
    new IntersectionObserver(([en]) => { const was = run; run = en.isIntersecting; if (run && !was) frame(); }).observe(hero);
    frame();
  }

  /* ---------- 4. renders específicos ---------- */
  function renderHero() {
    $("#heroChips").innerHTML = (get("hero.chips") || []).map((c, i) => `<span class="fchip ${c.tipo} float-${"abc"[i % 3]}"><i></i>${c.texto}</span>`).join("");
    const words = ["DANE · ECSC 2024", "Ley 1581 de 2012", "Policía Nacional · Cuadrantes", "FONSET · FONSECON", "SECOP II", "Red Cómo Vamos 2025", "CCB · EPV 2025", "PWA sin descarga", "Motor de consenso comunitario", "Mapa de calor histórico"];
    const row = words.map((w) => `<span>${w}</span>`).join("");
    $("#marquee").innerHTML = row + row;
  }
  function renderNavs() {
    const secs = $$("main > section[id]");
    $("#sideDots").innerHTML = secs.map((s) => `<a href="#${s.id}" aria-label="${s.dataset.label}"><span>${s.dataset.label}</span></a>`).join("");
    $("#indexList").innerHTML = secs.filter((s) => s.id !== "inicio").map((s, i) => {
      const t = ($(".sec-head .eyebrow span:last-child", s) || {}).textContent || s.dataset.label;
      return `<li><a href="#${s.id}" data-close-index><span class="mono">${String(i + 1).padStart(2, "0")}</span>${t}</a></li>`;
    }).join("");
  }
  function renderDocs() {
    const docs = get("legal.documentos") || [];
    $("#docStack").innerHTML = `<div class="hex-tile t4 ghost float-b" style="left:40%;top:0"></div><div class="hex-tile t5 ghost float-c" style="left:48%;bottom:4%;top:auto"></div>` +
      docs.map((d) => `<button class="doc-card" data-doc="${d.id}" aria-label="Abrir ${esc(d.titulo)}">
        <img src="${d.totalPaginas ? d.paginas.replace("{n}", 1) : ""}" alt="" loading="lazy">
        <span class="doc-tag">${d.etiqueta || ""}</span>
        <span class="doc-meta"><b>${d.titulo}</b><small>${d.descripcion}</small><span class="doc-open">${get("legal.textoBotonDocs")} <svg><use href="#i-arrow"/></svg></span></span>
      </button>`).join("");
    $$(".doc-card").forEach((b) => b.addEventListener("click", () => openDocs(b.dataset.doc)));
  }
  function renderQA() {
    const qs = get("demanda.preguntas") || [];
    const tabs = $("#qaTabs"), panel = $("#qaPanel");
    tabs.innerHTML = qs.map((q, i) => `<button class="qa-tab" role="tab" aria-selected="${i === 0}" data-i="${i}"><span class="mono">Pregunta ${i + 1}</span>${q.pregunta}</button>`).join("");
    let cur = 0, auto = true;
    const show = (i) => {
      cur = i; const q = qs[i];
      $$(".qa-tab", tabs).forEach((t, k) => t.setAttribute("aria-selected", k === i));
      panel.innerHTML = `<div class="qa-in"><p class="qa-q">${q.pregunta}</p><div class="qa-dato"><b>${q.dato}</b><span>${q.datoTexto}</span></div><p class="qa-concl">${q.conclusion}</p></div>`;
    };
    tabs.addEventListener("click", (e) => { const b = e.target.closest(".qa-tab"); if (b) { auto = false; show(+b.dataset.i); } });
    show(0);
    if (!reduce) setInterval(() => { if (auto && isVisible(panel)) show((cur + 1) % qs.length); }, 7000);
  }
  function renderSpectrum() {
    const st = get("competencia.espectro") || [], act = get("competencia.espectroActivo") || 0;
    $("#specStops").innerHTML = st.map((s, i) => `<span class="${i === act ? "on" : ""}">${s}</span>`).join("");
    $("#specStops").style.gridTemplateColumns = `repeat(${st.length},1fr)`;
    $("#spectrum").dataset.target = ((act + .5) / st.length) * 100;
  }
  function renderTable() {
    const cols = get("competencia.columnas") || [], rows = get("competencia.competidores") || [], L = get("competencia.leyenda") || {};
    const mk = (v) => `<span class="mk ${v}" title="${L[v] || v}"></span><span class="sr" style="position:absolute;left:-9999px">${L[v] || v}</span>`;
    $("#compTable").innerHTML = `<thead><tr><th>Solución</th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>` +
      rows.map((r) => `<tr class="${r.tipo === "nosotros" ? "us" : ""}"><td>${r.nombre}${r.tipo !== "nosotros" ? `<span class="tipo">Competencia ${r.tipo.toLowerCase()}</span>` : ""}</td>${r.valores.map((v) => `<td>${mk(v)}</td>`).join("")}</tr>`).join("") + "</tbody>";
    const leg = document.createElement("div"); leg.className = "legend";
    leg.innerHTML = ["si", "parcial", "no"].map((k) => `<span><i class="mk ${k}"></i>${L[k]}</span>`).join("");
    $("#compTable").after(leg);
  }
  function renderBubbles() {
    const box = $("#dapBubbles"), d = get("consumidor.dap") || []; if (!box || !d.length) return;
    const W = box.clientWidth, H = box.clientHeight, max = Math.max(...d.map((i) => i.valor));
    const narrow = W < 520, base = H - (narrow ? 150 : 78), R2 = Math.min(base / 2 - 4, W * .3);
    const rs = d.map((i) => Math.max(R2 * Math.sqrt(i.valor / max), 4));
    const cx2 = W - R2 - 2, cx1 = cx2 - R2 - rs[1] - 26, cx0 = Math.max(64, cx1 - rs[1] - 110);
    const pos = [[cx0, base - rs[0]], [cx1, base - rs[1]], [cx2, base - R2]];
    const ratio = (v) => fmt(Math.round(v / d[0].valor)) + "× Beja";
    const lbl = (k, extra) => `<span class="bub-lbl l${k}" style="${narrow ? `left:0;top:${base + 12 + k * 46}px;width:100%` : `left:${pos[k][0] - (k === 2 ? 90 : 62)}px;top:${base + 12}px;width:${k === 2 ? 180 : 124}px;text-align:center`}"><b>${d[k].etiqueta}</b><span>${d[k].nombre}${extra ? " · " + extra : ""}</span></span>`;
    box.innerHTML = `<span class="bub-base" style="top:${base}px"></span>` + d.map((it, k) => `<span class="bub c${k}" style="width:${rs[k] * 2}px;height:${rs[k] * 2}px;left:${pos[k][0] - rs[k]}px;top:${pos[k][1] - rs[k]}px;transition-delay:${k * .25}s"></span>`).join("") +
      lbl(0) + lbl(1, ratio(d[1].valor)) + lbl(2, ratio(d[2].valor));
  }
  function renderCME() {
    const svg = $("#cmeChart"); if (!svg) return;
    const cf = get("precio.calculo.costoFijo") || 648, cv = get("precio.calculo.costoVariable") || 70;
    const Q = Array.from({ length: 10 }, (_, i) => i + 1), V = Q.map((q) => (cf + cv * q) / q);
    const L = 60, T = 20, Wd = 820, Hd = 270, ymax = Math.ceil(Math.max(...V) / 100) * 100;
    const sx = (q) => L + ((q - 1) / 9) * Wd, sy = (v) => T + Hd - (v / ymax) * Hd;
    let g = "";
    for (let v = 0; v <= ymax; v += 200) g += `<line class="grid" x1="${L}" x2="${L + Wd}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${L - 12}" y="${sy(v) + 4}" text-anchor="end">${v}</text>`;
    Q.forEach((q) => g += `<text x="${sx(q)}" y="${T + Hd + 24}" text-anchor="middle">${q}</text>`);
    g += `<text x="${L + Wd}" y="${T + Hd + 44}" text-anchor="end">ciudades implementadas (Q)</text>`;
    const d = V.map((v, i) => `${i ? "L" : "M"}${sx(Q[i])},${sy(v)}`).join(" ");
    const area = d + ` L${sx(10)},${sy(0)} L${sx(1)},${sy(0)} Z`;
    g += `<defs><linearGradient id="cmeG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f5a524" stop-opacity=".28"/><stop offset="1" stop-color="#f5a524" stop-opacity="0"/></linearGradient></defs>`;
    g += `<path d="${area}" fill="url(#cmeG)" opacity=".9"/>`;
    g += `<line x1="${L}" x2="${L + Wd}" y1="${sy(cv)}" y2="${sy(cv)}" stroke="#8db8ff" stroke-dasharray="5 6" stroke-opacity=".6"/><text x="${sx(5.5)}" y="${sy(cv) + 20}" text-anchor="middle" style="fill:#8db8ff">CV por ciudad = ${cv}</text>`;
    g += `<path class="draw" d="${d}" fill="none" stroke="#f5a524" stroke-width="3" stroke-linecap="round" style="filter:drop-shadow(0 0 6px rgba(245,165,36,.6))"/>`;
    V.forEach((v, i) => {
      const k = [0, 3, 9].includes(i);
      g += `<circle cx="${sx(Q[i])}" cy="${sy(v)}" r="${k ? 6 : 3.5}" fill="${k ? "#f5a524" : "#04060b"}" stroke="#f5a524" stroke-width="2"/>`;
      if (k) g += `<text x="${sx(Q[i]) + (i === 9 ? -10 : 12)}" y="${sy(v) - 14}" text-anchor="${i === 9 ? "end" : "start"}" style="fill:#eef2f8;font-size:13px">${fmt(Math.round(v))} M</text>`;
    });
    svg.innerHTML = g;
    const p = $(".draw", svg); p.style.setProperty("--len", p.getTotalLength());
  }
  function renderBE() {
    const c = get("precio.calculo") || { costoFijo: 648, precio: 250, costoVariable: 70 };
    const sP = $("#slP"), sV = $("#slV"); sP.value = c.precio; sV.value = c.costoVariable;
    const svg = $("#beChart");
    const draw = () => {
      const P = +sP.value, V = +sV.value, F = c.costoFijo, q = F / (P - V);
      [sP, sV].forEach((s) => s.style.setProperty("--p", ((s.value - s.min) / (s.max - s.min)) * 100 + "%"));
      $("#oP").textContent = `$${fmt(P)} M`; $("#oV").textContent = `$${fmt(V)} M`;
      $("#beFormula").innerHTML = `Q* = ${fmt(F)} / (${fmt(P)} − ${fmt(V)}) = <em>${fmt(q, 1)}</em>`;
      $("#beQ").textContent = fmt(q, 1); $("#beQr").textContent = `→ ${Math.ceil(q)} ciudades`;
      const L = 56, T = 16, Wd = 560, Hd = 330, qmax = 8;
      const ymax = Math.ceil(Math.max(P * qmax, F + V * qmax) / 500) * 500;
      const sx = (x) => L + (x / qmax) * Wd, sy = (y) => T + Hd - (y / ymax) * Hd;
      let g = "";
      for (let y = 0; y <= ymax; y += 500) g += `<line class="grid" x1="${L}" x2="${L + Wd}" y1="${sy(y)}" y2="${sy(y)}"/><text x="${L - 10}" y="${sy(y) + 4}" text-anchor="end">${fmt(y)}</text>`;
      for (let x = 0; x <= qmax; x++) g += `<text x="${sx(x)}" y="${T + Hd + 22}" text-anchor="middle">${x}</text>`;
      g += `<text x="${L + Wd}" y="${T + Hd + 40}" text-anchor="end">implementaciones (Q)</text>`;
      const qq = Math.min(q, qmax);
      g += `<path d="M${sx(0)},${sy(0)} L${sx(qq)},${sy(P * qq)} L${sx(qq)},${sy(F + V * qq)} L${sx(0)},${sy(F)}Z" fill="rgba(255,77,106,.12)"/>`;
      if (q < qmax) g += `<path d="M${sx(q)},${sy(P * q)} L${sx(qmax)},${sy(P * qmax)} L${sx(qmax)},${sy(F + V * qmax)}Z" fill="rgba(245,165,36,.16)"/>`;
      g += `<line x1="${sx(0)}" x2="${sx(qmax)}" y1="${sy(F)}" y2="${sy(F)}" stroke="#8d9ab0" stroke-dasharray="4 6"/><text x="${sx(qmax)}" y="${sy(F) - 8}" text-anchor="end">CF = ${fmt(F)}</text>`;
      g += `<line x1="${sx(0)}" y1="${sy(F)}" x2="${sx(qmax)}" y2="${sy(F + V * qmax)}" stroke="#8db8ff" stroke-width="2.5"/>`;
      g += `<line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(qmax)}" y2="${sy(P * qmax)}" stroke="#f5a524" stroke-width="3" style="filter:drop-shadow(0 0 6px rgba(245,165,36,.6))"/>`;
      g += `<text x="${sx(qmax) - 4}" y="${sy(P * qmax) + (P * qmax > F + V * qmax ? -10 : 18)}" text-anchor="end" style="fill:#f5a524">Ingresos (P·Q)</text>`;
      g += `<text x="${sx(qmax) - 4}" y="${sy(F + V * qmax) + (P * qmax > F + V * qmax ? 18 : -10)}" text-anchor="end" style="fill:#8db8ff">Costo total</text>`;
      if (q <= qmax && q > 0) {
        g += `<line x1="${sx(q)}" x2="${sx(q)}" y1="${sy(P * q)}" y2="${sy(0)}" stroke="#eef2f8" stroke-dasharray="3 5" stroke-opacity=".6"/>`;
        g += `<circle cx="${sx(q)}" cy="${sy(P * q)}" r="12" fill="rgba(245,165,36,.2)"/><circle cx="${sx(q)}" cy="${sy(P * q)}" r="6" fill="#f5a524" stroke="#04060b" stroke-width="2"/>`;
        g += `<text x="${sx(q) + 14}" y="${sy(P * q) - 12}" style="fill:#eef2f8;font-size:13px">Q* = ${fmt(q, 1)}</text>`;
      }
      g += `<text x="${sx(.3)}" y="${sy(F) - 30}" style="fill:#ff4d6a">pérdida</text>`;
      if (q < qmax - 1) g += `<text x="${sx(qmax - .3)}" y="${sy((P * qmax + F + V * qmax) / 2) + 4}" text-anchor="end" style="fill:#f5a524">utilidad</text>`;
      svg.innerHTML = g;
    };
    sP.addEventListener("input", draw); sV.addEventListener("input", draw); draw();
  }
  function renderCash() {
    const f = get("precio.flujo") || []; if (!f.length) return;
    const vals = f.flatMap((y) => [y.resultado, y.acumulado]);
    const mx = Math.max(0, ...vals), mn = Math.min(0, ...vals), H = 220, s = H / (mx - mn), z = mx * s;
    $("#cash").innerHTML = f.map((y, i) => {
      const hb = Math.abs(y.resultado) * s, ha = Math.abs(y.acumulado) * s;
      const bar = y.resultado >= 0 ? `top:${z - hb}px;height:${hb}px` : `top:${z}px;height:${hb}px`;
      const acc = y.acumulado >= 0 ? `top:${z - ha}px;height:${ha}px;transform-origin:bottom` : `top:${z}px;height:${ha}px;transform-origin:top`;
      return `<div class="cash-col"><div class="cash-plot"><span class="zero" style="top:${z}px"></span><span class="cash-bar ${y.resultado >= 0 ? "pos" : "neg"}" style="${bar};transition-delay:${i * .2}s"></span><span class="cash-acc" style="${acc}"></span></div>
        <h4>${y.anio}</h4><small>${y.fase}</small>
        <div class="cash-nums"><span>Ingresos ${fmt(y.ingresos)}</span><span>Costos ${fmt(y.costos)}</span></div>
        <div class="cash-nums"><span class="${y.resultado < 0 ? "n" : "p"}">Resultado ${y.resultado > 0 ? "+" : ""}${fmt(y.resultado)}</span><span class="a">Acumulado ${y.acumulado > 0 ? "+" : ""}${fmt(y.acumulado)}</span></div></div>`;
    }).join("");
    const leg = document.createElement("div"); leg.className = "cash-leg";
    leg.innerHTML = `<span><i style="background:#f5a524"></i>Resultado del año</span><span><i style="background:#ff4d6a"></i>Pérdida</span><span><i style="border:1px dashed #8db8ff;background:rgba(47,123,255,.15)"></i>Acumulado</span>`;
    $("#cash").before(leg);
  }
  function renderBrochures() {
    const L = get("brochures.lista") || [];
    $("#broRow").innerHTML = L.map((b) => {
      const img = b.totalPaginas ? b.paginas.replace("{n}", 1) : "";
      const single = b.totalPaginas === 1;
      const pn = `<span class="pn" style="background-image:url('${img}')"></span>`;
      return `<button class="bro rv" data-bro="${b.id}" aria-label="Ver brochure ${esc(b.titulo)}">
        <div class="bro-fold ${single ? "single" : ""}">${single ? pn : pn + pn + pn}</div>
        <div class="bro-info"><span class="mono">${b.publico}</span><h3>${b.titulo}</h3><p>${b.descripcion}</p><span class="go">${get("brochures.textoBoton")} <svg><use href="#i-arrow"/></svg></span></div>
      </button>`;
    }).join("");
    $$(".bro").forEach((b) => b.addEventListener("click", () => openBrochure(b.dataset.bro)));
  }
  function renderCycle() {
    const cy = get("web.ciclo") || [];
    const ico = { amarilla: "alert", roja: "alert", azul: "shield" };
    $("#cycleRow").innerHTML = cy.map((c) => `<article class="cyc ${c.color}"><span class="pinx"><svg><use href="#i-${ico[c.color] || "pin"}"/></svg></span><p class="mono muted">Alerta ${c.color}</p><h4>${c.nombre}</h4><p>${c.texto}</p></article>`).join("");
    $("#demoLine").innerHTML = (get("web.demo") || []).map((d) => `<li>${d}</li>`).join("");
    if (reduce) return;
    let k = 0; setInterval(() => { const els = $$(".cyc"); if (!isVisible($("#cycleRow"))) return; els.forEach((e, i) => e.classList.toggle("act", i === k)); k = (k + 1) % els.length; }, 2200);
  }

  /* ---------- 5. visor a pantalla completa ---------- */
  const V = { el: null, tabs: [], cur: 0, zoom: 1, base: 900, last: null };
  function pagesHTML(d) {
    if (!d.totalPaginas) return `<iframe class="pdf-frame" src="${d.pdf}" title="${esc(d.titulo)}"></iframe>`;
    let h = "";
    for (let n = 1; n <= d.totalPaginas; n++) h += `<figure style="animation-delay:${Math.min(n, 6) * .06}s"><img src="${d.paginas.replace("{n}", n)}" alt="${esc(d.titulo)} · página ${n}" loading="${n > 2 ? "lazy" : "eager"}"><figcaption>${n} / ${d.totalPaginas}</figcaption></figure>`;
    return `<div class="pages">${h}</div>`;
  }
  function openViewer(title, sub, tabs, active = 0) {
    V.el = $("#viewer"); V.tabs = tabs; V.last = document.activeElement;
    $("#viewerTitle").textContent = title; $("#viewerSub").textContent = sub || "";
    $("#viewerTabs").innerHTML = tabs.length > 1 ? tabs.map((t, i) => `<button role="tab" data-i="${i}">${t.label}</button>`).join("") : "";
    V.el.hidden = false; document.documentElement.style.overflow = "hidden";
    showTab(active); $("#viewerClose").focus();
  }
  function showTab(i) {
    const t = V.tabs[i]; V.cur = i; V.zoom = 1; V.base = t.base || 900;
    $$("#viewerTabs button").forEach((b, k) => b.setAttribute("aria-selected", k === i));
    const body = $("#viewerBody"); body.scrollTop = 0;
    body.innerHTML = t.html;
    const op = $("#viewerOpen"); if (t.link) { op.hidden = false; op.href = t.link; op.querySelector("span").textContent = t.linkLabel || "Abrir PDF"; } else op.hidden = true;
    const zoomable = !!$(".pages", body);
    ["#zoomIn", "#zoomOut", "#zoomVal"].forEach((s) => ($(s).hidden = !zoomable));
    applyZoom();
  }
  function applyZoom() { const p = $("#viewerBody .pages"); if (p) p.style.width = `min(100%, ${Math.round(V.base * V.zoom)}px)`; $("#zoomVal").textContent = Math.round(V.zoom * 100) + "%"; }
  function closeViewer() { V.el.hidden = true; document.documentElement.style.overflow = ""; $("#viewerBody").innerHTML = ""; if (V.last) V.last.focus(); }
  function openDocs(id) {
    const docs = get("legal.documentos") || [];
    openViewer(get("general.razonSocial"), get("legal.eyebrow"), docs.map((d) => ({ label: d.titulo, html: pagesHTML(d), link: d.pdf, base: 860 })), Math.max(0, docs.findIndex((d) => d.id === id)));
  }
  function openCanvas(active = 0) {
    const tpl = $("#tpl-bmc-mini");
    const grid = document.createElement("div"); grid.className = "bmc-grid";
    (get("canvas.bloques") || []).forEach((b) => { const f = tpl.content.cloneNode(true); fillItem(f.firstElementChild, b); grid.appendChild(f); });
    const img = get("canvas.imagenLienzo");
    openViewer("Modelo Canvas", get("general.marca") + " · " + get("general.razonSocial"), [
      { label: get("canvas.tituloLienzoOriginal"), html: `<div class="pages"><figure><img src="${img}" alt="Lienzo Canvas de la presentación"></figure></div>`, link: img, linkLabel: "Abrir imagen", base: 1500 },
      { label: get("canvas.tituloLienzoActual"), html: `<div class="viewer-html">${grid.outerHTML}</div>` }
    ], active);
  }
  function openBrochure(id) {
    const L = get("brochures.lista") || [];
    openViewer("Brochures " + get("general.marca"), get("brochures.bajada"), L.map((b) => ({ label: b.titulo, html: pagesHTML(b), link: b.pdf, base: b.totalPaginas === 1 ? 760 : 1200 })), Math.max(0, L.findIndex((b) => b.id === id)));
  }

  /* ---------- 6. interacción general ---------- */
  function isVisible(el) { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }
  function animateCount(el) {
    const raw = el.dataset.count; if (el.dataset.done) return; el.dataset.done = 1;
    const dec = raw.includes(",") ? raw.split(",")[1].length : 0;
    const target = parseFloat(raw.replace(/\./g, "").replace(",", "."));
    if (isNaN(target) || reduce) return;
    const t0 = performance.now(), dur = 1800;
    const step = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(target * e, dec); if (p < 1) requestAnimationFrame(step); else el.textContent = raw; };
    requestAnimationFrame(step);
  }
  function onReveal(el) {
    el.classList.add("in");
    $$(".cv", el).forEach(animateCount);
    if (el.matches(".city-bars")) $(".bars", el).classList.add("on");
    $$(".chart", el).forEach((c) => c.classList.add("on"));
    if (el.id === "spectrum") $("#specMarker").style.left = el.dataset.target + "%";
    if (el.matches(".dap")) $("#dapBubbles").classList.add("on");
    if (el.matches(".flow-card")) $("#cash").classList.add("on");
    if (el.id === "compare") sweepCompare();
  }
  function reveals() {
    const els = $$(".rv");
    if (!("IntersectionObserver" in window)) { els.forEach(onReveal); return; }
    const io = new IntersectionObserver((ens) => ens.forEach((en) => { if (en.isIntersecting) { onReveal(en.target); io.unobserve(en.target); } }), { threshold: .12, rootMargin: "0px 0px -6% 0px" });
    els.forEach((e) => io.observe(e));
  }
  function scrollUI() {
    const nav = $("#nav"), bar = $("#progressBar");
    const upd = () => { const h = document.documentElement; nav.classList.toggle("solid", h.scrollTop > 40); bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) * 100 + "%"; };
    addEventListener("scroll", upd, { passive: true }); upd();
    const secs = $$("main > section[id]");
    const io = new IntersectionObserver((ens) => ens.forEach((en) => {
      if (!en.isIntersecting) return;
      const id = en.target.id;
      $$("#sideDots a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + id));
      $$(".nav-links a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + id));
    }), { rootMargin: "-45% 0px -50% 0px" });
    secs.forEach((s) => io.observe(s));
    // navegación de presentación: ← → / RePág AvPág saltan de sección
    addEventListener("keydown", (e) => {
      if (!$("#viewer").hidden || !$("#indexOverlay").hidden) return;
      if (e.target.closest("input,textarea,[role=slider]")) return;
      const next = ["ArrowRight", "PageDown"].includes(e.key), prev = ["ArrowLeft", "PageUp"].includes(e.key);
      if (!next && !prev) return;
      e.preventDefault();
      const y = scrollY + 10, tops = secs.map((s) => s.offsetTop);
      let idx = tops.findIndex((t, i) => y >= t && (i === tops.length - 1 || y < tops[i + 1]));
      idx = Math.max(0, Math.min(secs.length - 1, idx + (next ? 1 : -1)));
      secs[idx].scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
  }
  function pointerFX() {
    const glow = $("#cursorGlow");
    let mx = 0, my = 0, raf = 0;
    addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(() => { glow.style.transform = `translate(${mx - 260}px,${my - 260}px)`; raf = 0; }); }, { passive: true });
    glow.style.left = glow.style.top = "0px"; glow.style.transform = "translate(-999px,-999px)";
    if (reduce) return;
    const hero = $("#inicio"), deps = $$("[data-depth]", hero);
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
      deps.forEach((el) => { const d = +el.dataset.depth; el.style.setProperty("--px", nx * d + "px"); el.style.setProperty("--py", ny * d + "px"); });
    });
    $$("[data-tilt]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
        el.style.transition = "transform .12s ease-out";
        el.style.transform = `perspective(900px) rotateX(${-ny * 7}deg) rotateY(${nx * 9}deg) translateZ(0)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transition = "transform .6s ease"; el.style.transform = ""; });
    });
  }
  let cmpTouched = false, setCmp = () => {};
  function compareSlider() {
    const box = $("#compare"), before = $("#compareBefore"), h = $("#compareHandle"), tl = $(".compare-tag.l", box), tr = $(".compare-tag.r", box);
    setCmp = (p) => { p = Math.max(2, Math.min(98, p)); before.style.clipPath = `inset(0 ${100 - p}% 0 0)`; h.style.left = p + "%"; tl.style.left = `calc(${p}% - 16px)`; tr.style.left = `calc(${p}% + 16px)`; h.setAttribute("aria-valuenow", Math.round(p)); h.dataset.p = p; };
    let drag = false;
    const at = (e) => { const r = box.getBoundingClientRect(); setCmp(((e.clientX - r.left) / r.width) * 100); };
    box.addEventListener("pointerdown", (e) => { drag = true; cmpTouched = true; box.setPointerCapture(e.pointerId); at(e); });
    box.addEventListener("pointermove", (e) => drag && at(e));
    box.addEventListener("pointerup", () => (drag = false));
    h.addEventListener("keydown", (e) => { const p = +h.dataset.p || 50; if (e.key === "ArrowLeft") { setCmp(p - 4); e.preventDefault(); cmpTouched = true; } if (e.key === "ArrowRight") { setCmp(p + 4); e.preventDefault(); cmpTouched = true; } });
    setCmp(50);
  }
  function sweepCompare() {
    if (reduce) return;
    const keys = [[0, 50], [.3, 22], [.7, 80], [1, 50]], t0 = performance.now(), dur = 3600;
    const step = (t) => {
      if (cmpTouched) return;
      const p = Math.min(1, (t - t0) / dur);
      let k = 0; while (k < keys.length - 2 && p > keys[k + 1][0]) k++;
      const [a, va] = keys[k], [b, vb] = keys[k + 1], u = (p - a) / (b - a), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      setCmp(va + (vb - va) * e); if (p < 1) requestAnimationFrame(step);
    };
    setTimeout(() => requestAnimationFrame(step), 400);
  }
  function reticleLoop() {
    const card = $(".track-card"), ret = $("#reticle"), lbl = $("#reticleLbl"), fill = $("#voteFill"), val = $("#voteVal");
    if (!card) return;
    const labels = ["Actividad sospechosa", "Robo / asalto", "Riña", "Vandalismo"];
    let k = 0;
    const cycle = () => {
      const [a, b] = TRACK[k % TRACK.length], sz = 110;
      ret.classList.remove("locked"); lbl.textContent = "Validando · " + labels[k % labels.length];
      ret.style.left = `calc(${a * 100}% - ${sz / 2}px)`; ret.style.top = `calc(${b * 100}% - ${sz / 2}px)`; ret.style.width = ret.style.height = sz + "px";
      fill.style.width = "0%"; val.textContent = "0%";
      let v = 0; const goal = 78 + ((k * 7) % 18);
      const iv = setInterval(() => { v = Math.min(goal, v + 4); fill.style.width = v + "%"; val.textContent = v + "%"; if (v >= goal) { clearInterval(iv); ret.classList.add("locked"); lbl.textContent = `Confirmada · ${3 + (k % 3)} vecinos`; } }, 70);
      k++;
    };
    cycle();
    if (!reduce) setInterval(() => isVisible(card) && cycle(), 3800);
  }

  /* ---------- 7. arranque ---------- */
  function init() {
    bindAll(); renderLists(); renderHero(); renderDocs(); renderQA(); renderSpectrum(); renderTable();
    renderCME(); renderBE(); renderCash(); renderBrochures(); renderCycle(); renderNavs();
    // enlaces sin destino se ocultan
    $$("[data-href]").forEach((a) => { if (!a.getAttribute("href")) a.hidden = true; });
    drawAllCities(); renderBubbles();
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { drawAllCities(); renderBubbles(); if ($(".dap.in")) $("#dapBubbles").classList.add("on"); }, 180); });
    if (document.fonts) document.fonts.ready.then(drawAllCities);
    heroNet(); compareSlider(); reticleLoop(); scrollUI(); pointerFX(); reveals();

    $("#openCanvas").addEventListener("click", () => openCanvas(0));
    $("#bmcPreview").addEventListener("click", (e) => { if (!e.target.closest("#openCanvas")) openCanvas(1); });
    $("#viewerClose").addEventListener("click", closeViewer);
    $("#viewerTabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) showTab(+b.dataset.i); });
    $("#zoomIn").addEventListener("click", () => { V.zoom = Math.min(2.2, V.zoom + .15); applyZoom(); });
    $("#zoomOut").addEventListener("click", () => { V.zoom = Math.max(.5, V.zoom - .15); applyZoom(); });
    const idx = $("#indexOverlay");
    $("#menuBtn").addEventListener("click", () => { idx.hidden = false; });
    idx.addEventListener("click", (e) => { if (e.target.closest("[data-close-index]")) idx.hidden = true; });
    addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!$("#viewer").hidden) closeViewer(); idx.hidden = true; } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
