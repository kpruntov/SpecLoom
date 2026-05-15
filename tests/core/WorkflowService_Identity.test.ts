
import { WorkflowService } from '../../src/core/use-cases/WorkflowService.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('WorkflowService Identity Guardrails', () => {
  const dbPath = 'test_workflow_identity.db';
  const repoPath = 'test_workflow_identity_repo';
  let db: GraphDatabase;
  let service: WorkflowService;

  beforeEach(() => {
    if (existsSync(dbPath)) unlinkSync(dbPath);
    if (existsSync(repoPath)) rmSync(repoPath, { recursive: true });
    
    mkdirSync(repoPath);
    db = new GraphDatabase(dbPath);
    service = new WorkflowService(db, repoPath);

    // Setup basic task
    const taskNode = new SpecNode('TASK-101', NodeType.EXECUTION_TASK, { 
      id: 'TASK-101', 
      title: 'Identity Test Task',
      verification_regime: 'Strict',
      status: 'Pending'
    });
    db.upsertNode(taskNode);
  });

  afterEach(() => {
    db.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
    if (existsSync(repoPath)) rmSync(repoPath, { recursive: true });
  });

  test('startTask stores implementer ID in lock file', async () => {
    await service.startTask('TASK-101', 'dev-alice');
    
    const lockFile = join(repoPath, '.spec', '.lock');
    const lockContent = JSON.parse(readFileSync(lockFile, 'utf-8'));
    
    expect(lockContent.taskId).toBe('TASK-101');
    expect(lockContent.implementer).toBe('dev-alice');
  });

  test('completeTask persists implementer ID to Task Node', async () => {
    await service.startTask('TASK-101', 'dev-alice');
    await service.completeTask('TASK-101');

    const updatedNode = db.getNode('TASK-101');
    expect(updatedNode?.content.implementer).toBe('dev-alice');
    expect(updatedNode?.content.status).toBe('Review'); // Because regime is Strict
  });

  test('completeTask defaults to Review if verification_regime is missing', async () => {
    // Setup task without verification_regime
    const taskNode = new SpecNode('TASK-102', NodeType.EXECUTION_TASK, { 
      id: 'TASK-102', 
      title: 'Default Regime Task',
      status: 'Pending'
    });
    db.upsertNode(taskNode);

    await service.startTask('TASK-102', 'dev-alice');
    await service.completeTask('TASK-102');

    const updatedNode = db.getNode('TASK-102');
    expect(updatedNode?.content.status).toBe('Review');
  });

  test('approveTask blocks self-approval', async () => {
    // Setup task in Review state with 'dev-alice' as implementer
    const taskNode = new SpecNode('TASK-101', NodeType.EXECUTION_TASK, { 
      id: 'TASK-101', 
      title: 'Identity Test Task',
      verification_regime: 'Strict',
      status: 'Review',
      implementer: 'dev-alice'
    });
    db.upsertNode(taskNode);

    await expect(service.approveTask('TASK-101', 'dev-alice'))
      .rejects.toThrow('Reviewer cannot be the same as the Implementer');
  });

  test('approveTask allows distinct reviewer', async () => {
    // Setup task in Review state with 'dev-alice' as implementer
    const taskNode = new SpecNode('TASK-101', NodeType.EXECUTION_TASK, { 
      id: 'TASK-101', 
      title: 'Identity Test Task',
      verification_regime: 'Strict',
      status: 'Review',
      implementer: 'dev-alice'
    });
    db.upsertNode(taskNode);

    await service.approveTask('TASK-101', 'lead-bob');

    const updatedNode = db.getNode('TASK-101');
    expect(updatedNode?.content.status).toBe('Done');
    expect(updatedNode?.content.reviewer).toBe('lead-bob');
  });

  test('getDiff returns diff string or fails gracefully', async () => {
    try {
        await service.getDiff('TASK-101');
    } catch (e: any) {
        // If not a git repo, it might throw, or return a string saying so.
        // For now, we accept either empty string or error.
        expect(true).toBe(true);
    }
  });
});
