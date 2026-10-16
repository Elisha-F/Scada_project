"""Redraws figures 1 (architecture) and 3 (network) of the design report for the
hot standby controller pair, in the style of the rev 0 figures.

Usage: python3 tools/draw_report_figures.py <out_dir>
Writes fig1_architecture.svg and fig3_network.svg; render them to PNG at their
own pixel size (for example with a headless browser) before running
tools/revise_report.py.
"""
import os
import sys

OUT = sys.argv[1]
F = "font-family:Inter,'DejaVu Sans',sans-serif"
INK, GREY, LINE, PANEL, ARROW = '#1d1d1b', '#5b5b57', '#cfcdc5', '#ededec', '#c3c2b7'
BLUE, BLUEBG, ORANGE = '#2a78d6', '#e5effa', '#e8622c'


def t(x, y, s, size=19, w=400, fill=None, anchor='start'):
    s = s.replace('&', '&amp;')
    return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{w}" fill="{fill or INK}" text-anchor="{anchor}">{s}</text>'


def box(x, y, w, h, title, sub=None, fill='#fff', ty=None, tsize=22):
    cx = x + w / 2
    ty = ty or (y + h / 2 - (6 if sub else -8))
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{fill}" stroke="{LINE}" stroke-width="2"/>'
    s += t(cx, ty, title, tsize, 600, anchor='middle')
    if sub:
        s += t(cx, ty + 33, sub, 19, 400, GREY, 'middle')
    return s


def arrow(x, y1, y2, both=True):
    s = f'<line x1="{x}" y1="{y1 + 8}" x2="{x}" y2="{y2 - 8}" stroke="{ARROW}" stroke-width="2"/>'
    s += f'<path d="M{x - 6},{y2 - 10} L{x},{y2} L{x + 6},{y2 - 10}" fill="none" stroke="{ARROW}" stroke-width="2"/>'
    if both:
        s += f'<path d="M{x - 6},{y1 + 10} L{x},{y1} L{x + 6},{y1 + 10}" fill="none" stroke="{ARROW}" stroke-width="2"/>'
    return s


def svg(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" style="{F}">'
            f'<rect width="{w}" height="{h}" fill="#fff"/>{body}</svg>')


# ---------- figure 1: architecture
D = 36  # extra height for the controller pair
b = t(43, 60, 'Two controllers in hot standby gather the whole plant for the SCADA', 26, 500)
b += box(42, 99, 573, 106, 'SCADA servers A and B', 'Screens, alarms, Operator and Admin logins')
b += box(728, 99, 573, 106, 'Firewall and GPS time server', 'VPN remote support, off by default')
b += arrow(329, 205, 268) + t(350, 243, 'IEC 60870-5-104 to both controllers', 19, 400, GREY)
b += arrow(1015, 205, 268, False) + t(1036, 243, 'Time sync and VPN', 19, 400, GREY)
b += f'<rect x="42" y="268" width="1260" height="150" rx="14" fill="{BLUEBG}" stroke="{BLUE}" stroke-width="3"/>'
b += t(672, 302, 'SICAM A8000 CP-8050 plant controllers, hot standby pair', 24, 600, anchor='middle')
b += box(70, 320, 520, 82, 'Controller A · active', 'Collects every signal, switches breakers', ty=352, tsize=21)
b += box(754, 320, 520, 82, 'Controller B · hot standby', 'Follows A and takes over if A fails', ty=352, tsize=21)
b += (f'<line x1="598" y1="361" x2="746" y2="361" stroke="{BLUE}" stroke-width="2.5" stroke-dasharray="7 5"/>'
      + t(672, 351, 'redundancy link', 16, 500, BLUE, 'middle'))
b += arrow(350, 418, 445 + D) + t(372, 416 + D, 'Modbus TCP and IEC 61850', 19, 400, GREY)
b += arrow(993, 418, 445 + D) + t(1015, 416 + D, 'SICAM I/O row link', 19, 400, GREY)
b += f'<rect x="42" y="{445 + D}" width="615" height="650" rx="14" fill="{PANEL}" stroke="{LINE}" stroke-width="2"/>' + t(71, 483 + D, 'Read over the network', 19, 600)
b += f'<rect x="686" y="{445 + D}" width="615" height="767" rx="14" fill="{PANEL}" stroke="{LINE}" stroke-width="2"/>' + t(715, 483 + D, 'Hardwired through six I/O rows', 19, 600)
for i, (a, c) in enumerate([('Embedded EMS', 'Battery, generators and dispatch'), ('PLC box', 'Four PV inverters, Modbus TCP'),
                            ('11 kV and RMU relays', 'IEC 61850 or Modbus'), ('Power meters and UPS', 'Modbus TCP or SNMP'),
                            ('Weather station logger', 'Modbus TCP')]):
    b += box(70, 502 + D + 117 * i, 559, 99, a, c)
for i, (a, c) in enumerate([('Row 1: switchroom, 8 modules', '11 kV panels and breaker commands'),
                            ('Row 2: switchroom, 3 modules', 'Auxiliaries, UPS, DC supplies, doors'),
                            ('Row 3: President station, 4 modules', 'RMU, transformer and LVDB, over fibre'),
                            ('Row 4: Prime Minister station, 4 modules', 'RMU, transformer and LVDB, over fibre'),
                            ('Row 5: BESS yard, 2 modules', 'Inverter transformer, fire panel, over fibre'),
                            ('Row 6: generator area, 3 modules', 'Generator status, fuel, transformer, fibre')]):
    b += box(714, 502 + D + 117 * i, 559, 99, a, c)
b += t(43, 1256 + D, 'Each I/O row is reached by both controllers. The EMS keeps dispatch of PV, battery and generators. Protection trips stay in the relays.', 18, 400, GREY)
open(os.path.join(OUT, 'fig1_architecture.svg'), 'w').write(svg(1344, 1314 + D, b))

# ---------- figure 3: network
b = t(43, 60, 'Every critical device has two network paths', 26, 500)
b += t(43, 148, 'IEC 60870-5-104', 19, 400, GREY) + t(43, 177, 'NTP, SNMP v3', 19, 400, GREY)
b += f'<polyline points="311,254 311,1347 1280,1347 1280,303" fill="none" stroke="{ARROW}" stroke-width="2"/>'
b += f'<line x1="255" y1="254" x2="255" y2="303" stroke="{ARROW}" stroke-width="3"/>'
drops = []
for x, title, sub in ((268, 'SCADA server A', 'Active'), (534, 'SCADA server B', 'Hot standby'),
                      (799, 'Workstation', 'Operator, Admin'), (1064, 'Firewall', 'VPN, default off')):
    b += box(x, 99, 237, 98, title, sub, ty=140)
    drops += [(x + 105, 197, 254, BLUE), (x + 133, 197, 303, ORANGE)]
MID = ((320, 245, 'CP-8050 A', 'Active, dual supply', PANEL), (605, 245, 'CP-8050 B', 'Standby, dual supply', PANEL),
       (870, 360, '11 kV protection relays', 'IEC 61850 or Modbus TCP', '#fff'))
for x, w, *_ in MID:
    c = x + w / 2
    drops += [(c - 14, 254, 360, BLUE), (c + 14, 303, 360, ORANGE)]
for x, y1, y2, col in drops:
    b += f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2}" stroke="{col}" stroke-width="2.5"/>'
b += (f'<line x1="240" y1="254" x2="1302" y2="254" stroke="{BLUE}" stroke-width="6"/>'
      f'<line x1="240" y1="303" x2="1302" y2="303" stroke="{ORANGE}" stroke-width="6"/>')
b += t(43, 262, 'Core switch A', 19, 600) + t(43, 311, 'Core switch B', 19, 600)
for x, y1, y2, col in drops + [(311, 0, 254, BLUE), (1280, 0, 303, ORANGE)]:
    b += f'<circle cx="{x}" cy="{254 if col == BLUE else 303}" r="5.5" fill="{col}"/>'
for x, w, title, sub, fill in MID:
    b += box(x, 360, w, 106, title, sub, fill=fill, ty=401)
b += f'<line x1="565" y1="413" x2="605" y2="413" stroke="{INK}" stroke-width="2.5" stroke-dasharray="5 4"/>' + t(585, 404, 'sync', 14, 600, GREY, 'middle')
b += t(333, 502, 'Fibre ring through five switches: one break isolates nothing. Both controllers reach all six I/O rows.', 18, 400, GREY)
fields = [('Field switch 1: inverter MV station', 'PLC box for the 4 PV inverters: Modbus TCP', 'Weather logger blue’Log XM: Modbus TCP'),
          ('Field switch 2: BESS yard', 'Embedded EMS for battery, PV dispatch and generators: Modbus TCP', 'I/O row 5 on its own fibre pair: SICAM I/O link'),
          ('Field switch 3: generator area', 'Generator controllers DG1 and DG2: Modbus TCP, or RTU through a gateway', 'I/O row 6 on its own fibre pair: SICAM I/O link'),
          ('Station switch: President office', 'RMU relay ST260E: Modbus RTU through a gateway. LVDB meter: Modbus TCP', 'I/O row 3 on its own fibre pair: SICAM I/O link'),
          ('Station switch: Prime Minister office', 'RMU relay ST260E: Modbus RTU through a gateway. LVDB meter: Modbus TCP', 'I/O row 4 on its own fibre pair: SICAM I/O link')]
for i, (a, c, d) in enumerate(fields):
    y = 530 + 163 * i
    b += f'<rect x="113" y="{y}" width="1132" height="127" rx="14" fill="#fff" stroke="{LINE}" stroke-width="2"/>'
    b += t(347, y + 43, a, 21, 600) + t(347, y + 76, c, 18, 400, GREY) + t(347, y + 104, d, 18, 400, GREY)
b += t(531, 1336, 'Ring returns to core switch B', 18, 400, GREY)
b += t(43, 1396, 'Each link takes the colour of the core switch it lands on. Dual links need two ports on the device.', 18, 400, GREY)
open(os.path.join(OUT, 'fig3_network.svg'), 'w').write(svg(1344, 1442, b))
print('wrote', OUT)
