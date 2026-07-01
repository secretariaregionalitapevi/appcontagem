const fs = require('fs');
const path = require('path');

function repairFile(filePath) {
  console.log(`Reading file: ${filePath}`);
  const contentBuffer = fs.readFileSync(filePath);
  
  // Convert buffer to string assuming ISO-8859-1 (or binary) to check for double UTF-8
  const contentStr = contentBuffer.toString('binary');
  
  // Try to decode as UTF-8 from binary representation to fix double UTF-8 encoding
  try {
    const repaired = Buffer.from(contentStr, 'binary').toString('utf8');
    
    // Check if it has double-encoded patterns like Ã§ or Ã£
    if (repaired.includes('Ã§') || repaired.includes('Ã£') || repaired.includes('Ã©') || repaired.includes('Ã³') || repaired.includes('Ã')) {
      console.log("File still contains double-encoded characters. Attempting secondary decode...");
      // Let's do a replace of common double-encoded UTF-8 characters to clean UTF-8
      let fixedStr = contentBuffer.toString('utf8');
      
      const replacements = {
        'Ã§': 'ç',
        'Ã': 'Ç',
        'ÃÃfO': 'ÇÃO',
        'Ã‡Ã': 'ÇÃ',
        'Ã‡': 'Ç',
        'Ã': 'Ã',
        'Ã£': 'ã',
        'ÃÃ': 'ÇÃ',
        'Ã': 'É',
        'Ã‰': 'É',
        'Ã³': 'ó',
        'Ã²': 'ò',
        'Ãª': 'ê',
        'Ã¡': 'á',
        'Ã­': 'í',
        'Ãº': 'ú',
        'Ã¢': 'â',
        'Ã´': 'ô',
        'Ãµ': 'õ',
        'Ã•': 'Õ',
        'Ã€': 'À',
        'Ã ': 'à',
        'Ã‘': 'Ñ',
        'Ã±': 'ñ',
        'Ã¼': 'ü',
        'Ã¶': 'ö',
        'Ã': 'ß',
        'Ã³': 'ó',
        'Ã³': 'ó',
        'Ã': 'Ã',
        'Ã': 'Ç',
        'ÃƒÂ§': 'ç',
        'ÃƒÂ£': 'ã',
        'ÃƒÂ©': 'é',
        'ÃƒÂ³': 'ó',
        'ÃƒÂ': 'Ç',
        'ÃƒÂ': 'Ã',
        'Ãƒâ§': 'ç',
        'Ãƒâ£': 'ã',
        'Ãƒâ©': 'é',
        'Ãƒâ³': 'ó',
        'Ãƒâ': 'Ç',
        'Ãƒâ': 'Ã',
        'ÃÃ': 'ÇÃO',
      };
      
      for (const [key, value] of Object.entries(replacements)) {
        fixedStr = fixedStr.split(key).join(value);
      }
      
      fs.writeFileSync(filePath, fixedStr, 'utf8');
      console.log(`Successfully repaired file with replacements: ${filePath}`);
    } else {
      // The file was indeed double encoded UTF-8. Let's write the repaired string as UTF-8.
      fs.writeFileSync(filePath, repaired, 'utf8');
      console.log(`Successfully repaired double UTF-8 encoding for: ${filePath}`);
    }
  } catch (err) {
    console.error(`Error repairing ${filePath}:`, err);
  }
}

// Let's test on RegisterScreen.tsx first
const registerScreenPath = path.join(__dirname, '..', 'src', 'screens', 'RegisterScreen.tsx');
const controllerPath = path.join(__dirname, '..', 'src', 'hooks', 'useRegisterController.ts');
const servicePath = path.join(__dirname, '..', 'src', 'services', 'supabaseDataService.ts');

repairFile(registerScreenPath);
repairFile(controllerPath);
repairFile(servicePath);
