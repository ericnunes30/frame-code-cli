/**
 * Interface para o registro de ferramentas (tools).
 *
 * Define o contrato para gerenciamento de tools,
 * permitindo diferentes implementações.
 */
export interface ITool {
    name: string;
    description: string;
    execute(params: any): Promise<any>;
}

export interface IToolRegistry {
    register(tool: ITool): void;
    unregister(name: string): void;
    get(name: string): ITool | undefined;
    listTools(): ITool[];
    has(name: string): boolean;
    count(): number;
    clear(): void;
}

export interface IToolFilter {
    shouldInclude(tool: ITool): boolean;
    filter(tools: ITool[]): ITool[];
}
