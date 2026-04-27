import { mkdirSync, writeFileSync, existsSync, cpSync, readdirSync, readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

export class InitService {
    constructor(private projectRoot: string) {}

    /**
     * @trace TASK-068
     */
    public async init() {
        const specDir = join(this.projectRoot, '.spec');
        if (existsSync(specDir)) {
            return { message: 'SpecLoom is already initialized.' };
        }

        // Create Directory Structure
        const dirs = [
            '.spec/core',
            '.spec/data/00_infastructure',
            '.spec/data/01_context',
            '.spec/data/02_pivots',
            '.spec/data/03_users',
            '.spec/data/04_system',
            '.spec/data/05_design',
            '.spec/data/06_execution'
        ];

        dirs.forEach(d => mkdirSync(join(this.projectRoot, d), { recursive: true }));

        // Copy Assets (Schemas & Templates) from Package Distribution
        // Robustly find the assets directory relative to the current file.
        // This works for both distributed (`dist`) and development (`src`) structures.
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const assetsDir = resolve(__dirname, '../../assets');
        
        if (existsSync(assetsDir)) {
             cpSync(join(assetsDir, 'schemas'), join(this.projectRoot, '.spec/core/schemas'), { recursive: true });
             cpSync(join(assetsDir, 'templates'), join(this.projectRoot, '.spec/core/templates'), { recursive: true });
             cpSync(join(assetsDir, 'protocol'), join(this.projectRoot, '.spec/core/protocol'), { recursive: true });
        } else {
             console.warn(`Warning: Could not find assets directory to scaffold .spec/core. Looked in: ${assetsDir}`);
             // Create empty dirs as fallback
             mkdirSync(join(this.projectRoot, '.spec/core/schemas'), { recursive: true });
             mkdirSync(join(this.projectRoot, '.spec/core/templates'), { recursive: true });
             mkdirSync(join(this.projectRoot, '.spec/core/protocol'), { recursive: true });
        }

        // Create Registry
        const registry = { entries: [] };
        writeFileSync(join(this.projectRoot, '.spec/data/00_infastructure/registry.json'), JSON.stringify(registry, null, 2));

        // Bootstrap SYS-DEFINE (System Requirement for Process Tasks)
        const sysDefine = {
            id: "SYS-DEFINE",
            type: "system_requirement",
            title: "Process Definition",
            description: "The system must follow the SpecLoom V-Model process."
        };
        writeFileSync(join(this.projectRoot, '.spec/data/00_infastructure/sys_define.json'), JSON.stringify(sysDefine, null, 2));

        // Bootstrap Meta-Tasks from templates
        const bootstrappedTasksDir = join(assetsDir, 'templates/tasks/bootstrapped');
        if (existsSync(bootstrappedTasksDir)) {
            const files = readdirSync(bootstrappedTasksDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const taskContent = JSON.parse(readFileSync(join(bootstrappedTasksDir, file), 'utf-8'));
                    writeFileSync(
                        join(this.projectRoot, '.spec/data/06_execution', file),
                        JSON.stringify(taskContent, null, 2)
                    );
                }
            }
        }

        // Create a welcoming "Hello World" task.
        const helloTask = {
            id: "TASK-000",
            title: "Hello World: Your First Task",
            type: "Process",
            routine: "Manual",
            status: "Pending",
            description: "Welcome to SpecLoom! This is a simple task to get you started. To complete it, run 'loom start TASK-000' and then 'loom complete TASK-000'.",
            dependencies: [],
            priority: 0,
            execution_steps: [
                "Run 'loom start TASK-000'",
                "Run 'loom complete TASK-000'"
            ],
            definition_of_done: [
                "Task is marked as 'Done'."
            ],
            trace_to: {
                "system_requirements": ["SYS-DEFINE"]
            }
        };
        writeFileSync(join(this.projectRoot, '.spec/data/06_execution/task_000_hello_world.json'), JSON.stringify(helloTask, null, 2));
        
        return { message: 'SpecLoom initialized successfully. Your first task is TASK-000.' };
    }
}
