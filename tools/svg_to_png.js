/* Renders SVG figures to PNG at their own pixel size (used for the design report figures).
 * Usage: node tools/svg_to_png.js file1.svg [file2.svg ...]   -> file1.png ...
 */
const fs = require('fs');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch();
  for (const f of process.argv.slice(2)) {
    const svg = fs.readFileSync(f, 'utf8');
    const w = +svg.match(/width="(\d+)"/)[1], h = +svg.match(/height="(\d+)"/)[1];
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent('<html><body style="margin:0">' + svg + '</body></html>');
    await p.waitForTimeout(300);
    await p.screenshot({ path: f.replace(/\.svg$/, '.png'), clip: { x: 0, y: 0, width: w, height: h } });
    await p.close();
  }
  await b.close();
})();
