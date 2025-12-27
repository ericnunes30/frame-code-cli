#!/usr/bin/env ts-node
/// <reference types="node" />
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { loadConfigSync } from '../../src/core/services/config';

loadConfigSync();

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
const issueNumber = params['issue-number'];
const labels = params.labels;

if (!owner || !repo || !issueNumber || !labels) {
  console.error('Erro: --owner, --repo, --issue-number e --labels são obrigatórios.');
  console.error('Uso: npx ts-node issue-labels.ts --owner <owner> --repo <repo> --issue-number <number> --labels "label1,label2"');
  process.exit(1);
}

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!token) {
  console.error('Erro: GITHUB_PERSONAL_ACCESS_TOKEN não está definido no ambiente.');
  process.exit(1);
}

async function main() {
  const client = new Client({
    name: "github-issues-cli",
    version: "1.0.0"
  });

  const transport = new StdioClientTransport({
    command: 'docker',
    args: [
      'run', '-i', '--rm',
      '-e', `GITHUB_PERSONAL_ACCESS_TOKEN=${token}`,
      '-e', 'GITHUB_TOOLSETS=issues',
      'ghcr.io/github/github-mcp-server',
      'stdio'
    ]
  });

  try {
    console.log('📡 Conectando ao GitHub MCP Server...');
    await client.connect(transport);
    console.log('✅ Conectado!');

    // Parsear labels
    const labelArray = labels.split(',').map(label => label.trim()).filter(label => label.length > 0);
    
    if (labelArray.length === 0) {
      console.error('Erro: Nenhuma label válida fornecida.');
      process.exit(1);
    }

    console.log(`🏷️  Aplicando labels [${labelArray.join(', ')}] à Issue #${issueNumber}...`);
    
    // Aplicar labels à issue
    const result = await client.callTool({
      name: "issue_write",
      arguments: {
        method: 'update',
        owner,
        repo,
        issue_number: parseInt(issueNumber),
        labels: labelArray
      }
    });

    console.log('✅ Labels aplicados com sucesso!');
    
    // Retornar resultado em formato JSON
    console.log('\n📊 RESULTADO JSON:');
    console.log(JSON.stringify({
      issue: parseInt(issueNumber),
      labelsApplied: labelArray,
      status: 'success'
    }, null, 2));

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    try {
      await client.close();
    } catch (e) {
      // Ignora erro ao fechar se já estiver fechado
    }
  }
}

main();
