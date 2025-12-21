import { MCPBaseConfig } from 'frame-agent-sdk';

export const neo4jMcpConfig: MCPBaseConfig = {
  id: process.env.NEO4J_MCP_ID || 'neo4j-official',
  transport: 'stdio',
  command: 'docker',
  args: [
    'exec',
    '-i',
    'frame-neo4j-mcp-server',
    '/app/neo4j-mcp',
    '--neo4j-uri',
    'bolt://host.docker.internal:7687',
    '--neo4j-username',
    'neo4j',
    '--neo4j-password',
    'ucKrVdmX2nD1Q3RQ',
    '--neo4j-database',
    'neo4j',
    '--neo4j-read-only',
    'false',
    '--neo4j-telemetry',
    'false'
  ],
  namespace: process.env.NEO4J_MCP_NAMESPACE || 'neo4j',
  name: 'Neo4j MCP Server',
  version: '1.1.0',
  capabilities: {
    'docker-container': 'frame-neo4j-mcp-server',
    'graph-database': true,
    'cypher-queries': true,
    'schema-introspection': true,
    'gds-procedures': true
  }
};
