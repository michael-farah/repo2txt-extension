# repo2txt - Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Convert GitHub repositories and local folders to plain text for LLM prompts**
> Privacy-first Chrome extension for AI-assisted development

## Acknowledgments

This extension forks [repo2txt](https://github.com/abinthomasonline/repo2txt) by [Abin Thomas](https://github.com/abinthomasonline). The original web version lives at [abinthomas.in/repo2txt](https://abinthomas.in/repo2txt/). Core architecture, provider system, and UI design come from the original project.

## Features

### Multiple Sources

- **GitHub**: Public and private repositories with token support
- **Local Files**: Directory picker for your local projects
- **Zip Upload**: Drag and drop zip files

### Smart Filtering

- **Extension Filter**: Select and deselect by file type
- **Gitignore Support**: Respects .gitignore patterns automatically
- **Custom Patterns**: Add your own ignore patterns
- **Directory Selection**: Cherry-pick specific folders
- **File Tree Preview**: Visual file selection with virtual scrolling

### Performance

- **Virtual Scrolling**: Handles repositories with 10,000+ files
- **Code Splitting**: Lazy-loaded providers for optimal bundle size
- **Web Workers**: Tokenization runs in background threads
- **Progressive Loading**: Streams file contents as they load
- **Smart Caching**: Efficient memory usage for large repos

### Modern UX

- **Dark Mode**: System, light, and dark themes
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Token Counter**: Real-time GPT token counting
- **File Statistics**: Per-file token and line counts
- **Progress Indicators**: Clear feedback during loading
- **GitHub Integration**: "Convert to Text" button on GitHub repo pages

### Privacy First

- **100% Client-Side**: No server uploads, all processing is local
- **No Tracking**: Your code never leaves your device
- **Encrypted Storage**: GitHub tokens encrypted with per-install keys
- **Open Source**: Fully auditable codebase

## Install

### From Source

```bash
git clone https://github.com/michael-farah/repo2txt-extension.git
cd repo2txt-extension
bun install
bun run build
```

Then load the `dist/` folder as an unpacked extension in `chrome://extensions`.

### For Distribution

```bash
bun run build:crx
```

This creates `release/repo2txt-v{version}.zip` for Chrome Web Store upload and `release/repo2txt-v{version}.crx` for self-hosted distribution.

### Development

```bash
bun install
bun run dev
```

Open `http://localhost:5173` in your browser.

## Usage

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

You can also visit any GitHub repo page and click the "Convert to Text" button injected into the page header.

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

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **State Management**: Zustand
- **File Handling**: JSZip
- **Tokenization**: gpt-tokenizer (Web Worker)
- **Virtual Scrolling**: TanStack Virtual
- **Testing**: Vitest + Playwright

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development guide and architecture details.

```bash
git clone https://github.com/michael-farah/repo2txt-extension.git
cd repo2txt-extension
bun install
bun run test:unit
bun run dev
```

## Browser Support

**Chrome Only.** This extension uses Chrome Manifest V3 APIs including service workers and `chrome.storage.local`.

### Future Support

- **Firefox**: Would require `browser-polyfill` for API compatibility and MV3 adjustments
- **Safari**: Requires Xcode project generation and App Store distribution
- **Edge**: Should work as-is since Edge supports Chrome extensions

Contributions for cross-browser support are welcome.

## Future Providers

Support for additional Git hosting platforms is under consideration:

- **GitLab**: API authentication, self-hosted instances, different rate limits
- **Bitbucket**: API authentication, different repository structure
- **Gitea/Forgejo**: Self-hosted instances, API versioning

To contribute a new provider, extend `BaseProvider` and implement `fetchTree`, `fetchFile`, `validateUrl`, and `parseUrl`. See `src/features/github/GitHubProvider.ts` for reference.

## License

MIT License. See [LICENSE](./LICENSE) for details.

## Links

- **Repository**: [github.com/michael-farah/repo2txt-extension](https://github.com/michael-farah/repo2txt-extension)
- **Original Web Version**: [github.com/abinthomasonline/repo2txt](https://github.com/abinthomasonline/repo2txt)
- **Issues**: [GitHub Issues](https://github.com/michael-farah/repo2txt-extension/issues)
