/*
 * Tag database / I/O list generator.
 * Every signal displayed, alarmed, trended or controlled by the HMI is a tag
 * created here, so the exported I/O list always matches the screens.
 *
 * Tag id format: <AREA>.<EQUIPMENT>.<SIGNAL>
 * type: AI analogue input, DI digital input, AO analogue output (setpoint), DO digital output (command)
 * alarm (DI): { on: <value that raises alarm>, pri: 1 critical | 2 high | 3 medium | 4 low }
 * limits (AI): lolo / lo / hi / hihi with priority 2 for lo/hi and 1 for lolo/hihi
 */
(function (S) {
  var C = S.config;
  var tags = {};
  var order = [];
  var addrCounters = {};

  function nextAddr(dev, type) {
    var k = dev + '|' + type;
    addrCounters[k] = (addrCounters[k] || 0) + 1;
    var n = addrCounters[k];
    switch (type) {
      case 'AI': return 30000 + n * 2;      // float32 input registers
      case 'AO': return 40000 + n * 2;      // float32 holding registers
      case 'DI': return 10000 + n;          // discrete inputs
      case 'DO': return n;                  // coils
    }
  }

  /* IEC 61850 references (indicative - final mapping from each relay's ICD file).
     Standard logical nodes where one exists, GGIO points otherwise. */
  var LN = {
    CB_CLOSED: 'CTRL/XCBR1.Pos.stVal', CB_OPEN: 'CTRL/XCBR1.Pos.stVal', CMD_OPEN: 'CTRL/CSWI1.Pos.Oper', CMD_CLOSE: 'CTRL/CSWI1.Pos.Oper',
    CB_TRIPPED: 'PROT/PTRC1.Tr.general', LR_REMOTE: 'CTRL/XCBR1.Loc.stVal (inverted)',
    DS_CLOSED: 'CTRL/XSWI1.Pos.stVal', ES_EARTHED: 'CTRL/XSWI2.Pos.stVal',
    SF6_LOW: 'CTRL/SIMG1.InsAlm.stVal', SF6_LOLO: 'CTRL/SIMG1.InsBlk.stVal', RLY_HEALTHY: 'LD0/LPHD1.PhyHealth.stVal',
    PROT_50: 'PROT/PTOC1.Op.general', PROT_50N: 'PROT/PTOC2.Op.general', PROT_50G: 'PROT/PTOC3.Op.general', PROT_46: 'PROT/PTOC4.Op.general',
    PROT_27: 'PROT/PTUV1.Op.general', PROT_59: 'PROT/PTOV1.Op.general', PROT_81: 'PROT/PTUF1.Op.general + PTOF1.Op.general',
    PROT_32: 'PROT/PDOP1.Op.general', PROT_64: 'PROT/PTOC5.Op.general',
    I_L1: 'MEAS/MMXU1.A.phsA.cVal.mag.f', I_L2: 'MEAS/MMXU1.A.phsB.cVal.mag.f', I_L3: 'MEAS/MMXU1.A.phsC.cVal.mag.f', I_N: 'MEAS/MMXU1.A.neut.cVal.mag.f',
    U_L12: 'MEAS/MMXU1.PPV.phsAB.cVal.mag.f', U_L23: 'MEAS/MMXU1.PPV.phsBC.cVal.mag.f', U_L31: 'MEAS/MMXU1.PPV.phsCA.cVal.mag.f',
    P: 'MEAS/MMXU1.TotW.mag.f', Q: 'MEAS/MMXU1.TotVAr.mag.f', S: 'MEAS/MMXU1.TotVA.mag.f', PF: 'MEAS/MMXU1.TotPF.mag.f', F: 'MEAS/MMXU1.Hz.mag.f',
    E_IMP: 'MEAS/MMTR1.SupWh.actVal', E_EXP: 'MEAS/MMTR1.DmdWh.actVal', U: 'MEAS/MMXU2.PPV.phsAB.cVal.mag.f', I_NER: 'MEAS/MMXU1.A.neut.cVal.mag.f'
  };
  var ggio = {};
  function ln61850(dev, sig, type) {
    var ld = dev.replace('RLY-', 'GIS');
    if (LN[sig]) return ld + LN[sig];
    var k = dev + type; ggio[k] = (ggio[k] || 0) + 1;
    return ld + (type === 'AI' ? 'MEAS/GGIO2.AnIn' + ggio[k] + '.mag.f' : type === 'DO' ? 'CTRL/GGIO1.SPCSO' + ggio[k] + '.Oper' : 'CTRL/GGIO1.Ind' + ggio[k] + '.stVal');
  }
  var ADDR = { 'Calculated': 'SCADA calculation', 'Internal': 'PPC internal variable', 'SNMP': 'SNMP OID (vendor MIB)', 'SNMP v3': 'SNMP OID (vendor MIB)',
    'ICMP / SNMP v3': 'ICMP ping + SNMP OID', 'Syslog': 'Syslog event', 'NTP': 'NTP status', 'Dry contacts via RMU relay': 'RMU relay binary input' };

  function T(area, equip, sig, type, desc, o) {
    o = o || {};
    var id = area + '.' + equip + '.' + sig;
    var t = {
      id: id, area: area, equip: equip, sig: sig, type: type, desc: desc,
      unit: o.unit || '', dev: o.dev || '', proto: o.proto || '',
      addr: o.addr || (o.proto && /Modbus/.test(o.proto) ? nextAddr(o.dev, type) : /IEC 61850/.test(o.proto || '') ? ln61850(o.dev, sig, type) : (ADDR[o.proto] || '')),
      v: o.v !== undefined ? o.v : (type === 'DI' || type === 'DO' ? 0 : 0),
      dec: o.dec !== undefined ? o.dec : 1,
      alarm: o.alarm || null,
      lim: o.lim || null,
      range: o.range || '',
      ctrl: o.ctrl || null,
      q: 'GOOD'
    };
    tags[id] = t;
    order.push(id);
    return t;
  }

  /* ---- reusable signal groups ---- */
  function meter3ph(area, equip, dev, proto, kv, opts) {
    opts = opts || {};
    var vu = kv >= 1 ? 'kV' : 'V';
    var vd = kv >= 1 ? 2 : 0;
    ['L1', 'L2', 'L3'].forEach(function (p) { T(area, equip, 'I_' + p, 'AI', 'Current ' + p, { unit: 'A', dev: dev, proto: proto, dec: 0 }); });
    if (opts.neutral) T(area, equip, 'I_N', 'AI', 'Neutral / residual current', { unit: 'A', dev: dev, proto: proto, dec: 1 });
    ['L12', 'L23', 'L31'].forEach(function (p) { T(area, equip, 'U_' + p, 'AI', 'Voltage ' + p, { unit: vu, dev: dev, proto: proto, dec: vd }); });
    T(area, equip, 'P', 'AI', 'Active power', { unit: 'kW', dev: dev, proto: proto, dec: 0 });
    T(area, equip, 'Q', 'AI', 'Reactive power', { unit: 'kvar', dev: dev, proto: proto, dec: 0 });
    T(area, equip, 'S', 'AI', 'Apparent power', { unit: 'kVA', dev: dev, proto: proto, dec: 0 });
    T(area, equip, 'PF', 'AI', 'Power factor', { unit: '', dev: dev, proto: proto, dec: 2 });
    T(area, equip, 'F', 'AI', 'Frequency', { unit: 'Hz', dev: dev, proto: proto, dec: 2, lim: { lolo: 47.5, lo: 49.5, hi: 50.5, hihi: 51.5 } });
    T(area, equip, 'E_IMP', 'AI', 'Active energy import', { unit: 'MWh', dev: dev, proto: proto, dec: 3 });
    T(area, equip, 'E_EXP', 'AI', 'Active energy export', { unit: 'MWh', dev: dev, proto: proto, dec: 3 });
    if (opts.thd) T(area, equip, 'THD_U', 'AI', 'Voltage THD', { unit: '%', dev: dev, proto: proto, dec: 1, lim: { hi: 5, hihi: 8 } });
  }

  function breakerDI(area, equip, dev, proto, name, o) {
    o = o || {};
    T(area, equip, 'CB_CLOSED', 'DI', name + ' closed', { dev: dev, proto: proto, ln: o.ln ? o.ln + '.Pos.stVal' : '' });
    T(area, equip, 'CB_OPEN', 'DI', name + ' open', { dev: dev, proto: proto, ln: o.ln ? o.ln + '.Pos.stVal' : '' });
    T(area, equip, 'CB_TRIPPED', 'DI', name + ' tripped (protection)', { dev: dev, proto: proto, alarm: { on: 1, pri: 1 } });
    if (o.spring !== false) T(area, equip, 'CB_SPRING', 'DI', name + ' spring charged', { dev: dev, proto: proto, v: 1, alarm: { on: 0, pri: 3 } });
    if (o.tcs) T(area, equip, 'TCS_FAIL', 'DI', 'Trip circuit supervision fail', { dev: dev, proto: proto, alarm: { on: 1, pri: 2 } });
    if (o.racked) T(area, equip, 'CB_RACKED', 'DI', name + ' racked-in / service position', { dev: dev, proto: proto, v: 1 });
    T(area, equip, 'LR_REMOTE', 'DI', 'Local/Remote switch in REMOTE', { dev: dev, proto: proto, v: 1, alarm: { on: 0, pri: 4 } });
    T(area, equip, 'CMD_OPEN', 'DO', name + ' open command', { dev: dev, proto: proto, ln: o.ln ? o.ln + '.Pos.Oper' : '', ctrl: 'open' });
    T(area, equip, 'CMD_CLOSE', 'DO', name + ' close command', { dev: dev, proto: proto, ln: o.ln ? o.ln + '.Pos.Oper' : '', ctrl: 'close' });
  }

  function txSignals(tx, dev, proto) {
    var a = 'TX', e = tx.id;
    T(a, e, 'T_OIL', 'AI', tx.name + ' oil / core temperature', { unit: '°C', dev: dev, proto: proto, lim: { hi: 85, hihi: 95 } });
    T(a, e, 'T_WDG', 'AI', tx.name + ' winding temperature', { unit: '°C', dev: dev, proto: proto, lim: { hi: 100, hihi: 120 } });
    T(a, e, 'LOAD', 'AI', tx.name + ' loading', { unit: '%', dev: 'SCADA', proto: 'Calculated', dec: 0, lim: { hi: 90, hihi: 110 } });
    T(a, e, 'TEMP_ALM', 'DI', tx.name + ' temperature alarm (1st stage)', { dev: dev, proto: proto, alarm: { on: 1, pri: 2 } });
    T(a, e, 'TEMP_TRIP', 'DI', tx.name + ' temperature trip (2nd stage)', { dev: dev, proto: proto, alarm: { on: 1, pri: 1 } });
    T(a, e, 'BUCH_ALM', 'DI', tx.name + ' Buchholz / gas alarm', { dev: dev, proto: proto, alarm: { on: 1, pri: 2 } });
    T(a, e, 'BUCH_TRIP', 'DI', tx.name + ' Buchholz / PRD trip', { dev: dev, proto: proto, alarm: { on: 1, pri: 1 } });
    T(a, e, 'OIL_LOW', 'DI', tx.name + ' oil level low', { dev: dev, proto: proto, alarm: { on: 1, pri: 3 } });
  }

  /* =============== 11 kV GIS =============== */
  C.gis.panels.forEach(function (p, i) {
    var dev = 'RLY-' + p.id, pr = 'IEC 61850 MMS', ln = 'GIS' + p.id + 'CTRL/XCBR1';
    var a = 'GIS', e = p.id;
    breakerDI(a, e, dev, pr, p.qf + ' VCB', { ln: ln, tcs: true });
    T(a, e, 'DS_CLOSED', 'DI', p.ql + ' 3-position switch - closed (line)', { dev: dev, proto: pr, ln: 'GIS' + p.id + 'CTRL/XSWI1.Pos.stVal', v: 1 });
    T(a, e, 'ES_EARTHED', 'DI', p.ql + ' 3-position switch - earthed', { dev: dev, proto: pr, ln: 'GIS' + p.id + 'CTRL/XSWI2.Pos.stVal' });
    T(a, e, 'VPIS', 'DI', 'Voltage presence indicator (' + C.gis.vpis + ')', { dev: dev, proto: pr });
    T(a, e, 'SF6_LOW', 'DI', 'SF6 gas pressure low (alarm)', { dev: dev, proto: pr, alarm: { on: 1, pri: 2 } });
    T(a, e, 'SF6_LOLO', 'DI', 'SF6 gas pressure low-low (block)', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    T(a, e, 'RLY_HEALTHY', 'DI', 'Protection relay healthy (watchdog)', { dev: dev, proto: pr, v: 1, alarm: { on: 0, pri: 1 } });
    T(a, e, 'MCB_TRIP', 'DI', 'Aux supply MCB tripped', { dev: dev, proto: pr, alarm: { on: 1, pri: 2 } });
    if (p.spd) T(a, e, 'SPD_OPER', 'DI', 'Surge arrester (' + C.gis.spdType + ') operated', { dev: dev, proto: pr, alarm: { on: 1, pri: 3 } });
    T(a, e, 'PROT_50', 'DI', 'Trip 50/51 phase overcurrent', { dev: dev, proto: pr, ln: 'GIS' + p.id + 'PROT/PTOC1.Op', alarm: { on: 1, pri: 1 } });
    T(a, e, 'PROT_50N', 'DI', 'Trip 50N/51N earth fault', { dev: dev, proto: pr, ln: 'GIS' + p.id + 'PROT/PTOC2.Op', alarm: { on: 1, pri: 1 } });
    if (p.zsct) T(a, e, 'PROT_50G', 'DI', 'Trip 51G sensitive earth fault (ZSCT)', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    T(a, e, 'PROT_46', 'DI', 'Trip 46 negative sequence / broken conductor', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    if (p.kind === 'incomer') {
      T(a, e, 'PROT_27', 'DI', 'Trip 27 undervoltage', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
      T(a, e, 'PROT_59', 'DI', 'Trip 59 overvoltage', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
      T(a, e, 'PROT_81', 'DI', 'Trip 81 O/U frequency', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
      T(a, e, 'PROT_32', 'DI', 'Trip 32 reverse power', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    }
    if (p.kind === 'earthing') T(a, e, 'PROT_64', 'DI', 'NER over-temperature / standby EF (64/51NS)', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    T(a, e, 'LOCKOUT_86', 'DI', 'Lockout relay 86 operated', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    T(a, e, 'CMD_RESET', 'DO', 'Protection / lockout reset', { dev: dev, proto: pr, ctrl: 'reset' });
    meter3ph(a, e, dev, pr, 11, { neutral: true });
  });
  T('GIS', 'BUS', 'U', 'AI', '11kV busbar voltage', { unit: 'kV', dev: 'RLY-AH3', proto: 'IEC 61850 MMS', dec: 2, lim: { lolo: 9.9, lo: 10.45, hi: 11.55, hihi: 12.1 } });
  T('GIS', 'BUS', 'F', 'AI', '11kV busbar frequency', { unit: 'Hz', dev: 'RLY-AH3', proto: 'IEC 61850 MMS', dec: 2, lim: { lolo: 47.5, lo: 49.5, hi: 50.5, hihi: 51.5 } });
  T('GIS', 'BUS', 'LIVE', 'DI', '11kV busbar energised', { dev: 'SCADA', proto: 'Calculated', v: 1, alarm: { on: 0, pri: 1 } });
  T('GIS', 'NECR', 'I_NER', 'AI', 'Neutral earthing resistor current (63.5Ω 100A 10s)', { unit: 'A', dev: 'RLY-AH8', proto: 'IEC 61850 MMS', lim: { hi: 10, hihi: 50 } });
  T('GIS', 'NECR', 'T_NER', 'AI', 'NER resistor element temperature', { unit: '°C', dev: 'RLY-AH8', proto: 'IEC 61850 MMS', lim: { hi: 300, hihi: 400 } });
  T('GIS', 'DC', 'U_DC', 'AI', '110VDC switchgear supply voltage', { unit: 'V', dev: 'DC-CHG', proto: 'Modbus TCP', lim: { lolo: 95, lo: 102, hi: 125, hihi: 130 } });
  T('GIS', 'DC', 'CHG_FAIL', 'DI', '110VDC charger fail', { dev: 'DC-CHG', proto: 'Modbus TCP', alarm: { on: 1, pri: 2 } });
  T('GIS', 'DC', 'EARTH_FLT', 'DI', '110VDC earth fault', { dev: 'DC-CHG', proto: 'Modbus TCP', alarm: { on: 1, pri: 3 } });
  T('GIS', 'ROOM', 'T_ROOM', 'AI', 'GIS room temperature', { unit: '°C', dev: 'PLC-AUX', proto: 'Modbus TCP', lim: { hi: 35, hihi: 40 } });
  T('GIS', 'ROOM', 'DOOR', 'DI', 'GIS room door open', { dev: 'PLC-AUX', proto: 'Modbus TCP', alarm: { on: 1, pri: 4 } });

  /* =============== Transformers =============== */
  C.transformers.forEach(function (tx) {
    var rmu = C.rmus.filter(function (r) { return r.tx === tx.id; })[0];
    txSignals(tx, rmu ? 'RLY-' + rmu.id : 'PLC-AUX', rmu ? 'Modbus TCP (via fibre)' : 'Modbus TCP');
  });
  T('TX', 'AUXTX', 'FUSE_BLOWN', 'DI', 'SAT XRNT-3A HV fuse blown (striker)', { dev: 'RLY-AH5', proto: 'IEC 61850 MMS', alarm: { on: 1, pri: 1 } });

  /* =============== Remote RMUs (President / PM offices) =============== */
  C.rmus.forEach(function (r) {
    var dev = 'RLY-' + r.id, pr = 'Modbus TCP (via fibre)';
    var a = 'RMU', e = r.id;
    T(a, e, 'AH1_CLOSED', 'DI', 'AH1 incomer QL11 closed', { dev: dev, proto: pr, v: 1 });
    T(a, e, 'AH1_EARTHED', 'DI', 'AH1 incomer QL11 earthed', { dev: dev, proto: pr });
    T(a, e, 'AH2_CLOSED', 'DI', 'AH2 outgoing QL12 closed', { dev: dev, proto: pr });
    T(a, e, 'AH2_EARTHED', 'DI', 'AH2 outgoing QL12 earthed', { dev: dev, proto: pr, v: 1 });
    breakerDI(a, e + '_AH3', dev, pr, 'AH3 QF11 VCB', { tcs: true });
    T(a, e, 'QK11_EARTHED', 'DI', 'AH3 QK11 earth switch earthed', { dev: dev, proto: pr });
    T(a, e, 'VPIS_DX11', 'DI', 'DX11 voltage presence', { dev: dev, proto: pr, v: 1 });
    T(a, e, 'VPIS_DX13', 'DI', 'DX13 voltage presence', { dev: dev, proto: pr, v: 1 });
    T(a, e, 'SF6_LOW', 'DI', 'SF6 gas pressure low', { dev: dev, proto: pr, alarm: { on: 1, pri: 2 } });
    T(a, e, 'RLY_HEALTHY', 'DI', r.relay + ' relay healthy', { dev: dev, proto: pr, v: 1, alarm: { on: 0, pri: 1 } });
    T(a, e, 'PROT_50', 'DI', 'ST260E trip 50/51 overcurrent', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    T(a, e, 'PROT_50N', 'DI', 'ST260E trip 50N/51N earth fault', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    T(a, e, 'COMM', 'DI', 'Fibre link to plant SCADA healthy', { dev: 'SW-' + r.id, proto: 'SNMP', v: 1, alarm: { on: 0, pri: 2 } });
    ['L1', 'L2', 'L3'].forEach(function (p) { T(a, e, 'I_' + p, 'AI', 'AH3 current ' + p, { unit: 'A', dev: dev, proto: pr, dec: 1 }); });
    T(a, e, 'I_N', 'AI', 'AH3 residual current', { unit: 'A', dev: dev, proto: pr, dec: 2 });
  });

  /* =============== LV distribution boards =============== */
  C.lvdbs.forEach(function (b) {
    var dev = 'PM-' + b.id, pr = 'Modbus RTU / TCP gateway';
    var a = 'LV', e = b.id;
    breakerDI(a, e, dev, pr, 'Incomer ' + b.incomer, { racked: b.id !== 'AUXPNL' });
    meter3ph(a, e, dev, pr, 0.4, { neutral: true, thd: true });
    T(a, e, 'SPD_FAIL', 'DI', 'LV surge protective device failed', { dev: dev, proto: pr, alarm: { on: 1, pri: 3 } });
    for (var w = 1; w <= b.ways; w++) {
      var ww = ('0' + w).slice(-2);
      T(a, e, 'W' + ww + '_ON', 'DI', 'Outgoing way ' + w + ' ' + b.mccb + ' ON', { dev: dev, proto: pr, v: 1 });
      T(a, e, 'W' + ww + '_TRIP', 'DI', 'Outgoing way ' + w + ' tripped', { dev: dev, proto: pr, alarm: { on: 1, pri: 3 } });
      T(a, e, 'W' + ww + '_P', 'AI', 'Outgoing way ' + w + ' active power', { unit: 'kW', dev: dev, proto: pr, dec: 1 });
    }
  });

  /* =============== Generators =============== */
  C.generators.forEach(function (g) {
    var dev = 'GCU-' + g.id, pr = 'Modbus TCP';
    var a = 'DG', e = g.id;
    T(a, e, 'RUNNING', 'DI', g.name + ' running', { dev: dev, proto: pr });
    T(a, e, 'READY', 'DI', g.name + ' ready / auto mode', { dev: dev, proto: pr, v: 1, alarm: { on: 0, pri: 3 } });
    T(a, e, 'MODE_AUTO', 'DI', g.name + ' controller in AUTO', { dev: dev, proto: pr, v: 1 });
    T(a, e, 'SYNC', 'DI', g.name + ' synchronised', { dev: dev, proto: pr });
    T(a, e, 'COMMON_ALM', 'DI', g.name + ' common alarm (warning)', { dev: dev, proto: pr, alarm: { on: 1, pri: 3 } });
    T(a, e, 'SHUTDOWN', 'DI', g.name + ' shutdown fault', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    T(a, e, 'FAIL_START', 'DI', g.name + ' fail to start', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    T(a, e, 'LOW_OILP', 'DI', g.name + ' low oil pressure', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    T(a, e, 'HIGH_TEMP', 'DI', g.name + ' high coolant temperature', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    T(a, e, 'OVERSPEED', 'DI', g.name + ' overspeed', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    T(a, e, 'LOW_FUEL', 'DI', g.name + ' low fuel level', { dev: dev, proto: pr, alarm: { on: 1, pri: 2 } });
    T(a, e, 'ESTOP', 'DI', g.name + ' emergency stop pressed', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    T(a, e, 'BATT_CHG_FAIL', 'DI', g.name + ' battery charger fail', { dev: dev, proto: pr, alarm: { on: 1, pri: 3 } });
    breakerDI(a, e + '_ACB', dev, pr, g.acb, { racked: true });
    meter3ph(a, e, dev, pr, 0.4, {});
    T(a, e, 'LOAD_PCT', 'AI', g.name + ' load', { unit: '%', dev: dev, proto: pr, dec: 0 });
    T(a, e, 'RPM', 'AI', 'Engine speed', { unit: 'rpm', dev: dev, proto: pr, dec: 0 });
    T(a, e, 'OIL_P', 'AI', 'Oil pressure', { unit: 'bar', dev: dev, proto: pr, dec: 1 });
    T(a, e, 'COOL_T', 'AI', 'Coolant temperature', { unit: '°C', dev: dev, proto: pr, lim: { hi: 95, hihi: 103 } });
    T(a, e, 'FUEL', 'AI', 'Fuel level', { unit: '%', dev: dev, proto: pr, dec: 0, lim: { lolo: 10, lo: 25 } });
    T(a, e, 'FUEL_RATE', 'AI', 'Fuel consumption', { unit: 'L/h', dev: dev, proto: pr });
    T(a, e, 'BATT_V', 'AI', 'Starter battery voltage', { unit: 'V', dev: dev, proto: pr, lim: { lo: 23, hi: 29 } });
    T(a, e, 'HOURS', 'AI', 'Running hours', { unit: 'h', dev: dev, proto: pr, dec: 0 });
    T(a, e, 'STARTS', 'AI', 'Number of starts', { unit: '', dev: dev, proto: pr, dec: 0 });
    T(a, e, 'CMD_START', 'DO', g.name + ' remote start', { dev: dev, proto: pr, ctrl: 'start' });
    T(a, e, 'CMD_STOP', 'DO', g.name + ' remote stop', { dev: dev, proto: pr, ctrl: 'stop' });
    T(a, e, 'CMD_RESET', 'DO', g.name + ' fault reset', { dev: dev, proto: pr, ctrl: 'reset' });
    T(a, e, 'SP_P', 'AO', g.name + ' active power setpoint', { unit: 'kW', dev: dev, proto: pr, range: '0-' + g.kw });
  });
  breakerDI('DG', 'TX_LV', 'PM-DGTX', 'Modbus RTU', 'DG step-up TX LV ACB', { racked: true });

  /* =============== PV inverters =============== */
  var pvPr = 'Power-line carrier (PLC) over AC cables → PLC box → Ethernet / Modbus TCP';
  breakerDI('PV', 'LV_ACB', 'PM-PVTX', 'Modbus RTU', 'PV LV ACB 1250A', { racked: true });
  meter3ph('PV', 'POC', 'PM-PVTX', 'Modbus RTU', 0.8, { thd: true });
  T('PV', 'LV_PNL', 'SPD_FAIL', 'DI', 'PV AC combiner panel (0.8 kV) SPD failed', { dev: 'PM-PVTX', proto: 'Modbus RTU', alarm: { on: 1, pri: 3 } });
  C.pv.inverters.forEach(function (inv) {
    var dev = inv.tag, a = 'PV', e = inv.id;
    T(a, e, 'RUN', 'DI', inv.tag + ' running (grid-connected)', { dev: dev, proto: pvPr });
    T(a, e, 'STANDBY', 'DI', inv.tag + ' standby / derating', { dev: dev, proto: pvPr });
    T(a, e, 'FAULT', 'DI', inv.tag + ' fault', { dev: dev, proto: pvPr, alarm: { on: 1, pri: 2 } });
    T(a, e, 'COMM', 'DI', inv.tag + ' communication OK', { dev: dev, proto: pvPr, v: 1, alarm: { on: 0, pri: 2 } });
    T(a, e, 'ISO_FLT', 'DI', inv.tag + ' insulation (PV-earth) fault', { dev: dev, proto: pvPr, alarm: { on: 1, pri: 2 } });
    T(a, e, 'DC_SPD', 'DI', inv.tag + ' DC SPD failed', { dev: dev, proto: pvPr, alarm: { on: 1, pri: 3 } });
    T(a, e, 'AC_SPD', 'DI', inv.tag + ' AC SPD failed', { dev: dev, proto: pvPr, alarm: { on: 1, pri: 3 } });
    T(a, e, 'MCCB_ON', 'DI', inv.tag + ' AC ' + inv.mccb + ' ON', { dev: 'PM-PVTX', proto: 'Modbus RTU', v: 1, alarm: { on: 0, pri: 2 } });
    T(a, e, 'MCCB_TRIP', 'DI', inv.tag + ' AC ' + inv.mccb + ' tripped', { dev: 'PM-PVTX', proto: 'Modbus RTU', alarm: { on: 1, pri: 2 } });
    T(a, e, 'P', 'AI', inv.tag + ' AC active power', { unit: 'kW', dev: dev, proto: pvPr });
    T(a, e, 'Q', 'AI', inv.tag + ' AC reactive power', { unit: 'kvar', dev: dev, proto: pvPr });
    T(a, e, 'PF', 'AI', inv.tag + ' power factor', { dev: dev, proto: pvPr, dec: 2 });
    T(a, e, 'U_AC', 'AI', inv.tag + ' AC voltage L-L', { unit: 'V', dev: dev, proto: pvPr, dec: 0 });
    T(a, e, 'I_AC', 'AI', inv.tag + ' AC current', { unit: 'A', dev: dev, proto: pvPr, dec: 0 });
    T(a, e, 'F', 'AI', inv.tag + ' grid frequency', { unit: 'Hz', dev: dev, proto: pvPr, dec: 2 });
    T(a, e, 'P_DC', 'AI', inv.tag + ' DC power', { unit: 'kW', dev: dev, proto: pvPr });
    T(a, e, 'U_DC', 'AI', inv.tag + ' DC bus voltage', { unit: 'V', dev: dev, proto: pvPr, dec: 0 });
    T(a, e, 'T_INT', 'AI', inv.tag + ' internal temperature', { unit: '°C', dev: dev, proto: pvPr, lim: { hi: 70, hihi: 80 } });
    T(a, e, 'EFF', 'AI', inv.tag + ' conversion efficiency', { unit: '%', dev: dev, proto: pvPr });
    T(a, e, 'R_ISO', 'AI', inv.tag + ' insulation resistance', { unit: 'kΩ', dev: dev, proto: pvPr, dec: 0, lim: { lo: 200 } });
    T(a, e, 'E_DAY', 'AI', inv.tag + ' energy today', { unit: 'kWh', dev: dev, proto: pvPr, dec: 0 });
    T(a, e, 'E_TOT', 'AI', inv.tag + ' energy total', { unit: 'MWh', dev: dev, proto: pvPr, dec: 2 });
    for (var m = 1; m <= C.pv.mpptsPerInverter; m++) {
      T(a, e, 'MPPT' + ('0' + m).slice(-2) + '_U', 'AI', inv.tag + ' MPPT' + m + ' voltage', { unit: 'V', dev: dev, proto: pvPr, dec: 0 });
    }
    for (var s = 1; s <= inv.strings; s++) {
      T(a, e, 'STR' + ('0' + s).slice(-2) + '_I', 'AI', inv.tag + '-' + ('0' + s).slice(-2) + ' string current (26 modules)', { unit: 'A', dev: dev, proto: pvPr, dec: 2 });
    }
    T(a, e, 'CMD_START', 'DO', inv.tag + ' start / power on', { dev: dev, proto: pvPr, ctrl: 'start' });
    T(a, e, 'CMD_STOP', 'DO', inv.tag + ' stop / power off', { dev: dev, proto: pvPr, ctrl: 'stop' });
    T(a, e, 'SP_PLIM', 'AO', inv.tag + ' active power limit', { unit: '%', dev: dev, proto: pvPr, range: '0-100', v: 100 });
    T(a, e, 'SP_PF', 'AO', inv.tag + ' power factor setpoint', { unit: '', dev: dev, proto: pvPr, range: '0.8i-0.8c', v: 1 });
  });

  /* =============== Weather station =============== */
  var wd = 'BLUELOG', wp = 'blue\'Log Fieldbus Ext / Modbus TCP';
  T('MET', 'WS', 'IRR_POA', 'AI', 'Plane-of-array irradiance (SMP12-A)', { unit: 'W/m²', dev: wd, proto: wp, dec: 0 });
  T('MET', 'WS', 'IRR_GHI', 'AI', 'Global horizontal irradiance', { unit: 'W/m²', dev: wd, proto: wp, dec: 0 });
  T('MET', 'WS', 'WIND_SPD', 'AI', 'Wind speed (Gill WindSonic)', { unit: 'm/s', dev: wd, proto: wp, lim: { hi: 20, hihi: 25 } });
  T('MET', 'WS', 'WIND_DIR', 'AI', 'Wind direction', { unit: '°', dev: wd, proto: wp, dec: 0 });
  T('MET', 'WS', 'T_AMB', 'AI', 'Ambient temperature', { unit: '°C', dev: wd, proto: wp });
  T('MET', 'WS', 'T_MOD', 'AI', 'Module temperature', { unit: '°C', dev: wd, proto: wp });
  T('MET', 'WS', 'HUM', 'AI', 'Relative humidity', { unit: '%', dev: wd, proto: wp, dec: 0 });
  T('MET', 'WS', 'INSOL_DAY', 'AI', 'Insolation today', { unit: 'kWh/m²', dev: 'SCADA', proto: 'Calculated', dec: 2 });
  T('MET', 'WS', 'PR', 'AI', 'Performance ratio (instant)', { unit: '%', dev: 'SCADA', proto: 'Calculated', dec: 1 });
  T('MET', 'WS', 'COMM', 'DI', 'Weather station communication OK', { dev: wd, proto: wp, v: 1, alarm: { on: 0, pri: 3 } });
  T('MET', 'WS', 'SENSOR_FLT', 'DI', 'Sensor out of range / fault', { dev: wd, proto: wp, alarm: { on: 1, pri: 3 } });

  /* =============== BESS =============== */
  var bd = 'EMS-BESS', bp = 'Modbus TCP';
  T('BESS', 'SYS', 'SOC', 'AI', 'Battery state of charge', { unit: '%', dev: bd, proto: bp, lim: { lolo: 10, lo: 20, hi: 99 } });
  T('BESS', 'SYS', 'SOH', 'AI', 'Battery state of health', { unit: '%', dev: bd, proto: bp, lim: { lo: 80 } });
  T('BESS', 'SYS', 'E_AVAIL', 'AI', 'Available energy', { unit: 'kWh', dev: bd, proto: bp, dec: 0 });
  T('BESS', 'SYS', 'P', 'AI', 'BESS active power (+discharge / -charge)', { unit: 'kW', dev: bd, proto: bp, dec: 0 });
  T('BESS', 'SYS', 'Q', 'AI', 'BESS reactive power', { unit: 'kvar', dev: bd, proto: bp, dec: 0 });
  T('BESS', 'SYS', 'P_CHG_MAX', 'AI', 'Allowable charge power', { unit: 'kW', dev: bd, proto: bp, dec: 0 });
  T('BESS', 'SYS', 'P_DIS_MAX', 'AI', 'Allowable discharge power', { unit: 'kW', dev: bd, proto: bp, dec: 0 });
  T('BESS', 'SYS', 'U_DC', 'AI', 'Battery DC voltage', { unit: 'V', dev: bd, proto: bp, dec: 0 });
  T('BESS', 'SYS', 'I_DC', 'AI', 'Battery DC current', { unit: 'A', dev: bd, proto: bp, dec: 0 });
  T('BESS', 'SYS', 'T_CELL_MAX', 'AI', 'Max cell temperature', { unit: '°C', dev: bd, proto: bp, lim: { hi: 45, hihi: 55 } });
  T('BESS', 'SYS', 'T_CELL_MIN', 'AI', 'Min cell temperature', { unit: '°C', dev: bd, proto: bp, lim: { lo: 5 } });
  T('BESS', 'SYS', 'U_CELL_MAX', 'AI', 'Max cell voltage', { unit: 'V', dev: bd, proto: bp, dec: 3, lim: { hi: 3.60, hihi: 3.65 } });
  T('BESS', 'SYS', 'U_CELL_MIN', 'AI', 'Min cell voltage', { unit: 'V', dev: bd, proto: bp, dec: 3, lim: { lolo: 2.6, lo: 2.9 } });
  T('BESS', 'SYS', 'E_CHG', 'AI', 'Energy charged total', { unit: 'MWh', dev: bd, proto: bp, dec: 2 });
  T('BESS', 'SYS', 'E_DIS', 'AI', 'Energy discharged total', { unit: 'MWh', dev: bd, proto: bp, dec: 2 });
  T('BESS', 'SYS', 'CYCLES', 'AI', 'Equivalent full cycles', { unit: '', dev: bd, proto: bp, dec: 0 });
  T('BESS', 'SYS', 'GRID_FORMING', 'DI', 'BESS operating grid-forming (VSG)', { dev: bd, proto: bp, v: 1 });
  T('BESS', 'SYS', 'BMS_FAULT', 'DI', 'BMS fault', { dev: bd, proto: bp, alarm: { on: 1, pri: 1 } });
  T('BESS', 'SYS', 'BMS_WARN', 'DI', 'BMS warning', { dev: bd, proto: bp, alarm: { on: 1, pri: 3 } });
  T('BESS', 'SYS', 'ESD', 'DI', 'BESS emergency stop activated', { dev: bd, proto: bp, alarm: { on: 1, pri: 1 } });
  T('BESS', 'SYS', 'DOOR', 'DI', 'ESS cabin door open', { dev: bd, proto: bp, alarm: { on: 1, pri: 4 } });
  T('BESS', 'SYS', 'CMD_MODE', 'AO', 'BESS operating mode (0 stop, 1 grid-forming, 2 grid-following P/Q)', { dev: bd, proto: bp, range: '0-2', v: 1, dec: 0 });
  T('BESS', 'SYS', 'SP_P', 'AO', 'Active power setpoint (grid-following)', { unit: 'kW', dev: bd, proto: bp, range: '-950..950' });
  T('BESS', 'SYS', 'SP_F', 'AO', 'Frequency setpoint (grid-forming)', { unit: 'Hz', dev: bd, proto: bp, range: '49.5-50.5', v: 50 });
  T('BESS', 'SYS', 'SP_U', 'AO', 'Voltage setpoint (grid-forming)', { unit: 'V', dev: bd, proto: bp, range: '621-759', v: 690 });
  T('BESS', 'SYS', 'CMD_START', 'DO', 'BESS start', { dev: bd, proto: bp, ctrl: 'start' });
  T('BESS', 'SYS', 'CMD_STOP', 'DO', 'BESS stop', { dev: bd, proto: bp, ctrl: 'stop' });
  T('BESS', 'SYS', 'CMD_RESET', 'DO', 'BESS fault reset', { dev: bd, proto: bp, ctrl: 'reset' });
  breakerDI('BESS', 'LV_ACB', 'PM-BESSTX', 'Modbus RTU', 'BESS LV ACB 1000A', { racked: true });
  meter3ph('BESS', 'POC', 'PM-BESSTX', 'Modbus RTU', 0.69, { thd: true });
  C.bess.pcs.forEach(function (p) {
    var a = 'BESS', e = p.id, dev = 'PCS-' + p.id.slice(-1);
    T(a, e, 'RUN', 'DI', p.name + ' running', { dev: dev, proto: bp });
    T(a, e, 'FAULT', 'DI', p.name + ' fault', { dev: dev, proto: bp, alarm: { on: 1, pri: 1 } });
    T(a, e, 'ACB_CLOSED', 'DI', p.name + ' 400A breaker closed', { dev: dev, proto: bp, v: 1 });
    T(a, e, 'DC_SW', 'DI', p.name + ' DC switch closed', { dev: dev, proto: bp, v: 1 });
    T(a, e, 'P', 'AI', p.name + ' active power', { unit: 'kW', dev: dev, proto: bp, dec: 0 });
    T(a, e, 'Q', 'AI', p.name + ' reactive power', { unit: 'kvar', dev: dev, proto: bp, dec: 0 });
    T(a, e, 'U_AC', 'AI', p.name + ' AC voltage', { unit: 'V', dev: dev, proto: bp, dec: 0 });
    T(a, e, 'I_AC', 'AI', p.name + ' AC current', { unit: 'A', dev: dev, proto: bp, dec: 0 });
    T(a, e, 'U_DC', 'AI', p.name + ' DC voltage', { unit: 'V', dev: dev, proto: bp, dec: 0 });
    T(a, e, 'T_IGBT', 'AI', p.name + ' IGBT temperature', { unit: '°C', dev: dev, proto: bp, lim: { hi: 75, hihi: 85 } });
  });
  C.bess.pcs.forEach(function (p, i) {
    var a = 'BESS', e = 'BCP' + (i + 1), nm = 'Battery combiner panel unit ' + (i + 1) + '#';
    T(a, e, 'SW_CLOSED', 'DI', nm + ' DC switch-disconnector closed', { dev: bd, proto: bp, v: 1, alarm: { on: 0, pri: 2 } });
    T(a, e, 'FUSE_BLOWN', 'DI', nm + ' DC fuse blown', { dev: bd, proto: bp, alarm: { on: 1, pri: 1 } });
    T(a, e, 'SPD_FAIL', 'DI', nm + ' DC SPD failed', { dev: bd, proto: bp, alarm: { on: 1, pri: 3 } });
    T(a, e, 'I_DC', 'AI', nm + ' DC current', { unit: 'A', dev: bd, proto: bp, dec: 0 });
  });
  for (var r = 1; r <= C.bess.racks; r++) {
    var re = 'RACK' + r, rd = 'BMS-R' + r;
    T('BESS', re, 'SOC', 'AI', 'Rack ' + r + ' SOC', { unit: '%', dev: rd, proto: bp });
    T('BESS', re, 'U', 'AI', 'Rack ' + r + ' voltage', { unit: 'V', dev: rd, proto: bp, dec: 0 });
    T('BESS', re, 'I', 'AI', 'Rack ' + r + ' current', { unit: 'A', dev: rd, proto: bp, dec: 1 });
    T('BESS', re, 'T_MAX', 'AI', 'Rack ' + r + ' max cell temperature', { unit: '°C', dev: rd, proto: bp, lim: { hi: 45, hihi: 55 } });
    T('BESS', re, 'U_CMAX', 'AI', 'Rack ' + r + ' max cell voltage', { unit: 'V', dev: rd, proto: bp, dec: 3 });
    T('BESS', re, 'U_CMIN', 'AI', 'Rack ' + r + ' min cell voltage', { unit: 'V', dev: rd, proto: bp, dec: 3 });
    T('BESS', re, 'CONTACTOR', 'DI', 'Rack ' + r + ' main contactor closed', { dev: rd, proto: bp, v: 1, alarm: { on: 0, pri: 2 } });
    T('BESS', re, 'FAULT', 'DI', 'Rack ' + r + ' fault', { dev: rd, proto: bp, alarm: { on: 1, pri: 2 } });
  }
  T('BESS', 'HVAC', 'T_CABIN', 'AI', 'ESS cabin air temperature', { unit: '°C', dev: bd, proto: bp, lim: { hi: 30, hihi: 35 } });
  T('BESS', 'HVAC', 'HUM', 'AI', 'ESS cabin humidity', { unit: '%', dev: bd, proto: bp, dec: 0, lim: { hi: 85 } });
  T('BESS', 'HVAC', 'RUN', 'DI', 'HVAC / liquid cooling running', { dev: bd, proto: bp, v: 1 });
  T('BESS', 'HVAC', 'FAULT', 'DI', 'HVAC / chiller fault', { dev: bd, proto: bp, alarm: { on: 1, pri: 2 } });

  /* =============== Fire detection & suppression =============== */
  C.fire.forEach(function (z) {
    var dev = 'FACP', pr = 'Modbus TCP / dry contacts';
    var a = 'FIRE', e = z.id;
    T(a, e, 'PRE_ALM', 'DI', z.name + ' pre-alarm (1st detector)', { dev: dev, proto: pr, alarm: { on: 1, pri: 2 } });
    T(a, e, 'FIRE', 'DI', z.name + ' FIRE alarm (confirmed)', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
    T(a, e, 'FAULT', 'DI', z.name + ' detection loop fault', { dev: dev, proto: pr, alarm: { on: 1, pri: 3 } });
    T(a, e, 'DISABLED', 'DI', z.name + ' zone disabled / isolated', { dev: dev, proto: pr, alarm: { on: 1, pri: 3 } });
    if (z.id === 'FZ_BESS' || z.id === 'FZ_GIS' || z.id === 'FZ_CTRL') {
      T(a, e, 'REL_PENDING', 'DI', z.name + ' extinguishant release countdown', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
      T(a, e, 'RELEASED', 'DI', z.name + ' extinguishant released', { dev: dev, proto: pr, alarm: { on: 1, pri: 1 } });
      T(a, e, 'MAN_INHIBIT', 'DI', z.name + ' manual / auto inhibit selected', { dev: dev, proto: pr, alarm: { on: 1, pri: 3 } });
      T(a, e, 'CYL_LOW', 'DI', z.name + ' agent cylinder pressure low', { dev: dev, proto: pr, alarm: { on: 1, pri: 2 } });
    }
    if (z.id === 'FZ_BESS') {
      T(a, e, 'GAS_H2', 'AI', 'ESS cabin H2 concentration', { unit: '%LEL', dev: dev, proto: pr, dec: 1, lim: { hi: 10, hihi: 25 } });
      T(a, e, 'GAS_CO', 'AI', 'ESS cabin CO concentration', { unit: 'ppm', dev: dev, proto: pr, dec: 0, lim: { hi: 50, hihi: 150 } });
      T(a, e, 'VENT_RUN', 'DI', 'ESS exhaust / explosion venting fan running', { dev: dev, proto: pr });
    }
  });
  T('FIRE', 'FACP', 'HEALTHY', 'DI', 'Fire alarm control panel healthy', { dev: 'FACP', proto: 'Modbus TCP / dry contacts', v: 1, alarm: { on: 0, pri: 2 } });
  T('FIRE', 'FACP', 'SOUNDERS', 'DI', 'Sounders / beacons active', { dev: 'FACP', proto: 'Modbus TCP / dry contacts' });
  T('FIRE', 'FACP', 'CMD_SILENCE', 'DO', 'Silence sounders (remote)', { dev: 'FACP', proto: 'Modbus TCP / dry contacts', ctrl: 'silence' });
  T('FIRE', 'FACP', 'CMD_RESET', 'DO', 'Fire panel reset (remote)', { dev: 'FACP', proto: 'Modbus TCP / dry contacts', ctrl: 'reset' });

  /* =============== UPS / auxiliary =============== */
  C.ups.forEach(function (u) {
    var dev = u.id, pr = u.id === 'UPS_SCADA' ? 'SNMP v3' : 'Dry contacts via RMU relay';
    T('AUX', u.id, 'ON_BATT', 'DI', u.name + ' on battery', { dev: dev, proto: pr, alarm: { on: 1, pri: 3 } });
    T('AUX', u.id, 'BYPASS', 'DI', u.name + ' on bypass', { dev: dev, proto: pr, alarm: { on: 1, pri: 3 } });
    T('AUX', u.id, 'FAULT', 'DI', u.name + ' fault', { dev: dev, proto: pr, alarm: { on: 1, pri: 2 } });
    T('AUX', u.id, 'BATT_LOW', 'DI', u.name + ' battery low', { dev: dev, proto: pr, alarm: { on: 1, pri: 2 } });
    if (u.id === 'UPS_SCADA') {
      T('AUX', u.id, 'LOAD', 'AI', u.name + ' load', { unit: '%', dev: dev, proto: pr, dec: 0, lim: { hi: 80, hihi: 95 } });
      T('AUX', u.id, 'AUTONOMY', 'AI', u.name + ' battery autonomy', { unit: 'min', dev: dev, proto: pr, dec: 0, lim: { lo: 30, lolo: 10 } });
      T('AUX', u.id, 'U_OUT', 'AI', u.name + ' output voltage', { unit: 'V', dev: dev, proto: pr, dec: 0 });
    }
  });

  /* =============== Communications / network health =============== */
  ['RTU / SCADA Server A', 'SCADA Server B (hot standby)', 'Historian', 'HMI Workstation 1', 'HMI Workstation 2', 'Engineering Workstation', 'PPC Controller', 'blue\'Log XM 5000 (weather station)', 'Firewall / VPN gateway', 'Core switch A', 'Core switch B', 'GPS time server', 'Inverter PLC box', 'BESS EMS', 'DG controller network', 'Fibre ring - President RMU', 'Fibre ring - P.M. RMU'].forEach(function (n, i) {
    var id = 'N' + ('0' + (i + 1)).slice(-2);
    T('NET', id, 'OK', 'DI', n + ' online', { dev: 'SCADA', proto: 'ICMP / SNMP v3', v: 1, alarm: { on: 0, pri: i < 2 ? 1 : 2 }, range: n });
  });
  T('NET', 'SEC', 'LOGIN_FAIL', 'DI', 'Repeated failed log-in attempts (security)', { dev: 'SCADA', proto: 'Syslog', alarm: { on: 1, pri: 2 } });
  T('NET', 'SEC', 'FW_DENY', 'AI', 'Firewall denied connections (last hour)', { dev: 'FW', proto: 'Syslog', dec: 0, lim: { hi: 50 } });
  T('NET', 'SEC', 'TIME_SYNC', 'DI', 'Time synchronisation (NTP/PTP) locked', { dev: 'GPS', proto: 'NTP', v: 1, alarm: { on: 0, pri: 3 } });

  /* =============== Plant / PPC =============== */
  var pd = 'PPC', pp = 'Internal';
  T('PPC', 'PLANT', 'P_LOAD', 'AI', 'Total plant load', { unit: 'kW', dev: pd, proto: pp, dec: 0 });
  T('PPC', 'PLANT', 'P_PV', 'AI', 'Total PV generation', { unit: 'kW', dev: pd, proto: pp, dec: 0 });
  T('PPC', 'PLANT', 'P_PV_AVAIL', 'AI', 'Available PV power', { unit: 'kW', dev: pd, proto: pp, dec: 0 });
  T('PPC', 'PLANT', 'P_DG', 'AI', 'Total DG generation', { unit: 'kW', dev: pd, proto: pp, dec: 0 });
  T('PPC', 'PLANT', 'P_BESS', 'AI', 'BESS net power', { unit: 'kW', dev: pd, proto: pp, dec: 0 });
  T('PPC', 'PLANT', 'RE_SHARE', 'AI', 'Renewable share (instant)', { unit: '%', dev: pd, proto: pp, dec: 0 });
  T('PPC', 'PLANT', 'E_LOAD_DAY', 'AI', 'Load energy today', { unit: 'kWh', dev: pd, proto: pp, dec: 0 });
  T('PPC', 'PLANT', 'E_PV_DAY', 'AI', 'PV energy today', { unit: 'kWh', dev: pd, proto: pp, dec: 0 });
  T('PPC', 'PLANT', 'E_DG_DAY', 'AI', 'DG energy today', { unit: 'kWh', dev: pd, proto: pp, dec: 0 });
  T('PPC', 'PLANT', 'FUEL_SAVED', 'AI', 'Diesel saved today', { unit: 'L', dev: pd, proto: pp, dec: 0 });
  T('PPC', 'PLANT', 'CO2_SAVED', 'AI', 'CO2 avoided today', { unit: 't', dev: pd, proto: pp, dec: 2 });
  T('PPC', 'PLANT', 'CURTAIL', 'AI', 'PV curtailment', { unit: 'kW', dev: pd, proto: pp, dec: 0 });
  T('PPC', 'CTRL', 'MODE', 'AO', 'PPC mode (0 manual, 1 auto)', { dev: pd, proto: pp, range: '0-1', v: 1, dec: 0 });
  T('PPC', 'CTRL', 'STATE', 'AI', 'PPC sequence state', { dev: pd, proto: pp, dec: 0 });
  T('PPC', 'CTRL', 'SP_SOC_DG_START', 'AO', 'SOC for DG start', { unit: '%', dev: pd, proto: pp, range: '10-60', v: C.ppc.socDgStart });
  T('PPC', 'CTRL', 'SP_SOC_DG_STOP', 'AO', 'SOC for DG stop', { unit: '%', dev: pd, proto: pp, range: '40-95', v: C.ppc.socDgStop });
  T('PPC', 'CTRL', 'SP_SOC_HIGH', 'AO', 'SOC for PV curtailment', { unit: '%', dev: pd, proto: pp, range: '80-98', v: C.ppc.socHigh });
  T('PPC', 'CTRL', 'SP_DG_MINLOAD', 'AO', 'DG minimum load', { unit: '%', dev: pd, proto: pp, range: '20-50', v: C.ppc.dgMinLoadPct });
  T('PPC', 'CTRL', 'SP_PF', 'AO', 'Plant power factor target', { dev: pd, proto: pp, range: '0.85-1', v: 0.95 });
  T('PPC', 'CTRL', 'ESD', 'DI', 'Plant emergency shutdown active', { dev: pd, proto: pp, alarm: { on: 1, pri: 1 } });
  T('PPC', 'CTRL', 'LOAD_SHED', 'DI', 'Load shedding active', { dev: pd, proto: pp, alarm: { on: 1, pri: 2 } });
  T('PPC', 'CTRL', 'CMD_BLACKSTART', 'DO', 'Initiate black-start sequence', { dev: pd, proto: pp, ctrl: 'start' });
  T('PPC', 'CTRL', 'CMD_ESD', 'DO', 'Plant emergency shutdown', { dev: pd, proto: pp, ctrl: 'esd' });

  S.tags = tags;
  S.tagOrder = order;
  S.tag = function (id) { return tags[id]; };
  S.val = function (id) { var t = tags[id]; return t ? t.v : undefined; };

  S.areaNames = {
    GIS: '11kV GIS Combiner Panel', TX: 'Transformers', RMU: 'Remote RMUs (President / P.M.)',
    LV: 'LV Distribution Boards', DG: 'Diesel Generators', PV: 'PV Plant / Inverters', MET: 'Weather Station',
    BESS: 'Battery Energy Storage', FIRE: 'Fire Detection & Suppression', AUX: 'UPS & Auxiliary Power',
    NET: 'Communications & Cybersecurity', PPC: 'Power Plant Controller'
  };

  S.ioListCsv = function () {
    var head = ['Tag', 'Area', 'Equipment', 'Signal', 'Type', 'Description', 'Unit', 'Range', 'Source device', 'Protocol', 'Address / LN', 'Alarm', 'Priority', 'LoLo', 'Lo', 'Hi', 'HiHi'];
    var rows = [head];
    order.forEach(function (id) {
      var t = tags[id], al = '', pri = '';
      if (t.alarm) { al = 'On state = ' + t.alarm.on; pri = t.alarm.pri; }
      else if (t.lim) { al = 'Limits'; pri = '1/2'; }
      var l = t.lim || {};
      rows.push([t.id, S.areaNames[t.area] || t.area, t.equip, t.sig, t.type, t.desc, t.unit, t.range, t.dev, t.proto, t.addr, al, pri,
        l.lolo !== undefined ? l.lolo : '', l.lo !== undefined ? l.lo : '', l.hi !== undefined ? l.hi : '', l.hihi !== undefined ? l.hihi : '']);
    });
    return rows.map(function (r) {
      return r.map(function (c) { c = String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',');
    }).join('\n');
  };
})(SCADA);
