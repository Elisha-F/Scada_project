/* LV distribution boards (President, P.M.), plant auxiliaries and UPS */
(function (S) {
  var ui = S.ui, T = S.tags, C = S.config;

  function lvdbSvg(b, names, live) {
    var p = 'LV.' + b.id, n = b.ways, W = 1000, dx = (W - 120) / n;
    var s = '<svg class="sld" viewBox="0 0 ' + W + ' 250">';
    s += ui.line(60, 10, 60, 38, live) + ui.cb(60, 50, p, 'Incomer ' + b.incomer, { title: b.name + ' incomer' }) + ui.line(60, 62, 60, 80, live);
    s += ui.meter(230, 50, p) + ui.val(250, 46, p + '.P', 'val-b') + ui.val(250, 62, p + '.I_L1', 'val');
    s += '<line class="ln" data-live="' + live + '" x1="40" y1="80" x2="' + (W - 30) + '" y2="80" stroke-width="5"/>';
    for (var w = 1; w <= n; w++) {
      var k = p + '.W' + ('0' + w).slice(-2), x = 100 + (w - 0.5) * dx, wl = live + '&' + k + '_ON';
      s += ui.line(x, 80, x, 110, live) + '<g class="sw" data-di="' + k + '_ON" data-kind="state"><rect x="' + (x - 9) + '" y="110" width="18" height="18" stroke="#333"/></g>';
      s += '<g data-di="' + k + '_TRIP" data-kind="alarm" class="tripmark"><circle cx="' + (x + 14) + '" cy="112" r="4"/></g>';
      s += ui.line(x, 128, x, 165, wl) + ui.load(x, 165, wl);
      s += ui.text(x, 195, 'Way ' + w, 'lbl-xs') + ui.val(x, 211, k + '_P', 'val', 'middle');
      s += ui.text(x, 228, names ? names[w - 1] || '' : (w > 8 ? 'Spare' : ''), 'lbl-xs');
    }
    return s + '</svg>';
  }

  function lvdbScreen(b, rmu, feeder) {
    var p = 'LV.' + b.id, tx = 'TX.' + rmu.tx, live = (b.id === 'LVDB_PRES' ? 'presLv' : 'pmLv');
    return '<h2 class="scr-t">' + b.name + ' <small>fed from GIS ' + feeder + ' → ' + rmu.name + ' → 630 kVA TX → ' + b.incomer + ' · ' + b.ways + ' × ' + b.mccb + '</small></h2>' +
      ui.card('Distribution board', lvdbSvg(b, null, live)) + '<div style="height:12px"></div>' +
      '<div class="grid g4">' +
      ui.card('Incomer metering', ui.kv('Active power', p + '.P') + ui.kv('Reactive power', p + '.Q') + ui.kv('Power factor', p + '.PF') + ui.kv('Voltage L1-L2', p + '.U_L12') + ui.kv('Voltage L2-L3', p + '.U_L23') +
        ui.kv('Voltage L3-L1', p + '.U_L31') + ui.kv('Frequency', p + '.F')) +
      ui.card('Currents &amp; quality', ui.kv('I L1', p + '.I_L1') + ui.kv('I L2', p + '.I_L2') + ui.kv('I L3', p + '.I_L3') + ui.kv('I N', p + '.I_N') + ui.kv('THD-U', p + '.THD_U') + ui.kv('Energy import', p + '.E_IMP') + ui.lamp(p + '.SPD_FAIL')) +
      ui.card('Incomer ACB', '<div class="kv"><span class="k">State</span>' + ui.cbState(p) + '</div>' + ui.lamp(p + '.CB_SPRING', 'Spring charged') + ui.lamp(p + '.CB_RACKED', 'Racked-in') + ui.lamp(p + '.LR_REMOTE', 'Remote') +
        ui.lamp(p + '.CB_TRIPPED', 'Tripped') + '<div class="btnrow">' + ui.btn('OPEN', p, 'open', 'b-green') + ui.btn('CLOSE', p, 'close', 'b-red') + '</div>') +
      ui.card('Transformer 630 kVA', ui.kv('Loading', tx + '.LOAD') + ui.kv('Oil temperature', tx + '.T_OIL') + ui.kv('Winding temperature', tx + '.T_WDG') + ui.lamp(tx + '.TEMP_ALM') + ui.lamp(tx + '.TEMP_TRIP') +
        ui.lamp(tx + '.BUCH_ALM') + ui.lamp(tx + '.BUCH_TRIP') + ui.lamp(tx + '.OIL_LOW')) +
      '</div>';
  }

  S.screens.lvdb_pres = { title: 'President LVDB', render: function () { return lvdbScreen(C.lvdbs[0], C.rmus[0], 'AH4'); } };
  S.screens.lvdb_pm = { title: 'P.M. LVDB', render: function () { return lvdbScreen(C.lvdbs[1], C.rmus[1], 'AH6'); } };

  S.screens.aux = {
    title: 'Auxiliary & UPS',
    render: function () {
      var b = C.lvdbs[2];
      var ups = C.ups.map(function (u) {
        var p = 'AUX.' + u.id;
        return ui.card(u.name + ' · ' + u.kva + ' kVA', '<p class="muted" style="margin:0 0 4px">' + u.location + '</p>' + ui.lamp(p + '.ON_BATT', 'On battery') + ui.lamp(p + '.BYPASS', 'On bypass') +
          ui.lamp(p + '.FAULT', 'UPS fault') + ui.lamp(p + '.BATT_LOW', 'Battery low') + (T[p + '.LOAD'] ? ui.kv('Load', p + '.LOAD') + ui.kv('Autonomy', p + '.AUTONOMY') + ui.kv('Output voltage', p + '.U_OUT') : ''));
      }).join('');
      return '<h2 class="scr-t">Auxiliary power &amp; UPS <small>SAT 100 kVA (AH5, XRNT-3A fuse) → plant auxiliary panel · UPS · 110 VDC</small></h2>' +
        ui.card('Plant auxiliary panel', lvdbSvg(b, C.auxCircuits, 'auxLv')) + '<div style="height:12px"></div>' +
        '<div class="grid g4">' +
        ui.card('Station auxiliary transformer', ui.kv('Loading', 'TX.AUXTX.LOAD') + ui.kv('Temperature', 'TX.AUXTX.T_OIL') + ui.lamp('TX.AUXTX.FUSE_BLOWN') + ui.lamp('TX.AUXTX.TEMP_ALM') +
          '<div class="kv"><span class="k">AH5 VCB</span>' + ui.cbState('GIS.AH5') + '</div>' + ui.kv('Aux load', 'LV.AUXPNL.P')) +
        ui.card('110 VDC switchgear supply', ui.kv('DC voltage', 'GIS.DC.U_DC') + ui.lamp('GIS.DC.CHG_FAIL') + ui.lamp('GIS.DC.EARTH_FLT') +
          '<p class="note">Battery-backed tripping/closing supply for GIS VCBs and relays. Autonomy to be sized for 8 h standby + 2 full trip/close cycles of all VCBs.</p>') +
        ups + '</div>';
    }
  };
})(SCADA);
