# The learn kit

The learn kit is what a website needs to show the lessons of the tutorial card
by card, and to run programs with SomonScript's own compiler, in the browser.
[somonscript.lindentech.de](https://somonscript.lindentech.de) is built on it.
The npm package ships it in `dist/learn/`, built by `scripts/build-learn.js`
(`npm run build:learn`, and on every `npm pack` and `npm publish`):

| File                               | What it is                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `worker.js`                        | The compiler and its run time for a classic Web Worker, minified (about 410 KB, 100 KB gzipped)                |
| `lessons.json`                     | The 18 lessons as steps, in Tajik, Russian and English                                                         |
| `tasks.json`                       | The 63 tasks: statements, starting programs and tests                                                          |
| `examples.json`                    | The playground's examples                                                                                      |
| `words.json`                       | The words to highlight: `{ "агар": "kw", "дуруст": "lit", "рақам": "type", "чоп": "builtin" }`                 |
| `manifest.json`                    | `version` of the package, `schema` of the JSON files, `protocol` of the worker's events, the worker's `sha256` |
| `client.js`, `client.d.ts`         | Running a program in the worker, checking a task ([below](#the-client))                                        |
| `animations.js`, `animations.d.ts` | The explanatory animations a step can name ([below](#animations))                                              |

A page checks `manifest.json` before it reads the rest: `schema` 1 and
`protocol` 2 are what this page describes. The package's version is the kit's
version; pin it exactly.

## The worker

`worker.js` is a **classic** worker: create it with `new Worker(url)`, not with
`{ type: 'module' }`, since it runs the program with `importScripts`. Serve it
as a file of its own (it never changes for a version, so it can be cached for
good), or from a Blob URL. The program runs from a Blob URL too: a Content
Security Policy must allow `blob:` in `worker-src` and `script-src`.

One worker runs one program. Post it a request and end it when the program is
done (or runs too long):

```js
worker.postMessage({
  source: 'тағ ном = хондан();\nчоп("Салом,", ном);',
  input: 'Зарина\n', // what хондан() and хонданиРақам() read, line by line
  language: 'tj', // 'tj', 'ru' or 'en': the language of the messages
  learningMode: true, // warnings for beginners (docs/reference/learning-mode.md)
  trace: true, // record the steps (below); or { maxSteps: 500 }
});
```

It answers with these events (`RunEvent`, src/playground/run.ts):

| Event                                           | When                                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| `{ type: 'compiled', code, diagnostics }`       | The program compiled and starts; `diagnostics` are its warnings                        |
| `{ type: 'notCompiled', diagnostics, summary }` | It did not compile; nothing more follows                                               |
| `{ type: 'output', stream, text }`              | It printed (`stream` is `log`, `warn` or `error`)                                      |
| `{ type: 'outputLimit', lines }`                | It printed more than 1000 lines; the rest is not sent                                  |
| `{ type: 'trace', steps, truncated }`           | With `trace`: its steps, before its error or end, or when the most steps were recorded |
| `{ type: 'runtimeError', text, line }`          | It stopped with an error at `line` of the source                                       |
| `{ type: 'done' }`                              | It has ended                                                                           |

A diagnostic is `{ severity, line?, text }`, its text already in the language of
the request, with the line of code and a caret.

## Steps

With `trace`, the program records a step before each statement and at each test
of `агар`, `то`, `кун … то` and `барои`, and one more when its top level has run
(`l: 0`). A step (`TraceStep`, src/runtime/trace.ts) is

```json
{
  "l": 3,
  "d": 1,
  "f": "ду",
  "v": [
    { "n": "зариб", "t": "number", "s": "2", "g": 1 },
    { "n": "х", "t": "number", "s": "3" }
  ],
  "o": 0
}
```

- `l`: the line about to run; `d`: how many calls are running; `f`: the function
  the step is in (`""` for one without a name);
- `v`: the variables the program sees there, outer ones first. `s` is the value
  as the program prints it inside an array (strings in quotes, `дуруст`,
  `[ 1, 2 ]`); `t` is its kind (`number`, `string`, `boolean`, `null`,
  `undefined`, `array`, `object`, `other`); arrays also have their first 20
  items in `a`, plain objects their first 12 fields in `k`; `g: 1` marks a
  variable declared outside the step's function. A variable whose declaration
  has not run yet is left out, and so are functions;
- `o`: how many `output` events came before the step, to replay the screen with
  the steps;
- `e: 1` marks the last step of a program that stopped with an error.

At most 2000 steps (or 500 000 characters of values) are recorded; then the
trace is sent with `truncated: true` and the program goes on untraced, so an
endless loop still gives its first steps before the time limit ends it.
Expression bodies of arrow functions (`х => х * 2`) take no steps, and
`ҳамзамон` functions and generators keep the depth of their caller.

`compile(source, { trace: true })` of src/browser.ts gives the traced code
itself; it calls the global `__somonTrace`, a `Tracer`.

## Lessons

`lessons.json` is a list of lessons:

```json
{
  "id": "03-taghyirjobanda",
  "n": 3,
  "title": { "tj": "Тағйирёбандаҳо", "ru": "Переменные", "en": "Variables" },
  "steps": [ … ]
}
```

Texts are HTML (paragraphs, lists, tables, `<pre>`, `<pre class="som">` for
code, `<code>`, `<strong>`, links to the web), in `{ tj, ru, en }`. A step has a
stable `id` (`03-example-2`, `03-task-03-ivaz`), to keep a learner's progress,
and a `kind`:

| `kind`    | Fields                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| `text`    | `title`, `html`; `role: 'intro'` for the lesson's first card, `'pitfalls'` for its common mistakes; maybe `anim`   |
| `example` | `title`, `html` (before the code), `code` (`{ tj, ru, en }`: the comments differ), `input`, `after`; maybe `anim`  |
| `quiz`    | `title`, `question`, maybe `code`, `options` (`{ tj: [html], ru: [html], en: [html] }`), `answer`, maybe `explain` |
| `try`     | `title`, `text`, `starter`, `solution`, `input`, `expect` (what the solution prints), maybe `hint`                 |
| `task`    | `task`: the id of a task of `tasks.json`                                                                           |

`anim` is `{ name, params }`.

### Writing steps

The steps come from the Markdown of the lessons (docs/tutorial/tj, ru and en),
by `scripts/learn-lessons.js`:

- the text before the first `##` is the intro;
- each `##` section is a step; a section with ▶ links gives an `example` step
  for each link, with the code and input of the link, the text before its code
  and the text after it;
- `## Хатоҳои маъмул` (`## Частые ошибки`, `## Common mistakes`) is the
  `pitfalls` step;
- each task of `## Супоришҳо` (`## Задачи`, `## Tasks`) is a `task` step;
- the links to the other lessons after `---` are left out.

Comments, which GitHub does not show, add to that:

```md
<!-- step -->
```

begins a new step of the same section.

```md
<!-- anim: variable-box {"focus": ["хол"]} -->
```

gives the step an animation; after a ▶ link it is the animation of that link's
example.

```md
<!-- quiz
q: Пас аз ин барнома дар `х` чӣ қимат ҳаст?
code: |
  тағ х = 4;
  х = х * 2;
options: 4 | *8 | 6
explain: `х * 2` — 4 * 2 = 8.
-->
```

is a question; the right options start with `*`.

```md
<!-- try
text: Номи худро чоп кунед.
starter: |
  тағ ном = "";
solution: |
  тағ ном = "Зарина";
  чоп(ном);
expect: |
  Зарина
hint: Номро дар байни нохунакҳо нависед.
-->
```

is a small exercise; the page compares what the learner's program prints with
`expect`, as a task's test.

A field is `key: value` on one line, or `key: |` and the lines after it indented
by two spaces. The Tajik, Russian and English lessons must give the same steps,
with the same examples, inputs, tasks, animations and answers; the build and
`tests/learn-kit.test.ts` check it. A task page
(docs/tutorial/tasks/<id>/README.md) has a section in each language:
`## Масъала <id>:`, `## Задача <id>:` and `## Task <id>:`, and its title is
`# Tajik / Russian / English`.

### Animations

`src/learn/animations.ts` (`ANIMATIONS`) lists the animations and their
parameters: `output-stream`, `error-catch`, `variable-box`, `expression-eval`,
`input-queue`, `remainder`, `compare-scale`, `if-branch`, `if-chain`,
`logic-gates`, `loop-counter`, `while-loop`, `nested-grid`, `function-machine`,
`function-call`, `array-cells`, `array-ops`, `string-cells` and `object-card`.
Those marked `trace` draw the steps of the step's example, which they need;
their parameters only choose what to show. The build fails on an unknown
animation or parameter.

## The client

`client.js` runs programs in workers the page makes, and checks tasks:

```ts
import {
  runInWorker,
  checkTask,
  normalize,
  PROTOCOL,
} from '@lindentech/somon-script/dist/learn/client';

const createWorker = () => new Worker('/learn/worker-2777e89a.js');

const run = runInWorker(
  createWorker,
  { source, input, language: 'tj', trace: true },
  { timeLimit: 5000, onEvent: event => show(event) }
);
// run.stop() ends it at once
const { outcome, output, trace } = await run.result;
// outcome: 'done' | 'notCompiled' | 'runtimeError' | 'timeout' | 'stopped' | 'crashed'

const report = await checkTask(
  createWorker,
  { source, language: 'tj' },
  task.tests,
  {
    onTest: (result, index) => showTest(result, index),
  }
);
// report.passed; report.notCompiled; report.tests[i]: { passed, input, expected, printed, outcome, error }
```

The time limit counts from the `compiled` event. `checkTask` runs each test in a
worker of its own and compares the output as the playground does (`normalize`:
no spaces at line ends, no empty lines at the end).
