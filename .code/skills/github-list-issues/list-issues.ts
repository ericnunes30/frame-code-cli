#!/usr/bin/env ts-node
/// <reference types="node" />
/**
 * Script para listar issues de um repositório GitHub via MCP SDK
 * Usa o container Docker github-mcp-server que deve estar rodando
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { loadConfigSync } from '../../src/core/services/config';

// Carregar variáveis de ambiente usando o config do projeto
loadConfigSync();

// Simple CLI args parser
function parseArgs() {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};
  let key = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      key = args[i].replace(/^--/, '');
      result[key] = '';
    } else if (key) {
      result[key] = args[i];
      key = '';
    }
  }
  return result;
}

const params = parseArgs();
const owner = params.owner;
const repo = params.repo;
const state = params.state || 'open';
const labels = params.labels || '';
const limit = params.limit || '10';

if (!owner || !repo) {
  console.error('Erro: --owner e --repo são obrigatórios.');
  console.error('Uso: npx ts-node list-issues.ts --owner <owner> --repo <repo> [--state open|closed] [--limit 10]');
  process.exit(1);
}

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!token) {
  console.error('Erro: GITHUB_PERSONAL_ACCESS_TOKEN não está definido no ambiente.');
  process.exit(1);
}

async function main() {
  console.log(`🔍 Listando issues de ${owner}/${repo}...`);

  // Criar cliente MCP
  const client = new Client({
    name: 'github-issues-cli',
    version: '1.0.0'
  });

  // Criar transporte stdio conectando ao container Docker
  const transport = new StdioClientTransport({
    command: 'docker',
    args: [
      'run', '-i', '--rm',
      '-e', `GITHUB_PERSONAL_ACCESS_TOKEN=${token}`,
      'ghcr.io/github/github-mcp-server',
      'stdio'
    ]
  });

  try {
    // Conectar ao servidor MCP
    console.log('📡 Conectando ao GitHub MCP Server...');
    await client.connect(transport);
    console.log('✅ Conectado!');

    // Preparar argumentos
    const toolArgs: Record<string, unknown> = {
      owner,
      repo,
      state: state.toUpperCase(),
      perPage: parseInt(limit)
    };

    if (labels) {
      toolArgs.labels = labels.split(',').map((l: string) => l.trim());
    }

    // Chamar a ferramenta list_issues
    console.log('📋 Buscando issues...\n');
    const result = await client.callTool({
      name: 'list_issues',
      arguments: toolArgs
    });

    // Processar resultado
    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text') {
          console.log(item.text);
        }
      }
    } else {
      console.log('Resultado:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    // Fechar conexão
    await client.close();
  }
}

main();
