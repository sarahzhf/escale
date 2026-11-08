/* Escale : lecture de documents sur le téléphone (gratuit, rien n'est envoyé).
   - Ticket de caisse : photo > lecture du texte (Tesseract, module de 5 Mo chargé au premier scan puis gardé)
     > montant, date, commerçant > le ticket sort d'une fente > on remplit la dépense.
   - Billet de voyage : PDF (texte lu par pdf.js) ou photo > aéroports, vol, heures, siège... > carte d'embarquement.
   La lecture par l'IA, plus fiable, sera réservée au plan PRO. */
'use strict';
const loadScript = src => new Promise((ok, ko) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('script')); document.head.appendChild(s); });
let OCRW = null;
async function ocrWorker(onp) {
  if (OCRW) return OCRW; await loadScript('vendor/ocr/tesseract.min.js');
  OCRW = await Tesseract.createWorker('fra', 1, { workerPath: 'vendor/ocr/worker.min.js', corePath: 'vendor/ocr/', langPath: 'vendor/ocr/lang', workerBlobURL: false, gzip: true,
    logger: m => { if (onp && m.status && typeof m.progress === 'number') onp(m.status, m.progress); } });
  return OCRW;
}
/** Image > canvas en niveaux de gris, contraste renforcé, 1600 px max : lecture plus fiable. */
function prepImage(file) { return new Promise((ok, ko) => { const url = URL.createObjectURL(file), im = new Image(); im.onload = () => {
  const k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
  const x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height); const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { let g = .299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2]; g = Math.max(0, Math.min(255, (g - 128) * 1.35 + 140)); p[i] = p[i + 1] = p[i + 2] = g; }
  x.putImageData(d, 0, 0); URL.revokeObjectURL(url); ok(c); }; im.onerror = () => ko(new Error('image')); im.src = url; }); }
async function ocrText(file, onp) { const w = await ocrWorker(onp), c = await prepImage(file); const { data } = await w.recognize(c); return data.text || ''; }
async function pdfText(file) { await loadScript('vendor/pdf/pdf.min.js'); const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = 'vendor/pdf/pdf.worker.min.js';
  const doc = await lib.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise; let out = '';
  for (let i = 1; i <= Math.min(doc.numPages, 4); i++) { const pg = await doc.getPage(i), tc = await pg.getTextContent(); let lastY = null;
    tc.items.forEach(it => { const y = Math.round(it.transform[5]); out += (lastY !== null && Math.abs(y - lastY) > 3 ? '\n' : ' ') + it.str; lastY = y; }); out += '\n'; }
  return out; }

/* ---------- analyse d'un ticket de caisse ---------- */
const MONTHS = { janv: 1, jan: 1, fevr: 2, fev: 2, feb: 2, mars: 3, mar: 3, avr: 4, apr: 4, mai: 5, may: 5, juin: 6, jun: 6, juil: 7, jul: 7, aout: 8, aug: 8, sept: 9, sep: 9, oct: 10, nov: 11, dec: 12 };
function findDate(txt) {
  let m = txt.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/); if (m) { let [, d, mo, y] = m.map(Number); if (y < 100) y += 2000; if (mo > 12 && d <= 12) [d, mo] = [mo, d]; if (d <= 31 && mo <= 12) return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
  m = txt.match(/\b(20\d{2})[\/.\-](\d{1,2})[\/.\-](\d{1,2})\b/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = norm(txt).match(/\b(\d{1,2}) (janv|jan|fevr|fev|feb|mars|mar|avr|apr|mai|may|juin|jun|juil|jul|aout|aug|sept|sep|oct|nov|dec)[a-z]* (20\d{2})?/); if (m) return `${m[3] || D(TODAY).getFullYear()}-${String(MONTHS[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}
const AMT = /(\d{1,3}(?:[ . ]\d{3})*|\d+)[,.](\d{2})(?!\d)/g;
const toNum = (a, b) => +(a.replace(/[ . ]/g, '') + '.' + b);
function parseReceipt(txt) {
  const lines = txt.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let total = null, best = 0; const items = [];
  lines.forEach((l, i) => { const n = norm(l), am = [...l.matchAll(AMT)].map(x => toNum(x[1], x[2]));
    if (!am.length) return; const v = am[am.length - 1];
    if (/\b(total|montant|a payer|net a payer|ttc|summe|totale|importe|amount|due|cb|carte|card)\b/.test(n) && !/\b(tva|vat|hors taxe|ht|rendu|change|monnaie|sous total|subtotal)\b/.test(n)) { const sc = (/total|a payer|ttc|amount due/.test(n) ? 3 : 1) + i / lines.length; if (sc >= best) { best = sc; total = v; } }
    else if (items.length < 8 && /[a-z]{3}/.test(n) && v < 10000 && !/\b(tva|vat|rendu|change|especes|cash|tel|siret|ticket|caisse)\b/.test(n)) items.push({ l: l.replace(AMT, '').replace(/[€$£]|eur\b/gi, '').replace(/\s+\d+\s*x?\s*$/, '').trim().slice(0, 28), v }); });
  if (total == null) { const all = lines.flatMap(l => [...l.matchAll(AMT)].map(x => toNum(x[1], x[2]))).filter(v => v < 100000); total = all.length ? Math.max(...all) : null; }
  const merchant = (lines.find(l => /[A-Za-zÀ-ÿ]{3}/.test(l) && !/^(ticket|facture|bienvenue|welcome|merci|date|tel|siret)/i.test(l)) || '').replace(/[^A-Za-zÀ-ÿ0-9&'’ .\-]/g, '').trim().slice(0, 40);
  const cur = /€|\beur\b/i.test(txt) ? 'EUR' : /\$|usd/i.test(txt) ? 'USD' : /£|gbp/i.test(txt) ? 'GBP' : /¥|jpy|円/i.test(txt) ? 'JPY' : /\bdh\b|mad/i.test(txt) ? 'MAD' : /chf/i.test(txt) ? 'CHF' : /฿|thb/i.test(txt) ? 'THB' : null;
  return { total, date: findDate(txt), merchant, items: items.filter(x => x.l && Math.abs(x.v - total) > .001).slice(0, 6), cur };
}
/** Le ticket sort d'une fente, avec ce qui a été lu. */
function receiptHTML(r, t) { const money = v => v == null ? '?' : v.toFixed(2).replace('.', ',');
  return `<div class="slot"><i></i></div><div class="receipt"><p class="rc-h">${esc(r.merchant || 'Ticket')}</p><p class="rc-d">${r.date ? fd(r.date) : 'Date non lue'}</p><hr>
   ${r.items.map(x => `<p class="rc-l"><span>${esc(x.l)}</span><span class="num">${money(x.v)}</span></p>`).join('') || '<p class="rc-l muted"><span>Détail non lu</span><span></span></p>'}<hr>
   <p class="rc-t"><span>TOTAL</span><span class="num">${money(r.total)} ${r.cur && r.cur !== 'EUR' ? esc(r.cur) : '€'}</span></p><p class="rc-thx">Lu sur ton téléphone</p><div class="rc-bar"></div></div>`; }
async function scanReceipt(tid, file) {
  const t = trip(tid); let pct = 0;
  openPanel(`<h2>Lecture du ticket</h2><div id="sc-box"><p class="small" id="sc-st">Préparation…</p><div class="sc-prog"><i id="sc-bar"></i></div><p class="small sc-note">La première fois, Escale télécharge le module de lecture (environ 5 Mo). Ensuite, tout se fait sur ton téléphone, même hors connexion.</p></div>${CLOSE('Annuler')}`, null, { nofocus: true });
  const st = (s, p) => { const b = $('sc-bar'), e = $('sc-st'); if (!b) return; pct = s === 'recognizing text' ? 50 + p * 50 : Math.max(pct, p * 45); b.style.width = pct + '%'; e.textContent = s === 'recognizing text' ? 'Lecture du texte…' : 'Chargement du module de lecture…'; };
  try { const txt = await ocrText(file, st), r = parseReceipt(txt); const box = $('sc-box'); if (!box) return;
    let day = null; if (r.date && t) { const j = Math.round((D(r.date) - D(t.du)) / 864e5) + 1; if (j >= 1 && j <= info(t).jours) day = j; }
    box.innerHTML = `${receiptHTML(r, t)}<p class="small sc-hint">${r.total ? 'Vérifie le montant avant d\'enregistrer : la lecture peut se tromper.' : 'Le total n\'a pas pu être lu : tu pourras le taper.'}</p><button class="btn full" id="sc-ok">Utiliser ces infos<i>${SV.arrow}</i></button>`;
    $('sc-ok').onclick = () => { closePanel(); setTimeout(() => expSheet(tid, null, true, { amt: r.total, cur: r.cur, day, mer: r.merchant }), 360); };
  } catch (e) { const box = $('sc-box'); if (box) box.innerHTML = `<p class="small">La lecture n'a pas fonctionné${navigator.onLine ? '' : ' (le module de lecture doit être téléchargé une première fois avec du réseau)'}. Tu peux saisir la dépense à la main.</p><button class="btn full" data-act="addExp" data-trip="${tid}">Saisir à la main</button>`; }
}
ACT.scanTicket = d => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.setAttribute('capture', 'environment');
  i.onchange = () => { const f = i.files && i.files[0]; if (f) { closePanel(); setTimeout(() => scanReceipt(d.trip, f), 360); } }; i.click(); };

/* ---------- billets de voyage ---------- */
const AIRPORTS = { CDG: 'Paris', ORY: 'Paris', BVA: 'Beauvais', LYS: 'Lyon', MRS: 'Marseille', NCE: 'Nice', TLS: 'Toulouse', BOD: 'Bordeaux', NTE: 'Nantes', LIL: 'Lille', MPL: 'Montpellier', SXB: 'Strasbourg', BIQ: 'Biarritz', AJA: 'Ajaccio', BIA: 'Bastia', FCO: 'Rome', CIA: 'Rome', MXP: 'Milan', LIN: 'Milan', BGY: 'Bergame', VCE: 'Venise', FLR: 'Florence', PSA: 'Pise', NAP: 'Naples', BRI: 'Bari', BDS: 'Brindisi', PMO: 'Palerme', CTA: 'Catane', CAG: 'Cagliari', BLQ: 'Bologne', TRN: 'Turin', MAD: 'Madrid', BCN: 'Barcelone', SVQ: 'Séville', AGP: 'Malaga', VLC: 'Valence', PMI: 'Palma', IBZ: 'Ibiza', TFS: 'Tenerife', LPA: 'Grande Canarie', ALC: 'Alicante', BIO: 'Bilbao', LIS: 'Lisbonne', OPO: 'Porto', FAO: 'Faro', FNC: 'Funchal', PDL: 'Ponta Delgada', ATH: 'Athènes', JTR: 'Santorin', JMK: 'Mykonos', HER: 'Héraklion', CHQ: 'La Canée', RHO: 'Rhodes', CFU: 'Corfou', SKG: 'Thessalonique', RAK: 'Marrakech', CMN: 'Casablanca', FEZ: 'Fès', AGA: 'Agadir', TNG: 'Tanger', ESU: 'Essaouira', RBA: 'Rabat', TUN: 'Tunis', DJE: 'Djerba', MIR: 'Monastir', NBE: 'Enfidha', ALG: 'Alger', ORN: 'Oran', CZL: 'Constantine', DSS: 'Dakar', CAI: 'Le Caire', HRG: 'Hurghada', SSH: 'Charm el-Cheikh', LXR: 'Louxor', IST: 'Istanbul', SAW: 'Istanbul', AYT: 'Antalya', ASR: 'Kayseri', LHR: 'Londres', LGW: 'Londres', STN: 'Londres', LTN: 'Londres', EDI: 'Édimbourg', MAN: 'Manchester', DUB: 'Dublin', AMS: 'Amsterdam', BRU: 'Bruxelles', CRL: 'Charleroi', GVA: 'Genève', ZRH: 'Zurich', BSL: 'Bâle', BER: 'Berlin', MUC: 'Munich', FRA: 'Francfort', HAM: 'Hambourg', VIE: 'Vienne', PRG: 'Prague', BUD: 'Budapest', WAW: 'Varsovie', KRK: 'Cracovie', CPH: 'Copenhague', ARN: 'Stockholm', OSL: 'Oslo', HEL: 'Helsinki', KEF: 'Reykjavik', DBV: 'Dubrovnik', SPU: 'Split', ZAG: 'Zagreb', MLA: 'Malte', LCA: 'Larnaca', TIV: 'Tivat', TIA: 'Tirana', JFK: 'New York', EWR: 'New York', LGA: 'New York', LAX: 'Los Angeles', SFO: 'San Francisco', MIA: 'Miami', LAS: 'Las Vegas', ORD: 'Chicago', BOS: 'Boston', IAD: 'Washington', SEA: 'Seattle', MCO: 'Orlando', HNL: 'Honolulu', MSY: 'La Nouvelle-Orléans', YUL: 'Montréal', YYZ: 'Toronto', YVR: 'Vancouver', YQB: 'Québec', MEX: 'Mexico', CUN: 'Cancún', HAV: 'La Havane', PUJ: 'Punta Cana', GRU: 'São Paulo', GIG: 'Rio de Janeiro', EZE: 'Buenos Aires', SCL: 'Santiago', LIM: 'Lima', BOG: 'Bogota', SJO: 'San José', PTP: 'Pointe-à-Pitre', FDF: 'Fort-de-France', RUN: 'La Réunion', MRU: 'Maurice', PPT: 'Papeete', DXB: 'Dubaï', AUH: 'Abou Dabi', DOH: 'Doha', AMM: 'Amman', NRT: 'Tokyo', HND: 'Tokyo', KIX: 'Osaka', ICN: 'Séoul', PEK: 'Pékin', PVG: 'Shanghai', HKG: 'Hong Kong', BKK: 'Bangkok', HKT: 'Phuket', CNX: 'Chiang Mai', USM: 'Koh Samui', SGN: 'Hô Chi Minh-Ville', HAN: 'Hanoï', DAD: 'Da Nang', DPS: 'Bali', CGK: 'Jakarta', SIN: 'Singapour', KUL: 'Kuala Lumpur', MNL: 'Manille', DEL: 'Delhi', BOM: 'Bombay', CMB: 'Colombo', MLE: 'Malé', KTM: 'Katmandou', SYD: 'Sydney', MEL: 'Melbourne', AKL: 'Auckland', JNB: 'Johannesburg', CPT: 'Le Cap', NBO: 'Nairobi', ZNZ: 'Zanzibar', JRO: 'Kilimandjaro', TNR: 'Antananarivo', NOS: 'Nosy Be', ADD: 'Addis-Abeba', ABJ: 'Abidjan' };
const NOT_IATA = new Set('EUR USD GBP CHF TTC PNR VOL THE AND FOR AIR BAG SEQ GMT UTC NOM DES LES PAR SUR AVEC POUR ETA ETD REF TVA FLY BUS CLS ECO MRS MME MLE MME MR'.split(' '));
function parseTicket(txt, kind) {
  const T = txt.replace(/ /g, ' '), up = T.toUpperCase(), r = { kind: kind || 'avion' };
  const pair = up.match(/\b([A-Z]{3})\s*(?:-|–|—|→|>|\/|TO|À|A)\s*([A-Z]{3})\b/) || up.match(/\(([A-Z]{3})\)[\s\S]{1,80}?\(([A-Z]{3})\)/);
  let codes = pair ? [pair[1], pair[2]] : [...new Set((up.match(/\b[A-Z]{3}\b/g) || []).filter(c => AIRPORTS[c]))].slice(0, 2);
  codes = codes.filter(c => !NOT_IATA.has(c)); if (codes[0]) { r.from = codes[0]; r.fromN = AIRPORTS[codes[0]] || ''; } if (codes[1]) { r.to = codes[1]; r.toN = AIRPORTS[codes[1]] || ''; }
  const fl = up.match(/(?:VOL|FLIGHT|FLT|N° DE VOL|FLIGHT NO\.?)\s*:?\s*([A-Z0-9]{2})\s?(\d{1,4})\b/) || up.match(/\b(AF|KL|U2|FR|VY|TO|IB|AZ|LH|BA|EK|QR|TK|AT|TU|AH|SN|LX|OS|TP|A3|W6|HV|DL|UA|AA|AC|TS|SS|BF|JL|NH|SQ|CX|EY|SV|MS|RJ|ET|KQ|UX|V7|EW|EN|ZB|LS|DY|SK|AY|FI|PC|JU|OU|WK)\s?(\d{2,4})\b/);
  if (fl) r.num = `${fl[1]} ${fl[2]}`;
  const times = [...T.matchAll(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)\b/g)].map(m => `${m[1].padStart(2, '0')}:${m[2]}`); if (times[0]) r.dep = times[0]; if (times[1]) r.arr = times[1];
  r.date = findDate(T);
  const g = (re) => { const m = up.match(re); return m ? m[1].trim() : ''; };
  r.seat = g(/(?:SIÈGE|SIEGE|SEAT|PLACE)\s*(?:N°)?\s*:?\s*(\d{1,3}\s?[A-K]?)\b/); r.gate = g(/(?:PORTE|GATE)\s*:?\s*([A-Z]?\d{1,3}[A-Z]?)\b/); r.term = g(/(?:TERMINAL|TERM\.?)\s*:?\s*(\d[A-Z]?|[A-Z]\d?)\b/);
  r.ref = g(/(?:RÉFÉRENCE|REFERENCE|RÉSERVATION|RESERVATION|BOOKING|PNR|CONFIRMATION|DOSSIER)[^A-Z0-9]{0,24}([A-Z0-9]{6})\b/);
  r.cls = /BUSINESS|AFFAIRES/.test(up) ? 'Business' : /PREMIUM/.test(up) ? 'Premium' : /PREMI[EÈ]RE|FIRST/.test(up) ? 'Première' : 'Économie';
  const pax = T.match(/(?:Passager|Passenger|Nom du passager|Name|Voyageur)\s*:?\s*([A-ZÀ-Ý][A-Za-zÀ-ÿ'\- ]{2,30}(?:\/[A-Za-zÀ-ÿ'\- ]{2,20})?)/); if (pax) r.pax = pax[1].replace(/\s+(MR|MRS|MME|MLLE|MISS|MS)$/i, '').trim();
  if (r.kind === 'train') { r.from = r.fromN = r.to = r.toN = ''; const st = T.match(/(?:De|Départ|From)\s*:?\s*([A-ZÀ-Ý][\wÀ-ÿ'\- ]{2,30})\s*(?:→|>|-|à|vers|To)\s*([A-ZÀ-Ý][\wÀ-ÿ'\- ]{2,30})/); if (st) { r.fromN = st[1].trim(); r.toN = st[2].trim(); } const tn = up.match(/(?:TRAIN|TGV|INOUI|OUIGO|TER|ICE|AVE|FRECCIAROSSA)\s*(?:N°)?\s*(\d{3,5})/); r.num = tn ? tn[0].replace(/\s+/g, ' ') : ''; r.seat = g(/(?:PLACE|SEAT)\s*:?\s*(\d{1,3})/); r.coach = g(/(?:VOITURE|COACH|CAR)\s*:?\s*(\d{1,2})/); }
  return r;
}
const KIND_N = { avion: 'Avion', train: 'Train', bus: 'Bus', bateau: 'Bateau' };
const KIND_IC = { avion: '✈', train: '🚆', bus: '🚌', bateau: '⛴' };
function barcodeSVG(seed) { let h = 0; for (const ch of String(seed || 'ESCALE')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; let x = 0, out = '';
  while (x < 300) { h = (h * 1103515245 + 12345) >>> 0; const w = 1 + (h >>> 28) % 4; if ((h >>> 20) & 1) out += `<rect x="${x}" width="${w}" height="44"/>`; x += w + 1; } return `<svg viewBox="0 0 300 44" preserveAspectRatio="none" aria-hidden="true">${out}</svg>`; }
function ticketHTML(k, t, edit) { const big = (c, n) => `<b>${esc(c || (n ? n.slice(0, 3).toUpperCase() : '—'))}</b><span>${esc(n || '')}</span>`;
  return `<article class="bpass ${k.kind}" ${edit ? '' : `data-act="ticketOpen" data-trip="${t.id}" data-id="${k.id}" role="button" tabindex="0"`}>
   <div class="bp-top"><span>${KIND_IC[k.kind] || '✈'} ${esc(k.company || KIND_N[k.kind] || '')}</span><span>${k.date ? fd(k.date) : ''}</span></div>
   <div class="bp-route"><div class="bp-a">${big(k.from, k.fromN)}<em>${esc(k.dep || '')}</em></div><div class="bp-line"><i></i><span>${KIND_IC[k.kind] || '✈'}</span><i></i></div><div class="bp-b">${big(k.to, k.toN)}<em>${esc(k.arr || '')}</em></div></div>
   <div class="bp-band">${(k.kind === 'train' ? [['Train', k.num], ['Voiture', k.coach], ['Place', k.seat], ['Réf.', k.ref]] : [['Vol', k.num], ['Terminal', k.term], ['Porte', k.gate], ['Siège', k.seat]]).map(([l, v]) => `<div><span>${l}</span><b>${esc(v || '–')}</b></div>`).join('')}</div>
   <div class="bp-pax"><div><span>Passager</span><b>${esc(k.pax || '–')}</b></div><div><span>${k.kind === 'train' ? 'Classe' : 'Classe'}</span><b>${esc(k.cls || '–')}</b></div>${k.kind !== 'train' ? `<div><span>Réf.</span><b>${esc(k.ref || '–')}</b></div>` : ''}</div>
   <div class="bp-cut"></div><div class="bp-code">${barcodeSVG(k.ref || k.num || k.id)}<p>Décoratif : garde ton vrai billet pour l'embarquement</p></div></article>`; }
const ticketsOf = t => (t.tickets = Array.isArray(t.tickets) ? t.tickets : []);
function ticketsHTML(t) { const L = ticketsOf(t); if (!L.length && !info(t).futur && !info(t).enCours) return '';
  return `<div class="sec"><h2>Billets</h2><button class="more" data-act="ticketAdd" data-trip="${t.id}">Ajouter</button></div>
   ${L.length ? `<div class="bpasses">${L.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.dep || '').localeCompare(String(b.dep || ''))).map(k => ticketHTML(k, t)).join('')}</div>` : `<button class="prep-cta" data-act="ticketAdd" data-trip="${t.id}"><i>✈</i><span><b>Ajoute ton billet</b><em>Un PDF ou une photo : Escale le met au format billet</em></span>${SV.right}</button>`}`; }
ACT.ticketAdd = d => { const t = trip(d.trip); if (!t) return;
  openPanel(`<h2>Ajouter un billet</h2><p class="small">Importe le PDF de ta réservation ou une photo de ta carte d'embarquement. La lecture se fait sur ton téléphone ; le fichier n'est pas envoyé, seules les infos du billet sont gardées.</p>
   <div class="seg wide" id="tk-k">${Object.entries(KIND_N).map(([k, n], i) => `<button type="button" data-k="${k}" class="${i ? '' : 'on'}">${KIND_IC[k]} ${n}</button>`).join('')}</div>
   <button class="btn full" id="tk-file" style="margin-top:14px">Choisir un PDF ou une photo<i>${SV.arrow}</i></button>
   <button class="btn2 wide" id="tk-hand" style="margin-top:8px">Remplir à la main</button>
   <button class="btn2 wide pro-soon" disabled style="margin-top:8px">${SV.spark || '✦'} Lecture par l'IA, plus fiable · bientôt avec PRO</button>${CLOSE()}`, p => {
    let kind = 'avion'; p.querySelectorAll('#tk-k button').forEach(b => b.onclick = () => { kind = b.dataset.k; p.querySelectorAll('#tk-k button').forEach(x => x.classList.toggle('on', x === b)); });
    p.querySelector('#tk-hand').onclick = () => { closePanel(); setTimeout(() => ticketEdit(t.id, { id: uid(), kind, date: t.du }), 360); };
    p.querySelector('#tk-file').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/pdf,image/*';
      i.onchange = async () => { const f = i.files && i.files[0]; if (!f) return; if (f.size > 15e6) { toast('Fichier trop lourd (15 Mo max)'); return; }
        const btn = p.querySelector('#tk-file'); btn.disabled = true; btn.firstChild.textContent = 'Lecture du billet…';
        try { const txt = /pdf/.test(f.type) || /\.pdf$/i.test(f.name) ? await pdfText(f) : await ocrText(f, (s, pr) => { btn.firstChild.textContent = s === 'recognizing text' ? `Lecture… ${Math.round(pr * 100)} %` : 'Chargement du module de lecture…'; });
          const k = { id: uid(), ...parseTicket(txt, kind) }; closePanel(); setTimeout(() => ticketEdit(t.id, k, true), 360);
        } catch (e) { btn.disabled = false; btn.firstChild.textContent = 'Choisir un PDF ou une photo'; toast('Lecture impossible, remplis le billet à la main'); } };
      i.click(); };
  }, { nofocus: true }); };
function ticketEdit(tid, k, fromScan) { const t = trip(tid), L = ticketsOf(t), ex = L.find(x => x.id === k.id);
  const F = k.kind === 'train' ? [['fromN', 'Gare de départ'], ['toN', 'Gare d\'arrivée'], ['date', 'Date', 'date'], ['dep', 'Départ', 'time'], ['arr', 'Arrivée', 'time'], ['num', 'Train'], ['coach', 'Voiture'], ['seat', 'Place'], ['cls', 'Classe'], ['pax', 'Passager'], ['ref', 'Référence'], ['company', 'Compagnie']]
    : [['from', 'Code départ (ex. CDG)'], ['fromN', 'Ville de départ'], ['to', 'Code arrivée'], ['toN', 'Ville d\'arrivée'], ['date', 'Date', 'date'], ['dep', 'Départ', 'time'], ['arr', 'Arrivée', 'time'], ['num', k.kind === 'avion' ? 'Vol' : 'Numéro'], ['term', 'Terminal'], ['gate', 'Porte'], ['seat', 'Siège'], ['cls', 'Classe'], ['pax', 'Passager'], ['ref', 'Référence'], ['company', 'Compagnie']];
  openPanel(`<h2>${fromScan ? 'Vérifie ton billet' : ex ? 'Modifier le billet' : 'Nouveau billet'}</h2>${fromScan ? '<p class="small">Voici ce qui a été lu. Corrige ce qui manque ou ce qui est faux.</p>' : ''}
   <div id="tk-prev">${ticketHTML(k, t, true)}</div>
   <div class="tk-grid">${F.map(([f, l, ty]) => `<label class="fld"><span>${l}</span><input data-f="${f}" ${ty ? `type="${ty}"` : ''} maxlength="40" value="${esc(k[f] || '')}"></label>`).join('')}</div>
   <button class="btn full" id="tk-ok">Enregistrer le billet<i>${SV.arrow}</i></button>${ex ? '<button class="danger" id="tk-del">Supprimer ce billet</button>' : ''}${CLOSE()}`, p => {
    const upd = () => { p.querySelectorAll('[data-f]').forEach(i => { let v = i.value.trim(); if (i.dataset.f === 'from' || i.dataset.f === 'to') { v = v.toUpperCase().slice(0, 4); const n = AIRPORTS[v]; const nf = p.querySelector(`[data-f="${i.dataset.f}N"]`); if (n && nf && !nf.value) nf.value = k[i.dataset.f + 'N'] = n; } k[i.dataset.f] = v; }); p.querySelector('#tk-prev').innerHTML = ticketHTML(k, t, true); };
    p.querySelectorAll('[data-f]').forEach(i => i.addEventListener('input', upd));
    p.querySelector('#tk-ok').onclick = () => { upd(); const clean = { id: k.id, kind: k.kind }; F.forEach(([f]) => { if (k[f]) clean[f] = String(k[f]).slice(0, 40); });
      if (ex) Object.keys(ex).forEach(x => delete ex[x]), Object.assign(ex, clean); else { if (L.length >= 20) { toast('20 billets au maximum'); return; } L.push(clean); }
      save(); closePanel(); setTimeout(refresh, 320); toast('Billet enregistré'); };
    const del = p.querySelector('#tk-del'); if (del) del.onclick = () => { t.tickets = L.filter(x => x.id !== k.id); save(); closePanel(); setTimeout(refresh, 320); toast('Billet supprimé'); };
  }, { nofocus: true }); }
ACT.ticketOpen = d => { const t = trip(d.trip), k = t && ticketsOf(t).find(x => x.id === d.id); if (k) ticketEdit(t.id, { ...k }); };
