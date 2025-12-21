import { Command } from 'commander';
import * as readline from 'readline';
import { logger } from '../services/logger';
import { createAgentGraph } from '../../agents/single-agents/agentCode';
import { GraphStatus } from 'frame-agent-sdk';
import { initializeTools } from '../services/tools';
import { loadConfig } from '../services/config';
import { createCliTelemetry } from '../telemetry';

/**
 * Comando interativo para chat com o agente
 */
let interactiveExecuted = false; // Flag global para prevenir duplicaÃ§Ã£o

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

        // Log para rastrear criaÃ§Ã£o de interface

        console.log('Inicializando ferramentas...');
        await initializeTools();

        console.log('Inicializando agente...');
        const { trace, telemetry } = createCliTelemetry();
        const graph = await createAgentGraph(undefined, {
          trace,
          telemetry,
          traceContext: { agent: { label: 'Agente' } }
        });

        console.log('ðŸ¤– Agente pronto!');
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
              const lastToolCall = (currentState as any).lastToolCall as any;
              if (lastToolCall?.toolName === 'final_answer') {
                const answer = lastToolCall?.params?.answer;
                if (typeof answer === 'string' && answer.trim().length > 0) {
                  console.log('\nðŸ¤– ' + answer);
                  return;
                }
              }

              const lastAssistantMessage = currentState.messages
                .filter((msg: any) => msg.role === 'assistant')
                .pop();

              if (lastAssistantMessage) {
                console.log('\nðŸ¤– ' + lastAssistantMessage.content);
              }
            } else if (result.status === GraphStatus.ERROR) {
              console.log('\nâŒ Erro na execuÃ§Ã£o: ' + (currentState.logs?.join('\n') || 'Erro desconhecido'));
            }

          } catch (error) {
            logger.error('Erro no processamento da questÃ£o:', error);
            console.log('\nâŒ Ocorreu um erro ao processar sua solicitaÃ§Ã£o.');
          }
        };

        let promptActive = false; // Flag para evitar mÃºltiplos prompts simultÃ¢neos

        const showPrompt = () => {
          if (promptActive) {
            return;
          }

          promptActive = true;

          rl.question('VocÃª: ', async (input: string) => {
            promptActive = false; // Liberar flag no inÃ­cio do handler
            const trimmedInput = input.trim();

            if (
              trimmedInput.toLowerCase() === 'sair' ||
              trimmedInput.toLowerCase() === 'exit' ||
              trimmedInput.toLowerCase() === 'quit'
            ) {
              console.log('AtÃ© mais! Obrigado por usar o frame-agent.');
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

            // SÃ³ mostrar prompt se ainda estiver no modo interativo
            console.log('\n' + '='.repeat(50) + '\n');
            showPrompt();
          });
        };

        console.log('Bem-vindo ao Chat frame-agent! Como posso ajudar?');
        showPrompt();

        rl.on('close', () => {
          console.log('\nSessÃ£o encerrada. AtÃ© a prÃ³xima!');
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

