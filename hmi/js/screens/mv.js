/* 11kV GIS combiner panel, protection overview and remote RMUs */
(function (S) {
  var ui = S.ui, T = S.tags, C = S.config;

  function panelSvg(p) {
    var pre = 'GIS.' + p.id, out = 'GIS.BUS.LIVE&' + pre + '.CB_CLOSED';
    var s = '<svg viewBox="0 0 150 150">';
    s += '<line class="ln" data-live="bus" x1="0" y1="10" x2="150" y2="10" stroke-width="6"/>';
    s += ui.line(75, 10, 75, 28, 'bus') + ui.ds(75, 40, pre, 'bus') + ui.line(75, 57, 75, 69, 'bus');
    s += ui.cb(75, 80, pre, p.qf, { title: p.id + ' ' + p.usage });
    s += ui.line(75, 91, 75, 130, out) + '<polygon points="69,130 81,130 75,140" class="loadarrow" data-live="' + out + '"/>';
    s += ui.text(18, 44, p.ql, 'lbl-xs', 'start');
    s += '<g class="vp" data-di="' + pre + '.VPIS" data-kind="state"><circle cx="118" cy="110" r="6" fill="#fff" stroke="#4c5a67"/></g>' + ui.text(118, 128, 'VPIS', 'lbl-xs');
    s += '</svg>';
    return s;
  }

  S.screens.gis = {
    title: '11kV GIS Combiner Panel',
    render: function () {
      var h = '<h2 class="scr-t">11 kV GIS combiner panel <small>8 panels · busbar 1250 A · VCB 630 A 31.5 kA · ' + C.gis.relay + '</small>' +
        '<span style="margin-left:auto">Bus: <b data-tag="GIS.BUS.U"></b> · <b data-tag="GIS.BUS.F"></b></span></h2><div class="panelrow">';
      C.gis.panels.forEach(function (p) {
        var pre = 'GIS.' + p.id;
        h += '<div class="gisp"><header>' + p.id + '<small>' + p.usage + '</small></header>' + panelSvg(p) +
          '<div class="gb"><div style="text-align:center;margin-bottom:4px">' + ui.cbState(pre) + '</div>' +
          ui.kv('P', pre + '.P') + ui.kv('Q', pre + '.Q') + ui.kv('I L1', pre + '.I_L1') + ui.kv('I L2', pre + '.I_L2') + ui.kv('I L3', pre + '.I_L3') +
          ui.kv('U L12', pre + '.U_L12') + ui.kv('PF', pre + '.PF') + ui.kv('E imp', pre + '.E_IMP') +
          '<h4>Status</h4>' + ui.lamp(pre + '.CB_SPRING', 'Spring charged') + ui.lamp(pre + '.LR_REMOTE', 'Remote') + ui.lamp(pre + '.ES_EARTHED', 'Earthed', { kind: 'state' }) +
          ui.lamp(pre + '.RLY_HEALTHY', 'Relay healthy') + ui.lamp(pre + '.SF6_LOW', 'SF6 low') + ui.lamp(pre + '.TCS_FAIL', 'TCS fail') + ui.lamp(pre + '.LOCKOUT_86', 'Lockout 86') +
          '<div class="btnrow">' + ui.btn('OPEN', pre, 'open', 'b-green b-small2') + ui.btn('CLOSE', pre, 'close', 'b-red') + ui.btn('RST', pre, 'reset', 'b-gray') + '</div>' +
          '<p class="note">CT ' + ui.esc(p.ct) + '</p></div></div>';
      });
      return h + '</div><p class="note">Click a breaker symbol for its faceplate (interlocks, measurements). 3-position switches QL11-QL18 are status-only in SCADA; the drawing labels both AH7 and AH8 as QL17/QF17 - AH8 is shown here as QL18/QF18 pending drawing correction.</p>';
    }
  };

  S.screens.prot = {
    title: 'Protection & NECR',
    render: function () {
      var cols = [['PROT_50', '50/51'], ['PROT_50N', '50N/51N'], ['PROT_50G', '51G SEF'], ['PROT_46', '46'], ['PROT_27', '27'], ['PROT_59', '59'], ['PROT_81', '81'], ['PROT_32', '32'], ['PROT_64', '64 NER'],
        ['LOCKOUT_86', '86'], ['CB_TRIPPED', 'CB trip'], ['RLY_HEALTHY', 'Relay OK'], ['TCS_FAIL', 'TCS'], ['SF6_LOW', 'SF6 low'], ['SF6_LOLO', 'SF6 LL'], ['SPD_OPER', 'SPD'], ['MCB_TRIP', 'Aux MCB']];
      var h = '<table class="tbl"><tr><th>Panel</th>' + cols.map(function (c) { return '<th style="text-align:center">' + c[1] + '</th>'; }).join('') + '<th>Reset</th></tr>';
      C.gis.panels.forEach(function (p) {
        h += '<tr><td><b>' + p.id + '</b> ' + p.usage + '</td>' + cols.map(function (c) {
          var id = 'GIS.' + p.id + '.' + c[0];
          return '<td style="text-align:center">' + (T[id] ? '<span class="lamp" style="justify-content:center" data-di="' + id + '" data-kind="' + (c[0] === 'RLY_HEALTHY' ? 'healthy' : 'alarm') + '"><i></i></span>' : '<span class="muted">-</span>') + '</td>';
        }).join('') + '<td>' + ui.btn('RESET', 'GIS.' + p.id, 'reset', 'b-gray') + '</td></tr>';
      });
      h += '</table>';
      var necr = ui.kv('NER current', 'GIS.NECR.I_NER') + ui.kv('NER temperature', 'GIS.NECR.T_NER') + '<div class="kv"><span class="k">AH8 VCB</span>' + ui.cbState('GIS.AH8') + '</div>' +
        ui.lamp('GIS.AH8.PROT_64', 'NER over-temperature / standby EF') +
        '<p class="note">NER 63.5 Ω limits 11kV earth-fault current to 100 A for 10 s (11 kV/√3 ÷ 100 A). The 11kV system is unearthed if AH8 is open - an alarm and close-interlock for AH3/AH1 is recommended.</p>';
      var dc = ui.kv('110VDC bus voltage', 'GIS.DC.U_DC') + ui.lamp('GIS.DC.CHG_FAIL') + ui.lamp('GIS.DC.EARTH_FLT') + ui.kv('GIS room temperature', 'GIS.ROOM.T_ROOM') + ui.lamp('GIS.ROOM.DOOR');
      return '<h2 class="scr-t">Protection overview <small>feeder protection relays (IEC 61850) · NECR · DC tripping supply</small></h2>' +
        ui.card('Protection function status per panel', '<div style="overflow-x:auto">' + h + '</div>') +
        '<div class="grid g3" style="margin-top:12px">' + ui.card('Neutral earthing (NECR · AH8)', necr) + ui.card('Switchgear DC system', dc) +
        ui.card('Bus measurements', ui.kv('Bus voltage', 'GIS.BUS.U') + ui.kv('Bus frequency', 'GIS.BUS.F') + ui.lamp('GIS.BUS.LIVE', 'Busbar energised', { kind: 'healthy' }) +
          '<p class="note">Protection settings (pickup, TMS, curves) shall be read from relays by the engineering workstation and are not editable from the operator HMI.</p>') + '</div>';
    }
  };

  function rmuSvg(r, feeder) {
    var pre = 'RMU.' + r.id, inLive = 'GIS.BUS.LIVE&GIS.' + feeder + '.CB_CLOSED', txLive = inLive + '&' + pre + '_AH3.CB_CLOSED';
    var s = '<svg class="sld" viewBox="0 0 520 300">';
    s += ui.text(14, 20, 'from 11kV GIS ' + feeder, 'lbl-xs', 'start') + ui.line(90, 28, 90, 70, inLive);
    s += '<line class="ln" data-live="' + inLive + '" x1="60" y1="70" x2="400" y2="70" stroke-width="5"/>';
    // AH1 incomer LBS
    s += '<g class="sw" data-di="' + pre + '.AH1_CLOSED" data-kind="state"><rect x="80" y="100" width="20" height="20" fill="#fff" stroke="#4c5a67"/></g>' + ui.line(90, 70, 90, 100, inLive);
    s += ui.text(90, 140, 'AH1 INCOMER', 'lbl-xs') + ui.text(90, 152, 'QL11 LBS', 'lbl-xs');
    // AH2 outgoing
    s += ui.line(210, 70, 210, 100, inLive) + '<g class="sw" data-di="' + pre + '.AH2_CLOSED" data-kind="state"><rect x="200" y="100" width="20" height="20" fill="#fff" stroke="#4c5a67"/></g>';
    s += ui.text(210, 140, 'AH2 OUTGOING', 'lbl-xs') + ui.text(210, 152, 'QL12 (earthed)', 'lbl-xs');
    // AH3 VCB
    s += ui.line(330, 70, 330, 98, inLive) + ui.cb(330, 110, pre + '_AH3', 'QF11', { title: r.name + ' AH3 VCB' }) + ui.line(330, 122, 330, 195, txLive);
    s += ui.text(375, 150, 'CT11 200/1A', 'lbl-xs', 'start') + ui.text(375, 162, 'ST260E relay', 'lbl-xs', 'start') + ui.val(375, 176, pre + '.I_L1', 'val');
    s += ui.tx(330, 220, '630kVA 11/0.4kV', 'Dyn11 Uk 6%', txLive, txLive);
    s += ui.line(330, 245, 330, 290, txLive) + ui.text(345, 285, 'to LVDB ACB 1000A', 'lbl-xs', 'start');
    s += '<rect class="box" x="50" y="80" width="440" height="100" rx="3"/>' + ui.text(470, 96, 'GIS-12', 'lbl-xs', 'end');
    s += '</svg>';
    return s;
  }

  S.screens.rmu = {
    title: 'Remote RMUs',
    render: function () {
      var h = '<h2 class="scr-t">Transformer stations at the President and Prime Minister offices <small>GIS-12 RMU + 630 kVA ONAN, linked to plant SCADA by single-mode fibre</small></h2><div class="grid g2">';
      C.rmus.forEach(function (r, i) {
        var pre = 'RMU.' + r.id, tx = 'TX.' + r.tx;
        h += ui.card(r.name, rmuSvg(r, i ? 'AH6' : 'AH4') +
          '<div class="grid g3" style="margin-top:8px"><div><h4>Switchgear</h4>' + ui.lamp(pre + '.AH1_CLOSED', 'AH1 closed') + ui.lamp(pre + '.AH1_EARTHED', 'AH1 earthed') + ui.lamp(pre + '.AH2_EARTHED', 'AH2 earthed') +
          ui.lamp(pre + '.QK11_EARTHED', 'QK11 earthed') + ui.lamp(pre + '.VPIS_DX11', 'DX11 voltage') + ui.lamp(pre + '.VPIS_DX13', 'DX13 voltage') + ui.lamp(pre + '.SF6_LOW', 'SF6 low') + '</div>' +
          '<div><h4>Protection / UPS</h4>' + ui.lamp(pre + '.RLY_HEALTHY', 'ST260E healthy') + ui.lamp(pre + '.PROT_50', '50/51 trip') + ui.lamp(pre + '.PROT_50N', '50N/51N trip') +
          ui.lamp(pre + '_AH3.TCS_FAIL', 'TCS fail') + ui.lamp('AUX.' + (i ? 'UPS_RMUM' : 'UPS_RMUP') + '.ON_BATT', 'UPS on battery') + ui.lamp('AUX.' + (i ? 'UPS_RMUM' : 'UPS_RMUP') + '.FAULT', 'UPS fault') + ui.lamp(pre + '.COMM', 'Fibre link OK') + '</div>' +
          '<div><h4>Measurements</h4>' + ui.kv('I L1', pre + '.I_L1') + ui.kv('I L2', pre + '.I_L2') + ui.kv('I L3', pre + '.I_L3') + ui.kv('I residual', pre + '.I_N') +
          ui.kv('TX load', tx + '.LOAD') + ui.kv('TX oil temp', tx + '.T_OIL') + ui.kv('TX winding temp', tx + '.T_WDG') + '</div></div>' +
          '<div class="btnrow">' + ui.btn('OPEN QF11', pre + '_AH3', 'open', 'b-green') + ui.btn('CLOSE QF11', pre + '_AH3', 'close', 'b-red') + ui.btn('RESET', pre, 'reset', 'b-gray') + '</div>');
      });
      return h + '</div>';
    }
  };
})(SCADA);
