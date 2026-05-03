# HADD Master Workflow Protocol

## 1. Operating Modes

The Master Agent operates in one of three distinct modes. The agent must detect the state of the `.spec` directory to determine the correct mode or accept an explicit override.

### Mode A: Genesis (Initiation)
**Trigger:** `.spec` directory is empty or contains only `00_infastructure`.
**Goal:** Establish the "Skeleton of Intent."
**Procedure:**
1.  **Scaffold:** Ensure 00-06 directory structure exists. Generates initial **Process Tasks** (trace to `SYS-DEFINE`) to guide the agent.
2.  **Contextualize:** Force-prompt for `01_context/product_context` (Scope, Perspective).
3.  **Identify:** Prompt for critical `stakeholders`.
4.  **Sequential Execution:** Proceed linearly from Stage 01 to Stage 06.

### Mode B: Resonance (Recovery & Continuity)
**Trigger:** `.spec` directory is populated but gaps exist in the Registry or File System.
**Goal:** Restore Integrity and Resume.
**Procedure:**
1.  **Integrity Scan:**
    *   Load `00_infastructure/registry.json`.
    *   Verify every ID in Registry has a corresponding JSON file in `data/`.
    *   Verify every JSON file in `data/` is indexed in Registry.
    *   Validate all JSON files against their schemas in `core/schemas`.
2.  **Gap Analysis:** Identify "Orphaned" nodes (e.g., a Functional Req with no parent User Req).
3.  **State Report:** Present a "Health Check" to the user: "Missing 2 Stakeholder definitions; 3 Requirements unlinked."
4.  **Resume:** Ask user to prioritize: "Fix Gaps" or "Continue from last valid Stage."

---

## 2. The V-Model Stages (Directory Mapping)

The workflow strictly follows the schema-data directory structure.

| Stage | Directory | Artifacts | Gate / Stop Factor |
| :--- | :--- | :--- | :--- |
| **0. Foundation** | `00_infastructure` | Registry, Templates, Protocol | Engine Check (Self-Test). |
| **1. Context** | `01_context` | `product_context`, `stakeholder` | **Scope Lock:** User confirms boundaries. |
| **2. Strategy** | `02_pivots` | `assumption` | **Risk Ack:** User accepts "Bets". |
| **3. Intent** | `03_users` | `user_char`, `user_requirement` | **Needs Validated:** Stories mapped to Stakeholders. |
| **4. Specification** | `04_system` | `functional_requirement`, `non_functional`, `constraint` | **Contract Signed:** Clear Acceptance Criteria. |
| **5. Architecture** | `05_design` | `logical_component`, `physical_component`, `functional_chain`, `api_contract`, `data_model`, `ui_navigation_map`, `ui_component_spec`, `adr` | **Design Freeze:** Interface matches Specs & ADRs approved. |
| **6. Execution** | `06_execution` | `task`, `session` | **Implementation:** Code generation begins. |

---

## 3. The CRV (Capture-Refine-Verify) Cycle

Within any given Stage, the Agent follows this loop:

1.  **Capture (Interrogate):**
    *   Check Schema for required fields.
    *   Ask focused questions.
    *   **Loop Check:** "Are there more [Items]?" Do not proceed on a single sample unless confirmed.
2.  **Refine (Formalize):**
    *   Generate JSON artifact.
    *   Run `loom sync` to automatically update `registry.json` with the new ID and Trace links. Never edit `registry.json` manually.
3.  **Verify (Sign-off):**
    *   Render the artifact using `core/templates`.
    *   Present to user.
    *   **HALT** until User confirms: "Proceed" or "Edit".

---

## 4. The Assumption Protocol

Assumptions are the "Bridge over Uncertainty."

1.  **Creation Condition:** Create an Assumption ONLY when a decision (FR/Design) is NOT strictly forced by a Constraint, User Characteristic, or Business Requirement.
2.  **Many-to-One Rule:** An Assumption must explain a shared dependency across **multiple** requirements/nodes.
3.  **Traceability:** If an Assumption is proven wrong, all linked artifacts must be reviewed.

---

## 5. The Architecture Protocol (Stage 5)

Design is the bridge between Requirement and Execution. It must be approached hierarchically.

### A. The "Functions First" Rule
**Priority:** You MUST define **Logical Components** (`LCOMP`) and prove them with **Functional Chains** (`FCHAIN`) before allocating to **Physical Components** (`PCOMP`).
*   **Rational:** Logical architecture defines the "What it does" independent of the "Where it runs". You cannot define an API or physical deployment if you don't know the logical responsibilities.
*   **Workflow:**
    1.  **Define LCOMPs:** Identify the logical blocks of responsibility needed to satisfy the `FR`s.
    2.  **Prove with FCHAINs:** Create Functional Chains to verify that the `LCOMP`s can interact to satisfy a specific `UR` (Use Case flow).
    3.  **Allocate to PCOMPs:** Once the logical architecture is proven, map the `LCOMP`s to Physical Components (services, databases, UI apps). Detail APIs (`API-XXX`) and Data Models (`DATA-XXX`) as interfaces between these components.

### B. The ADR Mandate (Decision Records)
**Rule:** If you encounter a design choice with **Alternatives** (e.g., "REST vs GraphQL", "SQL vs NoSQL", "Library A vs Library B"), you **MUST** create an ADR (`ADR-XXX`).
*   **Do not** make silent decisions in code.
*   **Do not** put architectural reasoning in comments.
*   **Action:** Record the Context, Options, Decision, and Consequences in the ADR.

### C. Validation Perspectives
1.  **The Analyst View (Functional Fit):**
    *   Validate that `api_contract` and `data_model` satisfy all FRs.
2.  **The Architect View (System Evolution):**
    *   Assess "Future Scope" and "Load Degradation" in the ADR Context.

## 6. Fix orphanage protocol

Orphans are not the problem to solve, it ia indicators or not resolved needs. Do not deal with orphans in bulk. Fix them one by one. Alwais confirm with user the steps.

1.  **Check why:** Find traces to higher stages and ensure full tracebility to the root. Missing traceability indicates we orphan might not be needed / attached. Consult with user, assess and explain three oprions:
    * Delete requirement. It might be legasy, something that is not needed
    * Create a new higher level specs. Stakeholders, BRs, UCHs might be missing. Guess and propose if so.
    * Link to existing higher level specs. It might be integrity problem
2. **Check how:** Find related tasks. Never connect orphan to the "done" tasks - it will lead to hidden gaps in implementation and inconsistancy. If there are no planned work, architectecture, code, then plan what is needed and confirm with user the NEW task. Task is mandatory for resolution of downstream orphanage. One planned is will be solved through "next" commands.

## 7. New requirements in brownfield
Add requirement and ensure full traceability to the not-done features
1. **Create a new artifact:** Classify request and create a new artifact
2. **Sync registry:** Run `loom sync` to automatically register new artifacts and sync the database.
3. **Resolve orphanage:** New artifacts are not traceable and have to be solved in through Fix orphanage protocol
4. **Check logical consistency:** In case of requirements conflicts ask user for clarification and resolvance. Do not tolerate logical inconsistensy.

## 8. Task implementation
Work on task using the "tread context". Each artifact we have has traces, When working on task use as a context artifacts, that traces upward and downward the task (fetch and read specific FRs, NFRs, URs, UCHs, BRs, product context, architectural artifacts, code). Try to not inject into context other artifacts.
1. **Pull-tread:** Recursively find all traces related to the task till the root artifacts (if task traced to FR, you need to fetch FR, then Find traces of FR, e.g., BR) and product context. This is called pull-tread.
2. **Solve Knot:** Most of tasks connected to FRs. But FR may have multiple tasks. That called knot. When you found knot - inject into context all code assotiated with tasks that this FR trace to.
3. **Use context bundle:** Follow the task-flow considering fetched context. All context fetched trough the process described above called "Context Bundle".

## 9. Massive / pivotal change
When user want a pivotal change in the requirements, it should be planned and then executed from the begining in separate git brunch.
1. **Create a new master task:** Plan the change with highest priority. Start as by initial state (starting with product context). 
2. **Follow the plan:** Create new and change existing artifacts if needed. Consult with user allways to mandatory commit.

## 10. Adaptive Planning (Task Evolution)
If, during the execution of a Task, you discover that the original plan (Execution Steps or Definition of Done) is insufficient, incorrect, or requires expanded scope:
1.  **Pause Execution:** Do not continue writing code based on a flawed plan.
2.  **Update Task Artifact:** Edit the `task_xxx.json` file in `.spec/data/06_execution`.
    *   Refine `execution_steps`.
    *   Update `definition_of_done`.
    *   Add new trace links if necessary.
3.  **Sync Plan:** Run `loom sync` (or equivalent registry script) to update the system state.
4.  **Resume:** Continue execution based on the *new* truth.
*   **Rational:** The Plan is a living contract. It is better to rewrite the contract than to violate it by "winging it."

## 11. Process Tasks & System Meta-Requirements

SpecLoom enforces the V-Model process itself. To support "System-Level" activities (like Project Initiation, Architecture Pivots, or Refactoring) that do not trace to a specific User Requirement, we utilize **Process Tasks**.

### A. System Meta-Requirements
These are immutable constraints defined in `00_infastructure` that represent the phases of the V-Model:
1.  **SYS-DEFINE:** Requirement to capture and validate specifications.
2.  **SYS-IMPLEMENT:** Requirement to translate specs into code.
3.  **SYS-VERIFY:** Requirement to prove compliance.

### B. Process Tasks
A Task with `type: "Process"`:
1.  **Traceability:** MUST trace to a `SYS-XXX` requirement instead of a User Requirement.
2.  **Purpose:** Represents work required by the **System Process** (SpecLoom) rather than the **User Product**.
3.  **Automation:** "Genesis" and "Scaffolding" commands automatically create these tasks (e.g., `TASK-000-Genesis`) to ensure the plan is never empty.

### C. The Guardian Role
SpecLoom acts as the **Guardian of Integrity**.
*   It provides **Context Bundles** to external Agents via `loom get-context`.
*   It enforces that `Process` tasks are completed before their dependent `Feature` tasks can be unblocked.
*   It ensures that every unit of work (Task) is justified by either a **User Need** (trace to UR) or a **System Process** (trace to SYS).

## 12. Best Practices & Pitfalls (Dogfooding Lessons)

### A. Orphan Resolution Timing
*   **Pitfall:** Attempting to "fix" an orphan Requirement by immediately creating a Task.
*   **Correction:** Requirements are satisfied by **Design** (Architecture) first. Only after Architecture is defined do we create **Execution Tasks** to implement it.
*   **Rule:** Traceability flows: `Req -> Design -> Task`. Do not skip Design.

### B. SpecLoom Identity
*   **Pitfall:** Treating SpecLoom as an "Agent Orchestrator" that spawns sub-processes.
*   **Correction:** SpecLoom is a **"Thick Tool"** and **"Guardian"**. It serves structured Context Bundles to *external* Agents and enforces the V-Model. It does not manage agent lifecycles.

### C. Task Definition
*   **Pitfall:** Defining Tasks as a list of steps (e.g., "Create file X").
*   **Correction:** Define Tasks by their **Target State** (e.g., "System consistently validates X"). Steps are just a guide; the State (Definition of Done) is the contract.

### D. System IDs
*   **Rule:** SpecLoom enforces strict ID patterns.
    *   Standard Artifacts: `^[A-Z]{2,4}-[0-9]{3}$` (e.g., `FR-001`, `TASK-100`).
    *   System Meta-Reqs: `^SYS-[A-Z]+$` (e.g., `SYS-DEFINE`).
    *   **Do not** invent new ID formats

## 13. Change Management (Diff-Driven Planning)

When the Specification (Stages 1-5) changes, the Plan (Stage 6) must adapt.

1.  **Detection:** The System monitors the **Hash** of every artifact.
2.  **Invalidation:** If an Upstream Artifact (e.g., `FR-001`) changes:
    *   Find all linked Downstream Tasks (`TASK-XXX`).
    *   If Task status is `Done` or `Verified`, **Downgrade** status to `Review`.
    *   If Task status is `Pending`, update its `context` bundle.
3.  **Replanning:**
    *   The Master Agent must inspect all `Review` tasks.
    *   **Action:** Either "Re-verify" (no code change needed) or "Revise Plan" (create new sub-tasks).
    *   `loom next` blocks until `Review` tasks are resolved.

## 14. Concurrency Protocol (Multi-Agent)

SpecLoom uses a **Dual-Layer Locking** model:
1.  **Ownership (DB):** When you `start` a task, you own it indefinitely until `complete`. No one else can touch it.
2.  **Focus (File):** The `.spec/.lock` file indicates the *Active Context* of the repository.

### Agent Behavior Rules
*   **Context Switching:** You MAY switch to another task (`loom start TASK-B`) without completing the previous one. This updates the Focus but keeps your Ownership of TASK-A.
*   **Reclaiming Context:** If you try to `loom complete TASK-A` and receive an error *"Locked by TASK-B"*, it means another agent (or you) switched focus.
    *   **Action:** You MUST run `loom start TASK-A` to reclaim the Focus.
    *   **Retry:** Then run `loom complete TASK-A` again.

## 15. The Four-Eyes Principle (Identity & Review Protocol)

To ensure code quality and prevent "self-approval" bias, SpecLoom enforces strict separation between Implementation and Verification.

### A. Identity Tracking (The Session ID)
SpecLoom tracks the **Identity** of the agent/user performing actions.
*   **Mechanism:** Identity is automatically inferred from the **Terminal Session ID** (TTY/PID) or explicitly provided via `--user`.
*   **Persistence:**
    *   `loom start <task>` -> Records `implementer_session_id`.
    *   `loom verify/approve <task>` -> Records `reviewer_session_id`.

### B. The Separation Rule
**Rule:** `reviewer_session_id` MUST NOT match `implementer_session_id`.
*   You cannot approve your own PR.
*   You cannot verify your own code (in Strict Mode).
*   **Automation:** If `loom approve` is called from the same terminal session that ran `loom start`, the command **WILL FAIL**. You must open a new terminal (simulating a new "persona" or agent) to approve.

### C. Review Bundles (Diff-Driven)
When a task is in `Review` status, the Context Bundle changes.
*   **Standard Bundle:** Returns Requirements + Context Files (for coding).
*   **Review Bundle:** Returns Requirements + **Git Diff** (for auditing).
*   **Action:** The Reviewer/Verifier must assess the *Diff* against the *Requirements*.

## 16. Manual Task Status Update

In scenarios where a Task needs to be reset, paused, or manually adjusted outside the standard `start`/`complete` cycle (e.g., reverting a task to `Pending` after accidental start), use the `update-task` command.

*   **Command:** `loom update-task --id <TASK-ID> --status <STATUS>`
*   **Valid Statuses:** `Pending`, `In Progress`, `Review`, `Done`.
*   **Use Case:**
    *   Reverting a task to `Pending` if started by mistake.
    *   Moving a task to `Review` without triggering the full completion logic (e.g., for partial updates).
    *   **Warning:** This bypasses some workflow guards. Use with caution.

## 17. Defect Resolution Protocol

Defects in code or verification failures remain in the Execution loop to prevent bureaucratic friction.

### A. Execution Defects
*   **Trigger:** A test fails during verification, or a bug is found in implementation.
*   **Action:** The Developer creates or updates an Execution Task (`TASK-XXX` with Type: `Defect`) linked to the failed `SCN` or `FCHAIN`.
*   **Resolution:** The developer fixes the code, ensures the test passes, and completes the task. No formal Fault Report or Root Cause Analysis is required.

### B. Alignment Defects
*   **Trigger:** The code passes tests, but the Product Owner realizes the feature doesn't solve the Business Need.
*   **Action:** The PO must edit the upstream User Story (`UR`) or `FR`. This invalidates the downstream anchors, triggering a Delta Handshake to realign the vision before new execution tasks are created.
