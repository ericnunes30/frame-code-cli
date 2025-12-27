import { Command } from 'commander';
import { CompressionManager } from '../../infrastructure/compression';
import { logger } from '../../infrastructure/logging/logger';
import { loadConfig } from '../../infrastructure/config';

/**
 * Comandos para gerenciamento de memória e compressão
 */

function createMemoryStatusCommand(): Command {
  const command = new Command('status');
  
  command
    .description('Mostrar status atual da memória e compressão')
    .action(async () => {
      try {
        const config = await loadConfig();
        
        if (!config.compression?.enabled) {
          console.log('❌ Compressão de memória está desabilitada');
          console.log('💡 Habilite com COMPRESSION_ENABLED=true no .env');
          return;
        }

        const compressionManager = new CompressionManager(config.compression);
        const stats = compressionManager.getCompressionStats();

        console.log('📊 Status da Memória e Compressão');
        console.log('='.repeat(40));
        console.log(`✅ Compressão: ${stats.enabled ? 'Habilitada' : 'Desabilitada'}`);
        console.log(`📈 Threshold: ${(stats.threshold * 100).toFixed(0)}%`);
        console.log(`🔄 Compressões atuais: ${stats.currentCompressions}/${stats.maxCompressions}`);
        console.log(`📝 Total de compressões realizadas: ${stats.compressionCount}`);
        console.log(`💾 Persistência: ${config.compression.persist ? 'Habilitada' : 'Desabilitada'}`);
        console.log(`📊 Logging: ${config.compression.logging ? 'Habilitado' : 'Desabilitado'}`);

        if (stats.compressionHistory.length > 0) {
          console.log('\n📜 Histórico de Compressões:');
          stats.compressionHistory.forEach((comp: any, index: number) => {
            console.log(`  ${index + 1}. ${comp.preview} (${comp.length} caracteres)`);
          });
        } else {
          console.log('\n📜 Nenhuma compressão realizada ainda');
        }

      } catch (error) {
        logger.error('[MemoryCommand] Erro ao obter status:', error);
        console.error('❌ Erro ao obter status da memória');
      }
    });

  return command;
}

function createMemoryCompressCommand(): Command {
  const command = new Command('compress');
  
  command
    .description('Forçar compressão manual da memória')
    .action(async () => {
      try {
        const config = await loadConfig();
        
        if (!config.compression?.enabled) {
          console.log('❌ Compressão de memória está desabilitada');
          console.log('💡 Habilite com COMPRESSION_ENABLED=true no .env');
          return;
        }

        console.log('🔄 Iniciando compressão manual...');
        
        const compressionManager = new CompressionManager(config.compression);
        const statsBefore = compressionManager.getCompressionStats();
        
        console.log(`📊 Antes: ${statsBefore.currentCompressions}/${statsBefore.maxCompressions} compressões`);

        // Nota: Para compressão manual, precisaríamos de um estado atual
        // Por enquanto, apenas mostramos informações
        console.log('💡 Para compressão manual during conversa, use o modo interativo');
        console.log('   A compressão automática ocorrerá quando necessário');

      } catch (error) {
        logger.error('[MemoryCommand] Erro na compressão manual:', error);
        console.error('❌ Erro na compressão manual');
      }
    });

  return command;
}

function createMemoryClearCommand(): Command {
  const command = new Command('clear');
  
  command
    .description('Limpar todo o histórico de compressões')
    .action(async () => {
      try {
        const config = await loadConfig();
        
        if (!config.compression?.enabled) {
          console.log('❌ Compressão de memória está desabilitada');
          return;
        }

        const compressionManager = new CompressionManager(config.compression);
        const statsBefore = compressionManager.getCompressionStats();
        
        if (statsBefore.currentCompressions === 0) {
          console.log('📝 Não há compressões para limpar');
          return;
        }

        console.log(`🗑️ Limpando ${statsBefore.currentCompressions} compressões...`);
        
        compressionManager.clearCompressions();
        
        console.log('✅ Histórico de compressões limpo com sucesso');
        console.log('💾 Arquivo de persistência removido (se existia)');

      } catch (error) {
        logger.error('[MemoryCommand] Erro ao limpar compressões:', error);
        console.error('❌ Erro ao limpar compressões');
      }
    });

  return command;
}

function createMemoryConfigCommand(): Command {
  const command = new Command('config');
  
  command
    .description('Mostrar configuração atual de compressão')
    .action(async () => {
      try {
        const config = await loadConfig();
        
        console.log('⚙️ Configuração de Compressão');
        console.log('='.repeat(30));
        
        if (!config.compression) {
          console.log('❌ Nenhuma configuração de compressão encontrada');
          return;
        }

        console.log(`enabled: ${config.compression.enabled}`);
        console.log(`threshold: ${config.compression.threshold} (${(config.compression.threshold! * 100).toFixed(0)}%)`);
        console.log(`maxCount: ${config.compression.maxCount}`);
        console.log(`maxTokens: ${config.compression.maxTokens}`);
        console.log(`model: ${config.compression.model || 'padrão do LLM'}`);
        console.log(`logging: ${config.compression.logging}`);
        console.log(`persist: ${config.compression.persist}`);

        console.log('\n📝 Variáveis de ambiente correspondentes:');
        console.log('COMPRESSION_ENABLED');
        console.log('COMPRESSION_THRESHOLD');
        console.log('COMPRESSION_MAX_COUNT');
        console.log('COMPRESSION_MAX_TOKENS');
        console.log('COMPRESSION_MODEL');
        console.log('COMPRESSION_LOGGING');
        console.log('COMPRESSION_PERSIST');

      } catch (error) {
        logger.error('[MemoryCommand] Erro ao mostrar configuração:', error);
        console.error('❌ Erro ao mostrar configuração');
      }
    });

  return command;
}

/**
 * Cria o comando principal de memória com todos os subcomandos
 */
export function createMemoryCommand(): Command {
  const command = new Command('memory');
  
  command
    .description('Gerenciar memória e compressão da CLI');

  // Adicionar subcomandos
  command.addCommand(createMemoryStatusCommand());
  command.addCommand(createMemoryCompressCommand());
  command.addCommand(createMemoryClearCommand());
  command.addCommand(createMemoryConfigCommand());

  return command;
}

export const memoryCommand = createMemoryCommand();
