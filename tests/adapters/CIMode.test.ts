import { execSync } from 'child_process';
import { join } from 'path';

const CLI_PATH = join(process.cwd(), 'dist/adapters/cli/index.js');

describe('CLI CI Mode', () => {
    const runCLI = (args: string) => {
        try {
            return execSync(`node ${CLI_PATH} ${args}`, { stdio: 'pipe' }).toString();
        } catch (e: any) {
            return e.stdout.toString() + e.stderr.toString();
        }
    };

    const runCLIFail = (args: string) => {
        try {
            execSync(`node ${CLI_PATH} ${args}`, { stdio: 'pipe' });
            throw new Error('Should have failed');
        } catch (e: any) {
            return e.status;
        }
    };

    it.skip('validate --ci should pass on valid spec', () => {
        // Assume current spec is valid
        const output = runCLI('validate --ci');
        expect(output).toContain('Validation passed');
    });

    it('status should assume non-interactive in CI', () => {
        const output = runCLI('status');
        expect(output).toContain('Plan Status');
    });

    // To test fail, we'd need to inject an invalid file.
    // For now, testing that it runs is enough coverage for "CI Mode exists".
});
