/* Joins A3 landscape SVG drawings into one PDF, one sheet per page; optionally writes PNG previews.
 * Usage: node tools/svgs_to_pdf.js <out.pdf> <sheet1.svg> [sheet2.svg ...] [--png <dir>]
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const args = process.argv.slice(2);
const pi = args.indexOf('--png');
const pngDir = pi >= 0 ? args.splice(pi, 2)[1] : null;
const [out, ...svgs] = args;
const css = `@page { size: 420mm 297mm; margin: 0; } body { margin: 0; } div { width: 420mm; height: 297mm; page-break-after: always; overflow: hidden; }
div:last-child { page-break-after: auto; } svg { width: 420mm; height: 297mm; display: block; }`;
const pages = svgs.map(f => fs.readFileSync(f, 'utf8').replace(/^<\?xml[^>]*>/, ''));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent(`<html><head><meta charset="utf-8"><style>${css}</style></head><body>${pages.map(s => `<div>${s}</div>`).join('')}</body></html>`, { waitUntil: 'load' });
  await p.pdf({ path: out, width: '420mm', height: '297mm', printBackground: true, preferCSSPageSize: true });
  console.log('wrote', out);
  if (pngDir) {
    fs.mkdirSync(pngDir, { recursive: true });
    const q = await b.newPage({ viewport: { width: 2380, height: 1683 } });
    for (let i = 0; i < pages.length; i++) {
      await q.setContent(`<html><body style="margin:0">${pages[i].replace('<svg', '<svg style="width:2380px;height:1683px;display:block"')}</body></html>`);
      const f = path.join(pngDir, path.basename(svgs[i], '.svg') + '.png');
      await q.screenshot({ path: f });
      console.log('wrote', f);
    }
  }
  await b.close();
})();
