import { promises as fs } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import type { ContentPart } from '@ericnunes/frame-agent-sdk';

export type ImageDetail = 'low' | 'high' | 'auto';

export type ImageDataUrl = {
  url: string;
  mimeType: string;
  bytes: number;
  hash: string;
};

function inferMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    default:
      return 'application/octet-stream';
  }
}

export async function readFileAsDataUrl(absolutePath: string): Promise<ImageDataUrl> {
  const buffer = await fs.readFile(absolutePath);
  const mimeType = inferMimeType(absolutePath);
  const hash = createHash('sha256').update(buffer).digest('hex');
  const base64 = buffer.toString('base64');
  return {
    url: `data:${mimeType};base64,${base64}`,
    mimeType,
    bytes: buffer.length,
    hash,
  };
}

export function buildMultimodalContent(options: { text: string; dataUrl: string; detail?: ImageDetail }): ContentPart[] {
  const detail = options.detail ?? 'auto';
  return [
    { type: 'text', text: options.text },
    { type: 'image_url', image_url: { url: options.dataUrl, detail } },
  ];
}

