/**
 * Binary file detection utility
 * Identifies files that should not be included in text output
 * (images, videos, compiled code, archives, etc.)
 */

/** Known binary file extensions — files that are never text */
const BINARY_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg', '.tiff', '.tif',
  '.avif', '.heic', '.heif',
  // Video
  '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v', '.mpg', '.mpeg',
  // Audio
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus',
  // Archives
  '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar', '.tgz', '.zst', '.lz',
  // Compiled/binaries
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.o', '.obj', '.pyc', '.pyo',
  '.class', '.jar', '.war', '.ear',
  // Fonts
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  // Documents (binary formats)
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
  // Database
  '.db', '.sqlite', '.sqlite3', '.mdb',
  // Other binary
  '.lock', '.wasm', '.node', '.nupkg', '.dll.config',
]);

/** Extensions that are technically text but almost never useful for LLM context */
const LOW_VALUE_EXTENSIONS = new Set([
  '.map',         // Source maps — large, machine-generated
  '.min.js',      // Minified JS — not useful for LLM
  '.min.css',     // Minified CSS — not useful for LLM
  '.bundle.js',   // Bundled JS
  '.chunk.js',    // Webpack chunks
  '.pack',        // Git pack files
  '.idx',         // Git index files
]);

/**
 * Check if a file is binary based on its extension
 * @returns true if the file should be excluded from text output
 */
export function isBinaryFile(path: string): boolean {
  const ext = getExtension(path);
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Check if a file is low-value for LLM context
 * (technically text, but usually not useful)
 */
export function isLowValueFile(path: string): boolean {
  const fileName = path.split('/').pop() ?? '';
  const ext = getExtension(path);

  // Check for compound extensions like .min.js, .bundle.js
  if (LOW_VALUE_EXTENSIONS.has(ext)) return true;

  // Check for .min.js / .min.css patterns
  if (fileName.endsWith('.min.js') || fileName.endsWith('.min.css')) return true;
  if (fileName.endsWith('.bundle.js') || fileName.endsWith('.chunk.js')) return true;

  return false;
}

/**
 * Check if a file should be auto-excluded from selection
 * Binary files are always excluded, low-value files are excluded by default
 */
export function shouldAutoExclude(path: string): boolean {
  return isBinaryFile(path) || isLowValueFile(path);
}

/**
 * Get the category of a file for display purposes
 */
export function getBinaryCategory(path: string): 'binary' | 'low-value' | 'text' {
  if (isBinaryFile(path)) return 'binary';
  if (isLowValueFile(path)) return 'low-value';
  return 'text';
}

/** Get lowercase extension including the dot */
function getExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return '';
  return path.slice(lastDot).toLowerCase();
}
