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
    var Hst = S.sim.history, t0 = rangeStart(cfg.range), t1 = S.sim.t;
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

  /* ================= trends screen ================= */
  var PRESETS = [
    ['Power balance', ['PPC.PLANT.P_LOAD', 'PPC.PLANT.P_PV', 'PPC.PLANT.P_DG']],
    ['BESS power', ['PPC.PLANT.P_BESS']], ['BESS SOC', ['BESS.SYS.SOC']], ['Bus frequency', ['GIS.BUS.F']], ['Bus voltage', ['GIS.BUS.U']],
    ['Transformer temps', ['TX.DGTX.T_WDG', 'TX.PVTX.T_WDG', 'TX.BESSTX.T_WDG']], ['Feeder loads', ['GIS.AH4.P', 'GIS.AH6.P', 'GIS.AH5.P']],
    ['Inverters', ['PV.INV1.P', 'PV.INV2.P', 'PV.INV3.P']], ['Irradiance', ['MET.WS.IRR_POA', 'MET.WS.IRR_GHI']]
  ];
  var trendSel = { ids: PRESETS[0][1], range: 'today' };

  S.screens.trends = {
    title: 'Trends',
    render: function () {
      var opts = '<option value="">- none -</option>';
      var byArea = {};
      S.sim.histIds.forEach(function (id) { (byArea[T[id].area] = byArea[T[id].area] || []).push(id); });
      Object.keys(byArea).forEach(function (a) {
        opts += '<optgroup label="' + S.areaNames[a] + '">' + byArea[a].map(function (id) { return '<option value="' + id + '">' + id + ' - ' + ui.esc(T[id].desc) + ' (' + T[id].unit + ')</option>'; }).join('') + '</optgroup>';
      });
      return '<h2 class="scr-t">Trends <small>historian · 1 hour at 2 s, from midnight at 30 s · one value axis, up to 3 pens of the same unit</small></h2>' +
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
          var u = ids.length ? T[ids[0]].unit : '';
          var ok = ids.filter(function (id) { return T[id].unit === u; });
          root.querySelector('#tmsg').textContent = ok.length < ids.length ? 'Pens with a different unit were removed - plot them in a separate trend.' : '';
          if (ok.length) { trendSel.ids = ok; apply(); }
        });
      });
      root.querySelector('#trange').addEventListener('change', function () { trendSel.range = this.value; apply(); });
      apply();
    },
    update: function (root) {
      var H = S.sim.history, n = H.t.length, el = root.querySelector('#trend-tbl');
      if (!el || !el.parentNode.open) return;
      var h = '<table class="tbl"><tr><th>Time</th>' + trendSel.ids.map(function (id) { return '<th>' + id + '</th>'; }).join('') + '</tr>';
      for (var k = n - 1; k >= Math.max(0, n - 20); k--) h += '<tr><td>' + S.fmtTime(H.t[k]) + '</td>' + trendSel.ids.map(function (id) { return '<td class="num">' + H.v[id][k].toFixed(T[id].dec) + '</td>'; }).join('') + '</tr>';
      el.innerHTML = h + '</table>';
    }
  };

  /* ================= alarms ================= */
  var almFilter = { pri: '', area: '', q: '' };
  S.screens.alarms = {
    title: 'Active Alarms',
    render: function () {
      return '<h2 class="scr-t">Active alarms <small>ISA-18.2 style: priority 1 critical · 2 high · 3 medium · 4 low</small></h2>' +
        '<div class="filters"><select id="af-pri"><option value="">All priorities</option><option>1</option><option>2</option><option>3</option><option>4</option></select>' +
        '<select id="af-area"><option value="">All areas</option>' + Object.keys(S.areaNames).map(function (a) { return '<option value="' + a + '">' + S.areaNames[a] + '</option>'; }).join('') + '</select>' +
        '<input id="af-q" placeholder="Search…"> <button class="btn b-blue" id="af-ack">ACKNOWLEDGE ALL</button> <span class="note" id="af-n"></span></div>' +
        '<div class="tblwrap"><table class="tbl"><thead><tr><th>Pri</th><th>Raised</th><th>Cleared</th><th>Area</th><th>Tag</th><th>Description</th><th>Value</th><th>State</th><th></th></tr></thead><tbody id="alm-body"></tbody></table></div>';
    },
    init: function (root) {
      root.querySelector('#af-pri').value = almFilter.pri; root.querySelector('#af-area').value = almFilter.area; root.querySelector('#af-q').value = almFilter.q;
      root.querySelector('#af-pri').onchange = function () { almFilter.pri = this.value; S.tick(); };
      root.querySelector('#af-area').onchange = function () { almFilter.area = this.value; S.tick(); };
      root.querySelector('#af-q').oninput = function () { almFilter.q = this.value.toLowerCase(); S.tick(); };
      root.querySelector('#af-ack').onclick = function () { S.ackAlarm(); S.tick(); };
      root.querySelector('#alm-body').addEventListener('click', function (e) { var b = e.target.closest('[data-ack]'); if (b) { S.ackAlarm(b.getAttribute('data-ack')); S.tick(); } });
    },
    update: function (root) {
      var list = S.alarmList().filter(function (a) {
        var t = T[a.id];
        return (!almFilter.pri || a.pri == almFilter.pri) && (!almFilter.area || t.area === almFilter.area) && (!almFilter.q || (a.id + a.txt).toLowerCase().indexOf(almFilter.q) >= 0);
      });
      root.querySelector('#af-n').textContent = list.length + ' alarms';
      root.querySelector('#alm-body').innerHTML = list.map(function (a) {
        var st = a.active ? (a.acked ? 'ACTIVE · ACK' : 'ACTIVE · UNACK') : 'CLEARED · UNACK';
        return '<tr class="' + (a.acked ? '' : 'unack') + (a.active ? '' : ' cleared') + '"><td><span class="pill pri' + a.pri + '">' + a.pri + '</span></td><td>' + S.fmtTime(a.tIn, true) + '</td><td>' + (a.tOut ? S.fmtTime(a.tOut) : '') + '</td>' +
          '<td>' + T[a.id].area + '</td><td>' + a.id + '</td><td>' + ui.esc(a.txt) + '</td><td class="num">' + ui.esc(a.val) + '</td><td>' + st + '</td><td>' + (a.acked ? '' : '<button class="btn b-small b-blue" data-ack="' + a.id + '">ACK</button>') + '</td></tr>';
      }).join('') || '<tr><td colspan="9" class="muted">No alarms</td></tr>';
    }
  };

  /* ================= events ================= */
  var evQ = '';
  S.screens.events = {
    title: 'Event Log',
    render: function () {
      return '<h2 class="scr-t">Event log &amp; audit trail <small>alarms, state changes, operator commands, log-ins</small></h2>' +
        '<div class="filters"><input id="ev-q" placeholder="Search…"> <button class="btn b-blue" id="ev-csv">EXPORT CSV</button></div>' +
        '<div class="tblwrap"><table class="tbl"><thead><tr><th>Time</th><th>Source</th><th>Message</th><th>User</th></tr></thead><tbody id="ev-body"></tbody></table></div>';
    },
    init: function (root) {
      root.querySelector('#ev-q').value = evQ;
      root.querySelector('#ev-q').oninput = function () { evQ = this.value.toLowerCase(); S.tick(); };
      root.querySelector('#ev-csv').onclick = function () {
        download('events.csv', 'Time,Source,Message,User\n' + S.events.map(function (e) { return [S.fmtTime(e.t, true), e.src, '"' + e.msg.replace(/"/g, '""') + '"', e.user].join(','); }).join('\n'));
      };
    },
    update: function (root) {
      root.querySelector('#ev-body').innerHTML = S.events.filter(function (e) { return !evQ || (e.src + e.msg).toLowerCase().indexOf(evQ) >= 0; }).slice(0, 400).map(function (e) {
        return '<tr><td>' + S.fmtTime(e.t, true) + '</td><td><span class="pill pri' + e.pri + '">' + e.src + '</span></td><td>' + ui.esc(e.msg) + '</td><td>' + e.user + '</td></tr>';
      }).join('');
    }
  };

  function download(name, text) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ================= I/O list ================= */
  var ioF = { area: '', type: '', q: '' };
  S.screens.iolist = {
    title: 'I/O List',
    render: function () {
      return '<h2 class="scr-t">I/O list <small>' + S.tagOrder.length + ' points - generated from the same tag database that drives every screen</small></h2>' +
        '<div class="filters"><select id="io-area"><option value="">All areas</option>' + Object.keys(S.areaNames).map(function (a) { return '<option value="' + a + '">' + S.areaNames[a] + '</option>'; }).join('') + '</select>' +
        '<select id="io-type"><option value="">All types</option><option value="AI">AI - analogue in</option><option value="DI">DI - digital in</option><option value="AO">AO - setpoint</option><option value="DO">DO - command</option></select>' +
        '<input id="io-q" placeholder="Search tag / description / device…" style="min-width:260px"> <button class="btn b-blue" id="io-csv">EXPORT CSV</button> <span class="note" id="io-n"></span></div>' +
        '<div class="tblwrap"><table class="tbl"><thead><tr><th>Tag</th><th>Description</th><th>Type</th><th>Unit</th><th>Source device</th><th>Protocol</th><th>Address / LN</th><th>Alarm / limits</th><th>Live value</th></tr></thead><tbody id="io-body"></tbody></table></div>';
    },
    init: function (root) {
      function draw() {
        var rows = S.tagOrder.filter(function (id) {
          var t = T[id];
          return (!ioF.area || t.area === ioF.area) && (!ioF.type || t.type === ioF.type) && (!ioF.q || (id + ' ' + t.desc + ' ' + t.dev + ' ' + t.proto).toLowerCase().indexOf(ioF.q) >= 0);
        });
        root.querySelector('#io-n').textContent = rows.length + ' of ' + S.tagOrder.length + ' points';
        root.querySelector('#io-body').innerHTML = rows.map(function (id) {
          var t = T[id], al = '';
          if (t.alarm) al = '<span class="pill pri' + t.alarm.pri + '">P' + t.alarm.pri + '</span> on ' + t.alarm.on;
          else if (t.lim) al = ['lolo', 'lo', 'hi', 'hihi'].filter(function (k) { return t.lim[k] !== undefined; }).map(function (k) { return k.toUpperCase() + ' ' + t.lim[k]; }).join(' · ');
          return '<tr><td><b>' + id + '</b></td><td>' + ui.esc(t.desc) + '</td><td>' + t.type + '</td><td>' + ui.esc(t.unit) + '</td><td>' + ui.esc(t.dev) + '</td><td>' + ui.esc(t.proto) + '</td><td>' + ui.esc(t.addr) + '</td><td>' + al + '</td><td class="num" data-tag="' + id + '"></td></tr>';
        }).join('');
        ui.update(root.querySelector('#io-body'));
      }
      root.querySelector('#io-area').value = ioF.area; root.querySelector('#io-type').value = ioF.type; root.querySelector('#io-q').value = ioF.q;
      root.querySelector('#io-area').onchange = function () { ioF.area = this.value; draw(); };
      root.querySelector('#io-type').onchange = function () { ioF.type = this.value; draw(); };
      root.querySelector('#io-q').oninput = function () { ioF.q = this.value.toLowerCase(); draw(); };
      root.querySelector('#io-csv').onclick = function () { download('VillaSomalia_IO_List.csv', S.ioListCsv()); };
      draw();
    }
  };

  /* ================= users & simulation ================= */
  var FAULTS = [
    ['AH4_OC', 'Trip AH4 (President) - 50/51 overcurrent'], ['AH6_EF', 'Trip AH6 (P.M.) - earth fault'], ['BESS_FAULT', 'BESS BMS fault (rack 3)'],
    ['DG1_FAILSTART', 'DG1 fail-to-start on next start'], ['INV3_FAULT', 'Inverter NB03 insulation fault'], ['STRING', 'String NB02-07 open circuit'],
    ['CLOUD', 'Toggle heavy cloud cover'], ['FIRE_PRE', 'ESS cabin fire pre-alarm'], ['FIRE_CONF', 'ESS cabin fire confirmed'], ['SF6_AH6', 'AH6 SF6 low pressure'],
    ['COMM_PM', 'Toggle fibre link loss to P.M. RMU'], ['CLEAR', 'Clear all injected faults']
  ];
  S.screens.system = {
    title: 'Users & Simulation',
    render: function () {
      return '<h2 class="scr-t">Users &amp; simulation</h2><div class="grid g3">' +
        ui.card('User log-in', '<p>Current user: <b id="cur-user"></b></p><div class="btnrow">' + Object.keys(S.users).map(function (k) { return '<button class="btn b-blue" data-user="' + k + '">' + S.users[k].label + '</button>'; }).join('') + '</div>' +
          '<table class="tbl" style="margin-top:8px"><tr><th>Level</th><th>Rights</th></tr><tr><td>VIEWER</td><td>View screens, trends, reports</td></tr><tr><td>OPERATOR</td><td>+ acknowledge alarms, breaker / DG / BESS / inverter commands</td></tr>' +
          '<tr><td>ENGINEER</td><td>+ setpoints, PPC parameters, black-start, simulation</td></tr><tr><td>ADMIN</td><td>+ user management, configuration</td></tr></table>' +
          '<p class="note">Demonstration log-in only. Production: individual accounts authenticated against the plant AD/LDAP with MFA for remote sessions.</p>') +
        ui.card('Simulation (FAT / training)', '<p class="note">The HMI runs against a plant simulator so every screen, alarm and sequence can be demonstrated before the field drivers are connected.</p>' +
          '<div class="filters">Speed <select id="sim-speed"><option value="1">×1 real time</option><option value="10">×10</option><option value="60">×60</option><option value="300">×300</option></select>' +
          '<button class="btn b-gray" id="sim-pause">PAUSE</button></div>' +
          '<h4>Fault injection (engineer)</h4><div class="btnrow">' + FAULTS.map(function (f) { return '<button class="btn b-small b-amber" style="color:#fff" data-fault="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div><p id="sim-msg" class="note"></p>') +
        ui.card('About', '<p><b>' + C.site.name + '</b></p><p>Client: ' + C.site.client + '<br>Contractor: ' + C.site.contractor + '<br>Drawings: ' + C.site.drawing + '</p>' +
          '<p class="note">HMI V1.0 for design approval. Tag database: ' + S.tagOrder.length + ' points. Data source: simulator (replace with IEC 61850 / Modbus driver layer).</p>') + '</div>';
    },
    init: function (root) {
      root.querySelectorAll('[data-user]').forEach(function (b) { b.onclick = function () { S.user = S.users[b.getAttribute('data-user')]; S.event('SEC', 'User log-in: ' + S.user.label, 4); S.tick(); }; });
      var sp = root.querySelector('#sim-speed'); sp.value = S.sim.speed; sp.onchange = function () { S.sim.speed = Number(this.value); };
      var pb = root.querySelector('#sim-pause'); pb.textContent = S.sim.running ? 'PAUSE' : 'RESUME';
      pb.onclick = function () { S.sim.running = !S.sim.running; this.textContent = S.sim.running ? 'PAUSE' : 'RESUME'; };
      root.querySelectorAll('[data-fault]').forEach(function (b) {
        b.onclick = function () {
          var m = root.querySelector('#sim-msg');
          if (S.user.level < 3) { m.textContent = '✖ ENGINEER level required'; return; }
          S.injectFault(b.getAttribute('data-fault')); m.textContent = '✔ ' + b.textContent; S.tick();
        };
      });
    },
    update: function (root) { var u = root.querySelector('#cur-user'); if (u) u.textContent = S.user.label; }
  };
})(SCADA);
