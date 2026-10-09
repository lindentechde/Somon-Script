# SomonScript LLM Guide

**Comprehensive Reference for Language Models**

This guide provides complete documentation for LLMs working with SomonScript, a
programming language that uses Tajik Cyrillic syntax and compiles to JavaScript.

---

## 📚 Guide Structure

### Core Language

- **[01-overview.md](01-overview.md)** - Introduction, principles, and quick
  start
- **[02-keywords.md](02-keywords.md)** - All language keywords and their
  mappings
- **[03-types.md](03-types.md)** - Type system, operators, and special values

### Built-in Objects

- **[04-console.md](04-console.md)** - Console object (чоп) methods
- **[05-math.md](05-math.md)** - Math object (Риёзӣ) methods
- **[06-array.md](06-array.md)** - Array object (рӯйхат) methods
- **[07-string.md](07-string.md)** - String object (сатр) methods
- **[08-object.md](08-object.md)** - Object methods

### Advanced Features

- **[09-modules.md](09-modules.md)** - Module system (import/export)
- **[10-async.md](10-async.md)** - Async/await and promises
- **[11-classes.md](11-classes.md)** - Object-oriented programming
- **[12-examples.md](12-examples.md)** - Common patterns and examples
- **[13-map-set.md](13-map-set.md)** - Map and Set (`дорадКалид`, not `дорад`)
- **[14-operators.md](14-operators.md)** - Every TypeScript operator and
  statement in SomonScript
- **[15-type-checking.md](15-type-checking.md)** - The SomonScript and
  TypeScript checkers, `somon check`, declarations and ES module output
- **[16-targets.md](16-targets.md)** - JavaScript targets (ES5 … ESNext), what
  gets lowered, `lib`, class fields, bundle formats and browser use
- **[17-tools.md](17-tools.md)** - Formatter (`somon fmt`), REPL (`somon repl`)
  and TypeScript migration (`somon migrate`)

---

## 🚀 Quick Reference

**File Extension**: `.som`  
**Compilation**: SomonScript → JavaScript → Node.js/Browser

### Essential Mappings

```som
// Variables
тағ x = 10;              // let x = 10;
собит ПИ = 3.14;         // const PI = 3.14;

// Functions
функсия ҷамъ(а, б) {     // function sum(a, b) {
    бозгашт а + б;       //     return a + b;
}                        // }

// Console
чоп.сабт("Салом");       // console.log("Hello");

// Conditionals
агар (х > 0) {           // if (x > 0) {
    // ...
} вагарна {              // } else {
    // ...
}                        // }

// Loops
барои (тағ і = 0; і < 10; і++) {  // for (let i = 0; i < 10; i++) {
    чоп.сабт(і);                  //     console.log(i);
}                                  // }

// Classes
синф Корбар {            // class User {
    конструктор(ном) {   //     constructor(name) {
        ин.ном = ном;    //         this.name = name;
    }                    //     }
}                        // }
```

---

## 🎯 Key Principles for LLMs

### 1. One-to-One Keyword Mapping

Each Tajik keyword maps to exactly one JavaScript/TypeScript construct.

### 2. Built-in Method Name Translation

Built-in method/property names translate on built-in objects. Avoid them as
names of your own properties and methods, because the compiler cannot always
tell a user object from a built-in one:

- `рақамҳо.дарозӣ` → `рақамҳо.length` ✅

### 3. Type Safety

Full TypeScript-compatible type system with interfaces, generics, and type
inference.

### 4. Module System

ES6+ import/export with automatic `.som` → `.js` extension handling.

### 5. Boolean Literals

- ✅ `дуруст` → `true`
- ✅ `нодуруст` → `false`
- ❌ NOT `рост` (this is incorrect!)

---

## 📖 How to Use This Guide

### For Code Generation

1. Read [01-overview.md](01-overview.md) for basic principles
2. Reference [02-keywords.md](02-keywords.md) for syntax mappings
3. Check specific built-in object files (04-08) for API translations
4. Review [12-examples.md](12-examples.md) for common patterns

### For Code Understanding

1. Use keyword mappings to translate Tajik → JavaScript
2. Recognize built-in objects (чоп, Риёзӣ, рӯйхат, сатр, объект)
3. Translate built-in method names on built-in objects
4. Preserve user-defined variable/method names

### For Code Translation

1. **JavaScript → SomonScript**: Use reverse mappings from keyword tables
2. **SomonScript → JavaScript**: Follow mappings exactly as specified
3. **Preserve semantics**: Ensure functional equivalence after translation

---

## 🔍 Quick Lookup

### Most Common Mappings

| Category | Tajik      | JavaScript |
| -------- | ---------- | ---------- |
| Variable | `тағ`      | `let`      |
| Constant | `собит`    | `const`    |
| Function | `функсия`  | `function` |
| Return   | `бозгашт`  | `return`   |
| If       | `агар`     | `if`       |
| Else     | `вагарна`  | `else`     |
| For      | `барои`    | `for`      |
| While    | `то`       | `while`    |
| Class    | `синф`     | `class`    |
| This     | `ин`       | `this`     |
| Import   | `ворид`    | `import`   |
| Export   | `содир`    | `export`   |
| Async    | `ҳамзамон` | `async`    |
| Await    | `интизор`  | `await`    |
| True     | `дуруст`   | `true`     |
| False    | `нодуруст` | `false`    |
| Console  | `чоп`      | `console`  |
| Math     | `Риёзӣ`    | `Math`     |

---

## 💡 Important Notes

1. **Preserve User Names**: Don't translate user-defined variable, function, or
   class names
2. **Built-in Names Are Reserved**: Don't reuse built-in method names (e.g.
   `дарозӣ`, `сабт`, `илова`) for user properties; they may be translated on
   user objects too
3. **Type Annotations**: Use Tajik type names in type positions (рақам, сатр,
   мантиқӣ)
4. **File Extensions**: `.som` files compile to `.js` with automatic module
   resolution
5. **Interoperability**: Generated JavaScript is fully compatible with existing
   JS/TS code

---

## 📝 Contributing

When adding new mappings or features:

1. Update the appropriate section file (01-12)
2. Add examples to [12-examples.md](12-examples.md)
3. Keep tables formatted for easy parsing by LLMs
4. Include both Tajik → JavaScript and reverse mappings

---

**Last Updated**: Based on SomonScript v0.3.36  
**Source**: [src/keyword-map.ts](../src/keyword-map.ts),
[src/codegen.ts](../src/codegen.ts)
