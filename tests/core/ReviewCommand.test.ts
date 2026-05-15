
import { SpecEngine } from '../../src/core/engine/SpecEngine.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';

describe('Review Command', () => {
  const dbPath = 'test_review.db';
  const repoPath = 'test_review_repo';
  let db: GraphDatabase;
  let engine: SpecEngine;

  beforeEach(() => {
    if (existsSync(dbPath)) unlinkSync(dbPath);
    if (existsSync(repoPath)) rmSync(repoPath, { recursive: true });
    mkdirSync(repoPath);
    
    db = new GraphDatabase(dbPath);
    engine = new SpecEngine(repoPath, db);

    // Seed tasks
    db.upsertNode(new SpecNode('TASK-001', NodeType.EXECUTION_TASK, { id: 'TASK-001', status: 'Review', title: 'Task 1' }));
    db.upsertNode(new SpecNode('TASK-002', NodeType.EXECUTION_TASK, { id: 'TASK-002', status: 'Pending', title: 'Task 2' }));
    db.upsertNode(new SpecNode('TASK-003', NodeType.EXECUTION_TASK, { id: 'TASK-003', status: 'Review', title: 'Task 3' }));
  });

  afterEach(() => {
    db.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
    if (existsSync(repoPath)) rmSync(repoPath, { recursive: true });
  });

  test('getReviewTasks returns only tasks in Review status', async () => {
    // We expect getReviewTasks to be available on engine
    const tasks = engine.getReviewTasks();
    
    expect(tasks).toHaveLength(2);
    const ids = tasks.map((t: any) => t.id).sort();
    expect(ids).toEqual(['TASK-001', 'TASK-003']);
  });
});
