/**
 * ============================================================================
 * Suíte de Testes Unitários — Sistema de Imersão e Qualidade de Vida (AAA)
 * 
 * Cobertura:
 * 1. Sistema de Conquistas (Achievements Arcanos)
 * 2. Modo Mestre & Eventos Arcanos Globais (Modificadores no 2d6, CD e PE)
 * 3. Grimório Exportável (Geração de HTML e Documento Imprimível)
 * 4. Sintetizador de Som de Runas e Dados (Web Audio API)
 * ============================================================================
 */

const QUnit = require('qunit');
const MagicImmersionSystem = require('../src/core/magic-immersion-system');

const { AchievementsEngine, MasterModeEngine, GrimoireExporter, RuneSoundSynthesizer } = MagicImmersionSystem;

QUnit.module('Imersão: Sistema de Conquistas (AAA)', function () {

    QUnit.test('1. Caminho Feliz: Desbloqueio da conquista "Arauto do Cataclismo" ao conjurar T005', function (assert) {
        // Arrange
        const achState = AchievementsEngine.createAchievementsState();
        const charState = { name: 'Mago Destemido', skills: { fogo: 3, ar: 3, terra: 3 } };
        const event = { type: 'SPELL_CAST', circleId: 't005', success: true };

        // Act
        const result = AchievementsEngine.evaluateAchievements(achState, charState, event);

        // Assert
        assert.equal(result.newlyUnlocked.length, 1, 'Deve desbloquear exatamente 1 conquista');
        assert.equal(result.newlyUnlocked[0].id, 'primeiro_cataclismo', 'Conquista correta');
        assert.ok(result.achState.unlocked.primeiro_cataclismo, 'Marcada como desbloqueada no estado');
    });

    QUnit.test('2. Casos de Borda: Conquistas não duplicam e avaliam todos os 12 caminhos', function (assert) {
        // Arrange: Personagem com 12 caminhos no nível 1+
        const char12 = {
            name: 'Onisciente',
            skills: {
                fogo: 1, agua: 1, ar: 1, terra: 1, luz: 1, trevas: 1,
                animais: 1, humanos: 1, plantas: 1, spiritum: 1, arkanum: 1, metamagia: 1
            }
        };
        const achState = AchievementsEngine.createAchievementsState();

        // Act: Primeira avaliação (deve ganhar doze_caminhos)
        const res1 = AchievementsEngine.evaluateAchievements(achState, char12);
        // Act: Segunda avaliação sem mudanças (não deve duplicar)
        const res2 = AchievementsEngine.evaluateAchievements(achState, char12);

        // Assert
        assert.ok(res1.achState.unlocked.doze_caminhos, 'Desbloqueia mestre da mandala');
        assert.equal(res2.newlyUnlocked.length, 0, 'Não desbloqueia novamente o que já foi ganho');
    });

    QUnit.test('3. Caminho Feliz: Conquistas de Forja Lendária e Especialização', function (assert) {
        // Arrange
        const achState = AchievementsEngine.createAchievementsState();
        const forjaEvent = { type: 'ITEM_CRAFTED', isMasterwork: true };
        const specEvent = { type: 'SPECIALIZATION_CHOSEN' };

        // Act
        const resForja = AchievementsEngine.evaluateAchievements(achState, {}, forjaEvent);
        const resSpec = AchievementsEngine.evaluateAchievements(achState, {}, specEvent);

        // Assert
        assert.ok(resForja.achState.unlocked.mestre_forjador, 'Desbloqueia Ferreiro do Nexo');
        assert.ok(resSpec.achState.unlocked.especialista_supremo, 'Desbloqueia Aspecto Desperto');
    });
});

QUnit.module('Imersão: Modo Mestre e Eventos Arcanos Globais (AAA)', function () {

    QUnit.test('1. Caminho Feliz: "Tempestade de Mana" concede +1 no 2d6 e reduz CD em 1 para Fogo e Ar', function (assert) {
        // Arrange
        const eventKey = 'tempestade_mana';
        const circlePaths = ['fogo', 'ar'];

        // Act
        const mod = MasterModeEngine.calculateEventModifiers(eventKey, circlePaths);

        // Assert
        assert.ok(mod.isAffected, 'Círculo de fogo/ar é afetado');
        assert.strictEqual(mod.rollBonus, 1, 'Bônus de +1 no teste 2d6');
        assert.strictEqual(mod.cdModifier, -1, 'Redução de 1 na CD');
    });

    QUnit.test('2. Casos de Borda: "Eclipse do Sol Negro" penaliza Luz com -1 e bonifica Trevas com +2', function (assert) {
        // Arrange
        const eventKey = 'eclipse_abissal';

        // Act: Círculo de Trevas + Spiritum
        const modTrevas = MasterModeEngine.calculateEventModifiers(eventKey, ['trevas', 'spiritum']);
        // Act: Círculo de Luz pura
        const modLuz = MasterModeEngine.calculateEventModifiers(eventKey, ['luz']);
        // Act: Círculo não relacionado (ex: Plantas + Água)
        const modNeutro = MasterModeEngine.calculateEventModifiers(eventKey, ['plantas', 'agua']);

        // Assert
        assert.strictEqual(modTrevas.rollBonus, 2, 'Trevas ganha +2 de bônus');
        assert.strictEqual(modLuz.rollBonus, -1, 'Luz sofre penalidade de -1');
        assert.strictEqual(modNeutro.rollBonus, 0, 'Caminhos não afetados não recebem bônus nem penalidades');
        assert.notOk(modNeutro.isAffected, 'Identifica que o neutro não foi afetado');
    });
});

QUnit.module('Imersão: Grimório Exportável e Síntese de Som (AAA)', function () {

    QUnit.test('1. Caminho Feliz: Geração de HTML estruturado para impressão do Grimório', function (assert) {
        // Arrange
        const charState = {
            name: 'Valerius Arcano',
            skills: { fogo: 4, luz: 3 },
            specializations: { fogo: 'explosao' }
        };
        const mastered = [
            { id: 's03', name: 'Magma', tier: 'SECUNDUS', paths: ['fogo', 'terra'], desc: 'Lança de fogo' }
        ];

        // Act
        const html = GrimoireExporter.generateGrimoireHTML(charState, mastered);

        // Assert
        assert.ok(html.includes('Valerius Arcano'), 'Nome do mago incluído no título');
        assert.ok(html.includes('GRIMÓRIO DE CÍRCULOS MÁGICOS'), 'Título principal presente');
        assert.ok(html.includes('Nível 4'), 'Nível do caminho impresso');
        assert.ok(html.includes('Magma'), 'Círculo dominado listado');
        assert.ok(html.includes('@media print'), 'Suporte a regras de impressão presente');
    });

    QUnit.test('2. Caminho Feliz: Síntese de som via Web Audio API com AudioContext mockado', function (assert) {
        // Arrange: Mock de AudioContext sem dependência de hardware real
        let createdOscCount = 0;
        const mockCtx = {
            currentTime: 0,
            destination: {},
            createOscillator() {
                createdOscCount++;
                return {
                    type: '',
                    frequency: { setValueAtTime() {} },
                    connect() {},
                    start() {},
                    stop() {}
                };
            },
            createGain() {
                return {
                    gain: {
                        setValueAtTime() {},
                        linearRampToValueAtTime() {},
                        exponentialRampToValueAtTime() {}
                    },
                    connect() {}
                };
            }
        };

        // Act: Toca acorde rúnico (3 osciladores harmônicos)
        const playedHum = RuneSoundSynthesizer.playRuneHum(mockCtx);
        // Act: Toca som de dados (3 impactos)
        const playedDice = RuneSoundSynthesizer.playDiceRollSound(mockCtx);

        // Assert
        assert.ok(playedHum, 'Executou acorde rúnico com sucesso');
        assert.ok(playedDice, 'Executou som de rolagem com sucesso');
        assert.strictEqual(createdOscCount, 6, 'Criou 3 osciladores harmônicos + 3 osciladores de dados');

        // Casos de borda: Sem áudio context (ambiente headless/servidor) retorna false graciosamente
        assert.strictEqual(RuneSoundSynthesizer.playRuneHum(null), false, 'Fallback gracioso quando não há AudioContext');
    });
});
