/**
 * Suíte de Testes Unitários — Círculos de Magia (Secundus & Terceirus)
 * Padrão: Arrange-Act-Assert (AAA)
 *
 * Cobre:
 * 1. Parser do compêndio: linhas válidas, linhas ignoradas, erros de validação e catálogo real (66 + 120).
 * 2. Gerador SVG: caminho feliz, determinismo, bordas (ids/cores/escape) e exceções.
 * 3. Artefatos gerados (SVGs, arquivo de dados) e integração com a galeria HTML.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');
const { magicPaths } = require('../src/core/magic-tree-engine');
const Parser = require('../src/core/spell-compendium-parser');
const Generator = require('../src/core/magic-circle-generator');

const ROOT = path.resolve(__dirname, '..');
const MD_PATH = path.join(ROOT, 'docs/COMPENDIO_FUSOES_NOTION.md');
const HTML_PATH = path.join(ROOT, 'public/circulos_magia.html');
const SVG_DIR = path.join(ROOT, 'public/circulos');
const DATA_PATH = path.join(ROOT, 'public/circulos_magia_data.js');

const SECUNDUS_ROW = '| **01** | 🔥 Fogo + 💧 Água | **Vapor & Pressão Térmica** | **Geiser** *(CD 11 · 4 PE)*: x | **Névoa** *(CD 9 · 2 PE)*: y | **Termo** *(CD 7 · 1 PE)*: z |';
const TERCEIRUS_ROW = '| **005** | 🔥 Fogo + 💨 Ar + ⛰️ Terra | **CATACLISMO** | **Chuva** *(CD 16 · 9 PE)*: x | **Tempestade** *(CD 14 · 6 PE)*: y | **Pulso** *(CD 10 · 3 PE)*: z |';

QUnit.module('Parser do Compêndio de Fusões', function () {

    QUnit.test('1. Caminho Feliz: parseRow lê uma linha Secundus', function (assert) {
        // Arrange & Act
        const entry = Parser.parseRow(SECUNDUS_ROW, magicPaths);

        // Assert
        assert.equal(entry.id, 's01');
        assert.equal(entry.tier, 'SECUNDUS');
        assert.equal(entry.number, 1);
        assert.equal(entry.name, 'Vapor & Pressão Térmica');
        assert.deepEqual(entry.paths, ['fogo', 'agua']);
        assert.deepEqual(entry.spells, { Criar: 'Geiser', Controlar: 'Névoa', Entender: 'Termo' });
    });

    QUnit.test('2. Caminho Feliz: parseRow lê uma linha Terceirus (3 dígitos, 3 caminhos)', function (assert) {
        // Arrange & Act
        const entry = Parser.parseRow(TERCEIRUS_ROW, magicPaths);

        // Assert
        assert.equal(entry.id, 't005');
        assert.equal(entry.tier, 'TERCEIRUS');
        assert.deepEqual(entry.paths, ['fogo', 'ar', 'terra']);
    });

    QUnit.test('3. Borda: linhas que não são fusões retornam null', function (assert) {
        // Arrange
        const inputs = [null, undefined, '', '# Título', '| # | Caminhos |', '| :-: | :--- |', 'texto solto', '| **ab** | a | b | c | d | e |'];

        // Act & Assert
        inputs.forEach(line => assert.strictEqual(Parser.parseRow(line, magicPaths), null, `ignora: ${String(line)}`));
    });

    QUnit.test('4. Borda: normalizeToken remove emojis, acentos e caixa', function (assert) {
        assert.equal(Parser.normalizeToken('💧 Água'), 'agua');
        assert.equal(Parser.normalizeToken('⛰️ Terra'), 'terra');
        assert.equal(Parser.normalizeToken(null), '');
    });

    QUnit.test('5. Borda: parseSpellName extrai negrito e tolera vazio', function (assert) {
        assert.equal(Parser.parseSpellName('**Lança de Magma** *(CD 11)*: desc'), 'Lança de Magma');
        assert.equal(Parser.parseSpellName('sem negrito'), '');
        assert.equal(Parser.parseSpellName(undefined), '');
    });

    QUnit.test('5b. Caminho Feliz e Borda: parseSpellDetail extrai magia, CD, PE, descrição e fallbacks (AAA)', function (assert) {
        // Arrange
        const validCell = '**Geiser Explosivo** *(CD 11 · 4 PE)*: Dispara jato de vapor escaldante (5d8 dano).';
        const cellWithoutMeta = '**Toque Arcano**: Canaliza energia pura.';

        // Act
        const detail = Parser.parseSpellDetail(validCell);
        const partial = Parser.parseSpellDetail(cellWithoutMeta);
        const customFallback = Parser.parseSpellDetail(cellWithoutMeta, 15, 8);
        const empty = Parser.parseSpellDetail(null);

        // Assert
        assert.deepEqual(detail, {
            spell: 'Geiser Explosivo',
            cd: 11,
            pe: 4,
            desc: 'Dispara jato de vapor escaldante (5d8 dano).'
        });
        assert.equal(partial.spell, 'Toque Arcano');
        assert.strictEqual(partial.cd, 10, 'usa fallback CD 10 quando ausente');
        assert.strictEqual(partial.pe, 3, 'usa fallback PE 3 quando ausente');
        assert.equal(partial.desc, 'Canaliza energia pura.');
        assert.strictEqual(customFallback.cd, 15, 'respeita fallbackCd customizado');
        assert.strictEqual(customFallback.pe, 8, 'respeita fallbackPe customizado');
        assert.deepEqual(empty, { spell: '', cd: 10, pe: 3, desc: '' });
    });

    QUnit.test('6. Erros: caminho desconhecido, contagem errada e argumentos inválidos lançam exceção', function (assert) {
        const badPath = SECUNDUS_ROW.replace('Água', 'Plasma');
        const wrongCount = SECUNDUS_ROW.replace('🔥 Fogo + 💧 Água', '🔥 Fogo + 💧 Água + 💨 Ar');

        assert.throws(() => Parser.parseRow(badPath, magicPaths), /desconhecido/);
        assert.throws(() => Parser.parseRow(wrongCount, magicPaths), /deve ter 2 caminhos/);
        assert.throws(() => Parser.parsePathsCell('Fogo', null), /knownPaths inválido/);
        assert.throws(() => Parser.parseCompendium(null, magicPaths), /Markdown inválido/);
    });

    QUnit.test('7. Catálogo real: o compêndio possui exatamente 66 Secundus e 120 Terceirus únicos com forms detalhados', function (assert) {
        // Arrange
        const md = fs.readFileSync(MD_PATH, 'utf-8');

        // Act
        const { secundus, terceirus } = Parser.parseCompendium(md, magicPaths);
        const pairKeys = new Set(secundus.map(e => [...e.paths].sort().join('+')));
        const tripleKeys = new Set(terceirus.map(e => [...e.paths].sort().join('+')));
        const ids = new Set([...secundus, ...terceirus].map(e => e.id));

        // Assert
        assert.equal(secundus.length, 66, '66 Secundus');
        assert.equal(terceirus.length, 120, '120 Terceirus');
        assert.equal(pairKeys.size, 66, 'todos os 66 pares são distintos (cobre C(12,2))');
        assert.equal(tripleKeys.size, 120, 'todas as 120 tríades são distintas');
        assert.equal(ids.size, 186, 'ids únicos');
        [...secundus, ...terceirus].forEach(e => {
            assert.ok(e.name && e.spells.Criar && e.spells.Controlar && e.spells.Entender, `${e.id} completo`);
            assert.ok(e.forms && e.forms.Criar.cd > 0 && e.forms.Criar.pe > 0 && e.forms.Criar.desc.length > 5, `${e.id} possui forms detalhados`);
        });
    });
});

QUnit.module('Gerador de Círculos de Magia (SVG)', function (hooks) {

    let secundus, terceirus;

    hooks.beforeEach(function () {
        secundus = { id: 's03', name: 'Magma & Vulcanismo', paths: ['fogo', 'terra'] };
        terceirus = { id: 't005', name: 'CATACLISMO', paths: ['fogo', 'ar', 'terra'] };
    });

    QUnit.test('1. Caminho Feliz: Secundus gera SVG válido com as cores dos 2 caminhos', function (assert) {
        // Act
        const svg = Generator.generateCircleSVG(secundus, magicPaths);

        // Assert
        assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), 'documento SVG');
        assert.ok(svg.includes('data-tier="SECUNDUS"'));
        assert.ok(svg.includes('data-paths="fogo,terra"'));
        assert.ok(svg.includes(magicPaths.fogo.color) && svg.includes(magicPaths.terra.color), 'usa cores dos caminhos');
        assert.ok(svg.includes('<title>Magma &amp; Vulcanismo</title>'), 'título com escape XML');
    });

    QUnit.test('2. Caminho Feliz: Terceirus tem mais geometria (3 polígonos + hexagrama + 3 círculos)', function (assert) {
        // Act
        const sec = Generator.generateCircleSVG(secundus, magicPaths);
        const ter = Generator.generateCircleSVG(terceirus, magicPaths);
        const count = (s, tag) => (s.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;

        // Assert
        assert.ok(ter.includes('data-tier="TERCEIRUS"'));
        assert.equal(count(sec, 'polygon'), 2, 'Secundus: 2 polígonos');
        assert.equal(count(ter, 'polygon'), 5, 'Terceirus: 3 polígonos + 2 triângulos do hexagrama');
        assert.ok(count(ter, 'circle') > count(sec, 'circle'), 'Terceirus tem mais círculos');
    });

    QUnit.test('3. Determinismo: mesma entrada gera SVG idêntico; ids diferentes geram runas diferentes', function (assert) {
        // Arrange
        const outro = Object.assign({}, secundus, { id: 's99' });

        // Act
        const a = Generator.generateCircleSVG(secundus, magicPaths);
        const b = Generator.generateCircleSVG(secundus, magicPaths);
        const c = Generator.generateCircleSVG(outro, magicPaths);

        // Assert
        assert.equal(a, b, 'determinístico');
        assert.notEqual(a, c, 'semente diferente altera o anel de runas');
    });

    QUnit.test('4. Borda: ids de gradiente são únicos por fusão (várias SVGs na mesma página)', function (assert) {
        const a = Generator.generateCircleSVG(secundus, magicPaths);
        const b = Generator.generateCircleSVG(terceirus, magicPaths);

        assert.ok(a.includes('id="mc-s03-g"') && !a.includes('mc-t005'));
        assert.ok(b.includes('id="mc-t005-g"') && !b.includes('mc-s03'));
    });

    QUnit.test('5. Borda: a ordem dos caminhos muda a composição, mas mantém a mesma assinatura de lados', function (assert) {
        const inv = Object.assign({}, secundus, { paths: ['terra', 'fogo'] });
        const a = Generator.generateCircleSVG(secundus, magicPaths);
        const b = Generator.generateCircleSVG(inv, magicPaths);

        assert.notEqual(a, b, 'ordem altera a composição');
        assert.equal(Generator.sidesFor('fogo', magicPaths), 3);
        assert.equal(Generator.sidesFor('terra', magicPaths), 6);
    });

    QUnit.test('6. Borda: sidesFor fica sempre entre 3 e 8 para os 12 caminhos', function (assert) {
        Object.keys(magicPaths).forEach(k => {
            const sides = Generator.sidesFor(k, magicPaths);
            assert.ok(sides >= 3 && sides <= 8, `${k}: ${sides} lados`);
        });
    });

    QUnit.test('7. Borda: polygonPoints devolve um ponto por lado; escapeXml neutraliza caracteres especiais', function (assert) {
        assert.equal(Generator.polygonPoints(100, 5, -90).split(' ').length, 5);
        assert.equal(Generator.escapeXml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;');
    });

    QUnit.test('8. Erros: entradas inválidas lançam exceção', function (assert) {
        assert.throws(() => Generator.generateCircleSVG(null, magicPaths), /Fusão inválida/);
        assert.throws(() => Generator.generateCircleSVG({ paths: ['fogo', 'ar'] }, magicPaths), /sem id/);
        assert.throws(() => Generator.generateCircleSVG({ id: 'x', paths: ['fogo'] }, magicPaths), /2 \(Secundus\) ou 3/);
        assert.throws(() => Generator.generateCircleSVG({ id: 'x', paths: ['fogo', 'ar', 'agua', 'terra'] }, magicPaths), /2 \(Secundus\) ou 3/);
        assert.throws(() => Generator.generateCircleSVG({ id: 'x', paths: ['fogo', 'fogo'] }, magicPaths), /duplicados/);
        assert.throws(() => Generator.generateCircleSVG({ id: 'x', paths: ['fogo', 'plasma'] }, magicPaths), /desconhecido/);
        assert.throws(() => Generator.generateCircleSVG(secundus, null), /Caminhos inválidos/);
        assert.throws(() => Generator.sidesFor('plasma', magicPaths), /desconhecido/);
        assert.throws(() => Generator.buildCatalog(null, magicPaths), /Entradas inválidas/);
    });

    QUnit.test('9. buildCatalog: lista vazia retorna vazio e entradas preservam dados + svg', function (assert) {
        assert.deepEqual(Generator.buildCatalog([], magicPaths), []);
        const [item] = Generator.buildCatalog([secundus], magicPaths);
        assert.equal(item.name, 'Magma & Vulcanismo');
        assert.ok(item.svg.startsWith('<svg'));
    });

    QUnit.test('10. Catálogo completo: os 186 círculos do compêndio são gerados e únicos', function (assert) {
        // Arrange
        const { secundus: s, terceirus: t } = Parser.parseCompendium(fs.readFileSync(MD_PATH, 'utf-8'), magicPaths);

        // Act
        const catalog = Generator.buildCatalog([...s, ...t], magicPaths);

        // Assert
        assert.equal(catalog.length, 186);
        assert.equal(new Set(catalog.map(c => c.svg)).size, 186, 'cada círculo é visualmente distinto');
    });

    QUnit.test('11. Caminho Feliz e Erros: generatePrimaryCircleSVG gera círculos primários para os 12 caminhos e valida erros (AAA)', function (assert) {
        // Arrange
        const keys = Object.keys(magicPaths);

        // Act
        const svgs = keys.map(k => Generator.generatePrimaryCircleSVG(k, magicPaths));

        // Assert: Caminho Feliz
        assert.equal(svgs.length, 12, '12 círculos primários gerados');
        assert.equal(new Set(svgs).size, 12, 'todos os 12 círculos primários são distintos');
        svgs.forEach((svg, idx) => {
            const k = keys[idx];
            assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${k} gera documento SVG`);
            assert.ok(svg.includes('data-tier="PRIMARIUS"'), `${k} marcado como PRIMARIUS`);
            assert.ok(svg.includes(`data-paths="${k}"`), `${k} referencia o caminho`);
            assert.ok(svg.includes(magicPaths[k].color), `${k} utiliza a cor do caminho`);
        });

        // Assert: Tratamento de Exceções
        assert.throws(() => Generator.generatePrimaryCircleSVG('plasma', magicPaths), /desconhecido/, 'rejeita caminho inexistente');
        assert.throws(() => Generator.generatePrimaryCircleSVG('', magicPaths), /desconhecido/, 'rejeita string vazia');
        assert.throws(() => Generator.generatePrimaryCircleSVG('fogo', null), /Caminhos inválidos/, 'rejeita paths nulo');
    });
});

QUnit.module('Artefatos e Galeria de Círculos', function () {

    QUnit.test('1. Os 186 arquivos SVG e o arquivo de dados foram gerados', function (assert) {
        const files = fs.readdirSync(SVG_DIR).filter(f => f.endsWith('.svg'));
        const data = fs.readFileSync(DATA_PATH, 'utf-8');

        assert.equal(files.length, 186, '186 SVGs em public/circulos');
        assert.ok(files.includes('s01.svg') && files.includes('s66.svg') && files.includes('t001.svg') && files.includes('t120.svg'));
        assert.ok(data.includes('window.CIRCLES_DATA'), 'dados expostos para a galeria');
    });

    QUnit.test('2. Integração HTML: a galeria carrega engine, gerador e dados, sem CDN do Tailwind', function (assert) {
        const html = fs.readFileSync(HTML_PATH, 'utf-8');

        assert.ok(html.includes('magic-circle-generator.js'));
        assert.ok(html.includes('circulos_magia_data.js'));
        assert.ok(html.includes('href="tailwind.css"'));
        assert.notOk(html.includes('cdn.tailwindcss.com'));
        assert.ok(html.includes('Secundus (66)') && html.includes('Terceirus (120)'));
    });
});
