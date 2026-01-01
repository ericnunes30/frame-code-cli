# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2026-01-01

### Fixed
- Corrigidos bugs de variáveis incorretas nos arquivos de agentes nativos
  - architect.md: Correções de variáveis no frontmatter
  - builder.md: Correções de variáveis no frontmatter
  - code-agent.md: Correções de variáveis no frontmatter
  - supervisor.md: Correções de variáveis no frontmatter

## [0.0.1] - 2025-12-31

### Added
- Initial release of `@ericnunes/frame-code-cli`
- CLI tool for interacting with coding agents created with `@ericnunes/frame-agent-sdk`
- Four main command modes:
  - `autonomous`: Run autonomous coding agent
  - `interactive`: Run interactive coding agent
  - `multi-agent`: Run multi-agent collaboration
  - `memory`: Manage agent memory
- Built-in agent templates:
  - Architect agent
  - Builder agent
  - Code agent
  - Supervisor agent
- MCP (Model Context Protocol) integration and discovery
- Native tools support:
  - File operations (read, create, edit)
  - Directory listing
  - Image reading capabilities
  - Outline generation
- Configuration management via `.env` files
- Project rules loading from `.code/rules.md`
- Skills management and registry system
- Telemetry and logging infrastructure
- Compression services for context optimization
- Support for OpenAI-compatible providers

### Installation

```bash
npm install -g @ericnunes/frame-code-cli
```

### Usage

```bash
# Show help
frame-code --help

# Run interactive mode
frame-code interactive

# Run autonomous mode
frame-code autonomous

# Run multi-agent mode
frame-code multi-agent

# Manage memory
frame-code memory
```

### Requirements
- Node.js >= 18.0.0
- OpenAI API key (or compatible provider)
