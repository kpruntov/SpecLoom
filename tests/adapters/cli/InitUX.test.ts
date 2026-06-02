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
        expect(result.message).toBe('SpecLoom initialized successfully.');
        expect(existsSync(join(testDir, '.spec'))).toBe(true);
        expect(existsSync(join(testDir, '.spec/data/06_execution'))).toBe(true);
    });
});