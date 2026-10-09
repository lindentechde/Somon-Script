// using and await using: resources are disposed at the end of their block
const events: string[] = [];

class Resource implements Disposable {
  constructor(private readonly name: string) {
    events.push(`open ${name}`);
  }
  [Symbol.dispose](): void {
    events.push(`close ${this.name}`);
  }
}

class Connection implements AsyncDisposable {
  constructor(readonly id: number) {}
  async [Symbol.asyncDispose](): Promise<void> {
    await Promise.resolve();
    events.push(`disconnect ${this.id}`);
  }
}

function work(): number {
  using first = new Resource('a');
  using second = new Resource('b');
  events.push('working');
  return 42;
}

async function session(): Promise<void> {
  await using connection = new Connection(7);
  events.push(`using ${connection.id}`);
}

console.log(work());
session().then(() => console.log(events.join(', ')));
