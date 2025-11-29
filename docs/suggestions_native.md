# 🔧 Análise e Melhorias das Ferramentas Nativas - Code-CLI

## 📋 Inventário de Ferramentas Nativas Atuais

### Ferramentas Implementadas
1. **`file_read`** - Leitura de arquivos
2. **`file_create`** - Criação de arquivos
3. **`file_edit`** - Edição de arquivos ⚠️ **BÁSICA DEMAIS**
4. **`search`** - Busca por palavras-chave
5. **`terminal`** - Execução de comandos shell

---

## 🔴 FERRAMENTAS CRÍTICAS - Substituição Necessária

### 1. `file_edit` → **SUBSTITUIR por `apply_diff`** ⭐⭐⭐

**Status:** 🔴 **CRÍTICO - DEVE SER SUBSTITUÍDA URGENTEMENTE**

#### ❌ Problemas Graves da Implementação Atual

```typescript
// PROBLEMA: Substitui o arquivo INTEIRO
fs.writeFileSync(params.filePath, params.content);
```

**Por que é grave:**
- ✗ **Sobrescrita Total**: Para mudar 1 linha, precisa reescrever todo o arquivo
- ✗ **Alto Consumo de Tokens**: LLM precisa ter todo o arquivo no contexto
- ✗ **Risco de Perda de Dados**: Se o LLM truncar, perde conteúdo
- ✗ **Sem Auditoria**: Não gera diff rastreável
- ✗ **Sem Versionamento**: Impossível ver exatamente o que mudou
- ✗ **Performance Ruim**: Arquivos grandes = muito processamento

#### ✅ Solução Proposta: `apply_diff`

**Opção 1: Search & Replace (Mais Simples)**
```typescript
interface ApplyDiffParams extends IToolParams {
  filePath: string;
  searchBlock: string;    // Bloco exato a ser encontrado
  replaceBlock: string;   // Novo conteúdo
  matchIndex?: number;    // Qual ocorrência substituir (default: 0)
}

// Exemplo de uso:
{
  filePath: "src/index.ts",
  searchBlock: "const x = 1;\nconst y = 2;",
  replaceBlock: "const x = 10;\nconst y = 20;"
}
```

**Opção 2: Unified Diff Format (Mais Profissional)**
```typescript
interface ApplyUnifiedDiffParams extends IToolParams {
  filePath: string;
  diff: string;  // Formato unified diff padrão
}

// Exemplo de uso:
{
  filePath: "src/index.ts",
  diff: `@@ -10,3 +10,3 @@
-const x = 1;
-const y = 2;
+const x = 10;
+const y = 20;`
}
```

**Opção 3: Aider-Style Diff (Mais Inteligente)**
```typescript
interface ApplyAiderDiffParams extends IToolParams {
  filePath: string;
  instructions: string;  // Instruções em linguagem natural
  changes: Array<{
    lineStart: number;
    lineEnd: number;
    newContent: string;
  }>;
}
```

#### 🎯 Recomendação de Implementação

**Implementar as 3 opções como ferramentas separadas:**

1. **`apply_search_replace`** - Mais fácil para o LLM usar
2. **`apply_unified_diff`** - Mais padrão da indústria
3. **`apply_line_edits`** - Mais preciso por linha

**Benefícios:**
- ✅ Edições cirúrgicas e precisas
- ✅ Economiza 80-95% de tokens
- ✅ Diffs visíveis e auditáveis
- ✅ Menor risco de erro
- ✅ Compatível com Git
- ✅ Pode fazer múltiplas edições no mesmo arquivo

#### 📚 Referências de Implementação

- [Aider's Edit Formats](https://aider.chat/docs/unified-diffs.html)
- [Claude's apply_diff](https://docs.anthropic.com/en/docs/build-with-claude/tool-use#editing-code)
- [diff-match-patch Library](https://github.com/google/diff-match-patch)
- [unified Library](https://www.npmjs.com/package/unified)

#### 🚀 Plano de Migração

**Fase 1 - Implementação (Semana 1)**
- Criar `apply_search_replace` como ferramenta primária
- Criar `apply_unified_diff` como alternativa
- Testes completos de ambas

**Fase 2 - Transição (Semana 2)**
- Marcar `file_edit` como **@deprecated**
- Atualizar prompts do sistema para usar `apply_search_replace`
- Documentar exemplos de uso

**Fase 3 - Remoção (Semana 3-4)**
- Monitorar uso de `file_edit` (deveria ser zero)
- Remover `file_edit` completamente
- Atualizar documentação

---

## 🟡 FERRAMENTAS MÉDIAS - Melhorias Necessárias

### 2. `search` → **MELHORAR SIGNIFICATIVAMENTE** ⭐⭐

**Status:** 🟡 **FUNCIONA MAS É MUITO BÁSICA**

#### ❌ Problemas da Implementação Atual

```typescript
// PROBLEMA: Busca muito simplória
if (content.includes(params.query)) {
  // ...
}
```

**Limitações:**
- ✗ **Apenas String Literal**: Sem regex, sem padrões
- ✗ **Sem Relevância**: Resultados sem ordenação
- ✗ **Sem Contexto**: Mostra só a linha, sem entorno
- ✗ **Performance Ruim**: Lê todos os arquivos síncronamente
- ✗ **Sem Limites**: Pode retornar milhares de resultados
- ✗ **Sem Filtros Avançados**: Não pode filtrar por diretório, tamanho, etc.

#### ✅ Melhorias Propostas

**Opção 1: Melhorar a Ferramenta Atual (Rápido)**
```typescript
interface ImprovedSearchParams extends IToolParams {
  query: string;
  useRegex?: boolean;           // NOVO: Suporte a regex
  fileType?: string;
  filePattern?: string;         // NOVO: Glob pattern
  excludePatterns?: string[];   // NOVO: Excluir padrões
  maxResults?: number;          // NOVO: Limitar resultados (default: 50)
  contextLines?: number;        // NOVO: Linhas de contexto (default: 2)
  caseSensitive?: boolean;      // NOVO: Case sensitive
  directory?: string;           // NOVO: Buscar em diretório específico
}

// Resultado com mais informações
interface SearchResult {
  file: string;
  lineNumber: number;
  match: string;
  context: {
    before: string[];
    after: string[];
  };
  relevanceScore?: number;
}
```

**Opção 2: Integração com Ripgrep (Profissional)**
```typescript
interface RipgrepSearchParams extends IToolParams {
  query: string;
  regex?: boolean;
  ignoreCase?: boolean;
  maxResults?: number;
  contextLines?: number;
  fileTypes?: string[];
}

// Usar ripgrep internamente
import { execSync } from 'child_process';
const result = execSync(`rg "${query}" --json`);
```

**Opção 3: Múltiplas Ferramentas de Busca**
- `search_text` - Busca por texto (atual melhorado)
- `search_regex` - Busca por regex
- `search_ast` - Busca por sintaxe (ast-grep)
- `search_semantic` - Busca semântica (embeddings)

#### 🎯 Recomendação

**Curto Prazo:** Melhorar ferramenta atual com regex + contexto + limites
**Médio Prazo:** Integrar ripgrep ou ast-grep
**Longo Prazo:** Adicionar busca semântica com embeddings

---

### 3. `terminal` → **ADICIONAR FEATURES IMPORTANTES** ⭐⭐

**Status:** 🟡 **FUNCIONA MAS LIMITADO**

#### ❌ Problemas da Implementação Atual

```typescript
// PROBLEMA: Execução isolada, sem sessão
const { stdout, stderr } = await execPromise(params.command);
```

**Limitações:**
- ✗ **Sem Sessão Persistente**: `cd /dir` não persiste no próximo comando
- ✗ **Sem Interatividade**: Não pode responder prompts
- ✗ **Sem Timeout Configurável**: Pode travar indefinidamente
- ✗ **Sem Streaming**: Output só aparece no final
- ✗ **Sem Cancelamento**: Não pode parar comandos longos
- ✗ **Sem Variáveis de Ambiente**: Cada comando tem env limpo

#### ✅ Melhorias Propostas

**Opção 1: Terminal com Sessão (Recomendado)**
```typescript
interface PersistentTerminalParams extends IToolParams {
  sessionId?: string;        // NOVO: ID para reutilizar sessão
  command: string;
  workingDir?: string;       // NOVO: Diretório de trabalho
  timeout?: number;          // NOVO: Timeout em ms (default: 30000)
  env?: Record<string, string>; // NOVO: Variáveis adicionais
  streamOutput?: boolean;    // NOVO: Streaming (futuro)
}

// Implementação com sessões persistentes
class TerminalSessionManager {
  private sessions = new Map<string, ChildProcess>();
  
  getSession(id: string): ChildProcess {
    if (!this.sessions.has(id)) {
      this.sessions.set(id, spawn('bash'));
    }
    return this.sessions.get(id)!;
  }
}
```

**Opção 2: Ferramentas Separadas**
```typescript
// terminal_execute - Comando único (atual)
// terminal_session_start - Inicia sessão persistente
// terminal_session_execute - Executa em sessão
// terminal_session_stop - Encerra sessão
```

**Opção 3: Usar MCP Shell Server**
```typescript
// Delegar para um MCP server especializado
// Vantagens: Mantido pela comunidade, mais features
import { ShellMCP } from '@modelcontextprotocol/shell-mcp';
```

#### 🎯 Recomendação

**Curto Prazo:** Adicionar timeout configurável + workingDir
**Médio Prazo:** Implementar sessões persistentes
**Longo Prazo:** Avaliar MCP Shell Server

---

## 🟢 FERRAMENTAS OK - Pequenas Melhorias

### 4. `file_read` → **ADICIONAR PAGINAÇÃO** ⭐

**Status:** 🟢 **FUNCIONA BEM, MELHORIAS OPCIONAIS**

#### Melhorias Sugeridas

```typescript
interface ImprovedFileReadParams extends IToolParams {
  filePath: string;
  startLine?: number;        // NOVO: Linha inicial (1-indexed)
  endLine?: number;          // NOVO: Linha final (inclusive)
  maxLines?: number;         // NOVO: Máximo de linhas (default: 1000)
  encoding?: string;         // NOVO: Encoding (default: 'utf-8')
  includeLineNumbers?: boolean; // NOVO: Incluir números de linha
}

// Exemplo de uso:
{
  filePath: "src/large-file.ts",
  startLine: 100,
  endLine: 200,
  includeLineNumbers: true
}
```

**Benefícios:**
- ✅ Ler apenas parte de arquivos grandes
- ✅ Economiza tokens
- ✅ Melhor para navegação de código

**Prioridade:** 🟢 Baixa (nice to have)

---

### 5. `file_create` → **MELHORIAS MENORES** 

**Status:** 🟢 **FUNCIONA MUITO BEM**

#### Melhorias Sugeridas (Opcionais)

```typescript
interface ImprovedFileCreateParams extends IToolParams {
  filePath: string;
  content: string;
  overwrite?: boolean;       // NOVO: Permitir sobrescrita (default: false)
  createBackup?: boolean;    // NOVO: Criar backup se existir
  validateSyntax?: boolean;  // NOVO: Validar sintaxe antes de criar
  template?: string;         // NOVO: Usar template predefinido
}
```

**Benefícios:**
- ✅ Mais seguro (não sobrescreve acidentalmente)
- ✅ Backup automático
- ✅ Validação de sintaxe

**Prioridade:** 🟢 Muito Baixa (opcional)

---

## 🆕 NOVAS FERRAMENTAS NATIVAS RECOMENDADAS

### 6. `file_outline` - Estrutura de Arquivo ⭐⭐⭐

**Status:** 🆕 **NOVA FERRAMENTA - ALTA PRIORIDADE**

#### Por que é Importante?

Permite ao LLM entender a estrutura de um arquivo sem ler todo o conteúdo.

#### Implementação Proposta

```typescript
interface FileOutlineParams extends IToolParams {
  filePath: string;
  includeImports?: boolean;
  includeTypes?: boolean;
  includeComments?: boolean;
}

interface FileOutlineResult {
  filePath: string;
  language: string;
  outline: OutlineItem[];
}

interface OutlineItem {
  type: 'function' | 'class' | 'interface' | 'const' | 'import' | 'export';
  name: string;
  lineStart: number;
  lineEnd: number;
  signature?: string;
  docstring?: string;
  children?: OutlineItem[];
}
```

#### Exemplo de Resultado

```json
{
  "filePath": "src/tools/file-edit.ts",
  "language": "typescript",
  "outline": [
    {
      "type": "import",
      "name": "frame-agent-sdk",
      "lineStart": 1,
      "lineEnd": 1
    },
    {
      "type": "interface",
      "name": "FileEditParams",
      "lineStart": 20,
      "lineEnd": 23,
      "signature": "interface FileEditParams extends IToolParams"
    },
    {
      "type": "class",
      "name": "fileEditTool",
      "lineStart": 32,
      "lineEnd": 58,
      "children": [
        {
          "type": "function",
          "name": "execute",
          "lineStart": 37,
          "lineEnd": 57,
          "signature": "async execute(params: FileEditParams): Promise<{...}>"
        }
      ]
    }
  ]
}
```

#### Bibliotecas para Implementação

- **TypeScript/JavaScript:** `@typescript-eslint/parser` + AST traversal
- **Python:** `ast` module
- **Multi-linguagem:** `tree-sitter` (robusta, mas complexa)

**Prioridade:** ⭐⭐⭐ Alta

---

### 7. `grep_advanced` - Busca com Ripgrep ⭐⭐

**Status:** 🆕 **NOVA FERRAMENTA - MÉDIA PRIORIDADE**

#### Por que é Importante?

Busca profissional e ultrarrápida, muito superior ao `search` atual.

#### Implementação Proposta

```typescript
interface GrepAdvancedParams extends IToolParams {
  query: string;
  regex?: boolean;
  ignoreCase?: boolean;
  fileTypes?: string[];        // Ex: ['ts', 'js']
  excludeDirs?: string[];      // Ex: ['node_modules', 'dist']
  maxResults?: number;
  contextLines?: number;
  includeHidden?: boolean;
}

// Usar ripgrep via child_process
import { execSync } from 'child_process';

function executeRipgrep(params: GrepAdvancedParams): SearchResult[] {
  const args = [
    params.query,
    '--json',
    params.ignoreCase ? '-i' : '',
    params.contextLines ? `-C ${params.contextLines}` : '',
    // ...
  ].filter(Boolean);
  
  const output = execSync(`rg ${args.join(' ')}`);
  return parseRipgrepJson(output);
}
```

**Prioridade:** ⭐⭐ Média

---

### 8. `file_list_directory` - Listar Estrutura ⭐⭐

**Status:** 🆕 **NOVA FERRAMENTA - MÉDIA PRIORIDADE**

#### Por que é Importante?

Permite ao LLM explorar a estrutura de diretórios sem executar comandos shell.

#### Implementação Proposta

```typescript
interface ListDirectoryParams extends IToolParams {
  path?: string;              // Default: '.'
  maxDepth?: number;          // Default: 2
  includeHidden?: boolean;    // Default: false
  excludePatterns?: string[]; // Default: ['node_modules', '.git']
  includeFileSize?: boolean;  // Default: true
  includeModified?: boolean;  // Default: false
}

interface DirectoryItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  children?: DirectoryItem[];
}
```

**Prioridade:** ⭐⭐ Média

---

### 9. `code_format` - Formatação de Código ⭐

**Status:** 🆕 **NOVA FERRAMENTA - BAIXA PRIORIDADE**

#### Por que é Útil?

LLM pode formatar código automaticamente antes de criar/editar arquivos.

#### Implementação Proposta

```typescript
interface CodeFormatParams extends IToolParams {
  filePath?: string;          // Formatar arquivo existente
  code?: string;              // Ou formatar código inline
  language?: string;          // Auto-detectar se não fornecido
  formatter?: 'prettier' | 'eslint' | 'auto'; // Default: 'auto'
}

// Usar prettier programaticamente
import prettier from 'prettier';

async function formatCode(params: CodeFormatParams): Promise<string> {
  const options = await prettier.resolveConfig(params.filePath);
  return prettier.format(params.code, options);
}
```

**Prioridade:** ⭐ Baixa

---

### 10. `code_validate` - Validação de Sintaxe ⭐

**Status:** 🆕 **NOVA FERRAMENTA - BAIXA PRIORIDADE**

#### Por que é Útil?

Previne criação de arquivos com erros de sintaxe.

#### Implementação Proposta

```typescript
interface CodeValidateParams extends IToolParams {
  code: string;
  language: string;
  filePath?: string;  // Para context
}

interface ValidationResult {
  valid: boolean;
  errors: Array<{
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

// Usar parsers específicos
function validateTypeScript(code: string): ValidationResult {
  try {
    ts.createSourceFile('temp.ts', code, ts.ScriptTarget.Latest, true);
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: parseError(error) };
  }
}
```

**Prioridade:** ⭐ Baixa (nice to have)

---

## 📊 Resumo de Prioridades

### 🔥 Crítico - Implementar AGORA
1. **`apply_search_replace`** / **`apply_diff`** - Substituir `file_edit`

### ⚡ Alto - Próximas 2-4 Semanas
2. **`file_outline`** - Navegação eficiente de código
3. **Melhorar `search`** - Regex, contexto, limites

### 💡 Médio - Próximas 4-8 Semanas
4. **`persistent_terminal`** - Sessões persistentes
5. **`grep_advanced`** - Busca profissional
6. **`file_list_directory`** - Exploração de estrutura

### 💎 Baixo - Quando Tiver Tempo
7. **Melhorar `file_read`** - Paginação
8. **`code_format`** - Formatação automática
9. **`code_validate`** - Validação de sintaxe

---

## 🎯 Plano de Ação Recomendado

### Semana 1-2: Crítico
- [ ] Implementar `apply_search_replace` (versão simples)
- [ ] Implementar `apply_unified_diff` (versão avançada)
- [ ] Criar testes completos para ambas
- [ ] Deprecar `file_edit` com aviso de deprecação
- [ ] Atualizar prompts do sistema

### Semana 3-4: Alto
- [ ] Implementar `file_outline` usando @typescript-eslint/parser
- [ ] Melhorar `search` com regex + contexto + limites
- [ ] Testar em casos reais
- [ ] Documentar exemplos de uso

### Semana 5-8: Médio
- [ ] Implementar sessões persistentes no `terminal`
- [ ] Adicionar `grep_advanced` com ripgrep
- [ ] Adicionar `file_list_directory`
- [ ] Revisar e otimizar performance

### Futuro: Baixo
- [ ] Paginação no `file_read`
- [ ] `code_format` e `code_validate`
- [ ] Busca semântica com embeddings

---

## 🏗️ Princípios de Design (Seguindo SOLID)

### Open/Closed Principle
```typescript
// ✅ Bom: Ferramentas extensíveis sem modificar código existente
abstract class BaseEditTool extends ToolBase {
  abstract applyEdit(file: string, edit: Edit): string;
}

class SearchReplaceEditTool extends BaseEditTool { }
class UnifiedDiffEditTool extends BaseEditTool { }
class LineEditTool extends BaseEditTool { }
```

### Strategy Pattern
```typescript
// ✅ Diferentes estratégias de edição
interface EditStrategy {
  apply(file: string, params: any): string;
}

class SearchReplaceStrategy implements EditStrategy { }
class DiffStrategy implements EditStrategy { }
```

### Factory Pattern
```typescript
// ✅ Criar ferramentas sem IFs
class ToolFactory {
  createEditTool(type: EditType): IEditTool {
    return this.registry.get(type);
  }
}
```

---

## 📚 Referências Técnicas

### Diff & Patch
- [diff-match-patch](https://github.com/google/diff-match-patch) - Algoritmos de diff
- [fast-diff](https://www.npmjs.com/package/fast-diff) - Diff otimizado
- [json-diff](https://www.npmjs.com/package/json-diff) - Diff para JSON

### Busca
- [ripgrep](https://github.com/BurntSushi/ripgrep) - Busca ultrarrápida
- [ast-grep](https://ast-grep.github.io/) - Busca por AST
- [fzf](https://github.com/junegunn/fzf) - Fuzzy search

### AST & Parsing
- [@typescript-eslint/parser](https://www.npmjs.com/package/@typescript-eslint/parser)
- [tree-sitter](https://tree-sitter.github.io/)
- [@babel/parser](https://babeljs.io/docs/en/babel-parser)

### Code Analysis
- [prettier](https://prettier.io/)
- [eslint](https://eslint.org/)
- [typescript](https://www.typescriptlang.org/)

---

## ✅ Checklist de Implementação

Para cada nova ferramenta:

- [ ] Interface de parâmetros bem definida
- [ ] Classe com no máximo 50 linhas
- [ ] Testes unitários (>80% coverage)
- [ ] Documentação com exemplos
- [ ] Error handling robusto
- [ ] Logs estruturados
- [ ] Validação de parâmetros
- [ ] Performance otimizada
- [ ] Segue princípios SOLID
- [ ] Usa design patterns apropriados

---

**Última atualização:** 2025-11-28  
**Autor:** Análise Automática do Code-CLI  
**Status:** 📋 Documento de Planejamento
