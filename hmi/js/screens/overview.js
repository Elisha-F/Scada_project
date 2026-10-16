/* Plant overview: live single-line diagram on the submitted tags */
(function (S) {
  var ui = S.ui, T = S.tags, C = S.config;
  function v(id) { var t = T[id]; return t && t.q === 'GOOD' ? t.v : 0; }

  /* energised sections */
  var L = S.live;
  L.bus = function () { return v('EMS-U-BUS') > 9; };
  L.dgRun = function () { return v('DG1-RUN') && v('DG1-GCB-CLSD') || v('DG2-RUN') && v('DG2-GCB-CLSD'); };
  L.dgHv0 = function () { return L.bus() && v('AH1-CB-CLSD'); };
  L.dgLv = function () { return L.dgRun() || L.dgHv0() && v('GEN-ACB-CLSD'); };
  L.dgHv = function () { return L.dgHv0() || L.dgRun() && v('GEN-ACB-CLSD'); };
  L.pvHv = function () { return L.bus() && v('AH2-CB-CLSD'); };
  L.pvLv = function () { return L.pvHv() && v('PV-ACB-CLSD'); };
  L.bessHv0 = function () { return L.bus() && v('AH3-CB-CLSD'); };
  L.bessLv = function () { return L.pcsRun() && v('BESS-ACB-CLSD') || L.bessHv0() && v('BESS-ACB-CLSD'); };
  L.bessHv = function () { return L.bessHv0() || L.bessLv() && v('AH3-CB-CLSD'); };
  L.necr = function () { return L.bus() && v('AH8-CB-CLSD'); };
  L.auxHv = function () { return L.bus() && v('AH5-CB-CLSD'); };
  L.auxTx = function () { return L.auxHv() && !v('T-AUX-FUSE'); };
  L.auxLv = function () { return L.auxTx() && v('AUXLV-INC-CLSD'); };
  ['PRS', 'PMS'].forEach(function (k, i) {
    var ah = i ? 'AH6' : 'AH4';
    L[k + 'cable'] = function () { return L.bus() && v(ah + '-CB-CLSD'); };
    L[k + 'rmu'] = function () { return L[k + 'cable']() && v(k + '-RS1-CLSD'); };
    L[k + 'tx'] = function () { return L[k + 'rmu']() && v(k + '-CB-CLSD'); };
    L[k + 'lv'] = function () { return L[k + 'tx']() && v(k + '-LV-INC-CLSD'); };
  });

  /* a GIS panel: bus tie, earth switch, breaker (dir -1 up, +1 down) */
  function drop(x, id, dir, live, title) {
    var y0 = 380;
    var s = ui.line(x, y0, x, y0 + dir * 55, 'bus');
    s += ui.es(x + 3, y0 + dir * 30, id + '-ES-CLSD');
    s += ui.cb(x, y0 + dir * 66, id, id, { left: true });
    s += ui.line(x, y0 + dir * 77, x, y0 + dir * 110, live);
    if (T[id + '-P']) s += ui.val(x + 16, y0 + dir * 66 - 3, id + '-P', 'val-b') + ui.val(x + 16, y0 + dir * 66 + 11, id + '-I-L1', 'val');
    return s;
  }

  function sld() {
    var s = '<svg class="sld" viewBox="0 0 1320 720" preserveAspectRatio="xMidYMid meet">';
    s += '<line class="ln bus" data-live="bus" x1="60" y1="380" x2="1270" y2="380" stroke-width="7"/>';
    s += ui.text(340, 402, '11 kV SWITCHBOARD (GIS COMBINER PANEL) · 1250 A', 'lbl', 'start');
    s += ui.val(64, 402, 'EMS-U-BUS', 'val-b') + ui.val(140, 402, 'EMS-F-BUS', 'val-b');

    /* AH1 generators */
    s += drop(170, 'AH1', -1, 'dgHv');
    s += ui.tx(170, 255, 'DG step-up TX', '1.5 MVA 11/0.4 kV', 'dgHv', 'dgLv');
    s += ui.line(170, 230, 170, 202, 'dgLv') + ui.cb(170, 190, 'GEN-ACB', 'LV ACB', { left: true }) + ui.line(170, 178, 170, 160, 'dgLv');
    s += '<line class="ln" data-live="dgLv" x1="100" y1="160" x2="240" y2="160" stroke-width="4"/>';
    C.generators.forEach(function (g, i) {
      var x = i ? 230 : 110;
      s += ui.line(x, 160, x, 132, 'dgLv') + ui.cb(x, 120, g.id + '-GCB', i ? 'GCB' : 'GCB', { left: !i });
      s += ui.line(x, 108, x, 90, g.id + '-RUN') + ui.gen(x, 70, g.id);
      s += ui.val(i ? x + 24 : x - 24, 66, g.id + '-P', 'val-b', i ? 'start' : 'end');
      s += ui.text(i ? x + 24 : x - 24, 80, g.kva + ' kVA', 'lbl-xs', i ? 'start' : 'end');
    });

    /* AH2 PV */
    s += drop(470, 'AH2', -1, 'pvHv');
    s += ui.tx(470, 255, 'Inverter TX', '1.5 MVA 11/0.8 kV', 'pvHv', 'pvLv');
    s += ui.line(470, 230, 470, 202, 'pvLv') + ui.cb(470, 190, 'PV-ACB', 'ACB 1250 A', { left: true }) + ui.line(470, 178, 470, 160, 'pvLv');
    s += '<line class="ln" data-live="pvLv" x1="355" y1="160" x2="585" y2="160" stroke-width="4"/>';
    C.pv.inverters.forEach(function (inv, i) {
      var x = 365 + i * 72;
      s += ui.line(x, 160, x, 100, 'pvLv&!' + inv.tag + '-MCCB-TRIP') + ui.inv(x, 78, inv.tag);
      s += ui.val(x, 40, inv.tag + '-P', 'val', 'middle');
    });
    s += ui.text(470, 18, '1,516 kWp · 4 × SG350HX', 'lbl-xs');
    s += ui.line(585, 160, 630, 160, 'pvLv', 2) + ui.line(630, 160, 630, 176, 'pvLv', 2) +
      '<g class="clickable" data-fp="go" data-p="comms"><rect x="610" y="176" width="40" height="22" rx="3" fill="#f3eefb" stroke="#7a4fc0" stroke-width="1.5"/>' +
      ui.text(630, 191, 'PLC', 'lbl-s') + '</g>' + ui.text(630, 212, 'PLC box', 'lbl-xs') + ui.text(630, 223, '→ Ethernet', 'lbl-xs');

    /* AH3 battery */
    s += drop(820, 'AH3', -1, 'bessHv');
    s += ui.tx(820, 255, 'BESS TX', '1 MVA 11/0.69 kV', 'bessHv', 'bessLv');
    s += ui.line(820, 230, 820, 202, 'bessLv') + ui.cb(820, 190, 'BESS-ACB', 'ACB 1000 A', { left: true }) + ui.line(820, 178, 820, 122, 'bessLv');
    s += ui.pcs(820, 100, 'PCS') + ui.poly('820,80 820,50 905,50', 'pcsRun');
    s += '<rect class="boxf" x="905" y="14" width="210" height="160" rx="4"/><rect class="hdr-box" x="905" y="14" width="210" height="20" rx="4"/>' + ui.text(1010, 28, 'BATTERY · 3,340 kWh', 'hdr-txt');
    s += ui.battery(920, 48, 46, 110);
    [['BESS-SOC', 'SOC'], ['BESS-P', 'P +dis'], ['BESS-T-CELL-MAX', 'T cell'], ['BESS-PCS-STATE', 'PCS'], ['BESS-SOH', 'SOH']].forEach(function (x, i) {
      s += ui.val(980, 66 + i * 20, x[0], i === 0 || i === 1 ? 'val-b' : 'val') + ui.text(1108, 66 + i * 20, x[1], 'lbl-xs', 'end');
    });

    /* AH8 neutral earthing */
    s += drop(1180, 'AH8', -1, 'necr');
    s += '<g transform="translate(1180,255)"><circle class="tx" data-live="necr" r="16"/><text class="lbl-s" x="0" y="5" text-anchor="middle">Z</text></g>' + ui.text(1202, 252, 'Earthing TX', 'lbl-xs', 'start');
    s += ui.line(1180, 239, 1180, 215, 'necr') + '<rect x="1173" y="185" width="14" height="30" fill="#fff" stroke="#4c5a67" stroke-width="1.6"/>';
    s += ui.text(1202, 198, 'NER 63.5 Ω · 100 A · 10 s', 'lbl-xs', 'start');
    s += '<g data-di="AH8-NER-EF" data-kind="alarm" class="vp"><circle cx="1206" cy="212" r="5" fill="#fff" stroke="#4c5a67"/></g>' + ui.text(1216, 216, 'earth fault', 'lbl-xs', 'start');
    s += ui.line(1180, 185, 1180, 168) + ui.ground(1180, 160).replace('translate(1180,160)', 'translate(1180,168) scale(1,-1)');

    /* office stations */
    function office(x, ah, k, txt) {
      var o = drop(x, ah, 1, k + 'cable');
      o += '<rect class="box" x="' + (x - 75) + '" y="492" width="150" height="56" rx="3"/>' + ui.text(x - 70, 504, txt.toUpperCase() + ' RMU', 'lbl-xs', 'start');
      o += ui.line(x, 490, x, 507, k + 'cable') + ui.cb(x, 515, k + '-RS1', 'RS1', { left: true, s: 16 }) + ui.line(x, 523, x, 529, k + 'rmu');
      o += ui.cb(x, 539, k + '-CB', 'CB', { left: true, s: 16 }) + ui.val(x + 16, 543, k + '-RLY-I-L1', 'val') + ui.line(x, 547, x, 575, k + 'tx');
      o += ui.tx(x, 600, '630 kVA 11/0.4 kV', 'ONAN', k + 'tx', k + 'tx');
      o += ui.line(x, 625, x, 640, k + 'lv') + ui.cb(x, 652, k + '-LV-INC', 'ACB 1000 A', { left: true }) + ui.line(x, 664, x, 680, k + 'lv');
      o += ui.meter(x + 40, 652, k + '-LV') + ui.val(x + 60, 640, k + '-LV-P', 'val-b');
      o += '<line class="ln" data-live="' + k + 'lv" x1="' + (x - 70) + '" y1="680" x2="' + (x + 70) + '" y2="680" stroke-width="4"/>';
      [-55, -18, 18, 55].forEach(function (dx) { o += ui.line(x + dx, 680, x + dx, 690, k + 'lv') + ui.load(x + dx, 690, k + 'lv'); });
      o += ui.text(x, 715, '10-way LVDB · Office of the ' + txt, 'lbl-s');
      return o;
    }
    s += office(300, 'AH4', 'PRS', 'President');
    s += office(960, 'AH6', 'PMS', 'Prime Minister');

    /* AH5 auxiliary transformer */
    s += drop(630, 'AH5', 1, 'auxHv');
    s += '<rect x="623" y="495" width="14" height="26" fill="#fff" stroke="#4c5a67" stroke-width="1.6"/>' + ui.text(645, 512, 'XRNT-3A', 'lbl-xs', 'start');
    s += '<g data-di="T-AUX-FUSE" data-kind="alarm" class="vp"><circle cx="652" cy="526" r="5" fill="#fff" stroke="#4c5a67"/></g>' + ui.text(662, 530, 'fuse', 'lbl-xs', 'start');
    s += ui.line(630, 521, 630, 560, 'auxTx') + ui.tx(630, 585, 'Aux TX 100 kVA', '11/0.4 kV', 'auxTx', 'auxLv');
    s += ui.line(630, 610, 630, 628, 'auxLv') + ui.cb(630, 640, 'AUXLV-INC', 'Incomer', { left: true }) + ui.line(630, 652, 630, 680, 'auxLv');
    s += ui.meter(670, 640, 'AUXLV') + ui.val(690, 628, 'AUXLV-P', 'val-b');
    s += '<line class="ln" data-live="auxLv" x1="580" y1="680" x2="680" y2="680" stroke-width="4"/>';
    [-35, 0, 35].forEach(function (dx) { s += ui.line(630 + dx, 680, 630 + dx, 690, 'auxLv') + ui.load(630 + dx, 690, 'auxLv'); });
    s += ui.text(630, 715, 'Auxiliary LV board', 'lbl-s');

    /* AH7 spare */
    s += drop(1160, 'AH7', 1, 'bus&AH7-CB-CLSD') + ui.text(1160, 510, 'SPARE FEEDER', 'lbl-s');

    s += '<rect class="note-box" x="14" y="560" width="200" height="140" rx="3"/>';
    ['NOTE:', 'Positions come from hardwired', 'contacts and relay communication.', 'A value that stops updating is', 'shown as ### and alarmed.', 'ALWAYS check the breaker', 'position physically before', 'working on equipment.'].forEach(function (l, i) {
      s += ui.text(22, 578 + i * 15, l, i ? 'lbl-xs' : 'lbl-s', 'start');
    });
    return s + '</svg>';
  }

  function kpi(label, id) {
    var t = T[id];
    return '<div class="kpi"><div class="kl">' + label + '</div><div><span class="kv2" data-tag="' + id + '" data-nounit>' + ui.fmt(id, true) + '</span> <span class="ku">' + (t.unit || '') + '</span></div><div class="ktag">' + id + '</div></div>';
  }

  S.screens.overview = {
    title: 'Plant overview',
    render: function () {
      return '<div class="grid g-side"><div>' + sld() + '</div><aside><div class="kpis">' +
        kpi('Load', 'EMS-P-LOAD') + kpi('PV', 'EMS-P-PV') + kpi('Battery (+dis/−chg)', 'EMS-P-BESS') + kpi('Generators', 'EMS-P-GEN') +
        kpi('Battery SOC', 'BESS-SOC') + kpi('Bus frequency', 'EMS-F-BUS') + kpi('Irradiance', 'WS-IRR-POA') + kpi('Ambient', 'WS-T-AMB') +
        '</div>' + ui.card('Energy management', '<div class="kv"><span class="k">EMS state</span><span class="v" data-tag="EMS-STATE"></span></div>' +
          '<div class="kv"><span class="k">EMS mode</span><span class="v" data-tag="EMS-MODE"></span></div>' +
          ui.lamp('EMS-GEN-START-REQ', 'Generator start requested') + ui.lamp('EMS-PV-CURT', 'PV curtailment active') + ui.lamp('EMS-ALM', 'EMS summary alarm') +
          ui.lamp('FIRE-ALM', 'Battery fire alarm') + ui.lamp('ESTOP-SWR', 'Emergency stop, switchroom'), 'dark') + '</aside></div>';
    }
  };
})(SCADA);
