import { SpecEngine } from '../engine/SpecEngine.js';
import { GraphDatabase } from '../../infrastructure/sqlite/GraphDatabase.js';
import { ScenarioRunner, type UserInterface } from '../engine/ScenarioRunner.js';
import { ContextSlicer } from '../engine/ContextSlicer.js';
import { ContextBundleService } from '../use-cases/ContextBundleService.js';
import { ProcessGuardian } from '../engine/ProcessGuardian.js';
import { WorkflowService } from '../use-cases/WorkflowService.js';
import { InitService } from '../use-cases/InitService.js';
import { DocGenerator } from '../use-cases/DocGenerator.js';
import { StateAnalyzer } from '../engine/StateAnalyzer.js';
import { SummaryGenerator } from '../use-cases/SummaryGenerator.js';
import { existsSync, copyFileSync, mkdirSync, readFileSync } from 'fs';
import { join, basename, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export class SpecController {
  private engine?: SpecEngine;
  private db?: GraphDatabase;
  private slicer?: ContextSlicer;
  private bundleService?: ContextBundleService;
  private guardian?: ProcessGuardian;
  private workflowService?: WorkflowService;
  private initService: InitService;
  private docGenerator?: DocGenerator;
  private stateAnalyzer?: StateAnalyzer;
  private summaryGenerator?: SummaryGenerator;

  constructor(private projectRoot: string) {
    this.initService = new InitService(projectRoot);
    this._initializeServices();
  }

  private _initializeServices() {
    if (this.db && this.engine) return; // Already initialized

    const dbDir = join(this.projectRoot, '.spec');
    if (existsSync(dbDir)) {
        try {
            const dbPath = join(dbDir, 'graph.db');
            this.db = new GraphDatabase(dbPath);
            this.engine = new SpecEngine(this.projectRoot, this.db);
            this.slicer = new ContextSlicer(this.db);
            this.bundleService = new ContextBundleService(this.db, this.projectRoot);
            this.guardian = new ProcessGuardian(this.db);
            this.workflowService = new WorkflowService(this.db, this.projectRoot);
            this.docGenerator = new DocGenerator(this.db, join(this.projectRoot, '.spec/core/templates'));
            this.stateAnalyzer = new StateAnalyzer(this.engine);
            this.summaryGenerator = new SummaryGenerator(this.db);
        } catch (e) {
            console.warn("Failed to initialize GraphDatabase (Run 'loom init' first):", e);
        }
    }
  }

  private ensureInitialized() {
      // Lazy load attempt
      if (!this.db || !this.engine) {
          this._initializeServices();
      }

      if (!this.db || !this.engine) {
          throw new Error("SpecLoom is not initialized. Run 'loom init' first.");
      }

      // Check version lock
      try {
          const configPath = join(this.projectRoot, '.spec/loom.config.json');
          if (existsSync(configPath)) {
              const config = JSON.parse(readFileSync(configPath, 'utf-8'));
              
              const __filename = fileURLToPath(import.meta.url);
              const __dirname = dirname(__filename);
              const pkgPath = resolve(__dirname, '../../../package.json');
              
              if (existsSync(pkgPath)) {
                  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
                  if (config.version && pkg.version && config.version !== pkg.version) {
                      console.warn(`\x1b[33m[WARNING] SpecLoom CLI (v${pkg.version}) is newer than the project config (v${config.version}). Run 'loom upgrade' to sync local project files.\x1b[0m\n`);
                  }
              }
          }
      } catch (e) {
          // Silent catch for version check errors to avoid blocking normal commands
      }
  }

  /**
   * @trace TASK-068
   */
  public async init() {
      const result = await this.initService.init();
      this._initializeServices(); // Wake up services immediately
      return result;
  }

  public async upgrade() {
      this.ensureInitialized();
      const { UpgradeService } = await import('../use-cases/UpgradeService.js');
      const upgradeService = new UpgradeService(this.projectRoot);
      return await upgradeService.upgrade();
  }

  public async generateDocs(outDir?: string) {
      this.ensureInitialized();
      await this.engine!.sync();
      const target = outDir ? join(this.projectRoot, outDir) : join(this.projectRoot, 'description');
      if (!existsSync(target)) {
          const { mkdirSync } = await import('fs'); 
          mkdirSync(target, { recursive: true });
      }
      await this.docGenerator!.generate(target);
      return { message: `Documents generated in ${target}` };
  }

  /**
   * @trace FR-027 (Execution Bundle Retrieval)
   */
  public async getContextBundle(taskId: string) {
      this.ensureInitialized();
      await this.engine!.sync();
      return this.workflowService!.getContextBundle(taskId);
  }

  public async startTask(taskId: string, implementerId?: string) {
      this.ensureInitialized();
      await this.engine!.sync();
      await this.workflowService!.startTask(taskId, implementerId);
      return { message: `Task ${taskId} started. Context locked.` };
  }

  /**
   * @trace TASK-063 (Review Identity Check)
   */
  public async completeTask(taskId: string) {
      this.ensureInitialized();
      await this.engine!.sync();
      const nextStatus = await this.workflowService!.completeTask(taskId);
      await this.engine!.updateTaskStatus(taskId, nextStatus);
      return { message: `Task ${taskId} completed. Status: ${nextStatus}. Context unlocked.` };
  }

  public async approveTask(taskId: string, reviewer: string) {
      this.ensureInitialized();
      await this.engine!.sync();
      await this.workflowService!.approveTask(taskId, reviewer);
      await this.engine!.updateTaskStatus(taskId, 'Done');
      return { message: `Task ${taskId} approved by ${reviewer}. Status: Done.` };
  }

  public async getTaskDiff(taskId: string, mode: 'full' | 'summary' = 'full') {
      this.ensureInitialized();
      return this.workflowService!.getDiff(taskId, mode);
  }

  /**
   * @trace FR-028 (Process Task Enforcement)
   */
  public async checkGate(phase: string) {
      this.ensureInitialized();
      await this.engine!.sync();
      return this.guardian!.checkGate(phase);
  }

  public async getContext(nodeId: string, depth: number = 1) {
      this.ensureInitialized();
      await this.engine!.sync();
      const result = this.slicer!.slice(nodeId, depth);
      return { 
          center: nodeId,
          depth,
          node_count: result.nodes.length,
          nodes: result.nodes
      };
  }

  public async importReference(sourcePath: string, id: string, title?: string) {
      this.ensureInitialized();
      await this.engine!.sync();
      
      if (!existsSync(sourcePath)) {
          throw new Error(`Source file not found: ${sourcePath}`);
      }

      const attachmentsDir = join(this.projectRoot, '.spec/attachments');
      if (!existsSync(attachmentsDir)) {
          mkdirSync(attachmentsDir, { recursive: true });
      }

      const fileName = basename(sourcePath);
      const targetPath = join(attachmentsDir, fileName);
      copyFileSync(sourcePath, targetPath);

      const content = {
          id,
          type: 'reference_source',
          title: title || fileName,
          description: `Imported from ${sourcePath}`,
          source_path: sourcePath,
          local_path: `.spec/attachments/${fileName}`,
          format: this.detectFormat(fileName),
          trace_to: {} 
      };

      const dataDir = join(this.projectRoot, '.spec/data/01_context');
      if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
      
      const jsonPath = join(dataDir, `${id.toLowerCase()}_${fileName.replace(/\./g, '_')}.json`);
      const { writeFileSync } = await import('fs');
      writeFileSync(jsonPath, JSON.stringify(content, null, 2));

      await this.engine!.sync();
      return { message: `Imported ${fileName} as ${id}` };
  }

  private detectFormat(fileName: string): string {
      const ext = fileName.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') return 'PDF';
      if (ext === 'md') return 'Markdown';
      if (['png', 'jpg', 'jpeg', 'svg'].includes(ext || '')) return 'Image';
      if (['txt', 'json', 'xml'].includes(ext || '')) return 'Text';
      return 'Other';
  }

  public async sync() {
    this.ensureInitialized();
    await this.engine!.sync();
    return { status: 'success', message: 'Specification synced to graph database.' };
  }

  /**
   * @trace TASK-076 (Persist Verification)
   */
  public async runScenario(id: string, ui: UserInterface, interactive: boolean = true) {
    this.ensureInitialized();
    await this.engine!.sync();
    const runner = new ScenarioRunner(this.db!, ui, interactive);
    const result = await runner.run(id);
    
    // Persist result
    if (result.status === 'PASS' || result.status === 'FAIL') {
        const status = result.status === 'PASS' ? 'Pass' : 'Fail';
        await this.engine!.updateScenarioResult(id, status);
    }
    
    return result;
  }

  public async validate() {
    this.ensureInitialized();
    const report = await this.engine!.validate();
    return report;
  }

  public async getStatus() {
    this.ensureInitialized();
    await this.engine!.sync();
    return this.engine!.getStatus();
  }

  /**
   * @trace TASK-074 (Task Listing)
   */
  public async getNextTask(list: boolean = false) {
    this.ensureInitialized();
    await this.engine!.sync();
    return this.engine!.getPendingTasks(list);
  }

  public async getReviewTasks() {
    this.ensureInitialized();
    await this.engine!.sync();
    return this.engine!.getReviewTasks();
  }

  /**
   * @trace TASK-076 (Verification Stats)
   */
  public async getVerificationStats() {
      this.ensureInitialized();
      await this.engine!.sync();
      return this.engine!.getVerificationStats();
  }

  public getInfo() {
    const dbPath = join(this.projectRoot, '.spec/graph.db');
    return {
        projectRoot: this.projectRoot,
        dbPath: dbPath,
        version: '1.0.0', 
        mode: existsSync(dbPath) ? 'Active' : 'Not Initialized',
        mandatory_protocols_path: ".spec/core/protocol/",
        instruction: "You MUST read and internalize ALL documents in the mandatory_protocols_path before performing any actions.",
        templates: {
            tasks_path: ".spec/core/templates/tasks/",
            available: ["feature.json", "design.json", "process.json"]
        }
    };
  }

  public async updateTaskStatus(id: string, status: string) {
    this.ensureInitialized();
    await this.engine!.updateTaskStatus(id, status);
    return { success: true, message: `Task ${id} updated to ${status}.` };
  }

  public getImpact(id: string) {
    this.ensureInitialized();
    return this.engine!.getImpact(id);
  }

  public async handshake(options: { id?: string, type?: string, all?: boolean }) {
    this.ensureInitialized();
    await this.engine!.sync();

    const nodes = this.db!.getAllNodes();
    const toHandshake = nodes.filter(n => {
        if (n.content.handshake_state !== 'Modified') return false;
        if (options.id && n.id !== options.id) return false;
        if (options.type && n.type !== options.type) return false;
        return true;
    });

    if (toHandshake.length === 0) {
        return { success: true, message: 'No artifacts found requiring handshake matching the criteria.', count: 0 };
    }

    // If the user didn't explicitly specify an ID, a Type, or say 'all: true', just list the pending items.
    if (!options.id && !options.type && !options.all) {
        return {
            success: true,
            status: 'pending_review',
            message: `Found ${toHandshake.length} item(s) requiring a handshake. Provide 'id', 'type', or 'all=true' to confirm.`,
            count: toHandshake.length,
            pending_items: toHandshake.map(n => ({ id: n.id, type: n.type, title: n.content.title || n.content.name || n.content.story || '' }))
        };
    }

    const { writeFileSync, readFileSync } = await import('fs');
    const { join } = await import('path');

    for (const node of toHandshake) {
        // Need to update the JSON file in .spec/data/
        const rootDir = process.cwd(); // Assume cwd is project root for simplicity or use a better way to find it
        // A better way is to rely on the db, but we need the file path. The engine knows paths.
        // Actually, we can use glob or find it.
        // SpecEngine doesn't expose file paths. Let's just use the filesystem structure.
        // Wait, I can search for it since the registry or FS is predictable, but to be robust, let's use the standard path:
        // Actually, SpecEngine has `projectRoot`. Let's just use `this.engine!['projectRoot']`.
        const projectRoot = (this.engine as any).projectRoot;
        
        // Find file
        const { globSync } = await import('glob');
        const files = globSync(`.spec/data/**/*.json`, { cwd: projectRoot });
        
        let fileUpdated = false;
        for (const file of files) {
            const fullPath = join(projectRoot, file);
            let content;
            try {
                content = JSON.parse(readFileSync(fullPath, 'utf8'));
            } catch (e) { continue; }
            
            if (content.id === node.id) {
                delete content.handshake_state;
                // calculate new hash
                const { createHash } = await import('crypto');
                const clone = { ...content };
                delete clone.last_agreed_hash;
                const str = JSON.stringify(clone);
                content.last_agreed_hash = createHash('sha256').update(str).digest('hex');
                
                writeFileSync(fullPath, JSON.stringify(content, null, 2));
                fileUpdated = true;
                break;
            }
        }
    }

    await this.engine!.sync();
    return { success: true, message: `Successfully handshaked ${toHandshake.length} artifact(s).`, count: toHandshake.length, artifacts: toHandshake.map(n => n.id) };
  }

  public getThreadSummary(taskId: string) {
    this.ensureInitialized();
    return this.summaryGenerator!.getThreadSummary(taskId);
  }

  public getStateAnalyzer() {
      this.ensureInitialized();
      return this.stateAnalyzer!;
  }

  public dispose() {
    if (this.db) {
        this.db.close();
    }
  }
}
