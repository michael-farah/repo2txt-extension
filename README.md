# repo2txt — Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Convert GitHub repositories and local folders to plain text for LLM prompts**
> Fast, privacy-first Chrome extension for AI-assisted development

## 🙏 Acknowledgments

This Chrome extension is a fork of [repo2txt](https://github.com/abinthomasonline/repo2txt) by [Abin Thomas](https://github.com/abinthomasonline). The original web version is available at [abinthomas.in/repo2txt](https://abinthomas.in/repo2txt/). Full credit for the core architecture, provider system, and UI design goes to the original project.

## ✨ Features

### 🔌 Multiple Sources

- **GitHub** - Public and private repositories with token support
- **Local Files** - Directory picker for your local projects
- **Zip Upload** - Drag & drop zip files
- **GitLab** (Beta) - GitLab repository support
- **Azure DevOps** (Beta) - Azure Repos integration

### 🎯 Smart Filtering

- **Extension Filter** - Select/deselect by file type
- **Gitignore Support** - Automatically respect .gitignore patterns
- **Custom Patterns** - Add your own ignore patterns
- **Directory Selection** - Cherry-pick specific folders
- **File Tree Preview** - Visual file selection with virtual scrolling

### 🚀 Performance

- **Virtual Scrolling** - Handle repositories with 10,000+ files
- **Code Splitting** - Lazy-loaded providers for optimal bundle size
- **Web Workers** - Tokenization runs in background threads
- **Progressive Loading** - Stream file contents as they load
- **Smart Caching** - Efficient memory usage for large repos

### 🎨 Modern UX

- **Dark Mode** - System, light, and dark themes
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Token Counter** - Real-time GPT token counting
- **File Statistics** - Per-file token and line counts
- **Progress Indicators** - Clear feedback during loading
- **GitHub Integration** - "Convert to Text" button on GitHub repo pages

### 🔒 Privacy First

- **100% Client-Side** - No server uploads, all processing is local
- **No Tracking** - Your code never leaves your device
- **Encrypted Storage** - GitHub tokens encrypted with per-install keys
- **Open Source** - Fully auditable codebase

## 🚀 Install

### From Source

```bash
git clone https://github.com/michael-farah/repo2txt-extension.git
cd repo2txt-extension
npm install
npm run build
```

Then load the `dist/` folder as an unpacked extension in `chrome://extensions`.

### Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## 📖 Usage

### GitHub Repository

1. Click the extension icon in your toolbar
2. Paste a GitHub URL: `https://github.com/facebook/react`
3. Optionally add a personal access token for:
   - Private repositories
   - Higher rate limits (5000 vs 60 requests/hour)
4. Click "Load Repository"
5. Select files using the tree or extension filters
6. Click "Generate"
7. Copy to clipboard or download as `.txt`

**Or**: Visit any GitHub repo page and click the "Convert to Text" button injected into the page header.

**Supported URL formats:**

- `https://github.com/owner/repo` (default branch)
- `https://github.com/owner/repo/tree/branch-name`
- `https://github.com/owner/repo/tree/branch-name/path/to/folder`
- Branch names with slashes: `feature/test/branch-name` ✓

### Local Files

1. Switch to "Local" provider tab
2. Choose "Directory" or "Zip File"
3. Select your project folder or upload a zip
4. Same filtering and export options as GitHub

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **State Management**: Zustand
- **File Handling**: JSZip
- **Tokenization**: gpt-tokenizer (Web Worker)
- **Virtual Scrolling**: TanStack Virtual
- **Testing**: Vitest + Playwright

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development guide and architecture details.

```bash
git clone https://github.com/michael-farah/repo2txt-extension.git
cd repo2txt-extension
npm install
npm run test:unit
npm run dev
```

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details

## 🔗 Links

- **Repository**: [github.com/michael-farah/repo2txt-extension](https://github.com/michael-farah/repo2txt-extension)
- **Original Web Version**: [github.com/abinthomasonline/repo2txt](https://github.com/abinthomasonline/repo2txt)
- **Issues**: [GitHub Issues](https://github.com/michael-farah/repo2txt-extension/issues)
