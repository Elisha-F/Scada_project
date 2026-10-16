/*
 * Plant simulator + Power Plant Controller (PPC) logic.
 *
 * The HMI is data-source agnostic: screens only read/write SCADA.tags.
 * In production this module is replaced by the driver layer (IEC 61850 / Modbus
 * gateway publishing over WebSocket). For FAT/training it simulates the
 * islanded Villa Somalia microgrid so every screen, alarm and sequence can be
 * demonstrated.
 */
(function (S) {
  var C = S.config, T = S.mtags;
  var SQ3 = Math.sqrt(3);

  function set(id, v) { var t = T[id]; if (t) t.v = v; }
  function get(id) { var t = T[id]; return t ? t.v : 0; }
  function on(id) { return !!get(id); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function lag(id, target, k) { set(id, get(id) + (target - get(id)) * k); }
  function noise(a) { return (Math.random() - 0.5) * 2 * a; }

  function setCB(prefix, closed) {
    set(prefix + '.CB_CLOSED', closed ? 1 : 0);
    set(prefix + '.CB_OPEN', closed ? 0 : 1);
  }
  S.setCB = setCB;

  var sim = S.sim = {
    t: Date.now(), speed: 1, running: true, bessLimit: 950, socMin: 10, crateLimit: true, heartbeat: 0,
    state: 2, stateSince: 0, seq: null, seqStep: 0, seqTimer: 0,
    dg: {}, faults: {}, uf: {}, ufTimer: 0, cp: { A: true, B: true, active: 'A', pulse: 0 }, cloud: 1, cloudTarget: 1,
    stateNames: ['BLACKOUT', 'BLACK-START', 'PV + BESS (normal)', 'DG ASSIST - starting', 'PV + BESS + DG', 'DG stopping / cool-down', 'DG ONLY (BESS unavailable)', 'EMERGENCY SHUTDOWN', 'MANUAL'],
    history: { t: [], v: {} }, histIds: []
  };

  C.generators.forEach(function (g) {
    sim.dg[g.id] = { status: 'OFF', timer: 0, runFor: 0, request: false, manualRun: false, failNext: false };
  });

  /* ---------------- initial states ---------------- */
  function init() {
    C.gis.panels.forEach(function (p) {
      var closed = p.id !== 'AH7';
      setCB('GIS.' + p.id, closed);
      set('GIS.' + p.id + '.DS_CLOSED', p.id === 'AH7' ? 0 : 1);
      set('GIS.' + p.id + '.ES_EARTHED', p.id === 'AH7' ? 1 : 0);
    });
    setCB('DG.TX_LV', true);
    C.generators.forEach(function (g) { setCB('DG.' + g.id + '_ACB', false); set('DG.' + g.id + '.FUEL', g.id === 'DG1' ? 82 : 76); set('DG.' + g.id + '.HOURS', g.id === 'DG1' ? 412 : 298); set('DG.' + g.id + '.STARTS', g.id === 'DG1' ? 96 : 71); set('DG.' + g.id + '.BATT_V', 27.4); });
    setCB('PV.LV_ACB', true);
    setCB('BESS.LV_ACB', true);
    C.rmus.forEach(function (r) { setCB('RMU.' + r.id + '_AH3', true); });
    C.lvdbs.forEach(function (b) { setCB('LV.' + b.id, true); for (var w = 9; w <= b.ways; w++) set('LV.' + b.id + '.W' + ('0' + w).slice(-2) + '_ON', 0); });
    C.pv.inverters.forEach(function (inv, i) { set('PV.' + inv.id + '.E_TOT', 210 + i * 3.7); set('PV.' + inv.id + '.R_ISO', 1800 + i * 200); });
    set('BESS.SYS.SOC', 46); set('BESS.SYS.SOH', 99.2); set('BESS.SYS.E_CHG', 182.4); set('BESS.SYS.E_DIS', 171.9); set('BESS.SYS.CYCLES', 54);
    set('BESS.SYS.CMD_MODE', 1); set('BESS.PCS1.RUN', 1); set('BESS.PCS2.RUN', 1);
    for (var r = 1; r <= C.bess.racks; r++) set('BESS.RACK' + r + '.SOC', 46);
    set('BESS.HVAC.T_CABIN', 24); set('BESS.SYS.T_CELL_MAX', 26);
    C.transformers.forEach(function (tx) { set('TX.' + tx.id + '.T_OIL', 38); set('TX.' + tx.id + '.T_WDG', 42); });
    set('GIS.BUS.U', 11); set('GIS.BUS.F', 50); set('GIS.DC.U_DC', 112.4); set('GIS.ROOM.T_ROOM', 26);
    set('AUX.UPS_SCADA.LOAD', 38); set('AUX.UPS_SCADA.AUTONOMY', 95); set('AUX.UPS_SCADA.U_OUT', 230);
    C.gis.panels.forEach(function (p) { set('GIS.' + p.id + '.E_IMP', 12 + Math.random() * 300); set('GIS.' + p.id + '.E_EXP', Math.random() * 5); });
    sim.histIds = S.mtagOrder.filter(function (id) {
      var t = T[id]; return t.type === 'AI' && !/STR\d|MPPT|\.W\d\d_P|RACK\d\.U_C/.test(id);
    });
    sim.histIds.forEach(function (id) { sim.history.v[id] = []; });
  }

  /* ---------------- environment ---------------- */
  function hourOf(t) {
    var d = new Date(t);
    // Mogadishu is UTC+3, no DST
    return ((d.getUTCHours() + 3) % 24) + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  }
  function irradiance(h) {
    var x = (h - 5.95) / 12.15; // sunrise ~05:57, sunset ~18:06
    if (x <= 0 || x >= 1) return 0;
    return 1040 * Math.pow(Math.sin(Math.PI * x), 1.25);
  }
  function officeProfile(h) {
    var up = 1 / (1 + Math.exp(-(h - 7.3) * 2.2));
    var down = 1 / (1 + Math.exp((h - 17.8) * 1.6));
    return up * down;
  }

  /* ---------------- generator model ---------------- */
  function dgStep(g, dt) {
    var d = sim.dg[g.id], p = 'DG.' + g.id;
    var tripped = on(p + '.SHUTDOWN') || on(p + '.ESTOP') || on(p + '.FAIL_START') || on('PPC.CTRL.ESD');
    if (tripped && d.status !== 'OFF') { d.status = 'OFF'; d.timer = 0; setCB(p + '_ACB', false); }
    // AUTO: the EMS requests the start; MANUAL: the operator's start/stop command (manualRun)
    var want = (on(p + '.MODE_AUTO') ? d.request : d.manualRun) && !tripped && !on('PPC.CTRL.ESD');
    d.timer += dt;
    switch (d.status) {
      case 'OFF':
        if (want) { d.status = 'CRANKING'; d.timer = 0; set(p + '.STARTS', get(p + '.STARTS') + 1); S.event && S.event('DG', g.name + ' start sequence initiated'); }
        break;
      case 'CRANKING':
        if (d.timer > 6) {
          if (d.failNext) { d.failNext = false; d.status = 'OFF'; set(p + '.FAIL_START', 1); }
          else { d.status = 'WARMUP'; d.timer = 0; }
        }
        break;
      case 'WARMUP': if (!want) { d.status = 'COOLDOWN'; d.timer = 0; } else if (d.timer > 20) { d.status = 'SYNC'; d.timer = 0; } break;
      case 'SYNC':
        if (!want) { d.status = 'COOLDOWN'; d.timer = 0; }
        else if (d.timer > 10) {
          d.status = 'ONLINE'; d.timer = 0; d.runFor = 0;
          if (on('DG.TX_LV.CB_CLOSED') && on('GIS.AH1.CB_CLOSED') || !sim.busLive) setCB(p + '_ACB', true);
          S.event && S.event('DG', g.name + ' synchronised - ' + g.acb + ' closed');
        }
        break;
      case 'ONLINE':
        d.runFor += dt;
        if (!on(p + '_ACB.CB_CLOSED') && !want) { d.status = 'COOLDOWN'; d.timer = 0; }
        if (!want) { setCB(p + '_ACB', false); d.status = 'COOLDOWN'; d.timer = 0; S.event && S.event('DG', g.name + ' unloaded - cool-down'); }
        break;
      case 'COOLDOWN':
        if (want) { d.status = 'SYNC'; d.timer = 0; }
        else if (d.timer > C.ppc.dgCoolDownMin * 60) { d.status = 'OFF'; d.timer = 0; S.event && S.event('DG', g.name + ' stopped'); }
        break;
    }
    var running = d.status !== 'OFF' && d.status !== 'CRANKING';
    set(p + '.RUNNING', running ? 1 : 0);
    set(p + '.SYNC', d.status === 'ONLINE' ? 1 : 0);
    set(p + '.READY', !tripped && on(p + '.MODE_AUTO') ? 1 : 0);
    lag(p + '.RPM', running ? 1500 + noise(3) : (d.status === 'CRANKING' ? 250 : 0), 0.5);
    lag(p + '.OIL_P', running ? 4.2 + noise(0.05) : 0, 0.4);
    lag(p + '.COOL_T', running ? 82 + get(p + '.LOAD_PCT') * 0.06 : 32, 0.01 * dt);
    if (running) set(p + '.HOURS', get(p + '.HOURS') + dt / 3600);
  }

  /* ---------------- black-start / ESD sequences ---------------- */
  var BLACKSTART = [
    { txt: 'Verify no active trips, lockouts, fire alarms or ESD', fn: function () { return !anyBlockingFault(); } },
    { txt: 'Open all 11kV feeder VCBs (AH2, AH4, AH5, AH6)', fn: function () { ['AH2', 'AH4', 'AH5', 'AH6'].forEach(function (a) { setCB('GIS.' + a, false); }); return true; } },
    { txt: 'Close AH8 NECR feeder - establish 11kV neutral earthing', fn: function () { return S.closeIfAllowed('GIS.AH8'); } },
    { txt: 'Start grid-forming source (BESS PCS, else lead DG)', fn: function () {
      if (bessAvailable()) { setCB('BESS.LV_ACB', true); set('BESS.SYS.CMD_MODE', 1); set('BESS.PCS1.RUN', 1); set('BESS.PCS2.RUN', 1); return S.closeIfAllowed('GIS.AH3'); }
      S.closeIfAllowed('GIS.AH1'); sim.dg.DG1.request = true; return sim.dg.DG1.status === 'ONLINE' || sim.dg.DG2.status === 'ONLINE';
    } },
    { txt: 'Soft-energise 11kV busbar - check U = 11kV ±5 %, f = 50Hz ±0.5 %', fn: function () { return sim.busLive; } },
    { txt: 'Close AH5 SAT feeder - restore plant auxiliaries', fn: function () { return S.closeIfAllowed('GIS.AH5'); } },
    { txt: 'Close AH4 OUT 1 - President office (critical load)', fn: function () { return S.closeIfAllowed('GIS.AH4'); } },
    { txt: 'Close AH6 OUT 2 - Prime Minister office', fn: function () { return S.closeIfAllowed('GIS.AH6'); } },
    { txt: 'Close AH2 PV incomer - inverters reconnect after 60 s grid-OK', fn: function () { return S.closeIfAllowed('GIS.AH2'); } },
    { txt: 'Hand over to automatic PPC dispatch', fn: function () { return true; } }
  ];
  sim.BLACKSTART = BLACKSTART;

  function anyBlockingFault() {
    return on('PPC.CTRL.ESD') || on('FIRE.FZ_GIS.FIRE') || on('FIRE.FZ_CTRL.FIRE') ||
      C.gis.panels.some(function (p) { return on('GIS.' + p.id + '.LOCKOUT_86') && p.kind !== 'feeder' && p.kind !== 'spare'; });
  }
  function bessAvailable() {
    return !on('BESS.SYS.BMS_FAULT') && !on('BESS.SYS.ESD') && !on('FIRE.FZ_BESS.FIRE') && !on('FIRE.FZ_BESS.PRE_ALM') && get('BESS.SYS.SOC') > sim.socMin && !sim.faults.EMS_FAIL &&
      !on('BESS.PCS1.FAULT') && !on('GIS.AH3.LOCKOUT_86');
  }

  S.startBlackStart = function () {
    if (sim.busLive) { S.event && S.event('PPC', 'Black-start rejected - 11kV bus already energised'); return false; }
    sim.seq = 'BLACKSTART'; sim.seqStep = 0; sim.seqTimer = 0; sim.state = 1; S.event && S.event('PPC', 'Black-start sequence started'); return true; };
  S.plantESD = function () {
    // hardwired emergency stop (design report section 11): battery, PV and generators stop; 11 kV breakers stay as they are
    set('PPC.CTRL.ESD', 1); sim.seq = null;
    set('BESS.PCS1.RUN', 0); set('BESS.PCS2.RUN', 0);
    C.generators.forEach(function (g) { sim.dg[g.id].request = false; sim.dg[g.id].manualRun = false; setCB('DG.' + g.id + '_ACB', false); });
    S.event && S.event('ESTOP', 'Emergency stop: battery, PV and generators stopped by the hardwired circuit', 1);
  };

  /* ---------------- main step ---------------- */
  var acc = { pvDay: 0, loadDay: 0, dgDay: 0, insol: 0, day: -1 };

  function step(dt) {
    sim.t += dt * 1000;
    var h = hourOf(sim.t);
    var dayNo = Math.floor((sim.t + 3 * 3600e3) / 86400e3);
    if (dayNo !== acc.day) { acc = { pvDay: 0, loadDay: 0, dgDay: 0, insol: 0, day: dayNo }; C.pv.inverters.forEach(function (i) { set('PV.' + i.id + '.E_DAY', 0); }); }
    var ppc = { start: get('PPC.CTRL.SP_SOC_DG_START'), stop: get('PPC.CTRL.SP_SOC_DG_STOP'), high: get('PPC.CTRL.SP_SOC_HIGH'), dgMin: get('PPC.CTRL.SP_DG_MINLOAD') / 100 };
    var auto = get('PPC.CTRL.MODE') === 1;

    /* weather */
    if (Math.random() < 0.004 * dt) sim.cloudTarget = Math.random() < 0.35 ? 0.35 + Math.random() * 0.4 : 1;
    if (sim.faults.CLOUD) sim.cloudTarget = 0.25;
    sim.cloud += (sim.cloudTarget - sim.cloud) * Math.min(1, 0.05 * dt);
    var Gclear = irradiance(h), G = Gclear * sim.cloud;
    var Tamb = 27.5 + 4.5 * Math.sin((h - 9) / 24 * 2 * Math.PI);
    var Tmod = Tamb + G * 0.028;
    set('MET.WS.IRR_POA', Math.max(0, G + noise(2) * (G > 0)));
    set('MET.WS.IRR_GHI', Math.max(0, G * 0.93));
    lag('MET.WS.WIND_SPD', 5.5 + 2.5 * Math.sin(h / 3) + noise(1.5), 0.2);
    lag('MET.WS.WIND_DIR', 175 + 25 * Math.sin(h / 5) + noise(8), 0.1);
    set('MET.WS.T_AMB', Tamb); lag('MET.WS.T_MOD', Tmod, 0.1);
    set('MET.WS.HUM', 72 - 14 * Math.sin((h - 9) / 24 * 2 * Math.PI));
    acc.insol += G * dt / 3600 / 1000; set('MET.WS.INSOL_DAY', acc.insol);

    /* DG controllers */
    C.generators.forEach(function (g) { dgStep(g, dt); });

    /* ---- topology / energisation ---- */
    var bessRunning = bessAvailable() && get('BESS.SYS.CMD_MODE') >= 1 && on('BESS.PCS1.RUN') && !on('PPC.CTRL.ESD');
    var bessForming = bessRunning && get('BESS.SYS.CMD_MODE') === 1 && on('BESS.LV_ACB.CB_CLOSED') && on('GIS.AH3.CB_CLOSED');
    var dgPath = on('DG.TX_LV.CB_CLOSED') && on('GIS.AH1.CB_CLOSED');
    var dgOnline = C.generators.filter(function (g) { return sim.dg[g.id].status === 'ONLINE' && on('DG.' + g.id + '_ACB.CB_CLOSED') && dgPath; });
    var busLive = bessForming || dgOnline.length > 0;
    sim.busLive = busLive;
    set('BESS.SYS.GRID_FORMING', bessForming ? 1 : 0);

    var presOn = busLive && on('GIS.AH4.CB_CLOSED') && on('RMU.RMU_PRES_AH3.CB_CLOSED') && on('LV.LVDB_PRES.CB_CLOSED');
    var pmOn = busLive && on('GIS.AH6.CB_CLOSED') && on('RMU.RMU_PM_AH3.CB_CLOSED') && on('LV.LVDB_PM.CB_CLOSED');
    var auxOn = busLive && on('GIS.AH5.CB_CLOSED') && !on('TX.AUXTX.FUSE_BLOWN') && on('LV.AUXPNL.CB_CLOSED');
    var pvOn = busLive && on('GIS.AH2.CB_CLOSED') && on('PV.LV_ACB.CB_CLOSED');

    /* ---- loads ---- */
    var op = officeProfile(h);
    var shed = 1; // load is shed by under-frequency trips of whole feeders, see below
    var Lpres = presOn ? (135 + 225 * op + 18 * Math.sin(sim.t / 7e5) + noise(4)) * shed : 0;
    var Lpm = pmOn ? (105 + 185 * op + 15 * Math.sin(sim.t / 5e5 + 1) + noise(4)) * shed : 0;
    var Laux = auxOn ? 22 + 10 * (Tamb - 23) / 9 + (on('BESS.HVAC.RUN') ? 6 : 0) + noise(0.6) : 0;
    if (sim.faults.OVERLOAD) { if (presOn) Lpres += 200; if (pmOn) Lpm += 200; }
    var Lload = Lpres + Lpm + Laux;

    /* ---- PV available ---- */
    var pvAvail = 0, invAvail = {};
    C.pv.inverters.forEach(function (inv) {
      var pdc = inv.strings * C.pv.modulesPerString * C.pv.moduleWp / 1000 * G / 1000 * 0.965 * (1 - 0.0035 * (Tmod - 25));
      var ok = pvOn && G > 15 && !on('PV.' + inv.id + '.FAULT') && on('PV.' + inv.id + '.MCCB_ON') && !inv._stopped;
      var lim = get('PV.' + inv.id + '.SP_PLIM') / 100 * inv.kw;
      invAvail[inv.id] = ok ? Math.max(0, Math.min(inv.kw, lim, pdc * 0.985)) : 0;
      inv._pdc = pdc;
      pvAvail += invAvail[inv.id];
    });

    /* ---- PPC dispatch ---- */
    var soc = get('BESS.SYS.SOC');
    var lim = sim.bessLimit, socMax = Math.min(100, ppc.high + 3);
    var chgMax = !bessForming ? 0 : (soc >= socMax ? 0 : soc > ppc.high ? lim * (socMax - soc) / (socMax - ppc.high) : lim);
    var disMax = !bessForming ? 0 : (soc <= sim.socMin ? 0 : soc < sim.socMin + 5 ? lim * (soc - sim.socMin) / 5 : lim);
    set('BESS.SYS.P_CHG_MAX', chgMax); set('BESS.SYS.P_DIS_MAX', disMax);
    var losses = 0.012 * (Lload + pvAvail) + (busLive ? 9 : 0);
    var need = Lload + losses;

    if (auto && !on('PPC.CTRL.ESD') && !sim.seq) {
      var n = dgOnline.length;
      var running = C.generators.filter(function (g) { return sim.dg[g.id].request; }).length;
      var lead = on('DG.DG1.READY') ? 'DG1' : 'DG2', lag2 = lead === 'DG1' ? 'DG2' : 'DG1';
      if (!bessForming) {
        // BESS unavailable: DGs form the grid
        sim.dg[lead].request = true;
        sim.dg[lag2].request = need - pvAvail * 0.5 > C.generators[0].kw * 0.85 || !on('DG.' + lead + '.READY');
      } else {
        // EMS sequence (design report section 11): start below the start SOC when PV cannot cover the load,
        // second generator when load exceeds 80 % of the running one, stop at the stop SOC or when PV covers the load
        var leadKw = C.generators.filter(function (g) { return g.id === lead; })[0].kw;
        if ((soc < ppc.start && need > pvAvail) || need - pvAvail > disMax * 0.9) sim.dg[lead].request = true;
        if (sim.dg[lead].status === 'ONLINE' && need - pvAvail > 0.8 * leadKw) sim.dg[lag2].request = true;
        var minRunOk = sim.dg[lead].runFor > C.ppc.dgMinRunMin * 60 || sim.dg[lead].status !== 'ONLINE';
        if ((soc > ppc.stop || pvAvail > need * 1.05) && minRunOk && need - pvAvail < disMax * 0.6) { sim.dg[lead].request = false; sim.dg[lag2].request = false; }
        if (sim.dg[lag2].request && need - pvAvail < 0.5 * leadKw && sim.dg[lag2].runFor > 600) sim.dg[lag2].request = false;
      }
      var st;
      if (!busLive) st = 0;
      else if (!bessForming) st = 6;
      else if (n > 0) st = 4;
      else if (C.generators.some(function (g) { var s = sim.dg[g.id].status; return s === 'CRANKING' || s === 'WARMUP' || s === 'SYNC'; })) st = 3;
      else if (C.generators.some(function (g) { return sim.dg[g.id].status === 'COOLDOWN'; })) st = 5;
      else st = 2;
      if (st !== sim.state) { sim.state = st; sim.stateSince = sim.t; S.event && S.event('PPC', 'PPC state → ' + sim.stateNames[st]); }
      if (st === 6 && bessAvailable() && !on('GIS.AH3.CB_CLOSED') && S.closeInterlocks('GIS.AH3').length === 0) {
        set('BESS.SYS.CMD_MODE', 1); set('BESS.PCS1.RUN', 1); set('BESS.PCS2.RUN', 1); setCB('BESS.LV_ACB', true); setCB('GIS.AH3', true);
        S.event && S.event('PPC', 'BESS available - PCS synchronised to bus, AH3 closed, BESS resumes grid-forming');
      }
      // with the EMS failed there is no black-start sequence: the generator controllers start on the dead busbar by themselves
      if (st === 0 && !sim.seq && !anyBlockingFault() && !sim.faults.EMS_FAIL) { sim.blackoutTimer = (sim.blackoutTimer || 0) + dt; if (sim.blackoutTimer > 10) { sim.blackoutTimer = 0; S.startBlackStart(); } }
    } else if (on('PPC.CTRL.ESD')) sim.state = 7;
    else if (!auto && !sim.seq) sim.state = busLive ? 8 : 0;

    /* sequence runner */
    if (sim.seq === 'BLACKSTART') {
      sim.seqTimer += dt;
      if (sim.seqTimer > 3) {
        var s = BLACKSTART[sim.seqStep];
        if (s.fn()) { S.event && S.event('PPC', 'Black-start step ' + (sim.seqStep + 1) + ' done: ' + s.txt); sim.seqStep++; sim.seqTimer = 0; }
        else if (sim.seqTimer > 90) { S.event && S.event('PPC', 'Black-start ABORTED at step ' + (sim.seqStep + 1) + ': ' + s.txt, 1); sim.seq = null; }
        if (sim.seqStep >= BLACKSTART.length) { sim.seq = null; sim.state = 2; }
      }
    }

    /* DG dispatch */
    var dgCap = dgOnline.reduce(function (a, g) { return a + g.kw; }, 0);
    var Pdg = 0, Ppv = pvAvail, Pbess = 0, curtail = 0, ovl = false;
    if (bessForming) {
      if (dgOnline.length) {
        var chgTarget = Math.min(chgMax, 700);
        Pdg = clamp(need - pvAvail + chgTarget, dgCap * ppc.dgMin, dgCap * C.ppc.dgOptLoadPct / 100);
      }
      Pbess = need - Ppv - Pdg;
      if (Pbess < -chgMax) { curtail = -chgMax - Pbess; Ppv -= curtail; Pbess = -chgMax; }
      if (Pbess > disMax) { ovl = true; set('PPC.CTRL.LOAD_SHED', 1); Pbess = disMax; } else if (Pbess < disMax * 0.7) set('PPC.CTRL.LOAD_SHED', 0);
    } else if (dgOnline.length) {
      Pdg = need - Ppv;
      if (Pdg < dgCap * ppc.dgMin) { curtail = dgCap * ppc.dgMin - Pdg; Ppv -= curtail; Pdg = dgCap * ppc.dgMin; }
      if (Pdg > dgCap) { ovl = true; set('PPC.CTRL.LOAD_SHED', 1); Pdg = dgCap; } else if (Pdg < dgCap * 0.75) set('PPC.CTRL.LOAD_SHED', 0);
    } else { Ppv = 0; Pbess = 0; set('PPC.CTRL.LOAD_SHED', 0); }
    Ppv = Math.max(0, Ppv);

    /* under-frequency load shedding by the 11 kV relays (81), design report section 11:
       AH6 (Prime Minister) at 48.5 Hz after 1 s, then AH4 (President) at 47.5 Hz after 0.5 s; AH5 is never shed */
    var overload = busLive && ovl;
    var ufStage = on('GIS.AH6.CB_CLOSED') ? 'AH6' : on('GIS.AH4.CB_CLOSED') ? 'AH4' : null;
    if (overload && ufStage) {
      sim.ufTimer += dt;
      if (sim.ufTimer >= (ufStage === 'AH6' ? 1 : 0.5)) {
        setCB('GIS.' + ufStage, false); set('GIS.' + ufStage + '.CB_TRIPPED', 1); sim.uf[ufStage] = true; sim.ufTimer = 0;
        S.event && S.event('PROT', ufStage + (ufStage === 'AH6' ? ' Prime Minister' : ' President') + ' feeder shed by under-frequency protection (81)', 1);
      }
    } else sim.ufTimer = 0;

    /* ---- write PV ---- */
    var pvScale = pvAvail > 0 ? Ppv / pvAvail : 0;
    var U = busLive ? 11 + noise(0.02) - 0.08 * (Lload / 1200) : 0;
    var f = overload ? (on('GIS.AH6.CB_CLOSED') ? 48.3 : 47.3) + noise(0.02) : busLive ? (bessForming ? 50 - 0.15 * Pbess / 950 : 50 - 0.3 * (Pdg / Math.max(dgCap, 1) - 0.5)) + noise(0.008) : 0;
    set('GIS.BUS.U', U); set('GIS.BUS.F', f); set('GIS.BUS.LIVE', busLive ? 1 : 0);

    C.pv.inverters.forEach(function (inv, idx) {
      var p = 'PV.' + inv.id, P = invAvail[inv.id] * pvScale;
      var running = P > 0.5 || (invAvail[inv.id] > 0 && pvScale === 0 && curtail > 0);
      set(p + '.RUN', invAvail[inv.id] > 0 ? 1 : 0);
      set(p + '.STANDBY', invAvail[inv.id] > 0 && pvScale < 0.98 ? 1 : 0);
      set(p + '.P', P); set(p + '.Q', P * 0.12);
      set(p + '.PF', P > 1 ? 0.99 : 0);
      set(p + '.U_AC', pvOn ? 800 + noise(3) : 0);
      set(p + '.I_AC', P / (SQ3 * 0.8 * 0.99));
      set(p + '.F', pvOn ? f : 0);
      var pdc = P > 0 ? P / 0.985 : 0;
      set(p + '.P_DC', pdc);
      var vmpp = G > 15 ? 1080 * (1 - 0.0029 * (Tmod - 25)) + (pvScale < 0.98 ? 90 : 0) : (G > 2 ? 1250 : 0);
      set(p + '.U_DC', vmpp + noise(2));
      set(p + '.EFF', P > 1 ? 98.4 + noise(0.1) : 0);
      lag(p + '.T_INT', Tamb + 4 + 26 * P / inv.kw, 0.01 * dt);
      set(p + '.E_DAY', get(p + '.E_DAY') + P * dt / 3600);
      set(p + '.E_TOT', get(p + '.E_TOT') + P * dt / 3600 / 1000);
      for (var m = 1; m <= C.pv.mpptsPerInverter; m++) set(p + '.MPPT' + ('0' + m).slice(-2) + '_U', vmpp > 0 ? vmpp + noise(4) : 0);
      var istr = vmpp > 0 && P > 0 ? pdc * 1000 / vmpp / inv.strings : 0;
      for (var s = 1; s <= inv.strings; s++) {
        var k = 1 + noise(0.015);
        if (sim.faults.STRING && idx === 1 && s === 7) k = 0.05;
        set(p + '.STR' + ('0' + s).slice(-2) + '_I', Math.max(0, istr * k));
      }
    });
    acc.pvDay += Ppv * dt / 3600;

    /* PV POC meter */
    writeMeter('PV.POC', Ppv, 0.8, Ppv * 0.12, f);

    /* ---- write BESS ---- */
    var cap = C.bess.kwh * get('BESS.SYS.SOH') / 100;
    var eff = Pbess > 0 ? 1 / 0.965 : 0.965;
    soc = clamp(soc - Pbess * eff * dt / 3600 / cap * 100, 0, 100);
    set('BESS.SYS.SOC', soc); set('BESS.SYS.P', Pbess); set('BESS.SYS.Q', bessForming ? 60 + noise(5) : 0);
    set('BESS.SYS.E_AVAIL', cap * soc / 100);
    var udc = bessForming || bessRunning ? 416 * (3.18 + 0.0022 * soc - Pbess / 950 * 0.03) : 416 * (3.18 + 0.0022 * soc);
    set('BESS.SYS.U_DC', udc); set('BESS.SYS.I_DC', Pbess * 1000 / udc);
    if (Pbess > 0) set('BESS.SYS.E_DIS', get('BESS.SYS.E_DIS') + Pbess * dt / 3600e3); else set('BESS.SYS.E_CHG', get('BESS.SYS.E_CHG') - Pbess * dt / 3600e3);
    set('BESS.SYS.CYCLES', get('BESS.SYS.E_DIS') / (C.bess.kwh / 1000));
    var ucell = 3.18 + 0.0022 * soc - Pbess / 950 * 0.03;
    set('BESS.SYS.U_CELL_MAX', ucell + 0.012); set('BESS.SYS.U_CELL_MIN', ucell - 0.014);
    lag('BESS.HVAC.T_CABIN', 23.5 + Math.abs(Pbess) / 950 * 3 + (on('BESS.HVAC.FAULT') ? 9 : 0), 0.004 * dt);
    lag('BESS.SYS.T_CELL_MAX', get('BESS.HVAC.T_CABIN') + 2 + Math.abs(Pbess) / 950 * 6, 0.004 * dt);
    set('BESS.SYS.T_CELL_MIN', get('BESS.SYS.T_CELL_MAX') - 3.1);
    set('BESS.HVAC.HUM', 48 + noise(1));
    C.bess.pcs.forEach(function (pc, i) {
      set('BESS.BCP' + (i + 1) + '.I_DC', bessForming ? Pbess / 2 * 1000 / udc : 0);
      var p = 'BESS.' + pc.id, P = Pbess / 2;
      set(p + '.P', bessForming ? P : 0); set(p + '.Q', bessForming ? 30 : 0);
      set(p + '.U_AC', bessForming ? 690 + noise(2) : 0); set(p + '.I_AC', Math.abs(P) / (SQ3 * 0.69));
      set(p + '.U_DC', udc); lag(p + '.T_IGBT', 35 + Math.abs(P) / pc.kw * 30, 0.02 * dt);
    });
    for (var r = 1; r <= C.bess.racks; r++) {
      var rp = 'BESS.RACK' + r;
      set(rp + '.SOC', clamp(soc + (r - 4.5) * 0.15, 0, 100));
      set(rp + '.U', udc + noise(0.8)); set(rp + '.I', Pbess * 1000 / udc / C.bess.racks + noise(0.3));
      set(rp + '.T_MAX', get('BESS.SYS.T_CELL_MAX') - (r % 3) * 0.4);
      set(rp + '.U_CMAX', ucell + 0.010 + (r % 2) * 0.002); set(rp + '.U_CMIN', ucell - 0.012 - (r % 3) * 0.001);
    }
    writeMeter('BESS.POC', Pbess, 0.69, bessForming ? 60 : 0, f);

    /* ---- write DG ---- */
    C.generators.forEach(function (g) {
      var p = 'DG.' + g.id, online = dgOnline.indexOf(g) >= 0;
      var P = online ? Pdg * g.kw / dgCap : 0;
      set(p + '.LOAD_PCT', P / g.kw * 100);
      var running = on(p + '.RUNNING');
      var uu = running ? 400 + noise(2) : 0;
      ['L12', 'L23', 'L31'].forEach(function (x) { set(p + '.U_' + x, uu); });
      var Ia = P / (SQ3 * 0.4 * 0.9);
      ['L1', 'L2', 'L3'].forEach(function (x) { set(p + '.I_' + x, Ia * (1 + noise(0.01))); });
      set(p + '.P', P); set(p + '.Q', P * 0.48); set(p + '.S', P / 0.9); set(p + '.PF', P > 1 ? 0.9 : 0);
      set(p + '.F', running ? (online ? f : 50 + noise(0.01)) : 0);
      set(p + '.FUEL_RATE', running ? 0.06 * g.kw * 0.3 + 0.21 * P : 0);
      set(p + '.FUEL', Math.max(0, get(p + '.FUEL') - get(p + '.FUEL_RATE') * dt / 3600 / 20));
      if (get(p + '.FUEL') < 20) set(p + '.LOW_FUEL', 1);
      set(p + '.E_EXP', get(p + '.E_EXP') + P * dt / 3600e3);
    });
    acc.dgDay += Pdg * dt / 3600;

    /* ---- 11kV feeder measurements ---- */
    var fl = {
      /* incomers: + = power into the 11kV bus */ AH1: Pdg * 0.988, AH2: Ppv * 0.988, AH3: Pbess * 0.99, AH4: Lpres * 1.012, AH5: Laux * 1.02, AH6: Lpm * 1.012, AH7: 0, AH8: busLive && on('GIS.AH8.CB_CLOSED') ? 0.8 : 0
    };
    C.gis.panels.forEach(function (pn) {
      var P = on('GIS.' + pn.id + '.CB_CLOSED') ? fl[pn.id] : 0;
      writeMeter('GIS.' + pn.id, P, U, Math.abs(P) * 0.3, f, U > 0 && on('GIS.' + pn.id + '.DS_CLOSED'));
      set('GIS.' + pn.id + '.VPIS', U > 1 && (on('GIS.' + pn.id + '.CB_CLOSED') || pn.kind === 'incomer' && (pn.id === 'AH1' ? dgOnline.length : pn.id === 'AH3' ? bessRunning : 0)) ? 1 : 0);
      set('GIS.' + pn.id + '.I_N', Math.abs(P) > 0 ? 0.2 + noise(0.05) : 0);
    });
    set('GIS.NECR.I_NER', busLive && on('GIS.AH8.CB_CLOSED') ? 0.3 + noise(0.1) : 0);
    lag('GIS.NECR.T_NER', 31 + get('GIS.NECR.I_NER') * 2, 0.05);
    set('GIS.DC.U_DC', auxOn ? 112.4 + noise(0.1) : Math.max(98, get('GIS.DC.U_DC') - 0.0005 * dt));
    set('GIS.DC.CHG_FAIL', auxOn ? 0 : 1);
    lag('GIS.ROOM.T_ROOM', 24 + (Tamb - 27) * 0.3, 0.01);

    /* ---- RMUs & LV ---- */
    [['RMU_PRES', Lpres, 'LVDB_PRES', presOn], ['RMU_PM', Lpm, 'LVDB_PM', pmOn]].forEach(function (x) {
      var r = 'RMU.' + x[0], P = x[1];
      var I = P / (SQ3 * 11 * 0.92);
      ['L1', 'L2', 'L3'].forEach(function (ph, i) { set(r + '.I_' + ph, I * (1 + (i - 1) * 0.03)); });
      set(r + '.I_N', I * 0.02);
      set(r + '.VPIS_DX11', busLive && on('GIS.' + (x[0] === 'RMU_PRES' ? 'AH4' : 'AH6') + '.CB_CLOSED') ? 1 : 0);
      set(r + '.VPIS_DX13', x[3] || (on(r + '_AH3.CB_CLOSED') && get(r + '.VPIS_DX11')) ? 1 : 0);
      set(x[0] === 'RMU_PRES' ? 'AUX.UPS_RMUP.ON_BATT' : 'AUX.UPS_RMUM.ON_BATT', get(r + '.VPIS_DX11') ? 0 : 1);
      lvWrite(x[2], P, x[3], f);
    });
    lvWrite('AUXPNL', Laux, auxOn, f);
    acc.loadDay += Lload * dt / 3600;

    /* ---- transformers ---- */
    var txP = { DGTX: Pdg, PVTX: Ppv, BESSTX: Math.abs(Pbess), PRESTX: Lpres, PMTX: Lpm, AUXTX: Laux };
    C.transformers.forEach(function (tx) {
      var p = 'TX.' + tx.id, ld = txP[tx.id] / ({ PVTX: 0.99, BESSTX: 0.99, DGTX: 0.9 }[tx.id] || 0.92) / tx.kva;
      set(p + '.LOAD', ld * 100);
      lag(p + '.T_OIL', Tamb + 6 + 45 * ld * ld, 0.0015 * dt);
      lag(p + '.T_WDG', get(p + '.T_OIL') + 4 + 18 * ld * ld, 0.01 * dt);
    });

    /* ---- UPS / aux ---- */
    set('AUX.UPS_SCADA.ON_BATT', auxOn ? 0 : 1);
    set('AUX.UPS_SCADA.AUTONOMY', auxOn ? Math.min(95, get('AUX.UPS_SCADA.AUTONOMY') + dt / 60) : Math.max(0, get('AUX.UPS_SCADA.AUTONOMY') - dt / 60));
    set('AUX.UPS_SCADA.BATT_LOW', get('AUX.UPS_SCADA.AUTONOMY') < 15 ? 1 : 0);
    set('AUX.UPS_SCADA.LOAD', 38 + noise(1));

    /* ---- fire ---- */
    if (sim.faults.FIRE_STAGE) {
      sim.faults.fireT = (sim.faults.fireT || 0) + dt;
      set('FIRE.FZ_BESS.PRE_ALM', 1); set('FIRE.FACP.SOUNDERS', 1);
      lag('FIRE.FZ_BESS.GAS_CO', 120, 0.05); lag('FIRE.FZ_BESS.GAS_H2', 14, 0.05);
      set('FIRE.FZ_BESS.VENT_RUN', 1);
      if (sim.faults.FIRE_STAGE > 1) {
        set('FIRE.FZ_BESS.FIRE', 1);
        if (!sim.faults.bessIsolated) {
          sim.faults.bessIsolated = true; setCB('GIS.AH3', false); setCB('BESS.LV_ACB', false); set('BESS.SYS.ESD', 1); set('BESS.PCS1.RUN', 0); set('BESS.PCS2.RUN', 0);
          S.event && S.event('FIRE', 'BESS fire confirmed - PCS stopped, AH3 & BESS ACB tripped (cause & effect)', 1);
        }
        set('FIRE.FZ_BESS.REL_PENDING', on('FIRE.FZ_BESS.RELEASED') ? 0 : 1);
        if (sim.faults.fireT > 30 && !on('FIRE.FZ_BESS.MAN_INHIBIT')) { set('FIRE.FZ_BESS.RELEASED', 1); set('FIRE.FZ_BESS.REL_PENDING', 0); }
      }
    } else {
      lag('FIRE.FZ_BESS.GAS_CO', 2, 0.05); lag('FIRE.FZ_BESS.GAS_H2', 0.2, 0.05);
    }

    /* ---- plant KPIs ---- */
    set('PPC.PLANT.P_LOAD', Lload); set('PPC.PLANT.P_PV', Ppv); set('PPC.PLANT.P_PV_AVAIL', pvAvail);
    set('PPC.PLANT.P_DG', Pdg); set('PPC.PLANT.P_BESS', Pbess); set('PPC.PLANT.CURTAIL', curtail);
    set('PPC.PLANT.RE_SHARE', Lload > 0 ? clamp((Lload - Pdg) / Lload * 100, 0, 100) : 0);
    set('PPC.PLANT.E_LOAD_DAY', acc.loadDay); set('PPC.PLANT.E_PV_DAY', acc.pvDay); set('PPC.PLANT.E_DG_DAY', acc.dgDay);
    set('PPC.PLANT.FUEL_SAVED', acc.pvDay * 0.28); set('PPC.PLANT.CO2_SAVED', acc.pvDay * 0.28 * 2.68 / 1000);
    set('PPC.CTRL.STATE', sim.state);
    var pr = G > 50 ? Ppv / (C.pv.dcKwp * G / 1000) * 100 : 0;
    set('MET.WS.PR', curtail > 1 ? get('MET.WS.PR') : pr);

    /* comm-loss fault */
    var pmComm = !sim.faults.COMM_PM;
    set('NET.N17.OK', pmComm ? 1 : 0); set('RMU.RMU_PM.COMM', pmComm ? 1 : 0);
    S.mtagOrder.forEach(function (id) { if ((id.indexOf('RMU.RMU_PM') === 0 || id.indexOf('AUX.UPS_RMUM.') === 0) && id !== 'RMU.RMU_PM.COMM') T[id].q = pmComm ? 'GOOD' : 'BAD'; });
    set('NET.SEC.FW_DENY', 3 + Math.round(Math.abs(noise(2))));
  }

  function writeMeter(p, P, kv, Q, f, live) {
    if (live === undefined) live = kv > 0;
    var u = live ? kv : 0;
    var uu = kv >= 1 ? u : u * 1000;
    ['L12', 'L23', 'L31'].forEach(function (x, i) { set(p + '.U_' + x, uu ? uu * (1 + (i - 1) * 0.002) : 0); });
    var S_ = Math.sqrt(P * P + Q * Q);
    var I = u > 0 ? S_ / (SQ3 * u) : 0;
    ['L1', 'L2', 'L3'].forEach(function (x, i) { set(p + '.I_' + x, I * (1 + (i - 1) * 0.015)); });
    set(p + '.P', P); set(p + '.Q', Q); set(p + '.S', S_); set(p + '.PF', S_ > 1 ? Math.abs(P) / S_ : 0);
    set(p + '.F', u > 0 ? f : 0);
    if (P > 0) set(p + '.E_IMP', get(p + '.E_IMP') + P * sim._dt / 3600e3); else set(p + '.E_EXP', get(p + '.E_EXP') - P * sim._dt / 3600e3);
    if (T[p + '.THD_U']) set(p + '.THD_U', u > 0 ? 2.1 + noise(0.2) : 0);
  }

  var wayW = [0.18, 0.14, 0.12, 0.11, 0.13, 0.1, 0.12, 0.1, 0, 0];
  function lvWrite(b, P, live, f) {
    var p = 'LV.' + b;
    writeMeter(p, live ? P : 0, 0.4, live ? P * 0.35 : 0, f, live);
    set(p + '.I_N', live ? P * 0.04 : 0);
    var cfg = C.lvdbs.filter(function (x) { return x.id === b; })[0];
    var tot = 0, ws = [];
    for (var w = 1; w <= cfg.ways; w++) { var k = 'W' + ('0' + w).slice(-2); ws.push(k); tot += on(p + '.' + k + '_ON') ? (wayW[w - 1] || 0.12) : 0; }
    ws.forEach(function (k, i) {
      var share = on(p + '.' + k + '_ON') && tot > 0 ? (wayW[i] || 0.12) / tot : 0;
      set(p + '.' + k + '_P', live ? P * share * (1 + noise(0.02)) : 0);
    });
  }

  function record() {
    if (S.recordHook) return S.recordHook();
    var H = sim.history;
    H.t.push(sim.t);
    sim.histIds.forEach(function (id) { H.v[id].push(T[id].v); });
    if (H.t.length > 6000) { H.t.splice(0, 1000); sim.histIds.forEach(function (id) { H.v[id].splice(0, 1000); }); }
  }

  S.simStep = function (dt) { sim._dt = dt; step(dt); };

  /* Pre-run from local midnight so trends, energy counters and SOC are realistic on start-up */
  S.simStart = function (onTick) {
    init();
    var now = Date.now();
    var h = hourOf(now);
    sim.t = now - h * 3600e3;
    var preDt = 30;
    while (sim.t < now - preDt * 1000) { sim._dt = preDt; step(preDt); record(); }
    sim.t = now;
    var n = 0;
    setInterval(function () {
      if (!sim.running) return;
      S.simStep(sim.speed);
      if (++n % 2 === 0) record();
      onTick && onTick();
    }, 1000);
  };

  /* hot standby controller pair (design report section 4): the standby takes over when the active controller fails */
  S.cpCheck = function () {
    var cp = sim.cp, other = cp.active === 'A' ? 'B' : 'A';
    if (!cp[cp.active] && cp[other]) {
      cp.active = other; cp.pulse = 10;
      S.event('CP', 'Controller switchover: controller ' + other + ' now in control', 2);
    }
    if (!cp.A && !cp.B) S.event('CP', 'Both controllers failed: SCADA view and remote switching lost; operate locally', 1);
  };
  S.cpInService = function () { return sim.cp.A || sim.cp.B; };

  /* Fault injection for FAT / operator training */
  S.injectFault = function (k) {
    switch (k) {
      case 'AH4_OC':
        set('GIS.AH4.PROT_50', 1); set('GIS.AH4.CB_TRIPPED', 1); set('GIS.AH4.LOCKOUT_86', 1); setCB('GIS.AH4', false);
        S.event('PROT', 'AH4 OUT 1 (President) tripped on 50/51 phase overcurrent', 1); break;
      case 'AH6_EF':
        set('GIS.AH6.PROT_50N', 1); set('GIS.AH6.CB_TRIPPED', 1); set('GIS.AH6.LOCKOUT_86', 1); setCB('GIS.AH6', false);
        set('GIS.NECR.I_NER', 42); S.event('PROT', 'AH6 OUT 2 (P.M.) tripped on 50N/51N earth fault', 1); break;
      case 'BESS_FAULT': set('BESS.SYS.BMS_FAULT', 1); set('BESS.RACK3.FAULT', 1); S.event('BESS', 'BMS fault - rack 3 cell over-temperature', 1); break;
      case 'DG1_FAILSTART': sim.dg.DG1.failNext = true; S.event('SIM', 'DG1 will fail on next start attempt'); break;
      case 'INV3_FAULT': set('PV.INV3.FAULT', 1); set('PV.INV3.ISO_FLT', 1); S.event('PV', 'NB03 inverter fault - insulation resistance low', 2); break;
      case 'STRING': sim.faults.STRING = true; S.event('SIM', 'String NB02-07 open circuit injected'); break;
      case 'CLOUD': sim.faults.CLOUD = !sim.faults.CLOUD; S.event('SIM', 'Heavy cloud cover ' + (sim.faults.CLOUD ? 'ON' : 'OFF')); break;
      case 'FIRE_PRE': sim.faults.FIRE_STAGE = 1; S.event('FIRE', 'ESS cabin off-gas / smoke pre-alarm', 2); break;
      case 'FIRE_CONF': sim.faults.FIRE_STAGE = 2; break;
      case 'SF6_AH6': set('GIS.AH6.SF6_LOW', 1); S.event('GIS', 'AH6 SF6 gas pressure low', 2); break;
      case 'ESTOP': set('PPC.CTRL.ESD', 1); sim.estop = true; S.plantESD(); break;
      case 'ESTOP_RESET': sim.estop = false; set('PPC.CTRL.ESD', 0); S.event('SIM', 'Emergency stop reset locally at the push-button'); break;
      case 'RELAY_RESET':
        S.mtagOrder.forEach(function (id) { if (/^(GIS|RMU)\./.test(id) && /\.(PROT_\w+|LOCKOUT_86|CB_TRIPPED)$/.test(id)) T[id].v = 0; });
        S.event('SIM', 'Protection relays reset locally at the panels'); break;
      case 'MCCB_NB03': set('PV.INV3.MCCB_ON', 0); set('PV.INV3.MCCB_TRIP', 1); S.event('SIM', 'Inverter NB03 AC MCCB tripped', 2); break;
      case 'DG_MAN': C.generators.forEach(function (g) { set('DG.' + g.id + '.MODE_AUTO', 0); }); break;
      case 'EMS_FAIL':
        sim.faults.EMS_FAIL = !sim.faults.EMS_FAIL;
        if (sim.faults.EMS_FAIL) { set('BESS.PCS1.RUN', 0); set('BESS.PCS2.RUN', 0); S.event('SIM', 'EMS stopped: battery off, heartbeat lost', 1); }
        else { S.event('SIM', 'EMS restored'); }
        break;
      case 'OVERLOAD': sim.faults.OVERLOAD = !sim.faults.OVERLOAD; S.event('SIM', 'Office load step +400 kW ' + (sim.faults.OVERLOAD ? 'ON' : 'OFF')); break;
      case 'CP_A_FAIL': case 'CP_B_FAIL':
        var k2 = k.charAt(3); sim.cp[k2] = !sim.cp[k2];
        S.event('SIM', 'Controller ' + k2 + (sim.cp[k2] ? ' repaired: rejoins as standby' : ' failed'), sim.cp[k2] ? 0 : 2);
        S.cpCheck(); break;
      case 'COMM_PM': sim.faults.COMM_PM = !sim.faults.COMM_PM; S.event('NET', 'Fibre link to P.M. RMU ' + (sim.faults.COMM_PM ? 'LOST' : 'restored'), 2); break;
      case 'CLEAR':
        sim.faults = {}; sim.cp.A = true; sim.cp.B = true;
        ['FIRE.FZ_BESS.PRE_ALM', 'FIRE.FZ_BESS.FIRE', 'FIRE.FZ_BESS.REL_PENDING', 'FIRE.FZ_BESS.RELEASED', 'FIRE.FACP.SOUNDERS', 'FIRE.FZ_BESS.VENT_RUN',
          'BESS.SYS.BMS_FAULT', 'BESS.RACK3.FAULT', 'BESS.SYS.ESD', 'PV.INV3.FAULT', 'PV.INV3.ISO_FLT', 'GIS.AH6.SF6_LOW', 'DG.DG1.FAIL_START', 'DG.DG2.FAIL_START', 'PPC.CTRL.ESD', 'PV.INV3.MCCB_TRIP'].forEach(function (id) { set(id, 0); });
        set('PV.INV3.MCCB_ON', 1); sim.estop = false;
        set('BESS.PCS1.RUN', 1); set('BESS.PCS2.RUN', 1); setCB('BESS.LV_ACB', true);
        S.event('SIM', 'All injected faults cleared (protection lockouts still require reset)'); break;
    }
  };
})(SCADA);
