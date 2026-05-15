import { TraceValidator } from '../../src/core/engine/TraceValidator.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DB_PATH = '.spec/test_trace_validator.db';
const TEST_ROOT = '.spec/test_trace_root';

describe('TraceValidator', () => {
    let db: GraphDatabase;
    let validator: TraceValidator;

    beforeAll(() => {
        if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
        if (existsSync(TEST_ROOT)) {
             // fs.rmSync(TEST_ROOT, { recursive: true, force: true });
        }
        mkdirSync(TEST_ROOT, { recursive: true });
        
        db = new GraphDatabase(DB_PATH);
        validator = new TraceValidator(db, TEST_ROOT);
    });

    afterAll(() => {
        db.close();
        if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
    });

    beforeEach(() => {
        db['db'].prepare('DELETE FROM nodes').run();
        db['db'].prepare('DELETE FROM links').run();
    });

    it('should fail if implementation file is missing traces', async () => {
        // Setup: FR-001
        db.upsertNode(new SpecNode('FR-001', NodeType.FUNCTIONAL_REQUIREMENT, { id: 'FR-001' }));

        // Setup: Task Done, Strict Trace
        db.upsertNode(new SpecNode('TASK-100', NodeType.EXECUTION_TASK, { 
            id: 'TASK-100', 
            status: 'Done',
            compliance: { strict_trace: true },
            tdd_cycle: { implementation_file: 'src/impl.ts' },
            trace_to: { requirements: ['FR-001'] }
        }));
        db.addLink('TASK-100', 'FR-001', 'requirements');

        // Setup: File without trace
        const filePath = join(TEST_ROOT, 'src/impl.ts');
        mkdirSync(join(TEST_ROOT, 'src'), { recursive: true });
        writeFileSync(filePath, 'console.log("No trace");');

        const report = await validator.validate();
        expect(report.status).toBe('FAIL');
        expect(report.orphans).toContain('TASK-100 (Missing Trace: FR-001)');
    });

    it('should pass if implementation file has traces', async () => {
        // Setup: FR-001
        db.upsertNode(new SpecNode('FR-001', NodeType.FUNCTIONAL_REQUIREMENT, { id: 'FR-001' }));

        // Setup: Task Done
        db.upsertNode(new SpecNode('TASK-100', NodeType.EXECUTION_TASK, { 
            id: 'TASK-100', 
            status: 'Done',
            compliance: { strict_trace: true },
            tdd_cycle: { implementation_file: 'src/impl.ts' },
            trace_to: { requirements: ['FR-001'] }
        }));
        db.addLink('TASK-100', 'FR-001', 'requirements');

        // Setup: File WITH trace
        const filePath = join(TEST_ROOT, 'src/impl.ts');
        writeFileSync(filePath, '/** @trace FR-001 */\nconsole.log("Traced");');

        const report = await validator.validate();
        if (report.status === 'FAIL') console.log(report.orphans);
        expect(report.status).toBe('PASS');
    });

    it('should ignore Constraints (CON-XXX) and not treat them as missing traces', async () => {
        // Setup: CON-001
        db.upsertNode(new SpecNode('CON-001', NodeType.CONSTRAINT, { id: 'CON-001' }));

        // Setup: Task Done tracing to a Constraint
        db.upsertNode(new SpecNode('TASK-101', NodeType.EXECUTION_TASK, { 
            id: 'TASK-101', 
            status: 'Done',
            compliance: { strict_trace: true },
            tdd_cycle: { implementation_file: 'src/impl.ts' },
            trace_to: { requirements: ['CON-001'] }
        }));
        db.addLink('TASK-101', 'CON-001', 'requirements');

        // Setup: File without trace to CON-001
        const filePath = join(TEST_ROOT, 'src/impl.ts');
        mkdirSync(join(TEST_ROOT, 'src'), { recursive: true });
        writeFileSync(filePath, 'console.log("No trace for constraint");');

        const report = await validator.validate();
        if (report.status === 'FAIL') console.log(report.orphans);
        expect(report.status).toBe('PASS');
        expect(report.orphans).not.toContain('TASK-101 (Missing Trace: CON-001)');
    });
});
