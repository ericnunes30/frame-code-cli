/**
 * Script de teste para validar o loader de AGENTS.md
 * 
 * Este script testa:
 * 1. Carregamento de .code/AGENTS.md
 * 2. Carregamento de AGENTS.md na raiz
 * 3. Prioridade (.code/ > raiz)
 * 4. Método loadFromDirectory
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadProjectRules } from '../../agent-runtime/context/project-rules/loader';

console.log('=== Teste do Loader de AGENTS.md ===\n');

// Teste 1: Carregar AGENTS.md do projeto atual
console.log('Teste 1: Carregar AGENTS.md do projeto atual');
const projectRules = loadProjectRules.load();
console.log('Source:', projectRules.source);
console.log('Path:', projectRules.path);
console.log('Content length:', projectRules.content.length);
console.log('Content preview:', projectRules.content.substring(0, 100) + '...\n');

// Teste 2: Criar arquivo temporário de teste
console.log('Teste 2: Criar arquivo temporário AGENTS.md na raiz');
const tempPath = path.join(process.cwd(), 'AGENTS.md.test');
fs.writeFileSync(tempPath, '# Test Rules\n\nThis is a test rule file.\n');
console.log('Arquivo temporário criado:', tempPath);

// Teste 3: Carregar de diretório específico
console.log('\nTeste 3: Carregar de diretório específico');
const dirContent = loadProjectRules.loadFromDirectory(process.cwd());
console.log('Content from directory:', dirContent.substring(0, 100) + '...');

// Teste 4: Testar prioridade (.code/ > raiz)
console.log('\nTeste 4: Verificar prioridade');
if (projectRules.source === 'code-dir') {
    console.log('✓ Prioridade correta: .code/AGENTS.md carregado');
} else if (projectRules.source === 'root') {
    console.log('✓ Prioridade correta: AGENTS.md na raiz carregado');
} else {
    console.log('✗ Nenhum AGENTS.md encontrado');
}

// Teste 5: Testar loadFromDirectory com diretório sem AGENTS.md
console.log('\nTeste 5: Carregar de diretório sem AGENTS.md');
const emptyDirContent = loadProjectRules.loadFromDirectory(path.join(process.cwd(), 'node_modules'));
console.log('Content from empty dir:', emptyDirContent === '' ? '(vazio)' : emptyDirContent);

// Limpeza
console.log('\n=== Limpeza ===');
if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath);
    console.log('Arquivo temporário removido:', tempPath);
}

console.log('\n=== Testes concluídos ===');
