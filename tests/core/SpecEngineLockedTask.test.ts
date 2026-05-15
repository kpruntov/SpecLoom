import { SpecEngine } from '../../src/core/engine/SpecEngine.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('SpecEngine - Locked Tasks', () => {
  const dbPath = 'test_engine_locked.db';
  let db: GraphDatabase;
  let engine: SpecEngine;

  beforeEach(() => {
    if (existsSync(dbPath)) unlinkSync(dbPath);
    db = new GraphDatabase(dbPath);
    // We pass process.cwd() but we won't use sync(), so it doesn't matter much.
    engine = new SpecEngine(process.cwd(), db);
  });

  afterEach(() => {
    db.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  it('should filter out locked tasks from pending tasks list', async () => {
    // 1. Create a task that is Pending and NOT locked
    const taskContent = {
        title: 'Test Task',
        status: 'Pending',
        priority: 10
    };
    const taskNode = new SpecNode('TASK-999', NodeType.EXECUTION_TASK, taskContent);
    db.upsertNode(taskNode);

    // 2. Verify it shows up
    let tasks = engine.getPendingTasks(true).tasks || [];
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe('TASK-999');

    // 3. Lock the task
    const lockedContent = {
        ...taskContent,
        lock: { user: 'user1', timestamp: Date.now() }
    };
    const lockedNode = new SpecNode('TASK-999', NodeType.EXECUTION_TASK, lockedContent);
    db.upsertNode(lockedNode);

    // 4. Verify it is now HIDDEN
    tasks = engine.getPendingTasks(true).tasks || [];
    expect(tasks.length).toBe(0);
  });

  it('should filter out In Progress tasks if they are locked', async () => {
      // Even if In Progress, if it's locked, we assume it's taken by another agent.
      // (Unless we pass a user ID, which we don't currently support in getPendingTasks)
      
      const taskContent = {
          title: 'In Progress Task',
          status: 'In Progress',
          lock: { user: 'user1', timestamp: Date.now() }
      };
      const taskNode = new SpecNode('TASK-888', NodeType.EXECUTION_TASK, taskContent);
      db.upsertNode(taskNode);
  
      const tasks = engine.getPendingTasks(true).tasks || [];
      expect(tasks.length).toBe(0);
    });
});
