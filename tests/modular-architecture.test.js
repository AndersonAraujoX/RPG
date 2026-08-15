/**
 * Testes Unitários para a Arquitetura Modular (src/core e src/modules)
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const CombatEngine = require('../src/core/combat-engine.js');
const DiceRoller = require('../src/core/dice-roller.js');
const TacticalGrid = require('../src/modules/tactical-grid.js');
const RoomSync = require('../src/modules/room-sync.js');
const UIController = require('../src/modules/ui-controller.js');
const CombatController = require('../src/modules/combat-controller.js');
const FirestoreService = require('../src/modules/firestore-service.js');

QUnit.module('Arquitetura Modular: src/core/combat-engine.js', function () {

    QUnit.test('1. CombatEngine: Cálculo de Iniciativa (+2d6)', function (assert) {
        const res1 = CombatEngine.calcInitiative(2, 7);
        assert.strictEqual(res1.total, 9, 'DES 2 com rolagem 7 resulta em 9');
        assert.strictEqual(res1.bonus, 0, 'Bônus de DES 2 é 0');

        const res2 = CombatEngine.calcInitiative(4, 8);
        assert.strictEqual(res2.total, 14, 'DES 4 com rolagem 8 resulta em 14');
        assert.strictEqual(res2.bonus, 2, 'Bônus de DES 4 é 2');
    });

    QUnit.test('2. CombatEngine: Ordenação Decrescente de Combatentes', function (assert) {
        const list = [
            { id: '1', name: 'Goblin', init: 10 },
            { id: '2', name: 'Guerreiro', init: 15 },
            { id: '3', name: 'Mago', init: 12 }
        ];
        const sorted = CombatEngine.sortCombatants(list);
        assert.strictEqual(sorted[0].name, 'Guerreiro', '1º lugar: Guerreiro (15)');
        assert.strictEqual(sorted[1].name, 'Mago', '2º lugar: Mago (12)');
        assert.strictEqual(sorted[2].name, 'Goblin', '3º lugar: Goblin (10)');
    });

    QUnit.test('3. CombatEngine: Redução de Condições por Turno', function (assert) {
        const conditions = [
            { name: 'Fogo', duration: 2 },
            { name: 'Pasmar', duration: 1 }
        ];
        const res = CombatEngine.processConditions(conditions);
        assert.strictEqual(res.conditions.length, 1, 'Resta 1 condição ativa');
        assert.strictEqual(res.conditions[0].duration, 1, 'Duração do Fogo reduziu para 1');
        assert.strictEqual(res.expired.length, 1, '1 condição expirou');
        assert.strictEqual(res.expired[0].name, 'Pasmar', 'Pasmar expirou');
    });

    QUnit.test('4. CombatEngine: Resolução em 1 Clique (Ataque vs Defesa Oposta com RD)', function (assert) {
        const attacker = { name: 'Arthur', des: 3, forVal: 3 };
        const defender = { name: 'Orc', des: 2, defenseSkill: 0, pv: 20, rd: 2 };
        const weapon = { name: 'Espada Longa', dice: 1, mod: 2, attrType: 'FOR', skillBonus: 1 };

        const res = CombatEngine.resolveAttack({
            attacker,
            defender,
            weapon,
            forcedRolls: { attD1: 4, attD2: 4, defD1: 3, defD2: 3, damageRoll: 4 }
        });

        assert.ok(res.hit, 'Ataque acertou');
        assert.strictEqual(res.rawDamage, 7, 'Dano bruto calculado corretamente');
        assert.strictEqual(res.finalDamage, 5, 'Dano final após RD 2 é 5');
        assert.strictEqual(res.defender.newPv, 15, 'PV do defensor deduzido para 15');
    });

    QUnit.test('5. CombatEngine: Teste de Morte e Estabilização', function (assert) {
        const dying = { name: 'Ferido', pv: 0, deathFailures: 1 };

        const res1 = CombatEngine.resolveDeathSave(dying, 11);
        assert.ok(res1.isStabilized, 'Rolagem >= 11 estabiliza');

        const res2 = CombatEngine.resolveDeathSave(dying, 4);
        assert.strictEqual(res2.deathFailures, 2, 'Falha incrementou contador para 2');

        const healed = CombatEngine.healOrStabilize(dying, 5);
        assert.strictEqual(healed.pv, 5, 'PV restaurado para 5');
        assert.ok(healed.isStabilized, 'Combatente estabilizado após cura');
    });
});

QUnit.module('Arquitetura Modular: src/core/dice-roller.js', function () {

    QUnit.test('1. DiceRoller: Bônus Sobre-Humano e Divino', function (assert) {
        assert.strictEqual(DiceRoller.getSuperhumanBonus(3), 0, 'Humano (3) = +0');
        assert.strictEqual(DiceRoller.getSuperhumanBonus(7), 6, 'Sobre-Humano (7) = +6');
        assert.strictEqual(DiceRoller.getSuperhumanBonus(12), 12, 'Divino (12) = +12');
    });

    QUnit.test('2. DiceRoller: Execução de Teste 2d6 vs CD e Críticos', function (assert) {
        const critSuccess = DiceRoller.roll({ attrValue: 2, cd: 20, forcedD1: 6, forcedD2: 6 });
        assert.ok(critSuccess.isCriticalSuccess, '6+6 é acerto crítico');
        assert.ok(critSuccess.success, 'Acerto crítico é sucesso automático');

        const critFail = DiceRoller.roll({ attrValue: 10, cd: 5, forcedD1: 1, forcedD2: 1 });
        assert.ok(critFail.isCriticalFailure, '1+1 é falha crítica');
        assert.notOk(critFail.success, 'Falha crítica é fracasso automático');

        const normalRoll = DiceRoller.roll({ attrValue: 3, cd: 10, forcedD1: 3, forcedD2: 4 });
        assert.ok(normalRoll.success, 'Total 10 atinge CD 10');
        assert.strictEqual(normalRoll.total, 10, 'Total calculado 10');
    });
});

QUnit.module('Arquitetura Modular: src/modules/tactical-grid.js', function () {

    QUnit.test('1. TacticalGrid: Snap-to-Grid Magnético', function (assert) {
        assert.strictEqual(TacticalGrid.snapCoordinate(43, 40), 40, '43px alinha em 40px');
        assert.strictEqual(TacticalGrid.snapCoordinate(68, 40), 80, '68px alinha em 80px');

        const snapped = TacticalGrid.snapPosition({ x: 38, y: 84 }, 40);
        assert.deepEqual(snapped, { x: 40, y: 80 }, 'Posição alinhada perfeitamente');
    });

    QUnit.test('2. TacticalGrid: Cálculo de Distância em Metros e Quadrados', function (assert) {
        const p1 = { x: 0, y: 0 };
        const p2 = { x: 120, y: 160 };
        const dist = TacticalGrid.calculateDistance(p1, p2, 40, 1.5);

        assert.strictEqual(dist.squares, 5, 'Distância em quadrados é 5q');
        assert.strictEqual(dist.meters, 7.5, 'Distância em metros é 7.5m');
        assert.ok(dist.formatted.includes('7.5m'), 'String formatada contém 7.5m');
    });
});

QUnit.module('Arquitetura Modular: src/modules/room-sync.js & ui-controller.js', function () {

    QUnit.test('1. RoomSync: Métodos e Resiliência', function (assert) {
        assert.strictEqual(typeof RoomSync.saveLocal, 'function', 'saveLocal existe');
        assert.strictEqual(typeof RoomSync.loadLocal, 'function', 'loadLocal existe');
        assert.strictEqual(typeof RoomSync.debounceSync, 'function', 'debounceSync existe');
        assert.strictEqual(typeof RoomSync.handleSyncError, 'function', 'handleSyncError existe');
    });

    QUnit.test('2. UIController: Controladores de Abas, Modais e Toasts', function (assert) {
        assert.strictEqual(typeof UIController.switchTab, 'function', 'switchTab existe');
        assert.strictEqual(typeof UIController.togglePortalHub, 'function', 'togglePortalHub existe');
        assert.strictEqual(typeof UIController.showTurnToast, 'function', 'showTurnToast existe');
        assert.strictEqual(typeof UIController.openModal, 'function', 'openModal existe');
        assert.strictEqual(typeof UIController.closeModal, 'function', 'closeModal existe');
        assert.strictEqual(typeof UIController.updateStatusBadge, 'function', 'updateStatusBadge existe');
    });

    QUnit.test('3. CombatController: Gerenciamento de Turnos e Iniciativa', function (assert) {
        const combatants = [
            { id: '1', name: 'Guerreiro', des: 3 },
            { id: '2', name: 'Ladrão', des: 4 }
        ];

        const rolled = CombatController.rollInitiativeForAll(combatants);
        assert.ok(rolled.length === 2, '2 combatentes rolados');
        assert.ok(rolled[0].active, 'Primeiro combatente ativo');

        const turnAdv = CombatController.advanceTurn(rolled, 1);
        assert.ok(turnAdv.nextCombatant, 'Próximo combatente selecionado');
        assert.strictEqual(typeof turnAdv.round, 'number', 'Rodada atualizada');
    });

    QUnit.test('4. FirestoreService: Geração de Códigos e Payloads', function (assert) {
        const code = FirestoreService.generateRoomCode();
        assert.strictEqual(code.length, 6, 'Código de sala de 6 dígitos');

        const payload = FirestoreService.buildMessagePayload('Arthur', 'Olá mesa!', true);
        assert.strictEqual(payload.author, 'Arthur', 'Autor correto no payload');
        assert.strictEqual(payload.text, 'Olá mesa!', 'Texto correto');
        assert.ok(payload.isRoll, 'isRoll marcado como true');

        const roomDoc = FirestoreService.buildRoomDocument('Mesa Kuar-Tor', 'uid123', 'Mestre Nitro');
        assert.strictEqual(roomDoc.name, 'Mesa Kuar-Tor', 'Nome da sala correto');
        assert.ok(Array.isArray(roomDoc.combatants), 'Combatentes padrão incluídos');
    });

    QUnit.test('5. Integração com index.html: Verificação de Imports', function (assert) {
        const indexPath = path.resolve(__dirname, '../index.html');
        const content = fs.readFileSync(indexPath, 'utf-8');

        assert.ok(content.includes('src/core/combat-engine.js'), 'Import de combat-engine.js presente');
        assert.ok(content.includes('src/core/dice-roller.js'), 'Import de dice-roller.js presente');
        assert.ok(content.includes('src/modules/tactical-grid.js'), 'Import de tactical-grid.js presente');
        assert.ok(content.includes('src/modules/room-sync.js'), 'Import de room-sync.js presente');
        assert.ok(content.includes('src/modules/ui-controller.js'), 'Import de ui-controller.js presente');
        assert.ok(content.includes('src/modules/combat-controller.js'), 'Import de combat-controller.js presente');
        assert.ok(content.includes('src/modules/firestore-service.js'), 'Import de firestore-service.js presente');
    });
});
