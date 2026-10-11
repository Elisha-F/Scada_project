/* Communication architecture, network health and cybersecurity provisions */
(function (S) {
  var ui = S.ui, T = S.tags;

  function dev(x, y, w, label, sub, net) {
    return '<g class="netdev" data-net="' + (net || '') + '" transform="translate(' + x + ',' + y + ')"><rect width="' + w + '" height="38"/>' +
      '<text x="' + (w / 2) + '" y="16" text-anchor="middle" font-weight="700">' + ui.esc(label) + '</text>' +
      (sub ? '<text x="' + (w / 2) + '" y="30" text-anchor="middle" class="lbl-xs">' + ui.esc(sub) + '</text>' : '') + '</g>';
  }
  function link(pts, cls, net) { return '<polyline class="link ' + (cls || '') + '" data-netl="' + (net || '') + '" points="' + pts + '"/>'; }
  function proto(x, y, t, a) { return '<text class="proto" x="' + x + '" y="' + y + '" text-anchor="' + (a || 'middle') + '">' + ui.esc(t) + '</text>'; }
  function zone(x, y, w, h, lbl) { return '<rect class="zonebg" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6"/><text class="zonelbl" x="' + (x + 8) + '" y="' + (y + 15) + '">' + ui.esc(lbl) + '</text>'; }

  function arch() {
    var s = '<svg class="sld" viewBox="0 0 1300 800">';
    s += zone(10, 10, 1280, 95, 'LEVEL 3.5 · DMZ / REMOTE ACCESS (IEC 62443 zone Z1)');
    s += zone(10, 115, 1280, 205, 'LEVEL 2 · CONTROL ROOM - SCADA / HMI (zone Z2, redundant RSTP/PRP core)');
    s += zone(10, 330, 1280, 250, 'LEVEL 1 · STATION CONTROLLERS & IEDs (zones Z3 electrical, Z4 generation, Z5 safety)');
    s += zone(10, 590, 1280, 200, 'LEVEL 0 · FIELD DEVICES & REMOTE LOAD CENTRES');

    /* DMZ */
    s += dev(40, 45, 170, 'Remote O&M / Client', 'VPN (IPsec, MFA)', '') + dev(300, 45, 190, 'Firewall / VPN gateway', 'NGFW, IDS, DPI Modbus/61850', 'NET.N09.OK');
    s += dev(580, 45, 190, 'Historian replica / Portal', 'one-way, read-only', '') + dev(860, 45, 190, 'meteocontrol VCOM', 'via 4G router, outbound only', '');
    s += link('210,64 300,64') + proto(255, 58, 'IPsec VPN') + link('490,64 580,64') + proto(535, 58, 'HTTPS / OPC UA') + link('395,83 395,140');

    /* Control room */
    s += dev(310, 140, 170, 'Core switch A', 'managed L3, RSTP', 'NET.N10.OK') + dev(820, 140, 170, 'Core switch B', 'managed L3, RSTP', 'NET.N11.OK');
    s += link('480,159 820,159') + proto(650, 153, 'redundant 1 GbE ring');
    s += dev(40, 210, 160, 'SCADA server A', 'RTU / front-end (main)', 'NET.N01.OK') + dev(220, 210, 160, 'SCADA server B', 'hot standby', 'NET.N02.OK');
    s += dev(400, 210, 130, 'Historian', 'SQL / time-series', 'NET.N03.OK') + dev(550, 210, 130, 'HMI WS 1', 'operator', 'NET.N04.OK') + dev(700, 210, 130, 'HMI WS 2', 'operator', 'NET.N05.OK');
    s += dev(850, 210, 140, 'Engineering WS', 'relay & PLC tools', 'NET.N06.OK') + dev(1010, 210, 130, 'GPS time server', 'NTP / PTP IEEE 1588', 'NET.N12.OK');
    s += dev(1160, 210, 110, 'SCADA UPS 3kVA', 'SNMP v3', '');
    s += dev(1010, 270, 260, 'Printers / CCTV (separate VLAN)', '', '');
    [120, 300, 465, 615, 765, 920, 1075, 1215].forEach(function (x, i) { s += link(x + ',210 ' + x + ',195 ' + (i < 4 ? '395,195 395,178' : '905,195 905,178')); });

    /* Level 1 */
    s += dev(40, 360, 200, 'Power Plant Controller', 'PPC - redundant CPU', 'NET.N07.OK');
    s += dev(260, 360, 230, 'Protection relays AH1-AH8', 'IEC 61850 MMS + GOOSE', '');
    s += dev(510, 360, 180, 'blue\'Log XM 5000', '+ Multi I/O + Fieldbus Ext', 'NET.N08.OK');
    s += dev(710, 360, 160, 'Inverter PLC box', 'Sungrow logger', 'NET.N13.OK');
    s += dev(890, 360, 170, 'BESS EMS / PCS', 'Modbus TCP · IEC 104 opt.', 'NET.N14.OK');
    s += dev(1080, 360, 190, 'DG controllers DG1 / DG2', 'Modbus TCP', 'NET.N15.OK');
    s += dev(40, 450, 200, 'Aux PLC / DC charger', 'Modbus TCP', '') + dev(260, 450, 230, 'Station bus switch (GIS room)', 'IEC 61850 · PRP/HSR', '');
    s += dev(510, 450, 180, 'Meter gateway', 'Modbus RTU → TCP', '') + dev(710, 450, 160, 'Fire alarm panel', 'Modbus TCP + hard-wired', '') + dev(890, 450, 170, 'Field switch BESS', 'fibre uplink', '');
    s += dev(1080, 450, 190, 'Field switch DG / NECR', 'fibre uplink', '');
    s += link('140,360 140,330 395,330 395,178') + link('375,360 375,330') + link('600,360 600,330 650,330 650,178', '') + link('790,360 790,330 905,330 905,178');
    s += link('975,360 975,330 905,330') + link('1175,360 1175,330 905,330');
    s += link('375,450 375,398') + proto(380, 432, 'GOOSE / MMS', 'start') + link('140,450 140,398') + link('600,450 600,398') + link('790,450 790,398') + link('975,450 975,398', 'fo') + link('1175,450 1175,398', 'fo');
    s += proto(660, 352, 'Modbus TCP', 'start') + proto(915, 352, 'Modbus TCP', 'start') + proto(1185, 352, 'Modbus TCP', 'start') + proto(150, 356, 'IEC 61850 client / Modbus TCP', 'start');
    s += proto(250, 520, 'All Level 1 ↔ Level 2 traffic via core switches · VLAN per zone · ACLs', 'start');

    /* Level 0 */
    ['NB01', 'NB02', 'NB03', 'NB04'].forEach(function (n, i) { s += dev(560 + i * 85, 625, 75, n, 'SG350HX', ''); });
    s += link('790,488 790,605 597,605 597,625', 'serial') + link('682,605 682,625', 'serial') + link('767,605 767,625', 'serial') + link('852,605 852,625', 'serial');
    s += proto(720, 600, 'RS485 Modbus RTU daisy-chain (as per Communication Schematic)');
    s += dev(560, 700, 340, 'Weather station: SMP12-A · WindSonic · Tamb · Tmod', 'Fieldbus Ext ports 1-4', '') + link('600,488 600,560 520,560 520,719 560,719', 'serial');
    s += dev(930, 625, 130, 'BMS racks 1-8', 'CAN / Modbus', '') + link('975,488 975,625', 'serial');
    s += dev(1080, 625, 190, 'Gensets ECU, ACB trip units', 'J1939 / Modbus', '') + link('1175,488 1175,625', 'serial');
    s += dev(40, 625, 220, 'President office RMU', 'ST260E + switch + UPS', 'NET.N16.OK') + dev(40, 715, 220, 'P.M. office RMU', 'ST260E + switch + UPS', 'NET.N17.OK');
    s += link('260,644 300,644 300,488', 'fo', 'NET.N16.OK') + link('260,734 320,734 320,488', 'fo', 'NET.N17.OK');
    s += proto(330, 680, 'single-mode fibre (laid with 11kV cables), ring', 'start');
    s += dev(280, 750, 240, 'LV power meters (LVDB, POC)', 'Modbus RTU', '') + link('520,769 545,769 545,488', 'serial');
    s += '<g transform="translate(1000,720)"><line x1="0" y1="0" x2="30" y2="0" class="link"/><text x="36" y="4" class="lbl-xs">Ethernet copper</text>' +
      '<line x1="0" y1="18" x2="30" y2="18" class="link fo"/><text x="36" y="22" class="lbl-xs">Fibre optic</text><line x1="140" y1="0" x2="170" y2="0" class="link serial"/><text x="176" y="4" class="lbl-xs">Serial / fieldbus</text>' +
      '<rect x="140" y="12" width="14" height="10" fill="#fde3e1" stroke="#d22f27"/><text x="160" y="22" class="lbl-xs">Device offline</text></g>';
    return s + '</svg>';
  }

  S.screens.network = {
    title: 'Network & Cybersecurity',
    render: function () {
      var protos = [
        ['11kV protection relays AH1-AH8', 'IEC 61850 MMS (reports), GOOSE (interlocks / intertrip)', 'Fibre station bus, PRP', 'Event driven + 1 s integrity'],
        ['Remote RMU relays ST260E', 'Modbus TCP (IEC 61850 if supported)', 'Single-mode fibre ring', '1 s'],
        ['PV inverters SG350HX', 'Modbus RTU RS485 → PLC box / blue\'Log', 'Shielded twisted pair', '5 s'],
        ['Weather station', 'blue\'Log Fieldbus Ext / Modbus TCP', 'RS485 / 4-20 mA / PT1000', '1 s, 1 min averages'],
        ['BESS EMS, PCS, BMS', 'Modbus TCP (IEC 60870-5-104 optional)', 'Fibre to ESS cabin', '200 ms (control), 1 s'],
        ['DG controllers', 'Modbus TCP', 'Fibre / Cat6', '500 ms'],
        ['Power meters / ACB trip units', 'Modbus RTU via gateway', 'RS485', '1 s'],
        ['Fire alarm panel', 'Modbus TCP + hard-wired cause & effect', 'Cat6 + Cu control cable', '1 s'],
        ['UPS / network devices', 'SNMP v3', 'Cat6', '10 s'],
        ['Time synchronisation', 'NTP (servers), SNTP / PTP IEEE 1588 (IEDs)', 'GPS antenna', '±1 ms IEDs'],
        ['Upstream / remote', 'OPC UA (encrypted), HTTPS, IPsec VPN', 'Firewall DMZ, 4G/VSAT', '-']
      ];
      var sec = [
        'Architecture zoned per IEC 62443-3-2 (zones Z1-Z5 and conduits); firewall between every zone boundary; default-deny rule sets.',
        'No direct Internet access to Level 1/2; remote access only via VPN to a DMZ jump host with multi-factor authentication and session recording.',
        'Role-based access control (Viewer / Operator / Engineer / Admin) with individual accounts, central AD/LDAP, password policy and auto log-off.',
        'All operator actions, log-ins and setpoint changes recorded in a tamper-evident audit trail (see Event Log) and forwarded to syslog/SIEM.',
        'Select-before-operate and interlocks enforced for all switching commands; earthing switches local-only.',
        'Device hardening: unused switch ports disabled, MAC/port security, SNMP v3 only, default credentials removed, Telnet/HTTP disabled.',
        'Application whitelisting and anti-malware on servers & workstations; USB ports locked; signed firmware for IEDs.',
        'Patch & vulnerability management with vendor-qualified updates; quarterly review.',
        'Backups of SCADA, PPC, relay and switch configurations - daily incremental, weekly full, off-line copy.',
        'Industrial IDS / deep-packet inspection for Modbus and IEC 61850 on the core switches mirror port.',
        'Physical security: lockable cabinets, control-room access control, CCTV on a separate VLAN.',
        'Cybersecurity FAT/SAT tests and penetration test before handover; IEC 62351 security for IEC 61850/104 where supported.'
      ];
      var health = S.tagOrder.filter(function (id) { return id.indexOf('NET.N') === 0; }).map(function (id) { return ui.lamp(id, T[id].range, { kind: 'healthy' }); }).join('');
      return '<h2 class="scr-t">Communication architecture &amp; cybersecurity <small>proposed - extends the Communication Schematic (inverters + weather station) to the entire plant</small></h2>' +
        ui.card('Network topology', arch()) + '<div style="height:12px"></div>' +
        '<div class="grid g-side"><div>' + ui.card('Protocols & interfaces', '<table class="tbl"><tr><th>Equipment</th><th>Protocol</th><th>Medium</th><th>Scan / update</th></tr>' +
          protos.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + ui.esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>') +
        '<div style="height:12px"></div>' + ui.card('Cybersecurity provisions (IEC 62443 / IEC 62351)', '<ol class="steps">' + sec.map(function (l) { return '<li>' + ui.esc(l) + '</li>'; }).join('') + '</ol>') + '</div>' +
        '<aside>' + ui.card('Network health', health + '<h4>Security</h4>' + ui.lamp('NET.SEC.LOGIN_FAIL') + ui.lamp('NET.SEC.TIME_SYNC', 'Time sync locked') + ui.kv('Firewall denies (1 h)', 'NET.SEC.FW_DENY'), 'dark') + '</aside></div>';
    },
    update: function (root) {
      root.querySelectorAll('[data-net]').forEach(function (g) {
        var id = g.getAttribute('data-net'); if (!id) return;
        g.classList.toggle('ok', !!T[id].v); g.classList.toggle('nok', !T[id].v);
      });
      root.querySelectorAll('[data-netl]').forEach(function (l) { var id = l.getAttribute('data-netl'); if (id) l.classList.toggle('nok', !T[id].v); });
    }
  };
})(SCADA);
