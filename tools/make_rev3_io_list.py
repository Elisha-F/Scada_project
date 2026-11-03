"""Device and I/O List Rev 3: SICAM A8000 confirmed as the selected architecture (RFA-001/BRA/26 Issue H).

Input is Rev 1 (docs/superseded). Signals, tags, modules and communication points are unchanged; the Device List
is aligned with the bill of material (24 V supplies, server rack, SW-MV enclosure).

Usage: python3 tools/make_rev3_io_list.py <rev1.xlsx> <rev3.xlsx>
"""
import sys
from copy import copy

import openpyxl

SRC, OUT = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(SRC)
rm, dl, ps, dsh = wb['Read Me'], wb['Device List'], wb['Protocol Summary'], wb['Datasheets']


def row_of(ws, col, value):
    for r in range(1, ws.max_row + 1):
        if ws.cell(r, col).value == value:
            return r
    raise KeyError(value)


# ---------------------------------------------------------------- Read Me
r = row_of(rm, 1, 'Status')
rm.cell(r, 2).value = ('Rev 3, 3 Nov 2026: Siemens SICAM A8000 confirmed as the selected architecture, in reply to RFA-001/BRA/26 Issue H. '
                       'Supersedes Rev 1. Rev 2 (Schneider Electric Modicon M580) is withdrawn. For client submission as Attachment B.')
last = rm.max_row
head = rm.cell(row_of(rm, 1, 'Revision 1 changes'), 1)
rm.cell(last + 2, 1, 'Revision 3 changes')._style = copy(head._style)
notes = [
    'Siemens SICAM A8000 confirmed as the selected architecture. Rev 2 on Schneider Electric is withdrawn and must not be used.',
    'No change to signals, tags, I/O modules or communication points: 244 hardwired signals on 24 modules, 463 communication points.',
    'D40: one 24 V/20 A SITOP in the SCADA cabinet. D51 added: five 24 V/5 A SITOP for the field and station switch panels (the 20 A unit was oversized there).',
    'D52 added: 19-inch server rack with console in the control room. D53 added: network enclosure for SW-MV at the inverter MV station.',
    'Every device in this list appears in the bill of material Rev B (Attachment F) with the same model and quantity; the bill adds spares, cables and accessories.',
]
body = rm.cell(row_of(rm, 1, 'Revision 1 changes') + 1, 2)
for i, n in enumerate(notes, 1):
    rm.cell(last + 2 + i, 1, str(i))._style = copy(rm.cell(row_of(rm, 1, 'Revision 1 changes') + 1, 1)._style)
    rm.cell(last + 2 + i, 2, n)._style = copy(body._style)

# ---------------------------------------------------------------- Device List
r40 = row_of(dl, 1, 'D40')
dl.cell(r40, 8).value = 1
dl.cell(r40, 9).value = '11 kV switchroom, SCADA cabinet'
dl.cell(r40, 14).value = ('Switches, firewall and gateway in the SCADA cabinet. Input 85-275 V AC or 88-350 V DC, so it can run from the 110 V DC '
                          'station battery. Field panels use D51 (Rev 3).')
tmpl_head = row_of(dl, 1, 'E. Software')
tmpl_row = r40
n0 = dl.max_row + 1
new = [
    ['F. Added in Rev 3 (coordination with the bill of material)'],
    ['D51', 'SCADA', '24 V DC power supply, 5 A, 1-phase', 'Siemens', 'SITOP PSU8200 24 V/5 A', '6EP1333-3BA10', 'From memory - confirm', 5,
     'Office stations, BESS yard, generator area, inverter MV station', '-', '-', 'N/A', '-',
     'Field and station switch, gateway and panel supply. Added rev 3.'],
    ['D52', 'SCADA', '19-inch server rack 24U with rack console (monitor, keyboard, KVM)', 'To suit', '-', '-', 'TBC', 1, 'Control room', '-', '-',
     'N/A', '-', 'Houses SRV-A, SRV-B and the UPS. Added rev 3.'],
    ['D53', 'SCADA', 'Network enclosure for field switch SW-MV, IP55', 'Rittal', 'AX', 'Size to suit', 'TBC', 1, 'Inverter MV station', '-', '-', 'N/A', '-',
     'Omit if SW-MV fits in the PLC box cabinet. Added rev 3.'],
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

# ---------------------------------------------------------------- Datasheets
r22 = row_of(dsh, 5, 'SITOP PSU8200 24 V/20 A')
dsh.cell(r22, 5).value = 'SITOP PSU8200 24 V/20 A and 24 V/5 A'
dsh.cell(r22, 6).value = '6EP1336-3BA10, 6EP1333-3BA10'

wb.save(OUT)
print('wrote', OUT, '· Device List to row', last_dl)
