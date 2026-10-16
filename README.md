# Villa Somalia Hybrid Power Plant – SCADA HMI

SCADA screens, I/O list and design documents for the **Solarization Villa Somalia** islanded
PV + battery + diesel microgrid (Ministry of Energy & Water Resources – Somalia, EPC Blueflag
Energy, drawing set BFE/PR/26/01).

The HMI follows Blueflag's **SCADA Design Report Rev 1** and **Device and I/O List Rev 1**:
two Siemens SICAM A8000 CP-8050 controllers in hot standby, IEC 60870-5-104 to SICAM SCC on redundant servers,
embedded battery EMS for dispatch, two user roles (Operator, Admin), three alarm levels,
hardwired-only emergency stop. Every signal on the screens is a tag of the I/O list.

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
| SYSTEM | Communication status, I/O list (707 tags, CSV export), user management, simulation |

Click a breaker to open its faceplate (status, measurements, live interlocks); commands use
select-before-operate. Log in as Operator or Admin under **SYSTEM → User management**. The
Admin can inject faults under **SYSTEM → Simulation** (feeder trips, battery fault and fire,
emergency stop, generator fail-to-start, inverter faults, PM fibre cut…).

## Documents

* `docs/Villa_Somalia_SCADA_Design_Report_Rev1.docx` – design report Rev 1 (from Blueflag rev 0, revised with `tools/revise_report.py`).
* `docs/Villa_Somalia_SCADA_Device_and_IO_List_Rev1.xlsx` – device and I/O list Rev 1: 244 hardwired points with I/O row, module and channel; 463 communication points on the *Comms Point List* sheet (built from rev 0 with `tools/harmonize_io_list.py`).
* `docs/source/` – Blueflag's rev 0 originals, unchanged.
* `docs/Villa_Somalia_IO_Allocation_Schneider_Requote.xlsx` – the I/O list Rev 1 allocated to Schneider Modicon M580 / Edge I/O modules and channels, with the changes against Schneider's offer of 16 Oct 2026, for their requote (`tools/schneider_io_allocation.py`).
* `docs/SCADA_Design_Basis.md` – drawing analysis, client comments traceability, drawing-review findings.
* `docs/Villa_Somalia_SCADA_Attachment_E_HMI_Screens.pdf` – Attachment E, the HMI screen mock-ups (12 screens). Captures in `docs/Attachment_E_Screens/`;
  rebuild with `node tools/capture_screens.js && node tools/build_attachment_e.js`, then `tools/revise_report.py` to refresh the three screens in section 12.
* `docs/figures/` – report figures 1 and 3 for the redundant controller pair (`tools/draw_report_figures.py`).

## Structure

```
hmi/index.html              shell (header, navigation, alarm banner, footer)
hmi/css/scada.css           style
hmi/js/config.js            plant data from the drawings and EMS thresholds
hmi/js/model.js             internal simulator model
hmi/js/iolist.js            the 707 tags of I/O list Rev 1 (generated: tools/import_io_list.py)
hmi/js/taglist.js           tag database built from iolist.js
hmi/js/sim.js               plant simulator and EMS rules
hmi/js/control.js           users, permissions, interlocks, commands, event log
hmi/js/bind.js              maps the simulator model onto the I/O list tags; breaker registry
hmi/js/ui.js                SVG symbols and live data binding
hmi/js/app.js               navigation, alarm engine, faceplates, scan loop
hmi/js/screens/*.js         the screens
```

Screens read and write only the I/O list tags (`SCADA.tags`). In service, `sim.js`, `model.js`
and `bind.js` are replaced by the driver feeding those tags from the CP-8050, without changing
the screens. After any change to the I/O list, regenerate the tags:

```
python3 tools/import_io_list.py docs/Villa_Somalia_SCADA_Device_and_IO_List_Rev1.xlsx hmi/js/iolist.js
```
