import { describe, test, expect } from 'vitest';
import {
  isBinaryFile,
  isLowValueFile,
  shouldAutoExclude,
  getBinaryCategory,
} from '../binaryDetection';

describe('isBinaryFile', () => {
  test('returns true for image files (.png, .jpg, .jpeg, .gif, .bmp, .ico, .webp, .svg, .tiff, .tif, .avif, .heic, .heif)', () => {
    expect(isBinaryFile('assets/logo.png')).toBe(true);
    expect(isBinaryFile('assets/photo.jpg')).toBe(true);
    expect(isBinaryFile('assets/photo.jpeg')).toBe(true);
    expect(isBinaryFile('assets/animation.gif')).toBe(true);
    expect(isBinaryFile('assets/icon.bmp')).toBe(true);
    expect(isBinaryFile('assets/favicon.ico')).toBe(true);
    expect(isBinaryFile('assets/image.webp')).toBe(true);
    expect(isBinaryFile('assets/icon.svg')).toBe(true);
    expect(isBinaryFile('assets/scan.tiff')).toBe(true);
    expect(isBinaryFile('assets/scan.tif')).toBe(true);
    expect(isBinaryFile('assets/photo.avif')).toBe(true);
    expect(isBinaryFile('assets/photo.heic')).toBe(true);
    expect(isBinaryFile('assets/photo.heif')).toBe(true);
  });

  test('returns true for video files (.mp4, .avi, .mov, .wmv, .flv, .mkv, .webm, .m4v, .mpg, .mpeg)', () => {
    expect(isBinaryFile('videos/movie.mp4')).toBe(true);
    expect(isBinaryFile('videos/clip.avi')).toBe(true);
    expect(isBinaryFile('videos/intro.mov')).toBe(true);
    expect(isBinaryFile('videos/presentation.wmv')).toBe(true);
    expect(isBinaryFile('videos/animation.flv')).toBe(true);
    expect(isBinaryFile('videos/movie.mkv')).toBe(true);
    expect(isBinaryFile('videos/clip.webm')).toBe(true);
    expect(isBinaryFile('videos/trailer.m4v')).toBe(true);
    expect(isBinaryFile('videos/movie.mpg')).toBe(true);
    expect(isBinaryFile('videos/movie.mpeg')).toBe(true);
  });

  test('returns true for audio files (.mp3, .wav, .flac, .aac, .ogg, .wma, .m4a, .opus)', () => {
    expect(isBinaryFile('audio/song.mp3')).toBe(true);
    expect(isBinaryFile('audio/recording.wav')).toBe(true);
    expect(isBinaryFile('audio/song.flac')).toBe(true);
    expect(isBinaryFile('audio/song.aac')).toBe(true);
    expect(isBinaryFile('audio/song.ogg')).toBe(true);
    expect(isBinaryFile('audio/song.wma')).toBe(true);
    expect(isBinaryFile('audio/song.m4a')).toBe(true);
    expect(isBinaryFile('audio/song.opus')).toBe(true);
  });

  test('returns true for archive files (.zip, .tar, .gz, .bz2, .xz, .7z, .rar, .tgz, .zst, .lz)', () => {
    expect(isBinaryFile('archives/project.zip')).toBe(true);
    expect(isBinaryFile('archives/backup.tar')).toBe(true);
    expect(isBinaryFile('archives/file.gz')).toBe(true);
    expect(isBinaryFile('archives/file.bz2')).toBe(true);
    expect(isBinaryFile('archives/file.xz')).toBe(true);
    expect(isBinaryFile('archives/archive.7z')).toBe(true);
    expect(isBinaryFile('archives/archive.rar')).toBe(true);
    expect(isBinaryFile('archives/backup.tgz')).toBe(true);
    expect(isBinaryFile('archives/file.zst')).toBe(true);
    expect(isBinaryFile('archives/file.lz')).toBe(true);
  });

  test('returns true for compiled/binary files (.exe, .dll, .so, .dylib, .bin, .dat, .o, .obj, .pyc, .pyo, .class, .jar, .war, .ear)', () => {
    expect(isBinaryFile('bin/app.exe')).toBe(true);
    expect(isBinaryFile('lib/library.dll')).toBe(true);
    expect(isBinaryFile('lib/lib.so')).toBe(true);
    expect(isBinaryFile('lib/lib.dylib')).toBe(true);
    expect(isBinaryFile('bin/app.bin')).toBe(true);
    expect(isBinaryFile('data/file.dat')).toBe(true);
    expect(isBinaryFile('build/file.o')).toBe(true);
    expect(isBinaryFile('build/file.obj')).toBe(true);
    expect(isBinaryFile('__pycache__/module.pyc')).toBe(true);
    expect(isBinaryFile('__pycache__/module.pyo')).toBe(true);
    expect(isBinaryFile('build/Main.class')).toBe(true);
    expect(isBinaryFile('lib/app.jar')).toBe(true);
    expect(isBinaryFile('lib/app.war')).toBe(true);
    expect(isBinaryFile('lib/app.ear')).toBe(true);
  });

  test('returns true for font files (.woff, .woff2, .ttf, .eot, .otf)', () => {
    expect(isBinaryFile('fonts/font.woff')).toBe(true);
    expect(isBinaryFile('fonts/font.woff2')).toBe(true);
    expect(isBinaryFile('fonts/font.ttf')).toBe(true);
    expect(isBinaryFile('fonts/font.eot')).toBe(true);
    expect(isBinaryFile('fonts/font.otf')).toBe(true);
  });

  test('returns true for document files (.pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .odt, .ods, .odp)', () => {
    expect(isBinaryFile('docs/document.pdf')).toBe(true);
    expect(isBinaryFile('docs/document.doc')).toBe(true);
    expect(isBinaryFile('docs/document.docx')).toBe(true);
    expect(isBinaryFile('docs/spreadsheet.xls')).toBe(true);
    expect(isBinaryFile('docs/spreadsheet.xlsx')).toBe(true);
    expect(isBinaryFile('docs/presentation.ppt')).toBe(true);
    expect(isBinaryFile('docs/presentation.pptx')).toBe(true);
    expect(isBinaryFile('docs/document.odt')).toBe(true);
    expect(isBinaryFile('docs/spreadsheet.ods')).toBe(true);
    expect(isBinaryFile('docs/presentation.odp')).toBe(true);
  });

  test('returns true for database files (.db, .sqlite, .sqlite3, .mdb)', () => {
    expect(isBinaryFile('data/app.db')).toBe(true);
    expect(isBinaryFile('data/app.sqlite')).toBe(true);
    expect(isBinaryFile('data/app.sqlite3')).toBe(true);
    expect(isBinaryFile('data/app.mdb')).toBe(true);
  });

  test('returns true for other binary files (.lock, .wasm, .node, .nupkg)', () => {
    expect(isBinaryFile('yarn.lock')).toBe(true);
    expect(isBinaryFile('package-lock.lock')).toBe(true);
    expect(isBinaryFile('wasm/module.wasm')).toBe(true);
    expect(isBinaryFile('native/module.node')).toBe(true);
    expect(isBinaryFile('packages/app.nupkg')).toBe(true);
  });

  test('returns false for code files (.ts, .js, .py, .json)', () => {
    expect(isBinaryFile('src/index.ts')).toBe(false);
    expect(isBinaryFile('src/app.js')).toBe(false);
    expect(isBinaryFile('src/main.py')).toBe(false);
    expect(isBinaryFile('package.json')).toBe(false);
  });

  test('returns false for files with no extension', () => {
    expect(isBinaryFile('Makefile')).toBe(false);
    expect(isBinaryFile('Dockerfile')).toBe(false);
    expect(isBinaryFile('LICENSE')).toBe(false);
    expect(isBinaryFile('src/file')).toBe(false);
  });

  test('is case-insensitive for extensions', () => {
    expect(isBinaryFile('assets/LOGO.PNG')).toBe(true);
    expect(isBinaryFile('assets/Photo.JPG')).toBe(true);
    expect(isBinaryFile('bin/App.EXE')).toBe(true);
    expect(isBinaryFile('docs/DOC.PDF')).toBe(true);
  });
});

describe('isLowValueFile', () => {
  test('returns true for source map files (.map)', () => {
    expect(isLowValueFile('dist/app.js.map')).toBe(true);
    expect(isLowValueFile('dist/styles.css.map')).toBe(true);
  });

  test('returns true for minified files (.min.js, .min.css)', () => {
    expect(isLowValueFile('dist/app.min.js')).toBe(true);
    expect(isLowValueFile('dist/styles.min.css')).toBe(true);
  });

  test('returns true for bundled files (.bundle.js)', () => {
    expect(isLowValueFile('dist/app.bundle.js')).toBe(true);
    expect(isLowValueFile('dist/vendor.bundle.js')).toBe(true);
  });

  test('returns true for chunk files (.chunk.js)', () => {
    expect(isLowValueFile('dist/123.chunk.js')).toBe(true);
    expect(isLowValueFile('dist/main.chunk.js')).toBe(true);
  });

  test('returns true for git pack files (.pack, .idx)', () => {
    expect(isLowValueFile('.git/objects/pack/pack-abc.pack')).toBe(true);
    expect(isLowValueFile('.git/objects/pack/pack-abc.idx')).toBe(true);
  });

  test('returns false for normal JavaScript and TypeScript files', () => {
    expect(isLowValueFile('src/app.js')).toBe(false);
    expect(isLowValueFile('src/app.ts')).toBe(false);
    expect(isLowValueFile('src/utils.js')).toBe(false);
    expect(isLowValueFile('src/components/Button.tsx')).toBe(false);
  });

  test('returns false for other code files', () => {
    expect(isLowValueFile('src/main.py')).toBe(false);
    expect(isLowValueFile('src/main.java')).toBe(false);
    expect(isLowValueFile('src/main.go')).toBe(false);
    expect(isLowValueFile('src/main.rs')).toBe(false);
  });
});

describe('shouldAutoExclude', () => {
  test('returns true for binary files', () => {
    expect(shouldAutoExclude('assets/logo.png')).toBe(true);
    expect(shouldAutoExclude('bin/app.exe')).toBe(true);
    expect(shouldAutoExclude('docs/file.pdf')).toBe(true);
  });

  test('returns true for low-value files', () => {
    expect(shouldAutoExclude('dist/app.min.js')).toBe(true);
    expect(shouldAutoExclude('dist/app.js.map')).toBe(true);
    expect(shouldAutoExclude('dist/app.bundle.js')).toBe(true);
  });

  test('returns false for regular code files', () => {
    expect(shouldAutoExclude('src/app.ts')).toBe(false);
    expect(shouldAutoExclude('src/app.js')).toBe(false);
    expect(shouldAutoExclude('README.md')).toBe(false);
    expect(shouldAutoExclude('package.json')).toBe(false);
  });

  test('combines both binary and low-value checks', () => {
    // Binary files
    expect(shouldAutoExclude('video.mp4')).toBe(true);
    expect(shouldAutoExclude('audio.mp3')).toBe(true);
    expect(shouldAutoExclude('archive.zip')).toBe(true);

    // Low-value files
    expect(shouldAutoExclude('main.chunk.js')).toBe(true);
    expect(shouldAutoExclude('styles.min.css')).toBe(true);

    // Regular files
    expect(shouldAutoExclude('src/index.ts')).toBe(false);
    expect(shouldAutoExclude('lib/utils.ts')).toBe(false);
  });
});

describe('getBinaryCategory', () => {
  test("returns 'binary' for binary files", () => {
    expect(getBinaryCategory('assets/logo.png')).toBe('binary');
    expect(getBinaryCategory('bin/app.exe')).toBe('binary');
    expect(getBinaryCategory('docs/file.pdf')).toBe('binary');
    expect(getBinaryCategory('fonts/font.woff2')).toBe('binary');
  });

  test("returns 'low-value' for low-value files", () => {
    expect(getBinaryCategory('dist/app.min.js')).toBe('low-value');
    expect(getBinaryCategory('dist/app.js.map')).toBe('low-value');
    expect(getBinaryCategory('dist/app.bundle.js')).toBe('low-value');
    expect(getBinaryCategory('dist/123.chunk.js')).toBe('low-value');
  });

  test("returns 'text' for regular code files", () => {
    expect(getBinaryCategory('src/app.ts')).toBe('text');
    expect(getBinaryCategory('src/app.js')).toBe('text');
    expect(getBinaryCategory('README.md')).toBe('text');
    expect(getBinaryCategory('package.json')).toBe('text');
    expect(getBinaryCategory('src/main.py')).toBe('text');
  });

  test('correctly categorizes files with paths', () => {
    expect(getBinaryCategory('deep/nested/path/image.png')).toBe('binary');
    expect(getBinaryCategory('deep/nested/path/bundle.min.js')).toBe('low-value');
    expect(getBinaryCategory('deep/nested/path/component.tsx')).toBe('text');
  });
});
