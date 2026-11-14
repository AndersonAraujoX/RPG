/**
 * Gerenciador de Inventário de Personagens — Kuar-Tor (+2d6)
 *
 * Conecta fichas locais e na nuvem aos slots de combate, regras de sobrecarga,
 * catálogo oficial de equipamentos e sistema de transferência entre personagens.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const loginPrompt = document.getElementById('login-prompt');
    const mainContent = document.getElementById('main-content');
    const characterDropdown = document.getElementById('character-dropdown');
    const noCharactersMessage = document.getElementById('no-characters-message');
    const characterCountBadge = document.getElementById('character-count-badge');
    const characterContent = document.getElementById('character-content');
    const characterNameDisplay = document.getElementById('character-name-display');
    const characterClassBadge = document.getElementById('character-class-badge');
    const heroDefenseDisplay = document.getElementById('hero-defense-display');
    const heroArmorDisplay = document.getElementById('hero-armor-display');
    const encumbranceText = document.getElementById('encumbrance-text');
    const encumbranceBar = document.getElementById('encumbrance-bar');
    const encumbranceBadge = document.getElementById('encumbrance-badge');
    const equippedSlotsGrid = document.getElementById('equipped-slots-grid');
    const addItemButton = document.getElementById('add-item-button');
    const catalogQuickSelect = document.getElementById('catalog-quick-select');

    // Modal de Transferência
    const transferModal = document.getElementById('transfer-modal');
    const transferItemName = document.getElementById('transfer-item-name');
    const transferRecipientSelect = document.getElementById('transfer-recipient-select');
    const transferQuantityInput = document.getElementById('transfer-quantity-input');
    const cancelTransferBtn = document.getElementById('cancel-transfer-btn');
    const confirmTransferBtn = document.getElementById('confirm-transfer-btn');

    // --- ESTADO LOCAL & FIREBASE ---
    let currentUser = null;
    let selectedCharacterId = null;
    let charactersMap = {}; // id -> { id, name, sheetData, isCloud }
    let pendingTransferItemId = null;
    let auth, db, rtdb;

    function initializeFirebaseServices() {
        if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
            console.warn("Firebase não inicializado ou offline. Operando em modo Local.");
            return false;
        }
        try {
            auth = firebase.auth();
            db = firebase.firestore();
            rtdb = firebase.database();
            return true;
        } catch (e) {
            console.warn("Erro ao instanciar serviços do Firebase:", e);
            return false;
        }
    }

    /**
     * Inicializa a lista suspensa com o catálogo oficial Kuar-Tor (+2d6)
     */
    function populateCatalogQuickSelect() {
        if (!catalogQuickSelect || typeof ItemCatalogEngine === 'undefined') return;
        const allItems = ItemCatalogEngine.getAllItems();
        catalogQuickSelect.innerHTML = '<option value="">-- Escolher do Catálogo Kuar-Tor --</option>';

        allItems.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = `${item.name} (${item.category} • ${item.weight || 0.5} kg)`;
            catalogQuickSelect.appendChild(opt);
        });

        catalogQuickSelect.addEventListener('change', (e) => {
            const itemId = e.target.value;
            if (!itemId) return;
            const item = ItemCatalogEngine.getItemById(itemId);
            if (!item) return;

            document.getElementById('itemName').value = item.name || '';
            const cat = String(item.category || '').toLowerCase();
            let mappedType = 'other';
            if (cat.includes('arma')) mappedType = 'weapon';
            else if (cat.includes('armadura') || cat.includes('escudo')) mappedType = 'armor';
            else if (cat.includes('acessório') || cat.includes('relíquia')) mappedType = 'accessory';
            else if (cat.includes('consum') || cat.includes('aventura')) mappedType = 'consumable';

            document.getElementById('itemType').value = mappedType;
            document.getElementById('itemWeight').value = item.weight || 0.5;
            document.getElementById('itemDamage').value = item.damage || '';
            document.getElementById('itemDefense').value = item.defenseBonus || 0;
            document.getElementById('itemArmor').value = item.armorReduction || 0;
            document.getElementById('itemDescription').value = item.desc || item.description || '';

            const itemGridSizeSelect = document.getElementById('itemGridSize');
            const itemGridSizeBadge = document.getElementById('itemGridSizeBadge');
            if (itemGridSizeSelect) {
                if (typeof GridInventoryEngine !== 'undefined') {
                    const fp = GridInventoryEngine.getFootprint(item);
                    const optKey = `${fp.w}x${fp.h}`;
                    if (itemGridSizeSelect.querySelector(`option[value="${optKey}"]`)) {
                        itemGridSizeSelect.value = optKey;
                    } else {
                        itemGridSizeSelect.value = mappedType === 'consumable' ? '1x1' : '1x2';
                    }
                    if (itemGridSizeBadge) itemGridSizeBadge.textContent = `${fp.w}×${fp.h}`;
                } else if (mappedType === 'consumable') {
                    itemGridSizeSelect.value = '1x1';
                    if (itemGridSizeBadge) itemGridSizeBadge.textContent = '1×1';
                }
            }

            if (typeof AudioSfxEngine !== 'undefined') AudioSfxEngine.playConditionToggle();
        });
    }

    /**
     * Carrega personagens unificando LocalStorage (navegador) e Firestore (nuvem).
     */
    async function loadCharacters() {
        charactersMap = {};

        // 1. Carrega fichas locais salvas pelo formV6
        try {
            const localSheets = JSON.parse(localStorage.getItem('kuar_tor_saved_sheets') || '{}');
            Object.values(localSheets).forEach(entry => {
                if (entry && entry.id) {
                    charactersMap[entry.id] = {
                        id: entry.id,
                        name: entry.name || (entry.sheetData && entry.sheetData.charName) || 'Personagem Local',
                        sheetData: entry.sheetData || entry,
                        isCloud: false
                    };
                }
            });
        } catch (e) {
            console.warn("Falha ao ler LocalStorage:", e);
        }

        // 2. Carrega fichas da nuvem (se autenticado no Firestore)
        if (currentUser && db) {
            try {
                const charactersRef = db.collection(`users/${currentUser.uid}/characters`);
                const snapshot = await charactersRef.get();
                snapshot.forEach(doc => {
                    const data = doc.data();
                    charactersMap[doc.id] = {
                        id: doc.id,
                        name: data.name || (data.sheetData && data.sheetData.charName) || 'Personagem Nuvem',
                        sheetData: data.sheetData || data,
                        isCloud: true
                    };
                });
            } catch (error) {
                console.warn("Erro ao carregar personagens do Firestore:", error);
            }
        }

        renderCharacterDropdown();
    }

    /**
     * Atualiza o elemento <select id="character-dropdown">.
     */
    function renderCharacterDropdown() {
        const charList = Object.values(charactersMap);
        characterDropdown.innerHTML = '<option value="">-- Selecione um Herói --</option>';

        if (charList.length === 0) {
            noCharactersMessage.classList.remove('hidden');
            if (characterCountBadge) characterCountBadge.textContent = '0 personagens';
            return;
        }

        noCharactersMessage.classList.add('hidden');
        if (characterCountBadge) characterCountBadge.textContent = `${charList.length} herói(s) encontrado(s)`;

        charList.forEach(char => {
            const opt = document.createElement('option');
            opt.value = char.id;
            opt.textContent = `${char.name} ${char.isCloud ? '(☁️ Nuvem)' : '(💾 Local)'}`;
            characterDropdown.appendChild(opt);
        });

        // Restaura seleção anterior se ainda existir
        if (selectedCharacterId && charactersMap[selectedCharacterId]) {
            characterDropdown.value = selectedCharacterId;
            renderSelectedCharacter();
        } else if (charList.length > 0 && !selectedCharacterId) {
            characterDropdown.value = charList[0].id;
            selectedCharacterId = charList[0].id;
            renderSelectedCharacter();
        }
    }

    /**
     * Salva o personagem modificado tanto no LocalStorage quanto na nuvem.
     */
    async function saveCharacter(charId, sheetData) {
        if (!charId || !sheetData) return;

        // Sincroniza retrocompatibilidade de texto de equipamentos
        if (typeof CharacterInventoryBridge !== 'undefined') {
            CharacterInventoryBridge.syncSheetWithInventory(sheetData, sheetData.inventory || []);
        }

        // 1. Salva no LocalStorage
        try {
            const localSheets = JSON.parse(localStorage.getItem('kuar_tor_saved_sheets') || '{}');
            localSheets[charId] = {
                id: charId,
                name: sheetData.charName || sheetData.name || 'Herói',
                lastUpdated: new Date().toISOString(),
                sheetData: sheetData,
                isCloud: charactersMap[charId] ? charactersMap[charId].isCloud : false
            };
            localStorage.setItem('kuar_tor_saved_sheets', JSON.stringify(localSheets));
            if (charactersMap[charId]) {
                charactersMap[charId].sheetData = sheetData;
            }
        } catch (e) {
            console.warn("Falha ao salvar no LocalStorage:", e);
        }

        // 2. Salva no Firestore se autenticado
        if (currentUser && db) {
            try {
                const docRef = db.doc(`users/${currentUser.uid}/characters/${charId}`);
                await docRef.set({
                    name: sheetData.charName || sheetData.name || 'Herói',
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                    sheetData: sheetData
                }, { merge: true });
            } catch (err) {
                console.warn("Falha ao sincronizar com Firestore:", err);
            }
        }

        // 3. Backup no RTDB legado para compatibilidade com ouvintes antigos
        if (currentUser && rtdb && sheetData.inventory) {
            try {
                const rtdbRef = rtdb.ref(`items/${currentUser.uid}/${charId}`);
                const legacyObj = {};
                sheetData.inventory.forEach(it => {
                    legacyObj[it.id] = {
                        name: it.name,
                        type: it.type || it.category || 'other',
                        quantity: it.quantity || 1,
                        description: it.description || '',
                        createdAt: firebase.database.ServerValue.TIMESTAMP
                    };
                });
                await rtdbRef.set(legacyObj);
            } catch (e) {
                // Silencioso em caso de permissão do RTDB
            }
        }
    }

    /**
     * Renderiza todo o conteúdo do personagem selecionado.
     */
    function renderSelectedCharacter() {
        if (!selectedCharacterId || !charactersMap[selectedCharacterId]) {
            characterContent.classList.add('hidden');
            return;
        }

        characterContent.classList.remove('hidden');
        const charEntry = charactersMap[selectedCharacterId];
        const sheet = charEntry.sheetData;

        // Inicializa inventário estruturado se necessário
        if (typeof CharacterInventoryBridge !== 'undefined') {
            if (!sheet.inventory || !Array.isArray(sheet.inventory) || sheet.inventory.length === 0) {
                sheet.inventory = CharacterInventoryBridge.parseEquipmentTextToInventory(sheet.equipment || '');
            }
        } else {
            sheet.inventory = Array.isArray(sheet.inventory) ? sheet.inventory : [];
        }

        // 1. Dados Básicos & Vitals
        const name = sheet.charName || charEntry.name || 'Herói';
        const race = sheet.charRace || 'Humano';
        const charClass = sheet.charClass || 'Guerreiro';
        characterNameDisplay.textContent = name;
        if (characterClassBadge) characterClassBadge.textContent = `${race} ${charClass}`;

        // 2. Cálculos de Carga & Atributos
        const forca = parseInt(sheet.for) || 2;
        const con = parseInt(sheet.con) || 2;
        const des = parseInt(sheet.des) || 2;

        let maxWeight = 20;
        let curWeight = 0;
        let encumbrance = { status: 'light', label: 'Carga Normal', penalty: 0, ratio: 0 };

        if (typeof CharacterInventoryBridge !== 'undefined') {
            maxWeight = CharacterInventoryBridge.calculateCarryCapacity(forca, con);
            curWeight = CharacterInventoryBridge.calculateTotalWeight(sheet.inventory);
            encumbrance = CharacterInventoryBridge.getEncumbranceStatus(curWeight, maxWeight);
        }

        if (encumbranceText) encumbranceText.textContent = `${curWeight} / ${maxWeight} kg`;
        if (encumbranceBar) {
            const pct = Math.min(100, encumbrance.ratio);
            encumbranceBar.style.width = `${pct}%`;
            if (encumbrance.status === 'overburdened') {
                encumbranceBar.className = 'h-full bg-red-600 rounded-full transition-all duration-300';
            } else if (encumbrance.status === 'heavy') {
                encumbranceBar.className = 'h-full bg-amber-500 rounded-full transition-all duration-300';
            } else {
                encumbranceBar.className = 'h-full bg-emerald-500 rounded-full transition-all duration-300';
            }
        }

        if (encumbranceBadge) {
            encumbranceBadge.textContent = encumbrance.label;
            if (encumbrance.status === 'overburdened') {
                encumbranceBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-red-950/90 text-red-300 border border-red-700 ring-1 ring-red-500';
            } else if (encumbrance.status === 'heavy') {
                encumbranceBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950/90 text-amber-300 border border-amber-700';
            } else {
                encumbranceBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-800 text-gray-300';
            }
        }

        // Defesa e Armadura
        const baseDef = (typeof CharacterSheetRules !== 'undefined') ? CharacterSheetRules.calcDefense(des) : (des + 6);
        const totalDef = baseDef + (sheet.equippedDefenseBonus || 0) + encumbrance.penalty;
        const totalArmor = sheet.equippedArmorBonus || 0;

        if (heroDefenseDisplay) heroDefenseDisplay.textContent = totalDef;
        if (heroArmorDisplay) heroArmorDisplay.textContent = totalArmor;

        // 3. Renderiza Slots Equipados
        renderEquippedSlots(sheet);

        // 4. Renderiza Listas Categorizadas
        renderCategorizedInventory(sheet);
    }

    /**
     * Renderiza o grid de slots táticos equipados.
     */
    function renderEquippedSlots(sheet) {
        if (!equippedSlotsGrid || typeof CharacterInventoryBridge === 'undefined') return;

        const slots = [
            { id: 'mainHand', label: 'Mão Principal', icon: 'fa-hand-back-fist' },
            { id: 'offHand', label: 'Mão Secundária', icon: 'fa-shield-halved' },
            { id: 'armor', label: 'Armadura', icon: 'fa-vest' },
            { id: 'accessory1', label: 'Acessório 1', icon: 'fa-ring' },
            { id: 'accessory2', label: 'Acessório 2', icon: 'fa-gem' }
        ];

        equippedSlotsGrid.innerHTML = slots.map(slot => {
            const item = (sheet.inventory || []).find(it => it.isEquipped && it.slot === slot.id);
            if (item) {
                return `
                    <div class="bg-gray-800/90 border border-amber-500/60 rounded-lg p-3 flex justify-between items-center shadow-md">
                        <div class="overflow-hidden pr-2">
                            <div class="text-[10px] text-amber-400 font-bold uppercase tracking-wider">${slot.label}</div>
                            <div class="font-bold text-white text-sm truncate">${item.name}</div>
                            <div class="text-xs text-gray-400 flex flex-wrap gap-1.5 mt-0.5">
                                ${item.damage ? `<span class="text-red-400 font-semibold">⚔ ${item.damage}</span>` : ''}
                                ${item.defenseBonus ? `<span class="text-blue-400 font-semibold">🛡 +${item.defenseBonus}</span>` : ''}
                                ${item.armorValue ? `<span class="text-cyan-400 font-semibold">🦺 Arm ${item.armorValue}</span>` : ''}
                                <span>⚖ ${item.weight || 0.5} kg</span>
                            </div>
                        </div>
                        <button type="button" class="btn-unequip-slot text-xs px-2.5 py-1.5 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 text-gray-200 rounded font-semibold transition"
                            data-id="${item.id}">
                            Desequipar
                        </button>
                    </div>
                `;
            } else {
                return `
                    <div class="bg-gray-900/50 border border-dashed border-gray-700 rounded-lg p-3 flex items-center justify-between opacity-60">
                        <div>
                            <div class="text-[10px] text-gray-400 uppercase font-semibold">${slot.label}</div>
                            <div class="text-xs text-gray-400 italic">Espaço Livre</div>
                        </div>
                    </div>
                `;
            }
        }).join('');

        equippedSlotsGrid.querySelectorAll('.btn-unequip-slot').forEach(btn => {
            btn.addEventListener('click', async () => {
                const itemId = btn.dataset.id;
                sheet.inventory = CharacterInventoryBridge.unequipItem(sheet.inventory, itemId);
                await saveCharacter(selectedCharacterId, sheet);
                if (typeof AudioSfxEngine !== 'undefined') AudioSfxEngine.playConditionToggle();
                renderSelectedCharacter();
            });
        });
    }

    /**
     * Renderiza as 4 listas categorizadas de itens na mochila.
     */
    function renderCategorizedInventory(sheet) {
        const sections = {
            weapon: document.getElementById('list-weapon'),
            armor: document.getElementById('list-armor'),
            accessory: document.getElementById('list-accessory'),
            consumable: document.getElementById('list-consumable')
        };

        Object.values(sections).forEach(el => { if (el) el.innerHTML = ''; });

        const inventory = sheet.inventory || [];

        inventory.forEach(item => {
            let cat = String(item.category || item.type || '').toLowerCase();
            let targetList = sections.consumable;

            if (cat.includes('arma') || item.damage) targetList = sections.weapon;
            else if (cat.includes('armadura') || cat.includes('escudo') || item.armorValue || item.defenseBonus) targetList = sections.armor;
            else if (cat.includes('acessório') || cat.includes('anel') || cat.includes('amuleto') || cat.includes('relíquia')) targetList = sections.accessory;

            const isConsumable = cat.includes('consum') || cat.includes('poção') || cat.includes('elixir');
            const isEquippable = !isConsumable && (targetList === sections.weapon || targetList === sections.armor || targetList === sections.accessory);

            const itemEl = document.createElement('div');
            itemEl.className = `p-3 rounded-lg flex flex-col justify-between shadow-md border transition-colors ${
                item.isEquipped 
                    ? 'bg-amber-950/20 border-amber-600/60 ring-1 ring-amber-500/30' 
                    : 'bg-gray-800/80 border-gray-700/80 hover:border-gray-600'
            }`;

            itemEl.innerHTML = `
                <div class="mb-2">
                    <div class="flex justify-between items-center mb-1">
                        <h4 class="font-bold text-white text-sm flex items-center gap-1.5">
                            <span>${item.name}</span>
                            ${item.isEquipped ? '<span class="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-semibold">Equipado</span>' : ''}
                        </h4>
                        <span class="text-xs font-mono bg-gray-700/90 text-gray-200 px-2 py-0.5 rounded-full font-bold">${item.quantity || 1}x</span>
                    </div>
                    <div class="flex flex-wrap gap-2 text-xs text-gray-300 font-mono mb-1">
                        ${item.damage ? `<span class="text-red-400">⚔ Dano: ${item.damage}</span>` : ''}
                        ${item.defenseBonus ? `<span class="text-blue-400">🛡 +${item.defenseBonus} Def</span>` : ''}
                        ${item.armorValue ? `<span class="text-cyan-400">🦺 Arm: ${item.armorValue}</span>` : ''}
                        <span class="text-gray-400">⚖ ${(item.weight || 0.5) * (item.quantity || 1)} kg (${item.weight || 0.5} kg un)</span>
                    </div>
                    <p class="text-gray-400 text-xs italic">${item.description || 'Sem descrição.'}</p>
                </div>

                <div class="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-gray-700/50 mt-1">
                    ${isEquippable ? (
                        item.isEquipped ? `
                            <button type="button" class="btn-unequip px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-gray-200 text-xs rounded transition"
                                data-id="${item.id}">
                                Desequipar
                            </button>
                        ` : `
                            <button type="button" class="btn-equip px-2 py-1 bg-amber-700/50 hover:bg-amber-600/60 border border-amber-500/50 text-amber-300 text-xs font-bold rounded transition"
                                data-id="${item.id}">
                                ⚔️ Equipar
                            </button>
                        `
                    ) : ''}

                    ${isConsumable ? `
                        <button type="button" class="btn-use-consumable px-2 py-1 bg-emerald-700/50 hover:bg-emerald-600/60 border border-emerald-500/50 text-emerald-300 text-xs font-bold rounded transition"
                            data-id="${item.id}">
                            🧪 Usar
                        </button>
                    ` : ''}

                    <button type="button" class="btn-open-transfer px-2 py-1 bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-700/60 text-cyan-300 text-xs rounded transition"
                        data-id="${item.id}">
                        🔄 Transferir
                    </button>

                    <button type="button" class="btn-delete-item px-2 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-400 text-xs rounded transition"
                        data-id="${item.id}" title="Excluir item">
                        🗑 Excluir
                    </button>
                </div>
            `;

            targetList.appendChild(itemEl);
        });

        // Mensagem de listas vazias
        Object.entries(sections).forEach(([key, element]) => {
            if (element && element.children.length === 0) {
                element.innerHTML = `<p class="text-gray-400 text-xs italic text-center py-3">Nenhum item nesta categoria.</p>`;
            }
        });

        // Wire Event Listeners
        wireInventoryItemEvents(sheet);
    }

    /**
     * Vincula eventos de Equipar, Desequipar, Consumir, Transferir e Deletar.
     */
    function wireInventoryItemEvents(sheet) {
        if (!characterContent || typeof CharacterInventoryBridge === 'undefined') return;

        // Equipar
        characterContent.querySelectorAll('.btn-equip').forEach(btn => {
            btn.addEventListener('click', async () => {
                const itemId = btn.dataset.id;
                sheet.inventory = CharacterInventoryBridge.equipItem(sheet.inventory, itemId);
                await saveCharacter(selectedCharacterId, sheet);
                if (typeof AudioSfxEngine !== 'undefined') AudioSfxEngine.playConditionToggle();
                renderSelectedCharacter();
            });
        });

        // Desequipar
        characterContent.querySelectorAll('.btn-unequip').forEach(btn => {
            btn.addEventListener('click', async () => {
                const itemId = btn.dataset.id;
                sheet.inventory = CharacterInventoryBridge.unequipItem(sheet.inventory, itemId);
                await saveCharacter(selectedCharacterId, sheet);
                if (typeof AudioSfxEngine !== 'undefined') AudioSfxEngine.playConditionToggle();
                renderSelectedCharacter();
            });
        });

        // Usar Consumível
        characterContent.querySelectorAll('.btn-use-consumable').forEach(btn => {
            btn.addEventListener('click', async () => {
                const itemId = btn.dataset.id;
                const result = CharacterInventoryBridge.useConsumable(sheet, itemId);
                if (result.success) {
                    charactersMap[selectedCharacterId].sheetData = result.updatedSheet;
                    await saveCharacter(selectedCharacterId, result.updatedSheet);
                    if (typeof AudioSfxEngine !== 'undefined') AudioSfxEngine.playHeal();
                    renderSelectedCharacter();
                    alert(`🧪 ${result.log}`);
                }
            });
        });

        // Abrir Modal de Transferência
        characterContent.querySelectorAll('.btn-open-transfer').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.dataset.id;
                openTransferModal(itemId);
            });
        });

        // Excluir Item
        characterContent.querySelectorAll('.btn-delete-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                const itemId = btn.dataset.id;
                if (confirm("Tem certeza que deseja excluir este item do inventário?")) {
                    sheet.inventory = CharacterInventoryBridge.removeItem(sheet.inventory, itemId, 1);
                    await saveCharacter(selectedCharacterId, sheet);
                    renderSelectedCharacter();
                }
            });
        });
    }

    /**
     * Abre e inicializa o modal de transferência entre personagens.
     */
    function openTransferModal(itemId) {
        const currentChar = charactersMap[selectedCharacterId];
        if (!currentChar) return;
        const item = (currentChar.sheetData.inventory || []).find(it => it.id === itemId);
        if (!item) return;

        pendingTransferItemId = itemId;
        transferItemName.textContent = `${item.name} (${item.quantity || 1} disponível)`;
        transferQuantityInput.value = 1;
        transferQuantityInput.max = item.quantity || 1;

        transferRecipientSelect.innerHTML = '';
        const others = Object.values(charactersMap).filter(c => c.id !== selectedCharacterId);

        if (others.length === 0) {
            alert("Não há outros personagens registrados para receber itens. Crie outro herói na página de Fichas.");
            return;
        }

        others.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} ${c.isCloud ? '(☁️ Nuvem)' : '(💾 Local)'}`;
            transferRecipientSelect.appendChild(opt);
        });

        transferModal.classList.remove('hidden');
    }

    // Fechar Modal de Transferência
    const closeTransferModal = () => {
        if (transferModal) transferModal.classList.add('hidden');
        pendingTransferItemId = null;
    };

    if (cancelTransferBtn) {
        cancelTransferBtn.addEventListener('click', closeTransferModal);
    }

    if (transferModal) {
        transferModal.addEventListener('click', (e) => {
            if (e.target === transferModal) closeTransferModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && transferModal && !transferModal.classList.contains('hidden')) {
            closeTransferModal();
        }
    });

    // Confirmar Transferência
    if (confirmTransferBtn) {
        confirmTransferBtn.addEventListener('click', async () => {
            if (!selectedCharacterId || !pendingTransferItemId || typeof CharacterInventoryBridge === 'undefined') return;

            const recipientId = transferRecipientSelect.value;
            const qty = parseInt(transferQuantityInput.value, 10) || 1;

            const senderEntry = charactersMap[selectedCharacterId];
            const recipientEntry = charactersMap[recipientId];

            if (!senderEntry || !recipientEntry) {
                alert("Destinatário inválido.");
                return;
            }

            const result = CharacterInventoryBridge.transferItem(
                senderEntry.sheetData,
                recipientEntry.sheetData,
                pendingTransferItemId,
                qty
            );

            if (result.success) {
                senderEntry.sheetData = result.senderSheet;
                recipientEntry.sheetData = result.receiverSheet;

                await saveCharacter(selectedCharacterId, result.senderSheet);
                await saveCharacter(recipientId, result.receiverSheet);

                if (typeof AudioSfxEngine !== 'undefined') AudioSfxEngine.playConditionToggle();
                transferModal.classList.add('hidden');
                pendingTransferItemId = null;

                renderSelectedCharacter();
                alert(`✨ ${result.log}`);
            } else {
                alert(`Falha na transferência: ${result.log}`);
            }
        });
    }

    /**
     * Adiciona um novo item ao inventário do personagem atual.
     */
    async function addItem() {
        const itemName = document.getElementById('itemName').value.trim();
        const itemType = document.getElementById('itemType').value;
        const itemDescription = document.getElementById('itemDescription').value.trim();
        const itemQuantity = parseInt(document.getElementById('itemQuantity').value, 10);
        const itemWeight = parseFloat(document.getElementById('itemWeight').value) || 0.5;
        const itemDamage = document.getElementById('itemDamage').value.trim() || null;
        const itemDefense = parseInt(document.getElementById('itemDefense').value, 10) || 0;
        const itemArmor = parseInt(document.getElementById('itemArmor').value, 10) || 0;

        if (!itemName || !selectedCharacterId || isNaN(itemQuantity) || itemQuantity < 1) {
            alert("Por favor, selecione um personagem e preencha o nome e a quantidade do item (pelo menos 1).");
            return;
        }

        const currentChar = charactersMap[selectedCharacterId];
        if (!currentChar) return;
        const sheet = currentChar.sheetData;

        const itemGridSizeEl = document.getElementById('itemGridSize');
        const rawGridSize = itemGridSizeEl ? itemGridSizeEl.value : (itemType === 'consumable' ? '1x1' : '1x2');
        const gridParts = (rawGridSize || '1x1').split('x');
        const gridW = parseInt(gridParts[0], 10) || 1;
        const gridH = parseInt(gridParts[1], 10) || 1;

        const newItem = {
            id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            name: itemName,
            type: itemType,
            category: itemType === 'weapon' ? 'Arma' : (itemType === 'armor' ? 'Armadura' : (itemType === 'accessory' ? 'Acessório' : (itemType === 'consumable' ? 'Consumível' : 'Outro'))),
            description: itemDescription,
            quantity: itemQuantity,
            weight: itemWeight,
            damage: itemDamage,
            defenseBonus: itemDefense,
            armorValue: itemArmor,
            w: gridW,
            h: gridH,
            gridSize: `${gridW}x${gridH}`
        };

        if (typeof CharacterInventoryBridge !== 'undefined') {
            sheet.inventory = CharacterInventoryBridge.addItem(sheet.inventory || [], newItem);
        } else {
            sheet.inventory = sheet.inventory || [];
            sheet.inventory.push(newItem);
        }

        await saveCharacter(selectedCharacterId, sheet);

        // Sincroniza diretamente na Maleta Tática do personagem no LocalStorage
        if (typeof GridInventoryEngine !== 'undefined') {
            try {
                const key = GridInventoryEngine.getStorageKeyForCharacter(selectedCharacterId);
                let rawInv = null;
                try { rawInv = JSON.parse(localStorage.getItem(key)); } catch (e) {}
                const cap = GridInventoryEngine.capacityFromAttributes(sheet.for || 1, sheet.con || 2);
                let heroBriefcase = rawInv ? GridInventoryEngine.restoreInventory(Object.assign({}, rawInv, { cols: cap.cols, rows: cap.rows }), id => (id === newItem.id ? newItem : (typeof ItemCatalogEngine !== 'undefined' ? ItemCatalogEngine.getItemById(id) : null))) : GridInventoryEngine.createInventory(cap.cols, cap.rows);

                for (let q = 0; q < newItem.quantity; q++) {
                    try {
                        heroBriefcase = GridInventoryEngine.autoPlace(heroBriefcase, newItem, id => (id === newItem.id ? newItem : (typeof ItemCatalogEngine !== 'undefined' ? ItemCatalogEngine.getItemById(id) : null)));
                    } catch (e) {
                        console.warn("Item não coube na Maleta Tática:", e.message);
                    }
                }
                localStorage.setItem(key, JSON.stringify(heroBriefcase));
            } catch (err) {
                console.warn("Falha ao salvar na Maleta Tática:", err);
            }
        }

        // Limpa campos
        document.getElementById('itemName').value = '';
        document.getElementById('itemDescription').value = '';
        document.getElementById('itemQuantity').value = '1';
        document.getElementById('itemWeight').value = '0.5';
        document.getElementById('itemDamage').value = '';
        document.getElementById('itemDefense').value = '0';
        document.getElementById('itemArmor').value = '0';
        if (catalogQuickSelect) catalogQuickSelect.value = '';
        if (itemGridSizeEl) {
            itemGridSizeEl.value = '1x1';
            const itemGridSizeBadge = document.getElementById('itemGridSizeBadge');
            if (itemGridSizeBadge) itemGridSizeBadge.textContent = '1×1';
        }

        if (typeof AudioSfxEngine !== 'undefined') AudioSfxEngine.playConditionToggle();
        renderSelectedCharacter();
    }

    // Alternar visibilidade no login/logout
    function toggleMainContent(loggedIn) {
        if (loggedIn) {
            if (loginPrompt) loginPrompt.classList.add('hidden');
            if (logoutButton) logoutButton.classList.remove('hidden');
            if (mainContent) mainContent.classList.remove('hidden');
        } else {
            // Permite uso de fichas locais mesmo sem login
            if (loginPrompt) loginPrompt.classList.remove('hidden');
            if (logoutButton) logoutButton.classList.add('hidden');
            if (mainContent) mainContent.classList.remove('hidden');
        }
    }

    // Inicialização dos serviços Firebase
    if (initializeFirebaseServices()) {
        auth.onAuthStateChanged(user => {
            currentUser = user;
            toggleMainContent(!!user);
            loadCharacters();
        });

        if (loginButton) {
            loginButton.addEventListener('click', () => {
                const provider = new firebase.auth.GoogleAuthProvider();
                auth.signInWithPopup(provider).catch(error => console.error("Erro de login:", error));
            });
        }

        if (logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                auth.signOut().then(() => {
                    window.location.reload();
                }).catch(error => {
                    console.error("Erro no logout:", error);
                    alert("Erro ao deslogar: " + (error.message || error));
                });
            });
        }
    } else {
        toggleMainContent(false);
        loadCharacters();
    }

    // Listener de Seleção de Personagem
    characterDropdown.addEventListener('change', (e) => {
        selectedCharacterId = e.target.value;
        renderSelectedCharacter();
    });

    if (addItemButton) {
        addItemButton.addEventListener('click', addItem);
    }

    const itemTypeSelect = document.getElementById('itemType');
    const itemGridSizeSelect = document.getElementById('itemGridSize');
    const itemGridSizeBadge = document.getElementById('itemGridSizeBadge');

    if (itemTypeSelect && itemGridSizeSelect) {
        itemTypeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'consumable') {
                itemGridSizeSelect.value = '1x1';
                if (itemGridSizeBadge) itemGridSizeBadge.textContent = '1×1 ⭐';
            }
        });
        itemGridSizeSelect.addEventListener('change', (e) => {
            if (itemGridSizeBadge) itemGridSizeBadge.textContent = e.target.value;
        });
    }

    const createSampleCharacterBtn = document.getElementById('create-sample-character-btn');
    if (createSampleCharacterBtn) {
        createSampleCharacterBtn.addEventListener('click', async () => {
            const sampleId = 'sample_hero_' + Date.now();
            const sampleSheet = {
                id: sampleId,
                charName: 'Valerius, o Explorador',
                charRace: 'Humano',
                charClass: 'Guerreiro',
                for: 3,
                des: 3,
                con: 3,
                int: 2,
                sab: 2,
                pod: 1,
                car: 1,
                pontosVida: 16,
                currentHP: 16,
                pontosEnergia: 15,
                currentPE: 15,
                equipment: 'Espada Longa (dano: 1d6+2) [Equipado: Mão Principal]\nCota de Malha de Ferro (Armadura 2) [Equipado: Armadura]\nPoção de Sangue Vital [x2]',
                inventory: [
                    {
                        id: 'item_1',
                        name: 'Espada Longa',
                        category: 'Armas',
                        type: 'Corpo a Corpo',
                        slot: 'mainHand',
                        isEquipped: true,
                        quantity: 1,
                        weight: 1.8,
                        damage: '1d6+2',
                        defenseBonus: 0,
                        armorValue: 0,
                        description: 'Espada de aço temperado forjada para combate corpo a corpo.'
                    },
                    {
                        id: 'item_2',
                        name: 'Cota de Malha de Ferro',
                        category: 'Armaduras',
                        type: 'Armadura Média',
                        slot: 'armor',
                        isEquipped: true,
                        quantity: 1,
                        weight: 12.0,
                        damage: null,
                        defenseBonus: 0,
                        armorValue: 2,
                        description: 'Entrelaçado de anéis de ferro. Reduz 2 pontos de dano físico.'
                    },
                    {
                        id: 'item_3',
                        name: 'Poção de Sangue Vital',
                        category: 'Consumíveis',
                        type: 'Consumível',
                        slot: 'backpack',
                        isEquipped: false,
                        quantity: 2,
                        weight: 0.3,
                        damage: null,
                        defenseBonus: 0,
                        armorValue: 0,
                        description: 'Líquido rubro que regenera 1d6+3 PV.'
                    }
                ]
            };

            await saveCharacter(sampleId, sampleSheet);
            selectedCharacterId = sampleId;
            await loadCharacters();
            if (typeof AudioSfxEngine !== 'undefined') AudioSfxEngine.playConditionToggle();
        });
    }

    // Popula o catálogo no carregamento inicial
    populateCatalogQuickSelect();
    loadCharacters();
});
