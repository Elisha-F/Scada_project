/* Auxiliaries: auxiliary transformer and LV board, UPS, DC supplies, switchroom, emergency stops and doors */
(function (S) {
  var ui = S.ui;

  function auxSvg() {
    var s = '<svg class="sld" viewBox="0 0 760 230">';
    s += ui.text(20, 22, 'from 11 kV switchboard AH5', 'lbl-xs', 'start') + ui.line(60, 28, 60, 48, 'auxHv') + ui.cb(60, 60, 'AH5', 'AH5', { left: false }) + ui.line(60, 72, 60, 90, 'auxHv');
    s += '<rect x="53" y="90" width="14" height="26" fill="#fff" stroke="#4c5a67" stroke-width="1.6"/>' + ui.text(76, 107, 'XRNT-3A fuse', 'lbl-xs', 'start');
    s += ui.line(60, 116, 60, 140, 'auxTx') + ui.tx(60, 165, 'Auxiliary transformer 100 kVA', '11/0.4 kV', 'auxTx', 'auxLv').replace('translate(60,165)', 'translate(60,162)');
    s += ui.line(60, 188, 60, 200, 'auxLv') + ui.line(60, 200, 200, 200, 'auxLv') + ui.cb(220, 200, 'AUXLV-INC', 'Incomer') + ui.line(232, 200, 300, 200, 'auxLv');
    s += ui.meter(270, 165, 'AUXLV') + ui.val(290, 160, 'AUXLV-P', 'val-b');
    s += '<line class="ln" data-live="auxLv" x1="300" y1="190" x2="740" y2="190" stroke-width="5"/>';
    ['UPS and SCADA', 'DC chargers', 'Switchroom HVAC', 'Lighting and power', 'Battery auxiliaries', 'Inverter station'].forEach(function (n, i) {
      var x = 340 + i * 72;
      s += ui.line(x, 190, x, 205, 'auxLv') + ui.load(x, 205, 'auxLv') + ui.text(x, 228, n, 'lbl-xs');
    });
    s += ui.text(520, 175, 'Auxiliary LV board', 'lbl-s');
    return s + '</svg>';
  }

  S.screens.aux = {
    title: 'Auxiliaries',
    render: function () {
      return '<h2 class="scr-t">Auxiliaries <small>auxiliary transformer, LV board, UPS, DC supplies, switchroom, emergency stops and doors · switchroom I/O drop</small></h2>' +
        ui.card('Auxiliary supply', auxSvg()) + '<div style="height:12px"></div><div class="grid g4">' +
        ui.card('Auxiliary transformer 100 kVA', ui.lamp('T-AUX-FUSE', 'HV fuse blown') + ui.lamp('T-AUX-OT-ALM', 'Oil temperature alarm') + ui.lamp('T-AUX-OT-TRIP', 'Oil temperature trip') +
          ui.lamp('T-AUX-WT-ALM', 'Winding temperature alarm') + ui.lamp('T-AUX-WT-TRIP', 'Winding temperature trip') + ui.lamp('T-AUX-PRD', 'Pressure relief operated') + ui.lamp('T-AUX-OL-LOW', 'Oil level low')) +
        ui.card('Auxiliary LV board', '<div class="kv"><span class="k">Incomer</span>' + ui.cbState('AUXLV-INC') + '</div>' + ui.lamp('AUXLV-INC-TRIP', 'Incomer tripped') + ui.lamp('AUXLV-SPD-FLT', 'Surge arrester failed') +
          ui.kv('P', 'AUXLV-P') + ui.kv('Q', 'AUXLV-Q') + ui.kv('PF', 'AUXLV-PF') + ui.kv('U L1-N', 'AUXLV-U-L1N') + ui.kv('I L1', 'AUXLV-I-L1') + ui.kv('Frequency', 'AUXLV-F') + ui.kv('THD U', 'AUXLV-THD-U') + ui.kv('Energy', 'AUXLV-E-P')) +
        ui.card('UPS for the SCADA cabinet', ui.lamp('UPS-ON-BATT', 'On battery') + ui.lamp('UPS-BATT-LOW', 'Battery low') + ui.lamp('UPS-FLT', 'Fault') + ui.lamp('UPS-BYPASS', 'On bypass') +
          ui.kv('Input voltage', 'UPS-U-IN') + ui.kv('Output load', 'UPS-LOAD') + ui.kv('Battery charge', 'UPS-BATT-CHG') + ui.kv('Runtime remaining', 'UPS-RUNTIME') +
          '<p class="note">On battery and fault are both hardwired and read over SNMP / Modbus (tags ending -COM).</p>') +
        ui.card('DC supplies and switchroom', ui.kv('110 V DC bus', 'DC-110-V') + ui.kv('24 V DC bus', 'DC-24-V') + ui.lamp('DC-CHG-FLT', 'DC charger fault') + ui.lamp('DC-EARTH-FLT', 'DC earth fault') +
          ui.lamp('DC-UV', 'DC bus undervoltage') + ui.lamp('SWR-HVAC-FLT', 'Switchroom air conditioning fault') + ui.lamp('SWR-TEMP-HI', 'Switchroom temperature high')) +
        '</div><div style="height:12px"></div><div class="grid g2">' +
        ui.card('Emergency stops', ui.lamp('ESTOP-SWR', 'Emergency stop pressed, switchroom') + ui.lamp('ESTOP-BESS', 'Emergency stop pressed, battery area') +
          '<p class="note">Emergency stops act through hardwired circuits on the battery, PV and generators and are reset locally. The SCADA only shows them.</p>') +
        ui.card('Doors and I/O panels', '<div class="grid g2"><div>' + ui.lamp('DOOR-SCADA', 'SCADA cabinet door') + ui.lamp('DOOR-SWR', 'Switchroom door') + ui.lamp('DOOR-GIS', '11 kV switchgear room door') +
          ui.lamp('DOOR-BESS', 'Battery container door') + '</div><div>' + ui.lamp('YARD-PNL-SUP-OK', 'Yard I/O panel supply') + ui.lamp('YARD-PNL-DOOR', 'Yard I/O panel door') +
          ui.lamp('GEN-PNL-SUP-OK', 'Generator I/O panel supply') + ui.lamp('GEN-PNL-DOOR', 'Generator I/O panel door') + '</div></div>') + '</div>';
    }
  };
})(SCADA);
