/*
 * HMI tag database = the submitted Device and I/O List (iolist.js, generated from
 * the workbook by tools/import_io_list.py). Screens, alarms, trends and the I/O list
 * screen use only these tags and their names.
 *
 * Types: DI / DO / AI hardwired or communicated, AO setpoint, ST multi-state value.
 * Alarm levels 1 critical, 2 major, 3 minor (design report section 10).
 */
(function (S) {
  var tags = {}, order = [];
  var DEC = { 'kW': 0, 'kvar': 0, 'kVA': 0, 'V': 0, 'kV': 2, 'A': 0, 'Hz': 2, '%': 1, '°C': 1, 'MWh': 2, 'kWh': 0, 'kvarh': 0,
    'kΩ': 0, 'h': 0, 'kPa': 0, 'm/s': 1, 'W/m²': 0, '°': 0, 'min': 0 };

  /* text for multi-state values, by the end of the tag */
  S.enums = {
    'STATE@NB': ['Stopped', 'Standby', 'Running', 'Derating', 'Fault'],
    'FLT-CODE': null, 'ALM-CODE': null,
    'EMS-MODE': ['Manual', 'Automatic'],
    'EMS-STATE': ['Shutdown', 'Black start', 'Day, PV surplus', 'Day, PV shortfall', 'Night', 'Low battery, generator charging', 'Generator only', 'Emergency stop', 'Manual'],
    'PCS-STATE': ['Stopped', 'Grid forming', 'Grid following', 'Fault'],
    'BMS-STATE': ['Normal', 'Warning', 'Fault'],
    'COOL-STATE': ['Off', 'Running', 'Fault'],
    'MODE@DG': ['Manual', 'Automatic'],
    'CB-POS': ['Intermediate', 'Open', 'Closed', 'Faulty']
  };
  S.enumText = function (t) {
    var id = t.id, e;
    if (/^NB\d\d-STATE$/.test(id)) e = S.enums['STATE@NB'];
    else if (/^DG\d-MODE$/.test(id)) e = S.enums['MODE@DG'];
    else if (/CB-POS$/.test(id)) e = S.enums['CB-POS'];
    else e = S.enums[id] || S.enums[id.replace(/^[A-Z0-9]+-/, '')];
    if (!e) return t.v ? 'Code ' + t.v : 'None';
    return e[t.v] !== undefined ? e[t.v] : String(t.v);
  };

  S.iolist.forEach(function (r) {
    var t = {
      id: r.id, desc: r.desc, equip: r.equip, loc: r.loc || '', type: r.type, src: r.src, addr: r.addr, row: r.row || null,
      unit: r.unit || '', opby: r.opby || '-', note: r.note || '', normal: r.normal || '',
      alarm: r.alarm || null, lim: r.lim || null,
      dec: r.unit && DEC[r.unit] !== undefined ? DEC[r.unit] : (r.type === 'AI' ? 2 : 0),
      v: 0, q: 'GOOD'
    };
    if (/PF$/.test(r.id)) t.dec = 2;
    if (/^(AH\d|PRS-RLY|PMS-RLY)-I-/.test(r.id)) t.dec = 1;
    if (r.unit === 'V' && /U-CELL/.test(r.id)) t.dec = 3;
    if (/(STARTS|RACKS-ON|HEARTBEAT)$/.test(r.id)) t.dec = 0;
    tags[r.id] = t;
    order.push(r.id);
  });

  S.tags = tags;
  S.tagOrder = order;
  S.val = function (id) { var t = tags[id]; return t ? t.v : undefined; };

  /* equipment groups for the I/O list and alarm filters */
  S.groupOf = function (t) {
    var id = t.id;
    if (/^AH\d/.test(id)) return '11 kV switchboard';
    if (/^(PRS|PMS)/.test(id)) return 'Office stations';
    if (/^(NB\d|PV-|PLCBOX)/.test(id)) return 'PV';
    if (/^(BESS|FIRE|ESTOP-BESS|DOOR-BESS)/.test(id)) return 'Battery and fire';
    if (/^(DG\d|GEN-)/.test(id)) return 'Generators';
    if (/^EMS/.test(id)) return 'Energy management';
    if (/^T-/.test(id)) return 'Transformers';
    if (/^WS-/.test(id)) return 'Weather station';
    if (/^(SW-|FW-|GPS-|CP-|SYS-)/.test(id)) return 'Controller and network';
    return 'Auxiliaries';
  };
  S.groups = ['11 kV switchboard', 'Office stations', 'Transformers', 'PV', 'Battery and fire', 'Generators', 'Energy management', 'Auxiliaries', 'Weather station', 'Controller and network'];

  S.ioListCsv = function () {
    var head = ['Tag', 'Description', 'Equipment', 'Type', 'Hardwired / communication', 'I/O channel or source', 'Unit', 'Alarm level', 'Alarm when', 'Operated by', 'Notes'];
    var rows = [head].concat(order.map(function (id) {
      var t = tags[id];
      return [t.id, t.desc, t.equip, t.type, t.src === 'HW' ? 'Hardwired' : 'Communication', t.addr, t.unit,
        t.alarm ? t.alarm.level : (t.lim ? t.lim.level : ''), t.alarm ? (t.alarm.on ? 'On' : 'Off') : (t.lim ? 'Outside limits' : ''), t.opby, t.note];
    }));
    return rows.map(function (r) {
      return r.map(function (c) { c = String(c === null || c === undefined ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',');
    }).join('\n');
  };
})(SCADA);
