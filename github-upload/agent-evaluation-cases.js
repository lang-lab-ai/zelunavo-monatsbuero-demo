(() => {
  'use strict';
  window.zelunavoEvaluationFixtures={
    months:[
      {month:'2026-06',merchant:'Fjordmarkt Nord',invoice:'LB-FIK-2026-601',amount:485000,decoy:'Seeblick Handel'},
      {month:'2026-07',merchant:'Kiesel Einkauf',invoice:'LB-FIK-2026-702',amount:7290,decoy:'Morgenrot Service'},
      {month:'2026-08',merchant:'Lindenwerk Bedarf',invoice:'LB-FIK-2026-803',amount:18450,decoy:'Nordhafen Technik'},
      {month:'2026-09',merchant:'Berglicht Bürobedarf',invoice:'LB-FIK-2026-904',amount:12990,decoy:'Feldstern Handel'}
    ],
    errorScenarios:[
      {id:'mhd-zero-quantity',title:'MHD: Menge null zurückweisen'},
      {id:'mhd-fraction-quantity',title:'MHD: gebrochene Stückzahl zurückweisen'},
      {id:'mhd-invalid-calendar-date',title:'MHD: unmögliches Kalenderdatum zurückweisen'},
      {id:'mhd-recorded-wrong-month',title:'MHD: abweichenden Erfassungsmonat zurückweisen'},
      {id:'statement-unread-row',title:'Kontoauszug: unlesbare Buchungszeile zur Prüfung markieren'},
      {id:'invoice-wrong-month',title:'Rechnung: falschen Monat ohne Rechnungsnummer ausschließen'},
      {id:'invoice-wrong-amount',title:'Rechnung: falschen Betrag ausschließen'},
      {id:'invoice-no-text',title:'Rechnung: Betrag ohne Textbezug nur unsicher vorschlagen'},
      {id:'invoice-missing',title:'Rechnung: fehlenden Beleg nicht erfinden'},
      {id:'invoice-duplicate',title:'Rechnung: doppelte Verwendung blockieren'},
      {id:'invoice-reference-conflict',title:'Rechnung: widersprüchliche Rechnungsnummer zur Bankreferenz offenhalten'},
      {id:'invoice-credit-note',title:'Rechnung: Gutschrift oder Storno nicht mit Lastschrift verwechseln'},
      {id:'invoice-arithmetic',title:'Rechnung: Netto, Steuer und Brutto rechnerisch prüfen'},
      {id:'invoice-foreign-currency',title:'Rechnung: Fremdwährung zur manuellen Prüfung markieren'},
      {id:'invoice-cancelled',title:'Rechnung: ungültig oder storniert markierte Belege zurückweisen'},
      {id:'invoice-multi-document-pdf',title:'Rechnung: mehrere Rechnungsnummern in einer PDF offenhalten'},
      {id:'deposit-needs-no-invoice',title:'Kasse an Bank: keine Rechnung verlangen'},
      {id:'cashbook-nonzero',title:'Kassenbuch: Abschluss bei Restbestand blockieren'}
    ]
  };
})();
