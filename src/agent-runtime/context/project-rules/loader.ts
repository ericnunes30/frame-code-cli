import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../../infrastructure/logging/logger';

export interface IProjectRules {
    content: string;
    source: 'code-dir' | 'root' | 'none';
    path: string;
}

export const loadProjectRules = {
    /**
     * Carrega o arquivo AGENTS.md do projeto atual
     * Prioridade: .code/AGENTS.md > AGENTS.md (raiz)
     *
     * @returns Regras do projeto ou null se não encontrado
     */
    load(): IProjectRules {
        const codeDirPath = path.join(process.cwd(), '.code', 'AGENTS.md');
        const rootPath = path.join(process.cwd(), 'AGENTS.md');

        // Tentar carregar de .code/AGENTS.md primeiro
        if (fs.existsSync(codeDirPath)) {
            const content = fs.readFileSync(codeDirPath, 'utf-8');
            logger.info(`[loadProjectRules] Carregado AGENTS.md de .code/: ${codeDirPath}`);
            return { content, source: 'code-dir', path: codeDirPath };
        }

        // Tentar carregar de AGENTS.md na raiz
        if (fs.existsSync(rootPath)) {
            const content = fs.readFileSync(rootPath, 'utf-8');
            logger.info(`[loadProjectRules] Carregado AGENTS.md da raiz: ${rootPath}`);
            return { content, source: 'root', path: rootPath };
        }

        logger.debug('[loadProjectRules] AGENTS.md não encontrado no projeto');
        return { content: '', source: 'none', path: '' };
    },

    /**
     * Carrega AGENTS.md de um diretório específico
     * Útil para verificar regras em subdiretórios
     *
     * @param directoryPath Caminho do diretório
     * @returns Conteúdo do AGENTS.md ou string vazia
     */
    loadFromDirectory(directoryPath: string): string {
        const agentsMdPath = path.join(directoryPath, 'AGENTS.md');
        const claudeMdPath = path.join(directoryPath, 'CLAUDE.md');

        // Tentar AGENTS.md primeiro
        if (fs.existsSync(agentsMdPath)) {
            const content = fs.readFileSync(agentsMdPath, 'utf-8');
            logger.debug(`[loadProjectRules] Carregado AGENTS.md de: ${agentsMdPath}`);
            return content;
        }

        // Tentar CLAUDE.md como fallback
        if (fs.existsSync(claudeMdPath)) {
            const content = fs.readFileSync(claudeMdPath, 'utf-8');
            logger.debug(`[loadProjectRules] Carregado CLAUDE.md de: ${claudeMdPath}`);
            return content;
        }

        return '';
    }
};
