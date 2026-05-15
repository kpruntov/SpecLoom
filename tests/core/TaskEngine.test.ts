import { SpecEngine } from '../../src/core/engine/SpecEngine.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';

// Mock GraphDB
const DB_PATH = '.spec/test_graph.db';

describe('TaskEngine (Loom Next Logic)', () => {
    let db: GraphDatabase;
    let engine: SpecEngine;

    beforeAll(() => {
        if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
        db = new GraphDatabase(DB_PATH);
        engine = new SpecEngine(process.cwd(), db);
    });

    afterAll(() => {
        db.close();
        if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
    });

    beforeEach(() => {
        // Clear nodes
        db['db'].prepare('DELETE FROM nodes').run();
        db['db'].prepare('DELETE FROM links').run();
    });

    const createTask = (id: string, status: string, priority: number = 0, parent?: string, deps: string[] = []) => {
        const content = {
            id,
            status,
            priority,
            parent_task_id: parent,
            dependencies: deps,
            type: 'Feature', // Content type
            title: `Task ${id}`,
            trace_to: { requirements: ['FR-001'] },
            execution_steps: [],
            definition_of_done: []
        };
        const node = new SpecNode(id, NodeType.EXECUTION_TASK, content);
        db.upsertNode(node);
    };

    it('should return unblocked pending tasks sorted by priority', () => {
        createTask('TASK-001', 'Pending', 10);
        createTask('TASK-002', 'Pending', 20); // High Priority
        createTask('TASK-003', 'Done', 0);

        const tasks = engine.getPendingTasks(true).tasks || [];
        expect(tasks.length).toBe(2);
        expect(tasks[0].id).toBe('TASK-002');
        expect(tasks[1].id).toBe('TASK-001');
    });

    it('should prioritize In Progress tasks over Pending', () => {
        createTask('TASK-001', 'Pending', 100);
        createTask('TASK-002', 'In Progress', 10); 

        const tasks = engine.getPendingTasks(true).tasks || [];
        expect(tasks[0].id).toBe('TASK-002');
    });

    it('should block task if parent is not Done', () => {
        createTask('TASK-100', 'Pending', 0);
        createTask('TASK-101', 'Pending', 0, 'TASK-100');

        const tasks = engine.getPendingTasks(true).tasks || [];
        // Should only see parent
        expect(tasks.length).toBe(1);
        expect(tasks[0].id).toBe('TASK-100');
    });

    it('should unblock task if parent is Done', () => {
        createTask('TASK-100', 'Done', 0);
        createTask('TASK-101', 'Pending', 0, 'TASK-100');

        const tasks = engine.getPendingTasks(true).tasks || [];
        expect(tasks.length).toBe(1);
        expect(tasks[0].id).toBe('TASK-101');
    });

    it('should respect DAG dependencies', () => {
        createTask('TASK-200', 'Pending', 0);
        createTask('TASK-201', 'Pending', 0, undefined, ['TASK-200']);

        let tasks = engine.getPendingTasks(true).tasks || [];
        expect(tasks.length).toBe(1);
        expect(tasks[0].id).toBe('TASK-200');

        // Complete A
        createTask('TASK-200', 'Done', 0);
        tasks = engine.getPendingTasks(true).tasks || [];
        expect(tasks.length).toBe(1);
        expect(tasks[0].id).toBe('TASK-201');
    });

    it('should handle complex DAG with priority', () => {
        // 200 -> 201 -> 202
        //        203 (High Prio) -> 204
        createTask('TASK-200', 'Done', 0);
        createTask('TASK-201', 'Pending', 10, undefined, ['TASK-200']); // Unblocked
        createTask('TASK-202', 'Pending', 0, undefined, ['TASK-201']);  // Blocked
        createTask('TASK-203', 'Pending', 100); // Unblocked, High Prio
        createTask('TASK-204', 'Pending', 0, undefined, ['TASK-203']); // Blocked

        const tasks = engine.getPendingTasks(true).tasks || [];
        // Should see 201 and 203. 203 is higher priority.
        expect(tasks.length).toBe(2);
        expect(tasks[0].id).toBe('TASK-203');
        expect(tasks[1].id).toBe('TASK-201');
    });
});
