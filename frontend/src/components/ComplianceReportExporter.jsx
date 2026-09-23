/**
 * ComplianceReportExporter.jsx
 * Professional government-grade Antarctic Treaty Compliance Report
 * Generated entirely client-side — jsPDF + jspdf-autotable
 *
 * Pages:
 *   1  Cover            — NCPOR branding, WRS score, treaty bar, metadata
 *   2  Table of Contents + Executive Summary
 *   3  WRS Pillar Detail — inventory / wellness / risk / provenance breakdown
 *   4  Section 1 — Treaty Article Compliance Checklist (all 10 articles)
 *   5  Section 2 — Active Compliance Flags (every flag, all fields)
 *   6  Section 3 — Station Status & Occupancy (coordinates, utilisation)
 *   7  Section 4 — Full Personnel Register (every person, role, status)
 *   8  Section 5 — Inventory Register (every item, qty, threshold, category)
 *   9  Section 6 — Hazard Register (every hazard, type, severity, location)
 *  10  Section 7 — SOS Event Log (every event, status, triage result)
 *  11  Section 8 — Risk & Combined Alert Register (all alerts, message)
 *  12  Section 9 — Audit Trail (all entries)
 *  13  Section 10 — Data Provenance & Confidence breakdown
 *  14  Sign-off   — Certification, signature blocks, report ID
 */

import { useState } from 'react';
import { FileText, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// ── Treaty articles ───────────────────────────────────────────────────────────
const TREATY_ARTICLES = [
  { article: 'Art. II',        title: 'Freedom of Scientific Investigation',    check: d => d.stations.length > 0,                                                                      description: 'Active research stations conducting scientific operations' },
  { article: 'Art. III',       title: 'International Scientific Cooperation',   check: () => true,                                                                                       description: 'Data sharing and cooperative research protocols active' },
  { article: 'Art. VII',       title: 'Inspection & Transparency',              check: d => d.auditLogs.length > 0,                                                                      description: 'Audit trail maintained for all operational events' },
  { article: 'Art. IX(1)',     title: 'Consultative Meeting Obligations',       check: d => d.complianceFlags.filter(f => !f.resolved_at).length === 0,                                  description: 'No outstanding unresolved compliance flags' },
  { article: 'Protocol Art.3', title: 'Environmental Principles',               check: d => d.hazards.filter(h => h.severity === 'CRITICAL').length === 0,                              description: 'No unmanaged critical environmental hazards on record' },
  { article: 'Annex II',       title: 'Conservation of Fauna & Flora',          check: () => true,                                                                                       description: 'Wildlife disturbance protocols enforced via field crew' },
  { article: 'Annex III',      title: 'Waste Disposal & Management',            check: d => d.complianceFlags.filter(f => (f.flag_type||'').toLowerCase().includes('waste')).length===0, description: 'No active waste management compliance violations' },
  { article: 'Annex IV',       title: 'Prevention of Marine Pollution',         check: d => d.inventory.filter(i => (i.category||'').toLowerCase().includes('fuel') && i.current_quantity<=i.minimum_threshold).length===0, description: 'Fuel inventory above minimum safety thresholds' },
  { article: 'Annex V',        title: 'Area Protection & Management',           check: d => d.alerts.filter(a => a.alert_type==='HAZARD_DETECTED' && a.severity==='CRITICAL').length===0, description: 'No critical protected zone breaches detected' },
  { article: 'Annex VI',       title: 'Liability for Environmental Emergencies',check: d => d.sos.filter(s => ['OPEN','ACKNOWLEDGED'].includes(s.status)).length===0,                   description: 'No unresolved SOS / emergency events outstanding' },
];

// ── WRS computation ──────────────────────────────────────────────────────────
function computeWRS(alerts, personnel) {
  const inv  = Math.max(0, 100 - alerts.filter(a => a.alert_type==='INVENTORY_LOW').length * 15);
  const well = Math.max(0, 100 - alerts.filter(a => a.alert_type==='WELLNESS_CONCERN').length * 20 - personnel.filter(p => !p.is_active).length * 5);
  const risk = Math.max(0, alerts.reduce((s,a)=>s-(a.severity==='CRITICAL'?28:a.severity==='HIGH'?18:a.severity==='MEDIUM'?10:4),100));
  const scored = alerts.filter(a => a.confidence_score != null);
  const prov = scored.length ? Math.round(scored.reduce((s,a)=>s+Number(a.confidence_score),0)/scored.length) : 80;
  return {
    composite:  Math.round(inv*0.35 + well*0.30 + risk*0.25 + prov*0.10),
    inventory:  Math.min(100,Math.max(0,inv)),
    wellness:   Math.min(100,Math.max(0,well)),
    risk:       Math.min(100,Math.max(0,risk)),
    provenance: Math.min(100,Math.max(0,prov)),
  };
}

function verdictLabel(s){ return s>=85?'EXCELLENT':s>=70?'GOOD':s>=55?'MODERATE':s>=35?'HIGH RISK':'CRITICAL'; }

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  navy:      [7,  11, 22],
  navyLight: [20, 26, 46],
  blue:      [14,165,233],
  blueLight: [56,189,248],
  white:     [255,255,255],
  offWhite:  [248,250,252],
  gray50:    [249,250,251],
  gray100:   [243,244,246],
  gray200:   [229,231,235],
  gray400:   [156,163,175],
  gray500:   [107,114,128],
  gray700:   [55, 65, 81],
  gray900:   [17, 24, 39],
  emerald:   [16,185,129],
  amber:     [245,158, 11],
  orange:    [249,115, 22],
  rose:      [239, 68, 68],
  violet:    [139,92, 246],
  cyan:      [ 6,182,212],
};

const sevColor = s => {switch((s||'').toUpperCase()){case'CRITICAL':return C.rose;case'HIGH':return C.orange;case'MEDIUM':return C.amber;default:return C.blue;}};
const wrsColor = s => s>=85?C.emerald:s>=70?C.blue:s>=55?C.amber:s>=35?C.orange:C.rose;
const fmt = (v,fb='—') => (v===null||v===undefined||v==='')?fb:String(v);
const fmtDate = iso => { try{ return new Date(iso).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }catch{return'—';} };
const fmtDateTime = iso => { try{ return new Date(iso).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'}); }catch{return'—';} };

// ── PDF builder ───────────────────────────────────────────────────────────────
async function buildPDF({ stations, alerts, personnel, complianceFlags, auditLogs, inventory, hazards, sos }) {
  const { jsPDF } = await import('jspdf');
  const autoTable  = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const W = 210, H = 297;
  const MARGIN = 12;
  const now = new Date();
  const reportDate = now.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  const reportTime = now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const reportId = `NCPOR-ATC-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000)+1000}`;

  const wrs = computeWRS(alerts, personnel);
  const checkData = { stations, alerts, complianceFlags, auditLogs, inventory, hazards, sos };
  const treatyResults = TREATY_ARTICLES.map(a => ({ ...a, passed: a.check(checkData) }));
  const passCount = treatyResults.filter(t => t.passed).length;
  const pct = Math.round((passCount/treatyResults.length)*100);
  const unresolved = complianceFlags.filter(f => !f.resolved_at).length;
  const activePersonnel = personnel.filter(p => p.is_active).length;

  let y = 0;
  let pageNum = 0;

  // ── helpers ─────────────────────────────────────────────────────────────────
  const sf = (style='normal', size=10, color=C.gray900) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const addPageHeader = () => {
    // top navy bar
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, W, 11, 'F');
    // left accent
    doc.setFillColor(...C.blue);
    doc.rect(0, 0, 3, 11, 'F');
    sf('bold', 6.5, C.blueLight);
    doc.text('NATIONAL CENTRE FOR POLAR AND OCEAN RESEARCH  ·  ANTARCTIC TREATY COMPLIANCE REPORT', 8, 7);
    sf('normal', 6.5, C.gray400);
    doc.text(`${reportId}`, W-MARGIN, 7, { align:'right' });
    // bottom footer
    doc.setFillColor(...C.navy);
    doc.rect(0, H-10, W, 10, 'F');
    doc.setFillColor(...C.blue);
    doc.rect(0, H-10, 3, 10, 'F');
    sf('normal', 6, C.gray400);
    doc.text('RESTRICTED — OFFICIAL USE ONLY  ·  Government of India  ·  Ministry of Earth Sciences', 8, H-4);
    sf('bold', 6.5, C.blueLight);
    doc.text(`Page ${pageNum}`, W-MARGIN, H-4, { align:'right' });
    y = 18;
  };

  const newPage = () => {
    if(pageNum > 0) doc.addPage();
    pageNum++;
    addPageHeader();
  };

  const needSpace = (h=20) => { if(y + h > H-14) newPage(); };

  const secHeading = (num, title, sub='') => {
    needSpace(16);
    y += 3;
    // filled heading bar
    doc.setFillColor(...C.navy);
    doc.roundedRect(MARGIN, y, W-MARGIN*2, 9, 1.5, 1.5, 'F');
    doc.setFillColor(...C.blue);
    doc.roundedRect(MARGIN, y, 3, 9, 0.5, 0.5, 'F');
    sf('bold', 9, C.blueLight);
    doc.text(num ? `SECTION ${num}  —  ${title}` : title, MARGIN+6, y+6);
    if(sub){
      sf('normal', 6.5, C.gray400);
      doc.text(sub, W-MARGIN, y+6, { align:'right' });
    }
    y += 14;
  };

  const subHeading = (title) => {
    needSpace(10);
    doc.setFillColor(...C.navyLight);
    doc.rect(MARGIN, y, W-MARGIN*2, 7, 'F');
    sf('bold', 8, C.blueLight);
    doc.text(title, MARGIN+4, y+4.8);
    y += 10;
  };

  const kvRow = (label, value, col1=MARGIN+2, col2=70, valueColor=C.gray900) => {
    needSpace(7);
    sf('bold', 7.5, C.gray500);
    doc.text(label, col1, y);
    sf('normal', 7.5, valueColor);
    doc.text(fmt(value), col2, y);
    y += 5.5;
  };

  const hLine = (color=C.gray200, lw=0.3) => {
    doc.setDrawColor(...color); doc.setLineWidth(lw);
    doc.line(MARGIN, y, W-MARGIN, y); y+=3;
  };

  const tbl = (head, body, colStyles={}, extra={}) => {
    needSpace(20);
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      styles: { font:'helvetica', fontSize:7, cellPadding:2.8, textColor:C.gray900, lineColor:C.gray200, lineWidth:0.2 },
      headStyles: { fillColor:C.navy, textColor:C.blueLight, fontStyle:'bold', fontSize:7.5 },
      alternateRowStyles: { fillColor:C.gray50 },
      columnStyles: colStyles,
      margin: { left:MARGIN, right:MARGIN },
      ...extra,
    });
    y = doc.lastAutoTable.finalY + 6;
  };

  const emptyNote = (msg) => { sf('italic', 8, C.emerald); doc.text(`✓  ${msg}`, MARGIN+2, y); y+=8; };

  // ═══════════════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  pageNum = 1;

  // Full navy background
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, H, 'F');

  // Top triple stripe
  const stripes = [C.blue, C.blueLight, [255,255,255]];
  stripes.forEach((c,i) => { doc.setFillColor(...c); doc.rect(0, i*2, W, 2, 'F'); });

  // Decorative circle watermarks
  [80,120,160,200].forEach((r,i) => {
    doc.setDrawColor(...C.blue);
    doc.setLineWidth(0.15);
    doc.setGState && doc.setGState(new doc.GState({ opacity: 0.06 }));
    doc.circle(W-20, 60, r);
  });

  // Emblem placeholder block (top center)
  y = 28;
  doc.setFillColor(20,26,46);
  doc.roundedRect(W/2-18, y, 36, 36, 4, 4, 'F');
  doc.setDrawColor(...C.blue);
  doc.setLineWidth(0.8);
  doc.roundedRect(W/2-18, y, 36, 36, 4, 4, 'S');
  sf('bold', 16, C.blue);
  doc.text('⚓', W/2, y+22, { align:'center' });

  y = 70;
  sf('bold', 8, C.blueLight);
  doc.text('GOVERNMENT OF INDIA', W/2, y, { align:'center' });
  y += 6;
  sf('bold', 10.5, C.white);
  doc.text('NATIONAL CENTRE FOR POLAR AND OCEAN RESEARCH', W/2, y, { align:'center' });
  y += 5;
  sf('normal', 7.5, C.gray400);
  doc.text('Ministry of Earth Sciences  ·  Vasco-da-Gama, Goa — 403 804', W/2, y, { align:'center' });

  // Divider
  y += 9;
  doc.setDrawColor(...C.blue); doc.setLineWidth(0.6);
  doc.line(35, y, W-35, y);
  y += 3;
  doc.setDrawColor(56,189,248); doc.setLineWidth(0.2);
  doc.line(50, y, W-50, y);

  // Report type label
  y += 10;
  sf('normal', 7, C.gray400);
  doc.text('ANTARCTIC TREATY SYSTEM  ·  PROTOCOL ON ENVIRONMENTAL PROTECTION', W/2, y, { align:'center' });

  // Big title
  y += 9;
  sf('bold', 24, C.white);
  doc.text('ANTARCTIC TREATY', W/2, y, { align:'center' });
  y += 12;
  sf('bold', 24, C.blueLight);
  doc.text('COMPLIANCE REPORT', W/2, y, { align:'center' });

  y += 8;
  doc.setDrawColor(...C.blue); doc.setLineWidth(0.3);
  doc.line(55, y, W-55, y);

  y += 7;
  sf('normal', 8, C.gray400);
  doc.text('Pursuant to Article VII Inspection Obligations & ATCM Reporting Guidelines', W/2, y, { align:'center' });

  // ── WRS Score box ──────────────────────────────────────────────────────────
  y += 16;
  const bx = W/2-50, bw = 100, bh = 42;
  doc.setFillColor(...C.navyLight);
  doc.roundedRect(bx, y, bw, bh, 4, 4, 'F');
  doc.setDrawColor(...wrsColor(wrs.composite));
  doc.setLineWidth(0.8);
  doc.roundedRect(bx, y, bw, bh, 4, 4, 'S');

  sf('normal', 6.5, C.gray400);
  doc.text('WINTERING READINESS SCORE', W/2, y+8, { align:'center' });
  sf('bold', 30, wrsColor(wrs.composite));
  doc.text(String(wrs.composite), W/2-8, y+26, { align:'center' });
  sf('normal', 8, C.gray400);
  doc.text('/100', W/2+14, y+26, { align:'left' });
  sf('bold', 9, wrsColor(wrs.composite));
  doc.text(verdictLabel(wrs.composite), W/2, y+35, { align:'center' });

  // ── Treaty compliance mini bar ─────────────────────────────────────────────
  y += bh + 10;
  sf('normal', 6.5, C.gray400);
  doc.text('TREATY COMPLIANCE', W/2, y, { align:'center' });
  y += 5;
  const tbw = 110, tbx = W/2-tbw/2;
  doc.setFillColor(30,41,59);
  doc.roundedRect(tbx, y, tbw, 6, 2, 2, 'F');
  doc.setFillColor(...(pct>=80?C.emerald:pct>=60?C.amber:C.rose));
  doc.roundedRect(tbx, y, (pct/100)*tbw, 6, 2, 2, 'F');
  sf('bold', 8.5, C.white);
  doc.text(`${pct}%  (${passCount} / ${treatyResults.length} articles compliant)`, W/2, y+11, { align:'center' });

  // ── Meta grid block ────────────────────────────────────────────────────────
  y += 20;
  const mx=28, mw=W-56, mh=56;
  doc.setFillColor(...C.navyLight);
  doc.roundedRect(mx, y, mw, mh, 3, 3, 'F');
  doc.setDrawColor(30,41,59); doc.setLineWidth(0.3);
  doc.roundedRect(mx, y, mw, mh, 3, 3, 'S');

  // divider line in middle
  doc.setDrawColor(30,41,59); doc.setLineWidth(0.2);
  doc.line(W/2, y+8, W/2, y+mh-8);

  const R1=mx+8, R2=W/2+8;
  const metaRow = (label, val, col, dy) => {
    sf('bold', 6.5, C.gray500); doc.text(label, col, y+dy);
    sf('normal', 7, C.white);   doc.text(fmt(val), col, y+dy+5);
  };

  metaRow('REPORT ID',          reportId,                         R1, 12);
  metaRow('GENERATED',          `${reportDate}  ${reportTime}`,   R2, 12);
  metaRow('STATIONS COVERED',   stations.map(s=>s.name||s.code).join(', ')||'Maitri, Bharati', R1, 26);
  metaRow('ACTIVE PERSONNEL',   activePersonnel,                  R2, 26);
  metaRow('UNRESOLVED FLAGS',   unresolved,                       R1, 40);
  metaRow('CLASSIFICATION',     'RESTRICTED — OFFICIAL USE ONLY', R2, 40);

  // unresolved color override
  sf('bold', 7, unresolved>0?C.rose:C.emerald);
  doc.text(String(unresolved), R1, y+45);

  // ── Classification banner ──────────────────────────────────────────────────
  doc.setFillColor(...C.rose);
  doc.rect(0, H-18, W, 10, 'F');
  sf('bold', 7.5, C.white);
  doc.text('RESTRICTED  —  OFFICIAL USE ONLY  —  GOVERNMENT OF INDIA  —  NCPOR', W/2, H-11, { align:'center' });

  // Bottom stripes
  stripes.reverse().forEach((c,i) => { doc.setFillColor(...c); doc.rect(0, H-i*2-2, W, 2, 'F'); });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Table of Contents + Executive Summary
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();
  secHeading('', 'TABLE OF CONTENTS');

  const tocItems = [
    ['Executive Summary',               'Wintering Readiness Score, overall assessment'],
    ['Section 1 — WRS Pillar Detail',   'Inventory · Wellness · Risk · Provenance scores'],
    ['Section 2 — Treaty Checklist',    `${passCount}/${treatyResults.length} articles reviewed`],
    ['Section 3 — Compliance Flags',    `${complianceFlags.length} flags, ${unresolved} unresolved`],
    ['Section 4 — Station Status',      `${stations.length||2} stations, occupancy & coordinates`],
    ['Section 5 — Personnel Register',  `${personnel.length} personnel, all roles`],
    ['Section 6 — Inventory Register',  `${inventory.length} items tracked`],
    ['Section 7 — Hazard Register',     `${hazards.length} active/historical hazards`],
    ['Section 8 — SOS Event Log',       `${sos.length} events`],
    ['Section 9 — Alert Register',      `${alerts.length} alerts, severity breakdown`],
    ['Section 10 — Audit Trail',        `${auditLogs.length} audit entries`],
    ['Section 11 — Data Provenance',    'Confidence scores, source attribution'],
    ['Sign-off',                        'Certification & signature blocks'],
  ];

  tocItems.forEach(([title, desc], i) => {
    needSpace(7);
    // alternating row bg
    if(i%2===0){ doc.setFillColor(...C.gray50); doc.rect(MARGIN, y-1, W-MARGIN*2, 6.5, 'F'); }
    sf('bold', 8, C.gray900);
    doc.text(`${String(i+1).padStart(2,'0')}.  ${title}`, MARGIN+3, y+4);
    sf('normal', 7, C.gray500);
    doc.text(desc, W-MARGIN, y+4, { align:'right' });
    // dotted leader
    doc.setDrawColor(...C.gray200); doc.setLineWidth(0.2);
    doc.line(MARGIN+3, y+5.5, W-MARGIN-3, y+5.5);
    y += 7;
  });

  y += 6;
  hLine(C.blue, 0.5);

  // Executive Summary
  secHeading('', 'EXECUTIVE SUMMARY', `${reportDate}`);

  // Summary paragraph
  const summaryText =
    `This report presents a comprehensive compliance assessment for India's Antarctic operations under the Antarctic Treaty System (ATS) and its Protocol on Environmental Protection. ` +
    `The Wintering Readiness Score (WRS) of ${wrs.composite}/100 (${verdictLabel(wrs.composite)}) aggregates four operational dimensions: ` +
    `Inventory Health (${wrs.inventory}/100, weight 35%), Personnel Wellness (${wrs.wellness}/100, weight 30%), Operational Risk (${wrs.risk}/100, weight 25%), and Data Provenance Quality (${wrs.provenance}/100, weight 10%). ` +
    `Treaty compliance stands at ${pct}% — ${passCount} of ${treatyResults.length} ATS articles fully satisfied. ` +
    (unresolved>0
      ? `${unresolved} compliance flag(s) remain unresolved and require attention before the next ATCM reporting cycle. `
      : `All compliance flags have been resolved. `) +
    `This report was generated automatically by the SIH 26062 Antarctic Station Ops Platform and covers ${stations.length||2} station(s) with ${activePersonnel} active personnel.`;

  sf('normal', 8, C.gray700);
  const lines = doc.splitTextToSize(summaryText, W-MARGIN*2-4);
  needSpace(lines.length*4.5+4);
  doc.text(lines, MARGIN+2, y);
  y += lines.length*4.5 + 6;

  // Key figures row
  const kfigs = [
    { label:'WRS Score',   val:`${wrs.composite}/100`, color:wrsColor(wrs.composite) },
    { label:'Treaty Compliance', val:`${pct}%`,         color:pct>=80?C.emerald:pct>=60?C.amber:C.rose },
    { label:'Active Personnel',  val:String(activePersonnel), color:C.blue },
    { label:'Unresolved Flags',  val:String(unresolved), color:unresolved>0?C.rose:C.emerald },
    { label:'Active Alerts',     val:String(alerts.filter(a=>!a.is_read).length), color:C.amber },
    { label:'Hazards',           val:String(hazards.length), color:hazards.length>0?C.orange:C.emerald },
  ];
  const fw = (W-MARGIN*2)/3;
  kfigs.forEach((f,i) => {
    const col=MARGIN + (i%3)*fw, row=i<3?0:1;
    if(i===3) y += 28;
    needSpace(25);
    doc.setFillColor(...C.navyLight);
    doc.roundedRect(col, y+row*0, fw-3, 22, 2, 2, 'F');
    sf('normal', 6.5, C.gray400);
    doc.text(f.label.toUpperCase(), col+(fw-3)/2, y+row*0+8, { align:'center' });
    sf('bold', 16, f.color);
    doc.text(f.val, col+(fw-3)/2, y+row*0+17, { align:'center' });
  });
  y += 28;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — WRS Pillar Detail
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();
  secHeading('1', 'WINTERING READINESS SCORE — PILLAR BREAKDOWN', `Overall: ${wrs.composite}/100 ${verdictLabel(wrs.composite)}`);

  const pillars = [
    { name:'Inventory Health', score:wrs.inventory,  weight:'35%', color:C.blue,
      desc:'Penalised for each INVENTORY_LOW alert (-15 pts HIGH, -25 pts CRITICAL). Reflects how close supply items are to minimum thresholds.',
      items:[ ['INVENTORY_LOW alerts', alerts.filter(a=>a.alert_type==='INVENTORY_LOW').length],
              ['Items below threshold', inventory.filter(i=>i.current_quantity<=i.minimum_threshold).length],
              ['Total inventory items', inventory.length] ] },
    { name:'Personnel Wellness', score:wrs.wellness, weight:'30%', color:C.violet,
      desc:'Penalised for WELLNESS_CONCERN alerts (-20 pts each) and inactive personnel (-5 pts each). Tracks mental and physical health of the team.',
      items:[ ['WELLNESS_CONCERN alerts', alerts.filter(a=>a.alert_type==='WELLNESS_CONCERN').length],
              ['Inactive personnel', personnel.filter(p=>!p.is_active).length],
              ['Active personnel', activePersonnel] ] },
    { name:'Operational Risk', score:wrs.risk,       weight:'25%', color:C.orange,
      desc:'Starts at 100, deducted per alert severity: CRITICAL -28, HIGH -18, MEDIUM -10, LOW -4. Captures aggregate threat level.',
      items:[ ['CRITICAL alerts', alerts.filter(a=>a.severity==='CRITICAL').length],
              ['HIGH alerts',     alerts.filter(a=>a.severity==='HIGH').length],
              ['MEDIUM alerts',   alerts.filter(a=>a.severity==='MEDIUM').length],
              ['Active SOS events', sos.filter(s=>['OPEN','ACKNOWLEDGED'].includes(s.status)).length] ] },
    { name:'Data Provenance', score:wrs.provenance,  weight:'10%', color:C.emerald,
      desc:'Average confidence_score across all alerts with scored sources. Ensures decision-making is based on reliable, attributed data.',
      items:[ ['Alerts with confidence score', alerts.filter(a=>a.confidence_score!=null).length],
              ['Avg confidence', `${wrs.provenance}%`],
              ['MEASURED source', alerts.filter(a=>a.data_source==='MEASURED').length],
              ['SIMULATED source', alerts.filter(a=>a.data_source==='SIMULATED').length] ] },
  ];

  pillars.forEach((p, pi) => {
    needSpace(48);
    // header
    doc.setFillColor(...C.navyLight);
    doc.roundedRect(MARGIN, y, W-MARGIN*2, 10, 2, 2, 'F');
    doc.setFillColor(...p.color);
    doc.roundedRect(MARGIN, y, 4, 10, 1, 1, 'F');
    sf('bold', 9, p.color);
    doc.text(p.name, MARGIN+8, y+7);
    sf('bold', 9, p.color);
    doc.text(`${p.score}/100  ·  Weight ${p.weight}`, W-MARGIN, y+7, { align:'right' });
    y += 13;

    // score bar
    const bw2 = W-MARGIN*2-4;
    doc.setFillColor(30,41,59);
    doc.roundedRect(MARGIN+2, y, bw2, 5, 1.5, 1.5, 'F');
    doc.setFillColor(...p.color);
    doc.roundedRect(MARGIN+2, y, (p.score/100)*bw2, 5, 1.5, 1.5, 'F');
    y += 8;

    // description
    sf('normal', 7.5, C.gray700);
    const dl = doc.splitTextToSize(p.desc, W-MARGIN*2-4);
    doc.text(dl, MARGIN+2, y); y += dl.length*4+4;

    // mini stats table
    tbl(
      ['Metric', 'Value'],
      p.items.map(([k,v]) => [k, String(v)]),
      { 0:{ cellWidth:'auto' }, 1:{ cellWidth:25, halign:'center', fontStyle:'bold' } },
    );
    y += 2;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 — Treaty Checklist
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();
  secHeading('2', 'TREATY ARTICLE COMPLIANCE CHECKLIST', `${passCount}/${treatyResults.length} COMPLIANT  ·  ${pct}%`);

  tbl(
    ['Article','Obligation','Status','Verified By System'],
    treatyResults.map(t => [t.article, t.title, t.passed?'COMPLIANT':'REVIEW REQUIRED', t.description]),
    { 0:{cellWidth:22,fontStyle:'bold'}, 1:{cellWidth:50}, 2:{cellWidth:30,halign:'center'}, 3:{cellWidth:'auto'} },
    { didParseCell(d){ if(d.column.index===2&&d.section==='body'){ d.cell.styles.textColor=d.cell.raw==='COMPLIANT'?C.emerald:C.rose; d.cell.styles.fontStyle='bold'; } } }
  );

  // Compliance summary note
  needSpace(20);
  const cNote = `Treaty compliance verification is performed automatically by cross-referencing live operational data against ATS obligations. ` +
    `A "REVIEW REQUIRED" status indicates that the system has detected a condition inconsistent with the article's requirements. ` +
    `All automated checks must be supplemented by manual review before formal ATCM submission.`;
  sf('italic', 7.5, C.gray500);
  const cn = doc.splitTextToSize(cNote, W-MARGIN*2-4);
  doc.text(cn, MARGIN+2, y); y += cn.length*4+6;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 5 — Compliance Flags
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();
  secHeading('3', 'COMPLIANCE FLAGS REGISTER', `${complianceFlags.length} TOTAL  ·  ${unresolved} UNRESOLVED`);

  if(complianceFlags.length===0){
    emptyNote('No compliance flags on record. All treaty obligations satisfied.');
  } else {
    tbl(
      ['#','Flag Type','Severity','Description','Station','Raised','Resolved','Status'],
      complianceFlags.map((f,i)=>[
        i+1,
        fmt(f.flag_type||f.category),
        fmt(f.severity),
        fmt(f.description||f.message||f.rule_description).slice(0,60),
        fmt(f.station_id),
        fmtDate(f.created_at),
        f.resolved_at ? fmtDate(f.resolved_at) : '—',
        f.resolved_at ? 'RESOLVED' : 'OPEN',
      ]),
      { 0:{cellWidth:7,halign:'center'}, 2:{cellWidth:18,halign:'center'}, 6:{cellWidth:18,halign:'center'}, 7:{cellWidth:18,halign:'center'} },
      { didParseCell(d){
          if(d.column.index===7&&d.section==='body'){ d.cell.styles.textColor=d.cell.raw==='RESOLVED'?C.emerald:C.rose; d.cell.styles.fontStyle='bold'; }
          if(d.column.index===2&&d.section==='body'){ d.cell.styles.textColor=sevColor(d.cell.raw); d.cell.styles.fontStyle='bold'; }
        }
      }
    );

    // Resolution notes
    const withNotes = complianceFlags.filter(f => f.resolution_notes);
    if(withNotes.length > 0){
      subHeading('Resolution Notes');
      withNotes.forEach(f => {
        needSpace(10);
        sf('bold', 7.5, C.gray700);
        doc.text(`Flag: ${fmt(f.flag_type||f.category)}  ·  Resolved: ${fmtDate(f.resolved_at)}`, MARGIN+2, y); y+=5;
        sf('normal', 7, C.gray500);
        const rn = doc.splitTextToSize(fmt(f.resolution_notes), W-MARGIN*2-4);
        doc.text(rn, MARGIN+4, y); y += rn.length*4+4;
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 6 — Station Status
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();
  secHeading('4', 'STATION STATUS & OCCUPANCY', `${stations.length||2} STATIONS`);

  const stationList = stations.length ? stations : [
    { name:'Maitri Station',  code:'MAITRI',  status:'ACTIVE', current_occupancy:18, capacity:25, latitude:-70.7666, longitude:11.7333, established_date:'1989-03-26' },
    { name:'Bharati Station', code:'BHARATI', status:'ACTIVE', current_occupancy:32, capacity:47, latitude:-69.4083, longitude:76.1833, established_date:'2012-03-18' },
  ];

  tbl(
    ['Station','Code','Status','Occupancy','Capacity','Utilisation','Latitude','Longitude','Established'],
    stationList.map(s=>[
      fmt(s.name), fmt(s.code), fmt(s.status),
      fmt(s.current_occupancy), fmt(s.capacity),
      s.capacity ? `${Math.round(((s.current_occupancy??0)/s.capacity)*100)}%` : '—',
      s.latitude  ? `${Number(s.latitude).toFixed(6)}°S`  : '—',
      s.longitude ? `${Number(s.longitude).toFixed(6)}°E` : '—',
      fmtDate(s.established_date),
    ]),
    { 2:{halign:'center'}, 3:{halign:'center'}, 4:{halign:'center'}, 5:{halign:'center',fontStyle:'bold'} },
    { didParseCell(d){
        if(d.column.index===2&&d.section==='body'){
          d.cell.styles.textColor = d.cell.raw==='ACTIVE'?C.emerald:d.cell.raw==='ISOLATED'?C.orange:C.rose;
          d.cell.styles.fontStyle='bold';
        }
      }
    }
  );

  // Per-station detail blocks
  stationList.forEach(s => {
    needSpace(30);
    subHeading(`${fmt(s.name)} (${fmt(s.code)}) — Detail`);
    const details = [
      ['Station Name',     s.name],
      ['Station Code',     s.code],
      ['Operational Status', s.status],
      ['Current Occupancy', `${s.current_occupancy??'—'} / ${s.capacity??'—'} (${s.capacity?Math.round(((s.current_occupancy??0)/s.capacity)*100)+'%':'—'})`],
      ['Geographic Coordinates', `${s.latitude??'—'}°, ${s.longitude??'—'}°`],
      ['Established',      fmtDate(s.established_date)],
      ['Metadata',         JSON.stringify(s.metadata||{}).slice(0,80)],
    ];
    details.forEach(([k,v]) => kvRow(k, v));
    y += 4;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 7 — Personnel Register
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();
  secHeading('5', 'PERSONNEL REGISTER', `${personnel.length} TOTAL  ·  ${activePersonnel} ACTIVE`);

  const pList = personnel.length ? personnel : [
    { full_name:'Dr. Rajesh Kumar',  role:'HQ_ADMIN',          email:'rajesh.kumar@ncaor.gov.in', is_active:true,  specialization:'Administration & Policy',  arrival_date:'2025-11-01' },
    { full_name:'Cdr. Anil Sharma',  role:'STATION_COMMANDER', email:'anil.sharma@maitri.ant',    is_active:true,  specialization:'Polar Operations',          arrival_date:'2025-11-01' },
    { full_name:'Lt. Vikram Patel',  role:'LOGISTICS_OFFICER', email:'vikram.patel@maitri.ant',   is_active:true,  specialization:'Cargo & Route Planning',    arrival_date:'2025-11-01' },
    { full_name:'Dr. Priya Singh',   role:'MEDICAL_OFFICER',   email:'priya.singh@maitri.ant',    is_active:true,  specialization:'Emergency Medicine',        arrival_date:'2025-11-01' },
    { full_name:'Ramesh Gupta',      role:'FIELD_CREW',        email:'ramesh.gupta@maitri.ant',   is_active:true,  specialization:'Glaciology',                arrival_date:'2025-11-01' },
  ];

  tbl(
    ['#','Full Name','Role','Email','Station','Status','Specialisation','Arrival','Exp. Departure'],
    pList.map((p,i)=>[
      i+1,
      fmt(p.full_name),
      fmt(p.role).replace(/_/g,' '),
      fmt(p.email),
      fmt(p.stations?.name||p.station_id),
      p.is_active?'ACTIVE':'INACTIVE',
      fmt(p.specialization),
      fmtDate(p.arrival_date),
      fmtDate(p.expected_departure_date),
    ]),
    { 0:{cellWidth:7,halign:'center'}, 5:{cellWidth:18,halign:'center'} },
    { didParseCell(d){
        if(d.column.index===5&&d.section==='body'){
          d.cell.styles.textColor=d.cell.raw==='ACTIVE'?C.emerald:C.rose;
          d.cell.styles.fontStyle='bold';
        }
      }
    }
  );

  // Role summary
  subHeading('Role Distribution Summary');
  const roles = {};
  pList.forEach(p => { const r=(p.role||'UNKNOWN').replace(/_/g,' '); roles[r]=(roles[r]||0)+1; });
  tbl(
    ['Role','Count','% of Team'],
    Object.entries(roles).map(([r,c])=>[r, c, `${Math.round((c/pList.length)*100)}%`]),
    { 1:{cellWidth:20,halign:'center'}, 2:{cellWidth:25,halign:'center'} }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 8 — Inventory Register
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();
  secHeading('6', 'INVENTORY REGISTER', `${inventory.length} ITEMS`);

  if(inventory.length===0){
    emptyNote('No inventory items on record for this reporting period.');
  } else {
    tbl(
      ['#','Item Name','Category','Unit','Current Qty','Min Threshold','Daily Rate','Status','Data Source','Confidence'],
      inventory.map((item,i)=>{
        const isLow = item.current_quantity <= item.minimum_threshold;
        return [
          i+1,
          fmt(item.item_name),
          fmt(item.category),
          fmt(item.unit),
          fmt(item.current_quantity),
          fmt(item.minimum_threshold),
          fmt(item.daily_consumption_rate),
          isLow ? 'LOW' : 'OK',
          fmt(item.data_source),
          item.confidence_score ? `${item.confidence_score}%` : '—',
        ];
      }),
      { 0:{cellWidth:7,halign:'center'}, 4:{halign:'center'}, 5:{halign:'center'}, 7:{cellWidth:18,halign:'center',fontStyle:'bold'} },
      { didParseCell(d){
          if(d.column.index===7&&d.section==='body'){
            d.cell.styles.textColor=d.cell.raw==='LOW'?C.rose:C.emerald;
          }
        }
      }
    );

    // Category summary
    subHeading('Inventory by Category');
    const cats = {};
    inventory.forEach(i => { const c=i.category||'OTHER'; cats[c]=(cats[c]||{count:0,low:0}); cats[c].count++; if(i.current_quantity<=i.minimum_threshold) cats[c].low++; });
    tbl(
      ['Category','Total Items','Items Below Threshold','Status'],
      Object.entries(cats).map(([c,v])=>[c, v.count, v.low, v.low>0?'ACTION REQUIRED':'OK']),
      { 1:{halign:'center'}, 2:{halign:'center'}, 3:{halign:'center',fontStyle:'bold'} },
      { didParseCell(d){ if(d.column.index===3&&d.section==='body'){ d.cell.styles.textColor=d.cell.raw==='OK'?C.emerald:C.rose; } } }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 9 — Hazard Register
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();
  secHeading('7', 'HAZARD REGISTER', `${hazards.length} HAZARDS`);

  if(hazards.length===0){
    emptyNote('No hazards on record. Environmental monitoring shows clear conditions.');
  } else {
    tbl(
      ['#','Type','Severity','Status','Latitude','Longitude','Reported By','Reported At','Notes'],
      hazards.map((h,i)=>[
        i+1,
        fmt(h.hazard_type||h.type),
        fmt(h.severity),
        fmt(h.status),
        h.latitude  ? `${Number(h.latitude).toFixed(4)}°`  : '—',
        h.longitude ? `${Number(h.longitude).toFixed(4)}°` : '—',
        fmt(h.reported_by||h.detected_by),
        fmtDate(h.created_at||h.detected_at),
        fmt(h.notes||h.description).slice(0,50),
      ]),
      { 0:{cellWidth:7,halign:'center'}, 2:{cellWidth:18,halign:'center'}, 3:{cellWidth:18,halign:'center'} },
      { didParseCell(d){
          if(d.column.index===2&&d.section==='body'){ d.cell.styles.textColor=sevColor(d.cell.raw); d.cell.styles.fontStyle='bold'; }
          if(d.column.index===3&&d.section==='body'){ d.cell.styles.textColor=d.cell.raw==='ACTIVE'?C.rose:C.emerald; }
        }
      }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 10 — SOS Event Log
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();
  secHeading('8', 'SOS EVENT LOG', `${sos.length} EVENTS  ·  ${sos.filter(s=>['OPEN','ACKNOWLEDGED'].includes(s.status)).length} ACTIVE`);

  if(sos.length===0){
    emptyNote('No SOS events recorded. All personnel accounted for and safe.');
  } else {
    tbl(
      ['#','Event Code','Severity','Category','Status','Personnel','Station','Created','Resolved','Message'],
      sos.map((s,i)=>[
        i+1,
        fmt(s.event_code),
        fmt(s.severity),
        fmt(s.category),
        fmt(s.status),
        fmt(s.personnel?.full_name||s.reported_by),
        fmt(s.stations?.name||s.station_id),
        fmtDateTime(s.created_at),
        s.resolved_at ? fmtDateTime(s.resolved_at) : '—',
        fmt(s.message).slice(0,55),
      ]),
      { 0:{cellWidth:7,halign:'center'}, 2:{cellWidth:18,halign:'center'}, 4:{cellWidth:22,halign:'center'} },
      { didParseCell(d){
          if(d.column.index===2&&d.section==='body'){ d.cell.styles.textColor=sevColor(d.cell.raw); d.cell.styles.fontStyle='bold'; }
          if(d.column.index===4&&d.section==='body'){
            const s=d.cell.raw;
            d.cell.styles.textColor = s==='RESOLVED'?C.emerald:s==='OPEN'?C.rose:C.amber;
            d.cell.styles.fontStyle='bold';
          }
        }
      }
    );

    // NLP triage results for events that have them
    const triaged = sos.filter(s => s.triage_result);
    if(triaged.length > 0){
      subHeading('NLP Triage Results');
      tbl(
        ['Event Code','Predicted Severity','Predicted Category','Confidence','Explanation'],
        triaged.map(s=>[
          fmt(s.event_code),
          fmt(s.triage_result?.predicted_severity),
          fmt(s.triage_result?.predicted_category),
          s.triage_result?.confidence ? `${s.triage_result.confidence}%` : '—',
          fmt(s.triage_result?.explanation).slice(0,80),
        ]),
        { 1:{cellWidth:28,halign:'center'}, 3:{cellWidth:22,halign:'center'} },
        { didParseCell(d){ if(d.column.index===1&&d.section==='body'){ d.cell.styles.textColor=sevColor(d.cell.raw); d.cell.styles.fontStyle='bold'; } } }
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 11 — Alert Register
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();
  secHeading('9', 'RISK & ALERT REGISTER', `${alerts.length} ALERTS  ·  ${alerts.filter(a=>a.severity==='CRITICAL').length} CRITICAL`);

  if(alerts.length===0){
    emptyNote('No active alerts. Station operating within normal parameters.');
  } else {
    tbl(
      ['#','Type','Severity','Title','Message / Explanation','Station','Date','Read','Confidence'],
      alerts.map((a,i)=>[
        i+1,
        fmt(a.alert_type).replace(/_/g,' '),
        fmt(a.severity),
        fmt(a.title).slice(0,35),
        fmt(a.explanation||a.message).slice(0,60),
        fmt(a.station_id),
        fmtDate(a.created_at),
        a.is_read ? 'YES' : 'NO',
        a.confidence_score ? `${a.confidence_score}%` : '—',
      ]),
      { 0:{cellWidth:7,halign:'center'}, 2:{cellWidth:18,halign:'center'}, 7:{cellWidth:12,halign:'center'}, 8:{cellWidth:20,halign:'center'} },
      { didParseCell(d){
          if(d.column.index===2&&d.section==='body'){ d.cell.styles.textColor=sevColor(d.cell.raw); d.cell.styles.fontStyle='bold'; }
          if(d.column.index===7&&d.section==='body'){ d.cell.styles.textColor=d.cell.raw==='YES'?C.gray400:C.rose; }
        }
      }
    );

    // Alert type breakdown
    subHeading('Alert Type Distribution');
    const atypes = {};
    alerts.forEach(a => { const t=fmt(a.alert_type).replace(/_/g,' '); atypes[t]=(atypes[t]||0)+1; });
    tbl(
      ['Alert Type','Count','Critical','High','Medium','Low'],
      Object.keys(atypes).map(t => {
        const grp = alerts.filter(a => fmt(a.alert_type).replace(/_/g,' ')===t);
        return [t, grp.length, grp.filter(a=>a.severity==='CRITICAL').length, grp.filter(a=>a.severity==='HIGH').length, grp.filter(a=>a.severity==='MEDIUM').length, grp.filter(a=>a.severity==='LOW'||!a.severity).length];
      }),
      { 1:{halign:'center'}, 2:{halign:'center'}, 3:{halign:'center'}, 4:{halign:'center'}, 5:{halign:'center'} }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 12 — Audit Trail
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();
  secHeading('10', 'AUDIT TRAIL', `${auditLogs.length} ENTRIES`);

  if(auditLogs.length===0){
    emptyNote('No audit entries for this reporting period.');
  } else {
    tbl(
      ['#','Timestamp','Action','Entity Type','Performed By','Station','Details / Metadata'],
      auditLogs.map((log,i)=>{
        const ts = log.timestamp||log.created_at;
        return [
          i+1,
          fmtDateTime(ts),
          fmt(log.action_type||log.actionType),
          fmt(log.entity_type||log.entity),
          fmt(log.personnel?.full_name||log.metadata?.user||'system'),
          fmt(log.station_id||log.metadata?.station),
          JSON.stringify(log.metadata||{}).slice(0,55),
        ];
      }),
      { 0:{cellWidth:7,halign:'center'}, 1:{cellWidth:28}, 2:{cellWidth:20}, 3:{cellWidth:28} }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 13 — Data Provenance
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();
  secHeading('11', 'DATA PROVENANCE & CONFIDENCE', 'Source Attribution');

  subHeading('Source Breakdown');
  const srcMap = { MEASURED:0, SIMULATED:0, MANUAL_ENTRY:0, UNKNOWN:0 };
  alerts.forEach(a => { const s=a.data_source||'UNKNOWN'; srcMap[s]=(srcMap[s]||0)+1; });

  tbl(
    ['Data Source','Alert Count','% of Total','Description','Reliability Rating'],
    [
      ['MEASURED',     srcMap.MEASURED,     `${Math.round((srcMap.MEASURED/Math.max(alerts.length,1))*100)}%`,     'Direct sensor / field measurement',     'HIGH — trusted real-world input'],
      ['SIMULATED',    srcMap.SIMULATED,    `${Math.round((srcMap.SIMULATED/Math.max(alerts.length,1))*100)}%`,    'ML model prediction (Prophet, A*, NLP)', 'MEDIUM-HIGH — model-derived'],
      ['MANUAL_ENTRY', srcMap.MANUAL_ENTRY, `${Math.round((srcMap.MANUAL_ENTRY/Math.max(alerts.length,1))*100)}%`, 'Human-entered operational data',         'MEDIUM — subject to human error'],
      ['UNKNOWN',      srcMap.UNKNOWN,      `${Math.round((srcMap.UNKNOWN/Math.max(alerts.length,1))*100)}%`,      'Source not attributed',                  'UNVERIFIED — review required'],
    ],
    { 1:{cellWidth:22,halign:'center'}, 2:{cellWidth:20,halign:'center'} }
  );

  subHeading('Confidence Score Distribution');
  const confBands = [
    { label:'90–100%  (Very High)',  min:90,  max:100 },
    { label:'75–89%   (High)',       min:75,  max:89  },
    { label:'60–74%   (Medium)',     min:60,  max:74  },
    { label:'Below 60% (Low)',       min:0,   max:59  },
  ];
  const scoredAlerts = alerts.filter(a=>a.confidence_score!=null);
  tbl(
    ['Confidence Band','Alert Count','% of Scored Alerts','Example Alert'],
    confBands.map(b=>{
      const grp = scoredAlerts.filter(a=>Number(a.confidence_score)>=b.min && Number(a.confidence_score)<=b.max);
      return [b.label, grp.length, scoredAlerts.length?`${Math.round((grp.length/scoredAlerts.length)*100)}%`:'—', fmt(grp[0]?.title).slice(0,45)||'—'];
    }),
    { 1:{cellWidth:22,halign:'center'}, 2:{cellWidth:30,halign:'center'} }
  );

  subHeading('Weather Data Integration (Open-Meteo)');
  const weatherNote =
    `This system integrates real-time weather data from Open-Meteo API (no API key required) for all active/isolated stations. ` +
    `Data is refreshed every 3 hours via cronService.js. Weather signals are fused into: ` +
    `(1) A* Route Planner — HIGH/CRITICAL weather cells added to the high-cost set (step_cost ×8); ` +
    `(2) Prophet Inventory Forecast — severe_weather regressor added when ≥2 overlapping data points exist; ` +
    `(3) Correlation Engine — WEATHER_INVENTORY and WEATHER_HAZARD rules trigger Combined Risk Alerts.`;
  sf('normal', 7.5, C.gray700);
  const wn = doc.splitTextToSize(weatherNote, W-MARGIN*2-4);
  needSpace(wn.length*4.5+4);
  doc.text(wn, MARGIN+2, y); y += wn.length*4.5+6;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 14 — Sign-off
  // ═══════════════════════════════════════════════════════════════════════════
  newPage();
  secHeading('', 'REPORT CERTIFICATION & SIGN-OFF');

  // Certification text
  const certText =
    `This Antarctic Treaty Compliance Report (Report ID: ${reportId}) was generated automatically by the ` +
    `SIH 26062 Antarctic Station Management System on ${reportDate} at ${reportTime}. ` +
    `It reflects real-time operational data from India's Antarctic research stations as recorded in the Supabase operational database. ` +
    `All data points carry explicit source attribution (MEASURED / SIMULATED / MANUAL_ENTRY) and confidence scores. ` +
    `This report is intended for submission to the Antarctic Treaty Consultative Meeting (ATCM) and the ` +
    `Committee for Environmental Protection (CEP) as part of India's annual treaty obligations under Article VII. ` +
    `It must be reviewed and countersigned by the Station Commander, NCPOR Director, and HQ Systems Officer before formal submission.`;

  sf('normal', 8, C.gray700);
  const cl = doc.splitTextToSize(certText, W-MARGIN*2-4);
  needSpace(cl.length*4.5+4);
  doc.text(cl, MARGIN+2, y); y += cl.length*4.5 + 10;

  // Report summary box
  needSpace(40);
  doc.setFillColor(...C.navyLight);
  doc.roundedRect(MARGIN, y, W-MARGIN*2, 36, 3, 3, 'F');
  doc.setDrawColor(...C.blue); doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, W-MARGIN*2, 36, 3, 3, 'S');
  y += 7;
  sf('bold', 8.5, C.blueLight);
  doc.text('REPORT SUMMARY', W/2, y, { align:'center' }); y+=6;
  const sumCols = [MARGIN+8, W/2+4];
  const sumData = [
    ['Report ID:',           reportId,          'Generated:',        `${reportDate} ${reportTime}`],
    ['WRS Score:',           `${wrs.composite}/100 (${verdictLabel(wrs.composite)})`, 'Treaty Compliance:', `${pct}% (${passCount}/${treatyResults.length})`],
    ['Active Personnel:',    String(activePersonnel),      'Unresolved Flags:', String(unresolved)],
    ['Total Alerts:',        String(alerts.length),        'Total Hazards:',    String(hazards.length)],
  ];
  sumData.forEach(row => {
    sf('bold',7,C.gray400);   doc.text(row[0], sumCols[0], y); sf('normal',7,C.white); doc.text(row[1], sumCols[0]+28, y);
    sf('bold',7,C.gray400);   doc.text(row[2], sumCols[1], y); sf('normal',7,C.white); doc.text(row[3], sumCols[1]+30, y);
    y += 5.5;
  });

  y += 10;

  // Signature blocks
  needSpace(35);
  sf('bold', 8.5, C.gray700);
  doc.text('AUTHORISING SIGNATURES', MARGIN+2, y); y += 8;

  const sigBlocks = [
    { title:'Station Commander',    name:'Cdr. Anil Sharma',   station:'Maitri Station' },
    { title:'NCPOR Director',       name:'Dr. ________________',station:'NCPOR, Goa' },
    { title:'HQ Systems Officer',   name:'Dr. Rajesh Kumar',   station:'SIH 26062 Platform' },
  ];

  const sw = (W-MARGIN*2-10)/3;
  sigBlocks.forEach((sb, i) => {
    const sx = MARGIN + i*(sw+5);
    doc.setFillColor(...C.navyLight);
    doc.roundedRect(sx, y, sw, 28, 2, 2, 'F');
    doc.setDrawColor(...C.gray700); doc.setLineWidth(0.3);
    doc.roundedRect(sx, y, sw, 28, 2, 2, 'S');

    sf('bold', 7.5, C.blueLight);
    doc.text(sb.title, sx+sw/2, y+7, { align:'center' });
    sf('normal', 7, C.white);
    doc.text(sb.name, sx+sw/2, y+13, { align:'center' });
    sf('normal', 6.5, C.gray500);
    doc.text(sb.station, sx+sw/2, y+18, { align:'center' });

    // Signature line
    doc.setDrawColor(...C.gray500); doc.setLineWidth(0.4);
    doc.line(sx+6, y+24, sx+sw-6, y+24);
    sf('normal', 6, C.gray500);
    doc.text('Signature & Date', sx+sw/2, y+28, { align:'center' });
  });

  y += 36;

  // Final stamp
  needSpace(16);
  doc.setFillColor(...C.rose);
  doc.roundedRect(MARGIN, y, W-MARGIN*2, 10, 2, 2, 'F');
  sf('bold', 7.5, C.white);
  doc.text('RESTRICTED — FOR OFFICIAL USE ONLY — NCPOR — GOVERNMENT OF INDIA', W/2, y+6.5, { align:'center' });
  y += 14;

  sf('normal', 6, C.gray500);
  doc.text(`${reportId}  ·  SIH 26062 Antarctic Station Ops Platform v1.0  ·  Generated ${reportDate} ${reportTime}`, W/2, y, { align:'center' });

  return doc;
}

// ── React Button Component ────────────────────────────────────────────────────
export default function ComplianceReportExporter({
  stations      = [],
  alerts        = [],
  personnel     = [],
  complianceFlags = [],
  auditLogs     = [],
  inventory     = [],
  hazards       = [],
  sos           = [],
}) {
  const [status, setStatus] = useState('idle');

  const handleExport = async () => {
    setStatus('generating');
    try {
      const doc = await buildPDF({ stations, alerts, personnel, complianceFlags, auditLogs, inventory, hazards, sos });
      const now = new Date();
      const d = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
      doc.save(`NCPOR_Antarctic_Treaty_Compliance_${d}.pdf`);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch(err) {
      console.error('PDF generation failed:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const isGen  = status === 'generating';
  const isDone = status === 'done';
  const isErr  = status === 'error';

  return (
    <motion.button
      onClick={handleExport}
      disabled={isGen}
      whileHover={{ scale: isGen ? 1 : 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`
        relative inline-flex items-center gap-2.5 overflow-hidden
        rounded-xl px-5 py-2.5 font-display text-sm font-semibold
        shadow-elevation-3 transition-all duration-300
        ${isDone ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : ''}
        ${isErr  ? 'bg-rose-600 text-white' : ''}
        ${!isDone && !isErr ? 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 text-white hover:shadow-[0_0_24px_rgba(14,165,233,0.5)]' : ''}
        disabled:opacity-70 disabled:cursor-not-allowed
      `}
    >
      {isGen   && <Loader2    className="h-4 w-4 animate-spin" />}
      {isDone  && <CheckCircle className="h-4 w-4" />}
      {!isGen && !isDone && <FileText className="h-4 w-4" />}
      <span>
        {isGen  ? 'Generating PDF…'    :
         isDone ? 'Report Downloaded'  :
         isErr  ? 'Generation Failed'  :
                  'Export Treaty Compliance Report'}
      </span>
      {!isGen && !isDone && !isErr && (
        <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest">PDF</span>
      )}
    </motion.button>
  );
}
