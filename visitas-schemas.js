/* =============================================================================
 * BENSOL · Toma de datos para presupuestos · Definición de los cuestionarios
 *
 * ESTE ARCHIVO ES "LA DATA". Todo lo que se decidió en el documento de diseño
 * vive aquí, y la pantalla se dibuja sola a partir de esto. Para añadir un
 * campo NO se toca la base de datos ni el renderer: se añade aquí y ya está.
 *
 * Reglas para editar:
 *   - `key` es el nombre del campo dentro de `visita_fichas.datos`. Una vez
 *     publicado, NO se renombra: las fichas viejas lo tienen guardado así.
 *   - Si cambias el SIGNIFICADO de un campo, sube VERSION y deja el anterior.
 *   - `motor: true` marca los datos de cálculo: los que alimentarán las
 *     líneas de presupuesto y los que se mapean a campos personalizados del
 *     deal en Teamleader. No pueden quedar en null en silencio.
 *
 * Tipos de campo que entiende visitas-form.js:
 *   texto · textarea · numero · entero · bool · opcion · multi · lista
 * ============================================================================= */

export const VERSION = 1;

export const CATEGORIAS = [
  { key: 'aerotermia',         nombre: 'Aerotermia',         corto: 'Aero'  },
  { key: 'solar',              nombre: 'Paneles solares',    corto: 'Solar' },
  { key: 'electricidad',       nombre: 'Electricidad',       corto: 'Elec'  },
  { key: 'aire_acondicionado', nombre: 'Aire acondicionado', corto: 'A/A'   },
];

/* -----------------------------------------------------------------------------
 * Bloque común de la visita. Estos campos NO van en el jsonb: son columnas de
 * `visitas`. Se definen aquí igual para que el formulario se dibuje solo.
 * --------------------------------------------------------------------------- */
export const COMUN = {
  id: 'comun',
  secciones: [
    {
      id: 'inmueble',
      titulo: 'El inmueble',
      campos: [
        { key: 'direccion', etiqueta: 'Dirección', tipo: 'texto', obligatorio: true,
          placeholder: 'Calle y número' },
        { key: 'poblacion', etiqueta: 'Población', tipo: 'texto', obligatorio: true, motor: true },
        { key: 'cp', etiqueta: 'Código postal', tipo: 'texto' },
        { key: 'tipo_inmueble', etiqueta: 'Tipo', tipo: 'opcion', motor: true,
          opciones: ['unifamiliar', 'adosado', 'piso', 'atico', 'local', 'nave', 'comunidad'] },
        { key: 'superficie_m2', etiqueta: 'Superficie útil', tipo: 'numero', unidad: 'm²',
          obligatorio: true, motor: true, ayuda: 'Útil, no construida' },
        { key: 'plantas', etiqueta: 'Plantas', tipo: 'entero', motor: true },
        { key: 'habitaciones', etiqueta: 'Habitaciones', tipo: 'entero', motor: true },
        { key: 'banos', etiqueta: 'Baños', tipo: 'entero', motor: true,
          ayuda: 'Mandan en el dimensionado del ACS' },
        { key: 'anio_construccion', etiqueta: 'Año de construcción', tipo: 'entero', motor: true,
          ayuda: 'Aproximado. Marca normativa y aislamiento esperable' },
        { key: 'ocupantes', etiqueta: 'Ocupantes', tipo: 'entero', motor: true,
          ayuda: 'Los habituales, no los de verano' },
      ],
    },
    {
      id: 'acceso',
      titulo: 'Acceso y logística',
      campos: [
        { key: 'acceso', etiqueta: '¿Cómo se llega?', tipo: 'opcion', motor: true,
          opciones: ['facil', 'medio', 'dificil'] },
        { key: 'acceso_notas', etiqueta: 'Detalles', tipo: 'textarea',
          placeholder: 'Ascensor, calle estrecha, metros de acarreo, dónde para el camión…' },
        { key: 'necesita_grua', etiqueta: 'Hace falta grúa', tipo: 'bool', motor: true },
        { key: 'necesita_andamio', etiqueta: 'Hace falta andamio', tipo: 'bool', motor: true },
      ],
    },
    {
      id: 'comercial',
      titulo: 'Comercial',
      campos: [
        { key: 'origen', etiqueta: '¿De dónde viene?', tipo: 'opcion',
          opciones: ['recomendacion', 'web', 'cliente_existente', 'llamada', 'constructora', 'vaillant'] },
        { key: 'plazo_deseado', etiqueta: 'Plazo que pide', tipo: 'opcion', motor: true,
          opciones: ['urgente', '1_mes', '3_meses', 'sin_prisa'] },
        { key: 'interesa_subvencion', etiqueta: 'Le interesa subvención', tipo: 'bool', motor: true,
          ayuda: 'Cambia la documentación que hay que preparar' },
        { key: 'interesa_financiacion', etiqueta: 'Le interesa financiación', tipo: 'bool' },
        { key: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea',
          placeholder: 'Lo que no cabe en ningún campo' },
      ],
    },
  ],
};

/* ---------------------------------------------------------------------------
 * AEROTERMIA
 * ------------------------------------------------------------------------- */
const AEROTERMIA = {
  categoria: 'aerotermia',
  fotos_minimas: [
    { key: 'cuadro_electrico', etiqueta: 'Cuadro eléctrico abierto' },
    { key: 'ubicacion_ue', etiqueta: 'Dónde iría la unidad exterior' },
    { key: 'instalacion_actual', etiqueta: 'Caldera o instalación actual' },
    { key: 'factura', etiqueta: 'Factura energética' },
  ],
  secciones: [
    {
      id: 'necesidad',
      titulo: 'Qué necesita',
      campos: [
        { key: 'necesidades', etiqueta: '¿Para qué?', tipo: 'multi', obligatorio: true, motor: true,
          opciones: ['calefaccion', 'acs', 'refrigeracion', 'piscina'] },
        { key: 'sistema_actual', etiqueta: 'Qué tiene ahora', tipo: 'opcion', motor: true,
          opciones: ['ninguno', 'caldera_gas', 'caldera_gasoleo', 'caldera_pellets', 'electrico', 'bomba_calor'] },
        { key: 'sistema_antiguedad_anios', etiqueta: 'Antigüedad', tipo: 'entero', unidad: 'años' },
        { key: 'sistema_marca_modelo', etiqueta: 'Marca y modelo', tipo: 'texto',
          ayuda: 'Si se lee en la placa' },
        { key: 'consumo_actual_anual', etiqueta: 'Gasto actual', tipo: 'numero', unidad: '€/año',
          ayuda: 'Es el argumento de venta. Foto a la factura' },
      ],
    },
    {
      id: 'emisores',
      titulo: 'Emisores',
      campos: [
        { key: 'emisores_actuales', etiqueta: 'Los que hay', tipo: 'multi', motor: true,
          opciones: ['radiadores', 'suelo_radiante', 'fancoils', 'ninguno'] },
        { key: 'radiadores_n', etiqueta: 'Radiadores', tipo: 'entero', motor: true },
        { key: 'radiadores_estado', etiqueta: 'Estado de los radiadores', tipo: 'opcion', motor: true,
          opciones: ['bueno', 'regular', 'a_sustituir'],
          ayuda: 'Si se reaprovechan, comprobar que sirven a baja temperatura' },
        { key: 'emisores_previstos', etiqueta: 'Los que se ponen', tipo: 'multi',
          obligatorio: true, motor: true,
          opciones: ['suelo_radiante', 'fancoils', 'radiadores_bt', 'se_mantiene'] },
        { key: 'suelo_radiante_m2', etiqueta: 'Suelo radiante por planta', tipo: 'lista', motor: true,
          subcampos: [
            { key: 'planta', etiqueta: 'Planta', tipo: 'texto' },
            { key: 'm2', etiqueta: 'm²', tipo: 'numero' },
          ] },
        { key: 'fancoils', etiqueta: 'Fancoils', tipo: 'lista', motor: true,
          subcampos: [
            { key: 'estancia', etiqueta: 'Estancia', tipo: 'texto' },
            { key: 'tipo', etiqueta: 'Tipo', tipo: 'opcion', opciones: ['pared', 'techo', 'conductos', 'suelo'] },
            { key: 'm2', etiqueta: 'm²', tipo: 'numero' },
          ] },
        // Marca de la bomba de calor (26-10-2026): Vaillant aroTHERM o Midea. Sin
        // marcar, Vaillant. Se puede cambiar también desde el presupuesto.
        { key: 'marca_aerotermia', etiqueta: 'Marca de la bomba de calor', tipo: 'opcion', motor: true,
          opciones: ['vaillant', 'midea'], ayuda: 'Sin marcar, Vaillant. El acumulador y el kit son los mismos' },
        { key: 'acs_acumulador_litros', etiqueta: 'Acumulador de ACS', tipo: 'entero', unidad: 'l',
          motor: true, ayuda: 'Se propone por ocupantes y baños. Se puede cambiar' },
      ],
    },
    {
      id: 'ubicacion',
      titulo: 'Dónde van las máquinas',
      campos: [
        { key: 'ubicacion_ue', etiqueta: 'Unidad exterior', tipo: 'opcion',
          obligatorio: true, motor: true,
          opciones: ['terraza', 'cubierta', 'patio', 'jardin', 'fachada', 'galeria'] },
        { key: 'distancia_ue_ui_m', etiqueta: 'Distancia exterior → interior', tipo: 'numero',
          unidad: 'm', motor: true, ayuda: 'Recorrido real, no línea recta' },
        { key: 'espacio_ui', etiqueta: 'Sitio del hidrokit y el acumulador', tipo: 'texto', motor: true,
          placeholder: 'Cuarto técnico, galería, garaje… con alto × ancho en cm' },
        { key: 'restriccion_ruido', etiqueta: 'Problema de ruido', tipo: 'bool',
          ayuda: 'Vecinos a menos de 3 m, patio interior, comunidad quisquillosa' },
      ],
    },
    {
      id: 'electrico',
      titulo: 'Parte eléctrica',
      campos: [
        { key: 'potencia_contratada_kw', etiqueta: 'Potencia contratada', tipo: 'numero',
          unidad: 'kW', obligatorio: true, motor: true, ayuda: 'De la factura' },
        { key: 'suministro', etiqueta: 'Suministro', tipo: 'opcion', motor: true,
          opciones: ['monofasico', 'trifasico'] },
        { key: 'distancia_cuadro_m', etiqueta: 'Del cuadro a la unidad exterior', tipo: 'numero',
          unidad: 'm', motor: true, ayuda: 'Define sección y metros de manguera' },
      ],
    },
    {
      id: 'envolvente',
      titulo: 'La vivienda',
      campos: [
        { key: 'aislamiento', etiqueta: 'Aislamiento', tipo: 'opcion', motor: true,
          opciones: ['bueno', 'regular', 'malo'] },
        { key: 'carpinteria', etiqueta: 'Ventanas', tipo: 'opcion', motor: true,
          opciones: ['simple', 'doble', 'climalit', 'rotura_puente_termico'] },
        { key: 'zona_climatica', etiqueta: 'Zona climática', tipo: 'opcion', motor: true,
          opciones: ['B3', 'A3', 'C2', 'D3'], defecto: 'B3',
          ayuda: 'B3 en Mallorca salvo montaña' },
        { key: 'piscina_m3', etiqueta: 'Piscina', tipo: 'numero', unidad: 'm³', motor: true,
          ayuda: 'Solo si has marcado piscina arriba' },
      ],
    },
    {
      id: 'obra',
      titulo: 'Obra y cierre',
      campos: [
        { key: 'obra_necesaria', etiqueta: 'Qué hay que picar o quitar', tipo: 'multi', motor: true,
          opciones: ['rozas', 'zanja', 'perforacion_muro', 'retirada_caldera',
                     'retirada_deposito_gasoleo', 'falso_techo'] },
        { key: 'carga_termica_kw', etiqueta: 'Carga térmica estimada', tipo: 'numero',
          unidad: 'kW', motor: true, calculado: true,
          ayuda: 'La propone la app. Si la cambias, manda la tuya' },
        { key: 'legalizacion_necesaria', etiqueta: 'Hace falta legalizar', tipo: 'bool', motor: true,
          ayuda: 'Proyecto, certificado, alta en industria' },
      ],
    },
  ],
};

/* ---------------------------------------------------------------------------
 * PANELES SOLARES
 * ------------------------------------------------------------------------- */
const SOLAR = {
  categoria: 'solar',
  fotos_minimas: [
    { key: 'cubierta_general', etiqueta: 'Cubierta entera' },
    { key: 'cubierta_material', etiqueta: 'Detalle del material de cubierta' },
    { key: 'sombras', etiqueta: 'Obstáculos y sombras' },
    { key: 'cuadro_contador', etiqueta: 'Cuadro y contador' },
    { key: 'sitio_inversor', etiqueta: 'Dónde iría el inversor' },
    { key: 'factura', etiqueta: 'Factura de luz' },
  ],
  secciones: [
    {
      id: 'consumo',
      titulo: 'Consumo y suministro',
      campos: [
        { key: 'objetivo', etiqueta: 'Qué busca', tipo: 'opcion', obligatorio: true, motor: true,
          opciones: ['autoconsumo', 'autoconsumo_baterias', 'aislada'] },
        { key: 'cups', etiqueta: 'CUPS', tipo: 'texto',
          ayuda: 'De la factura. Imprescindible para legalizar' },
        { key: 'comercializadora', etiqueta: 'Comercializadora', tipo: 'texto' },
        { key: 'tarifa', etiqueta: 'Tarifa', tipo: 'texto', placeholder: '2.0TD, 3.0TD…' },
        { key: 'potencia_contratada_kw', etiqueta: 'Potencia contratada', tipo: 'numero',
          unidad: 'kW', obligatorio: true, motor: true },
        { key: 'consumo_anual_kwh', etiqueta: 'Consumo anual', tipo: 'numero', unidad: 'kWh',
          obligatorio: true, motor: true, ayuda: 'Suma de los 12 meses' },
        // Presupuestador FV v2 (Ramón, 12-10-2026): si no hay consumo, el
        // dimensionado sale de la factura mensual (la exacta, o su tramo).
        { key: 'factura_mensual_eur', etiqueta: 'Factura mensual', tipo: 'numero', unidad: '€/mes', motor: true,
          ayuda: 'Si no se sabe el consumo anual. Manda sobre el tramo' },
        { key: 'factura_rango', etiqueta: 'Tramo de factura', tipo: 'opcion', motor: true,
          opciones: ['menos_100', '100_200', '200_350', '350_600', 'mas_600', 'no_lo_se'],
          ayuda: 'Solo si no hay consumo ni factura exacta' },
        // Arranque por kWp (09-10-2026): si el cliente pide una potencia, el motor
        // saca los paneles de ahí. Los módulos que caben mandan sobre esto; esto,
        // sobre el consumo anual.
        { key: 'kwp_objetivo', etiqueta: 'Potencia que pide', tipo: 'numero', unidad: 'kWp', motor: true,
          ayuda: 'Si el cliente pide una potencia concreta. Si se apuntan los módulos que caben, mandan ellos' },
        { key: 'perfil_consumo', etiqueta: 'Cuándo gasta', tipo: 'opcion', motor: true,
          opciones: ['diurno', 'nocturno', 'mixto', 'fin_de_semana'] },
        { key: 'cargas_previstas', etiqueta: 'Lo que va a sumar', tipo: 'multi', motor: true,
          opciones: ['vehiculo_electrico', 'piscina', 'aerotermia', 'aire_acondicionado', 'bomba_riego'] },
        { key: 'suministro', etiqueta: 'Suministro', tipo: 'opcion', motor: true,
          opciones: ['monofasico', 'trifasico'] },
        // Desglose FV (oct 2026): trámites y opcionales salen de esto.
        { key: 'excedentes', etiqueta: 'Excedentes', tipo: 'opcion', motor: true,
          opciones: ['con_excedentes', 'sin_excedentes'],
          ayuda: 'Con compensación de la comercializadora, o sin verter (antivertido)' },
        { key: 'excedentes_gestion', etiqueta: 'Derivar excedentes a', tipo: 'opcion', motor: true,
          opciones: ['no', 'termo', 'aerotermia'] },
        { key: 'cargador_ve', etiqueta: 'Quiere cargador de coche', tipo: 'bool', motor: true },
      ],
    },
    {
      id: 'cubierta',
      titulo: 'La cubierta',
      campos: [
        { key: 'tipo_cubierta', etiqueta: 'Tipo', tipo: 'opcion', obligatorio: true, motor: true,
          opciones: ['teja_arabe', 'plana_transitable', 'plana_no_transitable',
                     'chapa_sandwich', 'pizarra', 'pergola', 'suelo'] },
        { key: 'estado_cubierta', etiqueta: 'Estado', tipo: 'opcion', motor: true,
          opciones: ['bueno', 'regular', 'malo'],
          ayuda: 'Si es malo, avisar ANTES de presupuestar' },
        { key: 'necesita_refuerzo', etiqueta: 'Hay que reforzar', tipo: 'bool', motor: true },
        { key: 'superficie_disponible_m2', etiqueta: 'Superficie libre', tipo: 'numero', unidad: 'm²',
          obligatorio: true, motor: true, ayuda: 'Sin obstáculos ni sombras' },
        { key: 'orientacion_azimut', etiqueta: 'Orientación', tipo: 'numero', unidad: '° desde el sur',
          motor: true, ayuda: 'Con la brújula del móvil' },
        { key: 'inclinacion_grados', etiqueta: 'Inclinación', tipo: 'numero', unidad: '°', motor: true,
          ayuda: '0 en cubierta plana, unos 30 en teja' },
        { key: 'modulos_estimados', etiqueta: 'Módulos que caben', tipo: 'entero', motor: true,
          calculado: true },
        { key: 'filas_paneles', etiqueta: 'Filas de paneles', tipo: 'lista', motor: true,
          ayuda: 'Una por cada hilera. Con esto salen los raíles, ganchos y grapas. Si no se apunta, el motor reparte de 10 en 10',
          subcampos: [{ key: 'paneles', etiqueta: 'Paneles en la fila', tipo: 'entero' }] },
        { key: 'orientacion_panel', etiqueta: 'Panel en', tipo: 'opcion', motor: true,
          opciones: ['vertical', 'horizontal'], ayuda: 'En horizontal la estructura de teja lleva más perfil' },
        { key: 'plana_anclaje', etiqueta: 'En plana: cómo se sujeta', tipo: 'opcion', motor: true,
          opciones: ['lastre', 'anclaje_quimico'],
          ayuda: 'Lastre si no se puede perforar; anclaje químico (varilla, taco químico y malla) si sí' },
        { key: 'tejas_reposicion', etiqueta: 'Tejas de reposición', tipo: 'entero', motor: true,
          ayuda: 'Las que se van a romper al poner ganchos' },
        { key: 'fibrocemento', etiqueta: 'Cubierta de fibrocemento', tipo: 'bool', motor: true,
          ayuda: 'Se excluye o va a empresa autorizada' },
        { key: 'plantas', etiqueta: 'Plantas del edificio', tipo: 'entero', motor: true },
        { key: 'acceso_cubierta', etiqueta: 'Acceso a la cubierta', tipo: 'opcion', motor: true,
          opciones: ['escalera', 'trampilla', 'solo_exterior'] },
        { key: 'sombras', etiqueta: 'Sombras', tipo: 'opcion', motor: true,
          opciones: ['ninguna', 'parcial', 'importante'] },
        { key: 'sombras_origen', etiqueta: 'De qué y a qué hora', tipo: 'texto',
          placeholder: 'Chimenea, árboles, edificio de al lado… y franja horaria' },
      ],
    },
    {
      id: 'montaje',
      titulo: 'Montaje',
      campos: [
        { key: 'altura_cubierta_m', etiqueta: 'Altura desde la calle', tipo: 'numero', unidad: 'm',
          motor: true },
        { key: 'medio_elevacion', etiqueta: 'Cómo se sube el material', tipo: 'opcion', motor: true,
          opciones: ['ninguno', 'escalera', 'andamio', 'grua'],
          ayuda: 'El elevador propio va aparte por horas. La plataforma elevadora no se usa: si hace falta medio, camión grúa' },
        { key: 'grua_horas', etiqueta: 'Horas de camión grúa', tipo: 'numero', unidad: 'h', motor: true,
          ayuda: 'A 75 €/h. Se puede cambiar también desde el presupuesto' },
        { key: 'horas_elevador', etiqueta: 'Horas de elevador propio', tipo: 'numero', unidad: 'h', motor: true,
          ayuda: 'Se cobra aparte a 65 €/h. En cubierta plana son al menos 4' },
        { key: 'km_obra', etiqueta: 'Km de la nave a la obra', tipo: 'numero', unidad: 'km', motor: true,
          ayuda: 'Solo ida. Si no se pone, se cuentan 20' },
        { key: 'distancia_cubierta_inversor_m', etiqueta: 'Cubierta → inversor', tipo: 'numero',
          unidad: 'm', motor: true, ayuda: 'Metros de continua' },
        { key: 'distancia_inversor_cuadro_m', etiqueta: 'Inversor → cuadro general', tipo: 'numero',
          unidad: 'm', motor: true, ayuda: 'Metros de alterna' },
        { key: 'distancia_cuadro_contador_m', etiqueta: 'Cuadro → contador', tipo: 'numero',
          unidad: 'm', motor: true, ayuda: 'Para el vatímetro o los toroidales' },
        { key: 'recorrido_cableado', etiqueta: 'Por dónde va el cable', tipo: 'opcion', motor: true,
          opciones: ['fachada', 'patinillo', 'interior', 'tubo_enterrado'] },
        { key: 'zanja_m', etiqueta: 'Zanja', tipo: 'numero', unidad: 'm', motor: true,
          ayuda: 'Solo si va enterrado' },
        { key: 'perforaciones', etiqueta: 'Pasos de muro o forjado', tipo: 'entero', motor: true },
        { key: 'ubicacion_inversor', etiqueta: 'Sitio del inversor', tipo: 'texto',
          placeholder: 'A la sombra, ventilado, y a cuánto del cuadro' },
        { key: 'inversor_exterior', etiqueta: 'Inversor al exterior', tipo: 'bool', motor: true,
          ayuda: 'Lleva tejadillo de protección' },
        { key: 'estado_cuadro', etiqueta: 'Cuadro general', tipo: 'opcion', motor: true,
          opciones: ['bien', 'sin_espacio', 'antiguo'],
          ayuda: 'Sin espacio o antiguo: se presupuesta su adecuación' },
        { key: 'toma_tierra', etiqueta: 'Toma de tierra', tipo: 'opcion', motor: true,
          opciones: ['existe', 'no_existe', 'valor_alto'] },
        { key: 'wifi_inversor', etiqueta: 'WiFi donde va el inversor', tipo: 'opcion', motor: true,
          opciones: ['buena', 'mala', 'cablear'] },
        { key: 'distancia_router_m', etiqueta: 'Router → inversor', tipo: 'numero', unidad: 'm',
          motor: true, ayuda: 'Solo si se cablea' },
        { key: 'instalacion_existente', etiqueta: 'Hay instalación que desmontar', tipo: 'bool', motor: true },
        { key: 'via_publica', etiqueta: 'Hay que ocupar la calle', tipo: 'bool', motor: true,
          ayuda: 'Grúa o andamio en la vía pública: tasa y vallas' },
        { key: 'baterias', etiqueta: 'Baterías', tipo: 'opcion', motor: true,
          opciones: ['no', 'si', 'dejar_preparado'],
          ayuda: 'Fronius: sin batería, GEN24 SC; con batería o «dejar preparado», GEN24 Plus (híbrido). Pasar un SC a Plus después cuesta unos 500 € más' },
        { key: 'baterias_kwh', etiqueta: 'Capacidad', tipo: 'numero', unidad: 'kWh', motor: true },
        // sql/etapa47: con esto el motor elige inversor, batería y backup.
        { key: 'inversor_marca', etiqueta: 'Inversor', tipo: 'opcion', motor: true,
          opciones: ['fronius', 'deye', 'enphase'], ayuda: 'Enphase son microinversores, uno por panel. Deye: híbrido, de Rebacas' },
        { key: 'bateria_marca', etiqueta: 'Marca de la batería', tipo: 'opcion', motor: true,
          opciones: ['byd', 'fronius', 'enphase', 'tesla'],
          ayuda: 'Fronius: BYD, Fronius o Tesla · Enphase: Enphase o Tesla' },
        { key: 'backup', etiqueta: 'Con backup', tipo: 'bool', motor: true,
          ayuda: 'Solo si lleva batería: la casa sigue con luz si se va la red' },
        // Ramón (13-10-2026): si quiere backup, automático o manual. Automático
        // = full backup, la casa conmuta sola (Backup Switch / Gateway) y es de
        // toda la vivienda. Manual = conmutador manual (PV Point) con cuadro de
        // cargas críticas.
        { key: 'backup_modo', etiqueta: 'Backup', tipo: 'opcion', motor: true,
          opciones: ['automatico', 'manual'], ayuda: 'Automático: full backup, conmuta solo (Backup Switch / Gateway). Manual: conmutador manual (PV Point), cargas críticas' },
      ],
    },
    {
      id: 'permisos',
      titulo: 'Permisos',
      campos: [
        { key: 'comunidad_propietarios', etiqueta: 'Es comunidad', tipo: 'bool',
          ayuda: 'Hace falta acuerdo de junta' },
        { key: 'zona_protegida', etiqueta: 'Zona protegida', tipo: 'bool', motor: true,
          ayuda: 'Casco antiguo, catalogado, BIC. Otra licencia y plazos largos' },
        { key: 'legalizacion_necesaria', etiqueta: 'Hace falta legalizar', tipo: 'bool', motor: true,
          ayuda: 'Memoria técnica, certificado, alta de autoconsumo' },
        { key: 'vivienda_legal', etiqueta: 'Vivienda legalizada / con cédula', tipo: 'bool',
          ayuda: 'Sin eso no se puede legalizar' },
        { key: 'subvencion', etiqueta: 'Pide subvención', tipo: 'bool', motor: true,
          ayuda: 'Tramitación (1 h de Xavi)' },
        { key: 'certificado_energetico', etiqueta: 'Certificado energético', tipo: 'bool', motor: true,
          ayuda: '1 h de Xavi + desplazamiento + tasa de 97 €' },
        { key: 'cee_desplaz_h', etiqueta: 'Desplazamiento del certificado', tipo: 'numero', unidad: 'h', motor: true },
        { key: 'bonificacion_ibi', etiqueta: 'Pide bonificación IBI / ICIO', tipo: 'bool', motor: true },
      ],
    },
  ],
};

/* ---------------------------------------------------------------------------
 * ELECTRICIDAD
 * ------------------------------------------------------------------------- */
const ELECTRICIDAD = {
  categoria: 'electricidad',
  fotos_minimas: [
    { key: 'cuadro', etiqueta: 'Cuadro abierto' },
    { key: 'contador_cgp', etiqueta: 'Contador y CGP' },
    { key: 'tipo_pared', etiqueta: 'Detalle del tipo de pared' },
    { key: 'instalacion_vieja', etiqueta: 'Instalación antigua a la vista' },
  ],
  secciones: [
    {
      id: 'alcance',
      titulo: 'Qué trabajo es',
      campos: [
        { key: 'tipo_trabajo', etiqueta: 'Tipo', tipo: 'opcion', obligatorio: true, motor: true,
          opciones: ['obra_nueva', 'reforma_integral', 'reforma_parcial', 'ampliacion',
                     'averia', 'boletin_cie', 'adecuacion'] },
        { key: 'superficie_intervencion_m2', etiqueta: 'Superficie a intervenir', tipo: 'numero',
          unidad: 'm²', obligatorio: true, motor: true, ayuda: 'Solo lo que se toca' },
        { key: 'estancias', etiqueta: 'Estancias', tipo: 'lista', motor: true,
          subcampos: [
            { key: 'nombre', etiqueta: 'Estancia', tipo: 'texto' },
            { key: 'm2', etiqueta: 'm²', tipo: 'numero' },
            { key: 'puntos_luz', etiqueta: 'Luces', tipo: 'entero' },
            { key: 'enchufes', etiqueta: 'Enchufes', tipo: 'entero' },
          ] },
        { key: 'vivienda_ocupada', etiqueta: 'Se trabaja con gente dentro', tipo: 'bool', motor: true,
          ayuda: 'Alarga plazos y obliga a proteger' },
      ],
    },
    {
      id: 'estado_actual',
      titulo: 'Lo que hay',
      campos: [
        { key: 'instalacion_antiguedad', etiqueta: 'Antigüedad', tipo: 'entero', unidad: 'años' },
        { key: 'tiene_toma_tierra', etiqueta: 'Toma de tierra', tipo: 'opcion', motor: true,
          opciones: ['si', 'no', 'no_se_ve'], ayuda: 'Si no hay, es partida aparte' },
        { key: 'estado_instalacion', etiqueta: 'Estado', tipo: 'opcion', motor: true,
          opciones: ['bueno', 'regular', 'a_sustituir'] },
      ],
    },
    {
      id: 'cuadro',
      titulo: 'Cuadro y suministro',
      campos: [
        { key: 'cuadro', etiqueta: 'Qué se hace con el cuadro', tipo: 'opcion', motor: true,
          opciones: ['nuevo', 'ampliar', 'reaprovechar'] },
        { key: 'n_circuitos', etiqueta: 'Circuitos al final', tipo: 'entero', motor: true },
        { key: 'potencia_a_contratar_kw', etiqueta: 'Potencia a contratar', tipo: 'numero',
          unidad: 'kW', motor: true },
        { key: 'suministro', etiqueta: 'Suministro', tipo: 'opcion', motor: true,
          opciones: ['monofasico', 'trifasico'] },
        { key: 'alta_suministro_nueva', etiqueta: 'Alta nueva con la distribuidora', tipo: 'bool',
          motor: true, ayuda: 'Trámite de plazos largos' },
      ],
    },
    {
      id: 'puntos',
      titulo: 'Puntos y canalización',
      campos: [
        { key: 'enchufes_n', etiqueta: 'Enchufes', tipo: 'entero', obligatorio: true, motor: true },
        { key: 'puntos_luz_n', etiqueta: 'Puntos de luz', tipo: 'entero', obligatorio: true, motor: true },
        { key: 'interruptores_n', etiqueta: 'Interruptores', tipo: 'entero', motor: true },
        { key: 'conmutados_n', etiqueta: 'Conmutados y cruzamientos', tipo: 'entero', motor: true,
          ayuda: 'Cuestan el doble de tirar' },
        { key: 'tomas_red_n', etiqueta: 'Tomas de red', tipo: 'entero', motor: true },
        { key: 'tomas_tv_n', etiqueta: 'Tomas de TV', tipo: 'entero', motor: true },
        { key: 'canalizacion', etiqueta: 'Canalización', tipo: 'opcion', obligatorio: true, motor: true,
          opciones: ['empotrada', 'superficie', 'falso_techo', 'registrable'] },
        { key: 'tipo_pared', etiqueta: 'Tipo de pared', tipo: 'opcion', motor: true,
          opciones: ['ladrillo', 'mares', 'hormigon', 'pladur', 'piedra'],
          ayuda: 'Es el multiplicador de la roza' },
        { key: 'metros_roza_estimados', etiqueta: 'Metros de roza', tipo: 'numero', unidad: 'm',
          motor: true, ayuda: 'A ojo en la visita, se afina luego' },
      ],
    },
    {
      id: 'acabados',
      titulo: 'Acabados y extras',
      campos: [
        { key: 'mecanismos_gama', etiqueta: 'Gama de mecanismos', tipo: 'opcion', motor: true,
          opciones: ['basica', 'media', 'alta'] },
        { key: 'mecanismos_marca', etiqueta: 'Marca', tipo: 'texto', placeholder: 'Simon, Niessen, Jung…' },
        { key: 'iluminacion', etiqueta: 'Iluminación', tipo: 'lista', motor: true,
          subcampos: [
            { key: 'tipo', etiqueta: 'Tipo', tipo: 'opcion',
              opciones: ['downlight', 'tira_led', 'aplique', 'exterior', 'proyector'] },
            { key: 'cantidad', etiqueta: 'Cantidad', tipo: 'entero' },
          ] },
        { key: 'extras', etiqueta: 'Extras', tipo: 'multi', motor: true,
          opciones: ['cargador_ve', 'domotica', 'videoportero', 'alarma', 'cuadro_exterior', 'grupo'] },
        { key: 'boletin_necesario', etiqueta: 'Hace falta boletín / CIE', tipo: 'bool', motor: true },
      ],
    },
  ],
};

/* ---------------------------------------------------------------------------
 * AIRE ACONDICIONADO
 * ------------------------------------------------------------------------- */
const AIRE = {
  categoria: 'aire_acondicionado',
  fotos_minimas: [
    { key: 'estancias', etiqueta: 'Una por estancia' },
    { key: 'ubicacion_ue', etiqueta: 'Dónde iría la unidad exterior' },
    { key: 'recorrido', etiqueta: 'Recorrido previsto de las líneas' },
    { key: 'cuadro', etiqueta: 'Cuadro eléctrico' },
  ],
  secciones: [
    {
      id: 'sistema',
      titulo: 'Qué sistema',
      campos: [
        { key: 'tipo_sistema', etiqueta: 'Tipo', tipo: 'opcion', obligatorio: true, motor: true,
          opciones: ['split_1x1', 'multisplit', 'conductos', 'cassette', 'suelo_techo'] },
        { key: 'uso', etiqueta: 'Uso', tipo: 'opcion', motor: true,
          opciones: ['solo_frio', 'frio_calor'] },
        { key: 'estancias', etiqueta: 'Estancias a climatizar', tipo: 'lista',
          obligatorio: true, motor: true,
          subcampos: [
            { key: 'nombre', etiqueta: 'Estancia', tipo: 'texto' },
            { key: 'm2', etiqueta: 'm²', tipo: 'numero' },
            { key: 'altura_m', etiqueta: 'Altura', tipo: 'numero' },
            { key: 'orientacion', etiqueta: 'Orientación', tipo: 'opcion',
              opciones: ['norte', 'sur', 'este', 'oeste'] },
            { key: 'ventanas', etiqueta: 'Ventanas', tipo: 'entero' },
            // sql/etapa48: con los m² el motor elige la máquina de cada
            // estancia, y con los metros hasta la exterior saca tubo y gas.
            { key: 'metros', etiqueta: 'Metros de línea hasta la exterior', tipo: 'numero' },
          ] },
        { key: 'preinstalacion_existente', etiqueta: 'Preinstalación', tipo: 'opcion', motor: true,
          opciones: ['no', 'si_aprovechable', 'si_a_sustituir'] },
        { key: 'equipos_a_retirar_n', etiqueta: 'Interiores viejas a retirar', tipo: 'entero', motor: true,
          ayuda: '80 € por máquina; 150 € si se recupera su tubería (preinstalación aprovechable)' },
        { key: 'exteriores_a_retirar_n', etiqueta: 'Exteriores viejas a retirar', tipo: 'entero', motor: true,
          ayuda: '80 € por máquina. Si no se pone y hay interiores viejas, se cuenta una' },
      ],
    },
    {
      id: 'exterior',
      titulo: 'Unidad exterior',
      campos: [
        { key: 'ubicacion_ue', etiqueta: 'Dónde va', tipo: 'opcion', obligatorio: true, motor: true,
          opciones: ['fachada', 'balcon', 'terraza', 'cubierta', 'patio', 'galeria'] },
        { key: 'altura_ue_m', etiqueta: 'Altura', tipo: 'numero', unidad: 'm', motor: true },
        { key: 'medio_elevacion', etiqueta: 'Cómo se llega', tipo: 'opcion', motor: true,
          opciones: ['ninguno', 'escalera', 'andamio', 'plataforma', 'grua'] },
        { key: 'restriccion_fachada', etiqueta: 'No puede ir a la vista', tipo: 'bool', motor: true,
          ayuda: 'Comunidad o normativa' },
      ],
    },
    {
      id: 'instalacion',
      titulo: 'Instalación',
      campos: [
        // Desde la etapa 48 los metros van en cada estancia (arriba). Esto se
        // queda para las fichas viejas; el motor usa lo uno o lo otro.
        { key: 'distancias_lineas', etiqueta: 'Metros de línea por equipo (fichas antiguas)', tipo: 'lista', motor: true,
          subcampos: [
            { key: 'estancia', etiqueta: 'Estancia', tipo: 'texto' },
            { key: 'metros', etiqueta: 'm', tipo: 'numero' },
          ] },
        { key: 'recorrido_lineas', etiqueta: 'Por dónde van', tipo: 'opcion', motor: true,
          opciones: ['fachada_vista', 'canaleta', 'patinillo', 'falso_techo', 'empotrado'] },
        { key: 'desague_condensados', etiqueta: 'Desagüe', tipo: 'opcion', motor: true,
          opciones: ['gravedad', 'bomba'], ayuda: 'La bomba es partida por equipo' },
        { key: 'falso_techo', etiqueta: 'Hay falso techo', tipo: 'bool', motor: true },
        { key: 'altura_plenum_cm', etiqueta: 'Altura disponible', tipo: 'numero', unidad: 'cm',
          motor: true, ayuda: 'Decide si entra la máquina de conductos' },
        { key: 'rejillas_n', etiqueta: 'Rejillas', tipo: 'entero', motor: true },
        { key: 'difusores_n', etiqueta: 'Difusores', tipo: 'entero', motor: true },
        { key: 'circuito_electrico_disponible', etiqueta: 'Hay circuito libre', tipo: 'bool', motor: true,
          ayuda: 'Si no, entra trabajo de electricidad' },
        { key: 'distancia_cuadro_m', etiqueta: 'De la exterior al cuadro eléctrico', tipo: 'numero', unidad: 'm',
          motor: true, ayuda: 'Metros de cable 3G 2,5 hasta el cuadro; en 1x1, de cada exterior' },
        { key: 'obra_necesaria', etiqueta: 'Obra', tipo: 'multi', motor: true,
          opciones: ['rozas', 'perforacion_muro', 'falso_techo', 'registro', 'pintura'] },
        // sql/etapa48: el motor coge las máquinas del catálogo de esta marca.
        // Vaillant (climaVAIR) aún no tiene tarifa cargada: avisa y la máquina va a mano.
        { key: 'marca_preferida', etiqueta: 'Marca', tipo: 'opcion', obligatorio: true, motor: true,
          opciones: ['midea', 'vaillant'], ayuda: 'Las máquinas salen de la tarifa de esa marca' },
      ],
    },
  ],
};

export const ESQUEMAS = {
  aerotermia: AEROTERMIA,
  solar: SOLAR,
  electricidad: ELECTRICIDAD,
  aire_acondicionado: AIRE,
};

/* ---------------------------------------------------------------------------
 * Etiquetas legibles de las opciones. Van aparte para no repetirlas en cada
 * campo: la misma opción ('monofasico') se escribe igual en las cuatro fichas.
 * ------------------------------------------------------------------------- */
export const ETIQUETAS = {
  // generales
  si: 'Sí', no: 'No', ninguno: 'Ninguno', ninguna: 'Ninguna',
  bueno: 'Bueno', regular: 'Regular', malo: 'Malo', a_sustituir: 'A sustituir',
  facil: 'Fácil', medio: 'Medio', dificil: 'Difícil',
  monofasico: 'Monofásico', trifasico: 'Trifásico',
  fronius: 'Fronius', enphase: 'Enphase', byd: 'BYD', tesla: 'Tesla', midea: 'Midea',
  escalera: 'Escalera', andamio: 'Andamio', plataforma: 'Plataforma', grua: 'Camión grúa',
  automatico: 'Automático (full backup)', manual: 'Manual (conmutador)',
  fachada: 'Fachada', balcon: 'Balcón', terraza: 'Terraza', cubierta: 'Cubierta', patio: 'Patio',
  jardin: 'Jardín', galeria: 'Galería', interior: 'Interior',
  norte: 'Norte', sur: 'Sur', este: 'Este', oeste: 'Oeste',
  rozas: 'Rozas', zanja: 'Zanja', perforacion_muro: 'Perforar muro',
  falso_techo: 'Falso techo', registro: 'Registro', pintura: 'Pintura',
  // inmueble
  unifamiliar: 'Unifamiliar', adosado: 'Adosado', piso: 'Piso', atico: 'Ático',
  local: 'Local', nave: 'Nave', comunidad: 'Comunidad',
  // comercial
  recomendacion: 'Recomendación', web: 'Web', cliente_existente: 'Cliente de siempre',
  llamada: 'Llamada', constructora: 'Constructora', vaillant: 'Vaillant',
  urgente: 'Urgente', '1_mes': 'Un mes', '3_meses': 'Tres meses', sin_prisa: 'Sin prisa',
  // aerotermia
  calefaccion: 'Calefacción', acs: 'ACS', refrigeracion: 'Refrigeración', piscina: 'Piscina',
  caldera_gas: 'Caldera de gas', caldera_gasoleo: 'Caldera de gasóleo',
  caldera_pellets: 'Caldera de pellets', electrico: 'Eléctrico', bomba_calor: 'Bomba de calor',
  vaillant: 'Vaillant', midea: 'Midea',
  radiadores: 'Radiadores', suelo_radiante: 'Suelo radiante', fancoils: 'Fancoils',
  radiadores_bt: 'Radiadores de baja temperatura', se_mantiene: 'Se mantiene',
  retirada_caldera: 'Retirar caldera', retirada_deposito_gasoleo: 'Retirar depósito de gasóleo',
  simple: 'Cristal simple', doble: 'Doble', climalit: 'Climalit',
  rotura_puente_termico: 'Con rotura de puente térmico',
  pared: 'Pared', techo: 'Techo', conductos: 'Conductos', suelo: 'Suelo',
  // solar
  autoconsumo: 'Autoconsumo', autoconsumo_baterias: 'Autoconsumo con baterías',
  aislada: 'Aislada de red',
  diurno: 'De día', nocturno: 'De noche', mixto: 'Mixto', fin_de_semana: 'Fin de semana',
  vehiculo_electrico: 'Coche eléctrico', aerotermia: 'Aerotermia',
  aire_acondicionado: 'Aire acondicionado', bomba_riego: 'Bomba de riego',
  teja_arabe: 'Teja árabe', plana_transitable: 'Plana transitable',
  plana_no_transitable: 'Plana no transitable', chapa_sandwich: 'Chapa sándwich',
  pizarra: 'Pizarra', pergola: 'Pérgola',
  parcial: 'Parcial', importante: 'Importante',
  patinillo: 'Patinillo', tubo_enterrado: 'Tubo enterrado',
  dejar_preparado: 'Dejar preparado',
  deye: 'Deye', vertical: 'Vertical', horizontal: 'Horizontal',
  menos_100: 'Menos de 100 €', '100_200': 'Entre 100 € y 200 €', '200_350': 'Entre 200 € y 350 €',
  '350_600': 'Entre 350 € y 600 €', mas_600: 'Más de 600 €', no_lo_se: 'No lo sé',
  lastre: 'Lastre', anclaje_quimico: 'Anclaje químico', trampilla: 'Trampilla',
  solo_exterior: 'Solo por fuera', bien: 'Bien', sin_espacio: 'Sin espacio', antiguo: 'Antiguo',
  existe: 'Existe', no_existe: 'No existe', valor_alto: 'Valor alto',
  buena: 'Buena', mala: 'Mala', cablear: 'Se cablea', total: 'Toda la vivienda',
  con_excedentes: 'Con excedentes', sin_excedentes: 'Sin excedentes', termo: 'Termo eléctrico',
  // electricidad
  obra_nueva: 'Obra nueva', reforma_integral: 'Reforma integral',
  reforma_parcial: 'Reforma parcial', ampliacion: 'Ampliación', averia: 'Avería',
  boletin_cie: 'Boletín / CIE', adecuacion: 'Adecuación',
  no_se_ve: 'No se ve', nuevo: 'Nuevo', ampliar: 'Ampliar', reaprovechar: 'Reaprovechar',
  empotrada: 'Empotrada', superficie: 'Superficie', registrable: 'Registrable',
  ladrillo: 'Ladrillo', mares: 'Marés', hormigon: 'Hormigón', pladur: 'Pladur', piedra: 'Piedra',
  basica: 'Básica', media: 'Media', alta: 'Alta',
  downlight: 'Downlight', tira_led: 'Tira LED', aplique: 'Aplique',
  exterior: 'Exterior', proyector: 'Proyector',
  cargador_ve: 'Cargador de coche', domotica: 'Domótica', videoportero: 'Videoportero',
  alarma: 'Alarma', cuadro_exterior: 'Cuadro exterior', grupo: 'Grupo electrógeno',
  // aire
  split_1x1: 'Split 1×1', multisplit: 'Multisplit', cassette: 'Cassette',
  suelo_techo: 'Suelo-techo', solo_frio: 'Solo frío', frio_calor: 'Frío y calor',
  si_aprovechable: 'Sí, aprovechable', si_a_sustituir: 'Sí, pero a sustituir',
  fachada_vista: 'Fachada vista', canaleta: 'Canaleta', empotrado: 'Empotrado',
  gravedad: 'Por gravedad', bomba: 'Bomba de condensados',
};

export const etiqueta = (v) => ETIQUETAS[v] || String(v ?? '').replace(/_/g, ' ');

/* ---------------------------------------------------------------------------
 * Ayudas de cálculo. NO son el Motor BENSOL: son propuestas de campo para que
 * Ramón no salga de la casa con el hueco en blanco. Siempre editables, y al
 * editarlas se marca el campo como tocado a mano.
 * ------------------------------------------------------------------------- */
export function proponer(categoria, datos, comun) {
  const p = {};
  if (categoria === 'aerotermia') {
    // Regla de campo: W/m² por aislamiento, corregido por altura de planta.
    const m2 = Number(comun?.superficie_m2) || 0;
    const wm2 = { bueno: 55, regular: 75, malo: 95 }[comun?.aislamiento || datos?.aislamiento] || 75;
    if (m2) p.carga_termica_kw = Math.round((m2 * wm2) / 100) / 10;

    // ACS: 40 l por persona, con suelo de 150 l y salto a 200/300.
    const ocup = Number(comun?.ocupantes) || 0;
    if (ocup) {
      const l = ocup * 40;
      p.acs_acumulador_litros = l <= 150 ? 150 : l <= 200 ? 200 : l <= 300 ? 300 : 500;
    }
  }
  if (categoria === 'solar') {
    // ~2 m² por módulo en cubierta plana con separación, ~1,9 en teja.
    const sup = Number(datos?.superficie_disponible_m2) || 0;
    const porModulo = datos?.tipo_cubierta === 'teja_arabe' ? 1.9 : 2.4;
    if (sup) p.modulos_estimados = Math.floor(sup / porModulo);
  }
  if (categoria === 'aire_acondicionado') {
    // 100 W/m² de referencia para Mallorca, subiendo en orientación sur/oeste.
    const est = Array.isArray(datos?.estancias) ? datos.estancias : [];
    p._carga_por_estancia = est.map((e) => {
      const m2 = Number(e.m2) || 0;
      const f = ['sur', 'oeste'].includes(e.orientacion) ? 1.15 : 1;
      return { estancia: e.nombre, kw: Math.round(m2 * 0.1 * f * 10) / 10 };
    });
  }
  return p;
}

/* ---------------------------------------------------------------------------
 * Validación: qué falta para poder cerrar la ficha.
 * ------------------------------------------------------------------------- */
export function loQueFalta(esquema, datos) {
  const faltan = [];
  for (const sec of esquema.secciones) {
    for (const c of sec.campos) {
      if (!c.obligatorio) continue;
      const v = datos?.[c.key];
      const vacio = v == null || v === '' ||
        (Array.isArray(v) && v.length === 0);
      if (vacio) faltan.push({ seccion: sec.titulo, campo: c.etiqueta });
    }
  }
  return faltan;
}
