# SpecLoom
>
> **The Compliance & Traceability Layer for AI Agents.**

[![npm version](https://badge.fury.io/js/specloom.svg)](https://badge.fury.io/js/specloom)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

SpecLoom is a methodology, process, and tooling for Human-AI Design and development (HADD). It includes MCP Server and CLI designed to enforce the V-Model in agile and iterative development environments for AI-generated solutions. It serves as a guardrail for a fast, yet strict development process that includes requirements elicitation, architecture, planning, implementation, and verification.

**Stop "Vibe Coding". Start Engineering.**

---

## 🧠 Why SpecLoom?

* **For AI Agents:** Provides documentation standard and artifact tracing to follow rigid V-model development process. It serves structured "Context Bundles" (Requirements + Design + Code) so you don't have to guess.
* **For Humans:** Guide through their contribution to the product, enables "Four-Eyes" review, prevents scope creep, and generates audit-ready documentation automatically.
* **For Teams:** Ensure speed without quality drop and bridge the gap between "Fast Prototyping" and "Enterprise Compliance".

---

## ⚡ Quick Start

### 1. Installation

```bash
npm install -g specloom
```

### 2. Get Started

Follow the **[Quickstart Guide](docs/quickstart.md)** to set up your project in 5 minutes.

---

## 🔌 AI Integration (MCP)

SpecLoom implements the **Model Context Protocol (MCP)**, acting as the "Brain" for agents like **Gemini CLI**, **Claude Desktop**, **Cursor**, **Windsurf**, or **Cline**. The MCP server can work locally (your node folder) and does not require moving any data to remote servers.

### Configuration

Add SpecLoom to your agent's settings:

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
-------------
## Process and workflow

### Simple workflow

Start your work with `/load` that will provide all the needed context to your agent on how to work with specloom. You can provide additional context to the agent if needed. 

The agent will start working based on execution tasks. He might use the `loom xxx` commands (you can use them as well :) ), they are the point where you or AI can understand the next tasks, sync created artifacts with the database, and a lot more (use `loom --help` to see the list).

The agent will get all needed protocols and procedures by himself, but if you want the agent to play a specific role outside of task execution, you may run the MCP server prompt command:
* **`/vision` & `/req`:** Defines product scope and requirements.
* **`/arch`:** Defines Logical and Physical components.
* **`/planning`:** Breaks requirements into execution tasks.
* **`/impl`:** Ingests context and implements code.
* **`/verify`:** Reviews implementation against requirements.

### Expected development process:
AI is producing artifacts using specloom guardrails, while humans review, correct, and approve. 
The best results in speed are by teams of three (Product/Project owner/manager, Business/system analyst, Developer).

1. Product/Project owner/manager defines the context, business rules, and stakeholders
2. Business/system analyst defines the users and their characteristics, use cases and handshakes it with the Product/Project owner/manager
3. Business/system analyst defines the functional and non-functional requirements
4. Developer defines the architecture and handshakes it with Business/system analyst
5. Product/Project owner/manager creates an implementation plan and prioritizes it and handshakes with the Developer
6. The developer makes implementation and integration verification
7. The whole team runs product validation and verification based on predefined scenarios.

Recommended RACI matrix:

|  | AI agent | Product/Progect owner/manager | Business/system analytic | Developer |
| ----- | ----- | ----- | ----- | ----- |
| Context | R | A | I | C |
| Requirements | R | C | A | I |
| Architecture | R | I | C | A |
| Architecture | R | I | C | A |
| Implementation | R | I | C | A |
| Verification | R | A | C | C |


---

## 🛡️ Key Features

* **Strict V-Model Enforcement:** No Code without Rchitecture. No Architecture without Context.
* **Graph-Based Traceability:** Every artifact (User Story, API, Code, Test) is a node in a queryable graph.
* **The "Four-Eyes" Principle:** Prevents self-approval of code (Identity separation).
* **Git-Native:** All artifacts are JSON files committed alongside your code.

---

## 📄 Documentation

* **[Manual (The Theory)](docs/manual.md)**: Deep dive into the V-Model, HADD framework, and advanced workflows.
* **[Architecture](docs/architecture.md)**: System design, diagrams, and core components.
* **[Methodology](docs/methodology.md)**: The philosophy behind HADD and the V-Model.
* **[Contributing](CONTRIBUTING.md)**: How to build and extend SpecLoom.

## License

MIT