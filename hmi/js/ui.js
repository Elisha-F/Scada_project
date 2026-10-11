/*
 * HMI widget & symbol library (SVG + HTML string builders) and the live
 * binding engine. Elements carry data-* attributes and are refreshed by
 * S.ui.update() every scan:
 *   data-tag="ID"          text value (formatted with unit unless data-nounit)
 *   data-cb="PREFIX"       breaker symbol state (closed / open / tripped / bad)
 *   data-di="ID"           lamp; data-onclass / data-offclass optional
 *   data-live="KEY"        energised/de-energised line, KEY evaluated by S.live[KEY]()
 *   data-bar="ID" data-max  fill bar (width or height %)
 */
(function (S) {
  var T = S.tags;
  var ui = S.ui = {};

  ui.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  ui.fmt = function (id, nounit) {
    var t = T[id];
    if (!t) return '?';
    if (t.q !== 'GOOD') return '###';
    if (t.type === 'DI' || t.type === 'DO') return t.v ? 'ON' : 'OFF';
    var v = Number(t.v);
    var s = isFinite(v) ? v.toFixed(t.dec) : '-';
    if (s === '-0' || /^-0\.0*$/.test(s)) s = s.replace('-', '');
    return nounit || !t.unit ? s : s + ' ' + t.unit;
  };

  ui.limState = function (t) {
    if (!t || !t.lim || t.type !== 'AI') return '';
    var v = t.v, l = t.lim;
    if (l.hihi !== undefined && v >= l.hihi || l.lolo !== undefined && v <= l.lolo && v !== 0) return 'alm1';
    if (l.hi !== undefined && v >= l.hi || l.lo !== undefined && v <= l.lo && v !== 0) return 'alm2';
    return '';
  };

  /* ---------- SVG primitives ---------- */
  ui.line = function (x1, y1, x2, y2, live, w) {
    return '<line class="ln" data-live="' + (live || '') + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke-width="' + (w || 3) + '"/>';
  };
  ui.poly = function (pts, live) {
    return '<polyline class="ln" fill="none" data-live="' + (live || '') + '" points="' + pts + '" stroke-width="3"/>';
  };
  ui.text = function (x, y, txt, cls, anchor) {
    return '<text x="' + x + '" y="' + y + '" class="' + (cls || 'lbl') + '" text-anchor="' + (anchor || 'middle') + '">' + ui.esc(txt) + '</text>';
  };
  ui.val = function (x, y, id, cls, anchor) {
    return '<text x="' + x + '" y="' + y + '" class="' + (cls || 'val') + '" text-anchor="' + (anchor || 'start') + '" data-tag="' + id + '">' + ui.fmt(id) + '</text>';
  };

  /* breaker: square, filled red = closed, green = open (power-utility convention) */
  ui.cb = function (x, y, p, label, o) {
    o = o || {};
    var s = o.s || 22;
    var lblSide = o.left ? -s / 2 - 6 : s / 2 + 6;
    return '<g class="cb clickable" data-cb="' + p + '" data-fp="cb" data-p="' + p + '" data-title="' + ui.esc(o.title || label) + '" transform="translate(' + x + ',' + y + ')">' +
      '<rect x="' + (-s / 2) + '" y="' + (-s / 2) + '" width="' + s + '" height="' + s + '" rx="2"/>' +
      '<line class="cb-bar" x1="0" y1="' + (-s / 2 + 3) + '" x2="0" y2="' + (s / 2 - 3) + '"/>' +
      '<text class="cb-lbl" x="' + lblSide + '" y="4" text-anchor="' + (o.left ? 'end' : 'start') + '">' + ui.esc(label) + '</text></g>';
  };

  /* three-position switch indicator (status only - operated locally) */
  ui.ds = function (x, y, p, live) {
    return '<g class="ds" data-ds="' + p + '" transform="translate(' + x + ',' + y + ')">' +
      '<line class="ln" data-live="' + (live || '') + '" x1="0" y1="-12" x2="0" y2="-6" stroke-width="3"/>' +
      '<line class="ds-blade" x1="0" y1="-6" x2="0" y2="8" stroke-width="3"/>' +
      '<circle cx="0" cy="-6" r="2.5" class="ds-pivot"/>' +
      '<g class="ds-es"><line x1="0" y1="8" x2="10" y2="8"/><line x1="10" y1="8" x2="10" y2="14"/><line x1="5" y1="14" x2="15" y2="14"/><line x1="7" y1="17" x2="13" y2="17"/></g></g>';
  };

  ui.tx = function (x, y, label, sub, live1, live2) {
    return '<g transform="translate(' + x + ',' + y + ')" class="txg">' +
      '<circle class="tx" data-live="' + (live1 || '') + '" cx="0" cy="-10" r="15"/>' +
      '<circle class="tx" data-live="' + (live2 || live1 || '') + '" cx="0" cy="10" r="15"/>' +
      '<text class="lbl-s" x="22" y="-4" text-anchor="start">' + ui.esc(label) + '</text>' +
      (sub ? '<text class="lbl-xs" x="22" y="9" text-anchor="start">' + ui.esc(sub) + '</text>' : '') + '</g>';
  };

  ui.gen = function (x, y, id, live) {
    return '<g transform="translate(' + x + ',' + y + ')" class="clickable" data-fp="dg" data-p="DG.' + id + '" data-title="' + id + '">' +
      '<circle class="gen" data-run="DG.' + id + '.RUNNING" cx="0" cy="0" r="20"/>' +
      '<text class="gen-g" x="0" y="6" text-anchor="middle">G</text>' +
      '<text class="lbl-s" x="0" y="-26" text-anchor="middle">' + id + '</text></g>';
  };

  ui.inv = function (x, y, inv) {
    return '<g transform="translate(' + x + ',' + y + ')" class="clickable" data-fp="inv" data-p="PV.' + inv.id + '" data-title="' + inv.tag + '">' +
      '<rect class="dev" data-run="PV.' + inv.id + '.RUN" data-fault="PV.' + inv.id + '.FAULT" x="-20" y="-20" width="40" height="40" rx="3"/>' +
      '<line x1="-16" y1="16" x2="16" y2="-16" class="sym"/>' +
      '<text class="sym-t" x="-9" y="-5" text-anchor="middle">=</text><text class="sym-t" x="9" y="13" text-anchor="middle">~</text>' +
      '<text class="lbl-s" x="0" y="-26" text-anchor="middle">' + inv.tag + '</text></g>';
  };

  ui.pcs = function (x, y, pc) {
    return '<g transform="translate(' + x + ',' + y + ')" class="clickable" data-fp="bess" data-p="BESS.SYS" data-title="BESS">' +
      '<rect class="dev" data-run="BESS.' + pc.id + '.RUN" data-fault="BESS.' + pc.id + '.FAULT" x="-20" y="-20" width="40" height="40" rx="3"/>' +
      '<line x1="-16" y1="16" x2="16" y2="-16" class="sym"/>' +
      '<text class="sym-t" x="-9" y="-5" text-anchor="middle">~</text><text class="sym-t" x="9" y="13" text-anchor="middle">=</text>' +
      '<text class="lbl-s" x="0" y="-26" text-anchor="middle">' + pc.id + '</text></g>';
  };

  ui.battery = function (x, y, w, h) {
    var s = '<g transform="translate(' + x + ',' + y + ')" class="clickable" data-fp="bess" data-p="BESS.SYS" data-title="BESS">' +
      '<rect class="batt-shell" x="0" y="0" width="' + w + '" height="' + h + '" rx="4"/>' +
      '<rect class="batt-cap" x="' + (w / 2 - 8) + '" y="-5" width="16" height="5"/>' +
      '<rect class="batt-fill" data-vbar="BESS.SYS.SOC" data-h="' + (h - 6) + '" data-y0="' + (h - 3) + '" x="3" y="3" width="' + (w - 6) + '" height="' + (h - 6) + '"/>';
    return s + '</g>';
  };

  ui.load = function (x, y, live) {
    return '<polygon class="loadarrow" data-live="' + (live || '') + '" points="' + (x - 8) + ',' + y + ' ' + (x + 8) + ',' + y + ' ' + x + ',' + (y + 12) + '"/>';
  };

  ui.meter = function (x, y, p) {
    return '<g transform="translate(' + x + ',' + y + ')" class="clickable" data-fp="meter" data-p="' + p + '" data-title="' + p + '">' +
      '<rect class="meter" x="-11" y="-13" width="22" height="26" rx="2"/><rect class="meter-scr" x="-7" y="-9" width="14" height="8"/>' +
      '<circle cx="-4" cy="6" r="1.5" class="meter-k"/><circle cx="4" cy="6" r="1.5" class="meter-k"/></g>';
  };

  ui.ground = function (x, y) {
    return '<g transform="translate(' + x + ',' + y + ')" class="gnd"><line x1="0" y1="0" x2="0" y2="8"/><line x1="-10" y1="8" x2="10" y2="8"/><line x1="-6" y1="12" x2="6" y2="12"/><line x1="-2" y1="16" x2="2" y2="16"/></g>';
  };

  /* ---------- HTML widgets ---------- */
  ui.kv = function (label, id, o) {
    o = o || {};
    return '<div class="kv"><span class="k">' + ui.esc(label) + '</span><span class="v" data-tag="' + id + '">' + ui.fmt(id) + '</span></div>';
  };
  ui.lamp = function (id, label, o) {
    o = o || {};
    var t = T[id];
    var kind = o.kind || (t && t.alarm ? (t.alarm.on ? 'alarm' : 'healthy') : 'state');
    return '<div class="lamp" data-di="' + id + '" data-kind="' + kind + '"><i></i><span>' + ui.esc(label || (t ? t.desc : id)) + '</span></div>';
  };
  ui.bar = function (id, max, label) {
    return '<div class="hbar"><div class="hbar-l"><span>' + ui.esc(label) + '</span><b data-tag="' + id + '">' + ui.fmt(id) + '</b></div>' +
      '<div class="hbar-t"><div class="hbar-f" data-bar="' + id + '" data-max="' + max + '"></div></div></div>';
  };
  ui.card = function (title, body, cls, extra) {
    return '<section class="card ' + (cls || '') + '"><header>' + title + (extra || '') + '</header><div class="card-b">' + body + '</div></section>';
  };
  ui.btn = function (label, p, action, cls, val) {
    return '<button class="btn ' + (cls || '') + '" data-cmd="' + action + '" data-p="' + p + '"' + (val !== undefined ? ' data-val="' + val + '"' : '') + '>' + ui.esc(label) + '</button>';
  };
  ui.cbState = function (p) {
    return '<span class="cbstate" data-cbtxt="' + p + '">-</span>';
  };

  /* ---------- binding engine ---------- */
  S.live = {};
  /* "A&B|C&!D" over tag ids, or a named function registered in S.live */
  ui.expr = function (key) {
    var ors = key.split('|').map(function (g) {
      return g.split('&').map(function (a) { var neg = a[0] === '!'; return { id: neg ? a.slice(1) : a, neg: neg }; });
    });
    return function () {
      return ors.some(function (g) {
        return g.every(function (a) {
          var v = S.live[a.id] && a.id.indexOf('.') < 0 ? S.live[a.id]() : (T[a.id] && T[a.id].v);
          return a.neg ? !v : !!v;
        });
      });
    };
  };
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
      var p = el.getAttribute('data-cb');
      var c = T[p + '.CB_CLOSED'], tr = T[p + '.CB_TRIPPED'];
      el.classList.toggle('closed', !!(c && c.v));
      el.classList.toggle('open', !(c && c.v));
      el.classList.toggle('tripped', !!(tr && tr.v));
      el.classList.toggle('bad', !!c && c.q !== 'GOOD');
    }
    list = root.querySelectorAll('[data-cbtxt]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var pp = el.getAttribute('data-cbtxt');
      var cc = T[pp + '.CB_CLOSED'], tt = T[pp + '.CB_TRIPPED'];
      var st = tt && tt.v ? 'TRIPPED' : cc && cc.v ? 'CLOSED' : 'OPEN';
      if (cc && cc.q !== 'GOOD') st = 'UNKNOWN';
      el.textContent = st; el.className = 'cbstate s-' + st.toLowerCase();
    }
    list = root.querySelectorAll('[data-ds]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var dp = el.getAttribute('data-ds');
      var closed = T[dp + '.DS_CLOSED'] && T[dp + '.DS_CLOSED'].v, earthed = T[dp + '.ES_EARTHED'] && T[dp + '.ES_EARTHED'].v;
      el.classList.toggle('dsclosed', !!closed); el.classList.toggle('earthed', !!earthed);
    }
    list = root.querySelectorAll('[data-di]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var dt = T[el.getAttribute('data-di')];
      if (!dt) continue;
      var kind = el.getAttribute('data-kind');
      var active = !!dt.v;
      var cls = 'off';
      if (kind === 'alarm') cls = active ? (dt.alarm && dt.alarm.pri <= 1 ? 'red' : 'amber') : 'off';
      else if (kind === 'healthy') cls = active ? 'green' : 'red';
      else cls = active ? 'blue' : 'off';
      if (dt.q !== 'GOOD') cls = 'bad';
      el.setAttribute('data-c', cls);
    }
    list = root.querySelectorAll('[data-live]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var key = el.getAttribute('data-live');
      if (!key) continue;
      var fn = S.live[key] || (S.live[key] = ui.expr(key));
      var live = !!fn();
      el.classList.toggle('live', live);
      el.classList.toggle('dead', !live);
    }
    list = root.querySelectorAll('[data-run]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var rt = T[el.getAttribute('data-run')], ft = T[el.getAttribute('data-fault') || ''];
      el.classList.toggle('running', !!(rt && rt.v));
      el.classList.toggle('faulted', !!(ft && ft.v));
    }
    list = root.querySelectorAll('[data-bar]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var bt = T[el.getAttribute('data-bar')], mx = Number(el.getAttribute('data-max')) || 100;
      var pct = Math.max(0, Math.min(100, Math.abs(bt.v) / mx * 100));
      el.style.width = pct + '%';
    }
    list = root.querySelectorAll('[data-vbar]');
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var vt = T[el.getAttribute('data-vbar')], H = Number(el.getAttribute('data-h')), y0 = Number(el.getAttribute('data-y0'));
      var hh = H * Math.max(0, Math.min(100, vt.v)) / 100;
      el.setAttribute('height', hh); el.setAttribute('y', y0 - hh);
      el.classList.toggle('low', vt.v < 20);
    }
    if (ui.onUpdate) ui.onUpdate(root);
  };
})(SCADA);
