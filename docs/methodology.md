# SpecLoom Methodology: The HADD Framework

## 1. Philosophy

SpecLoom implements the **Human-AI Design & Development (HADD)** framework.
This methodology enforces a rigorous "V-Model" approach for AI-assisted development in tead, ensuring that code is not just "generated" but **engineered**.

### Core Tenets

1. **Traceability is the key to control:** Change management without traceability is a chaos. To make a change - impact need to be understood. 
2. **No Code Without Architecture:** Implementation cannot begin without a documented design and architectural decisions.
3. **No Architecture Without Requirements:** Design must trace back to validated Functional and Non-Functional Requirements.
4. **No Requirements Without Context:** Requirements must trace back to User Needs, Stakeholder Rules, or Constraints.
5. **The Graph is Truth:** All artifacts are connected nodes in a traceable graph, enabling impact analysis and compliance verification.

## 2. Expected Development Process

The process is designed for Human-AI collaboration, where AI produces artifacts using SpecLoom guardrails, while humans review, correct, and approve. The best results in speed are achieved by teams of three roles: Product/Project Owner, Business/System Analyst, and Developer.

1. **Context & Rules:** Product/Project owner defines the context, business rules, and stakeholders.
2. **User Intent:** Business/system analyst defines users, characteristics, use cases, and handshakes it with the Product/Project owner.
3. **Requirements:** Business/system analyst defines functional and non-functional requirements.
4. **Architecture:** Developer defines the architecture and handshakes it with the Business/system analyst.
5. **Planning:** Product/Project owner creates an implementation plan, prioritizes it, and handshakes with the Developer.
6. **Implementation:** Developer implements and runs integration verification.
7. **Verification:** The whole team runs product validation and verification based on predefined scenarios.

### RACI Matrix

| Phase | AI Agent | Product/Project Owner | Business/System Analyst | Developer |
| :--- | :--- | :--- | :--- | :--- |
| **Context** | R | A | I | C |
| **Requirements** | R | C | A | I |
| **Architecture** | R | I | C | A |
| **Planning** | R | A | C | I |
| **Implementation** | R | I | C | A |
| **Verification** | R | A | C | C |

*(R = Responsible, A = Accountable, C = Consulted, I = Informed)*

## 3. The V-Model Lifecycle

SpecLoom's workflow follows a strict sequential process, enforced by directory structures and validation gates.

### Stage 1: Context (The "Why")

* **Goal:** Define the product scope and identify key stakeholders.
* **Artifacts:** `Product Context`, `Stakeholders`.
* **Gate:** Scope defined and stakeholders identified.

### Stage 2: Strategy (The Risks)

* **Goal:** Explicitly state assumptions and manage risks.
* **Artifacts:** `Assumptions`.
* **Gate:** Risks acknowledged.

### Stage 3: Intent (The Users)

* **Goal:** Capture user needs and personas.
* **Artifacts:** `User Characteristics`, `User Requirements` (User Stories).
* **Gate:** Needs validated against stakeholders.

### Stage 4: Specification (The "What")

* **Goal:** Translate user needs into system requirements.
* **Artifacts:** `Functional Requirements`, `Non-Functional Requirements`, `Constraints`.
* **Gate:** Clear acceptance criteria defined.

### Stage 5: Architecture (The Structure)

* **Goal:** Design the system to meet the specifications.
* **Artifacts:** `Logical Components`, `Physical Components`, `Functional Chains`, `API Contracts`, `Data Models`, `UI Artifacts`, `ADRs`.
* **Gate:** Design frozen and ADRs approved.

### Stage 6: Execution (The Plan)

* **Goal:** Plan the work and execute tasks.
* **Artifacts:** `Tasks` (The Plan), `Sessions` (The Work).
* **Gate:** Implementation begins.

### Stage 7: Verification (The Proof)

* **Goal:** Prove the implementation meets the requirements.
* **Artifacts:** `Test Scenarios`, `Verifications`.
* **Gate:** All tests pass and are traced to requirements.

## 4. Key Protocols

### 4.1 The CRV Cycle (Capture-Refine-Verify)

For every artifact type, follow this loop:

1. **Capture:** Ask questions to gather data.
2. **Refine:** Generate the JSON artifact and update the registry.
3. **Verify:** Render the artifact to Markdown and get confirmation.

### 4.2 The Assumption Protocol

Use assumptions to bridge uncertainty. Create an assumption ONLY if a decision is not forced by a higher-level constraint. Trace multiple requirements to the assumption to justify the decision.

### 4.3 The Architecture Protocol

Design must be hierarchical and follow MBSE/Arcadia principles:

1. **Functions First:** Define Logical Components (`LCOMP`) and prove them with Functional Chains (`FCHAIN`) before deciding on Physical Components (`PCOMP`).
2. **ADR Mandate:** Document architectural decisions with `ADR-XXX`.

### 4.4 Task Execution & Role Infusion

1. **Plan & Assign:** The Planner groups work into `FCHAIN` Epics and assigns specific Roles (e.g., `Developer`, `Verifier`) to Tasks.
2. **Lock & Infuse:** Use `loom start` to claim the task. If agent start the task, The MCP server automatically injects the assigned Role Protocol into the agent's context. Otherwise provide role directory to agent to read.
3. **Context:** Use `loom context` to get the necessary technical slice.
4. **Implement:** Write code and local tests (TDD).
5. **Complete:** Use `loom complete` to release the lock.

### 4.5 The Two-Tiered Verification Protocol

Verification in SpecLoom is divided into two distinct phases to prevent premature validation friction:

1. **Tier 1: FCHAIN Integration Gate (The Epic Check):**
   * *When:* During active development (Stage 6).
   * *Goal:* Prove that the code components within an `FCHAIN` connect and data flows end-to-end.
   * *Rule:* **Does NOT require formal `SCN` execution.** It is satisfied by manual human confirmation that the epic is "wired up" correctly.
2. **Tier 2: Global Compliance Proof (Formal Verification):**
   * *When:* After implementation matures (Stage 7).
   * *Goal:* Prove that the system satisfies the contracted User/Functional Requirements.
   * *Rule:* **Strictly REQUIRES formal `SCN` execution.** The Verifier must run `loom verify` and collect evidence.

===========
!IMPORTANT!
===========

Often, you can see, that you or Agent missed the functionality. It is important for humans to collaborate and enforce correct behaviour - create missing artifacts (e.g., URs, FRs, etc.) and then modify architecture, before going to implementation. It is not possible to catch all cases, humans are still accountable.

### 4.6 The Four-Eyes Protocol

SpecLoom tracks the identity of the operator. To prevent bias, the session that `start`s a task cannot `verify` or `approve` it. A different session (identity) is required. This is soft requirement. You still can review and ask the same agent to approve. 

## 5. The Hybrid Workflow & MCP Integration

SpecLoom works best when an AI agent handles the heavy lifting via MCP Tools while humans make strategic decisions and review at Anchor Points. It acts as the "Brain" for AI agents (Cursor, Windsurf, Cline) via the **Model Context Protocol (MCP)**.

### 5.1 "Agent-Pull" and "User-Push" (The "Intelligent Guide")

SpecLoom utilizes both "Agent-Pull" and "User-Push" models to guide AI agents. 

The preferred and intended path is autonomous **Agent-Pull**, where the agent is guided dynamically by tasks and protocols. The agent independently uses tools like `loom next` and `loom context`, as well as using MCP tools to read its instructions, assume roles, and pull the necessary technical slice to complete its work autonomously.

However, humans can catch the steering wheel at any time using **User-Push** via MCP Prompts (Slash Commands). Instead of waiting for the agent to pull context, the user can inject the correct "Persona" and "Protocol" directly into the context window at the start of the turn to force a specific workflow.

A Slash Command (e.g., `/req`) dynamically:
1. **Analyzes State:** Checks the project phase.
2. **Validates Pre-requisites:** Ensures dependencies exist.
3. **Constructs Context:** Assembles a targeted System Prompt + relevant Context Data.
4. **Returns Instruction:** Assigns a specific role and enforces the protocol.

### 5.2 The Command Suite

The workflow is guided by Standard Prompts covering the V-Model lifecycle:

**Core Workflow (The V-Model Guides):**
* `/load`: System Bootstrapper (Bootstrap Phase)
* `/vision`: Product Owner/Analyst (Vision Phase)
* `/req`: Business Analyst (Specification Phase)
* `/handshake`: Governance Facilitator (All Phases - Governance)
* `/arch`: System Architect (Design Phase)
* `/planning`: Technical Lead (Planning Phase)
* `/prioritize`: Product Owner Assistant (Planning Phase)
* `/impl`: Lead Developer (Execution Phase)
* `/verify`: QA Engineer (Quality Phase)

**Utility Accessors:**
* `/context [ID]`: Returns full JSON content + Up/Down traces.
* `/status`: Runs `loom status`.
* `/info`: Returns System Meta, Protocols, and Agent Instructions.
* `/project`: Summarizes project context, stakeholders, and BRs.
* `/next`: Helps select the next actionable task.
* `/review`: Reviews completed tasks enforcing the Four-Eyes Principle.

### 5.3 Asynchronous Collaboration

1. **Initiation:** Human runs `/load` to load the current state.
2. **Product Definition:** Human runs `/vision` and `/req`. AI drafts the required `UR` and `FR` artifacts.
3. **Handshake 1:** Human reviews the drafts and agrees on the Product Anchor via `/handshake`.
4. **Architecture:** Human runs `/arch`. AI drafts architecture based on approved requirements.
5. **Handshake 2:** Human agrees on the Architecture Anchor via `/handshake`.
6. **Execution:** PO plan the backlog using `/planning`. Developers run `/impl` to execute tasks.
