(() => {
  'use strict';
  const months = {
    '2026-05': {label:'Mai 2026', recorded:'01.05.2026', rows:[
      {article:'Demo Apfelschorle 0,5 l',quantity:20,expiry:'12.05.2026'},
      {article:'Muster Hafer-Riegel 45 g',quantity:14,expiry:'18.05.2026'},
      {article:'Beispiel Mineralwasser 0,5 l',quantity:24,expiry:'03.06.2026'},
      {article:'Demo Nussmix 60 g',quantity:9,expiry:'09.06.2026'}]},
    '2026-06': {label:'Juni 2026', recorded:'01.06.2026', rows:[
      {article:'Demo Apfelschorle 0,5 l',quantity:16,expiry:'14.06.2026'},
      {article:'Muster Hafer-Riegel 45 g',quantity:11,expiry:'21.06.2026'},
      {article:'Beispiel Mineralwasser 0,5 l',quantity:22,expiry:'04.07.2026'}]},
    '2026-07': {label:'Juli 2026', recorded:'01.07.2026', rows:[
      {article:'Demo Cola Zitrone 0,33 l',quantity:19,expiry:'15.07.2026'},
      {article:'Muster Müsliriegel Kakao 45 g',quantity:13,expiry:'23.07.2026'},
      {article:'Beispiel Eistee Pfirsich 0,5 l',quantity:10,expiry:'05.08.2026'}]},
    '2026-08': {label:'August 2026', recorded:'01.08.2026', rows:[
      {article:'Demo Orangenlimonade 0,33 l',quantity:17,expiry:'16.08.2026'},
      {article:'Muster Salzbrezeln 50 g',quantity:14,expiry:'24.08.2026'},
      {article:'Beispiel Nussmix 60 g',quantity:8,expiry:'07.09.2026'}]},
    '2026-09': {label:'September 2026', recorded:'01.09.2026', rows:[
      {article:'Demo Cola Zitrone',quantity:18,expiry:'15.09.2026'},
      {article:'Muster Müsliriegel Kakao',quantity:12,expiry:'20.09.2026'},
      {article:'Beispiel Eistee Pfirsich',quantity:9,expiry:'22.09.2026'}]}
  };
  const providers = [
    {id:'statement',name:'Kontoauszug',mode:'Lokaler PDF-Upload',adapter:'readStatement(file, month)'},
    {id:'invoices',name:'Rechnungen',mode:'Fiktiver Monatsordner',adapter:'findInvoices(month, booking)'},
    {id:'cashSales',name:'Automatenberichte',mode:'Fiktive PDF-Berichte',adapter:'readCashSales(month)'},
    {id:'salesReport',name:'Verkaufsbericht',mode:'Fiktiver PDF-Export',adapter:'downloadSalesReport(month)'},
    {id:'mhd',name:'MHD-Nachricht',mode:'Fiktiver Screenshot / lokales Qwen',adapter:'extractMhd(image, month)'},
    {id:'timesheets',name:'Stundenzettel',mode:'Fiktive PDF-Datei',adapter:'getTimesheet(month)'},
    {id:'archive',name:'Demoablage',mode:'Browser-Archiv',adapter:'saveMonthlyPackage(month, files)'}
  ];
  function fixtureFor(month) { const fixture=months[month]||window.zelunavoMonthPackages?.[month]?.mhd;return fixture?structuredClone(fixture):null; }
  function registerMonth(month,fixture) { months[month]={label:new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`)),...structuredClone(fixture)}; }
  function expectedSalesPeriod(month) {
    const [year,monthNo]=month.split('-').map(Number),lastDay=new Date(Date.UTC(year,monthNo,0)).getUTCDate();
    const date=day=>`${String(day).padStart(2,'0')}.${String(monthNo).padStart(2,'0')}.${year}`;
    return `${date(1)} bis ${date(lastDay)}`;
  }
  function salesReportFor(month) {
    const packageReport=window.zelunavoMonthPackages?.[month]?.salesReport;
    if(packageReport)return {file:packageReport,name:packageReport.name};
    if(!months[month])return null;
    const name=`Zelunavo_Verkaufsbericht_${month}_FIKTIV.pdf`;return {path:`fiktive-testdaten/verkaufsberichte/${name}`,name,base64:window.demoSalesReportBase64?.[month]};
  }
  async function loadSalesReport(month,readSource,providedFile=null) {
    const source=providedFile?{file:providedFile,name:providedFile.name}:salesReportFor(month);
    if(!source)throw Error(`Für ${month} fehlt die fiktive Sales-Report-PDF.`);
    if(!source.file&&!source.path)throw Error(`Für ${month} fehlt die fiktive Sales-Report-PDF.`);
    const bytes=source.file?await source.file.arrayBuffer():await readSource(source.path,source.base64);
    const pdf=await PDFLib.PDFDocument.load(bytes),title=pdf.getTitle()||'',period=pdf.getSubject()||'';
    const expected=expectedSalesPeriod(month);
    if(pdf.getPageCount()<1)throw Error('Der Verkaufsbericht enthält keine PDF-Seite.');
    if(!title.includes(month)||!title.includes('FIKTIV'))throw Error('Der Verkaufsbericht ist nicht eindeutig als fiktive Datei für den gewählten Monat gekennzeichnet.');
    if(period!==expected)throw Error(`Der Verkaufsbericht hat den Zeitraum „${period||'nicht angegeben'}“ statt „${expected}“.`);
    return {bytes,pages:pdf.getPageCount(),period:expected,name:source.name||'Fiktiver Verkaufsbericht'};
  }
  function validDate(value) {
    const m=String(value).match(/^(\d{2})\.(\d{2})\.(20\d{2})$/);if(!m)return false;
    const date=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));
    return date.getUTCFullYear()===+m[3]&&date.getUTCMonth()===+m[2]-1&&date.getUTCDate()===+m[1];
  }
  function validateMhd(month,recorded,rows) {
    const errors=[];
    if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))errors.push('Monat muss im Format JJJJ-MM angegeben sein.');
    if(!validDate(recorded)||recorded.slice(6,10)+'-'+recorded.slice(3,5)!==month)errors.push('Erfassungsdatum passt nicht zum gewählten Monat.');
    if(!Array.isArray(rows)||rows.length<1||rows.length>30)errors.push('Die Liste muss 1 bis 30 Einträge enthalten.');
    const seen=new Set();
    for(const [i,row] of (Array.isArray(rows)?rows:[]).entries()){
      if(typeof row.article!=='string'||!row.article.trim()||row.article.length>160)errors.push(`Zeile ${i+1}: Artikel fehlt oder ist zu lang.`);
      if(!Number.isInteger(row.quantity)||row.quantity<1||row.quantity>100000)errors.push(`Zeile ${i+1}: Menge muss eine positive ganze Zahl sein.`);
      if(!validDate(row.expiry))errors.push(`Zeile ${i+1}: MHD ist kein gültiges Datum.`);
      const key=`${String(row.article||'').trim().toLocaleLowerCase('de-DE')}|${row.expiry}`;
      if(seen.has(key))errors.push(`Zeile ${i+1}: doppelter Artikel mit gleichem MHD.`);seen.add(key);
    }
    return {valid:errors.length===0,errors};
  }
  async function createScreenshot(month) {
    const fixture=fixtureFor(month); if(!fixture) throw Error('Für diesen Monat gibt es keinen fiktiven MHD-Testfall.');
    const monthName=fixture.label.split(' ')[0];
    const response=await fetch(`fiktive-testdaten/WhatsApp_MHD_${monthName}_2026_FIKTIV.png`,{cache:'no-store'});
    if(!response.ok)throw Error('Der fiktive WhatsApp-Chat-Screenshot fehlt in den Demounterlagen.');
    return response.blob();
  }
  window.zelunavoDemoSources={
    providers,
    get months(){return Object.keys(months).sort()},
    registerMonth,
    mhd:{fixtureFor,createScreenshot},
    validateMhd,
    salesReport:{mode:'fictional-downloaded-pdf',forMonth:salesReportFor,expectedPeriod:expectedSalesPeriod,load:loadSalesReport},
    statement:{mode:'upload',async read(file,reader,month){if(!file)throw Error('Kontoauszug fehlt.');return reader(file,month)}},
    invoices:{mode:'fictional-folder',async find(month,loader){return loader(month)}},
    automation:{mode:'fictional-pdf-reports',reportsFor:month=>window.zelunavoMonthPackages?.[month]?.reports?.length?[...window.zelunavoMonthPackages[month].reports]:[...(window.demoAutomatenberichte||[]).filter(report=>report.month===month)]},
    timesheets:{mode:'fictional-pdf',pathFor:month=>`fiktive-testdaten/Stundennachweis_Zelunavo_${months[month]?.label.split(' ')[0]}_2026_FIKTIV.pdf`},
    archive:{mode:'browser-archive',async saveMonthlyPackage(month,entries){if(!window.demoArchive)throw Error('Die Browser-Demoablage ist nicht verfügbar.');return window.demoArchive.save(month,entries)}}
  };
})();
