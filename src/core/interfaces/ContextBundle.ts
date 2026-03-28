import { SpecNode } from '../domain/SpecNode.js';

export interface FutureTaskSummary {
    id: string;
    title: string;
    status: string;
}

export interface ContextBundle {
    task: SpecNode;
    graph: SpecNode[];
    files: Record<string, string>;
    future_tasks: FutureTaskSummary[];
}
