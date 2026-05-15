import { SpecController } from '../../src/core/controllers/SpecController.js';
import { SpecEngine } from '../../src/core/engine/SpecEngine.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { unlinkSync, existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Reference Artifact Import', () => {
    const testRoot = '.spec/tmp_ref_test';
    const dbPath = join(testRoot, '.spec/graph.db');
    let controller: SpecController;

    beforeEach(() => {
        if (existsSync(testRoot)) rmSync(testRoot, { recursive: true });
        mkdirSync(join(testRoot, '.spec/core/schemas'), { recursive: true });
        // We need the schema to validate? SpecEngine loads schemas from .spec/core/schemas.
        // We might need to copy the real schema there or mock SchemaValidator.
        // For integration test, it's easier to mock SpecEngine or just rely on file creation if sync fails validation (it just logs error).
        
        controller = new SpecController(testRoot);
    });

    afterEach(() => {
        controller.dispose();
        if (existsSync(testRoot)) rmSync(testRoot, { recursive: true });
    });

    it('should import a file and create an artifact', async () => {
        // Setup source file
        const sourceFile = join(testRoot, 'manual.pdf');
        writeFileSync(sourceFile, 'PDF Content');

        await controller.importReference(sourceFile, 'REF-001', 'User Manual');

        // Verify file copy
        const targetPath = join(testRoot, '.spec/attachments/manual.pdf');
        expect(existsSync(targetPath)).toBe(true);

        // Verify Artifact
        const jsonPath = join(testRoot, '.spec/data/01_context/ref-001_manual_pdf.json');
        expect(existsSync(jsonPath)).toBe(true);
    });
});
