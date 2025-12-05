"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSkills = listSkills;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function listSkills(skillsDir) {
    const base = skillsDir || path.join(process.cwd(), '.code-skills');
    if (!fs.existsSync(base))
        return [];
    const items = fs.readdirSync(base, { withFileTypes: true });
    const results = [];
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
            }
            else if (it.isFile() && it.name.endsWith('.md')) {
                const skillPath = path.join(base, it.name);
                const summary = parseSkillFrontmatter(skillPath);
                if (summary) {
                    summary.path = path.relative(process.cwd(), skillPath);
                    results.push(summary);
                }
            }
        }
        catch (err) {
        }
    }
    return results;
}
function parseSkillFrontmatter(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    if (lines.length === 0)
        return null;
    if (lines[0].trim() !== '---')
        return null;
    let fm = '';
    let i = 1;
    for (; i < lines.length; i++) {
        if (lines[i].trim() === '---')
            break;
        fm += lines[i] + '\n';
    }
    const nameMatch = fm.match(/^\s*name:\s*(.+)$/m);
    const descMatch = fm.match(/^\s*description:\s*(.+)$/m);
    if (!nameMatch)
        return null;
    const name = nameMatch[1].trim();
    const description = descMatch ? descMatch[1].trim() : '';
    return { name, description };
}
if (require.main === module) {
    const out = listSkills();
    console.log(out);
}
