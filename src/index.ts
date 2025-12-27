#!/usr/bin/env node

// Configurar UTF-8 para console no Windows
// Isso ajuda mas não é 100% efetivo - veja .env-example para mais opções
if (process.stdout.isTTY) {
  process.stdout.setEncoding('utf-8')
}
if (process.stderr.isTTY) {
  process.stderr.setEncoding('utf-8')
}

// Tentar configurar locale via variáveis de ambiente (ajuda no Git Bash/MINGW)
if (!process.env.LANG) {
  process.env.LANG = 'en_US.UTF-8'
}
if (!process.env.LC_ALL) {
  process.env.LC_ALL = 'en_US.UTF-8'
}

import { logger } from './infrastructure/logging/logger'

logger.info('[FrameCodeCLI] Iniciando CLI...')

import { initializeAgents } from './agent-runtime'

// Inicializar sistema de agentes antes de rodar CLI
initializeAgents().then((count) => {
  logger.info(`[FrameCodeCLI] ${count} agentes carregados`)
}).catch((error) => {
  logger.error('[FrameCodeCLI] Erro ao carregar agentes:', error)
})

import { runCli } from './app/cli'

runCli()
