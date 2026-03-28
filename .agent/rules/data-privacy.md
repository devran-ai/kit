---
name: data-privacy
description: PII handling, data classification, GDPR/CCPA compliance, and third-party data sharing requirements
---

# Data Privacy Rules

> **Priority**: CRITICAL — Applied to all tasks handling user data, personal information, or third-party data sharing

---

## PII Handling

- **NEVER** log PII (names, emails, phone numbers, addresses, IPs, device IDs) in application logs
- **ALWAYS** encrypt PII at rest (database-level encryption minimum, column-level for sensitive fields)
- **MINIMIZE** collection — collect only what the feature requires, nothing more
- **PSEUDONYMIZE** where possible — use user IDs instead of names/emails in analytics and internal processing
- **MASK** in non-production environments — dev/staging databases must not contain real PII (use faker/anonymized data)

---

## Data Classification

| Level | Examples | Storage | Access | Retention |
| :--- | :--- | :--- | :--- | :--- |
| **Public** | Marketing content, docs, pricing | Any | Unrestricted | Indefinite |
| **Internal** | Analytics, system metrics, logs | Encrypted at rest | Authenticated employees | Per policy (typically 1-3 years) |
| **Confidential** | User profiles, emails, preferences | Encrypted at rest + column-level | Need-to-know basis | Minimum necessary, max 5 years |
| **Restricted** | Passwords, payment data, health records, SSNs | Encrypted at rest + in transit + column-level | Strict access control + audit log | Regulatory minimum, delete when no longer needed |

- Every new data field must be classified BEFORE implementation
- Classification determines handling requirements — no exceptions

---

## GDPR Core Requirements

| Principle | Implementation |
| :--- | :--- |
| **Lawful basis** | Document legal basis for every data collection (consent, contract, legitimate interest) |
| **Consent** | Explicit opt-in required for non-essential data processing — pre-checked boxes are NOT valid consent |
| **Right to access** | Users can request all data held about them — implement data export endpoint |
| **Right to erasure** | User account deletion must cascade to ALL user data across all services within 30 days |
| **Data portability** | Export user data in machine-readable format (JSON/CSV) |
| **Breach notification** | Security breaches affecting PII must be reported to authority within 72 hours |
| **Data retention** | Define and enforce retention periods — auto-delete data beyond retention window |
| **Data minimization** | Collect only what's needed — review and justify every field |

---

## Third-Party Data Sharing

- **DOCUMENT** every third-party that receives user data: who, what data, why, how secured
- **DATA PROCESSING AGREEMENTS** required for all third-party processors (analytics, email, payment)
- **NEVER** send PII to third-party services without explicit user consent
- **AUDIT** third-party data access annually — remove access for services no longer in use

---

## AI Pipeline Privacy

- **NEVER** send raw user PII to external AI providers without anonymization review
- **CONSENT** required for AI processing of user content — document and obtain
- **LOG** all AI API calls for audit trail (sans PII)
- **VALIDATE** AI outputs before presenting to users — hallucination guards for PII
- **RETENTION**: AI training data containing user content must follow same retention policies as source data

---

## Cookie & Tracking Compliance

- **Essential cookies only** by default — no tracking cookies before consent
- **Cookie consent banner** required for all user-facing web applications
- **Do-Not-Track**: Respect `DNT` header when set by user's browser
- **Analytics**: Use privacy-respecting alternatives when possible (Plausible, Fathom over Google Analytics)

---

## Cross-References

- **Agent**: `security-reviewer` — GDPR section and PII scanning
- **Rule**: `.agent/rules/security.md` — complementary (security covers auth/injection; data-privacy covers PII/consent/retention)
- **Domain enhancer**: `.agent/skills/plan-writing/domain-enhancers.md` (Security Domain: Compliance Requirements)
