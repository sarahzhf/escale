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

/* ---------- Excel : classeur .xlsx soigné, fabriqué à la main avec JSZip (aucun module lourd) ----------
   Feuilles : Tableau de bord (chiffres clés et 4 graphiques), Dépenses (tableau Excel filtrable), Catégories, Sous-catégories, Jours (avec cumul), Entre amis.
   Les totaux sont des formules reliées à la feuille Dépenses : si on corrige une ligne, tout suit. */
const xEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const xCol = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const xDate = s => Math.round((Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5);
const XG = '2E5E3E', XHEX = { logement: '2E5E3E', repas: 'B8452C', transport: '4A6FA5', activites: 'D9A441', shopping: '8C5C96' };
/* styles (index s) : 0 normal | 1 en-tête vert | 2 date | 3 euro | 4 titre | 5 texte gris | 6 gras | 7 euro gras surligné | 8 pourcentage | 9 nombre
   10 libellé total | 11 bandeau titre vert | 12 bandeau sous-titre | 13 tuile libellé | 14 tuile valeur euro | 15 tuile valeur nombre | 16 tuile valeur % | 17 section | 18 texte retour à la ligne | 19 euro rouge/vert selon signe | 20 nombre gras surligné */
const X_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="#,##0.00\\ &quot;€&quot;"/><numFmt numFmtId="166" formatCode="0%"/><numFmt numFmtId="167" formatCode="[Color10]+#,##0.00\\ &quot;€&quot;;[Red]-#,##0.00\\ &quot;€&quot;;0.00\\ &quot;€&quot;"/></numFmts>
<fonts count="9"><font><sz val="11"/><color rgb="FF1D1C19"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="20"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font><font><sz val="10"/><color rgb="FF6E6A62"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FF1D1C19"/><name val="Calibri"/><family val="2"/></font><font><sz val="11"/><color rgb="FFD7E4DA"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="18"/><color rgb="FF1D1C19"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="13"/><color rgb="FF2E5E3E"/><name val="Calibri"/><family val="2"/></font><font><sz val="9"/><color rgb="FF6E6A62"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2E5E3E"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF4EF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF7F2E7"/></patternFill></fill></fills>
<borders count="3"><border/><border><bottom style="thin"><color rgb="FFE2DCD0"/></bottom></border><border><bottom style="medium"><color rgb="FF2E5E3E"/></bottom></border></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="21">
<xf/>
<xf fontId="1" fillId="2" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" applyNumberFormat="1"><alignment horizontal="left"/></xf>
<xf numFmtId="165" applyNumberFormat="1"/>
<xf fontId="6" applyFont="1"/>
<xf fontId="3" applyFont="1"/>
<xf fontId="4" applyFont="1"/>
<xf numFmtId="165" fontId="4" fillId="3" borderId="2" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="166" applyNumberFormat="1"/>
<xf numFmtId="3" applyNumberFormat="1"><alignment horizontal="center"/></xf>
<xf fontId="4" fillId="3" borderId="2" applyFont="1" applyFill="1" applyBorder="1"/>
<xf fontId="2" fillId="2" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
<xf fontId="5" fillId="2" applyFont="1" applyFill="1"><alignment vertical="top"/></xf>
<xf fontId="8" fillId="3" applyFont="1" applyFill="1"><alignment vertical="bottom" indent="1"/></xf>
<xf numFmtId="165" fontId="6" fillId="3" applyNumberFormat="1" applyFont="1" applyFill="1"><alignment horizontal="left" vertical="top" indent="1"/></xf>
<xf numFmtId="3" fontId="6" fillId="3" applyNumberFormat="1" applyFont="1" applyFill="1"><alignment horizontal="left" vertical="top" indent="1"/></xf>
<xf numFmtId="166" fontId="6" fillId="3" applyNumberFormat="1" applyFont="1" applyFill="1"><alignment horizontal="left" vertical="top" indent="1"/></xf>
<xf fontId="7" borderId="1" applyFont="1" applyBorder="1"/>
<xf applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
<xf numFmtId="167" fontId="4" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="3" fontId="4" fillId="3" borderId="2" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>
</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium7" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;

function xSheet(rows, o = {}) {
  const body = rows.map((r, ri) => { const ht = o.heights && o.heights[ri + 1]; return `<row r="${ri + 1}"${ht ? ` ht="${ht}" customHeight="1"` : ''}>${(r || []).map((c, ci) => { if (c == null || c === '') return ''; const cell = typeof c === 'object' ? c : { v: c }; const ref = xCol(ci) + (ri + 1), s = cell.s ? ` s="${cell.s}"` : '';
    if (cell.f) return `<c r="${ref}"${s}><f>${xEsc(cell.f)}</f>${cell.c != null ? `<v>${cell.c}</v>` : ''}</c>`; if (cell.v == null) return `<c r="${ref}"${s}/>`; if (typeof cell.v === 'number') return `<c r="${ref}"${s}><v>${cell.v}</v></c>`; return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xEsc(cell.v)}</t></is></c>`; }).join('')}</row>`; }).join('');
  const cols = o.widths ? `<cols>${o.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const view = `<sheetViews><sheetView workbookViewId="0"${o.grid === false ? ' showGridLines="0"' : ''}${o.first ? ' tabSelected="1"' : ''}${o.zoom ? ` zoomScale="${o.zoom}" zoomScaleNormal="${o.zoom}"` : ''}>${o.freeze ? `<pane ySplit="${o.freeze}" topLeftCell="A${o.freeze + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${o.freeze + 1}" sqref="A${o.freeze + 1}"/>` : ''}</sheetView></sheetViews>`;
  const merges = o.merges && o.merges.length ? `<mergeCells count="${o.merges.length}">${o.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
  const cf = (o.bars || []).map((b, i) => `<conditionalFormatting sqref="${b.ref}"><cfRule type="dataBar" priority="${i + 1}"><dataBar><cfvo type="num" val="0"/><cfvo type="max"/><color rgb="FF${b.color || '8FB89B'}"/></dataBar></cfRule></conditionalFormatting>`).join('');
  const tabColor = o.tab ? `<sheetPr><tabColor rgb="FF${o.tab}"/><pageSetUpPr fitToPage="1"/></sheetPr>` : '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${tabColor}${view}<sheetFormatPr defaultRowHeight="18"/>${cols}<sheetData>${body}</sheetData>${merges}${cf}<printOptions horizontalCentered="1"/><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="${o.landscape ? 'landscape' : 'portrait'}" paperSize="9" fitToWidth="1" fitToHeight="${o.onePage ? 1 : 0}"/><headerFooter><oddFooter>&amp;L&amp;8Eskalys, relevé de dépenses&amp;R&amp;8Page &amp;P sur &amp;N</oddFooter></headerFooter>${o.drawing ? '<drawing r:id="rIdD"/>' : ''}${o.tables ? `<tableParts count="${o.tables.length}">${o.tables.map((_, i) => `<tablePart r:id="rIdT${i}"/>`).join('')}</tableParts>` : ''}</worksheet>`;
}
const xTable = (id, name, ref, cols, total) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${id}" name="${name}" displayName="${name}" ref="${ref}"${total ? ' totalsRowCount="1"' : ' totalsRowShown="0"'}><autoFilter ref="${total ? ref.replace(/\d+$/, n => n - 1) : ref}"/><tableColumns count="${cols.length}">${cols.map((c, i) => `<tableColumn id="${i + 1}" name="${xEsc(c.n)}"${c.tl ? ` totalsRowLabel="${xEsc(c.tl)}"` : ''}${c.tf ? ` totalsRowFunction="${c.tf}"` : ''}/>`).join('')}</tableColumns><tableStyleInfo name="TableStyleMedium7" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`;

/* graphiques (DrawingML) : valeurs en cache pour un affichage immédiat, recalculées par Excel ensuite */
const xTxPr = (sz = 900, b = 0) => `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}" b="${b}"><a:solidFill><a:srgbClr val="4A4740"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:endParaRPr lang="fr-FR"/></a:p></c:txPr>`;
const xTitle = s => `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"><a:solidFill><a:srgbClr val="1D1C19"/></a:solidFill></a:defRPr></a:pPr><a:r><a:rPr lang="fr-FR" sz="1200" b="1"><a:solidFill><a:srgbClr val="1D1C19"/></a:solidFill></a:rPr><a:t>${xEsc(s)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
const xStrRef = (f, arr) => `<c:strRef><c:f>${xEsc(f)}</c:f><c:strCache><c:ptCount val="${arr.length}"/>${arr.map((v, i) => `<c:pt idx="${i}"><c:v>${xEsc(v)}</c:v></c:pt>`).join('')}</c:strCache></c:strRef>`;
const xNumRef = (f, arr) => `<c:numRef><c:f>${xEsc(f)}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${arr.length}"/>${arr.map((v, i) => `<c:pt idx="${i}"><c:v>${Math.round(v * 100) / 100}</c:v></c:pt>`).join('')}</c:numCache></c:numRef>`;
const xFill = hex => `<c:spPr><a:solidFill><a:srgbClr val="${hex}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>`;
const xAxes = (fmt = '#,##0" €"') => `<c:catAx><c:axId val="10"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="D9D3C7"/></a:solidFill></a:ln></c:spPr>${xTxPr(850)}<c:crossAx val="20"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>
<c:valAx><c:axId val="20"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="EEEAE2"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="${xEsc(fmt)}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${xTxPr(850)}<c:crossAx val="10"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
const xChart = (title, plot, legend = true) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:lang val="fr-FR"/><c:roundedCorners val="0"/><c:chart>${xTitle(title)}<c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>${plot}</c:plotArea>${legend ? `<c:legend><c:legendPos val="b"/><c:overlay val="0"/>${xTxPr(900)}</c:legend>` : ''}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="E2DCD0"/></a:solidFill></a:ln></c:spPr>${xTxPr(900)}<c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings></c:chartSpace>`;
const xDoughnut = (title, catF, cats, valF, vals, colors) => xChart(title, `<c:doughnutChart><c:varyColors val="1"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Montant</c:v></c:tx>${colors.map((h, i) => `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${h}"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`).join('')}
<c:dLbls><c:numFmt formatCode="0%" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="fr-FR"/></a:p></c:txPr><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showBubbleSize val="0"/><c:showLeaderLines val="0"/></c:dLbls>
<c:cat>${xStrRef(catF, cats)}</c:cat><c:val>${xNumRef(valF, vals)}</c:val></c:ser><c:firstSliceAng val="0"/><c:holeSize val="55"/></c:doughnutChart>`);
const xBars = (title, catF, cats, series, o = {}) => xChart(title, `<c:barChart><c:barDir val="${o.horizontal ? 'bar' : 'col'}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series.map((s, i) => `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${xEsc(s.n)}</c:v></c:tx>${xFill(s.color)}<c:invertIfNegative val="0"/>${s.pts ? s.pts.map((h, j) => `<c:dPt><c:idx val="${j}"/><c:invertIfNegative val="0"/><c:bubble3D val="0"/>${xFill(h)}</c:dPt>`).join('') : ''}<c:cat>${xStrRef(catF, cats)}</c:cat><c:val>${xNumRef(s.f, s.vals)}</c:val></c:ser>`).join('')}<c:gapWidth val="${o.gap || 70}"/><c:overlap val="${series.length > 1 ? -10 : 0}"/><c:axId val="10"/><c:axId val="20"/></c:barChart>${xAxes()}`, series.length > 1);
const xLines = (title, catF, cats, series) => xChart(title, `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${series.map((s, i) => `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${xEsc(s.n)}</c:v></c:tx><c:spPr><a:ln w="${s.dash ? 19050 : 31750}" cap="rnd"><a:solidFill><a:srgbClr val="${s.color}"/></a:solidFill>${s.dash ? '<a:prstDash val="dash"/>' : ''}<a:round/></a:ln></c:spPr><c:marker><c:symbol val="${s.dash ? 'none' : 'circle'}"/><c:size val="5"/>${xFill(s.color)}</c:marker><c:cat>${xStrRef(catF, cats)}</c:cat><c:val>${xNumRef(s.f, s.vals)}</c:val><c:smooth val="0"/></c:ser>`).join('')}<c:marker val="1"/><c:axId val="10"/><c:axId val="20"/></c:lineChart>${xAxes()}`);
const xAnchor = (i, c1, r1, c2, r2) => `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${c1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${r1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${c2}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${r2}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="Graphique ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rIdC${i}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;

async function expXLSX(t) {
  await loadScript('vendor/jszip.min.js'); const D = expData(t), H = v => ({ v, s: 1 });
  const S = D.shared, N = D.rows.length, last = N + 1, nCat = Object.keys(CATS).length;
  const sq = n => `'${n}'`; // noms de feuilles entre apostrophes (accents)
  /* Dépenses : tableau Excel « Depenses » */
  const head = ['Date', 'Date de fin', 'Jour', 'Libellé', 'Commerçant', 'Catégorie', 'Sous-catégorie', 'Payé par', 'Montant local', 'Devise', 'Montant (€)', ...(S ? ['Ma part (€)'] : []), 'Mois'];
  const AMT = S ? 'L' : 'K', MOIS = xCol(head.length - 1);
  const dep = [head.map(H), ...D.rows.map((r, i) => [{ v: xDate(r.date), s: 2 }, r.dateFin ? { v: xDate(r.dateFin), s: 2 } : '', { v: r.jour, s: 9 }, r.libelle, r.marchand, r.cat, r.sous, r.payePar, r.local != null ? { v: r.local, s: 9 } : '', r.devise, { v: Math.round(r.eur * 100) / 100, s: 3 }, ...(S ? [{ v: Math.round(r.part * 100) / 100, s: 3 }] : []), { f: `TEXT(A${i + 2},"mm/aaaa")`, c: null }]),
    [{ v: 'Total', s: 6 }, '', '', '', '', '', '', '', '', '', { f: `SUBTOTAL(109,K2:K${last})`, s: 7 }, ...(S ? [{ f: `SUBTOTAL(109,L2:L${last})`, s: 7 }] : []), '']];
  // la formule TEXT dépend de la langue d'Excel : on écrit plutôt le mois en clair
  dep.slice(1, -1).forEach((row, i) => { row[row.length - 1] = new Date(D.rows[i].date + 'T12:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); });
  const R = c => `${sq('Dépenses')}!$${c}$2:$${c}$${last}`;
  /* Catégories */
  const catKeys = Object.keys(CATS), catVals = catKeys.map(k => D.rows.filter(r => r.catKey === k).reduce((a, r) => a + (S ? r.part : r.eur), 0)), catNb = catKeys.map(k => D.rows.filter(r => r.catKey === k).length);
  const catTot = catVals.reduce((a, b) => a + b, 0) || 0;
  const cb = k => t.budgets && t.budgets[k] ? +t.budgets[k] : null, hasCb = catKeys.some(cb);
  const cat = [[H('Catégorie'), H('Dépenses'), H('Montant (€)'), H('Part'), H('Budget prévu (€)'), H('Écart (€)')], ...catKeys.map((k, i) => { const r = i + 2; return [CATS[k].n, { f: `COUNTIF(${R('F')},A${r})`, s: 9, c: catNb[i] }, { f: `SUMIF(${R('F')},A${r},${R(AMT)})`, s: 3, c: catVals[i] }, { f: `IF(SUM($C$2:$C$${nCat + 1})>0,C${r}/SUM($C$2:$C$${nCat + 1}),0)`, s: 8 }, cb(k) ? { v: cb(k), s: 3 } : '', cb(k) ? { f: `E${r}-C${r}`, s: 19 } : '']; }),
    [{ v: 'Total', s: 10 }, { f: `SUBTOTAL(109,B2:B${nCat + 1})`, s: 20 }, { f: `SUBTOTAL(109,C2:C${nCat + 1})`, s: 7 }, { v: catTot ? 1 : 0, s: 8 }, { f: `SUBTOTAL(109,E2:E${nCat + 1})`, s: 7 }, '']];
  /* Sous-catégories (seulement celles utilisées) */
  const subs = []; D.rows.forEach(r => { const key = r.cat + '|' + (r.sous || 'Sans précision'); if (!subs.includes(key)) subs.push(key); }); subs.sort();
  const sub = [[H('Catégorie'), H('Sous-catégorie'), H('Dépenses'), H('Montant (€)')], ...subs.map((k, i) => { const [c, s] = k.split('|'), r = i + 2, crit = s === 'Sans précision' ? '""' : `B${r}`;
    return [c, s, { f: `COUNTIFS(${R('F')},A${r},${R('G')},${crit})`, s: 9 }, { f: `SUMIFS(${R(AMT)},${R('F')},A${r},${R('G')},${crit})`, s: 3 }]; }),
    [{ v: 'Total', s: 10 }, { v: '', s: 10 }, { f: `SUBTOTAL(109,C2:C${subs.length + 1})`, s: 20 }, { f: `SUBTOTAL(109,D2:D${subs.length + 1})`, s: 7 }]];
  /* Jours, avec cumul et budget pour la courbe */
  const J = D.jours_, nJ = J.length; let cum = 0; const cumV = J.map(x => (cum += x.eur));
  const jr = [[H('Date'), H('Jour'), H('Dépenses'), H('Montant (€)'), H('Cumul (€)'), H('Budget (€)')], ...J.map((x, i) => { const r = i + 2; return [{ v: xDate(x.date), s: 2 }, 'Jour ' + (Math.round((new Date(x.date) - new Date(D.du)) / 864e5) + 1), { f: `COUNTIF(${R('A')},A${r})`, s: 9, c: x.nb }, { f: `SUMIF(${R('A')},A${r},${R(AMT)})`, s: 3, c: Math.round(x.eur * 100) / 100 }, { f: i ? `E${r - 1}+D${r}` : `D${r}`, s: 3, c: Math.round(cumV[i] * 100) / 100 }, D.budget ? { v: D.budget, s: 3 } : '']; }),
    [{ v: 'Total', s: 10 }, { v: '', s: 10 }, { f: `SUBTOTAL(109,C2:C${nJ + 1})`, s: 20 }, { f: `SUBTOTAL(109,D2:D${nJ + 1})`, s: 7 }, { v: '', s: 10 }, { v: '', s: 10 }]];
  /* Entre amis */
  let ami = null;
  if (D.comptes) { const P = D.membres; ami = [[H('Voyageur'), H('A payé (€)'), H('Solde (€)')], ...P.map((n, i) => [n, { f: `SUMIF(${R('H')},A${i + 2},${R('K')})`, s: 3 }, { v: Math.round((D.comptes.soldes.find(s => s.nom === n) || { v: 0 }).v * 100) / 100, s: 19 }]),
    [{ v: 'Total', s: 10 }, { f: `SUBTOTAL(109,B2:B${P.length + 1})`, s: 7 }, { v: '', s: 10 }], [], [{ v: 'Pour être à égalité', s: 17 }], ...(D.comptes.virements.length ? D.comptes.virements.map(v => [v.phrase]) : [['Tout le monde est à égalité.']]),
    [], [{ v: 'Un solde positif veut dire qu’on doit de l’argent à cette personne, un solde négatif qu’elle en doit au groupe.', s: 5 }]]; }
  /* Tableau de bord */
  const today = new Date().toISOString().slice(0, 10), C2 = c => `${sq('Catégories')}!$${c}$2:$${c}$${nCat + 1}`;
  const dash = [
    [{ v: 'Eskalys', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }],
    [{ v: 'Relevé de dépenses, édité le ' + dFR(today), s: 12 }, { v: '', s: 12 }, { v: '', s: 12 }, { v: '', s: 12 }, { v: '', s: 12 }, { v: '', s: 12 }, { v: '', s: 12 }, { v: '', s: 12 }],
    [], [{ v: D.nom, s: 4 }], [{ v: [D.pays !== D.nom ? D.pays : '', `du ${dLong(D.du)} au ${dLong(D.au)}`, `${D.jours} jours`, S ? `${D.membres.length} voyageurs (${D.membres.join(', ')})` : ''].filter(Boolean).join(', '), s: 5 }], [],
    [{ v: S ? 'Ma part' : 'Total dépensé', s: 13 }, { v: '', s: 13 }, { v: 'Budget prévu', s: 13 }, { v: '', s: 13 }, { v: D.budget ? 'Reste du budget' : 'Dépenses notées', s: 13 }, { v: '', s: 13 }, { v: 'Moyenne par jour', s: 13 }, { v: '', s: 13 }],
    [{ f: `SUM(${R(AMT)})`, s: 14, c: Math.round(D.mine * 100) / 100 }, { v: '', s: 14 }, D.budget ? { v: D.budget, s: 14 } : { v: 'Non défini', s: 14 }, { v: '', s: 14 }, D.budget ? { f: 'C8-A8', s: 14 } : { f: `COUNTA(${R('D')})`, s: 15 }, { v: '', s: 14 }, { f: `A8/${Math.max(1, D.elapsed || D.jours)}`, s: 14 }, { v: '', s: 14 }],
    [], [{ v: 'Budget utilisé', s: 13 }, { v: '', s: 13 }, { v: 'Dépenses notées', s: 13 }, { v: '', s: 13 }, { v: S ? 'Dépenses du groupe' : 'Plus grosse dépense', s: 13 }, { v: '', s: 13 }, { v: 'Catégorie principale', s: 13 }, { v: '', s: 13 }],
    [D.budget ? { f: 'IF(C8>0,A8/C8,0)', s: 16 } : { v: '–', s: 15 }, { v: '', s: 16 }, { f: `COUNTA(${R('D')})`, s: 15, c: N }, { v: '', s: 15 }, S ? { f: `SUM(${R('K')})`, s: 14 } : { f: `MAX(${R('K')})`, s: 14 }, { v: '', s: 14 },
      { f: `INDEX(${C2('A')},MATCH(MAX(${C2('C')}),${C2('C')},0))`, s: 15, c: null }, { v: '', s: 15 }],
    [], [{ v: 'Graphiques', s: 17 }, { v: '', s: 17 }, { v: '', s: 17 }, { v: '', s: 17 }, { v: '', s: 17 }, { v: '', s: 17 }, { v: '', s: 17 }, { v: '', s: 17 }]];
  // la cellule « catégorie principale » : valeur en cache pour l'aperçu
  dash[10][6].c = undefined; const topCat = catKeys[catVals.indexOf(Math.max(...catVals))];
  const dashMerges = ['A1:H1', 'A2:H2', 'A4:H4', 'A5:H5', 'A7:B7', 'C7:D7', 'E7:F7', 'G7:H7', 'A8:B8', 'C8:D8', 'E8:F8', 'G8:H8', 'A10:B10', 'C10:D10', 'E10:F10', 'G10:H10', 'A11:B11', 'C11:D11', 'E11:F11', 'G11:H11', 'A13:H13'];
  /* graphiques */
  const catNames = catKeys.map(k => CATS[k].n), dayNames = J.map(x => 'Jour ' + (Math.round((new Date(x.date) - new Date(D.du)) / 864e5) + 1));
  const charts = [xDoughnut('Répartition par catégorie', C2('A'), catNames, C2('C'), catVals, catKeys.map(k => XHEX[k] || XG)),
    xBars('Dépenses par jour', `${sq('Jours')}!$B$2:$B$${nJ + 1}`, dayNames, [{ n: 'Montant', color: XG, f: `${sq('Jours')}!$D$2:$D$${nJ + 1}`, vals: J.map(x => x.eur) }]),
    xLines(D.budget ? 'Cumul des dépenses et budget' : 'Cumul des dépenses', `${sq('Jours')}!$B$2:$B$${nJ + 1}`, dayNames, [{ n: 'Cumul', color: XG, f: `${sq('Jours')}!$E$2:$E$${nJ + 1}`, vals: cumV }, ...(D.budget ? [{ n: 'Budget', color: 'B8452C', dash: 1, f: `${sq('Jours')}!$F$2:$F$${nJ + 1}`, vals: J.map(() => D.budget) }] : [])]),
    hasCb ? xBars('Budget et dépenses par catégorie', C2('A'), catNames, [{ n: 'Dépensé', color: XG, f: C2('C'), vals: catVals }, { n: 'Budget prévu', color: 'D9A441', f: C2('E'), vals: catKeys.map(k => cb(k) || 0) }])
      : xBars('Montant par catégorie', C2('A'), catNames, [{ n: 'Montant', color: XG, f: C2('C'), vals: catVals, pts: catKeys.map(k => XHEX[k] || XG) }], { horizontal: 1, gap: 50 })];
  const anchors = [xAnchor(0, 0, 14, 4, 32), xAnchor(1, 4, 14, 8, 32), xAnchor(2, 0, 33, 4, 51), xAnchor(3, 4, 33, 8, 51)];
  /* assemblage */
  const sheets = [
    { n: 'Tableau de bord', x: xSheet(dash, { widths: [13, 13, 13, 13, 13, 13, 13, 13], grid: false, first: true, merges: dashMerges, heights: { 1: 34, 2: 22, 4: 28, 7: 22, 8: 30, 10: 22, 11: 30 }, drawing: 1, tab: XG, onePage: 1 }), drawing: true },
    { n: 'Dépenses', x: xSheet(dep, { widths: [12, 12, 7, 32, 22, 14, 20, 14, 14, 9, 14, ...(S ? [14] : []), 16], freeze: 1, landscape: true, tables: [1] }), table: xTable(1, 'Depenses', `A1:${MOIS}${last + 1}`, head.map((n, i) => ({ n, ...(i === 0 ? { tl: 'Total' } : n === 'Montant (€)' || n === 'Ma part (€)' ? { tf: 'sum' } : {}) })), true) },
    { n: 'Catégories', x: xSheet(cat, { widths: [18, 12, 16, 10, 18, 14], freeze: 1, tables: [1], bars: [{ ref: `C2:C${nCat + 1}`, color: '8FB89B' }] }), table: xTable(2, 'Categories', `A1:F${nCat + 2}`, ['Catégorie', 'Dépenses', 'Montant (€)', 'Part', 'Budget prévu (€)', 'Écart (€)'].map((n, i) => ({ n, ...(i === 0 ? { tl: 'Total' } : i === 1 || i === 2 || i === 4 ? { tf: 'sum' } : {}) })), true) },
    { n: 'Sous-catégories', x: xSheet(sub, { widths: [16, 24, 12, 16], freeze: 1, tables: [1], bars: [{ ref: `D2:D${subs.length + 1}`, color: 'B9CFE4' }] }), table: xTable(3, 'SousCategories', `A1:D${subs.length + 2}`, ['Catégorie', 'Sous-catégorie', 'Dépenses', 'Montant (€)'].map((n, i) => ({ n, ...(i === 0 ? { tl: 'Total' } : i >= 2 ? { tf: 'sum' } : {}) })), true) },
    { n: 'Jours', x: xSheet(jr, { widths: [13, 10, 11, 15, 15, 14], freeze: 1, tables: [1], bars: [{ ref: `D2:D${nJ + 1}`, color: 'E6C98A' }] }), table: xTable(4, 'Jours', `A1:F${nJ + 2}`, ['Date', 'Jour', 'Dépenses', 'Montant (€)', 'Cumul (€)', 'Budget (€)'].map((n, i) => ({ n, ...(i === 0 ? { tl: 'Total' } : i === 2 || i === 3 ? { tf: 'sum' } : {}) })), true) },
    ...(ami ? [{ n: 'Entre amis', x: xSheet(ami, { widths: [22, 16, 16], freeze: 1, tables: [1] }), table: xTable(5, 'EntreAmis', `A1:C${D.membres.length + 2}`, ['Voyageur', 'A payé (€)', 'Solde (€)'].map((n, i) => ({ n, ...(i === 0 ? { tl: 'Total' } : i === 1 ? { tf: 'sum' } : {}) })), true) }] : [])];
  // dans les tableaux, la ligne Total est gérée par le tableau : on garde nos formules SUBTOTAL, compatibles
  const z = new JSZip(), CT = [];
  sheets.forEach((sh, i) => { const n = i + 1; z.file(`xl/worksheets/sheet${n}.xml`, sh.x); CT.push(`<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    const rels = [];
    if (sh.table) { const tn = sh.table.match(/id="(\d+)"/)[1]; z.file(`xl/tables/table${tn}.xml`, sh.table); CT.push(`<Override PartName="/xl/tables/table${tn}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>`); rels.push(`<Relationship Id="rIdT0" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table${tn}.xml"/>`); }
    if (sh.drawing) { rels.push(`<Relationship Id="rIdD" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>`); }
    if (rels.length) z.file(`xl/worksheets/_rels/sheet${n}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`); });
  z.file('xl/drawings/drawing1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors.join('')}</xdr:wsDr>`);
  z.file('xl/drawings/_rels/drawing1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${charts.map((_, i) => `<Relationship Id="rIdC${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${i + 1}.xml"/>`).join('')}</Relationships>`);
  CT.push('<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>');
  charts.forEach((c, i) => { z.file(`xl/charts/chart${i + 1}.xml`, c); CT.push(`<Override PartName="/xl/charts/chart${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`); });
  z.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${CT.join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  z.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  z.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xEsc('Dépenses ' + D.nom)}</dc:title><dc:creator>Eskalys</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`);
  z.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Eskalys</Application></Properties>`);
  z.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${xEsc(s.n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="1">${sq('Dépenses')}!$1:$1</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`);
  z.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  z.file('xl/styles.xml', X_STYLES);
  return { blob: await z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' }), name: expFile(D, 'xlsx') };
}

/* ---------- partage ou téléchargement ---------- */
async function expDeliver({ blob, name }) {
  const file = new File([blob], name, { type: blob.type });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
/* ---------- plan PRO : verrou prêt, désactivé tant que le paiement n'existe pas ----------
   Pour l'activer : PRO.lock = true. L'accès PRO sera lu dans les réglages du compte (pro_until), rempli par le paiement. */
const PRO = { lock: false, has: () => { try { return !!(SETTINGS && SETTINGS.pro_until && new Date(SETTINGS.pro_until) > new Date()); } catch (_) { return false; } } };
const proLocked = () => PRO.lock && !PRO.has();
const EXP_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 18v-6M9 15l3 3 3-3"/></svg>';
function exportRowHTML(t) { return `<button class="exp-row" data-act="exportOpen" data-trip="${t.id}"><span class="exp-ic">${EXP_IC}</span><span class="exp-tx"><b>Exporter en PDF ou sur Excel</b><small>Le relevé de tes dépenses, à garder ou à envoyer</small></span>${proLocked() ? '<span class="pro-tag">PRO</span>' : '<i class="exp-go">›</i>'}</button>`; }
const expThumbs = () => `<div class="exp-thumbs" aria-hidden="true"><figure class="a"><img src="icons/pro/export-pdf.webp" alt=""><figcaption>PDF</figcaption></figure><figure class="b"><img src="icons/pro/export-excel.webp" alt=""><figcaption>Excel</figcaption></figure></div>`;
function exportPaywall(t) {
  openPanel(`<div class="exp-pay">${expThumbs()}<span class="pro-tag big">PRO</span><h2>Exporte tes dépenses</h2>
   <p class="small">Avec Eskalys PRO, transforme ton voyage en relevé clair, prêt à garder, à envoyer ou à partager entre amis.</p>
   <ul class="exp-list"><li><b>PDF</b> : chiffres clés, répartition par catégorie, dépenses jour par jour, comptes entre amis et détail complet.</li><li><b>Excel</b> : tableau de bord avec graphiques, tableaux filtrables par catégorie, sous-catégorie et jour, totaux qui se recalculent.</li></ul>
   <button class="btn full" disabled>Passer à PRO (bientôt disponible)</button>${CLOSE()}</div>`, () => { }, { nofocus: true }); }
ACT.exportOpen = d => { const t = trip(d.trip); if (!t) return; if (!t.depenses.length) { toast('Aucune dépense à exporter pour ce voyage'); return; }
  if (proLocked()) return exportPaywall(t);
  openPanel(`${expThumbs()}<h2>Exporter les dépenses</h2><p class="small">${esc(t.ville || C(t).n)} : ${t.depenses.length} dépense${t.depenses.length > 1 ? 's' : ''}. Le fichier est créé sur ton téléphone, rien n'est envoyé.</p>
   <button class="exp-opt" data-x="pdf"><b>PDF</b><span>Un relevé clair et mis en page : chiffres clés, répartition par catégorie, dépenses par jour et détail complet. Idéal à garder ou à envoyer.</span></button>
   <button class="exp-opt" data-x="xlsx"><b>Excel</b><span>Un classeur complet : tableau de bord avec graphiques, dépenses filtrables, catégories, sous-catégories et jours, totaux qui se recalculent.</span></button>${CLOSE()}`, p => {
    p.querySelectorAll('.exp-opt').forEach(b => b.onclick = async () => { if (b.disabled) return; p.querySelectorAll('.exp-opt').forEach(x => x.disabled = true); const old = b.querySelector('b').textContent; b.querySelector('b').textContent = 'Préparation…';
      try { const r = b.dataset.x === 'pdf' ? await expPDF(t) : await expXLSX(t); await expDeliver(r); closePanel(); toast('Fichier prêt'); }
      catch (e) { console.error(e); toast('Export impossible, réessaie'); } finally { p.querySelectorAll('.exp-opt').forEach(x => x.disabled = false); b.querySelector('b').textContent = old; } }); }, { nofocus: true }); };
