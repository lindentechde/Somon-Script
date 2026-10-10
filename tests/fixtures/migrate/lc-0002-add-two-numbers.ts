// LeetCode 2. Add Two Numbers: column addition over linked lists.
class ListNode {
  constructor(
    public val: number = 0,
    public next: ListNode | null = null
  ) {}
}

function fromArray(values: number[]): ListNode | null {
  let head: ListNode | null = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  return head;
}

function toArray(node: ListNode | null): number[] {
  const out: number[] = [];
  for (let n = node; n !== null; n = n.next) out.push(n.val);
  return out;
}

function addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {
  const dummy = new ListNode();
  let tail = dummy;
  let carry = 0;
  while (l1 || l2 || carry) {
    const sum = (l1?.val ?? 0) + (l2?.val ?? 0) + carry;
    carry = Math.floor(sum / 10);
    tail.next = new ListNode(sum % 10);
    tail = tail.next;
    l1 = l1?.next ?? null;
    l2 = l2?.next ?? null;
  }
  return dummy.next;
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

const add = (a: number[], b: number[]) => toArray(addTwoNumbers(fromArray(a), fromArray(b)));
check('example 1', add([2, 4, 3], [5, 6, 4]), [7, 0, 8]);
check('zeros', add([0], [0]), [0]);
check('carry chain', add([9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9]), [8, 9, 9, 9, 0, 0, 0, 1]);
check('different lengths', add([1, 8], [0]), [1, 8]);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);
