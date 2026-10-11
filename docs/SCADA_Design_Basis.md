# Villa Somalia Hybrid Power Plant – SCADA Design Basis

**Project:** Solarization Villa Somalia · **Client:** Ministry of Energy & Water Resources – Somalia
**Contractor:** Blueflag Energy Co. Ltd · **Drawing set analysed:** BFE/PR/26/01 (`VILLA_SOMALIA_05_10_2026.pdf`, 25 sheets)
**Status:** For approval – HMI V1.0

---

## 1. What was analysed

| Sheet(s) | Title | Used for SCADA |
|---|---|---|
| 1, 3 | General layout / legend | Equipment locations, fire-zone map, NECR, DG positions |
| 2, 4–6 | String layout, LV cable route, earthing grid | String naming NB0x-yy |
| 7 | Inverter wiring diagram | 4 × SG350HX, 81 strings × 26 modules, MPPT groups |
| **13** | **Overall SLD** | Topology of every screen, ratings of VCBs, ACBs, transformers, DGs, PV, BESS, LVDBs |
| **14** | **11 kV switchgear config** | AH1–AH8 panel usage, VCB/isolator ratings, CTs, ZSCT, VPIS, arresters |
| **15** | **Communication schematic** | Inverters → power-line carrier (PLC) → PLC box → Ethernet switch; weather station (only) → blue'Log XM 5000 → Ethernet switch; switch → "Powerplant RTU" |
| 16 | Weather station mast | Sensors |
| **17** | **Transformer stations** | President / P.M. RMUs (GIS-12, AH1–AH3, ST260E relay, 2 kVA UPS, 630 kVA Dyn11) |
| 8–12, 18–25 | LPS, structures, MMS, trenches, GIS room, battery cabin | Civil – not SCADA relevant |

### Plant summary (from the drawings)
* **11 kV GIS combiner panel**, 1250 A busbar, 8 panels: AH1 DG sets · AH2 PV in · AH3 BESS in · AH4 OUT 1 (President) · AH5 SAT feeder · AH6 OUT 2 (P.M.) · AH7 spare · AH8 NECR feeder. VCB 630 A 31.5 kA, three-position switch 630 A 20 kA, VPIS DXN-12Q, arresters HY5WS-17/50.
* **PV:** 1,516.32 kWp DC / 1.4 MW AC – 2106 × Jinko 720 Wp, 81 strings × 26, 4 × Sungrow SG350HX, MCCB 400 A each, 1.5 MVA 11/0.8 kV Dd0 TX, LV ACB 1250 A.
* **BESS:** 3.34 MWh LFP (416S8P, 3.2 V 314 Ah), 2 PCS units (400 A breakers), 1 MVA 11/0.69 kV Dd0 TX, ACB 1000 A. Grid-forming.
* **DGs:** DG1 550 kVA (ACB 800 A), DG2 660 kVA (ACB 1000 A) on a common 0.4 kV bus, 1.5 MVA 11/0.4 kV Dyn11 step-up.
* **Loads:** two remote GIS-12 RMUs + 630 kVA 11/0.4 kV Dyn11 ONAN TX + 10-way LVDB (ACB 1000 A, MCCB 250 A) for the Offices of the President and the Prime Minister.
* **Auxiliaries:** SAT 100 kVA via XRNT-3A fuse → 200 A aux panel; 2 kVA UPS in each RMU.
* **Neutral earthing:** earthing transformer + NER 63.5 Ω / 100 A / 10 s on AH8 (11 kV/√3 ÷ 100 A = 63.5 Ω ✔).
* **No utility grid connection is shown** → islanded microgrid, BESS is the grid-forming master (as on the reference DHYBRID screen "#4 Grid Forming (VS)").

---

## 2. Client comments → where they are answered

| # | Client requirement | Answer in this submission | Status |
|---|---|---|---|
| 1 | Complete SCADA design aligned with BESS and PV, GIS combiner, LVDBs, generators, etc. | HMI with 23 screens covering every item of the SLD (Overview, 11 kV GIS, Protection & NECR, Remote RMUs, Generators, BESS, Racks, PV inverters, Strings, Weather, President LVDB, P.M. LVDB, Aux & UPS, Fire, PPC, Sequences, Network, Alarms, Events, Trends, I/O list, Users) | **Done** (HMI V1.0) |
| 2 | Complete I/O list – all analogue & digital signals of the entire plant: VCBs, GIS relays, inverter transformers, RMU, DGs, combiner panels, weather station, UPS, aux power, fire detection & suppression | `docs/IO_List.csv` – **1,164 points** (576 AI, 503 DI, 20 AO, 65 DO) with source device, protocol, address / IEC 61850 LN, alarm priority and limits. Generated from the same tag database that drives the screens (`node tools/export-io-list.js`), and browsable live on the *I/O LIST* screen | **Done** – addresses to be finalised with vendor register maps |
| 3 | Communication architecture, protocols, network topology, cybersecurity, integration with GIS, LVDBs, generators, PV, BESS | *OVERVIEW → Network & Cybersecurity* screen + §4 below | **Proposed** – for approval |
| 4 | Data sheets for PPC controllers, field devices, servers, HMI and operational sequence | Operational sequences: *PPC → Operating Sequences* screen + §5. Data-sheet register: §6 | Sequences **done**; data sheets **to be supplied by vendors** |

### I/O point count by area

| Area | AI | DI | AO | DO |
|---|---:|---:|---:|---:|
| 11 kV GIS combiner panel (8 panels, bus, NECR, DC, room) | 118 | 167 | 0 | 24 |
| Transformers (6) | 18 | 31 | 0 | 0 |
| Remote RMUs (President / P.M.) | 8 | 40 | 0 | 4 |
| LV distribution boards (2 × 10-way + aux panel) | 73 | 76 | 0 | 6 |
| Diesel generators | 44 | 44 | 2 | 12 |
| PV plant / inverters (incl. 81 string currents, 48 MPPT voltages) | 195 | 38 | 8 | 10 |
| Weather station | 9 | 2 | 0 | 0 |
| BESS (system, 2 PCS, 8 racks, HVAC) | 92 | 37 | 4 | 5 |
| Fire detection & suppression (5 zones) | 2 | 35 | 0 | 2 |
| UPS & auxiliary | 3 | 12 | 0 | 0 |
| Communications & cybersecurity | 1 | 19 | 0 | 0 |
| Power plant controller | 13 | 2 | 6 | 2 |

| **Total (1,164)** | **576** | **503** | **20** | **65** |

(The I/O LIST screen and `Plant Information` screen always show the live count.)

---

## 3. Drawing review – items to resolve before resubmission

| # | Sheet | Finding | Proposed action |
|---|---|---|---|
| 1 | All title blocks | "PROPOSED CAPACITY : 1.516kWp" | Correct to **1.516 MWp** |
| 2 | 7 Inverter wiring | NB01 table lists 21 strings (one row labelled *NB03-20*) but is annotated 374.4 kW; the NB03/NB04 box is annotated **393.12 kW** (= 21 strings) with only 20 rows. Total 81 strings is consistent | Confirm which inverter carries 21 strings and fix labels. HMI currently assumes NB01 = 21 |
| 3 | 15 Comm. schematic | All four inverters labelled "NBO-01 SGC350HX-20" | Rename NB01…NB04, model **SG350HX** |
| 4 | 13 SLD legend | "Inverter Sungrow SGX350"; revision 03 "Inverters upgrade to 150kW" | SG350HX / 350 kW |
| 5 | 14 Switchgear config | AH7 and AH8 are both designated **QL17 / QF17** | AH8 → QL18 / QF18 (used in HMI) |
| 6 | 14 Switchgear config | AH5 SAT feeder has no ZSCT and no surge arrester; AH8 CT ratio 1250/1 for an NER feeder | Confirm |
| 7 | 13 SLD | DG2 ACB Icu "66 kA" vs DG1 "65 kA"; ACB Ir/Isd "xx" | Match actual ACB data on site (as noted on drawing) |
| 8 | 15 Comm. schematic | Only inverters and weather station shown. **GIS relays, BESS EMS/PCS/BMS, DG controllers, RMUs, LVDB meters, fire panel, UPS, PPC, servers, firewall and time sync are missing**; "Powerplant RTU" undefined | Replace with the architecture in §4 |
| 9 | 13 / 15 | Inverter communication is **power-line carrier (PLC)** over the AC cables to the PLC box (63 A "PLC Communication Circuit" on the PV LV bus), then Ethernet to the switch. Sheet 15 draws RS485 IN/OUT daisy-chain links instead | Redraw sheet 15 as PLC over AC cables → PLC box → Ethernet; keep RS485 only if retained as a commissioning / backup port |
| 10 | 13/14 | GIS feeder protection relay make/model not stated (RMUs use Zhuhai Strom ST260E) | Select relay with IEC 61850 Ed.2 (MMS + GOOSE) |
| 11 | 13 | Step-up transformers (1.5 MVA DG, 1.5 MVA PV, 1 MVA BESS) – oil or dry type, temperature / Buchholz devices not shown | Confirm; I/O list includes temperature, Buchholz/PRD, oil level |
| 12 | 13 | All 11 kV sources are delta on the HV side → the 11 kV system is earthed **only** through AH8 NECR | Add interlock / alarm: AH3 and AH1 should not energise the bus with AH8 open (black-start step 3 closes AH8 first) |
| 13 | 13 | Remote RMUs at the President / P.M. offices – no communication medium shown | Single-mode fibre laid in the 11 kV cable trenches, ring topology |
| 14 | – | DG controller, BESS EMS/PCS, PPC, SCADA server, fire panel and UPS vendors not stated | Provide data sheets (§6) |

---

## 4. Communication architecture (proposed)

Purdue-model zoning to IEC 62443-3-2 (shown live on the *Network & Cybersecurity* screen):

* **Level 3.5 – DMZ:** NGFW/VPN gateway with IDS & DPI (Modbus/IEC 61850), read-only historian replica / client portal, meteocontrol VCOM via outbound-only 4G router.
* **Level 2 – Control room:** redundant SCADA servers A/B (hot standby), historian, 2 operator HMI workstations, engineering workstation, GPS time server (NTP + PTP IEEE 1588), 3 kVA SCADA UPS; two managed L3 core switches in an RSTP/PRP ring.
* **Level 1 – Station:** PPC (redundant CPU), 8 GIS feeder relays on an IEC 61850 station bus (PRP/HSR), blue'Log XM 5000 + Multi I/O + Fieldbus Ext (weather station only), inverter PLC box (power-line carrier from the PV inverters, Ethernet uplink), BESS EMS/PCS, DG controllers, aux PLC/DC charger, meter gateway, fire alarm panel, fibre field switches at the ESS cabin and DG/NECR area.
* **Level 0 – Field:** SG350HX inverters (power-line carrier over the 0.8 kV AC cables to the PLC box), weather sensors (SMP12-A, Gill WindSonic, PT1000 ambient & module), BMS racks, genset ECUs, LV meters; remote RMUs (ST260E + managed switch + UPS) on single-mode fibre.

| Equipment | Protocol | Medium | Update |
|---|---|---|---|
| GIS relays AH1–AH8 | IEC 61850 MMS reports, GOOSE for interlocks/intertrip | Fibre, PRP | event + 1 s integrity |
| Remote RMU ST260E | Modbus TCP (IEC 61850 if supported) | SM fibre ring | 1 s |
| PV inverters | Power-line carrier (PLC) → PLC box → Ethernet / Modbus TCP | 0.8 kV AC cables + Cat6 | 5 s |
| Weather station (only device on the blue'Log) | Fieldbus Ext → blue'Log XM 5000 → Modbus TCP | RS485 / PT1000 | 1 s, 1 min avg |
| BESS EMS / PCS / BMS | Modbus TCP (IEC 60870-5-104 optional) | Fibre | 200 ms control / 1 s |
| DG controllers | Modbus TCP | Fibre / Cat6 | 500 ms |
| LV meters, ACB trip units | Modbus RTU via gateway | RS485 | 1 s |
| Fire alarm panel | Modbus TCP + hard-wired cause & effect | Cat6 + control cable | 1 s |
| UPS, switches | SNMP v3 | Cat6 | 10 s |
| Upstream / remote | OPC UA (encrypted), HTTPS, IPsec VPN | via DMZ | – |

**Cybersecurity provisions:** zones & conduits with default-deny firewalls; no direct Internet to L1/L2; MFA VPN to a jump host with session recording; RBAC (Viewer / Operator / Engineer / Admin) with individual AD/LDAP accounts; tamper-evident audit trail to syslog/SIEM; select-before-operate and interlocks on all switching, earthing switches local-only; device hardening (unused ports off, SNMP v3, no default passwords, no Telnet/HTTP); application whitelisting and USB lock-down; patch & vulnerability management; daily/weekly configuration backups with an off-line copy; industrial IDS on the core mirror port; physical access control & CCTV on its own VLAN; cybersecurity FAT/SAT and penetration test; IEC 62351 where supported.

---

## 5. Operational sequences (PPC)

Implemented in the simulator (`hmi/js/sim.js`) and shown live on *PPC → Plant Controller / Operating Sequences*.

1. **Normal – PV + BESS:** BESS PCS grid-forming (VSG droop) sets 11 kV V/f; PV at MPPT; PPC reduces the inverter P-limit when SOC ≥ curtailment SOC (95 %) or the BESS charge limit is reached.
2. **DG assist / recharge:** SOC < 25 % or load > 90 % of BESS discharge limit → start lead DG (DG1, else DG2): crank → warm-up 20 s → synchronise on the 0.4 kV bus → close Q1/Q2 → load to 75 % and recharge BESS. Second DG if residual load > BESS limit + 400 kW. Stop at SOC > 80 % after 30 min minimum run → open ACB → 5 min cool-down.
3. **BESS unavailable:** lead DG grid-forming, lag DG load-shares; PV limited to keep DG ≥ 30 % (reverse power 32 on AH1); load shedding if load > DG capacity. When the BESS becomes available again the PPC re-synchronises the PCS and closes AH3 automatically.
4. **Black-start** (automatic after 10 s dead bus, or operator): verify no blocking faults → open feeders AH2/4/5/6 → **close AH8 NECR** → start grid-forming source (BESS, else lead DG) → check 11 kV ±5 %, 50 Hz ±0.5 % → close AH5 (aux) → AH4 (President, critical) → AH6 (P.M.) → AH2 (PV, inverters reconnect after 60 s) → hand over to AUTO.
5. **ESD:** push-button / SCADA / confirmed GIS-room fire → trip all 11 kV VCBs, stop PCS and DGs; restart only after authorised reset + black-start.
6. **BESS fire cause & effect:** pre-alarm → alarm, exhaust fans ON, HVAC recirculation; confirmed fire → stop PCS, trip AH3 + BESS ACB, 30 s countdown then agent release (unless inhibited), PPC to DG operation.
7. **Load shedding:** stage 1 non-essential P.M. ways; stage 2 under-frequency 49.0 Hz/2 s opens AH6; AH4 (President) shed last; automatic restoration after 5 min stable.

All setpoints (25 / 80 / 95 % SOC, 30 % DG minimum load, PF target) are editable at ENGINEER level on the PPC screen.

---

## 6. Data-sheet register (to be supplied by vendors)

| Item | Requirement for selection | Status |
|---|---|---|
| Power plant controller | Redundant CPU, ≤ 200 ms control cycle, grid-forming BESS coordination, DG dispatch, Modbus TCP / IEC 61850 / IEC 104 | Vendor data sheet required (PPC vendor to be confirmed) |
| SCADA servers A/B | Industrial rack servers, redundant PSU/RAID, hot-standby redundancy, historian ≥ 5 years at 1 s | Required |
| HMI / engineering workstations | 2 × operator + 1 × engineering, dual monitors | Required |
| GIS feeder protection relays | IEC 61850 Ed.2 MMS + GOOSE, 50/51, 50N/51N, 51G, 46, 27/59, 81, 32, 86, TCS | Required |
| ST260E RMU relay (Zhuhai Strom) | Comms option (Modbus / IEC 61850) | Required |
| Core / field switches | Managed L3/L2, IEC 61850-3 / IEEE 1613, RSTP/PRP, SFP fibre ports | Required |
| Firewall / VPN gateway | NGFW with industrial DPI, IPsec, MFA | Required |
| GPS time server | NTP + PTP IEEE 1588 | Required |
| blue'Log XM 5000, Multi I/O, Fieldbus Ext (weather station logger) | – | Available from meteocontrol |
| Inverter PLC box (Sungrow, power-line carrier) | Max. inverters per box, Ethernet Modbus TCP register map | Required |
| Sungrow SG350HX | Modbus register map | Available from Sungrow |
| SMP12-A, Gill WindSonic, PT1000 sensors | – | Available |
| BESS EMS / PCS / BMS | Modbus TCP register map, grid-forming capability, black-start | Required |
| DG controllers | Modbus TCP, auto-sync, load sharing | Required |
| LV multifunction meters / ACB trip units | Modbus RTU | Required |
| Fire alarm panel & suppression | EN 54 / NFPA 72, Modbus TCP, BESS off-gas detection | Required |
| UPS 3 kVA (SCADA) / 2 kVA (RMUs) | SNMP v3 / dry contacts | Required |

---

## 7. HMI design notes

* High-performance HMI style: muted background, colour reserved for state and alarms. Breaker convention **red = closed, green = open**, matching the DHYBRID screens already used by Blueflag on site. Energised conductors dark blue, de-energised grey.
* Every value has a quality flag – bad quality shows `###` in magenta (communication loss is demonstrated on the P.M. RMU fibre link).
* Alarm management to ISA-18.2: 4 priorities, alarm banner with the newest unacknowledged alarm, acknowledge per alarm or all, cleared-unacknowledged state, event log with user attribution and CSV export.
* Controls: faceplate → select-before-operate → execute within 30 s; interlocks listed live in the faceplate (earth switch, 3-pos switch, spring, lockout 86, SF6 low-low, L/R, relay healthy, TCS, ESD, BESS fire, DG sync).
* Trends: single value axis, up to three pens of the same unit, crosshair tooltip and table view.
