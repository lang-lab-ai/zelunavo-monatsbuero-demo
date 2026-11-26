(() => {
  'use strict';
  const root = 'Zelunavo-Demoablage/';
  const storeName = 'monatsarchive';
  const status = document.getElementById('demo-archive-status');
  const list = document.getElementById('demo-archive-list');
  const button = document.getElementById('demo-archive-download');
  const monthName = month => new Intl.DateTimeFormat('de-DE', {month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
  let current = null;

  function database() {
    return new Promise((resolve,reject) => {
      const request = indexedDB.open('Zelunavo-Demoablage', 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName, {keyPath:'month'});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function read(month) {
    const db = await database();
    try {
      return await new Promise((resolve,reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const request = transaction.objectStore(storeName).get(month);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  }
  async function write(record) {
    const db = await database();
    try {
      await new Promise((resolve,reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        transaction.objectStore(storeName).put(record);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } finally { db.close(); }
  }
  function render(record, month) {
    current = record;
    if (list) list.replaceChildren();
    if (button) button.hidden = !record || record.formatVersion !== 2;
    if (!record) {
      if (status) status.textContent = `Für ${monthName(month)} wurde noch keine Demoablage erstellt.`;
      return;
    }
    if(record.formatVersion!==2){
      if (status) status.textContent=`Für ${monthName(month)} ist noch ein älteres Demoarchiv gespeichert. Erstelle die Abschluss-PDF erneut, damit der fiktive Verkaufsbericht als separate PDF übernommen wird.`;
      return;
    }
    if (status) status.textContent = `${record.paths.length} fiktive Dateien für ${monthName(month)} automatisch in der Demoablage gespeichert.`;
    const groups = new Map();
    for (const path of record.paths) {
      const relative = path.slice(root.length);
      const [folder,...parts] = relative.split('/');
      if (!groups.has(folder)) groups.set(folder, []);
      groups.get(folder).push(parts.join('/'));
    }
    for (const [folder, files] of groups) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = `${folder} (${files.length})`;
      const ul = document.createElement('ul');
      for (const file of files) {
        const li = document.createElement('li');
        li.textContent = file;
        ul.append(li);
      }
      details.append(summary, ul);
      if (list) list.append(details);
    }
  }
  async function show(month) {
    try { render(await read(month), month); }
    catch (error) { current=null;if(button)button.hidden=true;if(status)status.textContent=`Demoablage konnte nicht gelesen werden: ${error.message}`; }
  }
  async function save(month, entries) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw Error('Ungültiger Abrechnungsmonat.');
    const zip = new JSZip();
    const paths = [];
    zip.file(`${root}HINWEIS.txt`, `Zelunavo – fiktive Demoablage für ${monthName(month)}\nAlle Unterlagen sind fiktiv. Die Ordnerstruktur zeigt die spätere lokale Ablage auf dem Mac mini.\nDiese ZIP-Datei enthält keine Zugangsdaten.\n`);
    for (const {path,bytes} of entries) {
      if (!path.startsWith(root) || path.includes('..') || paths.includes(path)) throw Error('Ungültiger oder doppelter Ablagepfad.');
      zip.file(path, bytes);
      paths.push(path);
    }
    const blob = await zip.generateAsync({type:'blob',compression:'DEFLATE'});
    const record = {month,blob,paths,savedAt:new Date().toISOString(),formatVersion:2};
    await write(record);
    render(record, month);
    return paths.length;
  }
  button?.addEventListener('click', async () => {
    const month=document.getElementById('month').value;
    const record=current?.month===month?current:await read(month);
    if (!record) return;
    const url=URL.createObjectURL(record.blob),link=document.createElement('a');
    link.href=url;
    link.download=`Zelunavo-Demoablage-${month}-FIKTIV.zip`;
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  });
  document.getElementById('month').addEventListener('change', event => show(event.target.value));
  window.demoArchive = {save,show};
  document.addEventListener('DOMContentLoaded', () => show(document.getElementById('month').value));
})();
