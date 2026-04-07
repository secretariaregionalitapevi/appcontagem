const fs = require('fs');
const path = 'Ministerio.gs';
let code = fs.readFileSync(path, 'utf8');

const regionais = ['Itapevi', 'Caucaia', 'VargemGrande', 'Fazendinha', 'Pirapora', 'Jandira', 'Cotia'];

for (const reg of regionais) {
  const funcName = 'alimentarAbaMinisterio' + reg;
  const openSheetFunc = 'open' + reg + 'Sheet()';
  
  const startIndex = code.indexOf(`function ${funcName}(`);
  if (startIndex === -1) {
    console.log(`Could not find ${funcName}`);
    continue;
  }
  
  let openBraces = 0;
  let endIndex = -1;
  let hasOpened = false;
  
  for (let i = startIndex; i < code.length; i++) {
    if (code[i] === '{') {
      openBraces++;
      hasOpened = true;
    } else if (code[i] === '}') {
      openBraces--;
    }
    
    if (hasOpened && openBraces === 0) {
      endIndex = i + 1;
      break;
    }
  }
  
  if (endIndex !== -1) {
    const replacement = `function ${funcName}(localEnsaio = '${reg}') {\n  return alimentarAbaMinisterioDestino(localEnsaio, ${openSheetFunc}, '${reg}');\n}`;
    code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
    console.log(`Replaced ${funcName}`);
  }
}

fs.writeFileSync(path, code);
