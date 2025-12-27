import { readFileSync } from 'fs';

export type ReadCliInputOptions = {
  inputFile?: string;
  additionalInput?: string;
};

async function readStdinUtf8(): Promise<string> {
  const chunks: Buffer[] = [];
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

  await new Promise<void>((resolve) => {
    process.stdin.on('end', () => resolve());
  });

  return Buffer.concat(chunks).toString('utf-8');
}

export async function readCliInput(options: ReadCliInputOptions): Promise<string> {
  let input = '';

  if (options.inputFile) {
    input = readFileSync(options.inputFile, 'utf-8');
  }

  if (options.additionalInput) {
    input = input ? `${input}\n\n${options.additionalInput}` : options.additionalInput;
  }

  if (!input) {
    input = await readStdinUtf8();
  }

  return input;
}

