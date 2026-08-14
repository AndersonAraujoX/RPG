/**
 * Testes unitários para verificar a correção do ERR_BLOCKED_BY_CLIENT
 * Valida que nenhum arquivo HTML usa cdn.tailwindcss.com e que
 * o tailwind.css local existe e está acessível.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const TAILWIND_CSS = path.join(PUBLIC_DIR, 'tailwind.css');

// Utilitário: recursivamente buscar todos os arquivos HTML
function getAllHtmlFiles(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(getAllHtmlFiles(fullPath));
        } else if (entry.name.endsWith('.html')) {
            results.push(fullPath);
        }
    }
    return results;
}

QUnit.module('Fix ERR_BLOCKED_BY_CLIENT - Tailwind CDN', function () {

    QUnit.test('O arquivo tailwind.css local deve existir', function (assert) {
        assert.ok(
            fs.existsSync(TAILWIND_CSS),
            `tailwind.css não encontrado em: ${TAILWIND_CSS}`
        );
    });

    QUnit.test('O tailwind.css local deve ter conteúdo válido (> 10KB)', function (assert) {
        if (!fs.existsSync(TAILWIND_CSS)) {
            assert.ok(false, 'tailwind.css não existe, pulando teste de tamanho');
            return;
        }
        const size = fs.statSync(TAILWIND_CSS).size;
        assert.ok(size > 10000, `tailwind.css muito pequeno (${size} bytes). Esperado > 10KB`);
    });

    QUnit.test('Nenhum arquivo HTML deve referenciar cdn.tailwindcss.com', function (assert) {
        const htmlFiles = getAllHtmlFiles(PUBLIC_DIR);
        assert.ok(htmlFiles.length > 0, 'Deve existir ao menos um arquivo HTML em /public');

        const violations = [];

        for (const file of htmlFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            if (content.includes('cdn.tailwindcss.com')) {
                violations.push(path.relative(PUBLIC_DIR, file));
            }
        }

        assert.deepEqual(
            violations,
            [],
            `Os seguintes arquivos ainda usam o CDN bloqueado: ${violations.join(', ')}`
        );
    });

    QUnit.test('Nenhum arquivo HTML deve ter script tailwind.config orphan', function (assert) {
        const htmlFiles = getAllHtmlFiles(PUBLIC_DIR);
        const violations = [];

        for (const file of htmlFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            if (content.includes('tailwind.config =')) {
                violations.push(path.relative(PUBLIC_DIR, file));
            }
        }

        assert.deepEqual(
            violations,
            [],
            `Os seguintes arquivos têm tailwind.config orphan: ${violations.join(', ')}`
        );
    });

    QUnit.test('Arquivos em /public/ devem referenciar tailwind.css corretamente', function (assert) {
        // index.html é apenas um redirect, não precisa de CSS
        const REDIRECT_ONLY = ['index.html'];

        const rootHtmlFiles = fs.readdirSync(PUBLIC_DIR)
            .filter(f => f.endsWith('.html') && !REDIRECT_ONLY.includes(f))
            .map(f => path.join(PUBLIC_DIR, f));

        const violations = [];

        for (const file of rootHtmlFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            if (!content.includes('href="tailwind.css"') && !content.includes("href='tailwind.css'")) {
                violations.push(path.basename(file));
            }
        }

        assert.deepEqual(
            violations,
            [],
            `Os seguintes arquivos em /public/ não referenciam tailwind.css: ${violations.join(', ')}`
        );
    });


    QUnit.test('Arquivos em /public/puzzles/ devem referenciar ../tailwind.css', function (assert) {
        const puzzlesDir = path.join(PUBLIC_DIR, 'puzzles');
        if (!fs.existsSync(puzzlesDir)) {
            assert.ok(true, 'Diretório puzzles não existe, pulando teste');
            return;
        }

        const puzzleFiles = fs.readdirSync(puzzlesDir)
            .filter(f => f.endsWith('.html'))
            .map(f => path.join(puzzlesDir, f));

        const violations = [];

        for (const file of puzzleFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            if (!content.includes('href="../tailwind.css"') && !content.includes("href='../tailwind.css'")) {
                violations.push(path.basename(file));
            }
        }

        assert.deepEqual(
            violations,
            [],
            `Os seguintes puzzles não referenciam ../tailwind.css: ${violations.join(', ')}`
        );
    });
});
