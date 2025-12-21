import { MCPBaseConfig } from 'frame-agent-sdk';

export const qdrantMcpConfig: MCPBaseConfig = {
  id: process.env.QDRANT_MCP_ID || 'qdrant-official',
  transport: 'stdio',
  command: 'docker',
  args: [
    'exec',
    '-i',
    'frame-qdrant-mcp-server',
    'uvx',
    'mcp-server-qdrant',
    '--transport',
    'stdio'
  ],
  namespace: process.env.QDRANT_MCP_NAMESPACE || 'qdrant',
  name: 'Qdrant MCP Server',
  version: '0.8.1',
  capabilities: {
    'docker-container': 'frame-qdrant-mcp-server',
    'vector-search': true,
    'semantic-memory': true,
    'embedding-provider': 'fastembed'
  }
};
