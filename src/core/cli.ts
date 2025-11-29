#!/usr/bin/env node

import { Command } from 'commander';
import { GraphStatus } from 'frame-agent-sdk';
import { initializeTools } from './tools';
import * as readline from 'readline';
import { loadConfig } from './config';
import { createAgentGraph } from '../agents/agentFlow';
import { logger } from './logger';


const printLine = (message: string = '') => {
  process.stdout.write(message + '\n');
};


// Flag para controlar se os agentes já foram registrados
let agentsRegistered = false;

// Configuração carregada
let config: any;

// Carregar configuração ANTES de tudo
async function loadConfigAsync() {
  if (!config) {
    config = await loadConfig();
  }
  return config;
}

// Garantir registro único dos agentes
async function ensureAgentsRegistered() {
  if (!agentsRegistered) {
    agentsRegistered = true;
  }
}

const program = new Command();

program
  .name('frame-code-cli')
  .description('CLI para frame-code com agentes')
  .version('0.0.1');

// Comando com pergunta direta
program
  .command('ask <question>')
  .description('Fazer uma pergunta usando o agente')
  .action(async (question: string) => {
    try {
      await loadConfigAsync();
      await ensureAgentsRegistered();

      printLine('.frame-agent CLI');
      printLine('==============================================');
      printLine('Modo: Pergunta direta');
      printLine('');

      // Inicializar ferramentas (incluindo MCP)
      printLine('Inicializando ferramentas...');
      await initializeTools();

      printLine('Inicializando agente...');
      const graph = await createAgentGraph();
      printLine('Agente pronto!');
      printLine('');

      printLine('\n' + '🤖 Processando...');
      printLine(`Pergunta: "${question}"`);
      printLine('');

      const initialState: any = {
        messages: [{ role: 'user', content: question }],
        data: {},
        status: GraphStatus.RUNNING,
        logs: []
      };

      const result = await graph.execute(initialState);

      // A formatação das mensagens já é feita pelo toolDetectionWrapper
      // Aqui só precisamos mostrar mensagens de status

      if (result.status === GraphStatus.FINISHED) {
        printLine('✅ Tarefa concluída!');
        return;
      }

      if (result.status === GraphStatus.ERROR) {
        printLine('❌ Erro durante execução');
      }

    } catch (error) {
      logger.error('Erro ao executar comando:', error);
      process.exit(1);
    }
  });



// Comando interativo
program
  .command('interactive')
  .description('Iniciar modo interativo')
  .action(async () => {
    try {
      await loadConfigAsync();
      await ensureAgentsRegistered();

      printLine('.frame-agent CLI');
      printLine('==============================================');
      printLine('Modo Chat Interativo');
      printLine('Dica: Digite suas perguntas ou "sair" para encerrar');
      printLine('');

      let currentState: any = { messages: [], data: {}, status: GraphStatus.RUNNING };

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // Inicializar ferramentas (incluindo MCP) ANTES de criar o grafo
      printLine('Inicializando ferramentas...');
      await initializeTools();

      // Criar grafo do agente
      printLine('Inicializando agente...');
      const graph = await createAgentGraph();
      printLine('Agente pronto!');
      printLine('');

      const processQuestion = async (question: string) => {
        try {
          logger.debug(`===== INICIANDO PROCESSAMENTO DA MENSAGEM =====`);
          logger.debug(`Mensagem recebida: "${question}"`);
          logger.debug(`Estado ANTES de adicionar mensagem: ${JSON.stringify({
            messageCount: currentState.messages?.length || 0,
            status: currentState.status,
            mensagens: currentState.messages?.map((m: any, i: number) => `${i}: [${m.role}] ${m.content.substring(0, 50)}...`) || []
          })}`);

          // Adicionar mensagem do usuário
          currentState.messages.push({ role: 'user', content: question });
          currentState.status = GraphStatus.RUNNING;

          logger.debug(`Estado APÓS adicionar mensagem: ${JSON.stringify({
            messageCount: currentState.messages?.length || 0,
            status: currentState.status,
            ultimaMensagem: currentState.messages[currentState.messages.length - 1],
            mensagensAposAdicionar: currentState.messages?.map((m: any, i: number) => `${i}: [${m.role}] ${m.content.substring(0, 50)}...`) || []
          })}`);

          printLine('\n' + '🤖 Processando...');

          // Executar grafo
          logger.debug(`Executando grafo - Estado inicial: ${JSON.stringify({
            messageCount: currentState.messages?.length || 0,
            status: currentState.status,
            hasToolCall: !!currentState.lastToolCall,
            toolName: currentState.lastToolCall?.toolName
          })}`);

          logger.debug(`Executando grafo...`);
          const result = await graph.execute(currentState);
          logger.debug(`Grafo executado com status: ${result.status}`);

          currentState = result.state;

          logger.debug(`Resultado da execução: ${JSON.stringify({
            messageCount: currentState.messages?.length || 0,
            status: currentState.status,
            hasToolCall: !!currentState.lastToolCall,
            toolName: currentState.lastToolCall?.toolName,
            graphStatus: result.status
          })}`);

          logger.debug(`Estado APÓS execução do grafo: ${JSON.stringify({
            messageCount: currentState.messages?.length || 0,
            status: currentState.status,
            mensagensAposGrafo: currentState.messages?.map((m: any, i: number) => `${i}: [${m.role}] ${m.content.substring(0, 50)}...`) || []
          })}`);

          // Verificar se há ask_user pendente
          if (currentState.pendingAskUser) {
            printLine('');
            printLine('❓ O agente precisa de mais informações:');
            const lastMsg = currentState.messages[currentState.messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              printLine(`   ${lastMsg.content} `);
            }
            printLine('');
            return; // Aguardar próximo input do usuário
          }

          // A formatação das mensagens já é feita pelo toolDetectionWrapper
          // Aqui só precisamos mostrar logs de debug

          // Verificar se finalizou
          if (result.status === GraphStatus.FINISHED) {
            printLine('✅ Tarefa concluída!');
            logger.debug(`Estado finalizado detectado, resetando estado para próxima interação`);
            // Resetar estado para próxima interação
            currentState = {
              messages: [...currentState.messages], // Manter histórico
              data: {},
              status: GraphStatus.RUNNING
            };
            return;
          }

          if (result.status === GraphStatus.ERROR) {
            printLine('❌ Erro durante execução');
            if (currentState.logs && currentState.logs.length > 0) {
              printLine('Logs: ' + currentState.logs.join('\n'));
            }
          }

        } catch (error) {
          logger.error('❌ Erro durante execução:', error);
        }
      };

      const showPrompt = () => {
        logger.debug(`Mostrando prompt - Estado atual: ${JSON.stringify({
          messageCount: currentState.messages?.length || 0,
          status: currentState.status
        })}`);

        rl.question('Você: ', async (input) => {
          logger.debug(`===== NOVA MENSAGEM DO USUÁRIO =====`);
          logger.debug(`Input bruto recebido: "${input}"`);
          logger.debug(`Timestamp: ${new Date().toISOString()}`);

          const trimmedInput = input.trim();
          logger.debug(`Input após trim: "${trimmedInput}"`);

          if (
            trimmedInput.toLowerCase() === 'sair' ||
            trimmedInput.toLowerCase() === 'exit' ||
            trimmedInput.toLowerCase() === 'quit'
          ) {
            printLine('Até mais! Obrigado por usar o frame-agent.');
            rl.close();
            return;
          }

          if (trimmedInput === '') {
            logger.debug('Input vazio, mostrando prompt novamente');
            showPrompt();
            return;
          }

          logger.debug(`Processando mensagem: "${trimmedInput}"`);
          try {
            await processQuestion(trimmedInput);
            logger.debug(`Mensagem processada com sucesso`);
          } catch (error) {
            logger.error('[DEBUG CLI] Erro em processQuestion:', error);
          }

          printLine('\n' + '='.repeat(50) + '\n');
          logger.debug('Preparando para mostrar próximo prompt');
          showPrompt();
        });
      };

      printLine('Bem-vindo ao Chat frame-agent! Como posso ajudar?');
      showPrompt();

      rl.on('close', () => {
        printLine('\nSessão encerrada. Até a próxima!');
        process.exit(0);
      });
    } catch (error) {
      logger.error('Erro ao iniciar modo interativo:', error);
      process.exit(1);
    }
  });

// Comando de teste MCP integrado removido
// Foi movido para o diretório mcp/test.sh

// Comando de ajuda
program
  .command('help')
  .description('Mostrar ajuda')
  .action(() => {
    program.help();
  });

// Exportar program para uso em outros módulos
export { program };