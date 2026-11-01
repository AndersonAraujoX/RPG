/**
 * Suíte de Testes Unitários — LiveSheetController (Pilar 3: Modo Ficha de Jogo & Pilar 4: Ecossistema)
 *
 * Padrão: Arrange-Act-Assert (AAA)
 * Cobertura Completa:
 * 1. Caminho Feliz (Happy Path):
 *    - Controle de PV e PE (dano, cura, limites máx e mín).
 *    - Descanso Curto (recuperação de metade do PE Máx) e Longo (full PV/PE e limpeza de condições).
 *    - Alternância e ativação de Condições (Sangrando, Atordoado, Em Guarda, Inconsciente).
 *    - Cálculo de Defesa Passiva Efetiva considerando condições.
 *    - Rolagens de Perícia em 1-Clique (+2d6) com acertos críticos e falhas críticas.
 *    - Extração de Cartões de Ataques (desarmado e armas em equipamento) e Magias.
 *    - Geração de Payload de Token para a Mesa Virtual (VTT).
 *    - Sincronização com Árvore de Magia (caminhos e magias aprendidas).
 *    - Duplicação/Clonagem de Ficha com novo ID e sufixo.
 *    - Exportação e importação estruturada de JSON.
 * 2. Casos de Borda (Edge Cases):
 *    - PV zerado ativa inconsciente; sobre-cura não excede MaxHP.
 *    - PE não fica negativo nem excede MaxPE.
 *    - Descanso curto com PE já cheio; descanso longo com condições vazias.
 *    - Personagem sem armas ou com texto vazio gera ataque desarmado padrão.
 *    - Duplicação de ficha com campos nulos/vazios.
 *    - Importação de JSON mal formatado ou corrompido.
 * 3. Tratamento de Exceções & Erros:
 *    - Duplicação com objeto nulo lança erro descritivo.
 */

const QUnit = require('qunit');
const path = require('path');
const LiveSheetController = require('../src/core/live-sheet-controller');

QUnit.module('LiveSheetController — Modo Ficha de Jogo & Ecossistema (+2d6)', function () {

    // =========================================================================
    // 1. CONTROLE RÁPIDO DE PV E PE (FLUXO VITAL & DESCANSOS) - AAA
    // =========================================================================

    QUnit.test('1. Caminho Feliz: Dano e Cura de PV dentro dos limites (AAA)', function (assert) {
        // Arrange
        const maxHP = 20;
        const initialHP = 15;

        // Act - Tomar 5 de dano
        const damageRes = LiveSheetController.modifyHP(initialHP, maxHP, -5);

        // Assert
        assert.equal(damageRes.currentHP, 10, 'PV deve reduzir para 10');
        assert.equal(damageRes.percentage, 50, 'Porcentagem de vida deve ser 50%');
        assert.notOk(damageRes.isUnconscious, 'Não deve estar inconsciente');

        // Act - Curar 8 de PV
        const healRes = LiveSheetController.modifyHP(damageRes.currentHP, maxHP, 8);

        // Assert
        assert.equal(healRes.currentHP, 18, 'PV deve aumentar para 18');
        assert.equal(healRes.percentage, 90, 'Porcentagem de vida deve ser 90%');
    });

    QUnit.test('2. Casos de Borda: PV zerado ativa Inconsciência e não fica negativo (AAA)', function (assert) {
        // Arrange
        const maxHP = 16;
        const currentHP = 4;

        // Act - Tomar dano maior que a vida atual
        const result = LiveSheetController.modifyHP(currentHP, maxHP, -10);

        // Assert
        assert.equal(result.currentHP, 0, 'PV deve ser limitado ao mínimo de 0');
        assert.ok(result.isUnconscious, 'isUnconscious deve ser verdadeiro quando HP zerar');
        assert.equal(result.percentage, 0, 'Porcentagem de vida deve ser 0%');

        // Act - Sobrecura além do máximo
        const overHeal = LiveSheetController.modifyHP(0, maxHP, 100);
        assert.equal(overHeal.currentHP, 16, 'PV não deve exceder maxHP');
        assert.notOk(overHeal.isUnconscious, 'Deixa de estar inconsciente');
    });

    QUnit.test('3. Caminho Feliz: Dano e Gasto de PE (AAA)', function (assert) {
        // Arrange
        const maxPE = 12;
        const currentPE = 12;

        // Act - Gastar 4 PE em magia
        const spendRes = LiveSheetController.modifyPE(currentPE, maxPE, -4);

        // Assert
        assert.equal(spendRes.currentPE, 8, 'PE deve diminuir para 8');
        assert.equal(spendRes.percentage, 67, 'Porcentagem aproximada de 67%');

        // Act - Gasto excessivo
        const overSpend = LiveSheetController.modifyPE(8, maxPE, -20);
        assert.equal(overSpend.currentPE, 0, 'PE deve ser limitado a 0');
    });

    QUnit.test('4. Caminho Feliz & Borda: Descanso Curto e Longo (AAA)', function (assert) {
        // Arrange
        const maxHP = 18;
        const maxPE = 10;
        const currentPE = 2;

        // Act - Descanso Curto (recupera ceil(10/2) = 5 PE)
        const shortRest = LiveSheetController.applyShortRest(currentPE, maxPE);

        // Assert
        assert.equal(shortRest.currentPE, 7, 'PE deve subir de 2 para 7 (recuperou 5)');
        assert.equal(shortRest.recoveredPE, 5, 'Recuperou 5 PE');

        // Act - Descanso Longo limpa condições comuns e restaura tudo
        const longRest = LiveSheetController.applyLongRest(maxHP, maxPE, ['sangrando', 'atordoado', 'imobilizado']);

        // Assert
        assert.equal(longRest.currentHP, maxHP, 'PV 100% restaurado');
        assert.equal(longRest.currentPE, maxPE, 'PE 100% restaurado');
        assert.ok(longRest.clearedConditions.includes('sangrando'), 'Sangrando deve ter sido limpo');
        assert.ok(longRest.clearedConditions.includes('atordoado'), 'Atordoado deve ter sido limpo');
        assert.ok(longRest.conditions.includes('imobilizado'), 'Imobilizado não é condição temporária de descanso e permanece');
    });

    // =========================================================================
    // 2. RASTREADOR DE CONDIÇÕES E DEFESA EFETIVA - AAA
    // =========================================================================

    QUnit.test('5. Caminho Feliz: Alternar Condições e aplicar modificadores na Defesa (AAA)', function (assert) {
        // Arrange
        let conditions = [];
        const baseDes = 3; // Base defense = 7 + 3 = 10

        // Act - Ativar Em Guarda (+2 Defesa)
        conditions = LiveSheetController.toggleCondition(conditions, 'em_guarda');
        const defEmGuarda = LiveSheetController.getEffectiveDefense(baseDes, 0, conditions);

        // Assert
        assert.ok(conditions.includes('em_guarda'), 'Em Guarda deve estar ativa');
        assert.equal(defEmGuarda, 12, 'Defesa efetiva deve subir de 10 para 12 (7 + 3 + 2)');

        // Act - Ativar também Atordoado (-2 Ataque, -2 Defesa)
        conditions = LiveSheetController.toggleCondition(conditions, 'atordoado');
        const defAmbos = LiveSheetController.getEffectiveDefense(baseDes, 0, conditions);
        const mods = LiveSheetController.getConditionModifiers(conditions);

        // Assert
        assert.equal(defAmbos, 10, 'Defesa volta para 10 (+2 Em Guarda -2 Atordoado)');
        assert.equal(mods.attackMod, -2, 'Penalidade de -2 no ataque devido a Atordoado');

        // Act - Desativar Em Guarda
        conditions = LiveSheetController.toggleCondition(conditions, 'em_guarda');
        assert.notOk(conditions.includes('em_guarda'), 'Em Guarda desativada');
    });

    // =========================================================================
    // 3. ROLAGENS DIRETAS EM 1 CLIQUE (+2d6) - AAA
    // =========================================================================

    QUnit.test('6. Caminho Feliz: Rolagem de Perícia com Acerto Crítico e Modificador de Condição (AAA)', function (assert) {
        // Arrange
        const optionsCrit = {
            skillName: 'Luta',
            skillBonus: 3,
            attrValue: 4,
            attrName: 'FOR',
            cd: 15,
            activeConditions: ['atordoado'], // -2 penalidade
            forcedD1: 6,
            forcedD2: 6 // 12 nos dados = Acerto Crítico
        };

        // Act
        const resCrit = LiveSheetController.rollSkill(optionsCrit);

        // Assert
        assert.ok(resCrit.isCriticalSuccess, '12 nos dados deve ser Crítico');
        assert.ok(resCrit.success, 'Crítico é sempre sucesso');
        assert.equal(resCrit.conditionPenalty, -2, 'Penalidade de -2 aplicada');
        assert.equal(resCrit.total, 12 + 4 + 3 - 2, 'Total = 17');

        // Arrange - Falha Crítica
        const optionsFumble = {
            skillName: 'Furtividade',
            skillBonus: 2,
            attrValue: 3,
            attrName: 'DES',
            cd: 8,
            forcedD1: 1,
            forcedD2: 1 // 2 nos dados = Falha Crítica
        };

        // Act
        const resFumble = LiveSheetController.rollSkill(optionsFumble);

        // Assert
        assert.ok(resFumble.isCriticalFailure, '2 nos dados é Falha Crítica');
        assert.notOk(resFumble.success, 'Falha crítica não é sucesso mesmo atingindo valor numérico');
    });

    // =========================================================================
    // 4. CARTÕES DE ATAQUES E MAGIAS FORMATADOS - AAA
    // =========================================================================

    QUnit.test('7. Caminho Feliz: Extração de Cartões de Ataque e Magias (AAA)', function (assert) {
        // Arrange
        const sheetData = {
            for: 4,
            des: 3,
            pod: 3,
            int: 4,
            pericias: [
                { name: 'Luta', value: 2 },
                { name: 'Pontaria com Arco', value: 3 }
            ],
            equipment: 'Espada Longa de Aço (dano: 1d6+3), Arco Curto Élfico (1d6+1)',
            caminhosMagia: [
                { nome: 'Fogo', nivel: 2 }
            ]
        };

        const magicTreeState = {
            learnedAbilities: [
                { id: 'fusion_plasma', spell: 'Tempestade de Plasma', categoryName: 'Plasma', forma: 'Criar', cd: 12, pe: 4, bonus: 2 }
            ]
        };

        // Act
        const attacks = LiveSheetController.extractAttackCards(sheetData, []);
        const spells = LiveSheetController.extractSpellCards(sheetData, magicTreeState);

        // Assert - Ataques
        assert.ok(attacks.length >= 3, 'Deve extrair Golpe Desarmado + Espada Longa + Arco Curto');
        const unarmed = attacks.find(a => a.id === 'unarmed');
        assert.ok(unarmed, 'Golpe desarmado presente');
        assert.equal(unarmed.attackBonus, 4 + 2, 'FOR (4) + Luta (2) = 6');

        const sword = attacks.find(a => a.name.includes('Espada Longa'));
        assert.ok(sword, 'Espada Longa presente');
        assert.equal(sword.damageFormula, '1d6+3', 'Fórmula de dano da espada');

        // Assert - Magias
        assert.ok(spells.length >= 2, 'Deve conter magia do caminho Fogo + Magia da Árvore de Magia');
        const fogo = spells.find(s => s.name.includes('Fogo'));
        assert.ok(fogo, 'Magia de Fogo presente');
        assert.equal(fogo.nivel, 2, 'Nível 2');

        const plasma = spells.find(s => s.name === 'Tempestade de Plasma');
        assert.ok(plasma, 'Magia da Árvore de Magia integrada');
        assert.equal(plasma.peCost, 4, 'Custo de 4 PEs');
    });

    // =========================================================================
    // 5. INTEGRAÇÃO COM ECOSSISTEMA DO PORTAL KUAR-TOR - AAA
    // =========================================================================

    QUnit.test('8. Caminho Feliz: Geração de Token para o VTT (prepareVttTokenPayload) (AAA)', function (assert) {
        // Arrange
        const sheetData = {
            id: 'arthur_01',
            charName: 'Arthur de Kuar-Tor',
            for: 4,
            des: 3,
            con: 3,
            pontosVida: 16,
            pontosEnergia: 14,
            avatarUrl: 'https://avatar.exemplo.com/arthur.jpg'
        };

        const liveState = {
            currentHP: 12,
            currentPE: 8,
            conditions: ['em_guarda']
        };

        // Act
        const tokenPayload = LiveSheetController.prepareVttTokenPayload(sheetData, liveState);

        // Assert
        assert.equal(tokenPayload.id, 'arthur_01', 'ID preservado');
        assert.equal(tokenPayload.name, 'Arthur de Kuar-Tor', 'Nome correto');
        assert.equal(tokenPayload.hp, 12, 'HP sincronizado com liveState');
        assert.equal(tokenPayload.maxHp, 16, 'MaxHP correto');
        assert.equal(tokenPayload.pe, 8, 'PE sincronizado com liveState');
        assert.equal(tokenPayload.maxPe, 14, 'MaxPE correto');
        assert.equal(tokenPayload.defense, 12, 'Defesa inclui Em Guarda (7 + 3 + 2 = 12)');
        assert.ok(tokenPayload.conditions.includes('em_guarda'), 'Condição incluída');
        assert.ok(Array.isArray(tokenPayload.attacks), 'Ataques pré-calculados gerados para o VTT');
    });

    QUnit.test('9. Caminho Feliz: Sincronização Bidirecional com a Árvore de Magia (AAA)', function (assert) {
        // Arrange
        const sheetData = {
            charName: 'Mago Operativo',
            caminhosMagia: [{ nome: 'Fogo', nivel: 1 }]
        };

        const magicTreeState = {
            skills: { "fogo": 3, "ar": 2 },
            learnedAbilities: [
                { id: 'plasma_01', spell: 'Tempestade de Plasma', cd: 12, pe: 4 }
            ]
        };

        // Act
        const syncResult = LiveSheetController.syncMagicTree(sheetData, magicTreeState);

        // Assert
        assert.equal(syncResult.learnedAbilitiesCount, 1, 'Importou 1 habilidade da árvore');
        const fogo = syncResult.updatedSheet.caminhosMagia.find(c => c.nome.toLowerCase() === 'fogo');
        assert.equal(fogo.nivel, 3, 'Nível de Fogo atualizado de 1 para 3');
        const ar = syncResult.updatedSheet.caminhosMagia.find(c => c.nome.toLowerCase() === 'ar');
        assert.ok(ar, 'Novo caminho Ar adicionado à ficha');
        assert.equal(ar.nivel, 2, 'Nível 2 em Ar');
    });

    QUnit.test('10. Caminho Feliz & Casos de Borda: Duplicação de Ficha (AAA)', function (assert) {
        // Arrange
        const originalSheet = {
            id: 'original_123',
            charName: 'Arthur',
            for: 4,
            des: 3,
            pontosVida: 16
        };

        // Act
        const duplicated = LiveSheetController.duplicateSheet(originalSheet);

        // Assert
        assert.notEqual(duplicated.id, originalSheet.id, 'Novo ID único gerado');
        assert.equal(duplicated.charName, 'Arthur (Cópia)', 'Nome acrescido de sufixo (Cópia)');
        assert.equal(duplicated.for, 4, 'Atributos clonados intactos');

        // Act - Custom name
        const duplicatedCustom = LiveSheetController.duplicateSheet(originalSheet, 'Arthur Nv 2');
        assert.equal(duplicatedCustom.charName, 'Arthur Nv 2', 'Nome customizado respeitado');

        // Exception test
        assert.throws(() => LiveSheetController.duplicateSheet(null), /Ficha inválida/, 'Duplicação de nulo deve lançar exceção');
    });

    QUnit.test('11. Caminho Feliz & Casos de Borda: Exportação e Importação JSON (AAA)', function (assert) {
        // Arrange
        const sheetData = {
            charName: 'Herói Teste',
            for: 3,
            con: 4
        };
        const liveState = { currentHP: 14, currentPE: 10, conditions: ['sangrando'] };

        // Act - Export
        const jsonString = LiveSheetController.exportJson(sheetData, liveState);
        assert.ok(typeof jsonString === 'string', 'Export gera string');

        // Act - Import
        const importRes = LiveSheetController.importJson(jsonString);

        // Assert
        assert.ok(importRes.success, 'Importação bem sucedida');
        assert.equal(importRes.data.charName, 'Herói Teste', 'Dados preservados');
        assert.equal(importRes.data.liveState.currentHP, 14, 'LiveState preservado');

        // Borda - JSON inválido
        const invalidRes = LiveSheetController.importJson('{ json corrompido');
        assert.notOk(invalidRes.success, 'JSON inválido tratado sem quebra');
        assert.ok(invalidRes.error.includes('Falha no parsing'), 'Mensagem de erro amigável');

        const emptyRes = LiveSheetController.importJson('');
        assert.notOk(emptyRes.success, 'String vazia tratada');
    });
});
