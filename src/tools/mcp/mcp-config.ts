import { MCPBaseConfig } from 'frame-agent-sdk';

export const mcpConfig: MCPBaseConfig = {
  id: process.env.MCP_ID || 'context7',
  transport: 'stdio',
  command: 'docker',
  args: ['exec', '-i', `${process.env.MCP_CONTAINER || 'context7-mcp'}`, process.env.MCP_COMMAND || 'context7-mcp'],
  namespace: process.env.MCP_NAMESPACE || 'context7',
  name: 'MCP Server',
  version: '1.0.0',
  capabilities: {
    'docker-container': process.env.MCP_CONTAINER || 'context7-mcp'
  }
};