"""Cover letter and document register for the resubmission in reply to RFA-001/BRA/26 Issue H.

Usage: python3 tools/build_transmittal_rev3.py [out.docx]
"""
import sys

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

OUT = sys.argv[1] if len(sys.argv) > 1 else 'docs/Rev3_Submission/Villa_Somalia_SCADA_Resubmission_Transmittal_RFA-001.docx'
NAVY = RGBColor(0x14, 0x26, 0x3D)

REGISTER = [
    ['1', 'SCADA Design Report', 'Villa_Somalia_SCADA_Design_Report_Rev3.docx', 'Rev 3', 'Rev 1 and Rev 2', 'For approval'],
    ['2', 'Attachment A: drawings BFE/PR/26/01-SCADA-001 to 005 (architecture, communication network, PV interface, BESS interface, '
          'SCADA overview SLD)', 'BFE-PR-26-01-SCADA-Drawing-Set_RevB.pdf', 'Rev B', 'Rev A', 'For approval'],
    ['3', 'Attachment B: Device and I/O List', 'Villa_Somalia_SCADA_Device_and_IO_List_Rev3.xlsx', 'Rev 3', 'Rev 1 and Rev 2', 'For approval'],
    ['4', 'Attachment C: Datasheets', '-', '-', '-', 'To follow, collected from the suppliers'],
    ['5', 'Attachment D: Panel layouts and wiring diagrams', '-', '-', '-', 'To follow, after the equipment terminal schedules'],
    ['6', 'Attachment E: HMI screen mock-ups (12 screens)', 'Villa_Somalia_SCADA_Attachment_E_HMI_Screens_Rev3.pdf', 'Rev 3',
          'Rev 1 (cover titled "Attachment C") and Rev 2', 'For approval'],
    ['7', 'Attachment F: Bill of material', 'Villa_Somalia_SCADA_Bill_of_Material_RevB.xlsx', 'Rev B', 'Rev A', 'For information and pricing'],
]
WITHDRAWN = [
    ['SCADA Design Report Rev 2 (Schneider Electric Modicon M580, EcoStruxure Machine SCADA Expert)', 'Withdrawn'],
    ['Device and I/O List Rev 2 (Schneider Electric I/O allocation)', 'Withdrawn'],
    ['HMI screen mock-ups Rev 2 (Schneider Electric controller on the communication screen)', 'Withdrawn'],
    ['Drawing set on the Schneider Electric M580 power plant controller architecture', 'Withdrawn'],
    ['Schneider Electric I/O allocation for the requote', 'Withdrawn'],
    ['SCADA Design Report Rev 1, Device and I/O List Rev 1, HMI screens Rev 1, drawings Rev A, bill of material Rev A (Siemens SICAM A8000)',
     'Superseded by this package'],
]
CHANGES = [
    'No change to the architecture, signals or tags: 244 hardwired signals on 24 SICAM I/O modules in six rows (27 % spare), 463 communication points.',
    'Revision history added to the Design Report; Attachment A (drawings) and Attachment F (bill of material) issued and referenced.',
    '24 V power supplies: one 20 A unit in the SCADA cabinet and five 5 A units at the field panels (was six 20 A).',
    'Added: 19-inch server rack with console for the control room; network enclosure for field switch SW-MV.',
    'Spares list aligned with the bill of material (adds a controller power supply, a 5 A power supply and a serial gateway).',
    'HMI screen mock-ups are Attachment E, as the Design Report lists them. Attachment C is the datasheets.',
]


def shade(cell, hexcolor):
    tc = cell._tc.get_or_add_tcPr()
    sh = OxmlElement('w:shd')
    sh.set(qn('w:val'), 'clear')
    sh.set(qn('w:color'), 'auto')
    sh.set(qn('w:fill'), hexcolor)
    tc.append(sh)


def table(doc, header, rows, widths):
    t = doc.add_table(rows=1, cols=len(header))
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for c, h in zip(t.rows[0].cells, header):
        c.text = ''
        r = c.paragraphs[0].add_run(h)
        r.bold, r.font.size, r.font.color.rgb = True, Pt(9), RGBColor(0xFF, 0xFF, 0xFF)
        shade(c, '14263D')
    for vals in rows:
        cells = t.add_row().cells
        for c, v in zip(cells, vals):
            c.text = ''
            c.paragraphs[0].add_run(v).font.size = Pt(9)
    t.autofit = False
    for col, w in zip(t.columns, widths):
        col.width = Cm(w)
    for row in t.rows:
        for c, w in zip(row.cells, widths):
            c.width = Cm(w)
    return t


doc = Document()
for s in doc.sections:
    s.left_margin = s.right_margin = Cm(2)
    s.top_margin = s.bottom_margin = Cm(1.8)
st = doc.styles['Normal']
st.font.name, st.font.size = 'Calibri', Pt(10.5)

h = doc.add_paragraph()
r = h.add_run('TRANSMITTAL AND DOCUMENT REGISTER')
r.bold, r.font.size, r.font.color.rgb = True, Pt(16), NAVY
doc.add_paragraph('Resubmission of the SCADA/EMS design package in reply to RFA-001/BRA/26, Issue H')

info = [
    ('Project', 'Solarization of Villa Somalia'),
    ('To', 'Ministry of Energy & Water Resources (MoEWR), attn. Project Manager (PIU-SESRP)'),
    ('From', 'Blueflag Energy Co. Ltd / Najax General Trading'),
    ('Reference', 'RFA-001/BRA/26, Issue H, issued 20 Oct 2026; Employer\'s comment'),
    ('Date', '[date of issue]'),
    ('Transmittal no.', '[no.]'),
]
t = doc.add_table(rows=0, cols=2)
t.style = 'Table Grid'
for a, b in info:
    cells = t.add_row().cells
    cells[0].text, cells[1].text = a, b
    cells[0].paragraphs[0].runs[0].bold = True
    shade(cells[0], 'EEF1F4')
    cells[0].width, cells[1].width = Cm(4), Cm(13)

def heading(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    rr = p.add_run(text)
    rr.bold, rr.font.size, rr.font.color.rgb = True, Pt(12), NAVY


heading('1. Selected architecture')
doc.add_paragraph('In reply to the Employer\'s comment on RFA-001/BRA/26 Issue H, the Contractor confirms Siemens SICAM A8000 as the selected '
                  'SCADA architecture: a hot standby pair of CP-8050 controllers with six SICAM I/O rows, Siemens SICAM SCC on two redundant '
                  'servers linked by IEC 60870-5-104, a managed fibre-optic ring network, and the embedded EMS for dispatch of PV, battery and '
                  'generators.')
doc.add_paragraph('The alternative on Schneider Electric Modicon M580 is withdrawn in full. The documents listed below form one complete, '
                  'coordinated design package for the Employer\'s review and approval.')

heading('2. Documents submitted')
table(doc, ['No.', 'Document', 'File', 'Rev', 'Supersedes', 'Status'], REGISTER, [0.9, 4.6, 5.6, 1.1, 2.4, 2.4])

heading('3. Superseded and withdrawn submissions')
doc.add_paragraph('The following earlier submissions shall not be used for review, procurement or construction:')
table(doc, ['Document', 'Status'], WITHDRAWN, [13, 4])

heading('4. Changes from the Rev 1 (SICAM A8000) submission')
for c in CHANGES:
    doc.add_paragraph(c, style='List Bullet')

heading('5. Coordination')
doc.add_paragraph('All documents in this package use the same device names, tags, I/O module quantities and signal totals. They were checked '
                  'against each other before issue, and none refers to the withdrawn Schneider Electric architecture except to withdraw it.')

heading('6. Open items')
doc.add_paragraph('The design is complete in structure. Supplier data still awaited (EMS and PLC box point tables, generator controller and relay '
                  'models, terminal schedules, Siemens confirmation of the hot standby function and two product numbers) is listed in section 14 '
                  'of the Design Report. None of these items changes the architecture.')

doc.add_paragraph()
sig = doc.add_table(rows=4, cols=2)
sig.style = 'Table Grid'
for i, (a, b) in enumerate([('Issued by (Contractor\'s representative)', 'Received by (Employer)'), ('Name:', 'Name:'),
                            ('Signature:', 'Signature / stamp:'), ('Date:', 'Date:')]):
    sig.rows[i].cells[0].text, sig.rows[i].cells[1].text = a, b
    if i == 0:
        for c in sig.rows[i].cells:
            c.paragraphs[0].runs[0].bold = True
            shade(c, 'EEF1F4')
doc.save(OUT)
print('wrote', OUT)
