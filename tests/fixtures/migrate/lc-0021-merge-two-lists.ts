// LeetCode 21. Merge Two Sorted Lists.
class ListNode {
  next: ListNode | null = null;
  constructor(public val: number) {}
}

function build(values: number[]): ListNode | null {
  const dummy = new ListNode(0);
  let tail = dummy;
  values.forEach(v => {
    tail.next = new ListNode(v);
    tail = tail.next;
  });
  return dummy.next;
}

function* values(node: ListNode | null): Generator<number> {
  while (node) {
    yield node.val;
    node = node.next;
  }
}

function mergeTwoLists(a: ListNode | null, b: ListNode | null): ListNode | null {
  if (!a) return b;
  if (!b) return a;
  if (a.val <= b.val) {
    a.next = mergeTwoLists(a.next, b);
    return a;
  }
  b.next = mergeTwoLists(a, b.next);
  return b;
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

const merge = (a: number[], b: number[]) => [...values(mergeTwoLists(build(a), build(b)))];
check('example', merge([1, 2, 4], [1, 3, 4]), [1, 1, 2, 3, 4, 4]);
check('empty', merge([], []), []);
check('one empty', merge([], [0]), [0]);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);
