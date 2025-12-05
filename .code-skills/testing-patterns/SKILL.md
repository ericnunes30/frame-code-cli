---
name: testing-patterns
description: Padrões e boas práticas para testes de software
keywords: [test, testing, unit, integration, e2e, mock, stub, tdd, bdd, coverage, assertion, framework, jest, mocha, chai]
---

# Padrões e Boas Práticas para Testes

Siga estas práticas ao escrever testes:

## Tipos de Testes

1. **Testes Unitários**
   - Testam unidades individuais de código (funções, métodos, classes)
   - Devem ser rápidos e isolados
   - Use mocks e stubs para isolar dependências

2. **Testes de Integração**
   - Testam a interação entre componentes
   - Verificam se módulos funcionam bem juntos
   - Menos mocks, mais componentes reais

3. **Testes E2E (End-to-End)**
   - Testam o fluxo completo da aplicação
   - Simulam interações reais do usuário
   - Mais lentos e frágeis, mas cobrem cenários reais

## Boas Práticas

- **AAA Pattern**: Arrange, Act, Assert
- **Given-When-Then** para estruturar testes
- **Testes independentes** que podem ser executados em qualquer ordem
- **Nomes descritivos** que indicam o que está sendo testado
- **Cobertura adequada** (>80% recomendado, mas qualidade > quantidade)
- **Evite testes frágeis** que quebram com mudanças menores
