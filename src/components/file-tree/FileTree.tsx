/**
 * File tree component with virtual scrolling
 * Displays hierarchical file structure with checkboxes
 */

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FileTreeNode } from './FileTreeNode';
import { EmptyState } from '@/components/ui/EmptyState';
import type { TreeNode } from '@/types';

interface FileTreeProps {
  nodes: TreeNode[];
  onToggle?: (path: string) => void;
  onSelect?: (path: string, selected: boolean) => void;
  showExcluded?: boolean;
  maxHeight?: number;
  searchQuery?: string;
}

/**
 * Flatten tree structure for virtual scrolling
 * Filters nodes based on search query if provided
 */
function flattenTree(
  nodes: TreeNode[],
  showExcluded: boolean,
  searchQuery?: string
): Array<{
  node: TreeNode;
  depth: number;
}> {
  const result: Array<{ node: TreeNode; depth: number }> = [];
  const query = searchQuery?.trim().toLowerCase();

  // Check if a node matches the search query
  function nodeMatches(node: TreeNode): boolean {
    if (!query) return true;
    return node.name.toLowerCase().includes(query);
  }

  // Check if a node has any descendants that match
  function hasMatchingDescendants(node: TreeNode): boolean {
    if (!query) return true;
    if (node.type !== 'directory' || !node.children) return false;
    return node.children.some(child => nodeMatches(child) || hasMatchingDescendants(child));
  }

  function traverse(nodes: TreeNode[], depth: number) {
    for (const node of nodes) {
      if (node.excluded && !showExcluded) {
        continue;
      }

      // If there's a search query, filter nodes
      if (query) {
        const matches = nodeMatches(node);
        const hasMatchingChildren = hasMatchingDescendants(node);
        // Include if node matches OR if it's a directory with matching descendants
        if (!matches && !hasMatchingChildren) {
          continue;
        }
      }

      result.push({ node, depth });

      // Include children if directory is expanded (has children array)
      // When searching, always show children of matching directories
      if (node.type === 'directory' && node.children) {
        traverse(node.children, depth + 1);
      }
    }
  }

  traverse(nodes, 0);
  return result;
}

export function FileTree({
  nodes,
  onToggle,
  onSelect,
  showExcluded = false,
  maxHeight = 600,
  searchQuery,
}: FileTreeProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Flatten tree for virtual scrolling
  const flatNodes = useMemo(() => flattenTree(nodes, showExcluded, searchQuery), [nodes, showExcluded, searchQuery]);

  // Virtual scrolling
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual's useVirtualizer returns functions that cannot be memoized; this is expected and safe
  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // Estimated row height
    overscan: 10, // Number of items to render outside visible area
  });

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        }
        title="No files to display"
        description="Load a repository or select local files to see the file tree."
      />
    );
  }

  return (
    <div
      ref={parentRef}
      data-testid="file-tree"
      className="border border-stroke rounded-lg overflow-auto bg-surface"
      style={{ maxHeight: `${maxHeight}px` }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const { node, depth } = flatNodes[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <FileTreeNode
                node={node}
                depth={depth}
                onToggle={onToggle}
                onSelect={onSelect}
                showExcluded={showExcluded}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
