#!/usr/bin/env node

/// <reference types="node" />

import { Command } from 'commander';
import { interactiveCommand } from './commands/interactive';
import { createAutonomousCommand } from './commands/autonomousCommand';
import { memoryCommand } from './commands/memoryCommand';


export const program = new Command()
  .name('frame-code-cli')
  .description('CLI para frame-code com agentes')
  .version('0.0.1');

program.addCommand(interactiveCommand);
program.addCommand(createAutonomousCommand());
program.addCommand(memoryCommand);

async function main() {
  try {
    // Se nenhum comando for especificado, usar modo interativo como padrão
    if (process.argv.length <= 2) {
      process.argv.push('interactive');
    }
    
    program.parse(process.argv);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

main();