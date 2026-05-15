import { PromptFactory } from '../../../src/core/prompts/PromptFactory.js';
import * as fs from 'fs';
import * as path from 'path';

/** @trace TASK-102 */
describe('PromptFactory (MCP Prompts)', () => {
    let factory: PromptFactory;

    beforeEach(() => {
        factory = new PromptFactory();
    });

    it('should return prioritize prompt', () => {
        const prompt = factory.getPrompt('prioritize');
        expect(prompt).toContain('Prioritization Protocol');
    });

    it('should return handshake prompt', () => {
        const prompt = factory.getPrompt('handshake');
        expect(prompt).toContain('Handshake Protocol');
    });
});

/** @trace TASK-102 */
describe('MCP Server', () => {
    it('should have a loom_assign tool available', () => {
        const serverCode = fs.readFileSync(path.join(process.cwd(), 'src/adapters/mcp/server.ts'), 'utf-8');
        expect(serverCode).toContain("name: 'loom_assign'");
    });
});