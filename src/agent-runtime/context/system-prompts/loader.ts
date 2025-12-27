import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../../infrastructure/logging/logger';

/**
 * Carrega o system prompt de um arquivo
 */
export const loadSystemPrompt = {
    /**
     * Carrega o conteúdo bruto de um arquivo de prompt
     * @param filename Nome do arquivo na pasta prompts
     * @param compressionContext Contexto de compressão opcional para adicionar ao prompt
     */
    loadFileContent(filename: string, compressionContext?: string): string {
        try {
            // Tentar múltiplos caminhos possíveis
            const possiblePaths = [
                path.join(process.cwd(), 'src', 'prompts', filename),
                path.join(__dirname, '..', 'prompts', filename),
                path.join(__dirname, '..', '..', 'prompts', filename),
                path.join(process.cwd(), 'prompts', filename),
                path.join(__dirname, '..', '..', '..', 'prompts', filename),
            ];

            let content = '';
            let foundPath = '';

            for (const promptPath of possiblePaths) {
                if (fs.existsSync(promptPath)) {
                    content = fs.readFileSync(promptPath, 'utf-8');
                    foundPath = promptPath;
                    break;
                }
            }

            if (!content) {
                logger.warn(`[loadSystemPrompt] Arquivo não encontrado: ${filename}`);
                logger.debug(`[loadSystemPrompt] Caminhos tentados:`, possiblePaths);
                return '';
            }

            logger.debug(`[loadSystemPrompt] Carregado de: ${foundPath}`);

            // Adicionar contexto de compressão se fornecido
            if (compressionContext && compressionContext.trim().length > 0) {
                content += '\n\n---\n\n## Contexto de Compressão\n\n' + compressionContext;
            }

            return content;
        } catch (error) {
            logger.error(`[loadSystemPrompt] Erro ao carregar ${filename}:`, error);
            return '';
        }
    },

    /**
     * Lista todos os arquivos de prompt disponíveis
     */
    listPromptFiles(): string[] {
        try {
            const promptsDir = path.join(process.cwd(), 'src', 'prompts');
            if (!fs.existsSync(promptsDir)) {
                return [];
            }
            return fs.readdirSync(promptsDir).filter(f => f.endsWith('.md'));
        } catch (error) {
            logger.error('[loadSystemPrompt] Erro ao listar arquivos:', error);
            return [];
        }
    }
};
