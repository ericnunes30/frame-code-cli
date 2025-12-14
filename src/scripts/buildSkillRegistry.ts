import * as fs from 'fs';
import * as path from 'path';
import { SkillLoader } from '../core/utils/skillLoader';

const GENERATED_DIR = path.join(process.cwd(), 'src', 'generated');
const REGISTRY_FILE = path.join(GENERATED_DIR, 'skillRegistry.ts');

async function build() {
    console.log('Building Skill Registry...');

    if (!fs.existsSync(GENERATED_DIR)) {
        fs.mkdirSync(GENERATED_DIR, { recursive: true });
    }

    const loader = new SkillLoader();
    const skills = loader.loadAllSkills();

    const registryObj: Record<string, any> = {};
    skills.forEach(s => {
        registryObj[s.name] = s;
    });

    const fileContent = `/**
 * ARQUIVO GERADO AUTOMATICAMENTE - NÃO EDITE
 * Gerado por: src/scripts/buildSkillRegistry.ts
 */

export interface ISkillRegistryEntry {
  name: string;
  description: string;
  keywords: string[];
  path: string;
}

export const SKILL_REGISTRY: Record<string, ISkillRegistryEntry> = ${JSON.stringify(registryObj, null, 2)};
`;

    fs.writeFileSync(REGISTRY_FILE, fileContent);
    console.log(`Registry built with ${skills.length} skills in ${REGISTRY_FILE}`);
}

build().catch(console.error);
