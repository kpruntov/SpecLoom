import { ContextBundleService } from '../../src/core/use-cases/ContextBundleService.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DB_PATH = '.spec/test_bundle.db';
const TEST_ROOT = '.spec/test_workspace';

describe('ContextBundleService', () => {
    let db: GraphDatabase;
    let service: ContextBundleService;

    beforeAll(() => {
        if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
        if (existsSync(TEST_ROOT)) {
             // recursive delete manually or assume clean env.
             // fs.rmSync(TEST_ROOT, { recursive: true, force: true });
        }
        mkdirSync(TEST_ROOT, { recursive: true });
        
        db = new GraphDatabase(DB_PATH);
        service = new ContextBundleService(db, TEST_ROOT);
    });

    afterAll(() => {
        db.close();
        if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
        // Clean up test root?
    });

    beforeEach(() => {
        db['db'].prepare('DELETE FROM nodes').run();
        db['db'].prepare('DELETE FROM links').run();
    });

    it('should assemble a complete execution bundle', async () => {
        // 1. Setup Graph
        // TASK-100 -> FR-001 -> UR-001
        const task = new SpecNode('TASK-100', NodeType.EXECUTION_TASK, {
            id: 'TASK-100',
            context: { relevant_files: ['src/main.ts'] }
        });
        const fr = new SpecNode('FR-001', NodeType.FUNCTIONAL_REQUIREMENT, { id: 'FR-001' });
        const ur = new SpecNode('UR-001', NodeType.USER_REQUIREMENT, { id: 'UR-001' });

        db.upsertNode(task);
        db.upsertNode(fr);
        db.upsertNode(ur);

        // Link: Task depends on FR (trace_to)
        // Link: FR depends on UR
        db.addLink('TASK-100', 'FR-001', 'requirements');
        db.addLink('FR-001', 'UR-001', 'user_requirements');

        // 2. Setup File
        const filePath = join(TEST_ROOT, 'src/main.ts');
        mkdirSync(join(TEST_ROOT, 'src'), { recursive: true });
        writeFileSync(filePath, 'console.log("Hello");');

        // 3. Execute
        const bundle = await service.getBundle('TASK-100');

        // 4. Verify
        expect(bundle.task.id).toBe('TASK-100');
        
        // Graph should contain upstream nodes
        const ids = bundle.graph.map(n => n.id);
        expect(ids).toContain('FR-001');
        expect(ids).toContain('UR-001');
        
        // Files should be inline
        expect(bundle.files['src/main.ts']).toBe('console.log("Hello");');
    });

    it('should throw if task does not exist', async () => {
        await expect(service.getBundle('TASK-999')).rejects.toThrow();
    });
});
