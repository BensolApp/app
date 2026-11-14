// BENSOL · presu-idiomas.js · Los textos fijos del presupuesto en cuatro idiomas (6-11-2026)
//
// El PDF del presupuesto y el correo al cliente salen en español, inglés,
// catalán o alemán, a elegir al descargar o enviar. Aquí van los textos que
// no cambian (cabeceras, condiciones generales, pago, aceptación). Las
// líneas del presupuesto (que vienen del catálogo en español) se traducen
// aparte con la función «traducir», que guarda cada traducción en la base.
//
// Las traducciones de las condiciones las hizo Claude (6-11-2026) a partir
// del texto español de la plantilla de Teamleader; conviene que un hablante
// las repase antes de darlas por definitivas.

export const IDIOMAS = [['es', 'Español'], ['en', 'English'], ['ca', 'Català'], ['de', 'Deutsch']];
export const LOCALES = { es: 'es-ES', en: 'en-GB', ca: 'ca-ES', de: 'de-DE' };
export const idiomaValido = (x) => (IDIOMAS.some(([k]) => k === x) ? x : 'es');

/** Importe con dos decimales en el formato del idioma, siempre con el € detrás. */
// es/ca con el formato de de-DE: mismos separadores, pero agrupa también los miles de 4 cifras (1.570,00 €), como pide el manual de marca.
export const eurIdioma = (n, idioma) => (Number(n) || 0).toLocaleString({ es: 'de-DE', ca: 'de-DE' }[idiomaValido(idioma)] || LOCALES[idiomaValido(idioma)], { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
/** Fecha corta (6 nov) en el idioma. */
export const fechaIdioma = (iso, idioma) => new Date(iso).toLocaleDateString(LOCALES[idiomaValido(idioma)], { day: '2-digit', month: 'short' });
/** Fecha larga (6 de noviembre de 2026) en el idioma. */
export const fechaLargaIdioma = (iso, idioma) => new Date(iso).toLocaleDateString(LOCALES[idiomaValido(idioma)], { day: 'numeric', month: 'long', year: 'numeric' });

const CATEGORIAS = {
  es: { obra: 'Visita de obra - Instalaciones', solar: 'Paneles solares', aerotermia: 'Aerotermia', aire_acondicionado: 'Aire acondicionado', electricidad: 'Electricidad' },
  en: { obra: 'Building work / refurbishment', solar: 'Solar PV', aerotermia: 'Aerothermal heat pump', aire_acondicionado: 'Air conditioning', electricidad: 'Electrical installation' },
  ca: { obra: 'Obra / reforma', solar: 'Plaques solars', aerotermia: 'Aerotèrmia', aire_acondicionado: 'Aire condicionat', electricidad: 'Electricitat' },
  de: { obra: 'Bau / Sanierung', solar: 'Photovoltaik', aerotermia: 'Luft-Wasser-Wärmepumpe', aire_acondicionado: 'Klimaanlage', electricidad: 'Elektroinstallation' },
};
/** El nombre de la categoría en el idioma (null si no se conoce). */
export const categoriaIdioma = (cat, idioma) => CATEGORIAS[idiomaValido(idioma)][cat] || null;

const UNIDADES = {
  en: { ud: 'pcs', uds: 'pcs', h: 'h', m: 'm', 'm²': 'm²', ml: 'lm', pa: 'lot', jornada: 'day', jornadas: 'days' },
  ca: { ud: 'u.', uds: 'u.', h: 'h', m: 'm', 'm²': 'm²', ml: 'ml', pa: 'pa', jornada: 'jornada', jornadas: 'jornades' },
  de: { ud: 'Stk.', uds: 'Stk.', h: 'Std.', m: 'm', 'm²': 'm²', ml: 'lfm', pa: 'psch.', jornada: 'Tag', jornadas: 'Tage' },
};
/** La unidad de una línea (ud, h, m…) en el idioma; lo que no se conoce se deja tal cual. */
export const unidadIdioma = (u, idioma) => {
  const k = String(u || 'ud').trim().toLowerCase();
  const t = UNIDADES[idiomaValido(idioma)];
  return (t && t[k]) || u || 'ud';
};

/* ---------- los textos del PDF ---------- */
export const PDF = {
  es: {
    presupuesto: 'PRESUPUESTO', cliente: 'Cliente', visita: 'Visita',
    total_sin_iva: 'Total sin IVA', iva: 'IVA', total_con_iva: 'Total con IVA',
    incluye_dto: 'Incluye descuento de −{n} %',
    pie: 'Presupuesto válido {n} días naturales. No incluye obra civil ni permisos que no se nombren arriba. Condiciones generales y de pago en las páginas siguientes.',
    otros: 'Otros', opcionales: 'Opcionales incluidos en el total',
    grupo_0608: 'Cableado, canalizaciones, protecciones y pequeño material',
    grupo_1112: 'Mano de obra de instalación, transporte y gestión de residuos',
    ambas: 'Ambas partes aceptan el contenido del presupuesto.',
    info_pago: 'Información de pago', iban: 'IBAN', cond_pago: 'CONDICIONES DE PAGO:',
    pago: ['50 % a la aceptación del presupuesto', '30 % al iniciar la instalación', '20 % a su finalización'],
    plazos: 'Plazos y validez',
    validez: 'Validez de la oferta: {n} días naturales desde la fecha del presupuesto{hasta}.', hasta: ' (hasta el {f})',
    plazo: 'Plazo estimado de ejecución: desde la aceptación y el abono del anticipo; sujeto a disponibilidad de materiales y autorizaciones.',
    cond_gen: 'Condiciones generales y exclusiones',
    integrante: 'Estas condiciones forman parte integrante del presupuesto. En caso de conflicto, prevalecerá el presupuesto firmado y sus anexos.',
    aceptacion: 'Aceptación del presupuesto',
    f_nombre: 'Nombre y DNI/NIE del cliente', f_cliente: 'Firma del cliente', f_fecha: 'Fecha', f_bensol: 'Firma BENSOL',
    condiciones: [
      ['1) Alcance y documentación', ['El alcance incluye únicamente lo descrito en el apartado Alcance técnico y en el Desglose económico. Cualquier partida no listada se considera excluida.', 'Planos, memorias y esquemas se entregarán en formato digital estándar. Documentación adicional o as-built detallado, si es necesario, podrá presupuestarse aparte.']],
      ['2) Precios, impuestos y revisiones', ['Precios en euros. Salvo mención expresa, los importes incluyen IVA vigente.', 'Las variaciones por cambios de alcance, trabajos imprevistos, necesidades de medios auxiliares no contempladas (grúa, andamios, elevadores) o desvíos por condiciones de obra se tratarán mediante pedido adicional/contrato de modificación previo a su ejecución.']],
      ['3) Licencias y legalización', ['Licencias/Comunicación previa: el presupuesto no incluye tasas municipales ni costes de licencia salvo que se indique expresamente.', 'Legalización y tramitación: se incluye únicamente si figura como partida. La legalización se realizará conforme a la normativa vigente aplicable al tipo de instalación.']],
      ['4) Condiciones de obra y responsabilidades del cliente', ['Acceso y disponibilidad: el cliente facilitará accesos, acometidas eléctricas, agua, espacios de acopio y cortes programados.', 'Estructura/soporte: salvo estudio estructural contratado, se presume que la cubierta/forjado/cimentación admite las cargas de la instalación. Cualquier refuerzo o reparación será a cargo del cliente.', 'Suministro eléctrico: la adecuación del cuadro general, aumentos de potencia contratada y actuaciones de la distribuidora/comercializadora quedan fuera salvo partida específica.']],
      ['5) Exclusiones habituales (no limitativas)', ['Obra civil (zanjas, rozas, soleras, zapatas de marquesinas/carports, albañilería y pintura).', 'Medios auxiliares especiales (grúa, andamios certificados, plataformas elevadoras) si no están en partidas.', 'Reposición de tejas/piezas especiales de cubierta más allá de lo estrictamente necesario para el montaje.', 'Canalizaciones externas no indicadas, perforaciones especiales, trabajos en zonas con amianto o materiales peligrosos.', 'Adecuaciones del CGP/CT y trámites de acceso y conexión no contemplados.', 'Monitorización avanzada, integraciones domóticas o SAI, salvo indicación.']],
      ['6) Garantías', ['Mano de obra: 2 años desde la puesta en marcha, por defectos de ejecución.', 'Equipos: garantía del fabricante según sus términos (p. ej., paneles FV con garantía de producto y de rendimiento; inversores/baterías según condiciones específicas). La tramitación se realizará conforme a los procedimientos de cada marca.', 'Quedan excluidos desgastes normales, mal uso, manipulaciones de terceros, eventos climáticos extremos o fuerza mayor.']],
      ['7) Puesta en marcha y formación', ['Tras la instalación, se realizará la puesta en marcha, ajustes básicos y una sesión de formación al usuario sobre el uso seguro y mantenimiento básico.']],
      ['8) Mantenimiento', ['El mantenimiento preventivo/correctivo no está incluido salvo contratación específica. BENSOL ofrece planes de mantenimiento con visitas periódicas, limpieza de módulos y verificaciones eléctricas.']],
      ['9) Seguridad y medio ambiente', ['BENSOL cumplirá con la normativa de PRL aplicable y llevará los EPIs necesarios.', 'La gestión de residuos se realizará conforme a la normativa vigente; tasas de gestor autorizado y transporte se incluyen solo si aparece como partida.']],
      ['10) Limitación de responsabilidad', ['La responsabilidad de BENSOL por daños indirectos, lucro cesante o pérdida de producción queda excluida. La responsabilidad total, en cualquier caso, se limita al importe total efectivamente abonado por el cliente por los trabajos objeto del contrato, salvo dolo o negligencia grave.']],
      ['11) Protección de datos (RGPD/LOPDGDD)', ['De conformidad con lo dispuesto en el Reglamento (UE) 2016/679, de 27 de abril de 2016 (RGPD) y la Ley Orgánica 3/2018, de 5 de diciembre de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), le facilitamos la siguiente información del tratamiento: Responsable: BENSOL Ingeniería, S.R.L., B56564701, Camí Can Calafat, 21 Polígono Son OMS, 07199 Palma (Illes Balears) ESPAÑA, info@bensolic.es. Fines del tratamiento: mantener una relación comercial y envío de comunicaciones de productos o servicios. Legitimación: obligación legal del responsable y consentimiento del interesado cuando proceda. Tipología y conservación: se tratan los datos mínimos necesarios para el fin y se conservan cumpliendo los plazos legales de prescripción. Destinatarios de cesiones: las necesarias para el fin del tratamiento y para el cumplimiento de obligaciones legales. Derechos que le asisten: acceso, rectificación, portabilidad, supresión, limitación y oposición. Más información del tratamiento: diríjase al responsable o a través de www.bensolic.es.']],
      ['12) Derecho de desistimiento (solo consumidores)', ['Para contratos celebrados a distancia y fuera de establecimiento, el cliente consumidor dispone de 14 días naturales para desistir sin necesidad de justificación.', 'Si el servicio ha comenzado a petición del cliente durante el periodo de desistimiento, podrá exigirse el importe proporcional a la parte ya prestada.']],
      ['13) Fuerza mayor', ['Ninguna de las partes será responsable por retrasos debidos a causas de fuerza mayor (temporales, huelgas generales, pandemias, indisponibilidad de suministros críticos, actos normativos sobrevenidos, etc.). Los plazos se prorrogarán por el tiempo de la incidencia.']],
      ['14) Ley aplicable y jurisdicción', ['Este contrato se rige por el Derecho español. Para controversias se someten a los Juzgados y Tribunales de Palma de Mallorca. Si el cliente ostenta la condición de consumidor, serán competentes los juzgados de su domicilio.']],
    ],
  },
  en: {
    presupuesto: 'QUOTATION', cliente: 'Customer', visita: 'Site visit',
    total_sin_iva: 'Total excl. VAT', iva: 'VAT', total_con_iva: 'Total incl. VAT',
    incluye_dto: 'Includes a discount of −{n} %',
    pie: 'This quotation is valid for {n} calendar days. It does not include civil works or permits not listed above. General terms and payment conditions on the following pages.',
    otros: 'Other', opcionales: 'Optional items included in the total',
    grupo_0608: 'Wiring, conduits, protections and sundry materials',
    grupo_1112: 'Installation labour, transport and waste management',
    ambas: 'Both parties accept the contents of this quotation.',
    info_pago: 'Payment information', iban: 'IBAN', cond_pago: 'PAYMENT TERMS:',
    pago: ['50 % on acceptance of the quotation', '30 % at the start of the installation', '20 % on completion'],
    plazos: 'Timing and validity',
    validez: 'Validity of the offer: {n} calendar days from the date of the quotation{hasta}.', hasta: ' (until {f})',
    plazo: 'Estimated lead time: from acceptance and payment of the deposit; subject to availability of materials and permits.',
    cond_gen: 'General terms and exclusions',
    integrante: 'These terms form an integral part of the quotation. In the event of any conflict, the signed quotation and its annexes shall prevail.',
    aceptacion: 'Acceptance of the quotation',
    f_nombre: 'Customer name and ID/NIE number', f_cliente: 'Customer signature', f_fecha: 'Date', f_bensol: 'BENSOL signature',
    condiciones: [
      ['1) Scope and documentation', ['The scope covers only what is described in the Technical scope section and the Price breakdown. Any item not listed is deemed excluded.', 'Drawings, reports and diagrams will be delivered in standard digital format. Additional documentation or detailed as-built drawings, if required, may be quoted separately.']],
      ['2) Prices, taxes and revisions', ['Prices in euros. Unless expressly stated, amounts include the applicable VAT.', 'Variations due to changes of scope, unforeseen works, auxiliary equipment not provided for (crane, scaffolding, lifts) or deviations caused by site conditions will be handled by an additional order/change agreement before they are carried out.']],
      ['3) Licences and legalisation', ['Licences/prior notification: the quotation does not include municipal fees or licence costs unless expressly stated.', 'Legalisation and processing: included only if it appears as an item. Legalisation will be carried out in accordance with the regulations in force for the type of installation.']],
      ['4) Site conditions and customer responsibilities', ['Access and availability: the customer will provide access, electrical and water supply, storage space and scheduled power cuts.', 'Structure/support: unless a structural survey has been contracted, the roof/slab/foundation is assumed to bear the loads of the installation. Any reinforcement or repair shall be at the customer’s expense.', 'Electricity supply: upgrading the main switchboard, increases in contracted power and work by the distribution or supply company are excluded unless specifically itemised.']],
      ['5) Usual exclusions (non-exhaustive)', ['Civil works (trenches, chasing, screeds, footings for canopies/carports, masonry and painting).', 'Special auxiliary equipment (crane, certified scaffolding, lifting platforms) unless itemised.', 'Replacement of roof tiles/special roof pieces beyond what is strictly necessary for the installation.', 'External conduits not specified, special drilling, work in areas with asbestos or hazardous materials.', 'Adaptation of the general protection box/transformer station and grid access and connection procedures not provided for.', 'Advanced monitoring, home-automation integrations or UPS, unless stated.']],
      ['6) Warranties', ['Labour: 2 years from commissioning, for workmanship defects.', 'Equipment: manufacturer’s warranty under its own terms (e.g. PV modules with product and performance warranty; inverters/batteries under their specific conditions). Claims will be processed in accordance with each brand’s procedures.', 'Normal wear, misuse, tampering by third parties, extreme weather events or force majeure are excluded.']],
      ['7) Commissioning and training', ['After installation, commissioning, basic settings and a user training session on safe use and basic maintenance will be carried out.']],
      ['8) Maintenance', ['Preventive/corrective maintenance is not included unless specifically contracted. BENSOL offers maintenance plans with periodic visits, module cleaning and electrical checks.']],
      ['9) Health, safety and environment', ['BENSOL will comply with the applicable occupational risk prevention regulations and use the necessary PPE.', 'Waste will be managed in accordance with current regulations; authorised waste manager fees and transport are included only if itemised.']],
      ['10) Limitation of liability', ['BENSOL’s liability for indirect damages, loss of profit or loss of production is excluded. Total liability is in any case limited to the total amount actually paid by the customer for the works under the contract, except in cases of wilful misconduct or gross negligence.']],
      ['11) Data protection (GDPR/LOPDGDD)', ['In accordance with Regulation (EU) 2016/679 of 27 April 2016 (GDPR) and Spanish Organic Law 3/2018 of 5 December on the Protection of Personal Data and guarantee of digital rights (LOPDGDD), we provide the following information on data processing: Controller: BENSOL Ingeniería, S.R.L., B56564701, Camí Can Calafat, 21 Polígono Son OMS, 07199 Palma (Illes Balears) SPAIN, info@bensolic.es. Purposes: maintaining a business relationship and sending communications about products or services. Legal basis: the controller’s legal obligation and the data subject’s consent where applicable. Type and retention: only the data necessary for the purpose are processed and are kept for the legal limitation periods. Recipients: those necessary for the purpose of the processing and for compliance with legal obligations. Your rights: access, rectification, portability, erasure, restriction and objection. Further information: contact the controller or visit www.bensolic.es.']],
      ['12) Right of withdrawal (consumers only)', ['For distance and off-premises contracts, consumers have 14 calendar days to withdraw without giving any reason.', 'If the service has begun at the customer’s request during the withdrawal period, the proportional amount for the part already provided may be charged.']],
      ['13) Force majeure', ['Neither party shall be liable for delays due to force majeure (storms, general strikes, pandemics, unavailability of critical supplies, supervening regulatory acts, etc.). Deadlines will be extended for the duration of the event.']],
      ['14) Governing law and jurisdiction', ['This contract is governed by Spanish law. Disputes shall be submitted to the Courts of Palma de Mallorca. If the customer is a consumer, the courts of the customer’s place of residence shall have jurisdiction.']],
    ],
  },
  ca: {
    presupuesto: 'PRESSUPOST', cliente: 'Client', visita: 'Visita',
    total_sin_iva: 'Total sense IVA', iva: 'IVA', total_con_iva: 'Total amb IVA',
    incluye_dto: 'Inclou un descompte del −{n} %',
    pie: 'Pressupost vàlid {n} dies naturals. No inclou obra civil ni permisos que no s’esmentin més amunt. Condicions generals i de pagament a les pàgines següents.',
    otros: 'Altres', opcionales: 'Opcionals inclosos en el total',
    grupo_0608: 'Cablejat, canalitzacions, proteccions i petit material',
    grupo_1112: 'Mà d’obra d’instal·lació, transport i gestió de residus',
    ambas: 'Ambdues parts accepten el contingut del pressupost.',
    info_pago: 'Informació de pagament', iban: 'IBAN', cond_pago: 'CONDICIONS DE PAGAMENT:',
    pago: ['50 % a l’acceptació del pressupost', '30 % en iniciar la instal·lació', '20 % en finalitzar-la'],
    plazos: 'Terminis i validesa',
    validez: 'Validesa de l’oferta: {n} dies naturals des de la data del pressupost{hasta}.', hasta: ' (fins al {f})',
    plazo: 'Termini estimat d’execució: des de l’acceptació i el pagament de la bestreta; subjecte a disponibilitat de materials i autoritzacions.',
    cond_gen: 'Condicions generals i exclusions',
    integrante: 'Aquestes condicions formen part integrant del pressupost. En cas de conflicte, prevaldrà el pressupost signat i els seus annexos.',
    aceptacion: 'Acceptació del pressupost',
    f_nombre: 'Nom i DNI/NIE del client', f_cliente: 'Signatura del client', f_fecha: 'Data', f_bensol: 'Signatura BENSOL',
    condiciones: [
      ['1) Abast i documentació', ['L’abast inclou únicament el que es descriu a l’apartat Abast tècnic i al Desglossament econòmic. Qualsevol partida no llistada es considera exclosa.', 'Plànols, memòries i esquemes es lliuraran en format digital estàndard. La documentació addicional o l’as-built detallat, si cal, es podrà pressupostar a part.']],
      ['2) Preus, impostos i revisions', ['Preus en euros. Llevat de menció expressa, els imports inclouen l’IVA vigent.', 'Les variacions per canvis d’abast, treballs imprevistos, necessitats de mitjans auxiliars no previstes (grua, bastides, elevadors) o desviacions per condicions d’obra es tractaran mitjançant comanda addicional/contracte de modificació previ a l’execució.']],
      ['3) Llicències i legalització', ['Llicències/Comunicació prèvia: el pressupost no inclou taxes municipals ni costos de llicència llevat que s’indiqui expressament.', 'Legalització i tramitació: s’inclou únicament si figura com a partida. La legalització es farà d’acord amb la normativa vigent aplicable al tipus d’instal·lació.']],
      ['4) Condicions d’obra i responsabilitats del client', ['Accés i disponibilitat: el client facilitarà accessos, escomeses elèctriques, aigua, espais d’aplec i talls programats.', 'Estructura/suport: llevat d’estudi estructural contractat, es presumeix que la coberta/forjat/fonamentació admet les càrregues de la instal·lació. Qualsevol reforç o reparació anirà a càrrec del client.', 'Subministrament elèctric: l’adequació del quadre general, els augments de potència contractada i les actuacions de la distribuïdora/comercialitzadora queden fora llevat de partida específica.']],
      ['5) Exclusions habituals (no limitatives)', ['Obra civil (rases, regates, soleres, sabates de marquesines/carports, obra de paleta i pintura).', 'Mitjans auxiliars especials (grua, bastides certificades, plataformes elevadores) si no són a les partides.', 'Reposició de teules/peces especials de coberta més enllà del que és estrictament necessari per al muntatge.', 'Canalitzacions externes no indicades, perforacions especials, treballs en zones amb amiant o materials perillosos.', 'Adequacions de la CGP/CT i tràmits d’accés i connexió no previstos.', 'Monitoratge avançat, integracions domòtiques o SAI, llevat d’indicació.']],
      ['6) Garanties', ['Mà d’obra: 2 anys des de la posada en marxa, per defectes d’execució.', 'Equips: garantia del fabricant segons els seus termes (p. ex., panells FV amb garantia de producte i de rendiment; inversors/bateries segons condicions específiques). La tramitació es farà d’acord amb els procediments de cada marca.', 'Queden exclosos el desgast normal, el mal ús, les manipulacions de tercers, els esdeveniments climàtics extrems o la força major.']],
      ['7) Posada en marxa i formació', ['Després de la instal·lació, es farà la posada en marxa, els ajustos bàsics i una sessió de formació a l’usuari sobre l’ús segur i el manteniment bàsic.']],
      ['8) Manteniment', ['El manteniment preventiu/correctiu no està inclòs llevat de contractació específica. BENSOL ofereix plans de manteniment amb visites periòdiques, neteja de mòduls i verificacions elèctriques.']],
      ['9) Seguretat i medi ambient', ['BENSOL complirà la normativa de PRL aplicable i portarà els EPI necessaris.', 'La gestió de residus es farà d’acord amb la normativa vigent; les taxes de gestor autoritzat i el transport s’inclouen només si apareixen com a partida.']],
      ['10) Limitació de responsabilitat', ['Queda exclosa la responsabilitat de BENSOL per danys indirectes, lucre cessant o pèrdua de producció. La responsabilitat total, en qualsevol cas, es limita a l’import total efectivament abonat pel client pels treballs objecte del contracte, llevat de dol o negligència greu.']],
      ['11) Protecció de dades (RGPD/LOPDGDD)', ['De conformitat amb el Reglament (UE) 2016/679, de 27 d’abril de 2016 (RGPD) i la Llei orgànica 3/2018, de 5 de desembre, de protecció de dades personals i garantia dels drets digitals (LOPDGDD), li facilitem la informació següent del tractament: Responsable: BENSOL Ingeniería, S.R.L., B56564701, Camí Can Calafat, 21 Polígon Son OMS, 07199 Palma (Illes Balears) ESPANYA, info@bensolic.es. Finalitats del tractament: mantenir una relació comercial i enviar comunicacions de productes o serveis. Legitimació: obligació legal del responsable i consentiment de l’interessat quan escaigui. Tipologia i conservació: es tracten les dades mínimes necessàries per a la finalitat i es conserven complint els terminis legals de prescripció. Destinataris de cessions: les necessàries per a la finalitat del tractament i per al compliment d’obligacions legals. Drets que l’assisteixen: accés, rectificació, portabilitat, supressió, limitació i oposició. Més informació del tractament: adreci’s al responsable o a través de www.bensolic.es.']],
      ['12) Dret de desistiment (només consumidors)', ['Per a contractes celebrats a distància i fora d’establiment, el client consumidor disposa de 14 dies naturals per desistir sense necessitat de justificació.', 'Si el servei ha començat a petició del client durant el període de desistiment, es podrà exigir l’import proporcional a la part ja prestada.']],
      ['13) Força major', ['Cap de les parts no serà responsable per retards deguts a causes de força major (temporals, vagues generals, pandèmies, indisponibilitat de subministraments crítics, actes normatius sobrevinguts, etc.). Els terminis es prorrogaran pel temps de la incidència.']],
      ['14) Llei aplicable i jurisdicció', ['Aquest contracte es regeix pel dret espanyol. Per a controvèrsies, les parts se sotmeten als Jutjats i Tribunals de Palma. Si el client té la condició de consumidor, seran competents els jutjats del seu domicili.']],
    ],
  },
  de: {
    presupuesto: 'ANGEBOT', cliente: 'Kunde', visita: 'Besichtigung',
    total_sin_iva: 'Summe ohne MwSt.', iva: 'MwSt.', total_con_iva: 'Summe inkl. MwSt.',
    incluye_dto: 'Enthält einen Rabatt von −{n} %',
    pie: 'Dieses Angebot ist {n} Kalendertage gültig. Bauarbeiten und Genehmigungen, die oben nicht aufgeführt sind, sind nicht enthalten. Allgemeine Bedingungen und Zahlungsbedingungen auf den folgenden Seiten.',
    otros: 'Sonstiges', opcionales: 'Optionen, im Gesamtbetrag enthalten',
    grupo_0608: 'Verkabelung, Kabelführung, Schutzeinrichtungen und Kleinmaterial',
    grupo_1112: 'Montagearbeiten, Transport und Entsorgung',
    ambas: 'Beide Parteien akzeptieren den Inhalt des Angebots.',
    info_pago: 'Zahlungsinformationen', iban: 'IBAN', cond_pago: 'ZAHLUNGSBEDINGUNGEN:',
    pago: ['50 % bei Annahme des Angebots', '30 % bei Beginn der Installation', '20 % bei Fertigstellung'],
    plazos: 'Fristen und Gültigkeit',
    validez: 'Gültigkeit des Angebots: {n} Kalendertage ab Angebotsdatum{hasta}.', hasta: ' (bis zum {f})',
    plazo: 'Voraussichtliche Ausführungsfrist: ab Annahme und Zahlung der Anzahlung; vorbehaltlich der Verfügbarkeit von Material und Genehmigungen.',
    cond_gen: 'Allgemeine Bedingungen und Ausschlüsse',
    integrante: 'Diese Bedingungen sind Bestandteil des Angebots. Im Konfliktfall gelten das unterzeichnete Angebot und seine Anhänge.',
    aceptacion: 'Annahme des Angebots',
    f_nombre: 'Name und Ausweis-/NIE-Nummer des Kunden', f_cliente: 'Unterschrift des Kunden', f_fecha: 'Datum', f_bensol: 'Unterschrift BENSOL',
    condiciones: [
      ['1) Leistungsumfang und Dokumentation', ['Der Leistungsumfang umfasst ausschließlich das, was im Abschnitt Technischer Umfang und in der Kostenaufstellung beschrieben ist. Nicht aufgeführte Positionen gelten als ausgeschlossen.', 'Pläne, Beschreibungen und Schaltpläne werden in einem digitalen Standardformat geliefert. Zusätzliche Dokumentation oder detaillierte Bestandspläne (as-built) können bei Bedarf gesondert angeboten werden.']],
      ['2) Preise, Steuern und Anpassungen', ['Preise in Euro. Sofern nicht ausdrücklich anders angegeben, enthalten die Beträge die geltende Mehrwertsteuer.', 'Abweichungen durch Änderungen des Leistungsumfangs, unvorhergesehene Arbeiten, nicht vorgesehene Hilfsmittel (Kran, Gerüste, Hebebühnen) oder durch die Baustellenbedingungen werden vor der Ausführung über einen Zusatzauftrag/Änderungsvertrag geregelt.']],
      ['3) Genehmigungen und Anmeldung', ['Genehmigungen/Vorabmitteilung: Das Angebot enthält keine kommunalen Gebühren oder Genehmigungskosten, sofern nicht ausdrücklich angegeben.', 'Anmeldung und Abwicklung: nur enthalten, wenn als Position aufgeführt. Die Anmeldung erfolgt gemäß den für die Anlagenart geltenden Vorschriften.']],
      ['4) Baustellenbedingungen und Pflichten des Kunden', ['Zugang und Verfügbarkeit: Der Kunde stellt Zugänge, Strom- und Wasseranschlüsse, Lagerflächen und geplante Abschaltungen bereit.', 'Tragwerk/Unterkonstruktion: Sofern keine Statikprüfung beauftragt wurde, wird davon ausgegangen, dass Dach/Decke/Fundament die Lasten der Anlage aufnehmen kann. Verstärkungen oder Reparaturen gehen zu Lasten des Kunden.', 'Stromversorgung: Die Anpassung des Hauptverteilers, Erhöhungen der vertraglichen Leistung und Maßnahmen des Netzbetreibers/Stromanbieters sind nicht enthalten, sofern keine eigene Position vorgesehen ist.']],
      ['5) Übliche Ausschlüsse (nicht abschließend)', ['Bauarbeiten (Gräben, Schlitze, Estriche, Fundamente für Vordächer/Carports, Maurer- und Malerarbeiten).', 'Besondere Hilfsmittel (Kran, zertifizierte Gerüste, Hebebühnen), sofern nicht als Position enthalten.', 'Ersatz von Dachziegeln/Sonderteilen des Daches über das für die Montage unbedingt Erforderliche hinaus.', 'Nicht angegebene Außenleitungen, Sonderbohrungen, Arbeiten in Bereichen mit Asbest oder Gefahrstoffen.', 'Anpassungen des Hausanschlusskastens/der Trafostation sowie nicht vorgesehene Netzzugangs- und Anschlussverfahren.', 'Erweitertes Monitoring, Smart-Home-Integrationen oder USV, sofern nicht angegeben.']],
      ['6) Gewährleistung', ['Arbeitsleistung: 2 Jahre ab Inbetriebnahme für Ausführungsmängel.', 'Geräte: Herstellergarantie zu den jeweiligen Bedingungen (z. B. PV-Module mit Produkt- und Leistungsgarantie; Wechselrichter/Batterien zu den jeweiligen Konditionen). Die Abwicklung erfolgt nach den Verfahren der jeweiligen Marke.', 'Ausgeschlossen sind normaler Verschleiß, unsachgemäßer Gebrauch, Eingriffe Dritter, extreme Wetterereignisse oder höhere Gewalt.']],
      ['7) Inbetriebnahme und Einweisung', ['Nach der Installation erfolgen die Inbetriebnahme, die Grundeinstellungen und eine Einweisung des Nutzers in den sicheren Gebrauch und die grundlegende Wartung.']],
      ['8) Wartung', ['Vorbeugende/korrektive Wartung ist nicht enthalten, sofern nicht gesondert beauftragt. BENSOL bietet Wartungsverträge mit regelmäßigen Besuchen, Modulreinigung und elektrischen Prüfungen an.']],
      ['9) Sicherheit und Umwelt', ['BENSOL hält die geltenden Arbeitsschutzvorschriften ein und verwendet die erforderliche persönliche Schutzausrüstung.', 'Die Abfallentsorgung erfolgt gemäß den geltenden Vorschriften; Gebühren zugelassener Entsorger und Transport sind nur enthalten, wenn sie als Position aufgeführt sind.']],
      ['10) Haftungsbeschränkung', ['Die Haftung von BENSOL für indirekte Schäden, entgangenen Gewinn oder Produktionsausfall ist ausgeschlossen. Die Gesamthaftung ist in jedem Fall auf den vom Kunden für die vertragsgegenständlichen Arbeiten tatsächlich gezahlten Gesamtbetrag beschränkt, außer bei Vorsatz oder grober Fahrlässigkeit.']],
      ['11) Datenschutz (DSGVO/LOPDGDD)', ['Gemäß der Verordnung (EU) 2016/679 vom 27. April 2016 (DSGVO) und dem spanischen Organgesetz 3/2018 vom 5. Dezember über den Schutz personenbezogener Daten und die Gewährleistung digitaler Rechte (LOPDGDD) informieren wir Sie über die Datenverarbeitung: Verantwortlicher: BENSOL Ingeniería, S.R.L., B56564701, Camí Can Calafat, 21 Polígono Son OMS, 07199 Palma (Illes Balears) SPANIEN, info@bensolic.es. Zwecke: Pflege einer Geschäftsbeziehung und Zusendung von Informationen zu Produkten oder Dienstleistungen. Rechtsgrundlage: gesetzliche Verpflichtung des Verantwortlichen und, soweit zutreffend, Einwilligung der betroffenen Person. Art und Speicherdauer: Es werden nur die für den Zweck erforderlichen Daten verarbeitet und für die gesetzlichen Verjährungsfristen aufbewahrt. Empfänger: die für den Verarbeitungszweck und die Erfüllung gesetzlicher Pflichten erforderlichen. Ihre Rechte: Auskunft, Berichtigung, Datenübertragbarkeit, Löschung, Einschränkung und Widerspruch. Weitere Informationen: beim Verantwortlichen oder unter www.bensolic.es.']],
      ['12) Widerrufsrecht (nur Verbraucher)', ['Bei Fernabsatz- und außerhalb von Geschäftsräumen geschlossenen Verträgen kann der Verbraucher innerhalb von 14 Kalendertagen ohne Angabe von Gründen widerrufen.', 'Wurde die Leistung auf Wunsch des Kunden während der Widerrufsfrist begonnen, kann der anteilige Betrag für den bereits erbrachten Teil verlangt werden.']],
      ['13) Höhere Gewalt', ['Keine der Parteien haftet für Verzögerungen aufgrund höherer Gewalt (Unwetter, Generalstreiks, Pandemien, Nichtverfügbarkeit kritischer Lieferungen, nachträgliche behördliche Maßnahmen usw.). Die Fristen verlängern sich um die Dauer des Ereignisses.']],
      ['14) Anwendbares Recht und Gerichtsstand', ['Dieser Vertrag unterliegt spanischem Recht. Für Streitigkeiten sind die Gerichte von Palma de Mallorca zuständig. Ist der Kunde Verbraucher, sind die Gerichte seines Wohnsitzes zuständig.']],
    ],
  },
};

/** Los textos del PDF en el idioma (español si no se conoce). */
export const textosPDF = (idioma) => PDF[idiomaValido(idioma)];
/** Rellena {n}, {f}, {hasta}… en un texto fijo. */
export const rellena = (t, v) => String(t).replace(/\{(\w+)\}/g, (_, k) => (v && v[k] != null ? String(v[k]) : ''));

/* ---------- los textos de la app para elegir idioma ---------- */
export const nombreIdioma = (k) => (IDIOMAS.find(([x]) => x === k) || ['', ''])[1];
