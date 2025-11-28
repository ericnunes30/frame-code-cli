import { MCPBaseConfig } from 'frame-agent-sdk';

export const chromeMcpConfig: MCPBaseConfig = {
  id: process.env.CHROME_MCP_ID || 'chrome-devtools',
  transport: 'stdio',
  command: 'docker',
  args: ['exec', '-i', `${process.env.CHROME_MCP_CONTAINER || 'chrome-devtools-mcp-server'}`, 'chrome-devtools-mcp', '--browserUrl', 'http://127.0.0.1:9222'],
  namespace: process.env.CHROME_MCP_NAMESPACE || 'chrome',
  name: 'Chrome DevTools MCP Server',
  version: '1.0.0',
  capabilities: {
    'docker-container': process.env.CHROME_MCP_CONTAINER || 'chrome-devtools-mcp-server',
    'chrome-debug-port': 9222,
    'mcp-server-port': 8000,
    'browser-automation': true,
    'devtools-protocol': true
  }
};