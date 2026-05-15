# SpecLoom Quickstart: The Hybrid Workflow

This guide is for developers and AI agents who want to set up SpecLoom quickly to enforce the Spec-Driven Development (SDD) process using the Hybrid Workflow paradigm.

## Prerequisites

* Node.js v20+
* Git

## 1. Installation

Run the following command to install the CLI tool globally:

```bash
npm install -g specloom
```

## 2. Initialization (Genesis Mode)

Initialize the repository with a command.

```bash
loom init
```
This creates the `.spec/` directory structure containing the system requirements, foundational context, and core protocols.

## 3. The Hybrid Workflow (Human-AI Collaboration)

SpecLoom works best when an AI agent handles the heavy lifting via MCP Tools while humans make strategic decisions, reviews at Anchor Points.

### For Humans: Asynchronous Workflow

1. **Initiation:** Human runs `/load` to load the current state of the environment into the chat.
2. **Product Definition:** Product Owner uses `/vision` and Analyst uses `/req`. AI drafts the required `UR` and `FR` artifacts.
3. **Handshake 1:** Human runs `/handshake` to review the drafts and agree on the Product Anchor.
4. **Architecture:** Developer runs `/arch`. AI drafts logical/physical components, functional chains, and API contracts based on the approved requirements.
5. **Handshake 2:** Human runs `/handshake` to agree on the Architecture Anchor.
6. **Execution:** PO reprioritizes the backlog using `/prioritize`. Developers run `/impl` to get the next coding task.

Notice that you do not need to run MCP commands (like `/vision` or `/arch`) manually; the AI agent will get all needed protocols from the task context.

## 4. MCP Integration (For AI Agents)

To use SpecLoom as a "Brain" for your AI agent (Cursor, Windsurf, Cline), you must attach the MCP server to your local workspace.

### Standard Configuration

Add the following to your agent's configuration file:

```json
{
  "mcpServers": {
    "specloom": {
      "command": "npx",
      "args": [
        "-y",
        "--package",
        "specloom",
        "loom-server"
      ]
    }
  }
}
```

## 5. Troubleshooting

* **Orphans?** Run `loom validate` to find missing links.
* **Locked?** Run `loom status` to see who holds the lock.
* **What's Next?** If stuck, run `/load` via MCP to have the AI suggest the next immediate action based on the state machine.