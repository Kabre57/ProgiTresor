const XLSX = require('xlsx');
const path = require('path');

const filePath = '/home/hp/Documents/Projet/ProgiTresor/extraction/output/NOMENCLATURE_COMPLETE_AVEC_TYPES.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Sheets found:', workbook.SheetNames);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  console.log('First 5 rows:');
  console.log(rows.slice(0, 5));
} catch (err) {
  console.error('Error:', err.message);
}
