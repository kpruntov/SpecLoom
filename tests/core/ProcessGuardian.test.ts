import { ProcessGuardian } from '../../src/core/engine/ProcessGuardian.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync } from 'fs';

const DB_PATH = '.spec/test_guardian.db';

describe('ProcessGuardian', () => {
    let db: GraphDatabase;
    let guardian: ProcessGuardian;

    beforeAll(() => {
        if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
        db = new GraphDatabase(DB_PATH);
        guardian = new ProcessGuardian(db);
    });

    afterAll(() => {
        db.close();
        if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
    });

    beforeEach(() => {
        db['db'].prepare('DELETE FROM nodes').run();
        db['db'].prepare('DELETE FROM links').run();
    });

    describe('checkGate', () => {
        it('should block if a Process Task for the phase is Pending', () => {
            // Setup: SYS-DEFINE requirement
            db.upsertNode(new SpecNode('SYS-DEFINE', NodeType.SYSTEM_REQUIREMENT, { id: 'SYS-DEFINE', phase: 'Define' }));
            
            // Setup: Process Task linking to SYS-DEFINE
            db.upsertNode(new SpecNode('TASK-001', NodeType.EXECUTION_TASK, { 
                id: 'TASK-001', 
                type: 'Process', 
                status: 'Pending',
                trace_to: { system_requirements: ['SYS-DEFINE'] }
            }));
            
            db.addLink('TASK-001', 'SYS-DEFINE', 'system_requirements');

            const result = guardian.checkGate('Define');
            expect(result.status).toBe('BLOCKED');
            expect(result.blockingTasks).toContain('TASK-001');
        });

        it('should pass if all Process Tasks for the phase are Done', () => {
            // Setup: SYS-DEFINE requirement
            db.upsertNode(new SpecNode('SYS-DEFINE', NodeType.SYSTEM_REQUIREMENT, { id: 'SYS-DEFINE', phase: 'Define' }));
            
            // Setup: Process Task DONE
            db.upsertNode(new SpecNode('TASK-001', NodeType.EXECUTION_TASK, { 
                id: 'TASK-001', 
                type: 'Process', 
                status: 'Done',
                trace_to: { system_requirements: ['SYS-DEFINE'] }
            }));
            
            db.addLink('TASK-001', 'SYS-DEFINE', 'system_requirements');

            const result = guardian.checkGate('Define');
            expect(result.status).toBe('PASS');
            expect(result.blockingTasks).toHaveLength(0);
        });

        it('should pass if there are no Process Tasks for the phase', () => {
            // Setup: SYS-DEFINE requirement but no tasks
            db.upsertNode(new SpecNode('SYS-DEFINE', NodeType.SYSTEM_REQUIREMENT, { id: 'SYS-DEFINE', phase: 'Define' }));
            
            const result = guardian.checkGate('Define');
            expect(result.status).toBe('PASS');
        });
    });

    describe('checkTaskExecutionGate', () => {
        it('should block if an upstream node is Modified and return a Process Task', () => {
            db.upsertNode(new SpecNode('FR-001', NodeType.FUNCTIONAL_REQUIREMENT, { id: 'FR-001', handshake_state: 'Modified' }));
            db.upsertNode(new SpecNode('TASK-100', NodeType.EXECUTION_TASK, { id: 'TASK-100', status: 'Pending', trace_to: { functional_requirements: ['FR-001'] } }));
            db.addLink('TASK-100', 'FR-001', 'functional_requirements');

            const result = guardian.checkTaskExecutionGate('TASK-100');
            expect(result.blocked).toBe(true);
            expect(result.processTask).toBeDefined();
            expect(result.processTask?.type).toBe('Process');
            expect(result.processTask?.id).toContain('SYS-PROCESS');
            expect(result.processTask?.title).toContain('Acknowledge Modification');
            expect(result.processTask?.dependencies).toContain('TASK-100');
        });

        it('should pass if no upstream nodes are Modified', () => {
            db.upsertNode(new SpecNode('UR-001', NodeType.USER_REQUIREMENT, { id: 'UR-001', handshake_state: 'Agreed' }));
            db.upsertNode(new SpecNode('FR-001', NodeType.FUNCTIONAL_REQUIREMENT, { id: 'FR-001', trace_to: { user_requirements: ['UR-001'] } }));
            db.addLink('FR-001', 'UR-001', 'user_requirements');
            db.upsertNode(new SpecNode('TASK-100', NodeType.EXECUTION_TASK, { id: 'TASK-100', status: 'Pending', trace_to: { functional_requirements: ['FR-001'] } }));
            db.addLink('TASK-100', 'FR-001', 'functional_requirements');

            const result = guardian.checkTaskExecutionGate('TASK-100');
            expect(result.blocked).toBe(false);
            expect(result.processTask).toBeUndefined();
        });
    });
});
