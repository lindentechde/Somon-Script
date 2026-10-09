# SomonScript for Visual Studio Code

Support for [SomonScript](https://github.com/lindentechde/Somon-Script) — the
TypeScript-compatible language with Tajik Cyrillic keywords — in VS Code:

- **Syntax highlighting** for `.som` files: every keyword (contextual ones such
  as `кун`, `ҳосил`, `эълон`, `истифода` included), strings, template literals,
  regular expressions, numbers (separators, bigint), comments, decorators and
  type annotations.
- **Snippets** under Tajik and English prefixes: `функсия`/`function`,
  `агар`/`if`, `барои`/`for`, `синф`/`class`, `интерфейс`/`interface`, …
- **Language server** (`somon lsp`): diagnostics from the lexer, parser and type
  checker as you type (honouring `somon.config.json`), hover with types and
  Tajik keyword docs, completion (Tajik aliases of built-in members first), go
  to definition (also into imported files), the document outline and semantic
  highlighting.

## Requirements

The language server comes with the compiler. Install it in your project (or
globally):

```bash
npm install --save-dev @lindentech/somon-script
```

The extension looks for the server in this order:

1. the `somonscript.server.path` setting (a `dist/cli.js` or a `somon`
   executable);
2. `node_modules/@lindentech/somon-script/dist/cli.js` in a workspace folder;
3. `somon` on the `PATH`.

## Settings

| Setting                     | Default | Meaning                                                     |
| --------------------------- | ------- | ----------------------------------------------------------- |
| `somonscript.server.enable` | `true`  | Start the language server                                   |
| `somonscript.server.path`   | `""`    | Path to the `somon` CLI                                     |
| `somonscript.locale`        | `""`    | Server messages in `en`, `ru` or `tj` (empty: from VS Code) |
| `somonscript.trace.server`  | `off`   | Log the protocol messages (`messages`, `verbose`)           |

The command **SomonScript: Restart Language Server** restarts the server, for
example after updating the compiler.

## Building the extension

The extension is plain JavaScript; it only needs its own dependency:

```bash
cd editors/vscode
npm install
npx @vscode/vsce package
```

Install the resulting `.vsix` with **Extensions: Install from VSIX…**. To try it
without packaging, open `editors/vscode` in VS Code and press <kbd>F5</kbd>.

The grammar is tested in the compiler's test suite
(`tests/vscode-grammar.test.ts`) with the same TextMate engine VS Code uses.

## License

MIT
