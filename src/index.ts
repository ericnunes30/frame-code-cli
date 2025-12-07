#!/usr/bin/env node

import * as dotenv from 'dotenv';
dotenv.config();

import { logger } from './core/services/logger'

logger.info('[FrameCodeCLI] Iniciando CLI...')

import { program } from './core/cli'

program.parse()