/* PV system, battery, generators and energy management screens */
(function (S) {
  var ui = S.ui, T = S.tags, C = S.config;
  function v(id) { return T[id].v; }

  /* ---------------- PV ---------------- */
  S.screens.pv = {
    title: 'PV system',
    render: function () {
      var h = '<h2 class="scr-t">PV system <small>1,516 kWp · 4 × Sungrow SG350HX · power line communication to the PLC box, Modbus TCP to the CP-8050</small></h2><div class="grid g4" style="margin-bottom:12px">' +
        ui.card('PV plant', ui.kv('PV power (EMS)', 'EMS-P-PV') + '<div class="kv"><span class="k">Energy today, 4 inverters</span><span class="v" id="pv-eday"></span></div>' +
          '<div class="kv"><span class="k">Performance ratio</span><span class="v" id="pv-pr"></span></div>' + ui.lamp('EMS-PV-CURT', 'Curtailed by the EMS') +
          '<p class="note">Energy today and performance ratio are calculated on the SCADA from listed signals.</p>', 'dark') +
        ui.card('LV switchboard 0.8 kV', '<div class="kv"><span class="k">Main breaker ACB 1250 A</span>' + ui.cbState('PV-ACB') + '</div>' + ui.lamp('PV-ACB-TRIP', 'Main breaker tripped') +
          C.pv.inverters.map(function (i) { return ui.lamp(i.tag + '-MCCB-TRIP', i.tag + ' AC breaker tripped'); }).join(''), 'dark') +
        ui.card('Inverter transformer', ui.lamp('T-INV-OT-ALM', 'Oil temperature alarm') + ui.lamp('T-INV-OT-TRIP', 'Oil temperature trip') + ui.lamp('T-INV-WT-ALM', 'Winding temperature alarm') +
          ui.lamp('T-INV-WT-TRIP', 'Winding temperature trip') + ui.lamp('T-INV-PRD', 'Pressure relief operated') + ui.lamp('T-INV-OL-LOW', 'Oil level low'), 'dark') +
        ui.card('Weather station (blue\'Log)', ui.kv('Irradiance, plane of array', 'WS-IRR-POA') + ui.kv('Module temperature', 'WS-T-MOD') + ui.kv('Ambient temperature', 'WS-T-AMB') +
          ui.kv('Wind speed', 'WS-WIND-SPD') + ui.kv('Wind direction', 'WS-WIND-DIR') + ui.lamp('WS-HEALTHY', 'Logger healthy'), 'dark') + '</div><div class="grid g4">';
      C.pv.inverters.forEach(function (inv) {
        var k = inv.tag + '-';
        h += ui.card(inv.tag + ' · SG350HX · ' + inv.strings + ' strings', ui.bar(k + 'P', inv.kw, 'Active power (350 kW)') +
          '<div class="kv"><span class="k">State</span><span class="v" data-tag="' + k + 'STATE"></span></div>' + ui.lamp(k + 'COMM-OK', 'Communication healthy') + ui.lamp('PLCBOX-' + inv.tag + '-COMM', 'Seen by the PLC box') +
          ui.kv('Fault code', k + 'FLT-CODE') + ui.kv('Alarm code', k + 'ALM-CODE') + ui.kv('Reactive power', k + 'Q') + ui.kv('Power factor', k + 'PF') +
          ui.kv('AC voltage L1', k + 'U-L1') + ui.kv('AC current L1', k + 'I-L1') + ui.kv('Frequency', k + 'F') + ui.kv('DC voltage', k + 'U-DC') + ui.kv('DC current', k + 'I-DC') +
          ui.kv('DC power', k + 'P-DC') + ui.kv('Internal temperature', k + 'T-INT') + ui.kv('Insulation resistance', k + 'R-ISO') + ui.kv('Energy today', k + 'E-DAY') + ui.kv('Energy total', k + 'E-TOT') +
          ui.kv('Active power limit', k + 'P-LIM-SP') +
          '<div class="btnrow">' + ui.btn('START / STOP', k + 'START-STOP-CMD', 'b-blue') + ui.btn('POWER LIMIT', k + 'P-LIM-SP', 'b-gray') + '</div>' +
          '<p class="note">Admin only, and only if the EMS allows it: the EMS normally sets PV output.</p>');
      });
      return h + '</div>';
    },
    update: function (root) {
      var e = 0; C.pv.inverters.forEach(function (i) { e += v(i.tag + '-E-DAY'); });
      root.querySelector('#pv-eday').textContent = e.toFixed(0) + ' kWh';
      var g = v('WS-IRR-POA');
      root.querySelector('#pv-pr').textContent = g > 50 && !v('EMS-PV-CURT') ? (v('EMS-P-PV') / (C.pv.dcKwp * g / 1000) * 100).toFixed(1) + ' %' : '-';
    }
  };

  /* ---------------- battery ---------------- */
  S.screens.bess = {
    title: 'Battery',
    render: function () {
      var b = 'BESS-';
      return '<h2 class="scr-t">Battery energy storage <small>Sungrow ST3340UX · 3,340 kWh · read through the EMS over Modbus TCP · safety contacts hardwired to I/O row 5</small></h2><div class="grid g3">' +
        ui.card('State', '<svg viewBox="0 0 300 150" style="width:100%;height:150px">' + ui.battery(20, 20, 70, 120) + ui.text(110, 30, 'State of charge', 'lbl-xs', 'start') + ui.val(110, 50, b + 'SOC', 'val-b') +
          ui.text(110, 75, 'Active power (+dis / −chg)', 'lbl-xs', 'start') + ui.val(110, 93, b + 'P', 'val-b') + ui.text(110, 118, 'Converter', 'lbl-xs', 'start') + ui.val(110, 136, b + 'PCS-STATE', 'val-b') + '</svg>' +
          ui.kv('State of health', b + 'SOH') + ui.kv('Reactive power', b + 'Q') + ui.kv('DC voltage', b + 'U-DC') + ui.kv('DC current', b + 'I-DC') + ui.kv('Charge power limit', b + 'P-CHG-LIM') +
          ui.kv('Discharge power limit', b + 'P-DIS-LIM') + ui.kv('Energy charged', b + 'E-CHG') + ui.kv('Energy discharged', b + 'E-DIS')) +
        ui.card('Battery system', ui.kv('Battery management', b + 'BMS-STATE') + ui.kv('Cooling system', b + 'COOL-STATE') + ui.kv('Racks online', b + 'RACKS-ON') + ui.lamp(b + 'DC-CONT', 'DC contactors closed') +
          ui.kv('Cell voltage max', b + 'U-CELL-MAX') + ui.kv('Cell voltage min', b + 'U-CELL-MIN') + ui.kv('Cell temperature max', b + 'T-CELL-MAX') + ui.kv('Cell temperature min', b + 'T-CELL-MIN') +
          '<h4>Battery alarms</h4>' + ui.lamp(b + 'ALM-L1', 'Alarm level 1') + ui.lamp(b + 'ALM-L2', 'Alarm level 2') + ui.lamp(b + 'ALM-L3', 'Alarm level 3') + ui.lamp(b + 'FIRE', 'Container fire status') +
          '<h4>Combiner panels</h4>' + ui.lamp(b + 'BCP1-SW-CLSD', 'BCP 1 DC switch closed') + ui.lamp(b + 'BCP2-SW-CLSD', 'BCP 2 DC switch closed') + ui.lamp(b + 'BCP1-FUSE', 'BCP 1 fuse blown') + ui.lamp(b + 'BCP2-FUSE', 'BCP 2 fuse blown')) +
        ui.card('Connection and safety', '<div class="kv"><span class="k">11 kV breaker AH3</span>' + ui.cbState('AH3') + '</div><div class="kv"><span class="k">LV breaker ACB 1000 A</span>' + ui.cbState('BESS-ACB') + '</div>' +
          ui.lamp('BESS-ACB-TRIP', 'LV breaker tripped') + ui.lamp('ESTOP-BESS', 'Emergency stop, battery area') + ui.lamp('DOOR-BESS', 'Container door open') +
          '<h4>Fire detection and suppression</h4>' + ui.lamp('FIRE-PREALM', 'Pre-alarm') + ui.lamp('FIRE-ALM', 'Fire alarm') + ui.lamp('FIRE-REL', 'Suppression released') + ui.lamp('FIRE-MAN-REL', 'Manual release') +
          ui.lamp('FIRE-AGENT-LOW', 'Agent pressure low') + ui.lamp('FIRE-ISOL', 'System isolated') + ui.lamp('FIRE-FLT', 'System fault') + ui.lamp('FIRE-PSU-FLT', 'Panel supply fault') +
          '<p class="note">A fire trips the battery through hardwired circuits. The fire panel is reset only at the panel.</p>' +
          '<p class="note">Battery settings are changed through the EMS by an Admin: <a href="#ems">Energy management →</a></p>') + '</div>';
    }
  };

  /* ---------------- generators ---------------- */
  S.screens.gen = {
    title: 'Generators',
    render: function () {
      var h = '<h2 class="scr-t">Diesel generators <small>controllers over Modbus · breaker, running, alarm, E-stop and fuel level also hardwired to I/O row 6</small></h2><div class="grid g-side"><div class="grid g2">';
      C.generators.forEach(function (g) {
        var k = g.id + '-';
        h += ui.card(g.name + ' · ' + g.kva + ' kVA', '<div class="statebox" id="st-' + g.id + '"><div class="st" data-s="0">STOPPED</div><div class="st" data-s="1">RUNNING, OFF LOAD</div><div class="st" data-s="2">ON LOAD</div></div>' +
          '<div class="kv" style="margin-top:6px"><span class="k">Controller mode</span><span class="v" data-tag="' + k + 'MODE"></span></div>' +
          '<div class="kv"><span class="k">Breaker (' + g.acb + ')</span>' + ui.cbState(g.id + '-GCB') + '</div>' +
          '<div class="grid g2"><div><h4>Electrical</h4>' + ui.kv('Active power', k + 'P') + ui.kv('Reactive power', k + 'Q') + ui.kv('Voltage L1', k + 'U-L1') + ui.kv('Current L1', k + 'I-L1') +
          ui.kv('Frequency', k + 'F') + ui.kv('Power factor', k + 'PF') + ui.kv('Energy total', k + 'E-TOT') + '</div><div><h4>Engine</h4>' + ui.kv('Oil pressure', k + 'OIL-P') + ui.kv('Coolant temperature', k + 'COOL-T') +
          ui.kv('Starter battery', k + 'BATT-U') + ui.kv('Fuel level (hardwired)', k + 'FUEL') + ui.kv('Fuel level (controller)', k + 'FUEL-COM') + ui.kv('Running hours', k + 'HOURS') + ui.kv('Starts', k + 'STARTS') + '</div></div>' +
          '<h4>Alarms</h4><div class="grid g2"><div>' + ui.lamp(k + 'WARN', 'Warning') + ui.lamp(k + 'SHUTDOWN', 'Shutdown alarm') + '</div><div>' + ui.lamp(k + 'COM-ALM', 'Common alarm (hardwired)') + ui.lamp(k + 'ESTOP', 'Emergency stop') + '</div></div>' +
          '<div class="btnrow">' + ui.btn('START', k + 'START-CMD', 'b-blue') + ui.btn('STOP', k + 'STOP-CMD', 'b-gray') + ui.btn('AUTO / MANUAL', k + 'MODE-CMD', 'b-amber') + '</div>' +
          '<p class="note">Start and stop work in manual mode only (Operator). Changing the mode needs Admin. In automatic the EMS starts and stops the generator.</p>');
      });
      h += '</div><aside>' + ui.card('Step-up transformer and LV breaker', '<div class="kv"><span class="k">LV breaker</span>' + ui.cbState('GEN-ACB') + '</div>' + ui.lamp('GEN-ACB-TRIP', 'LV breaker tripped') +
        '<div class="kv"><span class="k">11 kV breaker AH1</span>' + ui.cbState('AH1') + '</div>' + ui.lamp('T-DG-OT-ALM', 'Oil temperature alarm') + ui.lamp('T-DG-OT-TRIP', 'Oil temperature trip') +
        ui.lamp('T-DG-WT-ALM', 'Winding temperature alarm') + ui.lamp('T-DG-WT-TRIP', 'Winding temperature trip') + ui.lamp('T-DG-PRD', 'Pressure relief operated') + ui.lamp('T-DG-OL-LOW', 'Oil level low'), 'dark') +
        ui.card('EMS dispatch', ui.kv('Generator power', 'EMS-P-GEN') + ui.lamp('EMS-GEN-START-REQ', 'Start requested by the EMS') + ui.kv('Start below SOC', 'EMS-GEN-START-SP') + ui.kv('Stop at SOC', 'EMS-GEN-STOP-SP') +
          '<p class="note">The lead generator starts when the battery falls below the start threshold and PV cannot cover the load; the second starts if load exceeds 80 % of the running one.</p>' +
          ui.lamp('GEN-PNL-SUP-OK', 'Generator I/O panel supply') + ui.lamp('GEN-PNL-DOOR', 'Generator I/O panel door'), 'dark') + '</aside></div>';
      return h;
    },
    update: function (root) {
      C.generators.forEach(function (g) {
        var s = !v(g.id + '-RUN') ? 0 : v(g.id + '-GCB-CLSD') ? 2 : 1;
        root.querySelectorAll('#st-' + g.id + ' .st').forEach(function (d) { d.classList.toggle('on', Number(d.getAttribute('data-s')) === s); });
      });
    }
  };

  /* ---------------- energy management ---------------- */
  var MODES = [['Day, PV surplus', 'Forms the grid, charging', 'Full output; curtailed when the battery is full', 'Off'],
    ['Day, PV shortfall', 'Forms the grid, discharging', 'Full output', 'Off'], ['Night', 'Forms the grid, discharging', 'Off', 'Off'],
    ['Low battery, generator charging', 'Charging from the generator', 'Full output if available', 'One running; second if load requires'],
    ['Generator only', 'Off', 'Limited to keep the generator above minimum load', 'Running, forming the grid'], ['Manual', 'As commanded', 'As commanded', 'As commanded']];
  var STATE_ROW = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 8: 5 };
  S.screens.ems = {
    title: 'Energy management',
    render: function () {
      var sp = [['EMS-GEN-START-SP', 'Generator start below SOC'], ['EMS-GEN-STOP-SP', 'Generator stop at SOC'], ['EMS-SOC-MIN-SP', 'State of charge minimum'], ['EMS-SOC-MAX-SP', 'State of charge maximum'], ['EMS-P-BESS-LIM-SP', 'Battery power limit']];
      return '<h2 class="scr-t">Energy management <small>the embedded EMS dispatches PV, battery and generators · the SCADA monitors it and an Admin may change its settings</small></h2><div class="grid g3">' +
        ui.card('Power balance', '<div id="pb"></div>' + ui.kv('Plant active power', 'EMS-P-PLANT') + ui.kv('Plant reactive power', 'EMS-Q-PLANT') + ui.kv('Bus voltage', 'EMS-U-BUS') + ui.kv('Bus frequency', 'EMS-F-BUS') + ui.kv('Battery SOC', 'BESS-SOC')) +
        ui.card('EMS state', '<div class="kv"><span class="k">State</span><span class="v" data-tag="EMS-STATE"></span></div><div class="kv"><span class="k">Operating mode</span><span class="v" data-tag="EMS-MODE"></span></div>' +
          ui.lamp('EMS-ALM', 'EMS summary alarm') + ui.lamp('EMS-GEN-START-REQ', 'Generator start request') + ui.lamp('EMS-PV-CURT', 'PV curtailment active') + ui.kv('Heartbeat (link supervision)', 'EMS-HEARTBEAT') +
          '<div class="kv"><span class="k">Battery C-rate limit (last command)</span><span class="v" id="crate"></span></div>' +
          '<div class="btnrow">' + ui.btn('AUTO / MANUAL', 'EMS-MODE-CMD', 'b-amber') + ui.btn('C-RATE LIMIT ON / OFF', 'EMS-CRATE-CMD', 'b-amber') + '</div>' +
          '<div class="btnrow">' + ui.btn('RESET LEVEL 3 FAULTS', 'EMS-RESET-L3-CMD', 'b-gray') + ui.btn('RESET LEVEL 1 AND 2 FAULTS', 'EMS-RESET-L12-CMD', 'b-gray') + '</div>') +
        ui.card('Settings (Admin)', sp.map(function (x) {
          return '<div class="kv"><span class="k">' + x[1] + '</span><span><span class="v" data-tag="' + x[0] + '"></span> ' + ui.btn('✎', x[0], 'b-small b-blue') + '</span></div>';
        }).join('') + '<p class="note">Proposed starting values, to be set with the EMS supplier at commissioning. Only the CP-8050 writes settings to the EMS.</p>') +
        '</div><div style="height:12px"></div>' +
        ui.card('Operating modes', '<table class="tbl" id="modes"><tr><th>Mode</th><th>Battery</th><th>PV</th><th>Generators</th></tr>' + MODES.map(function (m, i) {
          return '<tr data-m="' + i + '">' + m.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
        }).join('') + '</table>') + '<div style="height:12px"></div>' + ui.card('Power balance today', '<div id="tr-pb"></div>');
    },
    init: function (root) { S.trendChart(root.querySelector('#tr-pb'), ['EMS-P-LOAD', 'EMS-P-PV', 'EMS-P-GEN'], 'today', 260); },
    update: function (root) {
      var row = STATE_ROW[v('EMS-STATE')];
      root.querySelectorAll('#modes tr[data-m]').forEach(function (tr) { tr.classList.toggle('cur', Number(tr.getAttribute('data-m')) === row); });
      root.querySelector('#crate').textContent = S.sim.crateLimit ? 'Enabled' : 'Disabled for calibration';
      var it = [['Load', 'EMS-P-LOAD'], ['PV', 'EMS-P-PV'], ['Battery', 'EMS-P-BESS'], ['Generators', 'EMS-P-GEN']];
      root.querySelector('#pb').innerHTML = it.map(function (x) {
        var val = v(x[1]);
        return '<div class="hbar"><div class="hbar-l"><span>' + x[0] + (x[0] === 'Battery' ? (val < 0 ? ' (charging)' : ' (discharging)') : '') + '</span><b>' + val.toFixed(0) + ' kW</b></div><div class="hbar-t"><div class="hbar-f" style="width:' + Math.min(100, Math.abs(val) / 11) + '%"></div></div></div>';
      }).join('');
    }
  };
})(SCADA);
