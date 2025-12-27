import * as fs from 'fs';
import * as path from 'path';

export interface ISkillMetadata {
    name: string;
    description: string;
    keywords: string[];
    path: string;
}

export class SkillLoader {
    private skillsDir: string;

    constructor(skillsDir?: string) {
        this.skillsDir = skillsDir || path.join(process.cwd(), '.code');
    }

    private parseSkillFile(filePath: string): ISkillMetadata | null {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');

            // Parse frontmatter simples
            if (lines[0].trim() !== '---') return null;

            const frontmatter: any = {};
            let i = 1;
            for (; i < lines.length; i++) {
                if (lines[i].trim() === '---') break;
                const [key, ...valueParts] = lines[i].split(':');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join(':').trim();
                    // Remover aspas e colchetes básicos
                    const cleanValue = value.replace(/^['"]|['"]$/g, '');

                    if (value.startsWith('[') && value.endsWith(']')) {
                        frontmatter[key.trim()] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
                    } else {
                        frontmatter[key.trim()] = cleanValue;
                    }
                }
            }

            if (!frontmatter.name) return null;

            return {
                name: frontmatter.name,
                description: frontmatter.description || '',
                keywords: frontmatter.keywords || [],
                path: filePath.replace(/\\/g, '/') // Normalizar paths para funcionar em qualquer OS no registro gerado
            };

        } catch (e) {
            console.error(`Erro ao ler skill ${filePath}:`, e);
            return null;
        }
    }

    public loadAllSkills(): ISkillMetadata[] {
        const skills: ISkillMetadata[] = [];
        if (!fs.existsSync(this.skillsDir)) return skills;

        const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const skillPath = path.join(this.skillsDir, entry.name, 'SKILL.md');
                if (fs.existsSync(skillPath)) {
                    const skill = this.parseSkillFile(skillPath);
                    if (skill) skills.push(skill);
                }
            } else if (entry.name.endsWith('.md')) {
                const skillPath = path.join(this.skillsDir, entry.name);
                const skill = this.parseSkillFile(skillPath);
                if (skill) skills.push(skill);
            }
        }
        return skills;
    }
}
