'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LocationModal from './LocationModal';

export interface LocationWithCount {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { children: number; lots: number };
}

interface LocationNode extends LocationWithCount {
  childNodes: LocationNode[];
}

interface LocationTreeProps {
  locations: LocationWithCount[];
}

function buildTree(locations: LocationWithCount[]): LocationNode[] {
  const map = new Map<string, LocationNode>();
  const roots: LocationNode[] = [];

  for (const loc of locations) {
    map.set(loc.id, { ...loc, childNodes: [] });
  }

  for (const loc of locations) {
    const node = map.get(loc.id)!;
    if (loc.parentId && map.has(loc.parentId)) {
      map.get(loc.parentId)!.childNodes.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: LocationNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortNodes(n.childNodes));
  };
  sortNodes(roots);

  return roots;
}

function filterTree(nodes: LocationNode[], search: string): LocationNode[] {
  if (!search) return nodes;
  const q = search.toLowerCase();

  function filterNode(node: LocationNode): LocationNode | null {
    const matches =
      node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q);
    const filteredChildren = node.childNodes
      .map(filterNode)
      .filter(Boolean) as LocationNode[];
    if (matches || filteredChildren.length > 0) {
      return { ...node, childNodes: filteredChildren };
    }
    return null;
  }

  return nodes.map(filterNode).filter(Boolean) as LocationNode[];
}

interface TreeNodeProps {
  node: LocationNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAdd: (parentId: string) => void;
  onEdit: (location: LocationWithCount) => void;
  onDelete: (location: LocationWithCount) => void;
  depth: number;
}

function TreeNode({
  node,
  expanded,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
  depth,
}: TreeNodeProps) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.childNodes.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-accent group"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <button
          onClick={() => hasChildren && onToggle(node.id)}
          className={`w-5 h-5 flex items-center justify-center text-muted-foreground flex-shrink-0 text-xs ${
            !hasChildren ? 'invisible' : 'hover:text-foreground'
          }`}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
        </button>

        <span className="text-muted-foreground flex-shrink-0 text-sm">📦</span>

        <Link
          href={`/locations/${node.id}`}
          className="flex-1 text-sm font-medium text-foreground hover:text-blue-600 truncate"
        >
          {node.name}
        </Link>

        {node._count.lots > 0 && (
          <span className="text-xs text-muted-foreground flex-shrink-0 mr-2">
            {node._count.lots} lot{node._count.lots !== 1 ? 's' : ''}
          </span>
        )}

        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(node.id);
            }}
            className="text-xs px-1.5 py-0.5 text-blue-600 hover:bg-blue-50 rounded"
            title="Add child location"
          >
            + Add
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(node);
            }}
            className="text-xs px-1.5 py-0.5 text-muted-foreground hover:bg-accent rounded"
            title="Edit location"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node);
            }}
            className="text-xs px-1.5 py-0.5 text-red-600 hover:bg-red-50 rounded"
            title="Delete location"
          >
            Delete
          </button>
        </div>
      </div>

      {isExpanded && node.childNodes.length > 0 && (
        <div>
          {node.childNodes.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LocationTree({ locations }: LocationTreeProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    parentId?: string | null;
    location?: LocationWithCount;
  }>({ open: false, mode: 'create' });
  const [deleteTarget, setDeleteTarget] = useState<LocationWithCount | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(locations), [locations]);
  const filteredTree = useMemo(() => filterTree(tree, search), [tree, search]);

  // When searching, expand all matched nodes automatically
  const effectiveExpanded = useMemo(() => {
    if (!search) return expanded;
    const ids = new Set<string>();
    function collectIds(nodes: LocationNode[]) {
      for (const n of nodes) {
        ids.add(n.id);
        collectIds(n.childNodes);
      }
    }
    collectIds(filteredTree);
    return ids;
  }, [search, filteredTree, expanded]);

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAdd = useCallback((parentId: string | null) => {
    setModal({ open: true, mode: 'create', parentId });
  }, []);

  const handleEdit = useCallback((location: LocationWithCount) => {
    setModal({ open: true, mode: 'edit', location });
  }, []);

  const handleDelete = useCallback((location: LocationWithCount) => {
    setDeleteTarget(location);
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setError(null);
    try {
      const res = await fetch(`/api/locations/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? 'Failed to delete location');
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setError('Failed to delete location');
      setDeleteTarget(null);
    }
  };

  const expandAll = () => {
    const ids = new Set<string>();
    function collectIds(nodes: LocationNode[]) {
      for (const n of nodes) {
        ids.add(n.id);
        collectIds(n.childNodes);
      }
    }
    collectIds(tree);
    setExpanded(ids);
  };

  const collapseAll = () => setExpanded(new Set());

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 pl-9 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute left-3 top-2.5 text-muted-foreground text-sm pointer-events-none">
            🔍
          </span>
        </div>
        <button
          onClick={() => handleAdd(null)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex-shrink-0"
        >
          + Add Location
        </button>
      </div>

      {/* Expand/collapse controls */}
      {tree.length > 0 && (
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
          <button onClick={expandAll} className="hover:text-foreground underline-offset-2 hover:underline">
            Expand all
          </button>
          <span>·</span>
          <button onClick={collapseAll} className="hover:text-foreground underline-offset-2 hover:underline">
            Collapse all
          </button>
          <span>·</span>
          <span>
            {locations.length} location{locations.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tree */}
      <div className="border border-border rounded-lg bg-card">
        {filteredTree.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {search
              ? `No locations match "${search}"`
              : 'No locations yet. Add your first location to get started.'}
          </div>
        ) : (
          <div className="p-2">
            {filteredTree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                expanded={effectiveExpanded}
                onToggle={handleToggle}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                depth={0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal.open && (
        <LocationModal
          mode={modal.mode}
          parentId={modal.mode === 'create' ? (modal.parentId ?? null) : undefined}
          location={modal.mode === 'edit' ? modal.location : undefined}
          locations={locations}
          onClose={() => setModal({ open: false, mode: 'create' })}
          onSuccess={() => {
            setModal({ open: false, mode: 'create' });
            router.refresh();
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Location</h3>
            <p className="text-muted-foreground text-sm mb-2">
              Are you sure you want to delete{' '}
              <strong className="text-foreground">{deleteTarget.name}</strong>?
            </p>
            {deleteTarget._count.children > 0 && (
              <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-sm mb-2">
                ⚠️ This location has {deleteTarget._count.children} sub-location(s). Delete them
                first.
              </p>
            )}
            {deleteTarget._count.lots > 0 && (
              <p className="text-red-700 bg-red-50 border border-red-200 rounded p-2 text-sm mb-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                ⚠️ This location contains {deleteTarget._count.lots} lot(s). Move or reassign them
                before deleting.
              </p>
            )}
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

