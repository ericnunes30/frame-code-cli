#!/usr/bin/env node
/**
 * Script de teste para o agente Chrome MCP
 * Testa uma tarefa real de navegação e screenshot
 */

import { AgentRegistry } from '../../agent-runtime/registry';
import { GraphStatus } from '@ericnunes/frame-agent-sdk';
import { initializeTools } from '../../tools';
import { loadConfig } from '../../infrastructure/config';
import { createCliTelemetry } from '../../infrastructure/telemetry';
import { logger } from '../../infrastructure/logging/logger';

async function testChromeMcpAgent() {
  try {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║   TESTE DO AGENTE CHROME MCP                        ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');

    await loadConfig();

    console.log('Inicializando ferramentas...');
    await initializeTools();
    console.log('✅ Ferramentas inicializadas');
    console.log('');

    console.log('Inicializando agente Chrome MCP...');
    const { trace, telemetry } = createCliTelemetry();
  const registry = AgentRegistry.getInstance();
    const graph = await registry.createEngine('chrome-mcp-agent', {
      trace,
      telemetry,
    });
    console.log('✅ Agente inicializado');
    console.log('');

    // Tarefa de teste
    const testTask = 'Navegue para https://example.com e tire um screenshot da página';
    
    console.log('📝 Tarefa de teste:');
    console.log(`   "${testTask}"`);
    console.log('');
    console.log('⏳ Executando...');
    console.log('');

    const initialState = {
      messages: [{ role: 'user', content: testTask }],
      data: {},
      status: GraphStatus.RUNNING
    };

    const result = await graph.execute(initialState);

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RESULTADO');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    console.log(`Status: ${result.status}`);
    console.log('');

    // Exibir a resposta do agente
    const lastToolCall = (result.state as any).lastToolCall as any;
    if (lastToolCall?.toolName === 'final_answer') {
      const answer = lastToolCall?.params?.answer;
      if (typeof answer === 'string' && answer.trim().length > 0) {
        console.log('🤖 Resposta do Agente:');
        console.log(answer);
        console.log('');
      }
    }

    const lastAssistantMessage = result.state.messages
      .filter((msg: any) => msg.role === 'assistant')
      .pop();

    if (lastAssistantMessage && !lastToolCall?.toolName) {
      console.log('🤖 Resposta do Agente:');
      console.log(lastAssistantMessage.content);
      console.log('');
    }

    // Exibir logs se houver
    if (result.state.logs && result.state.logs.length > 0) {
      console.log('📋 Logs:');
      result.state.logs.forEach((log: string) => {
        console.log(`  - ${log}`);
      });
      console.log('');
    }

    // Verificar se houve erro
    if (result.status === GraphStatus.ERROR) {
      console.log('❌ Erro na execução');
      console.log(result.state.logs?.join('\n') || 'Erro desconhecido');
      process.exit(1);
    }

    console.log('✅ Teste concluído com sucesso!');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ Erro no teste:');
    console.error(error);
    process.exit(1);
  }
}

testChromeMcpAgent();