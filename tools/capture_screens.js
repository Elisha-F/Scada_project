/* Captures the HMI screens for Attachment E of the design report (screen mock-ups).
 * Usage: node tools/capture_screens.js [out_dir]      (default docs/Attachment_E_Screens)
 * Needs Playwright with Chromium. The simulator clock is fixed to 11:20 Mogadishu time
 * so every capture shows the same daytime plant state.
 */
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'docs', 'Attachment_E_Screens'));

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 950 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-15T08:20:00Z') });
  await p.clock.resume();
  await p.goto('file://' + path.join(root, 'hmi', 'index.html'));
  await p.waitForTimeout(1500);
  const shot = async (screen, name, full) => {
    await p.evaluate(s => SCADA.go(s), screen);
    await p.waitForTimeout(1300);
    if (full) await p.evaluate(() => { document.body.style.height = 'auto'; document.querySelector('main').style.overflow = 'visible'; });
    await p.screenshot({ path: path.join(out, name + '.png'), fullPage: !!full });
    await p.evaluate(() => { document.body.style.height = ''; document.querySelector('main').style.overflow = ''; });
  };
  await shot('overview', 'E01_plant_overview');
  await shot('sw11', 'E02_11kV_switchboard', true);
  await shot('prs', 'E03_President_station');
  await shot('pv', 'E04_PV');
  await shot('bess', 'E05_battery');
  await shot('gen', 'E06_generators', true);
  await shot('ems', 'E07_energy_management');
  await shot('aux', 'E08_auxiliaries', true);
  await shot('comms', 'E09_communication_status', true);
  await shot('iolist', 'E10_IO_list');
  // battery fire: wait until the generators have picked up both offices again
  await p.evaluate(() => { SCADA.user = SCADA.users.admin; SCADA.injectFault('FIRE_PRE'); SCADA.injectFault('FIRE_CONF'); SCADA.sim.speed = 10; });
  for (let i = 0; i < 60; i++) {
    await p.waitForTimeout(1000);
    const ok = await p.evaluate(() => { const T = SCADA.tags; return T['EMS-STATE'].v === 6 && T['AH4-CB-CLSD'].v && T['AH6-CB-CLSD'].v && T['EMS-P-LOAD'].v > 100; });
    if (ok) { await p.waitForTimeout(3000); break; }
  }
  await shot('overview', 'E11_overview_during_battery_fire');
  await shot('alarms', 'E12_alarms_during_battery_fire');
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
