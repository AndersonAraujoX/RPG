/**
 * @file ui-controller.js
 * @description Controlador modular de Interface de Usuário para o Portal Kuar-Tor VTT.
 * Gerencia abas, modais, drawer de tomos, banners de notificação de turno e badges.
 * @module UIController
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.UIController = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const UIController = {

        /**
         * Alterna a aba visível na interface do VTT.
         * @param {string} tabName - Nome da aba (ex: 'rooms', 'tactical', 'sheet', 'combat', 'roller')
         */
        switchTab(tabName) {
            if (typeof document === 'undefined') return;

            document.querySelectorAll('section[id^="tab-"]').forEach(sec => sec.classList.add('hidden'));
            document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));

            const activeSec = document.getElementById(`tab-${tabName}`);
            const activeBtn = document.getElementById(`tab-btn-${tabName}`);
            if (activeSec) activeSec.classList.remove('hidden');
            if (activeBtn) activeBtn.classList.add('active');
        },

        /**
         * Abre ou fecha a gaveta/hub de Tomos da Campanha.
         */
        togglePortalHub() {
            if (typeof document === 'undefined') return;
            const drawer = document.getElementById('portal-hub-drawer');
            if (drawer) drawer.classList.toggle('hidden');
        },

        /**
         * Exibe um banner animado de transição de turno no topo da tela.
         * @param {string} combatantName - Nome do combatente da vez
         * @param {number} [durationMs=3500] - Tempo de exibição em milissegundos
         */
        showTurnToast(combatantName, durationMs = 3500) {
            if (typeof document === 'undefined') return;

            const banner = document.getElementById('turn-toast-banner');
            const nameEl = document.getElementById('turn-toast-name');
            if (!banner || !nameEl) return;

            nameEl.textContent = `É a vez de ${combatantName}!`;
            banner.classList.remove('opacity-0', '-translate-y-4');
            banner.classList.add('opacity-100', 'translate-y-0');

            setTimeout(() => {
                banner.classList.remove('opacity-100', 'translate-y-0');
                banner.classList.add('opacity-0', '-translate-y-4');
            }, durationMs);
        },

        /**
         * Abre um modal pelo ID do elemento no DOM.
         * @param {string} modalId - ID do container do modal
         */
        openModal(modalId) {
            if (typeof document === 'undefined') return;
            const modal = document.getElementById(modalId);
            if (modal) modal.classList.remove('hidden');
        },

        /**
         * Fecha um modal pelo ID do elemento no DOM.
         * @param {string} modalId - ID do container do modal
         */
        closeModal(modalId) {
            if (typeof document === 'undefined') return;
            const modal = document.getElementById(modalId);
            if (modal) modal.classList.add('hidden');
        },

        /**
         * Atualiza o badge indicador de status de conexão no cabeçalho.
         * @param {boolean} isOnline - Se a conexão está ativa
         * @param {string} text - Texto a ser exibido no badge
         */
        updateStatusBadge(isOnline, text) {
            if (typeof document === 'undefined') return;
            const dot = document.getElementById('firebase-status-dot');
            const label = document.getElementById('firebase-status-text');
            if (dot && label) {
                dot.className = isOnline
                    ? 'w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : 'w-2.5 h-2.5 rounded-full bg-amber-400';
                label.innerText = text;
            }
        }
    };

    return UIController;
}));
