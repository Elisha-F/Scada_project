/*
 * Commands: user roles, interlocks, select-before-operate, audit trail
 * (design report section 10). Two roles: Operator and Admin. Who may operate a
 * command tag comes from the 'Operated by' column of the submitted I/O list.
 */
(function (S) {
  var M = S.mtags;
  function on(id) { return M[id] && !!M[id].v; }

  S.users = {
    operator: { name: 'operator', level: 1, label: 'OPERATOR' },
    admin: { name: 'admin', level: 2, label: 'ADMIN' }
  };
  S.user = S.users.operator;
  var NEED = { Operator: 1, Admin: 2 };

  S.events = [];
  S.event = function (src, msg, level) {
    S.events.unshift({ t: S.sim ? S.sim.t : Date.now(), src: src, msg: msg, level: level || 0, user: S.user ? S.user.label : '' });
    if (S.events.length > 2000) S.events.length = 2000;
  };

  /* interlocks the CP-8050 checks before closing a model breaker (also used by the black-start sequence) */
  S.closeInterlocks = function (p) {
    var f = [];
    if (M[p + '.ES_EARTHED'] && on(p + '.ES_EARTHED')) f.push('Earth switch closed');
    if (M[p + '.DS_CLOSED'] && !on(p + '.DS_CLOSED')) f.push('Disconnector not closed');
    if (M[p + '.CB_SPRING'] && !on(p + '.CB_SPRING')) f.push('Closing spring not charged');
    if (M[p + '.LOCKOUT_86'] && on(p + '.LOCKOUT_86')) f.push('Protection trip not reset at the relay');
    if (M[p + '.SF6_LOLO'] && on(p + '.SF6_LOLO')) f.push('Gas pressure too low to operate');
    if (M[p + '.RLY_HEALTHY'] && !on(p + '.RLY_HEALTHY')) f.push('Protection relay not healthy');
    if ((p === 'GIS.AH1' || p === 'GIS.AH3') && !on('GIS.AH8.CB_CLOSED')) f.push('AH8 open: the 11 kV system would be unearthed');
    if (p === 'GIS.AH3' && (on('BESS.SYS.ESD') || on('FIRE.FZ_BESS.FIRE'))) f.push('Battery emergency stop or fire active');
    if (p === 'GIS.AH2' && !S.sim.busLive) f.push('11 kV busbar dead: PV cannot energise it');
    if (on('PPC.CTRL.ESD')) f.push('Emergency stop active');
    if (p === 'RMU.RMU_PRES_AH3' && on('RMU.RMU_PRES.QK11_EARTHED') || p === 'RMU.RMU_PM_AH3' && on('RMU.RMU_PM.QK11_EARTHED')) f.push('Transformer breaker earth switch closed');
    return f;
  };
  S.closeIfAllowed = function (p) {
    if (S.closeInterlocks(p).length) return false;
    if (!on(p + '.CB_CLOSED')) { S.setCB(p, true); S.event('EMS', p.replace(/^GIS\./, '') + ' closed by the black-start sequence'); }
    return true;
  };

  /* live list of reasons a command on a breaker would be refused */
  S.breakerBlocks = function (br, action) {
    var f = [], T = S.tags;
    if (br.lr && T[br.lr] && !T[br.lr].v) f.push('Local/remote switch in LOCAL: remote commands are blocked');
    if (br.clsd && T[br.clsd] && T[br.clsd].q !== 'GOOD') f.push('Position unknown: communication lost');
    if (action === 'close') {
      if (br.kind === 'switch') { if (br.es && T[br.es].v) f.push('Earth switch closed'); }
      else if (br.model) f = f.concat(S.closeInterlocks(br.model));
    }
    return f;
  };

  function breakerCmd(tagId) {
    for (var k in S.breakers) {
      var br = S.breakers[k];
      if (br.cmdOpen === tagId) return { br: br, action: 'open' };
      if (br.cmdClose === tagId) return { br: br, action: 'close' };
    }
    return null;
  }

  var RANGE = {
    'EMS-SOC-MIN-SP': [5, 30], 'EMS-SOC-MAX-SP': [80, 98], 'EMS-GEN-START-SP': [10, 50], 'EMS-GEN-STOP-SP': [50, 95], 'EMS-P-BESS-LIM-SP': [0, 950],
    'NB01-P-LIM-SP': [0, 100], 'NB02-P-LIM-SP': [0, 100], 'NB03-P-LIM-SP': [0, 100], 'NB04-P-LIM-SP': [0, 100]
  };
  S.spRange = function (id) { return RANGE[id]; };

  S.mayOperate = function (tagId) {
    var t = S.tags[tagId];
    return t && NEED[t.opby] !== undefined && S.user.level >= NEED[t.opby];
  };

  S.command = function (tagId, val) {
    var t = S.tags[tagId];
    if (!t || (t.type !== 'DO' && t.type !== 'AO')) return { ok: false, msg: 'Not a command or setpoint tag' };
    if (NEED[t.opby] === undefined) return { ok: false, msg: tagId + ' is operated automatically, not by users' };
    if (S.user.level < NEED[t.opby]) return { ok: false, msg: t.opby + ' role required' };
    var res = { ok: true, msg: tagId + ' executed' }, sim = S.sim;
    var bc = breakerCmd(tagId);
    if (bc) {
      var blocks = S.breakerBlocks(bc.br, bc.action);
      if (blocks.length) return { ok: false, msg: 'Blocked: ' + blocks.join('; ') };
      if (bc.br.kind === 'switch') M[bc.br.model + '_CLOSED'].v = bc.action === 'close' ? 1 : 0;
      else { S.setCB(bc.br.model, bc.action === 'close'); if (bc.action === 'close' && M[bc.br.model + '.CB_TRIPPED']) M[bc.br.model + '.CB_TRIPPED'].v = 0; if (bc.action === 'close') delete S.sim.uf[bc.br.model.replace(/^GIS\./, '')]; }
      res.msg = bc.br.title + ': ' + bc.action.toUpperCase() + ' (' + tagId + ')';
    } else if (/^DG\d-(START|STOP)-CMD$/.test(tagId)) {
      var g = tagId.slice(0, 3);
      if (on('DG.' + g + '.MODE_AUTO')) return { ok: false, msg: g + ' is in automatic: the EMS starts and stops it. An Admin can switch it to manual.' };
      sim.dg[g].manualRun = /START/.test(tagId);
      res.msg = g + (sim.dg[g].manualRun ? ' START' : ' STOP') + ' in manual mode (' + tagId + ')';
    } else if (/^DG\d-MODE-CMD$/.test(tagId)) {
      var g2 = tagId.slice(0, 3), auto = !on('DG.' + g2 + '.MODE_AUTO');
      M['DG.' + g2 + '.MODE_AUTO'].v = auto ? 1 : 0;
      sim.dg[g2].manualRun = !auto && sim.dg[g2].status !== 'OFF';
      res.msg = g2 + ' mode set to ' + (auto ? 'AUTOMATIC' : 'MANUAL') + ' (' + tagId + ')';
    } else if (/^NB\d\d-START-STOP-CMD$/.test(tagId)) {
      var inv = S.config.pv.inverters.filter(function (i) { return i.tag === tagId.slice(0, 4); })[0];
      inv._stopped = !inv._stopped;
      res.msg = inv.tag + (inv._stopped ? ' STOP' : ' START') + ' (' + tagId + ')';
    } else if (tagId === 'EMS-MODE-CMD') {
      M['PPC.CTRL.MODE'].v = M['PPC.CTRL.MODE'].v ? 0 : 1;
      res.msg = 'EMS operating mode set to ' + (M['PPC.CTRL.MODE'].v ? 'AUTOMATIC' : 'MANUAL');
    } else if (tagId === 'EMS-CRATE-CMD') {
      sim.crateLimit = !sim.crateLimit;
      res.msg = 'Battery C-rate limit ' + (sim.crateLimit ? 'ENABLED' : 'DISABLED for calibration');
    } else if (tagId === 'EMS-RESET-L3-CMD') {
      M['BESS.SYS.BMS_WARN'].v = 0;
      res.msg = 'EMS level 3 faults reset';
    } else if (tagId === 'EMS-RESET-L12-CMD') {
      ['BESS.SYS.BMS_FAULT', 'BESS.HVAC.FAULT'].forEach(function (id) { M[id].v = 0; });
      for (var r = 1; r <= S.config.bess.racks; r++) M['BESS.RACK' + r + '.FAULT'].v = 0;
      res.msg = 'EMS level 1 and 2 faults reset';
    } else if (t.type === 'AO') {
      var rg = RANGE[tagId];
      if (typeof val !== 'number' || !isFinite(val)) return { ok: false, msg: 'Enter a number' };
      if (rg && (val < rg[0] || val > rg[1])) return { ok: false, msg: 'Out of range ' + rg[0] + ' to ' + rg[1] + ' ' + t.unit };
      if (tagId === 'EMS-SOC-MIN-SP') sim.socMin = val;
      else if (tagId === 'EMS-SOC-MAX-SP') M['PPC.CTRL.SP_SOC_HIGH'].v = val;
      else if (tagId === 'EMS-GEN-START-SP') M['PPC.CTRL.SP_SOC_DG_START'].v = val;
      else if (tagId === 'EMS-GEN-STOP-SP') M['PPC.CTRL.SP_SOC_DG_STOP'].v = val;
      else if (tagId === 'EMS-P-BESS-LIM-SP') sim.bessLimit = val;
      else if (/^NB\d\d-P-LIM-SP$/.test(tagId)) M['PV.INV' + Number(tagId.slice(2, 4)) + '.SP_PLIM'].v = val;
      t.v = val;
      res.msg = t.desc + ' (' + tagId + ') set to ' + val + ' ' + t.unit;
    } else {
      return { ok: false, msg: 'No handler for ' + tagId };
    }
    S.event('CMD', res.msg, 0);
    return res;
  };
})(SCADA);
