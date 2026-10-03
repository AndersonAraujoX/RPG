/**
 * @file pdf-sheet-generator.js
 * @description Módulo para normalização e geração de fichas de personagens em HTML e PDF.
 * Suporta dados brutos do Firestore REST API ou objetos diretos da ficha do sistema Kuar-Tor.
 * Aplica as fórmulas oficiais:
 * - PV Máximo = (CON * 2) + 10 + Bônus de Vantagens/Itens
 * - PE Máximo = Atributo de Conjuração + CON + 10 + Bônus de Vantagens/Itens
 * @module PDFSheetGenerator
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['../core/character-sheet'], factory);
    } else if (typeof module === 'object' && module.exports) {
        const charSheet = require('../core/character-sheet');
        const rules = (charSheet && charSheet.CharacterSheetRules) ? charSheet.CharacterSheetRules : charSheet;
        module.exports = factory(rules);
    } else {
        root.PDFSheetGenerator = factory(root.CharacterSheetRules);
    }
}(typeof self !== 'undefined' ? self : this, function (CharacterSheetRules) {
    'use strict';

    // Fallback caso CharacterSheetRules não esteja carregado
    const Rules = CharacterSheetRules || {
        calcMaxPV(con, bonus = 0) {
            const c = Number(con) || 0;
            return (c * 2) + 10 + (Number(bonus) || 0);
        },
        calcMaxPE(conjur, con = 0, bonus = 0) {
            return (Number(conjur) || 0) + (Number(con) || 0) + 10 + (Number(bonus) || 0);
        },
        getTraditionAttribute(trad) {
            const map = { POD: 'POD', INT: 'INT', SAB: 'SAB', CAR: 'CAR' };
            return map[String(trad || '').toUpperCase()] || 'INT';
        },
        calcResourceBonusFromAdvantages(advantages, type) {
            if (!Array.isArray(advantages)) return 0;
            const target = String(type || '').toUpperCase();
            const regex = new RegExp(`\\+(\\d+)\\s*(?:ponto(?:s)?\\s*(?:de)?\\s*)?${target}`, 'i');
            let sum = 0;
            advantages.forEach(adv => {
                if (!adv) return;
                if (typeof adv === 'object') {
                    if (target === 'PV' && adv.bonusPV != null) sum += Number(adv.bonusPV) || 0;
                    if (target === 'PE' && adv.bonusPE != null) sum += Number(adv.bonusPE) || 0;
                    if (adv.descricao) {
                        const m = adv.descricao.match(regex);
                        if (m) sum += parseInt(m[1], 10);
                    }
                } else if (typeof adv === 'string') {
                    const m = adv.match(regex);
                    if (m) sum += parseInt(m[1], 10);
                }
            });
            return sum;
        }
    };

    /**
     * Desembrulha recursivamente valores codificados do Firestore REST API
     * (stringValue, integerValue, mapValue, arrayValue, etc).
     */
    function unwrapFirestoreValue(val) {
        if (val === null || val === undefined) return null;
        if (Array.isArray(val)) {
            return val.map(unwrapFirestoreValue);
        }
        if (typeof val !== 'object') return val;

        if ('stringValue' in val) return val.stringValue;
        if ('integerValue' in val) return parseInt(val.integerValue, 10);
        if ('doubleValue' in val) return parseFloat(val.doubleValue);
        if ('booleanValue' in val) return Boolean(val.booleanValue);
        if ('timestampValue' in val) return val.timestampValue;
        if ('nullValue' in val) return null;

        if ('mapValue' in val) {
            const res = {};
            const fields = val.mapValue && val.mapValue.fields ? val.mapValue.fields : {};
            for (const key of Object.keys(fields)) {
                res[key] = unwrapFirestoreValue(fields[key]);
            }
            return res;
        }

        if ('arrayValue' in val) {
            const values = val.arrayValue && val.arrayValue.values ? val.arrayValue.values : [];
            return values.map(unwrapFirestoreValue);
        }

        // Objeto comum
        const plain = {};
        for (const k of Object.keys(val)) {
            plain[k] = unwrapFirestoreValue(val[k]);
        }
        return plain;
    }

    /**
     * Normaliza os dados brutos recebidos da ficha (seja do Firestore ou do cliente).
     * @param {Object} rawData
     * @returns {Object} Dados padronizados e enriquecidos
     */
    function normalizeCharacterData(rawData) {
        if (!rawData) {
            throw new Error('Dados de personagem não fornecidos');
        }

        let unwrapped = unwrapFirestoreValue(rawData);

        // Se o documento tiver fields.sheetData ou sheetData
        let sheet = unwrapped;
        if (unwrapped.fields && unwrapped.fields.sheetData) {
            sheet = unwrapped.fields.sheetData;
        } else if (unwrapped.sheetData) {
            sheet = unwrapped.sheetData;
        }

        const name = String(sheet.charName || unwrapped.name || 'Sem Nome').trim();
        const charClass = String(sheet.charClass || 'Aventureiro').trim();
        const charRace = String(sheet.charRace || 'Humano').trim();
        const tradition = String(sheet.tradicaoMagica || 'INT').toUpperCase();
        const exp = String(sheet.expPoints || '0');

        // Atributos numéricos (escala padrão 1 a 6)
        const attributes = {
            FOR: parseInt(sheet.for != null ? sheet.for : 1, 10) || 1,
            DES: parseInt(sheet.des != null ? sheet.des : 1, 10) || 1,
            CON: parseInt(sheet.con != null ? sheet.con : 1, 10) || 1,
            INT: parseInt(sheet.int != null ? sheet.int : 1, 10) || 1,
            SAB: parseInt(sheet.sab != null ? sheet.sab : 1, 10) || 1,
            CAR: parseInt(sheet.car != null ? sheet.car : 1, 10) || 1,
            POD: parseInt(sheet.pod != null ? sheet.pod : 1, 10) || 1
        };

        const conjurAttrKey = (Rules.getConjurationAttributeName ? Rules.getConjurationAttributeName(tradition) : null)
            || (['POD', 'INT', 'SAB', 'CAR'].includes(tradition) ? tradition : 'INT');
        const conjurVal = attributes[conjurAttrKey] || attributes.INT || 1;

        // Vantagens e Bônus
        const vantagens = Array.isArray(sheet.vantagens) ? sheet.vantagens : [];
        const desvantagens = Array.isArray(sheet.desvantagens) ? sheet.desvantagens : [];
        const pericias = Array.isArray(sheet.pericias) ? sheet.pericias : [];
        const caminhosMagia = Array.isArray(sheet.caminhosMagia) ? sheet.caminhosMagia : [];

        // Bônus explícitos e das vantagens
        const manualBonusPV = parseInt(sheet.bonusPV || 0, 10) || 0;
        const manualBonusPE = parseInt(sheet.bonusPE || 0, 10) || 0;

        const advBonusPV = Rules.calcResourceBonusFromAdvantages(vantagens, 'PV');
        const advBonusPE = Rules.calcResourceBonusFromAdvantages(vantagens, 'PE');

        const totalBonusPV = manualBonusPV + advBonusPV;
        const totalBonusPE = manualBonusPE + advBonusPE;

        const basePV = (attributes.CON * 2) + 10;
        const maxPV = basePV + totalBonusPV;

        const basePE = conjurVal + attributes.CON + 10;
        const maxPE = basePE + totalBonusPE;

        // Dano e Iniciativa
        const iniciativa = sheet.iniciativa || (attributes.DES >= 3 ? `+${attributes.DES - 2}` : '+0');
        const danoForca = sheet.danoForca || (attributes.FOR <= 1 ? '1d6-4' : attributes.FOR === 2 ? '1d6-2' : `1d6+${attributes.FOR - 2}`);

        // Perícias mapeadas com bônus total de rolagem (Atributo + Nível da perícia)
        const enrichedSkills = pericias.map(p => {
            const attrKey = String(p.atributo || 'DES').toUpperCase();
            const attrVal = attributes[attrKey] || 0;
            const skillLvl = parseInt(p.valor || 0, 10) || 0;
            const totalMod = attrVal + skillLvl;
            return {
                nome: p.nome || 'Perícia Desconhecida',
                atributo: attrKey,
                valor: skillLvl,
                totalMod: totalMod,
                descricao: p.descricao || ''
            };
        });

        return {
            id: unwrapped.id || '',
            name: name,
            charClass: charClass,
            charRace: charRace,
            tradition: tradition,
            conjurAttrKey: conjurAttrKey,
            conjurVal: conjurVal,
            exp: exp,
            attributes: attributes,
            resources: {
                basePV: basePV,
                bonusPV: totalBonusPV,
                maxPV: maxPV,
                currentPV: parseInt(sheet.pontosVida, 10) || maxPV,
                basePE: basePE,
                bonusPE: totalBonusPE,
                maxPE: maxPE,
                currentPE: parseInt(sheet.pontosEnergia, 10) || maxPE,
                iniciativa: iniciativa,
                danoForca: danoForca
            },
            pericias: enrichedSkills,
            vantagens: vantagens,
            desvantagens: desvantagens,
            caminhosMagia: caminhosMagia,
            equipment: String(sheet.equipment || '').trim(),
            backstory: String(sheet.backstory || '').trim(),
            lastUpdated: unwrapped.lastUpdated || new Date().toISOString()
        };
    }

    /**
     * Gera o código HTML completo, estilizado e otimizado para impressão / PDF (tamanho A4).
     * @param {Object} rawData
     * @returns {string} Documento HTML
     */
    function generateHTML(rawData) {
        const char = normalizeCharacterData(rawData);

        const skillsHtml = char.pericias.length > 0
            ? char.pericias.map(p => `
                <tr class="border-b border-amber-900/30">
                    <td class="py-1.5 px-2 font-semibold text-slate-100">${escapeHtml(p.nome)}</td>
                    <td class="py-1.5 px-2 text-center text-amber-400 font-mono text-xs">${p.atributo} (${char.attributes[p.atributo] || 0})</td>
                    <td class="py-1.5 px-2 text-center text-slate-300 font-mono text-xs">+${p.valor}</td>
                    <td class="py-1.5 px-2 text-center text-emerald-400 font-bold font-mono">+${p.totalMod}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="4" class="py-2 text-center text-slate-500 italic">Nenhuma perícia treinada</td></tr>';

        const magicHtml = char.caminhosMagia.length > 0
            ? char.caminhosMagia.map(m => `
                <div class="bg-indigo-950/40 border border-indigo-500/40 rounded p-2 flex justify-between items-center mb-1.5">
                    <span class="font-cinzel font-bold text-indigo-200 text-sm">${escapeHtml(m.nome || m.customName || 'Magia')}</span>
                    <span class="px-2 py-0.5 bg-indigo-600/30 border border-indigo-400/50 rounded text-xs font-mono font-bold text-indigo-300">Nível ${m.nivel || 1}</span>
                </div>
            `).join('')
            : '<p class="text-xs text-slate-500 italic">Nenhum caminho arcano despertado.</p>';

        const advHtml = char.vantagens.length > 0
            ? char.vantagens.map(v => `
                <div class="bg-emerald-950/30 border border-emerald-500/30 rounded p-2 mb-2">
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-bold text-emerald-300 text-xs">${escapeHtml(v.nome)}</span>
                        <span class="text-[10px] bg-emerald-900/60 border border-emerald-400/40 px-1.5 py-0.5 rounded text-emerald-200 font-mono">Custo: ${v.custo || 1} CP</span>
                    </div>
                    <p class="text-[11px] text-slate-300 leading-relaxed">${escapeHtml(v.descricao || '')}</p>
                </div>
            `).join('')
            : '<p class="text-xs text-slate-500 italic">Nenhuma vantagem registrada.</p>';

        const disadvHtml = char.desvantagens.length > 0
            ? char.desvantagens.map(d => `
                <div class="bg-rose-950/30 border border-rose-500/30 rounded p-2 mb-2">
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-bold text-rose-300 text-xs">${escapeHtml(d.nome)}</span>
                        <span class="text-[10px] bg-rose-900/60 border border-rose-400/40 px-1.5 py-0.5 rounded text-rose-200 font-mono">+${d.bonus || 1} CP</span>
                    </div>
                    <p class="text-[11px] text-slate-300 leading-relaxed">${escapeHtml(d.descricao || '')}</p>
                </div>
            `).join('')
            : '<p class="text-xs text-slate-500 italic">Nenhuma desvantagem registrada.</p>';

        const equipmentList = char.equipment
            ? char.equipment.split('\n').filter(Boolean).map(e => `<li class="text-xs text-slate-300 mb-1 flex items-start"><span class="text-amber-500 mr-2">✦</span>${escapeHtml(e)}</li>`).join('')
            : '<li class="text-xs text-slate-500 italic">Nenhum equipamento registrado.</li>';

        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ficha de Personagem — ${escapeHtml(char.name)} | Kuar-Tor RPG</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        @page {
            size: A4 portrait;
            margin: 10mm 12mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            margin: 0;
            padding: 0;
            background-color: #0b0f19;
            color: #e2e8f0;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            line-height: 1.4;
        }
        .font-cinzel {
            font-family: 'Cinzel', serif;
        }
        .container {
            max-width: 100%;
            margin: 0 auto;
            border: 2px solid #b45309;
            background: linear-gradient(180deg, #0d1322 0%, #080c16 100%);
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
        }
        /* Top Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #b45309;
            padding-bottom: 12px;
            margin-bottom: 14px;
        }
        .char-title h1 {
            margin: 0;
            font-size: 26px;
            letter-spacing: 1px;
            color: #fde047;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }
        .char-meta {
            display: flex;
            gap: 16px;
            margin-top: 4px;
            font-size: 11px;
            color: #94a3b8;
        }
        .char-meta strong {
            color: #e2e8f0;
        }
        .badge-system {
            text-align: right;
            border-left: 1px solid #334155;
            padding-left: 14px;
        }
        .badge-system .tag {
            background: #b45309;
            color: #fff;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Attributes Grid */
        .attrs-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 8px;
            margin-bottom: 14px;
        }
        .attr-card {
            background: #1e293b;
            border: 1px solid #475569;
            border-radius: 6px;
            text-align: center;
            padding: 6px 2px;
            position: relative;
        }
        .attr-card.highlight {
            border-color: #f59e0b;
            background: #1e2238;
        }
        .attr-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #94a3b8;
            letter-spacing: 0.5px;
        }
        .attr-val {
            font-family: 'Cinzel', serif;
            font-size: 20px;
            font-weight: 900;
            color: #f8fafc;
            margin: 2px 0;
        }
        .attr-note {
            font-size: 8px;
            color: #64748b;
        }

        /* Resources Row */
        .resources-row {
            display: grid;
            grid-template-columns: 2fr 2fr 1.2fr 1.5fr;
            gap: 10px;
            margin-bottom: 14px;
        }
        .resource-card {
            background: #111827;
            border-radius: 6px;
            padding: 8px 12px;
            border: 1px solid #374151;
        }
        .pv-card {
            border-color: #ef4444;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, #111827 100%);
        }
        .pe-card {
            border-color: #3b82f6;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, #111827 100%);
        }
        .res-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .pv-card .res-header { color: #f87171; }
        .pe-card .res-header { color: #60a5fa; }
        .res-body {
            display: flex;
            align-items: baseline;
            gap: 6px;
            margin-top: 2px;
        }
        .res-value {
            font-family: 'Cinzel', serif;
            font-size: 26px;
            font-weight: 900;
            color: #fff;
        }
        .res-sub {
            font-size: 10px;
            color: #94a3b8;
        }

        /* Main Content 2 Columns */
        .columns-layout {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 14px;
        }
        .section-box {
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid #334155;
            border-radius: 6px;
            padding: 10px 12px;
            margin-bottom: 12px;
        }
        .section-box h3 {
            margin: 0 0 8px 0;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #fde047;
            border-bottom: 1px solid #475569;
            padding-bottom: 4px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        table.skills-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        table.skills-table th {
            text-align: left;
            padding: 4px 6px;
            color: #94a3b8;
            font-size: 9px;
            text-transform: uppercase;
            border-bottom: 1px solid #475569;
        }

        /* Equipment List */
        ul.clean-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .footer {
            margin-top: 10px;
            border-top: 1px solid #334155;
            padding-top: 6px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- CABEÇALHO -->
        <header class="header">
            <div class="char-title">
                <h1 class="font-cinzel">${escapeHtml(char.name)}</h1>
                <div class="char-meta">
                    <span>Raça: <strong>${escapeHtml(char.charRace)}</strong></span>
                    <span>Classe: <strong>${escapeHtml(char.charClass)}</strong></span>
                    <span>Tradição Mágica: <strong>${escapeHtml(char.tradition)}</strong></span>
                    <span>EXP: <strong>${escapeHtml(char.exp)}</strong></span>
                </div>
            </div>
            <div class="badge-system">
                <span class="tag font-cinzel">Kuar-Tor +2d6</span>
                <div style="font-size: 9px; color: #94a3b8; margin-top: 3px;">Ficha Oficial do Operativo</div>
            </div>
        </header>

        <!-- ATRIBUTOS PRINCIPAIS -->
        <section class="attrs-grid">
            <div class="attr-card">
                <div class="attr-label">FOR</div>
                <div class="attr-val">${char.attributes.FOR}</div>
                <div class="attr-note">Força</div>
            </div>
            <div class="attr-card">
                <div class="attr-label">DES</div>
                <div class="attr-val">${char.attributes.DES}</div>
                <div class="attr-note">Destreza</div>
            </div>
            <div class="attr-card highlight">
                <div class="attr-label" style="color: #f59e0b;">CON</div>
                <div class="attr-val" style="color: #fde047;">${char.attributes.CON}</div>
                <div class="attr-note">Constituição</div>
            </div>
            <div class="attr-card">
                <div class="attr-label">INT</div>
                <div class="attr-val">${char.attributes.INT}</div>
                <div class="attr-note">Inteligência</div>
            </div>
            <div class="attr-card">
                <div class="attr-label">SAB</div>
                <div class="attr-val">${char.attributes.SAB}</div>
                <div class="attr-note">Sabedoria</div>
            </div>
            <div class="attr-card">
                <div class="attr-label">CAR</div>
                <div class="attr-val">${char.attributes.CAR}</div>
                <div class="attr-note">Carisma</div>
            </div>
            <div class="attr-card highlight">
                <div class="attr-label" style="color: #c084fc;">POD</div>
                <div class="attr-val" style="color: #e9d5ff;">${char.attributes.POD}</div>
                <div class="attr-note">Poder (Arcano)</div>
            </div>
        </section>

        <!-- RECURSOS VITAIS E DE COMBATE -->
        <section class="resources-row">
            <div class="resource-card pv-card">
                <div class="res-header">
                    <span>Pontos de Vida (PV)</span>
                    <span style="font-size: 8px;">(CONx2 + 10 + Bônus)</span>
                </div>
                <div class="res-body">
                    <span class="res-value">${char.resources.maxPV}</span>
                    <span class="res-sub">Base: ${char.resources.basePV} | Bônus: +${char.resources.bonusPV}</span>
                </div>
            </div>

            <div class="resource-card pe-card">
                <div class="res-header">
                    <span>Pontos de Energia (PE)</span>
                    <span style="font-size: 8px;">(${char.conjurAttrKey} + CON + 10 + Bônus)</span>
                </div>
                <div class="res-body">
                    <span class="res-value">${char.resources.maxPE}</span>
                    <span class="res-sub">Base: ${char.resources.basePE} | Bônus: +${char.resources.bonusPE}</span>
                </div>
            </div>

            <div class="resource-card" style="border-color: #eab308;">
                <div class="res-header" style="color: #fde047;">
                    <span>Iniciativa</span>
                </div>
                <div class="res-body">
                    <span class="res-value">${char.resources.iniciativa}</span>
                    <span class="res-sub">(+2d6)</span>
                </div>
            </div>

            <div class="resource-card" style="border-color: #f97316;">
                <div class="res-header" style="color: #fb923c;">
                    <span>Dano por Força</span>
                </div>
                <div class="res-body">
                    <span class="res-value" style="font-size: 18px;">${char.resources.danoForca}</span>
                </div>
            </div>
        </section>

        <!-- CORPO DA FICHA EM 2 COLUNAS -->
        <div class="columns-layout">
            <!-- COLUNA ESQUERDA: PERÍCIAS E MAGIA -->
            <div>
                <div class="section-box">
                    <h3 class="font-cinzel">Perícias Treinadas</h3>
                    <table class="skills-table">
                        <thead>
                            <tr>
                                <th>Perícia</th>
                                <th style="text-align: center;">Atrib.</th>
                                <th style="text-align: center;">Treino</th>
                                <th style="text-align: center;">Total (+2d6)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${skillsHtml}
                        </tbody>
                    </table>
                </div>

                <div class="section-box">
                    <h3 class="font-cinzel">Caminhos da Magia</h3>
                    ${magicHtml}
                </div>

                <div class="section-box">
                    <h3 class="font-cinzel">Equipamentos & Proteção</h3>
                    <ul class="clean-list">
                        ${equipmentList}
                    </ul>
                </div>
            </div>

            <!-- COLUNA DIREITA: VANTAGENS E DESVANTAGENS -->
            <div>
                <div class="section-box">
                    <h3 class="font-cinzel">Vantagens & Bônus</h3>
                    ${advHtml}
                </div>

                <div class="section-box">
                    <h3 class="font-cinzel">Desvantagens & Complicações</h3>
                    ${disadvHtml}
                </div>

                ${char.backstory ? `
                <div class="section-box">
                    <h3 class="font-cinzel">Histórico & Anotações</h3>
                    <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(char.backstory)}</p>
                </div>
                ` : ''}
            </div>
        </div>

        <footer class="footer">
            <span>Kuar-Tor Virtual Tabletop — Sistema Modular 2D</span>
            <span>Documento Gerado a partir do Firebase Firestore — ID: ${escapeHtml(char.id || 'N/A')}</span>
        </footer>
    </div>
</body>
</html>`;
    }

    /**
     * Auxiliar simples de escape HTML contra injeção em templates.
     */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Gera o arquivo PDF no caminho especificado (disponível no ambiente Node.js com browser headless instalado).
     * @param {Object} rawData - Dados da ficha
     * @param {string} outputPath - Caminho absoluto de destino do .pdf
     * @returns {Promise<{success: boolean, outputPath: string, fileSize: number}>}
     */
    async function generatePDF(rawData, outputPath) {
        if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
            throw new Error('generatePDF só pode ser executado em ambiente Node.js');
        }

        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const { execSync } = require('child_process');

        const htmlContent = generateHTML(rawData);
        const tempHtmlPath = path.join(os.tmpdir(), `ficha_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.html`);
        fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

        // Detecta binário de browser disponível
        const candidates = ['brave-browser', 'google-chrome-stable', 'chromium-browser', 'chromium'];
        let browserBinary = null;
        for (const bin of candidates) {
            try {
                execSync(`which ${bin}`, { stdio: 'ignore' });
                browserBinary = bin;
                break;
            } catch (e) {
                // continua
            }
        }

        if (!browserBinary) {
            fs.unlinkSync(tempHtmlPath);
            throw new Error('Nenhum navegador headless encontrado (brave-browser, chromium, google-chrome)');
        }

        try {
            const cmd = `${browserBinary} --headless --no-sandbox --disable-gpu --no-pdf-header-footer --print-to-pdf="${outputPath}" "file://${tempHtmlPath}"`;
            execSync(cmd, { stdio: 'pipe' });

            if (!fs.existsSync(outputPath)) {
                throw new Error(`Falha ao gerar o arquivo PDF em: ${outputPath}`);
            }

            const stat = fs.statSync(outputPath);
            return {
                success: true,
                outputPath: outputPath,
                fileSize: stat.size,
                htmlTempPath: tempHtmlPath
            };
        } finally {
            if (fs.existsSync(tempHtmlPath)) {
                fs.unlinkSync(tempHtmlPath);
            }
        }
    }

    return {
        unwrapFirestoreValue,
        normalizeCharacterData,
        generateHTML,
        generatePDF
    };
}));
