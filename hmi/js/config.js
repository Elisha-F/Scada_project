/*
 * Villa Somalia Hybrid Power Plant - plant model
 * Source: drawing set BFE/PR/26/01 (Blueflag Energy, rev. 05-10-2026)
 *   - Overall SLD, 11kV Switchgear Config, Transformer Stations,
 *     Inverter Wiring Diagram, Communication Schematic, General Layout.
 * Values marked "TBC" are not given in the drawings and must be confirmed
 * against vendor data sheets before FAT.
 */
var SCADA = (typeof window !== 'undefined' ? window : globalThis).SCADA =
  (typeof window !== 'undefined' ? window : globalThis).SCADA || {};

SCADA.config = {
  site: {
    name: 'Villa Somalia Hybrid Power Plant',
    short: 'VILLA SOMALIA',
    client: 'Ministry of Energy & Water Resources - Somalia',
    contractor: 'Blueflag Energy Co. Ltd',
    drawing: 'BFE/PR/26/01',
    lat: 2.0333, lon: 45.3333, tz: 'Africa/Mogadishu',
    operation: 'Islanded microgrid (no utility grid) - BESS grid-forming, DG back-up'
  },

  /* ---------------- 11 kV GIS combiner panel ---------------- */
  gis: {
    busbar: { kv: 11, ratedA: 1250 },
    panels: [
      { id: 'AH1', usage: 'DG SETS',       ql: 'QL11', qf: 'QF11', kind: 'incomer', ct: '600/200/200/1A 5P20/0.5/0.2S', zsct: true,  spd: true,  cable: '3x70mm² Al/XLPE/CWS/SWA/PVC 6.35/11kV', feeds: 'DGTX' },
      { id: 'AH2', usage: 'PV IN',         ql: 'QL12', qf: 'QF12', kind: 'incomer', ct: '600/200/200/1A 5P20/0.5/0.2S', zsct: true,  spd: true,  cable: '3x70mm² Al/XLPE/CWS/SWA/PVC 6.35/11kV', feeds: 'PVTX' },
      { id: 'AH3', usage: 'BESS IN',       ql: 'QL13', qf: 'QF13', kind: 'incomer', ct: '600/200/200/1A 5P20/0.5/0.2S', zsct: true,  spd: true,  cable: '3x70mm² Al/XLPE/CWS/SWA/PVC 6.35/11kV', feeds: 'BESSTX' },
      { id: 'AH4', usage: 'OUT 1 (President)', ql: 'QL14', qf: 'QF14', kind: 'feeder', ct: '600/200/200/1A 5P20/0.5/0.2S', zsct: true, spd: true, cable: '3x70mm² Al/XLPE/CWS/SWA/PVC 6.35/11kV', feeds: 'RMU_PRES' },
      { id: 'AH5', usage: 'SAT Feeder',    ql: 'QL15', qf: 'QF15', kind: 'feeder',  ct: '600/100/100/1A 5P20/0.5/0.2S', zsct: false, spd: false, cable: '3x50mm² Al/XLPE/CWS/SWA/PVC 6.35/11kV', feeds: 'AUXTX' },
      { id: 'AH6', usage: 'OUT 2 (P.M.)',  ql: 'QL16', qf: 'QF16', kind: 'feeder',  ct: '1250/1 5P20 15VA; 1250/1 0.5 15VA', zsct: true, spd: true, cable: '3x70mm² Al/XLPE/CWS/SWA/PVC 6.35/11kV', feeds: 'RMU_PM' },
      { id: 'AH7', usage: 'SPARE FDR',     ql: 'QL17', qf: 'QF17', kind: 'spare',   ct: '1250/1 5P20 15VA; 1250/1 0.5 15VA', zsct: true, spd: true, cable: '-', feeds: null },
      { id: 'AH8', usage: 'NECR Feeder',   ql: 'QL18', qf: 'QF18', kind: 'earthing',ct: '1250/1 5P20 15VA; 1250/1 0.5 15VA', zsct: true, spd: true, cable: '3x70mm² Al/XLPE/CSW/SWA/PVC 6.35/11kV', feeds: 'NECR' }
    ],
    breaker: '630A 31.5kA VCB', isolator: '630A 20kA three-position', vpis: 'DXN-12Q', spdType: 'HY5WS-17/50',
    relay: 'Feeder protection relay - make/model TBC (Modbus TCP; IEC 61850 with an added controller module)'
  },

  /* ---------------- Transformers ---------------- */
  transformers: [
    { id: 'DGTX',   name: 'DG Step-up TX',        kva: 1500, hv: 11, lv: 0.4,  vector: 'Dyn11', uk: 6, cooling: 'TBC' },
    { id: 'PVTX',   name: 'PV Inverter TX',       kva: 1500, hv: 11, lv: 0.8,  vector: 'Dd0',   uk: 6, cooling: 'TBC' },
    { id: 'BESSTX', name: 'BESS TX',              kva: 1000, hv: 11, lv: 0.69, vector: 'Dd0',   uk: 6, cooling: 'TBC' },
    { id: 'PRESTX', name: 'President Office TX',  kva: 630,  hv: 11, lv: 0.4,  vector: 'Dyn11', uk: 6, cooling: 'ONAN' },
    { id: 'PMTX',   name: 'Prime Minister Office TX', kva: 630, hv: 11, lv: 0.4, vector: 'Dyn11', uk: 6, cooling: 'ONAN' },
    { id: 'AUXTX',  name: 'Station Aux TX (SAT)', kva: 100,  hv: 11, lv: 0.4,  vector: 'Dyn11', uk: 4, cooling: 'TBC', fuse: 'XRNT-3A' }
  ],

  /* ---------------- MV ring-main units at load centres ---------------- */
  rmus: [
    { id: 'RMU_PRES', name: 'President Office RMU', tx: 'PRESTX', lvdb: 'LVDB_PRES', relay: 'Zhuhai Strom ST260E', ups: '2kVA AC220V' },
    { id: 'RMU_PM',   name: 'Prime Minister Office RMU', tx: 'PMTX', lvdb: 'LVDB_PM', relay: 'Zhuhai Strom ST260E', ups: '2kVA AC220V' }
  ],
  rmuPanels: [
    { id: 'AH1', name: 'INCOMER',     model: 'GIS-12/C', sw: 'QL11', type: 'LBS 630A 20kA' },
    { id: 'AH2', name: 'OUTGOING',    model: 'GIS-12/C', sw: 'QL12', type: 'LBS 630A 20kA' },
    { id: 'AH3', name: 'TRF FEEDER',  model: 'GIS-12/V', sw: 'QF11', type: 'VCB 630A 20kA + QK11, CT 200/1A, relay ST260E' }
  ],

  /* ---------------- Diesel generators ---------------- */
  generators: [
    { id: 'DG1', name: 'Generator 1', kva: 550, kw: 440, acb: 'Q1 ACB 800A 65kA', acbA: 800,  lead: true },
    { id: 'DG2', name: 'Generator 2', kva: 660, kw: 528, acb: 'Q2 ACB 1000A 65kA', acbA: 1000, lead: false }
  ],
  dgController: 'Genset controller - make/model TBC (Modbus TCP)',

  /* ---------------- PV ---------------- */
  pv: {
    dcKwp: 1516.32, acKw: 1400, modules: 2106, moduleWp: 720, moduleMake: 'Jinko Solar 720Wp mono',
    modulesPerString: 26, strings: 81,
    lvBreaker: 'LV ACB 1250A 20kA, CT 2500/5A 0.5',
    inverters: [
      { id: 'INV1', tag: 'NB01', model: 'Sungrow SG350HX', kw: 350, strings: 21, mccb: 'MCCB 400A 36kA' },
      { id: 'INV2', tag: 'NB02', model: 'Sungrow SG350HX', kw: 350, strings: 20, mccb: 'MCCB 400A 36kA' },
      { id: 'INV3', tag: 'NB03', model: 'Sungrow SG350HX', kw: 350, strings: 20, mccb: 'MCCB 400A 36kA' },
      { id: 'INV4', tag: 'NB04', model: 'Sungrow SG350HX', kw: 350, strings: 20, mccb: 'MCCB 400A 36kA' }
    ],
    mpptsPerInverter: 12
  },

  /* ---------------- BESS ---------------- */
  bess: {
    kwh: 3340, config: '416S8P LFP, 3.2V 314Ah cells', racks: 8, packsPerRack: 13,
    pcs: [
      { id: 'PCS1', name: 'PCS Unit 1#', kw: 475, acbA: 400 },
      { id: 'PCS2', name: 'PCS Unit 2#', kw: 475, acbA: 400 }
    ],
    lvBreaker: 'LV ACB 1000A 15kA, CT 1000/5A 0.5',
    mode: 'Grid forming (VSG)'
  },

  /* ---------------- LV distribution ---------------- */
  lvdbs: [
    { id: 'LVDB_PRES', name: 'LVDB - Office of the President', incomer: 'ACB 1000A 31.5kA', ways: 10, mccb: 'MCCB 250A 36kA' },
    { id: 'LVDB_PM',   name: 'LVDB - Office of the Prime Minister', incomer: 'ACB 1000A 31.5kA', ways: 10, mccb: 'MCCB 250A 36kA' },
    { id: 'AUXPNL',    name: 'Plant Auxiliary Panel', incomer: 'MCCB 200A', ways: 8, mccb: 'MCB/MCCB' }
  ],
  auxCircuits: ['GIS room lighting & small power', 'GIS DC charger 110VDC', 'SCADA/Comms UPS', 'BESS HVAC & aux', 'Inverter station aux', 'Fire alarm panel', 'CCTV & security', 'Weather station'],

  ups: [
    { id: 'UPS_SCADA', name: 'SCADA / Comms UPS', kva: 3, location: 'Control room' },
    { id: 'UPS_RMUP',  name: 'President RMU UPS', kva: 2, location: 'President Office RMU' },
    { id: 'UPS_RMUM',  name: 'P.M. RMU UPS',      kva: 2, location: 'P.M. Office RMU' }
  ],
  dcSystem: { id: 'DC110', name: '110VDC Battery Charger (GIS tripping/closing)', v: 110 },

  /* ---------------- Weather station ---------------- */
  weather: {
    logger: 'Meteocontrol blue\'Log XM 5000 + Fieldbus Ext + Multi I/O',
    sensors: [
      { id: 'IRR_POA', name: 'Irradiance POA', make: 'Kipp & Zonen SMP12-A', unit: 'W/m²' },
      { id: 'WIND',    name: 'Wind speed/direction', make: 'Gill WindSonic RS485', unit: 'm/s' },
      { id: 'T_AMB',   name: 'Ambient temperature', make: 'PT1000', unit: '°C' },
      { id: 'T_MOD',   name: 'Module temperature',  make: 'PT1000 back-of-module', unit: '°C' }
    ]
  },

  /* ---------------- Fire detection & suppression ---------------- */
  fire: [
    { id: 'FZ_BESS', name: 'BESS / ESS Cabin',  detection: 'Smoke + heat + H2/CO off-gas detectors', suppression: 'Aerosol / FM-200 (TBC) + pack-level', esd: true },
    { id: 'FZ_GIS',  name: '11kV GIS Room',     detection: 'Optical smoke detectors', suppression: 'CO2 portable / FM-200 (TBC)', esd: false },
    { id: 'FZ_INV',  name: 'Inverter / PV TX Station', detection: 'Heat detectors', suppression: 'Portable', esd: false },
    { id: 'FZ_DG',   name: 'DG Enclosures',     detection: 'Heat + flame', suppression: 'Fuel shut-off + portable', esd: true },
    { id: 'FZ_CTRL', name: 'Control Room',      detection: 'Smoke detectors', suppression: 'FM-200 (TBC)', esd: false }
  ],

  /* ---------------- PPC defaults ---------------- */
  ppc: {
    socMin: 10, socDgStart: 20, socDgStop: 80, socHigh: 95, socMax: 98,
    dgMinLoadPct: 30, dgOptLoadPct: 75, dgMinRunMin: 30, dgCoolDownMin: 5,
    fNom: 50, uNomKv: 11, rampKwS: 50
  }
};
