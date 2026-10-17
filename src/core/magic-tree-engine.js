/**
 * ============================================================================
 * Kuar-Tor — Módulo de Árvore de Magia & Fusões (+2d6 v2.3 Daemon)
 * Gerencia os 12 Caminhos Místicos, 3 Formas, Matriz Completa de Fusões,
 * Alocação e Retirada de Pontos (Reembolso de PM) e Grimório de Habilidades.
 * ============================================================================
 */

(function (global) {
    'use strict';

    // 1. Os 12 Caminhos Místicos (6 Elementais, 3 Vitais, 3 Arcanos)
    const magicPaths = {
        // Elementais (6)
        "fogo": { name: "Magia (Fogo)", category: "elemental", angle: 0, color: "#f97316", icon: "fa-solid fa-fire", desc: "Chamas, calor, explosões térmicas e plasma ardente." },
        "agua": { name: "Magia (Água)", category: "elemental", angle: 30, color: "#06b6d4", icon: "fa-solid fa-water", desc: "Fluidos, gelo, vapor e manipulação de correntes hídricas." },
        "ar": { name: "Magia (Ar)", category: "elemental", angle: 60, color: "#38bdf8", icon: "fa-solid fa-wind", desc: "Ventos, tempestades, relâmpagos e gases." },
        "terra": { name: "Magia (Terra)", category: "elemental", angle: 90, color: "#10b981", icon: "fa-solid fa-mountain", desc: "Rochas, minerais, metais, areia e solidez telúrica." },
        "luz": { name: "Magia (Luz)", category: "elemental", angle: 120, color: "#fbbf24", icon: "fa-solid fa-sun", desc: "Fótons, radiação solar, revelação e clareza mágica." },
        "trevas": { name: "Magia (Trevas)", category: "elemental", angle: 150, color: "#6366f1", icon: "fa-solid fa-moon", desc: "Sombras, frio abissal, ilusões espectrais e ocultação." },

        // Vitais (3)
        "animais": { name: "Magia (Animais)", category: "vital", angle: 180, color: "#eab308", icon: "fa-solid fa-paw", desc: "Comunicação com bestas, sentidos aguçados e instintos." },
        "humanos": { name: "Magia (Humanos)", category: "vital", angle: 210, color: "#ec4899", icon: "fa-solid fa-person", desc: "Corpo biológico, restauração de PVs, mente e vigor humanoide." },
        "plantas": { name: "Magia (Plantas)", category: "vital", angle: 240, color: "#84cc16", icon: "fa-solid fa-seedling", desc: "Flora, raízes vivas, cipós e venenos botânicos." },

        // Arcanos (3)
        "spiritum": { name: "Magia (Spiritum)", category: "arcano", angle: 270, color: "#a855f7", icon: "fa-solid fa-ghost", desc: "Espíritos, plano astral, sonhos e conexões etéreas." },
        "arkanum": { name: "Magia (Arkanum)", category: "arcano", angle: 300, color: "#ef4444", icon: "fa-solid fa-skull-crossbones", desc: "Demônios, fendas cósmicas e pactos extraplanares." },
        "metamagia": { name: "Magia (Metamagia)", category: "arcano", angle: 330, color: "#14b8a6", icon: "fa-solid fa-infinity", desc: "Manipulação da própria trama mágica: anular, teleportar, absorver." }
    };

    // 2. As 3 Formas de Ação e CDs (+2d6)
    const magicForms = {
        "Criar": { cdBase: 10, peCost: 3, desc: "Gerar o elemento do nada absoluto." },
        "Controlar": { cdBase: 8, peCost: 2, desc: "Manipular ou moldar elemento já existente." },
        "Entender": { cdBase: 6, peCost: 1, desc: "Analisar, detectar ou comunicar-se com o elemento." }
    };

    // 3. Matriz Completa de Fusões (+2d6 Daemon)
    const spellFusions = {
        // Elementais
        "fogo+agua": {
            name: "Vapor & Pressão Térmica",
            Criar: { spell: "Geiser de Vapor Escaldante", desc: "Ergue coluna de vapor sob alta pressão que queima e empurra.", cd: 11, pe: 4 },
            Controlar: { spell: "Névoa Térmica Ofuscante", desc: "Cobre a área com vapor denso, cegando e superaquecendo inimigos.", cd: 9, pe: 2 },
            Entender: { spell: "Termobarometria Arcana", desc: "Mede variações de pressão e temperatura no ambiente.", cd: 7, pe: 1 }
        },
        "fogo+ar": {
            name: "Plasma & Eletricidade Ígnea",
            Criar: { spell: "Tempestade de Plasma", desc: "Detona um raio elétrico superaquecido causando 3d6 de dano térmico/elétrico.", cd: 12, pe: 4 },
            Controlar: { spell: "Direcionar Corrente de Fogo", desc: "Guia chamas e faíscas ao redor de obstáculos.", cd: 9, pe: 3 },
            Entender: { spell: "Visão Termoelétrica", desc: "Detecta calor e campos eletromagnéticos vivos.", cd: 7, pe: 2 }
        },
        "fogo+terra": {
            name: "Magma & Vulcanismo",
            Criar: { spell: "Lança de Magma", desc: "Arremessa rocha fundida que perfura armaduras (2d6 + queima contínua).", cd: 11, pe: 4 },
            Controlar: { spell: "Moldar Fluxo de Lava", desc: "Cria barreiras de magma que solidificam em pedra quente.", cd: 9, pe: 3 },
            Entender: { spell: "Previsão Vulcânica", desc: "Sente tensões tectônicas e calor no subsolo.", cd: 7, pe: 2 }
        },
        "fogo+luz": {
            name: "Chama Sagrada Solar",
            Criar: { spell: "Raio Solar Purificador", desc: "Feixe de luz radiante que causa dano dobrado em mortos-vivos e demônios.", cd: 11, pe: 4 },
            Controlar: { spell: "Aura do Sol Nascente", desc: "Ilumina e queima inimigos que se aproximam.", cd: 9, pe: 3 },
            Entender: { spell: "Discernir Trevas e Ilusões", desc: "Dissipa camuflagens ópticas e mágicas.", cd: 7, pe: 2 }
        },
        "fogo+trevas": {
            name: "Fogo Negro Abissal / Cinzas",
            Criar: { spell: "Labaredas Queima-Alma", desc: "Chamas negras que danificam diretamente a fadiga/alma.", cd: 12, pe: 5 },
            Controlar: { spell: "Dreno de Calor", desc: "Absorve calor de um ambiente gerando escuridão gélida.", cd: 9, pe: 3 },
            Entender: { spell: "Rastrear Pecados", desc: "Sente a presença de atos violentos recentes.", cd: 8, pe: 2 }
        },
        "agua+ar": {
            name: "Gelo & Tempestade Glacial",
            Criar: { spell: "Prisão Glacial de Granizo", desc: "Congela a umidade gerando espinhos de gelo e imobilização.", cd: 11, pe: 4 },
            Controlar: { spell: "Nevoeiro Congelante", desc: "Cobre a área com cerração que reduz mobilidade inimiga.", cd: 9, pe: 2 },
            Entender: { spell: "Pressentir Tempestades", desc: "Lê a umidade e pressão atmosférica com precisão.", cd: 6, pe: 1 }
        },
        "agua+terra": {
            name: "Lama & Sedimento Fértil",
            Criar: { spell: "Pântano Instantâneo", desc: "Transforma o solo sólido em lama movediça profunda que prende alvos.", cd: 11, pe: 4 },
            Controlar: { spell: "Armadura de Barro Endurecido", desc: "Envolve o corpo em camada de barro que absorve impactos.", cd: 9, pe: 3 },
            Entender: { spell: "Sentido Sísmico Aquoso", desc: "Detecta vibrações transmitidas pela umidade do solo.", cd: 7, pe: 1 }
        },
        "agua+luz": {
            name: "Prisma & Espectro Ilusório",
            Criar: { spell: "Miragem Prismática", desc: "Cria cópias ilusórias refratadas que confundem agressores.", cd: 11, pe: 3 },
            Controlar: { spell: "Distorcer Reflexos", desc: "Dobra os feixes de luz para tornar alvos translúcidos.", cd: 9, pe: 2 },
            Entender: { spell: "Claridade Óptica", desc: "Identifica ilusões e padrões espectrais na luz visível.", cd: 6, pe: 1 }
        },
        "agua+trevas": {
            name: "Ácido & Corrosão Abissal",
            Criar: { spell: "Geiser Ácido Corrosivo", desc: "Dispara jato cáustico que dissolve armaduras e causa dano contínuo.", cd: 12, pe: 4 },
            Controlar: { spell: "Poça Viscosa Dissolvente", desc: "Direciona fluxo ácido no chão derretendo obstáculos.", cd: 9, pe: 3 },
            Entender: { spell: "Análise Toxicológica", desc: "Detecta venenos, toxinas e pureza de substâncias químicas.", cd: 7, pe: 2 }
        },
        "ar+terra": {
            name: "Areia & Tempestade Sísmica",
            Criar: { spell: "Vórtice de Areia Cortante", desc: "Levanta turbilhão de grãos minerais que cega e causa cortes.", cd: 11, pe: 4 },
            Controlar: { spell: "Muralha de Arenito", desc: "Comprime areia solta em barreiras rígidas instantâneas.", cd: 9, pe: 3 },
            Entender: { spell: "Leitura de Dunas", desc: "Sente pegadas, trilhas e movimento sobre o solo arenoso.", cd: 6, pe: 1 }
        },
        "ar+luz": {
            name: "Som & Ressonância Harmônica",
            Criar: { spell: "Estrondo Sônico Detonante", desc: "Dispara onda de choque audível que atordoa e empurra oponentes.", cd: 11, pe: 3 },
            Controlar: { spell: "Esfera de Silêncio Místico", desc: "Anula vibrações sonoras em uma área para furtividade absoluta.", cd: 8, pe: 2 },
            Entender: { spell: "Ecolocalização Astral", desc: "Enxerga através de reverberações sonoras no ar.", cd: 6, pe: 1 }
        },
        "ar+trevas": {
            name: "Vácuo & Implosão Negativa",
            Criar: { spell: "Bolha de Vácuo Sufocante", desc: "Remove todo o oxigênio ao redor de um alvo impedindo respiração e conjuração.", cd: 12, pe: 5 },
            Controlar: { spell: "Implosão de Pressão", desc: "Cria diferencial de pressão atraindo objetos e inimigos para o centro.", cd: 10, pe: 3 },
            Entender: { spell: "Detectar Correntes de Éter", desc: "Identifica zonas rarefeitas e bolsas de ar no ambiente.", cd: 7, pe: 2 }
        },
        "terra+luz": {
            name: "Cristal & Refracção Mineral",
            Criar: { spell: "Baluarte de Cristal Lapidado", desc: "Ergue espigões de quartzo reluzente que refletem projéteis e feixes.", cd: 11, pe: 4 },
            Controlar: { spell: "Refração em Cacos", desc: "Manipula lascas cristalinas como projéteis teleguiados.", cd: 9, pe: 3 },
            Entender: { spell: "Ressonância Cristalina", desc: "Canaliza vibrações minerais para captar energias mágicas latentes.", cd: 7, pe: 1 }
        },
        "terra+trevas": {
            name: "Metal & Magnetismo Negro",
            Criar: { spell: "Estacas de Ferro Negro", desc: "Faz brotar lanças metálicas afiadas do solo perfurando blindagens.", cd: 12, pe: 4 },
            Controlar: { spell: "Pulso Magnético Oculto", desc: "Arranca armas e itens metálicos das mãos dos oponentes.", cd: 9, pe: 3 },
            Entender: { spell: "Sentir Minérios", desc: "Localiza jazidas de metais e ligas escondidas sob a terra.", cd: 6, pe: 1 }
        },
        "luz+trevas": {
            name: "Crepúsculo & Penumbra Mística",
            Criar: { spell: "Zona de Penumbra Ilusória", desc: "Gera espaço onde a luz e sombra dançam desorientando a visão.", cd: 11, pe: 3 },
            Controlar: { spell: "Teia de Contraste Óptico", desc: "Ofusca alvos alternando clarões cegantes e escuridão súbita.", cd: 9, pe: 2 },
            Entender: { spell: "Discernir Máscaras da Alma", desc: "Revela segredos e motivações ocultas por trás de palavras.", cd: 7, pe: 2 }
        },

        // Vitais
        "animais+humanos": {
            name: "Primal & Fúria Ancestral",
            Criar: { spell: "Fúria do Predador Astral", desc: "Desperta garras etéreas e ferocidade dobrando bônus de dano.", cd: 11, pe: 4 },
            Controlar: { spell: "Intimidação Bestial", desc: "Projeta presença aterrorizante que paralisa alvos mais fracos.", cd: 9, pe: 2 },
            Entender: { spell: "Percepção Selvagem", desc: "Olfato e reflexos de fera para rastrear presas e ameaças.", cd: 6, pe: 1 }
        },
        "animais+plantas": {
            name: "Fungos & Esporos da Floresta",
            Criar: { spell: "Nuvem de Esporos Alucinógenos", desc: "Libera névoa micelial que causa confusão mental e fraqueza.", cd: 11, pe: 3 },
            Controlar: { spell: "Proliferação Fúngica", desc: "Acelera a decomposição de matéria orgânica criando atalhos.", cd: 9, pe: 2 },
            Entender: { spell: "Rede Micelial", desc: "Conecta-se à teia fúngica subterrânea para obter informações da floresta.", cd: 7, pe: 1 }
        },
        "humanos+plantas": {
            name: "Vida & Bio-Regeneração",
            Criar: { spell: "Regeneração Celular Acelerada", desc: "Cura 2d6+2 PVs e restaura tecidos vivos feridos.", cd: 11, pe: 4 },
            Controlar: { spell: "Barreira de Raízes Protetoras", desc: "Brota muralha vegetal viva que absorve dano direcionado a aliados.", cd: 9, pe: 3 },
            Entender: { spell: "Diagnóstico Biológico", desc: "Identifica debilidades físicas, envenenamentos e estado de saúde.", cd: 6, pe: 1 }
        },

        // Arcanos
        "spiritum+arkanum": {
            name: "Vazio Cósmico & Entropia",
            Criar: { spell: "Fenda de Entropia Cósmica", desc: "Abre mini-fenda que suga energia vital causando dano psíquico/físico.", cd: 13, pe: 5 },
            Controlar: { spell: "Dreno de Sanidade", desc: "Perturba mentes inimigas impondo penalidades em rolagens de ataque.", cd: 10, pe: 4 },
            Entender: { spell: "Comunicação com Horrores do Abismo", desc: "Compreende idiomas estranhos e sussurros de outras realidades.", cd: 8, pe: 2 }
        },
        "spiritum+metamagia": {
            name: "Tempo & Clarividência Cósmica",
            Criar: { spell: "Fenda no Espaço-Tempo", desc: "Abre uma janela para observar qualquer ponto da ilha.", cd: 12, pe: 4 },
            Controlar: { spell: "Banish Astral", desc: "Expulsa espíritos e intrusos planares de volta ao éter.", cd: 10, pe: 3 },
            Entender: { spell: "Premonição (+2d6)", desc: "Recebe +3 no próximo teste de Esquiva ou Iniciativa.", cd: 7, pe: 2 }
        },
        "arkanum+metamagia": {
            name: "Runas & Selos Extraplanares",
            Criar: { spell: "Selo Rúnico de Aprisionamento", desc: "Grava glifo no solo que detona ou sela o primeiro a pisar.", cd: 12, pe: 4 },
            Controlar: { spell: "Sobrecarga de Runas", desc: "Amplifica o efeito de itens mágicos ou rituais ativos.", cd: 10, pe: 3 },
            Entender: { spell: "Decifração Rúnica Ancestral", desc: "Lê inscrições arcanas perdidas e desativa armadilhas mágicas.", cd: 7, pe: 2 }
        },

        // Híbridas Elementais + Vitais / Arcanos
        "fogo+animais": {
            name: "Magia Dracônica",
            Criar: { spell: "Sopro Dracônico de Fogo", desc: "Expele cone de chamas devastador causando 3d6 de dano em área.", cd: 12, pe: 5 },
            Controlar: { spell: "Escamas Ígneas Protetoras", desc: "Endurece a pele conferindo RD 4 contra fogo e cortes.", cd: 9, pe: 3 },
            Entender: { spell: "Empatia Dracônica", desc: "Comunica-se com répteis e monstros míticos afins ao fogo.", cd: 7, pe: 2 }
        },
        "fogo+humanos": {
            name: "Chama da Paixão & Ímpeto",
            Criar: { spell: "Chama do Ímpeto Heróico", desc: "Infunde um aliado com coragem extrema, concedendo +2 em ataques e dano.", cd: 10, pe: 3 },
            Controlar: { spell: "Incitar Fúria Cega", desc: "Faz um oponente perder o controle tático e atacar sem defesa.", cd: 9, pe: 3 },
            Entender: { spell: "Leitura de Paixões", desc: "Detecta as emoções dominantes e laços afetivos de uma pessoa.", cd: 6, pe: 1 }
        },
        "fogo+plantas": {
            name: "Deserto & Fogo Botânico",
            Criar: { spell: "Cacto Explosivo de Fogo", desc: "Materializa espinhos ardentes que se cravam e explodem.", cd: 11, pe: 4 },
            Controlar: { spell: "Onda de Seca Drástica", desc: "Desidrata vegetação e madeira tornando-as inflamáveis.", cd: 8, pe: 2 },
            Entender: { spell: "Resiliência do Deserto", desc: "Encontra fontes de água e resiste à insolação extrema.", cd: 6, pe: 1 }
        },
        "agua+animais": {
            name: "Magia Abissal Marinha",
            Criar: { spell: "Tentáculos de Água Negra", desc: "Materializa tentáculos aquáticos que esmagam e afogam inimigos.", cd: 12, pe: 4 },
            Controlar: { spell: "Vórtice Trator Aquático", desc: "Puxa alvos para o redemoinho submerso desarmando-os.", cd: 9, pe: 3 },
            Entender: { spell: "Visão Abissal & Falar com Criaturas do Mar", desc: "Enxerga na escuridão subaquática e conversa com seres marinhos.", cd: 7, pe: 1 }
        },
        "agua+spiritum": {
            name: "Marés & Espíritos das Águas",
            Criar: { spell: "Espelho Espiritual de Água", desc: "Cria portal na superfície da água para espiar ou atravessar distâncias.", cd: 12, pe: 4 },
            Controlar: { spell: "Chicote Fluídico Espiritual", desc: "Ataca a substância etérea de fantasmas e oponentes.", cd: 9, pe: 2 },
            Entender: { spell: "Lembranças das Águas", desc: "Acessa acontecimentos passados refletidos naquela fonte de água.", cd: 7, pe: 2 }
        },
        "agua+plantas": {
            name: "Pântano & Toxinas Botânicas",
            Criar: { spell: "Lodo Espinhoso Tóxico", desc: "Faz brotar terreno alagado e venenoso sob os pés dos inimigos.", cd: 11, pe: 4 },
            Controlar: { spell: "Cipós Aquáticos Constritores", desc: "Raízes submersas puxam alvos para o fundo.", cd: 9, pe: 3 },
            Entender: { spell: "Detectar Venenos & Água Pura", desc: "Identifica propriedades de qualquer extrato líquido.", cd: 6, pe: 1 }
        },
        "ar+animais": {
            name: "Magia Celestial das Aves",
            Criar: { spell: "Asas de Falcão Etéreo", desc: "Concede voo veloz ao conjurador por 1 cena.", cd: 11, pe: 4 },
            Controlar: { spell: "Guarda da Águia Tempestuosa", desc: "Desvia projéteis com rajadas de vento defensivas.", cd: 8, pe: 2 },
            Entender: { spell: "Visão Panorâmica Aérea", desc: "Enxerga a quilômetros como uma ave de rapina.", cd: 6, pe: 1 }
        },
        "ar+metamagia": {
            name: "Éter & Dobra Espacial",
            Criar: { spell: "Salto Espacial Instantâneo", desc: "Teleporta o conjurador para um ponto visível a até 20 metros.", cd: 12, pe: 4 },
            Controlar: { spell: "Distorção de Projéteis", desc: "Curva o espaço para que ataques à distância errem o alvo.", cd: 10, pe: 3 },
            Entender: { spell: "Sentido Dimensional", desc: "Detecta distorções espaciais, portais e seres fora de fase.", cd: 7, pe: 2 }
        },
        "terra+humanos": {
            name: "Titã Colossal Telúrico",
            Criar: { spell: "Forma de Titã Telúrico", desc: "Aumenta o porte físico concedendo +3 em FOR e RD 3 por 1 cena.", cd: 11, pe: 4 },
            Controlar: { spell: "Impacto Sísmico com os Pés", desc: "Pisa no solo gerando tremor que derruba oponentes próximos.", cd: 9, pe: 3 },
            Entender: { spell: "Afinidade com Minerais Corpóreos", desc: "Avalia a resistência óssea e mineral de seres vivos.", cd: 6, pe: 1 }
        },
        "terra+spiritum": {
            name: "Fóssil & Espíritos da Rocha",
            Criar: { spell: "Animar Ossada Fossilizada", desc: "Ergue construto fóssil ancestral para lutar ao seu lado.", cd: 12, pe: 5 },
            Controlar: { spell: "Grito dos Ancestrais de Pedra", desc: "Emana lamento rochoso que ensurdece e aterroriza inimigos.", cd: 9, pe: 3 },
            Entender: { spell: "Memória Geológica da Rocha", desc: "Ouve memórias gravadas nas pedras sobre séculos passados.", cd: 7, pe: 2 }
        },
        "terra+metamagia": {
            name: "Portais Rúnicos de Pedra",
            Criar: { spell: "Portal Monolítico", desc: "Ergue duas lajes de pedra interligadas para teletransporte tático.", cd: 13, pe: 5 },
            Controlar: { spell: "Barreira de Ressonância", desc: "Reflete magias direcionadas contra a muralha rochosa.", cd: 10, pe: 4 },
            Entender: { spell: "Sondar Linhas de Ley", desc: "Mapeia correntes de poder místico na crosta terrestre.", cd: 7, pe: 2 }
        },
        "luz+humanos": {
            name: "Bio-Radiância Sagrada & Fé",
            Criar: { spell: "Regeneração Fotônica", desc: "Cura 2d6 PVs e estanca todos os sangramentos instantaneamente.", cd: 10, pe: 3 },
            Controlar: { spell: "Aura da Verdade", desc: "Emite um brilho que impede mentiras voluntárias em cena.", cd: 9, pe: 2 },
            Entender: { spell: "Diagnóstico da Alma", desc: "Revela doenças, venenos e maldições no organismo.", cd: 6, pe: 1 }
        },
        "luz+plantas": {
            name: "Florescer & Luz Vegetal",
            Criar: { spell: "Lótus de Luz Purificadora", desc: "Brota flor radiante que dissipa venenos, maldições e restaura vitalidade.", cd: 11, pe: 3 },
            Controlar: { spell: "Cipós Cintilantes Aprisionadores", desc: "Prende alvos em vinhas que brilham cegando e contendo.", cd: 9, pe: 2 },
            Entender: { spell: "Comunicação com Árvores Antigas", desc: "Acessa a sabedoria das plantas veneráveis de uma região.", cd: 6, pe: 1 }
        },
        "luz+spiritum": {
            name: "Aura Espiritual Resplandecente",
            Criar: { spell: "Escudo de Aura Resplandecente", desc: "Gera barreira que repele seres das trevas e absorve dano mágico.", cd: 11, pe: 4 },
            Controlar: { spell: "Clarão Revelador de Almas", desc: "Exibe a verdadeira forma de transmorfos e fantasmas ocultos.", cd: 8, pe: 2 },
            Entender: { spell: "Leitura de Aura", desc: "Lê emoções, intenções e alinhamento do alvo pelas cores da aura.", cd: 6, pe: 1 }
        },
        "trevas+plantas": {
            name: "Decomposição & Podridão Negra",
            Criar: { spell: "Praga da Podridão Negra", desc: "Espalha necrose vegetal acelerada deteriorando estruturas de madeira e carne.", cd: 11, pe: 4 },
            Controlar: { spell: "Cipós Espinhosos Necróticos", desc: "Vinhas de espinhos negros que drenam energia de quem tocam.", cd: 9, pe: 3 },
            Entender: { spell: "Sentir Morte Orgânica", desc: "Detecta cadáveres e focos de apodrecimento a grandes distâncias.", cd: 6, pe: 1 }
        },
        "trevas+spiritum": {
            name: "Pesadelos & Espectros do Medo",
            Criar: { spell: "Materializar Medo Ancestral", desc: "Invoca espectro sob a forma do maior terror do alvo.", cd: 12, pe: 5 },
            Controlar: { spell: "Mortalha Onírica Sombria", desc: "Mergulha a vítima em ilusão de pesadelo paralisante.", cd: 10, pe: 3 },
            Entender: { spell: "Sondar Fobias e Pesadelos", desc: "Descobre os segredos e medos mais íntimos de quem dorme.", cd: 7, pe: 2 }
        },
        "trevas+arkanum": {
            name: "Magia de Sangue & Pacto Sombrio",
            Criar: { spell: "Agulhas de Sangue Cristalizado", desc: "Molda o próprio sangue ou de inimigos em dardos perfurantes.", cd: 12, pe: 4 },
            Controlar: { spell: "Hemo-Cinese de Contenção", desc: "Manipula o fluxo sanguíneo do alvo paralisando seus movimentos.", cd: 11, pe: 4 },
            Entender: { spell: "Rastreio por Linhagem Sanguínea", desc: "Localiza parentes e vestígios biológicos a partir de uma gota de sangue.", cd: 7, pe: 2 }
        },
        "animais+trevas": {
            name: "Quimera das Sombras",
            Criar: { spell: "Invocar Lobo do Vazio", desc: "Materializa uma fera furtiva imune a ataques físicos mundanos.", cd: 12, pe: 5 },
            Controlar: { spell: "Frenesi Noturno", desc: "Aumenta o dano e ferocidade de feras na escuridão.", cd: 9, pe: 3 },
            Entender: { spell: "Sentidos da Noite", desc: "Visão no escuro e audição ultrassônica por 1 cena.", cd: 7, pe: 2 }
        },
        "arkanum+fogo": {
            name: "Chamas Infernais",
            Criar: { spell: "Meteoro Demoníaco", desc: "Invoca bola de fogo do abismo que queima até matéria inerte.", cd: 13, pe: 6 },
            Controlar: { spell: "Correntes de Fogo Abissal", desc: "Aprisiona o alvo em laços flamejantes inextinguíveis.", cd: 10, pe: 4 },
            Entender: { spell: "Decifrar Contratos Arcanos", desc: "Lê runas demoníacas e termos de pactos ocultos.", cd: 8, pe: 2 }
        },
        "humanos+spiritum": {
            name: "Mediunidade & Projeção",
            Criar: { spell: "Corpo Astral Duplo", desc: "Manifesta um avatar espectral capaz de agir à distância.", cd: 12, pe: 4 },
            Controlar: { spell: "Marionete Espiritual", desc: "Comanda impulsos motores de um alvo por 1 rodada.", cd: 11, pe: 4 },
            Entender: { spell: "Leitura de Memórias da Alma", desc: "Acessa recordações profundas de alguém desacordado.", cd: 8, pe: 2 }
        }
    };

    /**
     * Motor de Regras e Estado da Árvore Mágica
     */
    const MagicTreeEngine = {
        magicPaths,
        magicForms,
        spellFusions,

        /**
         * Inicializa ou normaliza o estado do personagem na árvore
         */
        createCharacterState(initial = {}) {
            const state = {
                availablePM: typeof initial.availablePM === 'number' ? Math.max(0, initial.availablePM) : 4,
                skills: {},
                fusionSkills: initial.fusionSkills ? { ...initial.fusionSkills } : {},
                learnedAbilities: Array.isArray(initial.learnedAbilities) ? [...initial.learnedAbilities] : []
            };

            // Preencher skills iniciais ou padrões válidos
            const defaultSkills = initial.skills || { "fogo": 2, "luz": 1, "metamagia": 1 };
            Object.keys(magicPaths).forEach(key => {
                const lvl = parseInt(defaultSkills[key]);
                state.skills[key] = !isNaN(lvl) && lvl > 0 ? lvl : 0;
            });

            return state;
        },

        /**
         * Adiciona 1 ponto a um caminho de magia (consome 1 PM disponível)
         */
        addPoint(state, pathKey) {
            if (!state || typeof state !== 'object') {
                throw new Error("Estado inválido fornecido para addPoint.");
            }
            if (!pathKey || !magicPaths[pathKey]) {
                return { success: false, reason: "invalid_path", pathKey };
            }
            if (typeof state.availablePM !== 'number' || state.availablePM <= 0) {
                return { success: false, reason: "no_pm_available", availablePM: state.availablePM || 0 };
            }

            const currentLevel = state.skills[pathKey] || 0;
            state.skills[pathKey] = currentLevel + 1;
            state.availablePM -= 1;

            return {
                success: true,
                pathKey,
                newLevel: state.skills[pathKey],
                availablePM: state.availablePM
            };
        },

        /**
         * Retira 1 ponto de um caminho de magia e reembolsa 1 PM para a reserva
         */
        removePoint(state, pathKey) {
            if (!state || typeof state !== 'object') {
                throw new Error("Estado inválido fornecido para removePoint.");
            }
            if (!pathKey || !magicPaths[pathKey]) {
                return { success: false, reason: "invalid_path", pathKey };
            }

            const currentLevel = state.skills[pathKey] || 0;
            if (currentLevel <= 0) {
                return {
                    success: false,
                    reason: "level_zero",
                    pathKey,
                    newLevel: 0,
                    availablePM: state.availablePM
                };
            }

            state.skills[pathKey] = currentLevel - 1;
            state.availablePM = (typeof state.availablePM === 'number' ? state.availablePM : 0) + 1;

            return {
                success: true,
                pathKey,
                newLevel: state.skills[pathKey],
                availablePM: state.availablePM
            };
        },

        /**
         * Adiciona 1 ponto a um nó de fusão (Secundus ou Terceirus) consumindo 1 PM
         */
        addFusionPoint(state, fusionId) {
            if (!state || typeof state !== 'object') {
                throw new Error("Estado inválido fornecido para addFusionPoint.");
            }
            if (!fusionId || typeof fusionId !== 'string') {
                return { success: false, reason: "invalid_fusion_id", fusionId };
            }
            if (typeof state.availablePM !== 'number' || state.availablePM <= 0) {
                return { success: false, reason: "no_pm_available", availablePM: state.availablePM || 0 };
            }

            if (!state.fusionSkills) state.fusionSkills = {};
            const currentLevel = state.fusionSkills[fusionId] || 0;
            state.fusionSkills[fusionId] = currentLevel + 1;
            state.availablePM -= 1;

            return {
                success: true,
                fusionId,
                newLevel: state.fusionSkills[fusionId],
                availablePM: state.availablePM
            };
        },

        /**
         * Retira 1 ponto de um nó de fusão (Secundus ou Terceirus) e reembolsa 1 PM para a reserva
         */
        removeFusionPoint(state, fusionId) {
            if (!state || typeof state !== 'object') {
                throw new Error("Estado inválido fornecido para removeFusionPoint.");
            }
            if (!fusionId || typeof fusionId !== 'string') {
                return { success: false, reason: "invalid_fusion_id", fusionId };
            }

            if (!state.fusionSkills) state.fusionSkills = {};
            const currentLevel = state.fusionSkills[fusionId] || 0;
            if (currentLevel <= 0) {
                return {
                    success: false,
                    reason: "level_zero",
                    fusionId,
                    newLevel: 0,
                    availablePM: state.availablePM
                };
            }

            state.fusionSkills[fusionId] = currentLevel - 1;
            state.availablePM = (typeof state.availablePM === 'number' ? state.availablePM : 0) + 1;

            return {
                success: true,
                fusionId,
                newLevel: state.fusionSkills[fusionId],
                availablePM: state.availablePM
            };
        },

        /**
         * Define a quantidade de PM disponíveis
         */
        setAvailablePM(state, points) {
            if (!state || typeof state !== 'object') throw new Error("Estado inválido.");
            const parsed = parseInt(points);
            state.availablePM = !isNaN(parsed) && parsed >= 0 ? parsed : 0;
            return state.availablePM;
        },

        /**
         * Normaliza qualquer nome de caminho (ex: "Magia (Fogo)", "fogo", "Água") para a chave canônica
         */
        normalizePathKey(nameOrKey) {
            if (!nameOrKey || typeof nameOrKey !== 'string') return null;
            const clean = nameOrKey
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
                .replace(/magia\s*\(/i, '')
                .replace(/\)/g, '')
                .trim();

            if (magicPaths[clean]) return clean;
            return null;
        },

        /**
         * Calcula o total de Poderes Mágicos (PM) gerados pelo atributo POD (+2d6 Daemon)
         * Fórmula oficial: cada ponto de POD concede 2 PMs para caminhos de magia.
         */
        calculatePMFromPOD(pod) {
            if (pod === null || pod === undefined) return 4; // Fallback padrão (POD 2 inicial = 4 PM)
            const parsed = parseInt(pod);
            if (isNaN(parsed) || parsed < 0) return 0;
            return parsed * 2;
        },

        /**
         * Extrai e calcula metadados mágicos de uma Ficha de Personagem (sheetData)
         */
        calculatePMFromSheet(sheetData) {
            if (!sheetData || typeof sheetData !== 'object') {
                throw new Error("sheetData inválido para cálculo de PM.");
            }

            const charName = (sheetData.charName || sheetData.name || 'Aventureiro Místico').trim();
            const rawPod = sheetData.pod !== undefined
                ? sheetData.pod
                : (sheetData.atributos && sheetData.atributos.pod !== undefined ? sheetData.atributos.pod : 2);

            const pod = parseInt(rawPod);
            const validPod = (!isNaN(pod) && pod >= 0) ? pod : 0;
            const totalPM = this.calculatePMFromPOD(validPod);

            // Importar caminhos já comprados na ficha se existirem
            const importedSkills = {};
            let pointsSpent = 0;

            const caminhosList = Array.isArray(sheetData.caminhosMagia)
                ? sheetData.caminhosMagia
                : (Array.isArray(sheetData.caminhos) ? sheetData.caminhos : []);

            caminhosList.forEach(c => {
                if (!c) return;
                const pathKey = this.normalizePathKey(c.nome || c.name || c.caminho);
                const nivel = parseInt(c.nivel || c.level || c.valor) || 0;
                if (pathKey && nivel > 0) {
                    importedSkills[pathKey] = (importedSkills[pathKey] || 0) + nivel;
                    pointsSpent += nivel;
                }
            });

            const availablePM = Math.max(0, totalPM - pointsSpent);

            return {
                charName,
                pod: validPod,
                totalPM,
                pointsSpent,
                availablePM,
                importedSkills
            };
        },

        /**
         * Sincroniza o estado da Árvore de Magia com os dados de uma Ficha de Personagem
         */
        syncWithSheet(state, sheetData) {
            if (!state || typeof state !== 'object') {
                throw new Error("Estado inválido para sincronização.");
            }

            const sheetInfo = this.calculatePMFromSheet(sheetData);

            // Atualiza o estado
            state.characterName = sheetInfo.charName;
            state.characterPOD = sheetInfo.pod;
            state.totalPM = sheetInfo.totalPM;
            state.availablePM = sheetInfo.availablePM;

            // Se a ficha trouxe caminhos, mescla ou substitui
            if (Object.keys(sheetInfo.importedSkills).length > 0) {
                Object.keys(magicPaths).forEach(k => {
                    state.skills[k] = sheetInfo.importedSkills[k] || 0;
                });
            }

            return {
                success: true,
                ...sheetInfo
            };
        },

        /**
         * Reseta todos os pontos investidos e reembolsa tudo para availablePM
         */
        resetPoints(state) {
            if (!state || typeof state !== 'object') throw new Error("Estado inválido.");
            let refunded = 0;
            if (state.skills) {
                Object.keys(state.skills).forEach(k => {
                    refunded += state.skills[k] || 0;
                    state.skills[k] = 0;
                });
            }
            if (state.fusionSkills) {
                Object.keys(state.fusionSkills).forEach(k => {
                    refunded += state.fusionSkills[k] || 0;
                    state.fusionSkills[k] = 0;
                });
            }
            state.availablePM = (state.availablePM || 0) + refunded;
            return {
                success: true,
                refundedPoints: refunded,
                availablePM: state.availablePM
            };
        },

        /**
         * Localiza chave de fusão independente da ordem dos caminhos
         */
        getFusionKey(p1, p2) {
            if (!p1 || !p2) return null;
            const pair1 = `${p1}+${p2}`;
            const pair2 = `${p2}+${p1}`;
            if (spellFusions[pair1]) return pair1;
            if (spellFusions[pair2]) return pair2;
            return null;
        },

        /**
         * Resolve a habilidade resultante da fusão de dois caminhos
         */
        getFusion(p1, p2, forma = 'Criar', skills = {}) {
            if (!p1 || !magicPaths[p1] || !p2 || !magicPaths[p2]) {
                return null;
            }

            const activeForma = magicForms[forma] ? forma : 'Criar';
            const formaInfo = magicForms[activeForma];
            const fusionKey = this.getFusionKey(p1, p2);

            const lvl1 = skills[p1] || 0;
            const lvl2 = skills[p2] || 0;
            const avgBonus = Math.floor((lvl1 + lvl2) / 2);

            let fusionEntry = null;
            if (fusionKey && spellFusions[fusionKey] && spellFusions[fusionKey][activeForma]) {
                const raw = spellFusions[fusionKey];
                fusionEntry = {
                    fusionKey,
                    categoryName: raw.name,
                    spell: raw[activeForma].spell,
                    desc: raw[activeForma].desc,
                    cd: raw[activeForma].cd,
                    pe: raw[activeForma].pe
                };
            } else {
                const name1 = magicPaths[p1].name.replace('Magia (', '').replace(')', '');
                const name2 = magicPaths[p2].name.replace('Magia (', '').replace(')', '');
                fusionEntry = {
                    fusionKey: `${p1}+${p2}`,
                    categoryName: `Fusão Síntese (${name1} & ${name2})`,
                    spell: `${activeForma} ${name1}-${name2}`,
                    desc: `Síntese arcana combinando as propriedades elementais de ${name1} e ${name2}. Causa 2d6+${avgBonus} de efeito híbrido.`,
                    cd: formaInfo.cdBase + 2,
                    pe: formaInfo.peCost + 1
                };
            }

            return {
                id: `fusion_${p1}_${p2}_${activeForma}`,
                path1: p1,
                path2: p2,
                path1Name: magicPaths[p1].name,
                path2Name: magicPaths[p2].name,
                forma: activeForma,
                spell: fusionEntry.spell,
                categoryName: fusionEntry.categoryName,
                desc: fusionEntry.desc,
                cd: fusionEntry.cd,
                pe: fusionEntry.pe,
                bonus: avgBonus
            };
        },

        /**
         * Adiciona uma habilidade aprendida (gerada ou customizada na fusão) ao Grimório do personagem
         */
        addLearnedAbility(state, ability) {
            if (!state || typeof state !== 'object') throw new Error("Estado inválido.");
            if (!Array.isArray(state.learnedAbilities)) state.learnedAbilities = [];

            if (!ability || typeof ability !== 'object') {
                return { success: false, reason: "invalid_ability" };
            }

            const spellName = (ability.spell || ability.name || '').trim();
            if (!spellName) {
                return { success: false, reason: "missing_name" };
            }

            const id = ability.id || `ability_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

            // Evitar duplicidade exata de ID
            const existingIndex = state.learnedAbilities.findIndex(a => a.id === id);
            const abilityRecord = {
                id,
                spell: spellName,
                categoryName: ability.categoryName || 'Fusão Arcana',
                path1: ability.path1 || null,
                path2: ability.path2 || null,
                path1Name: ability.path1Name || (ability.path1 && magicPaths[ability.path1] ? magicPaths[ability.path1].name : null),
                path2Name: ability.path2Name || (ability.path2 && magicPaths[ability.path2] ? magicPaths[ability.path2].name : null),
                forma: ability.forma || 'Criar',
                desc: ability.desc || 'Efeito místico combinado no sistema +2d6.',
                cd: parseInt(ability.cd) || 10,
                pe: parseInt(ability.pe) || 3,
                bonus: typeof ability.bonus === 'number' ? ability.bonus : 0,
                createdAt: ability.createdAt || new Date().toISOString()
            };

            if (existingIndex >= 0) {
                state.learnedAbilities[existingIndex] = abilityRecord;
            } else {
                state.learnedAbilities.push(abilityRecord);
            }

            return {
                success: true,
                ability: abilityRecord,
                totalAbilities: state.learnedAbilities.length
            };
        },

        /**
         * Remove uma habilidade aprendida do Grimório do personagem
         */
        removeLearnedAbility(state, abilityId) {
            if (!state || typeof state !== 'object' || !Array.isArray(state.learnedAbilities)) {
                return { success: false, reason: "invalid_state" };
            }

            const initialCount = state.learnedAbilities.length;
            state.learnedAbilities = state.learnedAbilities.filter(a => a.id !== abilityId);

            return {
                success: state.learnedAbilities.length < initialCount,
                removedId: abilityId,
                totalAbilities: state.learnedAbilities.length
            };
        },

        /**
         * Resolução matemática pura de teste +2d6
         */
        resolveRoll(d1, d2, bonus = 0, cd = 10) {
            const diceTotal = d1 + d2;
            const total = diceTotal + bonus;
            const isCritical = (diceTotal === 12);
            const isFumble = (diceTotal === 2);
            const isSuccess = isCritical ? true : (isFumble ? false : total >= cd);

            return {
                d1,
                d2,
                diceTotal,
                bonus,
                total,
                cd,
                isCritical,
                isFumble,
                isSuccess
            };
        }
    };

    // Exportação UMD para Node.js e Navegador
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            magicPaths,
            magicForms,
            spellFusions,
            MagicTreeEngine
        };
    } else {
        global.magicPaths = magicPaths;
        global.magicForms = magicForms;
        global.spellFusions = spellFusions;
        global.MagicTreeEngine = MagicTreeEngine;
    }

})(typeof window !== 'undefined' ? window : global);
