import { ToolBase, IToolParams } from '@ericnunes/frame-agent-sdk';
import { SkillLoader } from '../../infrastructure/skills';
import { McpLoader } from '../mcp';
import { discoverMcpTools, IMcpToolInfo } from '../mcp';
import * as fs from 'fs';
import { logger } from '../../infrastructure/logging/logger';

// --- Tool: List Capabilities ---

interface IListCapabilitiesParams extends IToolParams {
    query?: string;
}

class ListCapabilitiesSchema {
    static schemaProperties = {
        query: { type: 'string', required: false, description: 'Termo de busca (nome ou description)' }
    } as const;
}

interface IListCapabilitiesResult {
    success: boolean;
    capabilities: Array<{
        name: string;
        description: string;
        type: 'skill' | 'mcp';
        keywords?: string[];
        namespace?: string;
        registered?: boolean;  // Para MCPs: se está registrado automaticamente
    }>;
    message?: string;
}

export const listCapabilitiesTool = new class extends ToolBase<IListCapabilitiesParams, IListCapabilitiesResult> {
    public readonly name = 'list_capabilities';
    public readonly description = 'Lista Skills e MCPs disponíveis no sistema. Use para descobrir novas capacidades.';
    public readonly parameterSchema = ListCapabilitiesSchema;

    public async execute(params: IListCapabilitiesParams): Promise<IListCapabilitiesResult> {
        const query = params.query?.toLowerCase();

        // Carregar Skills
        const skillLoader = new SkillLoader();
        const skills = skillLoader.loadAllSkills().map(s => ({
            name: s.name,
            description: s.description,
            type: 'skill' as const,
            keywords: s.keywords
        }));

        // Carregar MCPs (apenas visíveis na lista)
        const mcpLoader = new McpLoader();
        const mcpConfigs = mcpLoader.loadVisibleMcpConfigs().map(m => ({
            name: m.id,
            description: m.name,
            type: 'mcp' as const,
            namespace: m.namespace,
            registered: m.registered
        }));

        // Combinar Skills e MCPs
        const all = [...skills, ...mcpConfigs];

        // Filtrar por query se fornecida
        const matches = query
            ? all.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.description.toLowerCase().includes(query)
            )
            : all;

        logger.info(`[ListCapabilities] Encontradas ${matches.length} capabilities para query "${query || '*'}"`);

        return {
            success: true,
            capabilities: matches,
            message: matches.length > 0
                ? `Encontradas ${matches.length} capabilities. Use enable_capability para ver detalhes.`
                : 'Nenhuma capability encontrada.'
        };
    }
};

// --- Tool: Enable Capability ---

interface IEnableCapabilityParams extends IToolParams {
    capabilityName: string;
}

class EnableCapabilitySchema {
    static schemaProperties = {
        capabilityName: { type: 'string', required: true, description: 'Nome exato da capability (obtido via list_capabilities)' }
    } as const;
}

interface IEnableCapabilityResult {
    success: boolean;
    type: 'skill' | 'mcp';
    content?: string;           // para Skills (SKILL.md)
    mcpName?: string;           // para MCPs
    registered?: boolean;       // Para MCPs: se está registrado automaticamente
    tools?: IMcpToolInfo[];     // para MCPs
    message?: string;
}

export const enableCapabilityTool = new class extends ToolBase<IEnableCapabilityParams, IEnableCapabilityResult> {
    public readonly name = 'enable_capability';
    public readonly description = 'Habilita uma Skill ou MCP. Para Skills, lê instruções. Para MCPs, lista ferramentas disponíveis.';
    public readonly parameterSchema = EnableCapabilitySchema;

    public async execute(params: IEnableCapabilityParams): Promise<IEnableCapabilityResult> {
        const name = params.capabilityName;

        // Tentar como Skill primeiro
        const skillLoader = new SkillLoader();
        const skill = skillLoader.loadAllSkills().find(s => s.name === name);
        if (skill) {
            try {
                const content = fs.readFileSync(skill.path, 'utf-8');
                logger.info(`[EnableCapability] Skill "${name}" lida com sucesso de ${skill.path}`);

                return {
                    success: true,
                    type: 'skill',
                    content: content,
                    message: `Skill "${name}" carregada. Leia as instruções acima atentamente.`
                };
            } catch (error: any) {
                logger.error(`[EnableCapability] Erro ao ler Skill ${skill.path}:`, error);
                return {
                    success: false,
                    type: 'skill',
                    message: `Erro ao carregar skill: ${error.message}`
                };
            }
        }

        // Tentar como MCP
        const mcpLoader = new McpLoader();
        const mcpConfig = mcpLoader.getMcpById(name);
        if (mcpConfig && mcpConfig.visible) {
            try {
                const tools = await discoverMcpTools(mcpConfig.config);
                logger.info(`[EnableCapability] MCP "${mcpConfig.name}" descoberto com ${tools.length} ferramentas`);

                return {
                    success: true,
                    type: 'mcp',
                    mcpName: mcpConfig.name,
                    registered: mcpConfig.registered,
                    tools,
                    message: mcpConfig.registered
                        ? `MCP "${mcpConfig.name}" está registrado e possui ${tools.length} ferramentas disponíveis.`
                        : `MCP "${mcpConfig.name}" possui ${tools.length} ferramentas disponíveis. Use-as conforme necessário.`
                };
            } catch (error: any) {
                logger.error(`[EnableCapability] Erro ao descobrir ferramentas do MCP ${mcpConfig.name}:`, error);
                return {
                    success: false,
                    type: 'mcp',
                    message: `Erro ao descobrir ferramentas do MCP: ${error.message}`
                };
            }
        }

        return {
            success: false,
            message: `Capability "${name}" não encontrada. Use list_capabilities para ver as opções disponíveis.`,
            type: 'skill' as const  // Type padrão para erros
        };
    }
};
