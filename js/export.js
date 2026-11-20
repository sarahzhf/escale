/* Eskalys : export des dépenses d'un voyage en PDF (relevé mis en page) et en Excel (tableau à retravailler).
   Tout est fabriqué sur le téléphone : rien n'est envoyé. Les modules (jsPDF, JSZip) ne se chargent qu'au premier export.
   Fonction prévue pour le plan PRO : le verrou viendra avec le paiement. */
'use strict';
const EXP_GREEN = [46, 94, 62], EXP_INK = [29, 28, 25], EXP_MUTED = [110, 106, 98], EXP_LINE = [226, 220, 208], EXP_SOFT = [238, 244, 239];
const CAT_RGB = { logement: [46, 94, 62], repas: [184, 69, 44], transport: [74, 111, 165], activites: [217, 164, 65], shopping: [140, 92, 150] };

/* ---------- les données, communes aux deux formats ---------- */
function expData(t) {
  const c = C(t), f = info(t), M = t.membres || [], shared = M.length > 0;
  const nom = t.ville || c.n || 'Voyage', pays = c.n || '';
  const rows = t.depenses.slice().sort((a, b) => a.j - b.j || String(a.at || '').localeCompare(String(b.at || ''))).map(d => ({
    date: dayDate(t, d.j), dateFin: d.j2 && d.j2 > d.j ? dayDate(t, d.j2) : null, jour: d.j,
    libelle: d.l || CATS[d.c]?.n || 'Dépense', marchand: d.m || '', cat: CATS[d.c]?.n || 'Autre', catKey: d.c,
    sous: d.s && SUBS[d.c] ? SUBS[d.c][d.s] || '' : '', payePar: memberName(t, d.by || 'me'),
    local: d.v != null && (d.cur || c.code) && (d.cur || c.code) !== 'EUR' ? d.v : null, devise: d.v != null ? (d.cur || c.code || 'EUR') : 'EUR',
    eur: Number(d.eur) || 0, part: myPart(d) }));
  const total = rows.reduce((a, r) => a + r.eur, 0), part = rows.reduce((a, r) => a + r.part, 0);
  const cats = Object.keys(CATS).map(k => { const L = rows.filter(r => r.catKey === k); return { k, n: CATS[k].n, nb: L.length, eur: L.reduce((a, r) => a + (shared ? r.part : r.eur), 0), budget: t.budgets && t.budgets[k] ? +t.budgets[k] : null }; }).filter(x => x.nb || x.budget);
  const byDay = {}; rows.forEach(r => { (byDay[r.date] = byDay[r.date] || { date: r.date, nb: 0, eur: 0 }); byDay[r.date].nb++; byDay[r.date].eur += shared ? r.part : r.eur; });
  const mine = shared ? part : total, elapsed = f.futur ? 0 : f.enCours ? f.jour : f.jours;
  let comptes = null;
  if (shared && typeof balances === 'function') { const { bal } = balances(t); comptes = { soldes: Object.entries(bal).map(([id, v]) => ({ nom: memberName(t, id), v })), virements: transfers(bal).map(x => ({ de: memberName(t, x.from), a: memberName(t, x.to), eur: x.eur })) }; comptes.virements.forEach(v => v.phrase = v.de === 'Moi' ? `Tu rembourses ${eur2(v.eur)} à ${v.a}` : v.a === 'Moi' ? `${v.de} te rembourse ${eur2(v.eur)}` : `${v.de} rembourse ${eur2(v.eur)} à ${v.a}`); }
  return { t, nom, pays, du: t.du, au: t.au, jours: f.jours, elapsed, budget: +t.budget || 0, rows, total, part, mine, shared, membres: ['Moi', ...M.map(m => m.n)], cats, jours_: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)), comptes, devise: c.code || 'EUR' };
}
const eur2 = n => (Math.round((n || 0) * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[  ]/g, ' ') + ' €';
const num2 = n => (Math.round((n || 0) * 100) / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 }).replace(/[  ]/g, ' ');
const dFR = s => { if (!s) return ''; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
const dLong = s => new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const expFile = (D, ext) => `Eskalys - Depenses ${D.nom.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w -]/g, '').trim()} ${D.du ? D.du.slice(0, 7) : ''}.${ext}`.replace(/\s+/g, ' ');

async function expLogoPNG() { try { const svg = await (await fetch('icons/logo.svg')).text(); const im = new Image(); const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    await new Promise((ok, ko) => { im.onload = ok; im.onerror = ko; im.src = url; }); const c = document.createElement('canvas'); c.width = 160; c.height = Math.round(160 * (im.height / im.width || 1));
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); return { data: c.toDataURL('image/png'), r: c.height / c.width }; } catch (_) { return null; } }

/* ---------- PDF : relevé de dépenses ---------- */
async function expPDF(t) {
  await loadScript('vendor/pdfgen/jspdf.min.js'); await loadScript('vendor/pdfgen/autotable.min.js');
  const D = expData(t), { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'a4' }), W = 210, H = 297, X = 16, CW = W - 2 * X;
  const logo = await expLogoPNG(), today = new Date().toISOString().slice(0, 10);
  const txt = (s, x, y, o = {}) => { doc.setFont('helvetica', o.b ? 'bold' : 'normal'); doc.setFontSize(o.s || 10); doc.setTextColor(...(o.c || EXP_INK)); doc.text(String(s), x, y, { align: o.a || 'left', maxWidth: o.w }); };
  // en-tête
  doc.setFillColor(...EXP_GREEN); doc.rect(0, 0, W, 30, 'F');
  if (logo) doc.addImage(logo.data, 'PNG', X, 8, 9, 9 * logo.r);
  txt('Eskalys', X + 12, 15.5, { s: 13, b: true, c: [255, 255, 255] }); txt('Carnet de voyage et budget', X + 12, 21, { s: 8.5, c: [215, 228, 218] });
  txt('RELEVÉ DE DÉPENSES', W - X, 14, { s: 9, b: true, c: [255, 255, 255], a: 'right' }); txt('Édité le ' + dLong(today), W - X, 20, { s: 8.5, c: [215, 228, 218], a: 'right' });
  // titre du voyage
  let y = 44; txt(D.nom, X, y, { s: 20, b: true });
  y += 7; txt([D.pays !== D.nom ? D.pays : '', D.du && D.au ? `du ${dLong(D.du)} au ${dLong(D.au)}` : '', `${D.jours} jour${D.jours > 1 ? 's' : ''}`, D.shared ? `${D.membres.length} voyageurs` : ''].filter(Boolean).join(', '), X, y, { s: 10, c: EXP_MUTED });
  // chiffres clés
  y += 8; const reste = D.budget ? D.budget - D.mine : null, perDay = D.elapsed ? D.mine / D.elapsed : D.mine / D.jours;
  const K = [[D.shared ? 'Ma part' : 'Total dépensé', eur2(D.mine)], ['Budget prévu', D.budget ? eur2(D.budget) : 'Non défini'],
    [reste == null ? 'Dépenses notées' : reste >= 0 ? 'Reste du budget' : 'Dépassement', reste == null ? String(D.rows.length) : eur2(Math.abs(reste))], ['Moyenne par jour', eur2(perDay)]];
  const kw = (CW - 3 * 4) / 4; K.forEach(([l, v], i) => { const x = X + i * (kw + 4); doc.setFillColor(...EXP_SOFT); doc.roundedRect(x, y, kw, 22, 2.5, 2.5, 'F');
    txt(l, x + 4, y + 7, { s: 8, c: EXP_MUTED }); txt(v, x + 4, y + 16, { s: 13, b: true, c: i === 2 && reste != null && reste < 0 ? [184, 69, 44] : EXP_INK }); });
  y += 22;
  if (D.budget) { y += 6; const r = Math.min(1, D.mine / D.budget); doc.setFillColor(...EXP_LINE); doc.roundedRect(X, y, CW, 3, 1.5, 1.5, 'F'); doc.setFillColor(...(D.mine > D.budget ? [184, 69, 44] : EXP_GREEN)); if (r > 0) doc.roundedRect(X, y, Math.max(3, CW * r), 3, 1.5, 1.5, 'F');
    y += 7; txt(`${Math.round(D.mine / D.budget * 100)} % du budget utilisé`, X, y, { s: 8.5, c: EXP_MUTED }); if (D.shared) txt(`Dépenses du groupe : ${eur2(D.total)}`, W - X, y, { s: 8.5, c: EXP_MUTED, a: 'right' }); }
  const sec = (title, yy) => { txt(title, X, yy, { s: 11.5, b: true, c: EXP_GREEN }); doc.setDrawColor(...EXP_LINE); doc.setLineWidth(.3); doc.line(X, yy + 2.5, W - X, yy + 2.5); return yy + 6; };
  const base = { theme: 'plain', margin: { left: X, right: X, top: 20, bottom: 18 }, styles: { font: 'helvetica', fontSize: 9, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 }, textColor: EXP_INK, lineColor: EXP_LINE },
    headStyles: { fillColor: EXP_GREEN, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 }, alternateRowStyles: { fillColor: [250, 248, 243] }, footStyles: { fillColor: EXP_SOFT, fontStyle: 'bold', textColor: EXP_INK } };
  // par catégorie
  y = sec('Répartition par catégorie', y + 12);
  const catTot = D.cats.reduce((a, x) => a + x.eur, 0) || 1, hasCb = D.cats.some(x => x.budget);
  doc.autoTable({ ...base, startY: y, head: [['Catégorie', 'Dépenses', 'Montant', 'Part', '', ...(hasCb ? ['Budget prévu'] : [])]],
    body: D.cats.map(x => [x.n, String(x.nb), eur2(x.eur), Math.round(x.eur / catTot * 100) + ' %', '', ...(hasCb ? [x.budget ? eur2(x.budget) : ''] : [])]),
    foot: [['Total', String(D.rows.length), eur2(catTot === 1 && !D.cats.length ? 0 : D.cats.reduce((a, x) => a + x.eur, 0)), '100 %', '', ...(hasCb ? [''] : [])]],
    columnStyles: { 1: { halign: 'center', cellWidth: 20 }, 2: { halign: 'right', cellWidth: 30 }, 3: { halign: 'right', cellWidth: 16 }, 4: { cellWidth: 40 }, 5: { halign: 'right', cellWidth: 28 } },
    didParseCell: h => { if ((h.section === 'head' || h.section === 'foot') && h.column.index >= 1 && h.column.index <= 3) h.cell.styles.halign = h.column.index === 1 ? 'center' : 'right'; },
    didDrawCell: h => { if (h.section === 'body' && h.column.index === 4) { const x = D.cats[h.row.index], w = (h.cell.width - 5) * (x.eur / catTot); doc.setFillColor(...EXP_LINE); doc.roundedRect(h.cell.x + 2.5, h.cell.y + h.cell.height / 2 - 1.3, h.cell.width - 5, 2.6, 1.3, 1.3, 'F');
      doc.setFillColor(...(CAT_RGB[x.k] || EXP_GREEN)); if (w > 0.5) doc.roundedRect(h.cell.x + 2.5, h.cell.y + h.cell.height / 2 - 1.3, Math.max(2.6, w), 2.6, 1.3, 1.3, 'F'); }
      if (h.section === 'body' && h.column.index === 0) { const x = D.cats[h.row.index]; doc.setFillColor(...(CAT_RGB[x.k] || EXP_GREEN)); doc.circle(h.cell.x + 1, h.cell.y + h.cell.height / 2, .9, 'F'); } } });
  // par jour
  y = sec('Dépenses par jour', doc.lastAutoTable.finalY + 12);
  doc.autoTable({ ...base, startY: y, head: [['Date', 'Jour du voyage', 'Dépenses', 'Montant']],
    body: D.jours_.map(x => [dLong(x.date), 'Jour ' + (Math.round((new Date(x.date) - new Date(D.du)) / 864e5) + 1), String(x.nb), eur2(x.eur)]),
    columnStyles: { 1: { cellWidth: 36 }, 2: { halign: 'center', cellWidth: 24 }, 3: { halign: 'right', cellWidth: 34 } },
    didParseCell: h => { if (h.section === 'head' && h.column.index >= 2) h.cell.styles.halign = h.column.index === 2 ? 'center' : 'right'; } });
  // entre amis
  doc.addPage(); let top = 24;
  if (D.comptes) { y = sec('Entre amis', top);
    doc.autoTable({ ...base, startY: y, head: [['Voyageur', 'Solde']], body: D.comptes.soldes.map(s => [s.nom, (s.v > 0.005 ? '+' : '') + eur2(s.v)]), columnStyles: { 1: { halign: 'right', cellWidth: 40 } },
      didParseCell: h => { if (h.section === 'head' && h.column.index === 1) h.cell.styles.halign = 'right'; if (h.section === 'body' && h.column.index === 1) { const v = D.comptes.soldes[h.row.index].v; h.cell.styles.textColor = v < -0.005 ? [184, 69, 44] : v > 0.005 ? EXP_GREEN : EXP_INK; } } });
    if (D.comptes.virements.length) { y = doc.lastAutoTable.finalY + 6; txt('Pour être à égalité :', X, y, { s: 9, b: true }); D.comptes.virements.forEach(v => { y += 5.5; txt(v.phrase, X + 3, y, { s: 9 }); }); doc.lastAutoTable.finalY = y; } top = doc.lastAutoTable.finalY + 14; }
  // détail
  y = sec('Détail des dépenses', top);
  const hasLocal = D.rows.some(r => r.local != null);
  doc.autoTable({ ...base, startY: y, styles: { ...base.styles, fontSize: 8.3 },
    head: [['Date', 'Libellé', 'Catégorie', ...(D.shared ? ['Payé par'] : []), ...(hasLocal ? ['Montant local'] : []), 'Montant', ...(D.shared ? ['Ma part'] : [])]],
    body: D.rows.map(r => [r.dateFin ? dFR(r.date).slice(0, 5) + ' au\n' + dFR(r.dateFin) : dFR(r.date), r.libelle + (r.marchand && r.marchand !== r.libelle ? '\n' + r.marchand : ''), r.cat + (r.sous ? '\n' + r.sous : ''), ...(D.shared ? [r.payePar] : []), ...(hasLocal ? [r.local != null ? num2(r.local) + ' ' + r.devise : ''] : []), eur2(r.eur), ...(D.shared ? [eur2(r.part)] : [])]),
    foot: [['Total', '', '', ...(D.shared ? [''] : []), ...(hasLocal ? [''] : []), eur2(D.total), ...(D.shared ? [eur2(D.part)] : [])]],
    columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 28 } },
    didParseCell: h => { const n = h.table.columns.length; if (h.column.index >= n - (D.shared ? 2 : 1) - (hasLocal ? 1 : 0)) h.cell.styles.halign = 'right'; if (h.section === 'body' && h.column.index === 1) h.cell.styles.fontStyle = 'normal'; } });
  // pied de page
  const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setDrawColor(...EXP_LINE); doc.setLineWidth(.3); doc.line(X, H - 13, W - X, H - 13);
    txt(`Eskalys, relevé de dépenses de ${D.nom}. Montants en euros${D.devise !== 'EUR' ? ', convertis au taux du jour de chaque dépense' : ''}.`, X, H - 8, { s: 7.5, c: EXP_MUTED }); txt(`Page ${i} sur ${n}`, W - X, H - 8, { s: 7.5, c: EXP_MUTED, a: 'right' }); }
  doc.setProperties({ title: `Relevé de dépenses, ${D.nom}`, author: 'Eskalys', creator: 'Eskalys' });
  return { blob: doc.output('blob'), name: expFile(D, 'pdf') };
}

/* ---------- Excel : classeur .xlsx mis en forme (fabriqué à la main avec JSZip, aucun module lourd) ---------- */
const xEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const xCol = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const xDate = s => Math.round((Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5);
// styles : 0 normal, 1 en-tête, 2 date, 3 euro, 4 titre, 5 sous-titre, 6 libellé gras, 7 euro gras (total), 8 pourcentage, 9 nombre, 10 total libellé, 11 euro grand
const X_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="#,##0.00\\ &quot;€&quot;"/><numFmt numFmtId="166" formatCode="0%"/></numFmts>
<fonts count="6"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="18"/><color rgb="FF2E5E3E"/><name val="Calibri"/></font><font><sz val="11"/><color rgb="FF6E6A62"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2E5E3E"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF4EF"/></patternFill></fill></fills>
<borders count="2"><border/><border><bottom style="thin"><color rgb="FFE2DCD0"/></bottom></border></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="12">
<xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"><alignment vertical="center"/></xf><xf numFmtId="164" borderId="1" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="165" borderId="1" applyNumberFormat="1" applyBorder="1"/>
<xf fontId="2" applyFont="1"/><xf fontId="3" applyFont="1"/><xf fontId="4" borderId="1" applyFont="1" applyBorder="1"/><xf numFmtId="165" fontId="4" fillId="3" applyNumberFormat="1" applyFont="1" applyFill="1"/>
<xf numFmtId="166" borderId="1" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="3" borderId="1" applyNumberFormat="1" applyBorder="1"/><xf fontId="4" fillId="3" applyFont="1" applyFill="1"/><xf numFmtId="165" fontId="5" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
function xSheet(rows, o = {}) { // rows : tableaux de cellules {v, s, f} ou valeurs simples
  const body = rows.map((r, ri) => `<row r="${ri + 1}"${o.heights && o.heights[ri] ? ` ht="${o.heights[ri]}" customHeight="1"` : ''}>${r.map((c, ci) => { if (c == null || c === '') return ''; const cell = typeof c === 'object' ? c : { v: c }; const ref = xCol(ci) + (ri + 1), s = cell.s ? ` s="${cell.s}"` : '';
    if (cell.f) return `<c r="${ref}"${s}><f>${xEsc(cell.f)}</f></c>`; if (typeof cell.v === 'number') return `<c r="${ref}"${s}><v>${cell.v}</v></c>`; return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xEsc(cell.v)}</t></is></c>`; }).join('')}</row>`).join('');
  const cols = o.widths ? `<cols>${o.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const pane = o.freeze ? `<sheetViews><sheetView workbookViewId="0"${o.first ? ' tabSelected="1"' : ''}><pane ySplit="${o.freeze}" topLeftCell="A${o.freeze + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : `<sheetViews><sheetView workbookViewId="0" showGridLines="0"${o.first ? ' tabSelected="1"' : ''}/></sheetViews>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${pane}<sheetFormatPr defaultRowHeight="18"/>${cols}<sheetData>${body}</sheetData>${o.filter ? `<autoFilter ref="${o.filter}"/>` : ''}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="${o.landscape ? 'landscape' : 'portrait'}" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}
async function expXLSX(t) {
  await loadScript('vendor/jszip.min.js'); const D = expData(t), H = (v) => ({ v, s: 1 });
  // feuille Dépenses (la source des autres feuilles : les totaux sont des formules, ils suivent si on modifie une ligne)
  const head = ['Date', 'Date de fin', 'Jour', 'Libellé', 'Commerçant', 'Catégorie', 'Sous-catégorie', 'Payé par', 'Montant local', 'Devise', 'Montant (€)', ...(D.shared ? ['Ma part (€)'] : [])];
  const N = D.rows.length, last = N + 1;
  const dep = [head.map(H), ...D.rows.map(r => [{ v: xDate(r.date), s: 2 }, r.dateFin ? { v: xDate(r.dateFin), s: 2 } : '', { v: r.jour, s: 9 }, r.libelle, r.marchand, r.cat, r.sous, r.payePar, r.local != null ? { v: r.local, s: 9 } : '', r.devise, { v: Math.round(r.eur * 100) / 100, s: 3 }, ...(D.shared ? [{ v: Math.round(r.part * 100) / 100, s: 3 }] : [])]),
    [{ v: 'Total', s: 10 }, '', '', '', '', '', '', '', '', '', { f: `SUM(K2:K${last})`, s: 7 }, ...(D.shared ? [{ f: `SUM(L2:L${last})`, s: 7 }] : [])]];
  const amt = D.shared ? 'L' : 'K', rng = c => `'Dépenses'!$${c}$2:$${c}$${last}`;
  // Résumé
  const res = [[{ v: 'Relevé de dépenses', s: 4 }], [{ v: `${D.nom}${D.pays && D.pays !== D.nom ? ', ' + D.pays : ''}`, s: 6 }], [{ v: `Du ${dFR(D.du)} au ${dFR(D.au)}, ${D.jours} jours. Édité avec Eskalys le ${dFR(new Date().toISOString().slice(0, 10))}.`, s: 5 }], [],
    [{ v: D.shared ? 'Ma part' : 'Total dépensé', s: 6 }, { f: `SUM(${rng(amt)})`, s: 11 }],
    [{ v: 'Budget prévu', s: 6 }, D.budget ? { v: D.budget, s: 3 } : 'Non défini'],
    ...(D.budget ? [[{ v: 'Reste du budget', s: 6 }, { f: `B6-B5`, s: 3 }], [{ v: 'Budget utilisé', s: 6 }, { f: `IF(B6>0,B5/B6,0)`, s: 8 }]] : []),
    [{ v: 'Moyenne par jour', s: 6 }, { f: `B5/${Math.max(1, D.elapsed || D.jours)}`, s: 3 }],
    [{ v: 'Nombre de dépenses', s: 6 }, { v: N, s: 9 }],
    ...(D.shared ? [[{ v: 'Dépenses du groupe', s: 6 }, { f: `SUM(${rng('K')})`, s: 3 }], [{ v: 'Voyageurs', s: 6 }, D.membres.join(', ')]] : [])];
  if (D.comptes) { res.push([], [{ v: 'Entre amis', s: 6 }], [H('Voyageur'), H('Solde')]); D.comptes.soldes.forEach(s => res.push([s.nom, { v: Math.round(s.v * 100) / 100, s: 3 }]));
    if (D.comptes.virements.length) { res.push([], [{ v: 'Pour être à égalité', s: 6 }]); D.comptes.virements.forEach(v => res.push([v.phrase])); } }
  // Catégories et Jours, calculés par formules depuis la feuille Dépenses
  const cat = [[H('Catégorie'), H('Dépenses'), H('Montant (€)'), H('Part'), H('Budget prévu (€)')], ...Object.keys(CATS).map((k, i) => { const r = i + 2, cb = t.budgets && t.budgets[k] ? +t.budgets[k] : null; return [CATS[k].n, { f: `COUNTIF(${rng('F')},A${r})`, s: 9 }, { f: `SUMIF(${rng('F')},A${r},${rng(amt)})`, s: 3 }, { f: `IF(SUM($C$2:$C$${Object.keys(CATS).length + 1})>0,C${r}/SUM($C$2:$C$${Object.keys(CATS).length + 1}),0)`, s: 8 }, cb ? { v: cb, s: 3 } : '']; })];
  const nc = Object.keys(CATS).length + 1; cat.push([{ v: 'Total', s: 10 }, { f: `SUM(B2:B${nc})`, s: 10 }, { f: `SUM(C2:C${nc})`, s: 7 }, '', '']);
  const jr = [[H('Date'), H('Jour du voyage'), H('Dépenses'), H('Montant (€)')], ...D.jours_.map((x, i) => [{ v: xDate(x.date), s: 2 }, { v: Math.round((new Date(x.date) - new Date(D.du)) / 864e5) + 1, s: 9 }, { f: `COUNTIF(${rng('A')},A${i + 2})`, s: 9 }, { f: `SUMIF(${rng('A')},A${i + 2},${rng(amt)})`, s: 3 }])];
  jr.push([{ v: 'Total', s: 10 }, '', { f: `SUM(C2:C${jr.length})`, s: 10 }, { f: `SUM(D2:D${jr.length})`, s: 7 }]);
  const sheets = [['Résumé', xSheet(res, { widths: [26, 22, 4], first: true })], ['Dépenses', xSheet(dep, { widths: [12, 12, 7, 32, 22, 14, 18, 14, 14, 9, 14, 14], freeze: 1, filter: `A1:${xCol(head.length - 1)}${last}`, landscape: true })],
    ['Catégories', xSheet(cat, { widths: [18, 12, 16, 10, 18], freeze: 1 })], ['Jours', xSheet(jr, { widths: [14, 16, 12, 16], freeze: 1 })]];
  const z = new JSZip();
  z.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  z.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  z.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xEsc('Dépenses ' + D.nom)}</dc:title><dc:creator>Eskalys</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`);
  z.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map(([n], i) => `<sheet name="${xEsc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="1" hidden="1">'Dépenses'!$A$1:$${xCol(head.length - 1)}$${last}</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`);
  z.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  z.file('xl/styles.xml', X_STYLES); sheets.forEach(([, x], i) => z.file(`xl/worksheets/sheet${i + 1}.xml`, x));
  return { blob: await z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' }), name: expFile(D, 'xlsx') };
}

/* ---------- partage ou téléchargement ---------- */
async function expDeliver({ blob, name }) {
  const file = new File([blob], name, { type: blob.type });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
ACT.exportOpen = d => { const t = trip(d.trip); if (!t) return; if (!t.depenses.length) { toast('Aucune dépense à exporter pour ce voyage'); return; }
  openPanel(`<h2>Exporter les dépenses</h2><p class="small">${esc(t.ville || C(t).n)} : ${t.depenses.length} dépense${t.depenses.length > 1 ? 's' : ''}. Le fichier est créé sur ton téléphone, rien n'est envoyé.</p>
   <button class="exp-opt" data-x="pdf"><b>PDF</b><span>Un relevé clair et mis en page : chiffres clés, répartition par catégorie, dépenses par jour et détail complet. Idéal à garder ou à envoyer.</span></button>
   <button class="exp-opt" data-x="xlsx"><b>Excel</b><span>Un tableau à retravailler : toutes les dépenses avec filtres, et des feuilles Résumé, Catégories et Jours calculées automatiquement.</span></button>${CLOSE()}`, p => {
    p.querySelectorAll('.exp-opt').forEach(b => b.onclick = async () => { if (b.disabled) return; p.querySelectorAll('.exp-opt').forEach(x => x.disabled = true); const old = b.querySelector('b').textContent; b.querySelector('b').textContent = 'Préparation…';
      try { const r = b.dataset.x === 'pdf' ? await expPDF(t) : await expXLSX(t); await expDeliver(r); closePanel(); toast('Fichier prêt'); }
      catch (e) { console.error(e); toast('Export impossible, réessaie'); } finally { p.querySelectorAll('.exp-opt').forEach(x => x.disabled = false); b.querySelector('b').textContent = old; } }); }, { nofocus: true }); };
