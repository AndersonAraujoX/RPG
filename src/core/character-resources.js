/**
 * Módulo de Gestão e Resolução de Recursos e PDFs de Personagem (+2D6)
 * Arquitetura Limpa, Desacoplada e Testável (SOLID / Injeção de Dependências).
 */

const OFFICIAL_PDFS = [
    {
        id: 'livreto',
        name: 'Livreto +2D6 (Medieval)',
        filename: 'medieval2d6-livreto.pdf',
        category: 'regras_basicas',
        minExpectedSize: 50000 // > 50KB
    },
    {
        id: 'sistema',
        name: 'Sistema Oficial +2D6',
        filename: 'Sistema.pdf',
        category: 'regras_completas',
        minExpectedSize: 50000
    },
    {
        id: 'vantagens',
        name: 'Lista de Vantagens',
        filename: 'Vantagens.pdf',
        category: 'customizacao',
        minExpectedSize: 50000
    },
    {
        id: 'desvantagens',
        name: 'Lista de Desvantagens',
        filename: 'desvantagens.pdf',
        category: 'customizacao',
        minExpectedSize: 50000
    }
];

class CharacterResourceManager {
    /**
     * @param {Object} options
     * @param {Object} [options.fsModule] Módulo de sistema de arquivos injetado (para testes)
     * @param {string} [options.baseDir] Diretório raiz do projeto
     */
    constructor(options = {}) {
        this.fs = options.fsModule || null;
        this.baseDir = options.baseDir || '';
        this.catalog = [...OFFICIAL_PDFS];
    }

    /**
     * Retorna a lista de PDFs oficiais cadastrados
     * @returns {Array<Object>}
     */
    getOfficialPdfs() {
        return this.catalog.map(pdf => ({ ...pdf }));
    }

    /**
     * Obtém metadata de um PDF específico por ID
     * @param {string} id 
     * @returns {Object|null}
     */
    getPdfById(id) {
        if (!id || typeof id !== 'string') {
            return null;
        }
        const normalizedId = id.trim().toLowerCase();
        return this.catalog.find(item => item.id.toLowerCase() === normalizedId) || null;
    }

    /**
     * Resolve o caminho relativo adequado de um PDF para diferentes contextos da aplicação
     * @param {string} pdfId 
     * @param {'forms'|'root'|'public'|'legado'} context 
     * @returns {string} Caminho relativo ou string vazia se inválido
     */
    resolveRelativePath(pdfId, context = 'forms') {
        const item = this.getPdfById(pdfId);
        if (!item) {
            return '';
        }

        switch (context) {
            case 'forms':
                // A partir de legado/Forms/
                return `../Arquivos/${item.filename}`;
            case 'root':
                // A partir da raiz (index.html)
                return `Arquivos/${item.filename}`;
            case 'public':
                // A partir de public/
                return `Arquivos/${item.filename}`;
            case 'legado':
                // A partir de legado/
                return `Arquivos/${item.filename}`;
            default:
                return `Arquivos/${item.filename}`;
        }
    }

    /**
     * Valida se uma URL/href de PDF é válida e segura
     * @param {string} href 
     * @returns {{ isValid: boolean, error?: string, isExternal: boolean }}
     */
    validatePdfHref(href) {
        if (!href || typeof href !== 'string' || href.trim().length === 0) {
            return { isValid: false, error: 'Href nulo ou vazio', isExternal: false };
        }

        const trimmed = href.trim();

        // Detectar URLs externas desatualizadas que geravam 404
        if (trimmed.includes('andersonaraujox.github.io/RPG/Arquivos/')) {
            return {
                isValid: false,
                error: 'URL externa desatualizada apontando para caminho quebrado (/RPG/Arquivos/)',
                isExternal: true
            };
        }

        // Deve terminar em .pdf
        if (!trimmed.toLowerCase().endsWith('.pdf')) {
            return { isValid: false, error: 'O link não aponta para um arquivo com extensão .pdf', isExternal: false };
        }

        const isExternal = trimmed.startsWith('http://') || trimmed.startsWith('https://');
        return { isValid: true, isExternal };
    }

    /**
     * Verifica a existência física e tamanho de um PDF usando o fs injetado
     * @param {string} filePath 
     * @returns {{ exists: boolean, size: number, isValidSize: boolean, error?: string }}
     */
    checkFileStatus(filePath) {
        if (!this.fs) {
            return { exists: false, size: 0, isValidSize: false, error: 'Módulo fs não fornecido' };
        }

        try {
            if (!this.fs.existsSync(filePath)) {
                return { exists: false, size: 0, isValidSize: false, error: 'Arquivo não encontrado' };
            }

            const stats = this.fs.statSync(filePath);
            const size = stats.size || 0;
            return {
                exists: true,
                size,
                isValidSize: size > 1024, // Maior que 1KB
                error: null
            };
        } catch (err) {
            return { exists: false, size: 0, isValidSize: false, error: err.message };
        }
    }
}

// Suporte para ambientes Node.js (CommonJS) e navegador
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CharacterResourceManager,
        OFFICIAL_PDFS
    };
}

if (typeof window !== 'undefined') {
    window.CharacterResourceManager = CharacterResourceManager;
    window.OFFICIAL_PDFS = OFFICIAL_PDFS;
}
