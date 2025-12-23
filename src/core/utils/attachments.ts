import { promises as fs } from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

export type AttachmentsCleanupConfig = {
  retentionDays?: number;
  maxTotalMB?: number;
};

export function createRunId(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const pid = process.pid;
  const rand = randomBytes(3).toString('hex');
  return `${ts}-${pid}-${rand}`;
}

export function getAttachmentsRoot(): string {
  return path.resolve(process.cwd(), 'tmp', 'attachments');
}

function parseNumberEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getAttachmentsCleanupConfigFromEnv(): AttachmentsCleanupConfig {
  return {
    retentionDays: parseNumberEnv('ATTACHMENTS_RETENTION_DAYS') ?? 7,
    maxTotalMB: parseNumberEnv('ATTACHMENTS_MAX_TOTAL_MB') ?? 500,
  };
}

async function safeRm(targetPath: string): Promise<void> {
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

export async function cleanupAttachmentsRoot(config?: AttachmentsCleanupConfig): Promise<void> {
  const root = getAttachmentsRoot();
  const retentionDays = config?.retentionDays ?? 7;
  const maxTotalMB = config?.maxTotalMB ?? 500;

  let entries: Array<import('fs').Dirent>;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }

  const now = Date.now();
  const cutoffMs = retentionDays * 24 * 60 * 60 * 1000;

  const dirs: Array<{ fullPath: string; name: string; mtimeMs: number; sizeBytes: number }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(root, entry.name);
    try {
      const stat = await fs.stat(fullPath);
      const sizeBytes = await folderSizeBytes(fullPath);
      dirs.push({ fullPath, name: entry.name, mtimeMs: stat.mtimeMs, sizeBytes });
    } catch {
      // ignore
    }
  }

  // 1) Remove by age
  for (const dir of dirs) {
    if (now - dir.mtimeMs > cutoffMs) {
      await safeRm(dir.fullPath);
    }
  }

  // 2) Enforce max total size (remove oldest first)
  const remaining: Array<{ fullPath: string; mtimeMs: number; sizeBytes: number }> = [];
  let total = 0;
  for (const dir of dirs) {
    try {
      const stat = await fs.stat(dir.fullPath);
      const sizeBytes = await folderSizeBytes(dir.fullPath);
      remaining.push({ fullPath: dir.fullPath, mtimeMs: stat.mtimeMs, sizeBytes });
      total += sizeBytes;
    } catch {
      // removed or inaccessible
    }
  }

  const maxBytes = maxTotalMB * 1024 * 1024;
  if (total <= maxBytes) return;

  remaining.sort((a, b) => a.mtimeMs - b.mtimeMs);
  for (const dir of remaining) {
    if (total <= maxBytes) break;
    await safeRm(dir.fullPath);
    total -= dir.sizeBytes;
  }
}

async function folderSizeBytes(root: string): Promise<number> {
  let total = 0;
  const stack: string[] = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    let dirents: Array<import('fs').Dirent>;
    try {
      dirents = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const dirent of dirents) {
      const fullPath = path.join(current, dirent.name);
      if (dirent.isDirectory()) {
        stack.push(fullPath);
      } else if (dirent.isFile()) {
        try {
          const stat = await fs.stat(fullPath);
          total += stat.size;
        } catch {
          // ignore
        }
      }
    }
  }
  return total;
}

export async function stageImageAttachments(options: {
  runId?: string;
  imagePaths: string[];
}): Promise<{ runId: string; stagedPaths: string[] }> {
  const runId = options.runId ?? createRunId();
  const root = getAttachmentsRoot();
  const runDir = path.join(root, runId);

  await fs.mkdir(runDir, { recursive: true });

  const stagedPaths: string[] = [];
  for (const imgPath of options.imagePaths) {
    const absolute = path.isAbsolute(imgPath) ? imgPath : path.resolve(process.cwd(), imgPath);
    const base = path.basename(absolute);
    const target = path.join(runDir, base);
    await fs.copyFile(absolute, target);
    stagedPaths.push(target);
  }

  return { runId, stagedPaths };
}

