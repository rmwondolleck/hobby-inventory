---
# Shared state tracking configuration for all agents
# Import this in each workflow to get consistent state management
---

## State Tracking Protocol

All agents use a **GitHub Issue** as the single source of truth for workflow state.

### State Issue Format

The orchestrator creates/updates issue titled `[Orchestrator] Work Queue` with body:

```markdown
## Active Work Queue

| Issue | Stage | Agent | Started | Branch | PR |
|-------|-------|-------|---------|--------|-----|
| #5 | coding | coding-agent | 2024-01-15T10:00:00Z | epic/1-foundation | - |
| #9 | testing | test-agent | 2024-01-15T11:00:00Z | epic/2-inventory-core | #45 |

## Completed This Cycle

| Issue | Completed | Duration |
|-------|-----------|----------|
| #7 | 2024-01-15T09:30:00Z | 45m |

## Blocked

| Issue | Blocked By | Since |
|-------|------------|-------|
| #11 | #9, #10 | 2024-01-14 |
```

### Stage Transitions

```
[unassigned] → [ready] → [coding] → [testing] → [building] → [merged]
                  ↑                                    ↓
                  └────────── [needs-work] ←──────────┘
```

### Agent Responsibilities

**Orchestrator**: 
- Creates/updates state issue
- Dispatches agents
- Monitors for stuck work
- ONLY entity that assigns work

**Coding/Test/Build Agents**:
- Read their assignment from state issue
- Do work
- Report completion via comment on state issue
- Do NOT dispatch other agents

**Integration Agent**:
- Triggered by orchestrator when epic complete
- Reports back to orchestrator

