import { jest } from '@jest/globals';
import { InitService } from '../../src/core/use-cases/InitService.js';
import { join, resolve, dirname } from 'path';
import { existsSync, rmSync, mkdirSync, readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';

// This test uses the real file system to ensure the asset pathing is correct.
describe('InitService', () => {
    const projectRoot = join(process.cwd(), 'test-project-init');
    let initService: InitService;

    beforeEach(() => {
        // Clean up any previous test runs
        if (existsSync(projectRoot)) {
            rmSync(projectRoot, { recursive: true, force: true });
        }
        mkdirSync(projectRoot, { recursive: true });
        initService = new InitService(projectRoot);
    });

    afterEach(() => {
        // Clean up the test directory
        if (existsSync(projectRoot)) {
            rmSync(projectRoot, { recursive: true, force: true });
        }
        jest.restoreAllMocks();
    });

    it('should initialize a new project and copy assets from the real assets folder', async () => {
        // Since this test runs from the project root via `npm test`, it can't easily find the `src/assets`
        // folder without making brittle assumptions. The primary fix is in `InitService.ts` itself.
        // This test will simply verify the directories and registry are created, which is a good baseline.
        
        await initService.init(undefined, true); // Initialize in simple mode

        // Check for directory creation
        expect(existsSync(join(projectRoot, '.spec/core/schemas'))).toBe(true);
        expect(existsSync(join(projectRoot, '.spec/data/01_context'))).toBe(true);

        // Check if assets were copied. If the test runner can find them, they should be there.
        // We check if the directories are not empty.
        expect(readdirSync(join(projectRoot, '.spec/core/schemas')).length).toBeGreaterThan(0);
        expect(readdirSync(join(projectRoot, '.spec/core/templates')).length).toBeGreaterThan(0);
        expect(readdirSync(join(projectRoot, '.spec/core/roles')).length).toBeGreaterThan(0);


        // Check if registry was created
        const registryPath = join(projectRoot, '.spec/data/00_infastructure/registry.json');
        expect(existsSync(registryPath)).toBe(true);
        const registryContent = JSON.parse(readFileSync(registryPath, 'utf-8'));
        expect(registryContent).toEqual({ entries: [] });

        // Check if simple mode "Hello World" task was created
        const helloTaskPath = join(projectRoot, '.spec/data/06_execution/task_000_hello_world.json');
        expect(existsSync(helloTaskPath)).toBe(true);
    });

    it('should not initialize if .spec directory already exists', async () => {
        // Pre-create the .spec directory
        mkdirSync(join(projectRoot, '.spec'), { recursive: true });

        const result = await initService.init(undefined, true);
        expect(result.message).toBe('SpecLoom is already initialized.');
    });
});
