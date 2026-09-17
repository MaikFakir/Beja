/**
 * Colmena Segura - Tactical Risk Map & Waze-like Geospatial Engine
 * Leaflet map wrapper, dynamic heatmaps, radar pulse markers, geofencing & safe routing.
 */

import { swarmEngine, INCIDENT_STATES, INCIDENT_CATEGORIES } from './swarmEngine.js';
import { syncBus } from './syncBus.js';

export class RiskMap {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.map = null;
    this.heatLayer = null;
    this.markerLayerGroup = null;
    this.routeLayerGroup = null;
    this.userMarker = null;

    this.center = options.center || [19.4326, -99.1332]; // Default demo center (Metro Core)
    this.zoom = options.zoom || 15;
    this.userLocation = { lat: this.center[0], lng: this.center[1] };
    this.timeFilter = 'ALL'; // 'ALL', 'DAY', 'NIGHT'
    this.activeGeofenceAlert = null;
    this.onGeofenceChange = options.onGeofenceChange || (() => {});
    this.onMapClick = options.onMapClick || null;

    this.initMap();
  }

  initMap() {
    const el = document.getElementById(this.containerId);
    if (!el) {
      console.warn(`Map container #${this.containerId} not found in DOM`);
      return;
    }

    if (!window.L) {
      console.error('Leaflet library is required but not loaded');
      el.innerHTML = `
        <div style="display:flex;height:100%;align-items:center;justify-content:center;color:#94a3b8;flex-direction:column;padding:20px;text-align:center;">
          <span style="font-size:2rem;margin-bottom:8px;">🗺️</span>
          <strong>Cargando mapa geoespacial...</strong>
          <small style="margin-top:4px;">Verificando conexión a servidores de cartografía...</small>
        </div>
      `;
      return;
    }

    try {
      // Initialize Leaflet
      this.map = L.map(this.containerId, {
        center: this.center,
        zoom: this.zoom,
        zoomControl: false,
        attributionControl: false
      });

      // 100% Free CartoDB Dark Matter Tile Layer (Zero API Key Required - Sleek Cyberpunk Dark Theme)
      const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        className: 'colmena-dark-tiles',
        errorTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
      });
      tileLayer.addTo(this.map);

      // Zoom control in bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(this.map);

      this.markerLayerGroup = L.layerGroup().addTo(this.map);
      this.routeLayerGroup = L.layerGroup().addTo(this.map);

      // Initialize User Location marker
      this.setupUserMarker();

      // Render Initial Heatmap & Incidents
      this.renderHeatmap();
      this.renderActiveIncidents();

      // Force size invalidation for flex/absolute containers
      setTimeout(() => {
        if (this.map) this.map.invalidateSize();
      }, 100);
      setTimeout(() => {
        if (this.map) this.map.invalidateSize();
      }, 400);

      // Map Click Listener
      if (this.onMapClick) {
        this.map.on('click', (e) => {
          this.onMapClick(e.latlng);
        });
      }

      // Listen to real-time events to auto-refresh map
      syncBus.on('INCIDENT_MUTATION', () => {
        this.renderActiveIncidents();
        this.renderHeatmap();
        this.checkGeofence();
      });

      syncBus.on('SWARM_ESCALATED_CRITICAL', () => {
        this.renderActiveIncidents();
        this.checkGeofence();
      });
    } catch (e) {
      console.error('Error initializing map:', e);
    }
  }

  setupUserMarker() {
    if (!this.map || !window.L) return;

    const userIcon = L.divIcon({
      className: 'user-geo-marker',
      html: `
        <div class="user-beacon">
          <div class="user-pulse"></div>
          <div class="user-dot"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    this.userMarker = L.marker(this.center, { icon: userIcon, zIndexOffset: 1000 }).addTo(this.map);
  }

  /**
   * Update user location on map and re-check proximity geofence
   */
  setUserLocation(lat, lng, panTo = false) {
    this.userLocation = { lat, lng };
    if (this.userMarker) {
      this.userMarker.setLatLng([lat, lng]);
    }
    if (panTo && this.map) {
      this.map.panTo([lat, lng]);
    }
    this.checkGeofence();
  }

  /**
   * Render dynamic heatmap layer (Leaflet.heat)
   */
  renderHeatmap() {
    if (!this.map || !window.L || !window.L.heatLayer) return;

    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
      this.heatLayer = null;
    }

    const rawHistory = swarmEngine.loadHistory();
    const activeIncidents = swarmEngine.loadIncidents();

    // Filter points by time of day if requested
    let points = rawHistory.filter(pt => {
      if (this.timeFilter === 'ALL') return true;
      return pt.timeOfDay === this.timeFilter;
    }).map(pt => [pt.lat, pt.lng, pt.weight || 0.7]);

    // Add active incidents with high thermal intensity
    activeIncidents.forEach(inc => {
      const weight = inc.status === INCIDENT_STATES.CRITICAL_SWARM ? 1.0 : 0.6;
      points.push([inc.lat, inc.lng, weight]);
    });

    if (points.length === 0) return;

    try {
      this.heatLayer = L.heatLayer(points, {
        radius: 22,
        blur: 14,
        maxZoom: 18,
        max: 1.0,
        gradient: {
          0.2: '#00f5a0',
          0.45: '#ffb800',
          0.7: '#ff5e3a',
          1.0: '#ff1744'
        }
      }).addTo(this.map);
    } catch (e) {
      console.warn('Heatmap layer could not be rendered', e);
    }
  }

  setTimeFilter(filter) {
    this.timeFilter = filter; // 'ALL', 'DAY', 'NIGHT'
    this.renderHeatmap();
  }

  /**
   * Render real-time active swarm clusters with tactical pulses
   */
  renderActiveIncidents() {
    if (!this.markerLayerGroup || !this.map || !window.L) return;
    this.markerLayerGroup.clearLayers();

    const incidents = swarmEngine.loadIncidents();

    incidents.forEach(inc => {
      const isCritical = inc.status === INCIDENT_STATES.CRITICAL_SWARM;
      const isDispatched = inc.status === INCIDENT_STATES.DISPATCHED;
      const catInfo = INCIDENT_CATEGORIES[inc.category] || INCIDENT_CATEGORIES.FIGHT;

      let statusBadge = `🟡 Sondeo (${inc.reportCount} reporte)`;
      if (isCritical) {
        statusBadge = `🚨 ALERTA ENJAMBRE (${inc.reportCount} alertas)`;
      } else if (isDispatched) {
        statusBadge = `🚔 Patrulla ${inc.assignedUnit?.code || '01'} en camino`;
      }

      // 1. Swarm influence radius circle (50m)
      const circle = L.circle([inc.lat, inc.lng], {
        radius: swarmEngine.CLUSTER_RADIUS_METERS,
        color: isCritical ? '#ff2a55' : (isDispatched ? '#00d2ff' : '#ffb800'),
        weight: 1.5,
        fillColor: isCritical ? '#ff2a55' : (isDispatched ? '#00d2ff' : '#ffb800'),
        fillOpacity: isCritical ? 0.22 : 0.12,
        dashArray: isCritical ? null : '4, 6'
      });
      this.markerLayerGroup.addLayer(circle);

      // 2. Custom Pulse Marker
      const markerHtml = `
        <div class="incident-custom-marker ${isCritical ? 'critical' : (isDispatched ? 'dispatched' : 'probing')}">
          <div class="marker-radar-wave"></div>
          <div class="marker-core">
            <span class="marker-icon">${catInfo.icon}</span>
            <span class="marker-count">${inc.reportCount}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'incident-leaflet-wrapper',
        html: markerHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const marker = L.marker([inc.lat, inc.lng], { icon: customIcon });

      // Popup with incident details and quick confirm button
      const popupHtml = `
        <div class="tactical-popup">
          <div class="popup-header">
            <span class="popup-category">${catInfo.icon} ${catInfo.name}</span>
            <span class="popup-badge ${isCritical ? 'badge-critical' : 'badge-warning'}">${statusBadge}</span>
          </div>
          <div class="popup-body">
            <p class="popup-time">Reportado hace ${Math.max(1, Math.round((Date.now() - inc.createdAt)/60000))} min</p>
            <p class="popup-swarm-detail">👥 <strong>${inc.reportCount} confirmación(es)</strong>${(inc.refutations && inc.refutations.length) ? ` &bull; ⚠️ ${inc.refutations.length} desmentidos` : ''}</p>
            ${inc.assignedUnit ? `<p class="popup-unit">🚔 ${inc.assignedUnit.code} (ETA ~${inc.assignedUnit.etaMinutes} min)</p>` : ''}
            <div style="display:flex;gap:6px;margin-top:8px;">
              <button class="btn-popup-witness" onclick="if(window.citizenApp) window.citizenApp.voteIncident('${inc.id}', true)" style="flex:1; background:rgba(0,230,118,0.2); border:1px solid #00e676; color:#00e676; padding:6px; border-radius:4px; font-weight:800; font-size:0.72rem; cursor:pointer;">
                ✅ Es Real
              </button>
              <button class="btn-popup-witness" onclick="if(window.citizenApp) window.citizenApp.voteIncident('${inc.id}', false)" style="flex:1; background:rgba(255,23,68,0.2); border:1px solid #ff1744; color:#ff5252; padding:6px; border-radius:4px; font-weight:800; font-size:0.72rem; cursor:pointer;">
                ❌ Es Falso
              </button>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      this.markerLayerGroup.addLayer(marker);
    });
  }

  /**
   * Geofence Engine: Checks if user's location is dangerously close to active critical incidents
   */
  checkGeofence() {
    const incidents = swarmEngine.loadIncidents();
    const PROXIMITY_THRESHOLD_METERS = 50;

    let nearestThreat = null;
    let minDistance = Infinity;

    incidents.forEach(inc => {
      if (inc.status === INCIDENT_STATES.RESOLVED || inc.status === INCIDENT_STATES.FALSE_ALARM) return;
      const dist = swarmEngine.calculateDistanceMeters(
        this.userLocation.lat,
        this.userLocation.lng,
        inc.lat,
        inc.lng
      );

      if (dist <= PROXIMITY_THRESHOLD_METERS && dist < minDistance) {
        minDistance = dist;
        nearestThreat = {
          incident: inc,
          distanceMeters: Math.round(dist)
        };
      }
    });

    if (nearestThreat !== this.activeGeofenceAlert) {
      this.activeGeofenceAlert = nearestThreat;
      this.onGeofenceChange(nearestThreat);
    }
  }

  getMinDistanceToPolyline(coords, threatLat, threatLng) {
    let minDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const vDist = swarmEngine.calculateDistanceMeters(coords[i][0], coords[i][1], threatLat, threatLng);
      if (vDist < minDist) minDist = vDist;

      if (i < coords.length - 1) {
        const lat1 = coords[i][0], lng1 = coords[i][1];
        const lat2 = coords[i+1][0], lng2 = coords[i+1][1];
        const l2 = (lat1 - lat2)*(lat1 - lat2) + (lng1 - lng2)*(lng1 - lng2);
        if (l2 > 0) {
          let t = ((threatLat - lat1) * (lat2 - lat1) + (threatLng - lng1) * (lng2 - lng1)) / l2;
          t = Math.max(0, Math.min(1, t));
          const projLat = lat1 + t * (lat2 - lat1);
          const projLng = lng1 + t * (lng2 - lng1);
          const sDist = swarmEngine.calculateDistanceMeters(threatLat, threatLng, projLat, projLng);
          if (sDist < minDist) minDist = sDist;
        }
      }
    }
    return minDist;
  }

  /**
   * Robust Multi-Corridor Avoidance Safe Route Engine
   */
  async calculateSafeRoute(startLatLng, endLatLng, travelMode = 'walking') {
    if (!this.routeLayerGroup || !this.map || !window.L) return null;
    this.routeLayerGroup.clearLayers();

    const mode = (travelMode === 'driving') ? 'driving' : 'walking';
    const activeThreats = swarmEngine.loadIncidents();
    const heatHistory = swarmEngine.loadHistory();

    let directCoords = [];
    let directDistance = 0;
    let directDuration = 0;
    let directSteps = [];

    try {
      let resp;
      if (mode === 'walking') {
        try {
          resp = await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${startLatLng.lng},${startLatLng.lat};${endLatLng.lng},${endLatLng.lat}?overview=full&geometries=geojson&steps=true`);
        } catch (e) {}
        if (!resp || !resp.ok) {
          try {
            resp = await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/driving/${startLatLng.lng},${startLatLng.lat};${endLatLng.lng},${endLatLng.lat}?overview=full&geometries=geojson&steps=true`);
          } catch (e) {}
        }
      } else {
        try {
          resp = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${startLatLng.lng},${startLatLng.lat};${endLatLng.lng},${endLatLng.lat}?overview=full&geometries=geojson&steps=true`);
        } catch (e) {}
      }

      if (!resp || !resp.ok) {
        resp = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLatLng.lng},${startLatLng.lat};${endLatLng.lng},${endLatLng.lat}?overview=full&geometries=geojson&steps=true`);
      }
      if (resp.ok) {
        const data = await resp.json();
        if (data.routes && data.routes.length > 0) {
          const r = data.routes[0];
          directDistance = r.distance;
          directDuration = r.duration;
          directCoords = r.geometry.coordinates.map(c => [c[1], c[0]]);
          if (r.legs && r.legs[0]?.steps) {
            directSteps = r.legs[0].steps.map(s => {
              const roadName = s.name ? `por <strong>${s.name}</strong>` : 'por vía principal';
              return `${s.maneuver.type} ${roadName} (${Math.round(s.distance)} m)`;
            });
          }
        }
      }
    } catch (err) {}

    if (directCoords.length === 0) {
      directCoords = [
        [startLatLng.lat, startLatLng.lng],
        [startLatLng.lat + (endLatLng.lat - startLatLng.lat) * 0.5, startLatLng.lng],
        [endLatLng.lat, endLatLng.lng]
      ];
      directDistance = 1400;
      directDuration = (mode === 'walking') ? 1050 : 210;
      directSteps = ['Avanza en línea recta hacia tu destino.'];
    }

    let hasThreat = false;
    let threatDetails = null;

    for (const threat of activeThreats) {
      const dist = this.getMinDistanceToPolyline(directCoords, threat.lat, threat.lng);
      if (dist <= 85) {
        hasThreat = true;
        threatDetails = {
          type: INCIDENT_CATEGORIES[threat.category]?.name || 'Peligro / Alerta Activa',
          reports: threat.reportCount,
          lat: threat.lat,
          lng: threat.lng,
          isCritical: threat.status === INCIDENT_STATES.CRITICAL_SWARM
        };
        break;
      }
    }

    if (!hasThreat) {
      for (const hp of heatHistory) {
        const dist = this.getMinDistanceToPolyline(directCoords, hp.lat, hp.lng);
        if (dist <= 80) {
          hasThreat = true;
          threatDetails = {
            type: INCIDENT_CATEGORIES[hp.category]?.name || 'Zona de Calor / Alerta Reportada',
            reports: 'Punto Caliente Activo',
            lat: hp.lat,
            lng: hp.lng,
            isCritical: true
          };
          break;
        }
      }
    }

    let detourCoords = [];
    let detourDistance = 0;
    let detourDuration = 0;
    let detourSteps = [];
    let detourWaypoints = null;

    if (hasThreat && threatDetails) {
      const tLat = threatDetails.lat;
      const tLng = threatDetails.lng;
      const cosLat = Math.cos((tLat * Math.PI) / 180);

      let dLat = endLatLng.lat - startLatLng.lat;
      let dLng = (endLatLng.lng - startLatLng.lng) * cosLat;
      const len = Math.sqrt(dLat * dLat + dLng * dLng) || 0.001;
      const pLat = dLat / len;
      const pLng = dLng / len;
      const nLat = -pLng;
      const nLng = pLat;

      const lateralDistances = [180, 260, 360, 480];
      const sideSigns = [1, -1];
      const longitudinalOffset = 160;

      let bestCandidate = null;
      let minCandidateDist = Infinity;

      for (const latDist of lateralDistances) {
        for (const sign of sideSigns) {
          const latOff = (sign * latDist * nLat) / 111000;
          const lngOff = (sign * latDist * nLng) / (111000 * cosLat);
          const pOffLat = (longitudinalOffset * pLat) / 111000;
          const pOffLng = (longitudinalOffset * pLng) / (111000 * cosLat);

          const viaEntry = [tLat - pOffLat + latOff, tLng - pOffLng + lngOff];
          const viaApex = [tLat + latOff * 1.15, tLng + lngOff * 1.15];
          const viaExit = [tLat + pOffLat + latOff, tLng + pOffLng + lngOff];

          try {
            let dResp;
            if (mode === 'walking') {
              try {
                dResp = await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${startLatLng.lng},${startLatLng.lat};${viaEntry[1]},${viaEntry[0]};${viaApex[1]},${viaApex[0]};${viaExit[1]},${viaExit[0]};${endLatLng.lng},${endLatLng.lat}?overview=full&geometries=geojson&steps=true`);
              } catch (e) {}
              if (!dResp || !dResp.ok) {
                try {
                  dResp = await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/driving/${startLatLng.lng},${startLatLng.lat};${viaEntry[1]},${viaEntry[0]};${viaApex[1]},${viaApex[0]};${viaExit[1]},${viaExit[0]};${endLatLng.lng},${endLatLng.lat}?overview=full&geometries=geojson&steps=true`);
                } catch (e) {}
              }
            } else {
              try {
                dResp = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${startLatLng.lng},${startLatLng.lat};${viaEntry[1]},${viaEntry[0]};${viaApex[1]},${viaApex[0]};${viaExit[1]},${viaExit[0]};${endLatLng.lng},${endLatLng.lat}?overview=full&geometries=geojson&steps=true`);
              } catch (e) {}
            }

            if (!dResp || !dResp.ok) {
              dResp = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLatLng.lng},${startLatLng.lat};${viaEntry[1]},${viaEntry[0]};${viaApex[1]},${viaApex[0]};${viaExit[1]},${viaExit[0]};${endLatLng.lng},${endLatLng.lat}?overview=full&geometries=geojson&steps=true`);
            }
            if (dResp.ok) {
              const dData = await dResp.json();
              if (dData.routes && dData.routes.length > 0) {
                const dR = dData.routes[0];
                const testCoords = dR.geometry.coordinates.map(c => [c[1], c[0]]);
                const testDistToThreat = this.getMinDistanceToPolyline(testCoords, tLat, tLng);

                if (testDistToThreat >= 75) {
                  let steps = [];
                  if (dR.legs) {
                    steps = dR.legs.flatMap(l => l.steps || []).map(s => {
                      const roadName = s.name ? `por <strong>${s.name}</strong>` : 'por calle alterna';
                      return `Desvío seguro: ${s.maneuver.type} ${roadName} (${Math.round(s.distance)} m)`;
                    });
                  }
                  if (dR.distance < minCandidateDist) {
                    minCandidateDist = dR.distance;
                    bestCandidate = {
                      coords: testCoords,
                      distance: dR.distance,
                      duration: dR.duration,
                      steps: steps,
                      waypoint: viaApex
                    };
                  }
                }
              }
            }
          } catch (e) {}

          if (bestCandidate) break;
        }
        if (bestCandidate) break;
      }

      if (bestCandidate) {
        detourCoords = bestCandidate.coords;
        detourDistance = bestCandidate.distance;
        detourDuration = bestCandidate.duration;
        detourSteps = bestCandidate.steps;
        detourWaypoints = bestCandidate.waypoint;
      } else {
        const sign = 1;
        const latOff = (sign * 220 * nLat) / 111000;
        const lngOff = (sign * 220 * nLng) / (111000 * cosLat);
        const pOffLat = (160 * pLat) / 111000;
        const pOffLng = (160 * pLng) / (111000 * cosLat);

        const viaEntry = [tLat - pOffLat + latOff, tLng - pOffLng + lngOff];
        const viaApex = [tLat + latOff * 1.2, tLng + lngOff * 1.2];
        const viaExit = [tLat + pOffLat + latOff, tLng + pOffLng + lngOff];

        detourCoords = [
          [startLatLng.lat, startLatLng.lng],
          viaEntry,
          viaApex,
          viaExit,
          [endLatLng.lat, endLatLng.lng]
        ];
        detourDistance = directDistance + 360;
        detourDuration = (mode === 'walking') ? Math.round(detourDistance / 1.33) : Math.round(detourDistance / 8.33);
        detourSteps = [
          'Inicio de marcha en ruta despejada.',
          'Desvío perimetral por calle alterna esquivando zona de alerta (150m de resguardo).',
          'Incorporación a vía segura hacia el destino.'
        ];
        detourWaypoints = viaApex;
      }
    }

    const gmapsTravelParam = (mode === 'driving') ? 'driving' : 'walking';
    const directGmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLatLng.lat},${startLatLng.lng}&destination=${endLatLng.lat},${endLatLng.lng}&travelmode=${gmapsTravelParam}`;
    const detourGmapsUrl = detourWaypoints 
      ? `https://www.google.com/maps/dir/?api=1&origin=${startLatLng.lat},${startLatLng.lng}&destination=${endLatLng.lat},${endLatLng.lng}&waypoints=${detourWaypoints[0]},${detourWaypoints[1]}&travelmode=${gmapsTravelParam}` 
      : directGmapsUrl;

    if (hasThreat && threatDetails) {
      this.directPolyline = L.polyline(directCoords, {
        color: '#ff2a55',
        weight: 6,
        opacity: 0.95,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(this.routeLayerGroup);

      this.detourPolyline = L.polyline(detourCoords, {
        color: '#00f5a0',
        weight: 6,
        opacity: 0.5,
        dashArray: '6, 6',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(this.routeLayerGroup);

      const group = L.featureGroup([this.directPolyline, this.detourPolyline]);
      this.map.fitBounds(group.getBounds(), { padding: [50, 50] });

      return {
        status: 'DANGER_ALTERNATE_OFFERED',
        threatDetails,
        travelMode: mode,
        direct: {
          distanceKm: (directDistance / 1000).toFixed(1),
          etaMins: Math.max(1, Math.round(directDuration / 60)),
          steps: directSteps,
          gmapsUrl: directGmapsUrl
        },
        detour: {
          distanceKm: (detourDistance / 1000).toFixed(1),
          etaMins: Math.max(1, Math.round(detourDuration / 60)),
          steps: detourSteps,
          gmapsUrl: detourGmapsUrl
        }
      };
    } else {
      this.directPolyline = L.polyline(directCoords, {
        color: '#00d2ff',
        weight: 5,
        opacity: 0.9
      }).addTo(this.routeLayerGroup);

      this.map.fitBounds(this.directPolyline.getBounds(), { padding: [60, 60] });

      return {
        status: 'CLEAR',
        travelMode: mode,
        distanceKm: (directDistance / 1000).toFixed(1),
        etaMins: Math.max(1, Math.round(directDuration / 60)),
        steps: directSteps,
        googleMapsUrl: directGmapsUrl
      };
    }
  }

  clearRoutes() {
    if (this.routeLayerGroup) {
      this.routeLayerGroup.clearLayers();
    }
  }
}
