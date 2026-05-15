import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';

describe('SpecNode', () => {
  it('should create a valid SpecNode', () => {
    const node = new SpecNode(
      'CTX-001',
      NodeType.CONTEXT,
      { description: 'Test context' }
    );
    expect(node.id).toBe('CTX-001');
    expect(node.type).toBe(NodeType.CONTEXT);
    expect(node.content).toEqual({ description: 'Test context' });
    expect(node.hash).toBeDefined();
  });

  it('should throw error for invalid ID format', () => {
    expect(() => {
      new SpecNode('invalid-id', NodeType.CONTEXT, {});
    }).toThrow('Invalid ID format');
  });

  it('should generate different hashes for different content', () => {
    const node1 = new SpecNode('CTX-001', NodeType.CONTEXT, { val: 1 });
    const node2 = new SpecNode('CTX-001', NodeType.CONTEXT, { val: 2 });
    expect(node1.hash).not.toBe(node2.hash);
  });
});
