#!/usr/bin/env node

import { logger } from './core/services/logger'

logger.info('[FrameCodeCLI] Iniciando CLI...')

import { runCli } from './core/cli'

runCli()
