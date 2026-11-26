(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  function updateMonthLinks(){
    const month=$('month')?.value;if(!month)return;
    const name=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
    const monthSection=$('month-title')?.closest('section'),statementLink=monthSection?.querySelector('a[download]');
    if(statementLink){const packageLoaded=!!window.zelunavoMonthPackages?.[month];statementLink.closest('p').hidden=packageLoaded;if(!packageLoaded){statementLink.href=`fiktive-testdaten/Zelunavo_Kontoauszug_${name.split(' ')[0]}_${month.slice(0,4)}_FIKTIV.pdf`;statementLink.textContent=`Fiktiven ${name}-Kontoauszug herunterladen`}}
    const mhdLink=$('demo-shot-download');if(mhdLink)mhdLink.textContent=`Fiktiven ${name}-WhatsApp-Screenshot herunterladen`;
  }
  const steps = new Map([...document.querySelectorAll('[data-step]')].map(node => [node.dataset.step, node]));
  if(!steps.has('salesreport')){
    const node=document.createElement('div');node.className='agent-step';node.dataset.step='salesreport';node.dataset.state='waiting';
    node.innerHTML='<span class="state">○</span><div><strong>Verkaufsbericht als PDF übernehmen</strong><small>Wartet auf den fiktiven Vendon-Export.</small></div>';
    steps.get('mhd')?.after(node);steps.set('salesreport',node);
  }
  let started = false;
  const outcomePanel=document.createElement('div');outcomePanel.className='outcome-panel';
  outcomePanel.innerHTML='<h3>Ergebnisverteilung</h3><div class="outcome-bar" role="img" aria-label="Verteilung der Buchungsprüfung"><span id="outcome-auto"></span><span id="outcome-reviewed"></span><span id="outcome-open"></span></div><div class="outcome-legend"><span><i class="auto"></i>Automatisch erledigt <b id="outcome-auto-count">0</b></span><span><i class="reviewed"></i>Manuell geprüft <b id="outcome-reviewed-count">0</b></span><span><i class="open"></i>Offen/unsicher <b id="outcome-open-count">0</b></span></div>';
  const metrics=document.querySelector('.agent-metrics');if(metrics&&!document.getElementById('outcome-panel')){outcomePanel.id='outcome-panel';metrics.after(outcomePanel)}
  if(metrics&&!document.getElementById('metric-review')){const card=document.createElement('div');card.innerHTML='<span>Prüfung/Fehlbeleg</span><strong id="metric-review">–</strong>';metrics.append(card)}
  if(metrics&&!document.getElementById('metric-salesreport')){const card=document.createElement('div');card.innerHTML='<span>Sales Report</span><strong id="metric-salesreport">–</strong>';metrics.append(card)}
  const connectors=document.createElement('details');connectors.innerHTML='<summary>Quellen und austauschbare Schnittstellen</summary><p>Die Demo verwendet fiktive Adapter. In der Arbeitsversion können diese Adapter durch zugriffsgeschützte Verbindungen ersetzt werden. Die öffentliche Demo kontaktiert weder Gmail noch den Automatendienst.</p><ul id="source-connectors"></ul>';
  if(metrics&&!document.getElementById('source-connectors'))outcomePanel.after(connectors);
  const runButton=document.createElement('button');runButton.id='run-month-suite';runButton.className='secondary';runButton.type='button';runButton.textContent='Vollständige Monatsfälle prüfen';
  const controls=document.querySelector('#run-rule-benchmark')?.parentElement;if(controls&&!document.getElementById('run-month-suite'))controls.prepend(runButton);
  const resetOutputs=()=>{
    for(const id of ['outcome-auto-count','outcome-reviewed-count','outcome-open-count']){const n=$(id);if(n)n.textContent='0'}
    for(const id of ['outcome-auto','outcome-reviewed','outcome-open']){const n=$(id);if(n)n.style.width='0%'}
  };
  function reportOutcomes(items){
    const automatic=items.filter(item=>['automatic','qwen','deposit'].includes(item.kind)).length;
    const reviewed=items.filter(item=>['ignored','manual'].includes(item.kind)).length;
    const open=items.filter(item=>item.kind==='open').length,total=Math.max(1,items.length);
    const values={auto:automatic,reviewed,open};
    for(const [key,value] of Object.entries(values)){
      const count=$(`outcome-${key}-count`),bar=$(`outcome-${key}`);
      if(count)count.textContent=String(value);if(bar)bar.style.width=`${value/total*100}%`;
    }
    setMetric('review',String(reviewed));
  }
  window.dispatchEvent(new Event('zelunavo:agent-ui-ready'));
  const stamp = () => new Intl.DateTimeFormat('de-DE', {hour:'2-digit', minute:'2-digit'}).format(new Date());
  const say = (step, state, message) => {
    const node = steps.get(step);
    if (!node) return;
    node.dataset.state = state;
    node.querySelector('.state').textContent = state === 'done' ? '✓' : state === 'active' ? '…' : state === 'issue' ? '!' : '○';
    node.querySelector('small').textContent = message;
  };
  const log = message => {
    const list = $('agent-trace');
    if (list.children.length === 1 && list.firstElementChild.textContent.startsWith('Noch kein Lauf')) list.replaceChildren();
    const item = document.createElement('li');
    item.textContent = `${stamp()} · ${message}`;
    list.append(item);
  };
  const setMetric = (name, value) => { const node = $(`metric-${name}`); if (node) node.textContent = value; };
  const reset = () => {
    started = false;
    for (const [key] of steps) say(key, 'waiting', ({statement:'Wartet auf den fiktiven Kontoauszug.', invoices:'Wartet auf das Einlesen der Buchungen.', cashbook:'Wartet auf den Monatsabgleich.', salesreport:'Wartet auf den fiktiven Vendon-PDF-Export.', mhd:'Wartet auf den fiktiven Screenshot.', assembly:'Wartet auf die bestätigten Eingaben.'})[key]);
    ['bookings','invoices','review','reports','cash','salesreport','mhd','pages'].forEach(name => setMetric(name, '–'));
    resetOutputs();
    $('agent-trace').replaceChildren(Object.assign(document.createElement('li'), {textContent:'Noch kein Lauf gestartet. Lade einen fiktiven Kontoauszug.'}));
    $('evaluation-summary').textContent = 'Noch kein Prüflauf ausgeführt.';
    $('evaluation-summary').classList.remove('ok');
    $('evaluation-results').replaceChildren();
  };
  function reportBalance() {
    const local=!!document.querySelector('meta[name="local-token"]');
    if (!started&&!local) return;
    const month = $('month').value;
    const book = window.getCashbook?.(month);
    if (!book) return;
    const cents = rows => (rows || []).reduce((sum, row) => sum + (Number(row.cents) || 0), 0);
    const balance = (Number(book.opening) || 0) + cents(book.income) - cents(book.deposits) - cents(book.change);
    const ready = !!window.cashbookReportsReady?.(month);
    const count = book.reportsRead ? book.income.length : 0;
    setMetric('reports', local?String(count):`${count}/6`);
    setMetric('cash', new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(balance/100));
    if (ready && balance === 0) {
      say('cashbook','done',`Kassenbuch ausgeglichen; Endbestand ${new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(balance/100)}.`);
      log('Kassenbuchprüfung bestanden: Endbestand 0,00 €.');
    } else if (count || book.income?.length) {
      say('cashbook', balance === 0 ? 'active' : 'issue', `Kassenbestand ${new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(balance/100)}.`);
    }
  }
  function showEvaluation(detail) {
    const summary = $('evaluation-summary'), list = $('evaluation-results');
    const rows = detail?.results || [];
    const passed = rows.filter(row => row.passed).length;
    const percent = rows.length ? Math.round(passed / rows.length * 100) : 0;
    summary.textContent = `${detail?.label || 'Prüflauf'}: ${passed}/${rows.length} bestanden (${percent} %).${detail?.model ? ` Modell: ${detail.model}.` : ''}`;
    summary.classList.toggle('ok', rows.length > 0 && passed === rows.length);
    list.replaceChildren(...rows.map(row => {
      const li = document.createElement('li'); li.className='eval-case';
      const text = document.createElement('span');
      const title = document.createElement('strong'); title.textContent = row.title || row.id || 'Prüffall';
      const note = document.createElement('small'); note.textContent = row.detail || `Soll: ${row.expected ?? '—'} · Ist: ${row.actual ?? '—'}`;
      text.append(title, note);
      const result = document.createElement('span'); result.dataset.pass=String(!!row.passed); result.textContent=row.passed?'BESTANDEN':'ABWEICHUNG';
      li.append(text,result); return li;
    }));
  }
  $('run-rule-benchmark').addEventListener('click', () => {
    $('evaluation-summary').textContent = 'Regelwerk-Prüffälle werden berechnet …';
    window.dispatchEvent(new Event('zelunavo:run-rule-benchmark'));
  });
  $('run-qwen-benchmark').addEventListener('click', async () => {
    const button = $('run-qwen-benchmark'); button.disabled=true;
    $('evaluation-summary').textContent='Qwen prüft ausschließlich den eingebauten fiktiven Prüfsatz lokal …';
    try { await window.zelunavoLocalAi?.evaluateInvoices(); }
    catch (error) { $('evaluation-summary').textContent=`Qwen-Prüflauf fehlgeschlagen: ${error.message}`; }
    finally { button.disabled=false; }
  });
  window.addEventListener('zelunavo:agent-start', () => {
    reset(); started=true;
    say('statement','active','Fiktive PDF wird im Browser gelesen.');
    log('Lauf gestartet. Kontoauszug wird eingelesen; Dateiinhalt bleibt in dieser Browser-Sitzung.');
  });
  window.addEventListener('zelunavo:statement-loaded', event => {
    const data=event.detail||{}; started=true;
    say('statement',data.unread?'issue':'done',`${data.bookings} Buchungen erkannt; ${data.cashDeposits} Bargeldeinzahlungen; ${data.unread} Zeilen zur manuellen Prüfung.`);
    say('invoices','active',`${data.invoices} fiktive Rechnungsdateien gelesen; Buchungstexte und Beträge werden verglichen.`);
    setMetric('bookings',String(data.bookings));
    log(`PDF-Auslese: ${data.bookings} Buchungen, ${data.cashDeposits} Bargeldeinzahlungen, ${data.unread} unklare Zeilen; ${data.invoices} fiktive Rechnungen als Kandidaten geladen.`);
  });
  window.addEventListener('zelunavo:ai-match-start', () => log('Qwen startet lokalen Abgleich mit fiktiven Buchungen und zulässigen Belegkandidaten.'));
  window.addEventListener('zelunavo:ai-match-done', event => {
    const data=event.detail||{};
    log(`Qwen-Prüfung beendet: ${data.count||0} Buchung(en) bewertet. Vorschläge bleiben bis zur Bestätigung prüfpflichtig.`);
  });
  window.addEventListener('zelunavo:confirmed', event => {
    const items=event.detail?.items||[];
    const assigned=items.filter(item=>item.file).length;
    const noReceipt=items.length-assigned;
    setMetric('invoices',`${assigned}/${items.length}`);
    reportOutcomes(items);
    say('invoices','done',`${assigned} Belege zugeordnet; ${noReceipt} Buchungen ohne Rechnungsbeleg (z. B. Kasse an Bank oder ignoriert) sind in der bestätigten Liste gekennzeichnet.`);
    log(`Buchungsliste menschlich bestätigt: ${items.length} Buchungen; ${assigned} Rechnungsdateien eindeutig in die Reihenfolge übernommen.`);
    reportBalance();
  });
  window.addEventListener('zelunavo:cashbook-changed', reportBalance);
  window.addEventListener('zelunavo:assembly-started', event => {
    const month=event.detail?.month||'';
    say('assembly','active',`Abschlussunterlagen für ${month} werden zusammengestellt.`);
    log(`Zusammenstellen gestartet${event.detail?.local?' (lokaler Arbeitsmodus)':''}: Kassenbuch, MHD-Liste, Verkaufsbericht, Stundenzettel, Kontoauszug und Belege.`);
  });
  window.addEventListener('zelunavo:salesreport-started', event => {
    say('salesreport','active',event.detail?.local?'Vendon-Bericht wird lokal geladen und geprüft.':'Fiktiven Monatsbericht laden und Zeitraum prüfen.');
    log(`Verkaufsbericht ${event.detail?.month||''} wird übernommen${event.detail?.local?' und lokal mit Qwen geprüft':''}.`);
  });
  window.addEventListener('zelunavo:salesreport-loaded', event => {
    const data=event.detail||{};
    say('salesreport','done',`${data.local?'Lokale Vendon-PDF durch Qwen geprüft':'Fiktive Vendon-PDF geladen'}; Zeitraum ${data.period}; ${data.pages} Seite(n)${data.qwenConfidence?`; Qwen-Sicherheit ${(data.qwenConfidence*100).toFixed(0)} %`:''}.`);
    setMetric('salesreport',`${data.pages} Seite(n)`);
    log(`${data.local?'Lokaler Vendon-Bericht durch Qwen geprüft':'Fiktiver Verkaufsbericht'}: ${data.period}; ${data.pages} Seite(n).`);
  });
  window.addEventListener('zelunavo:salesreport-failed', event => {
    const message=String(event.detail?.message||'Der Verkaufsbericht konnte nicht geprüft werden.');
    say('salesreport','issue',message);
    log(`Verkaufsbericht-Prüfung fehlgeschlagen: ${message}`);
  });
  window.addEventListener('zelunavo:mhd-prepared', event => {
    const rows=event.detail?.rows||[];
    const month=document.getElementById('month').value;
    const expectedMhd=(window.zelunavoDemoSources?.mhd?.fixtureFor(month)?.rows||[]).map(row=>[row.article,row.quantity,row.expiry]);
    const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
    const actual=rows.map(row=>[normalize(row.article),Number(row.quantity),normalize(row.expiry)]);
    const correct=expectedMhd.filter(expected=>actual.some(row=>row[0]===normalize(expected[0])&&row[1]===expected[1]&&row[2]===normalize(expected[2]))).length;
    const exact=correct===expectedMhd.length&&rows.length===expectedMhd.length;
    const userVerified=/geprüft/i.test(String(event.detail?.source||''));
    setMetric('mhd',`${correct}/${expectedMhd.length}`);
    say('mhd',exact?(userVerified?'done':'active'):'issue',`${correct}/${expectedMhd.length} bekannte Artikel·Menge·MHD-Kombinationen korrekt; Quelle: ${event.detail?.source||'fiktive Eingabe'}.${userVerified?' Von dir übernommen.':' Sichtprüfung und „Korrekturen übernehmen“ stehen noch aus.'}`);
    log(`MHD-Prüfung gegen die fiktiven Sollwerte: ${correct}/${expectedMhd.length} Zeilen exakt${userVerified?' und von dir übernommen':' erkannt, Sichtprüfung noch offen'}.`);
  });
  window.addEventListener('zelunavo:timesheet-changed', () => {
    if (started) log('Zeiterfassung geändert; Abschluss wartet auf den Klick „Fertig – zum Abschluss hinzufügen“.');
  });
  window.addEventListener('zelunavo:finalized', event => {
    const data=event.detail||{};
    setMetric('pages',String(data.pages??'–'));
    say('assembly',data.valid?'done':'issue',data.valid?`${data.components} Bestandteile in Reihenfolge kombiniert; ${data.pages} PDF-Seiten.`:'Abschlussprüfung meldet fehlende oder fehlerhafte Bestandteile.');
    log(data.valid?`Abschlussprüfung bestanden: ${data.components} Bestandteile, ${data.pages} Seiten, ${data.archived||0} Dateien im Browser-Demoarchiv.`:'Abschlussprüfung fehlgeschlagen; siehe Meldung im Abschlussbereich.');
  });
  window.addEventListener('zelunavo:rule-benchmark-results', event => showEvaluation(event.detail));
  window.addEventListener('zelunavo:qwen-benchmark-results', event => showEvaluation(event.detail));
  window.addEventListener('zelunavo:month-suite-results', event => showEvaluation(event.detail));
  window.addEventListener('zelunavo:run-month-suite', () => {});
  $('month').addEventListener('change', reset);
  $('month').addEventListener('change',updateMonthLinks);
  window.addEventListener('zelunavo:reset', reset);
  window.addEventListener('zelunavo:local-ai-ready', event => { $('run-qwen-benchmark').hidden=!event.detail?.available; });
  runButton.addEventListener('click',()=>window.dispatchEvent(new Event('zelunavo:run-month-suite')));
  function showSources(){
    const list=$('source-connectors'),items=window.zelunavoDemoSources?.providers||[];if(!list||!items.length)return;
    list.replaceChildren(...items.map(item=>{const li=document.createElement('li'),name=document.createElement('strong'),adapter=document.createElement('code');name.textContent=item.name;adapter.textContent=item.adapter;li.append(name,document.createTextNode(` · ${item.mode} `),adapter);return li}));
  }
  showSources();updateMonthLinks();window.addEventListener('zelunavo:agent-ui-ready',showSources);window.addEventListener('zelunavo:month-options-ready',updateMonthLinks);
  reset();
})();
