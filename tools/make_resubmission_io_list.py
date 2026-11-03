"""Device and I/O List Rev 1 (first revision): SICAM A8000 confirmed as the selected architecture (RFA-001/BRA/26 Issue H).

Input is the original submission (docs/superseded; headed "Rev 1" inside). Signals, tags, modules, communication
points and the 24 V supplies are unchanged. The Device List adds the server rack and the SW-MV enclosure, so it
matches the bill of material (Attachment D). Change markers left over from before the original submission are removed.

Usage: python3 tools/make_resubmission_io_list.py <original.xlsx> <rev1.xlsx>
"""
import re
import sys
from copy import copy

import openpyxl

SRC, OUT = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(SRC)
rm, dl, ps = wb['Read Me'], wb['Device List'], wb['Protocol Summary']


def row_of(ws, col, value):
    for r in range(1, ws.max_row + 1):
        if ws.cell(r, col).value == value:
            return r
    raise KeyError(value)


# ---------------------------------------------------------------- markers from before the original submission
for ws in wb.worksheets:
    if ws.title == 'Read Me':
        continue
    for row in ws.iter_rows():
        for c in row:
            if isinstance(c.value, str) and re.search(r'rev 1', c.value):
                v = re.sub(r'Added rev 1\.?\s*', '', c.value)
                v = re.sub(r'\s*\(rev 1\)', '', v).strip()
                c.value = v or None

# ---------------------------------------------------------------- Read Me
r = row_of(rm, 1, 'Status')
rm.cell(r, 2).value = ('Rev 1 (first revision), 3 Nov 2026: Siemens SICAM A8000 confirmed as the selected architecture, in reply to '
                       'RFA-001/BRA/26 Issue H. Supersedes the original submission (Rev 0, October 2026). The alternative on Schneider '
                       'Electric is withdrawn. For client submission as Attachment B.')
old_head = row_of(rm, 1, 'Revision 1 changes')
rm.cell(old_head, 1).value = 'Changes made before the original submission'
last = rm.max_row
rm.cell(last + 2, 1, 'Revision 1 changes')._style = copy(rm.cell(old_head, 1)._style)
notes = [
    'Siemens SICAM A8000 confirmed as the selected architecture. The alternative on Schneider Electric is withdrawn and must not be used.',
    'No change to signals, tags, I/O modules or communication points: 244 hardwired signals on 24 modules, 463 communication points.',
    'D51 added: 19-inch server rack with console in the control room. D52 added: network enclosure for SW-MV at the inverter MV station.',
    'Every device in this list appears in the bill of material (Attachment D) with the same model and quantity; the bill adds spares, '
    'cables and accessories.',
]
for i, n in enumerate(notes, 1):
    rm.cell(last + 2 + i, 1, str(i))._style = copy(rm.cell(old_head + 1, 1)._style)
    rm.cell(last + 2 + i, 2, n)._style = copy(rm.cell(old_head + 1, 2)._style)

# ---------------------------------------------------------------- Device List
tmpl_head, tmpl_row = row_of(dl, 1, 'E. Software'), row_of(dl, 1, 'D40')
n0 = dl.max_row + 1
new = [
    ['F. Added in Rev 1 (coordination with the bill of material)'],
    ['D51', 'SCADA', '19-inch server rack 24U with rack console (monitor, keyboard, KVM)', 'To suit', '-', '-', 'TBC', 1, 'Control room', '-', '-',
     'N/A', '-', 'Houses SRV-A, SRV-B and the UPS.'],
    ['D52', 'SCADA', 'Network enclosure for field switch SW-MV, IP55', 'Rittal', 'AX', 'Size to suit', 'TBC', 1, 'Inverter MV station', '-', '-', 'N/A', '-',
     'Omit if SW-MV fits in the PLC box cabinet.'],
]
for i, vals in enumerate(new):
    rr = n0 + i
    src = tmpl_head if i == 0 else tmpl_row
    for c in range(1, dl.max_column + 1):
        dl.cell(rr, c)._style = copy(dl.cell(src, c)._style)
        dl.cell(rr, c).value = vals[c - 1] if c - 1 < len(vals) else None
last_dl = n0 + len(new) - 1
dl.auto_filter.ref = 'A1:N%d' % last_dl
for row in ps.iter_rows():
    for c in row:
        if isinstance(c.value, str) and "'Device List'!" in c.value:
            c.value = c.value.replace('$56', '$%d' % last_dl)

wb.save(OUT)
print('wrote', OUT, '· Device List to row', last_dl)
