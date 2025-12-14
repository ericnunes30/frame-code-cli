import { ToolBase, IToolParams } from 'frame-agent-sdk';
import { SKILL_REGISTRY } from '../generated/skillRegistry';
import * as fs from 'fs';
import { logger } from '../core/services/logger';

// --- Tool: List Skills ---

interface IListSkillsParams extends IToolParams {
    query?: string;
}

class ListSkillsSchema {
    static schemaProperties = {
        query: { type: 'string', required: false, description: 'Termo de busca (nome ou keyword)' }
    } as const;
}

interface IListSkillsResult {
    success: boolean;
    skills: Array<{ name: string; description: string; keywords: string[] }>;
    message?: string;
}

export const listSkillsTool = new class extends ToolBase<IListSkillsParams, IListSkillsResult> {
    public readonly name = 'list_skills';
    public readonly description = 'Lista as skills disponíveis no sistema. Use para descobrir novas capacidades.';
    public readonly parameterSchema = ListSkillsSchema;

    public async execute(params: IListSkillsParams): Promise<IListSkillsResult> {
        const query = params.query?.toLowerCase();
        let matches = Object.values(SKILL_REGISTRY);

        if (query) {
            matches = matches.filter(skill =>
                skill.name.toLowerCase().includes(query) ||
                skill.keywords.some(k => k.toLowerCase().includes(query)) ||
                skill.description.toLowerCase().includes(query)
            );
        }

        // Retornar apenas metadados, não o path
        const result = matches.map(s => ({
            name: s.name,
            description: s.description,
            keywords: s.keywords
        }));

        logger.info(`[ListSkills] Encontradas ${result.length} skills para query "${query || '*'}"`);

        return {
            success: true,
            skills: result,
            message: result.length > 0
                ? `Encontradas ${result.length} skills. Use enable_skill para ver detalhes e comandos.`
                : 'Nenhuma skill encontrada.'
        };
    }
};

// --- Tool: Enable Skill ---

interface IEnableSkillParams extends IToolParams {
    skillName: string;
}

class EnableSkillSchema {
    static schemaProperties = {
        skillName: { type: 'string', required: true, description: 'Nome exato da skill (obtido via list_skills)' }
    } as const;
}

interface IEnableSkillResult {
    success: boolean;
    content?: string;
    message?: string;
}

export const enableSkillTool = new class extends ToolBase<IEnableSkillParams, IEnableSkillResult> {
    public readonly name = 'enable_skill';
    public readonly description = 'Habilita e lê os detalhes de uma skill específica (instruções e comandos).';
    public readonly parameterSchema = EnableSkillSchema;

    public async execute(params: IEnableSkillParams): Promise<IEnableSkillResult> {
        const skillName = params.skillName;
        const skillEntry = SKILL_REGISTRY[skillName];

        if (!skillEntry) {
            return {
                success: false,
                message: `Skill "${skillName}" não encontrada. Use list_skills para ver as opções disponíveis.`
            };
        }

        try {
            const content = fs.readFileSync(skillEntry.path, 'utf-8');
            logger.info(`[EnableSkill] Skill "${skillName}" lida com sucesso de ${skillEntry.path}`);

            return {
                success: true,
                content: content,
                message: `Skill "${skillName}" carregada. Leia as instruções acima atentamente.`
            };
        } catch (error: any) {
            logger.error(`[EnableSkill] Erro ao ler arquivo da skill ${skillEntry.path}:`, error);
            return {
                success: false,
                message: `Erro ao carregar skill: ${error.message}`
            };
        }
    }
};
