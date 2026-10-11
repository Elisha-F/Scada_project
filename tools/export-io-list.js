#!/usr/bin/env node
/* Export the HMI tag database as the plant I/O list (CSV).
 * Usage: node tools/export-io-list.js [out.csv]   (default docs/IO_List.csv) */
const path = require('path'), fs = require('fs');
const root = path.join(__dirname, '..', 'hmi', 'js');
require(path.join(root, 'config.js'));
require(path.join(root, 'tags.js'));
const S = globalThis.SCADA;
const out = process.argv[2] || path.join(__dirname, '..', 'docs', 'IO_List.csv');
fs.writeFileSync(out, '﻿' + S.ioListCsv() + '\n');
const c = {};
S.tagOrder.forEach(id => { const t = S.tags[id]; c[t.type] = (c[t.type] || 0) + 1; });
console.log(`Wrote ${S.tagOrder.length} points to ${out}`, c);
