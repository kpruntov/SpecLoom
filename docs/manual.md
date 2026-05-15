# SpecLoom Guide

## Installation

To use SpecLoom as a CLI tool without cluttering your project folder with `node_modules`, you have two options:

### Option A: Global Install (Recommended)

Install it once on your system to use the `loom` command anywhere.

```bash
npm install -g specloom
loom init
```
Loom operates on top of the local directory even if installed globally.

### Option B: Run via NPX (Zero Install)

Run the latest version directly without installing anything.

```bash
npx specloom init
```

**Note:** If you run `npm install specloom` (without `-g`) in your project root, it will create a `node_modules` folder and `package.json`. This is standard behavior for local Node.js dependencies, but it is not necessary for using the CLI.

## Quick Start

1. **Initialize:**

    ```bash
    loom init
    ```

2. **Follow the Plan:**

    ```bash
    loom next
    ```

3. **Implement a Task:**

    ```bash
    loom start TASK-001  # Locks the context for this task
    loom context TASK-001 # Fetches context bundle
    # ... Write Code (TDD) ...
    loom complete TASK-001 # Releases lock and marks as Done/Review
    ```

## Finding Work

To see what to do next:

* **Recommendation:** `loom next` (Shows the single highest priority task)
* **List Options:** `loom next --list` (Shows all actionable pending tasks)

## Reviewing Code

Tasks with `verification_regime: Light` or `Strict` go to `Review` status upon completion.

1. **List Reviews:**

    ```bash
    loom review
    ```

2. **Interactive Review:**

    ```bash
    loom review --interactive
    # or
    loom review --interactive -i
    ```

    This guides you through:
    * Selecting a task
    * Viewing the Diff
    * Approving (updates status to Done) or Rejecting
  
## Working with MCP server
To understand deeply how to work with MCP tools and command - **[MCP Workflow](docs/mcp_workflow.md)**

## CI/CD Integration
SpecLoom can be integrated into your CI/CD pipeline to enforce the V-Model at the Pull Request level. We provide a GitHub Action for easy integration.

### GitHub Action

Create a workflow file (e.g., `.github/workflows/specloom-validate.yml`) in your repository:

```yaml
name: "SpecLoom Validation"

on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run SpecLoom Validate
        uses: specloom/action-validate@main
```

Alternatively, you can run it via `npx`:

```bash
npx specloom validate --ci
```

## CLI Reference

### Initialization

* `loom init`: Initialize SpecLoom in the current directory.
* `loom info`: Show tool configuration and environment info.

### Task Management (Execution Stage)

* `loom next`: Get the next pending task from the plan.
* `loom start <id>`: Start a Task and lock active context.
* `loom complete <id>`: Complete a Task and unlock context.
* `loom update-task --id <id> --status <status>`: Manually update task status (`Pending`, `In Progress`, `Done`, `Verified`).
* `loom approve <id> --reviewer <user>`: Approve a Task in `Review` status.

### Spec Management (Stages 0-5)

* `loom sync`: Sync JSON artifacts to the graph database.
* `loom validate`: Validate specification integrity (orphans, broken links).
  * `--ci`: CI mode (headless).
* `loom import <file> --id <id>`: Import an external reference file (PDF, MD, Image).
* `loom context <id>`: Get sliced context around a node or a Task Bundle. Automatically infuses role-specific procedures if the Task specifies an `assigned_role`.
  * `--depth <n>`: Depth of traversal (default: 1).
* `loom assign --role <role>` (MCP Only): Explicitly load the Protocol and Procedures for a specific agent persona (e.g., `developer`, `planner`).

### Verification & Analysis

* `loom verify --id <id>`: Run a Verification Scenario (interactive).
* `loom status`: Show current V-Model status and progress.
* `loom impact <id>`: Analyze the impact of a change to an artifact.
* `loom generate --out <dir>`: Generate SRS/SDD documents.

## Troubleshooting

### Permission Errors (`EACCES` or `EPERM`)

If `loom init` fails with permission errors:

1. **Check Ownership:** Ensure you own the current directory.

    ```bash
    ls -ld .
    ```

2. **Fix Ownership:** If the directory is owned by `root` (often caused by running with `sudo` previously), reclaim it:

    ```bash
    sudo chown -R $USER:$USER .
    ```

3. **Retry:** Run `loom init` again without `sudo`.

### Validation Issues

Run `loom validate` to find Orphans (Requirements without Parents) or Broken Links.

Use `loom status` to see the overall health of the project.