---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Use references/command.md (pinned offline snapshot); fetch newer guidelines only for an explicit online refresh.
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

Pinned offline source: references/command.md. Record snapshot versus refreshed source in the report. Upstream refresh URL:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use the local snapshot without network. For an explicitly requested refresh, use available browsing tools and record the source revision.

## Usage

When a user provides a file or pattern argument:
1. Read references/command.md; refresh only when explicitly requested
2. Read the specified files
3. Apply all rules from the fetched guidelines
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.
