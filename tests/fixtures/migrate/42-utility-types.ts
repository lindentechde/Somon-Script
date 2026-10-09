// Built-in utility types
interface Todo {
  title: string;
  done: boolean;
  priority: number;
}
type Preview = Pick<Todo, 'title' | 'done'>;
type Draft = Omit<Todo, 'done'>;
type Patch = Partial<Todo>;
type Complete = Required<Patch>;
type Frozen = Readonly<Todo>;
type ByTitle = Record<string, Todo>;
type Primitive = Exclude<string | number | boolean, boolean>;
type OnlyStrings = Extract<string | number, string>;
type Present = NonNullable<string | null | undefined>;

function makeTodo(title: string): Todo {
  return { title, done: false, priority: 1 };
}
type Made = ReturnType<typeof makeTodo>;
type Args = Parameters<typeof makeTodo>;
type Loaded = Awaited<Promise<Todo>>;

const preview: Preview = { title: 'a', done: true };
const draft: Draft = { title: 'b', priority: 2 };
const patch: Patch = { done: true };
const complete: Complete = { ...makeTodo('c'), ...patch };
const frozen: Frozen = makeTodo('d');
const byTitle: ByTitle = { e: makeTodo('e') };
const p: Primitive = 'text';
const s: OnlyStrings = 'only';
const present: Present = 'here';
const made: Made = makeTodo('f');
const args: Args = ['g'];
const loaded: Loaded = makeTodo(args[0]);
console.log(preview, draft, complete.done, frozen.title, Object.keys(byTitle), p, s, present);
console.log(made.title, loaded.title);
