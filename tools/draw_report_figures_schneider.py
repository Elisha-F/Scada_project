"""Figures 1 to 3 of the design report Rev 2 (Schneider Electric platform), in the style of the rev 0 figures.

Usage: python3 tools/draw_report_figures_schneider.py <out_dir>
Writes fig1_architecture_se.svg, fig2_pv_bess_interface_se.svg and fig3_network_se.svg; render them to PNG
at their own pixel size before running tools/convert_report_schneider.py.
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


def box(x, y, w, h, title, sub=None, fill='#fff', ty=None, tsize=22, stroke=LINE, sw=2):
    cx = x + w / 2
    ty = ty or (y + h / 2 - (6 if sub else -8))
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
    s += t(cx, ty, title, tsize, 600, anchor='middle')
    if sub:
        s += t(cx, ty + 33, sub, 19, 400, GREY, 'middle')
    return s


def head(x, y, d):
    """Arrow head at (x, y) pointing up, down, left or right."""
    p = {'down': (x - 6, y - 10, x + 6, y - 10), 'up': (x - 6, y + 10, x + 6, y + 10), 'right': (x - 10, y - 6, x - 10, y + 6), 'left': (x + 10, y - 6, x + 10, y + 6)}[d]
    return f'<path d="M{p[0]},{p[1]} L{x},{y} L{p[2]},{p[3]}" fill="none" stroke="{ARROW}" stroke-width="2"/>'


def arrow(x, y1, y2, both=True):
    s = f'<line x1="{x}" y1="{y1 + 8}" x2="{x}" y2="{y2 - 8}" stroke="{ARROW}" stroke-width="2"/>' + head(x, y2, 'down')
    return s + (head(x, y1, 'up') if both else '')


def svg(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" style="{F}">'
            f'<rect width="{w}" height="{h}" fill="#fff"/>{body}</svg>')


# ---------- figure 1: architecture
D = 36
b = t(43, 60, 'Two M580 controllers in hot standby gather the whole plant for the SCADA', 26, 500)
b += box(42, 99, 573, 106, 'SCADA stations A and B', 'Machine SCADA Expert, Operator and Admin logins')
b += box(728, 99, 573, 106, 'Firewall and GPS time server', 'VPN remote support, off by default')
b += arrow(329, 205, 268) + t(350, 243, 'Modbus TCP to both controllers', 19, 400, GREY)
b += arrow(1015, 205, 268, False) + t(1036, 243, 'Time sync and VPN', 19, 400, GREY)
b += f'<rect x="42" y="268" width="1260" height="150" rx="14" fill="{BLUEBG}" stroke="{BLUE}" stroke-width="3"/>'
b += t(672, 302, 'Schneider Electric Modicon M580 plant controllers, hot standby pair', 24, 600, anchor='middle')
b += box(70, 320, 520, 82, 'Controller A · active', 'Collects every signal, switches breakers', ty=352, tsize=21)
b += box(754, 320, 520, 82, 'Controller B · hot standby', 'Follows A and takes over if A fails', ty=352, tsize=21)
b += (f'<line x1="598" y1="361" x2="746" y2="361" stroke="{BLUE}" stroke-width="2.5" stroke-dasharray="7 5"/>'
      + t(672, 351, 'hot standby link', 16, 500, BLUE, 'middle'))
b += arrow(350, 418, 445 + D) + t(372, 416 + D, 'Modbus TCP', 19, 400, GREY)
b += arrow(993, 418, 445 + D) + t(1015, 416 + D, 'Remote I/O and EtherNet/IP', 19, 400, GREY)
b += f'<rect x="42" y="{445 + D}" width="615" height="650" rx="14" fill="{PANEL}" stroke="{LINE}" stroke-width="2"/>' + t(71, 483 + D, 'Read over the network', 19, 600)
b += f'<rect x="686" y="{445 + D}" width="615" height="650" rx="14" fill="{PANEL}" stroke="{LINE}" stroke-width="2"/>' + t(715, 483 + D, 'Hardwired at five I/O locations', 19, 600)
for i, (a, c) in enumerate([('Embedded EMS', 'Battery, generators and dispatch'), ('PLC box', 'Four PV inverters, Modbus TCP'),
                            ('11 kV and RMU relays', 'Modbus TCP; ST260E on Modbus RTU'), ('Power meters and UPS', 'Modbus TCP or SNMP'),
                            ('Weather station logger', 'Modbus TCP')]):
    b += box(70, 502 + D + 117 * i, 559, 99, a, c)
for i, (a, c) in enumerate([('Switchroom remote drop, 6 modules', '11 kV panels, breaker commands, auxiliaries'),
                            ('President station island, 4 modules', 'RMU, transformer and LVDB, over fibre'),
                            ('Prime Minister station island, 4 modules', 'RMU, transformer and LVDB, over fibre'),
                            ('BESS yard island, 2 modules', 'Inverter transformer, fire panel, over fibre'),
                            ('Generator area island, 3 modules', 'Generator status, fuel, transformer, fibre')]):
    b += box(714, 502 + D + 117 * i, 559, 99, a, c)
b += t(43, 1139 + D, 'Each I/O location is reached by both controllers. The EMS keeps dispatch of PV, battery and generators. Protection trips stay in the relays.', 18, 400, GREY)
open(os.path.join(OUT, 'fig1_architecture_se.svg'), 'w').write(svg(1344, 1197 + D, b))

# ---------- figure 2: PV and BESS interface
b = t(43, 52, 'The SCADA meets the PV and BESS package at three defined points', 26, 500)
b += f'<rect x="42" y="99" width="615" height="628" rx="14" fill="{PANEL}" stroke="{LINE}" stroke-width="2"/>' + t(71, 137, 'PV and BESS supplier package', 19, 600)
for y, a, c in ((156, 'PV inverters NB01 to NB04', 'Power line communication on the AC cables'), (304, 'PLC box', 'Inverter data on Ethernet'),
                (453, 'Embedded EMS', 'Dispatch: PV curtailment, battery, generators'), (601, 'Battery ST3340UX', 'Converter, battery management, fire panel')):
    b += box(70, y, 559, 98, a, c, fill='#f6f6f5')
b += f'<line x1="350" y1="262" x2="350" y2="294" stroke="{ARROW}" stroke-width="2"/>' + head(350, 302, 'down') + t(372, 286, 'Inverter data', 19, 400, GREY)
b += f'<line x1="350" y1="445" x2="350" y2="412" stroke="{ARROW}" stroke-width="2"/>' + head(350, 404, 'up') + t(372, 436, 'Power limit to inverters', 19, 400, GREY)
b += f'<line x1="350" y1="561" x2="350" y2="591" stroke="{ARROW}" stroke-width="2"/>' + head(350, 599, 'down') + head(350, 553, 'up') + t(372, 585, 'Battery control and data', 19, 400, GREY)
b += f'<line x1="725" y1="100" x2="725" y2="727" stroke="{ARROW}" stroke-width="2" stroke-dasharray="8 6"/>' + t(746, 127, 'Interface boundary', 19, 400, GREY)
b += box(799, 156, 502, 98, 'SCADA stations A and B', 'Operator screens and Admin settings')
b += box(799, 304, 502, 98, 'Modicon M580 controllers A and B', 'Read data, write permitted settings', fill=BLUEBG, stroke=BLUE, sw=3)
b += box(799, 601, 502, 98, 'BESS yard Edge I/O island', 'Fire, E-stop and door contacts')
b += f'<line x1="1050" y1="264" x2="1050" y2="294" stroke="{ARROW}" stroke-width="2"/>' + head(1050, 302, 'down') + head(1050, 256, 'up')


def num(x, y, n):
    return f'<circle cx="{x}" cy="{y}" r="19" fill="#f2f1ee" stroke="{ARROW}" stroke-width="2"/>' + t(x, y + 7, str(n), 19, 600, anchor='middle')


b += f'<line x1="631" y1="353" x2="789" y2="353" stroke="{ARROW}" stroke-width="2"/>' + head(797, 353, 'right') + num(725, 353, 1)
b += f'<polyline points="1050,404 1050,502 641,502" fill="none" stroke="{ARROW}" stroke-width="2"/>' + head(631, 502, 'left') + head(1050, 404, 'up') + num(725, 502, 2)
b += f'<line x1="631" y1="651" x2="789" y2="651" stroke="{ARROW}" stroke-width="2"/>' + head(797, 651, 'right') + num(725, 651, 3)
b += f'<line x1="1203" y1="599" x2="1203" y2="412" stroke="{ARROW}" stroke-width="2"/>' + head(1203, 404, 'up')
b += t(43, 790, 'Numbers mark the three interface points described in the table below.', 18, 400, GREY)
open(os.path.join(OUT, 'fig2_pv_bess_interface_se.svg'), 'w').write(svg(1344, 840, b))

# ---------- figure 3: network
b = t(43, 60, 'Every critical device has two network paths', 26, 500)
b += t(43, 148, 'Modbus TCP', 19, 400, GREY) + t(43, 177, 'NTP, SNMP v3', 19, 400, GREY)
b += f'<polyline points="311,254 311,1347 1280,1347 1280,303" fill="none" stroke="{ARROW}" stroke-width="2"/>'
b += f'<line x1="255" y1="254" x2="255" y2="303" stroke="{ARROW}" stroke-width="3"/>'
drops = []
for x, title, sub in ((268, 'SCADA station A', 'Active'), (534, 'SCADA station B', 'Hot standby'),
                      (799, 'Engineering laptop', 'Control Expert'), (1064, 'Firewall', 'VPN, default off')):
    b += box(x, 99, 237, 98, title, sub, ty=140)
    drops += [(x + 105, 197, 254, BLUE), (x + 133, 197, 303, ORANGE)]
MID = ((320, 245, 'M580 A', 'Active, dual supply', PANEL), (605, 245, 'M580 B', 'Standby, dual supply', PANEL),
       (870, 360, '11 kV protection relays', 'Modbus TCP', '#fff'))
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
b += f'<line x1="565" y1="413" x2="605" y2="413" stroke="{INK}" stroke-width="2.5" stroke-dasharray="5 4"/>' + t(585, 404, 'HSBY', 14, 600, GREY, 'middle')
b += t(333, 494, 'Switchroom I/O drop on the M580 remote I/O network, in the SCADA cabinet.', 18, 400, GREY)
b += t(333, 517, 'Fibre ring through five switches: one break isolates nothing.', 18, 400, GREY)
fields = [('Field switch 1: inverter MV station', 'PLC box for the 4 PV inverters: Modbus TCP', 'Weather logger blue’Log XM: Modbus TCP'),
          ('Field switch 2: BESS yard', 'Embedded EMS for battery, PV dispatch and generators: Modbus TCP', 'Edge I/O island, BESS yard: EtherNet/IP'),
          ('Field switch 3: generator area', 'Generator controllers DG1 and DG2: Modbus TCP, or RTU through the island serial master', 'Edge I/O island, generator area: EtherNet/IP'),
          ('Station switch: President office', 'RMU relay ST260E: Modbus RTU through the island serial master. LVDB meter: Modbus TCP', 'Edge I/O island, President station: EtherNet/IP'),
          ('Station switch: Prime Minister office', 'RMU relay ST260E: Modbus RTU through the island serial master. LVDB meter: Modbus TCP', 'Edge I/O island, PM station: EtherNet/IP')]
for i, (a, c, d) in enumerate(fields):
    y = 545 + 160 * i
    b += f'<rect x="113" y="{y}" width="1132" height="124" rx="14" fill="#fff" stroke="{LINE}" stroke-width="2"/>'
    b += t(347, y + 42, a, 21, 600) + t(347, y + 74, c, 18, 400, GREY) + t(347, y + 102, d, 18, 400, GREY)
b += t(531, 1336, 'Ring returns to core switch B', 18, 400, GREY)
b += t(43, 1396, 'Each link takes the colour of the core switch it lands on. Dual links need two ports on the device.', 18, 400, GREY)
open(os.path.join(OUT, 'fig3_network_se.svg'), 'w').write(svg(1344, 1442, b))
print('wrote', OUT)
