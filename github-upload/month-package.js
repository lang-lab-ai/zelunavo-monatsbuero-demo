(() => {
  'use strict';
  const monthInput=document.getElementById('month-package');
  if(!monthInput)return;
  const packages=window.zelunavoMonthPackages=window.zelunavoMonthPackages||{};
  const monthName=month=>new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
  function safePath(value){return typeof value==='string'&&value.length<240&&!value.startsWith('/')&&!/[\\\x00-\x1f]/.test(value)&&!value.split('/').some(part=>part==='..'||part==='')}
  function checkedEntry(zip,path,label,maxBytes){
    if(!safePath(path))throw Error(`${label}: ungültiger Dateipfad.`);
    const entry=zip.file(path);
    if(!entry||entry.dir||!Number.isSafeInteger(entry._data?.uncompressedSize)||entry._data.uncompressedSize>maxBytes)throw Error(`${label}: Datei fehlt oder ist zu groß.`);
    return entry;
  }
  async function getPdf(zip,path,label){
    if(!safePath(path)||!path.toLowerCase().endsWith('.pdf'))throw Error(`${label}: im manifest.json fehlt ein sicherer PDF-Dateipfad.`);
    const bytes=await checkedEntry(zip,path,label,15_000_000).async('uint8array');
    if(bytes.length>15_000_000||new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw Error(`${label}: keine gültige PDF-Datei.`);
    return new File([bytes],path.split('/').at(-1),{type:'application/pdf'});
  }
  monthInput.addEventListener('change',async event=>{
    const zipFile=event.target.files?.[0];if(!zipFile)return;
    const preloadOnly=window.zelunavoMonthPackagePreloadOnly===true;
    window.zelunavoMonthPackagePreloadOnly=false;
    const status=document.getElementById('month-package-status');
    const say=text=>{if(status)status.textContent=text};
    say('Monats-ZIP wird geprüft …');
    let packageError='';
    try{
      if(zipFile.size>20_000_000)throw Error('Das Monats-ZIP ist zu groß.');
      const zip=await JSZip.loadAsync(await zipFile.arrayBuffer());
      const entries=Object.values(zip.files).filter(entry=>!entry.dir);
      if(entries.length>100||entries.some(entry=>!safePath(entry.name)||!Number.isSafeInteger(entry._data?.uncompressedSize)||entry._data.uncompressedSize>15_000_000)||entries.reduce((sum,entry)=>sum+entry._data.uncompressedSize,0)>80_000_000)throw Error('Das Monats-ZIP enthält zu viele oder zu große Dateien.');
      const manifestFile=zip.file('manifest.json');if(!manifestFile)throw Error('Im ZIP fehlt manifest.json.');
      if(manifestFile._data?.uncompressedSize>100_000)throw Error('manifest.json ist zu groß.');
      const manifest=JSON.parse(await manifestFile.async('text'));
      const month=String(manifest.month||'');
      if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))throw Error('Monat muss im Format JJJJ-MM angegeben sein.');
      const next=window.zelunavoDemoSources?.months?.at(-1);
      const expected=new Date(`${next}-01T12:00:00Z`);expected.setUTCMonth(expected.getUTCMonth()+1);
      if(next&&month!==`${expected.getUTCFullYear()}-${String(expected.getUTCMonth()+1).padStart(2,'0')}`&&month!=='2026-05')throw Error(`Bitte den direkt folgenden Monat nach ${monthName(next)} hinzufügen.`);
      if(packages[month])throw Error(`${monthName(month)} wurde in dieser Sitzung bereits geladen.`);
      if(!Array.isArray(manifest.invoices)||manifest.invoices.length<1||manifest.invoices.length>60)throw Error('Das Paket braucht 1 bis 60 Rechnungs-PDFs.');
      if(!Array.isArray(manifest.automationReports)||manifest.automationReports.length!==6)throw Error('Das Paket muss genau sechs Automatenberichte enthalten.');
      if(typeof manifest.salesReport!=='string')throw Error('Im manifest.json fehlt die fiktive Verkaufsbericht-PDF unter „salesReport“.');
      if(typeof manifest.timesheet!=='string')throw Error('Im manifest.json fehlt der fiktive Stundenzettel.');
      if(typeof manifest.mhdScreenshot!=='string'||!manifest.mhdScreenshot.toLowerCase().endsWith('.png'))throw Error('Im manifest.json fehlt der fiktive MHD-Screenshot.');
      const machines=new Set(manifest.automationReports.map(row=>String(row.machine||'').trim().toLocaleLowerCase('de-DE')));
      if(machines.size!==6||[...machines].some(name=>!name))throw Error('Jeder Automatenbericht braucht einen eindeutigen Automaten-Namen.');
      const mhd=manifest.mhd||{};
      const validation=window.zelunavoDemoSources.validateMhd(month,mhd.recorded,mhd.rows);
      if(!validation.valid)throw Error(`MHD-Daten ungültig: ${validation.errors.join(' ')}`);
      const statement=await getPdf(zip,manifest.statement,'Kontoauszug');
      const salesReport=await getPdf(zip,manifest.salesReport,'Verkaufsbericht');
      const timesheet=await getPdf(zip,manifest.timesheet,'Stundenzettel');
      const shotBytes=await checkedEntry(zip,manifest.mhdScreenshot,'MHD-Screenshot',8_000_000).async('uint8array');
      if(shotBytes.length>8_000_000||![137,80,78,71,13,10,26,10].every((value,index)=>shotBytes[index]===value))throw Error('Der MHD-Screenshot ist keine gültige PNG-Datei.');
      const mhdScreenshot=new File([shotBytes],manifest.mhdScreenshot.split('/').at(-1),{type:'image/png'});
      await window.zelunavoDemoSources.salesReport.load(month,null,salesReport);
      const invoiceFiles=await Promise.all(manifest.invoices.map(path=>getPdf(zip,path,'Rechnung')));
      const reports=await Promise.all(manifest.automationReports.map(async row=>({month,machine:String(row.machine).trim(),path:row.file,file:await getPdf(zip,row.file,`Bericht ${row.machine}`)})));
      const pkg={month,statement,salesReport,timesheet,mhdScreenshot,invoices:invoiceFiles,reports,mhd:structuredClone(mhd),name:zipFile.name,manifest,knownNoReceipt:Array.isArray(manifest.knownNoReceipt)?manifest.knownNoReceipt:[],manualUploadOnly:Array.isArray(manifest.manualUploadOnly)?manifest.manualUploadOnly:[]};
      window.zelunavoDemoSources.registerMonth(month,pkg.mhd);
      if(window.cashbookMonths?.().includes(month)){window.cashbookSelectMonth?.(month)}else if(!window.cashbookAddMonth?.(month,reports.map(report=>({name:report.machine,cents:0,sourcePath:report.path}))))throw Error('Das Kassenbuch konnte den neuen Monat nicht ergänzen.');
      packages[month]=pkg;
      const select=document.getElementById('month');let option=[...select.options].find(item=>item.value===month);if(!option){option=document.createElement('option');option.value=month;select.append(option)}option.textContent=monthName(month);select.value=month;select.dispatchEvent(new Event('change',{bubbles:true}));
      if(!preloadOnly){const transfer=new DataTransfer();transfer.items.add(statement);const input=document.getElementById('statement');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
      const shotTransfer=new DataTransfer();shotTransfer.items.add(mhdScreenshot);const shotInput=document.getElementById('demo-shot');shotInput.files=shotTransfer.files;shotInput.dispatchEvent(new Event('change',{bubbles:true}));}
      if(month==='2026-10')window.setCashbookChange?.(month,[{date:'',name:'',cents:null}]);
      else if(Array.isArray(manifest.cashbook?.change)){window.setCashbookChange?.(month,manifest.cashbook.change);}
      window.dispatchEvent(new CustomEvent('zelunavo:month-package-loaded',{detail:{month,statement:statement.name,salesReport:salesReport.name,invoices:invoiceFiles.length,reports:reports.length}}));
      say(`${monthName(month)} geladen: Kontoauszug, Verkaufsbericht-PDF, ${invoiceFiles.length} Rechnungen, 6 Automatenberichte und ${mhd.rows.length} MHD-Zeilen.`);
    }catch(error){packageError=error.message;say(`Monats-ZIP konnte nicht geladen werden: ${error.message}`)}
    finally{event.target.value='';window.dispatchEvent(new CustomEvent('zelunavo:month-package-ready',{detail:{ok:!packageError,error:packageError,month:'2026-10'}}))}
  });
})();
