"""ONE-OFF (already run 2026-11-03): edit _src/posts/*.html directly now; re-running overwrites them.
Turn parsed Wix posts (JSON) into source files for the new site: nut-site/_src/posts/<slug>.html"""
import json, re, sys, pathlib, html as H

SP, SITE = map(pathlib.Path, sys.argv[1:3])
IMG = json.load(open(SP / 'img-map.json'))
OUT = SITE / '_src/posts'; OUT.mkdir(exist_ok=True)
# category + tidy display title: kept from the first migration run (stored in each post's header)
cats, titles = {}, {}
for f in OUT.glob('*.html'):
    m = json.loads(re.match(r'<!--(.*?)-->', f.read_text(), re.S)[1])
    cats[f.stem], titles[f.stem] = m['cat'], H.escape(m['title'], quote=False)
SLUGS = set(cats)

def img_path(mid):
    return 'assets/img/web/journal/' + IMG[mid][0]

def fix_links(h):
    # Wix auto-linked "word.Next" where a space was missing: unwrap and add the space
    h = re.sub(r'<a href="http://[A-Za-z]+\.[A-Z][A-Za-z]*/?">(.*?)</a>', r'\1', h)
    # ...and add the missing space after full stops ("uses.In" -> "uses. In"), outside tags
    h = re.sub(r'(?<=>)([^<]+)|^([^<]+)', lambda m: re.sub(r'([a-z)])\.([A-Z][a-z])', r'\1. \2', m[0]), h)
    def repl(m):
        url = m[1]
        p = re.match(r'https?://(?:www\.)?cocodemerseychelles\.com(/[^"]*)?$', url)
        if p:
            path = (p[1] or '/').rstrip('/')
            if path.startswith('/post/') and path[6:] in SLUGS: return 'href="post/%s/"' % path[6:]
            return 'href="index.html"'
        if re.match(r'https?://(?:www\.)?cocodemercosmetics\.com', url): return 'href="{{perfume}}" target="_blank" rel="noopener"'
        if url.startswith('mailto:'): return m[0]
        return 'href="%s" target="_blank" rel="noopener"' % url
    return re.sub(r'href="([^"]+)"', repl, h)

def clean(h):
    h = h.replace('\t', ' ').replace('\xa0', ' ')
    h = re.sub(r'<strong>\s*</strong>|<em>\s*</em>', '', h)
    h = re.sub(r'</strong>(?=[A-Z])', '</strong> ', h)
    h = re.sub(r'\s+', ' ', h).strip()
    h = re.sub(r'(<br>\s*)+$', '', h)
    return fix_links(h)

def text(h): return re.sub(r'<[^>]+>', '', h).strip()

SPLIT_WORDS = {'de', 'and', 'the', 'of', 'a', 'an', 'to', 'in', 'on', 'with', 'for', 'from', 'its', 'their', 'is', 'as', 'by', 'at', 'or', 'Coco'}
def joins(prev, nxt):
    # Wix split sentences across paragraphs; rejoin when the first part clearly runs on
    a, b = text(prev), text(nxt)
    if not b or re.search(r'[.!?”"…)]$', a) or re.search(r'https?://', a): return False
    if re.match(r'^[a-z(]', b): return True
    return bool(re.search(r'\b(\w+)$', a)) and re.search(r'\b(\w+)$', a)[1] in SPLIT_WORDS

def blocks_to_html(d):
    bl = [b for b in d['blocks']]
    # drop the cover image if the post repeats it as its first picture
    firstimg = next((i for i, b in enumerate(bl) if b['t'] == 'img'), None)
    if firstimg is not None and firstimg < 3 and bl[firstimg]['src'] == d['hero']: bl.pop(firstimg)
    # join paragraphs Wix split mid-sentence; pictures caught in between move after the joined paragraph
    out, held = [], []
    for b in bl:
        if b['t'] == 'p': b = dict(b, h=clean(b['h']))
        if b['t'] == 'p' and out and out[-1]['t'] == 'p' and joins(out[-1]['h'], b['h']):
            out[-1]['h'] += ' ' + b['h']; continue
        if b['t'] == 'p' and out and out[-1]['t'] in ('ul', 'ol') and re.match(r'^[a-z(]', text(b['h'])):
            out[-1]['items'][-1] += ' ' + b['h']; continue
        if b['t'] in ('ul', 'ol') and out and out[-1]['t'] == b['t']:
            out[-1] = dict(out[-1], items=out[-1]['items'] + b['items']); continue
        if b['t'] == 'img' and out and out[-1]['t'] == 'p' and not re.search(r'[.!?:”"]$', text(out[-1]['h'])):
            held.append(b); continue
        if held and not (b['t'] == 'p' and re.match(r'^[a-z(]', text(b['h']))):
            out.extend(held); held = []
        if held and b['t'] == 'p':
            out[-1]['h'] += ' ' + b['h']; continue
        out.append(b)
    out.extend(held)
    parts = []
    for b in out:
        t = b['t']
        if t == 'img':
            if not b['src']: continue
            alt = H.escape(b['alt'] or b['cap'] or '', quote=True)
            cap = '<figcaption>%s</figcaption>' % H.escape(b['cap']) if b['cap'].strip() else ''
            w, h = IMG[b['src']][1]
            parts.append('<figure class="reveal"><img src="%s" alt="%s" width="%d" height="%d" loading="lazy">%s</figure>' % (img_path(b['src']), alt, w, h, cap))
        elif t in ('ul', 'ol'):
            items = [clean(i) for i in b['items'] if text(i)]
            parts.append('<%s>\n%s\n</%s>' % (t, '\n'.join('  <li>%s</li>' % i for i in items), t))
        elif t == 'h':
            parts.append('<%s>%s</%s>' % ('h2' if b['lvl'] <= 3 else 'h3', re.sub(r'</?strong>', '', clean(b['h'])), 'h2' if b['lvl'] <= 3 else 'h3'))
        elif t == 'q':
            parts.append('<blockquote>%s</blockquote>' % clean(b['h']))
        else:
            h = b['h']
            if re.fullmatch(r'[_\-–—\s]{3,}', text(h)): parts.append('<hr>'); continue
            m = re.fullmatch(r'<strong>([^<]{3,90})</strong>:?', h)
            if m: parts.append('<h2>%s</h2>' % m[1].strip().rstrip(':')); continue
            parts.append('<p>%s</p>' % h)
    return '\n'.join(parts)

def short(s, n=180):
    s = re.sub(r'\s+', ' ', s).strip()
    return s if len(s) <= n else s[:n].rsplit(' ', 1)[0].rstrip('.,;:—–-') + '…'

EDITS = json.load(open(SP / 'tools/edits.json'))
for f in sorted((SP / 'posts').glob('*.json')):
    d = json.load(open(f)); slug = d['slug']
    body = blocks_to_html(d)
    ed = EDITS.get(slug, {})
    if 'body' in ed: body = ed['body']
    if 'cut_from' in ed: body = body[:body.index(ed['cut_from'])].rstrip()
    for a, b in ed.get('replace', []):
        if a not in body: raise SystemExit(f'{slug}: edit not found: {a[:70]}')
        body = body.replace(a, b)
    meta = {
        'title': ed.get('title', H.unescape(titles[slug])),
        'desc': ed.get('desc', short(d['desc'])),
        'date': d['date'], 'read': d['read'], 'cat': cats[slug],
        'hero': img_path(d['hero']), 'hero_alt': ed.get('hero_alt', H.unescape(titles[slug])),
    }
    (OUT / f'{slug}.html').write_text('<!--%s-->\n%s\n' % (json.dumps(meta, ensure_ascii=False), body))
    print(slug[:46].ljust(48), len(body), body.count('<p>'), body.count('<figure'), body.count('<h2>'))
