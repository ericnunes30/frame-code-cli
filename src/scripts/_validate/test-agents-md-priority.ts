/**
 * Script de teste para validar a prioridade de carregamento de AGENTS.md
 * 
 * Este script testa:
 * 1. Prioridade .code/AGENTS.md > AGENTS.md na raiz
 * 2. Criação de arquivos temporários para teste
 * 3. Verificação de qual arquivo é carregado
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadProjectRules } from '../../agent-runtime/context/project-rules/loader';

console.log('=== Teste de Prioridade de AGENTS.md ===\n');

// Criar diretórios temporários
const tempDir = path.join(process.cwd(), 'test-agents-md-temp');
const codeDir = path.join(tempDir, '.code');
const codeDirAgentsMd = path.join(codeDir, 'AGENTS.md');
const rootAgentsMd = path.join(tempDir, 'AGENTS.md');

// Criar diretórios
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}
if (!fs.existsSync(codeDir)) {
    fs.mkdirSync(codeDir, { recursive: true });
}

// Teste 1: Apenas AGENTS.md na raiz
console.log('--- Teste 1: Apenas AGENTS.md na raiz ---');
fs.writeFileSync(rootAgentsMd, '# Root Rules\n\nThese are root rules.\n');
console.log('Arquivo criado:', rootAgentsMd);

// Mudar para diretório temporário
const originalCwd = process.cwd();
process.chdir(tempDir);

const rules1 = loadProjectRules.load();
console.log('Source:', rules1.source);
console.log('Path:', rules1.path);
if (rules1.source === 'root') {
    console.log('✓ Prioridade correta: AGENTS.md na raiz carregado');
} else {
    console.log('✗ Erro: deveria carregar da raiz');
}

// Teste 2: Ambos .code/AGENTS.md e AGENTS.md na raiz
console.log('\n--- Teste 2: Ambos .code/AGENTS.md e AGENTS.md na raiz ---');
fs.writeFileSync(codeDirAgentsMd, '# Code Dir Rules\n\nThese are .code/ rules.\n');
console.log('Arquivo criado:', codeDirAgentsMd);

const rules2 = loadProjectRules.load();
console.log('Source:', rules2.source);
console.log('Path:', rules2.path);
if (rules2.source === 'code-dir') {
    console.log('✓ Prioridade correta: .code/AGENTS.md carregado (prioridade 1)');
} else {
    console.log('✗ Erro: deveria carregar de .code/');
}

// Teste 3: Apenas .code/AGENTS.md
console.log('\n--- Teste 3: Apenas .code/AGENTS.md ---');
if (fs.existsSync(rootAgentsMd)) {
    fs.unlinkSync(rootAgentsMd);
    console.log('Arquivo removido:', rootAgentsMd);
}

const rules3 = loadProjectRules.load();
console.log('Source:', rules3.source);
console.log('Path:', rules3.path);
if (rules3.source === 'code-dir') {
    console.log('✓ Prioridade correta: .code/AGENTS.md carregado');
} else {
    console.log('✗ Erro: deveria carregar de .code/');
}

// Teste 4: Nenhum AGENTS.md
console.log('\n--- Teste 4: Nenhum AGENTS.md ---');
if (fs.existsSync(codeDirAgentsMd)) {
    fs.unlinkSync(codeDirAgentsMd);
    console.log('Arquivo removido:', codeDirAgentsMd);
}

const rules4 = loadProjectRules.load();
console.log('Source:', rules4.source);
console.log('Path:', rules4.path);
console.log('Content length:', rules4.content.length);
if (rules4.source === 'none' && rules4.content === '') {
    console.log('✓ Comportamento correto: nenhum arquivo encontrado, retorna vazio');
} else {
    console.log('✗ Erro: deveria retornar source: none e content vazio');
}

// Teste 5: loadFromDirectory
console.log('\n--- Teste 5: loadFromDirectory ---');
fs.writeFileSync(codeDirAgentsMd, '# Code Dir Rules\n\nThese are .code/ rules.\n');
const dirContent = loadProjectRules.loadFromDirectory(codeDir);
console.log('Content from directory:', dirContent.substring(0, 50) + '...');
if (dirContent.includes('Code Dir Rules')) {
    console.log('✓ loadFromDirectory carregou corretamente');
} else {
    console.log('✗ Erro ao carregar de diretório');
}

// Restaurar diretório original
process.chdir(originalCwd);

// Limpeza
console.log('\n=== Limpeza ===');
if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('Diretório temporário removido:', tempDir);
}

console.log('\n=== Testes concluídos ===');
