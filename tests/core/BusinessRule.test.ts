import { SemanticValidator } from '../../src/core/engine/SemanticValidator.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync } from 'fs';

const DB_PATH = '.spec/test_br.db';

describe('Business Rule Validation', () => {
    let db: GraphDatabase;
    let validator: SemanticValidator;

    beforeAll(() => {
        if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
        db = new GraphDatabase(DB_PATH);
        validator = new SemanticValidator(db);
    });

    afterAll(() => {
        db.close();
        if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
    });

    beforeEach(() => {
        db['db'].prepare('DELETE FROM nodes').run();
        db['db'].prepare('DELETE FROM links').run();
    });

    it('should pass if BR is linked to an FR', () => {
        db.upsertNode(new SpecNode('BR-001', NodeType.BUSINESS_RULE, { id: 'BR-001' }));
        db.upsertNode(new SpecNode('FR-001', NodeType.FUNCTIONAL_REQUIREMENT, { 
            id: 'FR-001',
            trace_to: {
                design_nodes: ['VIEW-001'],
                verification_plans: ['SCN-001']
            }
        }));
        // Satisfy FR with a Task
        db.upsertNode(new SpecNode('TASK-001', NodeType.EXECUTION_TASK, { id: 'TASK-001' }));
        // Provide Design Trace proof for FR (Hollow requirement check)
        db.upsertNode(new SpecNode('FCHAIN-001', NodeType.FUNCTIONAL_CHAIN, { id: 'FCHAIN-001' }));
        // Provide Verification Trace proof for FR (Untested check)
        db.upsertNode(new SpecNode('SCN-001', NodeType.TEST_SCENARIO, { id: 'SCN-001' }));

        // Link FR -> BR
        db.addLink('FR-001', 'BR-001', 'requirements'); 
        // Link TASK -> FR
        db.addLink('TASK-001', 'FR-001', 'requirements');
        // Link FCHAIN -> FR
        db.addLink('FCHAIN-001', 'FR-001', 'requirements');
        // Link SCN -> FR
        db.addLink('SCN-001', 'FR-001', 'requirements');

        const report = validator.validate();
        expect(report.status).toBe('PASS');
    });

    it('should warn/fail if BR is orphan (no children implementing it)', () => {
        db.upsertNode(new SpecNode('BR-001', NodeType.BUSINESS_RULE, { id: 'BR-001' }));
        // No FR links to it.

        const report = validator.validate();
        // Since BR is a root type, it doesn't need parents.
        // But it should have children (implementation or FR).
        // Current validator checks parents.
        // We need to implement check for children for BRs? 
        // "Orphans" usually means "No Parents".
        // A BR without an implementation is a "Unsatisfied Requirement".
        // Let's expect 'WARN' or 'FAIL' depending on logic.
        // I will implement logic to check "Unsatisfied BR".
        
        // For now, let's see current behavior. BR is root type, so it passes orphan check.
        // But we want to fail if it is unused.
        expect(report.orphans).toContain('BR-001 (Unsatisfied)');
    });
});
