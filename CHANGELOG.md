# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## Unreleased

### ⚠ Breaking Changes

* `--strict` (`compile(source, { strict: true })`) checks for `холӣ`/`беқимат` like TypeScript's `strictNullChecks`: they are only assignable to types that include them, and a value that may be `холӣ`/`беқимат` can't be dereferenced or computed with until a check (`!== холӣ`, `агар (х)`, an early `бозгашт`, …) narrows it. `Array` `.баровардан()`/`.ҳазфиАввал()`/`.дар()`/`.кофтан()`/`.охиринЁфтан()`, `String` `.дар()` and `Map` `.бозгирифтан()` return `Т | беқимат`, and optional parameters and properties include `беқимат`. Programs compiled with `--strict` may need such checks.
* Reading a member that an array, string, number, `Map`, `Set`, `Promise`, class, interface or object type doesn't have is reported (`PROPERTY_NOT_FOUND`): an error with `--strict`, a warning otherwise. `с.дорад(1)` on a `Set` (`includes`) now points to `дорадКалид` (`has`).
* Assigning to a `танҳохонӣ` (readonly) property, element or array outside its initialisation is reported (`READONLY_ASSIGNMENT`): an error with `--strict`, a warning otherwise.
* Method signatures in interfaces and object types are checked as function types: calls are checked for argument count and types, and a non-function value for a method is a type error.
* Top-level `интизор`, `барои интизор` and `интизор истифода`, and `ворид.meta`, are compile errors in CommonJS output, which cannot run them (they failed when the program loaded). Compile with `module: 'esm'` (`--module esm`); a host that runs the code inside an async function, as the REPL does, passes `topLevelAwait: true`.
* `--target es2020`, `es2019` and the other targets below es2022 now lower the syntax the target lacks (class fields, private members, static blocks, …); es2020 output used to be returned unchanged. The default target is now es2022, which Node.js 20 runs in full, so the default output is the same as before.
* CommonJS output of a module (a program that imports or exports) starts with `"use strict";`, as TypeScript's does: module code is strict mode code, as it already was in ES module output. Code that relied on sloppy mode there (`ин` in a plain function call being the global object, assigning an undeclared name) behaves as in TypeScript and ES modules now.

### ✨ Features

* Every TypeScript operator and statement has a SomonScript form; `llm-guide/14-operators.md` lists them and `tests/operators.test.ts` runs each one:
  * Type operators in expressions: `х чун Т` (`as`), `х чун собит`, `<Т>х`, the non-null assertion `х!`, `х бармесоё Т` (`satisfies`), definite assignment `тағ х!: Т`, generic arrow functions `<Т>(х: Т) => х`.
  * Statements: `кун { … } то (…);` (do-while), labels with `шикастан`/`давом нишона`, `барои интизор` (for await), `debugger`, the empty statement, `шумориш` enums (and `собит шумориш`), generators `функсия*` with `ҳосил`/`ҳосил*` (yield), and several variables in one declaration (`тағ а = 1, б = 2;`, also in `барои` heads). `кун`, `шумориш` and `ҳосил` are contextual: they remain usable as names.
  * Expressions: regular expression literals, tagged templates, `нав.target`, class expressions, private members `#х` with `#х дар о`, getters/setters in classes and object literals, static blocks, parameter properties (`конструктор(хосусӣ х: рақам)`), generator and async methods.
  * Types: `х аст Т` type predicates and `тасдиқ х [аст Т]` assertion signatures that narrow at the call site, `танҳохонӣ Т[]`/`танҳохонӣ [А, Б]`, `беназир рамз`, optional tuple elements, constructor types `нав (…) => Т`, the `ин` type, generic constraints/defaults with object types, `чун` key remapping in mapped types, optional and generic method signatures.
* Destructuring patterns in `барои … аз` / `барои … дар` heads: `барои (собит [к, в] аз объект.воридот(о))`.
* `нав Map<сатр, рақам>()` keeps its type arguments, and `ном?: сатр` class fields are optional.
* `examples/leetcode`: solutions to LeetCode's Top 100 Liked problems with their own tests (`npm run test:leetcode`).
* The TypeScript checker (`checker: 'typescript'`, `--checker typescript`, `compilerOptions.checker`) type-checks a program with the TypeScript compiler (5.4) for TypeScript's full semantics: imported `.som` modules, `.d.ts` typings and `@types` from `node_modules`, the libs of `target`/`lib`, `useDefineForClassFields` and `experimentalDecorators`, and TypeScript's strict options with `strict`. Errors keep the compiler's format (`Type error [TS2322] at line L, column C: …`) at `.som` positions, name types in Tajik (`'рақам'`), name a member written with its alias both ways (`'дорад' (includes)`), and come in English, Russian or Tajik (`locale`, or the CLI's `--lang`). `filePath` tells it where the file is. Lib and typing files are parsed once per process. Every example and LeetCode solution type-checks in strict mode. See `llm-guide/15-type-checking.md`.
* `somon check <files…>` (`санҷиш`) type-checks without writing output, with the TypeScript checker unless `--checker somon` or the config says otherwise; `--strict`, `--target`, `--lib` and `--experimental-decorators` apply. All files share one TypeScript program; errors are listed per file and the exit code is 1 when there are any.
* ES module output (`module: 'esm'`, `--module esm` for `compile` and `run`, `compilerOptions.module`): `import`/`export` instead of `require`/`module.exports`, with `.som` → `.js` specifiers, `export * as`, side-effect and namespace imports, `import х from` for `ворид х = require(…)` and `export default` for `содир =`. Type-only imports and exports, and imports used only as types, are left out. ES modules allow top-level `интизор` and `ворид.meta` (`import.meta`). `somon run --module esm` runs the program as ES modules with its `node_modules`; bundled modules stay CommonJS, and a project whose `module` is `esm` gets an `esm` bundle by default.
* Declaration files: `declaration: true` returns the TypeScript declarations in `CompileResult.declaration`, and `somon compile --declaration` (`compilerOptions.declaration`) writes the `.d.ts` next to the JavaScript.
* The TypeScript emitter (`src/ts-emitter.ts`) prints a program as TypeScript that keeps every type and every declaration: annotations, generics, interfaces, enums, namespaces, assertions, and the TypeScript 5 declaration syntax (decorators, `declare`, ambient modules and `declare global`, overload signatures, `abstract`/`override`/`accessor` members, index signatures, `using`, `this` parameters, `const`/`in`/`out` type parameters, `import type`/`export type`, `import =`/`export =`, the shebang), with Tajik type names in TypeScript's spelling and positions that map back to the `.som` source. It feeds the TypeScript checker and the declarations; transpiled, every program of the repository runs exactly like the JavaScript output.
* The parser keeps type syntax it used to skip or approximate: `инфер У`, `навъи х` in types, template literal types, `+`/`-` modifiers of mapped types, key parameters of index signatures and names of computed members in interfaces, type arguments of calls, method calls (`р.reduce<Т>(…)`) and `мерос`/`татбиқ` clauses, and `калонрақам` (bigint); and the ES module forms `ворид "./м";`, `ворид а, * чун Н аз …`, `содир * чун Н аз …` and `ворид.meta`.
* The TypeScript 5 declaration syntax, with contextual keywords that stay ordinary names elsewhere (the English words work too), described in `llm-guide/14-operators.md`:
  * Decorators `@ном`, `@а.б(1)`, `@(ифода)` on classes, class expressions, methods, accessors, fields and `дастрасӣ` (accessor) auto-accessors; `--experimental-decorators` (`compilerOptions.experimentalDecorators`) selects legacy decorators, which may also decorate parameters.
  * `эълон` (declare) for variables, functions, classes, enums, namespaces, class fields, `эълон модул "ном" { … }` and `эълон глобалӣ { … }`, all erased; the checker types what they declare.
  * `бознавис` (override), `истифода` / `интизор истифода` (using / await using), type-only imports and exports (`ворид навъ { Т }`, `{ навъ Т, х }`, `содир навъ …`), `ворид х = require("…")`, `ворид х = Н.а`, `содир = х`.
  * Type parameter modifiers `собит` / `дар` / `берун` (const, in, out), overload signatures checked at calls, `ин` (this) parameters, declaration merging of namespaces, classes, functions and enums, and a `#!` line kept as the first line of the output.
* JavaScript targets from es5 to esnext (`target` in `CompileOptions`, `compilerOptions.target`, `--target` for `compile`, `run` and `bundle`), described in `llm-guide/16-targets.md`: the generated code is lowered with TypeScript only when it uses syntax newer than the target (`downlevelIteration` for es5, helpers inlined), and syntax no transform can express (BigInt below es2020, newer regular expression flags, top-level `интизор` below es2022) is a compile error at its statement. `lib` (`--lib es2022,dom`) and `useDefineForClassFields` are new options; decorators, `дастрасӣ` and `истифода` are lowered for every target.
* Bundle formats (`bundle.format`, `--format`): `commonjs` (default), `esm` (an ES module that exports the entry's exports) and `iife` with `globalName` (`--global-name`) for browsers; a bundle is lowered once for its target, so TypeScript's helpers appear once.
* Editor and browser support, described in `llm-guide/18-editors.md`:
  * `somon lsp` is a Language Server Protocol server over stdio: diagnostics from the lexer, parser and type checker (honouring `somon.config.json`), hover with types and Tajik keyword docs, completion of names, keywords and members of built-in types (Tajik names first), go to definition (also into imported files), document symbols, semantic tokens and formatting with `somon fmt`.
  * A VS Code extension in `editors/vscode/`: the `somonscript` language for `.som` files with a TextMate grammar covering every keyword, snippets, and a client that starts `somon lsp`.
  * A browser build of the compiler (`npm run build:browser`, no Node.js built-ins; TypeScript is needed only for lowering) and a playground in `docs/playground/` with examples, output and console panels, and an en/ru/tj interface.
* Developer tools, described in `llm-guide/17-tools.md`:
  * `somon fmt` (`формат`) formats `.som` files in one canonical style: 4 spaces per level (`fmt.indent` in `somon.config.json` or `--indent`), `{` on the line of its statement, spaces around operators, `;` after every statement, at most one blank line. Line breaks and every comment stay; the formatter parses its result again and refuses any change to the syntax tree. `--check` lists unformatted files and exits 1 (for CI), `--stdout` prints the result. A file whose first line break is CRLF keeps CRLF line endings. API: `format(source, { indent })`.
  * `somon repl` (`интерактив`) is an interactive session: multi-line input, declarations that stay visible in later inputs, printed expression values, `интизор` at the top level, the commands `.ёрӣ`/`.help`, `.баромад`/`.exit`, `.пок`/`.clear` and `.js`, and a history in `~/.somon_repl_history` (`SOMON_REPL_HISTORY` moves it; empty turns it off). API: `new Repl(options)`.
  * `somon migrate` (`интиқол`) converts TypeScript to SomonScript: keywords, types and globals become Tajik, and so do members of built-in types where the TypeScript checker sees them; comments and blank lines stay, and names that SomonScript reserves are renamed. TypeScript 5 syntax (decorators, `declare`, `override`, `accessor`, `using`, `import type`, `this` parameters, `in`/`out`, `import =`/`export =`) gets its SomonScript form. What has no SomonScript form is reported as a warning, never silently changed. A differential test migrates, compiles and runs 87 TypeScript programs (every construct, and LeetCode solutions) and compares their output with TypeScript's. API: `migrate(source)`.
  * For tools, `new Lexer(source, { comments: true })` keeps comments as tokens with source offsets, and `Parser.omittedSemicolons` lists the statements that ended without `;`.
* The rest of TypeScript 5.4's type syntax: generic function and constructor types (`<Т>(х: Т) => Т`, `нав <Т>() => К`), `инфер У мерос сатр` and `навъи ф<рақам>` (TypeScript 4.7), import types (`ворид("./м").Т`, `навъи ворид("./м")`), conditional types as tuple elements, and a getter and setter of different types (TypeScript 5.1), whose setter decides what may be assigned, and the English `unique` (`unique symbol`).
* `ворид { пешфарз чун х } аз "./м"`, `содир { х чун пешфарз }`, `содир { пешфарз } аз "./м"`: any keyword is a module export name; a keyword imported or exported without `чун` is an error, as in JavaScript.
* Dotted namespaces (`номфазо А.Б { … }`), and `содир ҳамзамон функсия`, `содир мавҳум синф` and `содир ворид х = Н.а;` inside namespaces.
* A class may extend any expression, as in TypeScript: `синф А мерос Омехта(Асос) {}`, `мерос Н.Асос`.
* `барои (х аз …)`, `барои (о.к дар …)` and `барои ([а, б] аз …)` assign to an existing variable, property or pattern; array literals keep their holes (`[1, , 3]`); destructuring patterns take computed and numeric keys (`{ [калид]: қимат, 0: аввал }`); enum members may be named `["номи дароз"]`.
* Anonymous default exports: `содир пешфарз функсия () {}`, `содир пешфарз ҳамзамон функсия* () {}` and `содир пешфарз [мавҳум] синф [мерос А] {}`, also decorated, for CommonJS (`module.exports.default = …`) and ES module (`export default …`) output; `somon migrate` no longer asks for a name.
* `гирифтан (е: ношинос)` and `гирифтан (е: ҳар)` type the catch binding, as in TypeScript (any other type is TypeScript's error TS1196), and the binding may be a destructuring pattern: `гирифтан ({ message })`. The TypeScript emitter keeps the type and `somon migrate` no longer drops it.
* Call and construct signatures in interfaces and object types (`{ (х: рақам): сатр; нав (х: рақам): К; }`, also generic and several of them): calls and `нав` of such values are checked against them, a function is a value of a type with call signatures (when its other members are optional) and a class one of a type with construct signatures; the TypeScript emitter prints them and `somon migrate` keeps them.
* A union or intersection type may start with `|` or `&`, as in TypeScript: `навъ Т = | "а" | "б";`, also with each member on its own line.
* Instantiation expressions `ф<рақам>` and `нав К<Т>` without arguments (TypeScript 4.7): erased in JavaScript, kept by the TypeScript emitter; `ф<Т>.ном` is TypeScript's error TS1477. Optional calls and tagged templates take type arguments too: `ф?.<рақам>(1)`, `тег<рақам>\`…\``.
* Verification against TypeScript, described in `llm-guide/19-verification.md`:
  * A differential test (`tests/differential.test.ts`) runs every runnable `.som` program, the operator and TypeScript 5 syntax programs of the tests and the TypeScript programs of `tests/fixtures/migrate` three ways: compiled by SomonScript, printed by the TypeScript emitter and transpiled by TypeScript, and (for the fixtures) the original TypeScript transpiled by TypeScript. On es5, es2015, es2017, es2020, es2022 and esnext, as CommonJS and ES modules, all three must print and throw the same; the verdicts of the SomonScript and TypeScript checkers are compared in default and strict mode. Every known difference is listed with its reason in `tests/helpers/differential-known.ts`, and the test fails on a new one. `SOMON_FULL_MATRIX=1` runs every cell instead of a rotating sample.
  * Property-based tests with fast-check (`tests/fuzz.test.ts`, grammar-based generators in `tests/helpers/fuzz.ts`): the lexer and parser raise only positioned errors on any input; generated programs survive printing, the code generator, the TypeScript emitter, `format()` (idempotent) and `migrate()`; and compiled programs run like their TypeScript on random targets. Fixed seed; `SOMON_FUZZ_RUNS`, `SOMON_FUZZ_SEED` and `SOMON_FUZZ_PATH` run more and replay a failure.
  * `scripts/run-runtimes.js` runs the compiled examples and LeetCode solutions on Bun and Deno and compares them with Node.js; the pull request workflow runs it on both, and a nightly workflow (`nightly-verification.yml`, also started by hand) runs the full targets matrix, the full differential test and long fuzz runs with a new seed.

### 🐛 Bug Fixes

* Generated JavaScript indents the first statement of nested blocks, single-statement bodies, bare blocks, class members and `интихоб` cases correctly.
* A name declared twice in a `барои` head pattern is a compile error instead of a SyntaxError at run time.
* Constructor parameter properties (`конструктор(хосусӣ х: рақам)`) assign `ин.х`; they were silently dropped, leaving `ин.х` undefined.
* `get х()`/`set х(қ)` in a class compile to accessors instead of a field named `get` followed by a method.
* The docs list the `Map`/`Set` aliases and only valid `compilerOptions`.
* `о.м<Т>(х)` is a call with type arguments; it compiled to the comparisons `о.м < Т > (х)`. Type arguments closed by `>>` (`ф<Map<К, В>>(х)`) parse.
* English keywords work wherever their Tajik ones do: `else` and `return`, which the lexer already knew, were parse errors, and so were `throw`, `new`, `function`, `case`, `default`, `async`, `await`, `static`, `of` and `in` (`барои (собит х of …)`, `[К in keyof Т]`), and the TypeScript words `extends` and `implements` in classes, interfaces and conditional types, `public`/`private`/`protected`/`readonly`/`abstract`, `keyof`, `this` and `super`. English `true`, `false` and `null` are literals for the type checker too (`true` was an undefined variable in strict mode). `async`, `of`, `readonly`, `abstract` and `keyof` remain usable as names. See `llm-guide/02-keywords.md`.
* Class members named with a keyword (`агар() {}`, `бозгашт = 1;`, `статикӣ нав() {}`, also English ones such as `return = 1;`) were parse errors, and so were interface and object type members named with most keywords, a string or a number (`"а-б": рақам;`). A modifier word is a modifier only when a member follows it, as in TypeScript, so `статикӣ() {}`, `хосусӣ = 1;` and `танҳохонӣ: рақам;` name members. Class fields need `;`, `}` or a line break after them: `а = 1 б = 2` used to compile silently to two fields. Modifiers on interface members and bigint member names (`1n`) are errors, as in TypeScript.
* `ф<ҳар>(1)` compiled to the comparisons `ф < ҳар > 1`: type arguments that are keyword types (`ҳар`, `рақам`, `сатр`, `ношинос`, `беджавоб`, `any`, …), literal, function, `калидҳои`/`навъи`, tuple, `танҳохонӣ` and template types were not read as type arguments, and neither were those of a call result, an element or a parenthesized callee (`ф()<Т>(х)`). `<` after an operand is now read exactly as TypeScript reads it: type arguments when what follows parses as types and the `>` is followed by `(`, a template, a line break, a binary operator or a token that cannot start an expression; a comparison otherwise (`а < б > в`, `а < б > +1`). Negative and bigint literal types (`-1`, `1n`) parse, and the TypeScript emitter keeps `1n`. `somon migrate` keeps every type argument list.
* The TypeScript emitter dropped the names of named tuple members (`[х: рақам, у?: рақам]` became `[number, number?]`); it keeps them, and a tuple with some names but not all, or with `х: Т?`, is TypeScript's error.
* `-1` was typed `рақам`, so `тағ н: -1 | 1 = -1;` was a type error; a negative number literal has its literal type.
* `.github/copilot-instructions.md` showed `синф Саг мерос_мебарад Ҳайвон`, which does not parse (inheritance is `мерос`), and an outdated list of bundle formats; tests/docs-snippets.test.ts now compiles the snippets of `.github/**/*.md` too.
* Examples with errors the TypeScript checker found work as written: a demo whose module exported nothing, `кофтан` (find) called with a value, `хато.паём` (undefined; `.message`), private members read by subclasses, and return types that did not say what the code returns.
* The TypeScript emitter declares an optional parameter property (`конструктор(хосусӣ х?: сатр)`) as optional; the TypeScript checker rejected the assignment of `х` in strict mode.
* The SomonScript checker knows a class's `prototype`, lets a later declaration of a merged `шумориш` name the members of earlier ones, and checks the computed names of class members (`[калид] = 1`).
* ES module output exports a later block of a merged `номфазо`/`шумориш` by name; it was `export (function (Н) { … })(…)`, a syntax error.
* Two default exports in one module (`содир пешфарз …` twice, or with `содир { х чун пешфарз }`) are a compile error, as in TypeScript (TS2528); ES module output failed to load and CommonJS output kept the last one.
* `навъи {}`, `навъи --х`, `void ++х`, `void -1` and `typeof +х` parse as the operators they are; a stray run of tokens in an `интихоб` body is one error, and switch and class body errors give their column.
* `somon migrate` keeps `typeof` before a sign (`typeof -x`), which `навъи -x` would read as a subtraction.
* Lowering for a target no longer fails when TypeScript 5.4's checker crashes on valid JavaScript (an `интихоб` over a variable that holds `[]`): the code is then lowered as TypeScript.
* The TypeScript emitter keeps the parentheses of `(а < б) > (в)` and `ф((а < б), в > (г))`, which TypeScript would otherwise read as calls with type arguments.
* `кӯшиш { … }` without `гирифтан` or `ниҳоят` is a parse error, as in JavaScript; it compiled to a `try` that no JavaScript engine loads.
* When TypeScript 5.4 crashes while it lowers valid code for a target (its checker overflows the stack on a few programs), the compile error says so and names the TypeScript version, instead of passing on the raw `Maximum call stack size exceeded`. TypeScript 5.6 and later no longer type-check the code they lower.
* A `/` after an object literal or a block comment in a template interpolation (`` `${{} / 2}` ``, `` `${а / /* … */ б}` ``) is a division; it was read as the start of a regular expression, a parse error.
* `somon compile --declaration -o x.mjs` wrote `x.d.ts`, which TypeScript does not read for `x.mjs`; it writes `x.d.mts`, and `x.d.cts` for `x.cjs`.
* `somon.config.json` accepted an array where an object belongs (`"compilerOptions": []`, also for the file itself, `moduleSystem` and its sections, `paths`, `bundle` and `fmt`) and ignored it; it is a configuration error (`compilerOptions: must be an object`).
* A `somon.config.json` saved as UTF-8 with a byte order mark (as Notepad and other Windows editors do) was "not valid JSON"; the mark is ignored.
* `somon repl` with piped input no longer fails on Node.js 24: when the input ended while an input was still running, the next prompt went to the closed readline interface, which Node.js 24 rejects (`readline was closed`).
* Importing a Node.js module (`ворид * чун фс аз "fs"`, `"node:path"`, `"fs/promises"`) failed in `somon run`, `somon bundle` and `ModuleSystem.compile()` with "Module not found" unless it was listed in `externals`; built-in modules now always stay host requires (imports of an `esm` bundle), and `validate()` no longer reports them as missing.
* An absolute import path (`ворид { х } аз "/home/…/лоиҳа/util"`) was used as written: without its extension or naming a directory it failed with `ENOENT`; it now tries the extensions, `index.*` files and `package.json` "main" like a relative import, and a path that names no file is a "Cannot resolve module" error.
* A package from `node_modules` whose `package.json` "exports" only has an `import` condition (an ES module package) could not be imported ("Package subpath '.' is not exported"), not even into an `esm` bundle or with `run --module esm`; such a subpath now resolves to its ES module.
* `ModuleResolver.resolve()` returned the whole specifier of a package subpath as `packageName` (`somon resolve pkg/lib/x` printed "Package: pkg/lib/x"); it is the package's name (`pkg`, `@scope/kit`).
* A `package.json` that is not valid JSON made module resolution fail with JSON's bare message, which does not say which file is broken, and one that is not an object, or has a `main` that is not a string, failed with a `TypeError`; the error names the file (`Invalid package.json …/package.json: …`), and like Node a `main` that is not a string is ignored.
* On Windows an import of a UNC path (`//server/share/lib/x`) outside `baseUrl` was resolved against `baseUrl`'s drive (`C:\server\share\lib\x`) as if it were project-relative; UNC paths are system paths like `C:\…`.
* The dependency levels of the module registry treated a module reached a second time as level 0 (`main → c` and `main → b → c`), so `maxDependencyDepth` (`somon module-info --stats`) and the levels of `getDependencyTree()` were too small.
* `somon bundle --minify` and `somon run --minify` minified the bundle with the `babel.config.json` of the current directory, applying the project's presets and plugins to it (and failing when they were not installed); bundles are minified the same way in every project.
* `ModuleSystem.compile()`/`bundle()` treated their entry point as an import specifier: a relative entry (`compile("src/main.som")`) failed with "Module not found", and an absolute entry outside `baseUrl` whose path has no known system prefix (`/private/var/…` on macOS, `/workspaces/…`, `/srv/…`) was resolved inside `baseUrl` instead. The entry is a file path, relative to the current directory.
* Bundles took text that only looks like a require for one: a string such as `"use require(x)"` in a `.som` module failed the bundle ("Dynamic require expressions are not supported"), `"require('./a')"` in a string was rewritten (breaking the string, or the bundle's syntax), and `// require('./x')` in a comment of a local `.js` file became an import of an `esm` bundle (which then failed to load) and made `iife` bundles fail. Requires are found in the syntax tree; modules larger than 10 MiB can be bundled too.
* A bundle (also `somon run`) that imported a directory (`ворид … аз "./lib"` for `lib/index.som`) or a file found by another extension (`"./data"` for `data.json`) failed at run time with "Cannot find module './lib.js'"; such modules are bundled.
* With `moduleSystem.loading.cache: false` the module system compiled nothing: `compile()` returned no modules and no errors and `somon bundle`/`somon run` failed with "Entry module … missing from bundle results". Without a cache every build reads its files again.
* The errors of `ModuleSystem.compile()` for a module that does not compile had no `column` (and bundle errors named `file:line`), because the compiler's "at line 3, column 16" was read with a pattern for "line 3:16"; they have both.

## 0.4.0 (2026-10-09)

### ⚠ Breaking Changes

* Parse errors are always fatal: `compile()` returns no code and the CLI exits non-zero. Previously they were warnings and statements were silently dropped from the output.
* Keywords are matched with their exact spelling; `Агар`, `ТАҒЙИРЁБАНДА`, … are ordinary identifiers.
* JavaScript reserved words (`class`, `new`, …) cannot be used as names.
* Programs JavaScript would reject at load time are compile errors, also with `typeCheck: false`: invalid assignment/`++`/`--` targets, `собит` without an initializer, `шикастан`/`давом` outside a loop or `интихоб`, and a name declared twice in one scope (including two functions of the same name, a body-level variable named like a parameter, and the arms of one `интихоб`).
* Built-in member aliases are translated consistently: an object key such as `дарозӣ` is emitted as `length`, matching `о.дарозӣ`. Destructuring keys and exported/imported names are translated too, so destructuring an object from outside SomonScript (e.g. JSON with a key `вақт`) needs a non-aliased name or an explicit quoted key (`{ "вақт": вақт }`), and JavaScript code importing a SomonScript export named `илова` sees `push`.
* The localized CLI has a single command tree: English command names always work, Tajik/Russian names are aliases. `SOMON_LOCALIZATION_MODE` is gone, an invalid `--lang` is an error, and `LC_ALL` overrides `LANG`.
* Config paths (`outDir`, `output`, `bundle.output`, `resolution.baseUrl`) resolve against the config file's directory.
* `--production` is deprecated and has no effect; `start-server.sh`, `src/core` and `src/error-aggregator.ts` were removed; the npm package only ships `dist` and the docs.

### ✨ Features

* Operators `?:`, `??`, `**`, `?.`, `??=`/`||=`/`&&=`/`**=`, `typeof`/`навъи`, `void`, `delete`, `in`, `instanceof` and the comma operator.
* Spread in arrays, objects and calls; parameter defaults, rest and destructuring; shorthand and method properties; destructuring defaults.
* Async class methods, function type annotations, named tuple members, interface inheritance (`мерос А, Б`), `Ваъда<Т>`.
* Numeric literals in hex/binary/octal/exponent/BigInt form with `_` separators; full string escapes.
* Real source maps built from AST positions (`CompileOptions.sourceFileName`), also for `run --source-map`.
* Bundles include local `.js`/`.json` dependencies and honour `circularDependencyStrategy`; `package.json` `exports` are resolved.

### 🐛 Bug Fixes

* Code generation keeps grouping parentheses, no longer drops call statements, escapes template literals correctly and parenthesises arrow bodies that are object literals.
* Bundle module keys are escaped (a crafted file name could inject code); imports with three or more `../` work.
* The type checker accepts subclasses and implementing classes, checks every statement body, return types and object literals, and is linear instead of quadratic in the number of functions.
* `--no-type-check` and the `run`/`bundle` compiler flags work; `compile` never overwrites its input; `run` forwards only the program's own arguments, writes its temp file outside the source tree and forwards signals.
* Release workflows no longer interpolate inputs into shell scripts, publish in a re-runnable order and generate non-empty release notes.

## 0.3.16 (2025-09-18)

### ✨ Features

* Achieve Grade A architecture with major improvements ([421cfda](https://github.com/lindentechde/Somon-Script/commit/421cfdab8c259bafaf3c2ec852506bda3f06b584))
* Add CI/CD pipeline and Phase 2 foundations ([62ed2e5](https://github.com/lindentechde/Somon-Script/commit/62ed2e5ea52cfec61ddbac88a4207e963e451d76))
* add CLI program module and update package dependencies ([c731fbd](https://github.com/lindentechde/Somon-Script/commit/c731fbdf62947ce5dfcd30dbcbf63d9af5eeea84))
* add commonjs module system support ([a860c55](https://github.com/lindentechde/Somon-Script/commit/a860c556b435f3870046a4c241ce65ee59a5225f))
* add comprehensive feature alignment documentation for Somoni-script ([946cce4](https://github.com/lindentechde/Somon-Script/commit/946cce481d9dfc3dbf9435ba37cabd0ede3ca25b))
* add comprehensive next development phases roadmap ([7108285](https://github.com/lindentechde/Somon-Script/commit/71082851ff6dc91c432f5aba986c30c297547f37))
* add comprehensive tests for template literal parsing and error handling ([2a685d8](https://github.com/lindentechde/Somon-Script/commit/2a685d881bb70e6948d5f9697da3c3343d495455))
* add diagnostic codes and snippets ([0ed42bc](https://github.com/lindentechde/Somon-Script/commit/0ed42bc471c5730061480435315a1565b545cc3e))
* add logo PNG image to the project ([be43ab2](https://github.com/lindentechde/Somon-Script/commit/be43ab28ae5b3c4158bd9b2da52352a1d0589882))
* add minification transpilation and source maps ([3be5cc3](https://github.com/lindentechde/Somon-Script/commit/3be5cc31e9b59d4e2126325793f655d01e01581a))
* add multiline array parsing and improve Phase 3 types ([5b50cc7](https://github.com/lindentechde/Somon-Script/commit/5b50cc7746df51f2029bff65bfe09f2649bb7e6f))
* Add production-ready module system infrastructure ([93cabc2](https://github.com/lindentechde/Somon-Script/commit/93cabc2c3375bdad969518587aa1a049c2f72173))
* add support for arrow token in lexer and token types ([0bd6e3e](https://github.com/lindentechde/Somon-Script/commit/0bd6e3e41a295e97824118650f61cd32ccd552ec))
* add support for ImportNamespaceSpecifier and enhance module loading with externals handling ([e7c1149](https://github.com/lindentechde/Somon-Script/commit/e7c11498d6bd5f688dd2d90011f97cc08f5633a5))
* complete module system and async programming implementation ([0db4999](https://github.com/lindentechde/Somon-Script/commit/0db49993eef3577545f80f5bb7a9f3853c2ac0a8))
* Complete Phase 1 - Core Type System implementation ([9cff478](https://github.com/lindentechde/Somon-Script/commit/9cff478e190df4e14d7475b0a0d94997b4e50811))
* Complete Phase 4 - Technical Debt Resolution & Foundation Strengthening ([2e48ed8](https://github.com/lindentechde/Somon-Script/commit/2e48ed8ccded76c2ad4d504d19180016ac44c245))
* complete phase 4 with major language improvements ([d506a6c](https://github.com/lindentechde/Somon-Script/commit/d506a6c9a89e78fc1f7e67ec090689a7bf99517d))
* eliminate all 'as any' type assertions for improved type safety ([6a3cc23](https://github.com/lindentechde/Somon-Script/commit/6a3cc23a5446b51dfa59111256117a891391eaa5))
* enhance config file support and fix watch mode ([5b15a3e](https://github.com/lindentechde/Somon-Script/commit/5b15a3e01bbd2e8f0b8146cdb370274587d0e049))
* enhance module system with cache management, memory tracking, and validation for module IDs ([0685a3a](https://github.com/lindentechde/Somon-Script/commit/0685a3a72a125fd41ee7a419e6e0cccaba36211d))
* enhance pre-commit hook to format package files after version increment ([e3ee403](https://github.com/lindentechde/Somon-Script/commit/e3ee403fdd2931dc906d60cdc4b26540f878a703))
* enhance type safety by refining ESLint rules and updating test assertions ([5b29004](https://github.com/lindentechde/Somon-Script/commit/5b2900492b68a6d28379ed20f39383c4ebe3b571))
* enhance type safety by using PluginItem type for Babel presets in module system and compiler ([b19ea5f](https://github.com/lindentechde/Somon-Script/commit/b19ea5ffe012c553f32ebe62742523a940a5af33))
* extend Node.js version matrix in CI configuration to include newer versions ([8433830](https://github.com/lindentechde/Somon-Script/commit/84338303b5a112043d064b60e9ce6a38b32fc0f9))
* implement application layer with clean architecture and use case orchestration ([56483ee](https://github.com/lindentechde/Somon-Script/commit/56483ee6eb3462637353986f3e5f4694af4c22e8))
* implement automatic version incrementing and update package version to 0.2.1 ([8210ede](https://github.com/lindentechde/Somon-Script/commit/8210edeb8ec7e311ff5df44b2f13dce4eba6d2fa))
* implement comprehensive module system with bundling and CLI integration ([d8e383a](https://github.com/lindentechde/Somon-Script/commit/d8e383acdaeda39615c3dc5fe9848dbcb8953e24))
* implement comprehensive operator support and enhance lexer and parser functionality ([217c502](https://github.com/lindentechde/Somon-Script/commit/217c5025c4437559dfedb5d8f05ab995531f596c))
* implement for loops and increment operators ([886e298](https://github.com/lindentechde/Somon-Script/commit/886e29825a7d5ed0e99704225e323eb44e457b6c))
* Implement Phase 2 Object-Oriented Programming ([60fc567](https://github.com/lindentechde/Somon-Script/commit/60fc567d9fe5594b23ab49de1bbeda16ff15210c))
* Implement Phase 3 Advanced Type System ([5d11108](https://github.com/lindentechde/Somon-Script/commit/5d1110819fb2369baff356471bc02018bfcfdc4b))
* implement PR validation workflow and docs ([38f899a](https://github.com/lindentechde/Somon-Script/commit/38f899aa87845135870ac1be46ef9784385071d2))
* implement template literals with comprehensive interpolation support ([3a949c4](https://github.com/lindentechde/Somon-Script/commit/3a949c497d810f72dcff0076e590d83b2ff9731e))
* **module-system:** enforce CJS; add --force for ESM/UMD; config support ([cd65a0d](https://github.com/lindentechde/Somon-Script/commit/cd65a0d1cb7325092f11b4d9b9d0b01e6721f358))
* new version 0.3.12 ([fbcdb05](https://github.com/lindentechde/Somon-Script/commit/fbcdb05e1d891b37d4fd6099fb45c82067e80db3))
* **parser:** handle unique keyword ([e7535e3](https://github.com/lindentechde/Somon-Script/commit/e7535e35ffe5a4b769d0df8daab71071c1d500d0))
* significantly improve test coverage with comprehensive test suites ([e76ab77](https://github.com/lindentechde/Somon-Script/commit/e76ab77498a95f379eca5a4ba316ccae0174eea0))
* support compile-on-save and output directories ([a37b599](https://github.com/lindentechde/Somon-Script/commit/a37b5992c47ddf0dc2381ad602d056feec70fce0))
* update audit report and parser to support array types; add new example for tuple arrays ([d5fb398](https://github.com/lindentechde/Somon-Script/commit/d5fb3985d34b7d4cb43249ca9f1f3f2503ac93da))
* update audit report timestamp and enhance error handling in student management system ([aa87534](https://github.com/lindentechde/Somon-Script/commit/aa875342d407f814e01358fb3c75dfa8951c607f))
* update audit report with new data and enhance inheritance examples in tests ([7268366](https://github.com/lindentechde/Somon-Script/commit/7268366fc8ba6482c1c3a4720d3f1db4ecfb562d))
* update audit report with new data and improve implementation status details ([6d16d78](https://github.com/lindentechde/Somon-Script/commit/6d16d78d3fca80de9bf154003aebe1db65a9e5c5))
* update status to production ready ([ef516db](https://github.com/lindentechde/Somon-Script/commit/ef516dbfc65b6cb9217469fd3592668c34a4c3e9))

### 🐛 Bug Fixes

* add ignore rule for commits containing '[skip ci]' ([87ccbb0](https://github.com/lindentechde/Somon-Script/commit/87ccbb0dac7db11236f379dd15e219cc78874b38))
* Add missing docs:generate script and fix TypeDoc configuration ([5f2eb74](https://github.com/lindentechde/Somon-Script/commit/5f2eb744b9fc13c8c4337b38ac0ce582313741d0))
* add Node.js 23.x compatibility for Jest tests ([7c3aded](https://github.com/lindentechde/Somon-Script/commit/7c3aded227c62db39db37ce5607268f5cac119bb))
* adjust performance regression test threshold ([6ed422f](https://github.com/lindentechde/Somon-Script/commit/6ed422f10b6cb9c6da80b832e6cce36abea51ae3))
* Apply final Prettier formatting to lexer.ts ([0ad7728](https://github.com/lindentechde/Somon-Script/commit/0ad7728aa129b44cbe0f405819031939e3e6b3d5))
* Clean up ESLint configuration and unused imports ([6bd4c26](https://github.com/lindentechde/Somon-Script/commit/6bd4c26b76088a1264bd0ec1a22b16a87c9b9cb5))
* Complete Phase 2 and Phase 3 functionality ([2e39dab](https://github.com/lindentechde/Somon-Script/commit/2e39dab9296033d6cbe3dcbb25c1d6cdd5cd7b80))
* correct version number in changelog from 1.0.0 to 0.3.15 ([0b4158c](https://github.com/lindentechde/Somon-Script/commit/0b4158c7a342f1975e878bc97b74495a72be7206))
* disable eslint complexity rule for generateExpression method ([a6ad7ec](https://github.com/lindentechde/Somon-Script/commit/a6ad7ecbf6e4f0f6986452c4c39f429e7a6a59cf))
* eliminate all 'as any' type assertions for improved type safety ([27f591b](https://github.com/lindentechde/Somon-Script/commit/27f591b4555f33a620e1b57344d42c2060b2e2f5))
* exclude additional infrastructure components from coverage metrics ([37775bf](https://github.com/lindentechde/Somon-Script/commit/37775bf38f81d325d19631a37a860b45a4738f6b))
* fixed author ([4f95ba6](https://github.com/lindentechde/Somon-Script/commit/4f95ba624e5fce9909d32230fb4b0575e0c9428f))
* **jest:** remove deprecated ts-jest isolatedModules option ([8828585](https://github.com/lindentechde/Somon-Script/commit/882858571ef13bf648b0d7dff9660c14df279cef))
* make CLI integration tests work across different environments by using dynamic repo root path ([7a967f9](https://github.com/lindentechde/Somon-Script/commit/7a967f92bfafd64ab59c5e1d62dc850a326e3176))
* make performance regression test CI-aware ([89dda69](https://github.com/lindentechde/Somon-Script/commit/89dda697cd47f78a59f1f1dee660f424b4d6ea58))
* **pre-commit:** build CLI before example audit ([b3f4f11](https://github.com/lindentechde/Somon-Script/commit/b3f4f110051b7e21ae3a18326d4d01a66477202f))
* prevent CLI exit codes from leaking between tests and failing Jest process ([22b1e97](https://github.com/lindentechde/Somon-Script/commit/22b1e976152af442b89575e87c4838ec2ffe0347))
* prevent Jest hanging by disabling file watchers in test environment ([a888d68](https://github.com/lindentechde/Somon-Script/commit/a888d685448fdd183166084fe3282ed09c97c2c7))
* reduce generateExpression complexity below threshold ([6045243](https://github.com/lindentechde/Somon-Script/commit/6045243dd3f833c66af56f0b2cb7dbe99ddced3a))
* refactor config loading in program.ts ([3867056](https://github.com/lindentechde/Somon-Script/commit/3867056ceed84aac1d694fab2b8c1047dd77ee82))
* replace shell rm -rf with cross-platform Node.js solution ([b74cdb7](https://github.com/lindentechde/Somon-Script/commit/b74cdb71567d040dad7efde10174f236b1383e11))
* Resolve all ESLint errors and warnings in CI ([cee446d](https://github.com/lindentechde/Somon-Script/commit/cee446d21637fc57eb625ac40079ba2e1efd0c94))
* resolve ci failures and improve test coverage ([3d8fb80](https://github.com/lindentechde/Somon-Script/commit/3d8fb80b1886a4d1e2074b5bbb315e314d2cc906))
* resolve CI race condition in test:ci script ([7b7ec77](https://github.com/lindentechde/Somon-Script/commit/7b7ec77783091cb16dea57313998655ea1d0407e))
* resolve CommonJS bundler require path mapping to prevent module not found errors ([7fd44d5](https://github.com/lindentechde/Somon-Script/commit/7fd44d54627b7eede6fbff77a5931ec682aa784e))
* resolve dependency graph specifiers to absolute paths for accurate analysis ([0b57211](https://github.com/lindentechde/Somon-Script/commit/0b5721189acc4bbf8361c9bf4f0ec8215e97f59e))
* Resolve ESLint errors and format production modules ([89c0d18](https://github.com/lindentechde/Somon-Script/commit/89c0d18b15866d9e19a3055a664d1c38ed2c3059))
* Resolve example-audit-report.json formatting issues ([a14ad47](https://github.com/lindentechde/Somon-Script/commit/a14ad47418908b9d59f9e9ab7f1f26b08c5b1f58))
* Resolve failing tests and format issues ([66d49b9](https://github.com/lindentechde/Somon-Script/commit/66d49b9544b9151fdfe08c0b1c106928089012cb))
* Resolve GitHub Actions CI/CD failures ([dc82c1f](https://github.com/lindentechde/Somon-Script/commit/dc82c1f13e93beda24ea11b5d7900995bf607e35))
* resolve interface method signature parsing issue ([c205ee1](https://github.com/lindentechde/Somon-Script/commit/c205ee13a1cb1c785aa0c3867e55e9829198f829))
* simplify error handling in loadCompiler function ([7baa24b](https://github.com/lindentechde/Somon-Script/commit/7baa24be2c03184c24c8031292451f0cf95fa6e3))
* template literal interpolation with proper expression parsing ([43f82dc](https://github.com/lindentechde/Somon-Script/commit/43f82dc48d727a9dad9ea3dc9a6c91d5caf35e99))
* update audit report and improve error handling in student management system ([ea25d67](https://github.com/lindentechde/Somon-Script/commit/ea25d67599ee02f8fc0c186cfb5f4e9f1b3b6ef7))
* update examples validation script to use correct output directory ([c48e54e](https://github.com/lindentechde/Somon-Script/commit/c48e54e662694cd58a36f8bf242637e7cf108328))
* update Node.js version requirements and streamline validation ([be35c45](https://github.com/lindentechde/Somon-Script/commit/be35c45786917cddcf9b5b580d28fdf301c75792))
* update pull request permissions to allow posting comments ([1ddeb53](https://github.com/lindentechde/Somon-Script/commit/1ddeb53ea01fe0a28792da62d6fa31302427724e))
* update references from Somoni-script to SomonScript across documentation and code ([981c9ca](https://github.com/lindentechde/Somon-Script/commit/981c9ca57b9362e9913cc283d1367889abceb2a5))
* update timestamp and working status in example audit report ([81c4820](https://github.com/lindentechde/Somon-Script/commit/81c4820fba1b28d207368c18008d719f442bef55))
* update timestamp in example-audit-report.json ([8493d6c](https://github.com/lindentechde/Somon-Script/commit/8493d6c34dd68810f783d8b78f241c6a4ddc626a))
* update timestamp in example-audit-report.json ([a6ee7eb](https://github.com/lindentechde/Somon-Script/commit/a6ee7eb87c28faabf39b85a4beb72fcac342ab41))
* update timestamp in example-audit-report.json and add NPM token to semantic-release workflow ([4022f7d](https://github.com/lindentechde/Somon-Script/commit/4022f7d9de592524af3c37f46f4b41d563c476c3))
* update timestamp in example-audit-report.json and refactor compiler loading logic in program.ts ([3bf9a44](https://github.com/lindentechde/Somon-Script/commit/3bf9a444b0baa8cfda93e3a61c2f418a9b7fb7ce))
* update version badge to 0.2.92 in README.md ([e415ce0](https://github.com/lindentechde/Somon-Script/commit/e415ce02aea59b595b38eaa4e91654cde4585b99))
* update version badge to use npm link in README.md ([47300c1](https://github.com/lindentechde/Somon-Script/commit/47300c18e748e3e0eeb71110877de4b6b948dc46))
* update version to 0.3.15 in package.json and package-lock.json ([b783daa](https://github.com/lindentechde/Somon-Script/commit/b783daa7b76611d6729db1577af2ca1b2ad3b55f))

### 📚 Documentation

* add accurate current status assessment ([6d1cbb5](https://github.com/lindentechde/Somon-Script/commit/6d1cbb560842e9c1391093462931605340995be4))
* add comprehensive documentation following Diátaxis framework ([587c089](https://github.com/lindentechde/Somon-Script/commit/587c089e13fd4626993cb7e2ac82903e1dfb8fee))
* cleanup redundant documentation and update status accuracy ([9594407](https://github.com/lindentechde/Somon-Script/commit/9594407a41c2302073b35eb3dc5d2307f9471852))
* complete comprehensive documentation restructure with diátaxis framework ([62136c1](https://github.com/lindentechde/Somon-Script/commit/62136c172d0cc198995d2877b9aafbcb63257bba))
* enhance README with comprehensive details on language benefits and enterprise partnership ([71df1fa](https://github.com/lindentechde/Somon-Script/commit/71df1fa86f8b2ef083bab067c36d2fcb1b86a45c))
* improve formatting and clarity in status documentation ([b31784c](https://github.com/lindentechde/Somon-Script/commit/b31784c032a535896374239f606097cab4cb65f7))
* reorganize phase documentation ([464c922](https://github.com/lindentechde/Somon-Script/commit/464c9227d62535790c5de56a8fbe1ce5dfd2fe21))
* sync version badge ([ae86371](https://github.com/lindentechde/Somon-Script/commit/ae863715d75861ede0abea9b83a083822c413cd6))
* Update accurate phase completion status ([4379af4](https://github.com/lindentechde/Somon-Script/commit/4379af453dadd5231ceb79b445f7b845a5357de9))
* update implementation status and audit report for accuracy ([2cc0ab9](https://github.com/lindentechde/Somon-Script/commit/2cc0ab91eeddb49b85dd2401cdebf2f35a7f12c8))
* update progress status and ci improvements ([3454ca3](https://github.com/lindentechde/Somon-Script/commit/3454ca3a6fee7de314d45ddc3a06838ad3f9f62d))
* Update README to reflect Phase 1 completion ([cf1f457](https://github.com/lindentechde/Somon-Script/commit/cf1f457cb18775c08a22877ab832e3d319f32f56))
* update README with accurate project status and remove enterprise terminology ([948ab76](https://github.com/lindentechde/Somon-Script/commit/948ab765a43693db2bb3d68520e55c045180cf36))
* Update README with completed Phase 2 OOP features ([576f345](https://github.com/lindentechde/Somon-Script/commit/576f34585793d4cbf60a6e7e21983ff602319709))
* Update status to reflect completed Phase 2 and 3 ([c506678](https://github.com/lindentechde/Somon-Script/commit/c5066780503ac29a8a2f52e870daaaf8cbcd7684))
* Updates readme ([6b2813e](https://github.com/lindentechde/Somon-Script/commit/6b2813ed554be735f7562b5a9bc42495235d9e0a))
* Updates readme ([d1bc7b4](https://github.com/lindentechde/Somon-Script/commit/d1bc7b4b91455c1b984001de131f1c15268aea21))

### 💎 Code Style

* fix formatting in cli-program.test.ts ([2ef1c24](https://github.com/lindentechde/Somon-Script/commit/2ef1c24e38d8afc1f386772f8566ed7915c86616))

### ♻️ Code Refactoring

* fix all ESLint errors and enhance documentation ([2f7cb63](https://github.com/lindentechde/Somon-Script/commit/2f7cb63b01fee09312c0b3b48e7a20e72c54a1a3))
* **handlers:** clarify handler api ([22af335](https://github.com/lindentechde/Somon-Script/commit/22af335aa9142b4d142f32d0b5470be8e16d1177))
* improve type safety by replacing 'any' with 'unknown' in various interfaces and functions ([1a91801](https://github.com/lindentechde/Somon-Script/commit/1a91801966f7739dbe2ab111648f9afcfb69ffbd))
* **parser:** modularize statement handlers ([2c38171](https://github.com/lindentechde/Somon-Script/commit/2c381710d6938f29b240ce844723f1aa49788883))
* reduce method complexity below threshold ([67b81b0](https://github.com/lindentechde/Somon-Script/commit/67b81b00d03ae20daed3b815c5efd42b457abe82))
* remove security audit steps from pull request validation and release process documentation ([4cc1f48](https://github.com/lindentechde/Somon-Script/commit/4cc1f48e74309187bb90cff7fe4d9e120cd4dd73))
* replace process.exit with exitCode and extract CLI program to separate module ([6cf8f94](https://github.com/lindentechde/Somon-Script/commit/6cf8f94c2547be94ad68561cfe2149c6333eafbe))
* simplify parser and type checker; docs: add migration guide ([34a58f9](https://github.com/lindentechde/Somon-Script/commit/34a58f9baa96f112659e5d69f2cc44bd3e83f4f2))
* update manual release workflow and improve semantic release documentation ([7a38c04](https://github.com/lindentechde/Somon-Script/commit/7a38c046f8c4d1e0af8e4ecdc70aa93b60d7be1b))

## [0.3.16](https://github.com/lindentechde/Somon-Script/compare/v0.3.15...v0.3.16) (2025-09-18)

### 🐛 Bug Fixes

* fixed author ([4f95ba6](https://github.com/lindentechde/Somon-Script/commit/4f95ba624e5fce9909d32230fb4b0575e0c9428f))

## 0.3.15 (2025-09-18)

### ✨ Features

* Achieve Grade A architecture with major improvements ([421cfda](https://github.com/lindentechde/Somon-Script/commit/421cfdab8c259bafaf3c2ec852506bda3f06b584))
* Add CI/CD pipeline and Phase 2 foundations ([62ed2e5](https://github.com/lindentechde/Somon-Script/commit/62ed2e5ea52cfec61ddbac88a4207e963e451d76))
* add CLI program module and update package dependencies ([c731fbd](https://github.com/lindentechde/Somon-Script/commit/c731fbdf62947ce5dfcd30dbcbf63d9af5eeea84))
* add commonjs module system support ([a860c55](https://github.com/lindentechde/Somon-Script/commit/a860c556b435f3870046a4c241ce65ee59a5225f))
* add comprehensive feature alignment documentation for Somoni-script ([946cce4](https://github.com/lindentechde/Somon-Script/commit/946cce481d9dfc3dbf9435ba37cabd0ede3ca25b))
* add comprehensive next development phases roadmap ([7108285](https://github.com/lindentechde/Somon-Script/commit/71082851ff6dc91c432f5aba986c30c297547f37))
* add comprehensive tests for template literal parsing and error handling ([2a685d8](https://github.com/lindentechde/Somon-Script/commit/2a685d881bb70e6948d5f9697da3c3343d495455))
* add diagnostic codes and snippets ([0ed42bc](https://github.com/lindentechde/Somon-Script/commit/0ed42bc471c5730061480435315a1565b545cc3e))
* add logo PNG image to the project ([be43ab2](https://github.com/lindentechde/Somon-Script/commit/be43ab28ae5b3c4158bd9b2da52352a1d0589882))
* add minification transpilation and source maps ([3be5cc3](https://github.com/lindentechde/Somon-Script/commit/3be5cc31e9b59d4e2126325793f655d01e01581a))
* add multiline array parsing and improve Phase 3 types ([5b50cc7](https://github.com/lindentechde/Somon-Script/commit/5b50cc7746df51f2029bff65bfe09f2649bb7e6f))
* Add production-ready module system infrastructure ([93cabc2](https://github.com/lindentechde/Somon-Script/commit/93cabc2c3375bdad969518587aa1a049c2f72173))
* add support for arrow token in lexer and token types ([0bd6e3e](https://github.com/lindentechde/Somon-Script/commit/0bd6e3e41a295e97824118650f61cd32ccd552ec))
* add support for ImportNamespaceSpecifier and enhance module loading with externals handling ([e7c1149](https://github.com/lindentechde/Somon-Script/commit/e7c11498d6bd5f688dd2d90011f97cc08f5633a5))
* complete module system and async programming implementation ([0db4999](https://github.com/lindentechde/Somon-Script/commit/0db49993eef3577545f80f5bb7a9f3853c2ac0a8))
* Complete Phase 1 - Core Type System implementation ([9cff478](https://github.com/lindentechde/Somon-Script/commit/9cff478e190df4e14d7475b0a0d94997b4e50811))
* Complete Phase 4 - Technical Debt Resolution & Foundation Strengthening ([2e48ed8](https://github.com/lindentechde/Somon-Script/commit/2e48ed8ccded76c2ad4d504d19180016ac44c245))
* complete phase 4 with major language improvements ([d506a6c](https://github.com/lindentechde/Somon-Script/commit/d506a6c9a89e78fc1f7e67ec090689a7bf99517d))
* eliminate all 'as any' type assertions for improved type safety ([6a3cc23](https://github.com/lindentechde/Somon-Script/commit/6a3cc23a5446b51dfa59111256117a891391eaa5))
* enhance config file support and fix watch mode ([5b15a3e](https://github.com/lindentechde/Somon-Script/commit/5b15a3e01bbd2e8f0b8146cdb370274587d0e049))
* enhance module system with cache management, memory tracking, and validation for module IDs ([0685a3a](https://github.com/lindentechde/Somon-Script/commit/0685a3a72a125fd41ee7a419e6e0cccaba36211d))
* enhance pre-commit hook to format package files after version increment ([e3ee403](https://github.com/lindentechde/Somon-Script/commit/e3ee403fdd2931dc906d60cdc4b26540f878a703))
* enhance type safety by refining ESLint rules and updating test assertions ([5b29004](https://github.com/lindentechde/Somon-Script/commit/5b2900492b68a6d28379ed20f39383c4ebe3b571))
* enhance type safety by using PluginItem type for Babel presets in module system and compiler ([b19ea5f](https://github.com/lindentechde/Somon-Script/commit/b19ea5ffe012c553f32ebe62742523a940a5af33))
* extend Node.js version matrix in CI configuration to include newer versions ([8433830](https://github.com/lindentechde/Somon-Script/commit/84338303b5a112043d064b60e9ce6a38b32fc0f9))
* implement application layer with clean architecture and use case orchestration ([56483ee](https://github.com/lindentechde/Somon-Script/commit/56483ee6eb3462637353986f3e5f4694af4c22e8))
* implement automatic version incrementing and update package version to 0.2.1 ([8210ede](https://github.com/lindentechde/Somon-Script/commit/8210edeb8ec7e311ff5df44b2f13dce4eba6d2fa))
* implement comprehensive module system with bundling and CLI integration ([d8e383a](https://github.com/lindentechde/Somon-Script/commit/d8e383acdaeda39615c3dc5fe9848dbcb8953e24))
* implement comprehensive operator support and enhance lexer and parser functionality ([217c502](https://github.com/lindentechde/Somon-Script/commit/217c5025c4437559dfedb5d8f05ab995531f596c))
* implement for loops and increment operators ([886e298](https://github.com/lindentechde/Somon-Script/commit/886e29825a7d5ed0e99704225e323eb44e457b6c))
* Implement Phase 2 Object-Oriented Programming ([60fc567](https://github.com/lindentechde/Somon-Script/commit/60fc567d9fe5594b23ab49de1bbeda16ff15210c))
* Implement Phase 3 Advanced Type System ([5d11108](https://github.com/lindentechde/Somon-Script/commit/5d1110819fb2369baff356471bc02018bfcfdc4b))
* implement PR validation workflow and docs ([38f899a](https://github.com/lindentechde/Somon-Script/commit/38f899aa87845135870ac1be46ef9784385071d2))
* implement template literals with comprehensive interpolation support ([3a949c4](https://github.com/lindentechde/Somon-Script/commit/3a949c497d810f72dcff0076e590d83b2ff9731e))
* **module-system:** enforce CJS; add --force for ESM/UMD; config support ([cd65a0d](https://github.com/lindentechde/Somon-Script/commit/cd65a0d1cb7325092f11b4d9b9d0b01e6721f358))
* new version 0.3.12 ([fbcdb05](https://github.com/lindentechde/Somon-Script/commit/fbcdb05e1d891b37d4fd6099fb45c82067e80db3))
* **parser:** handle unique keyword ([e7535e3](https://github.com/lindentechde/Somon-Script/commit/e7535e35ffe5a4b769d0df8daab71071c1d500d0))
* significantly improve test coverage with comprehensive test suites ([e76ab77](https://github.com/lindentechde/Somon-Script/commit/e76ab77498a95f379eca5a4ba316ccae0174eea0))
* support compile-on-save and output directories ([a37b599](https://github.com/lindentechde/Somon-Script/commit/a37b5992c47ddf0dc2381ad602d056feec70fce0))
* update audit report and parser to support array types; add new example for tuple arrays ([d5fb398](https://github.com/lindentechde/Somon-Script/commit/d5fb3985d34b7d4cb43249ca9f1f3f2503ac93da))
* update audit report timestamp and enhance error handling in student management system ([aa87534](https://github.com/lindentechde/Somon-Script/commit/aa875342d407f814e01358fb3c75dfa8951c607f))
* update audit report with new data and enhance inheritance examples in tests ([7268366](https://github.com/lindentechde/Somon-Script/commit/7268366fc8ba6482c1c3a4720d3f1db4ecfb562d))
* update audit report with new data and improve implementation status details ([6d16d78](https://github.com/lindentechde/Somon-Script/commit/6d16d78d3fca80de9bf154003aebe1db65a9e5c5))
* update status to production ready ([ef516db](https://github.com/lindentechde/Somon-Script/commit/ef516dbfc65b6cb9217469fd3592668c34a4c3e9))

### 🐛 Bug Fixes

* add ignore rule for commits containing '[skip ci]' ([87ccbb0](https://github.com/lindentechde/Somon-Script/commit/87ccbb0dac7db11236f379dd15e219cc78874b38))
* Add missing docs:generate script and fix TypeDoc configuration ([5f2eb74](https://github.com/lindentechde/Somon-Script/commit/5f2eb744b9fc13c8c4337b38ac0ce582313741d0))
* add Node.js 23.x compatibility for Jest tests ([7c3aded](https://github.com/lindentechde/Somon-Script/commit/7c3aded227c62db39db37ce5607268f5cac119bb))
* adjust performance regression test threshold ([6ed422f](https://github.com/lindentechde/Somon-Script/commit/6ed422f10b6cb9c6da80b832e6cce36abea51ae3))
* Apply final Prettier formatting to lexer.ts ([0ad7728](https://github.com/lindentechde/Somon-Script/commit/0ad7728aa129b44cbe0f405819031939e3e6b3d5))
* Clean up ESLint configuration and unused imports ([6bd4c26](https://github.com/lindentechde/Somon-Script/commit/6bd4c26b76088a1264bd0ec1a22b16a87c9b9cb5))
* Complete Phase 2 and Phase 3 functionality ([2e39dab](https://github.com/lindentechde/Somon-Script/commit/2e39dab9296033d6cbe3dcbb25c1d6cdd5cd7b80))
* disable eslint complexity rule for generateExpression method ([a6ad7ec](https://github.com/lindentechde/Somon-Script/commit/a6ad7ecbf6e4f0f6986452c4c39f429e7a6a59cf))
* eliminate all 'as any' type assertions for improved type safety ([27f591b](https://github.com/lindentechde/Somon-Script/commit/27f591b4555f33a620e1b57344d42c2060b2e2f5))
* exclude additional infrastructure components from coverage metrics ([37775bf](https://github.com/lindentechde/Somon-Script/commit/37775bf38f81d325d19631a37a860b45a4738f6b))
* **jest:** remove deprecated ts-jest isolatedModules option ([8828585](https://github.com/lindentechde/Somon-Script/commit/882858571ef13bf648b0d7dff9660c14df279cef))
* make CLI integration tests work across different environments by using dynamic repo root path ([7a967f9](https://github.com/lindentechde/Somon-Script/commit/7a967f92bfafd64ab59c5e1d62dc850a326e3176))
* make performance regression test CI-aware ([89dda69](https://github.com/lindentechde/Somon-Script/commit/89dda697cd47f78a59f1f1dee660f424b4d6ea58))
* **pre-commit:** build CLI before example audit ([b3f4f11](https://github.com/lindentechde/Somon-Script/commit/b3f4f110051b7e21ae3a18326d4d01a66477202f))
* prevent CLI exit codes from leaking between tests and failing Jest process ([22b1e97](https://github.com/lindentechde/Somon-Script/commit/22b1e976152af442b89575e87c4838ec2ffe0347))
* prevent Jest hanging by disabling file watchers in test environment ([a888d68](https://github.com/lindentechde/Somon-Script/commit/a888d685448fdd183166084fe3282ed09c97c2c7))
* reduce generateExpression complexity below threshold ([6045243](https://github.com/lindentechde/Somon-Script/commit/6045243dd3f833c66af56f0b2cb7dbe99ddced3a))
* refactor config loading in program.ts ([3867056](https://github.com/lindentechde/Somon-Script/commit/3867056ceed84aac1d694fab2b8c1047dd77ee82))
* replace shell rm -rf with cross-platform Node.js solution ([b74cdb7](https://github.com/lindentechde/Somon-Script/commit/b74cdb71567d040dad7efde10174f236b1383e11))
* Resolve all ESLint errors and warnings in CI ([cee446d](https://github.com/lindentechde/Somon-Script/commit/cee446d21637fc57eb625ac40079ba2e1efd0c94))
* resolve ci failures and improve test coverage ([3d8fb80](https://github.com/lindentechde/Somon-Script/commit/3d8fb80b1886a4d1e2074b5bbb315e314d2cc906))
* resolve CI race condition in test:ci script ([7b7ec77](https://github.com/lindentechde/Somon-Script/commit/7b7ec77783091cb16dea57313998655ea1d0407e))
* resolve CommonJS bundler require path mapping to prevent module not found errors ([7fd44d5](https://github.com/lindentechde/Somon-Script/commit/7fd44d54627b7eede6fbff77a5931ec682aa784e))
* resolve dependency graph specifiers to absolute paths for accurate analysis ([0b57211](https://github.com/lindentechde/Somon-Script/commit/0b5721189acc4bbf8361c9bf4f0ec8215e97f59e))
* Resolve ESLint errors and format production modules ([89c0d18](https://github.com/lindentechde/Somon-Script/commit/89c0d18b15866d9e19a3055a664d1c38ed2c3059))
* Resolve example-audit-report.json formatting issues ([a14ad47](https://github.com/lindentechde/Somon-Script/commit/a14ad47418908b9d59f9e9ab7f1f26b08c5b1f58))
* Resolve failing tests and format issues ([66d49b9](https://github.com/lindentechde/Somon-Script/commit/66d49b9544b9151fdfe08c0b1c106928089012cb))
* Resolve GitHub Actions CI/CD failures ([dc82c1f](https://github.com/lindentechde/Somon-Script/commit/dc82c1f13e93beda24ea11b5d7900995bf607e35))
* resolve interface method signature parsing issue ([c205ee1](https://github.com/lindentechde/Somon-Script/commit/c205ee13a1cb1c785aa0c3867e55e9829198f829))
* simplify error handling in loadCompiler function ([7baa24b](https://github.com/lindentechde/Somon-Script/commit/7baa24be2c03184c24c8031292451f0cf95fa6e3))
* template literal interpolation with proper expression parsing ([43f82dc](https://github.com/lindentechde/Somon-Script/commit/43f82dc48d727a9dad9ea3dc9a6c91d5caf35e99))
* update audit report and improve error handling in student management system ([ea25d67](https://github.com/lindentechde/Somon-Script/commit/ea25d67599ee02f8fc0c186cfb5f4e9f1b3b6ef7))
* update examples validation script to use correct output directory ([c48e54e](https://github.com/lindentechde/Somon-Script/commit/c48e54e662694cd58a36f8bf242637e7cf108328))
* update Node.js version requirements and streamline validation ([be35c45](https://github.com/lindentechde/Somon-Script/commit/be35c45786917cddcf9b5b580d28fdf301c75792))
* update pull request permissions to allow posting comments ([1ddeb53](https://github.com/lindentechde/Somon-Script/commit/1ddeb53ea01fe0a28792da62d6fa31302427724e))
* update references from Somoni-script to SomonScript across documentation and code ([981c9ca](https://github.com/lindentechde/Somon-Script/commit/981c9ca57b9362e9913cc283d1367889abceb2a5))
* update timestamp and working status in example audit report ([81c4820](https://github.com/lindentechde/Somon-Script/commit/81c4820fba1b28d207368c18008d719f442bef55))
* update timestamp in example-audit-report.json ([8493d6c](https://github.com/lindentechde/Somon-Script/commit/8493d6c34dd68810f783d8b78f241c6a4ddc626a))
* update timestamp in example-audit-report.json ([a6ee7eb](https://github.com/lindentechde/Somon-Script/commit/a6ee7eb87c28faabf39b85a4beb72fcac342ab41))
* update timestamp in example-audit-report.json and add NPM token to semantic-release workflow ([4022f7d](https://github.com/lindentechde/Somon-Script/commit/4022f7d9de592524af3c37f46f4b41d563c476c3))
* update timestamp in example-audit-report.json and refactor compiler loading logic in program.ts ([3bf9a44](https://github.com/lindentechde/Somon-Script/commit/3bf9a444b0baa8cfda93e3a61c2f418a9b7fb7ce))
* update version badge to 0.2.92 in README.md ([e415ce0](https://github.com/lindentechde/Somon-Script/commit/e415ce02aea59b595b38eaa4e91654cde4585b99))
* update version badge to use npm link in README.md ([47300c1](https://github.com/lindentechde/Somon-Script/commit/47300c18e748e3e0eeb71110877de4b6b948dc46))

### 📚 Documentation

* add accurate current status assessment ([6d1cbb5](https://github.com/lindentechde/Somon-Script/commit/6d1cbb560842e9c1391093462931605340995be4))
* add comprehensive documentation following Diátaxis framework ([587c089](https://github.com/lindentechde/Somon-Script/commit/587c089e13fd4626993cb7e2ac82903e1dfb8fee))
* cleanup redundant documentation and update status accuracy ([9594407](https://github.com/lindentechde/Somon-Script/commit/9594407a41c2302073b35eb3dc5d2307f9471852))
* complete comprehensive documentation restructure with diátaxis framework ([62136c1](https://github.com/lindentechde/Somon-Script/commit/62136c172d0cc198995d2877b9aafbcb63257bba))
* enhance README with comprehensive details on language benefits and enterprise partnership ([71df1fa](https://github.com/lindentechde/Somon-Script/commit/71df1fa86f8b2ef083bab067c36d2fcb1b86a45c))
* improve formatting and clarity in status documentation ([b31784c](https://github.com/lindentechde/Somon-Script/commit/b31784c032a535896374239f606097cab4cb65f7))
* reorganize phase documentation ([464c922](https://github.com/lindentechde/Somon-Script/commit/464c9227d62535790c5de56a8fbe1ce5dfd2fe21))
* sync version badge ([ae86371](https://github.com/lindentechde/Somon-Script/commit/ae863715d75861ede0abea9b83a083822c413cd6))
* Update accurate phase completion status ([4379af4](https://github.com/lindentechde/Somon-Script/commit/4379af453dadd5231ceb79b445f7b845a5357de9))
* update implementation status and audit report for accuracy ([2cc0ab9](https://github.com/lindentechde/Somon-Script/commit/2cc0ab91eeddb49b85dd2401cdebf2f35a7f12c8))
* update progress status and ci improvements ([3454ca3](https://github.com/lindentechde/Somon-Script/commit/3454ca3a6fee7de314d45ddc3a06838ad3f9f62d))
* Update README to reflect Phase 1 completion ([cf1f457](https://github.com/lindentechde/Somon-Script/commit/cf1f457cb18775c08a22877ab832e3d319f32f56))
* update README with accurate project status and remove enterprise terminology ([948ab76](https://github.com/lindentechde/Somon-Script/commit/948ab765a43693db2bb3d68520e55c045180cf36))
* Update README with completed Phase 2 OOP features ([576f345](https://github.com/lindentechde/Somon-Script/commit/576f34585793d4cbf60a6e7e21983ff602319709))
* Update status to reflect completed Phase 2 and 3 ([c506678](https://github.com/lindentechde/Somon-Script/commit/c5066780503ac29a8a2f52e870daaaf8cbcd7684))
* Updates readme ([6b2813e](https://github.com/lindentechde/Somon-Script/commit/6b2813ed554be735f7562b5a9bc42495235d9e0a))
* Updates readme ([d1bc7b4](https://github.com/lindentechde/Somon-Script/commit/d1bc7b4b91455c1b984001de131f1c15268aea21))

### 💎 Code Style

* fix formatting in cli-program.test.ts ([2ef1c24](https://github.com/lindentechde/Somon-Script/commit/2ef1c24e38d8afc1f386772f8566ed7915c86616))

### ♻️ Code Refactoring

* fix all ESLint errors and enhance documentation ([2f7cb63](https://github.com/lindentechde/Somon-Script/commit/2f7cb63b01fee09312c0b3b48e7a20e72c54a1a3))
* **handlers:** clarify handler api ([22af335](https://github.com/lindentechde/Somon-Script/commit/22af335aa9142b4d142f32d0b5470be8e16d1177))
* improve type safety by replacing 'any' with 'unknown' in various interfaces and functions ([1a91801](https://github.com/lindentechde/Somon-Script/commit/1a91801966f7739dbe2ab111648f9afcfb69ffbd))
* **parser:** modularize statement handlers ([2c38171](https://github.com/lindentechde/Somon-Script/commit/2c381710d6938f29b240ce844723f1aa49788883))
* reduce method complexity below threshold ([67b81b0](https://github.com/lindentechde/Somon-Script/commit/67b81b00d03ae20daed3b815c5efd42b457abe82))
* remove security audit steps from pull request validation and release process documentation ([4cc1f48](https://github.com/lindentechde/Somon-Script/commit/4cc1f48e74309187bb90cff7fe4d9e120cd4dd73))
* replace process.exit with exitCode and extract CLI program to separate module ([6cf8f94](https://github.com/lindentechde/Somon-Script/commit/6cf8f94c2547be94ad68561cfe2149c6333eafbe))
* simplify parser and type checker; docs: add migration guide ([34a58f9](https://github.com/lindentechde/Somon-Script/commit/34a58f9baa96f112659e5d69f2cc44bd3e83f4f2))
* update manual release workflow and improve semantic release documentation ([7a38c04](https://github.com/lindentechde/Somon-Script/commit/7a38c046f8c4d1e0af8e4ecdc70aa93b60d7be1b))
