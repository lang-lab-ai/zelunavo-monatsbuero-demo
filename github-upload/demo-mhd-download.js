document.getElementById('demo-shot-download').addEventListener('click', async event => {
  event.preventDefault();
  const month=document.getElementById('month').value;
  try {
    const blob=await window.zelunavoDemoSources?.mhd?.createScreenshot(month);
    if(!blob)throw Error('Für den ausgewählten Monat gibt es keinen fiktiven Screenshot.');
    const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
    const label=window.zelunavoDemoSources?.mhd?.fixtureFor(month)?.label||month;
    link.download = `WhatsApp_MHD_${label.replace(/\s+/g,'_')}_FIKTIV.png`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch(error) {
    document.getElementById('demo-shot-status').textContent=error.message;
  }
});
