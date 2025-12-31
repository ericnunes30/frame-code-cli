# Frame Code CLI

CLI para interagir com agentes de codificação criados com o [`@ericnunes/frame-agent-sdk`](https://www.npmjs.com/package/@ericnunes/frame-agent-sdk).

## Requisitos

- **Node.js** >= 18.0.0
- **npm** (ou yarn/pnpm)

## Instalação

```bash
npm install -g @ericnunes/frame-code-cli
```

## Configuração

Antes de usar o CLI, você precisa configurar as variáveis de ambiente. Crie um arquivo `.env` no diretório onde você vai executar o CLI:

```bash
# Copie o arquivo de exemplo
cp .env-example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# OpenAI API Key (obrigatório)
OPENAI_API_KEY=your_api_key_here

# Modelo a ser usado (opcional, padrão: gpt-4)
OPENAI_MODEL=gpt-4

# Outras configurações opcionais
```

## Comandos Disponíveis

### Help

```bash
frame-code --help
```

### Modo Interativo

Executa o agente em modo interativo, onde você pode conversar com o agente em tempo real.

```bash
frame-code interactive
```

### Modo Autônomo

Executa o agente em modo autônomo, onde ele trabalha de forma independente em uma tarefa.

```bash
frame-code autonomous
```

### Modo Multi-Agente

Executa múltiplos agentes trabalhando em colaboração.

```bash
frame-code multi-agent
```

### Gerenciar Memória

Gerencia a memória do agente (visualizar, limpar, etc.).

```bash
frame-code memory
```

## Agentes Disponíveis

O CLI inclui quatro tipos de agentes pré-configurados:

### Architect Agent
Responsável por planejar e arquitetar soluções de software.

### Builder Agent
Responsável por construir e implementar componentes.

### Code Agent
Responsável por escrever e modificar código.

### Supervisor Agent
Responsável por coordenar e supervisionar outros agentes.

## Funcionalidades

### Ferramentas Nativas

- **Operações de Arquivo**: Ler, criar e editar arquivos
- **Listagem de Diretórios**: Navegar pela estrutura do projeto
- **Leitura de Imagens**: Processar e analisar imagens
- **Geração de Outlines**: Criar estruturas de código

### Integração MCP (Model Context Protocol)

O CLI suporta integração com servidores MCP, permitindo estender as capacidades dos agentes com ferramentas externas.

### Regras do Projeto

O CLI carrega automaticamente regras do projeto a partir do arquivo `.code/rules.md`, permitindo que os agentes sigam convenções específicas do seu projeto.

### Sistema de Skills

Gerenciamento de habilidades personalizadas que podem ser carregadas e usadas pelos agentes.

### Telemetria e Logging

Infraestrutura completa de telemetria e logging para monitorar e debugar a execução dos agentes.

## Exemplos de Uso

### Exemplo 1: Modo Interativo

```bash
# Iniciar modo interativo
frame-code interactive

# O agente vai perguntar o que você precisa fazer
# Você pode descrever a tarefa em linguagem natural
```

### Exemplo 2: Modo Autônomo

```bash
# Executar tarefa autônoma
frame-code autonomous

# O agente vai trabalhar de forma independente
```

### Exemplo 3: Multi-Agente

```bash
# Executar colaboração entre agentes
frame-code multi-agent

# Múltiplos agentes vão trabalhar juntos
```

## Estrutura de Diretórios

O CLI espera a seguinte estrutura de diretórios no seu projeto:

```
.
├── .code/
│   └── rules.md          # Regras do projeto
├── .env                  # Variáveis de ambiente
└── src/                  # Código fonte do projeto
```

## Licença

Este software está sob licença proprietária. Veja o arquivo [`LICENSE`](LICENSE) para mais detalhes.

- **Permitido**: Uso interno, uso pessoal, modificações para uso interno
- **Não permitido**: Comercialização, redistribuição, uso em produtos comerciais

## Repositório

- **GitHub**: https://github.com/ericnunes/frame-code-cli
- **Issues**: https://github.com/ericnunes/frame-code-cli/issues

## Suporte

Para questões sobre o uso do CLI ou para relatar bugs, abra uma issue no repositório do GitHub.

## Changelog

Veja o arquivo [`CHANGELOG.md`](CHANGELOG.md) para informações sobre mudanças em cada versão.

## Desenvolvimento

Este CLI é construído sobre o [`@ericnunes/frame-agent-sdk`](https://www.npmjs.com/package/@ericnunes/frame-agent-sdk), que fornece a infraestrutura para criar e executar agentes de IA.

### Tecnologias

- TypeScript
- Node.js
- OpenAI API
- Model Context Protocol (MCP)

## Notas Importantes

- Este CLI requer uma chave de API da OpenAI (ou provedor compatível)
- Certifique-se de que o Node.js >= 18.0.0 está instalado
- O CLI cria arquivos temporários e logs durante a execução
- A memória do agente pode ser gerenciada através do comando `memory`
