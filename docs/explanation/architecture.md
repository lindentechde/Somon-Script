# SomonScript Architecture Guide

This document explains the system design principles and architectural decisions
behind SomonScript, providing deep insight into how the compiler works and why
it was designed this way.

## Table of Contents

1. [Overview](#overview)
2. [Compiler Architecture](#compiler-architecture)
3. [Language Design Principles](#language-design-principles)
4. [Module System Architecture](#module-system-architecture)
5. [Type System Design](#type-system-design)
6. [Runtime Integration](#runtime-integration)
7. [Performance Considerations](#performance-considerations)
8. [Extensibility](#extensibility)

## Overview

SomonScript is a statically-typed programming language that compiles to
JavaScript, designed specifically for Tajik-speaking developers. The
architecture follows modern compiler design principles while maintaining
simplicity and performance.

### Core Design Goals

1. **Language Localization**: Provide native Tajik Cyrillic syntax without
   compromising functionality
2. **Type Safety**: Advanced static analysis with TypeScript-level type checking
3. **JavaScript Compatibility**: Seamless integration with existing JavaScript
   ecosystem
4. **Developer Experience**: Excellent tooling, clear error messages, and fast
   compilation
5. **Production Ready**: Enterprise-grade reliability and performance

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Source Code   │───▶│     Compiler    │───▶│   JavaScript    │
│   (.som files)  │    │    Pipeline     │    │   Output (.js)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Type System   │
                    │   & Analysis    │
                    └─────────────────┘
```

## Compiler Architecture

SomonScript uses a traditional multi-phase compiler architecture with modern
optimizations and excellent error recovery.

### Phase 1: Lexical Analysis

**Purpose**: Convert source code into a stream of tokens

```typescript
// Input: сатр ном = "Салом";
// Output: [KEYWORD(сатр), IDENTIFIER(ном), ASSIGN(=), STRING("Салом"), SEMICOLON(;)]
```

**Key Components**:

- **Tokenizer**: Handles Tajik Cyrillic characters with Unicode normalization
- **Keyword Recognition**: Maps Tajik keywords to internal representations
- **Error Recovery**: Provides meaningful error messages for invalid characters
- **Position Tracking**: Maintains line/column information for debugging

**Architecture**:

```typescript
class Lexer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (!this.isAtEnd()) {
      tokens.push(this.nextToken());
    }
    return tokens;
  }
}
```

### Phase 2: Syntax Analysis (Parsing)

**Purpose**: Build an Abstract Syntax Tree (AST) from tokens

**Parser Design**:

- **Recursive Descent Parser**: Simple, maintainable, excellent error messages
- **Operator Precedence Parsing**: Handles complex expressions correctly
- **Error Recovery**: Continues parsing after errors to find multiple issues

**AST Node Hierarchy**:

```typescript
abstract class ASTNode {
  position: Position;
  type: NodeType;
}

// Expressions
class BinaryExpression extends ASTNode {
  left: Expression;
  operator: Token;
  right: Expression;
}

// Statements
class VariableDeclaration extends ASTNode {
  identifier: Token;
  typeAnnotation?: TypeAnnotation;
  initializer?: Expression;
}

// Declarations
class FunctionDeclaration extends ASTNode {
  name: Token;
  parameters: Parameter[];
  returnType?: TypeAnnotation;
  body: BlockStatement;
}
```

**Grammar Design**: The grammar follows standard programming language patterns
while accommodating Tajik syntax:

```bnf
program        → declaration* EOF ;
declaration    → classDecl | funDecl | varDecl | statement ;
varDecl        → ( "тағйирёбанда" | "собит" ) IDENTIFIER ( ":" type )? ( "=" expression )? ";" ;
funDecl        → "функсия" IDENTIFIER "(" parameters? ")" ( ":" type )? block ;
statement      → exprStmt | ifStmt | whileStmt | forStmt | returnStmt | blockStmt ;
```

### Phase 3: Semantic Analysis & Type Checking

**Purpose**: Validate semantics and infer/check types

**Type System Architecture**:

```typescript
class TypeChecker {
  private symbolTable: SymbolTable;
  private typeRegistry: TypeRegistry;
  private errors: DiagnosticError[] = [];

  checkProgram(ast: Program): TypedAST {
    this.buildSymbolTable(ast);
    this.resolveTypes(ast);
    this.checkTypes(ast);
    return this.createTypedAST(ast);
  }
}
```

**Symbol Table Design**:

- **Hierarchical Scoping**: Supports nested scopes with proper variable
  resolution
- **Forward References**: Allows functions to reference functions declared later
- **Type Resolution**: Resolves complex types including generics and unions

**Type Inference Engine**:

- **Bidirectional Type Checking**: Inference flows both up and down the AST
- **Constraint Solving**: Handles complex type relationships
- **Union Type Analysis**: Sophisticated handling of union and intersection
  types

### Phase 4: Code Generation

**Purpose**: Generate clean, readable JavaScript code

**Code Generation Strategy**:

```typescript
class CodeGenerator {
  private output: string = '';
  private indentLevel: number = 0;

  generateProgram(typedAST: TypedAST): string {
    this.visitProgram(typedAST);
    return this.output;
  }

  // Maps Tajik constructs to JavaScript equivalents
  private visitVariableDeclaration(node: VariableDeclaration): void {
    const keyword = node.isConstant ? 'const' : 'let';
    this.emit(`${keyword} ${node.identifier.value}`);

    if (node.initializer) {
      this.emit(' = ');
      this.visit(node.initializer);
    }

    this.emit(';');
  }
}
```

**Translation Mapping**:

| Tajik          | JavaScript    | Notes                  |
| -------------- | ------------- | ---------------------- |
| `тағйирёбанда` | `let`         | Mutable variables      |
| `собит`        | `const`       | Immutable bindings     |
| `функсия`      | `function`    | Function declarations  |
| `агар`         | `if`          | Conditional statements |
| `барои`        | `for`         | Loop constructs        |
| `чоп.сабт`     | `console.log` | Built-in functions     |

## Language Design Principles

### 1. Semantic Equivalence

Every SomonScript construct has a clear, direct mapping to JavaScript semantics:

```som
// SomonScript
синф Корбар {
    хосусӣ ном: сатр;

    конструктор(ном: сатр) {
        ин.ном = ном;
    }

    ҷамъиятӣ салом(): сатр {
        бозгашт "Салом, " + ин.ном;
    }
}
```

```javascript
// Generated JavaScript
class Корбар {
  constructor(ном) {
    this.ном = ном;
  }

  салом() {
    return 'Салом, ' + this.ном;
  }
}
```

### 2. Progressive Enhancement

The language supports modern JavaScript features while maintaining
compatibility:

```som
// Modern features work naturally
ҳамзамон функсия маълумот_гирифтан(url: сатр): Promise<сатр> {
    тағйирёбанда ҷавоб = интизор fetch(url);
    бозгашт интизор ҷавоб.text();
}

// Template literals with interpolation
тағйирёбанда паём = `Салом, ${ном}! Шумо ${синну} сола доред.`;
```

### 3. Type Safety First

Strong type checking prevents common runtime errors:

```som
// Union types for safe API design
функсия коркард(маълумот: сатр | рақам): сатр {
    агар typeof маълумот === "сатр" {
        бозгашт маълумот.toUpperCase();
    } вагарна {
        бозгашт маълумот.toString();
    }
}
```

## Module System Architecture

The module system is designed for scalability and maintainability in large
projects.

### Core Components

1. **Module Resolver**: Finds and resolves module paths
2. **Module Loader**: Loads and parses modules
3. **Dependency Graph**: Tracks module relationships
4. **Bundle Generator**: Creates optimized output bundles

### Resolution Algorithm

```typescript
class ModuleResolver {
  resolve(specifier: string, fromFile: string): ResolvedModule {
    // 1. Try exact file match
    if (this.fileExists(specifier + '.som')) {
      return { path: specifier + '.som', format: 'som' };
    }

    // 2. Try directory with index
    if (this.directoryExists(specifier)) {
      const indexPath = path.join(specifier, 'index.som');
      if (this.fileExists(indexPath)) {
        return { path: indexPath, format: 'som' };
      }
    }

    // 3. Try node_modules
    return this.resolveNodeModule(specifier, fromFile);
  }
}
```

### Dependency Management

**Circular Dependency Detection**:

```typescript
class DependencyGraph {
  detectCircularDependencies(): CircularDependency[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: CircularDependency[] = [];

    for (const module of this.modules) {
      if (!visited.has(module.id)) {
        this.dfsVisit(module, visited, recursionStack, cycles);
      }
    }

    return cycles;
  }
}
```

### Bundle Generation

**CommonJS Output** (Recommended):

```javascript
// Generated bundle structure
const moduleMap = {
  '/src/main.som': function (exports, require, module) {
    // Module code here
  },
  '/src/utils.som': function (exports, require, module) {
    // Module code here
  },
};

const loader = createModuleLoader(moduleMap);
loader.require('/src/main.som');
```

## Type System Design

SomonScript implements a structural type system with advanced features.

### Type Hierarchy

```
Type
├── PrimitiveType (сатр, рақам, мантиқӣ)
├── ObjectType
│   ├── ArrayType
│   ├── TupleType
│   └── InterfaceType
├── FunctionType
├── UnionType
├── IntersectionType
├── GenericType
└── ConditionalType
```

### Type Inference Algorithm

**Hindley-Milner with Extensions**:

```typescript
class TypeInference {
  infer(expression: Expression, context: TypeContext): Type {
    switch (expression.type) {
      case 'BinaryExpression':
        return this.inferBinaryExpression(expression, context);
      case 'FunctionCall':
        return this.inferFunctionCall(expression, context);
      case 'PropertyAccess':
        return this.inferPropertyAccess(expression, context);
    }
  }

  unify(type1: Type, type2: Type): Type | null {
    // Type unification for constraint solving
  }
}
```

### Advanced Type Features

**Union Types**:

```som
тағйирёбанда идентификатор: сатр | рақам = "user123";
```

**Intersection Types**:

```som
тағйирёбанда корбар: Корбар & Админ = { ... };
```

**Tuple Types**:

```som
тағйирёбанда координата: [рақам, рақам, сатр] = [41.2, 69.1, "Душанбе"];
```

## Runtime Integration

### JavaScript Interoperability

SomonScript generates JavaScript that integrates seamlessly with existing code:

```som
// Using JavaScript libraries
ворид lodash аз "lodash";
ворид { readFileSync } аз "fs";

// Natural interop
тағйирёбанда маълумот = readFileSync("file.txt", "utf8");
тағйирёбанда рўйхат = lodash.uniq([1, 2, 2, 3]);
```

### Source Maps

Generated JavaScript includes source maps for debugging:

```javascript
//# sourceMappingURL=main.som.map
```

This allows developers to debug SomonScript code directly in browsers and
Node.js.

### Runtime Type Checking (Optional)

For development builds, runtime type assertions can be generated:

```javascript
// Generated with --runtime-checks
function assertEqual(value, expectedType, location) {
  if (!checkType(value, expectedType)) {
    throw new TypeError(
      `Type error at ${location}: expected ${expectedType}, got ${typeof value}`
    );
  }
}
```

## Performance Considerations

### Compilation Speed

**Optimization Strategies**:

1. **Incremental Compilation**: Only recompile changed modules
2. **Parallel Processing**: Parse multiple modules simultaneously
3. **Caching**: Cache parsed ASTs and type information
4. **Lazy Loading**: Load modules only when needed

**Benchmarks**:

- Small project (10 modules): < 100ms
- Medium project (100 modules): < 1s
- Large project (1000+ modules): < 10s

### Generated Code Quality

**Optimization Techniques**:

1. **Dead Code Elimination**: Remove unused exports
2. **Tree Shaking**: Eliminate unused imports
3. **Minification**: Compress output for production
4. **Bundle Splitting**: Separate vendor and application code

### Memory Management

**Compiler Memory Usage**:

- **AST Sharing**: Share common subtrees
- **String Interning**: Deduplicate identifiers
- **Garbage Collection**: Release unused data structures

## Extensibility

### Plugin Architecture

SomonScript supports plugins for extending functionality:

```typescript
interface CompilerPlugin {
  name: string;
  version: string;

  transformAST?(ast: AST): AST;
  generateCode?(node: ASTNode): string;
  checkTypes?(node: ASTNode, checker: TypeChecker): void;
}
```

### Language Server Protocol

The compiler implements LSP for editor integration:

```typescript
class SomonScriptLanguageServer implements LanguageServer {
  onHover(params: HoverParams): Hover {
    // Provide type information on hover
  }

  onCompletion(params: CompletionParams): CompletionItem[] {
    // Intelligent code completion
  }

  onDefinition(params: DefinitionParams): Location[] {
    // Go to definition support
  }
}
```

### Future Extensions

**Planned Features**:

1. **Macro System**: Compile-time code generation
2. **Effect System**: Track side effects in type system
3. **Pattern Matching**: Advanced control flow
4. **Algebraic Data Types**: Sum types and record types

## Architecture Benefits

### For Developers

1. **Fast Compilation**: Optimized pipeline provides quick feedback
2. **Excellent Errors**: Precise error messages with suggestions
3. **IDE Integration**: Full language server support
4. **Debugging Support**: Source maps enable native debugging

### For Teams

1. **Type Safety**: Catch errors at compile time
2. **Refactoring Support**: Safe automated refactoring
3. **Documentation**: Types serve as live documentation
4. **Consistency**: Enforced coding standards

### For Organizations

1. **Gradual Adoption**: Interoperates with existing JavaScript
2. **Performance**: Generates efficient JavaScript code
3. **Maintainability**: Clear architecture and good tooling
4. **Scalability**: Handles large codebases efficiently

## Implementation Details

### Key Design Decisions

1. **Target JavaScript**: Leverage existing ecosystem and runtime
2. **Structural Typing**: More flexible than nominal typing
3. **Type Erasure**: No runtime type information (like TypeScript)
4. **Immutable AST**: Easier reasoning and transformation
5. **Error Recovery**: Continue compilation after errors

### Technical Debt and Limitations

**Current Limitations**:

1. **No Macros**: Compile-time code generation not supported
2. **Limited Generics**: Basic generic support, no higher-kinded types
3. **No Algebraic Types**: Sum types require union type workarounds

**Future Improvements**:

1. **Better Error Messages**: More contextual suggestions
2. **Performance Optimization**: Faster type checking
3. **Advanced Features**: Pattern matching, effects

## Conclusion

SomonScript's architecture balances simplicity with power, providing a solid
foundation for:

- **Language Evolution**: Easy to add new features
- **Tool Development**: Clear APIs for tooling
- **Performance**: Efficient compilation and execution
- **Maintainability**: Clean, well-documented codebase

The modular design ensures that each component can be improved independently
while maintaining overall system integrity.

---

For implementation details, see the source code in `/src/` directory. For
contributing to the architecture, see [CONTRIBUTING.md](../../CONTRIBUTING.md).
