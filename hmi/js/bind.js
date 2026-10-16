/*
 * Binding between the plant simulator model (S.mtags) and the submitted tags (S.tags).
 *
 * In service this file is replaced by the CP-8050 / SICAM SCC data path: every
 * submitted tag then comes from its I/O channel or communication point. Here each
 * tag is computed from the simulator once per scan, and each command tag is routed
 * to the simulator with the interlocks the controller will enforce.
 */
(function (S) {
  var T = S.tags, M = S.mtags, C = S.config;
  var SQ3 = Math.sqrt(3);
  function m(id) { var t = M[id]; if (!t) throw new Error('model point ' + id); return t.v; }
  function on(id) { return !!m(id); }
  function b(x) { return x ? 1 : 0; }

  var binds = [];
  function A(tag, fn, qsrc) {
    if (!T[tag]) throw new Error('bind: no tag ' + tag);
    binds.push({ t: T[tag], fn: fn, q: qsrc || null });
    T[tag].bound = true;
  }

  /* ---------------- breakers: positions, commands, interlocks ---------------- */
  S.breakers = {};
  function BRK(key, o) { o.key = key; S.breakers[key] = o; }

  /* ---------------- 11 kV switchboard ---------------- */
  C.gis.panels.forEach(function (p) {
    var k = p.id, g = 'GIS.' + k;
    A(k + '-CB-OPEN', function () { return m(g + '.CB_OPEN'); });
    A(k + '-CB-CLSD', function () { return m(g + '.CB_CLOSED'); });
    A(k + '-CB-TRIP', function () { return m(g + '.CB_TRIPPED'); });
    A(k + '-ES-CLSD', function () { return m(g + '.ES_EARTHED'); });
    A(k + '-GAS-LOW', function () { return b(on(g + '.SF6_LOW') || on(g + '.SF6_LOLO')); });
    if (k === 'AH8') {
      A('AH8-NER-EF', function () { return b(m('GIS.NECR.I_NER') > 10); });
      A('AH8-NER-TEMP', function () { return b(m('GIS.NECR.T_NER') > 300); });
      A('AH8-AUX-OK', function () { return b(!on(g + '.MCB_TRIP')); });
      BRK(k, { title: 'AH8 neutral earthing resistor feeder', model: g, clsd: 'AH8-CB-CLSD', open: 'AH8-CB-OPEN', trip: 'AH8-CB-TRIP', es: 'AH8-ES-CLSD',
        status: ['AH8-CB-OPEN', 'AH8-CB-CLSD', 'AH8-CB-TRIP', 'AH8-ES-CLSD', 'AH8-GAS-LOW', 'AH8-NER-EF', 'AH8-NER-TEMP', 'AH8-AUX-OK'],
        note: 'AH8 has no remote command in the I/O list: it is operated at the panel and normally stays closed.' });
      return;
    }
    A(k + '-LR-REM', function () { return m(g + '.LR_REMOTE'); });
    A(k + '-SPR-CHG', function () { return m(g + '.CB_SPRING'); });
    A(k + '-RLY-OK', function () { return m(g + '.RLY_HEALTHY'); });
    A(k + '-AUX-OK', function () { return b(!on(g + '.MCB_TRIP')); });
    // relay communication points
    ['L1', 'L2', 'L3'].forEach(function (ph, i) {
      A(k + '-I-' + ph, function () { return m(g + '.I_' + ph); });
      A(k + '-U-' + ph, function () { return m(g + '.U_L' + ['12', '23', '31'][i]) / SQ3; });
    });
    A(k + '-I-E', function () { return m(g + '.I_N'); });
    A(k + '-P', function () { return m(g + '.P'); });
    A(k + '-Q', function () { return m(g + '.Q'); });
    A(k + '-PF', function () { return m(g + '.PF'); });
    A(k + '-F', function () { return m(g + '.F'); });
    A(k + '-E-IMP', function () { return m(g + '.E_IMP'); });
    A(k + '-E-EXP', function () { return m(g + '.E_EXP'); });
    A(k + '-CB-POS', function () { var c = on(g + '.CB_CLOSED'), o = on(g + '.CB_OPEN'); return c && o ? 3 : c ? 2 : o ? 1 : 0; });
    A(k + '-TRIP-50', function () { return m(g + '.PROT_50'); });
    A(k + '-TRIP-50N', function () { return m(g + '.PROT_50N'); });
    A(k + '-TRIP-27-59', function () { return b(M[g + '.PROT_27'] && (on(g + '.PROT_27') || on(g + '.PROT_59'))); });
    A(k + '-TRIP-81', function () { return b(M[g + '.PROT_81'] && on(g + '.PROT_81') || S.sim.uf[k]); });
    A(k + '-RLY-HEALTHY', function () { return m(g + '.RLY_HEALTHY'); });
    A(k + '-DREC', function () { return b(on(g + '.PROT_50') || on(g + '.PROT_50N') || on(g + '.LOCKOUT_86')); });
    A(k + '-TCS-ALM', function () { return m(g + '.TCS_FAIL'); });
    if (T[k + '-TRIP-51G']) A(k + '-TRIP-51G', function () { return M[g + '.PROT_50G'] ? m(g + '.PROT_50G') : 0; });
    if (T[k + '-TRIP-32']) A(k + '-TRIP-32', function () { return m(g + '.PROT_32'); });
    var st = [k + '-CB-OPEN', k + '-CB-CLSD', k + '-CB-TRIP', k + '-ES-CLSD', k + '-LR-REM', k + '-SPR-CHG', k + '-GAS-LOW', k + '-RLY-OK', k + '-AUX-OK', k + '-TCS-ALM'];
    BRK(k, { title: k + ' ' + p.usage, model: g, clsd: k + '-CB-CLSD', open: k + '-CB-OPEN', trip: k + '-CB-TRIP', es: k + '-ES-CLSD', lr: k + '-LR-REM',
      cmdOpen: k + '-CB-OPEN-CMD', cmdClose: k + '-CB-CLOSE-CMD', status: st,
      meas: [k + '-P', k + '-Q', k + '-I-L1', k + '-I-L2', k + '-I-L3', k + '-U-L1', k + '-PF', k + '-F'] });
  });

  /* ---------------- transformers (hardwired contacts) ---------------- */
  [['T-AUX', 'AUXTX'], ['T-INV', 'PVTX'], ['T-DG', 'DGTX'], ['PRS-TX', 'PRESTX'], ['PMS-TX', 'PMTX']].forEach(function (x) {
    var k = x[0], p = 'TX.' + x[1];
    A(k + '-OT-ALM', function () { return b(m(p + '.T_OIL') > 85 || on(p + '.TEMP_ALM')); });
    A(k + '-OT-TRIP', function () { return b(m(p + '.T_OIL') > 95 || on(p + '.TEMP_TRIP')); });
    A(k + '-WT-ALM', function () { return b(m(p + '.T_WDG') > 100); });
    A(k + '-WT-TRIP', function () { return b(m(p + '.T_WDG') > 120); });
    A(k + '-PRD', function () { return m(p + '.BUCH_TRIP'); });
    A(k + '-OL-LOW', function () { return m(p + '.OIL_LOW'); });
  });
  A('T-AUX-FUSE', function () { return m('TX.AUXTX.FUSE_BLOWN'); });

  /* ---------------- PV ---------------- */
  A('PV-ACB-CLSD', function () { return m('PV.LV_ACB.CB_CLOSED'); });
  A('PV-ACB-TRIP', function () { return m('PV.LV_ACB.CB_TRIPPED'); });
  BRK('PV-ACB', { title: 'PV main LV breaker (ACB 1250 A)', model: 'PV.LV_ACB', clsd: 'PV-ACB-CLSD', trip: 'PV-ACB-TRIP', status: ['PV-ACB-CLSD', 'PV-ACB-TRIP'],
    note: 'Position and trip are hardwired to I/O row 5; the breaker is operated locally.' });
  C.pv.inverters.forEach(function (inv) {
    var k = inv.tag, p = 'PV.' + inv.id;
    A(k + '-MCCB-TRIP', function () { return m(p + '.MCCB_TRIP'); });
    A(k + '-P', function () { return m(p + '.P'); });
    A(k + '-Q', function () { return m(p + '.Q'); });
    ['L1', 'L2', 'L3'].forEach(function (ph, i) {
      A(k + '-U-' + ph, function () { return m(p + '.U_AC') ? m(p + '.U_AC') * (1 + (i - 1) * 0.002) : 0; });
      A(k + '-I-' + ph, function () { return m(p + '.I_AC') * (1 + (i - 1) * 0.01); });
    });
    A(k + '-F', function () { return m(p + '.F'); });
    A(k + '-PF', function () { return m(p + '.PF'); });
    A(k + '-U-DC', function () { return m(p + '.U_DC'); });
    A(k + '-I-DC', function () { return m(p + '.U_DC') > 0 ? m(p + '.P_DC') * 1000 / m(p + '.U_DC') : 0; });
    A(k + '-P-DC', function () { return m(p + '.P_DC'); });
    A(k + '-E-DAY', function () { return m(p + '.E_DAY'); });
    A(k + '-E-TOT', function () { return m(p + '.E_TOT'); });
    A(k + '-T-INT', function () { return m(p + '.T_INT'); });
    A(k + '-R-ISO', function () { return on(p + '.ISO_FLT') ? 85 : m(p + '.R_ISO'); });
    A(k + '-STATE', function () {
      if (on(p + '.FAULT')) return 4;
      if (on(p + '.RUN')) return on(p + '.STANDBY') ? 3 : 2;
      return m('MET.WS.IRR_POA') > 20 && !inv._stopped ? 1 : 0;
    });
    A(k + '-FLT-CODE', function () { return on(p + '.ISO_FLT') ? 39 : on(p + '.FAULT') ? 1 : 0; });
    A(k + '-ALM-CODE', function () { return on(p + '.DC_SPD') || on(p + '.AC_SPD') ? 532 : 0; });
    A(k + '-COMM-OK', function () { return m(p + '.COMM'); });
    A(k + '-P-LIM-SP', function () { return m(p + '.SP_PLIM'); });
    A('PLCBOX-' + k + '-COMM', function () { return m(p + '.COMM'); });
  });

  /* ---------------- battery ---------------- */
  A('BESS-ACB-CLSD', function () { return m('BESS.LV_ACB.CB_CLOSED'); });
  A('BESS-ACB-TRIP', function () { return m('BESS.LV_ACB.CB_TRIPPED'); });
  BRK('BESS-ACB', { title: 'Battery main LV breaker (ACB 1000 A)', model: 'BESS.LV_ACB', clsd: 'BESS-ACB-CLSD', trip: 'BESS-ACB-TRIP', status: ['BESS-ACB-CLSD', 'BESS-ACB-TRIP'],
    note: 'Position and trip are hardwired to I/O row 5; the breaker is operated locally.' });
  var bs = 'BESS.SYS.';
  [['SOC', 'SOC'], ['SOH', 'SOH'], ['U-DC', 'U_DC'], ['I-DC', 'I_DC'], ['P', 'P'], ['Q', 'Q'], ['U-CELL-MAX', 'U_CELL_MAX'], ['U-CELL-MIN', 'U_CELL_MIN'],
    ['T-CELL-MAX', 'T_CELL_MAX'], ['T-CELL-MIN', 'T_CELL_MIN'], ['P-CHG-LIM', 'P_CHG_MAX'], ['P-DIS-LIM', 'P_DIS_MAX'], ['E-CHG', 'E_CHG'], ['E-DIS', 'E_DIS']].forEach(function (x) {
    A('BESS-' + x[0], function () { return m(bs + x[1]); });
  });
  A('BESS-PCS-STATE', function () { return on(bs + 'BMS_FAULT') || on(bs + 'ESD') ? 3 : on(bs + 'GRID_FORMING') ? 1 : 0; });
  A('BESS-BMS-STATE', function () { return on(bs + 'BMS_FAULT') ? 2 : on(bs + 'BMS_WARN') ? 1 : 0; });
  A('BESS-RACKS-ON', function () { var n = 0; for (var r = 1; r <= C.bess.racks; r++) if (!on('BESS.RACK' + r + '.FAULT')) n++; return n; });
  A('BESS-DC-CONT', function () { for (var r = 1; r <= C.bess.racks; r++) if (!on('BESS.RACK' + r + '.CONTACTOR')) return 0; return 1; });
  A('BESS-COOL-STATE', function () { return on('BESS.HVAC.FAULT') ? 2 : on('BESS.HVAC.RUN') ? 1 : 0; });
  A('BESS-ALM-L1', function () { return b(on(bs + 'BMS_FAULT') || on(bs + 'ESD')); });
  A('BESS-ALM-L2', function () { return m('BESS.HVAC.FAULT'); });
  A('BESS-ALM-L3', function () { return m(bs + 'BMS_WARN'); });
  A('BESS-FIRE', function () { return m('FIRE.FZ_BESS.FIRE'); });
  [1, 2].forEach(function (i) {
    A('BESS-BCP' + i + '-SW-CLSD', function () { return m('BESS.BCP' + i + '.SW_CLOSED'); });
    A('BESS-BCP' + i + '-FUSE', function () { return m('BESS.BCP' + i + '.FUSE_BLOWN'); });
  });

  /* ---------------- energy management system ---------------- */
  var pl = 'PPC.PLANT.';
  A('EMS-P-PLANT', function () { return m(pl + 'P_PV') + m(pl + 'P_BESS') + m(pl + 'P_DG'); });
  A('EMS-Q-PLANT', function () { return m('GIS.AH4.Q') + m('GIS.AH5.Q') + m('GIS.AH6.Q'); });
  A('EMS-P-PV', function () { return m(pl + 'P_PV'); });
  A('EMS-P-BESS', function () { return m(pl + 'P_BESS'); });
  A('EMS-P-GEN', function () { return m(pl + 'P_DG'); });
  A('EMS-P-LOAD', function () { return m(pl + 'P_LOAD'); });
  A('EMS-U-BUS', function () { return m('GIS.BUS.U'); });
  A('EMS-F-BUS', function () { return m('GIS.BUS.F'); });
  A('EMS-MODE', function () { return m('PPC.CTRL.MODE'); });
  A('EMS-STATE', function () {
    var st = S.sim.state;
    if (st === 0 || st === 1 || st === 6 || st === 7 || st === 8) return st;
    if (st >= 3 && st <= 5) return 5;
    if (m(pl + 'P_PV') > m(pl + 'P_LOAD')) return 2;
    return m('MET.WS.IRR_POA') > 20 ? 3 : 4;
  });
  A('EMS-ALM', function () { return b(on(bs + 'BMS_FAULT') || on('PPC.CTRL.LOAD_SHED')); });
  A('EMS-GEN-START-REQ', function () { return b(S.sim.dg.DG1.request || S.sim.dg.DG2.request); });
  A('EMS-PV-CURT', function () { return b(m(pl + 'CURTAIL') > 1); });
  A('EMS-HEARTBEAT', function () { return S.sim.heartbeat; });
  A('EMS-SOC-MIN-SP', function () { return S.sim.socMin; });
  A('EMS-SOC-MAX-SP', function () { return m('PPC.CTRL.SP_SOC_HIGH'); });
  A('EMS-GEN-START-SP', function () { return m('PPC.CTRL.SP_SOC_DG_START'); });
  A('EMS-GEN-STOP-SP', function () { return m('PPC.CTRL.SP_SOC_DG_STOP'); });
  A('EMS-P-BESS-LIM-SP', function () { return S.sim.bessLimit; });

  /* ---------------- generators ---------------- */
  A('GEN-ACB-CLSD', function () { return m('DG.TX_LV.CB_CLOSED'); });
  A('GEN-ACB-TRIP', function () { return m('DG.TX_LV.CB_TRIPPED'); });
  BRK('GEN-ACB', { title: 'DG step-up transformer LV breaker', model: 'DG.TX_LV', clsd: 'GEN-ACB-CLSD', trip: 'GEN-ACB-TRIP', status: ['GEN-ACB-CLSD', 'GEN-ACB-TRIP'],
    note: 'Position and trip are hardwired to I/O row 6; the breaker is operated locally.' });
  C.generators.forEach(function (g) {
    var k = g.id, p = 'DG.' + k;
    A(k + '-GCB-CLSD', function () { return m(p + '_ACB.CB_CLOSED'); });
    A(k + '-COM-ALM', function () { return b(on(p + '.COMMON_ALM') || on(p + '.SHUTDOWN') || on(p + '.FAIL_START')); });
    A(k + '-ESTOP', function () { return m(p + '.ESTOP'); });
    A(k + '-RUN', function () { return m(p + '.RUNNING'); });
    A(k + '-FUEL', function () { return m(p + '.FUEL'); });
    ['L1', 'L2', 'L3'].forEach(function (ph, i) {
      A(k + '-U-' + ph, function () { return m(p + '.U_L' + ['12', '23', '31'][i]); });
      A(k + '-I-' + ph, function () { return m(p + '.I_' + ph); });
    });
    A(k + '-P', function () { return m(p + '.P'); });
    A(k + '-Q', function () { return m(p + '.Q'); });
    A(k + '-PF', function () { return m(p + '.PF'); });
    A(k + '-F', function () { return m(p + '.F'); });
    A(k + '-OIL-P', function () { return m(p + '.OIL_P') * 100; });
    A(k + '-COOL-T', function () { return m(p + '.COOL_T'); });
    A(k + '-BATT-U', function () { return m(p + '.BATT_V'); });
    A(k + '-FUEL-COM', function () { return m(p + '.FUEL'); });
    A(k + '-HOURS', function () { return m(p + '.HOURS'); });
    A(k + '-STARTS', function () { return m(p + '.STARTS'); });
    A(k + '-E-TOT', function () { return m(p + '.E_EXP'); });
    A(k + '-MODE', function () { return m(p + '.MODE_AUTO'); });
    A(k + '-GCB', function () { return m(p + '_ACB.CB_CLOSED'); });
    A(k + '-WARN', function () { return b(on(p + '.COMMON_ALM') || on(p + '.LOW_FUEL')); });
    A(k + '-SHUTDOWN', function () { return b(on(p + '.SHUTDOWN') || on(p + '.FAIL_START') || on(p + '.LOW_OILP') || on(p + '.HIGH_TEMP') || on(p + '.OVERSPEED')); });
    BRK(k + '-GCB', { title: g.name + ' breaker (' + g.acb + ')', model: p + '_ACB', clsd: k + '-GCB-CLSD', status: [k + '-GCB-CLSD', k + '-RUN', k + '-COM-ALM', k + '-ESTOP'],
      note: 'The generator controller closes its breaker after synchronising. Start and stop it from the generator screen.' });
  });

  /* ---------------- office stations ---------------- */
  [['PRS', 'RMU_PRES', 'LVDB_PRES', 'UPS_RMUP', 'President'], ['PMS', 'RMU_PM', 'LVDB_PM', 'UPS_RMUM', 'Prime Minister']].forEach(function (x) {
    var k = x[0], r = 'RMU.' + x[1], cb = r + '_AH3', lv = 'LV.' + x[2], up = 'AUX.' + x[3];
    A(k + '-RS1-OPEN', function () { return b(!on(r + '.AH1_CLOSED')); });
    A(k + '-RS1-CLSD', function () { return m(r + '.AH1_CLOSED'); });
    A(k + '-RS1-ES', function () { return m(r + '.AH1_EARTHED'); });
    A(k + '-RS2-OPEN', function () { return b(!on(r + '.AH2_CLOSED')); });
    A(k + '-RS2-CLSD', function () { return m(r + '.AH2_CLOSED'); });
    A(k + '-RS2-ES', function () { return m(r + '.AH2_EARTHED'); });
    A(k + '-CB-OPEN', function () { return m(cb + '.CB_OPEN'); });
    A(k + '-CB-CLSD', function () { return m(cb + '.CB_CLOSED'); });
    A(k + '-CB-ES', function () { return m(r + '.QK11_EARTHED'); });
    A(k + '-CB-TRIP', function () { return m(cb + '.CB_TRIPPED'); });
    A(k + '-GAS-LOW', function () { return m(r + '.SF6_LOW'); });
    A(k + '-LR-REM', function () { return m(cb + '.LR_REMOTE'); });
    A(k + '-FPI', function () { return b(on(r + '.PROT_50') || on(r + '.PROT_50N')); });
    A(k + '-UPS-ON-BATT', function () { return m(up + '.ON_BATT'); });
    A(k + '-UPS-FLT', function () { return m(up + '.FAULT'); });
    A(k + '-LV-INC-CLSD', function () { return m(lv + '.CB_CLOSED'); });
    A(k + '-LV-INC-TRIP', function () { return m(lv + '.CB_TRIPPED'); });
    for (var w = 1; w <= 10; w++) (function (ww) { A(k + '-LV-F' + ww + '-CLSD', function () { return m(lv + '.W' + ww + '_ON'); }); })(('0' + w).slice(-2));
    A(k + '-LV-SPD-FLT', function () { return m(lv + '.SPD_FAIL'); });
    A(k + '-PNL-SUP-OK', function () { return 1; });
    // ST260E relay over Modbus RTU
    ['L1', 'L2', 'L3'].forEach(function (ph) { A(k + '-RLY-I-' + ph, function () { return m(r + '.I_' + ph); }); });
    A(k + '-RLY-I-E', function () { return m(r + '.I_N'); });
    A(k + '-RLY-CB-POS', function () { var c = on(cb + '.CB_CLOSED'), o = on(cb + '.CB_OPEN'); return c && o ? 3 : c ? 2 : o ? 1 : 0; });
    A(k + '-RLY-TRIP-50', function () { return m(r + '.PROT_50'); });
    A(k + '-RLY-TRIP-50N', function () { return m(r + '.PROT_50N'); });
    A(k + '-RLY-HEALTHY', function () { return m(r + '.RLY_HEALTHY'); });
    // LVDB power meter
    meter(k + '-LV', lv, 0.4);
    var st = x[4];
    BRK(k + '-RS1', { title: st + ' RMU ring switch 1 (incomer)', model: r + '.AH1', kind: 'switch', clsd: k + '-RS1-CLSD', open: k + '-RS1-OPEN', es: k + '-RS1-ES', lr: k + '-LR-REM',
      cmdOpen: k + '-RS1-OPEN-CMD', cmdClose: k + '-RS1-CLOSE-CMD', status: [k + '-RS1-OPEN', k + '-RS1-CLSD', k + '-RS1-ES', k + '-GAS-LOW', k + '-LR-REM'] });
    BRK(k + '-RS2', { title: st + ' RMU ring switch 2 (outgoing)', model: r + '.AH2', kind: 'switch', clsd: k + '-RS2-CLSD', open: k + '-RS2-OPEN', es: k + '-RS2-ES', lr: k + '-LR-REM',
      cmdOpen: k + '-RS2-OPEN-CMD', cmdClose: k + '-RS2-CLOSE-CMD', status: [k + '-RS2-OPEN', k + '-RS2-CLSD', k + '-RS2-ES', k + '-GAS-LOW', k + '-LR-REM'] });
    BRK(k + '-CB', { title: st + ' RMU transformer breaker', model: cb, clsd: k + '-CB-CLSD', open: k + '-CB-OPEN', trip: k + '-CB-TRIP', es: k + '-CB-ES', lr: k + '-LR-REM',
      cmdOpen: k + '-CB-OPEN-CMD', cmdClose: k + '-CB-CLOSE-CMD', status: [k + '-CB-OPEN', k + '-CB-CLSD', k + '-CB-TRIP', k + '-CB-ES', k + '-GAS-LOW', k + '-LR-REM', k + '-FPI', k + '-RLY-HEALTHY'],
      meas: [k + '-RLY-I-L1', k + '-RLY-I-L2', k + '-RLY-I-L3', k + '-RLY-I-E'] });
    BRK(k + '-LV-INC', { title: st + ' LVDB incomer (ACB 1000 A)', model: lv, clsd: k + '-LV-INC-CLSD', trip: k + '-LV-INC-TRIP',
      cmdOpen: k + '-LV-INC-OPEN-CMD', cmdClose: k + '-LV-INC-CLOSE-CMD', status: [k + '-LV-INC-CLSD', k + '-LV-INC-TRIP', k + '-LV-SPD-FLT', k + '-PNL-SUP-OK'],
      meas: [k + '-LV-P', k + '-LV-Q', k + '-LV-I-L1', k + '-LV-U-L1N', k + '-LV-PF'] });
    for (var f = 1; f <= 10; f++) {
      var ff = ('0' + f).slice(-2);
      BRK(k + '-LV-F' + ff, { title: st + ' LVDB outgoing way ' + f, clsd: k + '-LV-F' + ff + '-CLSD', status: [k + '-LV-F' + ff + '-CLSD'], note: 'Position only; the outgoing MCCBs are operated locally.' });
    }
  });

  function meter(k, p, kv) {
    ['L1', 'L2', 'L3'].forEach(function (ph, i) {
      A(k + '-U-' + ph + 'N', function () { return m(p + '.U_L' + ['12', '23', '31'][i]) / SQ3; });
      A(k + '-I-' + ph, function () { return m(p + '.I_' + ph); });
    });
    A(k + '-P', function () { return m(p + '.P'); });
    A(k + '-Q', function () { return m(p + '.Q'); });
    A(k + '-S', function () { return m(p + '.S'); });
    A(k + '-PF', function () { return m(p + '.PF'); });
    A(k + '-F', function () { return m(p + '.F'); });
    A(k + '-E-P', function () { return m(p + '.E_IMP') * 1000; });
    A(k + '-E-Q', function () { return m(p + '.E_IMP') * 1000 * 0.33; });
    A(k + '-THD-U', function () { return m(p + '.THD_U'); });
    A(k + '-THD-I', function () { return m(p + '.P') > 1 ? 6.5 + Math.sin(S.sim.t / 9e5) : 0; });
  }

  /* ---------------- auxiliaries ---------------- */
  meter('AUXLV', 'LV.AUXPNL', 0.4);
  A('AUXLV-INC-CLSD', function () { return m('LV.AUXPNL.CB_CLOSED'); });
  A('AUXLV-INC-TRIP', function () { return m('LV.AUXPNL.CB_TRIPPED'); });
  A('AUXLV-SPD-FLT', function () { return m('LV.AUXPNL.SPD_FAIL'); });
  BRK('AUXLV-INC', { title: 'Auxiliary LV board incomer', model: 'LV.AUXPNL', clsd: 'AUXLV-INC-CLSD', trip: 'AUXLV-INC-TRIP', status: ['AUXLV-INC-CLSD', 'AUXLV-INC-TRIP', 'AUXLV-SPD-FLT'],
    meas: ['AUXLV-P', 'AUXLV-I-L1', 'AUXLV-U-L1N'], note: 'Operated locally.' });
  var u = 'AUX.UPS_SCADA.';
  A('UPS-ON-BATT', function () { return m(u + 'ON_BATT'); });
  A('UPS-BATT-LOW', function () { return m(u + 'BATT_LOW'); });
  A('UPS-FLT', function () { return m(u + 'FAULT'); });
  A('UPS-BYPASS', function () { return m(u + 'BYPASS'); });
  A('UPS-U-IN', function () { return on(u + 'ON_BATT') ? 0 : 229 + Math.sin(S.sim.t / 6e5); });
  A('UPS-LOAD', function () { return m(u + 'LOAD'); });
  A('UPS-BATT-CHG', function () { return Math.min(100, m(u + 'AUTONOMY') / 95 * 100); });
  A('UPS-RUNTIME', function () { return m(u + 'AUTONOMY') * 1.26; });
  A('UPS-ON-BATT-COM', function () { return m(u + 'ON_BATT'); });
  A('UPS-FLT-COM', function () { return m(u + 'FAULT'); });
  A('DC-CHG-FLT', function () { return m('GIS.DC.CHG_FAIL'); });
  A('DC-EARTH-FLT', function () { return m('GIS.DC.EARTH_FLT'); });
  A('DC-UV', function () { return b(m('GIS.DC.U_DC') < 100); });
  A('DC-110-V', function () { return m('GIS.DC.U_DC'); });
  A('DC-24-V', function () { return on('GIS.DC.CHG_FAIL') ? 23.6 : 24.1; });
  A('SWR-HVAC-FLT', function () { return 0; });
  A('SWR-TEMP-HI', function () { return b(m('GIS.ROOM.T_ROOM') > 35); });
  A('ESTOP-SWR', function () { return b(S.sim.estop); });
  A('ESTOP-BESS', function () { return 0; }); // push-button in the battery area: not simulated
  ['DOOR-SCADA', 'DOOR-SWR', 'DOOR-BESS', 'YARD-PNL-DOOR', 'GEN-PNL-DOOR'].forEach(function (k) { A(k, function () { return 0; }); });
  A('DOOR-GIS', function () { return m('GIS.ROOM.DOOR'); });
  A('YARD-PNL-SUP-OK', function () { return 1; });
  A('GEN-PNL-SUP-OK', function () { return 1; });

  /* ---------------- fire panel ---------------- */
  var fz = 'FIRE.FZ_BESS.';
  A('FIRE-PREALM', function () { return m(fz + 'PRE_ALM'); });
  A('FIRE-ALM', function () { return m(fz + 'FIRE'); });
  A('FIRE-FLT', function () { return m(fz + 'FAULT'); });
  A('FIRE-REL', function () { return m(fz + 'RELEASED'); });
  A('FIRE-AGENT-LOW', function () { return m(fz + 'CYL_LOW'); });
  A('FIRE-ISOL', function () { return m(fz + 'DISABLED'); });
  A('FIRE-MAN-REL', function () { return 0; });
  A('FIRE-PSU-FLT', function () { return b(!on('FIRE.FACP.HEALTHY')); });

  /* ---------------- weather station ---------------- */
  [['IRR-POA', 'IRR_POA'], ['WIND-SPD', 'WIND_SPD'], ['WIND-DIR', 'WIND_DIR'], ['T-AMB', 'T_AMB'], ['T-MOD', 'T_MOD'], ['HEALTHY', 'COMM']].forEach(function (x) {
    A('WS-' + x[0], function () { return m('MET.WS.' + x[1]); });
  });

  /* ---------------- controller and network ---------------- */
  function pmLink() { return !S.sim.faults.COMM_PM; }
  // the simulated cut isolates the PM station, so only the ring ports next to it (SW-PRS and core B) report a break
  ['SW-CORE-A', 'SW-CORE-B', 'SW-MV', 'SW-BESS', 'SW-GEN', 'SW-PRS'].forEach(function (k) { A(k + '-HEALTHY', function () { return 1; }); A(k + '-RING-OK', function () { return k === 'SW-PRS' || k === 'SW-CORE-B' ? b(pmLink()) : 1; }); });
  A('SW-PMS-HEALTHY', function () { return b(pmLink()); });
  A('SW-PMS-RING-OK', function () { return b(pmLink()); });
  A('FW-HEALTHY', function () { return 1; });
  A('FW-VPN-ACTIVE', function () { return b(S.sim.vpn); });
  A('GPS-HEALTHY', function () { return 1; });
  A('GPS-TIME-SYNC', function () { return 1; });
  A('CP-HEALTHY', function () { return 1; });
  A('CP-PS1-OK', function () { return 1; });
  A('CP-PS2-OK', function () { return 1; });
  [1, 2, 3, 5, 6].forEach(function (n) { A('CP-ROW' + n + '-OK', function () { return 1; }); });
  A('CP-ROW4-OK', function () { return b(pmLink()); });
  for (var l = 1; l <= 8; l++) A('CP-LINK' + l + '-OK', function () { return 1; });
  A('SYS-CP-HEALTHY', function () { return 1; });
  A('SYS-BEACON', function () { return b(S.alarmList && S.alarmList().some(function (a) { return !a.acked && a.level === 1; })); });

  /* commands and setpoints have no value of their own; they show the last command */
  S.tagOrder.forEach(function (id) {
    var t = T[id];
    if (!t.bound && (t.type === 'DO' || t.type === 'AO')) t.bound = 'command';
  });
  S.unbound = S.tagOrder.filter(function (id) { return !T[id].bound; });

  /* PM-station tags go stale when its fibre link is cut (I/O row 4 and the station switch) */
  var pmTags = S.tagOrder.filter(function (id) { return /^PMS-/.test(id); });
  /* EMS and battery values read through the EMS go stale when the EMS stops (the heartbeat keeps its last value) */
  var emsTags = S.tagOrder.filter(function (id) { return /^(EMS-|BESS-)/.test(id) && T[id].src === 'COM' && T[id].type !== 'DO' && T[id].type !== 'AO' && id !== 'EMS-HEARTBEAT'; });

  S.bindScan = function () {
    if (!S.sim.faults.EMS_FAIL) S.sim.heartbeat = (S.sim.heartbeat + 1) % 65536;
    for (var i = 0; i < binds.length; i++) {
      var x = binds[i], v = x.fn();
      x.t.v = typeof v === 'boolean' ? (v ? 1 : 0) : v;
    }
    var q = pmLink() ? 'GOOD' : 'BAD';
    pmTags.forEach(function (id) { T[id].q = q; });
    var qe = S.sim.faults.EMS_FAIL ? 'BAD' : 'GOOD';
    emsTags.forEach(function (id) { T[id].q = qe; });
  };

  /* history of every analogue tag, for trends */
  S.history = { t: [], v: {} };
  S.histIds = S.tagOrder.filter(function (id) { return T[id].type === 'AI' && T[id].bound === true; });
  S.histIds.forEach(function (id) { S.history.v[id] = []; });
  S.recordHook = function () {
    S.bindScan();
    var H = S.history;
    H.t.push(S.sim.t);
    for (var i = 0; i < S.histIds.length; i++) H.v[S.histIds[i]].push(T[S.histIds[i]].v);
    if (H.t.length > 6000) { H.t.splice(0, 1000); S.histIds.forEach(function (id) { H.v[id].splice(0, 1000); }); }
  };
})(SCADA);
