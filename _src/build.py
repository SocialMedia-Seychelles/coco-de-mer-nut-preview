"""Builds the static pages: _src/pages/*.html + _src/partials/*.html -> nut-site/*.html

Page files start with a JSON comment, e.g.
<!--{"title": "...", "desc": "...", "nav": "shop", "ink": "dark", "page": "nut"}-->
Partials are included with {{> name}}; {{v}} is the cache-busting version.
Journal posts live in _src/posts/<slug>.html and build to post/<slug>/index.html (old Wix URLs).
"""
import json, re, pathlib, time, datetime, html as H, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / '_src'
V = 'n' + str(int(time.time()))[-6:]
NAV = ['shop', 'kernel', 'about', 'journal', 'guide']
# Perfume site base URL: switch to https://www.cocodemercollection.com/ at launch
PERFUME = 'https://socialmedia-seychelles.github.io/coco-de-mer-preview/'

partials = {p.stem: p.read_text() for p in (SRC / 'partials').glob('*.html')}

# Journal posts: _src/posts/<slug>.html (JSON comment + body) -> post/<slug>/index.html, same URLs as the old Wix blog
CATS = {'nut': 'The Nut', 'legend': 'Legend &amp; History', 'guide': 'Buying Guides', 'visit': 'Visiting Seychelles', 'perfume': 'Perfume'}
posts = []
for f in (SRC / 'posts').glob('*.html'):
    raw = f.read_text()
    m = re.match(r'<!--(.*?)-->\s*', raw, re.S)
    meta = json.loads(m.group(1))
    meta['title'] = H.escape(H.unescape(meta['title']), quote=False)
    meta.update(slug=f.stem, body=raw[m.end():], when=datetime.date.fromisoformat(meta['date']))
    meta['pretty'] = meta['when'].strftime('%b %-d, %Y')
    posts.append(meta)
posts.sort(key=lambda p: p['when'], reverse=True)

def row(i, p):
    return ('<a class="jx-row" data-cat="{cat}" data-img="{hero}" href="post/{slug}/"><span class="jx-n">{n:02d}</span>'
            '<span class="jx-thumb"><img src="{hero}" alt="" loading="lazy"></span><span class="jx-t">{title}</span>'
            '<span class="jx-c">{catname}</span><span class="jx-m">{pretty} · {mins}</span>'
            '<svg class="jx-go" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg></a>').format(
        n=i, catname=CATS[p['cat']], mins=p['read'].replace(' read', ''), **p)
partials['jr-index'] = '\n'.join(row(i, p) for i, p in enumerate(posts, 1)) + '\n'

def card(p):
    return ('<a class="ps-card reveal" href="post/{slug}/"><figure><img src="{hero}" alt="" loading="lazy"></figure>'
            '<small>{catname}</small><h3>{title}</h3><span>{pretty} · {read}</span></a>').format(catname=CATS[p['cat']], **p)

CTA = {
    'perfume': ('The husk becomes <em>perfume.</em>', 'Five fragrances made with the Coco de Mer husk, in our own factory.', '{{perfume}}index.html#collection', 'Discover the perfumes', ' target="_blank" rel="noopener"'),
    'visit': ('Come and see it <em>for yourself.</em>', 'Free factory tours, Monday to Saturday. No booking needed.', '{{perfume}}shop-locally.html#tours', 'About the free tours', ' target="_blank" rel="noopener"'),
}
CTA_NUT = ('Own a piece of <em>the legend.</em>', 'Certified, government-sealed nuts, shipped worldwide with all paperwork.', 'shop.html', 'Shop the Nut', '')

def cta(cat):
    h, p, href, label, ext = CTA.get(cat, CTA_NUT)
    return ('<section class="sec forest"><div class="wrap ps-cta"><h2 class="h2 split"><span class="ln">%s</span></h2>'
            '<p class="lede reveal" data-d="1">%s</p><a class="btn btn-gold reveal" data-d="2" href="%s"%s>%s {{> arrow}}</a></div></section>') % (h, p, href, ext, label)

def relative(html, depth):
    if not depth:
        return html
    up = '../' * depth
    html = re.sub(r'((?:href|src)=")(?!https?:|mailto:|tel:|#|data:|/|\{\{)', r'\1' + up, html)
    return html.replace('url(assets/', 'url(' + up + 'assets/')

def expand(text, depth=0):
    if depth > 6:
        return text
    return re.sub(r'\{\{>\s*([\w-]+)\s*\}\}', lambda m: expand(partials[m.group(1)], depth + 1), text)

def render(meta, body, out, depth=0):
    html = expand(partials['layout']).replace('{{body}}', expand(body))
    for key in NAV:
        html = html.replace('{{cur:%s}}' % key, ' aria-current="page"' if meta.get('nav') == key else '')
    html = (html.replace('{{title}}', meta['title'])
                .replace('{{desc}}', meta['desc'])
                .replace('{{ink}}', meta.get('ink', 'light'))
                .replace('{{page}}', meta.get('page', out.stem))
                .replace('{{preload}}', meta.get('preload', ''))
                .replace('{{v}}', V)
                .replace('{{perfume}}', PERFUME))
    left = re.findall(r'\{\{[^}]*\}\}', html)
    if left:
        raise SystemExit(f'{out}: unresolved {set(left)}')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(relative(html, depth))
    return len(html)

for page in sorted((SRC / 'pages').glob('*.html')):
    raw = page.read_text()
    m = re.match(r'<!--(.*?)-->\s*', raw, re.S)
    print('built', page.name, render(json.loads(m.group(1)), raw[m.end():], ROOT / page.name))

for p in posts:
    related = [q for q in posts if q['cat'] == p['cat'] and q is not p][:3]
    related += [q for q in posts if q is not p and q not in related][:3 - len(related)]
    canon = 'https://www.cocodemerseychelles.com/post/' + p['slug']
    ld = {'@context': 'https://schema.org', '@type': 'BlogPosting', 'headline': H.unescape(p['title']), 'datePublished': p['date'],
          'description': p['desc'], 'mainEntityOfPage': canon, 'publisher': {'@type': 'Organization', 'name': 'Coco De Mer Seychelles'}}
    body = (partials['post'].replace('{{post_body}}', p['body'].strip()).replace('{{post_related}}', '\n'.join(map(card, related)))
            .replace('{{post_cta}}', cta(p['cat'])).replace('{{post_title}}', p['title']).replace('{{post_catname}}', CATS[p['cat']])
            .replace('{{post_iso}}', p['date']).replace('{{post_date}}', p['pretty']).replace('{{post_read}}', p['read'])
            .replace('{{post_hero}}', p['hero']).replace('{{post_alt}}', H.escape(H.unescape(p['hero_alt']), quote=True))
            .replace('{{post_share}}', urllib.parse.quote(H.unescape(p['title']) + ' ' + canon)))
    meta = {'title': p['title'] + ' · Coco De Mer Seychelles', 'desc': H.escape(p['desc'], quote=True), 'nav': 'journal', 'ink': 'dark', 'page': 'post',
            'preload': '<link rel="canonical" href="%s">\n<script type="application/ld+json">%s</script>' % (canon, json.dumps(ld, ensure_ascii=False))}
    render(meta, body, ROOT / 'post' / p['slug'] / 'index.html', depth=2)
print('built', len(posts), 'posts')
