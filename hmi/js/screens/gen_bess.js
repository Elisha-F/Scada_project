/* Diesel generator and BESS screens */
(function (S) {
  var ui = S.ui, T = S.tags, C = S.config;
  var DGSTEPS = ['OFF', 'CRANKING', 'WARMUP', 'SYNC', 'ONLINE', 'COOLDOWN'];

  function dgSld() {
    var s = '<svg class="sld" viewBox="0 0 640 230">';
    s += ui.text(320, 18, 'to 11kV GIS AH1 (DG SETS)', 'lbl-xs');
    s += ui.line(320, 24, 320, 44, 'dgHv') + ui.cb(320, 56, 'GIS.AH1', 'AH1 QF11', { title: 'AH1 DG incomer VCB' }) + ui.line(320, 68, 320, 82, 'dgHv');
    s += ui.tx(320, 105, '1.5MVA 11/0.4kV Dyn11', 'DG step-up TX', 'dgHv', 'dgLv');
    s += ui.line(320, 130, 320, 140, 'dgLv') + ui.cb(320, 150, 'DG.TX_LV', 'LV ACB', { title: 'DG TX LV ACB' }) + ui.line(320, 162, 320, 172, 'dgLv');
    s += '<line class="ln" data-live="dgLv" x1="140" y1="172" x2="500" y2="172" stroke-width="5"/>';
    C.generators.forEach(function (g, i) {
      var x = i ? 460 : 180;
      s += ui.line(x, 172, x, 182, 'dgLv') + ui.cb(x, 192, 'DG.' + g.id + '_ACB', g.acb, { title: g.name + ' ' + g.acb }) + ui.line(x, 203, x, 210, 'DG.' + g.id + '.RUNNING');
      s += ui.text(x, 225, g.name + ' · ' + g.kva + ' kVA', 'lbl-s');
    });
    return s + '</svg>';
  }

  S.screens.gen = {
    title: 'Diesel Generators',
    render: function () {
      var h = '<h2 class="scr-t">Diesel generators <small>' + C.dgController + ' · back-up / BESS recharge source</small></h2>' +
        '<div class="grid g-side"><div class="grid g2">';
      C.generators.forEach(function (g) {
        var p = 'DG.' + g.id;
        h += ui.card(g.name + ' · ' + g.kva + ' kVA / ' + g.kw + ' kW',
          '<div class="statebox" id="st-' + g.id + '">' + DGSTEPS.map(function (s) { return '<div class="st" data-s="' + s + '">' + s + '</div>'; }).join('') + '</div>' +
          ui.bar(p + '.LOAD_PCT', 100, 'Load') +
          '<div class="grid g2"><div><h4>Electrical</h4>' + ui.kv('Active power', p + '.P') + ui.kv('Reactive power', p + '.Q') + ui.kv('Voltage L1-L2', p + '.U_L12') +
          ui.kv('Current L1', p + '.I_L1') + ui.kv('Frequency', p + '.F') + ui.kv('Power factor', p + '.PF') + ui.kv('Energy', p + '.E_EXP') +
          '<div class="kv"><span class="k">' + g.acb + '</span>' + ui.cbState(p + '_ACB') + '</div></div>' +
          '<div><h4>Engine</h4>' + ui.kv('Speed', p + '.RPM') + ui.kv('Oil pressure', p + '.OIL_P') + ui.kv('Coolant temp.', p + '.COOL_T') + ui.kv('Fuel level', p + '.FUEL') +
          ui.kv('Fuel rate', p + '.FUEL_RATE') + ui.kv('Battery', p + '.BATT_V') + ui.kv('Run hours', p + '.HOURS') + ui.kv('Starts', p + '.STARTS') + '</div></div>' +
          '<h4>Status &amp; alarms</h4><div class="grid g2"><div>' + ui.lamp(p + '.READY', 'Ready / auto') + ui.lamp(p + '.RUNNING', 'Running') + ui.lamp(p + '.SYNC', 'Synchronised') +
          ui.lamp(p + '.COMMON_ALM', 'Common warning') + ui.lamp(p + '.LOW_FUEL', 'Low fuel') + ui.lamp(p + '.BATT_CHG_FAIL', 'Charger fail') + '</div><div>' +
          ui.lamp(p + '.SHUTDOWN', 'Shutdown') + ui.lamp(p + '.FAIL_START', 'Fail to start') + ui.lamp(p + '.LOW_OILP', 'Low oil pressure') + ui.lamp(p + '.HIGH_TEMP', 'High coolant temp') +
          ui.lamp(p + '.OVERSPEED', 'Overspeed') + ui.lamp(p + '.ESTOP', 'E-stop') + '</div></div>' +
          '<div class="btnrow">' + ui.btn('START', p, 'start', 'b-blue') + ui.btn('STOP', p, 'stop', 'b-gray') + ui.btn('RESET', p, 'reset', 'b-amber') +
          ui.btn('OPEN ACB', p + '_ACB', 'open', 'b-green') + ui.btn('CLOSE ACB', p + '_ACB', 'close', 'b-red') + '</div>');
      });
      h += ui.card('DG LV bus · single line', dgSld(), 'dark wide2') + '</div><aside>' +
        ui.card('Dispatch (PPC)', ui.kv('Total DG power', 'PPC.PLANT.P_DG') + ui.kv('DG energy today', 'PPC.PLANT.E_DG_DAY') + ui.kv('Start SOC', 'PPC.CTRL.SP_SOC_DG_START') +
          ui.kv('Stop SOC', 'PPC.CTRL.SP_SOC_DG_STOP') + ui.kv('Minimum load', 'PPC.CTRL.SP_DG_MINLOAD') + ui.kv('Step-up TX load', 'TX.DGTX.LOAD') + ui.kv('TX winding temp', 'TX.DGTX.T_WDG') +
          '<p class="note">DG1 is lead when available. Start on SOC &lt; start setpoint or BESS discharge limit, stop when SOC &gt; stop setpoint after ' + C.ppc.dgMinRunMin + ' min minimum run, ' + C.ppc.dgCoolDownMin + ' min cool-down.</p>') +
        '</aside></div>';
      return h;
    },
    update: function (root) {
      C.generators.forEach(function (g) {
        var st = S.sim.dg[g.id].status, el = root.querySelector('#st-' + g.id);
        if (!el) return;
        el.querySelectorAll('.st').forEach(function (d) { d.classList.toggle('on', d.getAttribute('data-s') === st); });
      });
    }
  };

  /* ---------------- BESS ---------------- */
  function bessSld() {
    var s = '<svg class="sld" viewBox="0 0 560 300">';
    s += ui.text(280, 16, 'to 11kV GIS AH3 (BESS IN)', 'lbl-xs');
    s += ui.line(280, 22, 280, 38, 'bessHv') + ui.cb(280, 50, 'GIS.AH3', 'AH3 QF13', { title: 'AH3 BESS incomer VCB' }) + ui.line(280, 62, 280, 76, 'bessHv');
    s += ui.tx(280, 100, '1MVA 11/0.69kV Dd0', 'BESS TX', 'bessHv', 'bessLv');
    s += ui.line(280, 125, 280, 135, 'bessLv') + ui.cb(280, 146, 'BESS.LV_ACB', 'ACB 1000A 15kA', { title: 'BESS LV ACB' }) + ui.line(280, 158, 280, 170, 'bessLv');
    s += '<line class="ln" data-live="bessLv" x1="150" y1="170" x2="410" y2="170" stroke-width="5"/>';
    C.bess.pcs.forEach(function (pc, i) {
      var x = i ? 370 : 190;
      s += ui.line(x, 170, x, 200, 'bessLv') + ui.pcs(x, 222, pc) + ui.val(x + 28, 220, 'BESS.' + pc.id + '.P', 'val') + ui.val(x + 28, 234, 'BESS.' + pc.id + '.T_IGBT', 'val');
      s += ui.line(x, 242, x, 262, 'BESS.' + pc.id + '.RUN') + '<rect x="' + (x - 40) + '" y="262" width="80" height="26" rx="3" fill="#e9f6fb" stroke="#3fa9c9"/>' + ui.text(x, 279, 'Battery 4 racks', 'lbl-xs');
    });
    return s + '</svg>';
  }

  S.screens.bess = {
    title: 'BESS Overview',
    render: function () {
      var sys = 'BESS.SYS';
      return '<h2 class="scr-t">Battery energy storage system <small>' + C.bess.kwh + ' kWh · ' + C.bess.config + ' · ' + C.bess.mode + '</small></h2>' +
        '<div class="grid g3">' +
        ui.card('State', '<svg viewBox="0 0 300 150" style="width:100%;height:150px">' + ui.battery(20, 20, 70, 120) + ui.val(110, 50, sys + '.SOC', 'val-b') + ui.text(110, 30, 'State of charge', 'lbl-xs', 'start') +
          ui.text(110, 75, 'Active power (+dis / −chg)', 'lbl-xs', 'start') + ui.val(110, 93, sys + '.P', 'val-b') + ui.text(110, 118, 'Available energy', 'lbl-xs', 'start') + ui.val(110, 136, sys + '.E_AVAIL', 'val-b') + '</svg>' +
          ui.kv('State of health', sys + '.SOH') + ui.kv('Reactive power', sys + '.Q') + ui.kv('DC voltage', sys + '.U_DC') + ui.kv('DC current', sys + '.I_DC') +
          ui.kv('Charge limit', sys + '.P_CHG_MAX') + ui.kv('Discharge limit', sys + '.P_DIS_MAX') + ui.kv('Energy charged', sys + '.E_CHG') + ui.kv('Energy discharged', sys + '.E_DIS') + ui.kv('Equivalent cycles', sys + '.CYCLES')) +
        ui.card('Single line', bessSld() + '<div class="grid g2" style="margin-top:6px">' + C.bess.pcs.map(function (pc) {
          var p = 'BESS.' + pc.id;
          return '<div><h4>' + pc.name + '</h4>' + ui.lamp(p + '.RUN', 'Running') + ui.lamp(p + '.FAULT', 'Fault') + ui.lamp(p + '.ACB_CLOSED', 'AC breaker closed') + ui.lamp(p + '.DC_SW', 'DC switch closed') + ui.lamp('BESS.BCP' + pc.id.slice(-1) + '.SW_CLOSED', 'BCP DC switch closed') + ui.lamp('BESS.BCP' + pc.id.slice(-1) + '.FUSE_BLOWN', 'BCP fuse blown') + ui.kv('BCP DC current', 'BESS.BCP' + pc.id.slice(-1) + '.I_DC') +
            ui.kv('U AC', p + '.U_AC') + ui.kv('I AC', p + '.I_AC') + ui.kv('U DC', p + '.U_DC') + '</div>';
        }).join('') + '</div>') +
        ui.card('Cells, HVAC &amp; control', ui.kv('Max cell temp.', sys + '.T_CELL_MAX') + ui.kv('Min cell temp.', sys + '.T_CELL_MIN') + ui.kv('Max cell voltage', sys + '.U_CELL_MAX') + ui.kv('Min cell voltage', sys + '.U_CELL_MIN') +
          ui.kv('Cabin temperature', 'BESS.HVAC.T_CABIN') + ui.kv('Cabin humidity', 'BESS.HVAC.HUM') + ui.lamp('BESS.HVAC.RUN', 'HVAC / liquid cooling running') + ui.lamp('BESS.HVAC.FAULT') +
          '<h4>Status</h4>' + ui.lamp(sys + '.GRID_FORMING', 'Grid-forming') + ui.lamp(sys + '.BMS_FAULT') + ui.lamp(sys + '.BMS_WARN') + ui.lamp(sys + '.ESD') + ui.lamp(sys + '.DOOR') +
          ui.lamp('FIRE.FZ_BESS.PRE_ALM', 'Fire pre-alarm') + ui.lamp('FIRE.FZ_BESS.FIRE', 'Fire alarm') + ui.kv('H2', 'FIRE.FZ_BESS.GAS_H2') + ui.kv('CO', 'FIRE.FZ_BESS.GAS_CO') +
          '<h4>Commands &amp; setpoints</h4><div class="btnrow">' + ui.btn('START', sys, 'start', 'b-blue') + ui.btn('STOP', sys, 'stop', 'b-gray') + ui.btn('RESET', sys, 'reset', 'b-amber') + '</div>' +
          '<div class="btnrow">' + ui.btn('Mode', sys + '.CMD_MODE', 'setpoint', 'b-small2') + ui.btn('f setpoint', sys + '.SP_F', 'setpoint') + ui.btn('U setpoint', sys + '.SP_U', 'setpoint') + ui.btn('P setpoint', sys + '.SP_P', 'setpoint') + '</div>' +
          ui.kv('Mode (0 stop / 1 GFM / 2 GFL)', sys + '.CMD_MODE') + ui.kv('f setpoint', sys + '.SP_F') + ui.kv('U setpoint', sys + '.SP_U')) +
        '</div>';
    }
  };

  S.screens.racks = {
    title: 'Racks & BMS',
    render: function () {
      var h = '<h2 class="scr-t">Battery racks &amp; BMS <small>' + C.bess.racks + ' racks · 416S8P · 3.2 V 314 Ah LFP</small></h2><div class="grid g4">';
      for (var r = 1; r <= C.bess.racks; r++) {
        var p = 'BESS.RACK' + r;
        h += ui.card('Rack ' + r, ui.bar(p + '.SOC', 100, 'SOC') + ui.kv('Voltage', p + '.U') + ui.kv('Current', p + '.I') + ui.kv('Max cell temp.', p + '.T_MAX') +
          ui.kv('Max cell V', p + '.U_CMAX') + ui.kv('Min cell V', p + '.U_CMIN') + '<div class="kv"><span class="k">Cell ΔV</span><span class="v" data-dv="' + r + '"></span></div>' +
          ui.lamp(p + '.CONTACTOR', 'Main contactor closed') + ui.lamp(p + '.FAULT', 'Rack fault'));
      }
      return h + '</div><p class="note">Cell-level data (416 cell voltages / temperatures per rack) is held in the BMS and shown on the vendor EMS web page; SCADA receives rack min/max and alarms to keep the I/O count manageable.</p>';
    },
    update: function (root) {
      root.querySelectorAll('[data-dv]').forEach(function (el) {
        var r = el.getAttribute('data-dv');
        el.textContent = ((T['BESS.RACK' + r + '.U_CMAX'].v - T['BESS.RACK' + r + '.U_CMIN'].v) * 1000).toFixed(0) + ' mV';
      });
    }
  };
})(SCADA);
