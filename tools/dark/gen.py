"""Génère css/dark.css à partir de css/app.css.

Chaque règle qui pose une couleur claire en fond (ou une couleur foncée pour le texte) reçoit
son équivalent sombre sous html[data-theme="dark"]. Le carnet (papier, cuir, stickers) et les
cadres des photos ne sont pas touchés : ce sont des objets, ils gardent leurs couleurs.

Usage : python3 tools/dark/gen.py   (depuis la racine du site)
"""
import re, colorsys, pathlib

SRC = pathlib.Path('css/app.css').read_text()
OUT = pathlib.Path('css/dark.css')
PRE = 'html[data-theme="dark"]'

EXCLUDE = re.compile(r'\.pg\b|\.pg-|\.bk-|\.book-ov|\.stk|\.spine|\.bookcase|\.bc-|\.decor|\.d-plant|\.pola|\.phf|\.fr-|\.sb\b|\.st i|\.s-script|'
                     r'\.s-serif|\.sd\b|\.stape|\.sx|\.tf-|\.ft-|\.pp-|\.demo|\.dp-stack>span|\.dp-more|\.pcard|\.pcap|\.fold-|\.mini-book|\.lf\b|\.orn|'
                     r'\.snapbox|\.cover|\.dhero|\.hhero|\.htext|\.hshade|\.rec\b|\.rec |\.glass|\.thumbs|\.mosaic|\.splash|\.crown|\.gp-img|\.edge-back|'
                     r'\.ptr\b|\.ptr |\.bk\b|\.mapcard img|\.sc-|\.score|\.pin img|\.cv\b|\.cv |\.cd \.cv|\.tape|\.sw\b|\.mpin|\.zoom|\.legend|\.gauge|\.g-|::selection')
VARS_TEXT = {'--ink': '#ECEBE6', '--navy': '#ECEBE6', '--ink-2': '#DAD8D2', '--green': '#93C9A3', '--pink': '#93C9A3', '--aqua-ink': '#93C9A3',
             '--pink-ink': '#F0977E', '--muted': '#A3A69F'}

def parse(css):
    """Renvoie [(préfixe @media ou '', sélecteur, déclarations)] ; ignore @keyframes et @font-face."""
    out, i, n = [], 0, len(css)
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    def block(s, media):
        j = 0
        while j < len(s):
            k = s.find('{', j)
            if k < 0: break
            head = s[j:k].strip()
            depth, m = 1, k + 1
            while m < len(s) and depth:
                depth += {'{': 1, '}': -1}.get(s[m], 0); m += 1
            body = s[k + 1:m - 1]
            if head.startswith('@media') or head.startswith('@supports'):
                block(body, head)
            elif not head.startswith('@'):
                out.append((media, head, body))
            j = m
    block(css, '')
    return out

def hex2rgb(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
def rgb2hex(r, g, b): return '#%02X%02X%02X' % tuple(round(max(0, min(1, x)) * 255) for x in (r, g, b))
def lum(rgb): r, g, b = rgb; return 0.2126 * r + 0.7152 * g + 0.0722 * b

def dark_bg(rgb):
    h, l, s = colorsys.rgb_to_hls(*rgb)
    nl = 0.085 + (1 - l) * 0.55
    return colorsys.hls_to_rgb(h, nl, s * 0.35)
def light_fg(rgb):
    h, l, s = colorsys.rgb_to_hls(*rgb)
    nl = 0.9 - l * 0.35
    return colorsys.hls_to_rgb(h, nl, min(1, s * 0.75))

COLOR = re.compile(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)|\bwhite\b|var\(--[a-z0-9-]+\)')

def conv(tok, role):
    """role : 'bg' (fond) ou 'fg' (texte, trait)."""
    if tok.startswith('var('):
        name = tok[4:-1]
        if role == 'fg' and name in VARS_TEXT: return VARS_TEXT[name]
        if role == 'bg' and name in ('--white',): return '#1C1F1D'
        return tok
    if tok.startswith('rgb'):
        p = [x.strip() for x in tok[tok.index('(') + 1:-1].split(',')]
        if len(p) < 3: return tok
        r, g, b = (float(x) / 255 for x in p[:3]); a = float(p[3]) if len(p) > 3 else 1
        if role == 'bg' and lum((r, g, b)) > 0.85 and a >= 0.6:
            return 'rgba(%d,%d,%d,%s)' % tuple([round(x * 255) for x in dark_bg((r, g, b))] + [p[3] if len(p) > 3 else '1'])
        if lum((r, g, b)) < 0.15 and a <= 0.2:  # traits et ombres légers : clairs en mode sombre
            return 'rgba(255,255,255,%s)' % p[3] if role == 'line' else tok
        return tok
    rgb = (1, 1, 1) if tok == 'white' else hex2rgb(tok)
    L = lum(rgb)
    if role == 'bg' and L > 0.72: return rgb2hex(*dark_bg(rgb))
    if role == 'fg' and L < 0.32: return rgb2hex(*light_fg(rgb))
    return tok

DARK_BG = re.compile(r'var\(--(ink|navy)\)|#1[0-9A-Fa-f]{5}\b|#20243A', re.I)

def transform(body):
    decls = [d.strip() for d in re.split(r';(?![^(]*\))', body) if d.strip() and ':' in d]
    props = {d.split(':', 1)[0].strip(): d.split(':', 1)[1].strip() for d in decls}
    out = {}
    bg = props.get('background', props.get('background-color', ''))
    fg = props.get('color', '')
    # pastilles foncées à texte blanc : inversées (pastille claire, texte foncé)
    if bg and DARK_BG.search(bg) and re.fullmatch(r'\s*(#fff|#ffffff|white|#FFF|#FFFFFF)\s*(!important)?', fg or 'x'):
        out['background'] = '#ECEBE6'; out['color'] = '#151714'
        return out
    for p, v in props.items():
        if p.startswith('--'): continue
        role = 'bg' if p in ('background', 'background-color', 'background-image') else 'fg' if p in ('color', 'fill', 'stroke', 'caret-color', '-webkit-text-fill-color') \
            else 'line' if p.startswith('border') or p in ('outline', 'box-shadow', 'outline-color', 'text-decoration-color') else None
        if not role: continue
        if role == 'bg' and 'url(' in v and not re.search(r'#fff|white|#F[0-9A-F]{5}', v, re.I): continue
        if role == 'line':
            nv = COLOR.sub(lambda m: conv(m.group(0), 'line'), v)
            nv = re.sub(r'#(?:fff|ffffff)\b|\bwhite\b', '#2A2D2B' if p.startswith(('border', 'outline')) else '#1C1F1D', nv, flags=re.I)
        else:
            nv = COLOR.sub(lambda m: conv(m.group(0), role), v)
        if nv != v: out[p] = nv
    return out

rules = parse(SRC)
# la cascade : pour un même sélecteur, seule la dernière valeur de chaque propriété compte
final, order = {}, {}
for n, (media, sel, body) in enumerate(rules):
    for part in (x.strip() for x in sel.split(',')):
        if not part or EXCLUDE.search(part): continue
        key = (media, part)
        d = final.setdefault(key, {})
        for decl in (x.strip() for x in re.split(r';(?![^(]*\))', body)):
            if ':' in decl:
                k, v = decl.split(':', 1); d[k.strip()] = v.strip()
        order[key] = n
lines = ['/* Généré par tools/dark/gen.py à partir de app.css : ne pas modifier à la main (voir dark-extra.css). */']
for key in sorted(final, key=lambda k: order[k]):
    media, part = key
    if 'print' in media: continue
    ch = transform(';'.join(f'{k}:{v}' for k, v in final[key].items()))
    if not ch: continue
    selx = part.replace('html', PRE, 1) if part.startswith('html') else (PRE if part.startswith(':root') else f'{PRE} {part}')
    css = selx + '{' + ';'.join(f'{k}:{v}' for k, v in ch.items()) + '}'
    lines.append(f'{media}{{{css}}}' if media else css)
OUT.write_text('\n'.join(lines) + '\n')
print(len(lines) - 1, 'règles sombres')
