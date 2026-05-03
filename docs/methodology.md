# SpecLoom Methodology: The HADD Framework

## 1. Philosophy

SpecLoom implements the **Human-AI Design & Development (HADD)** and **Spec-Driven Developemnt** framework.
This methodology enforces a rigorous "V-Model" approach for AI-assisted development, ensuring that code is not just "generated" but **engineered**.

### Core Tenets

1. **No Code Without Specs:** Implementation cannot begin without a documented Functional Requirement.
2. **No Specs Without Context:** Requirements must trace back to a User Need or Stakeholder Rule.
3. **The Graph is Truth:** All artifacts are connected nodes in a traceable graph.
4. **Four-Eyes Principle:** The agent/human implementing code cannot verify it.

## 2. The V-Model Lifecycle

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

## 3. Key Protocols

### 3.1 The CRV Cycle (Capture-Refine-Verify)

For every artifact type, follow this loop:

1. **Capture:** Ask questions to gather data.
2. **Refine:** Generate the JSON artifact and update the registry.
3. **Verify:** Render the artifact to Markdown and get confirmation.

### 3.2 The Assumption Protocol

Use assumptions to bridge uncertainty. Create an assumption ONLY if a decision is not forced by a higher-level constraint. Trace multiple requirements to the assumption to justify the decision.

### 3.3 The Architecture Protocol

Design must be hierarchical and follow MBSE/Arcadia principles:

1. **Functions First:** Define Logical Components (`LCOMP`) and prove them with Functional Chains (`FCHAIN`) before deciding on Physical Components (`PCOMP`).
2. **ADR Mandate:** Document architectural decisions with `ADR-XXX`.

### 3.4 Task Execution & Role Infusion

1. **Plan & Assign:** The Planner groups work into `FCHAIN` Epics and assigns specific Roles (e.g., `Developer`, `Verifier`) to Tasks.
2. **Lock & Infuse:** Use `loom start` to claim the task. The MCP server automatically injects the assigned Role Protocol into the agent's context.
3. **Context:** Use `loom context` to get the necessary technical slice.
4. **Implement:** Write code and local tests (TDD).
5. **Complete:** Use `loom complete` to release the lock.

### 3.5 The Two-Tiered Verification Protocol

Verification in SpecLoom is divided into two distinct phases to prevent premature validation friction:

1. **Tier 1: FCHAIN Integration Gate (The Epic Check):**
   * *When:* During active development (Stage 6).
   * *Goal:* Prove that the code components within an `FCHAIN` connect and data flows end-to-end.
   * *Rule:* **Does NOT require formal `SCN` execution.** It is satisfied by manual human confirmation that the epic is "wired up" correctly.
2. **Tier 2: Global Compliance Proof (Formal Verification):**
   * *When:* After implementation matures (Stage 7).
   * *Goal:* Prove that the system satisfies the contracted User/Functional Requirements.
   * *Rule:* **Strictly REQUIRES formal `SCN` execution.** The Verifier must run `loom verify` and collect evidence.

### 3.6 The Four-Eyes Protocol

SpecLoom tracks the identity of the operator. To prevent bias, the session that `start`s a task cannot `verify` or `approve` it. A different session (identity) is required.

## 4. MCP Integration (AI Agents)

SpecLoom acts as the "Brain" for AI agents via the **Model Context Protocol (MCP)**.

* **Prompts:** Agents are guided through the V-Model via state-aware Slash Commands (e.g., `/req`, `/arch`, `/planning`, `/impl`).
* **Context:** SpecLoom provides structured context bundles, reducing hallucination by grounding the agent in the project's reality.
