/* PV inverters, string monitoring and weather station */
(function (S) {
  var ui = S.ui, T = S.tags, C = S.config;

  S.screens.pv = {
    title: 'PV Inverters',
    render: function () {
      var h = '<h2 class="scr-t">PV system <small>1,516.32 kWp · 4 × Sungrow SG350HX · power-line carrier (PLC) → PLC box → Ethernet switch</small></h2>' +
        '<div class="grid g4" style="margin-bottom:12px">' +
        ui.card('PV plant', ui.kv('Active power', 'PPC.PLANT.P_PV') + ui.kv('Available power', 'PPC.PLANT.P_PV_AVAIL') + ui.kv('Curtailment', 'PPC.PLANT.CURTAIL') + ui.kv('Energy today', 'PPC.PLANT.E_PV_DAY') +
          ui.kv('Performance ratio', 'MET.WS.PR') + ui.kv('Irradiance POA', 'MET.WS.IRR_POA'), 'dark') +
        ui.card('Point of connection (0.8 kV)', ui.kv('P', 'PV.POC.P') + ui.kv('Q', 'PV.POC.Q') + ui.kv('U L1-L2', 'PV.POC.U_L12') + ui.kv('I L1', 'PV.POC.I_L1') + ui.kv('THD-U', 'PV.POC.THD_U') +
          '<div class="kv"><span class="k">LV ACB 1250A</span>' + ui.cbState('PV.LV_ACB') + '</div>', 'dark') +
        ui.card('PV inverter transformer', ui.kv('Loading', 'TX.PVTX.LOAD') + ui.kv('Oil / core temp', 'TX.PVTX.T_OIL') + ui.kv('Winding temp', 'TX.PVTX.T_WDG') + ui.lamp('TX.PVTX.TEMP_ALM') + ui.lamp('TX.PVTX.TEMP_TRIP'), 'dark') +
        ui.card('Meteo', ui.kv('Module temp', 'MET.WS.T_MOD') + ui.kv('Ambient temp', 'MET.WS.T_AMB') + ui.kv('Wind', 'MET.WS.WIND_SPD') + ui.kv('Insolation today', 'MET.WS.INSOL_DAY') +
          '<p class="note"><a href="#weather">Open weather station →</a></p>', 'dark') +
        '</div><div class="grid g4">';
      C.pv.inverters.forEach(function (inv) {
        var p = 'PV.' + inv.id;
        h += ui.card(inv.tag + ' · ' + inv.model + ' · ' + inv.strings + ' strings',
          ui.bar(p + '.P', inv.kw, 'AC power (' + inv.kw + ' kW)') +
          '<div class="grid g2"><div>' + ui.lamp(p + '.RUN', 'Running') + ui.lamp(p + '.STANDBY', 'Derating / standby') + ui.lamp(p + '.FAULT', 'Fault') + ui.lamp(p + '.COMM', 'Comms OK') + '</div><div>' +
          ui.lamp(p + '.ISO_FLT', 'Insulation fault') + ui.lamp(p + '.DC_SPD', 'DC SPD') + ui.lamp(p + '.AC_SPD', 'AC SPD') + ui.lamp(p + '.MCCB_ON', 'AC MCCB ON') + ui.lamp(p + '.MCCB_TRIP', 'AC MCCB tripped') + '</div></div>' +
          ui.kv('Reactive power', p + '.Q') + ui.kv('AC voltage', p + '.U_AC') + ui.kv('AC current', p + '.I_AC') + ui.kv('Frequency', p + '.F') + ui.kv('DC power', p + '.P_DC') + ui.kv('DC voltage', p + '.U_DC') +
          ui.kv('Efficiency', p + '.EFF') + ui.kv('Internal temp.', p + '.T_INT') + ui.kv('Insulation R', p + '.R_ISO') + ui.kv('Energy today', p + '.E_DAY') + ui.kv('Energy total', p + '.E_TOT') +
          ui.kv('P limit', p + '.SP_PLIM') + ui.kv('PF setpoint', p + '.SP_PF') +
          '<div class="btnrow">' + ui.btn('START', p, 'start', 'b-blue') + ui.btn('STOP', p, 'stop', 'b-gray') + ui.btn('P LIMIT', p + '.SP_PLIM', 'setpoint') + ui.btn('PF', p + '.SP_PF', 'setpoint') + '</div>');
      });
      return h + '</div>';
    }
  };

  /* --------------- string monitoring --------------- */
  S.screens.strings = {
    title: 'String Monitoring',
    render: function () {
      var h = '<h2 class="scr-t">String monitoring <small>81 strings × 26 modules · H1Z2Z2-K 1×4mm² · deviation vs inverter median</small></h2>';
      h += '<div class="legend"><span><i style="background:#2f6db3"></i>Normal (≥ −10 %)</span><span><i style="background:#ef7d00"></i>Under-performing (−10…−30 %)</span><span><i style="background:#d22f27"></i>Fault / open circuit (&lt; −30 %)</span><span><i style="background:#c3cad1"></i>No production / night</span></div>';
      C.pv.inverters.forEach(function (inv) {
        h += ui.card(inv.tag + ' · ' + inv.strings + ' strings', '<div class="strgrid" id="sg-' + inv.id + '"></div>' +
          '<div class="kv"><span class="k">Median string current</span><span class="v" id="med-' + inv.id + '"></span></div>' +
          '<details><summary class="note">MPPT voltages</summary><div class="grid g4">' +
          Array.apply(null, Array(C.pv.mpptsPerInverter)).map(function (_, m) { var id = 'PV.' + inv.id + '.MPPT' + ('0' + (m + 1)).slice(-2) + '_U'; return ui.kv('MPPT ' + (m + 1), id); }).join('') + '</div></details>');
        h += '<div style="height:10px"></div>';
      });
      return h;
    },
    update: function (root) {
      C.pv.inverters.forEach(function (inv) {
        var el = root.querySelector('#sg-' + inv.id); if (!el) return;
        var vals = [];
        for (var s = 1; s <= inv.strings; s++) vals.push(T['PV.' + inv.id + '.STR' + ('0' + s).slice(-2) + '_I'].v);
        var sorted = vals.slice().sort(function (a, b) { return a - b; });
        var med = sorted[Math.floor(sorted.length / 2)];
        var html = '';
        vals.forEach(function (v, i) {
          var dev = med > 0.3 ? (v - med) / med * 100 : null;
          var bg = dev === null ? '#c3cad1' : dev < -30 ? '#d22f27' : dev < -10 ? '#ef7d00' : '#2f6db3';
          var nm = inv.tag + '-' + ('0' + (i + 1)).slice(-2);
          html += '<div class="str" style="background:' + bg + '" title="' + nm + ': ' + v.toFixed(2) + ' A' + (dev !== null ? ' (' + dev.toFixed(1) + ' %)' : '') + '">' + (i + 1) + '<br>' + v.toFixed(1) + '</div>';
        });
        el.innerHTML = html;
        root.querySelector('#med-' + inv.id).textContent = med.toFixed(2) + ' A';
      });
    }
  };

  /* --------------- weather station --------------- */
  S.screens.weather = {
    title: 'Weather Station',
    render: function () {
      var w = 'MET.WS';
      return '<h2 class="scr-t">Weather station <small>' + C.weather.logger + ' · Fieldbus ports 1-4</small></h2>' +
        '<div class="grid g4">' +
        ui.card('Irradiance', ui.kv('POA (SMP12-A)', w + '.IRR_POA') + ui.kv('GHI', w + '.IRR_GHI') + ui.kv('Insolation today', w + '.INSOL_DAY') + ui.kv('Performance ratio', w + '.PR')) +
        ui.card('Temperature', ui.kv('Ambient', w + '.T_AMB') + ui.kv('Module (back)', w + '.T_MOD') + ui.kv('Humidity', w + '.HUM')) +
        ui.card('Wind (Gill WindSonic)', '<svg viewBox="0 0 120 120" style="width:120px;height:120px;display:block;margin:auto"><circle cx="60" cy="60" r="50" fill="#f5f8fb" stroke="#c3d0da"/>' +
          ['N', 'E', 'S', 'W'].map(function (d, i) { var a = i * Math.PI / 2; return ui.text(60 + Math.sin(a) * 42, 64 - Math.cos(a) * 42, d, 'lbl-xs'); }).join('') +
          '<line id="wdir" x1="60" y1="60" x2="60" y2="18" stroke="#1f4e8c" stroke-width="3" stroke-linecap="round"/></svg>' + ui.kv('Speed', w + '.WIND_SPD') + ui.kv('Direction', w + '.WIND_DIR')) +
        ui.card('Station health', ui.lamp(w + '.COMM', 'blue\'Log communication') + ui.lamp(w + '.SENSOR_FLT', 'Sensor fault') +
          '<table class="tbl" style="margin-top:6px"><tr><th>Sensor</th><th>Make</th></tr>' + C.weather.sensors.map(function (s) { return '<tr><td>' + s.name + '</td><td>' + s.make + '</td></tr>'; }).join('') + '</table>') +
        '</div><div style="height:12px"></div>' +
        '<div class="grid g2">' + ui.card('POA irradiance - today', '<div id="tr-irr"></div>') + ui.card('PV active power - today', '<div id="tr-pv"></div>') + '</div>';
    },
    init: function (root) {
      S.trendChart(root.querySelector('#tr-irr'), ['MET.WS.IRR_POA'], 'today', 220);
      S.trendChart(root.querySelector('#tr-pv'), ['PPC.PLANT.P_PV', 'PPC.PLANT.P_PV_AVAIL'], 'today', 220);
    },
    update: function (root) {
      var l = root.querySelector('#wdir');
      if (l) l.setAttribute('transform', 'rotate(' + T['MET.WS.WIND_DIR'].v + ' 60 60)');
    }
  };
})(SCADA);
