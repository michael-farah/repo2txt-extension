import { describe, test, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createFileTreeSlice, type FileTreeSlice, CODE_EXTENSIONS } from '../fileTreeSlice';
import type { FileNode, TreeNode } from '@/types';

function createStore() {
  return create<FileTreeSlice>()(createFileTreeSlice);
}

function createFileNode(path: string, type: 'blob' | 'tree' = 'blob'): FileNode {
  return {
    path,
    type,
    url: `https://api.github.com/repos/test/${path}`,
  };
}

describe('fileTreeSlice', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  describe('setNodes', () => {
    test('auto-deselects binary files (.png, .exe, .zip, .pdf, .woff2)', () => {
      const nodes: FileNode[] = [
        createFileNode('src/app.ts'),
        createFileNode('assets/logo.png'),
        createFileNode('bin/app.exe'),
        createFileNode('dist/archive.zip'),
        createFileNode('docs/file.pdf'),
        createFileNode('fonts/font.woff2'),
      ];

      store.getState().setNodes(nodes);

      const selectedPaths = store.getState().selectedPaths;
      expect(selectedPaths.has('src/app.ts')).toBe(true);
      expect(selectedPaths.has('assets/logo.png')).toBe(false);
      expect(selectedPaths.has('bin/app.exe')).toBe(false);
      expect(selectedPaths.has('dist/archive.zip')).toBe(false);
      expect(selectedPaths.has('docs/file.pdf')).toBe(false);
      expect(selectedPaths.has('fonts/font.woff2')).toBe(false);
    });

    test('auto-deselects low-value files (.map, .min.js, .bundle.js, .chunk.js)', () => {
      const nodes: FileNode[] = [
        createFileNode('src/app.ts'),
        createFileNode('dist/app.min.js'),
        createFileNode('dist/app.js.map'),
        createFileNode('dist/vendor.bundle.js'),
        createFileNode('dist/123.chunk.js'),
        createFileNode('dist/styles.min.css'),
      ];

      store.getState().setNodes(nodes);

      const selectedPaths = store.getState().selectedPaths;
      expect(selectedPaths.has('src/app.ts')).toBe(true);
      expect(selectedPaths.has('dist/app.min.js')).toBe(false);
      expect(selectedPaths.has('dist/app.js.map')).toBe(false);
      expect(selectedPaths.has('dist/vendor.bundle.js')).toBe(false);
      expect(selectedPaths.has('dist/123.chunk.js')).toBe(false);
      expect(selectedPaths.has('dist/styles.min.css')).toBe(false);
    });

    test('correctly selects code files by default (.ts, .js, .py, .json)', () => {
      const nodes: FileNode[] = [
        createFileNode('src/index.ts'),
        createFileNode('src/app.js'),
        createFileNode('src/main.py'),
        createFileNode('package.json'),
        createFileNode('src/utils.tsx'),
        createFileNode('src/styles.css'),
      ];

      store.getState().setNodes(nodes);

      const selectedPaths = store.getState().selectedPaths;
      expect(selectedPaths.has('src/index.ts')).toBe(true);
      expect(selectedPaths.has('src/app.js')).toBe(true);
      expect(selectedPaths.has('src/main.py')).toBe(true);
      expect(selectedPaths.has('package.json')).toBe(true);
      expect(selectedPaths.has('src/utils.tsx')).toBe(true);
      expect(selectedPaths.has('src/styles.css')).toBe(true);
    });

    test('binary extensions appear in extensions map with selected: false', () => {
      const nodes: FileNode[] = [
        createFileNode('src/app.ts'),
        createFileNode('assets/logo.png'),
        createFileNode('assets/icon.svg'),
      ];

      store.getState().setNodes(nodes);

      const extensions = store.getState().extensions;
      expect(extensions.get('.ts')?.selected).toBe(true);
      expect(extensions.get('.png')?.selected).toBe(false);
      expect(extensions.get('.svg')?.selected).toBe(false);
    });

    test('low-value files are not auto-selected', () => {
      const nodes: FileNode[] = [
        createFileNode('src/app.ts'),
        createFileNode('dist/app.min.js'),
        createFileNode('dist/app.js.map'),
      ];

      store.getState().setNodes(nodes);

      const selectedPaths = store.getState().selectedPaths;
      expect(selectedPaths.has('src/app.ts')).toBe(true);
      // Low-value files should not be selected
      expect(selectedPaths.has('dist/app.min.js')).toBe(false);
      expect(selectedPaths.has('dist/app.js.map')).toBe(false);
    });

    test('correctly counts files in extensions map', () => {
      const nodes: FileNode[] = [
        createFileNode('src/app.ts'),
        createFileNode('src/utils.ts'),
        createFileNode('src/main.ts'),
        createFileNode('assets/logo.png'),
        createFileNode('assets/icon.png'),
      ];

      store.getState().setNodes(nodes);

      const extensions = store.getState().extensions;
      expect(extensions.get('.ts')?.count).toBe(3);
      expect(extensions.get('.png')?.count).toBe(2);
    });

    test('files without extensions are selected by default', () => {
      const nodes: FileNode[] = [
        createFileNode('Makefile'),
        createFileNode('Dockerfile'),
        createFileNode('LICENSE'),
        createFileNode('README'),
      ];

      store.getState().setNodes(nodes);

      const selectedPaths = store.getState().selectedPaths;
      expect(selectedPaths.has('Makefile')).toBe(true);
      expect(selectedPaths.has('Dockerfile')).toBe(true);
      expect(selectedPaths.has('LICENSE')).toBe(true);
      expect(selectedPaths.has('README')).toBe(true);
    });

    test('(no extension) key appears in extensions map with selected: true', () => {
      const nodes: FileNode[] = [
        createFileNode('Makefile'),
        createFileNode('Dockerfile'),
        createFileNode('src/app.ts'),
      ];

      store.getState().setNodes(nodes);

      const extensions = store.getState().extensions;
      expect(extensions.get('(no extension)')?.selected).toBe(true);
      expect(extensions.get('(no extension)')?.count).toBe(2);
    });

    test('tree nodes are not added to extensions map', () => {
      const nodes: FileNode[] = [
        createFileNode('src', 'tree'),
        createFileNode('src/app.ts'),
        createFileNode('lib', 'tree'),
        createFileNode('lib/utils.ts'),
      ];

      store.getState().setNodes(nodes);

      const extensions = store.getState().extensions;
      // Should only have .ts, no entry for directories
      expect(extensions.has('.ts')).toBe(true);
      expect(extensions.get('.ts')?.count).toBe(2);
    });

    test('handles mixed binary, low-value, and code files', () => {
      const nodes: FileNode[] = [
        createFileNode('src/app.ts'),
        createFileNode('src/utils.ts'),
        createFileNode('assets/logo.png'),
        createFileNode('dist/app.min.js'),
        createFileNode('src/config.json'),
        createFileNode('bin/app.exe'),
      ];

      store.getState().setNodes(nodes);

      const selectedPaths = store.getState().selectedPaths;
      const extensions = store.getState().extensions;

      // Code files should be selected
      expect(selectedPaths.has('src/app.ts')).toBe(true);
      expect(selectedPaths.has('src/utils.ts')).toBe(true);
      expect(selectedPaths.has('src/config.json')).toBe(true);

      // Binary and low-value files should not be selected
      expect(selectedPaths.has('assets/logo.png')).toBe(false);
      expect(selectedPaths.has('dist/app.min.js')).toBe(false);
      expect(selectedPaths.has('bin/app.exe')).toBe(false);

      // Extensions should have correct selection state
      expect(extensions.get('.ts')?.selected).toBe(true);
      expect(extensions.get('.json')?.selected).toBe(true);
      expect(extensions.get('.png')?.selected).toBe(false);
      expect(extensions.get('.exe')?.selected).toBe(false);
    });

    test('replaces existing nodes and extensions when called again', () => {
      // First set of nodes
      store.getState().setNodes([
        createFileNode('src/app.ts'),
        createFileNode('assets/logo.png'),
      ]);

      let extensions = store.getState().extensions;
      expect(extensions.has('.ts')).toBe(true);
      expect(extensions.has('.png')).toBe(true);

      // Second set of nodes - should replace
      store.getState().setNodes([
        createFileNode('lib/main.py'),
        createFileNode('docs/readme.md'),
      ]);

      extensions = store.getState().extensions;
      expect(extensions.has('.ts')).toBe(false);
      expect(extensions.has('.png')).toBe(false);
      expect(extensions.has('.py')).toBe(true);
      expect(extensions.has('.md')).toBe(true);
    });
  });

  describe('CODE_EXTENSIONS', () => {
    test('contains expected code extensions', () => {
      expect(CODE_EXTENSIONS).toContain('.ts');
      expect(CODE_EXTENSIONS).toContain('.tsx');
      expect(CODE_EXTENSIONS).toContain('.js');
      expect(CODE_EXTENSIONS).toContain('.jsx');
      expect(CODE_EXTENSIONS).toContain('.py');
      expect(CODE_EXTENSIONS).toContain('.java');
      expect(CODE_EXTENSIONS).toContain('.go');
      expect(CODE_EXTENSIONS).toContain('.rs');
      expect(CODE_EXTENSIONS).toContain('.html');
      expect(CODE_EXTENSIONS).toContain('.css');
      expect(CODE_EXTENSIONS).toContain('.json');
    });

    test('does not contain binary extensions', () => {
      expect(CODE_EXTENSIONS).not.toContain('.png');
      expect(CODE_EXTENSIONS).not.toContain('.exe');
      expect(CODE_EXTENSIONS).not.toContain('.zip');
      expect(CODE_EXTENSIONS).not.toContain('.pdf');
    });
  });

  describe('toggleSelection', () => {
    test('can manually select binary files after setNodes', () => {
      const nodes: FileNode[] = [
        createFileNode('src/app.ts'),
        createFileNode('assets/logo.png'),
      ];

      store.getState().setNodes(nodes);

      // Initially not selected
      expect(store.getState().selectedPaths.has('assets/logo.png')).toBe(false);

      // Manually select
      store.getState().toggleSelection('assets/logo.png');
      expect(store.getState().selectedPaths.has('assets/logo.png')).toBe(true);
    });

    test('can manually deselect code files', () => {
      const nodes: FileNode[] = [createFileNode('src/app.ts')];

      store.getState().setNodes(nodes);

      // Initially selected
      expect(store.getState().selectedPaths.has('src/app.ts')).toBe(true);

      // Manually deselect
      store.getState().toggleSelection('src/app.ts');
      expect(store.getState().selectedPaths.has('src/app.ts')).toBe(false);
    });
  });

  describe('selectAll / deselectAll', () => {
    test('selectAll selects all non-excluded files including binary', () => {
      const nodes: FileNode[] = [
        createFileNode('src/app.ts'),
        createFileNode('assets/logo.png'),
        createFileNode('bin/app.exe'),
      ];

      store.getState().setNodes(nodes);
      store.getState().selectAll();

      const selectedPaths = store.getState().selectedPaths;
      expect(selectedPaths.has('src/app.ts')).toBe(true);
      expect(selectedPaths.has('assets/logo.png')).toBe(true);
      expect(selectedPaths.has('bin/app.exe')).toBe(true);
    });

    test('deselectAll deselects all files', () => {
      const nodes: FileNode[] = [
        createFileNode('src/app.ts'),
        createFileNode('src/utils.ts'),
      ];

      store.getState().setNodes(nodes);
      store.getState().deselectAll();

      const selectedPaths = store.getState().selectedPaths;
      expect(selectedPaths.has('src/app.ts')).toBe(false);
      expect(selectedPaths.has('src/utils.ts')).toBe(false);
    });
  });
});
