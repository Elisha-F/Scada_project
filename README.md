# Villa Somalia Hybrid Power Plant – SCADA HMI

SCADA screens, I/O list and design documents for the **Solarization Villa Somalia** islanded
PV + battery + diesel microgrid (Ministry of Energy & Water Resources – Somalia, EPC Blueflag
Energy, drawing set BFE/PR/26/01).

The HMI follows Blueflag's **SCADA Design Report Rev 1** and **Device and I/O List Rev 1** (first revision,
in reply to RFA-001/BRA/26 Issue H) on the selected **Siemens SICAM A8000** architecture: two CP-8050
controllers in hot standby, six SICAM I/O rows, SICAM SCC on two redundant servers by IEC 60870-5-104,
embedded battery EMS for dispatch, two user roles (Operator, Admin), three alarm levels, hardwired-only
emergency stop. Every signal on the screens is a tag of the I/O list.

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

**`docs/Submission_Rev1/` is the package for submission**: the first revision (Rev 1) of the SICAM A8000 design,
superseding the original submission (Rev 0).

| File | Document |
|---|---|
| `Villa_Somalia_SCADA_Resubmission_Transmittal_RFA-001.docx` / `.pdf` | Cover letter and document register for the reply to RFA-001/BRA/26 Issue H |
| `Villa_Somalia_SCADA_Design_Report_Rev1.docx` / `.pdf` | SCADA Design Report Rev 1 |
| `BFE-PR-26-01-SCADA-Drawing-Set_RevB.pdf` | Attachment A: SCADA architecture drawings SCADA-001 to 005 Rev B (sources in `docs/drawings/`) |
| `Villa_Somalia_SCADA_Device_and_IO_List_Rev1.xlsx` | Attachment B: device and I/O list, 244 hardwired signals, 463 communication points |
| `Villa_Somalia_SCADA_Attachment_C_HMI_Screens_Rev1.pdf` | Attachment C: HMI screen mock-ups (captures in `docs/Attachment_E_Screens/`) |
| `Villa_Somalia_SCADA_Bill_of_Material_Rev1.xlsx` | Attachment D: bill of material by panel and by order line |

Other folders:

* `docs/superseded/` – the original submission (Rev 0; its report and I/O list are headed "Rev 1"), drawings Rev A, draft bill of material.
* `docs/superseded/Rev2_Schneider_WITHDRAWN/` – the Schneider Electric alternative, **withdrawn, not to be used**.
* `docs/SCADA_Design_Basis.md` – drawing analysis, client comments traceability, drawing-review findings.
* `docs/Presentation_Demo_Script.md` – running order for the HMI demonstration.
* `docs/figures/` – report figures. `docs/source/` – Blueflag's rev 0 drafts, unchanged.

Rebuild the package, then check that it is coordinated:

```
python3 tools/harmonize_io_list.py docs/source/Villa_Somalia_SCADA_Device_and_IO_List_rev0.xlsx docs/superseded/Villa_Somalia_SCADA_Device_and_IO_List_Rev1.xlsx
python3 tools/revise_report.py docs/source/Villa_Somalia_SCADA_Design_Report_rev0.docx docs/superseded/Villa_Somalia_SCADA_Design_Report_Rev1.docx
P=docs/Submission_Rev1
python3 tools/make_resubmission_io_list.py docs/superseded/Villa_Somalia_SCADA_Device_and_IO_List_Rev1.xlsx $P/Villa_Somalia_SCADA_Device_and_IO_List_Rev1.xlsx
python3 tools/make_resubmission_report.py docs/superseded/Villa_Somalia_SCADA_Design_Report_Rev1.docx $P/Villa_Somalia_SCADA_Design_Report_Rev1.docx
python3 tools/import_io_list.py                       # HMI tags from the package I/O list
node tools/capture_screens.js && node tools/build_attachment_c.js
python3 tools/draw_drawings_sicam.py docs/drawings && node tools/svgs_to_pdf.js $P/BFE-PR-26-01-SCADA-Drawing-Set_RevB.pdf docs/drawings/*.svg
python3 tools/build_bom_sicam.py
python3 tools/build_transmittal.py
soffice --headless --convert-to pdf --outdir $P $P/*.docx
python3 tools/check_package.py
```

The Schneider tools (`tools/*schneider*.py`) only rebuild the withdrawn alternative and are kept for the record.

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
and `bind.js` are replaced by the driver feeding those tags from the CP-8050 controllers, without changing
the screens. After any change to the I/O list, regenerate the tags:

```
python3 tools/import_io_list.py docs/Submission_Rev1/Villa_Somalia_SCADA_Device_and_IO_List_Rev1.xlsx hmi/js/iolist.js
```
