# Stilkarte · Zelunavo Snackautomatenbetrieb

**Stand:** Version 1.0 · eingefroren am 12. November 2026  
**Einsatz:** Weboberfläche der fiktiven Büroassistenz-Demo  
**Für wen:** Betriebsleitung und Mitarbeitende, die Monatsunterlagen prüfen und abschließen.

## Hauptaufgabe

Einen Monat mit möglichst wenig Sucharbeit abschließen: **Kontoauszug auswählen → Unklarheiten prüfen → MHD und Arbeitszeiten ergänzen → Abschluss-PDF erstellen.** Die nächste nötige Handlung steht immer deutlich sichtbar. Details und bereits erledigte Schritte bleiben erreichbar, drängen sich aber nicht vor.

## Bildidee

Die Oberfläche erinnert an einen modernen Snackautomaten am Abend: dunkles Gehäuse, klare Kanten, wenige leuchtende Signale. Sie wirkt ruhig und zuverlässig, nicht wie ein Spielautomat. Neon wird für Orientierung und Rückmeldung eingesetzt, nicht als großflächiger Hintergrund oder Fließtextfarbe.

## Farben

| Rolle | Farbe | Hex | Verwendung |
| --- | --- | --- | --- |
| Seitenhintergrund | sehr dunkles Blau-Schwarz | `#0B1016` | Grundfläche |
| Karten | Anthrazit-Blau | `#151C26` | Aufgaben und Formulare |
| Erhöhte Fläche | Schieferblau | `#1D2835` | Menüs, aktive Arbeitsbereiche |
| Linien | gedämpftes Schiefergrau | `#334252` | Grenzen, Tabellenlinien |
| Haupttext | warmes Hellgrau | `#E8ECE8` | Überschriften und Inhalt |
| Nebentext | helles Graublau | `#A7B3B9` | Hilfen, Metadaten |
| Marke | Neonpink | `#FF5AAE` | Kleine Hervorhebungen |
| Hauptaktion | Neongrün | `#B7F66B` | Buttons, Erfolg, Bankeinzahlung im Kassenbuch |
| Information | Neonblau | `#57D8FF` | Links, Hinweise, Wechselgeld im Kassenbuch |
| Barumsatz | Warmgelb | `#FFD166` | Einnahmen im Kassenbuch |
| Warnung | Warmes Orange | `#FFCF70` | Unklare Belege |
| Fehler | Helles Korallrot | `#FF8E9C` | Fehlende Angaben oder Fehler |

Die hellen Textfarben haben auf den dunklen Karten ausreichend Kontrast. Auf gefüllten Neon-Buttons steht **dunkler Text** (`#0B1016`). Pink markiert keine Fehler, damit die Bedeutungen eindeutig bleiben.

## Schrift und Form

- Systemschrift (`system-ui`, `-apple-system`, `Segoe UI`, sans-serif): schnell, klar, ohne externe Schriftdatei.
- Grundschrift 16 px, Zeilenhöhe 1,5; Hilfstext mindestens 14 px.
- Überschriften kräftig und knapp. Zahlen in Tabellen rechtsbündig und mit tabellarischen Ziffern.
- Kartenradius 12 px, Buttons 10 px. Keine starken Leuchteffekte; höchstens eine feine Akzentlinie oder ein kurzer Schimmer beim Fokus.
- Bedienflächen mindestens 44 px hoch. Tastaturfokus als 3 px breite blaue Kontur.

## Komponenten

1. **Hauptaktion:** neongrüner Button mit dunkler Schrift, zum Beispiel „Abschluss-PDF erstellen“.
2. **Nebenaktion:** dunkler Button mit blauer Kontur, zum Beispiel „Excel herunterladen“.
3. **Aktiver Schritt:** pinke Linie und heller Text. Erledigte Schritte mit grünem Häkchen.
4. **Prüfhinweis:** gelbe Fläche oder Linie bei unklaren Belegen; rote Meldung nur bei tatsächlichem Fehler.
5. **Kassenbuch:** Barumsatz gelb, Bankeinzahlung grün, Wechselgeld blau. Kartenzahlungen gehören nicht hinein.
6. **Tabellen:** ruhige dunkle Zeilen, klare Trennlinien, Beträge gut lesbar. Farbmarkierungen ergänzen Beschriftungen und ersetzen sie nicht.

## Bild- und Logo-Regel

Eine Automaten- oder Snackgrafik kann die Startseite unterstützen. In Formularen, Tabellen und PDF-Vorschauen stört sie. Das neue `zelunavo-logo.svg` zeigt einen vereinfachten Automaten mit drei farbigen Produkten. Die SVG-Datei bleibt auch bei kleiner Darstellung scharf.

## Druckunterlagen

Die App darf dunkel sein. **Kassenbuch, Stundenzettel und Abschluss-PDF bleiben für den Ausdruck hell** mit dunkler Schrift und sparsamen Akzenten. Das spart Tinte und ist auf Papier besser lesbar.

## Nicht übernehmen

Große Neonflächen, blinkende Animationen, Glühen um jede Karte, mehrere gleich wichtige Hauptbuttons, farbige Fließtexte oder rein farbcodierte Statusmeldungen.

## Design-Lock

Die Farbpalette, Typografie, Abstände, Karten, Navigation, Buttons, Statusfarben und Kassenbuch-Farbzuordnungen sind für Version 1.0 festgelegt. `theme-dark.css` ist die maßgebliche Implementierung. Änderungen an der visuellen Richtung erfolgen nur auf ausdrücklichen Wunsch; neue Funktionen werden in dieses bestehende Design eingepasst.

**Visuelle Vorschau:** `stilkarte.html` im selben Ordner.
