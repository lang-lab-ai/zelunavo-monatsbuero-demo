const fs = require('node:fs');
const path = require('node:path');
const { PDFDocument, StandardFonts, rgb, PageSizes } = require('./pdf-lib.min.js');

const months = {
  '2026-06': [91240, 572030, 164280, 121120, 99870, 37460],
  '2026-07': [98020, 612040, 178850, 131530, 109010, 36550],
  '2026-08': [104580, 638010, 185020, 140540, 116830, 39020],
  '2026-09': [110420, 665030, 193040, 148850, 123510, 42550]
};
const cashless = {
  '2026-06': [52020, 190400, 70030, 80000, 61000, 26000],
  '2026-07': [54800, 201500, 73800, 82400, 63700, 28200],
  '2026-08': [57800, 212300, 77100, 86000, 66800, 29400],
  '2026-09': [60200, 221400, 80400, 89200, 69700, 31100]
};
const machines = ['Demoautomat Nord', 'Demoautomat Mitte', 'Demoautomat Süd', 'Demoautomat Getränke', 'Demoautomat Snacks', 'Demoautomat West'];
const output = path.join(__dirname, 'fiktive-testdaten', 'verkaufsberichte');
const euro = cents => `${Math.floor(cents / 100).toLocaleString('de-DE')},${String(cents % 100).padStart(2, '0')} €`;
const dateDE = iso => {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
};

async function createReport(month, barValues, cashlessValues) {
  const [year, monthNo] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNo, 0)).getUTCDate();
  const start = `${month}-01`;
  const end = `${month}-${String(lastDay).padStart(2, '0')}`;
  const period = `${dateDE(start)} bis ${dateDE(end)}`;
  const document = await PDFDocument.create();
  document.setTitle(`Zelunavo Verkaufsbericht ${month} FIKTIV`);
  document.setSubject(period);
  document.setAuthor('Zelunavo Demo - fiktive Beispieldaten');
  document.setCreator('Zelunavo Demo');
  const page = document.addPage(PageSizes.A4);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const width = page.getWidth();
  const ink = rgb(0.10, 0.13, 0.15);
  const muted = rgb(0.36, 0.40, 0.42);
  const green = rgb(0.18, 0.84, 0.55);
  page.drawRectangle({ x: 0, y: 690, width, height: 152, color: ink });
  page.drawText('VERKAUFSBERICHT', { x: 42, y: 790, size: 20, font: bold, color: rgb(0.96, 0.97, 0.97) });
  page.drawText('FIKTIVER AUTOMATENDIENST-EXPORT - NICHT AUS EINEM ECHTEN SYSTEM', { x: 42, y: 767, size: 8.5, font: bold, color: green });
  page.drawText('Zelunavo Demo', { x: 42, y: 727, size: 11, font: regular, color: rgb(0.85, 0.88, 0.89) });
  page.drawRectangle({ x: 0, y: 686, width, height: 4, color: green });
  page.drawText('Abrechnungszeitraum', { x: 42, y: 646, size: 9, font: bold, color: muted });
  page.drawText(period, { x: 42, y: 621, size: 16, font: bold, color: ink });
  page.drawText(`Berichts-ID: ZD-${month}-DEMO`, { x: 42, y: 597, size: 9, font: regular, color: muted });

  const left = 42, right = width - 42, tableWidth = right - left;
  const yHeader = 548, rowHeight = 37;
  page.drawRectangle({ x: left, y: yHeader - 7, width: tableWidth, height: 29, color: ink });
  page.drawText('Automat', { x: left + 10, y: yHeader + 2, size: 8.5, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Barumsatz', { x: 285, y: yHeader + 2, size: 8.5, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Bargeldlos', { x: 380, y: yHeader + 2, size: 8.5, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Gesamt', { x: 475, y: yHeader + 2, size: 8.5, font: bold, color: rgb(1, 1, 1) });

  let totalCash = 0, totalCashless = 0;
  machines.forEach((machine, index) => {
    const y = yHeader - 36 - index * rowHeight;
    if (index % 2 === 0) page.drawRectangle({ x: left, y: y - 9, width: tableWidth, height: rowHeight, color: rgb(0.95, 0.96, 0.96) });
    const cash = barValues[index], card = cashlessValues[index];
    totalCash += cash; totalCashless += card;
    page.drawText(machine, { x: left + 10, y, size: 8.5, font: regular, color: ink });
    page.drawText(euro(cash), { x: 285, y, size: 8.5, font: regular, color: ink });
    page.drawText(euro(card), { x: 380, y, size: 8.5, font: regular, color: ink });
    page.drawText(euro(cash + card), { x: 475, y, size: 8.5, font: regular, color: ink });
  });
  const sumY = yHeader - 36 - machines.length * rowHeight;
  page.drawLine({ start: { x: left, y: sumY + 14 }, end: { x: right, y: sumY + 14 }, thickness: 1, color: green });
  page.drawText('SUMME', { x: left + 10, y: sumY - 3, size: 9, font: bold, color: ink });
  page.drawText(euro(totalCash), { x: 285, y: sumY - 3, size: 9, font: bold, color: ink });
  page.drawText(euro(totalCashless), { x: 380, y: sumY - 3, size: 9, font: bold, color: ink });
  page.drawText(euro(totalCash + totalCashless), { x: 475, y: sumY - 3, size: 9, font: bold, color: ink });

  page.drawRectangle({ x: left, y: 111, width: tableWidth, height: 62, color: rgb(0.92, 0.96, 0.94) });
  page.drawText('Demo-Hinweis', { x: left + 12, y: 153, size: 9, font: bold, color: ink });
  page.drawText('Alle Werte und Automatennamen sind frei erfunden. Kartenzahlungen sind im', { x: left + 12, y: 135, size: 8.5, font: regular, color: muted });
  page.drawText('Sales Report enthalten, werden aber nicht ins Bargeld-Kassenbuch übernommen.', { x: left + 12, y: 120, size: 8.5, font: regular, color: muted });
  page.drawLine({ start: { x: left, y: 82 }, end: { x: right, y: 82 }, thickness: 0.6, color: rgb(0.78, 0.81, 0.82) });
  page.drawText(`FIKTIVER PDF-EXPORT | Zeitraum ${period} | Seite 1 von 1`, { x: left, y: 65, size: 8, font: regular, color: muted });

  const bytes = await document.save();
  const file = path.join(output, `Zelunavo_Verkaufsbericht_${month}_FIKTIV.pdf`);
  fs.writeFileSync(file, bytes);
}

fs.mkdirSync(output, { recursive: true });
Promise.all(Object.entries(months).map(([month, values]) => createReport(month, values, cashless[month])))
  .catch(error => { console.error(error); process.exitCode = 1; });
