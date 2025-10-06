#!/bin/bash

# Script para testar o CLI do frame_agent_cli

echo "=== Testando CLI do Frame Agent ==="

# Testar ajuda
echo
echo "1. Testando comando de ajuda:"
node dist/index.js --help

# Testar comandos disponíveis
echo
echo "2. Testando comandos disponíveis:"
node dist/index.js help

# Testar comando chat
echo
echo "3. Testando comando chat (help):"
node dist/index.js chat --help

# Testar comando react
echo
echo "4. Testando comando react (help):"
node dist/index.js react --help

# Testar comando plan
echo
echo "5. Testando comando plan (help):"
node dist/index.js plan --help

echo
echo "=== Fim dos testes ==="