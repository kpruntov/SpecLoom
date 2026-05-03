# SpecLoom Traceability Map (The Chain of Change)

This document defines the strict dependency graph for SpecLoom artifacts. It enforces the separation between **Governance** (Stakeholders) and **Usage** (Users).

## 1. The Dependency Graph

The arrows ($\rightarrow$) represent "Traces To" (Depends On). If a parent node changes, all children are impacted.

### 3. The Artifact Traceability Map

This diagram defines the strict dependency graph for SpecLoom artifacts.

```mermaid
graph TD
    subgraph Layer_0_Foundation ["0. Foundation & Context"]
        SYS[System Requirement]
        CTX[Product Context]
        STK[Stakeholder] --> CTX
        REF[Reference Source] --> CTX
    end

    subgraph Layer_1_Drivers ["1. Strategy & Drivers"]
        BR[Business Rule] --> STK
        NFR[Non-Functional Req] --> STK
        CON[Constraint] --> STK
        UCH[User Characteristic] --> STK
        ASM[Assumption]
    end

    subgraph Layer_2_Specification ["2. Specification (The What)"]
        UR[Use Case / UR] --> UCH
        FR[Functional Requirement] --> UR
        FR --> BR
        FR --> CON
        FR --> NFR
        FR -.-> ASM
    end

    subgraph Layer_3_Architecture ["3. Architecture (The How)"]
        LCOMP[Logical Component] --> FR
        FCHAIN[Functional Chain] --> UR
        FCHAIN -.->|Realizes| LCOMP
        PCOMP[Physical Component] --> LCOMP
        API[API Contract] --> FCHAIN
        DATA[Data Model] --> LCOMP
        EXT[External Interface] --> API
        NAV[Navigation Map] --> UR
        UIC[UI Component] --> UR
        UIC --> API
        
        %% ADRs can be triggered by any requirement or assumption
        ADR[Arch. Decision] --> NFR
        ADR --> CON
        ADR --> FR
        ADR --> ASM
    end

    subgraph Layer_4_Execution ["4. Execution (The Plan)"]
        TASK[Execution Task] --> FCHAIN
        TASK --> ADR
        TASK --> SYS
    end
    
    subgraph Layer_5_Verification ["5. Verification (The Proof)"]
        CODE["Implementation (src)"] -.->|"@trace"| FR
        TEST["Verification (tests)"] -.->|"@trace"| FR
        SCN[Test Scenario] -.->|"@trace"| FR
    end
```

### Traceability Matrix

| Artifact Type | Traces To (Parents) | Driven By (Children) |
| :--- | :--- | :--- |
| **System Req (`SYS`)** | *None (Root)* | Process Tasks |
| **Stakeholder (`STK`)** | Product Context | BR, NFR, CON, UCH |
| **User Char (`UCH`)** | Stakeholder | Use Cases (`UR`) |
| **Use Case (`UR`)** | User Char | Functional Reqs, FCHAIN, NAV, UIC |
| **Business Rule (`BR`)** | Stakeholder | Functional Reqs |
| **Constraint (`CON`)** | Stakeholder | Functional Reqs, ADRs |
| **Non-Functional (`NFR`)**| Stakeholder | Functional Reqs, ADRs |
| **Assumption (`ASM`)** | *None (Root)* | FRs, ADRs |
| **Functional Req (`FR`)** | UR (steps/exceptions), BR, NFR, CON, ASM | LCOMP, Tasks, Code, Tests |
| **Logical Component (`LCOMP`)** | FR | PCOMP, FCHAIN, DATA |
| **Physical Component (`PCOMP`)** | LCOMP | Tasks |
| **Functional Chain (`FCHAIN`)** | UR, LCOMP | API |
| **API Contract (`API`)** | FCHAIN | EXT, UIC |
| **Data Model (`DATA`)** | LCOMP | Tasks |
| **Navigation Map (`NAV`)** | UR | Tasks |
| **UI Component (`UIC`)** | UR, API | Tasks |
| **External Interface (`EXT`)**| API | Tasks |
| **ADR** | FR, NFR, CON, ASM | Tasks, LCOMP/PCOMP |
| **Execution Task** | FCHAIN, ADR, SYS | Sessions, Code Changes |


## 2. Definitions & Rules

### A. Stakeholder vs. User
*   **Stakeholder (`STK`)**: An entity that has an interest in the project but does not necessarily *use* the system (e.g., CTO, Regulator, Buyer).
    *   *Primary Output:* `Business Rules`, `NFRs`, `Constraints`.
*   **User Characteristic (`UCH`)**: A distinct persona or actor that interacts with the system (e.g., "Junior Developer", "Admin").
    *   *Primary Output:* `Use Cases` (`UR`).

### B. The Two Paths to a Feature (`FR`)
A Functional Requirement (`FR`) can exist for two reasons:
1.  **The Usage Path:** A User (`UCH`) has a specific Interaction Flow (`UR`).
    *   *Example:* "As a Dev (`UCH`), I trigger the view graph command (`UR`), so the system must render nodes (`FR` linked to step 2)."
2.  **The Governance Path:** A Stakeholder (`STK`) enforces a Rule (`BR`).
    *   *Example:* "The CTO (`STK`) mandates GDPR (`BR`), so the system must encrypt logs (`FR`)."

### C. Validation Triangle
A Feature is **Complete** only when:
1.  **Definition:** The `FR` exists and traces to a `UR` (specific step/exception) or `BR`.
2.  **Implementation:** Code exists with `@trace FR-XXX`.
3.  **Verification:** A Test/Scenario exists with `@trace FR-XXX` and `@trace UR-XXX`
