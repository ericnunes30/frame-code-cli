# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.18] - 2025-10-06

### Adicionado
- Atualização para compatibilidade com a nova arquitetura do `@ericnunes/frame_agent` v1.2.6
- Nova implementação da classe `HybridAgent` adaptada para a nova estrutura do LLM
- Suporte a múltiplos provedores de LLM (OpenAI, Anthropic, OpenAI-Compatible)
- Melhorias na detecção automática de necessidade de ferramentas

### Alterado
- Substituição do `OpenAIAdapter` pelo novo sistema de provedores do `frame_agent`
- Atualização da classe `InteractiveAgent` para usar a nova arquitetura do LLM
- Refatoração do sistema de configuração para melhor alinhamento com o `frame_agent`

### Corrigido
- Problemas de compilação relacionados a dependências ausentes
- Erros de importação do módulo `AgentConfig`
- Incompatibilidades com a nova estrutura de exportação do `frame_agent`

## [1.1.17] - 2024-06-15

### Adicionado
- Implementação inicial do CLI com suporte a comandos chat, react e planning
- Integração com o SDK `@ericnunes/frame_agent` v1.1.x
- Suporte a ferramentas de busca, manipulação de arquivos e execução de comandos
- Modo interativo (REPL) para todos os comandos
- Sistema de configuração através de variáveis de ambiente, arquivo .env e opções de linha de comando

### Alterado
- Aprimoramentos na detecção automática de necessidade de ferramentas
- Melhorias na experiência do usuário com feedback visual e indicadores de progresso