/**
 * Colmena Segura - Base de Datos Histórica Georreferenciada de Bogotá (2021 - 2026)
 * Fuentes consolidadas: Secretaría Distrital de Seguridad, Convivencia y Justicia (Siedco),
 * Secretaría Distrital de Movilidad (SIGAT / Visión Cero), Policía Metropolitana de Bogotá (MEBOG).
 *
 * Incluye:
 * - Puntos calientes de hurto a personas, atracos, cosquilleo y raponazo de celulares.
 * - Puentes peatonales y pasillos de transporte masivo críticos.
 * - Corredores e intersecciones viales con mayor siniestralidad y accidentalidad grave.
 * - Zonas de riñas, desmanes y rumba nocturna pesada.
 * - Calibración por horario Día (06:00 - 18:00) y Noche (18:00 - 05:00) para filtro táctico.
 */

(function () {
  'use strict';

  const BOGOTA_HISTORICAL_HOTSPOTS = [
    // ==========================================
    // 1. LOCALIDAD KENNEDY
    // ==========================================
    {
      id: "hist_ken_01",
      name: "Sector Corabastos / Barrio María Paz (Calle 38 Sur con Cra 80)",
      locality: "Kennedy",
      category: "ROBBERY",
      lat: 4.6295,
      lng: -74.1585,
      weight: 0.98,
      timeOfDay: "NIGHT",
      hour: "19:00 - 04:30",
      frequency: "Muy Alta (Crítico)",
      description: "Foco crítico de hurto a mano armada, asalto nocturno y microtráfico reportado reiteradamente en 2021-2026.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_ken_02",
      name: "Corabastos Puerta 6 y Transversal 86",
      locality: "Kennedy",
      category: "ROBBERY",
      lat: 4.6315,
      lng: -74.1615,
      weight: 0.88,
      timeOfDay: "DAY",
      hour: "05:00 - 14:00",
      frequency: "Alta",
      description: "Hurto comercial, raponazo de celulares y cosquilleo en madrugadas y mañanas de descargue.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_ken_03",
      name: "Patio Bonito - Sector CAI (Calle 38 Sur con Cra 86)",
      locality: "Kennedy",
      category: "ROBBERY",
      lat: 4.6320,
      lng: -74.1670,
      weight: 0.96,
      timeOfDay: "NIGHT",
      hour: "18:30 - 05:00",
      frequency: "Muy Alta (Crítico)",
      description: "Atraco violento en paraderos de transporte y corredores residenciales con escasa iluminación.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_ken_04",
      name: "Patio Bonito Central (Carrera 87 con Calle 40 Sur)",
      locality: "Kennedy",
      category: "ROBBERY",
      lat: 4.6285,
      lng: -74.1685,
      weight: 0.84,
      timeOfDay: "DAY",
      hour: "08:00 - 17:30",
      frequency: "Alta",
      description: "Raponazo de maletas y celulares a transeúntes y compradores diurnos.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_ken_05",
      name: "Estación TransMilenio Banderas (Av. Américas con Cra 78B)",
      locality: "Kennedy",
      category: "ROBBERY",
      lat: 4.6360,
      lng: -74.1480,
      weight: 0.94,
      timeOfDay: "DAY",
      hour: "06:00 - 09:30 / 16:30 - 19:30",
      frequency: "Muy Alta (Hora Pico)",
      description: "Cosquilleo masivo en túneles, torniquetes y plataformas de articulados.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_ken_06",
      name: "Puente Peatonal Banderas (Av. Américas con Cra 78)",
      locality: "Kennedy",
      category: "ROBBERY",
      lat: 4.6365,
      lng: -74.1495,
      weight: 0.90,
      timeOfDay: "NIGHT",
      hour: "20:00 - 01:00",
      frequency: "Alta",
      description: "Asaltos con arma blanca en escaleras y rampas elevadas de TransMilenio.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_ken_07",
      name: "Portal de las Américas (Av. Cali con Av. Villavicencio)",
      locality: "Kennedy",
      category: "ROBBERY",
      lat: 4.6280,
      lng: -74.1750,
      weight: 0.91,
      timeOfDay: "NIGHT",
      hour: "19:00 - 23:30",
      frequency: "Muy Alta",
      description: "Atraco en senderos perimetrales y despojo de pertenencias a usuarios retornando a casa.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_ken_08",
      name: "Cuadra Alegre / Cuadra Picha (Av. Boyacá con Calle 3 Sur)",
      locality: "Kennedy",
      category: "FIGHT",
      lat: 4.6175,
      lng: -74.1405,
      weight: 0.96,
      timeOfDay: "NIGHT",
      hour: "22:00 - 05:00",
      frequency: "Muy Alta (Fines de Semana)",
      description: "Zona de alta intensidad de riñas colectivas, desmanes callejeros y atracos tras consumo de alcohol.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_ken_09",
      name: "Siniestros Viales: Av. Boyacá con Av. Primero de Mayo",
      locality: "Kennedy",
      category: "ACCIDENT",
      lat: 4.6110,
      lng: -74.1465,
      weight: 0.92,
      timeOfDay: "NIGHT",
      hour: "20:00 - 03:00",
      frequency: "Crítico",
      description: "Intersección con alto índice de colisiones fatales de motociclistas por exceso de velocidad y giros prohibidos.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_ken_10",
      name: "Siniestros Viales: Av. Ciudad de Cali con Calle 38 Sur",
      locality: "Kennedy",
      category: "ACCIDENT",
      lat: 4.6335,
      lng: -74.1640,
      weight: 0.86,
      timeOfDay: "DAY",
      hour: "07:00 - 18:00",
      frequency: "Alta",
      description: "Accidentalidad recurrente de ciclistas, peatones y buses del SITP en horas laborales.",
      yearsReported: "2021-2026"
    },

    // ==========================================
    // 2. CENTRO / SANTA FE / LA CANDELARIA / MÁRTIRES
    // ==========================================
    {
      id: "hist_cen_01",
      name: "Plaza San Victorino (Calle 10 con Carrera 12)",
      locality: "Santa Fe",
      category: "ROBBERY",
      lat: 4.6015,
      lng: -74.0772,
      weight: 0.98,
      timeOfDay: "DAY",
      hour: "09:00 - 18:00",
      frequency: "Máxima (Diario)",
      description: "Epicentro de cosquilleo, raponazo en masa y hurto de paquetes comerciales.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cen_02",
      name: "Av. Jiménez con Carrera 10 (Estación San Victorino - Neos)",
      locality: "Santa Fe",
      category: "ROBBERY",
      lat: 4.6028,
      lng: -74.0740,
      weight: 0.95,
      timeOfDay: "DAY",
      hour: "10:00 - 18:30",
      frequency: "Muy Alta",
      description: "Atraco relámpago, raponazo de teléfonos móviles a peatones esperando el semáforo.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cen_03",
      name: "Calle 19 con Carrera 7 y 8 (Corredor Bancario Centro)",
      locality: "Santa Fe",
      category: "ROBBERY",
      lat: 4.6063,
      lng: -74.0712,
      weight: 0.91,
      timeOfDay: "NIGHT",
      hour: "18:00 - 23:00",
      frequency: "Alta",
      description: "Asaltos con arma blanca aprovechando el cierre de locales comerciales y soledad de la noche.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cen_04",
      name: "Calle 19 con Carrera 4 (Sector Las Aguas / Universidades)",
      locality: "La Candelaria",
      category: "ROBBERY",
      lat: 4.6045,
      lng: -74.0680,
      weight: 0.88,
      timeOfDay: "NIGHT",
      hour: "17:30 - 22:00",
      frequency: "Alta",
      description: "Hurto reiterado a universitarios saliendo de clases nocturnas (computadores y celulares).",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cen_05",
      name: "Parque de los Periodistas / Eje Ambiental (Calle 16 con Cra 3)",
      locality: "La Candelaria",
      category: "SUSPICIOUS",
      lat: 4.6006,
      lng: -74.0694,
      weight: 0.87,
      timeOfDay: "NIGHT",
      hour: "19:00 - 03:00",
      frequency: "Media-Alta",
      description: "Zona de concentración de consumo de sustancias y atracos a turistas y transeúntes desorientados.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cen_06",
      name: "Parque Santander (Carrera 7 con Calle 16)",
      locality: "Santa Fe",
      category: "ROBBERY",
      lat: 4.6022,
      lng: -74.0722,
      weight: 0.82,
      timeOfDay: "DAY",
      hour: "11:00 - 17:00",
      frequency: "Media-Alta",
      description: "Modalidad de engaño, cosquilleo y arrebato rápido en la franja peatonal diurna.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cen_07",
      name: "Zona de Tolerancia Santa Fe (Calle 22 con Av. Caracas)",
      locality: "Santa Fe",
      category: "FIGHT",
      lat: 4.6120,
      lng: -74.0725,
      weight: 0.97,
      timeOfDay: "NIGHT",
      hour: "21:00 - 05:00",
      frequency: "Crítica",
      description: "Disputas territoriales, atracos a mano armada y hechos violentos con arma blanca continuos.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cen_08",
      name: "Plaza España y Carrera 18 (Sector Los Mártires)",
      locality: "Los Mártires",
      category: "ROBBERY",
      lat: 4.6060,
      lng: -74.0845,
      weight: 0.90,
      timeOfDay: "DAY",
      hour: "08:00 - 18:00",
      frequency: "Alta",
      description: "Delincuencia instrumental, hurto a transeúntes y receptación de repuestos y equipos.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cen_09",
      name: "Estación TransMilenio Ricaurte (Túnel Américas - NQS)",
      locality: "Los Mártires",
      category: "ROBBERY",
      lat: 4.6142,
      lng: -74.0945,
      weight: 0.95,
      timeOfDay: "DAY",
      hour: "06:30 - 20:00",
      frequency: "Muy Alta",
      description: "Túnel interconector de 200 metros con alta densidad de hurtos coordinados en manada.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cen_10",
      name: "Puente Peatonal Ricaurte (Calle 13 con NQS - Noche)",
      locality: "Los Mártires",
      category: "ROBBERY",
      lat: 4.6135,
      lng: -74.0955,
      weight: 0.94,
      timeOfDay: "NIGHT",
      hour: "20:00 - 05:00",
      frequency: "Muy Alta",
      description: "Atracos violentos en rampas de descenso hacia el barrio Ricaurte y La Estanzuela.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cen_11",
      name: "Siniestros Viales: Av. Caracas con Calle 13",
      locality: "Santa Fe",
      category: "ACCIDENT",
      lat: 4.6030,
      lng: -74.0775,
      weight: 0.89,
      timeOfDay: "DAY",
      hour: "07:00 - 19:00",
      frequency: "Alta",
      description: "Colisiones constantes entre articulados, motociclistas y atropellos peatonales en cruce central.",
      yearsReported: "2021-2026"
    },

    // ==========================================
    // 3. CHAPINERO
    // ==========================================
    {
      id: "hist_cha_01",
      name: "Calle 72 con Carrera 13 (Zona Financiera y Universidades)",
      locality: "Chapinero",
      category: "ROBBERY",
      lat: 4.6565,
      lng: -74.0595,
      weight: 0.89,
      timeOfDay: "DAY",
      hour: "11:30 - 19:00",
      frequency: "Alta",
      description: "Fleteo y raponazo de celulares de alta gama a estudiantes y trabajadores de oficinas.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cha_02",
      name: "Parque de los Hippies (Calle 60 con Carrera 7)",
      locality: "Chapinero",
      category: "FIGHT",
      lat: 4.6465,
      lng: -74.0620,
      weight: 0.89,
      timeOfDay: "NIGHT",
      hour: "20:00 - 03:30",
      frequency: "Alta (Jueves a Sábado)",
      description: "Riñas multitudinarias bajo alcohol, venta ilícita y atracos en las inmediaciones del parque.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cha_03",
      name: "Zona Rosa / Calle 85 con Carrera 15",
      locality: "Chapinero",
      category: "ROBBERY",
      lat: 4.6685,
      lng: -74.0560,
      weight: 0.93,
      timeOfDay: "NIGHT",
      hour: "22:00 - 05:00",
      frequency: "Muy Alta",
      description: "Modalidad de escopolamina en establecimientos, paseos millonarios y asalto en taxis falsos.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cha_04",
      name: "Calle 53 con Carrera 13 (Chapinero Central)",
      locality: "Chapinero",
      category: "ROBBERY",
      lat: 4.6395,
      lng: -74.0655,
      weight: 0.83,
      timeOfDay: "DAY",
      hour: "10:00 - 18:00",
      frequency: "Media-Alta",
      description: "Hurto comercial y cosquilleo continuo en andenes con comercio informal.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cha_05",
      name: "Estación Calle 63 con Av. Caracas",
      locality: "Chapinero",
      category: "ROBBERY",
      lat: 4.6490,
      lng: -74.0650,
      weight: 0.88,
      timeOfDay: "NIGHT",
      hour: "19:00 - 23:00",
      frequency: "Alta",
      description: "Atraco en semáforos y paraderos del SITP paralelos a la troncal Caracas.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cha_06",
      name: "Puente Peatonal Carrera 9 con Calle 121",
      locality: "Usaquén / Chapinero Norte",
      category: "ROBBERY",
      lat: 4.6980,
      lng: -74.0320,
      weight: 0.82,
      timeOfDay: "NIGHT",
      hour: "19:30 - 22:30",
      frequency: "Media-Alta",
      description: "Asaltos con arma blanca a peatones cruzando las vías férreas y Carrera 9 solitaria.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cha_07",
      name: "Siniestros Viales: Carrera 7 con Calle 72",
      locality: "Chapinero",
      category: "ACCIDENT",
      lat: 4.6550,
      lng: -74.0560,
      weight: 0.79,
      timeOfDay: "DAY",
      hour: "08:00 - 18:00",
      frequency: "Media-Alta",
      description: "Giros peligrosos y atropellamiento recurrente de ciclistas en la ciclorruta de la séptima.",
      yearsReported: "2021-2026"
    },

    // ==========================================
    // 4. TEUSAQUILLO
    // ==========================================
    {
      id: "hist_teu_01",
      name: "Parkway de la Soledad (Carrera 24 con Calle 40)",
      locality: "Teusaquillo",
      category: "ROBBERY",
      lat: 4.6315,
      lng: -74.0745,
      weight: 0.86,
      timeOfDay: "NIGHT",
      hour: "20:00 - 02:00",
      frequency: "Alta",
      description: "Atraco con navaja en zonas verdes con follaje oscuro y asalto a personas sentadas.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_teu_02",
      name: "Eje Estudiantil Calle 45 con Carrera 13",
      locality: "Teusaquillo",
      category: "ROBBERY",
      lat: 4.6330,
      lng: -74.0675,
      weight: 0.87,
      timeOfDay: "DAY",
      hour: "12:00 - 18:30",
      frequency: "Alta",
      description: "Arrebato de celulares y mochilas con portátiles a estudiantes cruzando entre universidades.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_teu_03",
      name: "Zona de Galerías (Calle 53 con Carrera 24)",
      locality: "Teusaquillo",
      category: "FIGHT",
      lat: 4.6430,
      lng: -74.0740,
      weight: 0.85,
      timeOfDay: "NIGHT",
      hour: "22:00 - 04:30",
      frequency: "Media-Alta",
      description: "Riñas en salidas de discotecas, rotura de vidrios y robo de espejos de vehículos estacionados.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_teu_04",
      name: "Puente Peatonal Quinta Paredes (Calle 26 con Cra 45)",
      locality: "Teusaquillo",
      category: "ROBBERY",
      lat: 4.6375,
      lng: -74.0920,
      weight: 0.92,
      timeOfDay: "NIGHT",
      hour: "19:00 - 23:30",
      frequency: "Muy Alta",
      description: "Asaltos armados en puente peatonal que conecta la Universidad Nacional con Quinta Paredes.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_teu_05",
      name: "Siniestros Viales: Av. NQS (Carrera 30) con Calle 26",
      locality: "Teusaquillo",
      category: "ACCIDENT",
      lat: 4.6295,
      lng: -74.0845,
      weight: 0.88,
      timeOfDay: "NIGHT",
      hour: "21:00 - 04:00",
      frequency: "Alta",
      description: "Intercambiador con frecuentes volcamientos y colisiones a alta velocidad.",
      yearsReported: "2021-2026"
    },

    // ==========================================
    // 5. ENGATIVÁ
    // ==========================================
    {
      id: "hist_eng_01",
      name: "Puente Peatonal Titán Plaza (Av. Boyacá con Calle 80)",
      locality: "Engativá",
      category: "ROBBERY",
      lat: 4.6935,
      lng: -74.0850,
      weight: 0.97,
      timeOfDay: "NIGHT",
      hour: "18:30 - 05:00",
      frequency: "Crítica",
      description: "Punto histórico de alta gravedad: delincuentes interceptan a peatones y ciclistas en rampas.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_eng_02",
      name: "Barrio Las Ferias (Calle 72 con Carrera 68G)",
      locality: "Engativá",
      category: "ROBBERY",
      lat: 4.6780,
      lng: -74.0920,
      weight: 0.86,
      timeOfDay: "DAY",
      hour: "09:00 - 18:00",
      frequency: "Alta",
      description: "Hurto a establecimientos de comercio y atraco en moto a transeúntes del sector comercial.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_eng_03",
      name: "Sector Minuto de Dios (Calle 80 con Carrera 73A)",
      locality: "Engativá",
      category: "ROBBERY",
      lat: 4.7010,
      lng: -74.0970,
      weight: 0.85,
      timeOfDay: "NIGHT",
      hour: "19:00 - 22:30",
      frequency: "Media-Alta",
      description: "Arrebato de celulares y atraco con arma blanca cerca a puentes peatonales de la troncal 80.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_eng_04",
      name: "Puente de Guadua (Calle 80 con Carrera 119 - Salida Bogotá)",
      locality: "Engativá",
      category: "ROBBERY",
      lat: 4.7170,
      lng: -74.1350,
      weight: 0.90,
      timeOfDay: "NIGHT",
      hour: "19:00 - 01:00",
      frequency: "Alta",
      description: "Robo sistemático de bicicletas de alta gama y asaltos a peatones saliendo de la ciudad.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_eng_05",
      name: "Siniestros Viales: Av. Boyacá con Calle 80",
      locality: "Engativá",
      category: "ACCIDENT",
      lat: 4.6940,
      lng: -74.0860,
      weight: 0.93,
      timeOfDay: "DAY",
      hour: "06:30 - 19:30",
      frequency: "Muy Alta",
      description: "Corredor con mayor índice de siniestros viales, choque múltiple de transporte público y motos.",
      yearsReported: "2021-2026"
    },

    // ==========================================
    // 6. SUBA
    // ==========================================
    {
      id: "hist_sub_01",
      name: "Rincón de Suba (Calle 132 con Carrera 91)",
      locality: "Suba",
      category: "ROBBERY",
      lat: 4.7085,
      lng: -74.0895,
      weight: 0.95,
      timeOfDay: "NIGHT",
      hour: "19:00 - 04:00",
      frequency: "Muy Alta",
      description: "Hurto callejero con arma blanca, microtráfico y atracos a pasajeros de buses alimentadores.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_sub_02",
      name: "Puente Peatonal Av. Suba con Calle 136",
      locality: "Suba",
      category: "ROBBERY",
      lat: 4.7215,
      lng: -74.0760,
      weight: 0.93,
      timeOfDay: "NIGHT",
      hour: "19:30 - 02:00",
      frequency: "Muy Alta",
      description: "Asaltos sistemáticos en estructura elevada y denuncias por hurto de láminas de piso.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_sub_03",
      name: "Portal de Suba (Av. Suba con Calle 145)",
      locality: "Suba",
      category: "ROBBERY",
      lat: 4.7435,
      lng: -74.0875,
      weight: 0.89,
      timeOfDay: "DAY",
      hour: "06:00 - 09:00 / 17:00 - 20:00",
      frequency: "Alta",
      description: "Cosquilleo y arrebato masivo en accesos y paraderos del portal en horas punta.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_sub_04",
      name: "Suba La Campiña (Av. Suba con Calle 140)",
      locality: "Suba",
      category: "ROBBERY",
      lat: 4.7290,
      lng: -74.0810,
      weight: 0.83,
      timeOfDay: "NIGHT",
      hour: "20:00 - 23:30",
      frequency: "Media-Alta",
      description: "Atraco a trabajadores retornando en horarios de baja frecuencia de transporte.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_sub_05",
      name: "Siniestros Viales: Av. Ciudad de Cali con Calle 132",
      locality: "Suba",
      category: "ACCIDENT",
      lat: 4.7060,
      lng: -74.0980,
      weight: 0.89,
      timeOfDay: "DAY",
      hour: "07:00 - 18:00",
      frequency: "Alta",
      description: "Giro peligroso en intersección con alta tasa de motociclistas y ciclistas embestidos.",
      yearsReported: "2021-2026"
    },

    // ==========================================
    // 7. USAQUÉN
    // ==========================================
    {
      id: "hist_usa_01",
      name: "Calle 100 con Autopista Norte (Intercambiador TransMilenio)",
      locality: "Usaquén",
      category: "ROBBERY",
      lat: 4.6860,
      lng: -74.0580,
      weight: 0.94,
      timeOfDay: "DAY",
      hour: "07:00 - 19:30",
      frequency: "Muy Alta",
      description: "Cosquilleo en aglomeraciones, raponazo en semáforo peatonal de la Autopista Norte.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_usa_02",
      name: "Puente Peatonal Calle 100 con Autonorte (Costado Oriental)",
      locality: "Usaquén",
      category: "ROBBERY",
      lat: 4.6865,
      lng: -74.0575,
      weight: 0.91,
      timeOfDay: "NIGHT",
      hour: "20:30 - 05:00",
      frequency: "Alta",
      description: "Asaltos nocturnos con arma blanca en escaleras y pasarela del puente.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_usa_03",
      name: "Calle 116 con Carrera 15 (Pepe Sierra)",
      locality: "Usaquén",
      category: "ROBBERY",
      lat: 4.6975,
      lng: -74.0510,
      weight: 0.81,
      timeOfDay: "DAY",
      hour: "11:00 - 18:00",
      frequency: "Media-Alta",
      description: "Raponazo en bicicleta y robo de celulares a comensales en terrazas y peatones.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_usa_04",
      name: "Portal Norte (Autopista Norte con Calle 170)",
      locality: "Usaquén",
      category: "ROBBERY",
      lat: 4.7550,
      lng: -74.0450,
      weight: 0.89,
      timeOfDay: "DAY",
      hour: "06:00 - 09:00 / 17:00 - 20:30",
      frequency: "Alta",
      description: "Cosquilleo en bahías intermunicipales y arrebato en el puente de la Calle 170.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_usa_05",
      name: "Barrio Verbenal (Autopista Norte con Calle 187)",
      locality: "Usaquén",
      category: "ROBBERY",
      lat: 4.7680,
      lng: -74.0370,
      weight: 0.87,
      timeOfDay: "NIGHT",
      hour: "20:00 - 02:00",
      frequency: "Media-Alta",
      description: "Atraco en callejones poco iluminados y entradas a barrios periféricos del norte.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_usa_06",
      name: "Siniestros Viales: Autopista Norte con Calle 134",
      locality: "Usaquén",
      category: "ACCIDENT",
      lat: 4.7180,
      lng: -74.0520,
      weight: 0.86,
      timeOfDay: "NIGHT",
      hour: "21:30 - 05:00",
      frequency: "Alta",
      description: "Colisiones de vehículos particulares por exceso de velocidad en recta de la autopista.",
      yearsReported: "2021-2026"
    },

    // ==========================================
    // 8. BARRIOS UNIDOS
    // ==========================================
    {
      id: "hist_bun_01",
      name: "Calle 72 con Av. Caracas (Estación Flores / Av. Chile)",
      locality: "Barrios Unidos",
      category: "ROBBERY",
      lat: 4.6590,
      lng: -74.0645,
      weight: 0.93,
      timeOfDay: "NIGHT",
      hour: "18:30 - 23:00",
      frequency: "Muy Alta",
      description: "Atraco en paraderos, despojo de celulares en esquinas con alta afluencia de regreso a casa.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_bun_02",
      name: "Autopista Norte con Calle 80 (Polo Club / Los Héroes)",
      locality: "Barrios Unidos",
      category: "ROBBERY",
      lat: 4.6675,
      lng: -74.0625,
      weight: 0.87,
      timeOfDay: "DAY",
      hour: "08:00 - 18:30",
      frequency: "Alta",
      description: "Raponazo a vehículos parados en semáforo y peatones en el puente metálico.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_bun_03",
      name: "La Castellana (Calle 95 con Autopista Norte)",
      locality: "Barrios Unidos",
      category: "ROBBERY",
      lat: 4.6810,
      lng: -74.0590,
      weight: 0.80,
      timeOfDay: "NIGHT",
      hour: "20:00 - 01:00",
      frequency: "Media",
      description: "Robo de autopartes a vehículos estacionados y atraco en esquinas residenciales.",
      yearsReported: "2021-2026"
    },

    // ==========================================
    // 9. PUENTE ARANDA Y FONTIBÓN
    // ==========================================
    {
      id: "hist_par_01",
      name: "Carrera 68 con Calle 13 (Zona Industrial Puente Aranda)",
      locality: "Puente Aranda",
      category: "ROBBERY",
      lat: 4.6405,
      lng: -74.1120,
      weight: 0.89,
      timeOfDay: "NIGHT",
      hour: "18:00 - 22:30",
      frequency: "Alta",
      description: "Atraco armado a operarios saliendo de plantas industriales en paraderos solitarios.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_par_02",
      name: "Av. Las Américas con Carrera 50",
      locality: "Puente Aranda",
      category: "ROBBERY",
      lat: 4.6270,
      lng: -74.1130,
      weight: 0.85,
      timeOfDay: "NIGHT",
      hour: "19:00 - 23:00",
      frequency: "Media-Alta",
      description: "Asaltos en puente peatonal y paradero de la troncal Américas.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_par_03",
      name: "Siniestros Viales: Calle 13 (Av. Centenario) con Carrera 68",
      locality: "Puente Aranda",
      category: "ACCIDENT",
      lat: 4.6410,
      lng: -74.1115,
      weight: 0.94,
      timeOfDay: "DAY",
      hour: "06:00 - 19:00",
      frequency: "Crítica",
      description: "Tractomulas y camiones de carga con alta tasa de atropellamiento y siniestros con motos.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_fon_01",
      name: "Fontibón Centro (Av. Centenario con Carrera 100)",
      locality: "Fontibón",
      category: "ROBBERY",
      lat: 4.6730,
      lng: -74.1440,
      weight: 0.85,
      timeOfDay: "DAY",
      hour: "10:00 - 18:00",
      frequency: "Media-Alta",
      description: "Hurto en zona bancaria y comercio popular por cosquilleo.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_fon_02",
      name: "Siniestros Viales: Calle 13 con Carrera 100 (Salida Mosquera)",
      locality: "Fontibón",
      category: "ACCIDENT",
      lat: 4.6720,
      lng: -74.1460,
      weight: 0.91,
      timeOfDay: "NIGHT",
      hour: "19:00 - 02:00",
      frequency: "Alta",
      description: "Corredor de alta velocidad intermunicipal, muertes viales de ciclistas y peatones.",
      yearsReported: "2021-2026"
    },

    // ==========================================
    // 10. BOSA
    // ==========================================
    {
      id: "hist_bos_01",
      name: "Bosa Centro (Calle 65 Sur con Carrera 80H)",
      locality: "Bosa",
      category: "ROBBERY",
      lat: 4.6065,
      lng: -74.1870,
      weight: 0.89,
      timeOfDay: "DAY",
      hour: "09:00 - 18:00",
      frequency: "Alta",
      description: "Hurto a personas en sector comercial y ciclorrutas concurridas.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_bos_02",
      name: "Bosa El Recreo (Calle 72 Sur con Carrera 98)",
      locality: "Bosa",
      category: "ROBBERY",
      lat: 4.6385,
      lng: -74.2025,
      weight: 0.93,
      timeOfDay: "NIGHT",
      hour: "19:30 - 03:00",
      frequency: "Muy Alta",
      description: "Asaltos con arma de fuego en ciclorrutas perimetrales y parques del sector.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_bos_03",
      name: "Bosa San José (Calle 85 Sur con Carrera 81)",
      locality: "Bosa",
      category: "FIGHT",
      lat: 4.5980,
      lng: -74.1950,
      weight: 0.90,
      timeOfDay: "NIGHT",
      hour: "21:00 - 04:00",
      frequency: "Alta",
      description: "Riñas callejeras y disputas interbarriales reportadas.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_bos_04",
      name: "Siniestros Viales: Autopista Sur con Bosa Estación (Calle 65 Sur)",
      locality: "Bosa",
      category: "ACCIDENT",
      lat: 4.5990,
      lng: -74.1790,
      weight: 0.95,
      timeOfDay: "DAY",
      hour: "06:00 - 20:00",
      frequency: "Crítica",
      description: "Uno de los puntos con mayor mortalidad vial de peatones cruzando la autopista sin puente.",
      yearsReported: "2021-2026"
    },

    // ==========================================
    // 11. CIUDAD BOLÍVAR Y TUNJUELITO
    // ==========================================
    {
      id: "hist_cbo_01",
      name: "Sierra Morena (Calle 68 Sur con Carrera 60)",
      locality: "Ciudad Bolívar",
      category: "ROBBERY",
      lat: 4.5720,
      lng: -74.1610,
      weight: 0.94,
      timeOfDay: "NIGHT",
      hour: "19:00 - 04:00",
      frequency: "Muy Alta",
      description: "Atraco armado en transporte público y a transeúntes en vías empinadas y desiertas.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cbo_02",
      name: "Lucero Alto / Meissen (Av. Boyacá con Calle 60A Sur)",
      locality: "Ciudad Bolívar",
      category: "ROBBERY",
      lat: 4.5610,
      lng: -74.1480,
      weight: 0.92,
      timeOfDay: "NIGHT",
      hour: "18:30 - 23:00",
      frequency: "Alta",
      description: "Hurto en paraderos del SITP y asalto en puente peatonal del Hospital Meissen.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_cbo_03",
      name: "Perdomo (Autopista Sur con Calle 63 Sur)",
      locality: "Ciudad Bolívar",
      category: "ROBBERY",
      lat: 4.5930,
      lng: -74.1630,
      weight: 0.90,
      timeOfDay: "NIGHT",
      hour: "20:00 - 02:00",
      frequency: "Alta",
      description: "Atraco en puente peatonal sobre la Autopista Sur y terminal de transportes del sur.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_tun_01",
      name: "Venecia Nocturno (Autopista Sur con Carrera 53 - Zona Bares)",
      locality: "Tunjuelito",
      category: "FIGHT",
      lat: 4.5970,
      lng: -74.1380,
      weight: 0.94,
      timeOfDay: "NIGHT",
      hour: "21:00 - 05:00",
      frequency: "Muy Alta (Fines de Semana)",
      description: "Riñas con arma cortopunzante, exceso de licor y atracos saliendo de discotecas.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_tun_02",
      name: "Venecia Diurno (Bahías de buses Autopista Sur con Cra 53)",
      locality: "Tunjuelito",
      category: "ROBBERY",
      lat: 4.5975,
      lng: -74.1375,
      weight: 0.87,
      timeOfDay: "DAY",
      hour: "07:00 - 18:30",
      frequency: "Alta",
      description: "Raponazo en bahías de buses y puente peatonal de la estación Venecia.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_tun_03",
      name: "Siniestros Viales: Autopista Sur con Carrera 53 (Venecia)",
      locality: "Tunjuelito",
      category: "ACCIDENT",
      lat: 4.5960,
      lng: -74.1390,
      weight: 0.90,
      timeOfDay: "NIGHT",
      hour: "22:00 - 04:30",
      frequency: "Alta",
      description: "Siniestralidad vial grave por colisión moto-articulado y vehículos en exceso de velocidad.",
      yearsReported: "2021-2026"
    },

    // ==========================================
    // 12. RAFAEL URIBE URIBE Y SAN CRISTÓBAL
    // ==========================================
    {
      id: "hist_rur_01",
      name: "Sector Olaya - Quiroga (Calle 36 Sur con Carrera 24)",
      locality: "Rafael Uribe Uribe",
      category: "ROBBERY",
      lat: 4.5780,
      lng: -74.1130,
      weight: 0.88,
      timeOfDay: "NIGHT",
      hour: "19:00 - 01:00",
      frequency: "Alta",
      description: "Atraco en ciclorrutas y arrebato de bicicletas en horas de la noche.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_rur_02",
      name: "20 de Julio - Plazoleta (Carrera 6 con Calle 27 Sur)",
      locality: "San Cristóbal",
      category: "ROBBERY",
      lat: 4.5740,
      lng: -74.0920,
      weight: 0.88,
      timeOfDay: "DAY",
      hour: "08:00 - 18:00",
      frequency: "Alta (Especial Domingos)",
      description: "Cosquilleo masivo en comercio religioso, plazas y paraderos del 20 de Julio.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_rur_03",
      name: "Siniestros Viales: Av. Caracas con Av. Primero de Mayo",
      locality: "Rafael Uribe Uribe",
      category: "ACCIDENT",
      lat: 4.5775,
      lng: -74.1030,
      weight: 0.92,
      timeOfDay: "DAY",
      hour: "07:00 - 19:30",
      frequency: "Crítica",
      description: "Cruce masivo con reiteradas colisiones entre articulados, motociclistas y peatones.",
      yearsReported: "2021-2026"
    },

    // ==========================================
    // 13. CORREDORES ADICIONALES DE NQS (CARRERA 30)
    // ==========================================
    {
      id: "hist_nqs_01",
      name: "Puente Peatonal NQS con Calle 6 (Estación Comuneros)",
      locality: "Los Mártires",
      category: "ROBBERY",
      lat: 4.6050,
      lng: -74.0920,
      weight: 0.93,
      timeOfDay: "NIGHT",
      hour: "20:00 - 05:00",
      frequency: "Muy Alta",
      description: "Histórico puente solitario en curva con reiterados atracos a mano armada a transeúntes nocturnos.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_nqs_02",
      name: "Puente Peatonal Estación SENA (NQS con Calle 1 Sur)",
      locality: "Antonio Nariño",
      category: "ROBBERY",
      lat: 4.5930,
      lng: -74.1010,
      weight: 0.92,
      timeOfDay: "NIGHT",
      hour: "19:00 - 22:30",
      frequency: "Muy Alta",
      description: "Atraco sistemático a aprendices del SENA y riesgo por hurto de láminas de piso metálico.",
      yearsReported: "2021-2026"
    },
    {
      id: "hist_nqs_03",
      name: "Puente Peatonal Estación CAD (NQS con Calle 22)",
      locality: "Teusaquillo",
      category: "ROBBERY",
      lat: 4.6240,
      lng: -74.0880,
      weight: 0.89,
      timeOfDay: "NIGHT",
      hour: "19:30 - 23:00",
      frequency: "Alta",
      description: "Asaltos en pasarelas elevadas y rampas oscuras que comunican con el SuperCADE.",
      yearsReported: "2021-2026"
    }
  ];

  if (typeof window !== 'undefined') {
    window.BOGOTA_HISTORICAL_HOTSPOTS = BOGOTA_HISTORICAL_HOTSPOTS;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BOGOTA_HISTORICAL_HOTSPOTS };
  }
})();
