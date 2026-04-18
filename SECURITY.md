# Security Policy

Use this document for vulnerability reporting and high-level security policy only.

Operational setup details belong in `README.md` and `docs/`, not here.

## Reporting a Vulnerability

Do not open a public issue for security findings.

Report vulnerabilities privately by email:

- `j.guerreiro@unesp.br`

Include:

- affected area
- impact
- reproduction steps
- suggested mitigation if available

## Disclosure Expectations

- Give reasonable time for review and remediation before public disclosure.
- Share only the minimum details needed until a fix is available.

## Operational Reminders for Self-Hosting

- Use strong secrets for auth and scheduled jobs.
- Use HTTPS in production.
- Keep your dependencies and base images updated.
- Restrict access to backing services where possible.
