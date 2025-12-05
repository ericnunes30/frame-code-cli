#!/usr/bin/env ts-node
/// <reference types="node" />
/**
 * Script autossuficiente para listar issues de um repositório GitHub via MCP Docker
 * Independente do projeto principal e SDK
 */
import { spawnSync } from 'child_process';


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
  process.exit(1);
}

// Monta comando Docker MCP no modo stdio
const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!token) {
  console.error('Erro: GITHUB_PERSONAL_ACCESS_TOKEN não está definido no ambiente.');
  process.exit(1);
}

// Cria um script MCP JSON-RPC para buscar issues
const mcpRequest: any = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "search_issues",
    arguments: {
      owner: owner,
      repo: repo,
      state: state,
      limit: parseInt(limit)
    }
  }
};

if (labels) {
  mcpRequest.params.arguments.labels = labels.split(',').map((l: string) => l.trim());
}

const dockerArgs = [
  'run',
  '-i',
  '--rm',
  '-e', `GITHUB_PERSONAL_ACCESS_TOKEN=${token}`,
  'ghcr.io/github/github-mcp-server',
  'stdio',
  '--toolsets=issues'
];

const { spawn } = require('child_process');
const docker = spawn('docker', dockerArgs);
let output = '';
let errorOutput = '';

docker.stdout.on('data', (data: any) => {
  output += data.toString();
});

docker.stderr.on('data', (data: any) => {
  errorOutput += data.toString();
});

docker.on('close', (code: number) => {
  if (code !== 0) {
    console.error('Erro na execução do MCP:', errorOutput);
    process.exit(code || 1);
  }

  // Envia requisição MCP
  docker.stdin.write(JSON.stringify(mcpRequest) + '\n');

  // Aguarda resposta e processa
  setTimeout(() => {
    try {
      const lines = output.trim().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          const response = JSON.parse(line);
          if (response.result) {
            console.log(JSON.stringify(response.result, null, 2));
            process.exit(0);
          }
        }
      }
      console.log('Nenhuma issue encontrada ou resposta inválida.');
      process.exit(0);
    } catch (e) {
      console.error('Erro ao processar resposta:', e);
      console.log('Saída bruta:', output);
      process.exit(1);
    }
  }, 2000);
});
