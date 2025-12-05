#!/usr/bin/env ts-node
/// <reference types="node" />
import { spawnSync } from 'child_process';

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

// MCP request para fechar issue
const mcpRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "close_issue",
    arguments: {
      owner,
      repo,
      issue_number: parseInt(issueNumber),
      state_reason: reason
    }
  }
};

const dockerArgs = [
  'run',
  '-i',
  '--rm',
  '-e', `GITHUB_PERSONAL_ACCESS_TOKEN=${token}`,
  '-e', 'GITHUB_TOOLSETS=issues',
  'ghcr.io/github/github-mcp-server',
  'stdio'
];

const child = spawnSync('docker', dockerArgs, {
  input: JSON.stringify(mcpRequest),
  encoding: 'utf-8'
});

if (child.error) {
  console.error('Erro ao executar Docker:', child.error.message);
  process.exit(1);
}

if (child.status !== 0) {
  console.error('Erro na execução do MCP:', child.stderr);
  process.exit(child.status || 1);
}

try {
  const response = JSON.parse(child.stdout.trim());
  if (response.result) {
    console.log(`Issue #${issueNumber} fechada com sucesso! Motivo: ${reason}`);
    console.log(JSON.stringify(response.result, null, 2));
  } else if (response.error) {
    console.error('Erro do MCP:', response.error);
    process.exit(1);
  } else {
    console.log('Resposta inesperada:', response);
  }
} catch (e) {
  console.error('Erro ao parsear resposta:', e);
  console.log('Resposta bruta:', child.stdout);
}