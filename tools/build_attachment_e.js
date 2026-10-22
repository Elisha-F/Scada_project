/* Builds Attachment E of the design report: the HMI screen mock-ups as one PDF, A4 landscape.
 * Usage: node tools/build_attachment_e.js [out.pdf]
 * Takes the captures in docs/Attachment_E_Screens (made by tools/capture_screens.js).
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'docs', 'Attachment_E_Screens');
const out = path.resolve(process.argv[2] || path.join(root, 'docs', 'Villa_Somalia_SCADA_Attachment_E_HMI_Screens.pdf'));

const SCREENS = [
  ['E01_plant_overview', 'Plant overview', 'The opening screen: a live single-line diagram of the whole plant. Generators, PV, battery, the 11 kV switchboard AH1 to AH8, both office stations and the auxiliary supply, with power at each point, breaker positions, the EMS state and summary values with their tags.'],
  ['E02_11kV_switchboard', '11 kV switchboard', 'One column per panel AH1 to AH8: breaker and earth switch positions, local/remote, gas pressure, relay health and trips, measurements and energy. An Operator opens and closes breakers by select and confirm; interlocks are shown in the breaker faceplate.'],
  ['E03_President_station', 'Office transformer station (President)', 'RMU switches and transformer breaker with the ST260E relay, 630 kVA transformer alarms, the 10-way LVDB with its incomer and meter values, and the station supplies. The Prime Minister station screen is the same.'],
  ['E04_PV', 'PV system', 'The four SG350HX inverters as read through the PLC box: power, voltages, currents, temperature, insulation, state and fault codes; the PV LV switchboard and AC breakers, the inverter transformer, and the weather station.'],
  ['E05_battery', 'Battery', 'The ST3340UX battery as read through the EMS: state of charge and health, power, charge and discharge limits, cell values, alarms, combiner panels, and the hardwired fire panel, emergency stop and breaker signals.'],
  ['E06_generators', 'Generators', 'DG1 550 kVA and DG2 660 kVA: state, electrical and engine values, fuel level hardwired and from the controller, running hours and starts. Start and stop work in manual mode only; changing the mode needs the Admin role.'],
  ['E07_energy_management', 'Energy management', 'EMS state and mode, the power balance, the operating modes with the current one highlighted, and the Admin settings: generator start below 20 % and stop at 80 % state of charge. Also the fallback if the EMS fails and the load-shedding order.'],
  ['E08_auxiliaries', 'Auxiliaries', 'Auxiliary transformer and LV board, the SCADA UPS, DC supplies, switchroom conditions, emergency stops and doors. Emergency stops are hardwired; the SCADA only shows them.'],
  ['E09_communication_status', 'Communication status', 'Live health of every link: the M580 hot standby controller pair with its active and standby roles, both core switches, the fibre ring and field switches, field devices, the switchroom remote drop and the four Edge I/O islands, with the protocol of each link.'],
  ['E10_IO_list', 'I/O list', 'Every signal of the device and I/O list (Attachment B) with its tag, I/O location, Schneider module and channel or protocol source, alarm level and live value, with filters and export.'],
  ['E11_overview_during_battery_fire', 'Plant overview during a battery fire', 'The fire panel has tripped the battery by its hardwired circuit. The generators have started, the busbar has been restored with AH8 closed first, and both offices are supplied again; PV runs limited to keep the generators above minimum load.'],
  ['E12_alarms_during_battery_fire', 'Alarm list during a battery fire', 'The alarms raised by the fire, with level, time, tag, equipment and state. Each alarm is acknowledged singly or all at once; fire alarms clear only when reset at the fire panel.'],
];

const css = `@page { size: A4 landscape; margin: 12mm 14mm; }
body { font-family: Inter, 'DejaVu Sans', sans-serif; color: #1d1d1b; margin: 0; }
section { page-break-after: always; height: 184mm; display: flex; flex-direction: column; }
section:last-child { page-break-after: auto; }
h1 { font-size: 22pt; font-weight: 600; margin: 30mm 0 4mm; } h2 { font-size: 14pt; font-weight: 600; margin: 0 0 2mm; }
.sub { font-size: 11pt; color: #5b5b57; margin: 0 0 8mm; } p { font-size: 10pt; line-height: 1.45; margin: 0 0 3mm; max-width: 245mm; }
.note { border-left: 3px solid #2a78d6; padding: 2mm 4mm; background: #f3f7fc; }
table { border-collapse: collapse; font-size: 10pt; margin-top: 4mm; } td { padding: 1.2mm 4mm 1.2mm 0; border-bottom: 1px solid #e3e1db; }
.img { flex: 1; min-height: 0; display: flex; align-items: flex-start; justify-content: center; }
.img img { max-width: 100%; max-height: 100%; border: 1px solid #cfcdc5; }
.foot { font-size: 8pt; color: #8a8a84; margin-top: 2mm; }`;

let html = `<html><head><meta charset="utf-8"><style>${css}</style></head><body><section>
<h1>Attachment E · HMI screen mock-ups</h1>
<div class="sub">Solarization of Villa Somalia · SCADA Design Report Rev 2 · Blueflag Energy · drawing set BFE/PR/26/01</div>
<p class="note">These screens are mock-ups from the HMI demonstration, running on a simulator of the plant mapped onto every signal of the device and I/O list (Attachment B). They are submitted for approval of layout and content. The final screens are built in EcoStruxure Machine SCADA Expert to the same layout and content before the factory test.</p>
<p>Conventions: breaker closed red and open green, as on the screens already used on site; live conductors dark blue, dead grey; alarm levels 1 red, 2 orange and 3 yellow; values from a device that has stopped communicating shown as ### in magenta, never as live. Every command opens a confirmation step, and controls a user may not operate are disabled for that role.</p>
<table>${SCREENS.map((s, i) => `<tr><td>E.${i + 1}</td><td>${s[1]}</td></tr>`).join('')}</table></section>`;
SCREENS.forEach((s, i) => {
  const img = 'data:image/png;base64,' + fs.readFileSync(path.join(dir, s[0] + '.png')).toString('base64');
  html += `<section><h2>E.${i + 1} ${s[1]}</h2><p>${s[2]}</p><div class="img"><img src="${img}"></div><div class="foot">Mock-up from the HMI demonstration · Attachment E to the SCADA Design Report Rev 2</div></section>`;
});
html += '</body></html>';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  await p.pdf({ path: out, format: 'A4', landscape: true, printBackground: true, preferCSSPageSize: true });
  await b.close();
  console.log('wrote', out);
})();
