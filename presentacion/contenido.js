/* =====================================================================
   BEJA · ARCHIVO DE CONTENIDO EDITABLE
   ---------------------------------------------------------------------
   Aquí viven TODOS los textos, enlaces, imágenes y documentos de la web.
   Edita solo lo que está entre comillas. No borres comas ni llaves.

   • Puedes usar <em>texto</em> para resaltar en naranja dentro de títulos,
     <b>texto</b> para negrita y <br> para salto de línea.
   • Las rutas de imágenes y documentos son relativas a index.html.
   • Documentos (RUT, Estatutos, Brochures):
       pdf           → archivo PDF original (botón "Abrir PDF").
       paginas       → plantilla de imágenes de cada página ({n} = número).
       totalPaginas  → cuántas páginas tiene. Si pones 0, el visor muestra
                       el PDF directamente (útil si cambias el PDF y no
                       quieres generar imágenes).
   Consulta LEEME.txt para más detalles.
   ===================================================================== */

window.BEJA = {

  /* ---------------------------------------------------------------
     GENERAL
     --------------------------------------------------------------- */
  general: {
    marca: "Beja",
    submarca: "Colmena segura",
    razonSocial: "ABEJA SEGURIDAD S.A.S.",
    etiquetaEvento: "Shark Tank 2026",
    asignatura: "Microeconomía Aplicada",
    logo: "assets/img/logo-beja.svg",
    enlaceApp: "https://maikfakir.github.io/Beja/",
    textoBotonApp: "Abrir la app",
    correo: "abejasec@gmail.com",
    ciudad: "Bogotá D.C., Colombia",
    anio: "2026"
  },

  /* ---------------------------------------------------------------
     PORTADA (HERO)
     --------------------------------------------------------------- */
  hero: {
    eyebrow: "Red comunitaria de vigilancia preventiva",
    tituloFondo: "BEJA",
    titulo: "Lo que no se denuncia,<br><em>ahora se ve.</em>",
    bajada: "Los ciudadanos reportan lo sospechoso que ven, la comunidad lo valida y nace un mapa vivo de zonas seguras y peligrosas. Gratis para quien lo usa. Estratégico para quien decide dónde poner un policía.",
    botonPrincipal: "Descubrir Beja",
    botonSecundario: "Ver la app",
    /* Botón a la presentación en Canva (se abre en otra pestaña) */
    botonCanva: "Presentación Canva",
    enlaceCanva: "https://www.canva.com/design/DAHWh5mnGTk/a6v0SPjNmhnVgfTvp3nqCw/edit",
    /* Botón que abre el video en pantalla completa. Cambia el archivo en assets/video/ */
    botonVideo: "Ver video",
    video: "assets/video/beja-video.mp4",
    videoPortada: "assets/video/beja-video-portada.jpg",
    videoTitulo: "Beja en acción",
    dato: { valor: "69,2%", texto: "de los delitos en Colombia no se denuncia" },
    chips: [
      { tipo: "ok",    texto: "Colmena activa · 52 nodos" },
      { tipo: "alert", texto: "Alerta confirmada por 3 vecinos" },
      { tipo: "honey", texto: "Ruta 98% segura" }
    ]
  },

  /* ---------------------------------------------------------------
     1. CONSTITUCIÓN LEGAL Y RUT
     --------------------------------------------------------------- */
  legal: {
    eyebrow: "Constitución legal y RUT",
    titulo: "Nacimos <em>formales.</em><br>Listos para venderle al Estado.",
    bajada: "Beja opera como una Sociedad por Acciones Simplificada: flexibilidad entre socios, responsabilidad limitada a los aportes y la estructura que exige la contratación pública.",
    objetoSocial: "Desarrollo, administración y comercialización de una plataforma digital de alertas comunitarias, información georreferenciada y recomendaciones de rutas para la prevención de situaciones de riesgo.",
    datos: [
      { etiqueta: "Razón social", valor: "ABEJA SEGURIDAD S.A.S.", nota: "Nombre comercial: Beja" },
      { etiqueta: "Tipo de sociedad", valor: "S.A.S.", nota: "Ley 1258 de 2008 · duración indefinida" },
      { etiqueta: "NIT (simulado)", valor: "800.139.422-0", nota: "Impuestos de Bogotá · DIAN" },
      { etiqueta: "CIIU principal", valor: "6201", nota: "Desarrollo de sistemas informáticos" },
      { etiqueta: "CIIU secundario", valor: "6311", nota: "Procesamiento de datos y hosting" },
      { etiqueta: "Capital autorizado", valor: "$20.000.000", nota: "5 acciones ordinarias" },
      { etiqueta: "Domicilio", valor: "Bogotá D.C.", nota: "CL 72 6 55" },
      { etiqueta: "Responsabilidades RUT", valor: "05 · 42 · 48 · 52", nota: "Renta, contabilidad, IVA, factura electrónica" }
    ],
    requisitos: [
      { titulo: "RUES / VUE", texto: "Registro por la Ventanilla Única Empresarial de la Cámara de Comercio de Bogotá." },
      { titulo: "RUP + SECOP II", texto: "Registro Único de Proponentes para participar en contratación pública." },
      { titulo: "Ley 1581 de 2012", texto: "Política de tratamiento de datos y registro de bases en el RNBD de la SIC." }
    ],
    textoBotonDocs: "Ver documento",
    documentos: [
      {
        id: "estatutos",
        titulo: "Estatutos sociales",
        descripcion: "Acto constitutivo y estatutos de ABEJA SEGURIDAD S.A.S. · 18 páginas",
        etiqueta: "Formato simulado",
        pdf: "docs/Estatutos_Abeja.pdf",
        paginas: "assets/docs/estatutos/pag-{n}.jpg",
        totalPaginas: 18
      },
      {
        id: "rut",
        titulo: "RUT",
        descripcion: "Registro Único Tributario ante la DIAN · 7 hojas",
        etiqueta: "Formato simulado",
        pdf: "docs/RUT_ABEJA.pdf",
        paginas: "assets/docs/rut/pag-{n}.jpg",
        totalPaginas: 7
      }
    ]
  },

  /* ---------------------------------------------------------------
     2. MODELO CANVAS
     --------------------------------------------------------------- */
  canvas: {
    eyebrow: "Modelo Canvas",
    titulo: "Una plataforma.<br><em>Dos lados.</em>",
    bajada: "De un lado, ciudadanos que usan la app gratis y generan la información. Del otro, entidades de seguridad y empresas que pagan por el sistema y por esa información.",
    ladoA: { titulo: "Quienes usan", texto: "Ciudadanos en zonas urbanas. No pagan: son la fuente de la información." },
    ladoB: { titulo: "Quienes pagan", texto: "Policía Nacional, gobernaciones, alcaldías y empresas que compran datos agregados." },
    textoBoton: "Abrir el lienzo completo",
    imagenLienzo: "assets/img/canvas.jpg",
    tituloLienzoOriginal: "Lienzo de la presentación",
    tituloLienzoActual: "Lienzo actualizado",
    bloques: [
      { id: "socios", titulo: "Socios clave", items: ["Policía Nacional (modelo de cuadrantes)", "Juntas de Acción Comunal y universidades", "Redes de comerciantes", "Google Cloud / Firebase, OpenStreetMap", "Colombia Compra Eficiente"] },
      { id: "actividades", titulo: "Actividades clave", items: ["Desarrollo y mantenimiento del software", "Moderación y validación de reportes", "Analítica y mapas de riesgo", "Gestión comercial ante entidades públicas"] },
      { id: "recursos", titulo: "Recursos clave", items: ["App ciudadana y panel de gestión", "Motor de consenso comunitario", "Base histórica de incidentes", "Comunidad de usuarios activos"] },
      { id: "propuesta", titulo: "Propuesta de valor", items: ["Estado: información preventiva y georreferenciada que hoy no tiene, panel de incidentes y alertas por zona", "Ciudadano: saber qué zonas evitar, alertas de riesgo cercano y rutas que esquivan puntos peligrosos"] },
      { id: "relacion", titulo: "Relación con clientes", items: ["Entidades: gerente de cuenta, implementación, capacitación y soporte anual", "Ciudadanos: reputación de 0 a 100, de «En observación» a «Líder de Colmena»"] },
      { id: "canales", titulo: "Canales", items: ["Venta directa B2G y pilotos demostrativos", "Tienda Virtual del Estado", "PWA sin descarga", "Campañas con Policía, alcaldías y JAC"] },
      { id: "segmentos", titulo: "Segmentos", items: ["Pagan: MinDefensa / Policía, gobernaciones y alcaldías, empresas de datos", "Usan: ciudadanos en zonas urbanas"] },
      { id: "costos", titulo: "Estructura de costos", items: ["Fijos: nómina, nube, licencias, legal y contable", "Variables por contrato: implementación, capacitación, pólizas, impuestos, nube adicional"] },
      { id: "ingresos", titulo: "Fuentes de ingresos", items: ["Licencia + implementación por territorio", "Soporte y mantenimiento anual", "Informes, mapas de riesgo y API de datos anónimos", "Sin suscripción, sin publicidad"] }
    ]
  },

  /* ---------------------------------------------------------------
     3. PROBLEMA · SOLUCIÓN · DIFERENCIADOR
     --------------------------------------------------------------- */
  propuesta: {
    eyebrow: "Problema, solución y diferenciador",
    titulo: "El país planea su seguridad <em>a ciegas.</em>",
    stats: [
      { valor: "7", sufijo: "/10", etiqueta: "delitos nunca se denuncian", fuente: "DANE, ECSC 2024" },
      { valor: "46,1", sufijo: "%", etiqueta: "no denuncia porque «las autoridades no hacen nada»", fuente: "DANE, ECSC 2024" },
      { valor: "50", sufijo: "%", etiqueta: "de los colombianos se siente inseguro en su ciudad", fuente: "Red Cómo Vamos, 2025" }
    ],
    problema: {
      titulo: "El problema",
      texto: "La mitad de los colombianos se siente insegura, y en Bogotá, Cúcuta o Cartagena la cifra supera el 75%. Aun así, 7 de cada 10 delitos no llegan a las autoridades. El Estado solo conoce lo que ya pasó y además fue denunciado."
    },
    comparador: {
      titulo: "Mira la ciudad<br><em>con otros ojos.</em>",
      texto: "A la izquierda, lo que ve la autoridad hoy: solo el 30,8% que se denuncia. A la derecha, la ciudad con Beja: lo que la comunidad ve y reporta antes de que ocurra el delito.",
      etiquetaIzq: "Hoy · solo denuncias",
      etiquetaDer: "Con Beja · colmena activa"
    },
    solucion: {
      titulo: "Ves algo.<br>Lo reportas.<br><em>La colmena lo valida.</em>",
      texto: "Beja convierte a cada ciudadano en un observador preventivo. Un reporte toma segundos, los vecinos cercanos lo confirman o lo descartan y el sistema le da más peso a quien tiene buena reputación.",
      pasos: [
        { titulo: "Reporta", texto: "7 categorías y botón SOS con cuenta regresiva de 3 segundos." },
        { titulo: "Valida", texto: "Reportes a menos de 50 m se agrupan; los vecinos votan «Real» o «Falso»." },
        { titulo: "Previene", texto: "Mapa vivo para la comunidad y panel de decisión para la autoridad." }
      ]
    },
    diferenciadores: [
      { icono: "shield", titulo: "Preventivo, no reactivo", texto: "¡ADenunciar! y CAI Virtual registran lo que ya ocurrió. Beja captura la sospecha antes del delito." },
      { icono: "hex", titulo: "Único en Colombia", texto: "Reportar, ver zonas seguras e inseguras y dar referencias de tu barrio en un mismo sistema." },
      { icono: "people", titulo: "Validado por la comunidad", texto: "Un motor de consenso filtra falsas alarmas: agrupa por cercanía, pondera por reputación y permite refutar." },
      { icono: "layers", titulo: "Ciudadano + autoridad", texto: "App gratuita para la comunidad y panel de gestión para la entidad, sobre la misma información." }
    ],
    cita: "No vendemos una app: vendemos la información que hoy le falta al país para prevenir.",
    citaAutor: "Beja · apertura del pitch"
  },

  /* ---------------------------------------------------------------
     4. TEORÍA DE LA PRODUCCIÓN (COSTOS)
     --------------------------------------------------------------- */
  produccion: {
    eyebrow: "Teoría de la producción",
    titulo: "Se construye una vez.<br><em>Se replica en cada ciudad.</em>",
    bajada: "El software se desarrolla una sola vez. Sumar un territorio solo cuesta su implementación, así que el costo medio baja con cada ciudad nueva.",
    fijos: {
      titulo: "Costos fijos",
      subtitulo: "No dependen de cuántos contratos se firmen",
      total: "$54 M",
      unidad: "al mes · $648 M al año",
      items: ["Nómina del equipo (5 personas)", "Nube e infraestructura base", "Licencias y herramientas de software", "Soporte legal, contable y de datos", "Oficina / coworking"]
    },
    variables: {
      titulo: "Costos variables",
      subtitulo: "Aparecen con cada implementación territorial",
      total: "$70 M",
      unidad: "por ciudad implementada",
      items: ["Personalización para la entidad", "Capacitación y desplazamientos", "Pólizas de cumplimiento", "Impuestos de contratación pública", "Consumo adicional de nube"]
    },
    grafica: {
      titulo: "Costo medio por ciudad (millones COP)",
      nota: "CMe = (CF + CV · Q) / Q · con CF anual de $648 M y CV de $70 M por ciudad"
    },
    conceptos: [
      { titulo: "Economías de escala", texto: "El costo marginal de sumar una ciudad es solo su implementación. CMe = CT / Q cae con cada territorio." },
      { titulo: "Efectos de red", texto: "Cada ciudadano que reporta hace más precisa la información que se vende, sin aumentar el costo de producirla." }
    ]
  },

  /* ---------------------------------------------------------------
     5. ANÁLISIS DE DEMANDA Y NICHO
     --------------------------------------------------------------- */
  demanda: {
    eyebrow: "Análisis de demanda y nicho",
    titulo: "La brecha de información<br><em>es nuestro nicho.</em>",
    bajada: "La percepción de inseguridad (46–79%) es mucho mayor que la victimización real (8,4%), y casi 7 de cada 10 delitos no llegan a las autoridades. El comprador existe y tiene presupuesto.",
    contadores: [
      { valor: "69,2", sufijo: "%", etiqueta: "cifra oculta de delitos no denunciados", fuente: "DANE, ECSC 2024" },
      { valor: "304.402", sufijo: "", etiqueta: "hurtos a personas registrados en 2024", fuente: "MinDefensa / Policía" },
      { valor: "97,5", sufijo: "%", etiqueta: "de los usuarios de Internet se conecta desde el celular", fuente: "DANE, ENTIC 2024" },
      { valor: "60", sufijo: " billones", etiqueta: "presupuesto del sector defensa 2025 (4,1% del PIB)", fuente: "Presidencia" }
    ],
    ciudadesTitulo: "Percepción de inseguridad por ciudad",
    ciudadesFuente: "DANE, ECSC 2024",
    ciudades: [
      { nombre: "Pasto", valor: 82.5 },
      { nombre: "Bogotá", valor: 78.7 },
      { nombre: "Cúcuta", valor: 77.8 },
      { nombre: "Cartagena", valor: 75.1 },
      { nombre: "Cali", valor: 60.9 },
      { nombre: "Medellín", valor: 30.6 }
    ],
    preguntasTitulo: "Lo que dicen los datos recolectados",
    preguntas: [
      {
        pregunta: "¿La gente deja de reportar? ¿Por qué?",
        dato: "46,1%",
        datoTexto: "no denuncia porque cree que las autoridades no hacen nada. En Bogotá sube a 59,9%.",
        conclusion: "No es falta de interés: denunciar se siente inútil y difícil. Un reporte en Beja toma segundos y la comunidad lo ve de inmediato."
      },
      {
        pregunta: "¿Usaría un canal digital y comunitario?",
        dato: "61,4%",
        datoTexto: "de los bogotanos se informa de seguridad por redes o WhatsApp. Hay 18.190 frentes de seguridad activos.",
        conclusion: "La comunidad ya se organiza, pero en canales dispersos que no dejan datos ordenados. Beja reúne esa participación en un solo sistema."
      },
      {
        pregunta: "¿Evitaría zonas si supiera que son peligrosas?",
        dato: "49%",
        datoTexto: "de los colombianos se siente seguro caminando solo de noche (promedio mundial: 73%).",
        conclusion: "El miedo ya cambia la conducta. Hoy se evitan zonas por rumores; Beja da información validada para decidir por dónde moverse."
      },
      {
        pregunta: "¿Al Estado le sirve información calle por calle?",
        dato: "2%",
        datoTexto: "de los segmentos de calle de Bogotá concentró el 100% de los homicidios (2012–2015).",
        conclusion: "El delito se concentra en pocas calles, y hoy esos puntos se calculan solo con lo denunciado. Beja completa el mapa."
      }
    ],
    financiacionTitulo: "El cliente ya tiene de dónde pagar",
    financiacion: [
      { titulo: "Nación", texto: "Presupuesto del sector defensa y Policía Nacional ($16,8 billones)." },
      { titulo: "FONSECON", texto: "Ministerio del Interior: cofinancia sistemas integrados de seguridad." },
      { titulo: "FONSET", texto: "5% de los contratos de obra pública en cada departamento y municipio." }
    ],
    referentesTitulo: "Ya funciona en otros países",
    referentes: [
      { nombre: "Fogo Cruzado", pais: "Brasil", texto: "Reportes ciudadanos en 49 ciudades, usados por legisladores y universidades." },
      { nombre: "Safecity", pais: "India", texto: "+13.500 reportes; ayudó a reorganizar patrullajes con la policía." },
      { nombre: "Waze", pais: "Referente", texto: "2,3 M de usuarios en Colombia. La misma lógica colaborativa, aplicada al tráfico." }
    ]
  },

  /* ---------------------------------------------------------------
     6. COMPETENCIA DIRECTA E INDIRECTA
     --------------------------------------------------------------- */
  competencia: {
    eyebrow: "Competencia y estructura de mercado",
    titulo: "No competimos por precio.<br><em>Competimos por lo que nadie más ve.</em>",
    bajada: "Del lado de la oferta hay denuncias virtuales, cámaras y botones de pánico, pero ninguna combina reporte preventivo, validación comunitaria y mapa de zonas.",
    espectroTitulo: "¿En qué mercado competimos?",
    espectro: ["Competencia perfecta", "Competencia monopolística", "Oligopolio", "Monopolio"],
    espectroActivo: 1,
    estructuras: [
      { lado: "Oferta", nombre: "Competencia monopolística", texto: "Muchos oferentes con productos diferenciados. Beja compite por diferenciación: nadie más capta la cifra oculta." },
      { lado: "Demanda", nombre: "Oligopsonio", texto: "Pocos compradores y grandes (Nación, departamentos, municipios), con poder de negociación y ciclos de presupuesto." }
    ],
    columnas: ["Preventivo", "Validación comunitaria", "Mapa de zonas", "Gratis para el ciudadano", "Panel para la autoridad"],
    competidores: [
      { nombre: "Beja", tipo: "nosotros", valores: ["si", "si", "si", "si", "si"] },
      { nombre: "Apps de cámaras y botón de pánico", tipo: "Directa", valores: ["parcial", "no", "no", "parcial", "parcial"] },
      { nombre: "Citizen (EE. UU.)", tipo: "Directa", valores: ["si", "parcial", "si", "no", "no"] },
      { nombre: "¡ADenunciar! (Policía)", tipo: "Indirecta", valores: ["no", "no", "no", "si", "si"] },
      { nombre: "CAI Virtual", tipo: "Indirecta", valores: ["no", "no", "no", "si", "si"] },
      { nombre: "Grupos de WhatsApp y frentes", tipo: "Indirecta", valores: ["si", "parcial", "no", "si", "no"] }
    ],
    leyenda: { si: "Sí", parcial: "Parcial", no: "No" },
    indirectaNota: "La competencia indirecta más grande es la infraestructura física (cámaras, centros de monitoreo): compite por el mismo presupuesto de seguridad."
  },

  /* ---------------------------------------------------------------
     7. TEORÍA DEL CONSUMIDOR
     --------------------------------------------------------------- */
  consumidor: {
    eyebrow: "Teoría del consumidor aplicada",
    titulo: "Quién compra, por qué compra<br>y <em>cuánto está dispuesto a pagar.</em>",
    perfiles: [
      {
        rol: "Compra",
        nombre: "El Estado",
        detalle: "Policía Nacional · gobernaciones · alcaldías",
        porque: "Maximiza el bienestar social con presupuesto restringido. Su utilidad: prevenir delitos, asignar mejor las patrullas y mejorar la percepción de seguridad, que es un indicador político y de gestión.",
        paga: "Paga con presupuesto público: licencia, soporte y datos."
      },
      {
        rol: "Usa",
        nombre: "El ciudadano",
        detalle: "Peatones y residentes urbanos",
        porque: "Busca tranquilidad y reducir el riesgo que percibe al desplazarse. La reputación y los niveles son su incentivo para reportar con veracidad.",
        paga: "Precio cero. Su «pago» es la información que aporta."
      }
    ],
    dapTitulo: "Disposición a pagar: más información por peso invertido",
    dapTexto: "Frente a la infraestructura física, Beja cuesta una fracción y capta lo que ninguna cámara ve.",
    dap: [
      { nombre: "Beja · una ciudad", valor: 250, etiqueta: "$250 M" },
      { nombre: "Contrato cámaras LPR Bogotá", valor: 14339, etiqueta: "$14.339 M" },
      { nombre: "C5i de Medellín", valor: 205000, etiqueta: "+$205.000 M" }
    ],
    externalidad: {
      titulo: "Externalidad positiva",
      texto: "Cada reporte beneficia a terceros que no lo hicieron. Como con los bienes públicos, el mercado solo produciría menos información de la necesaria. Por eso la compra el Estado."
    },
    elasticidad: {
      titulo: "Elasticidad",
      texto: "Demanda inelástica al precio (la seguridad es prioridad y se compara con alternativas más caras), pero sensible al presupuesto y al calendario político."
    }
  },

  /* ---------------------------------------------------------------
     8. PRECIO Y PUNTO DE EQUILIBRIO
     --------------------------------------------------------------- */
  precio: {
    eyebrow: "Valor de precio y punto de equilibrio",
    titulo: "Con <em>4 ciudades</em> al año,<br>Beja se paga sola.",
    bajada: "La unidad de venta es la ciudad. Cada implementación vale lo mismo y, desde el año siguiente, genera soporte anual.",
    planes: [
      { nombre: "Licencia + implementación", precio: "$250 M", unidad: "por ciudad · pago único", costo: "CV: $70 M", destacado: true },
      { nombre: "Soporte y mantenimiento", precio: "$50 M", unidad: "al año por ciudad", costo: "CV: $15 M", destacado: false },
      { nombre: "Paquete de datos / API", precio: "$30 M", unidad: "al año por cliente", costo: "CV: $5 M", destacado: false }
    ],
    /* Valores del cálculo (millones de COP). Cambiarlos actualiza la gráfica. */
    calculo: { costoFijo: 648, precio: 250, costoVariable: 70 },
    formulaTexto: "Q* = CF / (P − CVu)",
    lectura: "Un solo contrato nacional de 5 ciudades supera el punto de equilibrio. Soporte y datos no entran en Q*: son margen de seguridad.",
    simuladorTitulo: "Mueve el precio y mira el equilibrio",
    flujoTitulo: "Flujo de caja proyectado (millones COP)",
    flujo: [
      { anio: "Año 1", fase: "Piloto con Policía", ingresos: 250, costos: 718, resultado: -468, acumulado: -468 },
      { anio: "Año 2", fase: "Contrato nacional · 5 ciudades", ingresos: 1360, costos: 1075, resultado: 285, acumulado: -183 },
      { anio: "Año 3", fase: "Modelo mixto · 4 ciudades", ingresos: 1450, costos: 1151, resultado: 299, acumulado: 116 }
    ],
    capitalSemilla: "Capital semilla requerido: ≈ $500 M. La inversión se recupera en el año 3.",
    nota: "Cifras estimadas por el equipo; deben validarse con cotizaciones y entrevistas a entidades."
  },

  /* ---------------------------------------------------------------
     9. BROCHURES
     --------------------------------------------------------------- */
  brochures: {
    eyebrow: "Brochures",
    titulo: "Tres piezas.<br><em>Un mismo mensaje.</em>",
    bajada: "Una pieza corporativa, una comercial para entidades de seguridad y una corta para las campañas de adopción ciudadana.",
    textoBoton: "Ver brochure",
    lista: [
      {
        id: "corporativo",
        titulo: "Corporativo",
        publico: "BEJA S.A.S. · aliados e inversionistas",
        descripcion: "Quiénes somos, misión, visión, equipo y contacto.",
        pdf: "docs/Brochure_Corporativo_Beja.pdf",
        paginas: "assets/docs/brochure/corporativo-{n}.jpg",
        totalPaginas: 2
      },
      {
        id: "comercial",
        titulo: "Comercial",
        publico: "Entidades de seguridad",
        descripcion: "La cifra oculta, cómo Beja genera información, qué gana la entidad y cómo se contrata.",
        pdf: "docs/Brochure_Comercial_Beja.pdf",
        paginas: "assets/docs/brochure/comercial-{n}.jpg",
        totalPaginas: 2
      },
      {
        id: "ciudadano",
        titulo: "Ciudadano",
        publico: "Campañas de adopción",
        descripcion: "Cómo reportar y cómo ver las zonas seguras, en una sola hoja.",
        pdf: "docs/Brochure_Ciudadano_Beja.pdf",
        paginas: "assets/docs/brochure/ciudadano-{n}.jpg",
        totalPaginas: 1
      }
    ],
    /* Infografía que se abre en pantalla completa desde la sección de brochures */
    infografia: {
      etiqueta: "Infografía",
      titulo: "Beja en <em>una sola imagen.</em>",
      texto: "Base legal, propuesta B2G, la cifra oculta del 69,2%, precios y la red colmena: todo el modelo resumido para compartir.",
      imagen: "assets/img/infografia-beja.jpg",
      textoBoton: "Ver infografía completa"
    },
    mision: "Convertir la observación de los ciudadanos en información preventiva confiable para que comunidades y autoridades se anticipen al delito.",
    vision: "En 2030, ser el sistema de referencia en información preventiva de seguridad ciudadana en Colombia y América Latina."
  },

  /* ---------------------------------------------------------------
     10. ESPECIFICACIÓN DE LA PÁGINA WEB
     --------------------------------------------------------------- */
  web: {
    eyebrow: "Especificación de la página web",
    titulo: "Dos caras.<br><em>Un solo sistema.</em>",
    bajada: "El punto de venta no es una tienda: es la demostración del sistema funcionando. App web progresiva para el ciudadano y panel de gestión para la autoridad.",
    capturaApp: "assets/img/app-mapa.jpg",
    appCiudadana: {
      titulo: "App ciudadana (PWA)",
      items: [
        "Reporte en 7 categorías: aviso general, riña, robo, emergencia médica, actividad sospechosa, accidente y vandalismo",
        "Botón SOS con cuenta regresiva de 3 segundos",
        "Aviso al acercarte a menos de 220 m de un riesgo activo",
        "Mapa de calor con filtro día/noche, CAI cercanos y rutas que esquivan zonas de riesgo"
      ]
    },
    panel: {
      titulo: "Panel de gestión",
      items: [
        "Mapa táctico con incidentes activos y mapa de calor por categoría",
        "Despacho de unidades con código y tiempo estimado",
        "Alertas por zona a los ciudadanos dentro de un radio",
        "Exportar historial anónimo en CSV: la información que compra el Estado"
      ]
    },
    cicloTitulo: "Ciclo de vida de una alerta",
    ciclo: [
      { color: "amarilla", nombre: "En verificación", texto: "Un ciudadano reporta; la comunidad cercana vota." },
      { color: "roja", nombre: "Confirmada", texto: "Suficiente consenso: aparece en el panel en tiempo real. Tras 8 min baja a amarilla." },
      { color: "azul", nombre: "Atendida", texto: "La autoridad despacha una patrulla y cierra el incidente." }
    ],
    demoTitulo: "Guion de la demostración · 3 minutos",
    demo: [
      "Un ciudadano reporta una actividad sospechosa desde el celular.",
      "Un segundo usuario la confirma: la alerta pasa a roja y aparece en el panel.",
      "La autoridad despacha una unidad y envía una alerta de zona.",
      "Se muestra el mapa de calor: la información que compra el Estado."
    ],
    ctaTitulo: "Pruébala en vivo",
    ctaTexto: "La app ya está publicada. Ábrela desde el celular o el computador."
  },

  /* ---------------------------------------------------------------
     PIE DE PÁGINA
     --------------------------------------------------------------- */
  pie: {
    frase: "Cuidar a otros empieza por <em>ver lo que pasa.</em>",
    equipoTitulo: "Equipo",
    equipo: [
      "Deisy Paola Galindo Suescún",
      "Laura Daniela Herrán Silva",
      "Judith Hernández Trujillo",
      "Maicol Gabriel Olarte Forero",
      "Carlos Andrés Rodríguez Cetina",
      "Alisson Michele Riaño Pichón"
    ],
    fuentes: "Fuentes: DANE (ECSC 2024, ENTIC 2024), CCB (EPV 2025), Bogotá Cómo Vamos y Red Cómo Vamos (EPC 2025), Gallup (Global Safety Report 2025), Policía Nacional, Blattman et al. (NBER / J-PAL), Presidencia de la República."
  }
};
