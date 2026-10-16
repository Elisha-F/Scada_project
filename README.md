# Villa Somalia Hybrid Power Plant – SCADA HMI

SCADA screens, I/O list and design documents for the **Solarization Villa Somalia** islanded
PV + battery + diesel microgrid (Ministry of Energy & Water Resources – Somalia, EPC Blueflag
Energy, drawing set BFE/PR/26/01).

The HMI follows Blueflag's **SCADA Design Report Rev 2** and **Device and I/O List Rev 2** on the
**Schneider Electric** platform: two Modicon M580 controllers in hot standby, a Modicon X80 remote drop
in the switchroom and Modicon Edge I/O NTS islands at the office stations, BESS yard and generator area,
EcoStruxure Machine SCADA Expert on two SCADA stations (Modbus TCP to the controllers), embedded battery
EMS for dispatch, two user roles (Operator, Admin), three alarm levels, hardwired-only emergency stop.
Every signal on the screens is a tag of the I/O list.

## Run it

No build and no server: open **`hmi/index.html`** in Chrome, Edge or Firefox. A plant
simulator pre-runs from local midnight (Mogadishu time), so trends and energy counters are
filled straight away.

## Screens (17)

| Menu | Screens |
|---|---|
| OVERVIEW | Plant overview (live single line of the whole plant) |
| SWITCHGEAR | 11 kV switchboard AH1–AH8, President station, Prime Minister station (RMU, 630 kVA transformer, 10-way LVDB) |
| GENERATION | PV system (4 × SG350HX, weather), battery (ST3340UX through the EMS), generators DG1 / DG2 |
| ENERGY MANAGEMENT | EMS state and mode, power balance, operating modes, Admin settings |
| AUXILIARIES | Auxiliary transformer and LV board, UPS, DC supplies, switchroom, emergency stops, doors |
| ALARMS | Alarm list (levels 1–3), event log |
| TRENDS & REPORTS | Trends of any measured tag, daily report |
| SYSTEM | Communication status, I/O list (706 tags, CSV export), user management, simulation |

Click a breaker to open its faceplate (status, measurements, live interlocks); commands use
select-before-operate. Log in as Operator or Admin under **SYSTEM → User management**. The
Admin can inject faults under **SYSTEM → Simulation** (feeder trips, battery fault and fire,
emergency stop, generator fail-to-start, inverter faults, PM fibre cut…).

## Documents

* `docs/Villa_Somalia_SCADA_Design_Report_Rev2.docx` – design report Rev 2, Schneider Electric platform.
* `docs/Villa_Somalia_SCADA_Device_and_IO_List_Rev2.xlsx` – device and I/O list Rev 2 (Attachment B): 244 hardwired signals with I/O location, Schneider module and channel; 462 communication points on the *Comms Point List* sheet.
* `docs/Villa_Somalia_SCADA_Attachment_E_HMI_Screens.pdf` – Attachment E, the HMI screen mock-ups (12 screens); captures in `docs/Attachment_E_Screens/`.
* `docs/Villa_Somalia_IO_Allocation_Schneider_Requote.xlsx` – I/O allocation and the changes against Schneider's offer of 16 Oct 2026, for their requote.
* `docs/SCADA_Design_Basis.md` – drawing analysis, client comments traceability, drawing-review findings.
* `docs/figures/` – report figures (`*_se` for the Schneider design).
* `docs/source/` – Blueflag's rev 0 originals, unchanged.
* `docs/BFE-PR-26-01-SCADA-Drawing-Set_SICAM.pdf` – Attachment A drawings BFE/PR/26/01-SCADA-001 to 005 (architecture, communication network, PV interface, BESS interface, overview SLD) for the SICAM A8000 design (Rev 1); sources in `docs/drawings/`.
* `docs/superseded/` – Rev 1 report and I/O list on the Siemens SICAM A8000 platform, replaced by Rev 2.

Rebuild everything from the rev 0 originals:

```
python3 tools/harmonize_io_list.py docs/source/Villa_Somalia_SCADA_Device_and_IO_List_rev0.xlsx docs/superseded/Villa_Somalia_SCADA_Device_and_IO_List_Rev1.xlsx
python3 tools/revise_report.py docs/source/Villa_Somalia_SCADA_Design_Report_rev0.docx docs/superseded/Villa_Somalia_SCADA_Design_Report_Rev1.docx
python3 tools/convert_io_list_schneider.py docs/superseded/Villa_Somalia_SCADA_Device_and_IO_List_Rev1.xlsx docs/Villa_Somalia_SCADA_Device_and_IO_List_Rev2.xlsx
python3 tools/import_io_list.py                       # HMI tags from Rev 2
python3 tools/draw_report_figures_schneider.py docs/figures && node tools/svg_to_png.js docs/figures/*_se.svg
node tools/capture_screens.js && node tools/build_attachment_e.js
python3 tools/convert_report_schneider.py docs/superseded/Villa_Somalia_SCADA_Design_Report_Rev1.docx docs/Villa_Somalia_SCADA_Design_Report_Rev2.docx
python3 tools/draw_drawings_sicam.py docs/drawings && node tools/svgs_to_pdf.js docs/BFE-PR-26-01-SCADA-Drawing-Set_SICAM.pdf docs/drawings/*.svg
python3 tools/schneider_io_allocation.py docs/superseded/Villa_Somalia_SCADA_Device_and_IO_List_Rev1.xlsx docs/Villa_Somalia_IO_Allocation_Schneider_Requote.xlsx
```

## Structure

```
hmi/index.html              shell (header, navigation, alarm banner, footer)
hmi/css/scada.css           style
hmi/js/config.js            plant data from the drawings and EMS thresholds
hmi/js/model.js             internal simulator model
hmi/js/iolist.js            the 706 tags of I/O list Rev 2 (generated: tools/import_io_list.py)
hmi/js/taglist.js           tag database built from iolist.js
hmi/js/sim.js               plant simulator and EMS rules
hmi/js/control.js           users, permissions, interlocks, commands, event log
hmi/js/bind.js              maps the simulator model onto the I/O list tags; breaker registry
hmi/js/ui.js                SVG symbols and live data binding
hmi/js/app.js               navigation, alarm engine, faceplates, scan loop
hmi/js/screens/*.js         the screens
```

Screens read and write only the I/O list tags (`SCADA.tags`). In service, `sim.js`, `model.js`
and `bind.js` are replaced by the driver feeding those tags from the M580 controllers, without changing
the screens. After any change to the I/O list, regenerate the tags:

```
python3 tools/import_io_list.py docs/Villa_Somalia_SCADA_Device_and_IO_List_Rev2.xlsx hmi/js/iolist.js
```
