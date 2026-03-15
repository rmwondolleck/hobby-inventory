import type { LocationOption } from '../../types';

// Mirror of the private flattenTree function in LocationPicker.tsx
function flattenTree(
  nodes: LocationOption[],
  depth = 0
): Array<LocationOption & { depth: number }> {
  const result: Array<LocationOption & { depth: number }> = [];
  for (const node of nodes) {
    result.push({ ...node, depth });
    result.push(...flattenTree(node.children, depth + 1));
  }
  return result;
}

function makeLocation(
  id: string,
  name: string,
  children: LocationOption[] = []
): LocationOption {
  return { id, name, path: name, parentId: null, children };
}

describe('flattenTree', () => {
  it('returns an empty array for an empty tree', () => {
    expect(flattenTree([])).toEqual([]);
  });

  it('returns a single root node at depth 0', () => {
    const tree = [makeLocation('a', 'Alpha')];
    const result = flattenTree(tree);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'a', depth: 0 });
  });

  it('returns multiple root nodes each at depth 0', () => {
    const tree = [makeLocation('a', 'Alpha'), makeLocation('b', 'Beta')];
    const result = flattenTree(tree);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'a', depth: 0 });
    expect(result[1]).toMatchObject({ id: 'b', depth: 0 });
  });

  it('places direct children at depth 1', () => {
    const tree = [
      makeLocation('parent', 'Parent', [
        makeLocation('child1', 'Child 1'),
        makeLocation('child2', 'Child 2'),
      ]),
    ];
    const result = flattenTree(tree);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ id: 'parent', depth: 0 });
    expect(result[1]).toMatchObject({ id: 'child1', depth: 1 });
    expect(result[2]).toMatchObject({ id: 'child2', depth: 1 });
  });

  it('handles deeply nested hierarchy with correct depth at each level', () => {
    const tree = [
      makeLocation('l1', 'L1', [
        makeLocation('l2', 'L2', [
          makeLocation('l3', 'L3'),
        ]),
      ]),
    ];
    const result = flattenTree(tree);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ id: 'l1', depth: 0 });
    expect(result[1]).toMatchObject({ id: 'l2', depth: 1 });
    expect(result[2]).toMatchObject({ id: 'l3', depth: 2 });
  });

  it('preserves pre-order DFS ordering (parent before children, siblings in order)', () => {
    const tree = [
      makeLocation('a', 'A', [
        makeLocation('a1', 'A1'),
        makeLocation('a2', 'A2'),
      ]),
      makeLocation('b', 'B', [
        makeLocation('b1', 'B1'),
      ]),
    ];
    const ids = flattenTree(tree).map((n) => n.id);
    expect(ids).toEqual(['a', 'a1', 'a2', 'b', 'b1']);
  });

  it('preserves all LocationOption fields in flattened nodes', () => {
    const loc: LocationOption = {
      id: 'x',
      name: 'Storage Room',
      path: 'Basement/Storage Room',
      parentId: 'basement',
      children: [],
    };
    const result = flattenTree([loc]);
    expect(result[0]).toMatchObject({
      id: 'x',
      name: 'Storage Room',
      path: 'Basement/Storage Room',
      parentId: 'basement',
      depth: 0,
    });
  });
});
