# Ubiquitous Language

## Core Pipeline

| Term | Definition | Aliases to avoid |
| ----------- | ------------------------------------------------------- | --------------------- |
| **Source** | A repository or local directory that provides files for conversion | Input, origin |
| **Output** | The formatted plain-text result produced from selected files, ready for LLM consumption | Result, export, generated text |
| **Provider** | A pluggable module that knows how to fetch a file tree and file contents from a specific **Source** type | Adapter, connector, fetcher |
| **Generation** | The act of assembling selected file contents into **Output** with directory tree and token counts | Conversion, export, formatting |
| **Provider Type** | The kind of **Source**: `github` or `local` — determines which **Provider** handles the request | Source type, input type |

## Source Types

| Term | Definition | Aliases to avoid |
| ----------- | ------------------------------------------------------- | --------------------- |
| **Repository** | A GitHub-hosted codebase identified by owner/name, optionally at a specific branch and path | Repo, project |
| **Directory** | A local folder on the user's machine, accessed via the browser's native directory picker | Folder, local repo |
| **Zip File** | An uploaded `.zip` archive whose contents are treated as a **Source** | Archive, compressed file |

## Tree & Selection

| Term | Definition | Aliases to avoid |
| ----------- | ------------------------------------------------------- | --------------------- |
| **File Tree** | The hierarchical visualization of all files and directories in a **Source** | Tree view, file list, directory listing |
| **FileNode** | A flat descriptor for a single file or directory entry in the tree, carrying path, type, URL, and SHA | Node, item, entry |
| **TreeNode** | A hierarchical node in the rendered **File Tree**, with selection state, visibility, and children | Tree item, row |
| **Selected Path** | A file path marked for inclusion in **Generation** | Checked path, included path |
| **Excluded Path** | A file path marked for exclusion by gitignore rules — excluded files cannot be selected | Ignored path, filtered-out path |
| **Expanded Path** | A directory path whose children are currently visible in the **File Tree** | Open path, unfolded path |
| **Selection State** | The tri-state of a directory or extension: checked, unchecked, or indeterminate | Check state, toggle state |

## Filtering

| Term | Definition | Aliases to avoid |
| ----------- | ------------------------------------------------------- | --------------------- |
| **Extension Filter** | A control that selects or deselects all files sharing a given file extension (e.g. `.ts`, `.py`) | File type filter, extension toggle |
| **Gitignore Pattern** | A glob-style rule that marks matching paths as **Excluded Paths**, supporting negation with `!` | Ignore rule, exclusion rule |
| **Custom Pattern** | A user-supplied **Gitignore Pattern** entered at runtime, distinct from patterns loaded from `.gitignore` files | User pattern, manual rule |
## Output Format

| Term | Definition | Aliases to avoid |
| ----------- | ------------------------------------------------------- | --------------------- |
| **Directory Tree** | The ASCII-art section of **Output** showing the hierarchical structure of selected files and folders | Tree section, structure block |
| **File Contents** | The section of **Output** listing each selected file's full text, prefixed with its path | Code section, content block |
| **Token Count** | The number of GPT tokens in the **Output**, computed by the tokenizer Web Worker | Token count, token total |
| **Line Count** | The number of lines in the **Output** | Line total |
| **File Statistics** | Per-file breakdown of **Token Count** and **Line Count** within the **Output** | File stats, per-file stats |

## Authentication

| Term | Definition | Aliases to avoid |
| ----------- | ------------------------------------------------------- | --------------------- |
| **PAT** | A GitHub Personal Access Token stored encrypted in the extension, used for API authentication and higher rate limits | Token, access token, API key, credentials |
| **Session Mode** | An authentication strategy that uses the browser's existing GitHub session cookies via the background service worker, instead of a **PAT** | Browser auth, cookie auth |
| **Credentials** | The authentication data associated with a **Provider** — typically a **PAT**, username/password, or instance URL | Auth, login |

## Caching & State

| Term | Definition | Aliases to avoid |
| ----------- | ------------------------------------------------------- | --------------------- |
| **Repo Cache** | A time-limited (24h) store mapping repository URLs to previously fetched **FileNode** arrays and **File Tree** structures | Cache, stored repo |
| **Processing State** | The current phase of the extension's work on a **Source**: loading, loaded, or generating | Status, pipeline state |
| **Badge** | The notification indicator on the extension icon showing that a **Source** is being processed | Notification, indicator |

## GitHub-Specific

| Term | Definition | Aliases to avoid |
| ----------- | ------------------------------------------------------- | --------------------- |
| **Owner** | The GitHub user or organization that owns a **Repository** | Account, org |
| **Branch** | A Git ref (branch or tag) within a **Repository**, possibly containing slashes | Ref, version |
| **Ref** | The resolved Git reference used to fetch the tree — may be a branch name or tag | SHA, commit, reference |
| **Convert Button** | The "Convert to Text" button injected into GitHub repository pages by the content script | Injected button, page action |
| **Settings** | User preferences controlling UI behavior (show **Convert Button**, show **Token Count**, show **Line Count**, auto-expand directories) | Preferences, options |

## Relationships

- A **Provider** fetches a **File Tree** from exactly one **Source** type (GitHub, Local, or Zip)
- A **Repository** is identified by an **Owner** and name, optionally scoped to a **Branch** and path
- A **FileNode** is either a file (blob) or directory (tree) within a **File Tree**
- A **TreeNode** is the hierarchical projection of one or more **FileNode**s for rendering
- **Selected Paths** determine which **FileNode**s are included in **Generation**
- **Excluded Paths** override **Selected Paths** — an excluded file cannot be selected
- **Gitignore Patterns** produce **Excluded Paths**; negation patterns restore paths
- **Extension Filters** toggle **Selected Paths** for all files of a given extension
- **Generation** consumes selected **FileNode**s, fetches their content, and produces **Output**
- **Output** consists of a **Directory Tree** section and a **File Contents** section
- A **PAT** enables API-mode fetching; **Session Mode** enables cookie-based fetching
- The **Repo Cache** stores **FileNode** arrays keyed by **Source** URL, with a 24-hour TTL
- The **Badge** reflects the current **Processing State**

## Example dialogue

> **Dev:** "When the user pastes a GitHub URL and clicks Load, which **Provider** handles the **File Tree** fetch?"
>
> **Domain expert:** "The **GitHub Provider**. It parses the URL to extract the **Owner** and **Repository** name, then resolves the **Ref** — which may be a **Branch** with slashes like `feature/auth/login`. It tries the API first with a **PAT** if available; if that gets a 404, it falls back to **Session Mode**."
>
> **Dev:** "And once the **File Tree** is loaded, how do **Excluded Paths** interact with **Selected Paths**?"
>
> **Domain expert:** "**Excluded Paths** always win. If a gitignore pattern marks `node_modules/` as excluded, those files can't be selected even by **Extension Filter** or 'Select All'. Only a negation pattern can bring them back."
>
> **Dev:** "During **Generation**, do we re-fetch everything or use the **Repo Cache**?"
>
> **Domain expert:** "The **Repo Cache** is checked when loading the **File Tree** — if a cached version exists and is under 24 hours old, we skip the fetch. But file contents are always fetched fresh during **Generation**, because the user may have changed the **Selected Paths**."

## Flagged ambiguities

- **"Token"** was used to mean both a **PAT** (GitHub authentication credential) and a **Token Count** (GPT tokenizer unit). These are distinct concepts: a **PAT** authenticates API requests, while **Token Count** measures output size. Recommend always using **PAT** for the credential and **Token Count** for the measurement.
- **"Tree"** was used loosely to mean both the flat **FileNode[]** array fetched by a **Provider** and the hierarchical **TreeNode[]** structure rendered in the UI. These are different shapes: **FileNode** is the raw data; **TreeNode** is the UI projection with selection/visibility state. Recommend always qualifying as **File Tree** (the visual component) or **FileNode array** (the data).
- **"Cache"** was sometimes used to refer to the **Repo Cache** (persisted in chrome.storage) and sometimes to in-memory caching within a **Provider** instance. Recommend reserving **Repo Cache** for the persisted store and using "provider-local cache" for the in-memory variant.
- **"Output"** was occasionally conflated with "the output panel" (the UI component). Recommend using **Output** for the domain concept (formatted text) and "OutputPanel" for the React component.
