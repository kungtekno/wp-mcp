# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously in the WordPress MCP Server project. If you discover a security vulnerability, please follow these steps:

1. **DO NOT** open a public issue
2. Email security concerns to: security@your-email.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Best Practices

When using this MCP server:

### Authentication
- Always use WordPress Application Passwords, never your main password
- Rotate Application Passwords regularly
- Use unique passwords for each integration

### Network Security
- Always use HTTPS connections
- Keep SSL verification enabled in production
- Use a firewall to restrict API access if possible

### Configuration Security
- Never commit `wordpress-config.json` to version control
- Use environment variables for sensitive data
- Restrict file permissions on configuration files
- Use `.gitignore` to exclude sensitive files

### WordPress Security
- Keep WordPress core, themes, and plugins updated
- Use security plugins (Wordfence, Sucuri, etc.)
- Implement rate limiting on your WordPress site
- Monitor access logs regularly

### Data Protection
- This MCP server does not store any WordPress data locally
- All data is transmitted directly to/from WordPress
- No caching of sensitive information

## Security Features

This MCP server implements:

- ✅ HTTPS-only connections by default
- ✅ Application Password authentication
- ✅ Input validation and sanitization
- ✅ Rate limiting support
- ✅ Error messages that don't expose credentials
- ✅ Configurable timeouts
- ✅ SSL certificate verification

## Vulnerability Response

When a vulnerability is reported:

1. We will acknowledge receipt within 48 hours
2. Investigate and validate the issue
3. Develop and test a fix
4. Release a security update
5. Credit the reporter (unless they prefer anonymity)

## Dependencies

We regularly update dependencies to patch known vulnerabilities:
- Run `npm audit` to check for vulnerabilities
- Use `npm audit fix` to automatically fix issues
- Monitor security advisories for our dependencies

## Contact

For security concerns, contact: security@your-email.com

For general issues, use: https://github.com/yourusername/wp-mcp/issues