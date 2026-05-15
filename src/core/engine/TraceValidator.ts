import { GraphDatabase } from '../../infrastructure/sqlite/GraphDatabase.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface ValidationReport {
  status: 'PASS' | 'FAIL' | 'WARN';
  orphans: string[];
}

/**
 * Validates that implemented code contains mandatory trace annotations.
 * @trace FR-009 (Traceability)
 * @trace FR-015 (Integrity Engine)
 */
export class TraceValidator {
    constructor(
        private db: GraphDatabase,
        private projectRoot: string
    ) {}

    public async validate(): Promise<ValidationReport> {
        const orphans: string[] = [];
        
        // Find tasks requiring strict tracing
        const stmt = this.db['db'].prepare("SELECT * FROM nodes WHERE type = 'execution_task'");
        const rows = stmt.all() as any[];

        for (const row of rows) {
            const content = JSON.parse(row.content);
            
            // Only check Done/Verified tasks
            if (content.status !== 'Done' && content.status !== 'Verified') continue;
            
            // Check compliance flag
            if (!content.compliance?.strict_trace) continue;

            const implFile = content.tdd_cycle?.implementation_file;
            if (!implFile) {
                // If strict trace is on but no file defined, that's a metadata error?
                // Or maybe the task didn't require code. 
                // Let's assume if strict_trace is true, code IS expected.
                orphans.push(`${content.id} (Missing implementation_file definition)`);
                continue;
            }

            // Get required traces (Linked Requirements)
            // We use DB links 'requirements' type
            // Actually, any upstream requirement should be traced? 
            // Usually 'trace_to.requirements' implies functional reqs.
            // Let's check explicit links.
            const reqIds = this.db.getTraceTargets(content.id);
            // Filter only Requirements (FR, BR, UR, etc - usually FR)
            // Ideally we check what is in content.trace_to.requirements
            // And now also content.trace_to.design_nodes since tasks trace to FCHAIN
            const targetReqs = [
                ...(content.trace_to?.requirements || []),
                ...(content.trace_to?.design_nodes || [])
            ];

            if (targetReqs.length === 0) continue;

            try {
                const fullPath = join(this.projectRoot, implFile);
                if (!existsSync(fullPath)) {
                    orphans.push(`${content.id} (Implementation file not found: ${implFile})`);
                    continue;
                }

                const fileContent = await readFile(fullPath, 'utf-8');
                
                for (const reqId of targetReqs) {
                    if (reqId.startsWith('CON-')) continue;
                    if (!fileContent.includes(`@trace ${reqId}`)) {
                        orphans.push(`${content.id} (Missing Trace: ${reqId})`);
                    }
                }

            } catch (e) {
                orphans.push(`${content.id} (Error reading file: ${e})`);
            }
        }

        return {
            status: orphans.length > 0 ? 'FAIL' : 'PASS',
            orphans
        };
    }
}
