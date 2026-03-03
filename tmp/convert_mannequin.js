const fs = require('fs');
const path = require('path');

const imagePath = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\e3378791-dd25-4516-a497-7b163b1f4549\\mannequin_base_sculptural_1772551511458.png';
const outputPath = path.resolve('c:\\Users\\USER\\.gemini\\antigravity\\playground\\prograde-quasar\\server\\assets\\MannequinBase.ts');

if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}

const data = fs.readFileSync(imagePath);
const base64 = data.toString('base64');

const content = `export const MANNEQUIN_BASE_64 = '${base64}';\n`;
fs.writeFileSync(outputPath, content);
console.log('✅ MannequinBase.ts created successfully at', outputPath);
