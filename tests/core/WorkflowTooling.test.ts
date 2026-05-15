import { WorkflowService } from '../../src/core/use-cases/WorkflowService.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

describe('WorkflowService', () => {
  const dbPath = 'test_workflow.db';
  const repoPath = 'test_workflow_repo';
  let db: GraphDatabase;
  let service: WorkflowService;

  beforeEach(() => {
    // Setup DB
    if (existsSync(dbPath)) unlinkSync(dbPath);
    db = new GraphDatabase(dbPath);

    // Setup FS
    if (existsSync(repoPath)) rmSync(repoPath, { recursive: true });
    mkdirSync(repoPath);

    // Seed DB with a Task and linked FR
    const frNode = new SpecNode('FR-001', NodeType.FUNCTIONAL_REQUIREMENT, { 
      id: 'FR-001', 
      title: 'Login',
      description: 'User must login.' 
    });
    
    const taskNode = new SpecNode('TASK-101', NodeType.EXECUTION_TASK, { 
      id: 'TASK-101', 
      title: 'Implement Login',
      trace_to: { requirements: ['FR-001'] }
    });

    db.upsertNode(frNode);
    db.upsertNode(taskNode);
    db.addLink('TASK-101', 'FR-001', 'traces_to');

    service = new WorkflowService(db, repoPath);
  });

  afterEach(() => {
    db.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
    if (existsSync(repoPath)) rmSync(repoPath, { recursive: true });
  });

  describe('loom context', () => {
    it('should retrieve a context bundle for a task', async () => {
      const bundle = await service.getContextBundle('TASK-101');
      
      expect(bundle).toBeDefined();
      expect(bundle.task.id).toBe('TASK-101');
      expect(bundle.requirements).toHaveLength(1);
      expect(bundle.requirements[0].id).toBe('FR-001');
      expect(bundle.requirements[0].title).toBe('Login');
    });

    it('should throw error if task not found', async () => {
      await expect(service.getContextBundle('TASK-999')).rejects.toThrow('Task TASK-999 not found');
    });
  });

  describe('loom start', () => {
    it('should create a lock file for the task', async () => {
      await service.startTask('TASK-101');
      const lockFile = join(repoPath, '.spec', '.lock');
      expect(existsSync(lockFile)).toBe(true);
    });

    it('should resume session if task is already active', async () => {
      await service.startTask('TASK-101');
      // Should not throw, but resume
      await expect(service.startTask('TASK-101')).resolves.not.toThrow();
    });

    it('should switch active context if another task is started', async () => {
      await service.startTask('TASK-101');
      
      const otherTask = new SpecNode('TASK-102', NodeType.EXECUTION_TASK, { id: 'TASK-102' });
      db.upsertNode(otherTask);
      
      // Should not throw, but switch context
      await expect(service.startTask('TASK-102')).resolves.not.toThrow();
      
      const lockContent = JSON.parse(readFileSync(join(repoPath, '.spec', '.lock'), 'utf-8'));
      expect(lockContent.taskId).toBe('TASK-102');
    });
  });

  describe('loom complete', () => {
    it('should remove the lock file', async () => {
      await service.startTask('TASK-101');
      await service.completeTask('TASK-101');
      const lockFile = join(repoPath, '.spec', '.lock');
      expect(existsSync(lockFile)).toBe(false);
    });

    it('should fail if completing wrong task', async () => {
      await service.startTask('TASK-101');
      // Create a fake other task node
       const otherTask = new SpecNode('TASK-102', NodeType.EXECUTION_TASK, { id: 'TASK-102' });
       db.upsertNode(otherTask);
       
      await expect(service.completeTask('TASK-102')).rejects.toThrow('Locked by TASK-101');
    });
  });
});
