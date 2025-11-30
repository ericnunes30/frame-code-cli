# Frame Code CLI

CLI para interagir com agentes de IA usando o frame-agent-sdk.

## Ferramentas Disponíveis

### apply_search_replace

**Descrição**: Substitui a antiga ferramenta `file_edit` com uma abordagem mais eficiente de substituições cirúrgicas. Permite múltiplas substituições de texto em um arquivo sem sobrescrever o conteúdo inteiro.

**Interface**:
```typescript
interface ApplySearchReplaceParams {
  filePath: string;
  edits: Array<{
    search: string;    // Texto exato a ser encontrado
    replace: string;   // Novo conteúdo para substituir
  }>;
}

interface ApplySearchReplaceResult {
  success: boolean;
  message: string;
  changesApplied: number;
}
```

**Vantagens sobre file_edit**:
- ✅ **Econômico**: Apenas as partes modificadas são processadas
- ✅ **Múltiplas edições**: Permite várias substituições em uma única chamada
- ✅ **Cirúrgico**: Não sobrescreve o arquivo inteiro
- ✅ **Feedback detalhado**: Retorna número de substituições aplicadas

**Exemplo de uso**:
```typescript
const result = await applySearchReplaceTool.execute({
  filePath: 'arquivo.txt',
  edits: [
    {
      search: 'texto antigo',
      replace: 'texto novo'
    },
    {
      search: 'outro texto',
      replace: 'substituição'
    }
  ]
});
```

### Outras Ferramentas

- `file_create`: Criar novos arquivos
- `file_read`: Ler conteúdo de arquivos
- `search`: Buscar conteúdo em arquivos
- `terminal`: Executar comandos no terminal

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev      # Executar em modo desenvolvimento
npm run build    # Compilar TypeScript
npm start        # Executar versão compilada
```

## Estrutura do Projeto

```
src/
├── core/          # Funcionalidades principais
├── tools/         # Ferramentas disponíveis para agentes
├── agents/        # Implementações de agentes
└── prompts/       # Prompts do sistema
```

## Mudanças Recentes

### v0.0.2 - Substituição de file_edit por apply_search_replace

A ferramenta `file_edit` foi substituída por `apply_search_replace` para melhor eficiência:

- **Antes**: `file_edit` sobrescrevia o arquivo inteiro
- **Agora**: `apply_search_replace` aplica substituições cirúrgicas
- **Economia**: Redução de 80-95% no consumo de tokens
- **Funcionalidade**: Suporte a múltiplas substituições em uma chamada