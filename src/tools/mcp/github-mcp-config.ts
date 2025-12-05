export const githubMcpConfig = {
  id: process.env.GITHUB_MCP_ID || 'github-official',
  transport: 'stdio',
  command: 'docker',
  args: [
    'run',
    '-i',
    '--rm',
    '-e', `GITHUB_PERSONAL_ACCESS_TOKEN=${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
    'ghcr.io/github/github-mcp-server'
  ],
  namespace: process.env.GITHUB_MCP_NAMESPACE || 'github',
  name: 'GitHub MCP',
  version: '0.1.0',
  capabilities: {
    'docker-container': 'github-mcp-server'
  }
};
