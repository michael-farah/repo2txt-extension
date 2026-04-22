<div align="center">

<img width="120" height="120" alt="repo2txt-extension-logo" src="https://github.com/user-attachments/assets/9b91b9e5-cbec-46ef-8011-0cbc4cf2187d" />

# repo2txt-extension

**Convert any repo to LLM-ready text — in one click**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Install from Releases](https://img.shields.io/badge/Install-GitHub%20Releases-2ea44f?style=for-the-badge&logo=github&logoColor=white)](https://github.com/michael-farah/repo2txt-extension/releases)
[![GitHub Stars](https://img.shields.io/github/stars/michael-farah/repo2txt-extension?style=for-the-badge&color=ffd700&logo=github)](https://github.com/michael-farah/repo2txt-extension/stargazers)
[![Privacy First](https://img.shields.io/badge/Privacy-First-10b981?style=for-the-badge&logo=shield&logoColor=white)](https://github.com/michael-farah/repo2txt-extension#privacy-first)

<img width="100%" alt="repo2txt-extension-banner" src="https://github.com/user-attachments/assets/f46766d8-290b-4946-872b-21094b8a692a" />

</div>

---

## Overview

**repo2txt-extension** is a privacy-first browser extension that converts GitHub repositories and local folders into plain text optimized for LLM prompts. Whether you're analyzing code with ChatGPT, Claude, or any other AI assistant, this tool gets your codebase ready in seconds — without ever uploading your code to a server.

> 🔒 **100% Client-Side** • 🚀 **One-Click Conversion** • 🌐 **GitHub + Local Files**

---

## ✨ Features

### 📁 Multiple Sources

- **GitHub** — Public and private repositories with personal access token support
- **Local Files** — Native directory picker for projects on your machine
- **Zip Upload** — Drag and drop zip files for instant conversion

### 🔍 Smart Filtering

- **Extension Filter** — Select and deselect by file type in one click
- **Gitignore Support** — Automatically respects `.gitignore` patterns
- **Custom Patterns** — Add your own ignore rules on the fly
- **Directory Selection** — Cherry-pick specific folders from the tree
- **File Tree Preview** — Visual file selection with virtual scrolling

### ⚡ Performance

- **Virtual Scrolling** — Handles repositories with **10,000+ files** smoothly
- **Code Splitting** — Lazy-loaded providers for optimal bundle size
- **Web Workers** — Tokenization runs in background threads
- **Progressive Loading** — Streams file contents as they load
- **Smart Caching** — Efficient memory usage for large repositories

### 🎨 Modern UX

- **Dark Mode** — System, light, and dark themes
- **Responsive Design** — Works on desktop, tablet, and mobile
- **Token Counter** — Real-time GPT token counting
- **File Statistics** — Per-file token and line counts
- **Progress Indicators** — Clear visual feedback during loading
- **GitHub Integration** — "Convert to Text" button injected on GitHub repo pages

### 🛡️ Privacy First

- **100% Client-Side** — No server uploads, all processing is local
- **No Tracking** — Your code never leaves your device
- **Encrypted Storage** — GitHub tokens encrypted with per-install keys
- **Open Source** — Fully auditable codebase

---

## 🚀 Installation

### From GitHub Releases (Recommended)

This is the quickest way to get started — no coding or terminal required.

1. **Download** the latest `.zip` from the [Releases page](https://github.com/michael-farah/repo2txt-extension/releases)
2. **Unzip** the file to a folder on your computer
3. **Open your browser's extensions page** — type one of the following into your address bar:

   | Browser | URL                    |
   | ------- | ---------------------- |
   | Chrome  | `chrome://extensions`  |
   | Edge    | `edge://extensions`    |
   | Brave   | `brave://extensions`   |
   | Opera   | `opera://extensions`   |
   | Vivaldi | `vivaldi://extensions` |
   | Arc     | `chrome://extensions`  |

4. **Enable "Developer mode"** — toggle the switch in the top-right corner of the extensions page
5. **Click "Load unpacked"** — select the unzipped folder
6. **Pin the extension** to your toolbar — click the puzzle piece icon 🧩 and pin **repo2txt**

> 💡 **Tip:** This extension works on **all Chromium-based browsers**. If your browser isn't listed above, try `chrome://extensions` — it often works as a fallback.

### From Source (For Developers)

```bash
# Clone the repository
git clone https://github.com/michael-farah/repo2txt-extension.git
cd repo2txt-extension

# Install dependencies
bun install

# Build the extension
bun run build

# Then load the dist/ folder as an unpacked extension (see steps 3–6 above)
```

### Distribution Build

```bash
bun run build:crx
```

Creates:

- `release/repo2txt-v{version}.zip` — for self-hosted distribution
- `release/repo2txt-v{version}.crx` — for direct installation

---

## 📖 Usage

### GitHub Repository

1. Click the extension icon in your toolbar
2. Paste a GitHub URL: `https://github.com/facebook/react`
3. Optionally add a personal access token for:
   - Private repositories
   - Higher rate limits (5,000 vs 60 requests/hour)
4. Click **"Load Repository"**
5. Select files using the tree or extension filters
6. Click **"Generate"**
7. Copy to clipboard or download as `.txt`

**Pro tip:** Visit any GitHub repo page and click the **"Convert to Text"** button injected into the page header.

#### Supported URL Formats

```
https://github.com/owner/repo                           (default branch)
https://github.com/owner/repo/tree/branch-name          (specific branch)
https://github.com/owner/repo/tree/branch-name/path     (subfolder)
```

✓ Branch names with slashes (e.g., `feature/test/branch-name`) are fully supported.

### Local Files

1. Switch to the **"Local"** provider tab
2. Choose **"Directory"** or **"Zip File"**
3. Select your project folder or upload a zip
4. Use the same filtering and export options as GitHub

---

## 🏗️ Tech Stack

| Category              | Technology                 |
| --------------------- | -------------------------- |
| **Framework**         | React 19 + TypeScript      |
| **Build Tool**        | Vite 5                     |
| **Styling**           | Tailwind CSS 3             |
| **State Management**  | Zustand                    |
| **File Handling**     | JSZip                      |
| **Tokenization**      | gpt-tokenizer (Web Worker) |
| **Virtual Scrolling** | TanStack Virtual           |
| **Testing**           | Vitest + Playwright        |

---

## 🌐 Browser Support

| Browser     | Status       | Notes                                                |
| ----------- | ------------ | ---------------------------------------------------- |
| **Chrome**  | ✅ Supported | Manifest V3, service workers, `chrome.storage.local` |
| **Edge**    | ✅ Supported | Compatible with Chrome extensions                    |
| **Brave**   | ✅ Supported | Compatible with Chrome extensions                    |
| **Opera**   | ✅ Supported | Compatible with Chrome extensions                    |
| **Vivaldi** | ✅ Supported | Compatible with Chrome extensions                    |
| **Arc**     | ✅ Supported | Compatible with Chrome extensions                    |
| **Firefox** | 📋 Planned   | Requires `browser-polyfill` and MV3 adjustments      |
| **Safari**  | 📋 Planned   | Requires Xcode project and App Store distribution    |

Contributions for cross-browser support are welcome!

---

## 🔮 Future Providers

Support for additional Git hosting platforms is under consideration:

- **GitLab** — API authentication, self-hosted instances, different rate limits
- **Bitbucket** — API authentication, different repository structure
- **Gitea/Forgejo** — Self-hosted instances, API versioning

To contribute a new provider, extend `BaseProvider` and implement `fetchTree`, `fetchFile`, `validateUrl`, and `parseUrl`. See [`src/features/github/GitHubProvider.ts`](src/features/github/GitHubProvider.ts) for reference.

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development guide and architecture details.

```bash
git clone https://github.com/michael-farah/repo2txt-extension.git
cd repo2txt-extension
bun install
bun run test:unit
bun run build
```

---

## 🙏 Acknowledgments

This extension forks [repo2txt](https://github.com/abinthomasonline/repo2txt) by [Abin Thomas](https://github.com/abinthomasonline). The original web version lives at [abinthomas.in/repo2txt](https://abinthomas.in/repo2txt/). Core architecture, provider system, and UI design come from the original project.

---

## 📄 License

[MIT License](./LICENSE) © [Michael Farah](https://github.com/michael-farah)

---

<div align="center">

**[⭐ Star this repo](https://github.com/michael-farah/repo2txt-extension)** — **[🐛 Report Issues](https://github.com/michael-farah/repo2txt-extension/issues)** — **[💡 Suggest Features](https://github.com/michael-farah/repo2txt-extension/discussions)**

</div>
