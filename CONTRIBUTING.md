# Contributing to Otium Downloader

Thank you for your interest in contributing to **Otium Downloader**. We welcome contributions that maintain our high bar for performance, security, zero-telemetry privacy, and minimalist design.

---

## Engineering Standards

1. **Zero AI Slop & Minimalist Purity:**
   Every feature, UI element, and line of code must serve a concrete purpose. We avoid unnecessary wrappers, duplicate state stores, bloated dependencies, and generic marketing copy.
2. **Deterministic Parity:**
   Versions across `package.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, and UI constants must remain strictly synchronized. Run `npm run version:check` before submitting PRs.
3. **100% Green Test Suite:**
   All PRs must pass:
   - Vitest unit tests: `npm test`
   - Production Vite + TypeScript build: `npm run build`
   - Rust cargo test suite: `cargo test --manifest-path src-tauri/Cargo.toml`
4. **Local-First & Memory Efficiency:**
   Never introduce telemetry, external analytics, remote tracking scripts, or unverified cloud dependencies. File operations must stream directly to disk without loading multi-gigabyte buffers into RAM.

---

## Development Setup

### Prerequisites
- **Node.js**: v20 or v22 (LTS recommended)
- **Rust Toolchain**: 1.80+ (`rustup default stable`)
- **Tauri v2 System Dependencies**:
  - Windows: Visual Studio C++ Build Tools & WebView2
  - Linux: `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `libssl-dev`
  - macOS: Xcode Command Line Tools

### Setup Commands

```bash
# 1. Clone repository
git clone https://github.com/XRTM8/Otium-Downloader.git
cd Otium-Downloader

# 2. Install Node dependencies
npm ci

# 3. Run frontend development server
npm run dev

# 4. Run desktop development environment (Tauri)
npm run tauri:dev
```

---

## Verification Commands

Before creating a commit or pull request, ensure all verification steps pass locally:

```bash
# Verify version consistency
npm run version:check

# Run Vitest unit tests
npm test

# Run Rust cargo test suite
cargo test --manifest-path src-tauri/Cargo.toml

# Test production build
npm run build
```

---

## Commit Guidelines

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat(scope): ...` for new capabilities
- `fix(scope): ...` for bug and regression fixes
- `refactor(scope): ...` for architecture improvements without behavior changes
- `test(scope): ...` for adding or improving test coverage
- `docs(scope): ...` for documentation updates

---

## Pull Request Checklist

- [ ] Code compiles without warnings (`tsc -b && vite build`).
- [ ] All unit tests pass (`npm test` and `cargo test`).
- [ ] No regression in version parity check (`npm run version:check`).
- [ ] No new third-party dependencies without explicit rationale.
- [ ] UI changes respect the Obsidian/Emerald minimal design language.
