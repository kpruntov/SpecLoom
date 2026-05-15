import { ASTParser } from '../../src/infrastructure/ast/Parser.js';
import { join } from 'path';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, rmSync } from 'fs';

const TEST_DIR = '.spec/tmp_ast_test';

describe('ASTParser', () => {
    beforeAll(() => {
        if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });
    });

    afterAll(() => {
        if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
    });

    it('should extract class definition', () => {
        const file = join(TEST_DIR, 'TestClass.ts');
        writeFileSync(file, `
            /**
             * A test class.
             */
            export class TestClass {
                public method() {}
            }
        `);

        const parser = new ASTParser();
        const symbols = parser.parse(file);

        expect(symbols).toHaveLength(1);
        expect(symbols[0]!.name).toBe('TestClass');
        expect(symbols[0]!.type).toBe('class');
        expect(symbols[0]!.exported).toBe(true);
        expect(symbols[0]!.doc).toContain('A test class');
    });

    it('should extract function definition', () => {
        const file = join(TEST_DIR, 'TestFunc.ts');
        writeFileSync(file, `
            export function testFunc() {}
            function internalFunc() {}
        `);

        const parser = new ASTParser();
        const symbols = parser.parse(file);

        expect(symbols).toHaveLength(2);
        expect(symbols.find(s => s.name === 'testFunc')?.exported).toBe(true);
        expect(symbols.find(s => s.name === 'internalFunc')?.exported).toBe(false);
    });

    it('should extract interface definition', () => {
        const file = join(TEST_DIR, 'TestInterface.ts');
        writeFileSync(file, `
            export interface ITest {}
        `);

        const parser = new ASTParser();
        const symbols = parser.parse(file);

        expect(symbols[0]!.type).toBe('interface');
    });
});
