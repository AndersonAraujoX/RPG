/**
 * @file nexo-state.js
 * @description Estado do Nexo do Paradoxo persistido no Cloud Firestore.
 * Documento: nexo/estado  ->  { comodos: { [idComodo]: boolean }, updatedAt, updatedBy }
 * - Lógica pura (catálogo, merge, validação) separada do acesso ao banco.
 * - NexoRepository recebe o `db` (Firestore) por injeção, facilitando testes com mocks.
 * @module NexoState
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.NexoState = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const COLLECTION = 'nexo';
    const DOCUMENT = 'estado';

    /** Catálogo base dos cômodos (estado inicial antes de ler o Firestore). */
    const COMODOS_PADRAO = [
        { id: 'forja', nome: 'Forja', disponivel: true, custo: 0, descricao: 'O coração pulsante do Nexo, onde o metal bruto é domado pelo fogo e pela vontade.', acoes: [
            { nome: 'Forjar Equipamento Padrão', desc: 'Crie armas e armaduras comuns.' },
            { nome: 'Reparar Itens', desc: 'Conserte equipamentos danificados.' },
            { nome: 'Forjar com Metais de Kuar-Tor', desc: 'Use minérios instáveis para criar equipamentos superiores.' },
            { nome: 'Imbuir com Ordem', desc: 'Adicione runas de Bella para bônus de precisão ou defesa.' },
            { nome: 'Imbuir com Caos', desc: 'Forje uma arma no fogo de Furiam para dano massivo com riscos.' }
        ] },
        { id: 'cozinha', nome: 'Cozinha', disponivel: true, custo: 0, descricao: 'Um caos organizado onde ingredientes exóticos se tornam refeições que fortalecem o corpo e a alma.', acoes: [
            { nome: 'Refeição Revigorante', desc: 'Recupere PV e remova penalidades menores.' },
            { nome: 'Aprender uma Receita', desc: 'Aprenda a preparar um prato com bônus temporário.' },
            { nome: 'Identificar Ingredientes', desc: 'Descubra as propriedades de um ingrediente exótico.' },
            { nome: 'Preparar Rações de Viagem', desc: 'Crie rações que protegem contra a corrupção do Vazio.' }
        ] },
        { id: 'biblioteca', nome: 'Biblioteca', disponivel: true, custo: 0, descricao: 'Um arquivo de conhecimento paradoxal, contendo tanto a sabedoria da Ordem quanto os segredos da loucura do Caos.', acoes: [
            { nome: 'Pesquisar um Tópico', desc: 'Estude sobre criaturas, lugares ou a história de Kuar-Tor.' },
            { nome: 'Decifrar um Tomo Caótico', desc: 'Tente ler um dos livros proibidos. Grande risco, grande recompensa.' },
            { nome: 'Pedir um Conselho a Rayluum', desc: 'Obtenha uma pista enigmática da bibliotecária cega.' },
            { nome: 'Copiar um Pergaminho', desc: 'Faça uma cópia de um feitiço ou ritual.' }
        ] },
        { id: 'nucleo', nome: 'O Núcleo', disponivel: true, custo: 0, descricao: 'O cérebro senciente do Nexo, uma fusão de lógica e impulso que guia os aventureiros.', acoes: [
            { nome: 'Relatório da Missão', desc: 'Receba um briefing detalhado sobre um objetivo.' },
            { nome: 'Analisar um Artefato', desc: 'Identifique a função de um item de origem desconhecida.' },
            { nome: 'Rodar uma Simulação de Combate', desc: 'Teste suas táticas contra um inimigo virtual.' },
            { nome: 'Conversar com as Personalidades', desc: 'Fale com "Bella" ou "Furiam" para obter diferentes perspectivas.' }
        ] },
        { id: 'laboratorio_magias', nome: 'Laboratório das Magias', disponivel: false, custo: 1000, descricao: 'Um salão de poder arcano onde a magia da Ordem pode ser estudada e a magia selvagem do Caos, observada.', acoes: [
            { nome: 'Aprender um Feitiço', desc: 'Estude os círculos de poder para aprender um novo feitiço da Ordem.' },
            { nome: 'Canalizar Magia Selvagem', desc: 'Medite perto da fenda de caos para aprender um feitiço caótico.' },
            { nome: 'Encantar um Item', desc: 'Imbua um item mundano com uma propriedade mágica simples.' }
        ] },
        { id: 'laboratorio_engenheiros', nome: 'Laboratórios dos Engenheiros', disponivel: false, custo: 1500, descricao: 'Bancadas repletas de protótipos instáveis, onde a tecnologia encontra o imprevisível.', acoes: [
            { nome: 'Criar Gadgets', desc: 'Construa granadas, sensores ou melhorias para armas.' },
            { nome: 'Construir um Autômato', desc: 'Inicie um projeto de longo prazo para um companheiro robótico.' },
            { nome: 'Melhorar um Autômato', desc: 'Instale novas peças ou software em um autômato.' },
            { nome: 'Hackear um Dispositivo', desc: 'Tente acessar um dispositivo tecnológico recuperado.' }
        ] },
        { id: 'laboratorio_alquimia', nome: 'Laboratório de Alquimia', disponivel: false, custo: 2000, descricao: 'Aqui, a ciência da transformação cria tanto venenos devastadores quanto curas milagrosas.', acoes: [
            { nome: 'Criar Poções e Venenos', desc: 'Fabrique elixires, poções de buff, ácidos ou toxinas.' },
            { nome: 'Experimentar com Ingredientes', desc: 'Misture ingredientes sem receita para resultados imprevisíveis.' },
            { nome: 'Aprender com Miranda', desc: 'Aprenda uma nova e rara receita com a mestre alquimista.' }
        ] },
        { id: 'minerio', nome: 'Minério', disponivel: false, custo: 2000, descricao: 'Uma câmara para processar as rochas instáveis de Kuar-Tor, transformando perigo bruto em material útil.', acoes: [
            { nome: 'Processar Minério Bruto', desc: 'Refine rochas instáveis para obter metais de alta qualidade.' },
            { nome: 'Procurar por Gemas Raras', desc: 'Examine os minérios em busca de cristais com propriedades especiais.' }
        ] },
        { id: 'estufa', nome: 'Estufa', disponivel: false, custo: 2000, descricao: 'Um jardim impossível onde a flora de Kuar-Tor é cultivada, um ecossistema em constante fluxo.', acoes: [
            { nome: 'Coletar Ingredientes', desc: 'Colha plantas com propriedades alquímicas ou culinárias.' },
            { nome: 'Estudar um Espécime', desc: 'Entenda o ciclo de vida de uma planta caótica para otimizar a colheita.' }
        ] },
        { id: 'enfermaria', nome: 'Enfermaria', disponivel: false, custo: 3000, descricao: 'Um santuário de paz e cura, onde as feridas do corpo e da alma, manchadas pelo Vazio, são tratadas.', acoes: [
            { nome: 'Curar Ferimentos Graves', desc: 'Trate feridas que poções comuns não podem curar.' },
            { nome: 'Tratar Corrupção do Vazio', desc: 'Realize um procedimento complexo para purificar a alma.' },
            { nome: 'Remover Maldições e Doenças', desc: 'Cure aflições mágicas com ciência e rituais.' }
        ] },
        { id: 'cacador', nome: 'Alojamento do Caçador', disponivel: false, custo: 3000, descricao: 'Um alojamento rústico decorado com troféus, o ponto de partida para enfrentar as feras de Kuar-Tor.', acoes: [
            { nome: 'Pegar um Contrato de Caça', desc: 'Aceite missões para caçar criaturas específicas.' },
            { nome: 'Estudar Bestiário', desc: 'Ganhe bônus de conhecimento sobre uma criatura.' },
            { nome: 'Preparar Armadilhas e Iscas', desc: 'Crie equipamentos para facilitar suas caçadas.' }
        ] },
        { id: 'laboratorio_anomalias', nome: 'Laboratório de Anomalias', disponivel: false, custo: 4000, descricao: 'Um espaço contido onde artefatos paradoxais e entidades instáveis do Vazio são estudados sob estrita observação.', acoes: [
            { nome: 'Analisar Artefato Paradoxal', desc: 'Tente entender a função de um item que desafia as leis da física.' },
            { nome: 'Conter Entidade Instável', desc: 'Realize um ritual para estabilizar ou banir uma criatura capturada do Vazio.' },
            { nome: 'Extrair Essência Anômala', desc: 'Destile a essência de um objeto anômalo para criar componentes únicos.' },
            { nome: 'Consultar Registros de Incursão', desc: 'Estude relatórios de expedições que deram terrivelmente errado para aprender com os erros.' }
        ] },
        { id: 'casa_paz_prazeres', nome: 'Casa da Paz/Prazeres', disponivel: false, custo: 5000, descricao: 'Um refúgio para a mente, onde a alma pode se recuperar ou se perder em prazeres controlados.', acoes: [
            { nome: 'Recuperação Mental', desc: 'Recupere-se de traumas e penalidades de Sanidade.' },
            { nome: 'Socializar e Obter Rumores', desc: 'Obtenha informações valiosas, missões e aliados.' },
            { nome: 'Participar de um Jogo de Azar', desc: 'Aposte seus Fragmentos em jogos de sorte e estratégia.' },
            { nome: 'Buscar um Prazer Específico', desc: 'Encomende uma experiência customizada com a Condessa Eveline.' }
        ] }
    ];

    /** Cria cópia profunda do catálogo padrão (evita mutação do original). */
    function criarComodosPadrao() {
        return COMODOS_PADRAO.map(c => ({
            ...c,
            acoes: c.acoes.map(a => ({ ...a }))
        }));
    }

    /**
     * Aplica o mapa remoto { id: boolean } sobre a lista de cômodos, sem mutar a entrada.
     * Ignora ids desconhecidos e valores não booleanos.
     */
    function mesclarEstado(comodos, mapaRemoto) {
        const lista = Array.isArray(comodos) ? comodos : [];
        const mapa = (mapaRemoto && typeof mapaRemoto === 'object') ? mapaRemoto : {};
        return lista.map(c => (typeof mapa[c.id] === 'boolean' ? { ...c, disponivel: mapa[c.id] } : { ...c }));
    }

    /** Valida o id de um cômodo contra o catálogo. */
    function comodoExiste(comodos, id) {
        return Array.isArray(comodos) && comodos.some(c => c.id === id);
    }

    /**
     * Repositório do estado do Nexo no Firestore (SDK v8/compat).
     * @param {Object} db - instância de firebase.firestore()
     * @param {Function} [now] - fornecedor de timestamp (injetável em testes)
     */
    function createNexoRepository(db, now) {
        if (!db || typeof db.collection !== 'function') {
            throw new Error('Instância do Firestore inválida');
        }
        const clock = typeof now === 'function' ? now : () => new Date().toISOString();
        const ref = () => db.collection(COLLECTION).doc(DOCUMENT);

        return {
            /**
             * Assina o estado em tempo real.
             * @param {Function} onChange - recebe (comodosMap, meta)
             * @param {Function} [onError]
             * @returns {Function} função para cancelar a assinatura
             */
            subscribe(onChange, onError) {
                return ref().onSnapshot(
                    snap => {
                        const data = snap && snap.exists ? snap.data() : null;
                        const comodosMap = (data && data.comodos) || {};
                        const meta = {
                            bloqueadoJogadores: Boolean(data && data.bloqueadoJogadores),
                            updatedAt: (data && data.updatedAt) || null,
                            updatedBy: (data && data.updatedBy) || null
                        };
                        onChange(comodosMap, meta);
                    },
                    err => { if (typeof onError === 'function') onError(err); }
                );
            },

            /** Grava a disponibilidade de um único cômodo (merge, não sobrescreve os demais). */
            async setComodo(id, disponivel, userId) {
                if (!id || typeof id !== 'string') throw new Error('ID de cômodo inválido');
                if (typeof disponivel !== 'boolean') throw new Error('Disponibilidade deve ser booleana');
                await ref().set({
                    comodos: { [id]: disponivel },
                    updatedAt: clock(),
                    updatedBy: userId || null
                }, { merge: true });
            },

            /** Grava o bloqueio geral de acesso para jogadores. */
            async setBloqueioJogadores(bloqueado, userId) {
                if (typeof bloqueado !== 'boolean') throw new Error('Bloqueio deve ser booleano');
                await ref().set({
                    bloqueadoJogadores: bloqueado,
                    updatedAt: clock(),
                    updatedBy: userId || null
                }, { merge: true });
            }
        };
    }

    return {
        COLLECTION,
        DOCUMENT,
        COMODOS_PADRAO,
        criarComodosPadrao,
        mesclarEstado,
        comodoExiste,
        createNexoRepository
    };
}));
