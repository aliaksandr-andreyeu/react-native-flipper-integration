# Security Policy

## Supported versions

The latest published `1.x` release receives security fixes. Older versions are not maintained.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

Report privately via one of:

- GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) (Security → Report a vulnerability), or
- email **security@cycleport.com**.

Include a description, reproduction steps, affected version(s), and impact. We aim to acknowledge within 5 business days and to coordinate a fix and disclosure timeline with you.

## Scope notes

This package integrates the Flipper SDK, which is intended for **debug builds** only (`FLIPPER_DEBUG_ONLY=true`, the default). Shipping Flipper in production builds can expose application data on the local network — keep the default unless you fully understand the implications.
