(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const localMode=!!document.querySelector('meta[name="local-token"]')&&document.querySelector('meta[name="zelunavo-data-mode"]')?.content==='work';
  const months=['2026-05','2026-06','2026-07','2026-08','2026-09'];
  const names=months.map(m=>new Intl.DateTimeFormat('de-DE',{month:'long',timeZone:'UTC'}).format(new Date(`${m}-01T12:00:00Z`)));
  const currency=c=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(c/100);
  const amount=c=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(c/100);
  const monthLabel=m=>new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${m}-01T12:00:00Z`));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const xml=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const sum=a=>a.reduce((n,r)=>n+Number(r.cents||0),0);
  let selected=months.at(-1);
  const key=m=>(localMode?'zelunavo-local-cashbook-v1-':'zelunavo-cashbook-v4-')+m;
  const demoBooks=new Map();
  if(!localMode){try{for(let i=localStorage.length-1;i>=0;i--){const storedKey=localStorage.key(i);if(storedKey?.startsWith('zelunavo-cashbook-v4-')||storedKey?.startsWith('zelunavo-cashbook-v3-'))localStorage.removeItem(storedKey)}}catch{}}
  function raw(m){
    if(!months.includes(m))return null;
    const example=window.demoCashbook[m];
    let saved;try{saved=localMode?JSON.parse(localStorage.getItem(key(m))):demoBooks.get(m)}catch{}
    if(saved&&Array.isArray(saved.income)&&Array.isArray(saved.change)&&Array.isArray(saved.deposits)){
      return saved;
    }
    if(localMode)return {opening:0,income:[],deposits:[],change:[],reportsRead:false,statementLoaded:false};
    return {opening:0,
      income:example.income.map(row=>({name:row.name,cents:null})),
      deposits:[],
      change:Array.from({length:2},()=>({date:'',name:'',cents:null})),
      reportsRead:false,statementLoaded:false};
  }
  function book(m){const b=raw(m);if(!b)return null;const i=months.indexOf(m);if(i){const p=book(months[i-1]);b.opening=p.opening+sum(p.income)-sum(p.deposits)-sum(p.change)}return b}
  function store(m,b){if(localMode)localStorage.setItem(key(m),JSON.stringify(b));else demoBooks.set(m,structuredClone(b))}
  function save(b){store(selected,b);render();window.dispatchEvent(new Event('zelunavo:cashbook-changed'))}
  function input(kind,i,field,value,label,number=false){return `<input data-kind="${kind}" data-i="${i}" data-field="${field}" aria-label="${label}" inputmode="${number?'decimal':'text'}" value="${esc(value)}">`}
  const sourceControls=document.createElement('div');sourceControls.innerHTML='<p id="automata-source-status" class="hidden" aria-live="polite"></p>'; $('cashbook-editor').before(sourceControls);
  const saveButton=document.createElement('button');saveButton.type='button';saveButton.textContent='Änderungen speichern';saveButton.style.marginTop='14px';$('cashbook-editor').after(saveButton);
  const parse=s=>{const value=String(s).trim();const n=Number(value.includes(',')?value.replace(/\./g,'').replace(',','.'):value);return Number.isFinite(n)&&n>=0?Math.round(n*100):null};
  function render(){
    const b=book(selected),inc=sum(b.income),dep=sum(b.deposits),change=sum(b.change);
    const incomeRows=b.income.map((r,i)=>`<tr><td>${input('income',i,'name',r.name,`Automat ${i+1}`)}</td><td>${input('income',i,'cents',r.cents==null?'':amount(r.cents),`Barumsatz ${i+1}`,true)}</td></tr>`).join('')+(localMode&&b.income.length===0?'<tr><td colspan="2">Noch keine Barumsätze für diesen Monat übernommen.</td></tr>':'');
    const depositRows=b.deposits.map(r=>`<tr><td>${esc(r.date)}</td><td>Kasse an Bank</td><td>${currency(r.cents)}</td></tr>`).join('');
    const changeRows=b.change.map((r,i)=>`<tr><td>${input('change',i,'date',r.date,`Datum Wechselgeld ${i+1}`)}</td><td>${input('change',i,'name',r.name,`Automat Wechselgeld ${i+1}`)}</td><td>${input('change',i,'cents',r.cents==null?'':amount(r.cents),`Wechselgeld ${i+1}`,true)}</td><td><button type="button" class="small-action" data-remove="change" data-i="${i}" aria-label="Wechselgeld ${i+1} löschen">×</button></td></tr>`).join('');
    const blankRows=(count,columns,fields)=>Array.from({length:count},()=>'<tr aria-hidden="true">'+Array.from({length:columns},(_,i)=>i<fields?'<td><input value="" disabled tabindex="-1" aria-hidden="true"></td>':'<td>&nbsp;</td>').join('')+'</tr>').join('');
    const reference=window.demoCashbook[selected]||{income:Array(6),deposits:Array(4),change:Array(2)};
    const displayIncome=localMode&&!b.income.length?blankRows(reference.income.length,2,2):incomeRows;
    const displayDeposits=localMode&&!b.deposits.length?blankRows(reference.deposits.length,3,0):depositRows;
    const displayChange=localMode&&!b.change.length?blankRows(reference.change.length,4,3):changeRows;
    const noDepositMessage=b.statementLoaded?'Im ausgewählten Kontoauszug ist keine Bargeldeinzahlung enthalten.':'Nach Auswahl des Kontoauszugs werden die Bargeldeinzahlungen hier angezeigt.';
    $('cashbook-editor').innerHTML=`<div class="cashbook-summary"><div><span>Anfangsbestand</span><strong>${currency(b.opening)}</strong></div><div><span>Barumsatz</span><strong>${currency(inc)}</strong></div><div><span>Bargeld ausgegeben</span><strong>${currency(dep+change)}</strong></div><div><span>Kassenbestand</span><strong>${currency(b.opening+inc-dep-change)}</strong></div></div>${selected==='2026-06'?'<p class="cashbook-note">Anfangsbestand Juni: '+input('opening',0,'opening',amount(b.opening),'Anfangsbestand Juni in Euro',true)+' €</p>':''}<div class="cashbook-group cashbook-income"><h3>Barumsatz der Automaten</h3><div class="table-wrap"><table><thead><tr><th>Automat</th><th>Barumsatz</th></tr></thead><tbody>${displayIncome}</tbody><tfoot><tr><th>Summe Barumsatz</th><th>${currency(inc)}</th></tr></tfoot></table></div></div><div class="cashbook-group cashbook-deposits"><h3>Bargeldeinzahlungen auf das Bankkonto</h3><div class="table-wrap"><table><thead><tr><th>Datum</th><th>Belegtext</th><th>Betrag</th></tr></thead><tbody>${displayDeposits||`<tr><td colspan="3">${noDepositMessage}</td></tr>`}</tbody><tfoot><tr><th colspan="2">Summe Bankeinzahlungen</th><th>${currency(dep)}</th></tr></tfoot></table></div></div><div class="cashbook-group cashbook-change"><h3>Wechselgeld zurück in Automaten</h3><div class="table-wrap"><table><thead><tr><th>Datum</th><th>Automat / Belegtext</th><th>Betrag</th><th></th></tr></thead><tbody>${displayChange}</tbody><tfoot><tr><th colspan="2">Summe Wechselgeld</th><th>${currency(change)}</th><th></th></tr></tfoot></table></div></div>`;
    const balance=b.opening+inc-dep-change;
    $('cashbook-status').classList.add('result');
    $('cashbook-status').classList.toggle('ok',balance===0);
    $('cashbook-status').textContent=balance===0?'Kassenbuch ausgeglichen: Kassenbestand 0,00 €.':`Noch nicht ausgeglichen: Kassenbestand ${currency(balance)}. Prüfe Barumsatz, Bankeinzahlungen und Wechselgeld.`;
    $('cashbook-status').classList.add('hidden');
  }
  function collect(){const b=raw(selected),before=JSON.stringify(b.income);for(const el of $('cashbook-editor').querySelectorAll('[data-kind]')){const field=el.dataset.field;if(field==='cents'||field==='opening'){const n=parse(el.value);if(n===null){$('cashbook-status').textContent='Bitte alle Beträge prüfen.';$('cashbook-status').classList.remove('hidden');return false}if(field==='opening')b.opening=n;else b[el.dataset.kind][+el.dataset.i].cents=n}else b[el.dataset.kind][+el.dataset.i][field]=el.value.trim()}if(JSON.stringify(b.income)!==before)b.incomeSource='manual';save(b);return true}
  const localToken=document.querySelector('meta[name="local-token"]')?.content;
  const dataMode=document.querySelector('meta[name="zelunavo-data-mode"]')?.content||'demo';
  const annualButton=$('demo-cashbook-open');
  async function checkAnnualWorkbook(){
    if(!localToken||!annualButton)return;
    const year=selected.slice(0,4);
    try{const response=await fetch(`/api/kassenbuch-status?mode=${encodeURIComponent(dataMode)}&year=${year}`,{headers:{'X-Local-Token':localToken}});if(response.ok){const result=await response.json();annualButton.hidden=!(result.exists&&result.months?.includes(selected))}}
    catch{}
  }
  saveButton.onclick=async()=>{
    if(!collect())return;
    if(!localToken)return;
    saveButton.disabled=true;saveButton.textContent='Speichert …';
    try{
      const b=book(selected);
      const response=await fetch('/api/kassenbuch-speichern',{method:'POST',headers:{'Content-Type':'application/json','X-Local-Token':localToken},body:JSON.stringify({data_mode:dataMode,month:selected,opening:b.opening,income:b.income,deposits:b.deposits,change:b.change})});
      const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||result.message||'Kassenbuch konnte nicht gespeichert werden.');
      annualButton.hidden=false;saveButton.textContent='Gespeichert ✓';window.dispatchEvent(new CustomEvent('zelunavo:cashbook-saved',{detail:{month:selected,name:result.name}}));
      setTimeout(()=>{saveButton.textContent='Änderungen speichern'},1800);
    }catch(error){const status=$('cashbook-status');status.textContent=`Kassenbuch konnte nicht lokal gespeichert werden: ${error.message}`;status.classList.remove('hidden');saveButton.textContent='Änderungen speichern'}
    finally{saveButton.disabled=false}
  };
  annualButton?.addEventListener('click',async()=>{
    if(!localToken)return;annualButton.disabled=true;
    try{const response=await fetch('/api/kassenbuch-oeffnen',{method:'POST',headers:{'Content-Type':'application/json','X-Local-Token':localToken},body:JSON.stringify({data_mode:dataMode,year:Number(selected.slice(0,4))})});const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||result.message||'Kassenbuch konnte nicht geöffnet werden.')}
    catch(error){const status=$('cashbook-status');status.textContent=error.message;status.classList.remove('hidden')}
    finally{annualButton.disabled=false}
  });
  checkAnnualWorkbook();
  $('cashbook-editor').addEventListener('click',e=>{const button=e.target.closest('[data-remove]');if(!button)return;const b=raw(selected);b[button.dataset.remove].splice(+button.dataset.i,1);if(button.dataset.remove==='income')b.incomeSource='manual';save(b)});
  const cashbookAddIncome=$('cashbook-add-income');if(cashbookAddIncome)cashbookAddIncome.onclick=()=>{const b=raw(selected);b.income.push({name:'Neuer Automat',cents:0});b.incomeSource='manual';save(b)};
  $('cashbook-add-expense').textContent='+ Wechselgeld';
  $('cashbook-add-expense').onclick=()=>{const b=raw(selected);b.change.push({date:'',name:'Automat',cents:0});save(b)};
  window.getCashbook=book;
  window.cashbookSelectMonth=m=>{if(!months.includes(m))return false;if(selected!==m){selected=m;render();checkAnnualWorkbook()}return true};
  window.cashbookEnsureLocalMonth=(m,activate=false)=>{if(!localMode||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(m))return false;let changed=false;if(!months.includes(m)){months.push(m);months.sort();changed=true;}if(activate&&selected!==m){selected=m;changed=true;}if(changed)render();return true;};
  window.cashbookMonths=()=>[...months];
  window.cashbookAddMonth=(month,incomeRows)=>{
    if(months.includes(month)||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))return false;
    const last=months.at(-1),nextDate=new Date(`${last}-01T12:00:00Z`);nextDate.setUTCMonth(nextDate.getUTCMonth()+1);
    const next=`${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth()+1).padStart(2,'0')}`;if(month!==next)return false;
    const previous=book(last),opening=previous.opening+sum(previous.income)-sum(previous.deposits)-sum(previous.change);
    months.push(month);names.push(new Intl.DateTimeFormat('de-DE',{month:'long',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`)));
    window.demoCashbook[month]={opening,income:structuredClone(incomeRows),deposits:[],change:[],reportsRead:false};
    store(month,window.demoCashbook[month]);selected=month;render();return true;
  };
  window.cashbookReportsReady=m=>{const b=raw(m);return !!b?.reportsRead&&(localMode||b.income.length===6)};
  window.setCashbookIncome=(m,rows,force=false)=>{if(!months.includes(m))return false;const b=raw(m);if(b.incomeSource==='manual'&&!force)return false;b.income=rows.map(r=>({name:r.name,cents:r.cents,coinsCents:r.coinsCents,billsCents:r.billsCents,sourcePath:r.sourcePath}));b.incomeSource='reports';b.reportsRead=true;store(m,b);if(m===selected)render();window.dispatchEvent(new Event('zelunavo:cashbook-changed'));return true};
  window.cashbookBalanceCents=b=>(Number(b?.opening)||0)+sum(b?.income||[])-sum(b?.deposits||[])-sum(b?.change||[]);
  window.cashbookIsBalanced=b=>!!b&&window.cashbookBalanceCents(b)===0;
  window.cashbookUnbalancedMonth=m=>{for(const month of months.slice(0,months.indexOf(m)+1)){if(!window.cashbookIsBalanced(book(month)))return month}return null};
  window.setCashbookDeposits=(m,rows)=>{if(!months.includes(m))return;const b=raw(m);b.deposits=rows.map(r=>({date:r.date,name:'Kasse an Bank',cents:r.cents}));b.depositSource='uploaded';b.statementLoaded=true;store(m,b);if(m===selected)render();window.dispatchEvent(new Event('zelunavo:cashbook-changed'))};
  window.setCashbookChange=(m,rows)=>{if(!months.includes(m))return;const b=raw(m);b.change=rows.map(r=>({date:r.date||'',name:r.name||'',cents:r.cents==null?null:r.cents}));store(m,b);if(m===selected)render();window.dispatchEvent(new Event('zelunavo:cashbook-changed'))};
  function view(){document.body.classList.toggle('cashbook-view',location.hash==='#cashbook-title')}
  addEventListener('hashchange',view);view();
  const cell=(col,row,v,formula=false)=>formula?`<c r="${col}${row}" s="1"><f>${v}</f></c>`:typeof v==='number'?`<c r="${col}${row}" s="1"><v>${v}</v></c>`:`<c r="${col}${row}" t="inlineStr"><is><t>${xml(v)}</t></is></c>`;
  function sheet(m,i){const b=book(m),n=Math.max(b.income.length,b.deposits.length+b.change.length),rows=[];const row=(r,cells)=>rows.push(`<row r="${r}">${cells.join('')}</row>`);row(1,[cell('A',1,`Kassenbuch ${monthLabel(m)} · FIKTIV`)]);const p=i?book(months[i-1]):null,pEnd=p?Math.max(p.income.length,p.deposits.length+p.change.length)+5:0;row(2,[cell('A',2,'Anfangsbestand'),i?cell('B',2,`'${monthLabel(months[i-1])}'!B${pEnd}`,true):cell('B',2,b.opening/100)]);row(3,['A','B','C','D','E'].map((c,j)=>cell(c,3,['Automat · Barumsatz','Betrag EUR','Datum','Bargeldbewegung','Betrag EUR'][j])));const outputs=[...b.deposits.map(r=>({...r,name:'Kasse an Bank'})),...b.change.map(r=>({...r,name:'Wechselgeld: '+r.name}))];for(let j=0;j<n;j++)row(j+4,[cell('A',j+4,b.income[j]?.name||''),cell('B',j+4,b.income[j]?b.income[j].cents/100:''),cell('C',j+4,outputs[j]?.date||''),cell('D',j+4,outputs[j]?.name||''),cell('E',j+4,outputs[j]?outputs[j].cents/100:'')]);const t=n+4;row(t,[cell('A',t,'Summe Barumsatz'),cell('B',t,`SUM(B4:B${t-1})`,true),cell('D',t,'Summe Ausgaben'),cell('E',t,`SUM(E4:E${t-1})`,true)]);row(t+1,[cell('A',t+1,'Kassenbestand'),cell('B',t+1,`ROUND(B2+B${t}-E${t},2)`,true)]);return `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="2" width="18" customWidth="1"/><col min="3" max="3" width="19" customWidth="1"/><col min="4" max="4" width="38" customWidth="1"/><col min="5" max="5" width="18" customWidth="1"/></cols><sheetData>${rows.join('')}</sheetData></worksheet>`}
  const cashbookDownloadButton=$('cashbook-download');if(cashbookDownloadButton)cashbookDownloadButton.onclick=async()=>{if(!collect())return;const z=new JSZip();z.file('[Content_Types].xml',`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${months.map((_,j)=>`<Override PartName="/xl/worksheets/sheet${j+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);z.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');z.file('xl/workbook.xml',`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${months.map((m,j)=>`<sheet name="${new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${m}-01T12:00:00Z`))}" sheetId="${j+1}" r:id="r${j+1}"/>`).join('')}</sheets><calcPr fullCalcOnLoad="1"/></workbook>`);z.file('xl/_rels/workbook.xml.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${months.map((_,j)=>`<Relationship Id="r${j+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${j+1}.xml"/>`).join('')}<Relationship Id="r${months.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);z.file('xl/styles.xml','<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00 &quot;€&quot;"/></numFmts><fonts count="1"><font><sz val="11"/><name val="Aptos"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" xfId="0"/><xf numFmtId="164" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>');months.forEach((m,j)=>z.file(`xl/worksheets/sheet${j+1}.xml`,sheet(m,j)));const blob=await z.generateAsync({type:'blob',compression:'DEFLATE'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Zelunavo-Kassenbuch-${months[0]}-bis-${months.at(-1)}-FIKTIV.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)};
  render();
})();
