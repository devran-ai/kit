# Incident Response Report

> **Purpose**: Blameless post-incident analysis for production issues. The system allowed X, not person Y caused X.
>
> **Used by**: `reliability-engineer` agent · triggered by P1/P2 incidents · referenced in `/retrospective`

---

## Incident Metadata

| Field | Value |
| :--- | :--- |
| Incident ID | INC-{YYYY-MM-DD}-{NNN} |
| Severity | P1 (critical — immediate response) / P2 (high — <4h) / P3 (medium — next day) / P4 (low — backlog) |
| Title | {brief description of what happened} |
| Start Time | {ISO 8601 datetime} |
| End Time (resolved) | {ISO 8601 datetime} |
| Duration | {hours/minutes} |
| Incident Commander | {name/handle} |
| Responders | {names/handles} |
| Affected Services | {list of affected services/APIs} |
| User Impact | {number of users affected, what they couldn't do} |

---

## Timeline

| Time (UTC) | Event | Who Detected |
| :--- | :--- | :--- |
| HH:MM | Incident began | {monitoring alert / user report / team member} |
| HH:MM | Team notified | {alert channel} |
| HH:MM | Root cause identified | {responder} |
| HH:MM | Mitigation applied | {responder} |
| HH:MM | Service restored | {responder} |
| HH:MM | Incident declared resolved | {incident commander} |

---

## Impact Summary

**Services affected**: {list}
**Error rate at peak**: {%}
**Users affected**: {N}
**Revenue/business impact**: {description or "under assessment"}
**Data loss**: {Yes — describe / No}

---

## Blameless Root Cause Analysis

> **Principle**: "The system allowed this to happen" — not "person X made a mistake". Humans make errors; systems should prevent them from causing incidents.

### What Happened
{Factual description of the sequence of events}

### Why It Happened (5 Whys)

| Why # | Question | Answer |
| :--- | :--- | :--- |
| Why 1 | Why did users experience {impact}? | {answer} |
| Why 2 | Why did {answer-1} occur? | {answer} |
| Why 3 | Why did {answer-2} occur? | {answer} |
| Why 4 | Why did {answer-3} occur? | {answer} |
| Why 5 | Why did {answer-4} occur? | {root cause} |

### Root Cause
{Clear statement of the systemic root cause}

### Contributing Factors
- {Factor 1: what made this worse or more likely}
- {Factor 2}

---

## Action Items

| Action | Type | Owner | Deadline | Status |
| :--- | :--- | :--- | :--- | :--- |
| {action description} | prevent / detect / mitigate | {owner} | {date} | open |
| Add monitoring alert for {condition} | detect | {owner} | {date} | open |
| Add runbook for {scenario} | mitigate | {owner} | {date} | open |

**Action types**:
- **prevent**: stops this class of incident from recurring
- **detect**: alerts earlier so MTTR decreases
- **mitigate**: limits blast radius when it does occur

---

## What Went Well

- {Something that worked: early detection, good communication, fast rollback}
- {Another positive}

---

## Lessons Learned

{1-2 sentence summary of the key systemic lesson from this incident}
