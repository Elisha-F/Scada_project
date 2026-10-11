/* Plant Overview (live single-line diagram) and Plant Information */
(function (S) {
  var ui = S.ui, T = S.tags, C = S.config;
  function v(id) { return T[id] ? T[id].v : 0; }

  /* energisation of each section, used by data-live */
  S.live.bus = function () { return v('GIS.BUS.LIVE'); };
  S.live.dgLv = function () {
    return C.generators.some(function (g) { return v('DG.' + g.id + '.RUNNING') && v('DG.' + g.id + '_ACB.CB_CLOSED'); }) ||
      (S.live.dgHv0() && v('DG.TX_LV.CB_CLOSED'));
  };
  S.live.dgHv0 = function () { return v('GIS.BUS.LIVE') && v('GIS.AH1.CB_CLOSED'); };
  S.live.dgHv = function () { return S.live.dgHv0() || (v('DG.TX_LV.CB_CLOSED') && C.generators.some(function (g) { return v('DG.' + g.id + '.RUNNING') && v('DG.' + g.id + '_ACB.CB_CLOSED'); })); };
  S.live.pvHv = function () { return v('GIS.BUS.LIVE') && v('GIS.AH2.CB_CLOSED'); };
  S.live.pvLv = function () { return S.live.pvHv() && v('PV.LV_ACB.CB_CLOSED'); };
  S.live.bessLv = function () { return v('BESS.PCS1.RUN') && v('BESS.LV_ACB.CB_CLOSED') && !v('BESS.SYS.BMS_FAULT') && !v('BESS.SYS.ESD') || (S.live.bessHv0() && v('BESS.LV_ACB.CB_CLOSED')); };
  S.live.bessHv0 = function () { return v('GIS.BUS.LIVE') && v('GIS.AH3.CB_CLOSED'); };
  S.live.bessHv = function () { return S.live.bessHv0() || (S.live.bessLv() && v('BESS.LV_ACB.CB_CLOSED') && v('GIS.AH3.CB_CLOSED')); };
  S.live.presHv = function () { return v('GIS.BUS.LIVE') && v('GIS.AH4.CB_CLOSED'); };
  S.live.presTx = function () { return S.live.presHv() && v('RMU.RMU_PRES_AH3.CB_CLOSED'); };
  S.live.presLv = function () { return S.live.presTx() && v('LV.LVDB_PRES.CB_CLOSED'); };
  S.live.pmHv = function () { return v('GIS.BUS.LIVE') && v('GIS.AH6.CB_CLOSED'); };
  S.live.pmTx = function () { return S.live.pmHv() && v('RMU.RMU_PM_AH3.CB_CLOSED'); };
  S.live.pmLv = function () { return S.live.pmTx() && v('LV.LVDB_PM.CB_CLOSED'); };
  S.live.auxHv = function () { return v('GIS.BUS.LIVE') && v('GIS.AH5.CB_CLOSED'); };
  S.live.auxTx = function () { return S.live.auxHv() && !v('TX.AUXTX.FUSE_BLOWN'); };
  S.live.auxLv = function () { return S.live.auxTx() && v('LV.AUXPNL.CB_CLOSED'); };
  S.live.necr = function () { return v('GIS.BUS.LIVE') && v('GIS.AH8.CB_CLOSED'); };

  /* one GIS panel drop: bus tie -> 3-pos switch -> VCB (dir -1 up, +1 down) */
  function drop(x, id, dir, live) {
    var y0 = 380, p = 'GIS.' + id;
    var s = ui.line(x, y0, x, y0 + dir * 12, 'bus');
    s += ui.ds(x, y0 + dir * 25, p, 'bus').replace('translate(' + x + ',' + (y0 + dir * 25) + ')', 'translate(' + x + ',' + (y0 + dir * 25) + ')' + (dir < 0 ? ' scale(1,-1)' : ''));
    s += ui.line(x, y0 + dir * 42, x, y0 + dir * 55, 'bus');
    s += ui.cb(x, y0 + dir * 66, p, id, { title: id + ' - ' + C.gis.panels.filter(function (q) { return q.id === id; })[0].usage, left: true });
    s += ui.line(x, y0 + dir * 77, x, y0 + dir * 110, live);
    s += ui.val(x + 16, y0 + dir * 66 - 3, p + '.P', 'val-b');
    s += ui.val(x + 16, y0 + dir * 66 + 11, p + '.I_L1', 'val');
    return s;
  }

  function svgSld() {
    var s = '<svg class="sld" viewBox="0 0 1320 720" preserveAspectRatio="xMidYMid meet">';
    /* busbar */
    s += '<line class="ln bus" data-live="bus" x1="60" y1="380" x2="1270" y2="380" stroke-width="7"/>';
    s += ui.text(340, 402, '11 kV BUSBAR · 1250 A · GIS COMBINER PANEL', 'lbl', 'start');
    s += ui.val(64, 402, 'GIS.BUS.U', 'val-b') + ui.val(140, 402, 'GIS.BUS.F', 'val-b');

    /* ---- AH1 DG incomer ---- */
    s += drop(170, 'AH1', -1, 'dgHv');
    s += ui.tx(170, 255, 'DG Step-up TX', '1.5MVA 11/0.4kV Dyn11', 'dgHv', 'dgLv');
    s += ui.line(170, 230, 170, 202, 'dgLv') + ui.cb(170, 190, 'DG.TX_LV', 'LV ACB', { left: true, title: 'DG step-up TX LV ACB' }) + ui.line(170, 178, 170, 160, 'dgLv');
    s += '<line class="ln" data-live="dgLv" x1="100" y1="160" x2="240" y2="160" stroke-width="4"/>';
    C.generators.forEach(function (g, i) {
      var x = i ? 230 : 110;
      s += ui.line(x, 160, x, 132, 'dgLv') + ui.cb(x, 120, 'DG.' + g.id + '_ACB', i ? 'Q2' : 'Q1', { left: !i, title: g.name + ' ' + g.acb });
      s += ui.line(x, 108, x, 90, 'DG.' + g.id + '.RUNNING') + ui.gen(x, 70, g.id);
      s += ui.val(i ? x + 24 : x - 24, 66, 'DG.' + g.id + '.P', 'val-b', i ? 'start' : 'end');
      s += ui.text(i ? x + 24 : x - 24, 80, g.kva + ' kVA', 'lbl-xs', i ? 'start' : 'end');
    });

    /* ---- AH2 PV incomer ---- */
    s += drop(470, 'AH2', -1, 'pvHv');
    s += ui.tx(470, 255, 'PV Inverter TX', '1.5MVA 11/0.8kV Dd0', 'pvHv', 'pvLv');
    s += ui.line(470, 230, 470, 202, 'pvLv') + ui.cb(470, 190, 'PV.LV_ACB', 'ACB 1250A', { left: true, title: 'PV LV ACB 1250A' }) + ui.line(470, 178, 470, 160, 'pvLv');
    s += ui.meter(510, 192, 'PV.POC');
    s += '<line class="ln" data-live="pvLv" x1="355" y1="160" x2="585" y2="160" stroke-width="4"/>';
    C.pv.inverters.forEach(function (inv, i) {
      var x = 365 + i * 72;
      s += ui.line(x, 160, x, 100, 'pvLv&PV.' + inv.id + '.MCCB_ON') + ui.inv(x, 78, inv);
      s += ui.val(x, 40, 'PV.' + inv.id + '.P', 'val', 'middle');
    });
    s += ui.text(470, 18, '1.516 MWp DC / 1.4 MW AC · 2106 × 720 Wp', 'lbl-xs');

    /* ---- AH3 BESS incomer ---- */
    s += drop(820, 'AH3', -1, 'bessHv');
    s += ui.tx(820, 255, 'BESS TX', '1MVA 11/0.69kV Dd0', 'bessHv', 'bessLv');
    s += ui.line(820, 230, 820, 202, 'bessLv') + ui.cb(820, 190, 'BESS.LV_ACB', 'ACB 1000A', { left: true, title: 'BESS LV ACB 1000A' }) + ui.line(820, 178, 820, 160, 'bessLv');
    s += ui.meter(860, 192, 'BESS.POC');
    s += '<line class="ln" data-live="bessLv" x1="770" y1="160" x2="870" y2="160" stroke-width="4"/>';
    C.bess.pcs.forEach(function (pc, i) {
      var x = 780 + i * 80;
      s += ui.line(x, 160, x, 122, 'bessLv') + ui.pcs(x, 100, pc);
      s += ui.poly(x + ',80 ' + x + ',50 905,50', 'BESS.' + pc.id + '.RUN');
    });
    s += '<rect class="boxf" x="905" y="14" width="210" height="160" rx="4"/>';
    s += '<rect class="hdr-box" x="905" y="14" width="210" height="20" rx="4"/>' + ui.text(1010, 28, 'BESS · 3.34 MWh LFP', 'hdr-txt');
    s += ui.battery(920, 48, 46, 110);
    s += ui.val(980, 66, 'BESS.SYS.SOC', 'val-b') + ui.val(980, 84, 'BESS.SYS.E_AVAIL', 'val') + ui.val(980, 102, 'BESS.SYS.P', 'val-b');
    s += ui.val(980, 120, 'BESS.SYS.T_CELL_MAX', 'val') + ui.val(980, 138, 'BESS.SYS.GRID_FORMING', 'val');
    s += ui.val(980, 156, 'BESS.SYS.SOH', 'val');
    ['SOC', 'Available', 'P (+dis/−chg)', 'Max cell temp', 'Grid forming', 'SOH'].forEach(function (l, i) { s += ui.text(1108, 66 + i * 18, l, 'lbl-xs', 'end'); });

    /* ---- AH8 NECR ---- */
    s += drop(1180, 'AH8', -1, 'necr');
    s += '<g transform="translate(1180,255)"><circle class="tx" data-live="necr" r="16"/><text class="lbl-s" x="0" y="5" text-anchor="middle">Z</text></g>';
    s += ui.text(1202, 252, 'Earthing TX (zig-zag)', 'lbl-xs', 'start');
    s += ui.line(1180, 239, 1180, 215, 'necr') + '<rect x="1173" y="185" width="14" height="30" fill="#fff" stroke="#4c5a67" stroke-width="1.6"/>';
    s += ui.text(1202, 198, 'NER 63.5 Ω · 100 A · 10 s', 'lbl-xs', 'start') + ui.val(1202, 212, 'GIS.NECR.I_NER', 'val');
    s += ui.line(1180, 185, 1180, 168) + ui.ground(1180, 160).replace('translate(1180,160)', 'translate(1180,168) scale(1,-1)');

    /* ---- AH4 President ---- */
    function office(x, id, rmu, live1, live2, live3, lvdb, txt) {
      var o = drop(x, id, 1, live1);
      o += '<rect class="box" x="' + (x - 75) + '" y="492" width="150" height="56" rx="3"/>' + ui.text(x - 70, 504, rmu.name.toUpperCase() + ' (GIS-12)', 'lbl-xs', 'start');
      o += ui.line(x, 490, x, 513, live1) + ui.cb(x, 525, 'RMU.' + rmu.id + '_AH3', 'QF11', { left: true, title: rmu.name + ' AH3 transformer feeder VCB' }) + ui.line(x, 537, x, 575, live2);
      o += ui.val(x + 16, 529, 'RMU.' + rmu.id + '.I_L1', 'val');
      o += ui.tx(x, 600, '630kVA 11/0.4kV', 'Dyn11 ONAN', live2, live3);
      o += ui.line(x, 625, x, 640, live3) + ui.cb(x, 652, 'LV.' + lvdb, 'ACB 1000A', { left: true, title: txt + ' incomer ACB' }) + ui.line(x, 664, x, 680, live3);
      o += ui.meter(x + 40, 652, 'LV.' + lvdb);
      o += '<line class="ln" data-live="' + live3 + '" x1="' + (x - 70) + '" y1="680" x2="' + (x + 70) + '" y2="680" stroke-width="4"/>';
      [-55, -18, 18, 55].forEach(function (dx) { o += ui.line(x + dx, 680, x + dx, 690, live3) + ui.load(x + dx, 690, live3); });
      o += ui.text(x, 715, txt, 'lbl-s');
      o += ui.val(x + 60, 640, 'LV.' + lvdb + '.P', 'val-b');
      return o;
    }
    s += office(300, 'AH4', C.rmus[0], 'presHv', 'presTx', 'presLv', 'LVDB_PRES', '10-way LVDB · Office of the President');
    s += office(960, 'AH6', C.rmus[1], 'pmHv', 'pmTx', 'pmLv', 'LVDB_PM', '10-way LVDB · Office of the Prime Minister');

    /* ---- AH5 SAT ---- */
    s += drop(630, 'AH5', 1, 'auxHv');
    s += '<rect x="623" y="495" width="14" height="26" fill="#fff" stroke="#4c5a67" stroke-width="1.6"/>' + ui.text(645, 512, 'XRNT-3A', 'lbl-xs', 'start');
    s += ui.line(630, 521, 630, 560, 'auxTx') + ui.tx(630, 585, 'SAT 100kVA', '11/0.4kV', 'auxTx', 'auxLv');
    s += ui.line(630, 610, 630, 628, 'auxLv') + ui.cb(630, 640, 'LV.AUXPNL', 'MCCB 200A', { left: true, title: 'Auxiliary panel incomer' }) + ui.line(630, 652, 630, 680, 'auxLv');
    s += '<line class="ln" data-live="auxLv" x1="580" y1="680" x2="680" y2="680" stroke-width="4"/>';
    [-35, 0, 35].forEach(function (dx) { s += ui.line(630 + dx, 680, 630 + dx, 690, 'auxLv') + ui.load(630 + dx, 690, 'auxLv'); });
    s += ui.text(630, 715, 'Plant auxiliaries · UPS · HVAC', 'lbl-s') + ui.val(675, 640, 'LV.AUXPNL.P', 'val-b');

    /* ---- AH7 spare ---- */
    s += drop(1160, 'AH7', 1, 'GIS.BUS.LIVE&GIS.AH7.CB_CLOSED');
    s += ui.text(1160, 510, 'SPARE FEEDER', 'lbl-s');

    /* note (as on site DHYBRID screens) */
    s += '<rect class="note-box" x="14" y="560" width="200" height="140" rx="3"/>';
    ['NOTE:', 'Breaker status is provided via', 'communication from the protection', 'relays, PLCs and blue\'Log.', 'Communication disturbances may', 'freeze indications (shown ###).', 'ALWAYS physically verify breaker', 'and earth-switch position before', 'interacting with the system.'].forEach(function (l, i) {
      s += ui.text(22, 578 + i * 14, l, i ? 'lbl-xs' : 'lbl-s', 'start');
    });
    s += '</svg>';
    return s;
  }

  function kpi(label, id, wide) {
    var t = T[id];
    return '<div class="kpi' + (wide ? ' wide' : '') + '"><div class="kl">' + label + '</div><div><span class="kv2" data-tag="' + id + '" data-nounit>' + ui.fmt(id, true) + '</span> <span class="ku">' + (t.unit || '') + '</span></div></div>';
  }

  S.screens.overview = {
    title: 'Plant Overview',
    render: function () {
      return '<div class="grid g-side"><div>' + svgSld() + '</div><aside>' +
        '<div class="kpis">' +
        kpi('Plant load', 'PPC.PLANT.P_LOAD') + kpi('PV output', 'PPC.PLANT.P_PV') +
        kpi('BESS (+dis/−chg)', 'PPC.PLANT.P_BESS') + kpi('Diesel output', 'PPC.PLANT.P_DG') +
        kpi('BESS SOC', 'BESS.SYS.SOC') + kpi('Renewable share', 'PPC.PLANT.RE_SHARE') +
        kpi('PV available', 'PPC.PLANT.P_PV_AVAIL') + kpi('PV curtailment', 'PPC.PLANT.CURTAIL') +
        kpi('PV energy today', 'PPC.PLANT.E_PV_DAY') + kpi('Load energy today', 'PPC.PLANT.E_LOAD_DAY') +
        kpi('DG energy today', 'PPC.PLANT.E_DG_DAY') + kpi('Diesel saved today', 'PPC.PLANT.FUEL_SAVED') +
        kpi('Irradiance (POA)', 'MET.WS.IRR_POA') + kpi('Ambient temp.', 'MET.WS.T_AMB') +
        '</div>' +
        ui.card('Energy sources', ui.lamp('GIS.BUS.LIVE', '11kV busbar energised', { kind: 'healthy' }) + ui.lamp('BESS.SYS.GRID_FORMING', 'BESS grid-forming') +
          ui.lamp('DG.DG1.RUNNING', 'DG1 running') + ui.lamp('DG.DG2.RUNNING', 'DG2 running') + ui.lamp('PPC.CTRL.LOAD_SHED', 'Load shedding active') +
          '<div class="kv"><span class="k">PPC state</span><span class="v" id="ov-ppc"></span></div>', 'dark') +
        '</aside></div>';
    },
    update: function (root) { var e = root.querySelector('#ov-ppc'); if (e) e.textContent = S.sim.stateNames[S.sim.state]; }
  };
  /* KPI cards are inside .card markup - give them a top margin */

  /* ---------------- Plant information ---------------- */
  function rows(arr) { return arr.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (i ? '' : ' style="width:38%;color:var(--ink-2)"') + '>' + ui.esc(c) + '</td>'; }).join('') + '</tr>'; }).join(''); }

  S.screens.info = {
    title: 'Plant Information',
    render: function () {
      var site = rows([['Project', 'Solarization Villa Somalia'], ['Client', C.site.client], ['EPC contractor', C.site.contractor], ['Drawing set', C.site.drawing + ' (rev. 05-10-2026)'],
        ['Operating concept', C.site.operation], ['Location', 'Villa Somalia, Mogadishu (UTC+3)']]);
      var pv = rows([['DC capacity', '1,516.32 kWp (2106 × Jinko 720 Wp mono)'], ['AC capacity', '1.4 MW (4 × Sungrow SG350HX)'], ['Strings', '81 × 26 modules (NB01 21, NB02-04 20)'],
        ['String cable', 'H1Z2Z2-K 1.5kV 1×4mm²'], ['Inverter AC cable', 'ZC-YJLHV22 1.8/3kV 3×185mm² / 3×240mm² Al'], ['Step-up', '1.5MVA 11/0.8kV Dd0, LV ACB 1250A 20kA'], ['Monitoring', 'blue\'Log XM 5000 + PLC box (RS485)']]);
      var bess = rows([['Energy', '3.34 MWh nominal, LFP 3.2V 314Ah, 416S8P'], ['PCS', '2 × PCS units, 400A AC breakers each'], ['Step-up', '1MVA 11/0.69kV Dd0, LV ACB 1000A 15kA'], ['Operating mode', 'Grid-forming (VSG) master of the islanded network']]);
      var dg = rows([['DG1', '550 kVA, Q1 ACB 800A 65kA'], ['DG2', '660 kVA, Q2 ACB 1000A 66kA'], ['Step-up', '1.5MVA 11/0.4kV Dyn11 Uk 6%'], ['Cable', '2 × 240mm² Cu/XLPE/PVC 1.8/3kV per DG']]);
      var mv = rows([['GIS combiner', '8 panels AH1-AH8, 11kV 1250A busbar, VCB 630A 31.5kA, 3-pos switch 630A 20kA'], ['Feeders', 'AH1 DG · AH2 PV · AH3 BESS · AH4 President · AH5 SAT · AH6 P.M. · AH7 spare · AH8 NECR'],
        ['Neutral earthing', 'Earthing TX + NER 63.5 Ω, 100 A, 10 s'], ['Remote RMUs', '2 × GIS-12 (AH1 incomer, AH2 outgoing, AH3 VCB + ST260E relay) + 630kVA 11/0.4kV Dyn11 ONAN'],
        ['LV distribution', '2 × 10-way LVDB (ACB 1000A, MCCB 250A 36kA ways)'], ['Station aux', 'SAT 100kVA via XRNT-3A fuse, 200A to aux panel']]);
      return '<h2 class="scr-t">Plant information <small>derived from drawing set ' + C.site.drawing + '</small></h2>' +
        '<div class="grid g2">' + ui.card('Project', '<table class="tbl">' + site + '</table>') + ui.card('11 kV system', '<table class="tbl">' + mv + '</table>') +
        ui.card('PV plant', '<table class="tbl">' + pv + '</table>') + ui.card('Battery energy storage', '<table class="tbl">' + bess + '</table>') +
        ui.card('Diesel generators', '<table class="tbl">' + dg + '</table>') +
        ui.card('I/O summary', '<table class="tbl" id="io-sum"></table>') + '</div>';
    },
    init: function (root) {
      var c = {}, a = {};
      S.tagOrder.forEach(function (id) { var t = T[id]; c[t.type] = (c[t.type] || 0) + 1; a[t.area] = a[t.area] || { AI: 0, DI: 0, AO: 0, DO: 0 }; a[t.area][t.type]++; });
      var h = '<tr><th>Area</th><th>AI</th><th>DI</th><th>AO</th><th>DO</th></tr>';
      Object.keys(a).forEach(function (k) { h += '<tr><td>' + S.areaNames[k] + '</td><td class="num">' + a[k].AI + '</td><td class="num">' + a[k].DI + '</td><td class="num">' + a[k].AO + '</td><td class="num">' + a[k].DO + '</td></tr>'; });
      h += '<tr><th>Total ' + S.tagOrder.length + ' points</th><th>' + c.AI + '</th><th>' + c.DI + '</th><th>' + (c.AO || 0) + '</th><th>' + (c.DO || 0) + '</th></tr>';
      root.querySelector('#io-sum').innerHTML = h;
    }
  };
})(SCADA);
