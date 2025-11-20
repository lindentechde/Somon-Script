# Module System

## Import Syntax

### Named Import

```som
ворид { ҷамъ, тафриқ } аз "./math";
// import { sum, subtract } from "./math.js";
```

### Default Import

```som
ворид ҳисобкунак аз "./calculator";
// import calculator from "./calculator.js";
```

### Namespace Import

```som
ворид * чун MathUtils аз "./math";
// import * as MathUtils from "./math.js";
```

### Mixed Import

```som
ворид ҳисобкунак, { ҷамъ } аз "./math";
// import calculator, { sum } from "./math.js";
```

## Export Syntax

### Named Export

```som
содир функсия ҷамъ(а, б) {
    бозгашт а + б;
}
// export function sum(a, b) { return a + b; }
```

### Default Export

```som
содир пешфарз функсия ҳисобкунак() { }
// export default function calculator() { }
```

### Export List

```som
содир { ҷамъ, тафриқ };
// export { sum, subtract };
```

### Re-export

```som
содир { ҷамъ } аз "./operations";
// export { sum } from "./operations.js";
```

### Re-export All

```som
содир * аз "./operations";
// export * from "./operations.js";
```

## File Extension Handling

**Automatic**: `.som` → `.js` during compilation

```som
ворид { func } аз "./module.som";    // Resolves to ./module.js
ворид { func } аз "./module";        // Resolves to ./module.js
```
