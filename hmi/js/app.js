/*
 * HMI shell: navigation, alarm engine, faceplates, select-before-operate,
 * header/footer status and the 1 s scan loop.
 */
(function (S) {
  var T = S.tags, ui = S.ui, C = S.config;
  S.screens = S.screens || {};

  S.nav = [
    { id: 'overview', label: 'OVERVIEW', subs: [['overview', 'Plant Overview'], ['info', 'Plant Information'], ['network', 'Network & Cybersecurity']] },
    { id: 'mv', label: 'MV SWITCHGEAR', subs: [['gis', '11kV GIS Combiner'], ['prot', 'Protection & NECR'], ['rmu', 'Remote RMUs']] },
    { id: 'gen', label: 'GENERATOR', subs: [['gen', 'Diesel Generators']] },
    { id: 'bat', label: 'BATTERY', subs: [['bess', 'BESS Overview'], ['racks', 'Racks & BMS']] },
    { id: 'pv', label: 'PV SYSTEM', subs: [['pv', 'Inverters'], ['strings', 'String Monitoring'], ['weather', 'Weather Station']] },
    { id: 'load', label: 'LOAD', subs: [['lvdb_pres', 'President LVDB'], ['lvdb_pm', 'P.M. LVDB'], ['aux', 'Auxiliary & UPS']] },
    { id: 'safety', label: 'FIRE & SAFETY', subs: [['fire', 'Fire Detection & Suppression']] },
    { id: 'ppc', label: 'PPC', subs: [['ppc', 'Plant Controller'], ['seq', 'Operating Sequences']] },
    { id: 'alm', label: 'ALARMS', subs: [['alarms', 'Active Alarms'], ['events', 'Event Log']] },
    { id: 'trd', label: 'TRENDS', subs: [['trends', 'Trends']] },
    { id: 'io', label: 'I/O LIST', subs: [['iolist', 'I/O List']] },
    { id: 'sys', label: 'SYSTEM', subs: [['system', 'Users & Simulation']] }
  ];

  var current = null;

  /* ================= alarms ================= */
  S.alarms = {};
  function evalAlarms() {
    var now = S.sim.t;
    S.tagOrder.forEach(function (id) {
      var t = T[id], act = false, pri = 4, txt = t.desc;
      if (t.alarm) { act = t.q === 'GOOD' && Number(t.v) === t.alarm.on; pri = t.alarm.pri; }
      else if (t.lim && t.type === 'AI' && t.q === 'GOOD') {
        var l = t.lim, v = t.v;
        if (l.hihi !== undefined && v >= l.hihi) { act = true; pri = 1; txt += ' HIGH-HIGH'; }
        else if (l.lolo !== undefined && v <= l.lolo && v !== 0) { act = true; pri = 1; txt += ' LOW-LOW'; }
        else if (l.hi !== undefined && v >= l.hi) { act = true; pri = 2; txt += ' HIGH'; }
        else if (l.lo !== undefined && v <= l.lo && v !== 0) { act = true; pri = 2; txt += ' LOW'; }
      } else if (!t.alarm && !t.lim) return;
      if (t.area === 'GIS' && t.equip === 'AH7' && t.sig !== 'SF6_LOW' && t.sig !== 'SF6_LOLO') return; // spare panel
      var a = S.alarms[id];
      if (act && (!a || !a.active)) {
        if (!a || a.acked) S.alarms[id] = a = { id: id, tIn: now, acked: false };
        a.active = true; a.pri = pri; a.txt = txt; a.tOut = null; a.val = ui.fmt(id);
        S.event('ALM', txt + ' - ALARM (' + id + ')', pri);
      } else if (!act && a && a.active) {
        a.active = false; a.tOut = now;
        S.event('ALM', a.txt + ' - normal', 4);
        if (a.acked) delete S.alarms[id];
      } else if (a && a.active) a.val = ui.fmt(id);
    });
  }
  S.alarmList = function () {
    return Object.keys(S.alarms).map(function (k) { return S.alarms[k]; })
      .sort(function (a, b) { return (a.acked - b.acked) || (a.pri - b.pri) || (b.tIn - a.tIn); });
  };
  S.ackAlarm = function (id) {
    if (S.user.level < 2) return;
    var ids = id ? [id] : Object.keys(S.alarms);
    ids.forEach(function (k) {
      var a = S.alarms[k]; if (!a || a.acked) return;
      a.acked = true; S.event('ACK', 'Alarm acknowledged: ' + a.txt, 4);
      if (!a.active) delete S.alarms[k];
    });
    refreshChrome();
  };

  /* ================= time helpers ================= */
  S.fmtTime = function (t, withDate) {
    var d = new Date(t + 3 * 3600e3);
    function z(n) { return ('0' + n).slice(-2); }
    var s = z(d.getUTCHours()) + ':' + z(d.getUTCMinutes()) + ':' + z(d.getUTCSeconds());
    return withDate ? z(d.getUTCDate()) + '.' + z(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear() + ' ' + s : s;
  };

  /* ================= shell ================= */
  function buildShell() {
    var top = S.nav.map(function (n) { return '<a class="nav-top" data-group="' + n.id + '">' + n.label + '</a>'; }).join('');
    document.getElementById('nav').innerHTML = top;
    document.getElementById('nav').addEventListener('click', function (e) {
      var a = e.target.closest('[data-group]'); if (!a) return;
      var g = S.nav.filter(function (n) { return n.id === a.getAttribute('data-group'); })[0];
      go(g.subs[0][0]);
    });
    document.getElementById('subnav').addEventListener('click', function (e) {
      var a = e.target.closest('[data-screen]'); if (a) go(a.getAttribute('data-screen'));
    });
    document.getElementById('alarmbanner').addEventListener('click', function () { go('alarms'); });
    document.getElementById('ackall').addEventListener('click', function (e) { e.stopPropagation(); S.ackAlarm(); });
    document.getElementById('userbtn').addEventListener('click', function () { go('system'); });
    document.getElementById('main').addEventListener('click', onMainClick);
    window.addEventListener('hashchange', function () { var h = location.hash.slice(1); if (h && h !== current) go(h, true); });
    document.getElementById('modal').addEventListener('click', function (e) { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });
  }

  function groupOf(screen) {
    for (var i = 0; i < S.nav.length; i++) for (var j = 0; j < S.nav[i].subs.length; j++) if (S.nav[i].subs[j][0] === screen) return S.nav[i];
    return S.nav[0];
  }

  function go(id, fromHash) {
    if (!S.screens[id]) id = 'overview';
    current = id;
    if (!fromHash) location.hash = id;
    var g = groupOf(id);
    document.querySelectorAll('.nav-top').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-group') === g.id); });
    document.getElementById('subnav').innerHTML = g.subs.map(function (s) {
      return '<a data-screen="' + s[0] + '" class="' + (s[0] === id ? 'active' : '') + '">' + s[1] + '</a>';
    }).join('');
    var sc = S.screens[id];
    var main = document.getElementById('main');
    main.innerHTML = '<div class="screen" id="scr-' + id + '">' + sc.render() + '</div>';
    if (sc.init) sc.init(main);
    ui.update(main);
    if (sc.update) sc.update(main);
    document.title = sc.title + ' · ' + C.site.short + ' SCADA';
  }
  S.go = go;

  /* ================= clicks: faceplates & commands ================= */
  function onMainClick(e) {
    var fp = e.target.closest('[data-fp]');
    if (fp) {
      var kind = fp.getAttribute('data-fp'), p = fp.getAttribute('data-p');
      if (kind === 'cb') return openCbFaceplate(p, fp.getAttribute('data-title'));
      if (kind === 'meter') return openMeter(p, fp.getAttribute('data-title'));
      if (kind === 'dg') return go('gen');
      if (kind === 'inv') return go('pv');
      if (kind === 'bess') return go('bess');
      if (kind === 'go') return go(p);
    }
    var b = e.target.closest('[data-cmd]');
    if (b) {
      var act = b.getAttribute('data-cmd'), pp = b.getAttribute('data-p');
      if (act === 'setpoint') return openSetpoint(pp);
      return sbo(pp, act, b.getAttribute('data-label') || b.textContent);
    }
  }

  function openModal(title, body) {
    var m = document.getElementById('modal');
    m.innerHTML = '<div class="dlg"><header><span>' + title + '</span><button class="x" data-close>×</button></header><div class="dlg-b">' + body + '</div></div>';
    m.classList.add('show');
    ui.update(m);
    return m;
  }
  function closeModal() { var m = document.getElementById('modal'); m.classList.remove('show'); m.innerHTML = ''; modalUpdate = null; }
  var modalUpdate = null;

  function openCbFaceplate(p, title) {
    var rows = ['DS_CLOSED:3-pos switch closed', 'ES_EARTHED:Earth switch earthed', 'CB_SPRING:Spring charged', 'LR_REMOTE:Remote mode', 'CB_RACKED:Racked-in',
      'RLY_HEALTHY:Relay healthy', 'TCS_FAIL:Trip circuit fail', 'SF6_LOW:SF6 low', 'SF6_LOLO:SF6 low-low', 'LOCKOUT_86:Lockout 86', 'CB_TRIPPED:Tripped'];
    var st = rows.filter(function (r) { return T[p + '.' + r.split(':')[0]]; }).map(function (r) { var k = r.split(':'); return ui.lamp(p + '.' + k[0], k[1]); }).join('');
    var meas = ['P', 'Q', 'I_L1', 'I_L2', 'I_L3', 'U_L12', 'PF', 'F'].filter(function (s) { return T[p + '.' + s]; }).map(function (s) { return ui.kv(T[p + '.' + s].desc, p + '.' + s); }).join('');
    var reset = T[p + '.CMD_RESET'] ? ui.btn('RESET', p, 'reset', 'b-gray') : '';
    var m = openModal(ui.esc(title) + ' <small>' + p + '</small>',
      '<div class="fp-state">State: ' + ui.cbState(p) + '</div>' +
      '<div class="fp-grid"><div><h4>Status</h4>' + st + '</div><div><h4>Measurements</h4>' + (meas || '<p class="muted">No metering at this point</p>') + '</div></div>' +
      '<h4>Close interlocks</h4><ul class="ilk" id="ilk"></ul>' +
      '<div class="fp-btns">' + ui.btn('OPEN', p, 'open', 'b-green') + ui.btn('CLOSE', p, 'close', 'b-red') + reset + '</div>' +
      '<p class="note">Commands use select-before-operate. Three-position / earthing switches are operated locally only (status indication in SCADA).</p>');
    m.querySelector('.dlg-b').addEventListener('click', onMainClick);
    modalUpdate = function () {
      var il = S.closeInterlocks(p);
      var el = m.querySelector('#ilk');
      if (el) el.innerHTML = il.length ? il.map(function (x) { return '<li class="ilk-bad">✖ ' + ui.esc(x) + '</li>'; }).join('') : '<li class="ilk-ok">✔ All close interlocks healthy</li>';
    };
    modalUpdate();
  }

  function openMeter(p, title) {
    var ids = S.tagOrder.filter(function (id) { return id.indexOf(p + '.') === 0 && T[id].type === 'AI'; });
    openModal('Power meter <small>' + p + '</small>', '<div class="fp-grid1">' + ids.map(function (id) { return ui.kv(T[id].desc, id); }).join('') + '</div>');
  }

  function sbo(p, act, label) {
    var m = openModal('Select before operate', '<p class="sbo-q">Command <b>' + ui.esc(label.trim()) + '</b> on <b>' + p + '</b></p>' +
      '<p class="muted">Selected by ' + S.user.label + '. Execute within 30 s.</p><div class="fp-btns"><button class="btn b-blue" id="exe">EXECUTE</button><button class="btn b-gray" data-close>CANCEL</button></div><p id="sbo-r"></p>');
    var to = setTimeout(function () { if (document.getElementById('exe')) { document.getElementById('sbo-r').textContent = 'Selection timed out'; document.getElementById('exe').disabled = true; } }, 30000);
    m.querySelector('#exe').addEventListener('click', function () {
      clearTimeout(to);
      var r = S.command(p, act);
      var el = document.getElementById('sbo-r');
      el.className = r.ok ? 'ok' : 'err';
      el.textContent = r.ok ? '✔ ' + r.msg + (r.warn ? ' - ' + r.warn : '') : '✖ ' + r.msg;
      this.disabled = true;
      tick(true);
      if (r.ok) setTimeout(closeModal, 1200);
    });
  }

  function openSetpoint(id) {
    var t = T[id];
    var m = openModal('Setpoint <small>' + id + '</small>', '<p>' + ui.esc(t.desc) + '</p><p class="muted">Range: ' + ui.esc(t.range) + ' ' + ui.esc(t.unit) + ' · current ' + ui.fmt(id) + '</p>' +
      '<input id="spv" type="number" step="any" value="' + t.v + '"> ' + ui.esc(t.unit) +
      '<div class="fp-btns"><button class="btn b-blue" id="spok">WRITE</button><button class="btn b-gray" data-close>CANCEL</button></div><p id="sp-r"></p>');
    m.querySelector('#spok').addEventListener('click', function () {
      var v = Number(m.querySelector('#spv').value);
      var rg = String(t.range).match(/(-?[\d.]+)\s*(?:-|\.\.)\s*(-?[\d.]+)/);
      var el = m.querySelector('#sp-r');
      if (rg && (v < Number(rg[1]) || v > Number(rg[2]))) { el.className = 'err'; el.textContent = '✖ Out of range'; return; }
      var r = S.command(id, 'setpoint', v);
      el.className = r.ok ? 'ok' : 'err'; el.textContent = (r.ok ? '✔ ' : '✖ ') + r.msg;
      if (r.ok) setTimeout(closeModal, 900);
    });
  }

  /* ================= header / footer ================= */
  function refreshChrome() {
    var list = S.alarmList();
    var unack = list.filter(function (a) { return !a.acked; });
    var act = list.filter(function (a) { return a.active; });
    var top = unack[0] || act[0];
    var ban = document.getElementById('alarmbanner');
    ban.className = 'alarmbanner' + (top ? ' p' + top.pri + (unack.length ? ' blink' : '') : ' none');
    document.getElementById('almtxt').textContent = top ? S.fmtTime(top.tIn) + '  ' + top.txt : 'No active alarms';
    document.getElementById('almcnt').innerHTML = '<b>' + act.length + '</b> active · <b>' + unack.length + '</b> unack';
    document.getElementById('clock').textContent = S.fmtTime(S.sim.t, true) + (S.sim.speed > 1 ? '  ×' + S.sim.speed : '');
    document.getElementById('userlvl').textContent = S.user.label;
    var h = Number(S.fmtTime(S.sim.t).slice(0, 2));
    document.getElementById('daymode').innerHTML = (T['MET.WS.IRR_POA'].v > 20 ? '☀ Day mode' : '☾ Night mode');
    function ind(id, cond) { document.getElementById(id).setAttribute('data-c', cond); }
    ind('ind-pv', T['PPC.PLANT.P_PV'].v > 1 ? 'green' : 'off');
    ind('ind-bat', T['BESS.SYS.GRID_FORMING'].v ? 'green' : (T['BESS.SYS.BMS_FAULT'].v ? 'red' : 'off'));
    ind('ind-dg', T['PPC.PLANT.P_DG'].v > 1 ? 'green' : (T['DG.DG1.RUNNING'].v || T['DG.DG2.RUNNING'].v ? 'amber' : 'off'));
    ind('ind-bus', T['GIS.BUS.LIVE'].v ? 'green' : 'red');
    document.getElementById('ppcstate').textContent = S.sim.stateNames[S.sim.state];
    var netOk = S.tagOrder.filter(function (id) { return id.indexOf('NET.N') === 0 && !T[id].v; }).length;
    document.getElementById('commstat').innerHTML = netOk ? '<span class="c-amber">● ' + netOk + ' comm. fault</span>' : '<span class="c-green">● Comms OK</span>';
  }

  function tick(force) {
    evalAlarms();
    refreshChrome();
    var main = document.getElementById('main');
    ui.update(main);
    var sc = S.screens[current];
    if (sc && sc.update) sc.update(main);
    var m = document.getElementById('modal');
    if (m.classList.contains('show')) { ui.update(m); if (modalUpdate) modalUpdate(); }
  }
  S.tick = tick;

  S.boot = function () {
    buildShell();
    document.getElementById('foot-client').textContent = C.site.client + ' · ' + C.site.contractor;
    S.simStart(tick);
    S.event('SYS', 'SCADA HMI started - user ' + S.user.label, 4);
    evalAlarms();
    // alarms raised by the pre-run start acknowledged so the operator sees only new ones
    Object.keys(S.alarms).forEach(function (k) { S.alarms[k].acked = true; });
    go(location.hash.slice(1) || 'overview', true);
    refreshChrome();
  };
})(SCADA);
