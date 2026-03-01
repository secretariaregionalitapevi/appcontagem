const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function generateIcons() {
    const logoPath = './src/img/logo-ccb-light.png';

    if (!fs.existsSync(logoPath)) {
        console.error('Logo not found:', logoPath);
        return;
    }

    const sizes = [180, 192, 512];

    for (const size of sizes) {
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');

        // Preencher fundo com BRANCO OPACO (sem transparência, essencial pro iOS PWA)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        // Carregar o logo
        const logo = await loadImage(logoPath);

        // Calcular proporção (60% do espaço, como a CCB Agenda)
        const padding = size * 0.2; // 20% de padding de cada lado = logo ocupa 60%
        const logoTargetSize = size - (padding * 2);

        // Manter a proporção nativa do logo
        let logoWidth = logoTargetSize;
        let logoHeight = (logo.height / logo.width) * logoTargetSize;

        // Se a altura ficar maior que o espaço alvo, recalcular baseado na altura
        if (logoHeight > logoTargetSize) {
            logoHeight = logoTargetSize;
            logoWidth = (logo.width / logo.height) * logoTargetSize;
        }

        // Centralizar
        const x = (size - logoWidth) / 2;
        const y = (size - logoHeight) / 2;

        // Desenhar logo por cima do fundo branco
        ctx.drawImage(logo, x, y, logoWidth, logoHeight);

        // Salvar
        const buffer = canvas.toBuffer('image/png');

        // Salvar com nome adequado para PWA/Apple
        const fileName = size === 180 ? 'apple-touch-icon.png' : \`icon-\${size}.png\`;
    const finalPath = \`./public/\${fileName}\`;
    
    fs.writeFileSync(finalPath, buffer);
    console.log(\`✅ Ícone gerado: \${finalPath} (\${size}x\${size}) com fundo branco sólido.\`);
    
    // Também salvar os genéricos
    if (size === 512) {
      fs.writeFileSync('./public/icon.png', buffer);
      console.log(\`✅ Ícone gerado: ./public/icon.png (cópia do 512x512)\`);
        
      fs.writeFileSync('./assets/icon.png', buffer);
    }
  }
}

generateIcons().catch(console.error);
