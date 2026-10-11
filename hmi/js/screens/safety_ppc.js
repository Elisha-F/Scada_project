/* Fire detection & suppression, Power Plant Controller, operating sequences */
(function (S) {
  var ui = S.ui, T = S.tags, C = S.config;

  /* ---------------- fire ---------------- */
  var ZONES = [
    { id: 'FZ_INV', x: 30, y: 40, w: 300, h: 210, lbl: 'PV ARRAY / INVERTER STATION (NB01-NB04)' },
    { id: 'FZ_BESS', x: 360, y: 150, w: 150, h: 70, lbl: 'ESS CABIN (BESS)' },
    { id: 'FZ_GIS', x: 540, y: 150, w: 140, h: 70, lbl: '11kV GIS ROOM' },
    { id: 'FZ_CTRL', x: 540, y: 240, w: 140, h: 50, lbl: 'CONTROL ROOM' },
    { id: 'FZ_DG', x: 710, y: 40, w: 150, h: 200, lbl: 'DG1 / DG2 ENCLOSURES' }
  ];
  S.screens.fire = {
    title: 'Fire Detection & Suppression',
    render: function () {
      var map = '<svg class="sld zonemap" viewBox="0 0 890 310">' + ui.text(20, 20, 'SITE FIRE ZONES (schematic, after General Layout BFE/PR/26/01)', 'lbl-s', 'start');
      ZONES.forEach(function (z) {
        map += '<rect class="zone" data-zone="' + z.id + '" x="' + z.x + '" y="' + z.y + '" width="' + z.w + '" height="' + z.h + '" rx="4"/>' + ui.text(z.x + z.w / 2, z.y + z.h / 2 + 4, z.lbl, 'lbl-xs');
      });
      map += '<rect x="360" y="40" width="150" height="60" rx="4" fill="#f5f8fb" stroke="#9aa5af"/>' + ui.text(435, 74, 'BESS / PV / DG TX', 'lbl-xs');
      map += '<rect x="710" y="255" width="150" height="40" rx="4" fill="#f5f8fb" stroke="#9aa5af"/>' + ui.text(785, 279, 'NECR', 'lbl-xs') + '</svg>';
      var rows = C.fire.map(function (z) {
        var p = 'FIRE.' + z.id;
        return '<tr><td><b>' + z.name + '</b><br><span class="muted">' + z.detection + ' · ' + z.suppression + '</span></td>' +
          ['PRE_ALM', 'FIRE', 'FAULT', 'DISABLED', 'REL_PENDING', 'RELEASED', 'MAN_INHIBIT', 'CYL_LOW'].map(function (s) {
            return '<td style="text-align:center">' + (T[p + '.' + s] ? '<span class="lamp" style="justify-content:center" data-di="' + p + '.' + s + '" data-kind="alarm"><i></i></span>' : '<span class="muted">-</span>') + '</td>';
          }).join('') + '</tr>';
      }).join('');
      var ce = [
        ['ESS cabin smoke/off-gas pre-alarm', 'x', '', '', 'x', '', '', 'x', ''],
        ['ESS cabin fire confirmed (2 detectors)', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x'],
        ['GIS room fire confirmed', 'x', '', '', '', '', '', '', 'x'],
        ['DG enclosure fire', 'x', '', '', '', '', 'x (DG)', '', ''],
        ['BESS / plant ESD push-button', 'x', 'x', 'x', '', '', 'x', '', ''],
        ['Fire panel fault', 'x', '', '', '', '', '', '', '']
      ];
      var ceH = '<table class="tbl cause"><tr><th>Cause ↓ / Effect →</th><th>Alarm to SCADA &amp; sounders</th><th>Stop PCS</th><th>Trip AH3 + BESS ACB</th><th>Exhaust / vent fans ON</th><th>Release agent (30 s delay)</th><th>Start DG / fuel shut-off</th><th>HVAC OFF (recirculation)</th><th>Release GIS / ctrl FM-200</th></tr>' +
        ce.map(function (r) { return '<tr>' + r.map(function (c, i) { return i ? '<td class="x">' + c + '</td>' : '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
      return '<h2 class="scr-t">Fire detection &amp; suppression <small>addressable fire alarm control panel (FACP) → SCADA via Modbus TCP + hard-wired cause &amp; effect</small></h2>' +
        '<div class="grid g-side"><div>' + map + '</div><aside>' +
        ui.card('Fire alarm panel', ui.lamp('FIRE.FACP.HEALTHY', 'FACP healthy') + ui.lamp('FIRE.FACP.SOUNDERS', 'Sounders / beacons active') +
          ui.kv('ESS cabin H₂', 'FIRE.FZ_BESS.GAS_H2') + ui.kv('ESS cabin CO', 'FIRE.FZ_BESS.GAS_CO') + ui.lamp('FIRE.FZ_BESS.VENT_RUN', 'ESS exhaust fan running') +
          '<div class="btnrow">' + ui.btn('SILENCE', 'FIRE.FACP', 'silence', 'b-amber') + '</div><p class="note">Fire panel RESET is local only (EN 54 / NFPA 72). SCADA has monitoring + remote silence.</p>', 'dark') +
        '</aside></div><div style="height:12px"></div>' +
        ui.card('Zone status', '<div style="overflow-x:auto"><table class="tbl"><tr><th>Zone</th><th>Pre-alarm</th><th>Fire</th><th>Fault</th><th>Disabled</th><th>Release pending</th><th>Released</th><th>Inhibit</th><th>Cyl. low</th></tr>' + rows + '</table></div>') +
        '<div style="height:12px"></div>' + ui.card('Cause &amp; effect matrix (for approval)', '<div style="overflow-x:auto">' + ceH + '</div>');
    },
    update: function (root) {
      root.querySelectorAll('[data-zone]').forEach(function (r) {
        var p = 'FIRE.' + r.getAttribute('data-zone');
        r.classList.toggle('fire', !!T[p + '.FIRE'].v); r.classList.toggle('pre', !T[p + '.FIRE'].v && !!T[p + '.PRE_ALM'].v);
        r.classList.toggle('flt', !!T[p + '.FAULT'].v || !!T[p + '.DISABLED'].v);
      });
    }
  };

  /* ---------------- PPC ---------------- */
  S.screens.ppc = {
    title: 'Power Plant Controller',
    render: function () {
      var states = S.sim.stateNames.map(function (n, i) { return '<div class="st" data-ppcs="' + i + '">' + n + '</div>'; }).join('');
      var sp = [['SP_SOC_DG_START', 'DG start SOC'], ['SP_SOC_DG_STOP', 'DG stop SOC'], ['SP_SOC_HIGH', 'PV curtailment SOC'], ['SP_DG_MINLOAD', 'DG minimum load'], ['SP_PF', 'Plant PF target']].map(function (x) {
        var id = 'PPC.CTRL.' + x[0];
        return '<div class="kv"><span class="k">' + x[1] + '</span><span><span class="v" data-tag="' + id + '"></span> ' + ui.btn('✎', id, 'setpoint', 'b-small b-blue') + '</span></div>';
      }).join('');
      return '<h2 class="scr-t">Power plant controller <small>islanded microgrid energy management · BESS grid-forming · PV curtailment · DG dispatch</small></h2>' +
        '<div class="grid g3">' +
        ui.card('Operating state', '<div class="statebox">' + states + '</div>' +
          '<div class="kv" style="margin-top:8px"><span class="k">Control mode</span><span class="v" id="ppc-mode"></span></div>' +
          '<div class="btnrow">' + ui.btn('AUTO', 'PPC.CTRL.MODE', 'setpoint', 'b-blue') + ui.btn('BLACK-START', 'PPC.CTRL', 'blackstart', 'b-amber') + ui.btn('PLANT ESD', 'PPC.CTRL', 'esd', 'b-red') + '</div>' +
          ui.lamp('PPC.CTRL.ESD', 'Plant ESD active') + ui.lamp('PPC.CTRL.LOAD_SHED', 'Load shedding active') +
          '<p class="note">Mode tag PPC.CTRL.MODE: 1 = AUTO dispatch, 0 = MANUAL (operator controls DG/BESS directly; PPC only monitors).</p>') +
        ui.card('Power balance', '<div id="pb"></div>' + ui.kv('Renewable share', 'PPC.PLANT.RE_SHARE') + ui.kv('BESS SOC', 'BESS.SYS.SOC') + ui.kv('Charge limit', 'BESS.SYS.P_CHG_MAX') +
          ui.kv('Discharge limit', 'BESS.SYS.P_DIS_MAX') + ui.kv('PV available', 'PPC.PLANT.P_PV_AVAIL') + ui.kv('PV curtailed', 'PPC.PLANT.CURTAIL') + ui.kv('Bus frequency', 'GIS.BUS.F') + ui.kv('Bus voltage', 'GIS.BUS.U')) +
        ui.card('Setpoints (engineer)', sp + '<h4>Dispatch rules</h4><ul class="note" style="padding-left:16px;margin:0">' +
          '<li>BESS is grid-forming master (V/f). PV follows; PPC lowers inverter P-limit when SOC &gt; curtailment SOC or charge limit reached.</li>' +
          '<li>SOC &lt; DG start SOC or load &gt; 90 % of BESS discharge limit → start lead DG, load to ' + C.ppc.dgOptLoadPct + ' % and recharge BESS.</li>' +
          '<li>Second DG starts when residual load exceeds BESS limit + 400 kW.</li>' +
          '<li>SOC &gt; DG stop SOC and min. run ' + C.ppc.dgMinRunMin + ' min elapsed → unload, ' + C.ppc.dgCoolDownMin + ' min cool-down, stop.</li>' +
          '<li>BESS unavailable → DGs grid-forming, PV limited to keep DG ≥ min load.</li>' +
          '<li>Bus dead for 10 s with no blocking fault → automatic black-start.</li></ul>') +
        '</div><div style="height:12px"></div>' + ui.card('Power balance - today', '<div id="tr-pb"></div>');
    },
    init: function (root) { S.trendChart(root.querySelector('#tr-pb'), ['PPC.PLANT.P_LOAD', 'PPC.PLANT.P_PV', 'PPC.PLANT.P_DG'], 'today', 260); },
    update: function (root) {
      root.querySelectorAll('[data-ppcs]').forEach(function (d) { d.classList.toggle('on', Number(d.getAttribute('data-ppcs')) === S.sim.state); });
      var m = root.querySelector('#ppc-mode'); if (m) m.textContent = T['PPC.CTRL.MODE'].v === 1 ? 'AUTO' : 'MANUAL';
      var pb = root.querySelector('#pb');
      if (pb) {
        var it = [['Load', 'PPC.PLANT.P_LOAD'], ['PV', 'PPC.PLANT.P_PV'], ['BESS', 'PPC.PLANT.P_BESS'], ['Diesel', 'PPC.PLANT.P_DG']];
        var mx = 1100;
        pb.innerHTML = it.map(function (x) {
          var v = T[x[1]].v, w = Math.min(100, Math.abs(v) / mx * 100);
          return '<div class="hbar"><div class="hbar-l"><span>' + x[0] + (x[0] === 'BESS' ? (v < 0 ? ' (charging)' : ' (discharging)') : '') + '</span><b>' + v.toFixed(0) + ' kW</b></div><div class="hbar-t"><div class="hbar-f" style="width:' + w + '%"></div></div></div>';
        }).join('');
      }
    }
  };

  /* ---------------- operating sequences ---------------- */
  var SEQS = [
    ['Normal operation - PV + BESS', ['BESS PCS in grid-forming mode sets 11 kV bus voltage and frequency (VSG droop).', 'PV inverters operate at MPPT; PPC writes active-power limit when SOC ≥ curtailment SOC or BESS charge limit reached.', 'Reactive power shared by BESS; PV PF setpoint 1.0 (adjustable).', 'DGs in AUTO standby, ACBs open.']],
    ['DG assist / BESS recharge', ['Trigger: SOC < DG start SOC, or load > 90 % of BESS discharge limit, or forecast deficit.', 'PPC issues start to lead DG (DG1, else DG2). Crank → warm-up 20 s → synchronise to bus at LV side → close ACB Q1/Q2.', 'DG loaded to ' + C.ppc.dgOptLoadPct + ' % (optimum fuel efficiency), surplus charges BESS; PV curtailed if needed to hold DG ≥ min load.', 'Stop: SOC > DG stop SOC and min run time elapsed → ramp down → open ACB → cool-down ' + C.ppc.dgCoolDownMin + ' min → stop.']],
    ['BESS unavailable (fault / maintenance)', ['AH3 opened, PCS stopped. Lead DG becomes grid-forming (isochronous), lag DG load-shares.', 'PV limited so that DG loading ≥ min load (reverse-power protection 32 on AH1).', 'If load > DG capacity → load shedding (non-critical LVDB ways) - shedding table for approval.']],
    ['Black-start', null],
    ['Emergency shutdown (ESD)', ['Trigger: plant ESD push-button, SCADA ESD command, confirmed fire in GIS room / control room.', 'All 11 kV VCBs trip, PCS stop, DG ACBs open and DGs stop, PV inverters disconnect on loss of grid.', 'Restart only after ESD reset by an authorised operator and black-start sequence.']],
    ['BESS fire cause & effect', ['Pre-alarm (one detector / off-gas): alarm, exhaust fans ON, HVAC to recirculation.', 'Confirmed fire (two detectors / manual call point): stop PCS, trip AH3 + BESS ACB, 30 s countdown then release agent (unless inhibited).', 'PPC transfers to DG-only operation; black-start with DG if bus collapsed.']],
    ['Load shedding', ['Stage 1 (BESS at discharge limit / DG at 100 %): shed P.M. LVDB non-essential ways.', 'Stage 2 (under-frequency 49.0 Hz, 2 s): open AH6 OUT 2.', 'President supply (AH4) is the last load to be shed. Restoration automatic after 5 min stable.']]
  ];

  S.screens.seq = {
    title: 'Operating Sequences',
    render: function () {
      var bs = '<ol class="steps" id="bs-steps">' + S.sim.BLACKSTART.map(function (s) { return '<li>' + ui.esc(s.txt) + '</li>'; }).join('') + '</ol>' +
        '<div class="btnrow">' + ui.btn('START BLACK-START', 'PPC.CTRL', 'blackstart', 'b-amber') + '</div><p class="note" id="bs-st"></p>';
      return '<h2 class="scr-t">Operating sequences <small>for approval · implemented in PPC, demonstrated live in simulation</small></h2><div class="grid g2">' +
        SEQS.map(function (s) {
          return ui.card(s[0], s[1] ? '<ol class="steps">' + s[1].map(function (l) { return '<li>' + ui.esc(l) + '</li>'; }).join('') + '</ol>' : bs);
        }).join('') + '</div>';
    },
    update: function (root) {
      var lis = root.querySelectorAll('#bs-steps li'), sim = S.sim;
      lis.forEach(function (li, i) {
        li.classList.toggle('done', sim.seq === 'BLACKSTART' && i < sim.seqStep);
        li.classList.toggle('act', sim.seq === 'BLACKSTART' && i === sim.seqStep);
      });
      var st = root.querySelector('#bs-st');
      if (st) st.textContent = sim.seq === 'BLACKSTART' ? 'Running - step ' + (sim.seqStep + 1) + ' of ' + sim.BLACKSTART.length : 'Sequence idle. PPC state: ' + sim.stateNames[sim.state];
    }
  };
})(SCADA);
