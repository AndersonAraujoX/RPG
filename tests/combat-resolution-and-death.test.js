/**
 * Testes Unitários para Automação de Ataque em 1 Clique, Defesa Oposta, RD,
 * Testes de Morte Automáticos e Transição de Turnos com Feedback Visual (+2d6)
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const { CharacterSheetRules } = require('../src/core/character-sheet.js');
const INDEX_HTML_PATH = path.resolve(__dirname, '../index.html');

QUnit.module('Combate +2d6: Resolução em 1 Clique & Testes de Morte', function () {

    QUnit.test('1. Teste Oposto de Ataque vs Defesa e Aplicação de Dano com RD', function (assert) {
        // Atacante: DES 3, Perícia 2 -> Mod = +5
        // Defensor: DES 2, Esquiva 1 -> Mod = +3, RD = 2, PV = 20
        // Ataque: Dados [4, 4] = 8 -> Total = 13
        // Defesa: Dados [3, 2] = 5 -> Total = 8 (Ataque Vence!)
        // Dano: Arma 1d6+2 (Dado = 5 -> 7) + Bônus FOR 3 (0) = 7.
        // Dano Final = 7 - 2 (RD) = 5. Novo PV = 20 - 5 = 15.
        const res = CharacterSheetRules.resolveAttackAndDamage({
            attacker: { name: 'Guerreiro', attrVal: 3, skillBonus: 2, forVal: 3 },
            defender: { name: 'Orc', des: 2, defenseSkill: 1, rd: 2, pv: 20, maxPv: 20, con: 2, forStat: 2 },
            weapon: { name: 'Espada Longa', baseDice: 1, baseMod: 2 },
            diceOverrideAttack: [4, 4],
            diceOverrideDefense: [3, 2],
            diceOverrideDamage: [5]
        });

        assert.ok(res.isHit, 'Ataque deve acertar');
        assert.equal(res.attackTotal, 13, 'Total Ataque = 13');
        assert.equal(res.defenseTotal, 8, 'Total Defesa = 8');
        assert.equal(res.rawDamage, 7, 'Dano Bruto = 7 (5+2)');
        assert.equal(res.finalDamage, 5, 'Dano Final = 5 (7 - 2 RD)');
        assert.equal(res.newPv, 15, 'Novo PV do Alvo = 15');
        assert.notOk(res.isDying, 'Alvo ainda está vivo');
    });

    QUnit.test('2. Defesa Bem-Sucedida do Alvo (0 de Dano)', function (assert) {
        // Ataque: Dados [2, 2] = 4 + 3 + 2 = 9
        // Defesa: Dados [5, 5] = 10 + 2 + 1 = 13 (Defesa Vence!)
        const res = CharacterSheetRules.resolveAttackAndDamage({
            attacker: { name: 'Guerreiro', attrVal: 3, skillBonus: 2, forVal: 3 },
            defender: { name: 'Orc', des: 2, defenseSkill: 1, rd: 2, pv: 20, maxPv: 20 },
            weapon: { name: 'Espada Longa', baseDice: 1, baseMod: 2 },
            diceOverrideAttack: [2, 2],
            diceOverrideDefense: [5, 5]
        });

        assert.notOk(res.isHit, 'Ataque deve errar');
        assert.equal(res.finalDamage, 0, 'Dano final = 0');
        assert.equal(res.newPv, 20, 'PV do defensor inalterado');
    });

    QUnit.test('3. Acerto Crítico (12 no 2d6) -> Dano Dobrado', function (assert) {
        // Ataque: Dados [6, 6] = 12 (Crítico!)
        // Dano Base: 1d6 (6) + 2 + FOR 3 (0) = 8. Crítico dobra = 16.
        // Dano Final = 16 - 2 (RD) = 14.
        const res = CharacterSheetRules.resolveAttackAndDamage({
            attacker: { name: 'Ladino', attrVal: 3, skillBonus: 2, forVal: 3 },
            defender: { name: 'Goblin', des: 3, defenseSkill: 2, rd: 2, pv: 15, maxPv: 15 },
            weapon: { name: 'Adaga de Precisão', baseDice: 1, baseMod: 2 },
            diceOverrideAttack: [6, 6],
            diceOverrideDefense: [6, 6],
            diceOverrideDamage: [6]
        });

        assert.ok(res.isCrit, 'Deve identificar Acerto Crítico');
        assert.ok(res.isHit, 'Crítico acerta automaticamente');
        assert.equal(res.rawDamage, 16, 'Dano Dobrado = 16 (8 * 2)');
        assert.equal(res.finalDamage, 14, 'Dano Final com RD = 14 (16 - 2)');
        assert.equal(res.newPv, 1, 'Novo PV do defensor = 1');
    });

    QUnit.test('4. Falha Crítica (2 no 2d6) -> Erro Automático', function (assert) {
        const res = CharacterSheetRules.resolveAttackAndDamage({
            attacker: { name: 'Arqueiro', attrVal: 4, skillBonus: 3, forVal: 2 },
            defender: { name: 'Alvo', des: 0, defenseSkill: 0, rd: 0, pv: 20 },
            weapon: { name: 'Arco', baseDice: 1, baseMod: 0 },
            diceOverrideAttack: [1, 1],
            diceOverrideDefense: [1, 1]
        });

        assert.ok(res.isFumble, 'Identifica Falha Crítica');
        assert.notOk(res.isHit, 'Falha crítica erra automaticamente');
        assert.equal(res.finalDamage, 0, 'Nenhum dano aplicado');
    });

    QUnit.test('5. Automação de Inconsciência e Testes de Morte (+2d6 v2.3)', function (assert) {
        // Redução a PV Negativo (PV 8 - Dano 10 = -2)
        const attackToZero = CharacterSheetRules.resolveAttackAndDamage({
            attacker: { name: 'Mago', attrVal: 3, skillBonus: 2, forVal: 3 },
            defender: { name: 'Guerreiro', des: 2, defenseSkill: 0, rd: 0, pv: 8, maxPv: 20 },
            weapon: { name: 'Raio Mágico', baseDice: 2, baseMod: 0 },
            diceOverrideAttack: [4, 5],
            diceOverrideDefense: [2, 2],
            diceOverrideDamage: [5, 5] // 10 de Dano (FOR 3 mod = 0)
        });

        assert.ok(attackToZero.isDying, 'PV <= 0 deve marcar isDying');
        assert.equal(attackToZero.newPv, -2, 'PV negativo (-2)');

        // Teste de Morte: Sucesso (>= 6)
        const saveSuccess = CharacterSheetRules.resolveDeathSave({
            combatant: { name: 'Guerreiro', deathFailures: 0 },
            diceOverride: [3, 4] // 7
        });
        assert.ok(saveSuccess.isSuccess, 'Rolou 7 -> Sucesso');
        assert.equal(saveSuccess.deathFailures, 0, 'Continua com 0 fracassos');
        assert.notOk(saveSuccess.isDead, 'Não está morto');

        // Teste de Morte: Fracasso (< 6)
        const saveFail1 = CharacterSheetRules.resolveDeathSave({
            combatant: { name: 'Guerreiro', deathFailures: 0 },
            diceOverride: [1, 3] // 4
        });
        assert.notOk(saveFail1.isSuccess, 'Rolou 4 -> Fracasso');
        assert.equal(saveFail1.deathFailures, 1, 'Acumula 1 fracasso');

        // 3 Fracassos = Morte Definitiva
        const saveFail3 = CharacterSheetRules.resolveDeathSave({
            combatant: { name: 'Guerreiro', deathFailures: 2 },
            diceOverride: [2, 3] // 5
        });
        assert.equal(saveFail3.deathFailures, 3, 'Acumula 3 fracassos');
        assert.ok(saveFail3.isDead, '3 Fracassos geram Morte Definitiva (isDead = true)');

        // Rolagem 12 = Estabilização Automática!
        const saveStabilize = CharacterSheetRules.resolveDeathSave({
            combatant: { name: 'Guerreiro', deathFailures: 2 },
            diceOverride: [6, 6] // 12
        });
        assert.ok(saveStabilize.isStabilized, 'Rolou 12 -> Estabilizado');
        assert.equal(saveStabilize.deathFailures, 0, 'Fracassos zerados');

        // Cura / Primeiros Socorros
        const healRes = CharacterSheetRules.healOrStabilizeCombatant({
            combatant: { name: 'Guerreiro', pv: -2, maxPv: 20 },
            healAmount: 5
        });
        assert.equal(healRes.newPv, 3, 'PV restaurado para positivo');
        assert.ok(healRes.isStabilized, 'Estabilizado');
        assert.notOk(healRes.isDying, 'Não está mais morrendo');
    });

    QUnit.test('6. Verificação de Elementos e Funções no index.html', function (assert) {
        assert.ok(fs.existsSync(INDEX_HTML_PATH), 'index.html existe');
        const content = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

        // Modal de Ataque em 1 Clique
        assert.ok(content.includes('id="attack-modal"'), 'Modal #attack-modal presente');
        assert.ok(content.includes('id="attack-source-select"'), 'Select de atacante presente');
        assert.ok(content.includes('id="attack-weapon-select"'), 'Select de arma presente');
        assert.ok(content.includes('id="attack-target-select"'), 'Select de alvo presente');
        assert.ok(content.includes('executeOneClickAttack'), 'Função executeOneClickAttack presente');

        // Feedback Visual de Turno & Morte
        assert.ok(content.includes('id="turn-toast-banner"'), 'Banner #turn-toast-banner presente');
        assert.ok(content.includes('showTurnToast'), 'Função showTurnToast presente');
        assert.ok(content.includes('resolveDeathSave'), 'Disparo automático de resolveDeathSave');
        assert.ok(content.includes('healOrStabilizeCombatantAction'), 'Função healOrStabilizeCombatantAction presente');
    });
});
