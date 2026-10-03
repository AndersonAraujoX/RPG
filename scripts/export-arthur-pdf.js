/**
 * @file export-arthur-pdf.js
 * @description Script de exportação da ficha do Arthur (obtida do Firebase Firestore) para PDF.
 */

const path = require('path');
const fs = require('fs');
const PDFSheetGenerator = require('../src/modules/pdf-sheet-generator');

async function main() {
    const dataPath = path.join(__dirname, '../data/arthur_character_data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('Arquivo de dados do Arthur não encontrado em:', dataPath);
        process.exit(1);
    }

    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const outputPath = path.join(__dirname, '../Ficha_Arthur.pdf');

    console.log('Gerando PDF da Ficha do Arthur a partir dos dados do Firebase Firestore...');
    const result = await PDFSheetGenerator.generatePDF(rawData, outputPath);

    console.log('✅ PDF gerado com sucesso!');
    console.log(`Caminho: ${result.outputPath}`);
    console.log(`Tamanho: ${(result.fileSize / 1024).toFixed(1)} KB`);
}

main().catch(err => {
    console.error('Erro ao gerar PDF:', err);
    process.exit(1);
});
