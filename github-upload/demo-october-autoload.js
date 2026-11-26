(() => {
  'use strict';
  const month='2026-10';
  const packagePath='fiktive-testdaten/Zelunavo_Monatsfall_Oktober_2026_FIKTIV.zip';
  const demoMode=()=>((document.querySelector('meta[name="zelunavo-data-mode"]')?.content)||'demo')==='demo';
  const button=document.getElementById('demo-heartbeat');
  const packageInput=document.getElementById('month-package');
  let packageLoad=null;

  function waitFor(name,timeout=30000){
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{window.removeEventListener(name,listener);reject(Error('Der Oktoberlauf hat zu lange gedauert.'))},timeout);
      const listener=event=>{if(event.detail?.month&&event.detail.month!==month)return;clearTimeout(timer);window.removeEventListener(name,listener);event.detail?.ok===false?reject(Error(event.detail.error||'Der Oktoberfall konnte nicht geladen werden.')):resolve(event.detail||{})};
      window.addEventListener(name,listener);
    });
  }

  async function ensurePackage(){
    if(window.zelunavoMonthPackages?.[month])return window.zelunavoMonthPackages[month];
    if(packageLoad)return packageLoad;
    packageLoad=(async()=>{
      const response=await fetch(packagePath,{cache:'no-store'});
      if(!response.ok)throw Error(`Oktoberfall nicht verfügbar (${response.status}).`);
      const file=new File([await response.arrayBuffer()],packagePath.split('/').at(-1),{type:'application/zip'});
      const ready=waitFor('zelunavo:month-package-ready');
      const transfer=new DataTransfer();transfer.items.add(file);packageInput.files=transfer.files;
      window.zelunavoMonthPackagePreloadOnly=true;
      packageInput.dispatchEvent(new Event('change',{bubbles:true}));
      await ready;
      const result=window.zelunavoMonthPackages?.[month];
      if(!result)throw Error('Der Oktoberfall konnte nicht geladen werden.');
      return result;
    })().finally(()=>{packageLoad=null});
    return packageLoad;
  }

  function assignFile(input,file){const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files}
  if(!button||!packageInput)return;
  if(!demoMode()){button.hidden=true;return}

  // Load the fictional month quietly so it is available for both manual upload
  // and the heartbeat shortcut. The account statement is only selected on click.
  window.addEventListener('load',()=>{ensurePackage().catch(error=>console.warn('Fiktiver Oktoberfall ist noch nicht verfügbar:',error))},{once:true});

  button.addEventListener('click',async()=>{
    if(button.disabled)return;
    button.disabled=true;button.setAttribute('aria-busy','true');
    try{
      const pkg=await ensurePackage();
      const monthSelect=document.getElementById('month');
      if(monthSelect.value!==month){monthSelect.value=month;monthSelect.dispatchEvent(new Event('change',{bubbles:true}))}
      const statementInput=document.getElementById('statement');
      const statementReady=waitFor('zelunavo:statement-loaded',90000);
      assignFile(statementInput,pkg.statement);
      statementInput.dispatchEvent(new Event('change',{bubbles:true}));
      await statementReady;
      document.getElementById('review-wrap')?.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(error){
      const note=document.getElementById('file-note');
      if(note){note.textContent=`Demo-Heartbeat konnte nicht starten: ${error.message}`;note.classList.remove('hidden')}
    }finally{
      button.disabled=false;button.removeAttribute('aria-busy');
    }
  });
})();
