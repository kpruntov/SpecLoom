import { ContextSlicer } from '../../src/core/engine/ContextSlicer.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { unlinkSync, existsSync } from 'fs';

const DB_PATH = '.spec/test_slice.db';

describe('ContextSlicer', () => {
    let db: GraphDatabase;
    let slicer: ContextSlicer;

    beforeAll(() => {
        if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
        db = new GraphDatabase(DB_PATH);
        slicer = new ContextSlicer(db);
    });

    afterAll(() => {
        db.close();
        if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
    });

    beforeEach(() => {
        db['db'].prepare('DELETE FROM nodes').run();
        db['db'].prepare('DELETE FROM links').run();
        
        // Seed Graph
        // 001 -> 002 -> 003
        // 001 -> 004
        // 005 (Disconnected)
        const n = (id: string) => new SpecNode(id, NodeType.FUNCTIONAL_REQUIREMENT, { id });
        db.upsertNode(n('FR-001'));
        db.upsertNode(n('FR-002'));
        db.upsertNode(n('FR-003'));
        db.upsertNode(n('FR-004'));
        db.upsertNode(n('FR-005'));

        db.addLink('FR-001', 'FR-002', 'trace');
        db.addLink('FR-002', 'FR-003', 'trace');
        db.addLink('FR-001', 'FR-004', 'trace');
    });

    it('should retrieve node and immediate neighbors (depth 1)', () => {
        const result = slicer.slice('FR-002', 1);
        expect(result.nodes.map(n => n.id)).toContain('FR-002');
        expect(result.nodes.map(n => n.id)).toContain('FR-001'); // Parent (incoming)
        expect(result.nodes.map(n => n.id)).toContain('FR-003'); // Child (outgoing)
        expect(result.nodes.map(n => n.id)).not.toContain('FR-004'); // Sibling
    });

    it('should retrieve extended neighborhood (depth 2)', () => {
        const result = slicer.slice('FR-003', 2);
        expect(result.nodes.map(n => n.id)).toContain('FR-003');
        expect(result.nodes.map(n => n.id)).toContain('FR-002');
        expect(result.nodes.map(n => n.id)).toContain('FR-001'); // Grandparent
    });

    it('should handle disconnected nodes', () => {
        const result = slicer.slice('FR-005', 1);
        expect(result.nodes).toHaveLength(1);
        expect(result.nodes[0]!.id).toBe('FR-005');
    });
});
