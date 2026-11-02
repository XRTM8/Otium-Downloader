# Otium Downloader

<div align="center">

```
   ██████╗ ████████╗██╗██╗   ██╗███╗   ███╗
  ██╔═══██╗╚══██╔══╝██║██║   ██║████╗ ████║
  ██║   ██║   ██║   ██║██║   ██║██╔████╔██║
  ██║   ██║   ██║   ██║██║   ██║██║╚██╔╝██║
  ╚██████╔╝   ██║   ██║╚██████╔╝██║ ╚═╝ ██║
   ╚═════╝    ╚═╝   ╚═╝ ╚═════╝ ╚═╝     ╚═╝
```

**Sovereign, High-Throughput Multi-Segment Download Accelerator**  
*Desktop & Mobile • Zero Telemetry • Local-First Architecture*

[![Release](https://img.shields.io/badge/Release-v1.2.0-00e599.svg?style=flat-square)](https://github.com/XRTM8/Otium-Downloader/releases/latest)
[![CI Status](https://img.shields.io/github/actions/workflow/status/XRTM8/Otium-Downloader/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/XRTM8/Otium-Downloader/actions)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg?style=flat-square)](https://www.gnu.org/licenses/gpl-3.0)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2.12-purple.svg?style=flat-square)](https://v2.tauri.app)
[![Rust 2021](https://img.shields.io/badge/Rust-1.80+-orange.svg?style=flat-square)](https://www.rust-lang.org)
[![Privacy](https://img.shields.io/badge/Telemetry-0%25%20(None)-emerald.svg?style=flat-square)](#security--privacy)

</div>

---

## Overview

**Otium Downloader** is a sovereign, lightweight download accelerator engineered for maximum throughput, low memory footprint, and complete privacy. Built on **Tauri v2** and **Rust (Tokio)**, it divides single-file downloads into parallel byte-range streams, tracks live velocity on an oscilloscope waveform, resolves specialized cloud sources, and integrates seamlessly with web browsers through a local loopback bridge.

---

## Technical Specifications

| Dimension | Otium Downloader | Traditional Downloaders (IDM / FDM) |
| :--- | :--- | :--- |
| **Runtime & Memory** | Rust + Tauri v2 native binary (< 40MB RAM) | Heavy C++ or Electron wrappers (150MB - 400MB RAM) |
| **Telemetry & Tracking** | **0% (Zero)** — strictly local execution | Ad networks, user analytics, tracking beacons |
| **Concurrency Engine** | Tokio async multi-range with pre-allocated disk writes | Multi-process temporary file stitching |
| **Throughput Visualizer** | Live 20-tick SVG oscilloscope (0 re-renders) | Static progress bars or heavyweight graphs |
| **P2P & Magnet Support** | Native BEP 0003 & BEP 0009 parser with BTIH | External daemon or heavy torrent engine |
| **Browser Integration** | Localhost HTTP bridge (`127.0.0.1:41523`) + Manifest V3 | Proprietary NPAPI / closed binaries |
| **Audio Feedback** | Web Audio API pure tone synthesis (0 assets) | Bundled WAV/MP3 files |

---

## Core Capabilities

### 1. Dynamic Multi-Part Concurrency
- **1x, 4x, 8x, and 16x Connections:** Slices files into byte chunks (`Range: bytes=start-end`) to bypass server-side single-connection throttling.
- **Concurrent Disk Streaming:** Direct-to-disk write offsets using Tokio asynchronous I/O and Windows `FILE_SHARE_READ | FILE_SHARE_WRITE` pre-allocation to prevent disk fragmentation.
- **Automatic Fallback:** Gracefully falls back to single-stream downloading if the host server rejects partial byte ranges (HTTP 200 vs 206).

### 2. Live Throughput Oscilloscope
- **Hardware-Accelerated Waveform:** Real-time SVG throughput monitor sampling network velocity over 20 consecutive ticks.
- **Zero React Re-render Penalty:** Rendered with lightweight DOM updates and CSS hardware transforms.

### 3. Sovereign BitTorrent & Magnet Engine
- **BEP 0009 Magnet Parser:** Detects and extracts 40-character Hex and 32-character Base32 BitTorrent Info Hashes (BTIH), display names (`dn`), trackers (`tr`), and payload size.
- **BEP 0003 Bencode Parser:** Parses `.torrent` files, inspects multi-file hierarchies, and calculates SHA-1 info hashes locally.

### 4. Universal Link Resolver & Redirect Chaser
- **Hugging Face Resolver:** Converts model and dataset web URLs (`/blob/` -> `/resolve/`) into direct weight streams.
- **Internet Archive Resolver:** Translates detail pages (`/details/` -> `/download/`) into direct media downloads.
- **Cloud Storage Exporters:** Direct export resolvers for Google Drive (`/file/d/` -> `uc?export=download`), Dropbox (`?dl=1`), and GitHub raw user content.
- **Basic Auth Extraction:** Safely extracts embedded URL credentials (`http://user:pass@host/`) into sanitized `Authorization: Basic` headers.

### 5. Native Browser Extension (Manifest V3)
- Located in `browser-extension/`, compatible with Chrome, Edge, Brave, Opera, and Firefox.
- **Auto-Interception:** Automatically detects and forwards browser downloads to Otium's local loopback bridge.
- **Context Menu:** Right-click any link, video, audio, or image to dispatch to Otium instantly.
- **Offline Tolerance:** Falls back to default browser downloading if Otium is not running.

### 6. Security & Localhost Defensive Architecture
- **Path Traversal Shield:** Strict directory traversal mitigation (`sanitize_filename`) stripping `..`, `/`, `\`, and control characters.
- **Windows Device Name Guard:** Automatically escapes reserved device stems (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`).
- **Command Injection Prevention:** Uses native OS APIs for folder reveals (`tauri-plugin-opener`), avoiding shell interpreter invocation.
- **Localhost Loopback Isolation:** The browser bridge binds strictly to `127.0.0.1:41523` and rejects external network requests.
- **Storage Compaction:** LocalStorage task histories are bounded and auto-compacted to prevent storage quota exhaustion.

### 7. 120Hz Mobile Interface
- Independent mobile layout (`MobileApp.tsx`) with tactile haptic feedback and swipeable bottom sheets.

### 8. Synthesized Sound Engine & Global Hotkeys
- Audio alerts generated on-the-fly via the Web Audio API without bundled media files.
- Full keyboard control:
  - `?`: Toggle Keyboard Shortcuts Cheatsheet
  - `⌘N` / `Ctrl+N`: New Download Modal
  - `⌘,` / `Ctrl+,`: Toggle Settings
  - `/`: Focus Search Filter
  - `Esc`: Close Modals / Exit Selection Mode
  - `⌘V` / `Ctrl+V`: Quick Paste Download Link

---

## Architecture

```
otium-downloader/
├── browser-extension/     # Manifest V3 browser integration (Chrome, Edge, Firefox)
├── src-tauri/             # Native Rust core (Tokio, reqwest, local HTTP bridge)
│   ├── src/
│   │   ├── lib.rs         # Range downloader, loopback server, path security
│   │   └── main.rs        # Native entrypoint
│   └── Cargo.toml         # Rust dependency specifications
├── src/
│   ├── components/        # Obsidian minimalist React components
│   │   ├── AddTaskModal.tsx       # Single, batch & torrent link modal
│   │   ├── Header.tsx             # Controls, speed monitor & settings
│   │   ├── OtiumLogo.tsx          # Custom vector monogram SVG
│   │   ├── ShortcutsModal.tsx     # Keyboard cheatsheet modal
│   │   ├── TaskCard.tsx           # Telemetry card with dynamic chunk tracks
│   │   ├── TaskList.tsx           # Multi-select, filtering & bulk controls
│   │   └── ThroughputSparkline.tsx# Real-time velocity oscilloscope
│   ├── core/              # TypeScript core domain logic
│   │   ├── downloadManager.ts     # Task queue, IPC events & state machine
│   │   ├── linkResolver.ts        # Universal resolver & redirect chaser
│   │   ├── segmentation.ts        # Range math, categorization & sanitization
│   │   ├── sound.ts               # Web Audio API pure tone synthesizer
│   │   ├── storage.ts             # Quota-safe LocalStorage compaction
│   │   └── torrent.ts             # BEP 0003 bencode & BEP 0009 magnet engine
│   └── types/             # Domain TypeScript type definitions
└── scripts/
    └── check-version.mjs  # Automated cross-file version parity guard
```

---

## Installation

### Windows (`winget`)
```bash
winget install XRTM8.OtiumDownloader
```

### Prebuilt Installers
Download signed installers (`.exe`, `.msi`) or portable binaries from [GitHub Releases](https://github.com/XRTM8/Otium-Downloader/releases/latest).

---

## Building from Source

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or v22)
- [Rust](https://www.rust-lang.org/) (stable toolchain)
- C++ Build Tools & WebView2 (Windows)

### Build Steps

```bash
# 1. Clone repository
git clone https://github.com/XRTM8/Otium-Downloader.git
cd Otium-Downloader

# 2. Install dependencies
npm ci

# 3. Verify cross-platform version consistency
npm run version:check

# 4. Run test suites
npm test
cargo test --manifest-path src-tauri/Cargo.toml

# 5. Build desktop release package
npm run tauri:build
```

---

## Browser Extension Setup

1. Open your browser and navigate to `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the `browser-extension` folder inside this repository (or click "Open Extension Folder" directly in Otium Settings).
4. Otium Downloader is now integrated with your browser.

---

## Contributing & Security

- Contributions are welcome! Read [CONTRIBUTING.md](CONTRIBUTING.md) for code quality standards and testing workflows.
- For vulnerability disclosures, review our [SECURITY.md](SECURITY.md).

---

## License

Licensed under the **GNU General Public License v3.0 (GPL-3.0)**.  
See [LICENSE](LICENSE) for full details.
