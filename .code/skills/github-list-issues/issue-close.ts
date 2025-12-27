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
const reason = params.reason || 'completed';

if (!owner || !repo || !issueNumber) {
  console.error('Erro: --owner, --repo e --issue-number são obrigatórios.');
  console.error('Uso: npx ts-node issue-close.ts --owner <owner> --repo <repo> --issue-number <num> [--reason completed]');
  process.exit(1);
}

const validReasons = ['completed', 'not_planned', 'reopened'];
if (!validReasons.includes(reason)) {
  console.error('Erro: --reason deve ser um dos:', validReasons.join(', '));
  process.exit(1);
}

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!token) {
  console.error('Erro: GITHUB_PERSONAL_ACCESS_TOKEN não está definido no ambiente.');
  process.exit(1);
}

async function main() {
  console.log(`🔒 Fechando issue #${issueNumber} (motivo: ${reason})...`);

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
    await client.connect(transport);

    const result = await client.callTool({
      name: "issue_write",
      arguments: {
        method: 'update',
        owner,
        repo,
        issue_number: parseInt(issueNumber),
        state: 'closed',
        state_reason: reason
      }
    });

    console.log('✅ Issue fechada com sucesso!');

    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text') {
          console.log(item.text);
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
