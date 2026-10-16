"""Shared A3 drawing frame, title column, tables and symbols for the SCADA drawing set (SVG, mm units)."""
import base64
from xml.sax.saxutils import escape

W, H = 420, 297
FONT = "Inter, 'DejaVu Sans', Arial, sans-serif"
INK, GREY, LIGHT, ZONE = '#1d1d1b', '#5b5b57', '#e9eef3', '#8a96a3'
STYLE = {  # line styles: stroke, width, dash
    'eth': ('#4a4a48', 0.35, None), 'fo': ('#e07b00', 0.55, None), 'rs485': ('#2e8b57', 0.4, '1.6 0.8'),
    'hw': ('#1d1d1b', 0.3, '0.4 0.6'), 'iolink': ('#2a62c9', 0.5, '2.2 0.8 0.5 0.8'), 'hsby': ('#7a3db8', 0.6, '1.4 0.7'),
    'plc': ('#9b59b6', 0.45, '0.3 0.9'), 'vpn': ('#5b5b57', 0.35, '2 1.2'), 'power': ('#1d1d1b', 0.6, None),
    'dc': ('#8b5a2b', 0.45, '1.2 0.6'), 'vendor': ('#c0392b', 0.4, '2 1'), 'busa': ('#2a78d6', 0.6, None), 'busb': ('#e8622c', 0.6, None),
}
STRIPE = {'eth': '#4a4a48', 'fo': '#e07b00', 'rs485': '#2e8b57', 'hw': '#1d1d1b', 'iolink': '#2a62c9', 'plc': '#9b59b6', 'none': '#b8c2cc', 'ctrl': '#2a62c9'}


def wrap(text, width, size):
    """Split text into lines that fit width (mm) at font size (mm)."""
    cw = size * 0.53
    out = []
    for para in str(text).split('\n'):
        words, line = para.split(' '), ''
        for w in words:
            t = (line + ' ' + w).strip()
            if len(t) * cw > width and line:
                out.append(line)
                line = w
            else:
                line = t
        out.append(line)
    return out


def t(x, y, s, size=2.0, w=400, fill=INK, anchor='start', italic=False):
    st = ' font-style="italic"' if italic else ''
    return f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size}" font-weight="{w}" fill="{fill}" text-anchor="{anchor}"{st}>{escape(str(s))}</text>'


def tw(x, y, s, width, size=1.9, lead=1.25, **k):
    """Wrapped text block; returns (svg, height)."""
    lines = wrap(s, width, size)
    return ''.join(t(x, y + i * size * lead, ln, size, **k) for i, ln in enumerate(lines)), len(lines) * size * lead


def line(pts, style='eth', arrow=False):
    col, wd, dash = STYLE[style]
    d = f' stroke-dasharray="{dash}"' if dash else ''
    p = ' '.join(f'{x:.2f},{y:.2f}' for x, y in pts)
    s = f'<polyline points="{p}" fill="none" stroke="{col}" stroke-width="{wd}"{d} stroke-linejoin="round"/>'
    if arrow:
        (x1, y1), (x2, y2) = pts[-2], pts[-1]
        import math
        a = math.atan2(y2 - y1, x2 - x1)
        l, h = 1.8, 0.8
        p1 = (x2 - l * math.cos(a) + h * math.sin(a), y2 - l * math.sin(a) - h * math.cos(a))
        p2 = (x2 - l * math.cos(a) - h * math.sin(a), y2 - l * math.sin(a) + h * math.cos(a))
        s += f'<polygon points="{x2:.2f},{y2:.2f} {p1[0]:.2f},{p1[1]:.2f} {p2[0]:.2f},{p2[1]:.2f}" fill="{col}"/>'
    return s


def box(x, y, w, h, title, lines=(), stripe='eth', size=1.75, fill='#ffffff', title_size=2.05):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{INK}" stroke-width="0.25"/>'
    if stripe:
        s += f'<rect x="{x}" y="{y}" width="1.1" height="{h}" fill="{STRIPE.get(stripe, stripe)}"/>'
    s += t(x + 2.2, y + 3.0, title, title_size, 700)
    yy = y + 3.0 + title_size * 0.5 + size * 1.05
    for ln in lines:
        txt, hh = tw(x + 2.2, yy, ln, w - 3.4, size, fill=GREY)
        s += txt
        yy += hh
    return s


def zone(x, y, w, h, label, dash=True):
    d = ' stroke-dasharray="1.6 1"' if dash else ''
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="1.2" fill="#f7f9fb" stroke="{ZONE}" stroke-width="0.3"{d}/>'
            + t(x + 2, y + 3.4, label.upper(), 2.05, 700, '#3a4a5a').replace('<text ', '<text class="zl" paint-order="stroke" stroke="#f7f9fb" stroke-width="0.9" ', 1))


def labels_on_top(svg):
    """Moves zone labels to the end so lines drawn later do not cross them."""
    import re
    lab = re.findall(r'<text class="zl".*?</text>', svg)
    svg = re.sub(r'<text class="zl".*?</text>', '', svg)
    return svg.replace('</svg>', ''.join(lab) + '</svg>')


def table(x, y, cols, head, rows, size=1.7, title=None, lead=1.22, pad=0.8):
    """cols: widths in mm. Returns (svg, total height)."""
    s, yy = '', y
    if title:
        s += t(x, y + 2.6, title, 2.2, 700)
        yy += 4.2

    def row(vals, bold=False, shade=None):
        nonlocal s, yy
        cells = [wrap(v, cw - 2 * pad, size) for v, cw in zip(vals, cols)]
        hh = max(len(c) for c in cells) * size * lead + 2 * pad
        xx = x
        for c, cw in zip(cells, cols):
            s += f'<rect x="{xx:.2f}" y="{yy:.2f}" width="{cw}" height="{hh:.2f}" fill="{shade or "#ffffff"}" stroke="#7d8790" stroke-width="0.18"/>'
            for i, ln in enumerate(c):
                s += t(xx + pad, yy + pad + size * 0.85 + i * size * lead, ln, size, 700 if bold else 400)
            xx += cw
        yy += hh
    row(head, True, LIGHT)
    for r in rows:
        row([str(v) for v in r])
    return s, yy - y


def image(x, y, w, h, path):
    data = base64.b64encode(open(path, 'rb').read()).decode()
    return f'<image x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,{data}"/>'


LEGEND_ITEMS = {
    'eth': 'Ethernet copper – IEC 104 / Modbus TCP / IEC 61850', 'fo': 'Ethernet single-mode fibre (ring)',
    'iolink': 'SICAM I/O link (copper or fibre pair)', 'hsby': 'Hot standby link CP-8050 A ↔ B',
    'rs485': 'RS485 – Modbus RTU', 'hw': 'Hardwired I/O (DI / DO / AI)', 'plc': 'Power line communication (inverters)',
    'vpn': 'VPN, off by default', 'power': 'Power circuit', 'dc': 'DC circuit', 'vendor': 'Vendor scope boundary',
    'busa': 'Link to core switch A', 'busb': 'Link to core switch B',
}


def sheet(no, title, subtitle, body, legend, notes, legend_extra=''):
    """Frame, title column and body. legend: list of style keys or (svg_symbol, text) tuples."""
    X0 = 333  # title column left edge
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}" style="font-family:{FONT}">',
         f'<rect width="{W}" height="{H}" fill="#fff"/>',
         f'<rect x="5" y="5" width="{W - 10}" height="{H - 10}" fill="none" stroke="{INK}" stroke-width="0.5"/>',
         f'<line x1="{X0}" y1="5" x2="{X0}" y2="{H - 5}" stroke="{INK}" stroke-width="0.4"/>', body]
    cx, cw = X0 + 2, W - 5 - X0 - 4
    # legend
    y = 9
    s.append(t(cx, y + 1.5, 'LEGEND', 2.3, 700))
    y += 4.5
    for it in legend:
        if isinstance(it, str):
            col, wd, dash = STYLE[it]
            d = f' stroke-dasharray="{dash}"' if dash else ''
            s.append(f'<line x1="{cx}" y1="{y - 0.6}" x2="{cx + 9}" y2="{y - 0.6}" stroke="{col}" stroke-width="{wd + 0.1}"{d}/>')
            s.append(t(cx + 11, y, LEGEND_ITEMS[it], 1.7))
        else:
            sym, txt = it
            s.append(sym.replace('{x}', str(cx)).replace('{y}', f'{y - 2.2:.2f}'))
            s.append(t(cx + 11, y, txt, 1.7))
        y += 3.3
    s.append(legend_extra)
    y += 1.5
    s.append(f'<line x1="{X0}" y1="{y}" x2="{W - 5}" y2="{y}" stroke="{INK}" stroke-width="0.3"/>')
    y += 4
    s.append(t(cx, y, 'NOTES', 2.3, 700))
    y += 3.6
    for i, n in enumerate(notes, 1):
        txt, hh = tw(cx + 3, y, n, cw - 3, 1.65, lead=1.22)
        s.append(t(cx, y, f'{i}.', 1.65, 700) + txt)
        y += hh + 0.9
    assert y < 186, ('notes too long on sheet', no, y)
    # revision table
    y0 = 188
    s.append(f'<line x1="{X0}" y1="{y0}" x2="{W - 5}" y2="{y0}" stroke="{INK}" stroke-width="0.3"/>')
    rt, _ = table(cx, y0 + 1.5, [8, cw - 30, 22], ['REV', 'DESCRIPTION', 'DATE'],
                  [['A', 'Issued for client approval – SICAM A8000 design', '16-OCT-2026'], ['', '', ''], ['', '', '']], size=1.6)
    s.append(rt)
    yb = 210
    blocks = [('CLIENT:', ['MINISTRY OF ENERGY & WATER RESOURCES – SOMALIA', 'SITE: VILLA SOMALIA']), ('CONTRACTOR:', ['BLUEFLAG ENERGY CO. LTD']),
              ('PROJECT TITLE:', ['SOLARIZATION VILLA SOMALIA – SCADA'])]
    for lab, vals in blocks:
        s.append(f'<line x1="{X0}" y1="{yb}" x2="{W - 5}" y2="{yb}" stroke="{INK}" stroke-width="0.3"/>')
        s.append(t(cx, yb + 3, lab, 1.6, 400, GREY))
        for i, v in enumerate(vals):
            s.append(t(cx, yb + 6.3 + i * 2.8, v, 2.0 if i == 0 else 1.7, 700 if i == 0 else 400))
        yb += 8 + 2.8 * len(vals)
    s.append(f'<line x1="{X0}" y1="{yb}" x2="{W - 5}" y2="{yb}" stroke="{INK}" stroke-width="0.3"/>')
    s.append(t(cx, yb + 3, 'SHEET TITLE:', 1.6, 400, GREY))
    s.append(t(X0 + (W - 5 - X0) / 2, yb + 8.5, title, 3.2, 700, anchor='middle'))
    s.append(t(X0 + (W - 5 - X0) / 2, yb + 11.8, subtitle, 1.8, 400, GREY, 'middle'))
    yb += 14
    s.append(f'<line x1="{X0}" y1="{yb}" x2="{W - 5}" y2="{yb}" stroke="{INK}" stroke-width="0.3"/>')
    s.append(t(cx, yb + 3.4, 'SCALE: NTS', 1.7) + t(cx + 26, yb + 3.4, 'DATE: 16-OCT-2026', 1.7) + t(W - 7, yb + 3.4, 'SIZE: A3', 1.7, anchor='end'))
    yb += 5
    for lab in ('DESIGNED', 'DRAWN', 'CHECKED', 'APPROVED'):
        s.append(f'<line x1="{X0}" y1="{yb}" x2="{W - 5}" y2="{yb}" stroke="{INK}" stroke-width="0.2"/>')
        s.append(t(cx, yb + 3.2, lab, 1.6) + f'<line x1="{cx + 52}" y1="{yb}" x2="{cx + 52}" y2="{yb + 4.6}" stroke="{INK}" stroke-width="0.2"/>' + t(cx + 54, yb + 3.2, 'SIGN', 1.4, 400, GREY))
        yb += 4.6
    s.append(f'<line x1="{X0}" y1="{yb}" x2="{W - 5}" y2="{yb}" stroke="{INK}" stroke-width="0.4"/>')
    s.append(t(cx, yb + 4.6, 'DRW NO.', 1.6, 400, GREY) + t(cx + 13, yb + 4.6, f'BFE/PR/26/01-SCADA-{no:03d}', 2.2, 700) + t(W - 7, yb + 4.6, 'REV A', 2.2, 700, anchor='end'))
    assert yb + 7 <= H - 5, ('title column overflow', yb)
    s.append('</svg>')
    return '\n'.join(s)
