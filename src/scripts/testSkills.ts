import { SkillLoader } from '../core/skillLoader';
import { logger } from '../core/logger';

/**
 * Script para testar se o prompt está sendo construído corretamente com as skills.
 * 
 * Uso: npm run script:test-skills
 */
async function run() {
  try {
    logger.info('=== Skills Integration Script ===');
    logger.info('');

    // 1. Carregar todas as skills disponíveis
    logger.info('1. Loading all available skills from .code-skills/');
    const skillLoader = new SkillLoader();
    const allSkills = await skillLoader.loadAllSkills();
    
    if (allSkills.length === 0) {
      logger.warn('No skills found!');
      return;
    }

    logger.info(`✓ Loaded ${allSkills.length} skills:`);
    allSkills.forEach(skill => {
      const charCount = skill.instructions.length;
      logger.info(`  - ${skill.name} (${charCount} chars)`);
    });
    logger.info('');

    // 2. Demonstrar acesso via SkillManager
    logger.info('2. Accessing skills via SkillManager');
    const skillManager = skillLoader.getSkillManager();
    const managedSkills = skillManager.getAllSkills();
    logger.info(`✓ SkillManager has ${managedSkills.length} skills registered`);
    logger.info('');

    // 3. Demonstrar seleção manual (como a app faria)
    logger.info('3. Manual skill selection (example for application)');
    const selectedSkills = allSkills.filter(s => 
      ['solid-principles', 'testing-patterns'].includes(s.name)
    );
    logger.info(`✓ Selected ${selectedSkills.length} skills for prompt:`);
    selectedSkills.forEach(skill => {
      logger.info(`  - ${skill.name}`);
    });
    logger.info('');

    // 4. Demonstrar formatação para prompt
    logger.info('4. Skills formatted for LLM prompt:');
    logger.info('');
    const formattedSkills = skillManager.formatSkillsForPrompt(selectedSkills);
    logger.info(formattedSkills);
    logger.info('');

    // 5. Estatísticas
    logger.info('5. Statistics:');
    const totalChars = selectedSkills.reduce((sum, s) => sum + s.instructions.length, 0);
    logger.info(`  Total characters in selected skills: ${totalChars}`);
    logger.info(`  Estimated tokens (÷4): ~${Math.ceil(totalChars / 4)}`);
    logger.info('');

    logger.info('=== Script completed successfully ===');
  } catch (error) {
    logger.error('Script failed:', error);
    process.exit(1);
  }
}

run();
