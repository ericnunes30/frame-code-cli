/**
 * Script de teste para validar o carregamento de AGENTS.md em diretórios diferentes
 * 
 * Este script testa:
 * 1. Carregamento de AGENTS.md em diferentes diretórios
 * 2. Comportamento de process.cwd() dinâmico
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadProjectRules } from '../../agent-runtime/context/project-rules/loader';

console.log('=== Teste de Carregamento Dinâmico de AGENTS.md ===\n');

// Criar diretórios temporários para teste
const tempDir1 = path.join(process.cwd(), 'test-dir-1');
const tempDir2 = path.join(process.cwd(), 'test-dir-2');

if (!fs.existsSync(tempDir1)) {
    fs.mkdirSync(tempDir1, { recursive: true });
}
if (!fs.existsSync(tempDir2)) {
    fs.mkdirSync(tempDir2, { recursive: true });
}

// Criar AGENTS.md em cada diretório
const agentsMd1 = path.join(tempDir1, 'AGENTS.md');
const agentsMd2 = path.join(tempDir2, 'AGENTS.md');

fs.writeFileSync(agentsMd1, '# Rules for Dir 1\n\nThis is dir 1 rules.\n');
fs.writeFileSync(agentsMd2, '# Rules for Dir 2\n\nThis is dir 2 rules.\n');

console.log('Diretórios de teste criados:');
console.log('  Dir 1:', tempDir1);
console.log('  Dir 2:', tempDir2);

// Teste 1: Carregar de tempDir1
console.log('\n--- Teste 1: Carregar de tempDir1 ---');
const originalCwd = process.cwd();
process.chdir(tempDir1);

const rules1 = loadProjectRules.load();
console.log('process.cwd():', process.cwd());
console.log('Source:', rules1.source);
console.log('Path:', rules1.path);
console.log('Content preview:', rules1.content.substring(0, 50) + '...');

if (rules1.content.includes('dir 1 rules')) {
    console.log('✓ Carregou regras corretas do diretório 1');
} else {
    console.log('✗ Erro: não carregou as regras corretas');
}

// Teste 2: Carregar de tempDir2
console.log('\n--- Teste 2: Carregar de tempDir2 ---');
process.chdir(tempDir2);

const rules2 = loadProjectRules.load();
console.log('process.cwd():', process.cwd());
console.log('Source:', rules2.source);
console.log('Path:', rules2.path);
console.log('Content preview:', rules2.content.substring(0, 50) + '...');

if (rules2.content.includes('dir 2 rules')) {
    console.log('✓ Carregou regras corretas do diretório 2');
} else {
    console.log('✗ Erro: não carregou as regras corretas');
}

// Teste 3: Voltar ao diretório original
console.log('\n--- Teste 3: Voltar ao diretório original ---');
process.chdir(originalCwd);

const rules3 = loadProjectRules.load();
console.log('process.cwd():', process.cwd());
console.log('Source:', rules3.source);
console.log('Path:', rules3.path);

if (rules3.source === 'code-dir') {
    console.log('✓ Voltou a carregar do diretório original');
} else {
    console.log('✗ Erro: não voltou ao diretório original');
}

// Limpeza
console.log('\n=== Limpeza ===');
process.chdir(originalCwd);
if (fs.existsSync(tempDir1)) {
    fs.rmSync(tempDir1, { recursive: true, force: true });
    console.log('Diretório removido:', tempDir1);
}
if (fs.existsSync(tempDir2)) {
    fs.rmSync(tempDir2, { recursive: true, force: true });
    console.log('Diretório removido:', tempDir2);
}

console.log('\n=== Testes concluídos ===');
