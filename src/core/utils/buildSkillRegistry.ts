import { SkillManager } from 'frame-agent-sdk';
import { logger } from '../services/logger';
import { SkillLoader } from './skillLoader';

export async function buildSkillRegistry(): Promise<SkillManager> {
  const skillManager = new SkillManager();
  try {
    const skillLoader = new SkillLoader();
    const skills = await skillLoader.loadAllSkills();
    logger.info(`Skill registry built with ${skills.length} skills`);
  } catch (error) {
    logger.error('Failed to build skill registry:', error);
  }
  return skillManager;
}