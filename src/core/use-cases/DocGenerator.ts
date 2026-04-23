import { GraphDatabase } from '../../infrastructure/sqlite/GraphDatabase.js';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, parse } from 'path';

/**
 * Generates documentation from the specification graph.
 * @trace FR-036
 * @trace TASK-038
 * @trace TASK-043
 */
export class DocGenerator {
    constructor(
        private db: GraphDatabase,
        private templateDir: string
    ) {}

    public async generate(outDir: string) {
        // 1. Fetch Data Model
        const data = this.buildDataModel();

        // 2. Discover all templates
        if (!existsSync(this.templateDir)) return;
        
        const files = readdirSync(this.templateDir);
        for (const file of files) {
            if (file.endsWith('.j2')) {
                const outputName = file.replace('.j2', ''); // Remove .j2
                // We keep .md or other extension
                const content = this.render(file, data);
                writeFileSync(join(outDir, outputName), content);
            }
        }
    }

    private buildDataModel(): any {
        const nodes = this.db.getAllNodes(); 
        const model: any = {
            context: [],
            stakeholders: [],
            user_requirements: [],
            functional_requirements: [],
            constraints: [],
            assumptions: [],
            views: [],
            adrs: [],
            apis: [],
            data_models: [],
            lcomps: [],
            pcomps: [],
            fchains: [],
            product_context: {} // Special singleton
        };

        for (const node of nodes) {
            const content = node.content;
            switch(node.type) {
                case 'context': 
                    model.context.push(content); 
                    // Assume the first context is the Product Context for global access
                    if (!model.product_context.id) model.product_context = content;
                    break;
                case 'stakeholder': model.stakeholders.push(content); break;
                case 'user_requirement': model.user_requirements.push(content); break;
                case 'functional_requirement': model.functional_requirements.push(content); break;
                case 'constraint': model.constraints.push(content); break;
                case 'assumption': model.assumptions.push(content); break;
                case 'logical_component': model.lcomps.push(content); break;
                case 'physical_component': model.pcomps.push(content); break;
                case 'functional_chain': model.fchains.push(content); break;
                case 'adr': model.adrs.push(content); break;
                case 'api_contract': model.apis.push(content); break;
                case 'data_model': model.data_models.push(content); break;
            }
        }
        return model;
    }

    private resolvePath(obj: any, path: string): any {
        if (!obj || !path) return '';
        // Strip filters from path (e.g., "item.tags | tojson")
        const parts = path.split('|');
        const cleanPath = parts[0]?.trim() || '';
        let value = cleanPath.split('.').reduce((acc, part) => acc && acc[part], obj);
        
        // Handle basic filters if needed (e.g., tojson)
        for (let i = 1; i < parts.length; i++) {
            const filterPart = parts[i]!.trim();
            if (filterPart === 'tojson') {
                if (typeof value === 'object') value = JSON.stringify(value, null, 2);
            } else if (filterPart.startsWith('join')) {
                // join(", ")
                const match = filterPart.match(/join\(([\"\'])(.+?)\1\)/);
                const separator = match ? match[2] : ',';
                if (Array.isArray(value)) value = value.join(separator);
            }
        }
        
        return value || '';
    }

    private render(templateName: string, data: any): string {
        const templatePath = join(this.templateDir, templateName);
        let template = readFileSync(templatePath, 'utf-8');
        return this.renderString(template, data);
    }

    private renderString(template: string, data: any): string {
        // 1. Handle Includes: {% include "file" %}
        let output = template.replace(/{%\s*include\s*"(.+?)"\s*%}/g, (match, p1) => {
            const partialPath = join(this.templateDir, p1);
            if (existsSync(partialPath)) {
                return readFileSync(partialPath, 'utf-8');
            }
            return `[Missing Template: ${p1}]`;
        });

        // 2. Handle Loops (Recursive)
        // Manual scanning to handle nested loops and whitespace correctly
        let result = '';
        let currentIdx = 0;
        
        while (currentIdx < output.length) {
            // Find next loop start
            const openTagIdx = output.indexOf('{%', currentIdx);
            if (openTagIdx === -1) {
                result += output.substring(currentIdx);
                break;
            }

            // Check if it's a 'for' loop
            const tagContentStart = openTagIdx + 2;
            const closeTagIdx = output.indexOf('%}', tagContentStart);
            if (closeTagIdx === -1) {
                // Malformed tag, just skip it
                result += output.substring(currentIdx, tagContentStart);
                currentIdx = tagContentStart;
                continue;
            }

            const tagContent = output.substring(tagContentStart, closeTagIdx).trim();
            const forMatch = tagContent.match(/^for\s+(\w+)\s+in\s+([^\s%]+)$/);

            if (!forMatch) {
                // Not a for loop (maybe endfor or something else), treat as text
                result += output.substring(currentIdx, closeTagIdx + 2);
                currentIdx = closeTagIdx + 2;
                continue;
            }

            // We found a loop start!
            const itemVar = forMatch[1]!;
            const collectionPath = forMatch[2]!;
            
            // Append text before loop
            result += output.substring(currentIdx, openTagIdx);
            
            // Find matching endfor
            let depth = 1;
            let bodyStart = closeTagIdx + 2;
            let searchIdx = bodyStart;
            let bodyEnd = -1;
            let loopEnd = -1;

            while (searchIdx < output.length) {
                const nextOpen = output.indexOf('{%', searchIdx);
                if (nextOpen === -1) break;
                
                const nextClose = output.indexOf('%}', nextOpen);
                if (nextClose === -1) break;

                const innerTag = output.substring(nextOpen + 2, nextClose).trim();
                
                if (innerTag.startsWith('for ')) {
                    depth++;
                } else if (innerTag === 'endfor') {
                    depth--;
                    if (depth === 0) {
                        bodyEnd = nextOpen;
                        loopEnd = nextClose + 2;
                        break;
                    }
                }
                searchIdx = nextClose + 2;
            }

            if (bodyEnd === -1) {
                result += "[Unclosed Loop]";
                currentIdx = output.length; 
                break;
            }

            // Process Loop Body
            const body = output.substring(bodyStart, bodyEnd);
            const collection = this.resolvePath(data, collectionPath);

            if (Array.isArray(collection)) {
                result += collection.map((item: any) => {
                    const subData = { ...data, [itemVar]: item };
                    return this.renderString(body, subData);
                }).join('');
            }

            // Advance
            currentIdx = loopEnd;
        }
        
        // 3. Handle Variables: {{ var.prop | filter }}
        result = result.replace(/{{\s*([\w\.\s\|\,\"\(\)\']+?)\s*}}/g, (match, path) => {
            const val = this.resolvePath(data, path);
            if (typeof val === 'object') return JSON.stringify(val);
            return val;
        });
        
        return result;
    }
}
