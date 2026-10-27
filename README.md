<div align="center">

# Otium Downloader

<p align="center">
  <em>otium</em> &nbsp;/ˈoː.ti.um/&nbsp; <sup>n. Latin</sup><br/>
  The time set aside for reading, thought, and rest — as opposed to <em>negotium</em>: work, obligation, noise.
</p>

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-00e599?style=flat-square" alt="Version" />
  &nbsp;
  <img src="https://img.shields.io/badge/platform-Windows-00e599?style=flat-square" alt="Platform" />
  &nbsp;
  <img src="https://img.shields.io/badge/stack-Rust%20•%20Tauri%20v2%20•%20React%2019-111827?style=flat-square" alt="Stack" />
  &nbsp;
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square" alt="License" />
</p>

</div>

---

A sovereign, local-first multi-segment download accelerator. No accounts, no cloud proxy servers, no telemetry, and zero rate limits. 

## Key Features

- **Multi-Segment Parallel Streams:** Splits large downloads into 4, 8, or 16 parallel range byte-chunks to saturate network throughput.
- **Dynamic Segment Matrix:** Real-time visual matrix displaying the progress and speed of every parallel stream.
- **Pause & Resume Resiliency:** Robust handling of connection drops and paused downloads via HTTP `Range` headers.
- **Integrity Verification:** Instant automated SHA-256 and MD5 hash checksum matching upon completion.
- **100% Local-First:** Your downloads, link logs, and file destinations never leave your machine.
- **Bilingual Interface:** Instant seamless switching between English and Arabic (RTL).

---

## Build & Run

```bash
# Install dependencies
npm install

# Run development mode
npm run dev

# Run Vitest test suite
npm test

# Build production bundle
npm run build
```

## License

Licensed under the **GNU General Public License v3.0 (GPL-3.0)**.
