import { SemanticValidator } from '../../src/core/engine/SemanticValidator.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync } from 'fs';

describe('SemanticValidator', () => {
  const dbPath = 'test_semantic.db';
  let db: GraphDatabase;
  let validator: SemanticValidator;

  beforeEach(() => {
    if (existsSync(dbPath)) unlinkSync(dbPath);
    db = new GraphDatabase(dbPath);
    validator = new SemanticValidator(db);
  });

  afterEach(() => {
    db.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  it('should detect orphan nodes', () => {
    const node = new SpecNode('FR-001', NodeType.FUNCTIONAL_REQUIREMENT, {});
    db.upsertNode(node);
    
    const report = validator.validate();
    expect(report.orphans).toContain('FR-001');
  });

  it('should detect broken links', () => {
    const node = new SpecNode('FR-001', NodeType.FUNCTIONAL_REQUIREMENT, {});
    db.upsertNode(node);
    // Link to non-existent UR-001
    db.addLink('FR-001', 'UR-001', 'satisfies');
    
    const report = validator.validate();
    expect(report.brokenLinks).toContain('FR-001 -> UR-001');
  });
});
