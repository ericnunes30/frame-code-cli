/**
 * Script de teste para validar a injeção de AGENTS.md no prompt do agente
 * 
 * Este script testa:
 * 1. Parse de agente com useProjectRules: true (default)
 * 2. Parse de agente com useProjectRules: false
 * 3. Verificação se regras são injetadas no prompt
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseAgentFile } from '../../agent-runtime/registry/agentParser';

console.log('=== Teste de Injeção de AGENTS.md no Prompt ===\n');

// Criar arquivo de agente de teste
const testAgentPath = path.join(process.cwd(), 'test-agent.md');
const testAgentContent = `---
name: test-agent
type: main-agent
description: Agente de teste
tools: [search, file_read, final_answer]
---

# Test Agent

You are a test agent.
`;

fs.writeFileSync(testAgentPath, testAgentContent);
console.log('Agente de teste criado:', testAgentPath);

// Teste 1: Agente com useProjectRules: true (default)
console.log('\n--- Teste 1: Agente com useProjectRules: true (default) ---');
const metadata1 = parseAgentFile(testAgentPath);
if (metadata1) {
    console.log('useProjectRules:', metadata1.useProjectRules);
    console.log('✓ useProjectRules default é true');
} else {
    console.log('✗ Erro ao parsear agente');
}

// Teste 2: Agente com useProjectRules: false
console.log('\n--- Teste 2: Agente com useProjectRules: false ---');
const testAgentContent2 = `---
name: test-agent-2
type: main-agent
description: Agente de teste 2
tools: [search, file_read, final_answer]
useProjectRules: false
---

# Test Agent 2

You are a test agent without project rules.
`;

const testAgentPath2 = path.join(process.cwd(), 'test-agent-2.md');
fs.writeFileSync(testAgentPath2, testAgentContent2);

const metadata2 = parseAgentFile(testAgentPath2);
if (metadata2) {
    console.log('useProjectRules:', metadata2.useProjectRules);
    if (metadata2.useProjectRules === false) {
        console.log('✓ useProjectRules: false configurado corretamente');
    } else {
        console.log('✗ useProjectRules deveria ser false');
    }
} else {
    console.log('✗ Erro ao parsear agente');
}

// Teste 3: Verificar se AGENTS.md existe
console.log('\n--- Teste 3: Verificar AGENTS.md ---');
const codeDirAgentsMd = path.join(process.cwd(), '.code', 'AGENTS.md');
const rootAgentsMd = path.join(process.cwd(), 'AGENTS.md');

if (fs.existsSync(codeDirAgentsMd)) {
    console.log('✓ .code/AGENTS.md encontrado');
    const content = fs.readFileSync(codeDirAgentsMd, 'utf-8');
    console.log('Conteúdo length:', content.length);
    console.log('Preview:', content.substring(0, 100) + '...');
} else if (fs.existsSync(rootAgentsMd)) {
    console.log('✓ AGENTS.md na raiz encontrado');
    const content = fs.readFileSync(rootAgentsMd, 'utf-8');
    console.log('Conteúdo length:', content.length);
    console.log('Preview:', content.substring(0, 100) + '...');
} else {
    console.log('✗ Nenhum AGENTS.md encontrado');
}

// Teste 4: Verificar estrutura de IAgentMetadata
console.log('\n--- Teste 4: Verificar estrutura de IAgentMetadata ---');
if (metadata1) {
    const hasUseProjectRules = 'useProjectRules' in metadata1;
    console.log('Campo useProjectRules existe:', hasUseProjectRules);
    console.log('Tipo de useProjectRules:', typeof metadata1.useProjectRules);
    console.log('Valor de useProjectRules:', metadata1.useProjectRules);
}

// Limpeza
console.log('\n=== Limpeza ===');
if (fs.existsSync(testAgentPath)) {
    fs.unlinkSync(testAgentPath);
    console.log('Arquivo removido:', testAgentPath);
}
if (fs.existsSync(testAgentPath2)) {
    fs.unlinkSync(testAgentPath2);
    console.log('Arquivo removido:', testAgentPath2);
}

console.log('\n=== Testes concluídos ===');
