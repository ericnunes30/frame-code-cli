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
const comment = params.comment;

if (!owner || !repo || !issueNumber || !comment) {
  console.error('Erro: --owner, --repo, --issue-number e --comment são obrigatórios.');
  process.exit(1);
}

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!token) {
  console.error('Erro: GITHUB_PERSONAL_ACCESS_TOKEN não está definido no ambiente.');
  process.exit(1);
}

// MCP request para adicionar comentário
const mcpRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "add_issue_comment",
    arguments: {
      owner,
      repo,
      issue_number: parseInt(issueNumber),
      body: comment
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
    console.log('Comentário adicionado com sucesso!');
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