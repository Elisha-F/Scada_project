"""Attachment A drawing set BFE/PR/26/01-SCADA-001 to 005 for the SICAM A8000 design (report and I/O list Rev 1).

Usage: python3 tools/draw_drawings_sicam.py <out_dir>
Writes BFE-PR-26-01-SCADA-00n.svg (A3, mm); build the PDF with node tools/svgs_to_pdf.js.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from drawings_common import (GREY, INK, box, image, labels_on_top, line, sheet, t, table, tw, wrap, zone)  # noqa: E402

OUT = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
os.makedirs(OUT, exist_ok=True)
STRIPE_SYM = ('<rect x="{x}" y="{y}" width="9" height="3" fill="#fff" stroke="#1d1d1b" stroke-width="0.2"/>'
              '<rect x="{x}" y="{y}" width="1.1" height="3" fill="#2a62c9"/>', 'Device; stripe = link type to the SCADA')
ZONE_SYM = ('<rect x="{x}" y="{y}" width="9" height="3" rx="0.6" fill="#f7f9fb" stroke="#8a96a3" stroke-width="0.25" stroke-dasharray="1.2 0.8"/>', 'Zone or location boundary')


def bh(lines, w, size=1.75):
    """Height of a box with these lines."""
    return 5.4 + sum(len(wrap(l, w - 3.4, size)) * size * 1.25 for l in lines) + 0.6


def stack(x, y, w, items, gap=1.6, size=1.75):
    s = ''
    for title, lines, stripe in items:
        h = bh(lines, w, size)
        s += box(x, y, w, h, title, lines, stripe, size)
        y += h + gap
    return s, y


def num(x, y, n):
    return f'<circle cx="{x}" cy="{y}" r="1.7" fill="#fff" stroke="{INK}" stroke-width="0.25"/>' + t(x, y + 0.7, n, 1.9, 700, anchor='middle')


def save(no, svg):
    open(os.path.join(OUT, 'BFE-PR-26-01-SCADA-%03d.svg' % no), 'w').write(labels_on_top(svg))


# ===================================================================== 001 SCADA architecture
b = zone(10, 9, 319, 27, 'Level 3 · Remote access (outside the plant)')
b += box(14, 15, 62, 16, 'Remote support (vendor / O&M)', ['VPN with multi-factor login; off by default, enabled per session by an Admin and logged'], 'none')
b += box(262, 15, 62, 16, 'FW-01 · Firewall with VPN', ['Fortinet FortiGate Rugged 60F; deny by default; only conduit to the outside'], 'eth')
b += line([(76, 23), (262, 23)], 'vpn') + t(169, 21.6, 'VPN, off by default', 1.7, 400, GREY, 'middle')
b += t(90, 30, 'No plant data leaves the site in the proposed design (report section 9).', 1.7, 400, GREY, italic=True)
b += zone(10, 39, 319, 56, 'Level 2 · Supervisory – SCADA zone (control room)')
L2 = [('SRV-A', ['SICAM SCC server, active', 'SIMATIC IPC647E']), ('SRV-B', ['SICAM SCC server, hot standby', 'SIMATIC IPC647E']),
      ('OWS-01', ['Operator workstation, two monitors']), ('ENG-01', ['Engineering laptop, SICAM Device Manager']),
      ('GPS-01', ['Meinberg LANTIME M300, NTP time']), ('UPS-01', ['APC Smart-UPS SRT 3000 VA, SNMP']), ('ALM-01', ['Alarm sounder and beacon, hardwired to row 1'])]
for i, (n, ls) in enumerate(L2):
    x = 14 + i * 42.6
    b += box(x, 45, 40, 16, n, ls, 'eth' if n != 'ALM-01' else 'hw')
    if n != 'ALM-01':
        b += line([(x + 17, 61), (x + 17, 66)], 'busa') + line([(x + 23, 61), (x + 23, 69)], 'busb')
b += line([(16, 66), (318, 66)], 'busa') + line([(16, 69), (318, 69)], 'busb')
b += line([(318, 31), (318, 69)], 'eth')
b += box(40, 76, 92, 14, 'SW-CORE-A · Moxa EDS-G512E', ['Managed core switch A; VLANs, port security, SNMP v3; fibre ring side A'], 'fo')
b += box(196, 76, 92, 14, 'SW-CORE-B · Moxa EDS-G512E', ['Managed core switch B; second path for every dual-connected device; ring side B'], 'fo')
b += line([(86, 66), (86, 76)], 'busa') + line([(242, 69), (242, 76)], 'busb')
b += zone(10, 98, 319, 56, 'Level 1 · Control – SICAM A8000 hot standby pair (11 kV switchroom, SCADA cabinet)')
cp = ['CP-8050 processor 6MF2805-0AA00', '2 × PS-8642 power supply', 'CI-8520 Ethernet, one port per zone (VLAN 10/20/30/40)',
      'IEC 60870-5-104 server to SRV-A / SRV-B', 'IEC 61850 / Modbus TCP client to the field devices', 'Interlocks, secured breaker commands, 1 ms time stamps']
b += box(14, 105, 86, 30, 'CP-8050 A · active', cp, 'iolink')
b += box(108, 105, 86, 30, 'CP-8050 B · hot standby', cp[:3] + ['Follows A; takes over if A fails', 'Switchover time: Siemens to confirm', 'Same configuration and flash card as A'], 'iolink')
b += line([(100, 120), (108, 120)], 'hsby') + t(104, 118.6, 'HSBY', 1.5, 700, '#7a3db8', 'middle')
b += line([(57, 105), (57, 90)], 'busa') + line([(90, 105), (90, 94), (210, 94), (210, 90)], 'busb')
b += line([(122, 105), (122, 90)], 'busa') + line([(180, 105), (180, 97), (230, 97), (230, 90)], 'busb')
rows = [['1', '11 kV switchroom', 'CI-8532, copper', 'DI-8112 ×5, DO-8221 ×2, DO-8212', '87'],
        ['2', 'SCADA cabinet', 'CI-8532, copper', 'DI-8112 ×2, AI-8320', '25'],
        ['3', 'President station', 'CI-8533, fibre pair', 'DI-8112 ×3, DO-8221', '43'],
        ['4', 'PM station', 'CI-8533, fibre pair', 'DI-8112 ×3, DO-8221', '43'],
        ['5', 'BESS / inverter yard', 'CI-8533, fibre pair', 'DI-8112 ×2', '26'],
        ['6', 'Generator area', 'CI-8533, fibre pair', 'DI-8112 ×2, AI-8320', '20'],
        ['', 'Total', '', '24 modules, 27 % spare', '244']]
tb, th = table(203, 104, [7, 27, 25, 49, 12], ['Row', 'Location', 'Interface', 'Modules', 'Sig.'], rows, size=1.55, title='SICAM I/O rows (hardwired)')
b += tb
b += line([(57, 135), (57, 140), (200, 140), (200, 130), (203, 130)], 'iolink') + line([(151, 135), (151, 140)], 'iolink')
b += t(14, 145, 'SICAM I/O link: both controllers reach every row; only the active one reads inputs and drives outputs (Siemens to confirm).', 1.65, 400, GREY)
b += t(14, 148.5, 'Rows 1–2 on copper in the cabinet; rows 3–6 on dedicated fibre pairs, separate from the network ring (sheet 002).', 1.65, 400, GREY)
b += zone(10, 157, 319, 131, 'Level 0 · Field devices by location')
b += line([(14, 165), (325, 165)], 'fo') + t(170, 163.6, 'Fibre ring through the field and station switches (sheet 002)', 1.7, 400, '#b35f00', 'middle')
b += line([(40, 83), (12, 83), (12, 165), (14, 165)], 'fo') + line([(288, 83), (327, 83), (327, 165), (325, 165)], 'fo')
COLS = [
    ('11 kV SWITCHROOM', 'Core A / B', [
        ('Relays AH1 … AH7', ['IEC 61850 MMS or Modbus TCP, both core switches', 'Measurements, trips, events'], 'eth'),
        ('Panels AH1 … AH8 hardwired', ['Positions, trips, earth switch, L/R, spring, gas → row 1', 'Open / close AH1–AH7 ← DO-8221'], 'hw'),
        ('NECR AH8', ['Earthing TX + NER 63.5 Ω; breaker, earth fault → row 1'], 'hw'),
        ('Aux TX, LV board, UPS, DC', ['Fuse, TX, UPS, DC alarms → row 2', 'PM5560-AUX, UPS: Modbus TCP / SNMP'], 'hw'),
        ('E-stop and doors', ['Hardwired → row 2; display only'], 'hw')]),
    ('BESS CONTAINER', 'SW-BESS', [
        ('EMS (embedded)', ['Modbus TCP, control zone', 'Dispatches PV, battery and generators'], 'eth'),
        ('ST3340UX battery + PCS', ['3,340 kWh; read through the EMS only'], 'none'),
        ('Fire panel', ['Pre-alarm, fire, release, fault → row 5', 'Trips the battery by its own circuit'], 'hw'),
        ('BESS ACB, E-stop, door', ['Position, trip, E-stop, door → row 5'], 'hw')]),
    ('GENERATOR AREA', 'SW-GEN', [
        ('DG1 controller · 550 kVA', ['Modbus TCP, or RTU through a gateway', 'Start / stop in manual mode'], 'eth'),
        ('DG2 controller · 660 kVA', ['As DG1'], 'eth'),
        ('Generators hardwired', ['GCB, running, alarm, E-stop → row 6', 'Fuel level DG1, DG2, 4–20 mA → row 6'], 'hw'),
        ('Step-up TX, LV ACB', ['TX alarms, ACB position and trip → row 6'], 'hw'),
        ('EMS start contacts', ['Hardwired EMS → generator controllers, outside the SCADA'], 'hw')]),
    ('PV INVERTER STATION', 'SW-MV', [
        ('PLC box (Sungrow)', ['Modbus TCP; inverter data, power limit'], 'eth'),
        ('Inverters NB01 … NB04', ['SG350HX 350 kW; power line communication to the PLC box'], 'plc'),
        ("Weather logger blue'Log XM", ['Weather station only; Modbus TCP'], 'eth'),
        ('PV ACB, MCCBs, inverter TX', ['Position, trips, TX alarms → row 5'], 'hw')]),
    ('PRESIDENT STATION', 'SW-PRS', [
        ('RMU relay ST260E', ['Modbus RTU through MGate MB3170'], 'rs485'),
        ('PM5560-PRS', ['LVDB meter, Modbus TCP'], 'eth'),
        ('RMU, TX, LVDB hardwired', ['Switches, TX alarms, 10 ways → row 3', 'Commands ← DO-8221'], 'hw'),
        ('RMU UPS 2 kVA', ['On battery, fault → row 3'], 'hw')]),
    ('PM STATION', 'SW-PMS', [
        ('RMU relay ST260E', ['Modbus RTU through MGate MB3170'], 'rs485'),
        ('PM5560-PMS', ['LVDB meter, Modbus TCP'], 'eth'),
        ('RMU, TX, LVDB hardwired', ['Switches, TX alarms, 10 ways → row 4', 'Commands ← DO-8221'], 'hw'),
        ('RMU UPS 2 kVA', ['On battery, fault → row 4'], 'hw')]),
]
for i, (head, sw, items) in enumerate(COLS):
    x = 12.5 + i * 52.4
    b += line([(x + 25, 165), (x + 25, 170.5)], 'fo') + t(x + 26.5, 169.5, sw, 1.5, 700, '#b35f00')
    b += t(x, 175, head, 1.85, 700, '#3a4a5a')
    s, yend = stack(x, 177, 50.5, items)
    assert yend < 288, (head, yend)
    b += s
svg = sheet(1, 'SCADA ARCHITECTURE', 'System overview by level and location', b,
            ['eth', 'fo', 'busa', 'busb', 'iolink', 'hsby', 'rs485', 'hw', 'plc', 'vpn', STRIPE_SYM, ZONE_SYM],
            ['Architecture as SCADA Design Report Rev 1, sections 4 to 8, and Device and I/O List Rev 1. Device names and tags are used unchanged on sheets 002 to 005, the HMI and the I/O list.',
             'The embedded EMS dispatches PV, battery and generators. The CP-8050 pair monitors, executes breaker commands with interlocks and passes Admin settings to the EMS; it does not dispatch.',
             'CP-8050 A is active and B hot standby. Siemens to confirm the redundancy function and licence, the switchover time and the I/O row connection to both controllers (open point 12).',
             'Protection trips stay in the relays. Emergency stop and fire trips are hardwired and act directly on the equipment; the SCADA only shows them.',
             'Zones are separated by VLANs, separate CI-8520 ports and firewall rules. Only FW-01 connects to the outside, with VPN off by default.',
             'Quantities, models and open items: report sections 13 and 14.'])
save(1, svg)

# ===================================================================== 002 Communication network
b = zone(10, 9, 319, 31, 'Control room · SCADA zone')
CR = [('SRV-A', '10.10.10.11'), ('SRV-B', '10.10.10.12'), ('OWS-01', '10.10.10.21'), ('ENG-01', '10.10.10.31 / .99.31'), ('FW-01', '10.10.10.1'),
      ('GPS-01', '10.10.40.5'), ('UPS-01', '10.10.40.6')]
for i, (n, ip) in enumerate(CR):
    x = 14 + i * 44.4
    b += box(x, 15, 41, 12, n, [ip], 'eth')
    b += line([(x + 18, 27), (x + 18, 33)], 'busa') + line([(x + 24, 27), (x + 24, 36)], 'busb')
b += line([(16, 33), (323, 33)], 'busa') + line([(16, 36), (323, 36)], 'busb')
b += t(320, 31.6, 'Cu Cat6 S/FTP ≤ 90 m', 1.5, 400, GREY, 'end')
b += zone(10, 43, 319, 80, '11 kV switchroom · core switches, controllers and relays')
b += box(14, 50, 88, 22, 'SW-CORE-A · EDS-G512E · 10.10.99.1', ['P1 SRV-A · P2 SRV-B · P3 OWS-01 · P4 ENG-01 · P5 FW-01 · P6 GPS-01 · P7 UPS-01',
                                                             'P8 CP-8050 A X1 · P9 CP-8050 B X1 · P10 relays AH1–AH7 (port A)', 'G1 SFP fibre ring to SW-MV · G2 SFP spare',
                                                             'Trunk to SW-CORE-B on fibre; VLANs 10/20/30/40/99'], 'fo')
b += box(220, 50, 88, 22, 'SW-CORE-B · EDS-G512E · 10.10.99.2', ['P1 SRV-A · P2 SRV-B · P3 OWS-01 · P5 FW-01 (second ports)',
                                                              'P8 CP-8050 A X1b · P9 CP-8050 B X1b · P10 relays AH1–AH7 (port B)', 'P11 PM5560-AUX 10.10.30.23',
                                                              'G1 SFP fibre ring from SW-PMS · G2 SFP spare'], 'fo')
b += line([(40, 33), (40, 50)], 'busa') + line([(250, 36), (250, 50)], 'busb')
for x, n, ip in ((106, 'CP-8050 A', '.51'), (163, 'CP-8050 B', '.52')):
    b += box(x, 50, 53, 22, n + ' · CI-8520', ['X1 VLAN 10: IEC 104 to SRV-A/B (10.10.10' + ip + ')', 'X2 VLAN 20: EMS (10.10.20' + ip + ')',
                                              'X3 VLAN 30: relays, meters, MGate, DG (10.10.30' + ip + ')', 'X4 VLAN 40: PLC box, logger, UPS (10.10.40' + ip + ')', 'X5 service, ENG-01 only'], 'iolink', size=1.5)
b += line([(159, 61), (163, 61)], 'hsby')
for i in range(7):
    x = 14 + i * 26.5
    b += box(x, 82, 25, 11, 'Relay AH%d' % (i + 1), ['10.10.30.%d' % (11 + i)], 'eth', size=1.5, title_size=1.8)
    b += line([(x + 9, 82), (x + 9, 78)], 'busa') + line([(x + 15, 82), (x + 15, 76)], 'busb')
b += line([(16, 78), (196, 78), (196, 74), (60, 74), (60, 72)], 'busa') + line([(16, 76), (200, 76), (200, 75), (264, 75), (264, 72)], 'busb')
b += t(14, 98, 'Relays are dual-connected where they have two ports; otherwise to core A only. AH8 (NECR) has no relay communication; it is hardwired to row 1.', 1.55, 400, GREY)
b += box(206, 80, 102, 18, 'I/O rows (SICAM I/O link, not through the switches)', ['Rows 1 and 2: CI-8532 on copper inside the SCADA cabinet',
                                                                                    'Rows 3 to 6: CI-8533 on dedicated fibre pairs in the same trench cables as the ring',
                                                                                    'Both controllers connect to every row (Siemens to confirm)'], 'iolink', size=1.55)
b += line([(210, 72), (210, 80)], 'iolink')
b += t(14, 103.5, 'No routing between VLANs: the CP-8050 is the only device with ports in more than one zone. FW-01 is the only route to the outside.', 1.55, 700, '#3a4a5a')
b += zone(10, 110, 319, 54, 'Single-mode fibre ring · field and station switches (Moxa EDS-510E)')
FS = [('SW-MV', 'Inverter MV station · 10.10.99.10', ['G1/G2 fibre ring in / out', 'P1 PLC box · 10.10.40.21', "P2 blue'Log XM · 10.10.40.22", 'P3 spare (vendor service, off)']),
      ('SW-BESS', 'BESS container · 10.10.99.11', ['G1/G2 fibre ring in / out', 'P1 EMS · 10.10.20.31', 'P2 spare (BESS vendor service, off)']),
      ('SW-GEN', 'Generator area · 10.10.99.12', ['G1/G2 fibre ring in / out', 'P1 DG1 controller · 10.10.30.41', 'P2 DG2 controller · 10.10.30.42',
                                                  'or MGate-GEN · 10.10.30.43 if RS485']),
      ('SW-PRS', 'President station · 10.10.99.13', ['G1/G2 fibre ring in / out', 'P1 MGate-PRS · 10.10.30.61 (ST260E)', 'P2 PM5560-PRS · 10.10.30.24']),
      ('SW-PMS', 'Prime Minister station · 10.10.99.14', ['G1/G2 fibre ring in / out', 'P1 MGate-PMS · 10.10.30.62 (ST260E)', 'P2 PM5560-PMS · 10.10.30.25'])]
for i, (n, sub, ports) in enumerate(FS):
    x = 14 + i * 62.4
    b += box(x, 124, 57, 22, n, [sub] + ports, 'fo', size=1.55)
    if i < 4:
        b += line([(x + 57, 135), (x + 62.4, 135)], 'fo')
b += line([(20, 72), (20, 74.5), (12, 74.5), (12, 120), (42, 120), (42, 124)], 'fo') + line([(305, 124), (305, 120), (326, 120), (326, 61), (308, 61)], 'fo')
b += t(170, 118.6, 'Core A → SW-MV → SW-BESS → SW-GEN → SW-PRS → SW-PMS → core B · one break isolates nothing', 1.65, 400, '#b35f00', 'middle')
b += t(14, 151, 'Each field switch: 2 SFP single-mode ring ports and at least 6 copper ports. Patch panels at both ends of every fibre route.', 1.55, 400, GREY)
b += t(14, 154.6, 'Fibre routes: switchroom – President, switchroom – PM, President – PM (closes the ring); yard and generator area on spare cores. Lengths from the cable route drawings.', 1.55, 400, GREY)
b += t(14, 158.2, 'Rows 5 and 6 use spare fibre cores in the cables to SW-BESS and SW-GEN; rows 3 and 4 in the cables to the office stations.', 1.55, 400, GREY)
ta, ha = table(10, 168, [12, 26, 76, 40], ['VLAN', 'Subnet', 'Zone and devices', 'Routing'], [
    ['10', '10.10.10.0/24', 'SCADA: SRV-A/B, OWS-01, ENG-01, FW-01 inside, CP-8050 X1', 'FW-01 to outside only'],
    ['20', '10.10.20.0/24', 'Control: CP-8050 X2, EMS', 'None'],
    ['30', '10.10.30.0/24', 'Substation: relays AH1–AH7, PM5560 ×3, MGate ×2, DG controllers, CP-8050 X3', 'None'],
    ['40', '10.10.40.0/24', 'Monitoring: PLC box, blue\'Log XM, UPS, GPS-01, CP-8050 X4', 'None; read only'],
    ['99', '10.10.99.0/24', 'Switch management: core and field switches', 'ENG-01 only']], size=1.55, title='TABLE A – VLAN AND IP PLAN (PROPOSED)')
b += ta
tb2, hb = table(168, 168, [34, 44, 28, 54], ['Bus', 'Devices (Modbus ID)', 'Settings', 'Remark'], [
    ['MGate-PRS port 1', 'ST260E President (1)', '9600 8N1 (to confirm)', 'Shielded twisted pair, 120 Ω at both ends'],
    ['MGate-PMS port 1', 'ST260E Prime Minister (1)', '9600 8N1 (to confirm)', 'As above'],
    ['MGate-GEN (only if needed)', 'DG1 (1), DG2 (2)', '19200 8N1 (to confirm)', 'Only if the generator controllers are RS485 only (open point 3)']],
    size=1.55, title='TABLE B – RS485 MODBUS RTU BUSES')
b += tb2
tc, hc = table(168, 168 + hb + 3, [34, 126], ['Type', 'Specification'], [
    ['Ethernet copper', 'Cat6 S/FTP industrial, shielded RJ45, ≤ 90 m'],
    ['Network fibre', 'Single-mode OS2, 12-core armoured, LC duplex'],
    ['I/O row fibre', 'CI-8533 optical SICAM I/O link; fibre type and maximum length to confirm with Siemens'],
    ['RS485', '2-pair shielded twisted pair 120 Ω, shield earthed at the master end'],
    ['Hardwired I/O', 'Multicore 1.0 mm² screened, 110 V DC, separate from power cables']], size=1.55, title='TABLE C – CABLE TYPES')
b += tc
assert 168 + ha < 288 and 168 + hb + 3 + hc < 288, (ha, hb, hc)
svg = sheet(2, 'COMMUNICATION NETWORK', 'Topology, ports, IP plan and serial buses', b,
            ['eth', 'fo', 'busa', 'busb', 'iolink', 'hsby', 'rs485', STRIPE_SYM, ZONE_SYM],
            ['Read with sheet 001. Addresses and port numbers are proposals for approval; final values are fixed in the IP plan at the factory test.',
             'All switches managed: unused ports disabled, port security, SNMP v3 and syslog to SRV-A/B, HTTPS and SSH management on VLAN 99.',
             'No routing between VLANs. The CP-8050 is the only device with ports in more than one zone (CI-8520), and FW-01 is the only route to the outside.',
             'Ring protocol and recovery time are set at configuration (Moxa Turbo Ring or RSTP).',
             'I/O rows 3 to 6 run on dedicated fibre pairs (CI-8533), separate from the ring. Siemens to confirm whether they can be laid as a ring.',
             'All devices take time from GPS-01 by NTP. Relays and the CP-8050 time-stamp events at 1 ms.',
             'The communication schematic of BFE/PR/26/01 (sheet 15) is replaced by this sheet.'])
save(2, svg)

# ===================================================================== 003 PV interface
b = zone(10, 9, 170, 172, 'Power and signal interface – PV plant')
b += box(62, 15, 46, 12, 'GIS PANEL AH2 · PV incomer', ['VCB 630 A · relay IEC 61850 / Modbus TCP'], 'eth', size=1.55)
b += line([(85, 27), (85, 31.5)], 'power')
b += f'<circle cx="85" cy="34.5" r="3" fill="none" stroke="{INK}" stroke-width="0.4"/><circle cx="85" cy="38.5" r="3" fill="none" stroke="{INK}" stroke-width="0.4"/>'
b += t(90, 36, '1.5 MVA 11/0.8 kV Dd0', 1.7, 700) + t(90, 38.6, 'PV step-up transformer', 1.6, 400, GREY)
b += line([(85, 41.5), (85, 47)], 'power') + f'<rect x="83" y="47" width="4" height="4" fill="#fff" stroke="{INK}" stroke-width="0.4"/>'
b += t(81, 50, 'PV ACB 1250 A', 1.7, 700, anchor='end') + line([(85, 51), (85, 57)], 'power')
b += f'<line x1="18" y1="57" x2="168" y2="57" stroke="#c0392b" stroke-width="1.1"/>' + t(18, 55.4, '0.8 kV PV LV BUSBAR', 1.7, 700, '#c0392b')
b += box(126, 30, 44, 12, 'PLC box (Sungrow)', ['Inverter data on Ethernet'], 'eth', size=1.55)
b += line([(148, 42), (148, 57)], 'plc') + t(146, 53, 'PLC circuit 63 A', 1.45, 400, GREY, 'end')
b += box(126, 15, 44, 11, 'EMS (sheet 004)', ['Sets the inverter power limit'], 'none', size=1.5)
b += line([(148, 26), (148, 30)], 'vendor')
b += '<rect x="16" y="61" width="156" height="66" rx="1" fill="none" stroke="#c0392b" stroke-width="0.35" stroke-dasharray="2 1"/>' + t(170, 125.6, 'PV / INVERTER VENDOR SCOPE', 1.6, 700, '#c0392b', 'end')
INV = [('NB01', '21 strings'), ('NB02', '20 strings'), ('NB03', '20 strings'), ('NB04', '20 strings')]
for i, (n, st) in enumerate(INV):
    x = 34 + i * 38
    b += line([(x, 57), (x, 66)], 'power') + f'<rect x="{x - 2}" y="66" width="4" height="4" fill="#fff" stroke="{INK}" stroke-width="0.4"/>' + t(x + 3, 69, 'MCCB 400 A', 1.45, 400, GREY)
    b += line([(x, 70), (x, 75)], 'power')
    b += box(x - 14, 75, 28, 12, 'INV ' + n, ['SG350HX · 350 kW'], 'plc', size=1.5, title_size=1.8)
    b += line([(x, 87), (x, 100)], 'dc') + t(x + 1.5, 94, 'DC switch, SPD', 1.4, 400, GREY)
    b += box(x - 14, 100, 28, 12, st, ['26 × 720 Wp'], None, size=1.5, title_size=1.7)
    b += line([(x - 6, 75), (x - 6, 60), (148, 60), (148, 57)], 'plc') if i == 0 else line([(x - 6, 75), (x - 6, 60)], 'plc')
b += t(94, 120, 'PV ARRAY 1,516 kWp · 2,106 × 720 Wp Jinko · 81 strings', 1.8, 700, anchor='middle')
b += t(94, 123.4, 'Power line communication from each inverter to the PLC box over the AC cables', 1.55, 400, '#9b59b6', 'middle')
b += line([(87, 49), (176, 49), (176, 134)], 'hw') + line([(36, 63.5), (176, 63.5)], 'hw') + line([(88, 44), (176, 44)], 'hw')
b += t(175, 47.9, 'ACB, MCCB, TX contacts', 1.4, 400, GREY, 'end')
b += box(14, 134, 50, 12, 'SW-MV field switch', ['Fibre ring to the core switches (sheet 002)'], 'fo', size=1.55)
b += box(68, 134, 52, 12, "WS-01 · blue'Log XM", ['Weather station only; SMP12-A, WindSonic, Tamb, Tmod'], 'eth', size=1.55)
b += box(124, 134, 54, 12, 'I/O ROW 5 · yard panel', ['DI-8112; CI-8533 fibre pair to the CP-8050 pair'], 'hw', size=1.55)
b += line([(170, 42), (172, 42), (172, 128), (40, 128), (40, 134)], 'eth') + line([(68, 142), (64, 142)], 'eth')
b += box(14, 152, 80, 13, 'CP-8050 A / B (hot standby)', ['Modbus TCP client to the PLC box and blue\'Log; IEC 61850 / Modbus TCP to relay AH2; reads row 5'], 'iolink', size=1.55)
b += box(98, 152, 80, 13, 'SICAM SCC servers A / B', ['PV screen, trends, alarms; Admin writes only where the EMS allows'], 'eth', size=1.55)
b += line([(39, 146), (39, 152)], 'fo') + line([(151, 146), (151, 149), (60, 149), (60, 152)], 'iolink') + line([(94, 158.5), (98, 158.5)], 'eth')
b += num(124, 38, '1') + num(66, 131.5, '2') + num(181, 66, '3') + num(59, 21, '4')
b += t(14, 170, 'INTERFACE POINTS (SCADA SCOPE STARTS HERE):', 1.8, 700)
b += tw(14, 173.5, '① PLC box Ethernet port, Modbus TCP · ② blue\'Log XM Ethernet port · ③ PV ACB, MCCB and inverter transformer contacts at the row 5 panel terminals · ④ Relay AH2 Ethernet port (sheet 002)', 164, 1.6)[0]
tc, hc = table(10, 184, [44, 56, 68], ['Item', 'PV / inverter vendor', 'SCADA contractor'], [
    ['PLC box Modbus register map', 'Supply', 'Implement'], ['Settings that may be written remotely', 'Define and confirm in writing', 'Implement, Admin role only'],
    ['PLC box Ethernet port and address', 'Provide the port', 'Issue the address; cable to SW-MV'], ['MCCB, ACB and TX contacts', 'Wire to a terminal strip', 'Wire to the row 5 panel'],
    ['Weather station sensors and logger', 'Supply, install', 'Integrate over Modbus TCP'], ['Default passwords', 'Change and hand over', 'Record in the site register'],
    ['Interface test', 'Attend', 'Lead and record']], size=1.55, title='TABLE C – INTERFACE RESPONSIBILITY')
b += tc
ta, ha = table(184, 9, [9, 57, 15, 34, 29], ['Dir.', 'Signal (I/O list tags)', 'Type', 'Source / path', 'Update'], [
    ['IN', 'P, Q, U and I L1–L3, f, PF (NBxx-P … -PF)', 'AI com', 'PLC box, Modbus TCP', '2 s'],
    ['IN', 'DC U, I, P (NBxx-U-DC, -I-DC, -P-DC)', 'AI com', 'PLC box', '5 s'],
    ['IN', 'Energy today and total (NBxx-E-DAY, -E-TOT)', 'AI com', 'PLC box', '60 s'],
    ['IN', 'Internal temperature, insulation (NBxx-T-INT, -R-ISO)', 'AI com', 'PLC box', '10 s'],
    ['IN', 'State, fault and alarm codes (NBxx-STATE, -FLT-CODE, -ALM-CODE)', 'ST com', 'PLC box', '2 s'],
    ['IN', 'Inverter link healthy (NBxx-COMM-OK, PLCBOX-NBxx-COMM)', 'DI com', 'PLC box', '5 s'],
    ['OUT', 'Active power limit (NBxx-P-LIM-SP)', 'AO com', 'Admin, only if the EMS allows', 'on change'],
    ['OUT', 'Start / stop (NBxx-START-STOP-CMD)', 'DO com', 'Admin, only if the EMS allows', 'command'],
    ['IN', 'Irradiance, wind, ambient and module temperature (WS-*)', 'AI com', "blue'Log XM", '5 s'],
    ['IN', 'PV ACB closed / tripped (PV-ACB-CLSD, -TRIP)', 'DI', 'Row 5', 'event, 1 ms'],
    ['IN', 'Inverter AC breaker tripped (NB01 … NB04-MCCB-TRIP)', 'DI', 'Row 5', 'event, 1 ms'],
    ['IN', 'Inverter transformer alarms and trips (T-INV-*)', 'DI', 'Row 5', 'event, 1 ms'],
    ['IN', 'AH2 measurements, trips, events (AH2-*)', 'AI/DI com', 'Relay AH2', '1 s / event']], size=1.5, title='TABLE A – SIGNAL EXCHANGE (PER INVERTER UNLESS STATED)')
b += ta
b += tw(184, 9 + ha + 3.2, 'Signal count (I/O list Rev 1): 12 hardwired DI · 94 read and 8 write communication points (inverters, PLC box, weather station) · plus relay AH2.', 144, 1.55, fill=GREY)[0]
tb2, hb = table(184, 9 + ha + 9, [38, 106], ['Function', 'Description'], [
    ['Curtailment', 'The EMS limits the inverters through the PLC box when the battery is full or a generator would fall below minimum load; ramped, not tripped. The SCADA shows it (EMS-PV-CURT).'],
    ['Writes from the SCADA', 'Power limit and start / stop: Admin role only, and only if the EMS supplier allows remote writes (open point 1); otherwise display only.'],
    ['Close permissive AH2', 'The 11 kV busbar must be live, formed by the battery or a generator; PV cannot energise the busbar.'],
    ['Loss of the grid former', 'Inverters trip on their own voltage and frequency protection (anti-islanding).'],
    ['PLC box link lost', 'Level 2 alarm; values shown stale (###); commands to the inverters blocked.'],
    ['Performance ratio', 'Calculated in the SCADA from PV energy and plane-of-array irradiance.']], size=1.5, title='TABLE B – CONTROL FUNCTIONS AND BEHAVIOUR')
b += tb2
assert 184 + hc < 288 and 9 + ha + 9 + hb < 288, (hc, ha, hb)
svg = sheet(3, 'PV INTERFACE', 'Signal exchange, control and scope boundary', b, ['power', 'dc', 'plc', 'eth', 'fo', 'iolink', 'hw', 'vendor', STRIPE_SYM],
            ['Ratings from the overall SLD and inverter wiring diagram of BFE/PR/26/01. NB01 is taken as the inverter with 21 strings; confirm (drawing review item 2).',
             'Inverters communicate by power line communication over the AC cables to the PLC box, then Ethernet to SW-MV. The blue\'Log XM serves the weather station only.',
             'PV dispatch and curtailment stay with the EMS. The SCADA writes only settings the EMS supplier permits, Admin role only.',
             'Update rates are proposals, to be fixed with the PLC box register map.',
             'Tags as in the I/O list Rev 1 (NB01 … NB04, PLCBOX-, PV-, T-INV-, WS-).'])
save(3, svg)

# ===================================================================== 004 BESS interface
b = zone(10, 9, 170, 172, 'Power and signal interface – battery energy storage')
b += box(62, 15, 46, 12, 'GIS PANEL AH3 · BESS incomer', ['VCB 630 A · relay IEC 61850 / Modbus TCP'], 'eth', size=1.55)
b += line([(85, 27), (85, 31.5)], 'power')
b += f'<circle cx="85" cy="34.5" r="3" fill="none" stroke="{INK}" stroke-width="0.4"/><circle cx="85" cy="38.5" r="3" fill="none" stroke="{INK}" stroke-width="0.4"/>'
b += t(90, 36, '1 MVA 11/0.69 kV Dd0', 1.7, 700) + t(90, 38.6, 'BESS transformer', 1.6, 400, GREY)
b += line([(85, 41.5), (85, 47)], 'power') + f'<rect x="83" y="47" width="4" height="4" fill="#fff" stroke="{INK}" stroke-width="0.4"/>'
b += t(81, 50, 'BESS ACB 1000 A', 1.7, 700, anchor='end') + line([(85, 51), (85, 57)], 'power')
b += f'<line x1="40" y1="57" x2="130" y2="57" stroke="#c0392b" stroke-width="1.1"/>' + t(40, 55.4, '0.69 kV BESS LV BUSBAR', 1.7, 700, '#c0392b')
b += '<rect x="16" y="61" width="156" height="68" rx="1" fill="none" stroke="#c0392b" stroke-width="0.35" stroke-dasharray="2 1"/>' + t(170, 64.5, 'BESS VENDOR SCOPE (CONTAINER)', 1.6, 700, '#c0392b', 'end')
for i, x in enumerate((60, 110)):
    b += line([(x, 57), (x, 66)], 'power') + f'<rect x="{x - 2}" y="66" width="4" height="4" fill="#fff" stroke="{INK}" stroke-width="0.4"/>' + t(x + 3, 69, '400 A', 1.45, 400, GREY)
    b += line([(x, 70), (x, 74)], 'power')
    b += box(x - 17, 74, 34, 12, 'PCS-%d' % (i + 1), ['Grid-forming converter'], 'none', size=1.5, title_size=1.8)
    b += line([(x, 86), (x, 92)], 'dc')
    b += box(x - 17, 92, 34, 13, 'Racks %s · BMS' % ('1–4' if i == 0 else '5–8'), ['LFP 3.2 V 314 Ah'], 'none', size=1.5, title_size=1.8)
b += t(85, 110, '3,340 kWh total · 416S8P · PCS and rack count per vendor', 1.6, 700, anchor='middle')
b += box(20, 113, 46, 14, 'BESS-EMS', ['Energy management; dispatch; Modbus TCP server'], 'eth', size=1.5)
b += box(70, 113, 50, 14, 'Fire panel and suppression', ['Smoke, heat, off-gas; trips the battery by its own circuit'], 'hw', size=1.5)
b += box(124, 113, 46, 14, 'E-stop, door, HVAC', ['Container E-stop and door contacts'], 'hw', size=1.5)
b += line([(30, 113), (30, 80), (43, 80)], 'vendor') + t(31, 90, 'EMS ↔ PCS, BMS', 1.4, 400, '#c0392b')
b += box(126, 15, 44, 13, 'DG1 / DG2 controllers', ['EMS start contacts, hardwired, outside the SCADA'], 'hw', size=1.5)
b += line([(20, 120), (14, 120), (14, 29.5), (148, 29.5), (148, 28)], 'vendor')
b += t(16, 44, 'EMS start', 1.4, 400, '#c0392b') + t(16, 46.2, 'contacts', 1.4, 400, '#c0392b')
b += line([(87, 49), (176, 49), (176, 134)], 'hw') + line([(95, 127), (95, 131), (176, 131)], 'hw') + line([(170, 118), (176, 118)], 'hw')
b += box(14, 134, 50, 12, 'SW-BESS field switch', ['Fibre ring to the core switches (sheet 002)'], 'fo', size=1.55)
b += box(124, 134, 54, 12, 'I/O ROW 5 · yard panel', ['DI-8112; CI-8533 fibre pair to the CP-8050 pair'], 'hw', size=1.55)
b += line([(30, 127), (30, 134)], 'eth')
b += box(14, 152, 80, 13, 'CP-8050 A / B (hot standby)', ['Modbus TCP client to the EMS; heartbeat supervision; IEC 61850 / Modbus TCP to relay AH3; reads row 5'], 'iolink', size=1.55)
b += box(98, 152, 80, 13, 'SICAM SCC servers A / B', ['Battery and energy management screens; Admin settings to the EMS'], 'eth', size=1.55)
b += line([(39, 146), (39, 152)], 'fo') + line([(151, 146), (151, 149), (60, 149), (60, 152)], 'iolink') + line([(94, 158.5), (98, 158.5)], 'eth')
b += num(25, 131, '1') + num(181, 120, '2') + num(181, 49, '3') + num(59, 21, '4') + num(152, 32, '5')
b += t(14, 170, 'INTERFACE POINTS:', 1.8, 700)
b += tw(14, 173.5, '① EMS Ethernet port · ② fire panel, E-stop and door volt-free contacts at the container terminal strip · ③ BESS ACB auxiliary contacts · ④ relay AH3 Ethernet port (sheet 002) · ⑤ EMS start contacts to the generator controllers (vendor, outside the SCADA)', 164, 1.6)[0]
tdd, hd = table(10, 184, [48, 56, 64], ['Item', 'BESS vendor', 'SCADA contractor'], [
    ['EMS Modbus point table and heartbeat', 'Supply', 'Implement; supervise heartbeat'], ['Settings that may be written remotely', 'Define and confirm in writing', 'Implement, Admin role only'],
    ['Network port and address', 'Provide the port; agree the address', 'Issue the address; cable to SW-BESS'], ['Fire, E-stop and door contacts', 'Volt-free contacts at a terminal strip', 'Wire to the row 5 panel'],
    ['Alarm list and levels', 'Provide the alarm list', 'Map to levels 1 to 3'], ['Fire and suppression system', 'Supply, commission', 'Monitor only; no remote reset'],
    ['Interface test', 'Attend with the EMS in test mode', 'Lead and record']], size=1.5, title='TABLE D – INTERFACE RESPONSIBILITY')
b += tdd
ta, ha = table(184, 9, [9, 64, 15, 28, 28], ['Dir.', 'Signal (I/O list tags)', 'Type', 'Path', 'Update'], [
    ['IN', 'SOC, SOH, energy charged and discharged (BESS-SOC, -SOH, -E-CHG, -E-DIS)', 'AI com', 'EMS', '5 s'],
    ['IN', 'Charge and discharge power limits (BESS-P-CHG-LIM, -P-DIS-LIM)', 'AI com', 'EMS', '1 s'],
    ['IN', 'P, Q, DC U and I (BESS-P, -Q, -U-DC, -I-DC)', 'AI com', 'EMS', '1 s'],
    ['IN', 'Cell voltage and temperature max / min (BESS-U-CELL-*, -T-CELL-*)', 'AI com', 'EMS', '5 s'],
    ['IN', 'PCS, BMS and cooling state, racks online, DC contactors', 'ST/DI com', 'EMS', '2 s'],
    ['IN', 'Alarm levels 1–3, container fire, combiner panels (BESS-ALM-*, -FIRE, -BCP*)', 'DI com', 'EMS', '1 s'],
    ['IN', 'Power balance, bus U and f, mode, state, generator request, curtailment (EMS-*)', 'AI/DI com', 'EMS', '1 s'],
    ['IN/OUT', 'Heartbeat (EMS-HEARTBEAT)', 'AI com', 'EMS ↔ CP-8050', '1 s'],
    ['OUT', 'Mode, SOC min / max, generator start / stop thresholds, power limit (EMS-*-SP, EMS-MODE-CMD)', 'AO com', 'Admin', 'on change'],
    ['OUT', 'C-rate limit (Admin); fault reset level 3 (Operator), levels 1–2 (Admin)', 'DO com', 'Operator / Admin', 'command'],
    ['IN', 'BESS ACB closed / tripped (BESS-ACB-CLSD, -TRIP)', 'DI', 'Row 5', 'event, 1 ms'],
    ['IN', 'Fire panel: pre-alarm, fire, release, fault, agent low, isolated, manual release, supply (FIRE-*)', 'DI', 'Row 5', 'event, 1 ms'],
    ['IN', 'E-stop BESS area, container door (ESTOP-BESS, DOOR-BESS)', 'DI', 'Row 5', 'event, 1 ms'],
    ['IN', 'AH3 measurements, trips, events (AH3-*)', 'AI/DI com', 'Relay AH3', '1 s / event']], size=1.45, title='TABLE A – SIGNAL EXCHANGE SCADA ↔ BESS')
b += ta
y = 9 + ha + 2.8
b += tw(184, y, 'Signal count (I/O list Rev 1): 12 hardwired DI · 41 read and 9 write communication points (battery and EMS) · plus relay AH3.', 144, 1.5, fill=GREY)[0]
tb2, hb = table(184, y + 4.5, [30, 36, 42, 36], ['Mode', 'Battery', 'PV', 'Generators'], [
    ['Day, PV surplus', 'Forms the grid, charging', 'Full; curtailed when the battery is full', 'Off'],
    ['Day, PV shortfall / night', 'Forms the grid, discharging', 'Full / off', 'Off'],
    ['Low battery (SOC < 20 %)', 'Charging from the generator', 'Full if available', 'One running; second above 80 % load'],
    ['Generator only', 'Off', 'Limited to keep the generator above minimum load', 'Running, forming the grid'],
    ['Manual', 'As commanded', 'As commanded', 'As commanded']], size=1.45, title='TABLE B – OPERATING MODES (EMS)')
b += tb2
tc, hc = table(184, y + 4.5 + hb + 2, [40, 104], ['Event', 'Response'], [
    ['EMS heartbeat lost', 'Level 1 alarm; generators start on the dead busbar and supply the plant; battery off until the EMS is restored.'],
    ['Battery fault', 'EMS starts a generator and moves to generator-only mode.'],
    ['Fire in the container', 'Hardwired trip of the battery; suppression releases; EMS starts a generator; no remote reset.'],
    ['E-stop pressed', 'Hardwired stop of battery, PV and generators; reset locally.'],
    ['EMS link lost', 'Level 2 alarm; values shown stale; writes blocked.'],
    ['AH3 protection trip', 'Relay opens AH3; remote reclose blocked until reset at the relay.']], size=1.45, title='TABLE C – FAILURE BEHAVIOUR')
b += tc
assert 184 + hd < 288 and y + 4.5 + hb + 2 + hc < 288, (hd, hb, hc, y)
svg = sheet(4, 'BESS INTERFACE', 'Signal exchange, modes and scope boundary', b, ['power', 'dc', 'eth', 'fo', 'iolink', 'hw', 'vendor', STRIPE_SYM],
            ['Ratings from the overall SLD of BFE/PR/26/01: 3.34 MWh LFP 416S8P, 1 MVA 11/0.69 kV, 2 × 400 A to the PCS. PCS and rack count, rating and the EMS make to be confirmed by the vendor.',
             'The EMS dispatches; thresholds (start below 20 %, stop at 80 %, second generator above 80 % load) are proposed starting values, set with the EMS supplier.',
             'The SCADA never releases or resets the fire suppression; it monitors only. Hardwired trips act without the controllers or communication.',
             'Update rates are proposals, to be fixed with the EMS point table (open point 1).',
             'Tags as in the I/O list Rev 1 (BESS-, EMS-, FIRE-, ESTOP-BESS, DOOR-BESS).'])
save(4, svg)

# ===================================================================== 005 SCADA overview SLD
b = zone(10, 9, 319, 157, 'SCADA overview screen – follows the overall SLD of BFE/PR/26/01 (values illustrative)')
b += image(13, 14, 250, 148.4, os.path.join(ROOT, 'docs', 'Attachment_E_Screens', 'E01_plant_overview.png'))
th_, hh = table(266, 14, [12, 48], ['Level', 'Screens'], [
    ['1 Plant', 'Overview (this sheet)'], ['2 Area', '11 kV switchboard, President and PM stations, PV, battery, generators, energy management, auxiliaries'],
    ['3 Function', 'Alarms, event log, trends, reports, communication status, I/O list, users'], ['4 Pop-ups', 'Breaker faceplate, setpoint entry, meter details']],
    size=1.5, title='SCREEN HIERARCHY')
b += th_
ta, ha = table(10, 175, [36, 70, 54], ['Symbol', 'Status and measurement tags', 'Source'], [
    ['AH1 … AH8 breaker', 'AHn-CB-OPEN, -CB-CLSD, -CB-TRIP', 'Row 1 DI, hardwired'],
    ['AH1 … AH7 values', 'AHn-P, -I-L1 … -L3, -U-L1, -E-IMP', 'Relay AHn, IEC 61850 / Modbus TCP'],
    ['AH1 … AH7 command', 'AHn-CB-OPEN-CMD, -CB-CLOSE-CMD', 'Row 1 DO-8221, select and confirm'],
    ['Earth switch', 'AHn-ES-CLSD', 'Row 1 DI'],
    ['DG1 / DG2', 'DGn-P, DGn-RUN, DGn-GCB-CLSD, DGn-MODE', 'Generator controller; row 6'],
    ['DG step-up LV ACB', 'GEN-ACB-CLSD, -TRIP', 'Row 6 DI'],
    ['PV ACB and inverters', 'PV-ACB-CLSD; NBxx-P, NBxx-STATE', 'Row 5 DI; PLC box'],
    ['BESS ACB and battery', 'BESS-ACB-CLSD; BESS-SOC, -P, -PCS-STATE', 'Row 5 DI; EMS'],
    ['RMU and LVDB', 'PRS/PMS-RS1-, -RS2-, -CB-CLSD, -LV-INC-CLSD, -LV-P', 'Rows 3 and 4; PM5560'],
    ['Auxiliary supply', 'T-AUX-FUSE, AUXLV-INC-CLSD, AUXLV-P', 'Row 2; PM5560-AUX'],
    ['NECR AH8', 'AH8-CB-CLSD, AH8-NER-EF', 'Row 1 DI'],
    ['Busbar kV and Hz', 'EMS-U-BUS, EMS-F-BUS', 'EMS']], size=1.45, title='TABLE A – SYMBOL TO SIGNAL REFERENCE')
b += ta
tb2, hb = table(176, 175, [40, 112], ['Element', 'Convention'], [
    ['Breaker closed', 'Red filled symbol, "CLOSED" (as the screens already used on site)'], ['Breaker open', 'Green filled symbol, "OPEN"'],
    ['Breaker tripped', 'Amber, "TRIPPED", level 1 alarm'], ['Energised / de-energised', 'Dark blue / grey conductor'],
    ['Stale value', '### in magenta, never shown as live'], ['Alarm levels', '1 red · 2 orange · 3 yellow; banner shows the newest unacknowledged alarm']],
    size=1.45, title='TABLE B – SYMBOL AND COLOUR CONVENTIONS')
b += tb2
tc, hc = table(176, 175 + hb + 2, [40, 112], ['Action', 'Result'], [
    ['Click a breaker', 'Faceplate: status, measurements, live interlocks, select-before-operate'],
    ['Command', 'Select, then confirm within 30 s; the CP-8050 checks interlocks and local/remote'],
    ['Roles', 'Operator: monitor, acknowledge, switch, generator start / stop in manual, reset level 3. Admin: also EMS settings and modes, users, VPN'],
    ['Logging', 'Every command, setting change and login stored with user and time']], size=1.45, title='TABLE C – OPERATOR INTERACTION')
b += tc
assert 175 + ha < 288 and 175 + hb + 2 + hc < 288, (ha, hb, hc)
legend5 = [('<rect x="{x}" y="{y}" width="4" height="3" fill="#d22f27"/>', 'Breaker closed'), ('<rect x="{x}" y="{y}" width="4" height="3" fill="#2e9e4a"/>', 'Breaker open'),
           ('<rect x="{x}" y="{y}" width="4" height="3" fill="#e0a100"/>', 'Breaker tripped'), ('<rect x="{x}" y="{y}" width="9" height="0.9" fill="#1f4e8c"/>', 'Energised conductor'),
           ('<rect x="{x}" y="{y}" width="9" height="0.9" fill="#a6afb8"/>', 'De-energised conductor')]
svg = sheet(5, 'SCADA OVERVIEW SLD', 'HMI overview screen and signal reference', b, legend5,
            ['Screen captured from the HMI demonstration (hmi/index.html). Values are simulated and for illustration only.',
             'Layout follows the overall SLD and 11 kV switchgear configuration of BFE/PR/26/01.',
             'Tags follow the Device and I/O List Rev 1.',
             'Breaker status comes from hardwired auxiliary contacts and is confirmed by the relay. Operators verify the position locally before working on equipment.',
             'The final screens are built in SICAM SCC to the same layout and content.'])
save(5, svg)
print('wrote 5 sheets to', OUT)
