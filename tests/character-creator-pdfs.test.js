/**
 * Suíte de Testes Unitários: Recursos e PDFs do Criador de Personagens (+2D6)
 * Padrão: Arrange-Act-Assert (AAA)
 * Cobertura: Caminho Feliz, Casos de Borda, Tratamento de Erros, Mocks/Stubs e Testes de Integração HTML.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');
const { CharacterResourceManager, OFFICIAL_PDFS } = require('../src/core/character-resources');

const ROOT_DIR = path.resolve(__dirname, '..');
const FORMV6_PATH = path.join(ROOT_DIR, 'public/formV6.html');
const LEGACY_FORMV6_PATH = path.join(ROOT_DIR, 'legado/Forms/formV6.html');
const FORMV5_PATH = path.join(ROOT_DIR, 'legado/Forms/formV5.html');
const INDEX_PATH = path.join(ROOT_DIR, 'index.html');

QUnit.module('Character Creator PDFs & Rulebooks (+2D6)', function (hooks) {
    let manager;

    hooks.beforeEach(function () {
        manager = new CharacterResourceManager({
            fsModule: fs,
            baseDir: ROOT_DIR
        });
    });

    // -------------------------------------------------------------
    // 1. Caminho Feliz: Catálogo e Resolução de Caminhos
    // -------------------------------------------------------------
    QUnit.test('1. Catálogo Oficial: Deve conter os 4 PDFs essenciais para o sistema +2d6 (Caminho Feliz)', function (assert) {
        // Arrange
        const expectedIds = ['livreto', 'sistema', 'vantagens', 'desvantagens'];

        // Act
        const pdfs = manager.getOfficialPdfs();
        const ids = pdfs.map(p => p.id);

        // Assert
        assert.equal(pdfs.length, 4, 'O catálogo deve possuir exatamente 4 PDFs oficiais');
        expectedIds.forEach(id => {
            assert.ok(ids.includes(id), `PDF com id "${id}" deve estar presente no catálogo`);
        });
    });

    QUnit.test('2. Resolução de Caminhos: Deve resolver caminhos relativos corretos por contexto (AAA)', function (assert) {
        // Arrange
        const testCases = [
            { id: 'livreto', context: 'forms', expected: '../Arquivos/medieval2d6-livreto.pdf' },
            { id: 'sistema', context: 'forms', expected: '../Arquivos/Sistema.pdf' },
            { id: 'vantagens', context: 'forms', expected: '../Arquivos/Vantagens.pdf' },
            { id: 'desvantagens', context: 'forms', expected: '../Arquivos/desvantagens.pdf' },
            { id: 'livreto', context: 'root', expected: 'Arquivos/medieval2d6-livreto.pdf' },
            { id: 'sistema', context: 'public', expected: 'Arquivos/Sistema.pdf' }
        ];

        // Act & Assert
        testCases.forEach(({ id, context, expected }) => {
            const resolved = manager.resolveRelativePath(id, context);
            assert.equal(resolved, expected, `Contexto "${context}" para "${id}" deve resolver para "${expected}"`);
        });
    });

    // -------------------------------------------------------------
    // 2. Casos de Borda & Tratamento de Erros
    // -------------------------------------------------------------
    QUnit.test('3. Casos de Borda: Tratamento de IDs nulos, vazios e inexistentes', function (assert) {
        // Arrange
        const invalidInputs = [null, undefined, '', '   ', 'inexistente_pdf', 12345, {}];

        // Act & Assert
        invalidInputs.forEach(input => {
            const item = manager.getPdfById(input);
            const pathResult = manager.resolveRelativePath(input, 'forms');

            assert.equal(item, null, `getPdfById deve retornar null para entrada inválida: ${JSON.stringify(input)}`);
            assert.equal(pathResult, '', `resolveRelativePath deve retornar string vazia para entrada inválida: ${JSON.stringify(input)}`);
        });
    });

    QUnit.test('4. Validação de URLs e Detecção de Links Quebrados Legados (Error Handling)', function (assert) {
        // Arrange
        const brokenLegacyUrl = 'https://andersonaraujox.github.io/RPG/Arquivos/Vantagens.pdf';
        const validRelativeUrl = '../Arquivos/Vantagens.pdf';
        const nonPdfUrl = '../Arquivos/Vantagens.txt';
        const emptyUrl = '';

        // Act
        const brokenResult = manager.validatePdfHref(brokenLegacyUrl);
        const validResult = manager.validatePdfHref(validRelativeUrl);
        const nonPdfResult = manager.validatePdfHref(nonPdfUrl);
        const emptyResult = manager.validatePdfHref(emptyUrl);

        // Assert
        assert.notOk(brokenResult.isValid, 'URL legada com /RPG/Arquivos/ deve ser marcada como inválida (gera 404)');
        assert.ok(brokenResult.error.includes('URL externa desatualizada'), 'Deve informar erro explicativo para URL legada');

        assert.ok(validResult.isValid, 'Caminho relativo para PDF deve ser válido');
        assert.notOk(validResult.isExternal, 'Caminho relativo não é externo');

        assert.notOk(nonPdfResult.isValid, 'Extensão não-PDF deve ser recusada');
        assert.notOk(emptyResult.isValid, 'URL vazia deve ser recusada');
    });

    // -------------------------------------------------------------
    // 3. Mocks e Stubs: Isolamento com Injeção de Dependências
    // -------------------------------------------------------------
    QUnit.test('5. Isolamento com Mock: Simulação de FS para validar status e integridade', function (assert) {
        // Arrange: Criar stub de sistema de arquivos
        const mockFs = {
            existsSync: function (p) {
                return p.includes('valid.pdf');
            },
            statSync: function (p) {
                if (p.includes('valid.pdf')) {
                    return { size: 102400 }; // 100KB
                }
                throw new Error('Arquivo não encontrado no mock');
            }
        };

        const isolatedManager = new CharacterResourceManager({ fsModule: mockFs });

        // Act
        const validStatus = isolatedManager.checkFileStatus('/dummy/valid.pdf');
        const invalidStatus = isolatedManager.checkFileStatus('/dummy/missing.pdf');

        // Assert
        assert.ok(validStatus.exists, 'Arquivo existente no mock deve retornar exists = true');
        assert.equal(validStatus.size, 102400, 'Tamanho reportado pelo mock deve ser 102400 bytes');
        assert.ok(validStatus.isValidSize, 'Tamanho deve ser considerado válido');

        assert.notOk(invalidStatus.exists, 'Arquivo ausente no mock deve retornar exists = false');
        assert.equal(invalidStatus.size, 0, 'Tamanho de arquivo ausente deve ser 0');
    });

    // -------------------------------------------------------------
    // 4. Testes de Integridade Física dos Arquivos no Disco
    // -------------------------------------------------------------
    QUnit.test('6. Integridade Física: Arquivos PDF devem existir com tamanho válido (> 50KB)', function (assert) {
        // Arrange
        const directoriesToCheck = [
            path.join(ROOT_DIR, 'legado/Arquivos'),
            path.join(ROOT_DIR, 'Arquivos'),
            path.join(ROOT_DIR, 'public/Arquivos')
        ];

        const pdfFiles = [
            'medieval2d6-livreto.pdf',
            'Sistema.pdf',
            'Vantagens.pdf',
            'desvantagens.pdf'
        ];

        // Act & Assert
        directoriesToCheck.forEach(dir => {
            assert.ok(fs.existsSync(dir), `Diretório ${dir} deve existir`);

            pdfFiles.forEach(filename => {
                const fullPath = path.join(dir, filename);
                assert.ok(fs.existsSync(fullPath), `Arquivo ${filename} deve existir em ${dir}`);

                const stats = fs.statSync(fullPath);
                assert.ok(stats.size > 50000, `Arquivo ${filename} em ${dir} deve ser válido (> 50KB). Tamanho real: ${stats.size} bytes`);
            });
        });
    });

    // -------------------------------------------------------------
    // 5. Integração com o Criador de Personagens (formV6.html)
    // -------------------------------------------------------------
    QUnit.test('7. Integração formV6.html: Todos os 4 PDFs devem estar acessíveis sem links 404 em public/formV6.html', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(FORMV6_PATH), 'public/formV6.html deve existir');
        const content = fs.readFileSync(FORMV6_PATH, 'utf-8');

        const expectedRelativeHrefs = [
            'Arquivos/medieval2d6-livreto.pdf',
            'Arquivos/Sistema.pdf',
            'Arquivos/Vantagens.pdf',
            'Arquivos/desvantagens.pdf'
        ];

        // Act & Assert
        expectedRelativeHrefs.forEach(href => {
            assert.ok(content.includes(`href="${href}"`), `formV6.html deve conter link relativo exato: ${href}`);

            // Verificar que o caminho físico relativo a partir de public/ existe
            const resolvedDiskPath = path.resolve(path.dirname(FORMV6_PATH), href);
            assert.ok(fs.existsSync(resolvedDiskPath), `O arquivo físico apontado por "${href}" deve existir no disco`);
        });

        // Garantir que nenhum link quebrado do GitHub Pages permaneça no formV6
        assert.notOk(
            content.includes('andersonaraujox.github.io/RPG/Arquivos/'),
            'formV6.html NÃO deve conter links absolutos quebrados para andersonaraujox.github.io/RPG/Arquivos/'
        );

        // Garantir que o botão de exportar/salvar ficha em PDF esteja explícito
        assert.ok(
            content.includes('Imprimir / Salvar em PDF'),
            'formV6.html deve conter botão com rótulo explícito "Imprimir / Salvar em PDF"'
        );
    });

    // -------------------------------------------------------------
    // 6. Integração com Portal Principal (index.html) e formV5
    // -------------------------------------------------------------
    QUnit.test('8. Integração index.html: Card do Criador de Fichas deve fornecer acesso aos PDFs', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(INDEX_PATH), 'index.html deve existir');
        const content = fs.readFileSync(INDEX_PATH, 'utf-8');

        // Act & Assert
        assert.ok(content.includes('Arquivos/medieval2d6-livreto.pdf'), 'index.html deve conter link para Livreto');
        assert.ok(content.includes('Arquivos/Sistema.pdf'), 'index.html deve conter link para Sistema Oficial');
        assert.ok(content.includes('Arquivos/Vantagens.pdf'), 'index.html deve conter link para Vantagens');
        assert.ok(content.includes('Arquivos/desvantagens.pdf'), 'index.html deve conter link para Desvantagens');
    });

    QUnit.test('9. Integração formV5.html: Links de recursos devem utilizar caminhos relativos', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(FORMV5_PATH), 'formV5.html deve existir');
        const content = fs.readFileSync(FORMV5_PATH, 'utf-8');

        // Act & Assert
        assert.notOk(
            content.includes('andersonaraujox.github.io/RPG/Arquivos/'),
            'formV5.html NÃO deve conter links absolutos quebrados'
        );
        assert.ok(
            content.includes('../Arquivos/Vantagens.pdf'),
            'formV5.html deve conter link relativo para Vantagens.pdf'
        );
    });

    // -------------------------------------------------------------
    // 7. Navegação: Botão Voltar ao Menu
    // -------------------------------------------------------------
    QUnit.test('10. Navegação e Migração: formV6 deve ser removido de legado e mantido em public com botão "Voltar ao Menu"', function (assert) {
        // Arrange
        const PUBLIC_FORM_PATH = path.join(ROOT_DIR, 'public/formV6.html');
        assert.notOk(fs.existsSync(LEGACY_FORMV6_PATH), 'legado/Forms/formV6.html NÃO deve mais existir (removido do legado)');
        assert.ok(fs.existsSync(PUBLIC_FORM_PATH), 'public/formV6.html deve existir');

        const publicContent = fs.readFileSync(PUBLIC_FORM_PATH, 'utf-8');

        // Act & Assert
        assert.ok(publicContent.includes('id="backToMenuButton"'), 'public/formV6.html deve ter id="backToMenuButton"');
        assert.ok(publicContent.includes('Voltar ao Menu'), 'public/formV6.html deve ter texto "Voltar ao Menu"');
        assert.ok(publicContent.includes('href="../index.html"'), 'public/formV6.html deve apontar para ../index.html');
    });

    // -------------------------------------------------------------
    // 8. Adaptação para o Público (public/formV6.html)
    // -------------------------------------------------------------
    QUnit.test('11. Adaptação Pública: public/formV6.html deve estar integrado com tailwind local e PDFs de public', function (assert) {
        // Arrange
        const PUBLIC_FORM_PATH = path.join(ROOT_DIR, 'public/formV6.html');
        const PUBLIC_MAIN_PATH = path.join(ROOT_DIR, 'public/main.html');
        const PUBLIC_ITEMS_PATH = path.join(ROOT_DIR, 'public/items.html');

        assert.ok(fs.existsSync(PUBLIC_FORM_PATH), 'public/formV6.html existe');
        const formContent = fs.readFileSync(PUBLIC_FORM_PATH, 'utf-8');
        const mainContent = fs.readFileSync(PUBLIC_MAIN_PATH, 'utf-8');
        const itemsContent = fs.readFileSync(PUBLIC_ITEMS_PATH, 'utf-8');

        // Act & Assert - Verificação de Assets e Scripts
        assert.ok(formContent.includes('href="tailwind.css"'), 'Deve usar tailwind.css local');
        assert.notOk(formContent.includes('cdn.tailwindcss.com'), 'NÃO deve usar CDN bloqueado');
        assert.ok(formContent.includes('src="../src/core/character-sheet.js"'), 'Deve importar character-sheet.js corretamente');

        // PDFs em public
        assert.ok(formContent.includes('href="Arquivos/medieval2d6-livreto.pdf"'), 'Link para Livreto em public/Arquivos');
        assert.ok(formContent.includes('href="Arquivos/Sistema.pdf"'), 'Link para Sistema em public/Arquivos');
        assert.ok(formContent.includes('href="Arquivos/Vantagens.pdf"'), 'Link para Vantagens em public/Arquivos');
        assert.ok(formContent.includes('href="Arquivos/desvantagens.pdf"'), 'Link para Desvantagens em public/Arquivos');

        // Integração com as outras páginas de public
        assert.ok(mainContent.includes('href="formV6.html"'), 'public/main.html deve apontar para formV6.html');
        assert.ok(itemsContent.includes('href="formV6.html"'), 'public/items.html deve apontar para formV6.html');
    });
});
