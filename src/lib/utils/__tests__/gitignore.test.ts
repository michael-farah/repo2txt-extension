import { getFileExtension, patternToRegex } from '../gitignore';

describe('getFileExtension', () => {
  test('returns null for path with no extension', () => {
    expect(getFileExtension('src/file')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(getFileExtension('')).toBeNull();
  });

  test('returns simple extension', () => {
    expect(getFileExtension('src/file.txt')).toBe('.txt');
  });

  test('returns last extension for multi-dot file names', () => {
    expect(getFileExtension('src/file.test.ts')).toBe('.ts');
  });

  test('returns extension for dotfiles like .gitignore', () => {
    expect(getFileExtension('.gitignore')).toBe('.gitignore');
  });

  test('returns extension for dotfile with additional extension', () => {
    expect(getFileExtension('.env.local')).toBe('.local');
  });

  test('returns extension for deeply nested path', () => {
    expect(getFileExtension('a/b/c/d/style.css')).toBe('.css');
  });
});

describe('patternToRegex', () => {
  test('returns null for empty string', () => {
    expect(patternToRegex('')).toBeNull();
  });

  test('returns null for whitespace-only string', () => {
    expect(patternToRegex('   ')).toBeNull();
  });

  test('returns null for full-line comment', () => {
    expect(patternToRegex('# comment')).toBeNull();
  });

  test('strips inline comments', () => {
    const res = patternToRegex('src/*.js # ignore these');
    expect(res).not.toBeNull();
    expect(res!.regex.test('src/app.js')).toBe(true);
  });

  test('returns null if inline comment leaves nothing', () => {
    expect(patternToRegex('#onlycomment')).toBeNull();
  });

  test('handles negation patterns', () => {
    const res = patternToRegex('!src/**');
    expect(res).not.toBeNull();
    expect(res!.isNegation).toBe(true);
  });

  test('returns null for bare ! with nothing after', () => {
    expect(patternToRegex('!')).toBeNull();
  });

  test('handles escaped #', () => {
    const res = patternToRegex('src/\\#file.js');
    expect(res).not.toBeNull();
    expect(res!.regex.test('src/#file.js')).toBe(true);
  });

  test('directory patterns match directory and contents', () => {
    const res = patternToRegex('src/');
    expect(res).not.toBeNull();
    expect(res!.regex.test('src')).toBe(true);
    expect(res!.regex.test('src/x.js')).toBe(true);
    expect(res!.regex.test('src/deep/file.js')).toBe(true);
  });

  test('wildcard * matches non-slash chars only', () => {
    const res = patternToRegex('src/*.js');
    expect(res).not.toBeNull();
    expect(res!.regex.test('src/app.js')).toBe(true);
    expect(res!.regex.test('src/nested/app.js')).toBe(false);
  });

  test('globstar **/ matches across directories', () => {
    const res = patternToRegex('**/*.js');
    expect(res).not.toBeNull();
    expect(res!.regex.test('a/b/c.js')).toBe(true);
    expect(res!.regex.test('root.js')).toBe(true);
  });

  test('globstar ** at start matches everything', () => {
    const res = patternToRegex('**/build');
    expect(res).not.toBeNull();
    expect(res!.regex.test('build')).toBe(true);
    expect(res!.regex.test('a/build')).toBe(true);
    expect(res!.regex.test('a/b/build')).toBe(true);
  });

  test('globstar ** after / matches everything', () => {
    const res = patternToRegex('src/**');
    expect(res).not.toBeNull();
    expect(res!.regex.test('src/a.js')).toBe(true);
    expect(res!.regex.test('src/deep/file.js')).toBe(true);
  });

  test('question mark ? matches single non-slash char', () => {
    const res = patternToRegex('src/?.js');
    expect(res).not.toBeNull();
    expect(res!.regex.test('src/a.js')).toBe(true);
    expect(res!.regex.test('src/ab.js')).toBe(false);
    expect(res!.regex.test('src/.js')).toBe(false);
  });

  test('character class [abc] matches listed chars', () => {
    const res = patternToRegex('src/[ab].js');
    expect(res).not.toBeNull();
    expect(res!.regex.test('src/a.js')).toBe(true);
    expect(res!.regex.test('src/b.js')).toBe(true);
    expect(res!.regex.test('src/c.js')).toBe(false);
  });

  test('anchored pattern with leading / only matches at root', () => {
    const res = patternToRegex('/src/**');
    expect(res).not.toBeNull();
    expect(res!.regex.test('src/index.js')).toBe(true);
    expect(res!.regex.test('public/src/index.js')).toBe(false);
  });

  test('non-anchored pattern matches anywhere in path', () => {
    const res = patternToRegex('src/*.js');
    expect(res).not.toBeNull();
    expect(res!.regex.test('src/app.js')).toBe(true);
    expect(res!.regex.test('public/src/app.js')).toBe(true);
  });

  test('escapes regex special characters in pattern', () => {
    const res = patternToRegex('src/file.test.js');
    expect(res).not.toBeNull();
    expect(res!.regex.test('src/file.test.js')).toBe(true);
  });

  test('simple filename pattern matches at any depth', () => {
    const res = patternToRegex('debug.log');
    expect(res).not.toBeNull();
    expect(res!.regex.test('debug.log')).toBe(true);
    expect(res!.regex.test('src/debug.log')).toBe(true);
    expect(res!.regex.test('src/deep/debug.log')).toBe(true);
  });
});
