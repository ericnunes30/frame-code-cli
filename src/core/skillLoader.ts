import { ISkill, SkillManager } from 'frame-agent-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

export class SkillLoader {
  private skillManager: SkillManager;
  private skillsDir: string;

  constructor(skillsDir?: string) {
    this.skillsDir = skillsDir || path.join(process.cwd(), '.code-skills');
    this.skillManager = new SkillManager();
  }

  private async loadSkillFromFile(skillPath: string): Promise<ISkill | null> {
    try {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const lines = content.split('\n');
      
      // Parse frontmatter
      if (lines[0].trim() !== '---') {
        throw new Error('Skill file must start with frontmatter delimiter "---"');
      }
      
      let frontmatterEnd = -1;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
          frontmatterEnd = i;
          break;
        }
      }
      
      if (frontmatterEnd === -1) {
        throw new Error('Skill file must have closing frontmatter delimiter "---"');
      }
      
      const frontmatterLines = lines.slice(1, frontmatterEnd);
      const frontmatter: any = {};
      
      frontmatterLines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          if (value.startsWith('[') && value.endsWith(']')) {
            // Array value
            frontmatter[key.trim()] = value.slice(1, -1).split(',').map(item => item.trim().replace(/^['"]|['"]$/g, ''));
          } else {
            // String value
            frontmatter[key.trim()] = value.replace(/^['"]|['"]$/g, '');
          }
        }
      });
      
      // Parse instructions (everything after frontmatter)
      const instructions = lines.slice(frontmatterEnd + 1).join('\n').trim();
      
      const skill: ISkill = {
        name: frontmatter.name,
        description: frontmatter.description,
        keywords: frontmatter.keywords || [],
        instructions
      };
      
      return skill;
    } catch (error) {
      logger.error(`Failed to load skill from ${skillPath}:`, error);
      return null;
    }
  }

  private async loadSkillsFromDirectory(): Promise<ISkill[]> {
    const skills: ISkill[] = [];
    
    if (!fs.existsSync(this.skillsDir)) {
      logger.debug(`Skills directory not found: ${this.skillsDir}`);
      return skills;
    }
    
    // Support both folder structure (my-skill/SKILL.md) and flat structure (my-skill.md)
    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Look for SKILL.md inside folder
        const skillMarkdownPath = path.join(this.skillsDir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillMarkdownPath)) {
          const skill = await this.loadSkillFromFile(skillMarkdownPath);
          if (skill) {
            skills.push(skill);
          }
        }
      } else if (entry.name.endsWith('.md') && entry.isFile()) {
        // Support flat structure with markdown files directly
        const skillPath = path.join(this.skillsDir, entry.name);
        const skill = await this.loadSkillFromFile(skillPath);
        if (skill) {
          skills.push(skill);
        }
      }
    }
    
    logger.info(`[SkillLoader] Loaded ${skills.length} skills from ${this.skillsDir}`);
    return skills;
  }

  async loadAllSkills(): Promise<ISkill[]> {
    try {
      const skills = await this.loadSkillsFromDirectory();
      
      // Add all skills to the manager
      for (const skill of skills) {
        this.skillManager.addSkill(skill);
      }
      
      logger.info(`[SkillLoader] Registered ${skills.length} skills to SkillManager`);
      return skills;
    } catch (error) {
      logger.error('[SkillLoader] Failed to load skills:', error);
      return [];
    }
  }

  getSkillManager(): SkillManager {
    return this.skillManager;
  }
}