/* 11 kV switchboard (GIS combiner panel AH1-AH8) and the two office transformer stations */
(function (S) {
  var ui = S.ui, T = S.tags, C = S.config;

  function panelSvg(id) {
    var out = 'bus&' + id + '-CB-CLSD';
    return '<svg viewBox="0 0 150 140">' +
      '<line class="ln" data-live="bus" x1="0" y1="10" x2="150" y2="10" stroke-width="6"/>' + ui.line(75, 10, 75, 69, 'bus') +
      ui.es(78, 42, id + '-ES-CLSD') + ui.text(98, 46, 'ES', 'lbl-xs', 'start') +
      ui.cb(75, 80, id, '') + ui.line(75, 91, 75, 122, out) + '<polygon points="69,122 81,122 75,132" class="loadarrow" data-live="' + out + '"/></svg>';
  }

  S.screens.sw11 = {
    title: '11 kV switchboard',
    render: function () {
      var h = '<h2 class="scr-t">11 kV switchboard (GIS combiner panel) <small>relays over Modbus TCP · positions and alarms hardwired to the switchroom I/O drop</small>' +
        '<span style="margin-left:auto">Bus <b data-tag="EMS-U-BUS"></b> · <b data-tag="EMS-F-BUS"></b></span></h2><div class="panelrow">';
      C.gis.panels.forEach(function (p) {
        var k = p.id;
        h += '<div class="gisp"><header>' + k + '<small>' + p.usage + '</small></header>' + panelSvg(k) + '<div class="gb"><div style="text-align:center;margin-bottom:4px">' + ui.cbState(k) + '</div>';
        if (k === 'AH8') {
          h += '<h4>Neutral earthing</h4>' + ui.lamp('AH8-NER-EF', 'Earth fault current') + ui.lamp('AH8-NER-TEMP', 'Resistor temperature high') +
            '<h4>Panel</h4>' + ui.lamp('AH8-CB-TRIP', 'Tripped') + ui.lamp('AH8-ES-CLSD', 'Earth switch closed') + ui.lamp('AH8-GAS-LOW', 'Gas pressure low') + ui.lamp('AH8-AUX-OK', 'Supply healthy') +
            '<p class="note">No relay communication and no remote command in the I/O list. AH8 normally stays closed: it is the only earthing of the 11 kV system.</p>';
        } else {
          h += ui.kv('P', k + '-P') + ui.kv('Q', k + '-Q') + ui.kv('I L1', k + '-I-L1') + ui.kv('I L2', k + '-I-L2') + ui.kv('I L3', k + '-I-L3') + ui.kv('I earth', k + '-I-E') +
            ui.kv('U L1', k + '-U-L1') + ui.kv('PF', k + '-PF') + ui.kv('E import', k + '-E-IMP') +
            '<h4>Hardwired</h4>' + ui.lamp(k + '-CB-TRIP', 'Tripped') + ui.lamp(k + '-LR-REM', 'Remote') + ui.lamp(k + '-SPR-CHG', 'Spring charged') + ui.lamp(k + '-GAS-LOW', 'Gas pressure low') +
            ui.lamp(k + '-RLY-OK', 'Relay healthy') + ui.lamp(k + '-AUX-OK', 'Supply healthy') +
            '<h4>Relay</h4>' + ui.lamp(k + '-TRIP-50', '50/51 trip') + ui.lamp(k + '-TRIP-50N', '50N/51N trip') + ui.lamp(k + '-TRIP-27-59', '27/59 trip') + ui.lamp(k + '-TRIP-81', '81 trip') +
            (T[k + '-TRIP-51G'] ? ui.lamp(k + '-TRIP-51G', '51G trip') : '') + (T[k + '-TRIP-32'] ? ui.lamp(k + '-TRIP-32', '32 reverse power') : '') +
            ui.lamp(k + '-TCS-ALM', 'Trip circuit alarm') + ui.lamp(k + '-DREC', 'Disturbance record') +
            '<div class="btnrow">' + ui.btn('OPEN', k + '-CB-OPEN-CMD', 'b-green') + ui.btn('CLOSE', k + '-CB-CLOSE-CMD', 'b-red') + '</div>';
        }
        h += '</div></div>';
      });
      return h + '</div><p class="note">Protection trips are reset at the relay; a remote close stays blocked until then. Closing AH1 or AH3 is blocked while AH8 is open. Hover any signal for its tag.</p>';
    }
  };

  /* ---------------- office stations ---------------- */
  function stationSvg(k, name, ah) {
    var s = '<svg class="sld" viewBox="0 0 1000 300">';
    s += ui.text(20, 20, 'from 11 kV switchboard ' + ah, 'lbl-xs', 'start') + ui.line(60, 26, 60, 60, k + 'cable');
    s += '<line class="ln" data-live="' + k + 'cable" x1="40" y1="60" x2="360" y2="60" stroke-width="5"/>';
    s += '<rect class="box" x="30" y="40" width="345" height="200" rx="4"/>' + ui.text(40, 232, name.toUpperCase() + ' RMU (GIS-12) · ST260E', 'lbl-xs', 'start');
    // RS1 incomer
    s += ui.line(60, 60, 60, 98, k + 'cable') + ui.cb(60, 110, k + '-RS1', 'RS1', { left: false }) + ui.es(63, 140, k + '-RS1-ES') + ui.line(60, 122, 60, 170, k + 'cable');
    s += ui.text(60, 190, 'Ring switch 1', 'lbl-xs') + ui.text(60, 202, 'incomer', 'lbl-xs');
    // RS2 outgoing
    s += ui.line(170, 60, 170, 98, k + 'rmu') + ui.cb(170, 110, k + '-RS2', 'RS2') + ui.es(173, 140, k + '-RS2-ES') + ui.line(170, 122, 170, 170, k + 'rmu&' + k + '-RS2-CLSD');
    s += ui.text(170, 190, 'Ring switch 2', 'lbl-xs') + ui.text(170, 202, 'outgoing', 'lbl-xs');
    // transformer breaker
    s += ui.line(290, 60, 290, 98, k + 'rmu') + ui.cb(290, 110, k + '-CB', 'CB') + ui.es(293, 140, k + '-CB-ES') + ui.line(290, 122, 290, 250, k + 'tx');
    s += ui.val(310, 165, k + '-RLY-I-L1', 'val') + ui.text(310, 180, 'ST260E', 'lbl-xs', 'start');
    // transformer and LVDB
    s += ui.line(290, 250, 450, 250, k + 'tx') + '<circle class="tx" data-live="' + k + 'tx" cx="465" cy="250" r="15"/><circle class="tx" data-live="' + k + 'tx" cx="485" cy="250" r="15"/>';
    s += ui.text(475, 222, '630 kVA 11/0.4 kV', 'lbl-s') + ui.text(475, 285, 'Dyn11 ONAN', 'lbl-xs');
    s += ui.line(500, 250, 548, 250, k + 'lv') + ui.cb(560, 250, k + '-LV-INC', '') + ui.text(560, 280, 'LV incomer', 'lbl-xs') + ui.line(572, 250, 600, 250, k + 'lv');
    s += ui.meter(560, 205, k + '-LV') + ui.val(580, 200, k + '-LV-P', 'val-b');
    s += '<line class="ln" data-live="' + k + 'lv" x1="600" y1="40" x2="600" y2="290" stroke-width="5"/>';
    for (var f = 1; f <= 10; f++) {
      var ff = ('0' + f).slice(-2), y = 40 + (f - 0.5) * 25, live = k + 'lv&' + k + '-LV-F' + ff + '-CLSD';
      s += ui.line(600, y, 640, y, k + 'lv', 2) + ui.cb(652, y, k + '-LV-F' + ff, '', { s: 14 }) + ui.line(659, y, 720, y, live, 2) + ui.load(728, y - 6, live).replace('points="', 'transform="rotate(-90 728 ' + y + ')" points="');
      s += ui.text(745, y + 4, 'Way ' + f, 'lbl-xs', 'start');
    }
    s += ui.text(600, 30, '10-way LVDB', 'lbl-s');
    return s + '</svg>';
  }

  function stationScreen(k, name, ah) {
    var p = k + '-';
    return '<h2 class="scr-t">' + name + ' office transformer station <small>' + ah + ' → RMU (ST260E over Modbus RTU via the island serial master) → 630 kVA → LVDB (PM5560 over Modbus TCP) · hardwired to the station Edge I/O island on the fibre ring</small></h2>' +
      ui.card('Single line', stationSvg(k, name, ah)) + '<div style="height:12px"></div><div class="grid g4">' +
      ui.card('RMU', ui.lamp(p + 'CB-TRIP', 'Transformer breaker tripped') + ui.lamp(p + 'FPI', 'Fault passage indicator') + ui.lamp(p + 'GAS-LOW', 'Gas pressure low') + ui.lamp(p + 'LR-REM', 'Remote') +
        ui.lamp(p + 'RLY-HEALTHY', 'ST260E healthy') + ui.lamp(p + 'RLY-TRIP-50', 'Overcurrent trip') + ui.lamp(p + 'RLY-TRIP-50N', 'Earth fault trip') +
        ui.kv('I L1', p + 'RLY-I-L1') + ui.kv('I L2', p + 'RLY-I-L2') + ui.kv('I L3', p + 'RLY-I-L3') + ui.kv('I earth', p + 'RLY-I-E') +
        '<div class="btnrow">' + ui.btn('RS1 OPEN', p + 'RS1-OPEN-CMD', 'b-green') + ui.btn('RS1 CLOSE', p + 'RS1-CLOSE-CMD', 'b-red') + '</div>' +
        '<div class="btnrow">' + ui.btn('RS2 OPEN', p + 'RS2-OPEN-CMD', 'b-green') + ui.btn('RS2 CLOSE', p + 'RS2-CLOSE-CMD', 'b-red') + '</div>' +
        '<div class="btnrow">' + ui.btn('CB OPEN', p + 'CB-OPEN-CMD', 'b-green') + ui.btn('CB CLOSE', p + 'CB-CLOSE-CMD', 'b-red') + '</div>') +
      ui.card('Transformer 630 kVA', ui.lamp(p + 'TX-OT-ALM', 'Oil temperature alarm') + ui.lamp(p + 'TX-OT-TRIP', 'Oil temperature trip') + ui.lamp(p + 'TX-WT-ALM', 'Winding temperature alarm') +
        ui.lamp(p + 'TX-WT-TRIP', 'Winding temperature trip') + ui.lamp(p + 'TX-PRD', 'Pressure relief operated') + ui.lamp(p + 'TX-OL-LOW', 'Oil level low')) +
      ui.card('LVDB incomer', '<div class="kv"><span class="k">Incomer</span>' + ui.cbState(p + 'LV-INC') + '</div>' + ui.lamp(p + 'LV-INC-TRIP', 'Incomer tripped') + ui.lamp(p + 'LV-SPD-FLT', 'Surge arrester failed') +
        ui.kv('P', p + 'LV-P') + ui.kv('Q', p + 'LV-Q') + ui.kv('PF', p + 'LV-PF') + ui.kv('U L1-N', p + 'LV-U-L1N') + ui.kv('I L1', p + 'LV-I-L1') + ui.kv('I L2', p + 'LV-I-L2') + ui.kv('I L3', p + 'LV-I-L3') +
        ui.kv('THD U', p + 'LV-THD-U') + ui.kv('THD I', p + 'LV-THD-I') + ui.kv('Energy', p + 'LV-E-P') +
        '<div class="btnrow">' + ui.btn('OPEN', p + 'LV-INC-OPEN-CMD', 'b-green') + ui.btn('CLOSE', p + 'LV-INC-CLOSE-CMD', 'b-red') + '</div>') +
      ui.card('Station supplies', ui.lamp(p + 'UPS-ON-BATT', 'RMU UPS on battery') + ui.lamp(p + 'UPS-FLT', 'RMU UPS fault') + ui.lamp(p + 'PNL-SUP-OK', 'I/O panel supply healthy') +
        ui.lamp('CP-IO-' + k + '-OK', 'Edge I/O island link healthy') + ui.lamp('SW-' + k + '-HEALTHY', 'Station switch healthy')) +
      '</div>';
  }
  S.screens.prs = { title: 'President station', render: function () { return stationScreen('PRS', 'President', 'AH4'); } };
  S.screens.pms = { title: 'Prime Minister station', render: function () { return stationScreen('PMS', 'Prime Minister', 'AH6'); } };
})(SCADA);
