import { Command } from 'commander';
import * as readline from 'readline';
import { logger } from '../services/logger';
import { createAgentGraph } from '../../agents/agentCode';
import { GraphStatus } from 'frame-agent-sdk';
import { initializeTools } from '../services/tools';
import { loadConfig } from '../services/config';

/**
 * Comando interativo para chat com o agente
 */
let interactiveExecuted = false; // Flag global para prevenir duplicação

export function createInteractiveCommand(): Command {
  const command = new Command('interactive');

  command
    .description('Iniciar modo interativo')
    .action(async () => {
      try {
        if (interactiveExecuted) {
          return;
        }
        interactiveExecuted = true;
        await loadConfig();

        console.log('.frame-agent CLI');
        console.log('==============================================');
        console.log('Modo Chat Interativo');
        console.log('Dica: Digite suas perguntas ou "sair" para encerrar');
        console.log('');

        let currentState: any = { messages: [], data: {}, status: GraphStatus.RUNNING };

        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        // Log para rastrear criação de interface

        console.log('Inicializando ferramentas...');
        await initializeTools();

        console.log('Inicializando agente...');
        const graph = await createAgentGraph();

        // Verificar se compressão está habilitada
        const isCompressionEnabled = graph && typeof graph === 'object' && 'isCompressionEnabled' in graph;
        if (isCompressionEnabled) {
          console.log('✅ Agente pronto com compressão inteligente habilitada!');
          const stats = graph.getStats?.();
          if (stats?.compression?.enabled) {
            console.log(`📊 Memória: ${stats.compression.currentCompressions}/${stats.compression.maxCompressions} compressões`);
          }
        } else {
          console.log('🤖 Agente pronto!');
        }
        console.log('');

        const processQuestion = async (question: string) => {
          try {
            // Criar novo estado limpo para cada pergunta
            const newState = {
              messages: [...currentState.messages, { role: 'user', content: question }],
              data: { ...currentState.data },
              status: GraphStatus.RUNNING
            };

            console.log('Processando...');

            const result = await graph.execute(newState);

            // Atualizar estado apenas com as mensagens mais recentes
            currentState.messages = result.state.messages;
            currentState.data = result.state.data;
            currentState.status = result.state.status;

            if (result.status === GraphStatus.FINISHED) {
              const lastAssistantMessage = currentState.messages
                .filter((msg: any) => msg.role === 'assistant')
                .pop();

              if (lastAssistantMessage) {
                console.log('\n🤖 ' + lastAssistantMessage.content);
              }
            } else if (result.status === GraphStatus.ERROR) {
              console.log('\n❌ Erro na execução: ' + (currentState.logs?.join('\n') || 'Erro desconhecido'));
            }

          } catch (error) {
            logger.error('Erro no processamento da questão:', error);
            console.log('\n❌ Ocorreu um erro ao processar sua solicitação.');
          }
        };

        let promptActive = false; // Flag para evitar múltiplos prompts simultâneos

        const showPrompt = () => {
          if (promptActive) {
            return;
          }

          promptActive = true;

          rl.question('Você: ', async (input: string) => {
            promptActive = false; // Liberar flag no início do handler
            const trimmedInput = input.trim();

            if (
              trimmedInput.toLowerCase() === 'sair' ||
              trimmedInput.toLowerCase() === 'exit' ||
              trimmedInput.toLowerCase() === 'quit'
            ) {
              console.log('Até mais! Obrigado por usar o frame-agent.');
              rl.close();
              return;
            }

            if (trimmedInput === '') {
              showPrompt();
              return;
            }

            try {
              await processQuestion(trimmedInput);
            } catch (error) {
              logger.error('Erro em processQuestion:', error);
            }

            // Só mostrar prompt se ainda estiver no modo interativo
            console.log('\n' + '='.repeat(50) + '\n');
            showPrompt();
          });
        };

        console.log('Bem-vindo ao Chat frame-agent! Como posso ajudar?');
        showPrompt();

        rl.on('close', () => {
          console.log('\nSessão encerrada. Até a próxima!');
          process.exit(0);
        });

        // Limpar listeners anteriores antes de adicionar novos
        rl.removeAllListeners('line');
        rl.removeAllListeners('question');

      } catch (error) {
        logger.error('Erro ao iniciar modo interativo:', error);
        process.exit(1);
      }
    });

  return command;
}

export const interactiveCommand = createInteractiveCommand();