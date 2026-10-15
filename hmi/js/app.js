/*
 * HMI shell: navigation (screen list of design report section 12), alarm engine
 * (three levels, section 10), faceplates, select-before-operate, header/footer and
 * the 1 s scan loop.
 */
(function (S) {
  var T = S.tags, ui = S.ui, C = S.config;
  S.screens = S.screens || {};

  S.nav = [
    { id: 'ov', label: 'OVERVIEW', subs: [['overview', 'Plant overview']] },
    { id: 'sw', label: 'SWITCHGEAR', subs: [['sw11', '11 kV switchboard'], ['prs', 'President station'], ['pms', 'Prime Minister station']] },
    { id: 'gn', label: 'GENERATION', subs: [['pv', 'PV system'], ['bess', 'Battery'], ['gen', 'Generators']] },
    { id: 'em', label: 'ENERGY MANAGEMENT', subs: [['ems', 'Energy management']] },
    { id: 'ax', label: 'AUXILIARIES', subs: [['aux', 'Auxiliaries']] },
    { id: 'al', label: 'ALARMS', subs: [['alarms', 'Alarms'], ['events', 'Event log']] },
    { id: 'tr', label: 'TRENDS & REPORTS', subs: [['trends', 'Trends'], ['reports', 'Reports']] },
    { id: 'sy', label: 'SYSTEM', subs: [['comms', 'Communication status'], ['iolist', 'I/O list'], ['users', 'User management'], ['sim', 'Simulation']] }
  ];
  var current = null;

  /* ================= alarms ================= */
  S.alarms = {};
  function evalAlarms() {
    var now = S.sim.t;
    S.tagOrder.forEach(function (id) {
      var t = T[id], act = false, level = 0, txt = t.desc;
      if (t.alarm) { act = t.q === 'GOOD' && Number(t.v) === t.alarm.on; level = t.alarm.level; }
      else if (t.lim) {
        if (t.q === 'GOOD' && (t.lim.lo !== undefined && t.v < t.lim.lo || t.lim.hi !== undefined && t.v > t.lim.hi)) { act = true; txt += t.lim.lo !== undefined && t.v < t.lim.lo ? ' low' : ' high'; }
        level = t.lim.level;
      } else return;
      var a = S.alarms[id];
      if (act && (!a || !a.active)) {
        if (!a || a.acked) S.alarms[id] = a = { id: id, tIn: now, acked: false };
        a.active = true; a.level = level; a.txt = txt; a.equip = t.equip; a.tOut = null; a.val = ui.fmt(id);
        S.event('ALM', id + ' ' + txt + ' (level ' + level + ')', level);
      } else if (!act && a && a.active) {
        a.active = false; a.tOut = now;
        S.event('ALM', id + ' ' + a.txt + ' returned to normal', 0);
        if (a.acked) delete S.alarms[id];
      } else if (a && a.active) a.val = ui.fmt(id);
    });
    // quality: lost communication is a level 2 alarm per device group
    var stale = S.tagOrder.filter(function (id) { return T[id].q !== 'GOOD'; });
    var a2 = S.alarms['COMM-STALE'];
    if (stale.length && !(a2 && a2.active)) {
      S.alarms['COMM-STALE'] = { id: 'COMM-STALE', tIn: now, acked: false, active: true, level: 2, txt: 'Communication lost: ' + stale.length + ' signals stale', equip: 'Communication', val: '' };
      S.event('ALM', 'Communication lost: ' + stale.length + ' signals stale (level 2)', 2);
    } else if (!stale.length && a2 && a2.active) { a2.active = false; a2.tOut = now; if (a2.acked) delete S.alarms['COMM-STALE']; }
  }
  S.alarmList = function () {
    return Object.keys(S.alarms).map(function (k) { return S.alarms[k]; })
      .sort(function (a, b) { return (a.acked - b.acked) || (a.level - b.level) || (b.tIn - a.tIn); });
  };
  S.ackAlarm = function (id) {
    var ids = id ? [id] : Object.keys(S.alarms);
    ids.forEach(function (k) {
      var a = S.alarms[k]; if (!a || a.acked) return;
      a.acked = true; S.event('ACK', 'Alarm acknowledged: ' + k + ' ' + a.txt, 0);
      if (!a.active) delete S.alarms[k];
    });
    refreshChrome();
  };

  S.fmtTime = function (t, withDate) {
    var d = new Date(t + 3 * 3600e3);
    function z(n) { return ('0' + n).slice(-2); }
    var s = z(d.getUTCHours()) + ':' + z(d.getUTCMinutes()) + ':' + z(d.getUTCSeconds());
    return withDate ? z(d.getUTCDate()) + '.' + z(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear() + ' ' + s : s;
  };

  /* ================= shell ================= */
  function buildShell() {
    document.getElementById('nav').innerHTML = S.nav.map(function (n) { return '<a class="nav-top" data-group="' + n.id + '">' + n.label + '</a>'; }).join('');
    document.getElementById('nav').addEventListener('click', function (e) {
      var a = e.target.closest('[data-group]'); if (!a) return;
      go(S.nav.filter(function (n) { return n.id === a.getAttribute('data-group'); })[0].subs[0][0]);
    });
    document.getElementById('subnav').addEventListener('click', function (e) { var a = e.target.closest('[data-screen]'); if (a) go(a.getAttribute('data-screen')); });
    document.getElementById('alarmbanner').addEventListener('click', function () { go('alarms'); });
    document.getElementById('ackall').addEventListener('click', function (e) { e.stopPropagation(); S.ackAlarm(); });
    document.getElementById('userbtn').addEventListener('click', function () { go('users'); });
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
    document.getElementById('subnav').innerHTML = g.subs.map(function (s) { return '<a data-screen="' + s[0] + '" class="' + (s[0] === id ? 'active' : '') + '">' + s[1] + '</a>'; }).join('');
    var sc = S.screens[id], main = document.getElementById('main');
    main.innerHTML = '<div class="screen" id="scr-' + id + '">' + sc.render() + '</div>';
    if (sc.init) sc.init(main);
    ui.update(main);
    if (sc.update) sc.update(main);
    document.title = sc.title + ' · ' + C.site.short + ' SCADA';
  }
  S.go = go;

  /* ================= faceplates & commands ================= */
  function onMainClick(e) {
    var fp = e.target.closest('[data-fp]');
    if (fp) {
      var kind = fp.getAttribute('data-fp'), p = fp.getAttribute('data-p');
      if (kind === 'cb') return openBreaker(p);
      if (kind === 'meter') return openMeter(p);
      if (kind === 'go') return go(p);
    }
    var b = e.target.closest('[data-cmd]');
    if (b && !b.disabled) {
      var tag = b.getAttribute('data-cmd');
      if (T[tag].type === 'AO') return openSetpoint(tag);
      return sbo(tag, b.textContent);
    }
  }

  var modalUpdate = null;
  function openModal(title, body) {
    var m = document.getElementById('modal');
    m.innerHTML = '<div class="dlg"><header><span>' + title + '</span><button class="x" data-close>×</button></header><div class="dlg-b">' + body + '</div></div>';
    m.classList.add('show');
    m.querySelector('.dlg-b').addEventListener('click', onMainClick);
    ui.update(m);
    return m;
  }
  function closeModal() { var m = document.getElementById('modal'); m.classList.remove('show'); m.innerHTML = ''; modalUpdate = null; }

  function openBreaker(key) {
    var br = S.breakers[key];
    var st = br.status.map(function (id) { return ui.lamp(id, T[id].desc + ' · ' + id); }).join('');
    var meas = (br.meas || []).map(function (id) { return ui.kv(T[id].desc + ' · ' + id, id); }).join('');
    var btns = (br.cmdOpen ? ui.btn('OPEN', br.cmdOpen, 'b-green') : '') + (br.cmdClose ? ui.btn('CLOSE', br.cmdClose, 'b-red') : '');
    var m = openModal(ui.esc(br.title), '<div class="fp-state">Position: ' + ui.cbState(key) + '</div>' +
      '<div class="fp-grid"><div><h4>Status signals</h4>' + st + '</div><div><h4>Measurements</h4>' + (meas || '<p class="muted">None at this point</p>') + '</div></div>' +
      (btns ? '<h4>Remote command checks</h4><ul class="ilk" id="ilk"></ul><div class="fp-btns">' + btns + '</div>' +
        '<p class="note">Select, then confirm within 30 s. Enabled for the role in the I/O list (' + T[br.cmdOpen || br.cmdClose].opby + '). Before any work on equipment, check the breaker position physically.</p>'
        : '<p class="note">' + ui.esc(br.note || 'No remote command for this device.') + '</p>'));
    modalUpdate = function () {
      var el = m.querySelector('#ilk'); if (!el) return;
      var oc = S.breakerBlocks(br, 'close'), oo = S.breakerBlocks(br, 'open');
      el.innerHTML = (oo.length ? oo.map(function (x) { return '<li class="ilk-bad">✖ Open: ' + ui.esc(x) + '</li>'; }).join('') : '<li class="ilk-ok">✔ Open permitted</li>') +
        (oc.length ? oc.map(function (x) { return '<li class="ilk-bad">✖ Close: ' + ui.esc(x) + '</li>'; }).join('') : '<li class="ilk-ok">✔ Close permitted</li>');
    };
    modalUpdate();
  }
  function openMeter(prefix) {
    var ids = S.tagOrder.filter(function (id) { return id.indexOf(prefix + '-') === 0 && T[id].type === 'AI'; });
    openModal('Measurements · ' + ui.esc(prefix), '<div class="fp-grid1">' + ids.map(function (id) { return ui.kv(T[id].desc + ' · ' + id, id); }).join('') + '</div>');
  }
  function sbo(tag, label) {
    var t = T[tag];
    var m = openModal('Confirm command', '<p class="sbo-q"><b>' + ui.esc(label.trim()) + '</b> · ' + ui.esc(t.equip) + '</p><p class="muted">Tag ' + tag + ' · ' + ui.esc(t.desc) +
      '<br>Selected by ' + S.user.label + '. Confirm within 30 s.</p><div class="fp-btns"><button class="btn b-blue" id="exe">CONFIRM</button><button class="btn b-gray" data-close>CANCEL</button></div><p id="sbo-r"></p>');
    var to = setTimeout(function () { var x = document.getElementById('exe'); if (x) { document.getElementById('sbo-r').textContent = 'Selection timed out'; x.disabled = true; } }, 30000);
    m.querySelector('#exe').addEventListener('click', function () {
      clearTimeout(to);
      var r = S.command(tag), el = document.getElementById('sbo-r');
      el.className = r.ok ? 'ok' : 'err'; el.textContent = (r.ok ? '✔ ' : '✖ ') + r.msg;
      this.disabled = true; tick();
      if (r.ok) setTimeout(closeModal, 1200);
    });
  }
  function openSetpoint(tag) {
    var t = T[tag], rg = S.spRange(tag);
    var m = openModal('Setpoint · ' + tag, '<p>' + ui.esc(t.desc) + ' · ' + ui.esc(t.equip) + '</p><p class="muted">Range ' + (rg ? rg[0] + ' to ' + rg[1] : '-') + ' ' + ui.esc(t.unit) +
      ' · now ' + ui.fmt(tag) + ' · ' + t.opby + ' role</p><input id="spv" type="number" step="any" value="' + t.v + '"> ' + ui.esc(t.unit) +
      '<div class="fp-btns"><button class="btn b-blue" id="spok">WRITE</button><button class="btn b-gray" data-close>CANCEL</button></div><p id="sp-r"></p>');
    m.querySelector('#spok').addEventListener('click', function () {
      var r = S.command(tag, Number(m.querySelector('#spv').value)), el = m.querySelector('#sp-r');
      el.className = r.ok ? 'ok' : 'err'; el.textContent = (r.ok ? '✔ ' : '✖ ') + r.msg;
      if (r.ok) { tick(); setTimeout(closeModal, 900); }
    });
  }

  /* ================= header / footer ================= */
  function refreshChrome() {
    var list = S.alarmList(), unack = list.filter(function (a) { return !a.acked; }), act = list.filter(function (a) { return a.active; });
    var top = unack[0] || act[0], ban = document.getElementById('alarmbanner');
    ban.className = 'alarmbanner' + (top ? ' p' + top.level + (unack.length ? ' blink' : '') : ' none');
    document.getElementById('almtxt').textContent = top ? S.fmtTime(top.tIn) + '  ' + top.id + ' · ' + top.txt : 'No active alarms';
    document.getElementById('almcnt').innerHTML = '<b>' + act.length + '</b> active · <b>' + unack.length + '</b> unacknowledged';
    document.getElementById('clock').textContent = S.fmtTime(S.sim.t, true) + (S.sim.speed > 1 ? '  ×' + S.sim.speed : '');
    document.getElementById('userlvl').textContent = S.user.label;
    document.getElementById('daymode').textContent = T['WS-IRR-POA'].v > 20 ? '☀ Day' : '☾ Night';
    function ind(id, c) { document.getElementById(id).setAttribute('data-c', c); }
    ind('ind-pv', T['EMS-P-PV'].v > 1 ? 'green' : 'off');
    ind('ind-bat', T['BESS-PCS-STATE'].v === 3 ? 'red' : T['BESS-PCS-STATE'].v ? 'green' : 'off');
    ind('ind-dg', T['EMS-P-GEN'].v > 1 ? 'green' : (T['DG1-RUN'].v || T['DG2-RUN'].v ? 'amber' : 'off'));
    ind('ind-bus', T['EMS-U-BUS'].v > 9 ? 'green' : 'red');
    document.getElementById('emsstate').textContent = ui.fmt('EMS-STATE');
    var bad = S.tagOrder.filter(function (id) { return /(-HEALTHY|-OK|COMM-OK|-COMM)$/.test(id) && T[id].src === 'COM' && !T[id].v; }).length;
    document.getElementById('commstat').innerHTML = bad ? '<span class="c-amber">● ' + bad + ' link faults</span>' : '<span class="c-green">● All links healthy</span>';
  }

  function tick() {
    S.bindScan();
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
    S.bindScan();
    S.event('SYS', 'SCADA started · user ' + S.user.label, 0);
    evalAlarms();
    // alarms present at start-up are shown as acknowledged; the operator sees new ones flash
    Object.keys(S.alarms).forEach(function (k) { S.alarms[k].acked = true; });
    go(location.hash.slice(1) || 'overview', true);
    refreshChrome();
  };
})(SCADA);
