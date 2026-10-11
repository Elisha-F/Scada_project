# Villa Somalia Hybrid Power Plant – SCADA HMI

SCADA screens, I/O list and design basis for the **Solarization Villa Somalia** islanded
PV + BESS + diesel microgrid (Ministry of Energy & Water Resources – Somalia, EPC Blueflag
Energy, drawing set BFE/PR/26/01), prepared in response to the client comments requesting a
complete SCADA design, full I/O list, communication architecture / cybersecurity and
operational sequences.

## Run it

No build and no server needed: open **`hmi/index.html`** in a modern browser (Chrome / Edge / Firefox).
The HMI starts with a plant simulator that pre-runs from local midnight (Mogadishu time), so
trends, energy counters and SOC are realistic straight away.

## Screens (23)

| Menu | Screens |
|---|---|
| OVERVIEW | Plant Overview (live SLD of the whole plant), Plant Information, Network & Cybersecurity |
| MV SWITCHGEAR | 11 kV GIS combiner (AH1–AH8), Protection & NECR, Remote RMUs (President / P.M.) |
| GENERATOR | DG1 550 kVA / DG2 660 kVA – start sequence, engine, electrical, alarms, ACB control |
| BATTERY | BESS overview (SOC, PCS, limits, HVAC, setpoints), Racks & BMS |
| PV SYSTEM | Inverters NB01–NB04, String monitoring (81 strings), Weather station |
| LOAD | President LVDB, P.M. LVDB (10-way), Auxiliary & UPS |
| FIRE & SAFETY | Fire zones, zone status, cause & effect matrix |
| PPC | Plant controller (state, power balance, setpoints), Operating sequences (live black-start) |
| ALARMS / TRENDS / I/O LIST / SYSTEM | Alarm list (ISA-18.2), event log/audit trail, trends, live I/O list with CSV export, users & fault injection |

Click any breaker for its faceplate (status, measurements, live interlocks); commands use
select-before-operate. Switch user level under **SYSTEM** (Viewer / Operator / Engineer / Admin).
Engineers can inject faults (feeder trip, BESS fault, BESS fire, DG fail-to-start, inverter fault,
open string, cloud, fibre loss…) and change simulation speed – useful for FAT and operator training.

## Documents

* `docs/SCADA_Design_Basis.md` – drawing analysis, requirement traceability, drawing-review
  findings to resolve, communication architecture, cybersecurity, PPC sequences, data-sheet register.
* `docs/IO_List.csv` – 1,164-point I/O list (AI / DI / AO / DO, device, protocol, address / IEC 61850 LN,
  alarm priority, limits). Regenerate with `node tools/export-io-list.js`.

## Structure

```
hmi/index.html          shell (header, navigation, alarm banner, footer)
hmi/css/scada.css       HMI style
hmi/js/config.js        plant model from the drawings (ratings, panels, equipment)
hmi/js/tags.js          tag database = I/O list generator
hmi/js/sim.js           plant simulator + PPC dispatch / black-start / ESD logic
hmi/js/control.js       users, interlocks, command execution, audit trail
hmi/js/ui.js            SVG symbol library and live data binding
hmi/js/app.js           navigation, alarm engine, faceplates, scan loop
hmi/js/screens/*.js     the screens
tools/export-io-list.js I/O list CSV export
```

Screens only read and write `SCADA.tags`; for commissioning `sim.js` is replaced by the driver
layer (IEC 61850 / Modbus gateway publishing tag values, e.g. over WebSocket) without changing the
screens. Items marked *TBC* in `config.js` need confirmation from vendor data sheets.
