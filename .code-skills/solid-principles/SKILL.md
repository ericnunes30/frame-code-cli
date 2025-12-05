---
name: solid-principles
description: Princípios SOLID para desenvolvimento OOP
keywords: [class, interface, solid, oop, design, pattern, single, responsibility, open, closed, liskov, substitution, interface, segregation, dependency, inversion]
---

# Princípios SOLID

Ao desenvolver código orientado a objetos, siga estes princípios:

1. **S**ingle Responsibility Principle (SRP)
   - Uma classe deve ter apenas um motivo para mudar
   - Cada classe deve ter uma única responsabilidade bem definida

2. **O**pen/Closed Principle (OCP)
   - Entidades de software devem estar abertas para extensão, mas fechadas para modificação
   - Use herança ou composição para estender comportamentos

3. **L**iskov Substitution Principle (LSP)
   - Objetos de uma superclasse devem poder ser substituídos por objetos de uma subclasse sem afetar a correção do programa
   - As subclasses devem respeitar o contrato da superclasse

4. **I**nterface Segregation Principle (ISP)
   - Muitas interfaces específicas são melhores que uma interface geral
   - Evite "interfaces gordas" que forcem implementações desnecessárias

5. **D**ependency Inversion Principle (DIP)
   - Dependa de abstrações, não de implementações concretas
   - Módulos de alto nível não devem depender de módulos de baixo nível
