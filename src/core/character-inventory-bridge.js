/**
 * CharacterInventoryBridge — Motor de Inventário Estruturado e Conexão de Fichas (+2d6)
 *
 * Conecta o inventário físico, slots de equipamento, capacidade de carga e transferência
 * entre personagens ao motor de regras da Ficha de Jogo (Live Sheet) e Mesa Virtual.
 *
 * Implementado sob arquitetura desacoplada (SOLID), compatível com CommonJS e Browser (UMD).
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./item-catalog-engine', './character-sheet', './dice-roller'], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(
            require('./item-catalog-engine'),
            require('./character-sheet'),
            require('./dice-roller')
        );
    } else {
        root.CharacterInventoryBridge = factory(
            root.ItemCatalogEngine,
            root.CharacterSheetRules,
            root.DiceRoller
        );
    }
}(typeof self !== 'undefined' ? self : this, function (ItemCatalogEngine, CharacterSheetRules, DiceRoller) {
    'use strict';

    const SLOTS = {
        MAIN_HAND: 'mainHand',
        OFF_HAND: 'offHand',
        ARMOR: 'armor',
        ACCESSORY_1: 'accessory1',
        ACCESSORY_2: 'accessory2',
        BACKPACK: 'backpack'
    };

    const SLOT_LABELS = {
        mainHand: 'Mão Principal',
        offHand: 'Mão Secundária',
        armor: 'Armadura',
        accessory1: 'Acessório 1',
        accessory2: 'Acessório 2',
        backpack: 'Mochila'
    };

    const SLOT_DESCRIPTIONS = {
        mainHand: 'Mão Principal (Arma / Foco Mágico)',
        offHand: 'Mão Secundária (Escudo)',
        armor: 'Armadura / Proteção',
        accessory1: 'Acessório 1 (Anéis, Capas, Amuletos)',
        accessory2: 'Acessório 2 (Anéis, Capas, Amuletos)',
        backpack: 'Mochila / Itens Guardados'
    };

    return {
        SLOTS,
        SLOT_LABELS,

        /**
         * Calcula a capacidade de carga máxima em kg baseada em Força e Constituição.
         * Regra Daemon/Kuar-Tor: (FOR * 5) + (CON * 2), com piso mínimo de 10 kg.
         * @param {number} forca
         * @param {number} constituicao
         * @returns {number} Carga máxima suportada em kg.
         */
        calculateCarryCapacity(forca = 2, constituicao = 2) {
            const f = Math.max(0, parseInt(forca) || 0);
            const c = Math.max(0, parseInt(constituicao) || 0);
            const cap = (f * 5) + (c * 2);
            return Math.max(10, cap);
        },

        /**
         * Calcula o peso total atual de uma coleção de itens em kg.
         * @param {Array<Object>} inventory
         * @returns {number} Peso total arredondado em 1 casa decimal.
         */
        calculateTotalWeight(inventory = []) {
            if (!Array.isArray(inventory)) return 0;
            const total = inventory.reduce((acc, it) => {
                const w = parseFloat(it.weight || it.peso || 0) || 0;
                const q = Math.max(1, parseInt(it.quantity || it.qtd || 1) || 1);
                return acc + (w * q);
            }, 0);
            return Math.round(total * 10) / 10;
        },

        /**
         * Retorna o status de sobrecarga de carga e penalidades aplicáveis.
         * @param {number} currentWeight
         * @param {number} maxWeight
         * @returns {{ status: string, label: string, penalty: number, ratio: number }}
         */
        getEncumbranceStatus(currentWeight = 0, maxWeight = 20) {
            const cur = Math.max(0, parseFloat(currentWeight) || 0);
            const max = Math.max(1, parseFloat(maxWeight) || 1);
            const ratio = cur / max;

            if (ratio > 1.0) {
                return {
                    status: 'overburdened',
                    label: 'Sobrecarregado (-2 Defesa / -2 Testes de DES)',
                    penalty: -2,
                    ratio: Math.round(ratio * 100)
                };
            }
            if (ratio >= 0.8) {
                return {
                    status: 'heavy',
                    label: 'Carga Pesada (Sem penalidades ainda)',
                    penalty: 0,
                    ratio: Math.round(ratio * 100)
                };
            }
            return {
                status: 'light',
                label: 'Carga Normal / Desimpedido',
                penalty: 0,
                ratio: Math.round(ratio * 100)
            };
        },

        /**
         * Adiciona um item ao inventário estruturado.
         * @param {Array<Object>} inventory
         * @param {Object} itemData
         * @returns {Array<Object>} Lista atualizada de inventário.
         */
        addItem(inventory = [], itemData) {
            if (!itemData || typeof itemData !== 'object' || !itemData.name) {
                throw new Error('Item inválido para inserção no inventário.');
            }

            const list = Array.isArray(inventory) ? JSON.parse(JSON.stringify(inventory)) : [];
            const qtyToAdd = Math.max(1, parseInt(itemData.quantity || itemData.qtd || 1) || 1);

            // Se for consumível ou acumulável com mesmo nome e atributos, agrupa quantidade
            const isStackable = String(itemData.category || itemData.type || '').toLowerCase().includes('consum') ||
                               String(itemData.category || itemData.type || '').toLowerCase().includes('aventura');

            const existingIndex = list.findIndex(it =>
                !it.isEquipped &&
                it.name.toLowerCase().trim() === itemData.name.toLowerCase().trim() &&
                isStackable
            );

            if (existingIndex >= 0) {
                list[existingIndex].quantity = (parseInt(list[existingIndex].quantity) || 1) + qtyToAdd;
                return list;
            }

            const newItem = {
                id: itemData.id || `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: String(itemData.name).trim(),
                category: itemData.category || 'Outro',
                type: itemData.type || 'Item',
                slot: itemData.slot || SLOTS.BACKPACK,
                isEquipped: Boolean(itemData.isEquipped),
                quantity: qtyToAdd,
                weight: parseFloat(itemData.weight || itemData.peso || 0.5) || 0,
                damage: itemData.damage || null,
                attackBonus: parseInt(itemData.attackBonus || itemData.bonusAcerto || itemData.damageBonus || 0) || 0,
                defenseBonus: parseInt(itemData.defenseBonus || itemData.defesa || 0) || 0,
                armorValue: parseInt(itemData.armorValue || itemData.armorReduction || itemData.armadura || 0) || 0,
                description: itemData.description || itemData.desc || '',
                effect: itemData.effect || ''
            };

            list.push(newItem);
            return list;
        },

        /**
         * Remove ou reduz a quantidade de um item no inventário.
         * @param {Array<Object>} inventory
         * @param {string} itemId
         * @param {number} [quantity=1]
         * @returns {Array<Object>}
         */
        removeItem(inventory = [], itemId, quantity = 1) {
            if (!Array.isArray(inventory) || !itemId) return inventory || [];
            const list = JSON.parse(JSON.stringify(inventory));
            const idx = list.findIndex(it => it.id === itemId);
            if (idx === -1) return list;

            const removeQty = Math.max(1, parseInt(quantity) || 1);
            const currentQty = parseInt(list[idx].quantity) || 1;

            if (currentQty <= removeQty) {
                list.splice(idx, 1);
            } else {
                list[idx].quantity = currentQty - removeQty;
            }

            return list;
        },

        /**
         * Equipa um item em um slot específico, desequipando itens conflitantes se necessário.
         * @param {Array<Object>} inventory
         * @param {string} itemId
         * @param {string} [targetSlot] - Slot desejado ('mainHand', 'offHand', 'armor', etc.).
         * @returns {Array<Object>}
         */
        equipItem(inventory = [], itemId, targetSlot) {
            if (!Array.isArray(inventory) || !itemId) return inventory || [];
            const list = JSON.parse(JSON.stringify(inventory));
            const item = list.find(it => it.id === itemId);
            if (!item) return list;

            // Determina slot inteligente caso não fornecido
            let slot = targetSlot;
            if (!slot) {
                const cat = String(item.category || item.type || '').toLowerCase();
                if (cat.includes('armadura')) slot = SLOTS.ARMOR;
                else if (cat.includes('escudo')) slot = SLOTS.OFF_HAND;
                else if (cat.includes('arma')) slot = SLOTS.MAIN_HAND;
                else if (cat.includes('acessório') || cat.includes('anel')) slot = SLOTS.ACCESSORY_1;
                else slot = SLOTS.BACKPACK;
            }

            // Desequipa qualquer outro item que esteja ocupando o mesmo slot exclusivo
            if (slot !== SLOTS.BACKPACK) {
                list.forEach(other => {
                    if (other.id !== itemId && other.isEquipped && other.slot === slot) {
                        other.isEquipped = false;
                        other.slot = SLOTS.BACKPACK;
                    }
                });
            }

            item.isEquipped = (slot !== SLOTS.BACKPACK);
            item.slot = slot;

            return list;
        },

        /**
         * Desequipa um item, retornando-o para a mochila.
         * @param {Array<Object>} inventory
         * @param {string} itemId
         * @returns {Array<Object>}
         */
        unequipItem(inventory = [], itemId) {
            if (!Array.isArray(inventory) || !itemId) return inventory || [];
            const list = JSON.parse(JSON.stringify(inventory));
            const item = list.find(it => it.id === itemId);
            if (!item) return list;

            item.isEquipped = false;
            item.slot = SLOTS.BACKPACK;
            return list;
        },

        /**
         * Utiliza um item consumível (poção de cura, elixir de energia, etc.) e atualiza a ficha.
         * @param {Object} sheetData
         * @param {string} itemId
         * @returns {{ success: boolean, updatedSheet: Object, recoveryType: string, amount: number, log: string }}
         */
        useConsumable(sheetData = {}, itemId) {
            if (!sheetData || !itemId) {
                throw new Error('Ficha ou ID do item inválidos para consumo.');
            }

            const updatedSheet = JSON.parse(JSON.stringify(sheetData));
            const inventory = Array.isArray(updatedSheet.inventory) ? updatedSheet.inventory : [];
            const itemIndex = inventory.findIndex(it => it.id === itemId);

            if (itemIndex === -1) {
                return { success: false, updatedSheet, recoveryType: 'none', amount: 0, log: 'Item não encontrado no inventário.' };
            }

            const item = inventory[itemIndex];
            const nameLower = item.name.toLowerCase();
            const descLower = String(item.description || item.effect || '').toLowerCase();

            let recoveryType = 'HP';
            let rollFormula = '1d6+3';
            let bonus = 3;

            if (nameLower.includes('energia') || nameLower.includes('mana') || descLower.includes('pe')) {
                recoveryType = 'PE';
                rollFormula = '1d6+2';
                bonus = 2;
            }

            // Rolagem de recuperação (1d6 + bônus: 1d6+3 para HP, 1d6+2 para PE)
            const d1 = Math.floor(Math.random() * 6) + 1;
            const amount = d1 + bonus;

            if (recoveryType === 'HP') {
                const maxHp = parseInt(updatedSheet.pontosVida || updatedSheet.maxHP || 16);
                const curHp = parseInt(updatedSheet.currentHP !== undefined ? updatedSheet.currentHP : maxHp);
                updatedSheet.currentHP = Math.min(maxHp, curHp + amount);
            } else {
                const maxPe = parseInt(updatedSheet.pontosEnergia || updatedSheet.maxPE || 10);
                const curPe = parseInt(updatedSheet.currentPE !== undefined ? updatedSheet.currentPE : maxPe);
                updatedSheet.currentPE = Math.min(maxPe, curPe + amount);
            }

            // Reduz quantidade do item consumido
            updatedSheet.inventory = this.removeItem(inventory, itemId, 1);

            // Re-sincroniza texto de equipamento legado
            this.syncSheetWithInventory(updatedSheet, updatedSheet.inventory);

            return {
                success: true,
                updatedSheet,
                recoveryType,
                formula: rollFormula,
                roll: d1,
                bonus,
                amount,
                log: `${item.name} consumido! Recuperou +${amount} ${recoveryType} (Rolagem: ${rollFormula} -> Dado ${d1} + ${bonus}).`
            };
        },

        /**
         * Transfere um item (ou parte da sua quantidade) entre duas fichas de personagens.
         * @param {Object} senderSheet - Ficha de origem.
         * @param {Object} receiverSheet - Ficha de destino.
         * @param {string} itemId - ID do item na ficha de origem.
         * @param {number} [quantity=1] - Quantidade a transferir.
         * @returns {{ success: boolean, senderSheet: Object, receiverSheet: Object, log: string }}
         */
        transferItem(senderSheet, receiverSheet, itemId, quantity = 1) {
            if (!senderSheet || !receiverSheet || !itemId) {
                throw new Error('Parâmetros inválidos para transferência de item.');
            }

            const updatedSender = JSON.parse(JSON.stringify(senderSheet));
            const updatedReceiver = JSON.parse(JSON.stringify(receiverSheet));

            const senderInv = Array.isArray(updatedSender.inventory) ? updatedSender.inventory : [];
            const item = senderInv.find(it => it.id === itemId);

            if (!item) {
                return { success: false, senderSheet: updatedSender, receiverSheet: updatedReceiver, log: 'Item de origem não encontrado.' };
            }

            const transferQty = Math.min(parseInt(item.quantity) || 1, Math.max(1, parseInt(quantity) || 1));

            // Remove do remetente
            updatedSender.inventory = this.removeItem(senderInv, itemId, transferQty);

            // Adiciona ao destinatário
            const itemForReceiver = {
                ...item,
                quantity: transferQty,
                isEquipped: false,
                slot: SLOTS.BACKPACK
            };
            updatedReceiver.inventory = this.addItem(updatedReceiver.inventory || [], itemForReceiver);

            // Re-sincroniza textos de equipamentos
            this.syncSheetWithInventory(updatedSender, updatedSender.inventory);
            this.syncSheetWithInventory(updatedReceiver, updatedReceiver.inventory);

            const senderName = updatedSender.charName || updatedSender.name || 'Remetente';
            const receiverName = updatedReceiver.charName || updatedReceiver.name || 'Destinatário';

            return {
                success: true,
                senderSheet: updatedSender,
                receiverSheet: updatedReceiver,
                log: `${transferQty}x "${item.name}" transferido(s) de ${senderName} para ${receiverName}.`
            };
        },

        /**
         * Sincroniza o array de inventário com a ficha do personagem, atualizando
         * a defesa efetiva, armadura total e gerando o texto retrocompatível para o campo 'equipment'.
         * @param {Object} sheetData
         * @param {Array<Object>} inventory
         * @returns {Object} Ficha atualizada e calculada.
         */
        syncSheetWithInventory(sheetData = {}, inventory = []) {
            const sheet = sheetData;
            sheet.inventory = Array.isArray(inventory) ? JSON.parse(JSON.stringify(inventory)) : [];

            let equippedArmor = 0;
            let equippedDefenseBonus = 0;
            const equippedLines = [];
            const backpackLines = [];

            sheet.inventory.forEach(it => {
                if (it.isEquipped) {
                    if (it.armorValue) equippedArmor += it.armorValue;
                    if (it.defenseBonus) equippedDefenseBonus += it.defenseBonus;

                    let line = it.name;
                    if (it.damage) {
                        line += ` (dano: ${it.damage})`;
                    } else if (it.defenseBonus) {
                        line += ` (+${it.defenseBonus} Defesa)`;
                    } else if (it.armorValue) {
                        line += ` (Armadura ${it.armorValue})`;
                    }

                    line += ` [Equipado: ${SLOT_LABELS[it.slot] || it.slot}]`;
                    equippedLines.push(line);
                } else {
                    const qtyStr = (it.quantity && it.quantity > 1) ? ` (${it.quantity}x)` : '';
                    backpackLines.push(`${it.name}${qtyStr}`);
                }
            });

            // Aplica bônus de equipamento na ficha
            sheet.equippedArmorBonus = equippedArmor;
            sheet.equippedDefenseBonus = equippedDefenseBonus;

            // Gera texto compatível com os parsers de ataque e impressão
            let formattedText = '';
            if (equippedLines.length > 0) {
                formattedText += equippedLines.join('\n');
            }
            if (backpackLines.length > 0) {
                if (formattedText) formattedText += '\n';
                formattedText += `Mochila: ${backpackLines.join(', ')}`;
            }

            sheet.equipment = formattedText;
            sheet.equipamento = formattedText;

            return sheet;
        },

        /**
         * Converte qualquer texto de equipamento legado em uma lista de itens estruturados.
         * @param {string} equipmentText
         * @returns {Array<Object>}
         */
        parseEquipmentTextToInventory(equipmentText = '') {
            if (!equipmentText || typeof equipmentText !== 'string') return [];
            const items = [];
            const lines = equipmentText.split(/[\n,]/);

            lines.forEach(line => {
                const clean = line.replace(/\[.*?\]/g, '').replace(/^[-*•]\s*/, '').trim();
                if (!clean || clean.length < 2) return;

                // Tenta extrair quantidade se houver (ex: "Tocha (3x)" ou "3x Tocha")
                let qty = 1;
                const qtyMatch = clean.match(/(\d+)\s*x|\(\s*(\d+)\s*x\s*\)/i);
                if (qtyMatch) {
                    qty = parseInt(qtyMatch[1] || qtyMatch[2]) || 1;
                }

                // Remove parênteses para nome limpo
                const nameClean = clean.replace(/\(.*?\)/g, '').replace(/\d+\s*x/i, '').trim();
                if (!nameClean) return;

                // Consulta se é um item oficial do catálogo
                let catalogItem = null;
                if (ItemCatalogEngine && typeof ItemCatalogEngine.filterItems === 'function') {
                    const matches = ItemCatalogEngine.filterItems({ search: nameClean });
                    if (matches && matches.length > 0) {
                        catalogItem = matches[0];
                    }
                }

                items.push({
                    id: `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: catalogItem ? catalogItem.name : nameClean,
                    category: catalogItem ? catalogItem.category : 'Aventura',
                    type: catalogItem ? catalogItem.type : 'Item Geral',
                    slot: catalogItem && catalogItem.damage ? SLOTS.MAIN_HAND : SLOTS.BACKPACK,
                    isEquipped: Boolean(catalogItem && catalogItem.damage),
                    quantity: qty,
                    weight: catalogItem ? catalogItem.weight : 0.5,
                    damage: catalogItem ? catalogItem.damage : null,
                    attackBonus: catalogItem ? (catalogItem.damageBonus || 0) : 0,
                    defenseBonus: catalogItem ? (catalogItem.defenseBonus || 0) : 0,
                    armorValue: catalogItem ? (catalogItem.armorReduction || 0) : 0,
                    description: catalogItem ? catalogItem.desc : clean
                });
            });

            return items;
        }
    };
}));
