# Skills Registry

Registro de todas as skills disponíveis no projeto.

## Available Skills

### solid-principles
- **Path**: `../solid-principles/SKILL.md`
- **Description**: Princípios SOLID para desenvolvimento OOP
- **Keywords**: class, interface, solid, oop, design, pattern

### testing-patterns
- **Path**: `../testing-patterns/SKILL.md`
- **Description**: Padrões e boas práticas para testes de software
- **Keywords**: test, testing, unit, integration, e2e, mock, stub, tdd, bdd

### test-skill
- **Path**: `../test-skill/SKILL.md`
- **Description**: Skill de teste para verificar o funcionamento do sistema
- **Keywords**: teste, debug, skill, test

---

## How to Use

1. Load all skills: `skillLoader.loadAllSkills()`
2. Get available skills: `skillManager.getAllSkills()`
3. Pass selected skills to prompt builder
4. Format for LLM: `skillManager.formatSkillsForPrompt(selectedSkills)`
