import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync } from 'fs';

describe('GraphDatabase', () => {
  const dbPath = 'test_graph.db';
  let db: GraphDatabase;

  beforeEach(() => {
    if (existsSync(dbPath)) unlinkSync(dbPath);
    db = new GraphDatabase(dbPath);
  });

  afterEach(() => {
    db.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  it('should upsert and retrieve a node', () => {
    const node = new SpecNode('STK-001', NodeType.STAKEHOLDER, { name: 'Alice' });
    db.upsertNode(node);
    
    const retrieved = db.getNode('STK-001');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('STK-001');
    expect(retrieved?.content.name).toBe('Alice');
  });

  it('should manage trace links', () => {
    const node1 = new SpecNode('UR-001', NodeType.USER_REQUIREMENT, {});
    const node2 = new SpecNode('FR-001', NodeType.FUNCTIONAL_REQUIREMENT, {});
    db.upsertNode(node1);
    db.upsertNode(node2);
    
    db.addLink('FR-001', 'UR-001', 'satisfies');
    
    const targets = db.getTraceTargets('FR-001');
    expect(targets).toContain('UR-001');
    
    const sources = db.getTraceSources('UR-001');
    expect(sources).toContain('FR-001');
  });
});
