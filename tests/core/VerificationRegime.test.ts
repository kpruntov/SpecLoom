import { WorkflowService } from '../../src/core/use-cases/WorkflowService.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('Verification Regime Enforcement', () => {
    const dbPath = 'test_verification.db';
    let db: GraphDatabase;
    let service: WorkflowService;
    const lockPath = join(process.cwd(), '.spec', '.lock');

    beforeEach(() => {
        if (existsSync(dbPath)) unlinkSync(dbPath);
        db = new GraphDatabase(dbPath);
        service = new WorkflowService(db, process.cwd());
    });

    afterEach(() => {
        db.close();
        if (existsSync(dbPath)) unlinkSync(dbPath);
        if (existsSync(lockPath)) unlinkSync(lockPath);
    });

    it('should move to Review status on complete if regime is Manual', async () => {
        const taskId = 'TASK-901';
        const task = new SpecNode(taskId, NodeType.EXECUTION_TASK, {
            status: 'In Progress',
            verification_regime: 'Manual',
            trace_to: { requirements: ['FR-001'] }
        });
        db.upsertNode(task);
        
        // Mock lock
        writeFileSync(lockPath, JSON.stringify({ taskId, timestamp: Date.now() }));

        await service.completeTask(taskId);

        const updated = db.getNode(taskId);
        expect(updated?.content.status).toBe('Review');
    });

    it('should move to Done status on approve', async () => {
        const taskId = 'TASK-902';
        const task = new SpecNode(taskId, NodeType.EXECUTION_TASK, {
            status: 'Review',
            verification_regime: 'Manual',
            trace_to: { requirements: ['FR-001'] }
        });
        db.upsertNode(task);

        await service.approveTask(taskId, 'ReviewerAgent');

        const updated = db.getNode(taskId);
        expect(updated?.content.status).toBe('Done');
    });
});
