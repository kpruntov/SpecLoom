
import { SpecEngine } from '../../src/core/engine/SpecEngine.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';

describe('Task Listing', () => {
  const dbPath = 'test_listing.db';
  const repoPath = 'test_listing_repo';
  let db: GraphDatabase;
  let engine: SpecEngine;

  beforeEach(() => {
    if (existsSync(dbPath)) unlinkSync(dbPath);
    if (existsSync(repoPath)) rmSync(repoPath, { recursive: true });
    mkdirSync(repoPath);
    
    db = new GraphDatabase(dbPath);
    engine = new SpecEngine(repoPath, db);

    // Seed tasks
    db.upsertNode(new SpecNode('TASK-001', NodeType.EXECUTION_TASK, { id: 'TASK-001', status: 'Pending', priority: 10 }));
    db.upsertNode(new SpecNode('TASK-002', NodeType.EXECUTION_TASK, { id: 'TASK-002', status: 'Pending', priority: 20 }));
    db.upsertNode(new SpecNode('TASK-003', NodeType.EXECUTION_TASK, { id: 'TASK-003', status: 'Done', priority: 30 }));
  });

  afterEach(() => {
    db.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
    if (existsSync(repoPath)) rmSync(repoPath, { recursive: true });
  });

  test('getPendingTasks can return list of all pending tasks', async () => {
    const result = engine.getPendingTasks(true); // Pass true for list mode
    
    expect(result.status).toBe('task');
    expect(result.tasks).toBeDefined();
    expect(result.tasks).toHaveLength(2);
    
    // Check sorting (Priority DESC)
    expect(result.tasks[0].id).toBe('TASK-002');
    expect(result.tasks[1].id).toBe('TASK-001');
  });
  
  test('getPendingTasks preserves legacy behavior (single task)', async () => {
    const result = engine.getPendingTasks(); // Default false
    
    expect(result.status).toBe('task');
    expect(result.task).toBeDefined();
    expect(result.task.id).toBe('TASK-002');
    expect(result.tasks).toBeUndefined();
  });
});
