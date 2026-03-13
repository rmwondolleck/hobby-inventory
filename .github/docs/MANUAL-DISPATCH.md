# Manual Agent Dispatch Guide

## Quick Reference: Manually Kick Off Agents

### Coding Agent

**Purpose**: Implement a feature from a GitHub issue

**Command**:
```bash
gh workflow run coding-agent.lock.yml \
  --repo rmwondolleck/hobby-inventory \
  -f issue_number=<ISSUE_NUMBER> \
  -f epic_branch=<EPIC_BRANCH> \
  -f state_issue_number=28
```

**Example for Issue #6**:
```bash
gh workflow run coding-agent.lock.yml \
  --repo rmwondolleck/hobby-inventory \
  -f issue_number=6 \
  -f epic_branch=epic/1-foundation \
  -f state_issue_number=28
```

**Required Inputs**:
- `issue_number` (number) - The issue to implement (e.g., 6)
- `epic_branch` (string) - Target epic branch (e.g., epic/1-foundation)
- `state_issue_number` (number) - Work Queue issue number (always 28)

**Epic Branch Mapping**:
- Issues #5, #6, #8 → `epic/1-foundation`
- Issues #9-#13 → `epic/2-inventory-core`
- Issues #14-#17 → `epic/3-projects-compatibility`
- Issues #18-#26 → `epic/4-intake-usability`

---

### Test Agent

**Purpose**: Add tests to an existing PR

**Command**:
```bash
gh workflow run test-agent.lock.yml \
  --repo rmwondolleck/hobby-inventory \
  -f pr_number=<PR_NUMBER> \
  -f state_issue_number=28
```

**Example**:
```bash
gh workflow run test-agent.lock.yml \
  --repo rmwondolleck/hobby-inventory \
  -f pr_number=42 \
  -f state_issue_number=28
```

**Required Inputs**:
- `pr_number` (number) - The PR to add tests to
- `state_issue_number` (number) - Work Queue issue number (28)

---

### Build Agent

**Purpose**: Validate build and run tests on a PR

**Command**:
```bash
gh workflow run build-agent.lock.yml \
  --repo rmwondolleck/hobby-inventory \
  -f pr_number=<PR_NUMBER> \
  -f state_issue_number=28
```

**Example**:
```bash
gh workflow run build-agent.lock.yml \
  --repo rmwondolleck/hobby-inventory \
  -f pr_number=42 \
  -f state_issue_number=28
```

**Required Inputs**:
- `pr_number` (number) - The PR to validate
- `state_issue_number` (number) - Work Queue issue number (28)

---

### Integration Agent

**Purpose**: Merge completed epic branch to main

**Command**:
```bash
gh workflow run integration-agent.lock.yml \
  --repo rmwondolleck/hobby-inventory \
  -f epic_number=<EPIC_NUMBER> \
  -f state_issue_number=28
```

**Example for Epic 1**:
```bash
gh workflow run integration-agent.lock.yml \
  --repo rmwondolleck/hobby-inventory \
  -f epic_number=1 \
  -f state_issue_number=28
```

**Required Inputs**:
- `epic_number` (number) - The epic to merge (1, 2, 3, or 4)
- `state_issue_number` (number) - Work Queue issue number (28)

---

### Orchestrator

**Purpose**: Coordinate everything, identify ready work, dispatch agents

**Command**:
```bash
gh workflow run orchestrator.lock.yml \
  --repo rmwondolleck/hobby-inventory
```

**No inputs required** - The orchestrator reads all state from GitHub issues and the Work Queue.

---

## Monitoring

### Check if a workflow started:
```bash
gh run list --workflow=coding-agent.lock.yml --repo rmwondolleck/hobby-inventory --limit 5
```

### Watch a specific run:
```bash
gh run watch <RUN_ID> --repo rmwondolleck/hobby-inventory
```

### View logs after completion:
```bash
gh run view <RUN_ID> --repo rmwondolleck/hobby-inventory --log
```

### Open Actions page in browser:
```bash
# Windows PowerShell
Start-Process "https://github.com/rmwondolleck/hobby-inventory/actions"

# macOS/Linux
open "https://github.com/rmwondolleck/hobby-inventory/actions"
```

---

## Common Scenarios

### Scenario 1: Retry Failed Issue

If issue #6 failed, retry the coding-agent:
```bash
gh workflow run coding-agent.lock.yml \
  --repo rmwondolleck/hobby-inventory \
  -f issue_number=6 \
  -f epic_branch=epic/1-foundation \
  -f state_issue_number=28
```

### Scenario 2: Add Tests to PR

After a PR is created (e.g., PR #32), add tests:
```bash
gh workflow run test-agent.lock.yml \
  --repo rmwondolleck/hobby-inventory \
  -f pr_number=32 \
  -f state_issue_number=28
```

### Scenario 3: Force Orchestrator Run

Don't wait for the 2-hour schedule:
```bash
gh workflow run orchestrator.lock.yml \
  --repo rmwondolleck/hobby-inventory
```

### Scenario 4: Complete Epic

After all issues in Epic 1 are merged, integrate to main:
```bash
gh workflow run integration-agent.lock.yml \
  --repo rmwondolleck/hobby-inventory \
  -f epic_number=1 \
  -f state_issue_number=28
```

---

## Troubleshooting

### "Workflow not found" error
- Make sure you're using `.lock.yml` extension (e.g., `coding-agent.lock.yml`)
- Verify the workflow file exists in `.github/workflows/`
- Check that workflows are enabled in repo settings

### "Invalid value for field" error
- Verify all required inputs are provided with `-f`
- Check that numeric inputs (issue_number, pr_number) are passed as numbers
- Verify string inputs (epic_branch) don't have quotes in the command

### Workflow doesn't start
- Check GitHub Actions quota/limits
- Verify you have write permissions to the repo
- Try opening Actions page in browser to dispatch manually

### No output from `gh run list`
- Terminal may be hanging - use Ctrl+C and retry
- Try opening browser instead: `Start-Process "https://github.com/rmwondolleck/hobby-inventory/actions"`

---

## Current State Quick Check

**Work Queue**: https://github.com/rmwondolleck/hobby-inventory/issues/28

Check here for:
- What's currently in progress
- What's ready to start
- What's blocked and why
- Recent completions

---

*Last updated: March 13, 2026*

