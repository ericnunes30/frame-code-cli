import type { ILogger } from '../../../infrastructure/logging/logger.interface';
import type { IConfig } from '../../../infrastructure/config/config.interface';
import type { IToolRegistry } from '../../../tools/registry/toolRegistry.interface';

/**
 * Dependências necessárias para criação de agentes.
 *
 * Permite injeção de dependências ao invés de import direto,
 * reduzindo acoplamento.
 */
export interface IAgentDependencies {
    logger: ILogger;
    config: IConfig;
    tools: IToolRegistry;
}
