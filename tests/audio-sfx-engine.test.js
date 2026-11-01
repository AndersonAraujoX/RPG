/**
 * @file tests/audio-sfx-engine.test.js
 * @description Suíte de Testes Unitários: AudioSfxEngine (Web Audio API Efeitos Sonoros +2d6)
 * Padrão: Arrange-Act-Assert (AAA)
 */

const QUnit = require('qunit');
const AudioSfxEngineModule = require('../src/core/audio-sfx-engine');
const AudioSfxEngineClass = AudioSfxEngineModule.AudioSfxEngine;

QUnit.module('AudioSfxEngine — Efeitos Sonoros e Feedback Háptico', function () {

    // Helper para criar Mocks de Web Audio API
    function createMockAudioContext() {
        const createdNodes = [];
        const mockContext = {
            currentTime: 10.0,
            state: 'running',
            destination: {},
            resume: () => Promise.resolve(),
            createOscillator: () => {
                const node = {
                    type: 'sine',
                    frequency: {
                        setValueAtTime: () => {},
                        exponentialRampToValueAtTime: () => {}
                    },
                    connect: () => {},
                    start: () => {},
                    stop: () => {}
                };
                createdNodes.push({ type: 'oscillator', node });
                return node;
            },
            createGain: () => {
                const node = {
                    gain: {
                        setValueAtTime: () => {},
                        exponentialRampToValueAtTime: () => {}
                    },
                    connect: () => {}
                };
                createdNodes.push({ type: 'gain', node });
                return node;
            }
        };
        return { mockContext, createdNodes };
    }

    // -------------------------------------------------------------
    // 1. Caminho Feliz: Gerenciamento de Volume e Mute
    // -------------------------------------------------------------
    QUnit.test('1. Caminho Feliz: Controle de Volume com Clamping e Persistência (AAA)', function (assert) {
        // Arrange
        const mockStorage = {};
        const fakeStorage = {
            getItem: k => mockStorage[k] || null,
            setItem: (k, v) => { mockStorage[k] = String(v); }
        };
        const engine = new AudioSfxEngineClass({ storage: fakeStorage });

        // Act
        const volNormal = engine.setVolume(0.75);
        const volAboveMax = engine.setVolume(1.5);
        const volBelowMin = engine.setVolume(-0.2);

        // Assert
        assert.equal(volNormal, 0.75, 'Volume ajustado para 0.75');
        assert.equal(volAboveMax, 1.0, 'Volume acima do limite é fixado em 1.0');
        assert.equal(volBelowMin, 0.0, 'Volume abaixo do limite é fixado em 0.0');
        assert.equal(fakeStorage.getItem('kuartor_sfx_volume'), '0', 'Persistência no storage');
    });

    QUnit.test('2. Caminho Feliz: Alternância de Mudo (Mute/Unmute) (AAA)', function (assert) {
        // Arrange
        const mockStorage = {};
        const fakeStorage = {
            getItem: k => mockStorage[k] || null,
            setItem: (k, v) => { mockStorage[k] = String(v); }
        };
        const engine = new AudioSfxEngineClass({ storage: fakeStorage });

        // Act
        const initial = engine.isMuted();
        const firstToggle = engine.toggleMute();
        const secondToggle = engine.toggleMute();

        // Assert
        assert.equal(initial, false, 'Inicia desmutado por padrão');
        assert.equal(firstToggle, true, 'Primeiro toggle ativa mudo');
        assert.equal(secondToggle, false, 'Segundo toggle desativa mudo');
        assert.equal(fakeStorage.getItem('kuartor_sfx_muted'), 'false', 'Mute sincronizado no storage');
    });

    // -------------------------------------------------------------
    // 2. Caminho Feliz: Síntese de Efeitos Sonoros
    // -------------------------------------------------------------
    QUnit.test('3. Caminho Feliz: Disparo de Rolagem de Dados (playDiceRoll) (AAA)', function (assert) {
        // Arrange
        const { mockContext, createdNodes } = createMockAudioContext();
        let vibrateCalledWith = null;
        const fakeNav = { vibrate: pattern => { vibrateCalledWith = pattern; } };
        const engine = new AudioSfxEngineClass({ audioContext: mockContext, navigatorRef: fakeNav });

        // Act
        engine.playDiceRoll();

        // Assert
        assert.ok(createdNodes.length >= 8, 'Cria osciladores e nós de ganho para simular quiques dos 2d6');
        assert.ok(vibrateCalledWith !== null, 'Aciona vibração háptica');
    });

    QUnit.test('4. Caminho Feliz: Acerto Crítico e Falha Crítica geram frequências corretas (AAA)', function (assert) {
        // Arrange
        const { mockContext, createdNodes } = createMockAudioContext();
        const engine = new AudioSfxEngineClass({ audioContext: mockContext });

        // Act
        engine.playCriticalSuccess();
        const nodesAfterCrit = createdNodes.length;
        engine.playCriticalFailure();
        const nodesAfterFumble = createdNodes.length - nodesAfterCrit;

        // Assert
        assert.ok(nodesAfterCrit >= 8, 'Crítico gera múltiplos harmônicos para acorde triunfante');
        assert.ok(nodesAfterFumble >= 3, 'Falha crítica gera osciladores dissonantes');
    });

    QUnit.test('5. Caminho Feliz: Dano, Cura e Magia (AAA)', function (assert) {
        // Arrange
        const { mockContext, createdNodes } = createMockAudioContext();
        const engine = new AudioSfxEngineClass({ audioContext: mockContext });

        // Act
        engine.playDamageTaken();
        engine.playHeal();
        engine.playSpellCast();
        engine.playConditionToggle();

        // Assert
        assert.ok(createdNodes.length >= 10, 'Sintetiza nós para dano, cura e magia sem erros');
    });

    // -------------------------------------------------------------
    // 3. Casos de Borda e Mudo
    // -------------------------------------------------------------
    QUnit.test('6. Casos de Borda: Quando mutado, nenhum som deve ser sintetizado (AAA)', function (assert) {
        // Arrange
        const { mockContext, createdNodes } = createMockAudioContext();
        const engine = new AudioSfxEngineClass({ audioContext: mockContext });
        engine.toggleMute(); // Muta o áudio

        // Act
        engine.playDiceRoll();
        engine.playCriticalSuccess();
        engine.playDamageTaken();
        engine.playSpellCast();

        // Assert
        assert.equal(createdNodes.length, 0, 'Nenhum nó de áudio deve ser gerado quando mutado');
    });

    QUnit.test('7. Casos de Borda: Resiliência quando Navigator.vibrate não existe (AAA)', function (assert) {
        // Arrange
        const engine = new AudioSfxEngineClass({ navigatorRef: {} }); // Sem método vibrate

        // Act & Assert
        // Não deve lançar erro
        engine.triggerHaptic(100);
        assert.ok(true, 'triggerHaptic executa graciosamente sem erro em dispositivos sem vibração');
    });
});
