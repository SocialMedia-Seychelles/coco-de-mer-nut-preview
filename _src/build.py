"""Builds the static pages: _src/pages/*.html + _src/partials/*.html -> nut-site/*.html

Page files start with a JSON comment, e.g.
<!--{"title": "...", "desc": "...", "nav": "shop", "ink": "dark", "page": "nut"}-->
Partials are included with {{> name}}; {{v}} is the cache-busting version.
"""
import json, re, pathlib, time

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / '_src'
V = 'n' + str(int(time.time()))[-6:]
NAV = ['shop', 'kernel', 'about', 'journal', 'visit', 'guide']

partials = {p.stem: p.read_text() for p in (SRC / 'partials').glob('*.html')}

def expand(text, depth=0):
    if depth > 6:
        return text
    return re.sub(r'\{\{>\s*([\w-]+)\s*\}\}', lambda m: expand(partials[m.group(1)], depth + 1), text)

for page in sorted((SRC / 'pages').glob('*.html')):
    raw = page.read_text()
    m = re.match(r'<!--(.*?)-->\s*', raw, re.S)
    meta = json.loads(m.group(1))
    html = expand(partials['layout']).replace('{{body}}', expand(raw[m.end():]))
    for key in NAV:
        html = html.replace('{{cur:%s}}' % key, ' aria-current="page"' if meta.get('nav') == key else '')
    html = (html.replace('{{title}}', meta['title'])
                .replace('{{desc}}', meta['desc'])
                .replace('{{ink}}', meta.get('ink', 'light'))
                .replace('{{page}}', meta.get('page', page.stem))
                .replace('{{preload}}', meta.get('preload', ''))
                .replace('{{v}}', V))
    left = re.findall(r'\{\{[^}]*\}\}', html)
    if left:
        raise SystemExit(f'{page.name}: unresolved {set(left)}')
    (ROOT / page.name).write_text(html)
    print('built', page.name, len(html))
