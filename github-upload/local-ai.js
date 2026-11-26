(() => {
  'use strict';
  const token = document.querySelector('meta[name="local-ai-token"]')?.content;
  const dataMode = document.querySelector('meta[name="zelunavo-data-mode"]')?.content || 'demo';
  if (!token) return;
  const button = document.getElementById('ai-match');
  const status = document.getElementById('ai-match-status');
  let review = [], available = false, running = false, lastAutomaticRun = '', reviewVersion = 0;
  async function post(path, data) {
    const response = await fetch(path, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Local-Token': token},
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'Lokale KI-Anfrage fehlgeschlagen.');
    return result;
  }
  window.zelunavoLocalAi = {
    async extractMhd(file, month) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.length > 8_000_000) throw Error('Das Bild ist größer als 8 MB.');
      let binary = '';
      for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      return post('/api/ki/mhd', {data_mode:dataMode,month, image: btoa(binary)});
    },
    async evaluateInvoices() {
      if(dataMode!=='demo')throw Error('Der fiktive Testlauf ist nur im Demomodus verfügbar.');
      const result = await post('/api/ki/evaluate', {data_mode:'demo'});
      window.dispatchEvent(new CustomEvent('zelunavo:qwen-benchmark-results', {detail:{...result,label:'Qwen · fiktiver Mehrmonats-Prüfsatz'}}));
      return result;
    },
  };
  window.addEventListener('zelunavo:statement-ready', event => {
    review = event.detail || [];reviewVersion++;
    button.hidden = !review.length || !available;
    status.textContent = available && review.length ? `Qwen prüft ${review.length} passende Buchungsposition(en) automatisch lokal.` : !available ? 'Ollama oder qwen3.5:9b ist noch nicht erreichbar.' : '';
    if(available&&review.length) runMatch(false);
  });
  window.addEventListener('zelunavo:reset', () => {
    review = [];reviewVersion++;
    lastAutomaticRun = '';
    button.hidden = true;
    status.textContent = '';
  });
  async function runMatch(force=true) {
    if (!review.length) return;
    const key=JSON.stringify(review),version=reviewVersion;
    if(running||(!force&&lastAutomaticRun===key))return;
    running=true;
    if(!force)lastAutomaticRun=key;
    button.disabled=true;
    status.classList.remove('hidden');
    status.textContent='Qwen vergleicht Buchungstexte und Rechnungen lokal …';
    window.dispatchEvent(new Event('zelunavo:ai-match-start'));
    try {
      const pending=review.slice(),rows=[];let model='',start=0, fingerprint='';
      const month=document.getElementById('month')?.value||'';
      const local=!!document.querySelector('meta[name="local-token"]');
      if(local&&crypto.subtle&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)){
      const data=new TextEncoder().encode(JSON.stringify({version:8,data_mode:dataMode,month,bookings:pending}));
        fingerprint=[...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(x=>x.toString(16).padStart(2,'0')).join('');
        if(!force)try{
          const cached=await post('/api/ki/ergebnisse',{action:'load',data_mode:dataMode,month,fingerprint});
          if(Array.isArray(cached.results)&&Number.isInteger(cached.processed)&&cached.processed===cached.results.length&&cached.processed<=pending.length&&cached.results.every((r,i)=>r.booking_index===pending[i].index)){
            rows.push(...cached.results);start=cached.processed;
            if(rows.length&&version===reviewVersion)window.dispatchEvent(new CustomEvent('zelunavo:ai-matches',{detail:rows.slice()}));
          }
        }catch{}
      }
      for(;start<pending.length;start+=4){
        if(version!==reviewVersion)return;
        status.textContent=`Qwen prüft Buchungen lokal (${Math.min(start+4,pending.length)} von ${pending.length}) …`;
        const result=await post('/api/ki/belege',{data_mode:dataMode,bookings:pending.slice(start,start+4)});
        if(version!==reviewVersion)return;
        rows.push(...result.results);model=result.model||model;
        window.dispatchEvent(new CustomEvent('zelunavo:ai-matches',{detail:rows.slice()}));
        if(fingerprint)try{await post('/api/ki/ergebnisse',{action:'save',data_mode:dataMode,month,fingerprint,results:rows,processed:rows.length})}catch{}
      }
      if(version!==reviewVersion)return;
      window.dispatchEvent(new CustomEvent('zelunavo:ai-match-done',{detail:{count:rows.length,model}}));
      status.textContent='';
      status.classList.add('hidden');
    } catch(error){if(version===reviewVersion)status.textContent=`KI-Abgleich fehlgeschlagen: ${error.message}`}
    finally{
      button.disabled=false;running=false;
      if(version!==reviewVersion&&available&&review.length)queueMicrotask(()=>runMatch(false));
    }
  }
  button.addEventListener('click', () => runMatch(true));
  button.hidden = true;
  fetch('/api/ki/status').then(response => response.json()).then(result => {
    available = result.available;
    window.dispatchEvent(new CustomEvent('zelunavo:local-ai-ready', {detail:{available,model:result.model}}));
    status.textContent = result.available ? `Lokaler KI-Modus mit ${result.model} ist bereit.` : 'Ollama oder qwen3.5:9b ist noch nicht erreichbar.';
    if (!result.available) window.zelunavoLocalAi = null;
    button.hidden = !review.length || !available;
    if(available&&review.length)runMatch(false);
  }).catch(() => {
    status.textContent = 'Lokaler KI-Modus ist nicht erreichbar.';
    window.zelunavoLocalAi = null;
  });
})();
