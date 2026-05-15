import { DocGenerator } from '../../src/core/use-cases/DocGenerator.js';
import { GraphDatabase } from '../../src/infrastructure/sqlite/GraphDatabase.js';
import { SpecNode, NodeType } from '../../src/core/domain/SpecNode.js';
import { existsSync, unlinkSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('DocGenerator', () => {
  const dbPath = 'test_docs.db';
  const outDir = 'test_docs_out';
  const templateDir = 'test_templates';
  let db: GraphDatabase;
  let generator: DocGenerator;

  beforeEach(() => {
    if (existsSync(dbPath)) unlinkSync(dbPath);
    if (existsSync(outDir)) rmSync(outDir, { recursive: true });
    if (existsSync(templateDir)) rmSync(templateDir, { recursive: true });
    
    mkdirSync(outDir);
    mkdirSync(templateDir);

    // Create a dummy template with nested variable
    writeFileSync(join(templateDir, 'nested.md.j2'), 'Value: {{ product_context.scope.description }}');

    db = new GraphDatabase(dbPath);
    
    // Seed DB with nested data structure
    const content = {
      id: 'CTX-001',
      scope: {
        description: 'Nested Success'
      },
      items: [
        { name: 'Item 1', details: { value: 'A' }, tags: ['t1', 't2'] },
        { name: 'Item 2', details: { value: 'B' }, tags: [] }
      ]
    };
    const node = new SpecNode('CTX-001', NodeType.CONTEXT, content);
    db.upsertNode(node);
    
    generator = new DocGenerator(db, templateDir);
  });

  afterEach(() => {
    db.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
    if (existsSync(outDir)) rmSync(outDir, { recursive: true });
    if (existsSync(templateDir)) rmSync(templateDir, { recursive: true });
  });

  it('should resolve nested variables in templates', async () => {
    await generator.generate(outDir);
    
    const expectedFile = join(outDir, 'nested.md');
    if (!existsSync(expectedFile)) throw new Error(`File ${expectedFile} was not generated`);

    const content = readFileSync(expectedFile, 'utf-8');
    expect(content).toContain('Value: Nested Success');
  });

  it('should handle filters and nested loops', async () => {
    const templateContent = `
    {% for item in product_context.items %}
    * {{ item.name }}
      - Val: {{ item.details.value }}
      - Json: {{ item.tags | tojson }}
      {% for tag in item.tags %}
        - Tag: {{ tag }}
      {% endfor %}
    {% endfor %}
    `;
    writeFileSync(join(templateDir, 'complex.md.j2'), templateContent);

    await generator.generate(outDir);
    
    const expectedFile = join(outDir, 'complex.md');
    const content = readFileSync(expectedFile, 'utf-8');
    
    expect(content).toContain('* Item 1');
    expect(content).toContain('- Val: A');
    // We expect simple filtering (ignoring tojson) or implementing it. 
    // If we just strip it, it might print the array.
    // For now, let's assume we want to handle it or strip it.
    // The previous implementation failed to render it at all.
    expect(content).not.toContain('{{');
    expect(content).toContain('Tag: t1');
  });
});
