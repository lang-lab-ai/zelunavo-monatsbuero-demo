(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const localMode=!!document.querySelector('meta[name="local-token"]')&&document.querySelector('meta[name="zelunavo-data-mode"]')?.content==='work';
  const demoTimesheets=new Map();
  const key=month=>`zelunavo-own-timesheet-${month}`;
  const blank=()=>({date:'',start:'',pause:'00:00',end:'',note:''});
  const initial=()=>({person:'',number:'',area:'',rows:[],done:false});
  const month=()=>$('month').value||'2026-09';
  if(!localMode){try{for(let i=localStorage.length-1;i>=0;i--){const storedKey=localStorage.key(i);if(storedKey?.startsWith('zelunavo-own-timesheet-'))localStorage.removeItem(storedKey)}}catch{}}
  function load(m){try{const value=localMode?JSON.parse(localStorage.getItem(key(m))):demoTimesheets.get(m);if(value&&Array.isArray(value.rows))return value}catch{}return initial()}
  function store(m,value){if(localMode)localStorage.setItem(key(m),JSON.stringify(value));else demoTimesheets.set(m,structuredClone(value))}
  let current=month(),data=load(current);
  const minutes=t=>{const match=String(t??'').match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);if(!match)return null;const h=Number(match[1]),m=Number(match[2]),s=Number(match[3]||0);return h<24&&m<60&&s<60?h*60+m:null};
  const duration=row=>{const start=minutes(row.start),end=minutes(row.end),pause=minutes(row.pause);return start===null||end===null||pause===null||end<=start+pause?null:end-start-pause};
  const clock=value=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
  const label=m=>new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${m}-01T12:00:00Z`));
  function validate(m,value){
    if(!value.person?.trim())throw Error('Bitte einen Namen eintragen. Für die öffentliche Demo nur einen erfundenen Namen verwenden.');
    if(!value.rows.length)throw Error('Bitte mindestens einen Arbeitstag eintragen.');
    for(const [i,row] of value.rows.entries()){
      if(!row.date||!row.start||!row.end||!row.pause)throw Error(`Arbeitstag ${i+1}: Datum, Beginn, Pause und Ende vollständig eintragen.`);
      if(!row.date.startsWith(m+'-'))throw Error(`Arbeitstag ${i+1}: Das Datum muss im gewählten Monat liegen.`);
      if(duration(row)===null)throw Error(`Arbeitstag ${i+1}: Ende muss nach Beginn und Pause liegen.`);
    }
    return value.rows.reduce((n,row)=>n+duration(row),0);
  }
  function status(){
    const node=$('timesheet-status');node.classList.add('result');node.classList.toggle('ok',!!data.done);
    if(data.done){const total=data.rows.reduce((n,row)=>n+(duration(row)||0),0);node.textContent=`Fertig: ${data.rows.length} Arbeitstag(e), insgesamt ${clock(total)} Stunden. Der Stundenzettel wird nach dem anderen Mitarbeiter-Stundenzettel in die Abschluss-PDF eingefügt.`}
    else node.textContent=data.rows.length?'Zeiten erfasst. Klicke auf „Fertig“, damit dieser Stundenzettel zur Abschluss-PDF gehört.':'Noch keine eigenen Arbeitszeiten eingetragen.';
  }
  function render(){
    $('timesheet-editor').innerHTML=`<p><strong>Monat:</strong> ${esc(label(current))}</p><div class="timesheet-meta"><label>Name <input data-meta="person" value="${esc(data.person)}"></label><label>Personalnummer <input data-meta="number" value="${esc(data.number)}"></label><label>Arbeitsbereich <input data-meta="area" value="${esc(data.area)}"></label></div><div class="table-wrap"><table class="timesheet-table"><thead><tr><th>Datum</th><th>Beginn</th><th>Pause</th><th>Ende</th><th>Dauer</th><th>Bemerkung</th><th></th></tr></thead><tbody>${data.rows.length?data.rows.map((r,i)=>`<tr data-index="${i}"><td><input data-field="date" aria-label="Datum Arbeitstag ${i+1}" type="date" value="${esc(r.date)}"></td><td><input data-field="start" aria-label="Beginn Arbeitstag ${i+1}" type="time" value="${esc(r.start)}"></td><td><input data-field="pause" aria-label="Pause Arbeitstag ${i+1}" type="time" value="${esc(r.pause)}"></td><td><input data-field="end" aria-label="Ende Arbeitstag ${i+1}" type="time" value="${esc(r.end)}"></td><td data-duration>${duration(r)===null?'–':clock(duration(r))}</td><td><input data-field="note" aria-label="Bemerkung Arbeitstag ${i+1}" value="${esc(r.note)}"></td><td><button type="button" class="small-action" data-remove="${i}" aria-label="Arbeitstag ${i+1} löschen">×</button></td></tr>`).join(''):'<tr><td colspan="7">Noch keine Arbeitstage. Füge unten einen Tag hinzu.</td></tr>'}</tbody></table></div>`;
    status();
  }
  function capture(){
    for(const el of $('timesheet-editor').querySelectorAll('[data-meta]'))data[el.dataset.meta]=el.value.trim();
    for(const tr of $('timesheet-editor').querySelectorAll('tr[data-index]')){
      const row=data.rows[Number(tr.dataset.index)];
      for(const el of tr.querySelectorAll('[data-field]'))row[el.dataset.field]=el.value;
      tr.querySelector('[data-duration]').textContent=duration(row)===null?'–':clock(duration(row));
    }
    data.done=false;store(current,data);status();window.dispatchEvent(new Event('zelunavo:timesheet-changed'));
  }
  const captureAndRefreshDuration=event=>{capture();if(event.target.matches('input[type="time"]'))requestAnimationFrame(capture)};
  $('timesheet-editor').addEventListener('input',captureAndRefreshDuration);
  $('timesheet-editor').addEventListener('change',captureAndRefreshDuration);
  $('timesheet-editor').addEventListener('blur',captureAndRefreshDuration,true);
  $('timesheet-editor').addEventListener('click',event=>{const button=event.target.closest('[data-remove]');if(!button)return;capture();data.rows.splice(Number(button.dataset.remove),1);store(current,data);render();window.dispatchEvent(new Event('zelunavo:timesheet-changed'))});
  $('timesheet-add').onclick=()=>{capture();data.rows.push(blank());store(current,data);render()};
  $('timesheet-save').onclick=()=>{capture();try{validate(current,data);data.done=true;store(current,data);status();window.dispatchEvent(new Event('zelunavo:timesheet-changed'))}catch(error){$('timesheet-status').textContent=error.message}};
  $('month').addEventListener('change',()=>{capture();current=month();data=load(current);render()});
  const pdfText=s=>String(s??'').replace(/[^\x20-\xFF]/g,'?');
  async function pdf(m,value){
    const total=validate(m,value),doc=await PDFLib.PDFDocument.create();
    const font=await doc.embedFont(PDFLib.StandardFonts.Helvetica),bold=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const ink=PDFLib.rgb(.20,.17,.16),red=PDFLib.rgb(.612,.20,.18),muted=PDFLib.rgb(.46,.42,.41);
    const widths=[65,80,75,80,80,131],headers=['Datum','Beginn','Pause','Ende','Dauer','Bemerkung'];
    const chunks=[];for(let i=0;i<value.rows.length;i+=15)chunks.push(value.rows.slice(i,i+15));
    chunks.forEach((rows,pageIndex)=>{
      const page=doc.addPage(PDFLib.PageSizes.A4),h=page.getHeight(),left=42,top=h-190;
      page.drawRectangle({x:0,y:h-90,width:page.getWidth(),height:90,color:red});
      page.drawText('STUNDENNACHWEIS',{x:42,y:h-46,size:19,font:bold,color:PDFLib.rgb(1,1,1)});
      page.drawText('FIKTIVES MUSTER - KEINE ECHTEN MITARBEITERDATEN',{x:42,y:h-68,size:10,font,color:PDFLib.rgb(1,1,1)});
      page.drawText(`Firma: Zelunavo Demo`,{x:42,y:h-120,size:11,font,color:ink});
      page.drawText(`Mitarbeitende Person: ${pdfText(value.person).slice(0,30)}`,{x:42,y:h-139,size:11,font,color:ink});
      page.drawText(`Personalnummer: ${pdfText(value.number||'DEMO')}`.slice(0,45),{x:42,y:h-158,size:11,font,color:ink});
      page.drawText(`Monat: ${label(m)}`,{x:330,y:h-120,size:11,font,color:ink});
      page.drawText(`Arbeitsbereich: ${pdfText(value.area||'Service').slice(0,22)}`,{x:330,y:h-139,size:11,font,color:ink});
      page.drawRectangle({x:left,y:top-24,width:511,height:24,color:PDFLib.rgb(.95,.90,.89)});
      let x=left;headers.forEach((name,i)=>{page.drawText(name,{x:x+7,y:top-16,size:9,font:bold,color:ink});x+=widths[i]});
      rows.forEach((r,i)=>{const y=top-24-(i+1)*27;if(i%2===0)page.drawRectangle({x:left,y,width:511,height:27,color:PDFLib.rgb(.98,.97,.96)});const day=r.date.split('-').reverse().join('.');const values=[day,r.start,r.pause,r.end,clock(duration(r)),pdfText(r.note).slice(0,23)];let px=left;values.forEach((v,j)=>{page.drawText(v,{x:px+7,y:y+9,size:9,font,color:ink});px+=widths[j]})});
      for(let i=0;i<=rows.length;i++){const y=top-24-i*27;page.drawLine({start:{x:left,y},end:{x:left+511,y},thickness:.5,color:PDFLib.rgb(.91,.87,.86)})}
      if(pageIndex===chunks.length-1){const y=top-24-rows.length*27-36;page.drawText(`Gesamtdauer: ${clock(total)} Stunden`,{x:left,y,size:11,font:bold,color:ink});page.drawText('Alle Zeitangaben wurden manuell für diese fiktive Demo eingetragen.',{x:left,y:y-24,size:9,font,color:ink})}
      page.drawText(`Zelunavo Demo | Fiktiver Stundennachweis | Seite ${pageIndex+1} von ${chunks.length}`,{x:42,y:32,size:9,font,color:muted});
    });
    return doc.save();
  }
  window.getOwnTimesheetPdf=async m=>{const value=load(m);return value.done&&value.rows.length?pdf(m,value):null};
  window.ownTimesheetReady=m=>{const value=load(m);return value.rows.length&&!value.done?false:true};
  window.ownTimesheetCount=m=>{const value=load(m);return value.done?value.rows.length:0};
  window.ownTimesheetPerson=m=>{const value=load(m);return value.done?value.person.trim():null};
  $('timesheet-download').onclick=async()=>{try{const saved=load(current);if(!saved.done)throw Error('Bitte den Stundenzettel zuerst mit „Fertig“ bestätigen.');const bytes=await pdf(current,saved),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=`Zelunavo-Stundennachweis-${current}-FIKTIV.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(error){$('timesheet-status').textContent=error.message}};
  document.addEventListener('DOMContentLoaded',()=>{current=month();data=load(current);render()});
})();
