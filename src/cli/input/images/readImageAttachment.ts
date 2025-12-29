import type { GraphEngine, ContentPart } from '@ericnunes/frame-agent-sdk';
import * as path from 'path';
import { buildMultimodalContent, readFileAsDataUrl, type ImageDetail } from './imageInput';

type ReadImageMetaLike = {
  path?: string;
  detail?: ImageDetail;
  mimeType?: string;
  bytes?: number;
  hash?: string;
};

export async function maybeAttachReadImageToContext(options: {
  engine: GraphEngine;
  metadata: unknown;
  textPrefix?: string;
}): Promise<boolean> {
  const metadataObj = (options.metadata ?? {}) as Record<string, unknown>;
  const readImage = (metadataObj.readImage ?? null) as ReadImageMetaLike | null;
  const imagePath = readImage?.path?.trim();
  if (!imagePath) return false;

  const dataUrl = await readFileAsDataUrl(imagePath);
  const detail = readImage?.detail ?? 'auto';

  const shortName = path.basename(imagePath);
  const prefix = options.textPrefix?.trim() || 'Imagem anexada (use-a para tomar decisōes no próximo passo).';
  const text = `${prefix}\nArquivo: ${shortName}`;

  const contentParts: ContentPart[] = buildMultimodalContent({ text, dataUrl: dataUrl.url, detail });

  options.engine.addMessage({
    role: 'user',
    content: contentParts,
  });

  return true;
}

