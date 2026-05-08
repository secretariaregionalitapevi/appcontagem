
const XLSX = require('xlsx');
const path = 'D:/BACKUP GERAL/CCB - SECRETARIA MUSICAL/REGIONAL ITAPEVI/IGREJAS REGIONAL ITAPEVI.xlsx';

try {
  const workbook = XLSX.readFile(path);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log('Sheet Name:', sheetName);
  console.log('Total Rows:', data.length);
  console.log('Headers:', Object.keys(data[0] || {}));
  console.log('Sample Data (First 3 rows):');
  console.log(JSON.stringify(data.slice(0, 3), null, 2));
} catch (error) {
  console.error('Error reading Excel:', error.message);
}
