import { jest } from '@jest/globals';
import { ScenarioRunner } from '../../src/core/engine/ScenarioRunner.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync } from 'fs';

const DB_PATH = '.spec/test_scenario.db';

describe('ScenarioRunner', () => {
    let db: GraphDatabase;
    let runner: ScenarioRunner;

    beforeAll(() => {
        if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
        db = new GraphDatabase(DB_PATH);
        // Mock CLI interaction interface
        const mockInterface = {
            ask: jest.fn<any>().mockResolvedValue('yes'),
            info: jest.fn(),
            error: jest.fn(),
            success: jest.fn()
        };
        runner = new ScenarioRunner(db, mockInterface as any);
    });

    afterAll(() => {
        db.close();
        if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
    });

    beforeEach(() => {
        db['db'].prepare('DELETE FROM nodes').run();
        // Seed a scenario
        const scenario = {
            id: 'SCN-001',
            title: 'Verify Login',
            steps: [
                { step: 'Open Page', expected_result: 'Page Opens' },
                { step: 'Click Login', expected_result: 'Modal appears' }
            ],
            trace_to: { requirements: ['FR-001'] }
        };
        db.upsertNode(new SpecNode('SCN-001', NodeType.TEST_SCENARIO, scenario));
    });

    it('should load and run a scenario manually', async () => {
        const result = await runner.run('SCN-001');
        expect(result.status).toBe('PASS');
        expect(result.stepsCompleted).toBe(2);
    });

    it('should fail if user reports failure', async () => {
        // Re-init runner with fail mock
        const mockFailInterface = {
            ask: jest.fn<any>().mockResolvedValueOnce('yes').mockResolvedValueOnce('no'),
            info: jest.fn(),
            error: jest.fn(),
            success: jest.fn()
        };
        const failRunner = new ScenarioRunner(db, mockFailInterface as any);
        
        const result = await failRunner.run('SCN-001');
        expect(result.status).toBe('FAIL');
        expect(result.stepsCompleted).toBe(1);
    });

    it('should throw if scenario not found', async () => {
        await expect(runner.run('SCN-999')).rejects.toThrow();
    });
});
