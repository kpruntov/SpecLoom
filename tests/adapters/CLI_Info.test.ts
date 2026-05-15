import { execSync } from 'child_process';
import { join } from 'path';

const CLI_PATH = join(process.cwd(), 'dist/adapters/cli/index.js');

describe('CLI Info Command', () => {
    const runCLI = (args: string) => {
        try {
            return execSync(`node ${CLI_PATH} ${args}`, { stdio: 'pipe' }).toString();
        } catch (e: any) {
            return e.stdout?.toString() + e.stderr?.toString();
        }
    };

    it('should output tool configuration', () => {
        const output = runCLI('info');
        console.log(output);
        
        expect(output).toContain('--- SpecLoom Environment ---');
        expect(output).toContain('Project Root:');
        expect(output).toContain('Database:');
        expect(output).toContain('.spec/graph.db');
    });
});
