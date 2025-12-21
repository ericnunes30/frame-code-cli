import type { ContextHooks, IGraphState } from 'frame-agent-sdk';
import { logger } from '../services/logger';
import { CompressionManager } from '../services/CompressionManager';

function isTokenOverflowError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  const tokenErrorKeywords = [
    'maximum context length',
    'too many tokens',
    'context length exceeded',
    'token limit',
    'maximum tokens',
    'context window',
    'tokens exceed',
    'prompt is too long',
  ];

  return tokenErrorKeywords.some((keyword) => errorMessage.includes(keyword));
}

export function createCliContextHooks(
  compressionManager: CompressionManager | null | undefined,
  options?: { maxRetries?: number }
): ContextHooks | undefined {
  if (!compressionManager) return undefined;

  const maxRetries = Math.max(0, options?.maxRetries ?? 2);

  return {
    maxRetries,
    isRetryableError: isTokenOverflowError,
    beforeRequest: async ({ attempt, messages }) => {
      try {
        const state = { messages } as IGraphState;
        const shouldCompress = await compressionManager.checkProactiveCompression(state);
        if (!shouldCompress) return;

        logger.info(`[ContextHooks] Compressão proativa (attempt=${attempt})`);
        const next = await compressionManager.performProactiveCompression(state);
        return { messages: next.messages ?? messages };
      } catch (error) {
        logger.warn('[ContextHooks] Falha na compressão proativa, seguindo sem compressão', error);
        return;
      }
    },
    onError: async ({ attempt, error, messages }) => {
      if (!isTokenOverflowError(error)) return { retry: false };

      try {
        logger.warn(`[ContextHooks] Estouro de tokens detectado (attempt=${attempt}), compressão emergencial e retry`);
        const state = { messages } as IGraphState;
        const next = await compressionManager.handleTokenOverflow(error, state);
        return { retry: true, messages: next.messages ?? messages };
      } catch (compressionError) {
        logger.error('[ContextHooks] Falha na compressão emergencial', compressionError);
        return { retry: false };
      }
    }
  };
}

