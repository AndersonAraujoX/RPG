/**
 * Testes Unitários para a Skill de Refatoração de Código (.agents/skills/code-refactoring)
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const SKILL_PATH = path.resolve(__dirname, '../.agents/skills/code-refactoring/SKILL.md');

QUnit.module('Skill de Refatoração de Código (code-refactoring)', function () {

    QUnit.test('1. Estrutura e Frontmatter da Skill', function (assert) {
        assert.ok(fs.existsSync(SKILL_PATH), 'SKILL.md existe na pasta .agents/skills/code-refactoring/');
        const content = fs.readFileSync(SKILL_PATH, 'utf-8');

        assert.ok(content.startsWith('---'), 'Arquivo inicia com bloco de frontmatter YAML');
        assert.ok(content.includes('name: code-refactoring'), 'Nome da skill definido como code-refactoring');
        assert.ok(content.includes('description:'), 'Descrição da skill presente');
    });

    QUnit.test('2. Conteúdo das Fases e Protocolo de Segurança', function (assert) {
        const content = fs.readFileSync(SKILL_PATH, 'utf-8');

        assert.ok(content.includes('Fase 1: Análise e Baseline de Testes'), 'Fase 1 presente');
        assert.ok(content.includes('Fase 2: Identificação de Oportunidades de Extração'), 'Fase 2 presente');
        assert.ok(content.includes('Fase 3: Extração e Modularização Incremental'), 'Fase 3 presente');
        assert.ok(content.includes('Fase 4: Validação Imediata com Testes'), 'Fase 4 presente');
        assert.ok(content.includes('Fase 5: Limpeza e Polimento'), 'Fase 5 presente');
        assert.ok(content.includes('Checklist de Verificação da Refatoração'), 'Checklist de validação presente');
    });
});
