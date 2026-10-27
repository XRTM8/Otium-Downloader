# Otium Downloader ⚡📥

<div align="center">

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-00e599.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2-blue.svg)](https://v2.tauri.app)
[![Rust](https://img.shields.io/badge/Rust-2021-orange.svg)](https://www.rust-lang.org)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local-green.svg)](#)
[![Windows](https://img.shields.io/badge/Platform-Windows%20%7C%20Desktop-black.svg)](#)

<p align="center">
  <em>otium</em> &nbsp;/ˈoː.ti.um/&nbsp; <sup>n. Latin</sup><br/>
  The time set aside for thought, reading, and rest — as opposed to <em>negotium</em>: obligation, friction, noise.
</p>

</div>

---

> **Otium Downloader** is a sovereign, high-throughput, multi-segment download accelerator for desktop. It splits large downloads into parallel HTTP byte-range streams, tracks telemetry chunk-by-chunk in a real-time matrix, verifies SHA-256 integrity locally, and recovers gracefully from network disconnects — with zero telemetry, zero cloud proxy servers, and zero accounts.

---

## ⚡ Core Capabilities

### 1. Multi-Segment Parallel Range Engine
- **4x, 8x, or 16x Concurrent Streams:** Slices incoming files into distinct byte segments (`Range: bytes=start-end`) to saturate connection bandwidth.
- **Dynamic Segment Matrix:** Real-time visual telemetry showing each individual chunk’s buffer state, speed, and percentage.
- **Native OS Network Throughput:** Direct connection without intermediate proxy servers or third-party cloud aggregators.

### 2. Resilient Pause & Resume Lifecycle
- **Lossless Recovery:** Pause downloads or recover automatically from network drops without restarting from scratch.
- **Safe Partial Writes:** Direct-to-disk chunk placement with exact seek offsets to prevent memory bloat on multi-gigabyte files.

### 3. Local Integrity Verification
- **Automated SHA-256 & Hash Matching:** Compare expected file hashes against on-device disk data upon completion.
- **Instant Destination Access:** Reveal downloaded files in Windows Explorer with one click.

### 4. Bilingual & Monolith Design
- **Instant AR / EN Switching:** Seamless switching between Arabic (native RTL with Tajawal typography) and English (JetBrains Mono).
- **Industrial Obsidian Palette:** Carbon obsidian surfaces (`#08090c`) with signal phosphor emerald accents (`#00e599`).

---

## 🔒 The Local-First Guarantee

- **Zero Cloud Infrastructure:** Your download URLs, logs, and file destinations never leave your physical computer.
- **Zero Telemetry:** No analytical pings, tracking beacons, or telemetry DNS lookups.
- **GNU GPL-3.0 Freedom:** 100% open-source software, inspectable, auditable, and buildable forever.

---

## 📐 The Modular Equation Ecosystem

Otium Downloader is part of the dual suite architecture:

```
[ Otium Link ]  +  [ Otium Downloader ]  =  [ ⭐ Otium Transfer Hub ]
 (P2P Local)         (Multi-Stream WAN)         (Future Unified Suite)
```

- **Otium Link:** Focused standalone tool for peer-to-peer LAN file and clipboard sharing.
- **Otium Downloader:** Focused standalone tool for accelerated web downloads.
- **Otium Transfer Hub:** The upcoming unified suite combining internal P2P mesh and external downloads into a single command center.

---

## 🚀 Installation

### Windows Package Manager (`winget`):
```bash
winget install XRTM8.OtiumDownloader
```

### Direct Download:
Download the signed NSIS installer or portable executable directly from [GitHub Releases](https://github.com/XRTM8/Otium-Downloader/releases/latest).

---

## 🛠️ Building from Source

### Prerequisites:
- **Node.js** (v20+) & **npm**
- **Rust** (stable toolchain)
- **Tauri CLI v2**

### Build Commands:
```bash
# Clone the repository
git clone https://github.com/XRTM8/Otium-Downloader.git
cd Otium-Downloader

# Install dependencies
npm install

# Run Vitest test suite
npm test

# Verify shared versions
npm run version:check

# Run desktop dev environment
npm run tauri:dev

# Build production Windows installer and portable EXE
npm run tauri:build
```

---

## 📜 License

Licensed under the **GNU General Public License v3.0 (GPL-3.0)**. See [LICENSE](LICENSE) for details.
