/**
 * @file src/core/audio-sfx-engine.js
 * @description Motor de Efeitos Sonoros Dinâmicos 100% sintetizados via Web Audio API.
 * Não requer arquivos MP3/WAV externos, funciona totalmente offline, imune a bloqueios
 * de rede ou adblockers e compatível com feedback háptico (Vibration API).
 * @module AudioSfxEngine
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AudioSfxEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    class AudioSfxEngine {
        /**
         * @param {Object} [options={}]
         * @param {AudioContext} [options.audioContext] - Instância injetada para testes ou áudio customizado.
         * @param {Storage} [options.storage] - Armazenamento injetado para persistência (padrão: localStorage).
         * @param {Navigator} [options.navigatorRef] - Referência de navegador para vibração háptica.
         */
        constructor(options = {}) {
            this.ctx = options.audioContext || null;
            this.storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
            this.nav = options.navigatorRef || (typeof navigator !== 'undefined' ? navigator : null);

            // Carrega preferências salvas
            this.volume = 0.5;
            this.muted = false;

            if (this.storage) {
                try {
                    const savedVol = this.storage.getItem('kuartor_sfx_volume');
                    if (savedVol !== null) this.volume = parseFloat(savedVol);
                    const savedMute = this.storage.getItem('kuartor_sfx_muted');
                    if (savedMute !== null) this.muted = savedMute === 'true';
                } catch (e) {
                    console.warn('Erro ao carregar preferências de áudio:', e);
                }
            }
        }

        /**
         * Obtém ou inicializa preguiçosamente o AudioContext com tratamento de interação do usuário.
         */
        getAudioContext() {
            if (!this.ctx && typeof window !== 'undefined') {
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                if (AudioCtxClass) {
                    this.ctx = new AudioCtxClass();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            return this.ctx;
        }

        /**
         * Ajusta o volume global (0.0 a 1.0).
         */
        setVolume(vol) {
            const clamped = Math.max(0, Math.min(1, parseFloat(vol) || 0));
            this.volume = clamped;
            if (this.storage) {
                try { this.storage.setItem('kuartor_sfx_volume', String(clamped)); } catch (e) {}
            }
            return this.volume;
        }

        getVolume() {
            return this.volume;
        }

        /**
         * Alterna o estado mudo (Mute/Unmute).
         */
        toggleMute() {
            this.muted = !this.muted;
            if (this.storage) {
                try { this.storage.setItem('kuartor_sfx_muted', String(this.muted)); } catch (e) {}
            }
            return this.muted;
        }

        isMuted() {
            return this.muted;
        }

        /**
         * Executa vibração háptica se disponível no dispositivo.
         * @param {number|Array<number>} pattern - Padrão de milissegundos.
         */
        triggerHaptic(pattern = 50) {
            if (this.nav && typeof this.nav.vibrate === 'function') {
                try {
                    this.nav.vibrate(pattern);
                } catch (e) {}
            }
        }

        // =====================================================================
        // PRESETS DE SÍNTESE SONORA (+2D6 DARK FANTASY)
        // =====================================================================

        /**
         * Simula o rolar mecânico de dados 2d6 quicando sobre a madeira e parando.
         */
        playDiceRoll() {
            if (this.muted) return;
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const clickCount = 4 + Math.floor(Math.random() * 3);

            for (let i = 0; i < clickCount; i++) {
                const clickTime = now + (i * 0.045) + (Math.random() * 0.015);
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(220 + (Math.random() * 280), clickTime);
                osc.frequency.exponentialRampToValueAtTime(70, clickTime + 0.03);

                gain.gain.setValueAtTime(this.volume * 0.4, clickTime);
                gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.03);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(clickTime);
                osc.stop(clickTime + 0.035);
            }

            this.triggerHaptic([30, 20, 40]);
        }

        /**
         * Acorde brilhante e triunfante para Acerto Crítico (6+6).
         */
        playCriticalSuccess() {
            if (this.muted) return;
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Acorde Maior Cristalino)

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + (idx * 0.06));

                gain.gain.setValueAtTime(0.001, now + (idx * 0.06));
                gain.gain.exponentialRampToValueAtTime(this.volume * 0.6, now + (idx * 0.06) + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now + (idx * 0.06));
                osc.stop(now + 0.85);
            });

            this.triggerHaptic([60, 40, 80, 40, 100]);
        }

        /**
         * Som sombrio, dissonante e grave para Falha Crítica (1+1).
         */
        playCriticalFailure() {
            if (this.muted) return;
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, now); // A2
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.5);

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(116.54, now); // Dissonância em semitom (Bb2)
            osc2.frequency.exponentialRampToValueAtTime(40, now + 0.5);

            gain.gain.setValueAtTime(this.volume * 0.7, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc2.start(now);
            osc.stop(now + 0.65);
            osc2.stop(now + 0.65);

            this.triggerHaptic([150, 60, 150]);
        }

        /**
         * Golpe físico seco de combate (impacto de lâmina ou clava).
         */
        playCombatHit() {
            if (this.muted) return;
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);

            gain.gain.setValueAtTime(this.volume * 0.6, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.13);

            this.triggerHaptic(50);
        }

        /**
         * Efeito de dano recebido (baque sordo).
         */
        playDamageTaken() {
            if (this.muted) return;
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);

            gain.gain.setValueAtTime(this.volume * 0.7, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.22);

            this.triggerHaptic([70, 30, 40]);
        }

        /**
         * Efeito de cura / descanso vital restaurador (acorde ascendente suave).
         */
        playHeal() {
            if (this.muted) return;
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const freqs = [329.63, 440.00, 554.37, 659.25]; // E4, A4, C#5, E5

            freqs.forEach((f, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now + (i * 0.08));

                gain.gain.setValueAtTime(0.001, now + (i * 0.08));
                gain.gain.exponentialRampToValueAtTime(this.volume * 0.45, now + (i * 0.08) + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.08) + 0.4);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now + (i * 0.08));
                osc.stop(now + (i * 0.08) + 0.45);
            });
        }

        /**
         * Varredura etérea para conjuração arcana e gasto de PE.
         */
        playSpellCast() {
            if (this.muted) return;
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(950, now + 0.2);
            osc.frequency.exponentialRampToValueAtTime(550, now + 0.4);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.exponentialRampToValueAtTime(this.volume * 0.5, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.5);

            this.triggerHaptic(40);
        }

        /**
         * Clique suave de alternância de condição.
         */
        playConditionToggle() {
            if (this.muted) return;
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

            gain.gain.setValueAtTime(this.volume * 0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.07);
        }
    }

    // Instância singleton padrão para conveniência
    const defaultInstance = new AudioSfxEngine();
    defaultInstance.AudioSfxEngine = AudioSfxEngine;

    return defaultInstance;
}));
