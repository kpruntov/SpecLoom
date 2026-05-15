import { FSScanner } from '../../src/infrastructure/fs/Scanner.js';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('FSScanner', () => {
  const testDir = 'test_scan';

  beforeEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true });
    mkdirSync(testDir);
    mkdirSync(join(testDir, 'subdir'));
    writeFileSync(join(testDir, 'file1.json'), '{}');
    writeFileSync(join(testDir, 'subdir/file2.json'), '{}');
    writeFileSync(join(testDir, '.gitignore'), 'ignored.json');
    writeFileSync(join(testDir, 'ignored.json'), '{}');
  });

  afterEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true });
  });

  it('should find all json files except ignored ones', async () => {
    const scanner = new FSScanner(testDir);
    const files = await scanner.scan('**/*.json');
    expect(files).toContain(join(process.cwd(), testDir, 'file1.json'));
    expect(files).toContain(join(process.cwd(), testDir, 'subdir/file2.json'));
    expect(files).not.toContain(join(process.cwd(), testDir, 'ignored.json'));
  });
});
