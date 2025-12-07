#!/usr/bin/env ts-node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { loadConfigSync } from '../../src/core/services/config';

loadConfigSync();

async function main() {
    const client = new Client({ name: "debug", version: "1.0" });
    const transport = new StdioClientTransport({
        command: 'docker',
        args: ['run', '-i', '--rm', '-e', `GITHUB_PERSONAL_ACCESS_TOKEN=${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`, 'ghcr.io/github/github-mcp-server', 'stdio']
    });

    await client.connect(transport);
    const result = await client.listTools();
    console.log(JSON.stringify(result, null, 2));
    await client.close();
}

main();
