/*
 * Command layer: user levels, interlocks, select-before-operate, audit trail.
 * All operator commands go through S.command() so interlocks and logging are
 * enforced in one place.
 */
(function (S) {
  var T = S.tags;
  function on(id) { return T[id] && !!T[id].v; }

  S.users = {
    viewer:   { name: 'viewer',   level: 1, label: 'VIEWER' },
    operator: { name: 'operator', level: 2, label: 'OPERATOR' },
    engineer: { name: 'engineer', level: 3, label: 'ENGINEER' },
    admin:    { name: 'admin',    level: 4, label: 'ADMIN' }
  };
  S.user = S.users.operator;

  S.events = [];
  S.event = function (src, msg, pri) {
    S.events.unshift({ t: S.sim ? S.sim.t : Date.now(), src: src, msg: msg, pri: pri || 4, user: S.user ? S.user.label : '' });
    if (S.events.length > 2000) S.events.length = 2000;
  };

  /* returns list of failed interlock texts for closing breaker `p` (tag prefix) */
  S.closeInterlocks = function (p) {
    var f = [];
    if (T[p + '.ES_EARTHED'] && on(p + '.ES_EARTHED')) f.push('Earth switch is in EARTHED position');
    if (T[p + '.DS_CLOSED'] && !on(p + '.DS_CLOSED')) f.push('Three-position switch not in CLOSED (line) position');
    if (T[p + '.CB_SPRING'] && !on(p + '.CB_SPRING')) f.push('Closing spring not charged');
    if (T[p + '.LOCKOUT_86'] && on(p + '.LOCKOUT_86')) f.push('Lockout relay 86 operated - reset required');
    if (T[p + '.SF6_LOLO'] && on(p + '.SF6_LOLO')) f.push('SF6 low-low pressure - operation blocked');
    if (T[p + '.LR_REMOTE'] && !on(p + '.LR_REMOTE')) f.push('Local/Remote switch in LOCAL');
    if (T[p + '.RLY_HEALTHY'] && !on(p + '.RLY_HEALTHY')) f.push('Protection relay not healthy');
    if (T[p + '.TCS_FAIL'] && on(p + '.TCS_FAIL')) f.push('Trip circuit supervision failed');
    if (on('PPC.CTRL.ESD')) f.push('Plant emergency shutdown active');
    if (T[p + '.CB_RACKED'] && !on(p + '.CB_RACKED')) f.push('Breaker not racked-in');
    if (p === 'GIS.AH3' && (on('BESS.SYS.ESD') || on('FIRE.FZ_BESS.FIRE'))) f.push('BESS ESD / fire alarm active');
    if (p === 'GIS.AH2' && !S.sim.busLive) f.push('11kV bus dead - PV cannot energise bus (grid-following)');
    if (/^DG\.DG\d_ACB$/.test(p)) {
      var g = p.slice(3, 6);
      if (!on('DG.' + g + '.RUNNING')) f.push('Generator not running');
      else if (S.sim.busLive && !on('DG.' + g + '.SYNC') && S.sim.dg[g].status !== 'SYNC' && S.sim.dg[g].status !== 'ONLINE') f.push('Generator not synchronised to bus');
    }
    return f;
  };

  S.closeIfAllowed = function (p) {
    if (S.closeInterlocks(p).length) return false;
    if (!on(p + '.CB_CLOSED')) { S.setCB(p, true); S.event('PPC', p + ' closed by sequence'); }
    return true;
  };

  /* minimum user level per action */
  var LEVEL = { open: 2, close: 2, reset: 2, start: 2, stop: 2, setpoint: 3, mode: 3, esd: 2, silence: 2, blackstart: 3, inject: 3 };

  S.command = function (p, action, val) {
    var need = LEVEL[action] || 2;
    if (S.user.level < need) return { ok: false, msg: 'Insufficient privileges - ' + (need === 3 ? 'ENGINEER' : 'OPERATOR') + ' level required' };
    var res = { ok: true, msg: '' };
    switch (action) {
      case 'open':
        S.setCB(p, false); res.msg = p + ' OPEN executed';
        if (/^DG\.DG\d_ACB$/.test(p)) S.sim.dg[p.slice(3, 6)].request = false;
        break;
      case 'close':
        var il = S.closeInterlocks(p);
        if (il.length) return { ok: false, msg: 'Interlock: ' + il.join('; ') };
        S.setCB(p, true); res.msg = p + ' CLOSE executed';
        if (T[p + '.CB_TRIPPED']) T[p + '.CB_TRIPPED'].v = 0;
        break;
      case 'reset':
        S.tagOrder.forEach(function (id) {
          if (id.indexOf(p + '.') === 0 && /\.(PROT_\w+|LOCKOUT_86|CB_TRIPPED|FAIL_START|SHUTDOWN|FAULT)$/.test(id)) T[id].v = 0;
        });
        res.msg = p + ' protection / fault RESET';
        break;
      case 'start':
        if (/^DG\.DG\d$/.test(p)) { S.sim.dg[p.slice(3)].request = true; if (T['PPC.CTRL.MODE'].v === 1) res.warn = 'PPC in AUTO may override manual DG start/stop'; }
        else if (p === 'BESS.SYS') { T['BESS.PCS1.RUN'].v = 1; T['BESS.PCS2.RUN'].v = 1; }
        else if (/^PV\.INV\d$/.test(p)) { S.config.pv.inverters.forEach(function (i) { if ('PV.' + i.id === p) i._stopped = false; }); }
        res.msg = p + ' START command sent';
        break;
      case 'stop':
        if (/^DG\.DG\d$/.test(p)) S.sim.dg[p.slice(3)].request = false;
        else if (p === 'BESS.SYS') { T['BESS.PCS1.RUN'].v = 0; T['BESS.PCS2.RUN'].v = 0; }
        else if (/^PV\.INV\d$/.test(p)) { S.config.pv.inverters.forEach(function (i) { if ('PV.' + i.id === p) i._stopped = true; }); }
        res.msg = p + ' STOP command sent';
        break;
      case 'setpoint':
        T[p].v = val; res.msg = p + ' set to ' + val;
        break;
      case 'esd': S.plantESD(); res.msg = 'Plant ESD'; break;
      case 'blackstart':
        T['PPC.CTRL.ESD'].v = 0;
        if (!S.startBlackStart()) return { ok: false, msg: '11kV bus already energised - black-start not required (ESD reset if it was active)' };
        res.msg = 'ESD reset, black-start initiated'; break;
      case 'silence': T['FIRE.FACP.SOUNDERS'].v = 0; res.msg = 'Fire sounders silenced'; break;
      default: return { ok: false, msg: 'Unknown action' };
    }
    S.event('CMD', res.msg, 3);
    return res;
  };
})(SCADA);
