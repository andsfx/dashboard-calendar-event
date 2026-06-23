# Work Plan: Update Agent Provider Configuration

## TL;DR

> **Quick Summary**: Update semua agent configuration untuk menggunakan provider `enowxai-standard` dengan model `claude-sonnet-4.5` agar agent bisa berjalan dengan normal.
>
> **Deliverables**:
> - Agent configuration file di `.opencode/agents.json`
> - Dokumentasi konfigurasi
>
> **Estimated Effort**: 15-30 menit
> **Critical Path**: Create config → Test agent → Verify

---

## Context

### Current State
- Agent configuration tidak ada di project level
- Agent mungkin menggunakan default provider yang tidak tersedia
- Background agents (explore, librarian) tidak berjalan dengan normal

### Target State
- Semua agent menggunakan `enowxai-standard` provider
- Model: `claude-sonnet-4.5`
- Agent berjalan dengan normal

### Constraints
- Harus compatible dengan OpenCode agent system
- Tidak mengubah agent behavior, hanya provider/model

---

## Work Objectives

### Core Objective
Setup agent configuration file yang menggunakan enowxai-standard provider untuk semua agent types.

### Concrete Deliverables
- `.opencode/agents.json` - Agent configuration file
- `.opencode/README.md` - Dokumentasi konfigurasi (optional)

### Definition of Done
- [ ] File `.opencode/agents.json` created dengan konfigurasi lengkap
- [ ] Test agent dengan `task()` call berhasil
- [ ] Background agents (explore, librarian) berjalan normal

### Must Have
- Configuration untuk semua agent types:
  - explore
  - librarian
  - oracle
  - metis
  - momus
  - quick
  - deep
  - visual-engineering
  - unspecified-high
  - unspecified-low

### Must NOT Have (Guardrails)
- Jangan ubah agent behavior/capabilities
- Jangan hardcode API keys
- Jangan commit sensitive data

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (no test framework for config)
- **Automated tests**: None
- **Framework**: Manual testing

### QA Policy
Manual verification via agent invocation test.

---

## TODOs

- [x] 1. Create Agent Configuration File

  **What to do**:
  - Create `.opencode/agents.json` dengan struktur:
    ```json
    {
      "agents": {
        "explore": {
          "provider": "enowxai-standard",
          "model": "claude-sonnet-4.5"
        },
        "librarian": {
          "provider": "enowxai-standard",
          "model": "claude-sonnet-4.5"
        },
        "oracle": {
          "provider": "enowxai-standard",
          "model": "claude-sonnet-4.5"
        },
        "metis": {
          "provider": "enowxai-standard",
          "model": "claude-sonnet-4.5"
        },
        "momus": {
          "provider": "enowxai-standard",
          "model": "claude-sonnet-4.5"
        },
        "quick": {
          "provider": "enowxai-standard",
          "model": "claude-sonnet-4.5"
        },
        "deep": {
          "provider": "enowxai-standard",
          "model": "claude-sonnet-4.5"
        },
        "visual-engineering": {
          "provider": "enowxai-standard",
          "model": "claude-sonnet-4.5"
        },
        "unspecified-high": {
          "provider": "enowxai-standard",
          "model": "claude-sonnet-4.5"
        },
        "unspecified-low": {
          "provider": "enowxai-standard",
          "model": "claude-sonnet-4.5"
        }
      },
      "default": {
        "provider": "enowxai-standard",
        "model": "claude-sonnet-4.5"
      }
    }
    ```

  **Must NOT do**:
  - Jangan tambahkan API keys atau credentials
  - Jangan ubah agent capabilities

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file creation task, no complex logic
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2 (testing depends on config file)
  - **Blocked By**: None (can start immediately)

  **References**:
  - OpenCode agent system documentation (if available)
  - Current project structure: `.opencode/` directory exists

  **Acceptance Criteria**:
  - [ ] File `.opencode/agents.json` exists
  - [ ] Valid JSON format
  - [ ] Contains all 10 agent types
  - [ ] All agents use `enowxai-standard` provider
  - [ ] All agents use `claude-sonnet-4.5` model

  **QA Scenarios**:

  ```
  Scenario: Verify JSON file is valid
    Tool: Bash (node)
    Preconditions: File created at .opencode/agents.json
    Steps:
      1. Run: node -e "JSON.parse(require('fs').readFileSync('.opencode/agents.json', 'utf8'))"
      2. Check exit code is 0 (no parse errors)
    Expected Result: Command succeeds without errors
    Failure Indicators: JSON parse error, file not found
    Evidence: .sisyphus/evidence/task-1-json-valid.txt

  Scenario: Verify all agent types are configured
    Tool: Bash (grep)
    Preconditions: File created
    Steps:
      1. Run: cat .opencode/agents.json | grep -c "enowxai-standard"
      2. Assert count >= 10 (one per agent type)
    Expected Result: Count is 10 or more
    Failure Indicators: Count < 10
    Evidence: .sisyphus/evidence/task-1-agent-count.txt
  ```

  **Evidence to Capture**:
  - [ ] task-1-json-valid.txt - JSON validation output
  - [ ] task-1-agent-count.txt - Agent count verification

  **Commit**: YES
  - Message: `config: add agent provider configuration for enowxai-standard`
  - Files: `.opencode/agents.json`
  - Pre-commit: `node -e "JSON.parse(require('fs').readFileSync('.opencode/agents.json', 'utf8'))"`

---

- [x] 2. Test Agent Invocation

  **What to do**:
  - Test agent dengan simple task call
  - Verify agent menggunakan correct provider
  - Check agent response normal

  **Must NOT do**:
  - Jangan test dengan production data
  - Jangan test dengan expensive operations

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Testing task, quick verification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None (final task)
  - **Blocked By**: Task 1 (needs config file)

  **References**:
  - Task 1: `.opencode/agents.json` file
  - OpenCode task() API documentation

  **Acceptance Criteria**:
  - [ ] Agent invocation succeeds
  - [ ] Agent uses enowxai-standard provider
  - [ ] Agent returns valid response

  **QA Scenarios**:

  ```
  Scenario: Test explore agent invocation
    Tool: Manual (via OpenCode interface)
    Preconditions: Config file exists
    Steps:
      1. Call: task(subagent_type="explore", load_skills=[], prompt="List files in src/", run_in_background=false)
      2. Wait for response
      3. Verify response contains file list
      4. Check no provider errors
    Expected Result: Agent returns file list successfully
    Failure Indicators: Provider error, timeout, no response
    Evidence: .sisyphus/evidence/task-2-explore-test.txt

  Scenario: Test librarian agent invocation
    Tool: Manual (via OpenCode interface)
    Preconditions: Config file exists
    Steps:
      1. Call: task(subagent_type="librarian", load_skills=[], prompt="What is React?", run_in_background=false)
      2. Wait for response
      3. Verify response contains React information
      4. Check no provider errors
    Expected Result: Agent returns React information successfully
    Failure Indicators: Provider error, timeout, no response
    Evidence: .sisyphus/evidence/task-2-librarian-test.txt
  ```

  **Evidence to Capture**:
  - [ ] task-2-explore-test.txt - Explore agent test output
  - [ ] task-2-librarian-test.txt - Librarian agent test output

  **Commit**: NO (testing only)

---

## Final Verification Wave

> Manual verification only - no automated tests available for agent configuration.

- [x] F1. **Configuration Completeness Check**
  Manually verify `.opencode/agents.json` contains all required agent types with correct provider/model. Check JSON is valid. Verify no syntax errors.
  Output: `All agents configured: YES/NO | Valid JSON: YES/NO | VERDICT: PASS/FAIL`

- [x] F2. **Agent Functionality Test**
  Test at least 2 different agent types (explore + librarian) with simple tasks. Verify they respond normally without provider errors. Check response quality is acceptable.
  Output: `Explore: PASS/FAIL | Librarian: PASS/FAIL | VERDICT: PASS/FAIL`

---

## Commit Strategy

- **1**: `config: add agent provider configuration for enowxai-standard` - .opencode/agents.json

---

## Success Criteria

### Verification Commands
```bash
# Verify JSON is valid
node -e "JSON.parse(require('fs').readFileSync('.opencode/agents.json', 'utf8'))"
# Expected: No errors

# Count agent configurations
cat .opencode/agents.json | grep -c "enowxai-standard"
# Expected: >= 10
```

### Final Checklist
- [ ] `.opencode/agents.json` exists and is valid JSON
- [ ] All 10 agent types configured
- [ ] All agents use `enowxai-standard` provider
- [ ] All agents use `claude-sonnet-4.5` model
- [ ] Test agent invocation succeeds
- [ ] No provider errors in agent responses
