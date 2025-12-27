#!/usr/bin/env node

/// <reference types="node" />

import { Command } from 'commander';
import { interactiveCommand } from '../cli/commands/interactive';
import { createAutonomousCommand } from '../cli/commands/autonomous';
import { memoryCommand } from '../cli/commands/memory';
import { createMultiAgentCommand } from '../cli/commands/multi-agent';


export const program = new Command()
  .name('frame-code-cli')
  .description('CLI para frame-code com agentes')
  .version('0.0.1');

program.addCommand(interactiveCommand);
program.addCommand(createAutonomousCommand());
program.addCommand(memoryCommand);
program.addCommand(createMultiAgentCommand());

export function runCli(argv: string[] = process.argv) {
  try {
    // Se nenhum comando for especificado, usar modo interativo como padrão
    const nextArgv = [...argv];
    if (nextArgv.length <= 2) {
      nextArgv.push('interactive');
    }

    program.parse(nextArgv);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}
