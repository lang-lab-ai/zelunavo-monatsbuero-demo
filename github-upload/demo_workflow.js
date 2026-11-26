(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const legacySeptemberHash = '77cc925d27ae3f3458e6385cdafd44294c9c0af5c0bc7b4d765b47d1be2e7147';
  // September image previously downloaded from the app under Zelunavo_MHD_2026-09_FIKTIV.png.
  const generatedSeptemberHash = '71e8c4332ce8a97a1baaea3a8b63ca10e97ab9365e0deaf2357c8d8853db8d08';
  const monthlyMhdHashes = {
    '2026-05':'1b34696591088ae4d3042ff0a1dab02ecf49098c8efe16f55506848b33a51aee',
    '2026-06':'28751b30b5b2f150bcef551616e2b3da4d4c65ac31a0ae2579c2f3d1ba18b91c',
    '2026-07':'6e5c97eb48f260f93b1fb0a56345c3905e8193fb79b2a551474b1f2f91f2ee8d',
    '2026-08':'c998e91610835ce377deb680a0936e0a6fea3450d85ea406b6c804d59656a365',
    '2026-09':legacySeptemberHash
  };
  let screenshotReady = false, prepared = null, finalPdf = null, finalExportRows = null, mhdPdf = null, mhdXlsx = null, mhdRecorded = '', mhdSource = '', autoFinalizeScheduled = false, autoFinalizeAttempted = false;
  const euro = cents => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents / 100);
  const monthTitle = month => new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
  const xml = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const download = (bytes,name,type) => {
    const url=URL.createObjectURL(new Blob([bytes],{type})); const a=document.createElement('a');
    a.href=url; a.download=name; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000);
  };
  const textCell = (col,row,value) => `<c r="${col}${row}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  const numCell = (col,row,value,money=false) => `<c r="${col}${row}"${money?' s="1"':''}><v>${Number(value)}</v></c>`;
  const formulaCell = (col,row,value,money=false) => `<c r="${col}${row}"${money?' s="1"':''}><f>${value.formula}</f><v>${Number(value.result)}</v></c>`;
  async function workbook(title,headers,rows,moneyCols=[]) {
    const zip=new JSZip();
    zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
    zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(title)}" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    zip.file('xl/styles.xml','<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00 &quot;€&quot;"/></numFmts><fonts count="1"><font><sz val="11"/><name val="Aptos"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" xfId="0"/><xf numFmtId="164" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>');
    const matrix=[[...headers],...rows], letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const sheetRows=matrix.map((row,index)=>`<row r="${index+1}">${row.map((value,col)=>value&&typeof value==='object'&&'formula' in value?formulaCell(letters[col],index+1,value,moneyCols.includes(letters[col])):typeof value==='number'?numCell(letters[col],index+1,value,moneyCols.includes(letters[col])):textCell(letters[col],index+1,value??'')).join('')}</row>`).join('');
    zip.file('xl/worksheets/sheet1.xml',`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="19" customWidth="1"/><col min="2" max="2" width="45" customWidth="1"/><col min="3" max="10" width="20" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData></worksheet>`);
    return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
  }
  async function makePdf(title,subtitle,lines) {
    const doc=await PDFLib.PDFDocument.create(), font=await doc.embedFont(PDFLib.StandardFonts.Helvetica), bold=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    let page,y;
    const addPage=()=>{page=doc.addPage(PDFLib.PageSizes.A4); y=page.getHeight()-48; page.drawText(title,{x:40,y,size:16,font:bold,color:PDFLib.rgb(.48,.16,.14)});y-=23;page.drawText(subtitle,{x:40,y,size:9,font});y-=26};
    addPage();
    for(const line of lines){if(y<45)addPage();page.drawText(String(line).slice(0,95),{x:40,y,size:10,font});y-=18}
    return doc.save();
  }
  async function makeTimesheetPdf(month) {
    const doc=await PDFLib.PDFDocument.create(),page=doc.addPage(PDFLib.PageSizes.A4);
    const font=await doc.embedFont(PDFLib.StandardFonts.Helvetica),bold=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const title=monthTitle(month),monthNo=Number(month.slice(5));
    page.drawRectangle({x:38,y:36,width:519,height:770,color:PDFLib.rgb(.98,.97,.95)});
    page.drawText('STUNDENNACHWEIS',{x:52,y:774,size:19,font:bold});
    page.drawText('FIKTIVES MUSTER · KEINE ECHTEN MITARBEITERDATEN',{x:52,y:750,size:9,font,color:PDFLib.rgb(.48,.16,.14)});
    page.drawText('Firma: Zelunavo Demo',{x:52,y:714,size:11,font});
    page.drawText('Mitarbeitende Person: Musterperson A · DEMO-001',{x:52,y:694,size:11,font});
    page.drawText(`Monat: ${title}`,{x:330,y:714,size:11,font});
    const headers=['Datum','Beginn','Pause','Ende','Dauer','Bemerkung'],xs=[52,128,202,267,333,395];
    page.drawRectangle({x:50,y:636,width:494,height:28,color:PDFLib.rgb(.91,.88,.84)});
    headers.forEach((h,i)=>page.drawText(h,{x:xs[i],y:646,size:8,font:bold}));
    const dayCounts=[4,4,5,4];let y=610,total=0;
    for(let i=0;i<dayCounts[monthNo%4];i++){
      const day=String(4+i*7).padStart(2,'0'),hours=i%3===1?4.5:4,totalMins=hours*60;total+=totalMins;
      const row=[`${day}.${month.slice(5)}.${month.slice(0,4)}`,'08:00','00:30',`${String(8+Math.floor((totalMins+30)/60)).padStart(2,'0')}:${String((totalMins+30)%60).padStart(2,'0')}`,`${Math.floor(hours)}:${hours%1?'30':'00'}`,i%2?'Automatenservice':'Befüllung'];
      if(i%2)page.drawRectangle({x:50,y:y-5,width:494,height:24,color:PDFLib.rgb(.95,.93,.9)});
      row.forEach((v,j)=>page.drawText(v,{x:xs[j],y,size:8,font}));y-=25;
    }
    page.drawLine({start:{x:50,y:y+12},end:{x:544,y:y+12},thickness:1,color:PDFLib.rgb(.5,.46,.42)});
    page.drawText(`Gesamtdauer: ${Math.floor(total/60)}:${String(total%60).padStart(2,'0')} Stunden`,{x:52,y:y-8,size:11,font:bold});
    page.drawText('Alle Zeitangaben sind frei erfunden und dienen nur der Vorführung.',{x:52,y:52,size:8,font,color:PDFLib.rgb(.35,.35,.35)});
    return doc.save();
  }
  async function makeCashbookPdf(book,income,expense,month) {
    const doc=await PDFLib.PDFDocument.create(), page=doc.addPage(PDFLib.PageSizes.A4);
    const font=await doc.embedFont(PDFLib.StandardFonts.Helvetica), bold=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const dark=PDFLib.rgb(.2,.17,.16), red=PDFLib.rgb(.48,.16,.14);
    page.drawText(`Kassenbuch ${monthTitle(month)}`,{x:40,y:795,size:16,font:bold,color:red});
    page.drawText(localWorkVersion()?'LOKALES KASSENBUCH - ARBEITSENTWURF':'FIKTIVE DEMO - monatliches Beispiel',{x:40,y:774,size:9,font,color:dark});
    page.drawText(`Anfangsbestand: ${euro(book.opening)}`,{x:40,y:742,size:10,font});
    page.drawText(`Kassenbestand: ${euro(book.opening+income-expense)}`,{x:315,y:742,size:10,font:bold});
    page.drawText('BARUMSATZ - AUTOMATEN',{x:40,y:710,size:10,font:bold});
    page.drawText('BARGELDBEWEGUNGEN',{x:315,y:710,size:10,font:bold});
    const outputs=[...book.deposits.map(row=>({...row,name:'Kasse an Bank'})),...book.change.map(row=>({...row,name:`Wechselgeld: ${row.name}`}))];
    let y=686;
    for(let i=0;i<Math.max(book.income.length,outputs.length);i++) {
      const inc=book.income[i],out=outputs[i];
      if(inc){page.drawText(inc.name,{x:40,y,size:8.5,font});page.drawText(euro(inc.cents),{x:235,y,size:8.5,font})}
      if(out){page.drawText(`${out.date} ${out.name}`,{x:315,y,size:8.5,font});page.drawText(euro(out.cents),{x:500,y,size:8.5,font})}
      y-=24;
    }
    page.drawText(`Summe: ${euro(income)}`,{x:40,y:y-8,size:10,font:bold});
    page.drawText(`Summe: ${euro(expense)}`,{x:315,y:y-8,size:10,font:bold});
    return doc.save();
  }
  async function makeCashbookWorkbook(book,month) {
    const outputs=[...book.deposits.map(row=>({...row,name:'Kasse an Bank'})),...book.change.map(row=>({...row,name:`Wechselgeld: ${row.name}`}))];
    const length=Math.max(book.income.length,outputs.length),rows=[['','Anfangsbestand',book.opening/100,'','']];
    for(let i=0;i<length;i++)rows.push([outputs[i]?.date||'',book.income[i]?.name||'',book.income[i]?book.income[i].cents/100:'',outputs[i]?.name||'',outputs[i]?outputs[i].cents/100:'']);
    const sumRow=length+3,income=book.income.reduce((sum,row)=>sum+row.cents,0),expense=outputs.reduce((sum,row)=>sum+row.cents,0);
    rows.push(['','Summe Barumsatz',{formula:`SUM(C3:C${sumRow-1})`,result:income/100},'Summe Bargeldbewegungen',{formula:`SUM(E3:E${sumRow-1})`,result:expense/100}]);
    rows.push(['','Kassenbestand',{formula:`C2+C${sumRow}-E${sumRow}`,result:(book.opening+income-expense)/100},'','']);
    return workbook(`Kassenbuch ${month}`,['Datum','Einnahme / Automat','Betrag EUR','Ausgabe / Belegtext','Betrag EUR'],rows,['C','E']);
  }
  function buildFinalExportRows(book,month,salesReport,employeeTimesheets,ownPdf,income,expense){
    const rows=[],add=(section,position,date,description,amount,file,status)=>rows.push([section,position,date,description,amount??'',file||'',status||'']);
    let position=1;
    add('Dokumentenfolge',position++,'','Kassenbuch · Monatsblatt',null,`Kassenbuch-${month}-FIKTIV.pdf`,'Bestand 0,00 €');
    add('Dokumentenfolge',position++,'','MHD-Liste',null,`MHD-Liste-${month}-FIKTIV.pdf`,`${document.querySelectorAll('#demo-mhd-table tbody tr').length} Position(en)`);
    add('Dokumentenfolge',position++,'',`Verkaufsbericht · ${salesReport.period||''}`,null,salesReport.name,'PDF-Anlage');
    for(const sheet of employeeTimesheets)add('Dokumentenfolge',position++,'',`Mitarbeiter-Stundenzettel · ${sheet.name}`,null,sheet.name,'PDF-Anlage');
    if(ownPdf)add('Dokumentenfolge',position++,'',`Eigener Stundenzettel · ${window.ownTimesheetPerson?.(month)||'eigene Arbeitszeit'}`,null,'Eigener-Stundenzettel.pdf','PDF-Anlage');
    add('Dokumentenfolge',position++,'','Kontoauszug',null,prepared.statement?.name,'PDF-Anlage');
    for(const item of prepared.items){
      const date=item.booking?.date||'',description=item.booking?.name||item.label||item.kind;
      add('Dokumentenfolge',position++,date,description,typeof item.booking?.cents==='number'?item.booking.cents/100:null,item.name||'',item.kind==='physical'?'Originalbeleg zum Einlegen':item.label||item.kind);
    }
    add('Kassenbuch','','','Anfangsbestand',book.opening/100,'','');
    for(const row of book.income)add('Kassenbuch · Barumsatz','', '',row.name,row.cents/100,'Automatenbericht','');
    for(const row of book.deposits)add('Kassenbuch · Einzahlung','',row.date,'Kasse an Bank',row.cents/100,'Kontoauszug','');
    for(const row of book.change)add('Kassenbuch · Wechselgeld','',row.date,row.name,row.cents/100,'Manuelle Eingabe','');
    add('Kassenbuch','','','Summe Barumsatz',income/100,'','');
    add('Kassenbuch','','','Summe Bargeldbewegungen',expense/100,'','');
    add('Kassenbuch','','','Kassenbestand',0,'','');
    const mhdRows=[...document.querySelectorAll('#demo-mhd-table tbody tr')].map(tr=>({article:tr.querySelector('[data-field="article"]')?.value||'',quantity:Number(tr.querySelector('[data-field="quantity"]')?.value||0),expiry:tr.querySelector('[data-field="expiry"]')?.value||''}));
    add('MHD','','',`Erfasst am ${mhdRecorded}`,null,'','');
    for(const row of mhdRows)add('MHD','',row.expiry,`${row.article} · ${row.quantity} Stück`,null,'','');
    for(const [index,item] of prepared.items.entries())add('Belegabgleich',index+1,item.booking?.date||'',item.booking?.name||item.label||item.kind,typeof item.booking?.cents==='number'?item.booking.cents/100:null,item.name||'',item.label||item.kind);
    return rows;
  }
  const csvText=(headers,rows)=>'\ufeff'+[headers,...rows].map(row=>row.map((value,index)=>{
    let text=value==null?'':String(index===4&&typeof value==='number'?value.toFixed(2).replace('.',','):value);
    return /[;"\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;
  }).join(';')).join('\r\n');
  const safeName=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60)||'Person';
  async function sourceBytes(path,base64) {
    try {const response=await fetch(path);if(!response.ok)throw Error('Datei fehlt');return await response.arrayBuffer()}
    catch {if(!base64)throw Error(`Fiktive Quelldatei fehlt: ${path}`);return Uint8Array.from(atob(base64),char=>char.charCodeAt(0))}
  }
  function localWorkVersion(){return !!document.querySelector('meta[name="local-token"]')&&document.querySelector('meta[name="zelunavo-data-mode"]')?.content==='work'}
  function bytesToBase64(bytes){let binary='';const block=0x6000;for(let i=0;i<bytes.length;i+=block)binary+=String.fromCharCode(...bytes.subarray(i,i+block));return btoa(binary)}
  async function getSalesReport(month){
    if(!localWorkVersion())return window.zelunavoDemoSources.salesReport.load(month,sourceBytes);
    const token=document.querySelector('meta[name="local-token"]').content;
    const response=await fetch('/api/vendon-sales-report',{method:'POST',headers:{'Content-Type':'application/json','X-Local-Token':token},body:JSON.stringify({data_mode:'work',month})});
    const result=await response.json();
    if(!response.ok||!result.ok)throw Error(result.error||result.message||'Lokaler Vendon-Bericht konnte nicht bereitgestellt werden.');
    const bytes=Uint8Array.from(atob(result.data),char=>char.charCodeAt(0));
    if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Der lokale Vendon-Download ist keine PDF-Datei.');
    return {bytes,period:`${result.periodStart}–${result.periodEnd}`,pages:result.pages,name:result.name,qwenConfidence:result.qwenConfidence,local:true,periodStart:result.periodStart,periodEnd:result.periodEnd,sha256:result.sha256};
  }
  async function getConfirmedGmailTimesheets(month){
    const token=document.querySelector('meta[name="local-token"]').content;
    const response=await fetch('/api/gmail-timesheets?mode=work&month='+encodeURIComponent(month),{headers:{'X-Local-Token':token}}),result=await response.json();
    if(!response.ok)throw Error(result.error||'Gmail-Stundenzettel konnten nicht geladen werden.');
    const documents=result.documents||[],pending=documents.filter(item=>!item.resolved),confirmed=documents.filter(item=>item.confirmed);
    if(!documents.length)throw Error('Qwen hat noch keine Gmail-Stundenzettel für diesen Monat gefunden. Bitte zuerst den lokalen Gmail-Abruf ausführen.');
    if(pending.length)throw Error(`${pending.length} Gmail-Stundenzettel warten noch auf deine Prüfung und Bestätigung oder Ablehnung.`);
    if(!confirmed.length)throw Error('Es wurde kein Mitarbeiter-Stundenzettel für die Abschluss-PDF bestätigt.');
    return confirmed.map(item=>({name:item.name,bytes:Uint8Array.from(atob(item.data),char=>char.charCodeAt(0))}));
  }
  async function archiveEntries(month,parts) {
    const base='Zelunavo-Demoablage/';
    const add=(category,name,bytes)=>({path:`${base}${category}/${month}/${name}`,bytes});
    const entries=[
      add('Abschluss-PDF',`Zelunavo-Abschluss-${month}-FIKTIV.pdf`,parts.finalPdf),
      add('Kassenbuch',`Kassenbuch-${month}-FIKTIV.xlsx`,parts.cashXlsx),
      add('Kassenbuch',`Kassenbuch-${month}-FIKTIV.pdf`,parts.cashPdf),
      add('MHD-Liste',`MHD-Liste-${month}-FIKTIV.xlsx`,mhdXlsx),
      add('MHD-Liste',`MHD-Liste-${month}-FIKTIV.pdf`,mhdPdf),
      add('MHD-Liste',`MHD-Quelle-${month}-FIKTIV.png`,await $('demo-shot').files[0].arrayBuffer()),
      add('Sales-Report',`Zelunavo_Verkaufsbericht_${month}-FIKTIV.pdf`,parts.salesPdf),
      add('Stundenzettel/Musterperson_A',`Stundennachweis-${month}-FIKTIV.pdf`,parts.timePdf),
      add('Kontoauszug',`${safeName(prepared.statement.name.replace(/\.pdf$/i,''))}.pdf`,await prepared.statement.arrayBuffer())
    ];
    if(parts.ownPdf)entries.push(add(`Stundenzettel/Eigene_Person_${safeName(window.ownTimesheetPerson?.(month)||'Demo')}`,`Stundennachweis-${month}-FIKTIV.pdf`,parts.ownPdf));
    for(const [index,item] of prepared.items.filter(item=>item.file).entries())entries.push(add('Rechnungen',`${String(index+1).padStart(2,'0')}_${safeName(item.name.replace(/\.pdf$/i,''))}.pdf`,await item.file.arrayBuffer()));
    const reports=window.zelunavoDemoSources?.automation?.reportsFor(month)||window.demoAutomatenberichte?.filter(report=>report.month===month)||[];
    if(reports.length!==6)throw Error('Die sechs fiktiven Automatenberichte fehlen für die Demoablage.');
    for(const report of reports){const path=report.path||report.file?.name||'Automatenbericht.pdf',bytes=report.file?await report.file.arrayBuffer():await sourceBytes(report.path,report.base64);entries.push(add('Automatenberichte',safeName(path.split('/').pop().replace(/\.pdf$/i,''))+'.pdf',bytes))}
    return entries;
  }
  function setProgress(){
    const openCash=prepared&&window.cashbookUnbalancedMonth?.(prepared.month);
    const reportsReady=prepared&&window.cashbookReportsReady?.(prepared.month);
    const salesReady=!!(prepared&&(localWorkVersion()?true:window.zelunavoDemoSources?.salesReport?.forMonth(prepared.month)));
    const ownReady=!prepared||window.ownTimesheetReady?.(prepared.month)!==false;
    const okay=!!prepared && screenshotReady && prepared.statement && prepared.items.some(item=>item.file||item.kind==='physical') && reportsReady && salesReady && !openCash && ownReady;
    $('demo-final-create').disabled=!okay;
    $('demo-final-create').hidden=!!finalPdf;
    $('demo-final-create').textContent='Abschluss-PDF erstellen';
    if(prepared&&!window.zelunavoDemoSources?.mhd?.fixtureFor(prepared.month)) $('demo-final-status').textContent='Für diesen Monat sind noch keine fiktiven Testdaten vorbereitet.';
    else if(prepared&&!reportsReady) $('demo-final-status').textContent='Die sechs fiktiven Automatenberichte des Monats müssen zuerst gelesen werden.';
    else if(prepared&&!salesReady) $('demo-final-status').textContent='Für diesen Monat fehlt die fiktive Verkaufsbericht-PDF.';
    else if(openCash) $('demo-final-status').textContent=`Kassenbuch ${openCash} noch nicht ausgeglichen. Der Kassenbestand muss 0,00 € betragen.`;
    else if(!ownReady) $('demo-final-status').textContent='Der eigene Stundenzettel hat Einträge. Bitte die Zeiten prüfen und auf „Fertig“ klicken.';
    else if(okay) $('demo-final-status').textContent=localWorkVersion()?'Bereit: Der echte Vendon-Bericht wird beim Erstellen lokal geladen und mit Qwen geprüft. Die übrigen noch nicht angebundenen Abschnitte sind weiterhin Demo-Daten.':'Bereit: '+prepared.items.filter(item=>item.file).length+' Rechnungen und die fiktiven Monatsunterlagen. Die Abschluss-PDF kann erstellt werden.';
    else if(!prepared) $('demo-final-status').textContent='';
    else if(!screenshotReady) $('demo-final-status').textContent='Warte auf die geprüfte und übernommene MHD-Liste.';
    else if(!prepared.statement) $('demo-final-status').textContent='Der Kontoauszug fehlt noch.';
    else if(!prepared.items.some(item=>item.file||item.kind==='physical')) $('demo-final-status').textContent='Bitte mindestens einen Rechnungsbeleg zuordnen oder einen Originalbeleg zum Einlegen markieren.';
    else $('demo-final-status').textContent='Die Monatsdaten werden noch geprüft.';
  }
  function maybeAutoFinalize(){
    const button=$('demo-final-create');
    if(autoFinalizeScheduled||autoFinalizeAttempted||finalPdf||!prepared||!screenshotReady||button.disabled)return;
    autoFinalizeScheduled=true;
    setTimeout(()=>{
      autoFinalizeScheduled=false;
      if(finalPdf||autoFinalizeAttempted)return;
      // A readiness change can land between scheduling and this callback.
      // Leave the attempt available so the next confirmation event can retry.
      if(button.disabled)return;
      autoFinalizeAttempted=true;
      button.click();
    },0);
  }
  window.addEventListener('zelunavo:reset',()=>{prepared=null;finalPdf=null;autoFinalizeAttempted=false;$('demo-final-download').hidden=true;setProgress()});
  window.addEventListener('zelunavo:cashbook-changed',()=>{finalPdf=null;autoFinalizeAttempted=false;$('demo-final-download').hidden=true;setProgress();maybeAutoFinalize()});
  window.addEventListener('zelunavo:timesheet-changed',()=>{finalPdf=null;autoFinalizeAttempted=false;$('demo-final-download').hidden=true;const count=prepared?window.ownTimesheetCount?.(prepared.month)||0:0;$('demo-components').querySelectorAll('li')[3].textContent=`Stundenzettel – fiktiver Mitarbeiter${count?' und eigener bestätigter Stundenzettel':''}`;setProgress();maybeAutoFinalize()});
  $('month').addEventListener('change',()=>{
    prepared=null;finalPdf=null;screenshotReady=false;mhdPdf=null;mhdXlsx=null;mhdRecorded='';mhdSource='';$('demo-mhd-table').replaceChildren();$('demo-mhd-xlsx').hidden=true;$('demo-mhd-pdf').hidden=true;$('demo-mhd-apply').hidden=true;$('demo-final-download').hidden=true;
    $('review-wrap').classList.add('hidden');$('final-list').replaceChildren();$('final-status').textContent='';
    $('statement').value='';$('pdf-text').classList.add('hidden');$('pdf-details').classList.add('hidden');$('file-note').classList.add('hidden');
    setProgress();
  });
  window.addEventListener('zelunavo:confirmed',event=>{
      prepared=event.detail; finalPdf=null;finalExportRows=null;autoFinalizeAttempted=false;$('demo-final-download').hidden=true;
    const entries=$('demo-components').querySelectorAll('li');
    entries[0].textContent=`Kassenbuch ${monthTitle(prepared.month)} – nur das Blatt dieses Monats, nach Ausgleich auf 0,00 €`;
    entries[2].textContent=localWorkVersion()?`Vendon-Verkaufsbericht – lokaler Export für ${prepared.month}`:`Vendon-Verkaufsbericht – fiktiver PDF-Export für ${window.zelunavoDemoSources.salesReport.expectedPeriod(prepared.month)}`;
    entries[3].textContent=`Stundenzettel – fiktiver Mitarbeiter${window.ownTimesheetCount?.(prepared.month)?' und eigener bestätigter Stundenzettel':''}`;
    entries[4].textContent=prepared.statement?`Kontoauszug – ${prepared.statement.name}`:'Kontoauszug fehlt';
    entries[5].textContent=`Rechnungen – ${prepared.items.filter(item=>item.file).length} PDF-Belege · ${prepared.items.filter(item=>item.kind==='physical').length} Originalbelege zum Einlegen`;
    setProgress();
    maybeAutoFinalize();
  });
  function validDate(value){
    const match=String(value).match(/^(\d{2})\.(\d{2})\.(20\d{2})$/);
    if(!match)return false;
    const date=new Date(Date.UTC(+match[3],+match[2]-1,+match[1]));
    return date.getUTCFullYear()===+match[3]&&date.getUTCMonth()===+match[2]-1&&date.getUTCDate()===+match[1];
  }
  function renderMhdRows(rows,recorded){
    const table=document.createElement('table'),head=document.createElement('thead'),tr=document.createElement('tr');
    for(const value of ['Erfasst am','Artikel','Menge','MHD','Grund']){const th=document.createElement('th');th.textContent=value;tr.append(th)}head.append(tr);table.append(head);
    const body=document.createElement('tbody');
    for(const [index,row] of rows.entries()){
      const item=document.createElement('tr');
      for(const [field,value] of [['recorded',recorded],['article',row.article],['quantity',row.quantity],['expiry',row.expiry],['reason','MHD']]){
        const td=document.createElement('td');
        if(['article','quantity','expiry'].includes(field)){
          const input=document.createElement('input');input.dataset.field=field;input.setAttribute('aria-label',`${field==='article'?'Artikel':field==='quantity'?'Menge':'MHD'} Zeile ${index+1}`);input.value=value;
          if(field==='quantity'){input.type='number';input.min='1';input.step='1'}
          if(field==='article')input.maxLength=160;
          td.append(input);
        }else td.textContent=value;
        item.append(td);
      }
      body.append(item);
    }
    table.append(body);$('demo-mhd-table').replaceChildren(table);
  }
  async function prepareMhdFiles(rows,recorded,source){
    const month=$('month').value,title=monthTitle(month),validation=window.zelunavoDemoSources?.validateMhd(month,recorded,rows);
    if(validation&&!validation.valid)throw Error(validation.errors.join(' '));
    mhdXlsx=await workbook(`MHD ${title}`,['Erfasst am','Artikel','Menge','MHD','Grund'],rows.map(r=>[recorded,r.article,r.quantity,r.expiry,'MHD']));
    mhdPdf=await makePdf(`MHD-Liste ${title}`,`FIKTIVE DEMO - Quelle: ${source}`,[`Erfasst am: ${recorded}`,...rows.map(r=>`${r.article} | ${r.quantity} Stueck | MHD ${r.expiry} | Grund: MHD`)]);
    screenshotReady=true;$('demo-shot-status').textContent=`${source}: ${rows.length} MHD-Eintrag/Einträge vorbereitet. Bitte die Zeilen prüfen.`;
    window.dispatchEvent(new CustomEvent('zelunavo:mhd-prepared',{detail:{rows,recorded,source}}));
    $('demo-mhd-xlsx').hidden=false;$('demo-mhd-pdf').hidden=false;$('demo-mhd-apply').hidden=false;
    $('demo-components').querySelectorAll('li')[1].textContent=`MHD-Liste ${title} – aus fiktivem Screenshot vorbereitet`;
    setProgress();
  }
  $('demo-shot').addEventListener('change',async event=>{
    screenshotReady=false;mhdPdf=null;mhdXlsx=null;finalPdf=null;$('demo-mhd-xlsx').hidden=true;$('demo-mhd-pdf').hidden=true;$('demo-mhd-apply').hidden=true;$('demo-final-download').hidden=true;$('demo-mhd-table').replaceChildren();$('demo-components').querySelectorAll('li')[1].textContent='MHD-Liste – wartet auf den fiktiven Screenshot';
    const file=event.target.files?.[0]; if(!file){setProgress();return}
    if(!/\.(png|jpe?g)$/i.test(file.name)||!/^image\/(png|jpeg)$/.test(file.type||'')){$('demo-shot-status').textContent='Bitte den MHD-Screenshot als PNG- oder JPG-Bild auswählen.';event.target.value='';setProgress();return}
    if((!localWorkVersion()&&!/(fiktiv|demo)/i.test(file.name))||(localWorkVersion()&&/(fiktiv|demo)/i.test(file.name))){$('demo-shot-status').textContent=localWorkVersion()?'Arbeitsmodus: FIKTIV/DEMO-Bilder sind gesperrt.':'Demomodus: Nur als FIKTIV/DEMO gekennzeichnete Bilder verwenden.';event.target.value='';return}
    try{
      const month=$('month').value,fixture=window.zelunavoDemoSources?.mhd?.fixtureFor(month);
      if(!fixture)throw Error('Für diesen Monat fehlt der fiktive MHD-Testfall.');
      let rows, recorded, source;
      if(window.zelunavoLocalAi){
        const bytes=await file.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
        const expected=await window.zelunavoDemoSources.mhd.createScreenshot(month),expectedHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await expected.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');
        const packageShot=window.zelunavoMonthPackages?.[month]?.mhdScreenshot;
        const matchesPackage=!!packageShot&&file.name===packageShot.name;
        const matchesMonthlyImage=hash===monthlyMhdHashes[month]||(month==='2026-09'&&hash===generatedSeptemberHash);
        const recognizedFixture=hash===expectedHash||matchesPackage||matchesMonthlyImage;
        $('demo-shot-status').textContent='Qwen liest den Screenshot lokal …';
        try {
          const result=await window.zelunavoLocalAi.extractMhd(file,month);
          rows=result.rows;recorded=result.recorded;source='Qwen lokal';
        } catch(error) {
          if(!recognizedFixture)throw error;
          rows=fixture.rows;recorded=fixture.recorded;source=`Fiktiver Demofall · Qwen-Erkennung fehlgeschlagen: ${String(error?.message||'unbekannter Fehler').slice(0,180)} · Referenzwerte verwendet`;
        }
      }else{
        const bytes=await file.arrayBuffer(), hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
        const expected=await window.zelunavoDemoSources.mhd.createScreenshot(month),expectedHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await expected.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');
        const packageShot=window.zelunavoMonthPackages?.[month]?.mhdScreenshot;
        const matchesPackage=!!packageShot&&file.name===packageShot.name;
        const matchesMonthlyImage=hash===monthlyMhdHashes[month]||(month==='2026-09'&&hash===generatedSeptemberHash);
        if(hash!==expectedHash&&!matchesPackage&&!matchesMonthlyImage)throw Error('Ohne lokalen KI-Modus erkennt die Demo den fiktiven Screenshot des ausgewählten Monats.');
        rows=fixture.rows;recorded=fixture.recorded;source='Fiktiver Monatsfall';
      }
      mhdRecorded=recorded;mhdSource=source;
      renderMhdRows(rows,recorded);
      await prepareMhdFiles(rows,recorded,source);
    }catch(error){$('demo-shot-status').textContent=error.message}
    setProgress();
  });
  $('demo-mhd-table').addEventListener('input',event=>{
    if(!event.target.matches('input'))return;
    screenshotReady=false;finalPdf=null;$('demo-mhd-xlsx').hidden=true;$('demo-mhd-pdf').hidden=true;$('demo-final-download').hidden=true;
    $('demo-shot-status').textContent='Korrekturen noch nicht übernommen.';
    setProgress();
  });
  $('demo-mhd-apply').addEventListener('click',async()=>{
    try{
      const rows=[...document.querySelectorAll('#demo-mhd-table tbody tr')].map(tr=>{
        const article=tr.querySelector('[data-field="article"]').value.trim(),quantity=Number(tr.querySelector('[data-field="quantity"]').value),expiry=tr.querySelector('[data-field="expiry"]').value.trim();
        if(!article||article.length>160||!Number.isInteger(quantity)||quantity<1||!validDate(expiry))throw Error('Bitte Artikel, positive ganze Menge und MHD im Format TT.MM.JJJJ prüfen.');
        return {article,quantity,expiry};
      });
      const validation=window.zelunavoDemoSources?.validateMhd($('month').value,mhdRecorded,rows);
      if(validation&&!validation.valid)throw Error(validation.errors.join(' '));
      await prepareMhdFiles(rows,mhdRecorded,mhdSource+' - geprüft');
      autoFinalizeAttempted=false;
      maybeAutoFinalize();
    }catch(error){$('demo-shot-status').textContent=error.message}
  });
  $('demo-mhd-xlsx').addEventListener('click',()=>{if(mhdXlsx)download(mhdXlsx,`MHD-Liste-${$('month').value}-FIKTIV.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')});
  $('demo-mhd-pdf').addEventListener('click',()=>{if(mhdPdf)download(mhdPdf,`MHD-Liste-${$('month').value}-FIKTIV.pdf`,'application/pdf')});
  $('demo-final-create').addEventListener('click',async()=>{
    if(!prepared || !screenshotReady || !prepared.statement || !window.cashbookReportsReady?.(prepared.month) || window.cashbookUnbalancedMonth?.(prepared.month) || window.ownTimesheetReady?.(prepared.month)===false)return;
    const button=$('demo-final-create'); button.disabled=true; finalExportRows=null; $('demo-final-status').textContent=localWorkVersion()?'Verkaufsbericht wird lokal abgerufen; Abschlussunterlagen werden zusammengestellt …':'Fiktive Monatsunterlagen werden zusammengestellt …';
    window.dispatchEvent(new CustomEvent('zelunavo:assembly-started',{detail:{month:prepared.month,local:localWorkVersion()}}));
    let salesReportAttempted=false;
    try{
      const statementText=$('pdf-text').textContent;
      const expectedMonth=monthTitle(prepared.month).replace(' ','\\s+');
      if(!new RegExp(expectedMonth,'i').test(statementText))throw Error(`Der Kontoauszug passt nicht zu ${monthTitle(prepared.month)}. Bitte den fiktiven Kontoauszug dieses Monats auswählen.`);
      const book=window.getCashbook?.(prepared.month)||window.demoCashbook[prepared.month]; if(!book)throw Error('Für diesen Monat liegt kein Demo-Kassenbuch vor.');
      const income=book.income.reduce((sum,row)=>sum+row.cents,0), expense=[...book.deposits,...book.change].reduce((sum,row)=>sum+row.cents,0);
      if(book.opening+income-expense!==0)throw Error(`Das Kassenbuch ${monthTitle(prepared.month)} ist noch nicht ausgeglichen.`);
      const cashPdf=await makeCashbookPdf(book,income,expense,prepared.month);
      salesReportAttempted=true;
      window.dispatchEvent(new CustomEvent('zelunavo:salesreport-started',{detail:{month:prepared.month,local:localWorkVersion()}}));
      const salesReport=await getSalesReport(prepared.month);
      window.dispatchEvent(new CustomEvent('zelunavo:salesreport-loaded',{detail:{month:prepared.month,period:salesReport.period,pages:salesReport.pages,name:salesReport.name,qwenConfidence:salesReport.qwenConfidence,local:salesReport.local===true,periodStart:salesReport.periodStart,periodEnd:salesReport.periodEnd,sha256:salesReport.sha256}}));
      salesReportAttempted=false;
      const cashXlsx=await makeCashbookWorkbook(book,prepared.month);
      let timePdf,employeeTimesheets=[];
      if(localWorkVersion()) employeeTimesheets=await getConfirmedGmailTimesheets(prepared.month);
      else {
        const packageTimesheet=window.zelunavoMonthPackages?.[prepared.month]?.timesheet;
        if(packageTimesheet) timePdf=await packageTimesheet.arrayBuffer();
        else if(prepared.month==='2026-09'){
          try {const response=await fetch(window.zelunavoDemoSources?.timesheets?.pathFor(prepared.month)||'fiktive-testdaten/Stundennachweis_Zelunavo_September_2026_FIKTIV.pdf');if(!response.ok)throw Error('Datei fehlt');timePdf=await response.arrayBuffer()}
          catch {if(!window.demoTimesheetData)throw Error('Der fiktive Stundennachweis fehlt.');timePdf=Uint8Array.from(atob(window.demoTimesheetData),char=>char.charCodeAt(0))}
        } else {
          try {const response=await fetch(window.zelunavoDemoSources?.timesheets?.pathFor(prepared.month));if(!response.ok)throw Error('Datei fehlt');timePdf=await response.arrayBuffer()}
          catch {timePdf=await makeTimesheetPdf(prepared.month)}
        }
        employeeTimesheets=[{name:'Fiktiver Stundenzettel',bytes:timePdf}];
      }
      const ownPdf=await window.getOwnTimesheetPdf?.(prepared.month);
      const pdf=await PDFLib.PDFDocument.create();
      const append=async(bytes,expectedPages)=>{const part=await PDFLib.PDFDocument.load(bytes);if(expectedPages&&part.getPageCount()!==expectedPages)throw Error('Das Kassenbuch muss genau das Monatsblatt enthalten.');const pages=await pdf.copyPages(part,part.getPageIndices());pages.forEach(page=>pdf.addPage(page));return part.getPageCount()};
      await append(cashPdf,1);await append(mhdPdf);await append(salesReport.bytes);for(const sheet of employeeTimesheets)await append(sheet.bytes);if(ownPdf)await append(ownPdf);await append(await prepared.statement.arrayBuffer());
      let count=0;for(const item of prepared.items){if(item.file){await append(await item.file.arrayBuffer());count++}}
      if(!count&&!prepared.items.some(item=>item.kind==='physical'))throw Error('Es wurde kein Rechnungsbeleg vorbereitet. Bitte zuerst Belege bestätigen.');
      finalPdf=await pdf.save();
      const verifiedPdf=await PDFLib.PDFDocument.load(finalPdf),totalPages=verifiedPdf.getPageCount();
      if(totalPages!==pdf.getPageCount())throw Error('Die Abschluss-PDF-Prüfung der Seitenzahl ist fehlgeschlagen.');
      finalExportRows=buildFinalExportRows(book,prepared.month,salesReport,employeeTimesheets,ownPdf,income,expense);
      window.demoGenerated={salesPdf:salesReport.bytes};
      let archiveMessage,archivedCount=0;
      try {
        if(localWorkVersion()){
          const token=document.querySelector('meta[name="local-token"]').content;
          const response=await fetch('/api/abschluss-speichern',{method:'POST',headers:{'Content-Type':'application/json','X-Local-Token':token},body:JSON.stringify({data_mode:'work',month:prepared.month,data:bytesToBase64(finalPdf)})});
          const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||result.message||'Der Arbeitsentwurf konnte lokal nicht gespeichert werden.');
          archiveMessage=` ${result.message} Datei: ${result.name}.`;
          window.dispatchEvent(new CustomEvent('zelunavo:local-final-saved',{detail:{month:prepared.month,name:result.name,pages:result.pages}}));
        }else{
        const entries=await archiveEntries(prepared.month,{finalPdf,cashPdf,cashXlsx,salesPdf:salesReport.bytes,timePdf,ownPdf});
        archivedCount=await (window.zelunavoDemoSources?.archive?.saveMonthlyPackage(prepared.month,entries)||window.demoArchive.save(prepared.month,entries));
        archiveMessage=` ${archivedCount} Dateien wurden in der fiktiven Demoablage gespeichert.`;
        }
      } catch(error) {if(localWorkVersion())window.dispatchEvent(new CustomEvent('zelunavo:local-final-save-failed',{detail:{month:prepared.month,message:error.message}}));archiveMessage=localWorkVersion()?` Lokale Speicherung fehlgeschlagen: ${error.message}`:` Die Demoablage konnte nicht gespeichert werden: ${error.message}`}
      const timesheetCount=employeeTimesheets.length+(ownPdf?1:0);
      $('demo-final-status').textContent='';
      button.classList.add('secondary');button.textContent='PDF erneut erstellen';
      $('demo-final-create').hidden=true;$('demo-final-download').hidden=false;
      window.dispatchEvent(new CustomEvent('zelunavo:finalized',{detail:{valid:true,pages:totalPages,components:5+timesheetCount,archived:archivedCount,invoices:count}}));
    }catch(error){finalPdf=null;if(salesReportAttempted)window.dispatchEvent(new CustomEvent('zelunavo:salesreport-failed',{detail:{message:error.message}}));$('demo-final-status').textContent=`Abschluss-PDF konnte nicht erstellt werden: ${error.message}`;window.dispatchEvent(new CustomEvent('zelunavo:finalized',{detail:{valid:false,error:error.message}}))}
    finally{button.disabled=false}
  });
  $('demo-final-download').addEventListener('click',async()=>{
    if(!finalPdf||!prepared||!finalExportRows)return;
    const suffix=localWorkVersion()?'ARBEITSENTWURF':'FIKTIV',base=`Zelunavo-Abschluss-${prepared.month}-${suffix}`,format=$('demo-final-format').value;
    try{
      if(format==='xlsx'){
        const bytes=await workbook(`Abschluss ${prepared.month}`,['Bereich','Reihenfolge','Datum','Beschreibung','Betrag EUR','Datei / Beleg','Status'],finalExportRows,['E']);
        download(bytes,`${base}-Uebersicht.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      }else if(format==='csv')download(csvText(['Bereich','Reihenfolge','Datum','Beschreibung','Betrag EUR','Datei / Beleg','Status'],finalExportRows),`${base}-Uebersicht.csv`,'text/csv;charset=utf-8');
      else download(finalPdf,`${base}.pdf`,'application/pdf');
    }catch(error){$('demo-final-status').textContent=`Download konnte nicht erstellt werden: ${error.message}`}
  });
  setProgress();
})();
