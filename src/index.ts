#!/usr/bin/env node

import { logger } from './core/logger'

logger.info('[FrameCodeCLI] Iniciando CLI...')

import { program } from './core/cli'

// Se nenhum argumento for passado, iniciar modo interativo por padrão
if (process.argv.length <= 2) {
  process.argv.push('interactive')
}

program.parse()