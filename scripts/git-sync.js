/**
 * Git Auto-Sync Helper — Kuar-Tor RPG
 *
 * Módulo de automação para validação de testes, geração de commit semântico
 * e push seguro para o GitHub.
 *
 * Implementado sob arquitetura desacoplada (SOLID) e testável via injeção de dependências.
 */

const { execSync } = require('child_process');

const GitAutoSync = {
    /**
     * Formata uma mensagem de commit semântico (Conventional Commits).
     * @param {string} type - feat, fix, refactor, test, docs, chore, etc.
     * @param {string} scope - Módulo ou funcionalidade afetada (ex: inventory, vtt, sheet)
     * @param {string} description - Descrição clara e concisa da alteração
     * @returns {string} Mensagem formatada
     */
    formatCommitMessage(type = 'chore', scope = '', description = '') {
        const cleanType = String(type || 'chore').toLowerCase().trim();
        const cleanScope = String(scope || '').toLowerCase().trim();
        const cleanDesc = String(description || '').trim();

        if (!cleanDesc) {
            throw new Error('A descrição do commit é obrigatória.');
        }

        if (cleanScope) {
            return `${cleanType}(${cleanScope}): ${cleanDesc}`;
        }
        return `${cleanType}: ${cleanDesc}`;
    },

    /**
     * Detecta o tipo semântico do commit com base na lista de arquivos alterados.
     * @param {Array<string>} changedFiles
     * @returns {{ type: string, scope: string }}
     */
    detectCommitContext(changedFiles = []) {
        if (!Array.isArray(changedFiles) || changedFiles.length === 0) {
            return { type: 'chore', scope: 'project' };
        }

        const filesStr = changedFiles.join(' ').toLowerCase();

        let type = 'feat';
        let scope = 'general';

        if (filesStr.includes('test') && !filesStr.includes('src/') && !filesStr.includes('public/')) {
            type = 'test';
            scope = 'tests';
        } else if (filesStr.includes('fix') || filesStr.includes('bug')) {
            type = 'fix';
        } else if (filesStr.includes('refactor')) {
            type = 'refactor';
        } else if (filesStr.endsWith('.md')) {
            type = 'docs';
            scope = 'documentation';
        }

        if (filesStr.includes('inventory') || filesStr.includes('items')) {
            scope = 'inventory';
        } else if (filesStr.includes('vtt') || filesStr.includes('mesa_virtual')) {
            scope = 'vtt';
        } else if (filesStr.includes('formv6') || filesStr.includes('sheet')) {
            scope = 'sheet';
        } else if (filesStr.includes('magic') || filesStr.includes('arvore_magia')) {
            scope = 'magic-tree';
        } else if (filesStr.includes('skill') || filesStr.includes('.agents')) {
            scope = 'agent-skills';
        }

        return { type, scope };
    },

    /**
     * Obtém o status do repositório Git.
     * @param {Function} [customExec] - Função para execução de comandos (Injeção de dependência)
     * @returns {{ hasChanges: boolean, files: Array<string>, rawStatus: string }}
     */
    getStatus(customExec = execSync) {
        try {
            const raw = customExec('git status --porcelain', { encoding: 'utf-8' }) || '';
            const lines = raw.split('\n').filter(l => l.trim().length > 0);
            const files = lines.map(l => l.slice(3).trim());
            return {
                hasChanges: files.length > 0,
                files,
                rawStatus: raw.trim()
            };
        } catch (error) {
            return {
                hasChanges: false,
                files: [],
                rawStatus: '',
                error: error.message
            };
        }
    },

    /**
     * Obtém o nome da branch atual.
     * @param {Function} [customExec]
     * @returns {string} Nome da branch (ex: 'main')
     */
    getCurrentBranch(customExec = execSync) {
        try {
            const branch = customExec('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }) || 'main';
            return branch.trim();
        } catch (e) {
            return 'main';
        }
    },

    /**
     * Executa a verificação prévia de testes unitários (Quality Gate).
     * @param {string} [command='npm test']
     * @param {Function} [customExec]
     * @returns {{ success: boolean, output: string }}
     */
    runQualityGate(command = 'npm test', customExec = execSync) {
        try {
            const output = customExec(command, { encoding: 'utf-8', stdio: 'pipe' }) || '';
            return { success: true, output };
        } catch (error) {
            return {
                success: false,
                output: (error.stdout ? error.stdout.toString() : '') + (error.stderr ? error.stderr.toString() : '') || error.message
            };
        }
    },

    /**
     * Executa o fluxo completo de sincronização segura (Stage -> Commit -> Push).
     * @param {Object} options
     * @param {string} [options.message] - Mensagem personalizada de commit
     * @param {string} [options.type] - Tipo semântico (feat, fix, etc.)
     * @param {string} [options.scope] - Escopo semântico
     * @param {string} [options.remote='origin'] - Nome do remote Git
     * @param {boolean} [options.skipTests=false] - Pula execução de testes (não recomendado)
     * @param {boolean} [options.dryRun=false] - Modo de simulação sem efeitos colaterais
     * @param {Function} [customExec]
     * @returns {{ success: boolean, message: string, branch: string, log: string }}
     */
    sync(options = {}, customExec = execSync) {
        const {
            message,
            type,
            scope,
            remote = 'origin',
            skipTests = false,
            dryRun = false
        } = options;

        // 1. Verifica se há alterações para sincronizar
        const status = this.getStatus(customExec);
        if (!status.hasChanges) {
            return {
                success: true,
                message: 'Nenhuma alteração pendente para sincronização.',
                branch: this.getCurrentBranch(customExec),
                log: 'Working tree clean. Nada a enviar.'
            };
        }

        // 2. Executa testes obrigatórios (Quality Gate)
        if (!skipTests) {
            const gate = this.runQualityGate('npm test', customExec);
            if (!gate.success) {
                throw new Error('Falha no Quality Gate: Os testes unitários não passaram. Commit e push cancelados para proteger o repositório.');
            }
        }

        // 3. Define a mensagem de commit
        let commitMsg = message;
        if (!commitMsg) {
            const context = this.detectCommitContext(status.files);
            const finalType = type || context.type;
            const finalScope = scope || context.scope;
            const desc = `atualiza ${status.files.length} arquivo(s) no projeto`;
            commitMsg = this.formatCommitMessage(finalType, finalScope, desc);
        }

        const branch = this.getCurrentBranch(customExec);

        if (dryRun) {
            return {
                success: true,
                message: commitMsg,
                branch,
                log: `[DRY RUN] Simulação concluída com sucesso. Seriam enviados ${status.files.length} arquivo(s) para ${remote}/${branch}.`
            };
        }

        // 4. Staging
        customExec('git add .', { encoding: 'utf-8' });

        // 5. Commit
        // Escapa aspas duplas na mensagem para segurança na CLI
        const escapedMsg = commitMsg.replace(/"/g, '\\"');
        customExec(`git commit -m "${escapedMsg}"`, { encoding: 'utf-8' });

        // 6. Push
        customExec(`git push ${remote} ${branch}`, { encoding: 'utf-8' });

        return {
            success: true,
            message: commitMsg,
            branch,
            log: `Sincronização concluída com sucesso! Alterações enviadas para ${remote}/${branch}.`
        };
    }
};

// Execução direta pela linha de comando
if (require.main === module) {
    const args = process.argv.slice(2);
    const msg = args.join(' ').trim() || undefined;

    console.log('🔄 Iniciando Git Auto-Sync (+2d6)...');
    try {
        const result = GitAutoSync.sync({ message: msg });
        console.log(`✅ ${result.log}`);
        console.log(`📝 Commit: "${result.message}" -> Branch: ${result.branch}`);
    } catch (err) {
        console.error(`❌ Erro no Git Auto-Sync: ${err.message}`);
        process.exit(1);
    }
}

module.exports = GitAutoSync;
