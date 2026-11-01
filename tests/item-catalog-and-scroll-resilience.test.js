/**
 * @file tests/item-catalog-and-scroll-resilience.test.js
 * @description Suíte de testes unitários AAA para o motor de Catálogo de Itens (+2d6),
 * normalização de categorias e resiliência de layout contra scroll-lock.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');
const ItemCatalogEngine = require('../src/core/item-catalog-engine');

QUnit.module('ItemCatalogEngine & Scroll Layout Resilience (+2d6)', () => {

    // ==========================================
    // 1. CAMINHO FELIZ — FILTRAGEM POR CATEGORIA (AAA)
    // ==========================================
    QUnit.test('1. Caminho Feliz: filterItems retorna itens corretos para todas as opções do formV6 (AAA)', (assert) => {
        // Arrange
        const categoriesToTest = [
            { cat: 'ALL', expectedMin: 15 },
            { cat: 'Arma Corpo-a-Corpo', expectedMin: 5, expectedSample: 'Espada Longa' },
            { cat: 'Arma à Distância', expectedMin: 3, expectedSample: 'Arco Longo de Guerra' },
            { cat: 'Armadura Leve', expectedMin: 1, expectedSample: 'Armadura de Couro Fervido' },
            { cat: 'Armadura Média', expectedMin: 1, expectedSample: 'Cota de Malha de Ferro' },
            { cat: 'Armadura Pesada', expectedMin: 2, expectedSample: 'Armadura Completa de Placas' },
            { cat: 'Escudo', expectedMin: 2, expectedSample: 'Broquel de Bordo' },
            { cat: 'Consumível', expectedMin: 3, expectedSample: 'Poção de Sangue Vital' },
            { cat: 'Aventura', expectedMin: 1, expectedSample: 'Tocha Rúnica Inextinguível' }
        ];

        // Act & Assert
        categoriesToTest.forEach(({ cat, expectedMin, expectedSample }) => {
            const results = ItemCatalogEngine.filterItems('', cat);
            assert.ok(
                results.length >= expectedMin,
                `Categoria "${cat}" deve retornar no mínimo ${expectedMin} itens (retornou: ${results.length})`
            );
            if (expectedSample) {
                const found = results.some(it => it.name === expectedSample);
                assert.ok(found, `Categoria "${cat}" deve conter o item de exemplo "${expectedSample}"`);
            }
        });
    });

    // ==========================================
    // 2. CAMINHO FELIZ — BUSCA TEXTUAL E ALIASES (AAA)
    // ==========================================
    QUnit.test('2. Caminho Feliz: Busca textual por nome, dano e efeito com aliases formatados (AAA)', (assert) => {
        // Arrange
        const searchTermName = 'machado';
        const searchTermDamage = '2d6';
        const searchTermDesc = 'tendões';

        // Act
        const resultsName = ItemCatalogEngine.filterItems(searchTermName, 'ALL');
        const resultsDamage = ItemCatalogEngine.filterItems(searchTermDamage, 'ALL');
        const resultsDesc = ItemCatalogEngine.filterItems(searchTermDesc, 'ALL');

        // Assert
        assert.ok(resultsName.length >= 1, 'Busca por "machado" deve encontrar pelo menos 1 item');
        assert.strictEqual(resultsName[0].name, 'Machado de Batalha');
        assert.strictEqual(resultsName[0].dano, '1d6+3', 'Alias "dano" deve corresponder ao damage original');
        assert.ok(resultsName[0].custo.includes('Moedas'), 'Alias "custo" deve formatar o preço em moedas');

        assert.ok(resultsDamage.length >= 1, 'Busca por dano "2d6" deve encontrar a Besta Pesada Rúnica');
        assert.strictEqual(resultsDamage[0].id, 'besta_pesada');

        assert.ok(resultsDesc.length >= 1, 'Busca por texto na descrição deve encontrar o Arco Longo');
        assert.strictEqual(resultsDesc[0].id, 'arco_longo');
    });

    // ==========================================
    // 3. CASOS DE BORDA — ROBUSTEZ A ACENTOS E NULOS (AAA)
    // ==========================================
    QUnit.test('3. Casos de Borda: Insensibilidade a maiúsculas, acentuação e entradas vazias/nulas (AAA)', (assert) => {
        // Arrange
        const variantDistance = 'arma a distancia'; // sem crase nem acento
        const variantConsumable = 'CONSUMÍVEIS & ALQUIMIA';
        const variantShield = 'escudos';

        // Act
        const resDist = ItemCatalogEngine.filterItems('', variantDistance);
        const resCons = ItemCatalogEngine.filterItems('', variantConsumable);
        const resShield = ItemCatalogEngine.filterItems('', variantShield);
        const resNull = ItemCatalogEngine.filterItems(null, null);
        const resUndefined = ItemCatalogEngine.filterItems();
        const resUnknownCat = ItemCatalogEngine.filterItems('', 'CategoriaInexistente123');

        // Assert
        assert.ok(resDist.length >= 3, 'Deve encontrar armas à distância mesmo sem acento ("arma a distancia")');
        assert.ok(resCons.length >= 3, 'Deve encontrar consumíveis em caixa alta com caracteres extras');
        assert.ok(resShield.length >= 2, 'Deve encontrar escudos no plural');
        assert.strictEqual(resNull.length, 17, 'Filtro nulo deve retornar catálogo completo');
        assert.strictEqual(resUndefined.length, 17, 'Filtro sem argumentos deve retornar catálogo completo');
        assert.strictEqual(resUnknownCat.length, 0, 'Categoria desconhecida deve retornar array vazio com segurança');
    });

    // ==========================================
    // 4. TRATAMENTO DE EXCEÇÕES E VALIDAÇÕES (AAA)
    // ==========================================
    QUnit.test('4. Tratamento de Exceções: getItemById e manipulação de ficha com IDs inválidos (AAA)', (assert) => {
        // Arrange
        const invalidIds = [null, undefined, '', '   ', 12345, {}];

        // Act & Assert
        invalidIds.forEach(badId => {
            const item = ItemCatalogEngine.getItemById(badId);
            assert.strictEqual(item, null, `getItemById(${JSON.stringify(badId)}) deve retornar null graciosamente`);
        });

        // Teste de addItemToSheet com item inválido
        assert.throws(
            () => ItemCatalogEngine.addItemToSheet({}, null),
            /Item inválido/,
            'addItemToSheet deve lançar erro claro se o item for nulo'
        );
    });

    // ==========================================
    // 5. RESILIÊNCIA DE LAYOUT & SCROLL NO items.html (AAA)
    // ==========================================
    QUnit.test('5. Resiliência de Layout: items.html não possui flex centering que bloqueia scroll (AAA)', (assert) => {
        // Arrange
        const itemsHtmlPath = path.resolve(__dirname, '../public/items.html');
        assert.ok(fs.existsSync(itemsHtmlPath), 'public/items.html deve existir no repositório');
        const html = fs.readFileSync(itemsHtmlPath, 'utf8');

        // Act & Assert
        // O body NÃO pode ter 'items-center justify-center' simultaneamente no body, pois isso trava o scroll vertical
        const bodyTagMatch = html.match(/<body[^>]*class="([^"]*)"/i);
        assert.ok(bodyTagMatch, 'Tag <body ...> com atributo class deve existir');

        const bodyClass = bodyTagMatch ? bodyTagMatch[1] : '';
        assert.notOk(
            bodyClass.includes('justify-center'),
            'Body do items.html NÃO deve ter a classe justify-center (que impede rolagem até o topo/fundo)'
        );
        assert.ok(
            bodyClass.includes('overflow-y-auto') || bodyClass.includes('flex-col'),
            'Body do items.html deve permitir rolagem vertical com flex-col ou overflow-y-auto'
        );

        // Deve conter botão para criação de herói de teste em estado inicial vazio
        assert.ok(
            html.includes('create-sample-character-btn'),
            'items.html deve conter botão #create-sample-character-btn para evitar tela travada sem personagens'
        );

        // Deve conter modal de transferência
        assert.ok(
            html.includes('id="transfer-modal"'),
            'items.html deve conter #transfer-modal estruturado'
        );
    });

    // ==========================================
    // 6. RESILIÊNCIA DE MODAIS & ALERTAS NO formV6.html (AAA)
    // ==========================================
    QUnit.test('6. Resiliência de Modais: formV6.html possui botão de OK no alert-modal e catálogo navegável (AAA)', (assert) => {
        // Arrange
        const formHtmlPath = path.resolve(__dirname, '../public/formV6.html');
        assert.ok(fs.existsSync(formHtmlPath), 'public/formV6.html deve existir');
        const html = fs.readFileSync(formHtmlPath, 'utf8');

        // Act & Assert
        // alert-modal deve ter botão Entendido/OK e mensagem container
        assert.ok(
            html.includes('id="alert-modal-ok"'),
            'formV6.html deve conter botão #alert-modal-ok para descarte imediato do alerta de equipamento'
        );
        assert.ok(
            html.includes('id="alert-modal-message"'),
            'formV6.html deve conter container de mensagem #alert-modal-message'
        );

        // item-catalog-modal deve ter container de lista com scroll
        assert.ok(
            html.includes('id="item-catalog-list-container"'),
            'formV6.html deve conter #item-catalog-list-container'
        );
        assert.ok(
            html.includes('max-h-[60vh] overflow-y-auto') || html.includes('overflow-y-auto'),
            'Lista do catálogo no modal deve conter rolagem vertical (overflow-y-auto)'
        );

        // O select de categorias deve ter opções ricas
        assert.ok(
            html.includes('value="Arma Corpo-a-Corpo"'),
            'Select deve conter opção Arma Corpo-a-Corpo'
        );
        assert.ok(
            html.includes('value="Arma à Distância"'),
            'Select deve conter opção Arma à Distância'
        );
        assert.ok(
            html.includes('value="Consumível"'),
            'Select deve conter opção Consumível'
        );
    });

    // ==========================================
    // 7. SCROLL DOS MODAIS INDEPENDENTE DO TAILWIND PRÉ-COMPILADO (AAA)
    // ==========================================
    QUnit.test('7. Resiliência de Scroll: .modal rolável e lista do catálogo não depende de classes arbitrárias do Tailwind (AAA)', (assert) => {
        // Arrange
        const html = fs.readFileSync(path.resolve(__dirname, '../public/formV6.html'), 'utf8');
        const tailwindCss = fs.readFileSync(path.resolve(__dirname, '../public/tailwind.css'), 'utf8');
        const modalRule = (html.match(/\.modal\s*\{[^}]*\}/) || [''])[0];
        const contentRule = (html.match(/\.modal-content\s*\{[^}]*\}/) || [''])[0];
        const listTag = (html.match(/<div id="item-catalog-list-container"[^>]*>/) || [''])[0];

        // Act & Assert
        assert.ok(/overflow-y:\s*auto/.test(modalRule), '.modal deve permitir rolagem vertical (overflow-y:auto)');
        assert.ok(/max-height:\s*calc\(100vh/.test(contentRule), '.modal-content deve ter altura máxima limitada à viewport');
        assert.ok(listTag.includes('modal-scroll-list'), 'Lista do catálogo deve usar a classe CSS própria .modal-scroll-list');
        assert.ok(/\.modal-scroll-list\s*\{[^}]*overflow-y:\s*auto/.test(html), '.modal-scroll-list deve definir overflow-y:auto');
        assert.notOk(listTag.includes('max-h-[60vh]'), 'Não deve usar max-h-[60vh], ausente no tailwind.css pré-compilado');
        assert.notOk(tailwindCss.includes('max-h-\\[60vh\\]'), 'Premissa: tailwind.css não contém max-h-[60vh]');
    });
});
