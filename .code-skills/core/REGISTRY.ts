import * as fs from 'fs';
import * as path from 'path';

export interface SkillSummary {
  name: string;
  description: string;
  path?: string;
}

/**
 * Lista as skills encontradas em `.code-skills`.
 * Retorna somente name e description (e path relativo).
 */
export function listSkills(skillsDir?: string): SkillSummary[] {
  const base = skillsDir || path.join(process.cwd(), '.code-skills');
  if (!fs.existsSync(base)) return [];

  const items = fs.readdirSync(base, { withFileTypes: true });
  const results: SkillSummary[] = [];

  for (const it of items) {
    try {
      if (it.isDirectory()) {
        const skillPath = path.join(base, it.name, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          const summary = parseSkillFrontmatter(skillPath);
          if (summary) {
            summary.path = path.relative(process.cwd(), skillPath);
            results.push(summary);
          }
        }
      } else if (it.isFile() && it.name.endsWith('.md')) {
        const skillPath = path.join(base, it.name);
        const summary = parseSkillFrontmatter(skillPath);
        if (summary) {
          summary.path = path.relative(process.cwd(), skillPath);
          results.push(summary);
        }
      }
    } catch (err) {
      // ignore single-file errors
    }
  }

  return results;
}

function parseSkillFrontmatter(filePath: string): SkillSummary | null {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) return null;
  if (lines[0].trim() !== '---') return null;

  let fm = '';
  let i = 1;
  for (; i < lines.length; i++) {
    if (lines[i].trim() === '---') break;
    fm += lines[i] + '\n';
  }

  const nameMatch = fm.match(/^\s*name:\s*(.+)$/m);
  const descMatch = fm.match(/^\s*description:\s*(.+)$/m);
  if (!nameMatch) return null;
  const name = nameMatch[1].trim();
  const description = descMatch ? descMatch[1].trim() : '';
  return { name, description };
}

// Permite execução direta para debug
if (require.main === module) {
  const out = listSkills();
  console.log(out);
}
