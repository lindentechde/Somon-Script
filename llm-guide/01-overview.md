# Overview

**SomonScript Language Fundamentals**

---

## What is SomonScript?

SomonScript is programming language that:

- Uses **Tajik Cyrillic script** for all syntax
- Compiles to **JavaScript**
- Maintains full JavaScript ecosystem compatibility
- Provides complete type safety and modern features
- Targets Node.js and browser environments

---

## File Structure

**File Extension**: `.som`

**Example File Structure**:

```
project/
├── src/
│   ├── main.som          # Entry point
│   ├── utils.som         # Utility module
│   └── models/
│       └── user.som      # User model
└── dist/
    └── main.js           # Compiled output
```

---

## Compilation Process

```
┌─────────────────┐
│  Source (.som)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lexical        │
│  Analysis       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Syntax         │
│  Analysis (AST) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Type Checking  │
│  & Validation   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Code           │
│  Generation     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  JavaScript     │
│  Output (.js)   │
└─────────────────┘
```

---

## Core Principles for LLMs

### 1. **Deterministic Mapping**

Every Tajik keyword has exactly one JavaScript equivalent:

- `тағ` → `let` (always)
- `собит` → `const` (always)
- `функсия` → `function` (always)

### 2. **Context-Aware Translation**

Built-in method names only translate when used with built-in objects:

```som
// Translation occurs - built-in object
тағ рӯйхат = [1, 2, 3];
тағ дарозӣ = рӯйхат.дарозӣ;     // array.length

// No translation - user object
тағ корбар = { дарозӣ: 180 };
чоп.сабт(корбар.дарозӣ);        // user.дарозӣ (preserved)
```

### 3. **Type System Integration**

Full TypeScript compatibility with Tajik type names:

```som
функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}
// function sum(a: number, b: number): number { return a + b; }
```

### 4. **Module System**

ES6+ imports with automatic file extension handling:

```som
ворид { ҷамъ } аз "./math";           // import { sum } from "./math.js";
содир функсия тафриқ(а, б) { ... }   // export function subtract(a, b) { ... }
```

### 5. **Preserve Semantics**

Generated JavaScript must be functionally equivalent to the SomonScript source.

---

## Basic Syntax Examples

### Variables

```som
тағ ном = "Аҳмад";              // let name = "Ahmad";
собит МАКС_СИННУ = 100;         // const MAX_AGE = 100;
тағ синну: рақам = 25;          // let age: number = 25;
```

### Functions

```som
функсия салом(ном: сатр): сатр {
    бозгашт "Салом, " + ном;
}
// function hello(name: string): string {
//     return "Hello, " + name;
// }
```

### Conditionals

```som
агар (синну >= 18) {
    чоп.сабт("Калонсол");
} вагарна {
    чоп.сабт("Хурдсол");
}
// if (age >= 18) {
//     console.log("Adult");
// } else {
//     console.log("Minor");
// }
```

### Loops

```som
барои (тағ і = 0; і < 10; і++) {
    чоп.сабт(і);
}
// for (let i = 0; i < 10; i++) {
//     console.log(i);
// }
```

### Arrays

```som
тағ рақамҳо = [1, 2, 3, 4, 5];
рақамҳо.илова(6);
тағ дугона = рақамҳо.харита(х => х * 2);
// let numbers = [1, 2, 3, 4, 5];
// numbers.push(6);
// let doubled = numbers.map(x => x * 2);
```

### Objects

```som
тағ корбар = {
    ном: "Алӣ",
    синну: 30,
    шаҳр: "Душанбе"
};
// let user = {
//     name: "Ali",
//     age: 30,
//     city: "Dushanbe"
// };
```

---

## Common Patterns

### Console Output

```som
чоп.сабт("Маълумот");           // console.log("Info");
чоп.хато("Хатогӣ");             // console.error("Error");
чоп.огоҳӣ("Огоҳӣ");             // console.warn("Warning");
```

### Math Operations

```som
тағ реша = Риёзӣ.дуръшака(16);        // let sqrt = Math.sqrt(16);
тағ қувват = Риёзӣ.қувват(2, 3);      // let power = Math.pow(2, 3);
тағ тасодуфӣ = Риёзӣ.тасодуфӣ();      // let random = Math.random();
```

### String Operations

```som
тағ матн = "салом";
тағ калон = матн.калон();             // let upper = text.toUpperCase();
тағ дарозӣ = матн.дарозӣ;             // let length = text.length;
```

### Array Operations

```som
тағ рӯйхат = [1, 2, 3];
тағ филтр = рӯйхат.филтр(х => х > 1); // let filtered = list.filter(x => x > 1);
тағ ҷамъ = рӯйхат.ҷамъбаст((а, б) => а + б, 0);
// let sum = list.reduce((a, b) => a + b, 0);
```

---

## CLI Usage

### Compile

```bash
somon compile app.som                    # Compile to JavaScript
somon compile app.som -o dist/app.js     # Specify output
```

### Run

```bash
somon run app.som                        # Compile and execute
```

### Bundle

```bash
somon bundle src/main.som -o dist/bundle.js --minify
```

### Module Info

```bash
somon module-info src/main.som --graph --stats
```

---

## Important Rules for LLMs

### ✅ DO

1. **Preserve user-defined names**

   ```som
   тағ менингНомам = "Алӣ";      // let менингНомам = "Ali"; (preserved!)
   ```

2. **Translate keywords consistently**

   ```som
   тағ → let (always)
   собит → const (always)
   ```

3. **Apply context-sensitive method translation**

   ```som
   рӯйхат.дарозӣ → array.length (built-in)
   объект.дарозӣ → object.дарозӣ (user property)
   ```

4. **Use correct boolean literals**
   ```som
   дуруст → true
   нодуруст → false
   ```

### ❌ DON'T

1. **Don't translate user variables**

   ```som
   // WRONG: тағ дарозӣ = 180; → let length = 180;
   // RIGHT: тағ дарозӣ = 180; → let дарозӣ = 180;
   ```

2. **Don't use incorrect boolean literals**

   ```som
   // WRONG: рост → true
   // RIGHT: дуруст → true
   ```

3. **Don't translate method names outside built-in objects**

   ```som
   // WRONG: корбар.сабт() → user.log()
   // RIGHT: корбар.сабт() → user.сабт() (preserved!)
   ```

4. **Don't assume variable context without checking** Always verify if an
   identifier is a built-in object before translating methods.

---

## Version Information

**Current Version**: 0.3.36  
**JavaScript Target**: ES2020+  
**TypeScript Compatibility**: Full  
**Node.js Support**: 20.x, 22.x, 23.x, 24.x

---

**Next**: [Keywords Reference](02-keywords.md)
