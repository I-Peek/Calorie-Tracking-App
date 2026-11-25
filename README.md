# NutriLog – Kalorientracker

Ein eigener, kostenloser Kalorientracker als **Progressive Web App (PWA)**: läuft im Browser, lässt sich auf dem iPhone/Android-Handy wie eine echte App auf den Homescreen installieren und funktioniert offline. Keine Anmeldung, keine Werbung, keine Abo-Kosten – alle Daten bleiben auf deinem Gerät.

## Funktionen

| Bereich | Was die App kann |
|---|---|
| **Tagebuch** | Frühstück, Mittagessen, Abendessen, Snacks · Kalorien-Ring mit „gegessen / verbrannt / übrig" · Fortschrittsbalken für Kohlenhydrate, Eiweiß, Fett · Tage vor/zurück blättern, Kalender · Streak 🔥 |
| **Lebensmittel** | ~170 Grundnahrungsmittel offline eingebaut · Millionen Markenprodukte über [Open Food Facts](https://world.openfoodfacts.org) · Zuletzt verwendet, Favoriten ⭐, eigene Lebensmittel, Rezepte |
| **Barcode-Scanner** | EAN/UPC per Kamera scannen (nativ in Chrome/Android, per WebAssembly auf iPhone) · Taschenlampe · manuelle Eingabe · unbekannte Produkte selbst anlegen |
| **Mengen** | Gramm/Milliliter oder Portionen (z. B. „1 Scheibe", „1 Riegel") · Einträge bearbeiten, verschieben, löschen mit „Rückgängig" · Mahlzeit vom Vortag kopieren · Schnelleintrag nur mit kcal |
| **Nährwerte** | Kalorien, Kohlenhydrate, Eiweiß, Fett, Zucker, Ballaststoffe, gesättigte Fettsäuren, Salz · Nutri-Score |
| **Wasser** | Gläser antippen, Tagesziel, Glasgröße einstellbar |
| **Aktivitäten** | 37 Sportarten mit MET-Werten, Schritte, eigene kcal (z. B. von der Smartwatch) · verbrannte Kalorien optional zum Budget addieren |
| **Gewicht** | Verlauf mit Diagramm, BMI, Fortschritt zum Zielgewicht, voraussichtliches Zieldatum, Körperfett & Bauchumfang |
| **Intervallfasten** | 12:12, 14:10, 16:8, 18:6, 20:4, OMAD · Live-Timer, Fastenphasen, Verlauf & Statistik |
| **Statistik** | Kalorien & Wasser der letzten 7/30 Tage, Ø-Makroverteilung, Tage im Zielbereich |
| **Ziele** | Automatische Berechnung (Mifflin-St Jeor + Aktivitätslevel + Wunschtempo) oder eigenes Kalorienziel · Makro-Presets (Ausgewogen, High Protein, Low Carb, Keto) |
| **Sonstiges** | Hell/Dunkel/Auto · Sicherung exportieren/importieren (JSON) · komplett offline nutzbar · automatische Updates |

## Woher kommen die Produktdaten?

**Open Food Facts** ist eine freie, offene Lebensmitteldatenbank (wie Wikipedia für Lebensmittel) mit über 3 Millionen Produkten, sehr vielen davon aus Deutschland. Über den Barcode (EAN) bekommt die App Name, Marke, Bild, Nutri-Score und alle Nährwerte. Die Nutzung ist kostenlos und braucht keinen API-Schlüssel. Fehlt ein Produkt, legst du es einmal selbst an – danach wird es beim Scannen sofort erkannt.

## Wo werden meine Daten gespeichert?

Lokal im Browser (IndexedDB) auf deinem Gerät – es gibt keinen Server und keine Cloud. Deshalb:

- **Regelmäßig unter Profil → „Sicherung exportieren" ein Backup machen** (z. B. in iCloud Drive / Google Drive speichern).
- Beim Gerätewechsel: Backup exportieren → auf dem neuen Gerät beim Start „Sicherung wiederherstellen".
- Auf dem iPhone die App unbedingt über Safari → Teilen → „Zum Home-Bildschirm" installieren; dann bleiben die Daten dauerhaft erhalten.

## Entwicklung

Voraussetzung: Node.js 22+

```bash
npm install
npm run dev        # Entwicklungsserver auf http://localhost:5173
npm test           # Unit-Tests (Vitest)
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
```

Technik: React 19 · TypeScript · Vite · Tailwind CSS 4 · Dexie (IndexedDB) · vite-plugin-pwa (Workbox) · barcode-detector (ZXing WASM) · lucide-react.

```
src/
  pages/         Seiten (Tagebuch, Suche, Fasten, Fortschritt, Profil, Onboarding, Editoren)
  components/    UI-Bausteine, Sheets, Scanner, Diagramme
  db/            Datenbank-Schema (Dexie), Typen, Datenzugriff (repo.ts)
  lib/           Berechnungen (nutrition.ts), Open Food Facts, Suche, Aktivitäten, Fasten, Backup
  data/foods.ts  Eingebaute Lebensmittel-Datenbank
```

## Veröffentlichen (aufs Handy bringen)

Die App ist eine statische Website – sie braucht nur HTTPS-Hosting (für Kamera & Installation).

### Variante A: GitHub Pages (schon eingerichtet)

Der Workflow `.github/workflows/deploy.yml` baut und veröffentlicht bei jedem Push auf `main` automatisch.
Einmalig aktivieren: **Settings → Pages → Build and deployment → Source: „GitHub Actions"**.

> GitHub Pages funktioniert bei **privaten** Repos nur mit GitHub Pro. Alternativen: Repo auf „Public" stellen (im Code sind keine persönlichen Daten – die liegen nur auf deinem Handy) oder Variante B.

Danach ist die App unter `https://<dein-name>.github.io/Calorie-Tracking-App/` erreichbar.

### Variante B: Netlify / Vercel / Cloudflare Pages (kostenlos, auch für private Repos)

Repo verbinden, Build-Befehl `npm run build`, Ausgabeordner `dist`. Fertig.

## Arbeiten mit Claude Code – alles landet automatisch in `main`

Claude-Code-Sitzungen (Web/App) arbeiten technisch immer auf einem eigenen Branch `claude/...`. Damit du nichts manuell mergen oder löschen musst, gibt es `.github/workflows/auto-merge.yml`:

1. Claude pusht auf `claude/...`
2. GitHub Actions führt Tests + Build aus
3. Bei Erfolg wird der Branch automatisch in `main` übernommen und **danach gelöscht**
4. Anschließend wird die App neu veröffentlicht

Schlagen Tests fehl oder gibt es einen Merge-Konflikt, bleibt `main` unverändert und der Lauf wird rot markiert – dann einfach Claude bitten, es zu beheben.

Empfohlene Repo-Einstellungen:
- **Settings → Actions → General → Workflow permissions: „Read and write permissions"** (falls der Auto-Merge mit „permission denied" scheitert)
- **Settings → General → Pull Requests → „Automatically delete head branches"** aktivieren (räumt auch Branches aus Pull Requests auf)

## Hinweis

Nährwerte und Empfehlungen dienen der Orientierung und ersetzen keine ärztliche oder ernährungsmedizinische Beratung. Produktdaten: © Open Food Facts contributors, [ODbL](https://opendatacommons.org/licenses/odbl/1-0/).
