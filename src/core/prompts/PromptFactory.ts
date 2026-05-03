import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class PromptFactory {
  // Map of commands to their corresponding role and filename
  private commandMap: Record<string, { role: string; file: string }> = {
    init: { role: 'analyst', file: 'procedure_init.md' },
    req: { role: 'analyst', file: 'procedure_req.md' },
    arch: { role: 'architect', file: 'procedure_arch.md' },
    planning: { role: 'planner', file: 'procedure_planning.md' },
    impl: { role: 'developer', file: 'procedure_impl.md' },
    verify: { role: 'verifier', file: 'procedure_verify.md' },
    info: { role: 'master', file: 'procedure_info.md' },
    project: { role: 'analyst', file: 'procedure_project.md' },
    status: { role: 'master', file: 'procedure_status.md' },
    context: { role: 'master', file: 'procedure_context.md' },
    next: { role: 'master', file: 'procedure_next.md' },
    review: { role: 'verifier', file: 'procedure_review.md' },
    load: { role: 'master', file: 'procedure_load.md' },
    handshake: { role: 'master', file: 'procedure_handshake.md' },
    prioritize: { role: 'planner', file: 'procedure_prioritize.md' },
    vision: { role: 'analyst', file: 'procedure_vision.md' },
  };

  public getPrompt(command: string): string {
    const mapping = this.commandMap[command];
    if (!mapping) {
      throw new Error(`Unknown command: ${command}`);
    }

    const { role, file } = mapping;

    // 1. Try to load from project-specific workspace override (.spec/core/roles/)
    const workspacePath = join(process.cwd(), '.spec', 'core', 'roles', role, file);
    if (existsSync(workspacePath)) {
      return readFileSync(workspacePath, 'utf-8');
    }

    // 2. Try to load from built-in assets fallback (relative to __dirname)
    // In compiled output, __dirname is dist/core/prompts, and assets are at dist/assets
    const builtinPath = join(__dirname, '..', '..', 'assets', 'roles', role, file);
    if (existsSync(builtinPath)) {
      return readFileSync(builtinPath, 'utf-8');
    }

    // 3. Fallback for TS-Node execution / test environments where __dirname is src/core/prompts
    const tsNodePath = join(__dirname, '..', '..', 'assets', 'roles', role, file);
    if (existsSync(tsNodePath)) {
      return readFileSync(tsNodePath, 'utf-8');
    }

    throw new Error(`Prompt template not found for command '${command}' in role '${role}'`);
  }
}
