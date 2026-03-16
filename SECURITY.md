# Security Policy

This document outlines the security practices and vulnerability reporting for Notorium.

## Security Architecture

Notorium implements multiple security layers:

- **Admin approval system** prevents unauthorized access
- **User data isolation** ensures privacy between accounts
- **Encrypted AI settings** protect user-provided API keys
- **Rate limiting** prevents abuse of features
- **Secure session management** with Better Auth

For detailed security setup and user management, see [USER_APPROVAL_SETUP.md](./USER_APPROVAL_SETUP.md).

## Reporting Security Issues

If you discover a security vulnerability, please report it privately:

1. **Do not** open a public issue
2. Email your findings to: j.guerreiro@unesp.br
3. Include detailed steps to reproduce
4. Allow reasonable time for response before disclosure

## Security Best Practices

### For Self-Hosting
- Generate strong secrets for authentication and encryption
- Use HTTPS in production
- Keep dependencies updated
- Regularly monitor user approval queue
- Backup data with encryption

### For Development
- Never commit secrets or API keys
- Use environment variables for all configuration
- Test with different user permission levels
- Validate all inputs with Zod schemas

## Compliance

Notorium is designed to be privacy-first:
- No tracking or analytics by default
- User data remains under user control
- AI processing uses user-provided keys only
- No data shared with third parties without explicit consent
