import { InitService } from '../../../src/core/use-cases/InitService.js';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('InitService UX', () => {
    const testDir = join(process.cwd(), 'test_init_ux_env');

    beforeEach(() => {
        if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
    });

    it('should create basic structure on init', async () => {
        const initService = new InitService(testDir);
        // Mocking the prompt to return false for Simple Mode if no args
        // Or just pass boolean false
        const result = await initService.init(undefined, false);
        expect(result.message).toBe('SpecLoom initialized successfully. Your first task is TASK-000.');
        expect(existsSync(join(testDir, '.spec'))).toBe(true);
        expect(existsSync(join(testDir, '.spec/data/06_execution'))).toBe(true);
    });

    it('should generate Hello World task in simple mode', async () => {
        const initService = new InitService(testDir);
        const result = await initService.init(undefined, true);
        expect(result.message).toContain('TASK-000');
        
        const helloTaskPath = join(testDir, '.spec/data/06_execution/task_000_hello_world.json');
        expect(existsSync(helloTaskPath)).toBe(true);

        const taskContent = JSON.parse(readFileSync(helloTaskPath, 'utf-8'));
        expect(taskContent.id).toBe('TASK-000');
        expect(taskContent.title).toBe('Hello World: Your First Task');
    });
});