# SomonScript playground for learners

**Тоҷикӣ:** майдони озмоиш — саҳифае, ки дар он барномаро навишта, бо тугмаи
«Иҷро» иҷро кардан мумкин аст. Он бе интернет ҳам кор мекунад: файли
`index.html`-ро захира кунед (масалан, ба флешка) ва дар браузер кушоед.

**Русский:** песочница — страница, где можно написать программу и запустить её
кнопкой «Иҷро». Работает и без интернета: сохраните файл `index.html` (например,
на флешку) и откройте его в браузере.

---

A page to write SomonScript and run it in the browser, made for learners: the
page, the compiler's messages and the errors of the running program are in Tajik
(Russian and English can be chosen). It is published at
<https://lindentechde.github.io/Somon-Script/>.

- An editor with highlighting and line numbers; `Ctrl+Enter` runs.
- **Вуруд** (input): `хондан()` and `хонданиРақам()` read its lines in order, as
  from a file given to `somon run барнома.som < вуруд.txt`.
- **Натиҷа** (output): what the program prints, the compiler's errors and the
  errors of the running program, with the line of the program marked; a click on
  an error selects its line.
- The program runs in a Web Worker. One that runs longer than the time limit (5
  seconds; 2 to 60 can be chosen) is stopped: «Барнома аз ҳад зиёд дароз кор
  кард — шояд давраи беохир?». Only the first 1000 lines of output are shown.
- **Реҷаи таълимӣ** (the learning mode, on by default) warns about mistakes that
  are valid JavaScript, such as `хондан() + 1`
  ([docs/reference/learning-mode.md](../docs/reference/learning-mode.md)).
- **✓ Санҷидан** (check), on a link to a task of the tutorial: runs the program
  on each test of the task (in a worker of its own, with the time limit) and
  says which pass, and for the others what was expected and what the program
  printed, as `npm run check-task` does.
- **Нишон додани JavaScript** shows the JavaScript the program compiles to.
- 15 examples, from «Салом, ҷаҳон!» to an endless loop.
- **Пайванд** (link) copies a link that holds the program and its input.
- The program, the input and the settings are kept in the browser
  (`localStorage`), when it allows it.

## One file, offline

`npm run build:playground` builds `playground/dist/index.html`: one file of
about 900 KB with the page, the examples and the compiler. It loads nothing from
the network, so it works from GitHub Pages, from any web server, and opened from
a disk or a USB stick (`file://`): the worker is started from a Blob URL. The
same sources always give the same file.

## Links

| Link                  | Opens                                             |
| --------------------- | ------------------------------------------------- |
| `#example=jam`        | an example, by its `id` in `examples.json`        |
| `#c=<code>&i=<input>` | a program and its input (UTF-8, base64url)        |
| `…&t=<tests>`         | and the tests of a task, as JSON `[{ "i", "o" }]` |
| `?lang=ru`            | the page in Russian (`tj`, `ru`, `en`)            |
| `?timeout=10`         | a time limit of 10 seconds                        |

## What it does not do

- A program has one file: `ворид` of another module is an error
  (`RUNTIME_NO_MODULES`).
- Decorators, `дастрасӣ` and `истифода` need TypeScript to be lowered, which the
  page does not include (`BROWSER_NEEDS_TYPESCRIPT`); `somon run` runs them.
- Type errors stop the program, as in `somon run`.

## Files

| Path                             | What                                                       |
| -------------------------------- | ---------------------------------------------------------- |
| `src/index.html`                 | the page; the style and the script are put in at the build |
| `src/style.css`                  | its look, also for phones                                  |
| `src/strings.js`                 | the words of the page in Tajik, Russian and English        |
| `src/highlight.js`               | highlighting, with the words of `src/lsp/keywords.ts`      |
| `src/app.js`                     | the editor, the controls, running the worker               |
| `examples/`                      | the examples and `examples.json` (names, input)            |
| `../src/playground/run.ts`       | compiling and running a program, in the worker             |
| `../src/playground/worker.ts`    | the worker's entry                                         |
| `../scripts/build-playground.js` | the build                                                  |

`tests/playground-run.test.ts` tests running programs;
`tests/playground-learner-e2e.test.ts` tests the build and the page in Chromium,
opened from disk.

`docs/playground/` holds an older playground for developers (targets, strict
mode, TypeScript from a CDN); this one is for learners.

## Publishing

`.github/workflows/playground.yml` builds the page on every push to `main` that
changes it and publishes it on GitHub Pages. Pages has to be turned on once:
**Settings → Pages → Build and deployment → Source: GitHub Actions**.
