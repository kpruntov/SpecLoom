import { GraphDatabase } from '../../infrastructure/sqlite/GraphDatabase.js';
import { NodeType } from '../domain/SpecNode.js';

export interface ValidationReport {
  status: 'PASS' | 'FAIL' | 'WARN';
  orphans: string[];
  brokenLinks: string[];
}

/**
 * Validates the logical integrity of the specification graph.
 * @trace FR-015 (Integrity Engine)
 * @trace FR-009 (Traceability)
 */
export class SemanticValidator {
  constructor(private db: GraphDatabase) {}

  public validate(): ValidationReport {
    const orphans: string[] = [];
    const brokenLinks: string[] = [];
    
    const nodeIds = this.db.getAllNodeIds();
    const links = this.db.getAllLinks();
    
    // Check for broken links (target does not exist)
    for (const link of links) {
      if (!nodeIds.includes(link.target_id)) {
        brokenLinks.push(`${link.source_id} -> ${link.target_id}`);
      }
    }

    // Check for Task Cycles (DAG Validation)
    // Fetch all execution tasks
    // We can't query by type easily via public API, so we scan all nodes or use direct DB access?
    // DB Access is cleaner if we had it.
    // SpecNode content is stringified JSON.
    // Let's iterate all nodes for now (inefficient but safe).
    const taskGraph = new Map<string, string[]>();
    for (const id of nodeIds) {
        const node = this.db.getNode(id);
        if (node && node.type === 'execution_task') {
            const content = node.content;
            if (content.dependencies && Array.isArray(content.dependencies)) {
                taskGraph.set(id, content.dependencies);
            }
        }
    }
    
    // DFS Cycle Detect
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const detectCycle = (nodeId: string, path: string[]): string | null => {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);

        const deps = taskGraph.get(nodeId) || [];
        for (const depId of deps) {
            if (!visited.has(depId)) {
                const cycle = detectCycle(depId, path);
                if (cycle) return cycle;
            } else if (recursionStack.has(depId)) {
                return [...path, depId].join(' -> ');
            }
        }

        recursionStack.delete(nodeId);
        path.pop();
        return null;
    };

    for (const taskId of taskGraph.keys()) {
        if (!visited.has(taskId)) {
            const cyclePath = detectCycle(taskId, []);
            if (cyclePath) {
                brokenLinks.push(`CYCLE DETECTED: ${cyclePath}`);
            }
        }
    }

    // Check for orphans and satisfaction
    for (const id of nodeIds) {
      const node = this.db.getNode(id);
      if (!node) continue;

      // 1. Check for Unsatisfied Requirements (No children/implementation)
      const mustBeSatisfied = [NodeType.BUSINESS_RULE, NodeType.USER_REQUIREMENT, NodeType.FUNCTIONAL_REQUIREMENT];
      if (mustBeSatisfied.includes(node.type as any)) {
          const children = this.db.getTraceSources(id);
          if (children.length === 0) {
              orphans.push(`${id} (Unsatisfied)`);
          }
      }

      // Root types don't need parents
      const rootTypes = [
        NodeType.CONTEXT, 
        NodeType.STAKEHOLDER, 
        NodeType.USER_CHAR, 
        NodeType.BUSINESS_RULE, 
        NodeType.NON_FUNCTIONAL_REQUIREMENT, 
        NodeType.CONSTRAINT, 
        NodeType.ASSUMPTION,
        NodeType.SYSTEM_REQUIREMENT,
        NodeType.REFERENCE_SOURCE
      ];

      if (rootTypes.includes(node.type as any)) {
        continue;
      }

      const parents = this.db.getTraceTargets(id);
      if (parents.length === 0) {
        orphans.push(id);
      } else if (node.type === NodeType.USER_REQUIREMENT) {
          // Strict Lineage Check for UR: A UR MUST be realized by a Functional Chain (FCHAIN)
          const children = this.db.getTraceSources(id);
          const childNodes = children.map(cid => this.db.getNode(cid));
          const hasFCHAIN = childNodes.some(c => c && c.type === NodeType.FUNCTIONAL_CHAIN);

          if (!hasFCHAIN) {
              orphans.push(`${id} (Lacks Design Proof: No Functional Chain)`);
          }
      } else if (node.type === NodeType.FUNCTIONAL_REQUIREMENT) {
          // Strict Lineage Check: An FR must come from a Driver (UR, BR, NFR, CON)
          const parentNodes = parents.map(pid => this.db.getNode(pid));
          const hasDriver = parentNodes.some(p => 
              p && [NodeType.USER_REQUIREMENT, NodeType.BUSINESS_RULE, NodeType.NON_FUNCTIONAL_REQUIREMENT, NodeType.CONSTRAINT].includes(p.type as any)
          );
          
          if (!hasDriver) {
              orphans.push(`${id} (Lacks Driver: UR/BR/NFR/CON)`);
          }

          // Check for Hollow Requirements (No Design Trace) - TASK-040 & TASK-085
          // We check if any incoming edge is from a Design node (API, DATA, ADR, execution_task)
          const children = this.db.getTraceSources(id);
          const childNodes = children.map(cid => this.db.getNode(cid));
          const hasDesignTrace = childNodes.some(c => 
             c && [NodeType.API_CONTRACT, NodeType.LOGICAL_COMPONENT, NodeType.PHYSICAL_COMPONENT, NodeType.FUNCTIONAL_CHAIN, NodeType.DATA_MODEL, NodeType.ADR, NodeType.EXECUTION_TASK].includes(c.type as any)
          );
          
          if (!hasDesignTrace) {
              orphans.push(`${id} (Hollow: No Design Trace)`);
          }

          // Check for Untested Requirements (No Verification Plan) - TASK-039 & TASK-085
          const hasVerification = childNodes.some(c => 
             c && ['test_scenario', 'verification'].includes(c.type)
          ) || node.content.trace_to?.verification_plans?.length > 0; // Fallback to explicit list if any

          if (!hasVerification) {
              orphans.push(`${id} (Untested: No Verification Plan)`);
          }
      }
    }

    const status = (orphans.length > 0 || brokenLinks.length > 0) ? 'FAIL' : 'PASS';

    return {
      status,
      orphans,
      brokenLinks
    };
  }
}
