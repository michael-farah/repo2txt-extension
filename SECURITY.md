# Security Model

## Overview

repo2txt is a privacy-first Chrome extension. All processing happens client-side. No data is sent to external servers.

## Content Security Policy

- Manifest V3 CSP: `script-src 'self'; object-src 'self'`
- No inline scripts, no eval, no external script loading
- Meta CSP added to popup HTML as defense-in-depth

## Data Storage

### What We Store

- GitHub Personal Access Tokens (PATs) — encrypted with AES-GCM
- Repository cache data — stored in chrome.storage.local
- User preferences — stored in chrome.storage.local
- Processing state — stored in chrome.storage.session (ephemeral)

### Encryption Model

- **Algorithm**: AES-256-GCM with per-operation random IV
- **Key Generation**: `crypto.getRandomValues()` for 256-bit key material, SHA-256 hashed before import
- **Key Storage**: Encryption key stored in `chrome.storage.local` under key `repo2txt-enc-key`
- **Limitation**: The encryption key is stored alongside the encrypted data. This protects against casual inspection but does not protect against a determined attacker with access to chrome.storage. This is a known trade-off — Chrome extensions lack access to hardware-backed key storage.

### Storage Quotas

- `chrome.storage.local`: 10MB limit per extension
- Repository cache uses LRU eviction with 24-hour TTL
- Session storage is ephemeral (cleared when browser closes)

## Message Security

- Background service worker validates `sender.id` on all incoming messages
- Content script validates response structure from background
- URL validation prevents SSRF attacks in GitHub web fetch

## Content Script Security

- Uses `document.createElement()` exclusively (no innerHTML)
- `textContent` for all text content
- `createElementNS()` for SVG elements
- Explicitly avoids XSS vectors

## Host Permissions

- `https://api.github.com/*` — GitHub API for PAT-mode fetching
- `https://github.com/*` — GitHub web pages for session-mode fetching
- `https://raw.githubusercontent.com/*` — Raw file content in session mode

## Reporting

Report security vulnerabilities via GitHub Issues or directly to the maintainer.
