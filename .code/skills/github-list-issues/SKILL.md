---
name: github-issues-manager
keywords: [github, issues, repository, mcp, docker, triage, management, sdk]
description: Gerencia issues do GitHub: listar, ver detalhes, comentar, fechar e triagem via MCP Docker e SDK oficial.
---

# Skill: GitHub Issues Manager

Esta skill permite gerenciar completamente issues de repositórios GitHub usando o **GitHub MCP Server** oficial via Docker e o **@modelcontextprotocol/sdk**.

## Arquitetura

- **Cliente MCP:** Scripts TypeScript usando `@modelcontextprotocol/sdk`
- **Servidor MCP:** Container Docker `ghcr.io/github/github-mcp-server`
- **Comunicação:** Stdio (via `docker run -i`)

## Pré-requisitos

1. **Docker** instalado e rodando.
2. **Node.js** e depências instaladas (`npm install`).
3. **Token GitHub (PAT)** configurado no `.env`:
   ```env
   GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...
   ```

## Comandos Disponíveis

Todos os scripts estão localizados em `.code-skills/github-list-issues/`.

### 1. Listar Issues
Lista issues abertas ou fechadas com filtros opcionais.
```bash
npx ts-node .code-skills/github-list-issues/list-issues.ts --owner "usuario" --repo "repositorio" [--state "open|closed"] [--labels "bug,enhancement"] [--limit 10]
```

### 2. Ver Detalhes de Issue
Visualiza detalhes completos de uma issue específica.
```bash
npx ts-node .code-skills/github-list-issues/issue-details.ts --owner "usuario" --repo "repositorio" --issue-number 123
```

### 3. Adicionar Comentário
Adiciona um novo comentário a uma issue existente.
```bash
npx ts-node .code-skills/github-list-issues/issue-comment.ts --owner "usuario" --repo "repositorio" --issue-number 123 --comment "Seu comentário aqui"
```

### 4. Fechar Issue
Fecha uma issue com um motivo específico.
```bash
npx ts-node .code-skills/github-list-issues/issue-close.ts --owner "usuario" --repo "repositorio" --issue-number 123 [--reason "completed|not_planned|reopened"]
```

### 5. Aplicação de Labels
Aplica labels diretamente em issues específicas do GitHub.

```bash
npx ts-node .code-skills/github-list-issues/issue-labels.ts --owner "usuario" --repo "repositorio" --issue-number <number> --labels "label1,label2"
```

**Labels de Prioridade:** O repositório utiliza labels de prioridade de `p0` a `p3`, onde:
- `p0`: Extremamente urgente - requer atenção imediata
- `p1`: Alta prioridade - deve ser tratado em breve
- `p2`: Prioridade média - pode esperar um pouco
- `p3`: Baixa prioridade - pode ser tratado quando possível

## Como Funciona

Os scripts iniciam automaticamente um container Docker descartável (`--rm`) do servidor MCP para cada execução, garantindo isolamento e que o servidor esteja sempre atualizado.

```typescript
const transport = new StdioClientTransport({
  command: 'docker',
  args: [
    'run', '-i', '--rm', 
    '-e', `GITHUB_PERSONAL_ACCESS_TOKEN=${token}`,
    'ghcr.io/github/github-mcp-server', 
    'stdio'
  ]
});
```

## Configuração de Permissões GitHub

O token `GITHUB_PERSONAL_ACCESS_TOKEN` precisa das seguintes permissões:
- `repo` (Acesso total a repositórios privados/públicos)
- `read:org` (Para ler dados de organização, se aplicável)
- `read:user` (Para ler dados de usuário)

## Observação
Esta skill utiliza o **SDK oficial do MCP** (`@modelcontextprotocol/sdk`) para garantir compatibilidade e tipagem correta com o protocolo.