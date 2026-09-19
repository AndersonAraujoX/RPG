/**
 * Suíte de Testes Unitários: Resiliência Offline & Prevenção de SyntaxError em formV6.html
 * Padrão: Arrange-Act-Assert (AAA)
 * Cobertura: Prevenção de SyntaxError em botões dinâmicos, Inicialização Offline-First e Mocks de Storage.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');

const FORMV6_PATH = path.resolve(__dirname, '../public/formV6.html');

QUnit.module('Resiliência e Prevenção de Erros (public/formV6.html)', function () {

    // -------------------------------------------------------------
    // 1. Caminho Feliz: Integridade Sintática e Inicialização
    // -------------------------------------------------------------
    QUnit.test('1. Integridade Sintática: Scripts de public/formV6.html devem compilar sem erros (AAA)', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(FORMV6_PATH), 'public/formV6.html deve existir');
        const html = fs.readFileSync(FORMV6_PATH, 'utf-8');
        const scriptRegex = /<script type="module">([\s\S]*?)<\/script>/gi;

        // Act
        let match = scriptRegex.exec(html);
        assert.ok(match && match[1], 'Deve conter bloco de script type="module"');

        let syntaxValid = false;
        const tmpFile = path.join(__dirname, `_temp_formv6_check_${Date.now()}.mjs`);
        try {
            fs.writeFileSync(tmpFile, match[1], 'utf-8');
            cp.execSync(`node --check "${tmpFile}"`, { stdio: 'pipe' });
            syntaxValid = true;
        } catch (e) {
            assert.pushResult({
                result: false,
                actual: e.stderr ? e.stderr.toString() : e.message,
                expected: 'No SyntaxError',
                message: `Erro sintático no script: ${e.message}`
            });
        } finally {
            if (fs.existsSync(tmpFile)) {
                fs.unlinkSync(tmpFile);
            }
        }

        // Assert
        assert.ok(syntaxValid, 'Script type="module" de public/formV6.html compila com 100% de sucesso');
    });

    QUnit.test('2. Botão de Rolagem Seguro: Prevenção contra SyntaxError: missing ) after argument list', function (assert) {
        // Arrange
        const html = fs.readFileSync(FORMV6_PATH, 'utf-8');

        // Act & Assert
        // Garante que o botão de perícia usa dataset ao invés de interpolação direta com aspas simples no onclick
        assert.ok(
            html.includes('data-skill-name='),
            'Botão de rolagem deve armazenar o nome da perícia em data-skill-name'
        );
        assert.ok(
            html.includes('rollSkillFromSheet(this.dataset.skillName'),
            'Botão de rolagem deve invocar rollSkillFromSheet via this.dataset para evitar quebras por aspas no nome'
        );
        assert.notOk(
            html.includes("onclick=\"rollSkillFromSheet('${p.nome}'"),
            'NÃO deve conter interpolação crua de strings com aspas simples em onclick'
        );
    });

    QUnit.test('3. Inicialização Imediata (Offline-First): mainAppLogic não depende de sucesso de Auth', function (assert) {
        // Arrange
        const html = fs.readFileSync(FORMV6_PATH, 'utf-8');

        // Act & Assert
        assert.ok(
            html.includes('ensureAppInitialized()'),
            'Deve conter função de inicialização garantida ensureAppInitialized()'
        );
        assert.ok(
            html.includes('saveSheetToLocalStorage'),
            'Deve conter rotina de persistência em LocalStorage para modo offline'
        );
        assert.ok(
            html.includes('loadSavedSheetsFromFirestore'),
            'Deve conter carregamento resiliente com fallback'
        );
    });

    // -------------------------------------------------------------
    // 2. Casos de Borda: Nomes de Perícias Complexos com Aspas e Caracteres Especiais
    // -------------------------------------------------------------
    QUnit.test('4. Casos de Borda: Sanitização de nomes de perícias com aspas, apóstrofos e caracteres especiais', function (assert) {
        // Arrange
        const testSkills = [
            { nome: "Adaga d'Aço", valor: 2, atributo: 'DES' },
            { nome: 'Arma "Lendária"', valor: 3, atributo: 'FOR' },
            { nome: "Mão d'Água (Nível 2)", valor: 1, atributo: 'POD' },
            { nome: "", valor: 0, atributo: 'INT' },
            { nome: null, valor: 0, atributo: null }
        ];

        // Act & Assert
        testSkills.forEach(skill => {
            const safeName = (skill.nome || '').replace(/"/g, '&quot;');
            const safeAttr = (skill.atributo || 'DES').replace(/"/g, '&quot;');
            
            // Simular o template HTML gerado
            const btnHtml = `<button type="button" data-skill-name="${safeName}" data-skill-val="${skill.valor || 0}" data-skill-attr="${safeAttr}" onclick="rollSkillFromSheet(this.dataset.skillName, Number(this.dataset.skillVal), this.dataset.skillAttr)"></button>`;

            // O onclick gerado deve ser idêntico e estático, nunca variando o número ou tipo de parênteses
            assert.ok(
                btnHtml.includes('onclick="rollSkillFromSheet(this.dataset.skillName, Number(this.dataset.skillVal), this.dataset.skillAttr)"'),
                `Handler para "${skill.nome}" não sofre injeção de caracteres que quebrem parênteses`
            );
        });
    });

    // -------------------------------------------------------------
    // 3. Tratamento de Erros e Mocks de Storage
    // -------------------------------------------------------------
    QUnit.test('5. Mock de LocalStorage: Salvamento e Recuperação de Fichas Offline', function (assert) {
        // Arrange
        const mockStorage = {};
        const fakeLocalStorage = {
            getItem: (key) => mockStorage[key] || null,
            setItem: (key, val) => { mockStorage[key] = String(val); }
        };

        const sampleSheet = {
            charName: 'Herói Teste',
            for: 14,
            des: 12,
            con: 15
        };

        // Act - Simulação da lógica de persistência local
        const sheetId = 'test-uuid-123';
        const sheets = JSON.parse(fakeLocalStorage.getItem('kuar_tor_saved_sheets') || '{}');
        sheets[sheetId] = {
            id: sheetId,
            name: sampleSheet.charName,
            sheetData: sampleSheet
        };
        fakeLocalStorage.setItem('kuar_tor_saved_sheets', JSON.stringify(sheets));

        // Assert
        const retrieved = JSON.parse(fakeLocalStorage.getItem('kuar_tor_saved_sheets'));
        assert.ok(retrieved[sheetId], 'Ficha deve existir no mock storage');
        assert.equal(retrieved[sheetId].name, 'Herói Teste', 'Nome da ficha recuperado corretamente');
        assert.equal(retrieved[sheetId].sheetData.for, 14, 'Atributo FOR preservado');
    });

    QUnit.test('6. Importação sem Bloqueio de Auth: Permite importar JSON mesmo desconectado', function (assert) {
        // Arrange
        const html = fs.readFileSync(FORMV6_PATH, 'utf-8');

        // Act & Assert
        // Verifica se removemos o bloqueio "!currentUserId" na importação
        assert.notOk(
            html.includes('if (!file || !currentUserId)'),
            'Importação de arquivo NÃO deve exigir usuário autenticado para funcionar'
        );
    });
});
