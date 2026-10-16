# Villa Somalia Hybrid Power Plant – SCADA Design Basis

**Project:** Solarization Villa Somalia · **Client:** Ministry of Energy & Water Resources – Somalia
**Contractor:** Blueflag Energy Co. Ltd · **Drawing set analysed:** BFE/PR/26/01 (`VILLA_SOMALIA_05_10_2026.pdf`, 25 sheets)
**Status:** HMI V2.0 – aligned with *Villa Somalia SCADA Design Report* Rev 1 and *Device and I/O List* Rev 1 (Blueflag). Where this note and the design report differ, the design report governs.

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

| # | Client requirement | Answer | Status |
|---|---|---|---|
| 1 | Complete SCADA design aligned with BESS and PV, GIS combiner, LVDBs, generators | Design report Rev 1 + the HMI in `hmi/` (17 screens: overview, 11 kV switchboard, President and PM stations, PV, battery, generators, energy management, auxiliaries, alarms, event log, trends, reports, communication status, I/O list, users, simulation) | **Done** |
| 2 | Complete I/O list – all analogue and digital signals: VCBs, GIS relays, transformers, RMUs, DGs, combiner panels, weather station, UPS, aux power, fire | `docs/Villa_Somalia_SCADA_Device_and_IO_List_Rev1.xlsx`: **244 hardwired points** (208 DI, 32 DO, 4 AI) on six SICAM I/O rows with module and channel, and **456 communication points** (433 read, 23 write) with a tag per point on the *Comms Point List* sheet. The HMI loads the same 700 tags (`tools/import_io_list.py`) | **Done** – register addresses to be filled from vendor maps |
| 3 | Communication architecture, protocols, topology, cybersecurity | Design report sections 7–9; *SYSTEM → Communication status* screen; §4 below | **Done** – for approval |
| 4 | Data sheets for controllers, field devices, servers, HMI; operational sequence | Design report sections 5–6 (equipment and EMS rules) and §5–6 below | Sequences **done**; vendor data sheets to be attached |

### Point count (I/O list Rev 1)

| | DI | DO | AI | AO / write | Total |
|---|---:|---:|---:|---:|---:|
| Hardwired (SICAM I/O rows 1–6, 27 % spare overall) | 208 | 32 | 4 | – | 244 |
| Communication (read) | | | | | 433 |
| Communication (write: commands and setpoints) | | | | | 23 |
| **Total** | | | | | **700** |

The HMI *SYSTEM → I/O list* screen shows every point with its row, module and channel (hardwired) or protocol source (communication), its alarm level and its live value.

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
| 8 | 15 Comm. schematic | Only inverters and weather station shown. **GIS relays, BESS EMS/PCS/BMS, DG controllers, RMUs, LVDB meters, fire panel, UPS, plant controller, servers, firewall and time sync are missing**; "Powerplant RTU" undefined | Replace with the architecture in §4 |
| 9 | 13 / 15 | Inverter communication is **power-line carrier (PLC)** over the AC cables to the PLC box (63 A "PLC Communication Circuit" on the PV LV bus), then Ethernet to the switch. Sheet 15 draws RS485 IN/OUT daisy-chain links instead | Redraw sheet 15 as PLC over AC cables → PLC box → Ethernet; keep RS485 only if retained as a commissioning / backup port |
| 10 | 13/14 | GIS feeder protection relay make/model not stated (RMUs use Zhuhai Strom ST260E) | Select relay with IEC 61850 Ed.2 (MMS + GOOSE) |
| 11 | 13 | Step-up transformers (1.5 MVA DG, 1.5 MVA PV, 1 MVA BESS) – oil or dry type, temperature / Buchholz devices not shown | Confirm; I/O list includes temperature, Buchholz/PRD, oil level |
| 12 | 13 | All 11 kV sources are delta on the HV side → the 11 kV system is earthed **only** through AH8 NECR | Add interlock / alarm: AH3 and AH1 should not energise the bus with AH8 open (black-start step 3 closes AH8 first) |
| 13 | 13 | Remote RMUs at the President / P.M. offices – no communication medium shown | Single-mode fibre laid in the 11 kV cable trenches, ring topology |
| 15 | 13 / 14 | No voltage transformers shown on the 11 kV GIS panels or busbar (only DXN voltage presence indicators), yet voltage metering and 27/59/81 protection need them | Add a busbar VT panel or line VTs on the incomers; confirm per-panel voltage metering |
| 14 | – | DG controller, BESS EMS/PCS, SCADA server, fire panel and UPS vendors not stated | Provide data sheets (§6) |

---

## 4. Communication architecture

As in design report section 7:

* **Controller:** Siemens SICAM A8000 **CP-8050** in the 11 kV switchroom SCADA cabinet, acting as plant controller and gateway. It talks to the SCADA servers by **IEC 60870-5-104**.
* **SCADA:** SICAM SCC on **two servers (A active, B hot standby)**, one operator workstation, one engineering laptop.
* **Network:** two core switches (Moxa EDS-G512E); single-mode **fibre ring** through the field switches SW-MV (inverter station), SW-BESS, SW-GEN, SW-PRS and SW-PMS; firewall with VPN for remote support (off by default); GPS time server (NTP).
* **Hardwired I/O:** six SICAM I/O rows. Row 1 (switchroom, backplane) and row 2 (SCADA cabinet, copper) are local; rows 3–6 (President station, PM station, BESS yard, generators) are on dedicated fibre pairs.
* **Field devices:** 11 kV relays AH1–AH7 by IEC 61850 or Modbus TCP; PV inverters by **power line communication to the PLC box**, then Modbus TCP; battery data **through the EMS**; generator controllers by Modbus; RMU relays ST260E by Modbus RTU through MGate gateways; LVDB meters PM5560; weather station on the blue'Log XM (weather station only); UPS by SNMP / Modbus.

| Link | Protocol | Medium |
|---|---|---|
| CP-8050 → SCADA servers A/B | IEC 60870-5-104 | Ethernet, both core switches |
| CP-8050 → 11 kV relays | IEC 61850 / Modbus TCP | Ethernet |
| PV inverters → PLC box | Power line communication | AC cables |
| CP-8050 → PLC box, EMS, generator controllers, meters, weather logger | Modbus TCP | Fibre ring |
| CP-8050 → ST260E | Modbus RTU via MGate | RS485 + fibre ring |
| CP-8050 → I/O rows 3–6 | SICAM I/O link, optical | Fibre pair |
| Network devices → SCADA | SNMP v3, syslog | Ethernet |

**Cybersecurity** (design report section 9): firewall between plant and outside networks; remote access only by VPN, enabled per session by an Admin and logged; individual accounts with two roles; password and lockout rules; unused ports disabled; time-synchronised logs; configuration backups.

---

## 5. Operating rules (embedded EMS)

The battery EMS dispatches the plant; the CP-8050 and SCADA monitor it and pass Admin setpoints. Rules in the HMI simulator (`hmi/js/sim.js`) follow design report section 6:

1. **Day, PV surplus:** battery forms the grid and charges; PV curtailed when the battery is full.
2. **Day, PV shortfall / night:** battery forms the grid and discharges.
3. **Low battery:** the lead generator starts when SOC falls **below 20 %** and stops at **80 %** (or when PV covers the load). The **second generator starts when load exceeds 80 % of the running one**.
4. **Generator only** (battery unavailable, e.g. battery fire): a generator forms the grid; PV limited to keep the generator above minimum load.
5. **Manual:** generators started and stopped by an Operator, only with the generator in manual mode (mode change by Admin).
6. **Emergency stop:** hardwired only. Push-buttons in the switchroom and battery area stop the battery, PV and generators through hardwired circuits and are reset locally; the SCADA only displays them and has no software ESD.
7. **Faults:** level 3 faults are reset by an Operator through the EMS; level 1 and 2 faults by an Admin. Protection trips are reset at the relay; a remote close stays blocked until then.
8. **Neutral earthing:** AH8 is the only earthing of the 11 kV system. Closing AH1 (generators) or AH3 (battery) is blocked while AH8 is open; in black start AH8 is closed first.


### Requirements on the EMS and fallback (design report section 11)

With no separate plant controller, the EMS supplier must provide, and the commissioning tests must show:

* **Generator start and stop:** by a hardwired start contact from the EMS to each generator controller (Modbus as a duplicate), independent of the CP-8050, SCADA and network.
* **PV curtailment:** EMS limits the inverters through the PLC box when the battery is full or a generator would fall below minimum load, ramping down rather than tripping; response time stated by the supplier.
* **Black start:** written sequence (AH8 first), each step marked automatic or by operator command.
* **EMS failure:** the CP-8050 raises a level 1 alarm when the EMS heartbeat stops; the generator controllers start on a dead busbar by themselves and form the grid; the battery stays off until the EMS is restored.
* **Load shedding:** under-frequency (81) in the 11 kV relays: AH6 at 48.5 Hz / 1 s, then AH4 at 47.5 Hz / 0.5 s (to be confirmed by the protection study); AH5 never shed; feeders reclosed by the Operator.

The simulator demonstrates the last two (SYSTEM → Simulation: *EMS stops*, *Office load step*). Open points 16–18 in the design report ask the EMS supplier, generator supplier and protection engineer to confirm them.
---

## 6. Data-sheet register

Per design report section 5 and the *Device List* sheet: SICAM A8000 CP-8050 and I/O modules (DI-8112, DO-8221, DO-8212, AI-8320, CI-8532/8533), SICAM SCC servers, Moxa EDS-G512E and field switches, MGate gateways, Schneider PM5560 meters, Siemens SITOP PSU8200, firewall, GPS time server, UPS; vendor data for the 11 kV relays, ST260E, Sungrow SG350HX and PLC box, Sungrow ST3340UX and EMS, generator controllers and the blue'Log XM. Register maps are needed from Sungrow (inverters, EMS), the generator controller vendor and Strom (ST260E) to fill the communication addresses.

---

## 7. HMI design notes

* Muted background; colour is used for state and alarms. Breaker convention **red = closed, green = open**, as on the DHYBRID screens already used on site. Live conductors dark blue, dead grey.
* **Every tag name on the screens is the tag in I/O list Rev 1** (for example `AH1-CB-CLSD`, `BESS-SOC`, `EMS-GEN-START-SP`); hovering a signal shows its tag.
* Every value carries a quality flag: bad or stale data shows `###` in magenta (demonstrated by cutting the fibre to the PM station).
* **Three alarm levels** (1 critical, 2 major, 3 minor) taken from the I/O list; alarm banner, acknowledge per alarm or all, cleared-unacknowledged state, event log with the user who acted.
* **Two roles:** Operator (view, acknowledge, switch breakers, start/stop generators in manual, reset level 3 faults) and Admin (all of that plus EMS mode and setpoints, C-rate limit, generator mode, inverter commands, users, VPN, exports).
* Commands: faceplate → select → confirm within 30 s; interlocks shown live (earth switch, relay trip not reset, local/remote, gas pressure, AH8 open for AH1/AH3).
* Trends: single value axis, up to three pens of the same unit, crosshair tooltip and table view.
