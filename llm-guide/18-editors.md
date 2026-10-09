# Editors and the Browser

**The language server (`somon lsp`), the VS Code extension and the browser
playground**

---

## Language Server

`somon lsp` speaks the
[Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
over stdin/stdout. Any editor with an LSP client can use it; it comes with the
compiler (`npm install --save-dev @lindentech/somon-script`).

```bash
somon lsp                 # stdio; --stdio is accepted too
somon lsp --lang tj       # messages in Tajik (en, ru, tj)
```

| Feature          | What it does                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Diagnostics      | Lexer, parser, type checker and code generator errors as you type, at the exact token    |
| Hover            | The type of a name; for keywords, what they mean (in Tajik) and their JS/TS equivalent   |
| Completion       | Names in scope, keywords, built-ins; after `.` the members of the value's type           |
| Go to definition | Within the file, into imported files (`ворид … аз "./м"`), `М.ном` after `ворид * чун М` |
| Document symbols | The outline: functions, classes and their members, interfaces, enums, namespaces         |
| Formatting       | `somon fmt`, as one edit; nothing when the file has a syntax error                       |
| Semantic tokens  | Names coloured by what they declare; contextual keywords told from names                 |

### Diagnostics

The server checks a file on every change, with the options of the
`somon.config.json` found in its directory or above (`strict`, `noTypeCheck`,
`experimentalDecorators`; `fmt.indent` for formatting). A broken configuration
file is reported on the first line.

```text
тағ синну: рақам = "сӣ";      // TYPE_NOT_ASSIGNABLE under "сӣ"
тағ ном = ;                    // Unexpected token ';'
```

While a file has a syntax error only the syntax errors are shown: type errors of
a half-parsed program would mostly be noise. Hover, completion and go to
definition keep working on the statements that parse.

### Hover

On a name, its type as the type checker sees it at that point (narrowed types
included); on an imported name, its type in the imported module. On a keyword, a
short description in Tajik and the JavaScript/TypeScript word it stands for:

```som
функсия салом(ном: сатр): сатр {   // (функсия) салом: (ном: сатр) => сатр
    бозгашт "Салом, " + ном;
}
агар (дуруст) { }                  // агар — калимаи калидӣ · JavaScript/TypeScript: `if`
```

Contextual keywords (`кун`, `ҳосил`, `эълон`, `истифода`, …) are explained only
where they are keywords; a variable named `берун` shows its type.

### Completion

Names in scope come first, then the Tajik keywords and built-ins (`чоп`,
`Риёзӣ`, `рӯйхат`, …), then the English ones. After a `.` the server offers the
members of the value's type: declared members, then the **Tajik aliases** of
built-in members, then their JavaScript names:

```som
собит номҳо = ["Алӣ", "Вали"];
номҳо.илова("Сино");      // after `номҳо.`: дарозӣ, илова, харита, … then length, push, map, …
чоп.сабт(номҳо.дарозӣ);   // after `чоп.`: сабт, хато, огоҳӣ, … then log, error, warn, …
```

Static members after a class name, enum members after an enum, a namespace's
exports and a module's exports after `ворид * чун М` are offered too.

### Go to definition

```som
// math.som
содир функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}
```

```som
// main.som
ворид { ҷамъ } аз "./math";   // on "./math": opens math.som
чоп.сабт(ҷамъ(1, 2));          // on ҷамъ: the function in math.som
```

Relative imports resolve like the compiler's: `./math` is `math.som` or
`math/index.som`, `./math.js` is `math.som`. A file open in the editor is read
from the editor, with its unsaved changes.

### Interface language

Labels and the server's own messages are in English, Russian or Tajik; keyword
descriptions are always in Tajik. The language comes from, in order: the
client's `initializationOptions` (`{ "locale": "tj" }`), the
`workspace/didChangeConfiguration` setting `somonscript.locale`, and `--lang`
(or `SOMON_LANG` / `LANG`).

### Other editors

Neovim (`nvim-lspconfig`):

```lua
local configs = require('lspconfig.configs')
configs.somonscript = {
  default_config = {
    cmd = { 'npx', 'somon', 'lsp' },
    filetypes = { 'somonscript' },
    root_dir = require('lspconfig.util').root_pattern('somon.config.json', 'package.json'),
    init_options = { locale = 'tj' },
  },
}
require('lspconfig').somonscript.setup({})
vim.filetype.add({ extension = { som = 'somonscript' } })
```

Helix (`languages.toml`):

```toml
[language-server.somon]
command = "npx"
args = ["somon", "lsp"]

[[language]]
name = "somonscript"
scope = "source.somonscript"
file-types = ["som"]
comment-token = "//"
language-servers = ["somon"]
```

Emacs (`eglot`):

```elisp
(define-derived-mode somonscript-mode prog-mode "SomonScript")
(add-to-list 'auto-mode-alist '("\\.som\\'" . somonscript-mode))
(add-to-list 'eglot-server-programs '(somonscript-mode "npx" "somon" "lsp"))
```

### Embedding

The server is a library too. `startLanguageServer` runs it on any pair of
streams; hooks replace the formatter or add a type checker for
`compilerOptions.checker`:

```ts
import {
  startLanguageServer,
  registerChecker,
} from '@lindentech/somon-script/dist/lsp';

registerChecker(
  'typescript',
  (source, { fileName, compilerOptions, locale }) => [
    // { message, line, column, severity: 'error' | 'warning', code }
  ]
);
startLanguageServer({
  locale: 'tj',
  hooks: { formatter: (source, options) => source },
});
```

Without a registered checker, a `checker` other than `'somon'` is run through
`compile()`, so the compiler's own TypeScript checker reports the errors.

---

## VS Code

The extension in [`editors/vscode`](../editors/vscode) adds:

- the `somonscript` language for `.som` files (and `#!…somon` scripts);
- a TextMate grammar: every keyword (contextual ones in their positions),
  strings and escapes, template literals, regular expressions, numbers with
  separators and `n`, comments, decorators and type annotations;
- comment toggling, bracket matching, auto-closing pairs and indentation;
- snippets under Tajik and English prefixes (`функсия`/`function`, `агар`/`if`,
  `барои`/`for`, `синф`/`class`, `кӯшиш`/`try`, …);
- the language server, started from `somonscript.server.path`, the workspace's
  `node_modules/@lindentech/somon-script`, or `somon` on the `PATH`.

```bash
cd editors/vscode
npm install
npx @vscode/vsce package     # then: Extensions → Install from VSIX…
```

| Setting                     | Default | Meaning                                       |
| --------------------------- | ------- | --------------------------------------------- |
| `somonscript.server.enable` | `true`  | Start the language server                     |
| `somonscript.server.path`   | `""`    | Path to `dist/cli.js` or a `somon` executable |
| `somonscript.locale`        | `""`    | `en`, `ru` or `tj`; empty: VS Code's language |
| `somonscript.trace.server`  | `off`   | Log the protocol (`messages`, `verbose`)      |

**SomonScript: Restart Language Server** restarts it after the compiler was
updated.

---

## Browser

The compiler runs in browsers without Node.js: the lexer, parser, type checker
and code generator are bundled into one script.

```bash
npm run build && npm run build:browser
# → dist/browser/somonscript.js (and a copy in docs/playground/)
```

```html
<script src="somonscript.js"></script>
<script>
  const result = SomonScript.compile('чоп.сабт("Салом аз браузер!");', {
    target: 'es2022',
  });
  if (result.errors.length === 0) SomonScript.execute(result.code, console);
  else console.error(result.errors.join('\n'));
</script>
```

The bundle also loads with `require()` (CommonJS). `compile(source, options)`
takes `target` (default `es2022`), `typeCheck`, `strict`,
`experimentalDecorators` and `locale`, and returns `{ code, errors, warnings }`
like the Node compiler (no source maps, no module system: `ворид` of another
file fails at run time). `execute(code, console)` runs the code as a CommonJS
module with the given console and returns its `module.exports`.

TypeScript is not in the bundle. It is needed only to lower decorators,
`дастрасӣ` and `истифода` (which no browser runs yet) and for targets older than
`es2022`. Load `typescript.js` first (so that `ts` is a global), or pass it as
`options.typescript`; without it such programs return `needsTypeScript: true`
and an error saying so:

```som
функсия сабтКун(метод: ҳар, контекст: ҳар) {
    бозгашт метод;
}
синф Ҳисоб {
    @сабтКун ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }
}
```

### Playground

[`docs/playground/index.html`](../docs/playground/index.html) is a page to try
SomonScript: an editor with examples, the compiled JavaScript, a **Run** button
whose console output goes to a panel, errors and warnings, target, type-check
and strict options, and an English, Russian or Tajik interface (`?lang=tj`).
<kbd>Ctrl</kbd>+<kbd>Enter</kbd> runs the program.

It loads `somonscript.js` from its own directory (or `dist/browser/` when the
repository is served), so build the bundle first and serve the repository with
any static server:

```bash
npm run build && npm run build:browser
npx http-server .     # then open /docs/playground/
```

TypeScript is fetched from a CDN only when a program needs lowering; point
`?typescript=` (or the page's `data-typescript` attribute) at another copy to
work offline.

---

**Back to**: [Guide index](README.md)
