/*
 * HMI widget & symbol library (SVG + HTML string builders) and the live binding
 * engine. Elements carry data-* attributes and are refreshed every scan:
 *   data-tag="TAG"       value text (with unit unless data-nounit)
 *   data-cb="KEY"        breaker symbol, KEY in S.breakers
 *   data-cbtxt="KEY"     breaker state text badge
 *   data-di="TAG"        lamp
 *   data-live="EXPR"     energised / dead conductor; EXPR = "A&B|C&!D" over tags or named S.live functions
 *   data-run / data-fault="EXPR"  running / faulted device symbol
 *   data-bar="TAG" data-max   horizontal bar;  data-vbar="TAG"  battery fill
 */
(function (S) {
  var T = S.tags;
  var ui = S.ui = {};
  S.live = {};

  ui.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  ui.fmt = function (id, nounit) {
    var t = T[id];
    if (!t) return '?';
    if (t.q !== 'GOOD') return '###';
    if (t.type === 'ST') return S.enumText(t);
    if (t.type === 'DI') return t.v ? 'ON' : 'OFF';
    if (t.type === 'DO') return t.opby === 'Automatic' ? (t.v ? 'ON' : 'OFF') : '-';
    var v = Number(t.v);
    var s = isFinite(v) ? v.toFixed(t.dec) : '-';
    if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);
    return nounit || !t.unit ? s : s + ' ' + t.unit;
  };

  ui.limState = function (t) {
    if (!t || !t.lim || t.q !== 'GOOD') return '';
    var l = t.lim, v = t.v;
    if (l.lo !== undefined && v < l.lo || l.hi !== undefined && v > l.hi) return l.level === 1 ? 'alm1' : 'alm2';
    return '';
  };

  /* expressions over tags and named live functions */
  ui.expr = function (key) {
    var ors = key.split('|').map(function (g) {
      return g.split('&').map(function (a) { var neg = a[0] === '!'; return { id: neg ? a.slice(1) : a, neg: neg }; });
    });
    return function () {
      return ors.some(function (g) {
        return g.every(function (a) {
          var v = S.live[a.id] ? S.live[a.id]() : (T[a.id] && T[a.id].q === 'GOOD' && T[a.id].v);
          return a.neg ? !v : !!v;
        });
      });
    };
  };
  var exprCache = {};
  function ev(key) { if (!key) return false; return (exprCache[key] || (exprCache[key] = ui.expr(key)))(); }
  ui.ev = ev;

  /* breaker state from its submitted tags */
  ui.brState = function (key) {
    var br = S.breakers[key];
    if (!br) return { st: 'UNKNOWN' };
    var c = T[br.clsd], o = br.open ? T[br.open] : null, tr = br.trip ? T[br.trip] : null;
    if (c.q !== 'GOOD' || (o && o.q !== 'GOOD')) return { st: 'UNKNOWN', bad: true };
    if (tr && tr.v) return { st: 'TRIPPED', closed: false, tripped: true };
    if (o && c.v && o.v) return { st: 'FAULTY', bad: true };
    if (o && !c.v && !o.v) return { st: 'MOVING', bad: true };
    return { st: c.v ? 'CLOSED' : 'OPEN', closed: !!c.v };
  };

  /* ---------- SVG primitives ---------- */
  ui.line = function (x1, y1, x2, y2, live, w) {
    return '<line class="ln" data-live="' + (live || '') + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke-width="' + (w || 3) + '"/>';
  };
  ui.poly = function (pts, live) { return '<polyline class="ln" fill="none" data-live="' + (live || '') + '" points="' + pts + '" stroke-width="3"/>'; };
  ui.text = function (x, y, txt, cls, anchor) {
    return '<text x="' + x + '" y="' + y + '" class="' + (cls || 'lbl') + '" text-anchor="' + (anchor || 'middle') + '">' + ui.esc(txt) + '</text>';
  };
  ui.val = function (x, y, id, cls, anchor) {
    return '<text x="' + x + '" y="' + y + '" class="' + (cls || 'val') + '" text-anchor="' + (anchor || 'start') + '" data-tag="' + id + '">' + ui.fmt(id) + '</text>';
  };

  /* breaker: square, filled red = closed, green = open (as on the existing site screens) */
  ui.cb = function (x, y, key, label, o) {
    o = o || {};
    var s = o.s || 22, lx = o.left ? -s / 2 - 6 : s / 2 + 6;
    return '<g class="cb clickable" data-cb="' + key + '" data-fp="cb" data-p="' + key + '" transform="translate(' + x + ',' + y + ')">' +
      '<rect x="' + (-s / 2) + '" y="' + (-s / 2) + '" width="' + s + '" height="' + s + '" rx="2"/>' +
      '<line class="cb-bar" x1="0" y1="' + (-s / 2 + 3) + '" x2="0" y2="' + (s / 2 - 3) + '"/>' +
      (label ? '<text class="cb-lbl" x="' + lx + '" y="4" text-anchor="' + (o.left ? 'end' : 'start') + '">' + ui.esc(label) + '</text>' : '') + '</g>';
  };
  /* earth switch indicator: yellow when closed */
  ui.es = function (x, y, tag) {
    return '<g class="es" data-di="' + tag + '" data-kind="state" transform="translate(' + x + ',' + y + ')"><line x1="0" y1="0" x2="10" y2="0"/><line x1="10" y1="-5" x2="10" y2="5"/>' +
      '<line x1="13" y1="-3" x2="13" y2="3"/><line x1="16" y1="-1" x2="16" y2="1"/></g>';
  };

  ui.tx = function (x, y, label, sub, live1, live2) {
    return '<g transform="translate(' + x + ',' + y + ')" class="txg">' +
      '<circle class="tx" data-live="' + (live1 || '') + '" cx="0" cy="-10" r="15"/>' +
      '<circle class="tx" data-live="' + (live2 || live1 || '') + '" cx="0" cy="10" r="15"/>' +
      '<text class="lbl-s" x="22" y="-4" text-anchor="start">' + ui.esc(label) + '</text>' +
      (sub ? '<text class="lbl-xs" x="22" y="9" text-anchor="start">' + ui.esc(sub) + '</text>' : '') + '</g>';
  };
  ui.gen = function (x, y, id) {
    return '<g transform="translate(' + x + ',' + y + ')" class="clickable" data-fp="go" data-p="gen">' +
      '<circle class="gen" data-run="' + id + '-RUN" data-fault="' + id + '-SHUTDOWN" cx="0" cy="0" r="20"/>' +
      '<text class="gen-g" x="0" y="6" text-anchor="middle">G</text>' +
      '<text class="lbl-s" x="0" y="-26" text-anchor="middle">' + id + '</text></g>';
  };
  ui.inv = function (x, y, tag) {
    S.live['run_' + tag] = function () { return T[tag + '-STATE'].v >= 2 && T[tag + '-STATE'].v <= 3; };
    S.live['flt_' + tag] = function () { return T[tag + '-STATE'].v === 4 || T[tag + '-MCCB-TRIP'].v; };
    return '<g transform="translate(' + x + ',' + y + ')" class="clickable" data-fp="go" data-p="pv">' +
      '<rect class="dev" data-run="run_' + tag + '" data-fault="flt_' + tag + '" x="-20" y="-20" width="40" height="40" rx="3"/>' +
      '<line x1="-16" y1="16" x2="16" y2="-16" class="sym"/>' +
      '<text class="sym-t" x="-9" y="-5" text-anchor="middle">=</text><text class="sym-t" x="9" y="13" text-anchor="middle">~</text>' +
      '<text class="lbl-s" x="0" y="-26" text-anchor="middle">' + tag + '</text></g>';
  };
  ui.pcs = function (x, y, label) {
    return '<g transform="translate(' + x + ',' + y + ')" class="clickable" data-fp="go" data-p="bess">' +
      '<rect class="dev" data-run="pcsRun" data-fault="pcsFault" x="-20" y="-20" width="40" height="40" rx="3"/>' +
      '<line x1="-16" y1="16" x2="16" y2="-16" class="sym"/>' +
      '<text class="sym-t" x="-9" y="-5" text-anchor="middle">~</text><text class="sym-t" x="9" y="13" text-anchor="middle">=</text>' +
      '<text class="lbl-s" x="-26" y="4" text-anchor="end">' + label + '</text></g>';
  };
  S.live.pcsRun = function () { return T['BESS-PCS-STATE'].v === 1 || T['BESS-PCS-STATE'].v === 2; };
  S.live.pcsFault = function () { return T['BESS-PCS-STATE'].v === 3; };
  ui.battery = function (x, y, w, h) {
    return '<g transform="translate(' + x + ',' + y + ')" class="clickable" data-fp="go" data-p="bess">' +
      '<rect class="batt-shell" x="0" y="0" width="' + w + '" height="' + h + '" rx="4"/>' +
      '<rect class="batt-cap" x="' + (w / 2 - 8) + '" y="-5" width="16" height="5"/>' +
      '<rect class="batt-fill" data-vbar="BESS-SOC" data-h="' + (h - 6) + '" data-y0="' + (h - 3) + '" x="3" y="3" width="' + (w - 6) + '" height="' + (h - 6) + '"/></g>';
  };
  ui.load = function (x, y, live) {
    return '<polygon class="loadarrow" data-live="' + (live || '') + '" points="' + (x - 8) + ',' + y + ' ' + (x + 8) + ',' + y + ' ' + x + ',' + (y + 12) + '"/>';
  };
  ui.meter = function (x, y, prefix) {
    return '<g transform="translate(' + x + ',' + y + ')" class="clickable" data-fp="meter" data-p="' + prefix + '">' +
      '<rect class="meter" x="-11" y="-13" width="22" height="26" rx="2"/><rect class="meter-scr" x="-7" y="-9" width="14" height="8"/>' +
      '<circle cx="-4" cy="6" r="1.5" class="meter-k"/><circle cx="4" cy="6" r="1.5" class="meter-k"/></g>';
  };
  ui.ground = function (x, y) {
    return '<g transform="translate(' + x + ',' + y + ')" class="gnd"><line x1="0" y1="0" x2="0" y2="8"/><line x1="-10" y1="8" x2="10" y2="8"/><line x1="-6" y1="12" x2="6" y2="12"/><line x1="-2" y1="16" x2="2" y2="16"/></g>';
  };

  /* ---------- HTML widgets ---------- */
  ui.kv = function (label, id) {
    return '<div class="kv"><span class="k">' + ui.esc(label) + '</span><span class="v" data-tag="' + id + '">' + ui.fmt(id) + '</span></div>';
  };
  ui.lamp = function (id, label) {
    var t = T[id];
    if (!t) throw new Error('lamp: no tag ' + id);
    var kind = t.alarm ? (t.alarm.on ? 'alarm' : 'healthy') : /(HEALTHY|-OK|-COMM)$/.test(id) ? 'ok' : 'state';
    return '<div class="lamp" data-di="' + id + '" data-kind="' + kind + '" title="' + id + '"><i></i><span>' + ui.esc(label || t.desc) + '</span></div>';
  };
  ui.bar = function (id, max, label) {
    return '<div class="hbar"><div class="hbar-l"><span>' + ui.esc(label) + '</span><b data-tag="' + id + '">' + ui.fmt(id) + '</b></div>' +
      '<div class="hbar-t"><div class="hbar-f" data-bar="' + id + '" data-max="' + max + '"></div></div></div>';
  };
  ui.card = function (title, body, cls, extra) {
    return '<section class="card ' + (cls || '') + '"><header>' + title + (extra || '') + '</header><div class="card-b">' + body + '</div></section>';
  };
  /* command button: shown to everyone, enabled only for the role in the I/O list */
  ui.btn = function (label, tagId, cls) {
    var t = T[tagId];
    if (!t) throw new Error('btn: no tag ' + tagId);
    return '<button class="btn ' + (cls || '') + '" data-cmd="' + tagId + '" title="' + tagId + ' · ' + t.opby + '">' + ui.esc(label) + '</button>';
  };
  ui.cbState = function (key) { return '<span class="cbstate" data-cbtxt="' + key + '">-</span>'; };

  /* ---------- binding engine ---------- */
  ui.update = function (root) {
    root = root || document;
    var i, el, list;
    list = root.querySelectorAll('[data-tag]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var id = el.getAttribute('data-tag'), t = T[id];
      var txt = ui.fmt(id, el.hasAttribute('data-nounit'));
      if (el.textContent !== txt) el.textContent = txt;
      var ls = ui.limState(t);
      el.classList.toggle('alm1', ls === 'alm1');
      el.classList.toggle('alm2', ls === 'alm2');
      el.classList.toggle('bad', !!t && t.q !== 'GOOD');
    }
    list = root.querySelectorAll('[data-cb]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var s = ui.brState(el.getAttribute('data-cb'));
      el.classList.toggle('closed', !!s.closed);
      el.classList.toggle('open', !s.closed);
      el.classList.toggle('tripped', !!s.tripped);
      el.classList.toggle('bad', !!s.bad);
    }
    list = root.querySelectorAll('[data-cbtxt]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var st = ui.brState(el.getAttribute('data-cbtxt')).st;
      el.textContent = st; el.className = 'cbstate s-' + st.toLowerCase();
    }
    list = root.querySelectorAll('[data-di]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var dt = T[el.getAttribute('data-di')];
      if (!dt) continue;
      var kind = el.getAttribute('data-kind'), active = !!dt.v, cls = 'off';
      if (kind === 'alarm') cls = active ? (dt.alarm.level === 1 ? 'red' : 'amber') : 'off';
      else if (kind === 'healthy') cls = active ? 'green' : (dt.alarm.level === 1 ? 'red' : 'amber');
      else if (kind === 'ok') cls = active ? 'green' : 'amber';
      else cls = active ? 'blue' : 'off';
      if (dt.q !== 'GOOD') cls = 'bad';
      if (el.getAttribute('data-c') !== cls) el.setAttribute('data-c', cls);
    }
    list = root.querySelectorAll('[data-live]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var key = el.getAttribute('data-live');
      if (!key) continue;
      var live = ev(key);
      el.classList.toggle('live', live);
      el.classList.toggle('dead', !live);
    }
    list = root.querySelectorAll('[data-run]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      el.classList.toggle('running', ev(el.getAttribute('data-run')));
      el.classList.toggle('faulted', ev(el.getAttribute('data-fault')));
    }
    list = root.querySelectorAll('[data-bar]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var bt = T[el.getAttribute('data-bar')], mx = Number(el.getAttribute('data-max')) || 100;
      el.style.width = Math.max(0, Math.min(100, Math.abs(bt.v) / mx * 100)) + '%';
    }
    list = root.querySelectorAll('[data-vbar]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var vt = T[el.getAttribute('data-vbar')], H = Number(el.getAttribute('data-h')), y0 = Number(el.getAttribute('data-y0'));
      var hh = H * Math.max(0, Math.min(100, vt.v)) / 100;
      el.setAttribute('height', hh); el.setAttribute('y', y0 - hh);
      el.classList.toggle('low', vt.v < 20);
    }
    list = root.querySelectorAll('[data-cmd]');
    for (i = 0; i < list.length; i++) list[i].disabled = !S.mayOperate(list[i].getAttribute('data-cmd'));
    if (ui.onUpdate) ui.onUpdate(root);
  };
})(SCADA);
