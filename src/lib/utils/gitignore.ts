export interface PatternResult {
  regex: RegExp;
  isNegation: boolean;
}

export function getFileExtension(path: string): string | null {
  const parts = path.split('.');
  if (parts.length > 1) {
    return '.' + parts[parts.length - 1];
  }
  return null;
}

export function patternToRegex(pattern: string): PatternResult | null {
  // Remove leading/trailing whitespace
  pattern = pattern.trim();

  // Skip empty lines and full-line comments
  if (!pattern || pattern.startsWith('#')) {
    return null;
  }

  // Handle inline comments (remove everything after unescaped #)
  // Look for # that's not preceded by backslash
  const inlineCommentMatch = pattern.match(/(?<!\\)#/);
  if (inlineCommentMatch) {
    pattern = pattern.substring(0, inlineCommentMatch.index).trim();
    if (!pattern) return null;
  }

  // Check for negation pattern (starts with !)
  const isNegation = pattern.startsWith('!');
  if (isNegation) {
    pattern = pattern.substring(1); // Remove the leading !
    if (!pattern) return null;
  }

  // Remove escaped # (replace \# with #)
  pattern = pattern.replace(/\\#/g, '#');

  const isDirectory = pattern.endsWith('/');
  if (isDirectory) {
    pattern = pattern.slice(0, -1); // Remove trailing slash
  }

  // Convert gitignore pattern to regex
  let regexPattern = '';
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];
    const nextChar = pattern[i + 1];

    if (char === '*' && nextChar === '*') {
      // Double asterisk: match zero or more directories
      const afterNext = pattern[i + 2];
      if (afterNext === '/') {
        // **/ means zero or more directories
        regexPattern += '(?:.*/)?';
        i += 3; // Skip **, /
        continue;
      } else if (i === 0 || pattern[i - 1] === '/') {
        // ** at start or after / means match everything
        regexPattern += '.*';
        i += 2;
        continue;
      }
    }

    if (char === '*') {
      // Single asterisk: match anything except /
      regexPattern += '[^/]*';
      i++;
      continue;
    }

    if (char === '?') {
      // Question mark: match any single character except /
      regexPattern += '[^/]';
      i++;
      continue;
    }

    if (char === '[') {
      // Character class: find closing ]
      const closeIdx = pattern.indexOf(']', i + 1);
      if (closeIdx !== -1) {
        // Extract character class and escape special regex chars inside
        let charClass = pattern.substring(i + 1, closeIdx);
        // Escape backslash and other special chars in character class
        charClass = charClass.replace(/\\/g, '\\\\');
        regexPattern += '[' + charClass + ']';
        i = closeIdx + 1;
        continue;
      }
    }

    // Escape special regex characters
    if ('.+^${}()|\\'.includes(char)) {
      regexPattern += '\\' + char;
    } else {
      regexPattern += char;
    }

    i++;
  }

  // Handle root-level patterns (starting with /)
  if (pattern.startsWith('/')) {
    regexPattern = '^' + regexPattern.substring(1); // Remove leading /
  } else {
    // Pattern can match anywhere in path
    regexPattern = '(^|/)' + regexPattern;
  }

  // Handle directory patterns
  if (isDirectory) {
    regexPattern = regexPattern + '($|/.*)';
  } else {
    regexPattern = regexPattern + '$';
  }

  try {
    return {
      regex: new RegExp(regexPattern),
      isNegation,
    };
  } catch {
    // Invalid pattern
    return null;
  }
}
