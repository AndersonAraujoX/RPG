/**
 * Suíte de Testes Unitários: Migração do Gerador de Fichas (formV6.html) para a pasta Pública
 * Padrão: Arrange-Act-Assert (AAA)
 * Cobertura: Caminho Feliz, Casos de Borda, Tratamento de Erros e Mocks de Dependência.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_FORM_PATH = path.join(ROOT_DIR, 'public/formV6.html');
const LEGACY_FORM_PATH = path.join(ROOT_DIR, 'legado/Forms/formV6.html');

/**
 * Função utilitária para resolver o caminho relativo de formV6 a partir de qualquer subdiretório do projeto.
 * Implementada de forma pura e desacoplada para facilitar testes e injeção de dependências.
 * @param {string} fromDir Diretório de origem relativo à raiz
 * @param {Object} [deps] Dependências injetadas (fs, path)
 * @returns {string} Caminho relativo até public/formV6.html
 */
function resolveFormV6RelativePath(fromDir, deps = { pathModule: path }) {
    if (typeof fromDir !== 'string') {
        throw new TypeError('fromDir deve ser uma string com o caminho do diretório');
    }
    const p = deps.pathModule;
    const cleanFrom = fromDir.trim().replace(/\/+$/, '');
    
    if (cleanFrom === '' || cleanFrom === '.') {
        return 'public/formV6.html';
    }
    if (cleanFrom === 'public') {
        return 'formV6.html';
    }
    if (cleanFrom.startsWith('public/')) {
        const depth = cleanFrom.split('/').length - 1;
        return '../'.repeat(depth) + 'formV6.html';
    }
    // Subdiretórios fora de public (ex: legado, legado/Site)
    const segments = cleanFrom.split('/');
    return '../'.repeat(segments.length) + 'public/formV6.html';
}

QUnit.module('Migração formV6.html: Legado -> Público', function () {

    // -------------------------------------------------------------
    // 1. Caminho Feliz (Fluxo Principal)
    // -------------------------------------------------------------
    QUnit.test('1. Presença no Público & Remoção do Legado (Caminho Feliz)', function (assert) {
        // Arrange & Act
        const publicExists = fs.existsSync(PUBLIC_FORM_PATH);
        const legacyExists = fs.existsSync(LEGACY_FORM_PATH);

        // Assert
        assert.ok(publicExists, 'public/formV6.html DEVE existir no sistema de arquivos');
        assert.notOk(legacyExists, 'legado/Forms/formV6.html NÃO deve existir no sistema de arquivos');

        if (publicExists) {
            const stats = fs.statSync(PUBLIC_FORM_PATH);
            assert.ok(stats.size > 50000, `public/formV6.html deve ter conteúdo completo (> 50KB). Tamanho real: ${stats.size} bytes`);
        }
    });

    QUnit.test('2. Links de Navegação Atualizados para public/formV6.html (Caminho Feliz)', function (assert) {
        // Arrange
        const referenceFiles = [
            { file: 'index.html', expectedLink: 'public/formV6.html' },
            { file: 'public/main.html', expectedLink: 'formV6.html' },
            { file: 'public/items.html', expectedLink: 'formV6.html' },
            { file: 'legado/main.html', expectedLink: '../public/formV6.html' },
            { file: 'legado/items.html', expectedLink: '../public/formV6.html' },
            { file: 'legado/Site/siteV1.1.html', expectedLink: '../../public/formV6.html' },
            { file: 'README.md', expectedLink: 'public/formV6.html' }
        ];

        // Act & Assert
        referenceFiles.forEach(({ file, expectedLink }) => {
            const fullPath = path.join(ROOT_DIR, file);
            assert.ok(fs.existsSync(fullPath), `Arquivo de referência deve existir: ${file}`);

            const content = fs.readFileSync(fullPath, 'utf-8');
            assert.ok(
                content.includes(expectedLink),
                `${file} deve referenciar corretamente formV6 via "${expectedLink}"`
            );

            // Garantir que não existam resquícios de referências antigas a legado/Forms/formV6.html
            assert.notOk(
                content.includes('legado/Forms/formV6.html'),
                `${file} NÃO deve conter referências ao caminho antigo "legado/Forms/formV6.html"`
            );
        });
    });

    QUnit.test('3. Estrutura Interna de public/formV6.html: Botão Menu, PDFs e CSS Local', function (assert) {
        // Arrange
        assert.ok(fs.existsSync(PUBLIC_FORM_PATH), 'public/formV6.html deve existir');
        const content = fs.readFileSync(PUBLIC_FORM_PATH, 'utf-8');

        // Act - Verificações essenciais
        const hasMenuButton = content.includes('id="backToMenuButton"') &&
                              content.includes('href="../index.html"') &&
                              content.includes('Voltar ao Menu');

        const hasLocalTailwind = content.includes('href="tailwind.css"') &&
                                !content.includes('cdn.tailwindcss.com');

        const hasCharacterRules = content.includes('src="../src/core/character-sheet.js"');

        // Assert
        assert.ok(hasMenuButton, 'public/formV6.html deve ter botão "Voltar ao Menu" apontando para ../index.html');
        assert.ok(hasLocalTailwind, 'public/formV6.html deve utilizar tailwind.css local e NÃO o CDN');
        assert.ok(hasCharacterRules, 'public/formV6.html deve importar o módulo pure core character-sheet.js');

        // PDFs em public/Arquivos
        const requiredPdfs = [
            'Arquivos/medieval2d6-livreto.pdf',
            'Arquivos/Sistema.pdf',
            'Arquivos/Vantagens.pdf',
            'Arquivos/desvantagens.pdf'
        ];

        requiredPdfs.forEach(pdfHref => {
            assert.ok(content.includes(`href="${pdfHref}"`), `public/formV6.html deve linkar ${pdfHref}`);
            const physicalPath = path.resolve(path.dirname(PUBLIC_FORM_PATH), pdfHref);
            assert.ok(fs.existsSync(physicalPath), `Arquivo físico correspondente deve existir: ${physicalPath}`);
        });
    });

    // -------------------------------------------------------------
    // 2. Casos de Borda (Edge Cases)
    // -------------------------------------------------------------
    QUnit.test('4. Casos de Borda: Cálculo de caminhos relativos para diferentes profundidades', function (assert) {
        // Arrange
        const cases = [
            { dir: '', expected: 'public/formV6.html' },
            { dir: '.', expected: 'public/formV6.html' },
            { dir: 'public', expected: 'formV6.html' },
            { dir: 'public/', expected: 'formV6.html' },
            { dir: 'public/puzzles', expected: '../formV6.html' },
            { dir: 'public/puzzles/sala1', expected: '../../formV6.html' },
            { dir: 'legado', expected: '../public/formV6.html' },
            { dir: 'legado/', expected: '../public/formV6.html' },
            { dir: 'legado/Site', expected: '../../public/formV6.html' },
            { dir: 'legado/Forms', expected: '../../public/formV6.html' },
            { dir: 'legado/Dados/sub', expected: '../../../public/formV6.html' }
        ];

        // Act & Assert
        cases.forEach(({ dir, expected }) => {
            const result = resolveFormV6RelativePath(dir);
            assert.equal(result, expected, `Caminho a partir de "${dir}" deve ser "${expected}"`);
        });
    });

    // -------------------------------------------------------------
    // 3. Tratamento de Exceções & Mocks
    // -------------------------------------------------------------
    QUnit.test('5. Tratamento de Erros: Entrada inválida na função de resolução', function (assert) {
        // Arrange
        const invalidInputs = [null, undefined, 123, {}, [], true];

        // Act & Assert
        invalidInputs.forEach(input => {
            assert.throws(
                () => resolveFormV6RelativePath(input),
                TypeError,
                `Deve lançar TypeError quando receber: ${typeof input}`
            );
        });
    });

    QUnit.test('6. Injeção de Dependência e Mock: Teste de Resolução com Mock do PathModule', function (assert) {
        // Arrange
        let mockCalls = 0;
        const mockPathModule = {
            join: (...args) => {
                mockCalls++;
                return args.join('/');
            }
        };

        // Act
        const res = resolveFormV6RelativePath('public', { pathModule: mockPathModule });

        // Assert
        assert.equal(res, 'formV6.html', 'Deve resolver corretamente com dependência injetada');
    });
});
