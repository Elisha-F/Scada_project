"""SCADA Design Report Rev 3: Siemens SICAM A8000 confirmed as the selected architecture (RFA-001/BRA/26 Issue H).

Input is Rev 1 (docs/superseded, from tools/revise_report.py). The design content is that of Rev 1. Rev 3 adds the
revision history, the coordinated attachments (drawings Rev B, I/O list Rev 3, HMI screens Rev 3, bill of material
Rev B) and aligns the equipment and spares tables with the bill of material. Each edit names the exact old text, so a
changed source fails loudly. A final sweep fails if any Schneider control-platform term is present.

Usage: python3 tools/make_rev3_report.py <rev1.docx> <rev3.docx>
"""
import re
import sys
from copy import deepcopy

import docx

SRC, OUT = sys.argv[1], sys.argv[2]
d = docx.Document(SRC)
T = d.tables

IOL = 'Villa_Somalia_SCADA_Device_and_IO_List_Rev3.xlsx'
DWG = 'BFE-PR-26-01-SCADA-Drawing-Set_RevB.pdf'
HMI = 'Villa_Somalia_SCADA_Attachment_E_HMI_Screens_Rev3.pdf'
BOM = 'Villa_Somalia_SCADA_Bill_of_Material_RevB.xlsx'


def all_pars():
    yield from d.paragraphs
    for t in d.tables:
        for row in t.rows:
            for c in row.cells:
                yield from c.paragraphs


def set_par(p, old, new):
    """Replace old with new inside one paragraph, keeping the run formatting around it."""
    text = ''.join(r.text for r in p.runs)
    assert old in text, (old, text)
    start = text.index(old)
    pos, first = 0, None
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


def par(old, new):
    ps = [p for p in d.paragraphs if old in p.text]
    assert len(ps) == 1, (old, len(ps))
    set_par(ps[0], old, new)
    return ps[0]


def cell(t, r, c, old, new):
    ps = [p for p in T[t].rows[r].cells[c].paragraphs if old in p.text]
    assert ps, ('T%d R%d C%d' % (t, r, c), old, T[t].rows[r].cells[c].text)
    set_par(ps[0], old, new)


def set_cell_text(c, v):
    p = c.paragraphs[0]
    for extra in c.paragraphs[1:]:
        extra._p.getparent().remove(extra._p)
    if not p.runs:
        p.add_run('')
    for r in p.runs[1:]:
        r._r.getparent().remove(r._r)
    p.runs[0].text = str(v)


def fill(tbl, rows, header=None):
    """Keep the header row, use row 1 as the template and replace every body row."""
    if header:
        for c, v in zip(tbl.rows[0].cells, header):
            set_cell_text(c, v)
    tmpl = deepcopy(tbl.rows[1]._tr)
    for row in list(tbl.rows)[1:]:
        tbl._tbl.remove(row._tr)
    for vals in rows:
        tbl._tbl.append(deepcopy(tmpl))
        for c, v in zip(tbl.rows[-1].cells, vals):
            set_cell_text(c, v)


def add_row(ti, vals):
    T[ti]._tbl.append(deepcopy(T[ti].rows[-1]._tr))
    for c, v in zip(T[ti].rows[-1].cells, vals):
        set_cell_text(c, v)


def insert_par_after(p, text):
    el = deepcopy(p._p)
    p._p.addnext(el)
    np = docx.text.paragraph.Paragraph(el, p._parent)
    for r in np.runs[1:]:
        r._r.getparent().remove(r._r)
    np.runs[0].text = text
    return np


# ---------------------------------------------------------------- title and introduction
par('Oct 12, 2026', 'Rev 3 · 3 Nov 2026')
p = par("It answers the client's review comments on the earlier drawing set.", "It answers the client's review comments on the earlier drawing set.")
insert_par_after(p, 'Revision 3 confirms Siemens SICAM A8000 as the selected architecture, in reply to the Employer\'s comment on RFA-001/BRA/26 '
                    'Issue H. It is the one coordinated design package for review and approval. It supersedes Rev 1, and Rev 2 (Schneider Electric '
                    'Modicon M580) is withdrawn in full. The design is that of Rev 1; the changes are listed in the revision history below.')

# ---------------------------------------------------------------- reference documents
cell(0, 3, 0, 'Rev1.xlsx', 'Rev3.xlsx')
add_row(0, ['Drawing set BFE/PR/26/01-SCADA-001 to 005, Rev B', 'SCADA architecture, communication network, PV interface, BESS interface, '
                                                                 'SCADA overview SLD (Attachment A)'])
add_row(0, [HMI, 'HMI screen mock-ups, 12 screens (Attachment E)'])
add_row(0, [BOM, 'Bill of material by panel and by order line (Attachment F)'])
add_row(0, ['RFA-001/BRA/26 Issue H, Employer\'s comment of 20 Oct 2026', 'Confirm the selected architecture and resubmit one coordinated package'])

# revision history: heading and table after the reference documents table
ref_head = [p for p in d.paragraphs if p.text == 'Reference documents'][0]
h = deepcopy(ref_head._p)
T[0]._tbl.addnext(h)
hp = docx.text.paragraph.Paragraph(h, ref_head._parent)
for r in hp.runs[1:]:
    r._r.getparent().remove(r._r)
hp.runs[0].text = 'Revision history'
rev_tbl = deepcopy(T[0]._tbl)
h.addnext(rev_tbl)
rt = docx.table.Table(rev_tbl, ref_head._parent)
fill(rt, [
    ['Rev 1, October 2026', 'First issue on Siemens SICAM A8000. Superseded by Rev 3.'],
    ['Rev 2, October 2026', 'Alternative on Schneider Electric Modicon M580 and Machine SCADA Expert. Withdrawn: not to be used for review, '
                           'procurement or construction.'],
    ['Rev 3, 3 Nov 2026', 'SICAM A8000 confirmed (RFA-001/BRA/26 Issue H). Design as Rev 1. Drawings BFE/PR/26/01-SCADA-001 to 005 Rev B issued as '
                          'Attachment A and the bill of material as Attachment F. 24 V power supplies, server rack, SW-MV enclosure and spares '
                          'aligned with the bill of material. For approval.'],
], header=['Revision', 'Description and status'])

# ---------------------------------------------------------------- compliance table
cell(1, 1, 2, 'attachments A to E', 'attachments A to F')
cell(1, 5, 3, '11, 13, Attachment C', '11, 13, Attachments C and F')

# ---------------------------------------------------------------- 13 Equipment
par('Product numbers marked "to confirm" will be taken from the supplier quotations.',
    'Product numbers marked "to confirm" will be taken from the supplier quotations. The full bill of material, by panel and by order line, '
    'is Attachment F.')
cell(25, 12, 1, 'Siemens SITOP PSU8200 24 V/20 A', 'Siemens SITOP PSU8200: 24 V/20 A in the cabinet, 24 V/5 A at the field panels')
cell(25, 12, 0, '24 V DC power supplies', '24 V DC power supplies (1 + 5)')
add_row(25, ['Network enclosure for SW-MV, IP55', 'Rittal AX', '1'])
add_row(25, ['Server rack 24U with rack console', 'To suit', '1'])
fill(T[26], [
    ['Configured flash card for the CP-8050', '1', 'Controller B is the running spare; the card restores a replaced controller quickly'],
    ['DI-8112, DO-8221, CI-8533, PS-8642', '1 each', 'One of each I/O module type and a controller power supply on site'],
    ['Field switch and fibre transceivers', '1 and 2', 'Network repair'],
    ['SITOP 24 V/5 A and MGate MB3170', '1 each', 'Field panel repair'],
])

# ---------------------------------------------------------------- 14 Attachments
at = T[28]
cell(28, 1, 1, at.rows[1].cells[1].text, 'Drawings BFE/PR/26/01-SCADA-001 to 005: SCADA architecture, communication network, PV interface, '
                                         'BESS interface and SCADA overview SLD (' + DWG + ')')
cell(28, 1, 2, at.rows[1].cells[2].text, 'Rev B, complete')
cell(28, 2, 1, 'Rev1.xlsx', 'Rev3.xlsx')
cell(28, 2, 2, 'Rev 1, complete', 'Rev 3, complete')
cell(28, 5, 1, 'Villa_Somalia_SCADA_Attachment_E_HMI_Screens.pdf', HMI)
cell(28, 5, 2, 'Rev 1, complete', 'Rev 3, complete')
add_row(28, ['F', 'Bill of material by panel and by order line, with I/O check and equipment by others (' + BOM + ')', 'Rev B, for pricing'])

# ---------------------------------------------------------------- sweep
text = '\n'.join(p.text for p in all_pars())
for bad in ('M580', 'Modicon', 'Machine SCADA', 'EcoStruxure', 'Edge I/O', 'X80', 'BMEH', 'BMX', 'NTS', 'Rev1.xlsx', 'Rev 1, complete'):
    hits = [m.start() for m in re.finditer(re.escape(bad), text)]
    allowed = text.count('Schneider Electric Modicon M580') if bad in ('M580', 'Modicon') else 0
    allowed += text.count('Modicon M580 and Machine SCADA Expert') if bad == 'Machine SCADA' else 0
    assert len(hits) <= allowed, (bad, len(hits), [text[max(0, i - 60):i + 60] for i in hits])
d.save(OUT)
print('wrote', OUT)
