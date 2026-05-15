import { SummaryGenerator } from '../../src/core/use-cases/SummaryGenerator';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase';
import { SpecNode } from '../../src/core/domain/SpecNode';
import { jest } from '@jest/globals';

describe('SummaryGenerator', () => {
    let mockDb: any;
    let summaryGenerator: SummaryGenerator;

    beforeEach(() => {
        mockDb = {
            getNode: jest.fn(),
            getTraceTargets: jest.fn(),
        };
        summaryGenerator = new SummaryGenerator(mockDb as unknown as GraphDatabase);
    });

    it('should handle highly interconnected DAG without exponential explosion or memory crash', () => {
        // Create a DAG structure that would cause exponential explosion if sets are cloned.
        const nodes: Record<string, SpecNode> = {
            'TASK-001': { id: 'TASK-001', type: 'execution_task', content: { title: 'Task 1' } } as SpecNode,
            'FR-001': { id: 'FR-001', type: 'functional_requirement', content: { title: 'FR 1' } } as SpecNode,
            'FR-002': { id: 'FR-002', type: 'functional_requirement', content: { title: 'FR 2' } } as SpecNode,
            'UR-001': { id: 'UR-001', type: 'user_requirement', content: { title: 'UR 1' } } as SpecNode,
            'UR-002': { id: 'UR-002', type: 'user_requirement', content: { title: 'UR 2' } } as SpecNode,
            'STK-001': { id: 'STK-001', type: 'stakeholder', content: { title: 'STK 1' } } as SpecNode,
        };

        const edges: Record<string, string[]> = {
            'TASK-001': ['FR-001', 'FR-002'],
            'FR-001': ['UR-001', 'UR-002'],
            'FR-002': ['UR-001', 'UR-002'],
            'UR-001': ['STK-001'],
            'UR-002': ['STK-001'],
            'STK-001': []
        };

        mockDb.getNode.mockImplementation((id: string) => nodes[id]);
        mockDb.getTraceTargets.mockImplementation((id: string) => edges[id] || []);

        const result = summaryGenerator.getThreadSummary('TASK-001');
        expect(result).not.toBeNull();
        
        let stk001Count = 0;
        let emptyStk001Count = 0;

        const countNodes = (node: any) => {
            if (node.nodeId === 'STK-001') {
                if (node.status === '[Already Shown]') {
                    emptyStk001Count++;
                } else {
                    stk001Count++;
                }
            }
            if (node.children) {
                node.children.forEach(countNodes);
            }
        };

        countNodes(result);
        
        // STK-001 is reached fully once, and as an empty node once (under the second UR visited from FR-001).
        // Under FR-002, the URs themselves will be marked as [Already Shown] and won't even expand to STK-001.
        expect(stk001Count).toBe(1);
        expect(emptyStk001Count).toBe(1);
    });
});
