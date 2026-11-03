"""Coordination check of the Rev 3 resubmission package (docs/Rev3_Submission).

Fails if a document refers to the withdrawn Schneider architecture other than to withdraw it, if a document
points to an old revision, if the signal and module totals disagree, or if a referenced file is missing.

Usage: python3 tools/check_rev3_package.py [package_dir]
"""
import os
import re
import subprocess
import sys

import docx
import openpyxl

PKG = sys.argv[1] if len(sys.argv) > 1 else 'docs/Rev3_Submission'
FILES = {
    'report': 'Villa_Somalia_SCADA_Design_Report_Rev3.docx',
    'iolist': 'Villa_Somalia_SCADA_Device_and_IO_List_Rev3.xlsx',
    'drawings': 'BFE-PR-26-01-SCADA-Drawing-Set_RevB.pdf',
    'hmi': 'Villa_Somalia_SCADA_Attachment_E_HMI_Screens_Rev3.pdf',
    'bom': 'Villa_Somalia_SCADA_Bill_of_Material_RevB.xlsx',
    'transmittal': 'Villa_Somalia_SCADA_Resubmission_Transmittal_RFA-001.docx',
}
SCHNEIDER = r'M580|Modicon|BMEH|BMEXBP|BMX[A-Z]|EcoStruxure|Machine SCADA|Edge I/O|\bNTS[A-Z0-9]|\bX80\b|Control Expert|EtherNet/IP|BMECRA'
OLD_REV = r'IO_List_Rev[12]\b|Design_Report_Rev[12]\b|Drawing-Set_SICAM\.pdf|Bill_of_Material_SICAM|HMI_Screens\.pdf|Report Rev [12]\b|List Rev [12]\b'
WITHDRAW_CONTEXT = re.compile(r'withdraw|Withdrawn|Rev 2|alternative', re.I)

fails, notes = [], []


def chunks(path):
    """Yield text units (paragraphs, cells, PDF lines) of one document."""
    if path.endswith('.docx'):
        d = docx.Document(path)
        yield from (p.text for p in d.paragraphs)
        for t in d.tables:
            for row in t.rows:
                yield ' | '.join(c.text for c in row.cells)
    elif path.endswith('.xlsx'):
        for ws in openpyxl.load_workbook(path).worksheets:
            for row in ws.iter_rows(values_only=True):
                yield ' | '.join(str(c) for c in row if c is not None)
    else:
        yield from subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True, check=True).stdout.splitlines()


text = {}
for k, f in FILES.items():
    p = os.path.join(PKG, f)
    if not os.path.exists(p):
        fails.append('missing file: ' + f)
        continue
    units = list(chunks(p))
    text[k] = '\n'.join(units)
    for u in units:
        if re.search(SCHNEIDER, u) and not WITHDRAW_CONTEXT.search(u):
            fails.append('%s: Schneider term outside a withdrawal note: %s' % (f, u.strip()[:140]))
        if re.search(OLD_REV, u) and not re.search(r'[Ss]upersede|[Ww]ithdraw|Rev 1 \(|Rev 1,|Rev 1 and|history|Rev 1 to|Revision', u):
            fails.append('%s: points to an old revision: %s' % (f, u.strip()[:140]))

# every file the report and transmittal name exists in the package
for k in ('report', 'transmittal'):
    for name in set(re.findall(r'[A-Za-z0-9_\-]+\.(?:docx|xlsx|pdf)', text.get(k, ''))):
        if name not in FILES.values():
            fails.append('%s names a file not in the package: %s' % (FILES[k], name))

# signal and module totals
wb = openpyxl.load_workbook(os.path.join(PKG, FILES['iolist']))
hw = sum(1 for r in wb['IO List'].iter_rows(min_row=2, values_only=True) if r[0])
com = sum(1 for r in wb['Comms Point List'].iter_rows(min_row=2, values_only=True) if r[0])
mods = sum(1 for r in wb['IO Summary'].iter_rows(min_row=2, max_row=25, values_only=True) if r[3])
notes.append('I/O list: %d hardwired, %d communication points, %d modules' % (hw, com, mods))
if (hw, com, mods) != (244, 463, 24):
    fails.append('I/O list totals changed: %s' % ((hw, com, mods),))
for k, needles in {'report': ['244 hardwired', '463', '24 I/O modules'], 'drawings': ['244', '24 modules'],
                   'transmittal': ['244 hardwired', '463', '24 SICAM I/O modules']}.items():
    for n in needles:
        if n not in text.get(k, ''):
            fails.append('%s does not state "%s"' % (FILES[k], n))
bom = openpyxl.load_workbook(os.path.join(PKG, FILES['bom']))
bom_mods = sum(r[7] for r in bom['BOM by Panel'].iter_rows(min_row=3, values_only=True)
               if r[4] in ('DI-8112', 'DO-8221', 'DO-8212', 'AI-8320') and r[13] != 'SP')
notes.append('bill of material: %d I/O modules installed' % bom_mods)
if bom_mods != mods:
    fails.append('bill of material has %d I/O modules, I/O list %d' % (bom_mods, mods))

# revision marks
for k, needle in {'drawings': 'REV B', 'hmi': 'Rev 3', 'report': 'Rev 3', 'iolist': 'Rev 3', 'bom': 'Rev B'}.items():
    if needle not in text.get(k, ''):
        fails.append('%s has no "%s" mark' % (FILES[k], needle))
if 'Attachment C' in text.get('hmi', ''):
    fails.append('HMI screens still titled Attachment C')
if text.get('drawings', '').count('REV B') != 5:
    fails.append('not every drawing sheet is REV B')

for n in notes:
    print('  ' + n)
if fails:
    print('FAILED (%d):' % len(fails))
    for f in fails:
        print('  - ' + f)
    sys.exit(1)
print('Package coordinated: %d documents, no Schneider references outside withdrawal notes, no old revisions, totals agree.' % len(FILES))
