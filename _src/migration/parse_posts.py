"""Parse saved Wix post pages into simple blocks (JSON) for the migration."""
import html, json, re, sys, pathlib, email.utils
from html.parser import HTMLParser

FEED, HTMLDIR, OUT = map(pathlib.Path, sys.argv[1:4])
feed = FEED.read_text()
dates = {}
for item in re.findall(r'<item>(.*?)</item>', feed, re.S):
    link = re.search(r'<link>(.*?)</link>', item).group(1)
    pub = re.search(r'<pubDate>(.*?)</pubDate>', item).group(1)
    dates[link.split('/post/')[1]] = email.utils.parsedate_to_datetime(pub).date().isoformat()

def media(src):
    m = re.search(r'static\.wixstatic\.com/media/([^/]+)', src or '')
    return m.group(1) if m else ''

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks, self.buf, self.mode, self.skip, self.fig = [], None, None, 0, None
        self.items = None
    def inline(self, s):
        if self.buf is not None: self.buf.append(s)
    def handle_starttag(self, t, a):
        a = dict(a)
        if t in ('svg', 'button'): self.skip += 1; return
        if self.skip: return
        if t == 'figure': self.fig = {'t': 'img', 'src': '', 'alt': '', 'cap': ''}; return
        if self.fig is not None:
            if t == 'img' and not self.fig['src']: self.fig['src'] = media(a.get('src')); self.fig['alt'] = a.get('alt', '')
            if t == 'figcaption': self.buf = []; self.mode = 'cap'
            return
        if t in ('ul', 'ol'): self.items = []; self.listtag = t; return
        if t == 'li': self.buf = []; self.mode = 'li'; return
        if t in ('p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'):
            if self.mode == 'li': return
            self.buf = []; self.mode = t; return
        if t in ('strong', 'b'): self.inline('<strong>')
        elif t in ('em', 'i'): self.inline('<em>')
        elif t == 'a': self.inline('<a href="%s">' % html.escape(a.get('href', ''), quote=True))
        elif t == 'br': self.inline('<br>')
    def handle_endtag(self, t):
        if t in ('svg', 'button'): self.skip -= 1; return
        if self.skip: return
        if self.fig is not None:
            if t == 'figcaption': self.fig['cap'] = ''.join(self.buf).strip(); self.buf = None; self.mode = None
            if t == 'figure': self.blocks.append(self.fig); self.fig = None
            return
        if t == 'li' and self.mode == 'li':
            self.items.append(''.join(self.buf).strip()); self.buf = None; self.mode = None; return
        if t in ('ul', 'ol') and self.items is not None:
            self.blocks.append({'t': self.listtag, 'items': [i for i in self.items if i]}); self.items = None; return
        if t == self.mode and self.buf is not None:
            h = ''.join(self.buf).strip()
            h = re.sub(r'(<br>\s*)+$', '', h)
            if re.sub(r'<[^>]+>|\s', '', h):
                kind = 'p' if t == 'p' else ('q' if t == 'blockquote' else 'h')
                self.blocks.append({'t': kind, 'lvl': int(t[1]) if kind == 'h' else 0, 'h': h})
            self.buf = None; self.mode = None; return
        if t in ('strong', 'b'): self.inline('</strong>')
        elif t in ('em', 'i'): self.inline('</em>')
        elif t == 'a': self.inline('</a>')
    def handle_data(self, d):
        if not self.skip and self.buf is not None: self.buf.append(html.escape(d, quote=False))

OUT.mkdir(parents=True, exist_ok=True)
for f in sorted(HTMLDIR.glob('*.html')):
    s = f.read_text()
    slug = f.stem
    i = s.find('data-id="content-viewer"'); j = s.find('data-hook="post-footer"', i)
    p = P(); p.feed(s[s.find('>', i) + 1:j])
    meta = lambda prop: (re.search(r'<meta (?:property|name)="%s" content="([^"]*)"' % prop, s) or [None, ''])[1]
    read = re.search(r'data-hook="time-to-read"[^>]*>(?:<[^>]+>)*([^<]+)', s)
    d = {'slug': slug, 'title': html.unescape(meta('og:title')).strip(), 'desc': html.unescape(meta('og:description')).strip(),
         'date': dates.get(slug, ''), 'read': read.group(1).strip() if read else '', 'hero': media(meta('og:image')), 'blocks': p.blocks}
    (OUT / f'{slug}.json').write_text(json.dumps(d, indent=1, ensure_ascii=False))
    print(slug[:50].ljust(52), d['date'], d['read'].ljust(12), len(p.blocks), sum(b['t'] == 'img' for b in p.blocks), d['hero'][:20])
