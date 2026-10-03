/**
 * @file pdf-sheet-generator.test.js
 * @description Suíte de testes unitários para o gerador de fichas em PDF/HTML.
 * Segue estritamente a metodologia Arrange-Act-Assert (AAA).
 * Cobre: caminho feliz com os dados reais do Arthur (Firestore), casos de borda e tratamento de erros.
 */

const QUnit = require('qunit');
const path = require('path');
const fs = require('fs');
const PDFSheetGenerator = require('../src/modules/pdf-sheet-generator.js');

QUnit.module('Gerador de Ficha em PDF e HTML (PDFSheetGenerator)', function () {

    // Fixture com os dados do Arthur extraídos diretamente do Firestore
    const arthurFixture = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../data/arthur_character_data.json'), 'utf8')
    );

    // =========================================================================
    // 1. CAMINHO FELIZ (FLUXO PRINCIPAL COM DADOS DO ARTHUR)
    // =========================================================================

    QUnit.test('1. Caminho Feliz: Normalização dos dados do Arthur do Firestore (AAA)', function (assert) {
        // Arrange
        const rawArthur = arthurFixture;

        // Act
        const normalized = PDFSheetGenerator.normalizeCharacterData(rawArthur);

        // Assert
        assert.equal(normalized.name, 'Arthur', 'Nome deve ser Arthur');
        assert.equal(normalized.charClass, 'mago/marinheiro', 'Classe correta');
        assert.equal(normalized.charRace, 'humano', 'Raça correta');
        assert.equal(normalized.tradition, 'POD', 'Tradição Mágica deve ser POD');
        assert.equal(normalized.conjurAttrKey, 'POD', 'Atributo de conjuração mapeado para POD');
        assert.equal(normalized.attributes.CON, 4, 'CON deve ser 4');
        assert.equal(normalized.attributes.POD, 5, 'POD deve ser 5');

        // Recursos:
        // Base PV: (CON * 2) + 10 = (4 * 2) + 10 = 18
        // Vantagem "Duro de matar" (+6 PVs extras) -> Bonus: 6
        // Total PV Máximo: 24
        assert.equal(normalized.resources.basePV, 18, 'Base PV deve ser 18');
        assert.equal(normalized.resources.bonusPV, 6, 'Bônus de PV da vantagem Duro de Matar deve ser 6');
        assert.equal(normalized.resources.maxPV, 24, 'PV Máximo calculado deve ser 24 (18 base + 6 bônus)');

        // Base PE: POD (5) + CON (4) + 10 = 19
        // Bônus PE: 0
        // Total PE Máximo: 19
        assert.equal(normalized.resources.basePE, 19, 'Base PE deve ser 19');
        assert.equal(normalized.resources.bonusPE, 0, 'Bônus de PE deve ser 0');
        assert.equal(normalized.resources.maxPE, 19, 'PE Máximo calculado deve ser 19');

        // Perícias
        assert.equal(normalized.pericias.length, 4, 'Arthur possui 4 perícias treinadas');
        const erudicao = normalized.pericias.find(p => p.nome === 'Erudição');
        assert.ok(erudicao, 'Perícia Erudição existe');
        assert.equal(erudicao.atributo, 'INT', 'Erudição é baseada em INT');
        assert.equal(erudicao.valor, 3, 'Treinamento de Erudição é 3');
        assert.equal(erudicao.totalMod, 4, 'Total de Erudição é INT(1) + 3 = 4');

        // Vantagens e Magias
        assert.equal(normalized.vantagens.length, 1, '1 Vantagem registrada');
        assert.equal(normalized.desvantagens.length, 2, '2 Desvantagens registradas');
        assert.equal(normalized.caminhosMagia.length, 2, '2 Caminhos de magia (Água e Arkanum)');
    });

    QUnit.test('2. Caminho Feliz: Desembrulho recursivo de documento Firestore REST (AAA)', function (assert) {
        // Arrange
        const firestoreRestPayload = {
            fields: {
                charName: { stringValue: 'Arthur' },
                con: { stringValue: '4' },
                pod: { stringValue: '5' },
                pericias: {
                    arrayValue: {
                        values: [
                            {
                                mapValue: {
                                    fields: {
                                        nome: { stringValue: 'Navegador' },
                                        valor: { integerValue: '2' },
                                        atributo: { stringValue: 'INT' }
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        };

        // Act
        const unwrapped = PDFSheetGenerator.unwrapFirestoreValue(firestoreRestPayload);

        // Assert
        assert.equal(unwrapped.fields.charName, 'Arthur', 'String desembrulhada');
        assert.equal(unwrapped.fields.con, '4', 'Atributo desembrulhado');
        assert.equal(unwrapped.fields.pericias[0].nome, 'Navegador', 'Array e Map recursivamente desembrulhados');
        assert.equal(unwrapped.fields.pericias[0].valor, 2, 'Inteiro convertido para número');
    });

    QUnit.test('3. Caminho Feliz: Geração de HTML estruturado para impressão (AAA)', function (assert) {
        // Arrange
        const rawArthur = arthurFixture;

        // Act
        const html = PDFSheetGenerator.generateHTML(rawArthur);

        // Assert
        assert.ok(typeof html === 'string', 'Retorna string HTML');
        assert.ok(html.includes('Arthur'), 'Contém o nome Arthur');
        assert.ok(html.includes('mago/marinheiro'), 'Contém a classe mago/marinheiro');
        assert.ok(html.includes('Duro de matar'), 'Contém a vantagem Duro de matar');
        assert.ok(html.includes('Claustrofobia'), 'Contém desvantagem Claustrofobia');
        assert.ok(html.includes('Magia (Água)'), 'Contém Magia da Água');
        assert.ok(html.includes('Magia (Arkanum)'), 'Contém Magia Arkanum');
        assert.ok(html.includes('@page {'), 'Contém regras de página A4 para impressão');
    });

    // =========================================================================
    // 2. CASOS DE BORDA (EDGE CASES)
    // =========================================================================

    QUnit.test('4. Casos de Borda: Ficha com dados mínimos / coleções vazias (AAA)', function (assert) {
        // Arrange
        const minimalData = {
            charName: 'Viajante Sem Nome',
            for: 2,
            con: 2
            // demais campos ausentes
        };

        // Act
        const normalized = PDFSheetGenerator.normalizeCharacterData(minimalData);

        // Assert
        assert.equal(normalized.name, 'Viajante Sem Nome', 'Nome preservado');
        assert.equal(normalized.charClass, 'Aventureiro', 'Classe fallback atribuída');
        assert.equal(normalized.charRace, 'Humano', 'Raça fallback atribuída');
        assert.equal(normalized.tradition, 'INT', 'Tradição fallback INT');
        assert.equal(normalized.resources.maxPV, 14, 'PV calculado corretamente (2*2+10)');
        assert.equal(normalized.resources.maxPE, 13, 'PE calculado corretamente (1+2+10)');
        assert.equal(normalized.pericias.length, 0, 'Perícias vazias tratadas como array vazio');
        assert.equal(normalized.vantagens.length, 0, 'Vantagens vazias tratadas como array vazio');
    });

    QUnit.test('5. Casos de Borda: Bônus manuais de PV e PE explícitos (AAA)', function (assert) {
        // Arrange
        const sheetWithManualBonus = {
            charName: 'Guerreiro Forte',
            con: 3,
            tradicaoMagica: 'POD',
            pod: 2,
            bonusPV: 5,
            bonusPE: 3
        };

        // Act
        const normalized = PDFSheetGenerator.normalizeCharacterData(sheetWithManualBonus);

        // Assert
        // PV: (3 * 2) + 10 + 5 = 21
        assert.equal(normalized.resources.basePV, 16, 'Base PV é 16');
        assert.equal(normalized.resources.bonusPV, 5, 'Bônus PV é 5');
        assert.equal(normalized.resources.maxPV, 21, 'Total PV é 21');

        // PE: 2 + 3 + 10 + 3 = 18
        assert.equal(normalized.resources.basePE, 15, 'Base PE é 15');
        assert.equal(normalized.resources.bonusPE, 3, 'Bônus PE é 3');
        assert.equal(normalized.resources.maxPE, 18, 'Total PE é 18');
    });

    // =========================================================================
    // 3. TRATAMENTO DE EXCEÇÕES E ERROS
    // =========================================================================

    QUnit.test('6. Tratamento de Exceções: Entrada nula ou indefinida deve lançar erro (AAA)', function (assert) {
        // Arrange
        const nullInput = null;

        // Act & Assert
        assert.throws(
            () => { PDFSheetGenerator.normalizeCharacterData(nullInput); },
            /Dados de personagem não fornecidos/,
            'Deve lançar erro explicativo para entrada nula'
        );
    });

    QUnit.test('7. Geração de PDF via Headless Browser (AAA)', async function (assert) {
        // Arrange
        const outputPath = path.join(__dirname, '../Ficha_Arthur_Test.pdf');

        // Act
        const result = await PDFSheetGenerator.generatePDF(arthurFixture, outputPath);

        // Assert
        assert.ok(result.success, 'PDF gerado com sucesso');
        assert.ok(fs.existsSync(outputPath), 'Arquivo PDF físico existe');
        assert.ok(result.fileSize > 5000, 'Arquivo PDF possui tamanho válido (> 5KB)');

        // Clean-up do teste
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
    });
});
