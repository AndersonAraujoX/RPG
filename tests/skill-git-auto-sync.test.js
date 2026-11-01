/**
 * Testes Unitários: Skill de Sincronização Automática com GitHub (git-auto-sync)
 *
 * Valida a documentação da skill (.agents/skills/git-auto-sync/SKILL.md),
 * as regras mandatórias do agente (.agents/rules/agente.md) e o motor de automação (scripts/git-sync.js).
 *
 * Estrutura Arrange-Act-Assert (AAA):
 * 1. Estrutura e Frontmatter YAML da Skill
 * 2. Conteúdo das 5 Fases do Protocolo e Checklist
 * 3. Validação das Regras do Agente (agente.md)
 * 4. Motor GitAutoSync: Formatação de Commit Semântico e Detecção de Contexto
 * 5. Motor GitAutoSync: Quality Gate de Testes Unitários (Mocks)
 * 6. Motor GitAutoSync: Ciclo Completo de Sincronização (Mocks)
 * 7. Casos de Borda: Working Tree Limpa, Dry-Run e Coleções Vazias
 * 8. Tratamento de Exceções: Descrições Nulas e Bloqueio de Push em Falhas
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');
const GitAutoSync = require('../scripts/git-sync');

const SKILL_MD_PATH = path.resolve(__dirname, '../.agents/skills/git-auto-sync/SKILL.md');
const AGENTE_RULE_PATH = path.resolve(__dirname, '../.agents/rules/agente.md');
const PACKAGE_JSON_PATH = path.resolve(__dirname, '../package.json');

QUnit.module('Skill de Sincronização Automática com GitHub (git-auto-sync)', function () {

    // -------------------------------------------------------------------------
    // 1. Estrutura e Frontmatter YAML da Skill
    // -------------------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: SKILL.md existe e possui frontmatter válido (AAA)', function (assert) {
        // Arrange & Act
        assert.ok(fs.existsSync(SKILL_MD_PATH), 'SKILL.md deve existir na pasta .agents/skills/git-auto-sync/');
        const content = fs.readFileSync(SKILL_MD_PATH, 'utf-8');

        // Assert
        assert.ok(content.startsWith('---'), 'Arquivo deve iniciar com frontmatter YAML');
        assert.ok(content.includes('name: git-auto-sync'), 'Nome da skill deve ser git-auto-sync');
        assert.ok(content.includes('description:'), 'Deve conter descrição da skill');
    });

    // -------------------------------------------------------------------------
    // 2. Conteúdo das 5 Fases do Protocolo
    // -------------------------------------------------------------------------
    QUnit.test('2. Caminho Feliz: SKILL.md documenta o protocolo de 5 fases e checklist (AAA)', function (assert) {
        // Arrange
        const content = fs.readFileSync(SKILL_MD_PATH, 'utf-8');

        // Act & Assert
        assert.ok(content.includes('Fase 1: Quality Gate de Testes Unitários'), 'Deve conter Fase 1');
        assert.ok(content.includes('Fase 2: Inspecionar Modificações'), 'Deve conter Fase 2');
        assert.ok(content.includes('Fase 3: Staging Seguro'), 'Deve conter Fase 3');
        assert.ok(content.includes('Fase 4: Commit Semântico'), 'Deve conter Fase 4');
        assert.ok(content.includes('Fase 5: Envio Imediato ao Repositório Remoto'), 'Deve conter Fase 5');
        assert.ok(content.includes('Checklist de Conclusão da Skill'), 'Deve conter checklist final');
        assert.ok(content.includes('git push origin'), 'Deve documentar comando de push');
    });

    // -------------------------------------------------------------------------
    // 3. Validação das Regras do Agente (agente.md) e package.json
    // -------------------------------------------------------------------------
    QUnit.test('3. Caminho Feliz: Regra mandatória em agente.md e script em package.json (AAA)', function (assert) {
        // Arrange & Act
        const ruleContent = fs.readFileSync(AGENTE_RULE_PATH, 'utf-8');
        const pkgContent = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));

        // Assert
        assert.ok(ruleContent.includes('Sincronização Obrigatória com GitHub'), 'agente.md deve ter seção de sincronização obrigatória');
        assert.ok(ruleContent.includes('git-auto-sync'), 'agente.md deve referenciar a skill git-auto-sync');
        assert.ok(ruleContent.includes('git push origin'), 'agente.md deve conter instrução de git push');
        assert.ok(pkgContent.scripts['git-sync'], 'package.json deve conter script git-sync');
    });

    // -------------------------------------------------------------------------
    // 4. Formatação de Mensagens Semânticas e Detecção de Contexto
    // -------------------------------------------------------------------------
    QUnit.test('4. Caminho Feliz: Formatação de Conventional Commits e detecção de escopo (AAA)', function (assert) {
        // Arrange
        const type = 'feat';
        const scope = 'inventory';
        const desc = 'conecta ficha e itens dos jogadores';

        // Act
        const formattedWithScope = GitAutoSync.formatCommitMessage(type, scope, desc);
        const formattedWithoutScope = GitAutoSync.formatCommitMessage('fix', '', 'corrige bug de PE');

        const contextInv = GitAutoSync.detectCommitContext(['public/items.html', 'src/core/character-inventory-bridge.js']);
        const contextTest = GitAutoSync.detectCommitContext(['tests/unit.test.js']);
        const contextDocs = GitAutoSync.detectCommitContext(['README.md', 'docs/guide.md']);

        // Assert
        assert.strictEqual(formattedWithScope, 'feat(inventory): conecta ficha e itens dos jogadores', 'Deve formatar com tipo e escopo');
        assert.strictEqual(formattedWithoutScope, 'fix: corrige bug de PE', 'Deve formatar sem escopo');

        assert.strictEqual(contextInv.scope, 'inventory', 'Deve detectar escopo inventory');
        assert.strictEqual(contextTest.type, 'test', 'Deve detectar tipo test');
        assert.strictEqual(contextDocs.type, 'docs', 'Deve detectar tipo docs');
    });

    // -------------------------------------------------------------------------
    // 5. Quality Gate de Testes Unitários (Mocks)
    // -------------------------------------------------------------------------
    QUnit.test('5. Caminho Feliz: Quality Gate executa npm test e identifica sucesso ou erro (AAA)', function (assert) {
        // Arrange: Mock de sucesso
        const successMock = () => '402 tests passed';
        // Arrange: Mock de falha
        const failureMock = () => {
            const err = new Error('Test run failed');
            err.stdout = Buffer.from('1 test failed');
            throw err;
        };

        // Act
        const gatePass = GitAutoSync.runQualityGate('npm test', successMock);
        const gateFail = GitAutoSync.runQualityGate('npm test', failureMock);

        // Assert
        assert.ok(gatePass.success, 'Gate deve reportar sucesso com mock bem sucedido');
        assert.notOk(gateFail.success, 'Gate deve reportar falha quando o teste quebrar');
        assert.ok(gateFail.output.includes('1 test failed'), 'Output de erro deve ser capturado');
    });

    // -------------------------------------------------------------------------
    // 6. Ciclo Completo de Sincronização (Mocks)
    // -------------------------------------------------------------------------
    QUnit.test('6. Caminho Feliz: Fluxo completo de Staging, Commit e Push (AAA)', function (assert) {
        // Arrange
        const executedCommands = [];
        const mockExec = (cmd) => {
            executedCommands.push(cmd);
            if (cmd === 'git status --porcelain') return ' M public/items.html\n?? src/core/test.js';
            if (cmd === 'git rev-parse --abbrev-ref HEAD') return 'main';
            if (cmd === 'npm test') return 'all pass';
            return '';
        };

        // Act
        const result = GitAutoSync.sync({
            message: 'feat(inventory): conecta ficha e itens dos jogadores',
            remote: 'origin'
        }, mockExec);

        // Assert
        assert.ok(result.success, 'Sincronização deve ter sucesso');
        assert.strictEqual(result.branch, 'main', 'Deve detectar a branch main');
        assert.ok(executedCommands.includes('git status --porcelain'), 'Deve verificar status');
        assert.ok(executedCommands.includes('npm test'), 'Deve rodar quality gate');
        assert.ok(executedCommands.includes('git add .'), 'Deve executar git add .');
        assert.ok(executedCommands.some(c => c.startsWith('git commit -m')), 'Deve executar git commit');
        assert.ok(executedCommands.includes('git push origin main'), 'Deve executar git push origin main');
    });

    // -------------------------------------------------------------------------
    // 7. Casos de Borda: Working Tree Limpa, Dry-Run e Limites
    // -------------------------------------------------------------------------
    QUnit.test('7. Casos de Borda: Working tree limpa e modo Dry-Run (AAA)', function (assert) {
        // Arrange: Repositório sem alterações pendentes
        const cleanMock = (cmd) => {
            if (cmd === 'git status --porcelain') return '';
            if (cmd === 'git rev-parse --abbrev-ref HEAD') return 'main';
            return '';
        };

        // Act: Repositório limpo
        const cleanResult = GitAutoSync.sync({}, cleanMock);

        // Assert
        assert.ok(cleanResult.success, 'Deve retornar sucesso sem executar comandos destrutivos');
        assert.ok(cleanResult.message.includes('Nenhuma alteração pendente'), 'Deve informar que não há alterações');

        // Arrange: Dry Run com alterações
        const commandsDryRun = [];
        const dryRunMock = (cmd) => {
            commandsDryRun.push(cmd);
            if (cmd === 'git status --porcelain') return ' M public/formV6.html';
            if (cmd === 'git rev-parse --abbrev-ref HEAD') return 'main';
            if (cmd === 'npm test') return 'pass';
            return '';
        };

        // Act: Executar dry-run
        const dryResult = GitAutoSync.sync({ dryRun: true }, dryRunMock);

        // Assert
        assert.ok(dryResult.success, 'Dry run deve ser bem sucedido');
        assert.ok(dryResult.log.includes('[DRY RUN]'), 'Log deve indicar simulação');
        assert.notOk(commandsDryRun.includes('git add .'), 'Dry run não deve executar git add');
        assert.notOk(commandsDryRun.some(c => c.startsWith('git push')), 'Dry run não deve executar git push');
    });

    // -------------------------------------------------------------------------
    // 8. Tratamento de Exceções & Prevenção de Erros
    // -------------------------------------------------------------------------
    QUnit.test('8. Tratamento de Exceções: Descrições vazias e bloqueio em testes falhos (AAA)', function (assert) {
        // Act & Assert: Descrição vazia em formatCommitMessage
        assert.throws(function () {
            GitAutoSync.formatCommitMessage('feat', 'vtt', '');
        }, /descrição do commit é obrigatória/, 'Deve lançar erro quando a descrição for vazia');

        // Act & Assert: Testes falhos devem interromper e lançar erro no sync
        const failMock = (cmd) => {
            if (cmd === 'git status --porcelain') return ' M public/broken.js';
            if (cmd === 'npm test') {
                const err = new Error('Falha nos testes');
                err.stdout = Buffer.from('Erro de asserção');
                throw err;
            }
            return '';
        };

        assert.throws(function () {
            GitAutoSync.sync({}, failMock);
        }, /Falha no Quality Gate/, 'Deve bloquear commit e push quando testes falharem');
    });
});
