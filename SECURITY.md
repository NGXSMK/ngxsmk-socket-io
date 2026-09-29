# Security Policy

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

Report privately via GitHub Security Advisories:

https://github.com/NGXSMK/ngxsmk-socket-io/security/advisories/new

Include:

- A clear description of the issue
- Steps to reproduce (or a proof of concept)
- Affected package version(s) and environment (Angular / Node / browser if relevant)
- Impact assessment if you have one

We will acknowledge the report as soon as we can, confirm whether it is a
vulnerability, and share a remediation plan or fix timeline. Please give us a
reasonable window to release a fix before any public disclosure.

## Scope

In scope:

- Vulnerabilities in the published `ngxsmk-socket-io` library
- Security issues in first-party demo / example code that could mislead users
  into insecure defaults

Out of scope (report upstream when applicable):

- Vulnerabilities in `socket.io-client`, Angular, RxJS, or other dependencies
- Issues that require a malicious or misconfigured **application** server
- Social engineering, physical attacks, or denial-of-service against third-party
  hosts (GitHub Pages, Railway, etc.)

## Safe usage notes

- Prefer short-lived tokens in Socket.IO `auth`
- Do not log authentication payloads
- Validate event payloads on the **server**; this client does not sanitize
  message bodies
- Treat realtime input as untrusted
