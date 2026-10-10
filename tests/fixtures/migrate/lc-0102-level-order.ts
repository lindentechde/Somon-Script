// LeetCode 102. Binary Tree Level Order Traversal: breadth-first search.
class TreeNode {
  constructor(
    public val: number,
    public left: TreeNode | null = null,
    public right: TreeNode | null = null
  ) {}
}

function fromLevels(values: (number | null)[]): TreeNode | null {
  if (values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue: TreeNode[] = [root];
  let i = 1;
  while (queue.length > 0 && i < values.length) {
    const node = queue.shift()!;
    const left = values[i++];
    if (left !== null && left !== undefined) {
      node.left = new TreeNode(left);
      queue.push(node.left);
    }
    const right = values[i++];
    if (right !== null && right !== undefined) {
      node.right = new TreeNode(right);
      queue.push(node.right);
    }
  }
  return root;
}

function levelOrder(root: TreeNode | null): number[][] {
  const levels: number[][] = [];
  let current = root ? [root] : [];
  while (current.length > 0) {
    levels.push(current.map(node => node.val));
    current = current
      .flatMap(node => [node.left, node.right])
      .filter((n): n is TreeNode => n !== null);
  }
  return levels;
}

let failures = 0;
function check(name: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log('✓ ' + name);
  } else {
    console.log(`✗ ${name}: expected ${e}, got ${a}`);
    failures++;
  }
}

check('example', levelOrder(fromLevels([3, 9, 20, null, null, 15, 7])), [[3], [9, 20], [15, 7]]);
check('single', levelOrder(fromLevels([1])), [[1]]);
check('empty', levelOrder(fromLevels([])), []);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);
