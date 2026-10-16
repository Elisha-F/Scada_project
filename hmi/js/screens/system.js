/* Trends, alarms, event log, I/O list, users & simulation */
(function (S) {
  var ui = S.ui, T = S.tags, C = S.config;
  var SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)'];

  /* ================= trend component (single y-axis, ≤ 3 series of one unit) ================= */
  function niceTicks(lo, hi, n) {
    if (hi - lo < 1e-9) { hi = lo + 1; }
    var step = Math.pow(10, Math.floor(Math.log10((hi - lo) / n)));
    var err = (hi - lo) / n / step;
    step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, out = [];
    for (var v = a; v <= b + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
    return out;
  }
  function rangeStart(r) {
    var now = S.sim.t;
    if (r === 'today') { var h = Number(S.fmtTime(now).slice(0, 2)), m = Number(S.fmtTime(now).slice(3, 5)), s = Number(S.fmtTime(now).slice(6, 8)); return now - (h * 3600 + m * 60 + s) * 1000; }
    return now - { '15m': 900, '1h': 3600, '6h': 21600 }[r] * 1000;
  }

  S.trendChart = function (el, ids, range, h) {
    el.classList.add('trend-host');
    el._trend = { ids: ids.slice(0, 3), range: range || '1h', h: h || 320 };
    el.innerHTML = '<div class="legend">' + el._trend.ids.map(function (id, i) {
      return '<span><i style="background:' + SERIES[i] + '"></i>' + ui.esc(T[id].desc) + ' <span class="muted">(' + T[id].unit + ')</span></span>';
    }).join('') + '</div><div class="trend-wrap"><svg class="trend" style="height:' + el._trend.h + 'px"></svg><div class="trend-tip"></div></div>';
    var svg = el.querySelector('svg'), tip = el.querySelector('.trend-tip');
    svg.addEventListener('mousemove', function (e) { el._hover = e; drawTrend(el); });
    svg.addEventListener('mouseleave', function () { el._hover = null; tip.style.display = 'none'; drawTrend(el); });
    drawTrend(el);
  };

  function drawTrend(el) {
    var cfg = el._trend, svg = el.querySelector('svg'), tip = el.querySelector('.trend-tip');
    if (!svg) return;
    var W = svg.clientWidth || 800, H = cfg.h, L = 58, R = 14, Tp = 10, B = 26;
    var Hst = S.history, t0 = rangeStart(cfg.range), t1 = S.sim.t;
    var i0 = 0; while (i0 < Hst.t.length && Hst.t[i0] < t0) i0++;
    var n = Hst.t.length - i0, stride = Math.max(1, Math.ceil(n / (W - L - R)));
    var idx = []; for (var i = i0; i < Hst.t.length; i += stride) idx.push(i);
    if (Hst.t.length && idx[idx.length - 1] !== Hst.t.length - 1) idx.push(Hst.t.length - 1);
    var lo = Infinity, hi = -Infinity;
    cfg.ids.forEach(function (id) { idx.forEach(function (k) { var v = Hst.v[id][k]; if (v < lo) lo = v; if (v > hi) hi = v; }); });
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    if (lo > 0 && lo < (hi - lo) * 1.5) lo = 0;
    var ticks = niceTicks(lo, hi, 5); lo = ticks[0]; hi = ticks[ticks.length - 1];
    function X(t) { return L + (t - t0) / (t1 - t0) * (W - L - R); }
    function Y(v) { return Tp + (1 - (v - lo) / (hi - lo)) * (H - Tp - B); }
    var unit = T[cfg.ids[0]].unit, s = '<g class="grid">';
    ticks.forEach(function (v) { s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>'; });
    s += '</g><g class="axis">';
    ticks.forEach(function (v) { s += '<text x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + '</text>'; });
    s += '<text x="6" y="12" text-anchor="start">' + ui.esc(unit) + '</text>';
    var span = t1 - t0, step = span > 6 * 3600e3 ? 3 * 3600e3 : span > 3600e3 ? 3600e3 : span > 1800e3 ? 600e3 : 180e3;
    for (var tt = Math.ceil((t0 + 3 * 3600e3) / step) * step - 3 * 3600e3; tt <= t1; tt += step) s += '<text x="' + X(tt) + '" y="' + (H - 8) + '" text-anchor="middle">' + S.fmtTime(tt).slice(0, 5) + '</text>';
    s += '</g>';
    if (lo < 0 && hi > 0) s += '<line class="zero" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>';
    cfg.ids.forEach(function (id, j) {
      var d = idx.map(function (k, q) { return (q ? 'L' : 'M') + X(Hst.t[k]).toFixed(1) + ' ' + Y(Hst.v[id][k]).toFixed(1); }).join('');
      s += '<path class="sr" d="' + d + '" stroke="' + SERIES[j] + '"/>';
    });
    if (el._hover && idx.length) {
      var rect = svg.getBoundingClientRect(), mx = el._hover.clientX - rect.left;
      var tm = t0 + (mx - L) / (W - L - R) * (t1 - t0), best = idx[0];
      idx.forEach(function (k) { if (Math.abs(Hst.t[k] - tm) < Math.abs(Hst.t[best] - tm)) best = k; });
      var xx = X(Hst.t[best]);
      s += '<line class="xh" x1="' + xx + '" x2="' + xx + '" y1="' + Tp + '" y2="' + (H - B) + '"/>';
      var html = '<b>' + S.fmtTime(Hst.t[best]) + '</b>';
      cfg.ids.forEach(function (id, j) {
        var v = Hst.v[id][best];
        s += '<circle cx="' + xx + '" cy="' + Y(v) + '" r="4.5" fill="' + SERIES[j] + '" stroke="#fff" stroke-width="2"/>';
        html += '<br><i style="background:' + SERIES[j] + '"></i>' + ui.esc(T[id].desc) + ': <b>' + v.toFixed(T[id].dec) + ' ' + ui.esc(T[id].unit) + '</b>';
      });
      tip.innerHTML = html; tip.style.display = 'block';
      tip.style.left = Math.min(xx + 12, W - 260) + 'px'; tip.style.top = '30px';
    }
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = s;
  }
  ui.onUpdate = function (root) { root.querySelectorAll('.trend-host').forEach(drawTrend); };


  function download(name, text) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function groupOptions(all) { return '<option value="">' + all + '</option>' + S.groups.map(function (g) { return '<option>' + g + '</option>'; }).join(''); }
  function lvlPill(l) { return l ? '<span class="pill lvl' + l + '">' + l + '</span>' : '<span class="pill lvl0">-</span>'; }

  /* ================= trends ================= */
  var PRESETS = [
    ['Power balance', ['EMS-P-LOAD', 'EMS-P-PV', 'EMS-P-GEN']], ['Battery power', ['EMS-P-BESS']], ['Battery SOC', ['BESS-SOC']],
    ['Bus frequency', ['EMS-F-BUS']], ['Bus voltage', ['EMS-U-BUS']], ['Feeders', ['AH4-P', 'AH6-P', 'AH5-P']], ['Inverters', ['NB01-P', 'NB02-P', 'NB03-P']],
    ['Generators', ['DG1-P', 'DG2-P']], ['Cell temperature', ['BESS-T-CELL-MAX', 'BESS-T-CELL-MIN']], ['Irradiance', ['WS-IRR-POA']]
  ];
  var trendSel = { ids: PRESETS[0][1], range: 'today' };
  S.screens.trends = {
    title: 'Trends',
    render: function () {
      var byGroup = {};
      S.histIds.forEach(function (id) { (byGroup[S.groupOf(T[id])] = byGroup[S.groupOf(T[id])] || []).push(id); });
      var opts = '<option value="">- none -</option>' + S.groups.filter(function (g) { return byGroup[g]; }).map(function (g) {
        return '<optgroup label="' + g + '">' + byGroup[g].map(function (id) { return '<option value="' + id + '">' + id + ' · ' + ui.esc(T[id].desc) + ' (' + T[id].unit + ')</option>'; }).join('') + '</optgroup>';
      }).join('');
      return '<h2 class="scr-t">Trends <small>any measured value of the I/O list · one value axis, up to three pens of the same unit</small></h2>' +
        '<div class="filters">' + PRESETS.map(function (p, i) { return '<button class="btn b-small b-blue" data-preset="' + i + '">' + p[0] + '</button>'; }).join('') + '</div>' +
        '<div class="filters">' + [0, 1, 2].map(function (i) { return '<select data-pen="' + i + '" style="max-width:380px">' + opts + '</select>'; }).join('') +
        '<select id="trange"><option value="15m">15 min</option><option value="1h">1 hour</option><option value="6h">6 hours</option><option value="today">Today</option></select> <span id="tmsg" class="note"></span></div>' +
        ui.card('Trend', '<div id="trend-main"></div>') + '<details style="margin-top:8px"><summary class="note">Table view (last 20 samples)</summary><div id="trend-tbl"></div></details>';
    },
    init: function (root) {
      function apply() {
        root.querySelectorAll('[data-pen]').forEach(function (s, i) { s.value = trendSel.ids[i] || ''; });
        root.querySelector('#trange').value = trendSel.range;
        S.trendChart(root.querySelector('#trend-main'), trendSel.ids, trendSel.range, 360);
      }
      root.querySelectorAll('[data-preset]').forEach(function (b) { b.addEventListener('click', function () { trendSel.ids = PRESETS[b.getAttribute('data-preset')][1].slice(); apply(); }); });
      root.querySelectorAll('[data-pen]').forEach(function (s) {
        s.addEventListener('change', function () {
          var ids = [].map.call(root.querySelectorAll('[data-pen]'), function (x) { return x.value; }).filter(Boolean);
          var u = ids.length ? T[ids[0]].unit : '', ok = ids.filter(function (id) { return T[id].unit === u; });
          root.querySelector('#tmsg').textContent = ok.length < ids.length ? 'Pens with a different unit were removed: plot them in a separate trend.' : '';
          if (ok.length) { trendSel.ids = ok; apply(); }
        });
      });
      root.querySelector('#trange').addEventListener('change', function () { trendSel.range = this.value; apply(); });
      apply();
    },
    update: function (root) {
      var H = S.history, n = H.t.length, el = root.querySelector('#trend-tbl');
      if (!el || !el.parentNode.open) return;
      var h = '<table class="tbl"><tr><th>Time</th>' + trendSel.ids.map(function (id) { return '<th>' + id + '</th>'; }).join('') + '</tr>';
      for (var k = n - 1; k >= Math.max(0, n - 20); k--) h += '<tr><td>' + S.fmtTime(H.t[k]) + '</td>' + trendSel.ids.map(function (id) { return '<td class="num">' + H.v[id][k].toFixed(T[id].dec) + '</td>'; }).join('') + '</tr>';
      el.innerHTML = h + '</table>';
    }
  };

  /* ================= reports ================= */
  function todayStats() {
    var H = S.history, n = H.t.length, now = S.sim.t;
    var hms = S.fmtTime(now).split(':').map(Number), t0 = now - (hms[0] * 3600 + hms[1] * 60 + hms[2]) * 1000;
    var i0 = 0; while (i0 < n && H.t[i0] < t0) i0++;
    var e = { load: 0, pv: 0, bess_dis: 0, bess_chg: 0, gen: 0 }, live = 0, span = 0;
    for (var i = Math.max(i0, 1); i < n; i++) {
      var dt = (H.t[i] - H.t[i - 1]) / 3600e3;
      e.load += H.v['EMS-P-LOAD'][i] * dt; e.pv += H.v['EMS-P-PV'][i] * dt; e.gen += H.v['EMS-P-GEN'][i] * dt;
      var pb = H.v['EMS-P-BESS'][i]; if (pb > 0) e.bess_dis += pb * dt; else e.bess_chg -= pb * dt;
      span += dt; if (H.v['EMS-U-BUS'][i] > 9) live += dt;
    }
    function first(id) { return i0 < n ? H.v[id][i0] : T[id].v; }
    return { e: e, avail: span ? live / span * 100 : 100, hours: span,
      dg: C.generators.map(function (g) { return { id: g.id, hours: T[g.id + '-HOURS'].v - first(g.id + '-HOURS'), starts: T[g.id + '-STARTS'].v - first(g.id + '-STARTS'), fuel: first(g.id + '-FUEL') - T[g.id + '-FUEL'].v }; }) };
  }
  S.screens.reports = {
    title: 'Reports',
    render: function () {
      return '<h2 class="scr-t">Reports <small>daily report from the historian · monthly and yearly reports are built the same way in service</small></h2>' +
        '<div class="filters"><button class="btn b-blue" id="rep-csv">EXPORT CSV</button><span class="note">Export needs the Admin role.</span></div><div class="grid g2" id="rep"></div>';
    },
    init: function (root) {
      root.querySelector('#rep-csv').onclick = function () {
        if (S.user.level < 2) { alert('Admin role required to export reports'); return; }
        var s = todayStats(), rows = [['Item', 'Value', 'Unit'], ['Load energy', s.e.load.toFixed(0), 'kWh'], ['PV energy', s.e.pv.toFixed(0), 'kWh'], ['Battery discharged', s.e.bess_dis.toFixed(0), 'kWh'],
          ['Battery charged', s.e.bess_chg.toFixed(0), 'kWh'], ['Generator energy', s.e.gen.toFixed(0), 'kWh'], ['Supply availability', s.avail.toFixed(2), '%']];
        s.dg.forEach(function (d) { rows.push([d.id + ' running hours', d.hours.toFixed(1), 'h'], [d.id + ' starts', d.starts, ''], [d.id + ' fuel used', d.fuel.toFixed(1), '% of tank']); });
        download('VillaSomalia_daily_report.csv', rows.map(function (r) { return r.join(','); }).join('\n'));
        S.event('CMD', 'Daily report exported', 0);
      };
    },
    update: function (root) {
      var s = todayStats(), e = s.e, ren = e.load > 0 ? Math.max(0, (e.load - e.gen) / e.load * 100) : 0;
      root.querySelector('#rep').innerHTML =
        ui.card('Energy by source, today (' + s.hours.toFixed(1) + ' h recorded)', '<table class="tbl"><tr><th>Source</th><th class="num">kWh</th></tr>' +
          [['Load supplied', e.load], ['PV', e.pv], ['Battery discharged', e.bess_dis], ['Battery charged', e.bess_chg], ['Generators', e.gen]].map(function (r) { return '<tr><td>' + r[0] + '</td><td class="num">' + r[1].toFixed(0) + '</td></tr>'; }).join('') +
          '<tr><th>Renewable share</th><th class="num">' + ren.toFixed(0) + ' %</th></tr></table>') +
        ui.card('Generators and availability, today', '<table class="tbl"><tr><th>Generator</th><th class="num">Running hours</th><th class="num">Starts</th><th class="num">Fuel used</th></tr>' +
          s.dg.map(function (d) { return '<tr><td>' + d.id + '</td><td class="num">' + d.hours.toFixed(1) + '</td><td class="num">' + d.starts + '</td><td class="num">' + d.fuel.toFixed(1) + ' % of tank</td></tr>'; }).join('') +
          '</table><div class="kv" style="margin-top:8px"><span class="k">Supply availability (11 kV busbar live)</span><span class="v">' + s.avail.toFixed(2) + ' %</span></div>');
    }
  };

  /* ================= alarms ================= */
  var almF = { lvl: '', grp: '', q: '' };
  S.screens.alarms = {
    title: 'Alarms',
    render: function () {
      return '<h2 class="scr-t">Alarms <small>level 1 critical · 2 major · 3 minor · Operator acknowledges; faults are cleared at the equipment or by EMS reset</small></h2>' +
        '<div class="filters"><select id="af-l"><option value="">All levels</option><option>1</option><option>2</option><option>3</option></select><select id="af-g">' + groupOptions('All equipment') + '</select>' +
        '<input id="af-q" placeholder="Search tag or text…"> <button class="btn b-blue" id="af-ack">ACKNOWLEDGE ALL</button> <span class="note" id="af-n"></span></div>' +
        '<div class="tblwrap"><table class="tbl"><thead><tr><th>Level</th><th>Raised</th><th>Cleared</th><th>Tag</th><th>Description</th><th>Equipment</th><th>Value</th><th>State</th><th></th></tr></thead><tbody id="alm-body"></tbody></table></div>';
    },
    init: function (root) {
      root.querySelector('#af-l').value = almF.lvl; root.querySelector('#af-g').value = almF.grp; root.querySelector('#af-q').value = almF.q;
      root.querySelector('#af-l').onchange = function () { almF.lvl = this.value; S.tick(); };
      root.querySelector('#af-g').onchange = function () { almF.grp = this.value; S.tick(); };
      root.querySelector('#af-q').oninput = function () { almF.q = this.value.toLowerCase(); S.tick(); };
      root.querySelector('#af-ack').onclick = function () { S.ackAlarm(); S.tick(); };
      root.querySelector('#alm-body').addEventListener('click', function (e) { var b = e.target.closest('[data-ack]'); if (b) { S.ackAlarm(b.getAttribute('data-ack')); S.tick(); } });
    },
    update: function (root) {
      var list = S.alarmList().filter(function (a) {
        var g = T[a.id] ? S.groupOf(T[a.id]) : 'Controller and network';
        return (!almF.lvl || a.level == almF.lvl) && (!almF.grp || g === almF.grp) && (!almF.q || (a.id + ' ' + a.txt).toLowerCase().indexOf(almF.q) >= 0);
      });
      root.querySelector('#af-n').textContent = list.length + ' alarms';
      root.querySelector('#alm-body').innerHTML = list.map(function (a) {
        var st = a.active ? (a.acked ? 'Active · acknowledged' : 'Active · unacknowledged') : 'Cleared · unacknowledged';
        return '<tr class="' + (a.acked ? '' : 'unack') + (a.active ? '' : ' cleared') + '"><td>' + lvlPill(a.level) + '</td><td>' + S.fmtTime(a.tIn, true) + '</td><td>' + (a.tOut ? S.fmtTime(a.tOut) : '') + '</td>' +
          '<td><b>' + a.id + '</b></td><td>' + ui.esc(a.txt) + '</td><td>' + ui.esc(a.equip || '') + '</td><td class="num">' + ui.esc(a.val) + '</td><td>' + st + '</td><td>' + (a.acked ? '' : '<button class="btn b-small b-blue" data-ack="' + a.id + '">ACK</button>') + '</td></tr>';
      }).join('') || '<tr><td colspan="9" class="muted">No alarms</td></tr>';
    }
  };

  /* ================= event log ================= */
  var evQ = '';
  S.screens.events = {
    title: 'Event log',
    render: function () {
      return '<h2 class="scr-t">Event log <small>every state change, command, acknowledgement and log-in, with user and time · kept 12 months in service</small></h2>' +
        '<div class="filters"><input id="ev-q" placeholder="Search…"> <button class="btn b-blue" id="ev-csv">EXPORT CSV</button><span class="note">Export needs the Admin role.</span></div>' +
        '<div class="tblwrap"><table class="tbl"><thead><tr><th>Time</th><th>Source</th><th>Event</th><th>User</th></tr></thead><tbody id="ev-body"></tbody></table></div>';
    },
    init: function (root) {
      root.querySelector('#ev-q').value = evQ;
      root.querySelector('#ev-q').oninput = function () { evQ = this.value.toLowerCase(); S.tick(); };
      root.querySelector('#ev-csv').onclick = function () {
        if (S.user.level < 2) { alert('Admin role required to export the audit log'); return; }
        download('VillaSomalia_event_log.csv', 'Time,Source,Event,User\n' + S.events.map(function (e) { return [S.fmtTime(e.t, true), e.src, '"' + e.msg.replace(/"/g, '""') + '"', e.user].join(','); }).join('\n'));
      };
    },
    update: function (root) {
      root.querySelector('#ev-body').innerHTML = S.events.filter(function (e) { return !evQ || (e.src + ' ' + e.msg).toLowerCase().indexOf(evQ) >= 0; }).slice(0, 400).map(function (e) {
        return '<tr><td>' + S.fmtTime(e.t, true) + '</td><td>' + (e.level ? lvlPill(e.level) + ' ' : '') + e.src + '</td><td>' + ui.esc(e.msg) + '</td><td>' + e.user + '</td></tr>';
      }).join('');
    }
  };

  /* ================= communication status ================= */
  function nb(x, y, w, label, sub, ok) {
    return '<g class="netdev" data-net="' + (ok || '') + '" transform="translate(' + x + ',' + y + ')"><rect width="' + w + '" height="38" rx="3"/>' +
      '<text x="' + (w / 2) + '" y="16" text-anchor="middle" font-weight="700">' + ui.esc(label) + '</text>' + (sub ? '<text x="' + (w / 2) + '" y="30" text-anchor="middle" class="lbl-xs">' + ui.esc(sub) + '</text>' : '') + '</g>';
  }
  function lk(pts, cls, ok) { return '<polyline class="link ' + (cls || '') + '" data-netl="' + (ok || '') + '" points="' + pts + '"/>'; }
  function lbl(x, y, t, a) { return '<text class="proto" x="' + x + '" y="' + y + '" text-anchor="' + (a || 'middle') + '">' + ui.esc(t) + '</text>'; }
  function netSvg() {
    var s = '<svg class="sld" viewBox="0 0 1300 640">';
    // control room
    s += '<rect class="zonebg" x="10" y="10" width="1280" height="110" rx="6"/><text class="zonelbl" x="20" y="28">CONTROL ROOM · SCADA ZONE</text>';
    s += nb(40, 50, 170, 'SCADA station A', 'Machine SCADA Expert, active', 'SW-CORE-A-HEALTHY') + nb(230, 50, 170, 'SCADA station B', 'hot standby', 'SW-CORE-B-HEALTHY');
    s += nb(420, 50, 170, 'Engineering laptop', 'Control Expert, SCADA build', '');
    s += nb(830, 50, 190, 'Firewall + VPN', 'FortiGate · off by default', 'FW-HEALTHY') + nb(1060, 50, 200, 'GPS time server', 'LANTIME M300 · NTP', 'GPS-HEALTHY&GPS-TIME-SYNC');
    // core
    s += '<rect class="zonebg" x="10" y="140" width="1280" height="150" rx="6"/><text class="zonelbl" x="20" y="158">11 kV SWITCHROOM · CONTROL AND SUBSTATION ZONES</text>';
    s += nb(240, 175, 190, 'Core switch A', 'Modicon managed switch', 'SW-CORE-A-HEALTHY') + nb(870, 175, 190, 'Core switch B', 'Modicon managed switch', 'SW-CORE-B-HEALTHY');
    s += nb(450, 175, 170, 'M580 A', '', 'CP-A-HEALTHY&CP-A-PS1-OK&CP-A-PS2-OK') + nb(680, 175, 170, 'M580 B', '', 'CP-B-HEALTHY&CP-B-PS1-OK&CP-B-PS2-OK');
    s += '<text class="lbl-xs cprole" data-cp="A" x="535" y="205" text-anchor="middle"></text><text class="lbl-xs cprole" data-cp="B" x="765" y="205" text-anchor="middle"></text>';
    s += lk('620,194 680,194', 'serial', 'CP-REDUN-OK') + lbl(650, 186, 'HSBY link');
    s += nb(540, 240, 220, '11 kV relays AH1 to AH7', 'Modbus TCP', 'AH1-RLY-HEALTHY&AH2-RLY-HEALTHY&AH3-RLY-HEALTHY&AH4-RLY-HEALTHY&AH5-RLY-HEALTHY&AH6-RLY-HEALTHY&AH7-RLY-HEALTHY');
    [125, 315, 505].forEach(function (x, i) { s += lk(x + ',88 ' + x + ',130 ' + (i < 2 ? 335 : 965) + ',130 ' + (i < 2 ? 335 : 965) + ',175'); });
    s += lk('925,88 925,130 965,130') + lk('1160,88 1160,130 965,130');
    s += lk('430,194 450,194') + lk('850,194 870,194') + lbl(650, 168, 'M580 hot standby pair · Modbus TCP to stations A and B · each controller on both core switches');
    s += lk('600,240 430,214') + lk('700,240 870,214') + lbl(820, 262, 'dual-connected', 'start');
    s += lbl(1180, 170, 'SNMP v3 · syslog', 'middle');
    // ring
    s += '<rect class="zonebg" x="10" y="310" width="1280" height="190" rx="6"/><text class="zonelbl" x="20" y="328">FIBRE RING · MONITORING AND FIELD DEVICES</text>';
    var sw = [['SW-MV', 'Inverter MV station', 110], ['SW-BESS', 'BESS area', 340], ['SW-GEN', 'Generator area', 570], ['SW-PRS', 'President station', 800], ['SW-PMS', 'PM station', 1030]];
    s += lk('335,213 335,250 30,250 30,365 110,365', 'fo', 'SW-MV-RING-OK');
    sw.forEach(function (w, i) {
      s += nb(w[2], 345, 170, w[0], w[1], w[0] + '-HEALTHY');
      if (i < sw.length - 1) s += lk((w[2] + 170) + ',364 ' + sw[i + 1][2] + ',364', 'fo', sw[i + 1][0] + '-RING-OK');
    });
    s += lk('1200,364 1270,364 1270,250 965,250 965,213', 'fo', 'SW-PMS-RING-OK') + lbl(900, 338, 'single-mode fibre ring, core A → field switches → core B');
    var dev = [[30, 'PLC box', 'Modbus TCP', 'PLCBOX-NB01-COMM&PLCBOX-NB02-COMM&PLCBOX-NB03-COMM&PLCBOX-NB04-COMM', 110, 145], [190, "blue'Log XM", 'weather · Modbus TCP', 'WS-HEALTHY', 110, 145],
      [345, 'EMS', 'battery via EMS', '', 340, 160], [575, 'DG1, DG2 controllers', 'Modbus', '', 570, 160], [805, 'ST260E + PM5560', 'via island · LVDB meter', 'PRS-RLY-HEALTHY', 800, 160], [1035, 'ST260E + PM5560', 'via island · LVDB meter', 'PMS-RLY-HEALTHY', 1030, 160]];
    dev.forEach(function (d) { s += nb(d[0], 430, d[5], d[1], d[2], d[3]) + lk((d[0] + d[5] / 2) + ',430 ' + (d[0] + d[5] / 2) + ',405 ' + (d[4] + 85) + ',405 ' + (d[4] + 85) + ',383'); });
    // I/O locations: switchroom remote drop and four Edge I/O islands
    s += '<rect class="zonebg" x="10" y="515" width="1280" height="115" rx="6"/><text class="zonelbl" x="20" y="533">HARDWIRED I/O · SWITCHROOM REMOTE DROP AND EDGE I/O ISLANDS · BOTH CONTROLLERS</text>';
    var locs = [['SWR', 'Switchroom drop', 'X80 · remote I/O, copper'], ['PRS', 'President island', 'Edge I/O · fibre ring'], ['PMS', 'PM island', 'Edge I/O · fibre ring'],
      ['YRD', 'BESS yard island', 'Edge I/O · fibre ring'], ['GEN', 'Generator island', 'Edge I/O · fibre ring']];
    locs.forEach(function (r, i) { s += nb(40 + i * 250, 570, 220, r[1], r[2], 'CP-IO-' + r[0] + '-OK'); });
    s += lk('530,213 530,555 150,555 150,570', 'serial', 'CP-IO-SWR-OK') + lk('765,213 765,228 530,228', 'serial') + lbl(536, 548, 'M580 remote I/O, both controllers', 'start');
    s += lbl(1270, 548, 'islands: EtherNet/IP over the fibre ring, through the local switch', 'end');
    return s + '</svg>';
  }
  S.screens.comms = {
    title: 'Communication status',
    render: function () {
      var health = S.tagOrder.filter(function (id) { return /^(SW-|FW-|GPS-|CP-|PLCBOX-)/.test(id) || /-(COMM-OK|RLY-HEALTHY|HEALTHY)$/.test(id) && !/^(AH\d-RLY-OK)/.test(id); });
      return '<h2 class="scr-t">Communication status <small>health of every device link, switch, I/O location and SCADA station · design report section 8</small></h2>' +
        ui.card('Network and I/O links', netSvg()) + '<div style="height:12px"></div><div class="grid g-side"><div>' +
        ui.card('Protocols by link', '<table class="tbl"><tr><th>Link</th><th>Protocol</th><th>Medium</th></tr>' + [
          ['Controllers to SCADA stations A and B', 'Modbus TCP', 'Ethernet, both core switches'], ['Controllers to 11 kV relays', 'Modbus TCP (IEC 61850 with an added module)', 'Ethernet, both core switches'],
          ['PV inverters to PLC box', 'Power line communication', 'AC power cables'], ['Controllers to PLC box', 'Modbus TCP', 'Fibre ring'], ['Controllers to EMS (battery data)', 'Modbus TCP', 'Fibre ring'],
          ['Controllers to generator controllers', 'Modbus TCP, or RTU via an island serial master', 'Fibre ring'], ['Controllers to RMU relays ST260E', 'Modbus RTU via the Edge I/O serial master', 'RS485 at the station, then fibre ring'],
          ['Controllers to meters, weather logger, UPS', 'Modbus TCP or SNMP', 'Fibre ring or copper'], ['Controllers to the switchroom I/O drop', 'M580 Ethernet remote I/O', 'Copper, same cabinet'],
          ['Controller A to controller B', 'M580 hot standby link', 'Dedicated link between the CPUs'], ['Controllers to the Edge I/O islands', 'EtherNet/IP', 'Fibre ring'],
          ['All devices to GPS time server', 'NTP', 'Ethernet'], ['Network devices to SCADA', 'SNMP v3, syslog', 'Ethernet'],
          ['Remote support', 'VPN through the firewall', 'Internet, off by default']
        ].map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('') + '</table>') + '</div><aside>' +
        ui.card('Health signals', '<div class="fp-grid1">' + health.map(function (id) { return ui.lamp(id, id); }).join('') + '</div>', 'dark') + '</aside></div>';
    },
    update: function (root) {
      root.querySelectorAll('[data-cp]').forEach(function (el) {
        var c = el.getAttribute('data-cp'), cp = S.sim.cp;
        el.textContent = !cp[c] ? 'FAILED' : cp.active === c ? 'ACTIVE' : 'STANDBY';
      });
      root.querySelectorAll('[data-net]').forEach(function (g) { var e = g.getAttribute('data-net'); if (!e) return; var ok = ui.ev(e); g.classList.toggle('ok', ok); g.classList.toggle('nok', !ok); });
      root.querySelectorAll('[data-netl]').forEach(function (l) { var e = l.getAttribute('data-netl'); if (e) l.classList.toggle('nok', !ui.ev(e)); });
    }
  };

  /* ================= I/O list ================= */
  var ioF = { grp: '', type: '', src: '', q: '' };
  S.screens.iolist = {
    title: 'I/O list',
    render: function () {
      var hw = S.tagOrder.filter(function (id) { return T[id].src === 'HW'; }).length;
      return '<h2 class="scr-t">I/O list <small>' + S.tagOrder.length + ' signals from ' + ui.esc(S.iolistSource) + ': ' + hw + ' hardwired, ' + (S.tagOrder.length - hw) + ' communication · the same list drives every screen</small></h2>' +
        '<div class="filters"><select id="io-g">' + groupOptions('All equipment') + '</select><select id="io-s"><option value="">Hardwired and communication</option><option value="HW">Hardwired</option><option value="COM">Communication</option></select>' +
        '<select id="io-t"><option value="">All types</option><option value="DI">DI</option><option value="DO">DO</option><option value="AI">AI</option><option value="AO">AO setpoint</option><option value="ST">Multi-state</option></select>' +
        '<input id="io-q" placeholder="Search tag, text or equipment…" style="min-width:240px"> <button class="btn b-blue" id="io-csv">EXPORT CSV</button> <span class="note" id="io-n"></span></div>' +
        '<div class="tblwrap"><table class="tbl"><thead><tr><th>Tag</th><th>Description</th><th>Equipment</th><th>Type</th><th>I/O channel or source</th><th>Alarm</th><th>Operated by</th><th>Live value</th></tr></thead><tbody id="io-body"></tbody></table></div>';
    },
    init: function (root) {
      function draw() {
        var rows = S.tagOrder.filter(function (id) {
          var t = T[id];
          return (!ioF.grp || S.groupOf(t) === ioF.grp) && (!ioF.type || t.type === ioF.type) && (!ioF.src || t.src === ioF.src) &&
            (!ioF.q || (id + ' ' + t.desc + ' ' + t.equip).toLowerCase().indexOf(ioF.q) >= 0);
        });
        root.querySelector('#io-n').textContent = rows.length + ' of ' + S.tagOrder.length;
        root.querySelector('#io-body').innerHTML = rows.map(function (id) {
          var t = T[id], al = t.alarm ? lvlPill(t.alarm.level) + ' when ' + (t.alarm.on ? 'on' : 'off') : t.lim ? lvlPill(t.lim.level) + ' ' + (t.lim.lo !== undefined ? '< ' + t.lim.lo : '') + (t.lim.hi !== undefined ? ' > ' + t.lim.hi : '') : '';
          return '<tr><td><b>' + id + '</b></td><td>' + ui.esc(t.desc) + '</td><td>' + ui.esc(t.equip) + '</td><td>' + t.type + '</td><td>' + (t.src === 'HW' ? 'Hardwired · ' : '') + ui.esc(t.addr) + '</td><td>' + al +
            '</td><td>' + ui.esc(t.opby) + '</td><td class="num" data-tag="' + id + '"></td></tr>';
        }).join('');
        ui.update(root.querySelector('#io-body'));
      }
      [['#io-g', 'grp'], ['#io-s', 'src'], ['#io-t', 'type']].forEach(function (x) { var el = root.querySelector(x[0]); el.value = ioF[x[1]]; el.onchange = function () { ioF[x[1]] = this.value; draw(); }; });
      root.querySelector('#io-q').value = ioF.q;
      root.querySelector('#io-q').oninput = function () { ioF.q = this.value.toLowerCase(); draw(); };
      root.querySelector('#io-csv').onclick = function () { download('VillaSomalia_IO_List.csv', S.ioListCsv()); };
      draw();
    }
  };

  /* ================= users ================= */
  S.screens.users = {
    title: 'User management',
    render: function () {
      var perm = [['View all screens, trends, alarms and reports', 'Yes', 'Yes'], ['Acknowledge alarms', 'Yes', 'Yes'], ['Open and close breakers, with select and confirm', 'Yes', 'Yes'],
        ['Start and stop a generator in manual mode', 'Yes', 'Yes'], ['Clear level 3 faults (EMS)', 'Yes', 'Yes'], ['Clear level 1 and level 2 faults (EMS)', 'No', 'Yes'],
        ['Change EMS operating mode and setpoints', 'No', 'Yes'], ['Enable or disable the battery C-rate limit', 'No', 'Yes'], ['Change generator mode between automatic and manual', 'No', 'Yes'],
        ['Inverter start / stop and power limit (if the EMS allows)', 'No', 'Yes'], ['Create and remove users, reset passwords', 'No', 'Yes'], ['Enable a remote support session', 'No', 'Yes'], ['Export the audit log and reports', 'No', 'Yes']];
      return '<h2 class="scr-t">User management <small>two roles · individual logins · every action logged (design report section 10)</small></h2><div class="grid g2">' +
        ui.card('Log in', '<p>Logged in as <b id="cur-user"></b></p><div class="btnrow">' + Object.keys(S.users).map(function (k) { return '<button class="btn b-blue" data-user="' + k + '">' + S.users[k].label + '</button>'; }).join('') + '</div>' +
          '<p class="note">Demonstration log-in. In service: individual accounts, 12-character minimum passwords, lockout after 5 failed attempts, logout after 15 idle minutes.</p>' +
          '<h4>Remote support session</h4><p class="note">Off by default. An Admin enables it per session; it closes on a timer and is logged.</p><button class="btn b-amber" id="vpn">ENABLE / DISABLE VPN SESSION</button>') +
        ui.card('Permissions', '<table class="tbl"><tr><th>Function</th><th>Operator</th><th>Admin</th></tr>' + perm.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('') + '</table>') + '</div>';
    },
    init: function (root) {
      root.querySelectorAll('[data-user]').forEach(function (b) { b.onclick = function () { S.user = S.users[b.getAttribute('data-user')]; S.event('SEC', 'User log-in: ' + S.user.label, 0); S.tick(); }; });
      root.querySelector('#vpn').onclick = function () {
        if (S.user.level < 2) { alert('Admin role required'); return; }
        S.sim.vpn = !S.sim.vpn; S.event('SEC', 'Remote support VPN session ' + (S.sim.vpn ? 'ENABLED' : 'closed'), 0); S.tick();
      };
    },
    update: function (root) { var u = root.querySelector('#cur-user'); if (u) u.textContent = S.user.label; }
  };

  /* ================= simulation ================= */
  var FAULTS = [
    ['AH4_OC', 'AH4 President feeder: overcurrent trip'], ['AH6_EF', 'AH6 PM feeder: earth fault trip'], ['RELAY_RESET', 'Reset relays locally at the panels'],
    ['BESS_FAULT', 'Battery fault (level 1)'], ['FIRE_PRE', 'Battery container: fire pre-alarm'], ['FIRE_CONF', 'Battery container: fire confirmed'],
    ['ESTOP', 'Press emergency stop in the switchroom'], ['ESTOP_RESET', 'Reset the emergency stop locally'], ['DG1_FAILSTART', 'DG1 fails to start next time'], ['DG_MAN', 'Set both generators to manual at the controller'],
    ['CP_A_FAIL', 'Controller A fails / repaired'], ['CP_B_FAIL', 'Controller B fails / repaired'], ['EMS_FAIL', 'EMS stops / restarts (generators take over)'], ['OVERLOAD', 'Office load step +400 kW on / off'], ['INV3_FAULT', 'NB03 insulation fault'], ['MCCB_NB03', 'NB03 AC breaker trips'], ['CLOUD', 'Heavy cloud on / off'], ['SF6_AH6', 'AH6 gas pressure low'],
    ['COMM_PM', 'Cut / restore the fibre to the PM station'], ['CLEAR', 'Clear all simulated faults']
  ];
  S.screens.sim = {
    title: 'Simulation',
    render: function () {
      return '<h2 class="scr-t">Simulation <small>for review, factory testing and operator training · not part of the delivered SCADA</small></h2><div class="grid g2">' +
        ui.card('Plant simulator', '<p class="note">The screens run on a simulator of the plant, mapped onto every signal of the I/O list (' + S.tagOrder.length + ' tags). In service the same tags come from the M580 controllers.</p>' +
          '<div class="filters">Speed <select id="sim-speed"><option value="1">×1 real time</option><option value="10">×10</option><option value="60">×60</option><option value="300">×300</option></select>' +
          '<button class="btn b-gray" id="sim-pause">PAUSE</button></div>') +
        ui.card('Fault simulation (Admin)', '<div class="btnrow">' + FAULTS.map(function (f) { return '<button class="btn b-small b-amber" style="color:#fff" data-fault="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div><p id="sim-msg" class="note"></p>') + '</div>';
    },
    init: function (root) {
      var sp = root.querySelector('#sim-speed'); sp.value = S.sim.speed; sp.onchange = function () { S.sim.speed = Number(this.value); };
      var pb = root.querySelector('#sim-pause'); pb.textContent = S.sim.running ? 'PAUSE' : 'RESUME';
      pb.onclick = function () { S.sim.running = !S.sim.running; this.textContent = S.sim.running ? 'PAUSE' : 'RESUME'; };
      root.querySelectorAll('[data-fault]').forEach(function (b) {
        b.onclick = function () {
          var m = root.querySelector('#sim-msg');
          if (S.user.level < 2) { m.textContent = '✖ Admin role required'; return; }
          S.injectFault(b.getAttribute('data-fault')); m.textContent = '✔ ' + b.textContent; S.tick();
        };
      });
    }
  };
})(SCADA);
