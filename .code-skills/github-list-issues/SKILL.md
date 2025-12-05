---
name: github-issues-manager
keywords: [github, issues, repository, mcp, docker, triage, management]
description: Gerencia issues do GitHub: listar, ver detalhes, comentar, fechar e triagem via MCP Docker.
---

# Skill: GitHub Issues Manager

Esta skill permite gerenciar completamente issues de repositórios GitHub usando MCP oficial via Docker.

## Comandos Disponíveis

### 1. Listar Issues
```bash
npx ts-node list-issues.ts --owner "usuario" --repo "repositorio" [--state "open|closed|all"] [--labels "bug,enhancement"] [--limit 10]
```

### 2. Ver Detalhes de Issue Específica
```bash
npx ts-node issue-details.ts --owner "usuario" --repo "repositorio" --issue-number 123
```

### 3. Adicionar Comentário
```bash
npx ts-node issue-comment.ts --owner "usuario" --repo "repositorio" --issue-number 123 --comment "Seu comentário aqui"
```

### 4. Fechar Issue
```bash
npx ts-node issue-close.ts --owner "usuario" --repo "repositorio" --issue-number 123 --reason "completed"|"not_planned"|"reopened"
```

### 5. Triagem Automática (em desenvolvimento)
```bash
npx ts-node issue-triage.ts --owner "usuario" --repo "repositorio" [--auto-label] [--assign "username"]
```

## Parâmetros Comuns
- `--owner` (obrigatório): usuário ou organização do GitHub
- `--repo` (obrigatório): nome do repositório
- `--issue-number`: número da issue para operações específicas
- `--state`: estado das issues (open, closed, all)
- `--labels`: lista de labels separadas por vírgula
- `--limit`: máximo de issues retornadas

## Configuração de Permissões

### Para Triagem e Operações Avançadas:

1. **Token GitHub com Permissões Adequadas:**
   - Vá para Settings > Developer settings > Personal access tokens > Tokens (classic)
   - Crie novo token com os seguintes scopes:
     - `repo` (acesso completo a repositórios)
     - `issues:write` (para criar/editar/fechar issues)
     - `public_repo` (para repositórios públicos)

2. **Permissões no Repositório:**
   - **Colaborador/Maintainer**: Para operações completas
   - **Triager Role** (GitHub Teams): Para triagem sem acesso de escrita ao código
   - Configure em Settings > Collaborators & teams > Teams

3. **Configuração de Labels para Triagem:**
   ```bash
   # Labels recomendados para triagem:
   - "triage-needed"
   - "bug" / "enhancement" / "question"
   - "priority-high" / "priority-medium" / "priority-low"
   - "needs-clarification"
   - "ready-for-work"
   ```

## Exemplos de Uso

### Listar bugs abertos:
```bash
npx ts-node list-issues.ts --owner "ericnunes30" --repo "frame-code-cli" --labels "bug" --state "open"
```

### Adicionar comentário e fechar:
```bash
npx ts-node issue-comment.ts --owner "ericnunes30" --repo "frame-code-cli" --issue-number 42 --comment "Issue resolvida na PR #45"
npx ts-node issue-close.ts --owner "ericnunes30" --repo "frame-code-cli" --issue-number 42 --reason "completed"
```

## Requisitos
- Docker instalado
- Token GitHub com permissões adequadas em `GITHUB_PERSONAL_ACCESS_TOKEN`
- Permissões no repositório (colaborador/maintainer/triager)

## Observação
Esta skill é totalmente independente e não depende do projeto principal ou SDK.