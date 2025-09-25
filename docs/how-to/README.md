# SomonScript How-To Guides

Problem-oriented guides to help you solve specific challenges with SomonScript.

## Overview

These guides focus on solving real-world problems and implementing specific
features. Each guide provides step-by-step instructions and practical examples.

## Available Guides

### **[⭐ Best Practices](best-practices.md)**

Industry-standard coding guidelines and patterns for writing clean, maintainable
SomonScript code.

## Problem Categories

### Development Workflow

#### Project Setup

- **Creating a New Project**: Structure and configuration
- **Setting Up Build Pipeline**: Compilation and bundling
- **IDE Integration**: VS Code extensions and language server
- **Debugging Setup**: Source maps and debugging tools

#### Code Organization

- **Module Structure**: Organizing large applications
- **Dependency Management**: Managing external libraries
- **Code Splitting**: Optimizing bundle size
- **Monorepo Setup**: Managing multiple SomonScript packages

### Type System Usage

#### Advanced Types

- **Working with Union Types**: Type guards and narrowing
- **Generic Programming**: Reusable type-safe components
- **Type Assertions**: When and how to use them safely
- **Conditional Types**: Advanced type-level programming

#### Interoperability

- **JavaScript Integration**: Using existing JS libraries
- **TypeScript Migration**: Converting TypeScript projects
- **Type Definitions**: Creating .d.ts files for JS libraries
- **Gradual Typing**: Adding types to existing code

### Performance Optimization

#### Compilation Speed

- **Incremental Compilation**: Faster development builds
- **Module Caching**: Optimizing compilation time
- **Parallel Compilation**: Using multiple cores
- **Watch Mode Optimization**: Efficient file watching

#### Runtime Performance

- **Bundle Optimization**: Minimizing bundle size
- **Tree Shaking**: Eliminating dead code
- **Lazy Loading**: On-demand module loading
- **Memory Management**: Avoiding memory leaks

### Error Handling

#### Development Errors

- **Debugging Compilation Errors**: Common fixes
- **Type Error Resolution**: Understanding type mismatches
- **Module Resolution Issues**: Import/export problems
- **Build Process Debugging**: CI/CD troubleshooting

#### Runtime Error Handling

- **Error Boundaries**: Containing errors in applications
- **Graceful Degradation**: Fallback strategies
- **Logging and Monitoring**: Production error tracking
- **User-Friendly Error Messages**: UX considerations

### Testing Strategies

#### Unit Testing

- **Testing Functions**: Pure function testing
- **Mocking Dependencies**: Isolation techniques
- **Type Testing**: Verifying type correctness
- **Property-Based Testing**: Generative testing

#### Integration Testing

- **Module Integration**: Testing module interactions
- **API Testing**: External service integration
- **E2E Testing**: Full application testing
- **Performance Testing**: Benchmarking and profiling

### Deployment

#### Build Configuration

- **Production Builds**: Optimizing for production
- **Environment Variables**: Configuration management
- **Asset Management**: Static file handling
- **Source Map Generation**: Debugging in production

#### CI/CD Pipeline

- **GitHub Actions**: Automated testing and deployment
- **Docker Integration**: Containerized builds
- **NPM Publishing**: Package distribution
- **Version Management**: Semantic versioning

## Quick Solutions

### Common Tasks

#### Getting Started Quickly

```bash
# Create new project
mkdir my-somon-project
cd my-somon-project
npm init -y
npm install @lindentech/somon-script --save-dev

# Create basic files
echo 'чоп.сабт("Салом, Ҷаҳон!");' > main.som

# Run immediately
somon run main.som
```

#### Adding Types to Existing Code

```som
// Before: Untyped
функсия ҳисоб_кардан(а, б) {
    бозгашт а + б;
}

// After: Typed
функсия ҳисоб_кардан(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}
```

#### Converting JavaScript to SomonScript

```javascript
// JavaScript
function calculateTax(amount, rate) {
  return amount * rate;
}

const user = {
  name: 'John',
  age: 30,
};
```

```som
// SomonScript
функсия ҳисоби_андоз(маблағ: рақам, нарх: рақам): рақам {
    бозгашт маблағ * нарх;
}

интерфейс Корбар {
    ном: сатр;
    синну_сол: рақам;
}

тағйирёбанда корбар: Корбар = {
    ном: "Ҷон",
    синну_сол: 30
};
```

### Troubleshooting

#### "Cannot resolve module" Error

```som
// Problem: Import not found
ворид { utils } аз "./utilities";

// Solution 1: Add file extension
ворид { utils } аз "./utilities.som";

// Solution 2: Check file path
ворид { utils } аз "../shared/utilities.som";

// Solution 3: Use index file
// Create utilities/index.som
содор * аз "./math";
содор * аз "./strings";
```

#### Type Error Resolution

```som
// Problem: Type mismatch
функсия коркард(маълумот: сатр): сатр {
    бозгашт маълумот.toUpperCase();
}

коркард(123); // Error: Argument of type 'number' is not assignable to parameter of type 'string'

// Solution 1: Fix the call
коркард("123");

// Solution 2: Use union types
функсия коркард(маълумот: сатр | рақам): сатр {
    бозгашт String(маълумот).toUpperCase();
}

// Solution 3: Function overloading
функсия коркард(маълумот: сатр): сатр;
функсия коркард(маълумот: рақам): сатр;
функсия коркард(маълумот: сатр | рақам): сатр {
    бозгашт String(маълумот).toUpperCase();
}
```

#### Performance Issues

```som
// Problem: Slow compilation
// Solution: Use incremental compilation
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".som-cache"
  }
}

// Problem: Large bundle size
// Solution: Use dynamic imports
ҳамзамон функсия loadHeavyModule() {
    собит модул = интизор ворид("./heavy-module");
    бозгашт модул;
}
```

## Implementation Patterns

### Singleton Pattern

```som
синф Танҳогӣ {
    хосусӣ собити намуна: Танҳогӣ | ҳеҷ = ҳеҷ;

    хосусӣ конструктор() {}

    ҷамъиятӣ собити гирифтани_намуна(): Танҳогӣ {
        агар (!Танҳогӣ.намуна) {
            Танҳогӣ.намуна = нав Танҳогӣ();
        }
        бозгашт Танҳогӣ.намуна;
    }
}
```

### Observer Pattern

```som
интерфейс Мушоҳидакунанда<T> {
    навсозӣ(маълумот: T): ҳеҷ;
}

синф Мавзӯъ<T> {
    хосусӣ мушоҳидакунандагон: Мушоҳидакунанда<T>[] = [];

    ҷамъиятӣ илова_кардани_мушоҳидакунанда(мушоҳидакунанда: Мушоҳидакунанда<T>): ҳеҷ {
        ин.мушоҳидакунандагон.push(мушоҳидакунанда);
    }

    ҷамъиятӣ огоҳ_кардан(маълумот: T): ҳеҷ {
        барои тағйирёбанда мушоҳидакунанда аз ин.мушоҳидакунандагон {
            мушоҳидакунанда.навсозӣ(маълумот);
        }
    }
}
```

### Factory Pattern

```som
мухтасар синф Маҳсулот {
    мухтасар истифода_кардан(): ҳеҷ;
}

синф МаҳсулотиА мерос_мебарад Маҳсулот {
    истифода_кардан(): ҳеҷ {
        чоп.сабт("Маҳсулоти А истифода мешавад");
    }
}

синф МаҳсулотиБ мерос_мебарад Маҳсулот {
    истифода_кардан(): ҳеҷ {
        чоп.сабт("Маҳсулоти Б истифода мешавад");
    }
}

синф Корхона {
    ҷамъиятӣ собити маҳсулот_созед(навъ: сатр): Маҳсулот {
        мувофиқи (навъ) {
            ҳолати "А":
                бозгашт нав МаҳсулотиА();
            ҳолати "Б":
                бозгашт нав МаҳсулотиБ();
            пешфарз:
                партофтан нав Хато("Навъи номаълум");
        }
    }
}
```

## Best Practice Guidelines

### 1. Code Organization

- Use consistent naming conventions
- Group related functionality in modules
- Keep functions small and focused
- Document public APIs

### 2. Type Safety

- Prefer explicit types over inference when unclear
- Use union types for flexible APIs
- Leverage generic types for reusability
- Avoid `any` type in production code

### 3. Performance

- Profile before optimizing
- Use appropriate data structures
- Minimize bundle size
- Cache expensive computations

### 4. Error Handling

- Handle errors at appropriate levels
- Provide meaningful error messages
- Use typed errors for better debugging
- Implement graceful degradation

### 5. Testing

- Write tests for public APIs
- Use type-level testing for complex types
- Mock external dependencies
- Test error conditions

## Getting Help

### When You're Stuck

1. **Check the Examples**: Browse `/examples` directory
2. **Search Issues**: Look for similar problems on GitHub
3. **Ask the Community**: Use GitHub Discussions
4. **Read the Source**: Study the compiler source code

### Contributing Guides

Help improve these how-to guides:

1. **Identify Common Problems**: What issues do you encounter?
2. **Write Clear Solutions**: Step-by-step instructions
3. **Test Your Guides**: Ensure examples work
4. **Submit Pull Requests**: Share with the community

---

_These guides are community-maintained. Contribute your solutions to help other
developers!_
