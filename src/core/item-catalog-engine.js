/**
 * @file src/core/item-catalog-engine.js
 * @description Catálogo Oficial de Equipamentos, Armas, Armaduras e Itens de Kuar-Tor (+2d6)
 * com motor de integração automática ao inventário e fichas de personagens.
 * @module ItemCatalogEngine
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ItemCatalogEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const ITEMS_CATALOG = [
        // --- ARMAS BRANCAS ---
        {
            id: 'adaga_aco',
            name: 'Adaga de Aço',
            category: 'Armas',
            type: 'Corpo a Corpo',
            attr: 'DES',
            damage: '1d6',
            damageBonus: 0,
            reach: '1m',
            weight: 0.5,
            price: 5,
            desc: 'Lâmina ágil e afiada, ideal para golpes rápidos e furtivos.'
        },
        {
            id: 'espada_curta',
            name: 'Espada Curta',
            category: 'Armas',
            type: 'Corpo a Corpo',
            attr: 'FOR',
            damage: '1d6+1',
            damageBonus: 1,
            reach: '1.2m',
            weight: 1.0,
            price: 15,
            desc: 'Espada equilibrada de corte e estocada utilizada por batedores.'
        },
        {
            id: 'espada_longa',
            name: 'Espada Longa',
            category: 'Armas',
            type: 'Corpo a Corpo',
            attr: 'FOR',
            damage: '1d6+2',
            damageBonus: 2,
            reach: '1.5m',
            weight: 1.8,
            price: 30,
            desc: 'Arma padrão de cavaleiros e mercenários do Reino.'
        },
        {
            id: 'machado_batalha',
            name: 'Machado de Batalha',
            category: 'Armas',
            type: 'Corpo a Corpo',
            attr: 'FOR',
            damage: '1d6+3',
            damageBonus: 3,
            reach: '1.5m',
            weight: 2.5,
            price: 35,
            desc: 'Lâmina pesada de decapitação forjada para quebrar escudos.'
        },
        {
            id: 'lanca_guerra',
            name: 'Lança de Guerra',
            category: 'Armas',
            type: 'Corpo a Corpo',
            attr: 'FOR',
            damage: '1d6+1',
            damageBonus: 1,
            reach: '2.5m (Alcance)',
            weight: 2.0,
            price: 12,
            desc: 'Haste longa que permite atacar a 2 quadrados de distância sem sofrer retaliação imediata.'
        },

        // --- ARMAS DE DISPARO ---
        {
            id: 'arco_curto',
            name: 'Arco Curto de Caça',
            category: 'Armas',
            type: 'À Distância',
            attr: 'DES',
            damage: '1d6',
            damageBonus: 0,
            reach: '20m',
            weight: 1.0,
            price: 20,
            desc: 'Arco de madeira recurvada para caça em florestas e cavernas.'
        },
        {
            id: 'arco_longo',
            name: 'Arco Longo de Guerra',
            category: 'Armas',
            type: 'À Distância',
            attr: 'DES',
            damage: '1d6+2',
            damageBonus: 2,
            reach: '35m',
            weight: 1.8,
            price: 45,
            desc: 'Arco reforçado com tendões de monstro, de alto poder de perfuração.'
        },
        {
            id: 'besta_pesada',
            name: 'Besta Pesada Rúnica',
            category: 'Armas',
            type: 'À Distância',
            attr: 'DES',
            damage: '2d6',
            damageBonus: 0,
            reach: '30m',
            weight: 3.5,
            price: 60,
            desc: 'Mecanismo de aço engrenado que dispara virotes com força esmagadora.'
        },

        // --- ARMADURAS & ESCUDOS ---
        {
            id: 'armadura_couro',
            name: 'Armadura de Couro Fervido',
            category: 'Armaduras',
            type: 'Armadura Leve',
            armorReduction: 1,
            defenseBonus: 0,
            penaltyDes: 0,
            weight: 4.0,
            price: 25,
            desc: 'Proteção leve que absorve 1 ponto de dano físico sem prejudicar a agilidade.'
        },
        {
            id: 'cota_malha',
            name: 'Cota de Malha de Ferro',
            category: 'Armaduras',
            type: 'Armadura Média',
            armorReduction: 2,
            defenseBonus: 0,
            penaltyDes: -1,
            weight: 12.0,
            price: 70,
            desc: 'Entrelaçado de anéis de ferro. Reduz 2 pontos de dano físico (-1 em DES para esquivas).'
        },
        {
            id: 'armadura_placas',
            name: 'Armadura Completa de Placas',
            category: 'Armaduras',
            type: 'Armadura Pesada',
            armorReduction: 3,
            defenseBonus: 0,
            penaltyDes: -2,
            weight: 22.0,
            price: 150,
            desc: 'Placas maciças de aço sobrepostas. Absorve 3 pontos de dano físico.'
        },
        {
            id: 'broquel_madeira',
            name: 'Broquel de Bordo',
            category: 'Escudos',
            type: 'Escudo',
            armorReduction: 0,
            defenseBonus: 1,
            penaltyDes: 0,
            weight: 1.5,
            price: 10,
            desc: 'Pequeno escudo empunhado que concede +1 na Defesa Passiva.'
        },
        {
            id: 'escudo_aco',
            name: 'Escudo de Aço Forjado',
            category: 'Escudos',
            type: 'Escudo',
            armorReduction: 0,
            defenseBonus: 2,
            penaltyDes: 0,
            weight: 3.5,
            price: 30,
            desc: 'Escudo clássico de infantaria. Concede +2 na Defesa Passiva.'
        },

        // --- ALQUIMIA & CONSUMÍVEIS ---
        {
            id: 'pocao_cura',
            name: 'Poção de Sangue Vital',
            category: 'Consumíveis',
            type: 'Consumível',
            effect: 'Cura 5 PV imediatamente',
            healPV: 5,
            weight: 0.3,
            price: 20,
            desc: 'Líquido rubro e espesso que fecha ferimentos profundos instantaneamente.'
        },
        {
            id: 'elixir_vigor',
            name: 'Elixir de Éter Purificado',
            category: 'Consumíveis',
            type: 'Consumível',
            effect: 'Restaura 5 PE imediatamente',
            restorePE: 5,
            weight: 0.3,
            price: 25,
            desc: 'Destilado azul cristalino que revitaliza a energia mágica do conjurador.'
        },
        {
            id: 'antidoto_nevoa',
            name: 'Antídoto da Névoa Tóxica',
            category: 'Consumíveis',
            type: 'Consumível',
            effect: 'Remove condições Sangrando e Envenenado',
            curesCondition: ['sangrando', 'envenenado'],
            weight: 0.2,
            price: 15,
            desc: 'Ervas maceradas em óleo que estancam hemorragias e neutralizam toxinas.'
        },
        {
            id: 'tocha_runica',
            name: 'Tocha Rúnica Inextinguível',
            category: 'Aventura',
            type: 'Aventura',
            effect: 'Ilumina raio de 6m por 2 horas',
            lightRadius: 6,
            weight: 0.8,
            price: 8,
            desc: 'Fogo químico que queima mesmo sob chuva ou vento forte em Kuar-Tor.'
        }
    ];

    function normalizeStr(str) {
        return String(str || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[-_]/g, ' ')
            .trim();
    }

    function enrichItem(item) {
        if (!item) return null;
        const clone = JSON.parse(JSON.stringify(item));
        clone.dano = clone.damage || null;
        clone.armadura = clone.armorReduction || clone.armorValue || 0;
        clone.defesa = clone.defenseBonus || 0;
        clone.custo = clone.price !== undefined ? `${clone.price} Moedas` : 'Grátis';
        clone.description = clone.desc || clone.description || '';
        return clone;
    }

    function matchesCategory(it, cat) {
        if (!cat) return true;
        const catNorm = normalizeStr(cat);
        if (catNorm === 'all' || catNorm === 'todas' || catNorm === 'todas as categorias') return true;

        const itCatNorm = normalizeStr(it.category);
        const itTypeNorm = normalizeStr(it.type);
        const isWeaponCat = itCatNorm === 'armas' || itCatNorm === 'arma';
        const isArmorCat = itCatNorm === 'armaduras' || itCatNorm === 'armadura';
        const isShieldCat = itCatNorm === 'escudos' || itCatNorm === 'escudo';
        const isConsumableCat = itCatNorm.startsWith('consumiv');
        const isAdventureCat = itCatNorm === 'aventura';

        if (catNorm.includes('corpo a corpo')) {
            return isWeaponCat && (itTypeNorm.includes('corpo a corpo') || !itTypeNorm.includes('distancia'));
        }
        if (catNorm.includes('distancia')) {
            return isWeaponCat && itTypeNorm.includes('distancia');
        }
        if (catNorm.includes('armadura') && catNorm.includes('leve')) {
            return isArmorCat && (itTypeNorm.includes('leve') || (it.armorReduction && it.armorReduction <= 1));
        }
        if (catNorm.includes('armadura') && catNorm.includes('pesada')) {
            return isArmorCat && (itTypeNorm.includes('pesada') || itTypeNorm.includes('media') || (it.armorReduction && it.armorReduction >= 2));
        }
        if (catNorm.includes('armadura') && catNorm.includes('media')) {
            return isArmorCat && (itTypeNorm.includes('media') || (it.armorReduction && it.armorReduction === 2));
        }
        if (catNorm.includes('escudo')) {
            return isShieldCat || itTypeNorm.includes('escudo');
        }
        if (catNorm.includes('consumiv') || catNorm.includes('alquimia')) {
            return isConsumableCat || itTypeNorm.includes('consumiv');
        }
        if (catNorm.includes('aventura')) {
            return isAdventureCat || itTypeNorm.includes('aventura');
        }

        return itCatNorm === catNorm || itTypeNorm === catNorm || itCatNorm.includes(catNorm) || catNorm.includes(itCatNorm);
    }

    const ItemCatalogEngine = {
        ITEMS_CATALOG,

        /**
         * Retorna todos os itens do catálogo.
         */
        getAllItems() {
            return ITEMS_CATALOG.map(enrichItem);
        },

        /**
         * Busca item por ID.
         */
        getItemById(id) {
            if (!id || typeof id !== 'string') return null;
            const item = ITEMS_CATALOG.find(i => i.id.toLowerCase() === id.toLowerCase().trim());
            return enrichItem(item);
        },

        /**
         * Filtra itens por categoria ou texto com normalização inteligente.
         */
        filterItems(options = {}) {
            let search = '';
            let category = '';
            if (typeof options === 'string') {
                search = options;
                category = arguments[1] || '';
            } else if (options && typeof options === 'object') {
                search = options.search || '';
                category = options.category || '';
            }
            if (category === 'ALL' || category === 'all') category = '';
            const cat = String(category || '').trim();
            const term = String(search || '').trim();

            return ITEMS_CATALOG.filter(it => {
                if (!matchesCategory(it, cat)) return false;
                if (term) {
                    const termNorm = normalizeStr(term);
                    const matchName = normalizeStr(it.name).includes(termNorm);
                    const matchDesc = normalizeStr(it.desc || it.description).includes(termNorm);
                    const matchType = normalizeStr(it.type).includes(termNorm);
                    const matchDamage = normalizeStr(it.damage).includes(termNorm);
                    if (!matchName && !matchDesc && !matchType && !matchDamage) return false;
                }
                return true;
            }).map(enrichItem);
        },

        /**
         * Adiciona um item ao equipamento de uma ficha de personagem de forma estruturada.
         * Garante formatação compatível com a extração de ataques (ex: "Espada Longa (dano: 1d6+2)").
         * @param {Object} sheetData - Ficha do personagem.
         * @param {string|Object} itemOrId - ID ou objeto do item.
         * @returns {Object} Ficha atualizada com o item incorporado.
         */
        addItemToSheet(sheetData = {}, itemOrId) {
            let item = null;
            if (typeof itemOrId === 'string') {
                item = this.getItemById(itemOrId);
            } else if (itemOrId && typeof itemOrId === 'object') {
                item = itemOrId;
            }

            if (!item) {
                throw new Error('Item inválido para adição na ficha.');
            }

            const updatedSheet = JSON.parse(JSON.stringify(sheetData || {}));
            const currentEquip = String(updatedSheet.equipment || updatedSheet.equipamento || '').trim();

            // Monta linha formatada do item
            let itemLine = `${item.name}`;
            if (item.damage) {
                itemLine += ` (dano: ${item.damage})`;
            } else if (item.defenseBonus) {
                itemLine += ` (+${item.defenseBonus} Defesa)`;
            } else if (item.armorReduction) {
                itemLine += ` (Armadura ${item.armorReduction})`;
            }

            const newEquipment = currentEquip ? `${currentEquip}\n${itemLine}` : itemLine;
            updatedSheet.equipment = newEquipment;
            updatedSheet.equipamento = newEquipment;

            return updatedSheet;
        },

        /**
         * Remove um item do texto de equipamento da ficha.
         * @param {Object} sheetData - Ficha do personagem.
         * @param {string} itemName - Nome do item a remover.
         * @returns {Object} Ficha atualizada.
         */
        removeItemFromSheet(sheetData = {}, itemName = '') {
            if (!itemName) return sheetData;
            const updatedSheet = JSON.parse(JSON.stringify(sheetData || {}));
            const currentEquip = String(updatedSheet.equipment || updatedSheet.equipamento || '');

            const lines = currentEquip.split('\n');
            const filteredLines = lines.filter(line => !line.toLowerCase().includes(itemName.toLowerCase().trim()));

            const newEquipment = filteredLines.join('\n').trim();
            updatedSheet.equipment = newEquipment;
            updatedSheet.equipamento = newEquipment;

            return updatedSheet;
        },

        /**
         * Calcula o bônus total de Defesa e Redução de Armadura a partir do texto de equipamentos.
         * @param {Object} sheetData - Ficha do personagem.
         * @returns {{ totalDefenseBonus: number, totalArmorReduction: number, penalties: number }}
         */
        calculateEquippedDefenseAndArmor(sheetData = {}) {
            const equipmentText = String(sheetData.equipment || sheetData.equipamento || '').toLowerCase();
            let totalDefenseBonus = 0;
            let totalArmorReduction = 0;
            let penalties = 0;

            ITEMS_CATALOG.forEach(item => {
                if (equipmentText.includes(item.name.toLowerCase())) {
                    if (item.defenseBonus) totalDefenseBonus += item.defenseBonus;
                    if (item.armorReduction) totalArmorReduction += item.armorReduction;
                    if (item.penaltyDes) penalties += item.penaltyDes;
                }
            });

            return {
                totalDefenseBonus,
                totalArmorReduction,
                penalties
            };
        }
    };

    return ItemCatalogEngine;
}));
