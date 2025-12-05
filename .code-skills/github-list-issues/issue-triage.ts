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
const autoLabel = params['auto-label'] === 'true';
const assignTo = params.assign;

if (!owner || !repo) {
  console.error('Erro: --owner e --repo são obrigatórios.');
  process.exit(1);
}

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!token) {
  console.error('Erro: GITHUB_PERSONAL_ACCESS_TOKEN não está definido no ambiente.');
  process.exit(1);
}

// Função para executar comando MCP
function executeMCPRequest(toolName: string, args: any) {
  const mcpRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args
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

  if (child.error || child.status !== 0) {
    console.error('Erro ao executar MCP:', child.error || child.stderr);
    return null;
  }

  try {
    const response = JSON.parse(child.stdout.trim());
    return response.result || null;
  } catch {
    return null;
  }
}

// 1. Listar issues sem triagem
console.log('🔍 Buscando issues para triagem...');
const issues = executeMCPRequest('search_issues', {
  owner,
  repo,
  state: 'open',
  labels: 'triage-needed'
});

if (!issues || !issues.issues || issues.issues.length === 0) {
  console.log('✅ Nenhuma issue pendente de triagem encontrada.');
  process.exit(0);
}

console.log(`📋 Encontradas ${issues.issues.length} issues para triagem:\n`);

// 2. Processar cada issue
for (const issue of issues.issues) {
  console.log(`\n🔍 Processando Issue #${issue.number}: ${issue.title}`);
  
  // Análise simples baseada em palavras-chave
  const title = issue.title.toLowerCase();
  const body = issue.body?.toLowerCase() || '';
  const content = `${title} ${body}`;
  
  let suggestedLabels = [];
  let suggestedAssignee = null;
  
  // Detecção de tipo
  if (content.includes('bug') || content.includes('erro') || content.includes('não funciona')) {
    suggestedLabels.push('bug');
  } else if (content.includes('feature') || content.includes('nova funcionalidade') || content.includes('adicionar')) {
    suggestedLabels.push('enhancement');
  } else if (content.includes('dúvida') || content.includes('como') || content.includes('?')) {
    suggestedLabels.push('question');
  }
  
  // Detecção de prioridade
  if (content.includes('urgente') || content.includes('crítico') || content.includes('bloqueia')) {
    suggestedLabels.push('priority-high');
  } else if (content.includes('importante') || content.includes('prioridade')) {
    suggestedLabels.push('priority-medium');
  } else {
    suggestedLabels.push('priority-low');
  }
  
  // Detecção de complexidade
  if (content.includes('simples') || content.includes('rápido') || content.includes('fácil')) {
    suggestedLabels.push('good-first-issue');
  }
  
  console.log(`  📌 Labels sugeridos: ${suggestedLabels.join(', ')}`);
  
  // Aplicar labels se auto-label estiver ativo
  if (autoLabel && suggestedLabels.length > 0) {
    console.log(`  🏷️  Aplicando labels automaticamente...`);
    const updateResult = executeMCPRequest('issue_update', {
      owner,
      repo,
      issue_number: issue.number,
      labels: suggestedLabels
    });
    
    if (updateResult) {
      console.log(`  ✅ Labels aplicados com sucesso!`);
    } else {
      console.log(`  ❌ Falha ao aplicar labels`);
    }
  }
  
  // Atribuir se especificado
  if (assignTo) {
    console.log(`  👤 Atribuindo para ${assignTo}...`);
    const assignResult = executeMCPRequest('issue_update', {
      owner,
      repo,
      issue_number: issue.number,
      assignees: [assignTo]
    });
    
    if (assignResult) {
      console.log(`  ✅ Issue atribuída com sucesso!`);
    } else {
      console.log(`  ❌ Falha ao atribuir issue`);
    }
  }
  
  // Adicionar comentário de triagem
  const triageComment = `🤖 **Triagem Automática**

**Análise:**
- Tipo: ${suggestedLabels.includes('bug') ? '🐛 Bug' : suggestedLabels.includes('enhancement') ? '✨ Enhancement' : '❓ Question'}
- Prioridade: ${suggestedLabels.includes('priority-high') ? '🔴 Alta' : suggestedLabels.includes('priority-medium') ? '🟡 Média' : '🟢 Baixa'}
${suggestedLabels.includes('good-first-issue') ? '- 🌟 Boa para iniciantes' : ''}

**Próximos passos:**
- [ ] Verificar reprodução do problema
- [ ] Definir escopo da solução
- [ ] Planejar implementação

---
*Triagem realizada via GitHub Issues Manager Skill*`;

  const commentResult = executeMCPRequest('add_issue_comment', {
    owner,
    repo,
    issue_number: issue.number,
    body: triageComment
  });
  
  if (commentResult) {
    console.log(`  💬 Comentário de triagem adicionado!`);
  } else {
    console.log(`  ❌ Falha ao adicionar comentário`);
  }
}

console.log('\n🎉 Triagem concluída!');