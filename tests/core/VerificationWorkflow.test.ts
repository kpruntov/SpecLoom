
import { SpecEngine } from '../../src/core/engine/SpecEngine.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';

describe('Verification Workflow', () => {
  const dbPath = 'test_verify.db';
  const repoPath = 'test_verify_repo';
  let db: GraphDatabase;
  let engine: SpecEngine;

  beforeEach(() => {
    if (existsSync(dbPath)) unlinkSync(dbPath);
    if (existsSync(repoPath)) rmSync(repoPath, { recursive: true });
    mkdirSync(repoPath);
    
    db = new GraphDatabase(dbPath);
    engine = new SpecEngine(repoPath, db);

    // Seed SCNs
    db.upsertNode(new SpecNode('SCN-001', NodeType.TEST_SCENARIO, { id: 'SCN-001', last_run_status: 'Pass' }));
    db.upsertNode(new SpecNode('SCN-002', NodeType.TEST_SCENARIO, { id: 'SCN-002', last_run_status: 'Fail' }));
    db.upsertNode(new SpecNode('SCN-003', NodeType.TEST_SCENARIO, { id: 'SCN-003' })); // Untested
  });

  afterEach(() => {
    db.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
    if (existsSync(repoPath)) rmSync(repoPath, { recursive: true });
  });

  test('getVerificationStats returns coverage summary', async () => {
    const stats = await engine.getVerificationStats();
    
    expect(stats.total).toBe(3);
    expect(stats.passed).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.untested).toBe(1);
    expect(stats.pending_scenarios).toHaveLength(2);
  });
});
