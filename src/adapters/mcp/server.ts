#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SpecController } from '../../core/controllers/SpecController.js';
import { PromptFactory } from '../../core/prompts/PromptFactory.js';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Allow overriding project root via argument, fallback to cwd
const args = process.argv.slice(2);
const dirArgIndex = args.indexOf('--dir');
const projectRoot = dirArgIndex !== -1 && args[dirArgIndex + 1] 
    ? resolve(args[dirArgIndex + 1]!) 
    : process.cwd();

const controller = new SpecController(projectRoot);
const promptFactory = new PromptFactory();

const pkg = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf-8'));

const server = new Server(
  {
    name: 'specloom-server',
    version: pkg.version,
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'loom_sync',
        description: 'Sync JSON artifacts to the graph database',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'loom_validate',
        description: 'Validate specification metadata integrity (Checks Traces only, DOES NOT run code tests)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'loom_next',
        description: 'Get the next recommended task for the agent, or a list of all actionable tasks.',
        inputSchema: { 
            type: 'object', 
            properties: {
                list: { type: 'boolean', description: 'If true, returns a list of all actionable tasks.' }
            } 
        },
      },
      /** @trace TASK-077 (Smart Review) */
      {
        name: 'loom_list_reviews',
        description: 'List all tasks currently in Review status.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'loom_get_diff',
        description: 'Get the git diff for a specific task.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Task ID' },
                summary: { type: 'boolean', description: 'Show summary only' }
            },
            required: ['id']
        },
      },
      {
        name: 'loom_start',
        description: 'Start a Task and lock active context',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID' }
          },
          required: ['id']
        },
      },
      {
        name: 'loom_complete',
        description: 'Complete a Task and unlock context',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID' }
          },
          required: ['id']
        },
      },
      {
        name: 'loom_status',
        description: 'Show current V-Model status and progress',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'loom_info',
        description: 'Show tool configuration and environment info',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'loom_verify',
        description: 'Execute a verification scenario (Non-Interactive: Returns steps for agent to verify)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Scenario ID (SCN-XXX)' }
          },
          required: ['id']
        },
      },
      {
        name: 'loom_context',
        description: 'Get focused context. If ID is a Task, returns Execution Bundle. If ID is a Node, returns Graph Slice.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Artifact ID (Task or Node)' },
            depth: { type: 'string', description: 'Depth of slice (default: 1)' }
          },
          required: ['id']
        },
      },
      {
        name: 'loom_init',
        description: 'Initialize SpecLoom in the current directory',
        inputSchema: {
            type: 'object',
            properties: {
                brownfield: { type: 'string', description: 'Path to existing source code' },
                greenfield: { type: 'boolean', description: 'Start a new project from scratch' }
            }
        }
      },
      {
        name: 'loom_import',
        description: 'Import an external reference file',
        inputSchema: {
            type: 'object',
            properties: {
                file: { type: 'string', description: 'Path to file' },
                id: { type: 'string', description: 'Reference ID (REF-XXX)' },
                title: { type: 'string', description: 'Title' }
            },
            required: ['file', 'id']
        }
      },
      {
        name: 'loom_update_task',
        description: 'Update the status of a task manually',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Task ID' },
                status: { type: 'string', enum: ['Pending', 'In Progress', 'Done', 'Verified'] }
            },
            required: ['id', 'status']
        }
      },
      {
        name: 'loom_generate',
        description: 'Generate SRS/SDD documents',
        inputSchema: {
            type: 'object',
            properties: {
                out: { type: 'string', description: 'Output directory' }
            }
        }
      },
      {
        name: 'loom_impact',
        description: 'Analyze impact of a change to an artifact',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Artifact ID' }
          },
          required: ['id']
        },
      },
      {
        name: 'loom_approve',
        description: 'Approve a Task in Review status',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID' },
            reviewer: { type: 'string', description: 'Reviewer Name' }
          },
          required: ['id', 'reviewer']
        },
      },
      /** @trace TASK-102 */
      {
        name: 'loom_assign',
        description: 'Retrieves the protocol and procedure markdown files for a specified role or for the role assigned to a specific task.',
        inputSchema: {
          type: 'object',
          properties: {
            role: { type: 'string', description: 'The name of the role (e.g., architect, analyst).' },
            task_id: { type: 'string', description: 'The ID of the task to infer the role from.' }
          }
        },
      },
      {
        name: 'loom_check_gate',
        description: 'Check V-Model phase gate status',
        inputSchema: {
          type: 'object',
          properties: {
            phase: { type: 'string', enum: ['Define', 'Implement', 'Verify'] }
          },
          required: ['phase']
        },
      },
    ],
  };
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      { name: 'init', description: 'Initialize project context (Product Manager role)' },
      { name: 'req', description: 'Define requirements (Business Analyst role)', arguments: [{ name: 'input', description: 'Your request', required: true }] },
      { name: 'arch', description: 'Define architecture (System Architect role)', arguments: [{ name: 'input', description: 'Your request', required: true }] },
      { name: 'planning', description: 'Create execution plan (Technical Lead role)', arguments: [{ name: 'input', description: 'Your request', required: true }] },
      { name: 'impl', description: 'Implement tasks (Lead Developer role)', arguments: [{ name: 'input', description: 'Your request', required: true }] },
      { name: 'verify', description: 'Verify implementation (QA Engineer role)', arguments: [{ name: 'input', description: 'Your request', required: true }] },
      { name: 'info', description: 'Get SpecLoom manual and guide' },
      { name: 'project', description: 'Get project context summary' },
      { name: 'status', description: 'Get project health and status' },
      { name: 'context', description: 'Get context for a specific task or node', arguments: [{ name: 'id', description: 'Artifact ID', required: true }] },
      { name: 'next', description: 'Get next actionable task', arguments: [{ name: 'list', description: 'If true, returns a list of all actionable tasks' }] },
      { name: 'review', description: 'Review completed tasks (Smart Mode)' },
      { name: 'load', description: 'Bootstrap SpecLoom session and get next step' },
      { name: 'vision', description: 'Draft Product Context, Stakeholders, and Business Rules (Product Owner role)', arguments: [{ name: 'input', description: 'Your request', required: true }] },
      /** @trace TASK-090 (MCP Chat Macros) */
      { name: 'handshake', description: 'View pending handshakes or formally agree on modified artifacts. Run with no arguments to see what needs a handshake.', arguments: [
        { name: 'id', description: 'Artifact ID to handshake (optional)', required: false },
        { name: 'type', description: 'Artifact type to handshake (optional)', required: false },
        { name: 'all', description: 'Set to "true" to handshake all modified artifacts (optional)', required: false }
      ] },
      { name: 'prioritize', description: 'Prioritize the task backlog' },
    ]
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
      const state = await controller.getStateAnalyzer().getHealthCheck();
      const basePrompt = promptFactory.getPrompt(name);
      
      let contextData = "";
      
      // Dynamic Context Injection based on command
      if (name === 'status') {
          const status = await controller.getStatus();
          contextData = JSON.stringify(status, null, 2);
      } else if (name === 'context') {
          let id = args?.id as string;
          if (id) {
              // Regex Normalization: Matches "TASK-063", "task 63", "task63", "fr-1"
              const match = id.trim().match(/^([a-zA-Z]+)[- ]?(\d+)$/);
              if (match) {
                  const prefix = match[1]!.toUpperCase();
                  const num = match[2]!.padStart(3, '0');
                  id = `${prefix}-${num}`;
              } else {
                  id = id.trim().toUpperCase();
              }

              if (id.startsWith('TASK-')) {
                  const bundle = await controller.getContextBundle(id);
                  contextData = JSON.stringify(bundle, null, 2);
              } else {
                  const slice = await controller.getContext(id);
                  contextData = JSON.stringify(slice, null, 2);
              }
          }
      } else if (name === 'project') {
          // Project prompt already instructs to read files, but we can pre-fetch if needed.
          // For now, let the static prompt guide the agent to read.
      } else if (name === 'vision') {
          const pcPath = join(projectRoot, '.spec/data/01_context/product_context.json');
          let pcData = {};
          if (existsSync(pcPath)) {
              try { pcData = JSON.parse(readFileSync(pcPath, 'utf8')); } catch (e) {}
          }
          
          const stkPath = join(projectRoot, '.spec/data/01_context');
          const stks: any[] = [];
          if (existsSync(stkPath)) {
              readdirSync(stkPath).filter(f => f.startsWith('stk_') && f.endsWith('.json')).forEach(f => {
                  try { stks.push(JSON.parse(readFileSync(join(stkPath, f), 'utf8'))); } catch (e) {}
              });
          }
          
          const brPath = join(projectRoot, '.spec/data/01_context'); // Note: BRs are usually in 01_context or maybe 02, but typically 01. Let's check both if needed, but standard is 01_context
          const brs: any[] = [];
          if (existsSync(brPath)) {
              readdirSync(brPath).filter(f => f.startsWith('br_') && f.endsWith('.json')).forEach(f => {
                  try { brs.push(JSON.parse(readFileSync(join(brPath, f), 'utf8'))); } catch (e) {}
              });
          }

          contextData = JSON.stringify({
              product_context: pcData,
              stakeholders: stks,
              business_rules: brs
          }, null, 2);
      } else if (name === 'planning') {
          const templatePath = join(projectRoot, '.spec/core/templates/tasks/feature.json');
          if (existsSync(templatePath)) {
              const template = readFileSync(templatePath, 'utf8');
              contextData = `### MANDATORY TASK TEMPLATE (feature.json)\n${template}`;
          }
      } else if (name === 'next') {
          // Always return a list by default for better visibility
          const list = true;
          const result = await controller.getNextTask(list);
          if (result.status === 'done') contextData = 'All tasks completed.';
          else if (result.status === 'blocked') contextData = `No actionable tasks. ${result.blockedCount} blocked.`;
          else contextData = JSON.stringify(result.tasks, null, 2);
      } else if (name === 'prioritize') {
          const result = await controller.getNextTask(true);
          if (result.status === 'done') contextData = 'All tasks completed.';
          else if (result.status === 'blocked') contextData = `No actionable tasks. ${result.blockedCount} blocked.`;
          else contextData = JSON.stringify(result.tasks, null, 2);
      } else if (name === 'handshake') {
          let id = args?.id as string;
          let type = args?.type as string;
          let all = args?.all === 'true' || (args?.all as any) === true;

          const result = await controller.handshake({ id, type, all });
          contextData = JSON.stringify(result, null, 2);
          
          if (id && result.success && result.count > 0) {
              const summary = controller.getThreadSummary(id);
              if (summary) {
                  contextData += '\n\n' + JSON.stringify({ thread_summary: summary }, null, 2);
              }
          }
      } else if (name === 'review') {
          const reviews = await controller.getReviewTasks();
          contextData = JSON.stringify({ pending_reviews: reviews }, null, 2);
      /** @trace TASK-080 (Start Prompt) */
      } else if (name === 'load') {
          if (existsSync(join(projectRoot, '.spec'))) {
              try {
                  const status = await controller.getStatus();
                  const next = await controller.getNextTask(false);
                  const info = controller.getInfo();
                  
                  // Load Product Context
                  let productContext = {};
                  try {
                      const pcPath = join(projectRoot, '.spec/data/01_context/product_context.json');
                      if (existsSync(pcPath)) {
                          productContext = JSON.parse(readFileSync(pcPath, 'utf8'));
                      }
                  } catch (e) { productContext = { error: "Could not load product_context.json" }; }

                  // Load ALL Protocols dynamically
                  const protocols: Record<string, string> = {};
                  const protocolPath = join(projectRoot, '.spec/core/roles/master');
                  
                  if (existsSync(protocolPath)) {
                      const files = readdirSync(protocolPath).filter(f => f.endsWith('.md') && !f.startsWith('procedure_'));
                      for (const file of files) {
                          protocols[file] = readFileSync(join(protocolPath, file), 'utf-8');
                      }
                  }

                  contextData = JSON.stringify({
                      system_info: info,
                      system_status: status,
                      product_context: productContext,
                      next_recommendation: next,
                      protocols: protocols
                  }, null, 2);              } catch (e: any) {
                  contextData = `Error initializing load context: ${e.message}`;
              }
          }
      /** @trace TASK-079 (Verify Prompt) */
      // --- PHASE PROMPTS (Dual-Stack: Protocol + Procedure) ---
      } else if (['req', 'arch', 'planning', 'impl', 'verify'].includes(name)) {
          // Map command to protocol filename
          const protocolMap: Record<string, string> = {
              'req': 'requirements_agent_prompt.md',
              'arch': 'architecture_agent_prompt.md',
              'planning': 'planner_agent_prompt.md',
              'impl': 'implementation_agent_prompt.md',
              'verify': 'verification_agent_prompt.md'
          };
          
          const protocolFile = protocolMap[name]!;
          let protocolContent = "Protocol not found. Please ensure .spec/core/protocol or src/assets/protocol exists.";

          // Priority 1: Project-specific protocol
          const projectProtocolPath = join(projectRoot, '.spec/core/protocol', protocolFile);
          if (existsSync(projectProtocolPath)) {
              protocolContent = readFileSync(projectProtocolPath, 'utf-8');
          } 
          // Priority 2: Built-in default protocol (from assets)
          else {
              // In production, assets are in dist/src/assets/protocol
              // In dev, they are in src/assets/protocol
              const builtInPath = join(__dirname, '../../../../src/assets/protocol', protocolFile); // Adjusted relative path from dist/src/adapters/mcp/server.js
              if (existsSync(builtInPath)) {
                  protocolContent = readFileSync(builtInPath, 'utf-8');
              } else {
                  // Fallback for dev environment structure
                  const devPath = join(projectRoot, 'src/assets/protocol', protocolFile);
                  if (existsSync(devPath)) {
                      protocolContent = readFileSync(devPath, 'utf-8');
                  }
              }
          }

          contextData = `### ACTIVE PROTOCOL (The Rules)\n${protocolContent}`;

          if (name === 'verify') {
              const stats = await controller.getVerificationStats();
              contextData += `\n\n### Verification Stats & Pending Scenarios\n${JSON.stringify(stats, null, 2)}`;
          }
      }

      const userInput = args?.input ? `\n\n### User Input / Request\n${args.input}` : "";

      return {
          messages: [
              {
                  role: 'user',
                  content: {
                      type: 'text',
                      text: `[System State: ${state}]\n\n${basePrompt}\n\n${contextData ? "### Active Context Data\n" + contextData : ""}${userInput}`
                  }
              }
          ]
      };
  } catch (error: any) {
      return {
          messages: [
              {
                  role: 'user',
                  content: {
                      type: 'text',
                      text: `Error generating prompt for ${name}: ${error.message}`
                  }
              }
          ]
      };
  }
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'loom_start') {
        const id = args?.id as string;
        const result = await controller.startTask(id);
        return { content: [{ type: 'text', text: result.message }] };
    }

    if (name === 'loom_complete') {
        const id = args?.id as string;
        const result = await controller.completeTask(id);
        return { content: [{ type: 'text', text: result.message }] };
    }

    if (name === 'loom_status') {
        const result = await controller.getStatus();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    if (name === 'loom_info') {
        const result = controller.getInfo();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    if (name === 'loom_impact') {
        const id = args?.id as string;
        const result = controller.getImpact(id);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    if (name === 'loom_approve') {
        const id = args?.id as string;
        const reviewer = args?.reviewer as string;
        const result = await controller.approveTask(id, reviewer);
        return { content: [{ type: 'text', text: result.message }] };
    }

    /** @trace FR-028 */
    if (name === 'loom_check_gate') {
        const phase = args?.phase as string;
        const result = await controller.checkGate(phase);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    /** @trace TASK-102 */
    if (name === 'loom_assign') {
        let role = args?.role as string;
        const task_id = args?.task_id as string;
        
        if (task_id) {
           const bundle = await controller.getContextBundle(task_id);
           role = bundle.task.assigned_role;
           if (!role) throw new Error(`Task ${task_id} does not have an assigned_role.`);
        }
        if (!role) throw new Error(`Must provide either role or task_id.`);
        
        const normalizedRole = role.toLowerCase().replace('businessanalyst', 'analyst');
        const roleDir = join(projectRoot, '.spec/core/roles', normalizedRole);
        let content = `### ASSIGNED ROLE: ${normalizedRole.toUpperCase()} ###\n\n`;
        if (existsSync(roleDir)) {
            const files = readdirSync(roleDir).filter(f => f.endsWith('.md'));
            for (const f of files) {
                content += readFileSync(join(roleDir, f), 'utf-8') + '\n\n';
            }
        } else {
            // Fallback to assets
            const fallbackDir = join(__dirname, '../../../../src/assets/roles', normalizedRole);
            if (existsSync(fallbackDir)) {
                 const files = readdirSync(fallbackDir).filter(f => f.endsWith('.md'));
                 for (const f of files) {
                     content += readFileSync(join(fallbackDir, f), 'utf-8') + '\n\n';
                 }
            } else {
                 throw new Error(`Role directory not found: ${roleDir} or ${fallbackDir}`);
            }
        }
        return { content: [{ type: 'text', text: content }] };
    }

    if (name === 'loom_context') {
        let id = (args?.id as string) || (args?.node as string); // Backwards compat attempt
        if (!id) throw new Error("Missing 'id' parameter");

        // Regex Normalization
        const match = id.trim().match(/^([a-zA-Z]+)[- ]?(\d+)$/);
        if (match) {
            const prefix = match[1]!.toUpperCase();
            const num = match[2]!.padStart(3, '0');
            id = `${prefix}-${num}`;
        } else {
            id = id.trim().toUpperCase();
        }

        if (id.startsWith('TASK-')) {
             const result = await controller.getContextBundle(id);
             let textOutput = JSON.stringify(result, null, 2);
             
             if (result.task?.assigned_role) {
                 const normalizedRole = result.task.assigned_role.toLowerCase().replace('businessanalyst', 'analyst');
                 const roleDir = join(projectRoot, '.spec/core/roles', normalizedRole);
                 let roleContent = `### ACTIVE ROLE PROTOCOLS & PROCEDURES: ${normalizedRole.toUpperCase()} ###\n\n`;
                 let found = false;
                 if (existsSync(roleDir)) {
                     const files = readdirSync(roleDir).filter(f => f.endsWith('.md'));
                     for (const f of files) {
                         roleContent += readFileSync(join(roleDir, f), 'utf-8') + '\n\n';
                     }
                     found = true;
                 } else {
                     const fallbackDir = join(__dirname, '../../../../src/assets/roles', normalizedRole);
                     if (existsSync(fallbackDir)) {
                         const files = readdirSync(fallbackDir).filter(f => f.endsWith('.md'));
                         for (const f of files) {
                             roleContent += readFileSync(join(fallbackDir, f), 'utf-8') + '\n\n';
                         }
                         found = true;
                     }
                 }
                 if (found) {
                     textOutput = roleContent + textOutput;
                 }
             }

             return { content: [{ type: 'text', text: textOutput }] };
        } else {
             const depth = args?.depth ? parseInt(args.depth as string) : 1;
             const result = await controller.getContext(id, depth);
             return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
    }

    if (name === 'loom_init') {
      const initResult = await controller.init();
      return { content: [{ type: 'text', text: initResult.message }] };
    }

    if (name === 'loom_import') {
        const result = await controller.importReference(
            args?.file as string,
            args?.id as string,
            args?.title as string
        );
        return { content: [{ type: 'text', text: result.message }] };
    }

    if (name === 'loom_update_task') {
        const result = await controller.updateTaskStatus(
            args?.id as string,
            args?.status as string
        );
        return { content: [{ type: 'text', text: result.message }] };
    }

    if (name === 'loom_generate') {
        const result = await controller.generateDocs(args?.out as string);
        return { content: [{ type: 'text', text: result.message }] };
    }

    if (name === 'loom_sync') {
      const result = await controller.sync();
      return { content: [{ type: 'text', text: result.message }] };
    }

    if (name === 'loom_validate') {
      await controller.sync();
      const report = await controller.validate();
      return {
        content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
        isError: report.status === 'FAIL',
      };
    }

    if (name === 'loom_next') {
      const list = args?.list === true;
      const result = await controller.getNextTask(list);
      if (result.status === 'done') return { content: [{ type: 'text', text: 'All tasks completed.' }] };
      if (result.status === 'blocked') return { content: [{ type: 'text', text: `No actionable tasks. ${result.blockedCount} blocked.` }] };
      return { content: [{ type: 'text', text: JSON.stringify(list ? result.tasks : result.task, null, 2) }] };
    }

    if (name === 'loom_list_reviews') {
        const tasks = await controller.getReviewTasks();
        if (tasks.length === 0) return { content: [{ type: 'text', text: 'No tasks in Review status.' }] };
        return { content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }] };
    }

    if (name === 'loom_get_diff') {
        const id = args?.id as string;
        const summary = args?.summary === true;
        const diff = await controller.getTaskDiff(id, summary ? 'summary' : 'full');
        return { content: [{ type: 'text', text: diff }] };
    }

    if (name === 'loom_verify') {
      const id = args?.id as string;
      if (!id) throw new Error('Missing id parameter');
      
      const logs: string[] = [];
      const mcpUi = {
          ask: async (q: string) => { throw new Error(`Interactive prompt not supported in MCP yet: ${q}`); },
          info: (msg: string) => { logs.push(msg); },
          error: (msg: string) => { logs.push(`ERROR: ${msg}`); },
          success: (msg: string) => { logs.push(`SUCCESS: ${msg}`); }
      };
      
      try {
          const result = await controller.runScenario(id, mcpUi, false);
          return {
            content: [{ type: 'text', text: JSON.stringify({ ...result, logs }, null, 2) }],
            isError: result.status === 'FAIL'
          };
      } catch (e: any) {
          return { content: [{ type: 'text', text: `Scenario Error: ${e.message}\nLogs:\n${logs.join('\n')}` }], isError: true };
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SpecLoom MCP Server running on stdio');
}

run().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});
