import type { BaseUnit, Food, Nutrients, Serving } from '../db/types'

/**
 * Built-in database of common generic foods (values per 100 g / 100 ml).
 * Values follow EU labelling conventions (carbohydrates excluding fibre) and are
 * typical averages based on BLS / USDA reference data and common German product labels.
 * Branded products are looked up online via Open Food Facts.
 */

type N = [kcal: number, protein: number, carbs: number, fat: number, sugar?: number, fiber?: number, saturatedFat?: number, salt?: number]

interface BuiltinDef {
  key: string
  name: string
  category: string
  n: N
  servings?: [string, number][]
  unit?: BaseUnit
  aliases?: string
}

const OBST = 'Obst'
const GEMUESE = 'Gemüse'
const BROT = 'Brot & Backwaren'
const GETREIDE = 'Getreide & Beilagen'
const MILCH = 'Milchprodukte'
const KAESE = 'Käse'
const EIER = 'Eier'
const FLEISCH = 'Fleisch & Wurst'
const FISCH = 'Fisch & Meeresfrüchte'
const NUESSE = 'Hülsenfrüchte, Nüsse & Samen'
const FETTE = 'Öle & Fette'
const SNACKS = 'Süßes & Snacks'
const GETRAENKE = 'Getränke'
const SAUCEN = 'Saucen & Aufstriche'
const GERICHTE = 'Gerichte & Fast Food'

const DEFS: BuiltinDef[] = [
  // ---------- Obst ----------
  { key: 'apfel', name: 'Apfel', category: OBST, n: [52, 0.3, 11.4, 0.2, 10.4, 2.4, 0, 0], servings: [['1 Apfel (mittel)', 150]], aliases: 'äpfel' },
  { key: 'banane', name: 'Banane', category: OBST, n: [89, 1.1, 20, 0.3, 12.2, 2.6, 0.1, 0], servings: [['1 Banane (geschält)', 120]] },
  { key: 'birne', name: 'Birne', category: OBST, n: [57, 0.4, 12.1, 0.1, 9.8, 3.1, 0, 0], servings: [['1 Birne', 170]] },
  { key: 'orange', name: 'Orange', category: OBST, n: [47, 0.9, 9.4, 0.1, 9.4, 2.4, 0, 0], servings: [['1 Orange (geschält)', 150]], aliases: 'apfelsine' },
  { key: 'mandarine', name: 'Mandarine', category: OBST, n: [53, 0.8, 11.2, 0.3, 10.6, 1.8, 0, 0], servings: [['1 Mandarine', 70]], aliases: 'clementine' },
  { key: 'erdbeeren', name: 'Erdbeeren', category: OBST, n: [32, 0.7, 5.7, 0.3, 4.9, 2, 0, 0], servings: [['1 Schale', 250], ['1 Handvoll', 100]] },
  { key: 'heidelbeeren', name: 'Heidelbeeren', category: OBST, n: [57, 0.7, 12.1, 0.3, 10, 2.4, 0, 0], servings: [['1 Handvoll', 75]], aliases: 'blaubeeren' },
  { key: 'himbeeren', name: 'Himbeeren', category: OBST, n: [45, 1.2, 5.4, 0.7, 4.4, 6.5, 0, 0], servings: [['1 Handvoll', 75]] },
  { key: 'weintrauben', name: 'Weintrauben', category: OBST, n: [69, 0.7, 16.3, 0.2, 15.5, 0.9, 0.1, 0], servings: [['1 Handvoll', 80]], aliases: 'trauben' },
  { key: 'kiwi', name: 'Kiwi', category: OBST, n: [61, 1.1, 11.7, 0.5, 9, 3, 0, 0], servings: [['1 Kiwi', 75]] },
  { key: 'mango', name: 'Mango', category: OBST, n: [60, 0.8, 13.4, 0.4, 13, 1.6, 0.1, 0], servings: [['1 Mango (Fruchtfleisch)', 300]] },
  { key: 'ananas', name: 'Ananas', category: OBST, n: [50, 0.5, 11.8, 0.1, 9.9, 1.4, 0, 0], servings: [['1 Scheibe', 80]] },
  { key: 'wassermelone', name: 'Wassermelone', category: OBST, n: [30, 0.6, 7.2, 0.2, 6.2, 0.4, 0, 0], servings: [['1 Stück', 300]], aliases: 'melone' },
  { key: 'pfirsich', name: 'Pfirsich', category: OBST, n: [39, 0.9, 8, 0.3, 7.9, 1.5, 0, 0], servings: [['1 Pfirsich', 150]], aliases: 'nektarine' },
  { key: 'kirschen', name: 'Kirschen', category: OBST, n: [63, 1.1, 14, 0.2, 12.8, 2.1, 0, 0], servings: [['1 Handvoll', 100]] },
  { key: 'avocado', name: 'Avocado', category: OBST, n: [160, 2, 1.9, 14.7, 0.7, 6.7, 2.1, 0], servings: [['1/2 Avocado', 70], ['1 Avocado', 140]] },
  { key: 'datteln', name: 'Datteln (getrocknet)', category: OBST, n: [282, 2.5, 67, 0.4, 63, 8, 0, 0], servings: [['1 Dattel', 8]] },
  { key: 'rosinen', name: 'Rosinen', category: OBST, n: [299, 3.1, 75.4, 0.5, 59, 3.7, 0.1, 0], servings: [['1 EL', 15]] },

  // ---------- Gemüse ----------
  { key: 'tomate', name: 'Tomate', category: GEMUESE, n: [18, 0.9, 2.7, 0.2, 2.6, 1.2, 0, 0], servings: [['1 Tomate (mittel)', 120], ['1 Cherrytomate', 15]] },
  { key: 'gurke', name: 'Gurke', category: GEMUESE, n: [15, 0.7, 3.1, 0.1, 1.7, 0.5, 0, 0], servings: [['1 Gurke', 400], ['1 Scheibe', 10]], aliases: 'salatgurke' },
  { key: 'karotte', name: 'Karotte', category: GEMUESE, n: [41, 0.9, 6.8, 0.2, 4.7, 2.8, 0, 0.2], servings: [['1 Karotte', 80]], aliases: 'möhre möhren mohrrübe karotten' },
  { key: 'paprika', name: 'Paprika (rot)', category: GEMUESE, n: [31, 1, 4.2, 0.3, 4, 2.1, 0, 0], servings: [['1 Paprika', 160]], aliases: 'paprikaschote' },
  { key: 'brokkoli', name: 'Brokkoli', category: GEMUESE, n: [34, 2.8, 4, 0.4, 1.7, 2.6, 0, 0], servings: [['1 Portion', 200]], aliases: 'broccoli' },
  { key: 'blumenkohl', name: 'Blumenkohl', category: GEMUESE, n: [25, 1.9, 3, 0.3, 1.9, 2, 0, 0], servings: [['1 Portion', 200]] },
  { key: 'spinat', name: 'Spinat', category: GEMUESE, n: [23, 2.9, 1.4, 0.4, 0.4, 2.2, 0, 0.2], servings: [['1 Portion', 150]], aliases: 'blattspinat' },
  { key: 'salat', name: 'Blattsalat (Kopf-, Eisbergsalat)', category: GEMUESE, n: [14, 0.9, 1.8, 0.1, 1.8, 1.2, 0, 0], servings: [['1 Schüssel', 80]], aliases: 'kopfsalat eisbergsalat rucola feldsalat' },
  { key: 'zucchini', name: 'Zucchini', category: GEMUESE, n: [17, 1.2, 2.1, 0.3, 1.9, 1, 0.1, 0], servings: [['1 Zucchini', 250]] },
  { key: 'champignons', name: 'Champignons', category: GEMUESE, n: [22, 3.1, 2.3, 0.3, 2, 1, 0, 0], servings: [['1 Portion', 100]], aliases: 'pilze' },
  { key: 'zwiebel', name: 'Zwiebel', category: GEMUESE, n: [40, 1.1, 7.6, 0.1, 4.2, 1.7, 0, 0], servings: [['1 Zwiebel', 80]] },
  { key: 'knoblauch', name: 'Knoblauch', category: GEMUESE, n: [149, 6.4, 31, 0.5, 1, 2.1, 0.1, 0], servings: [['1 Zehe', 4]] },
  { key: 'kartoffel', name: 'Kartoffeln (gekocht)', category: GEMUESE, n: [72, 2, 15, 0.1, 0.8, 1.8, 0, 0], servings: [['1 Kartoffel (mittel)', 100], ['1 Portion', 250]], aliases: 'kartoffel salzkartoffeln pellkartoffeln erdäpfel' },
  { key: 'suesskartoffel', name: 'Süßkartoffel (gekocht)', category: GEMUESE, n: [76, 1.4, 15.2, 0.1, 5.7, 2.5, 0, 0.1], servings: [['1 Süßkartoffel', 200]] },
  { key: 'mais', name: 'Mais (Dose, abgetropft)', category: GEMUESE, n: [82, 2.9, 13, 1.2, 3.6, 3, 0.2, 0.3], servings: [['1 Dose (abgetropft)', 140], ['1 EL', 20]] },
  { key: 'erbsen', name: 'Erbsen (tiefgekühlt)', category: GEMUESE, n: [71, 5.4, 9.4, 0.4, 4.5, 5.1, 0.1, 0], servings: [['1 Portion', 150]] },
  { key: 'bohnen-gruen', name: 'Grüne Bohnen', category: GEMUESE, n: [31, 1.8, 4.3, 0.2, 3.3, 2.7, 0, 0], servings: [['1 Portion', 150]], aliases: 'brechbohnen' },
  { key: 'aubergine', name: 'Aubergine', category: GEMUESE, n: [25, 1, 3.2, 0.2, 2.9, 3, 0, 0], servings: [['1 Aubergine', 300]] },

  // ---------- Brot & Backwaren ----------
  { key: 'vollkornbrot', name: 'Vollkornbrot', category: BROT, n: [216, 7, 38, 1.5, 3, 8, 0.3, 1.1], servings: [['1 Scheibe', 50]], aliases: 'schwarzbrot' },
  { key: 'mischbrot', name: 'Roggenmischbrot', category: BROT, n: [220, 6.5, 43, 1.2, 2.5, 5.5, 0.2, 1.2], servings: [['1 Scheibe', 45]], aliases: 'brot graubrot' },
  { key: 'toast', name: 'Toastbrot (Weizen)', category: BROT, n: [260, 8, 48, 3.5, 5, 3, 0.7, 1.2], servings: [['1 Scheibe', 25]], aliases: 'toast' },
  { key: 'vollkorntoast', name: 'Vollkorntoast', category: BROT, n: [250, 9, 42, 4, 4, 6.5, 0.6, 1.1], servings: [['1 Scheibe', 28]] },
  { key: 'broetchen', name: 'Brötchen (Weizen)', category: BROT, n: [270, 9, 53, 1.8, 2.5, 3, 0.4, 1.3], servings: [['1 Brötchen', 55]], aliases: 'semmel schrippe weck' },
  { key: 'vollkornbroetchen', name: 'Vollkornbrötchen', category: BROT, n: [240, 9, 42, 3, 2.5, 7, 0.5, 1.2], servings: [['1 Brötchen', 60]], aliases: 'körnerbrötchen' },
  { key: 'brezel', name: 'Laugenbrezel', category: BROT, n: [275, 8.5, 55, 2, 1, 2.5, 0.4, 2.5], servings: [['1 Brezel', 85]], aliases: 'breze brezn' },
  { key: 'croissant', name: 'Croissant (Butter)', category: BROT, n: [406, 8.2, 45.8, 21, 11, 2.6, 11.7, 0.9], servings: [['1 Croissant', 60]] },
  { key: 'knaeckebrot', name: 'Knäckebrot (Roggen)', category: BROT, n: [330, 9, 60, 1.5, 2, 17, 0.3, 1.1], servings: [['1 Scheibe', 11]] },
  { key: 'reiswaffel', name: 'Reiswaffel', category: BROT, n: [387, 8, 80, 2.8, 0.5, 4, 0.6, 0.2], servings: [['1 Waffel', 8]] },
  { key: 'baguette', name: 'Baguette', category: BROT, n: [270, 8.5, 54, 1.5, 2.5, 2.5, 0.3, 1.4], servings: [['1 Stück', 60]] },
  { key: 'wrap', name: 'Tortilla Wrap (Weizen)', category: BROT, n: [300, 8.5, 50, 7, 2.5, 2.5, 2.5, 1.2], servings: [['1 Wrap', 60]], aliases: 'tortilla' },

  // ---------- Getreide & Beilagen ----------
  { key: 'haferflocken', name: 'Haferflocken', category: GETREIDE, n: [372, 13.5, 58.7, 7, 0.7, 10, 1.3, 0], servings: [['1 Portion', 40], ['1 EL', 10]], aliases: 'hafer porridge oats' },
  { key: 'muesli', name: 'Früchtemüsli (ungezuckert)', category: GETREIDE, n: [360, 10, 60, 6.5, 15, 8.5, 1.2, 0.1], servings: [['1 Portion', 50]], aliases: 'müsli' },
  { key: 'granola', name: 'Knuspermüsli / Granola', category: GETREIDE, n: [450, 8.5, 63, 17, 22, 5.5, 3, 0.2], servings: [['1 Portion', 45]], aliases: 'crunchy müsli' },
  { key: 'cornflakes', name: 'Cornflakes', category: GETREIDE, n: [378, 7, 84, 0.9, 8, 3, 0.2, 1.1], servings: [['1 Portion', 30]] },
  { key: 'reis-gekocht', name: 'Reis (gekocht)', category: GETREIDE, n: [130, 2.7, 28, 0.3, 0.1, 0.4, 0.1, 0], servings: [['1 Portion', 150]], aliases: 'basmati jasmin' },
  { key: 'reis-roh', name: 'Reis (roh)', category: GETREIDE, n: [349, 7, 77.5, 0.6, 0.2, 1.4, 0.2, 0], servings: [['1 Portion', 75]], aliases: 'basmati jasmin' },
  { key: 'vollkornreis-gekocht', name: 'Vollkornreis (gekocht)', category: GETREIDE, n: [120, 2.7, 24, 1, 0.4, 1.6, 0.2, 0], servings: [['1 Portion', 150]], aliases: 'naturreis' },
  { key: 'nudeln-roh', name: 'Nudeln (roh)', category: GETREIDE, n: [357, 12.5, 71, 1.5, 3.5, 3, 0.3, 0], servings: [['1 Portion', 100]], aliases: 'pasta spaghetti penne hartweizen' },
  { key: 'nudeln-gekocht', name: 'Nudeln (gekocht)', category: GETREIDE, n: [149, 5.2, 29.6, 0.6, 0.6, 1.3, 0.1, 0], servings: [['1 Portion', 250]], aliases: 'pasta spaghetti penne' },
  { key: 'vollkornnudeln-roh', name: 'Vollkornnudeln (roh)', category: GETREIDE, n: [345, 14, 62, 2.5, 3, 8, 0.4, 0], servings: [['1 Portion', 100]], aliases: 'vollkornpasta' },
  { key: 'couscous', name: 'Couscous (roh)', category: GETREIDE, n: [360, 12, 72, 1.5, 1, 4, 0.3, 0], servings: [['1 Portion', 70]] },
  { key: 'quinoa', name: 'Quinoa (roh)', category: GETREIDE, n: [368, 14.1, 57.2, 6.1, 1.5, 7, 0.7, 0], servings: [['1 Portion', 60]] },
  { key: 'bulgur', name: 'Bulgur (roh)', category: GETREIDE, n: [340, 12.3, 63.4, 1.3, 0.4, 12.5, 0.2, 0], servings: [['1 Portion', 70]] },
  { key: 'pommes', name: 'Pommes frites (frittiert)', category: GETREIDE, n: [300, 3.4, 38, 14.5, 0.3, 3.8, 2.3, 0.6], servings: [['1 Portion', 150]], aliases: 'fritten' },
  { key: 'kartoffelpueree', name: 'Kartoffelpüree (mit Milch)', category: GETREIDE, n: [95, 2, 13, 3.8, 1.5, 1.3, 2.2, 0.5], servings: [['1 Portion', 200]], aliases: 'kartoffelbrei stampf' },
  { key: 'mehl', name: 'Weizenmehl Type 405', category: GETREIDE, n: [348, 10, 72, 1, 0.5, 3, 0.2, 0], servings: [['1 EL', 10]] },

  // ---------- Milchprodukte ----------
  { key: 'vollmilch', name: 'Vollmilch 3,5 %', category: MILCH, unit: 'ml', n: [64, 3.3, 4.8, 3.5, 4.8, 0, 2.3, 0.1], servings: [['1 Glas', 200], ['1 Schuss', 20]], aliases: 'milch' },
  { key: 'fettarme-milch', name: 'Fettarme Milch 1,5 %', category: MILCH, unit: 'ml', n: [47, 3.4, 4.9, 1.5, 4.9, 0, 1, 0.1], servings: [['1 Glas', 200], ['1 Schuss', 20]], aliases: 'milch' },
  { key: 'hafermilch', name: 'Haferdrink', category: MILCH, unit: 'ml', n: [46, 1, 6.6, 1.5, 4, 0.8, 0.2, 0.1], servings: [['1 Glas', 200], ['1 Schuss', 20]], aliases: 'hafermilch oat' },
  { key: 'sojamilch', name: 'Sojadrink', category: MILCH, unit: 'ml', n: [39, 3, 2.5, 1.8, 2.5, 0.5, 0.3, 0.1], servings: [['1 Glas', 200]], aliases: 'sojamilch' },
  { key: 'mandeldrink', name: 'Mandeldrink (ungesüßt)', category: MILCH, unit: 'ml', n: [13, 0.4, 0, 1.1, 0, 0.4, 0.1, 0.1], servings: [['1 Glas', 200]], aliases: 'mandelmilch' },
  { key: 'joghurt-35', name: 'Naturjoghurt 3,5 %', category: MILCH, n: [65, 3.7, 4.6, 3.5, 4.6, 0, 2.3, 0.1], servings: [['1 Becher', 150], ['1 EL', 20]], aliases: 'joghurt' },
  { key: 'joghurt-15', name: 'Naturjoghurt 1,5 %', category: MILCH, n: [47, 4, 4.8, 1.5, 4.8, 0, 1, 0.1], servings: [['1 Becher', 150], ['1 EL', 20]], aliases: 'joghurt fettarm' },
  { key: 'griechischer-joghurt', name: 'Joghurt griechischer Art 10 %', category: MILCH, n: [120, 3.6, 4, 10, 4, 0, 6.8, 0.1], servings: [['1 Portion', 150], ['1 EL', 20]], aliases: 'greek yogurt' },
  { key: 'skyr', name: 'Skyr natur', category: MILCH, n: [63, 11, 4, 0.2, 4, 0, 0.1, 0.1], servings: [['1 Portion', 150], ['1 Becher', 450]] },
  { key: 'magerquark', name: 'Magerquark', category: MILCH, n: [67, 12, 4, 0.3, 4, 0, 0.2, 0.1], servings: [['1 Becher', 250], ['1 EL', 30]], aliases: 'quark' },
  { key: 'quark-20', name: 'Speisequark 20 %', category: MILCH, n: [109, 12, 3.5, 5, 3.5, 0, 3.2, 0.1], servings: [['1 Becher', 250], ['1 EL', 30]], aliases: 'quark' },
  { key: 'huettenkaese', name: 'Körniger Frischkäse', category: MILCH, n: [98, 12.4, 2, 4.4, 2, 0, 3, 0.8], servings: [['1 Becher', 200]], aliases: 'hüttenkäse cottage cheese' },
  { key: 'frischkaese', name: 'Frischkäse (Doppelrahm)', category: MILCH, n: [225, 5.4, 4, 21.5, 4, 0, 14.5, 0.75], servings: [['1 Portion', 20]] },
  { key: 'sahne', name: 'Schlagsahne 30 %', category: MILCH, n: [287, 2.4, 3.2, 30, 3.2, 0, 20, 0.1], servings: [['1 EL', 15], ['1 Becher', 200]], aliases: 'sahne rahm' },
  { key: 'butter', name: 'Butter', category: MILCH, n: [741, 0.7, 0.6, 82, 0.6, 0, 52, 0], servings: [['1 TL', 5], ['1 Portion (Brot)', 10]] },

  // ---------- Käse ----------
  { key: 'gouda', name: 'Gouda (48 % Fett i. Tr.)', category: KAESE, n: [356, 23.5, 0, 29, 0, 0, 19, 1.8], servings: [['1 Scheibe', 25]], aliases: 'käse' },
  { key: 'emmentaler', name: 'Emmentaler', category: KAESE, n: [380, 28.9, 0, 29.7, 0, 0, 19, 0.4], servings: [['1 Scheibe', 20]], aliases: 'käse' },
  { key: 'mozzarella', name: 'Mozzarella', category: KAESE, n: [245, 18, 1, 19, 1, 0, 13, 0.5], servings: [['1 Kugel', 125]], aliases: 'käse' },
  { key: 'feta', name: 'Feta', category: KAESE, n: [264, 14.2, 4.1, 21.3, 4.1, 0, 15, 2.5], servings: [['1 Portion', 50]], aliases: 'schafskäse hirtenkäse' },
  { key: 'parmesan', name: 'Parmesan', category: KAESE, n: [392, 33, 0, 28.4, 0, 0, 19, 1.6], servings: [['1 EL (gerieben)', 5]], aliases: 'parmigiano grana' },
  { key: 'camembert', name: 'Camembert', category: KAESE, n: [300, 19.8, 0.5, 24.3, 0.5, 0, 15.3, 1.8], servings: [['1 Portion', 30]], aliases: 'brie' },
  { key: 'halloumi', name: 'Halloumi', category: KAESE, n: [320, 21, 2, 25, 1.5, 0, 17, 2.8], servings: [['1 Portion', 100]], aliases: 'grillkäse' },

  // ---------- Eier ----------
  { key: 'ei', name: 'Ei (Hühnerei)', category: EIER, n: [143, 12.6, 0.7, 9.5, 0.4, 0, 3.1, 0.36], servings: [['1 Ei (M)', 55], ['1 Ei (L)', 63]], aliases: 'eier hühnerei gekochtes ei' },
  { key: 'eiklar', name: 'Eiklar', category: EIER, n: [52, 10.9, 0.7, 0.2, 0.7, 0, 0, 0.4], servings: [['1 Eiweiß', 33]], aliases: 'eiweiß' },
  { key: 'spiegelei', name: 'Spiegelei (in Öl gebraten)', category: EIER, n: [196, 13.6, 0.8, 15, 0.4, 0, 4.3, 0.5], servings: [['1 Spiegelei', 50]], aliases: 'rührei' },

  // ---------- Fleisch & Wurst ----------
  { key: 'haehnchenbrust-roh', name: 'Hähnchenbrustfilet (roh)', category: FLEISCH, n: [110, 23.5, 0, 1.5, 0, 0, 0.4, 0.15], servings: [['1 Filet', 150]], aliases: 'hähnchen huhn chicken hühnchen' },
  { key: 'haehnchenbrust-gebraten', name: 'Hähnchenbrust (gebraten)', category: FLEISCH, n: [165, 31, 0, 3.6, 0, 0, 1, 0.2], servings: [['1 Portion', 120]], aliases: 'hähnchen huhn chicken hühnchen' },
  { key: 'putenbrust', name: 'Putenbrust (roh)', category: FLEISCH, n: [105, 24, 0, 1, 0, 0, 0.3, 0.15], servings: [['1 Portion', 150]], aliases: 'pute truthahn' },
  { key: 'rinderhack', name: 'Rinderhackfleisch (roh)', category: FLEISCH, n: [250, 19, 0, 19.5, 0, 0, 8, 0.2], servings: [['1 Packung', 500], ['1 Portion', 125]], aliases: 'hackfleisch hack' },
  { key: 'rinderhack-mager', name: 'Rinderhackfleisch mager 5 % (roh)', category: FLEISCH, n: [125, 21, 0, 4.5, 0, 0, 2, 0.2], servings: [['1 Portion', 125]], aliases: 'hackfleisch hack tatar' },
  { key: 'hack-gemischt', name: 'Hackfleisch gemischt (roh)', category: FLEISCH, n: [260, 17.5, 0, 21, 0, 0, 8.5, 0.2], servings: [['1 Portion', 125]], aliases: 'hackfleisch hack' },
  { key: 'rindersteak', name: 'Rindersteak (Hüfte, roh)', category: FLEISCH, n: [120, 22.5, 0, 3.5, 0, 0, 1.5, 0.15], servings: [['1 Steak', 200]], aliases: 'steak rind' },
  { key: 'schweinefilet', name: 'Schweinefilet (roh)', category: FLEISCH, n: [105, 21.5, 0, 2, 0, 0, 0.7, 0.15], servings: [['1 Portion', 150]], aliases: 'schwein' },
  { key: 'schnitzel', name: 'Schweineschnitzel (roh)', category: FLEISCH, n: [106, 22, 0, 2, 0, 0, 0.7, 0.15], servings: [['1 Schnitzel', 150]], aliases: 'schwein' },
  { key: 'bratwurst', name: 'Bratwurst (gebraten)', category: FLEISCH, n: [300, 15, 1, 26, 0.5, 0, 9.5, 2], servings: [['1 Bratwurst', 100]], aliases: 'wurst rostbratwurst' },
  { key: 'wiener', name: 'Wiener Würstchen', category: FLEISCH, n: [270, 13, 1, 24, 0.5, 0, 9, 2.2], servings: [['1 Würstchen', 50]], aliases: 'würstchen frankfurter wurst' },
  { key: 'salami', name: 'Salami', category: FLEISCH, n: [390, 22, 1, 33, 0.5, 0, 13, 4.5], servings: [['1 Scheibe', 10]], aliases: 'wurst aufschnitt' },
  { key: 'kochschinken', name: 'Kochschinken', category: FLEISCH, n: [107, 19.5, 1, 3, 1, 0, 1, 2.3], servings: [['1 Scheibe', 20]], aliases: 'schinken aufschnitt' },
  { key: 'putenaufschnitt', name: 'Putenbrust-Aufschnitt', category: FLEISCH, n: [100, 20.5, 1, 1.5, 1, 0, 0.5, 2], servings: [['1 Scheibe', 20]], aliases: 'aufschnitt pute' },
  { key: 'leberwurst', name: 'Leberwurst', category: FLEISCH, n: [310, 14, 1, 28, 0.5, 0, 11, 2], servings: [['1 Portion', 20]], aliases: 'wurst' },

  // ---------- Fisch ----------
  { key: 'lachs', name: 'Lachs (roh)', category: FISCH, n: [200, 20, 0, 13.5, 0, 0, 3.1, 0.15], servings: [['1 Filet', 125]], aliases: 'lachsfilet' },
  { key: 'raeucherlachs', name: 'Räucherlachs', category: FISCH, n: [180, 22, 0, 10, 0, 0, 2, 3], servings: [['1 Scheibe', 20], ['1 Packung', 100]], aliases: 'lachs' },
  { key: 'thunfisch-saft', name: 'Thunfisch im eigenen Saft (abgetropft)', category: FISCH, n: [110, 25.5, 0, 0.9, 0, 0, 0.3, 1], servings: [['1 Dose (abgetropft)', 140]], aliases: 'thunfisch' },
  { key: 'thunfisch-oel', name: 'Thunfisch in Öl (abgetropft)', category: FISCH, n: [198, 29, 0, 8.2, 0, 0, 1.5, 0.9], servings: [['1 Dose (abgetropft)', 140]], aliases: 'thunfisch' },
  { key: 'kabeljau', name: 'Kabeljau / Seelachs (roh)', category: FISCH, n: [80, 18, 0, 0.8, 0, 0, 0.1, 0.2], servings: [['1 Filet', 150]], aliases: 'dorsch fischfilet' },
  { key: 'garnelen', name: 'Garnelen (gekocht)', category: FISCH, n: [99, 24, 0.2, 0.3, 0, 0, 0.1, 0.6], servings: [['1 Portion', 100]], aliases: 'shrimps krabben' },
  { key: 'fischstaebchen', name: 'Fischstäbchen (zubereitet)', category: FISCH, n: [200, 13, 17, 8.5, 0.8, 0.8, 0.8, 0.8], servings: [['1 Stäbchen', 30]] },

  // ---------- Hülsenfrüchte, Nüsse & Samen ----------
  { key: 'linsen-roh', name: 'Rote Linsen (roh)', category: NUESSE, n: [339, 24.6, 52, 1.1, 2, 10.8, 0.2, 0], servings: [['1 Portion', 60]], aliases: 'linsen' },
  { key: 'linsen-gekocht', name: 'Linsen (gekocht)', category: NUESSE, n: [116, 9, 16.5, 0.4, 1.8, 7.9, 0.1, 0], servings: [['1 Portion', 200]], aliases: 'linsen' },
  { key: 'kichererbsen', name: 'Kichererbsen (Dose, abgetropft)', category: NUESSE, n: [117, 7, 14, 2.5, 0.3, 5.5, 0.3, 0.5], servings: [['1 Dose (abgetropft)', 240]] },
  { key: 'kidneybohnen', name: 'Kidneybohnen (Dose, abgetropft)', category: NUESSE, n: [94, 6.5, 12.5, 0.5, 1, 6.5, 0.1, 0.5], servings: [['1 Dose (abgetropft)', 250]], aliases: 'bohnen' },
  { key: 'tofu', name: 'Tofu natur', category: NUESSE, n: [125, 13, 1.5, 7.5, 0.5, 0.5, 1.2, 0], servings: [['1 Packung', 200], ['1 Portion', 100]] },
  { key: 'erdnuesse', name: 'Erdnüsse (geröstet)', category: NUESSE, n: [600, 25, 12, 50, 4, 8, 7, 0], servings: [['1 Handvoll', 30]] },
  { key: 'erdnussbutter', name: 'Erdnussbutter (100 % Erdnüsse)', category: NUESSE, n: [617, 26, 12, 50, 5, 7.5, 8, 0], servings: [['1 EL', 15], ['1 TL', 6]], aliases: 'erdnussmus peanut butter' },
  { key: 'mandeln', name: 'Mandeln', category: NUESSE, n: [596, 21, 7, 51, 4.4, 12.5, 3.9, 0], servings: [['1 Handvoll', 30]] },
  { key: 'walnuesse', name: 'Walnüsse', category: NUESSE, n: [687, 15.2, 7, 65, 2.6, 6.7, 6.1, 0], servings: [['1 Handvoll', 30]] },
  { key: 'cashews', name: 'Cashewkerne', category: NUESSE, n: [592, 18, 29.4, 44, 5.9, 3.3, 7.8, 0], servings: [['1 Handvoll', 30]], aliases: 'cashew' },
  { key: 'chiasamen', name: 'Chiasamen', category: NUESSE, n: [443, 16.5, 7.7, 30.7, 0, 34.4, 3.3, 0], servings: [['1 EL', 10]], aliases: 'chia' },
  { key: 'leinsamen', name: 'Leinsamen', category: NUESSE, n: [514, 18.3, 1.6, 42.2, 1.6, 27.3, 3.7, 0.1], servings: [['1 EL', 10]] },
  { key: 'sonnenblumenkerne', name: 'Sonnenblumenkerne', category: NUESSE, n: [609, 20.8, 11.4, 51.5, 2.6, 8.6, 4.5, 0], servings: [['1 EL', 10], ['1 Handvoll', 25]] },

  // ---------- Öle & Fette ----------
  { key: 'olivenoel', name: 'Olivenöl', category: FETTE, n: [884, 0, 0, 100, 0, 0, 14, 0], servings: [['1 EL', 12], ['1 TL', 4]], aliases: 'öl' },
  { key: 'rapsoel', name: 'Rapsöl', category: FETTE, n: [884, 0, 0, 100, 0, 0, 7.4, 0], servings: [['1 EL', 12], ['1 TL', 4]], aliases: 'öl speiseöl' },
  { key: 'kokosoel', name: 'Kokosöl', category: FETTE, n: [884, 0, 0, 100, 0, 0, 87, 0], servings: [['1 EL', 12], ['1 TL', 4]], aliases: 'öl kokosfett' },
  { key: 'margarine', name: 'Margarine (70 %)', category: FETTE, n: [630, 0.2, 0.5, 70, 0.5, 0, 20, 0.3], servings: [['1 Portion (Brot)', 10]] },
  { key: 'mayonnaise', name: 'Mayonnaise (80 %)', category: FETTE, n: [710, 1.1, 1.5, 78, 1.3, 0, 6, 1.1], servings: [['1 EL', 15]], aliases: 'mayo' },

  // ---------- Süßes & Snacks ----------
  { key: 'vollmilchschokolade', name: 'Vollmilchschokolade', category: SNACKS, n: [539, 6.3, 59, 29.5, 58, 1.5, 18, 0.37], servings: [['1 Stück', 4], ['1 Riegel (4 Stück)', 17], ['1 Tafel', 100]], aliases: 'schokolade' },
  { key: 'zartbitter', name: 'Zartbitterschokolade 70 %', category: SNACKS, n: [566, 9.5, 34, 41, 29, 11, 24, 0.02], servings: [['1 Stück', 10], ['1 Tafel', 100]], aliases: 'schokolade dunkle' },
  { key: 'gummibaerchen', name: 'Fruchtgummi / Gummibärchen', category: SNACKS, n: [343, 6.9, 77, 0.5, 46, 0, 0.1, 0.07], servings: [['1 Handvoll', 25]], aliases: 'gummibären süßigkeiten' },
  { key: 'chips', name: 'Kartoffelchips (gesalzen)', category: SNACKS, n: [531, 6.5, 52, 32, 0.5, 4.5, 3, 1.3], servings: [['1 Portion', 30], ['1 Tüte', 175]] },
  { key: 'salzstangen', name: 'Salzstangen', category: SNACKS, n: [385, 10, 76, 3.5, 2, 3.5, 0.4, 3.8], servings: [['1 Portion', 30]], aliases: 'salzbrezeln' },
  { key: 'butterkekse', name: 'Butterkekse', category: SNACKS, n: [440, 7.5, 73, 13, 22, 2.3, 8, 0.8], servings: [['1 Keks', 8]], aliases: 'kekse' },
  { key: 'vanilleeis', name: 'Vanilleeis', category: SNACKS, n: [200, 3.5, 24, 10, 21, 0, 6.5, 0.2], servings: [['1 Kugel', 50]], aliases: 'eis eiscreme' },
  { key: 'apfelkuchen', name: 'Apfelkuchen', category: SNACKS, n: [250, 3.5, 33, 11.5, 18, 1.5, 6, 0.3], servings: [['1 Stück', 120]], aliases: 'kuchen' },
  { key: 'nuss-nougat-creme', name: 'Nuss-Nougat-Creme', category: SNACKS, n: [539, 6.3, 57.5, 30.9, 56.3, 0, 10.6, 0.1], servings: [['1 TL', 7], ['1 Portion', 15]], aliases: 'schokocreme' },
  { key: 'honig', name: 'Honig', category: SNACKS, n: [327, 0.4, 81, 0, 80, 0, 0, 0], servings: [['1 TL', 8], ['1 EL', 20]] },
  { key: 'marmelade', name: 'Konfitüre / Marmelade', category: SNACKS, n: [245, 0.4, 60, 0.1, 58, 0.8, 0, 0], servings: [['1 Portion', 20]], aliases: 'konfitüre' },
  { key: 'zucker', name: 'Zucker', category: SNACKS, n: [400, 0, 100, 0, 100, 0, 0, 0], servings: [['1 TL', 4], ['1 Stück Würfelzucker', 3], ['1 EL', 12]] },
  { key: 'muesliriegel', name: 'Müsliriegel', category: SNACKS, n: [416, 6, 64, 14, 30, 5, 4, 0.3], servings: [['1 Riegel', 25]] },
  { key: 'proteinriegel', name: 'Proteinriegel', category: SNACKS, n: [380, 33, 30, 12, 4, 10, 6, 0.5], servings: [['1 Riegel', 50]] },

  // ---------- Getränke ----------
  { key: 'kaffee', name: 'Kaffee (schwarz)', category: GETRAENKE, unit: 'ml', n: [2, 0.1, 0, 0, 0, 0, 0, 0], servings: [['1 Tasse', 200], ['1 Espresso', 30]], aliases: 'espresso filterkaffee americano' },
  { key: 'cappuccino', name: 'Cappuccino (Vollmilch)', category: GETRAENKE, unit: 'ml', n: [38, 2, 3, 2, 3, 0, 1.3, 0.1], servings: [['1 Tasse', 200]], aliases: 'kaffee mit milch' },
  { key: 'latte', name: 'Latte Macchiato (Vollmilch)', category: GETRAENKE, unit: 'ml', n: [48, 2.7, 4, 2.4, 4, 0, 1.5, 0.1], servings: [['1 Glas', 300]], aliases: 'milchkaffee caffe latte' },
  { key: 'orangensaft', name: 'Orangensaft', category: GETRAENKE, unit: 'ml', n: [43, 0.7, 9.6, 0.1, 9, 0.2, 0, 0], servings: [['1 Glas', 200]], aliases: 'o-saft saft' },
  { key: 'apfelsaft', name: 'Apfelsaft', category: GETRAENKE, unit: 'ml', n: [46, 0.1, 11, 0.1, 10.5, 0, 0, 0], servings: [['1 Glas', 200]], aliases: 'saft' },
  { key: 'apfelschorle', name: 'Apfelschorle', category: GETRAENKE, unit: 'ml', n: [24, 0, 5.5, 0, 5.3, 0, 0, 0], servings: [['1 Glas', 250], ['1 Flasche', 500]], aliases: 'schorle saftschorle' },
  { key: 'cola', name: 'Cola', category: GETRAENKE, unit: 'ml', n: [42, 0, 10.6, 0, 10.6, 0, 0, 0], servings: [['1 Dose', 330], ['1 Flasche', 500]], aliases: 'softdrink limo' },
  { key: 'cola-zero', name: 'Cola Zero / Light', category: GETRAENKE, unit: 'ml', n: [0.3, 0, 0, 0, 0, 0, 0, 0], servings: [['1 Dose', 330], ['1 Flasche', 500]], aliases: 'cola light zero' },
  { key: 'energydrink', name: 'Energy Drink', category: GETRAENKE, unit: 'ml', n: [46, 0, 11, 0, 11, 0, 0, 0.2], servings: [['1 Dose', 250]] },
  { key: 'bier', name: 'Bier (Pils)', category: GETRAENKE, unit: 'ml', n: [42, 0.5, 3, 0, 0, 0, 0, 0], servings: [['1 Flasche (0,5 l)', 500], ['1 Flasche (0,33 l)', 330]], aliases: 'pils helles' },
  { key: 'weisswein', name: 'Weißwein (trocken)', category: GETRAENKE, unit: 'ml', n: [70, 0.1, 0.6, 0, 0.6, 0, 0, 0], servings: [['1 Glas', 200]], aliases: 'wein' },
  { key: 'rotwein', name: 'Rotwein (trocken)', category: GETRAENKE, unit: 'ml', n: [72, 0.1, 0.6, 0, 0.6, 0, 0, 0], servings: [['1 Glas', 200]], aliases: 'wein' },
  { key: 'whey', name: 'Whey-Proteinpulver', category: GETRAENKE, n: [380, 78, 6, 5, 4, 0, 3, 0.5], servings: [['1 Messlöffel', 30]], aliases: 'protein eiweißpulver shake' },

  // ---------- Saucen & Aufstriche ----------
  { key: 'ketchup', name: 'Tomatenketchup', category: SAUCEN, n: [102, 1.2, 23.2, 0.1, 22.8, 0, 0, 1.8], servings: [['1 EL', 15]], aliases: 'ketchup' },
  { key: 'senf', name: 'Senf (mittelscharf)', category: SAUCEN, n: [85, 5.5, 5, 4.5, 3, 0, 0.3, 3.5], servings: [['1 TL', 5]] },
  { key: 'pesto', name: 'Pesto Genovese', category: SAUCEN, n: [476, 5, 6, 48, 4, 0, 6, 3], servings: [['1 EL', 15], ['1 Portion', 50]] },
  { key: 'passata', name: 'Passierte Tomaten', category: SAUCEN, n: [27, 1.3, 4.5, 0.2, 4, 1.2, 0, 0.1], servings: [['1 Portion', 150]], aliases: 'tomatensauce passata' },
  { key: 'hummus', name: 'Hummus', category: SAUCEN, n: [298, 7, 11, 24, 0.5, 5, 2.5, 1], servings: [['1 EL', 20], ['1 Portion', 50]] },

  // ---------- Gerichte ----------
  { key: 'pizza-margherita', name: 'Pizza Margherita', category: GERICHTE, n: [236, 10, 30, 8, 3, 2, 3.5, 1.2], servings: [['1 Pizza', 350], ['1 Stück (1/8)', 45]], aliases: 'pizza' },
  { key: 'doener', name: 'Döner Kebab im Brot', category: GERICHTE, n: [215, 12, 20, 9.5, 2.5, 1.5, 3.5, 1.3], servings: [['1 Döner', 350]], aliases: 'kebap kebab' },
  { key: 'currywurst', name: 'Currywurst mit Sauce', category: GERICHTE, n: [229, 10, 9, 17, 8, 0.5, 6.5, 2], servings: [['1 Portion', 200]] },
  { key: 'cheeseburger', name: 'Cheeseburger', category: GERICHTE, n: [255, 13, 27, 10.5, 6, 1.6, 4.8, 1.7], servings: [['1 Burger', 120]], aliases: 'burger hamburger' },
  { key: 'spaghetti-bolognese', name: 'Spaghetti Bolognese', category: GERICHTE, n: [143, 7, 18, 4.5, 3, 1.5, 1.6, 0.6], servings: [['1 Teller', 400]], aliases: 'nudeln bolognese' },
  { key: 'lasagne', name: 'Lasagne', category: GERICHTE, n: [162, 8, 14, 8, 3, 1, 3.8, 0.8], servings: [['1 Portion', 350]] },
  { key: 'sushi', name: 'Sushi (gemischt)', category: GERICHTE, n: [150, 6, 28, 1.5, 5, 0.5, 0.3, 1], servings: [['1 Stück', 30]], aliases: 'maki nigiri' },
]

function toNutrients(n: N): Nutrients {
  const [kcal, protein, carbs, fat, sugar, fiber, saturatedFat, salt] = n
  const out: Nutrients = { kcal, protein, carbs, fat }
  if (sugar !== undefined) out.sugar = sugar
  if (fiber !== undefined) out.fiber = fiber
  if (saturatedFat !== undefined) out.saturatedFat = saturatedFat
  if (salt !== undefined) out.salt = salt
  return out
}

export interface BuiltinFood extends Food {
  sourceKey: string
  aliases: string
}

export const BUILTIN_FOODS: BuiltinFood[] = DEFS.map((d) => ({
  source: 'builtin',
  sourceKey: d.key,
  name: d.name,
  category: d.category,
  baseUnit: d.unit ?? 'g',
  per100: toNutrients(d.n),
  servings: (d.servings ?? []).map(([label, amount]): Serving => ({ label, amount })),
  aliases: d.aliases ?? '',
  createdAt: 0,
}))

export const BUILTIN_CATEGORIES = Array.from(new Set(DEFS.map((d) => d.category)))

const byKey = new Map(BUILTIN_FOODS.map((f) => [f.sourceKey, f]))

export function getBuiltinFood(key: string): BuiltinFood | undefined {
  return byKey.get(key)
}
