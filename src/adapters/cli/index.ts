#!/usr/bin/env node
import { Command } from 'commander';
import { createInterface } from 'readline';
import { SpecController } from '../../core/controllers/SpecController.js';
import { readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf-8'));

const program = new Command();

program
  .name('loom')
  .description('SpecLoom CLI - Spec-Driven Development Guardian')
  .version(pkg.version)
  .option('--dir <path>', 'Override the project root directory (defaults to current working directory)');

// Helper to get controller with potentially overridden directory
const getController = () => {
    const opts = program.opts();
    const projectRoot = opts.dir ? resolve(opts.dir) : process.cwd();
    return new SpecController(projectRoot);
};

program
  .command('init')
  .description('Initialize a new SpecLoom project in the current directory')
  .action(async () => {
    try {
        // @trace TASK-068
        const result = await getController().init();
        console.log(result.message);
    } catch (error: any) {
        console.error('Init failed:', error.message);
        process.exit(1);
    } finally {
        getController().dispose();
    }
  });

program
  .command('upgrade')
  .description('Upgrade local SpecLoom project configuration and assets to match CLI version')
  .action(async () => {
    try {
        const result = await getController().upgrade();
        console.log(result.message);
    } catch (error: any) {
        console.error('Upgrade failed:', error.message);
        process.exit(1);
    } finally {
        getController().dispose();
    }
  });

program
  .command('import')
  .description('Import an external reference file')
  .argument('<file>', 'Path to file')
  .requiredOption('--id <id>', 'Reference ID (REF-XXX)')
  .option('--title <title>', 'Title')
  .action(async (file, options) => {
    try {
      const result = await getController().importReference(file, options.id, options.title);
      console.log(result.message);
    } catch (error: any) {
      console.error('Import failed:', error.message);
      process.exit(1);
    } finally {
      getController().dispose();
    }
  });

program
  .command('sync')
  .description('Sync JSON artifacts to the graph database')
  .action(async () => {
    try {
      const result = await getController().sync();
      console.log(result.message);
    } catch (error: any) {
      console.error('Sync failed:', error.message);
      process.exit(1);
    } finally {
      getController().dispose();
    }
  });

program
  .command('status')
  .description('Show current V-Model status and progress')
  .action(async () => {
    try {
      const status = await getController().getStatus();
      
      console.log('--- Plan Status (The Guiding Star) ---');
      const totalTasks = Object.values(status.planStatus).reduce((a, b) => a + b, 0);
      const doneTasks = status.planStatus['Done'] || 0;
      const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      
      console.log(`Progress: ${progress}% (${doneTasks}/${totalTasks} Tasks)`);
      Object.entries(status.planStatus).forEach(([state, count]) => {
        console.log(`  - ${state}: ${count}`);
      });

      console.log('\n--- Verification Status ---');
      const vStats = await getController().getVerificationStats();
      console.log(`Passed: ${vStats.passed} | Failed: ${vStats.failed} | Untested: ${vStats.untested} (Total: ${vStats.total})`);

      console.log('\n--- V-Model Artifacts ---');
      status.stageStatus.forEach(stage => {
        const marker = stage.count > 0 ? ' [x] ' : ' [ ] ';
        console.log(`${marker} Stage ${stage.id}: ${stage.name.padEnd(15)} (${stage.count} artifacts)`);
      });
      console.log('\n--- Integrity Check ---');
      console.log(`Status: ${status.integrity.status}`);
      console.log(`Orphans: ${status.integrity.orphans.length}`);
      console.log(`Broken Links: ${status.integrity.brokenLinks.length}`);
      
      if (status.integrity.orphans.length > 0 || status.integrity.brokenLinks.length > 0) {
        console.log('\nHint: Run "loom validate" to see details about orphans and broken links.');
      }
    } catch (error: any) {
      console.error('Status check failed:', error.message);
      process.exit(1);
    } finally {
      getController().dispose();
    }
  });

program
  .command('next')
  .description('Get the next pending task from the plan')
  .option('-l, --list', 'List all pending actionable tasks')
  .action(async (options) => {
    try {
      const result = await getController().getNextTask(options.list);
      
      if (result.status === 'done') {
        console.log('All tasks completed! The plan is fulfilled.');
      } else if (result.status === 'blocked') {
        console.log(`\n>>> NO ACTIONABLE TASKS <<<`);
        console.log(`There are ${result.blockedCount} pending tasks, but they are all blocked by dependencies.`);
        console.log('Check "loom status" or review dependencies.');
      } else {
        if (options.list && result.tasks) {
            console.log(`\n>>> ACTIONABLE TASKS (${result.tasks.length}) <<<`);
            // ID | Priority | Title | Status
            console.log('ID'.padEnd(10) + ' | ' + 'Prio'.padEnd(5) + ' | ' + 'Status'.padEnd(12) + ' | ' + 'Title');
            console.log('-'.repeat(80));
            result.tasks.forEach((t: any) => {
                const prio = (t.priority || 0).toString();
                const title = t.title.length > 50 ? t.title.substring(0, 47) + '...' : t.title;
                console.log(`${t.id.padEnd(10)} | ${prio.padEnd(5)} | ${t.status.padEnd(12)} | ${title}`);
            });
        } else {
            const task = result.task;
            console.log(`\n>>> NEXT OBJECTIVE: ${task.id} <<<`);
            console.log(`Title: ${task.title}`);
            console.log(`Type: ${task.type}`);
            console.log(`Objective: ${task.objective}`);
            
            if (task.ai_instructions && task.ai_instructions.length > 0) {
              console.log('\n--- AI Protocol ---');
              task.ai_instructions.forEach((instr: string) => console.log(`[ ] ${instr}`));
            } else if (task.execution_steps && task.execution_steps.length > 0) {
               console.log('\n--- Execution Steps ---');
               task.execution_steps.forEach((step: string) => console.log(`[ ] ${step}`));
            }

            if (task.context && task.context.relevant_files) {
              console.log('\n--- Context ---');
              console.log('Relevant Files:', task.context.relevant_files.join(', '));
            }
        }
      }
    } catch (error: any) {
      console.error('Next task retrieval failed:', error.message);
      process.exit(1);
    } finally {
      getController().dispose();
    }
  });

program
  .command('info')
  .description('Show tool configuration and environment info')
  .action(() => {
      const info = getController().getInfo();
      console.log('--- SpecLoom Environment ---');
      console.log(`Project Root: ${info.projectRoot}`);
      console.log(`Database:     ${info.dbPath}`);
      console.log(`Version:      ${info.version}`);
      console.log(`Mode:         ${info.mode}`);
      
      if (info.mandatory_protocols_path) {
          console.log('\n--- MANDATORY PROTOCOLS ---');
          console.log(info.instruction);
          console.log(`  Path: ${info.mandatory_protocols_path}`);
      }

      if (info.templates) {
          console.log('\n--- TEMPLATES ---');
          console.log(`  Path: ${info.templates.tasks_path}`);
          console.log(`  Available: ${info.templates.available.join(', ')}`);
      }
      
      getController().dispose();
  });

program
  .command('update-task')
  .description('Update the status of a task')
  .requiredOption('--id <id>', 'Task ID (e.g., TASK-001)')
  .requiredOption('--status <status>', 'New status (Pending, In Progress, Done, Verified)')
  .action(async (options) => {
    try {
      const result = await getController().updateTaskStatus(options.id, options.status);
      console.log(result.message);
    } catch (error: any) {
      console.error('Update failed:', error.message);
      process.exit(1);
    } finally {
      getController().dispose();
    }
  });

/**
 * @trace TASK-076 (Verify Command & List)
 */
program
  .command('verify')
  .description('Run a Verification Scenario (interactive)')
  .option('-l, --list', 'List all Verification Scenarios and their status')
  .option('--id <id>', 'Scenario ID (e.g., SCN-001)')
  .action(async (options) => {
    try {
      if (options.list) {
          const stats = await getController().getVerificationStats();
          console.log(`\n>>> VERIFICATION SCENARIOS (${stats.total}) <<<`);
          console.log('ID'.padEnd(10) + ' | ' + 'Status'.padEnd(10) + ' | ' + 'Title');
          console.log('-'.repeat(80));
          stats.pending_scenarios.forEach((s: any) => {
              const status = s.status || 'Untested';
              const title = s.title.length > 50 ? s.title.substring(0, 47) + '...' : s.title;
              console.log(`${s.id.padEnd(10)} | ${status.padEnd(10)} | ${title}`);
          });
          return;
      }

      if (!options.id) {
          console.error('Error: required option \'--id <id>\' not specified (unless --list is used)');
          process.exit(1);
      }

      // CLI User Interface Adapter
      const ui = {
        ask: (question: string) => {
            return new Promise<string>((resolve) => {
                const rl = createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                rl.question(question, (answer) => {
                    rl.close();
                    resolve(answer);
                });
            });
        },
        info: (msg: string) => console.log(msg),
        error: (msg: string) => console.error(`\x1b[31m${msg}\x1b[0m`), // Red
        success: (msg: string) => console.log(`\x1b[32m${msg}\x1b[0m`) // Green
      };

      const result = await getController().runScenario(options.id, ui);
      
      if (result.status === 'FAIL') {
          process.exit(1);
      }
    } catch (error: any) {
      console.error('Verification failed:', error.message);
      process.exit(1);
    } finally {
      getController().dispose();
    }
  });

program
  .command('validate')
  .description('Validate specification integrity')
  .option('--ci', 'Headless mode for CI pipelines')
  .action(async (options) => {
    try {
      await getController().sync();
      const report = await getController().validate();
      
      if (options.ci) {
        if (report.status === 'FAIL') {
          console.error(JSON.stringify(report, null, 2));
          process.exit(1);
        }
        console.log('Validation passed');
        process.exit(0);
      } else {
        console.log('--- Validation Report ---');
        console.log(`Status: ${report.status}`);
        console.log(`Schema Errors: ${report.schemaErrors.length}`);
        console.log(`Orphans: ${report.orphans.length}`);
        console.log(`Broken Links: ${report.brokenLinks.length}`);
        
        if (report.status === 'FAIL') {
          if (report.schemaErrors.length > 0) {
            console.log('\n>>> Schema Errors <<<');
            report.schemaErrors.forEach(err => console.log(`  - ${err.file}: ${err.message}`));
          }
          if (report.orphans.length > 0) {
            console.log('\n>>> Orphans <<<');
            report.orphans.forEach(id => console.log(`  - ${id}`));
          }
          if (report.brokenLinks.length > 0) {
            console.log('\n>>> Broken Links <<<');
            report.brokenLinks.forEach(link => console.log(`  - ${link}`));
          }
          process.exit(1);
        }
      }
    } catch (error: any) {
      console.error('Validation failed:', error.message);
      process.exit(1);
    } finally {
      getController().dispose();
    }
  });

program
  .command('context')
  .description('Get sliced context around a node or a Task Bundle')
  .argument('<id>', 'Artifact ID (Task or Node)')
  .option('--depth <n>', 'Depth of slice', '1')
  .action(async (id, options) => {
    try {
      if (id.startsWith('TASK-')) {
          const result = await getController().getContextBundle(id);
          console.log(JSON.stringify(result, null, 2));
      } else {
          const result = await getController().getContext(id, parseInt(options.depth));
          console.log(JSON.stringify(result, null, 2));
      }
    } catch (error: any) {
      console.error('Context retrieval failed:', error.message);
      process.exit(1);
    } finally {
      getController().dispose();
    }
  });

program
  .command('start')
  .description('Start a Task and lock active context')
  .argument('<id>', 'Task ID')
  .option('--user <user>', 'Implementer ID', process.env.USER || process.env.USERNAME || 'unknown-user')
  .action(async (id, options) => {
    try {
        const result = await getController().startTask(id, options.user);
        console.log(result.message);
    } catch (error: any) {
        console.error('Start failed:', error.message);
        process.exit(1);
    } finally {
        getController().dispose();
    }
  });

program
  .command('diff')
  .description('Show git diff for the current task context')
  .argument('<id>', 'Task ID')
  .option('-s, --summary', 'Show summary of changes instead of full diff')
  .action(async (id, options) => {
    try {
        const mode = options.summary ? 'summary' : 'full';
        const diff = await getController().getTaskDiff(id, mode);
        console.log(diff);
    } catch (error: any) {
        console.error('Diff failed:', error.message);
        process.exit(1);
    } finally {
        getController().dispose();
    }
  });

program
  .command('complete')
  .description('Complete a Task and unlock context')
  .argument('<id>', 'Task ID')
  .action(async (id) => {
    try {
        const result = await getController().completeTask(id);
        console.log(result.message);
    } catch (error: any) {
        console.error('Complete failed:', error.message);
        process.exit(1);
    } finally {
        getController().dispose();
    }
  });

program
  .command('approve')
  .description('Approve a Task in Review status')
  .argument('<id>', 'Task ID')
  .option('--reviewer <user>', 'Reviewer ID', 'Current User')
  .action(async (id, options) => {
    try {
        const result = await getController().approveTask(id, options.reviewer);
        console.log(result.message);
    } catch (error: any) {
        console.error('Approval failed:', error.message);
        process.exit(1);
    } finally {
        getController().dispose();
    }
  });

/**
 * @trace TASK-075 (Review Command)
 */
program
  .command('review')
  .description('Review tasks (List or Interactive)')
  .option('-i, --interactive', 'Interactive review mode')
  .action(async (options) => {
    try {
        const tasks = await getController().getReviewTasks();
        
        if (tasks.length === 0) {
            console.log('No tasks in Review status.');
            return;
        }

        console.log(`\n>>> TASKS IN REVIEW (${tasks.length}) <<<`);
        console.log('ID'.padEnd(10) + ' | ' + 'Implementer'.padEnd(15) + ' | ' + 'Title');
        console.log('-'.repeat(80));
        tasks.forEach((t: any) => {
            const impl = (t.implementer || 'Unknown').substring(0, 15);
            const title = t.title.length > 50 ? t.title.substring(0, 47) + '...' : t.title;
            console.log(`${t.id.padEnd(10)} | ${impl.padEnd(15)} | ${title}`);
        });

        if (options.interactive) {
            if (tasks.length === 1) {
                await runInteractiveReview(tasks[0].id);
            } else {
                const rl = createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                
                await new Promise<void>((resolve) => {
                    rl.question('\nEnter Task ID to review: ', async (answer) => {
                        rl.close();
                        if (answer.trim()) {
                            await runInteractiveReview(answer.trim());
                        }
                        resolve();
                    });
                });
            }
        }
    } catch (error: any) {
        console.error('Review failed:', error.message);
        process.exit(1);
    } finally {
        getController().dispose();
    }
  });

async function runInteractiveReview(taskId: string) {
    try {
        console.log(`\nFetching diff for ${taskId}...`);
        const diff = await getController().getTaskDiff(taskId);
        console.log('\n' + diff);
        console.log('-'.repeat(80));
        
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const answer = await new Promise<string>(resolve => {
            rl.question('Approve this task? [y/N]: ', resolve);
        });
        rl.close();

        if (answer.toLowerCase() === 'y') {
            const reviewer = process.env.USER || process.env.USERNAME || 'reviewer';
            const result = await getController().approveTask(taskId, reviewer);
            console.log(result.message);
        } else {
            console.log('Review cancelled.');
        }
    } catch (e: any) {
        console.error('Error:', e.message);
    }
    // Do not dispose here, let the main action dispose
}

program
  .command('generate')
  .description('Generate SRS/SDD documents')
  .option('--out <dir>', 'Output directory', 'description')
  .action(async (options) => {
    try {
        const result = await getController().generateDocs(options.out);
        console.log(result.message);
    } catch (error: any) {
        console.error('Generation failed:', error.message);
        process.exit(1);
    } finally {
        getController().dispose();
    }
  });

program
  .command('impact')
  .description('Analyze impact of a change to an artifact')
  .argument('<id>', 'Artifact ID to analyze')
  .action(async (id) => {
    try {
      await getController().sync();
      const impact = getController().getImpact(id);
      if (!impact) {
        console.error(`Artifact ${id} not found.`);
        process.exit(1);
      }

      // Recursive print function for better readability?
      // For now, JSON is requested by specs ("Output format supports JSON").
      console.log(JSON.stringify(impact, null, 2));
    } catch (error: any) {
      console.error('Impact analysis failed:', error.message);
      process.exit(1);
    } finally {
      getController().dispose();
    }
  });

program
  .command('summary')
  .description('Generate visual summary of a specific artifact thread')
  .argument('<id>', 'Task ID to summarize')
  .action(async (id) => {
    try {
      await getController().sync();
      const summary = getController().getThreadSummary(id);
      if (!summary) {
        console.error(`Task ${id} not found.`);
        process.exit(1);
      }

      const { default: treeify } = await import('treeify');

      const toTreeifyObj = (node: any): any => {
          const result: any = {};
          let i = 0;
          for (const child of node.children) {
              // Append status if it is present (e.g. [Already Shown])
              const status = child.status ? ` ${child.status}` : '';
              const label = `${child.nodeId} [${child.type}]${child.title ? ` - ${child.title}` : ''}${status}`;
              
              let uniqueLabel = label;
              while (result[uniqueLabel] !== undefined) {
                  uniqueLabel = `${label} (${++i})`;
              }

              result[uniqueLabel] = (child.children && child.children.length > 0) ? toTreeifyObj(child) : null;
          }
          return result;
      };

      const rootLabel = `${summary.nodeId} [${summary.type}]${summary.title ? ` - ${summary.title}` : ''}`;
      const rootObj = toTreeifyObj(summary);

      try {
          const diff = await getController().getTaskDiff(id, 'full');
          if (diff && diff.trim() !== '') {
              const lines = diff.split('\n');
              const maxLines = 15;
              const diffNode: any = {};
              lines.slice(0, maxLines).forEach((line, idx) => {
                  diffNode[`${line}`] = null;
              });
              if (lines.length > maxLines) {
                  diffNode[`... (${lines.length - maxLines} more lines)`] = null;
              }
              rootObj['Changes (Diff)'] = diffNode;
          }
      } catch (e) {
          rootObj['Changes (Diff)'] = { '[Diff Error]': null };
      }

      const treeObj = { [rootLabel]: rootObj };

      console.log(`\n--- Thread Summary for ${id} ---\n`);
      console.log(treeify.asTree(treeObj, true, false));

    } catch (error: any) {
      console.error('Summary generation failed:', error.message);
      process.exit(1);
    } finally {
      getController().dispose();
    }
  });

program.parse(process.argv);
