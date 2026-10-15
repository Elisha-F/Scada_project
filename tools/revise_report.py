"""Rev 1 of the Villa Somalia SCADA Design Report: harmonised with I/O list rev 1.

Usage: python3 tools/revise_report.py <rev0.docx> <out.docx>
Each edit names the exact old text, so a changed source fails loudly instead of
editing the wrong place.
"""
import sys
from copy import deepcopy
import docx

SRC, OUT = sys.argv[1], sys.argv[2]
d = docx.Document(SRC)
T = d.tables


def set_par(p, old, new):
    """Replace old with new inside one paragraph, keeping the run formatting around it."""
    text = ''.join(r.text for r in p.runs)
    assert old in text, (old, text)
    start = text.index(old)
    pos = 0
    first = None
    for r in p.runs:
        a, b = pos, pos + len(r.text)
        pos = b
        if b <= start or a >= start + len(old):
            continue
        if first is None:
            first = r
            r.text = r.text[:start - a] + new + (r.text[start + len(old) - a:] if b >= start + len(old) else '')
        else:
            r.text = r.text[start + len(old) - a:] if b > start + len(old) else ''


def cell(t, r, c, old, new):
    ps = [p for p in T[t].rows[r].cells[c].paragraphs if old in p.text]
    assert ps, ('T%d R%d C%d' % (t, r, c), old, T[t].rows[r].cells[c].text)
    set_par(ps[0], old, new)


def par(old, new):
    ps = [p for p in d.paragraphs if old in p.text]
    assert len(ps) == 1, (old, len(ps))
    set_par(ps[0], old, new)
    return ps[0]


def insert_par_after(p, text):
    el = deepcopy(p._p)
    p._p.addnext(el)
    np = docx.text.paragraph.Paragraph(el, p._parent)
    for r in np.runs[1:]:
        r._r.getparent().remove(r._r)
    np.runs[0].text = text
    return np


def add_row(t, values):
    tr = deepcopy(T[t].rows[-1]._tr)
    T[t]._tbl.append(tr)
    row = T[t].rows[-1]
    for c, v in zip(row.cells, values):
        p = c.paragraphs[0]
        for r in p.runs[1:]:
            r._r.getparent().remove(r._r)
        p.runs[0].text = v


XLSX_OLD, XLSX_NEW = 'Villa_Somalia_SCADA_Device_and_IO_List.xlsx', 'Villa_Somalia_SCADA_Device_and_IO_List_Rev1.xlsx'

# 1 Reference documents and attachments
cell(0, 3, 0, XLSX_OLD, XLSX_NEW)
cell(28, 2, 1, XLSX_OLD, XLSX_NEW)
cell(28, 2, 2, 'Draft complete', 'Rev 1, complete')

# 2 Compliance table, client comment 3 (combiner panels now covered)
cell(1, 3, 2, '224 hardwired signals and about 440 communication points, listed signal by signal',
     '244 hardwired signals and 456 communication points, listed signal by signal, including the PV inverter AC breakers and the battery combiner panels')

# 3 Design basis: generator ratings from the SLD
cell(2, 6, 1, 'Ratings per generator supplier', 'DG1 550 kVA, DG2 660 kVA; step-up transformer 1.5 MVA, 11/0.4 kV')

# 5 Scope of monitoring and control
cell(7, 1, 2, 'None', 'Main LV breaker and the four inverter AC breakers to row 5')
cell(7, 3, 2, 'Fire, E-stop and door to row 5', 'Fire, E-stop, door and main LV breaker to row 5')
cell(7, 3, 3, 'charge and discharge limits, alarms', 'charge and discharge limits, combiner panel status, alarms')
cell(7, 4, 2, 'fuel level to row 6', 'fuel level and step-up transformer LV breaker to row 6')
cell(7, 5, 2, 'relay healthy to row 1', 'relay healthy to row 1, including the AH8 breaker')
cell(7, 6, 2, 'local/remote to rows 3 and 4', 'local/remote and RMU UPS to rows 3 and 4')
cell(7, 8, 2, 'Temperature, pressure and oil level contacts to the nearest row',
     'Temperature, pressure and oil level contacts, and the auxiliary transformer fuse, to the nearest row')

# 6 PV and BESS interface
cell(8, 3, 2, 'Battery fire panel, emergency stop and container door to I/O row 5',
     'Battery fire panel, emergency stop, container door and the PV and battery LV breakers to I/O row 5')
cell(8, 3, 5, 'Fire panel states, emergency stop, door open', 'Fire panel states, emergency stop, door open, LV breaker positions and trips')
cell(10, 3, 1, 'About 23', 'About 27')
cell(10, 3, 3, 'alarm levels', 'alarm levels, combiner panel status')
cell(10, 4, 1, '10', '18')
cell(10, 4, 3, 'Fire panel states, emergency stop, container door', 'Fire panel states, emergency stop, container door, LV breakers, inverter AC breakers')

# 7 I/O summary
par('The plant has 224 hardwired signals on 24 I/O modules in six rows, with 33% spare channels. A further 440 or so signals arrive over communication links. The full signal-by-signal list is in Attachment B.',
    'The plant has 244 hardwired signals on 24 I/O modules in six rows, with 27% spare channels. Row 5, in the BESS and inverter yard, is the fullest at 19% spare; a third input module can be added there if more yard signals appear. A further 456 signals arrive over communication links. The full signal-by-signal list is in Attachment B: sheet IO List for hardwired signals and sheet Comms Point List for communication points.')
for r, old, new in ((1, '82', '87'), (2, '24', '25'), (3, '41', '43'), (4, '41', '43'), (5, '18', '26'), (6, '18', '20'), (7, '224', '244')):
    cell(12, r, 6, old, new)
cell(12, 3, 4, 'RMU, 630 kVA transformer, LVDB', 'RMU, 630 kVA transformer, LVDB, RMU UPS')
cell(12, 4, 4, 'RMU, 630 kVA transformer, LVDB', 'RMU, 630 kVA transformer, LVDB, RMU UPS')
cell(12, 5, 4, 'Inverter transformer, fire panel, BESS E-stop and door', 'Inverter transformer, PV and BESS LV breakers, inverter AC breakers, fire panel, BESS E-stop and door')
cell(12, 6, 4, 'Generator status and fuel level, DG step-up transformer', 'Generator status and fuel level, DG step-up transformer and its LV breaker')
cell(13, 1, 4, '188', '208')
cell(13, 1, 5, '84', '64')
cell(13, 5, 4, '224', '244')
cell(13, 5, 5, '112', '92')
cell(14, 1, 1, '188', '208')
cell(14, 4, 1, 'About 440', '456')

# 10 Breaker switching rules: earthing interlock
par('such as closing a breaker onto an earthed circuit.', 'such as closing a breaker onto an earthed circuit, or energising the busbar through AH1 or AH3 while AH8 is open.')

# 11 Black start: earth the 11 kV system through AH8 first
p = par('After a total shutdown, all 11 kV breakers are open.',
        'After a total shutdown, all 11 kV breakers are open except AH8, which stays closed unless it has tripped.')
insert_par_after(p, 'AH8 is confirmed closed, or closed first, so the 11 kV system is earthed through the neutral earthing resistor before the busbar is energised. The controller blocks closing AH1 or AH3 while AH8 is open.')

# 13 24 V power supply: match the Device List and Datasheets register
cell(25, 12, 1, 'Phoenix Contact QUINT4-PS/1AC/24DC/20', 'Siemens SITOP PSU8200 24 V/20 A')
par('Phoenix Contact QUINT4', 'Siemens SITOP PSU8200')

# 14 Open points
add_row(27, ['14', 'Voltage transformers on the 11 kV panels or busbar. None are shown on the drawings, yet the relay voltages and the 27/59 and 81 protection need them',
             'Switchgear supplier and electrical designer', 'Sections 5, 7; relay communication points'])
add_row(27, ['15', 'Whether the EMS exposes the battery combiner panel status', 'PV and BESS supplier', 'Battery communication points'])

d.save(OUT)
print('saved', OUT)
