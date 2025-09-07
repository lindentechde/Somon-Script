# Reference

This section provides comprehensive reference documentation for the SomonScript
language. Use this when you need to look up specific syntax, features, or APIs.

## Language Reference

### Core Language

- [Keywords](keywords.md) - Complete list of SomonScript keywords and their
  JavaScript equivalents
- [Syntax](syntax.md) - Grammar and syntax rules
- [Data Types](data-types.md) - Primitive and complex types
- [Operators](operators.md) - All operators and their usage
- [Expressions](expressions.md) - Expression syntax and evaluation

### Type System

- [Type Annotations](type-annotations.md) - How to annotate variables and
  functions
- [Union Types](union-types.md) - Syntax and usage of union types
  (`сатр | рақам`)
- [Intersection Types](intersection-types.md) - Combining types with
  intersection
- [Tuple Types](tuple-types.md) - Fixed-length array types
- [Conditional Types](conditional-types.md) - Advanced conditional type logic
- [Mapped Types](mapped-types.md) - Type transformations and mapping

### Object-Oriented Programming

- [Classes](classes.md) - Class declarations and member definitions
- [Interfaces](interfaces.md) - Interface syntax and implementation
- [Inheritance](inheritance.md) - Extending classes and method overriding
- [Access Modifiers](access-modifiers.md) - Public, private, and protected
  members

### Control Flow

- [Conditionals](conditionals.md) - If statements and conditional expressions
- [Loops](loops.md) - For loops, while loops, and iteration
- [Error Handling](error-handling.md) - Try-catch-finally statements

### Functions and Methods

- [Function Declarations](function-declarations.md) - Function syntax and
  parameters
- [Arrow Functions](arrow-functions.md) - Concise function expressions
- [Async Functions](async-functions.md) - Asynchronous programming patterns
- [Method Definitions](method-definitions.md) - Class methods and signatures

### Modules

- [Import Statements](import-statements.md) - Importing modules and dependencies
- [Export Statements](export-statements.md) - Exporting functions, classes, and
  values
- [Module Resolution](module-resolution.md) - How modules are found and loaded

## Tools and CLI Reference

### Command Line Interface

- [CLI Commands](cli-commands.md) - Complete command reference
- [Compilation Options](compilation-options.md) - Compiler flags and settings
- [Configuration Files](configuration-files.md) - Project configuration options

### API Reference

- [Compiler API](compiler-api.md) - Programmatic compilation interface
- [Lexer API](lexer-api.md) - Tokenization and lexical analysis
- [Parser API](parser-api.md) - AST generation and parsing
- [Type Checker API](type-checker-api.md) - Type analysis and validation

## Built-in Functions and Objects

### Console Functions

- [Console Methods](console-methods.md) - Output and logging functions
- [String Methods](string-methods.md) - String manipulation and analysis
- [Array Methods](array-methods.md) - Array operations and transformations

### Standard Library

- [Global Objects](global-objects.md) - Built-in global objects and functions
- [Error Objects](error-objects.md) - Error types and exception handling
- [Promise and Async](promise-async.md) - Asynchronous programming utilities

## Quick Reference

| Category     | Most Used                                             |
| ------------ | ----------------------------------------------------- |
| **Keywords** | `тағйирёбанда`, `собит`, `функсия`, `синф`, `агар`    |
| **Types**    | `сатр`, `рақам`, `мантиқӣ`, `сатр[]`, `сатр \| рақам` |
| **Control**  | `агар...вагарна`, `то`, `барои`, `кӯшиш...гирифтан`   |
| **OOP**      | `синф`, `конструктор`, `мерос`, `интерфейс`           |
| **Modules**  | `ворид`, `содир`, `аз`, `пешфарз`                     |

## Version Information

This reference covers SomonScript version 0.2.14 and later. For version-specific
features, see [Version History](../explanation/version-history.md).

## Contributing

Found an error or missing information?
[Report it](https://github.com/Slashmsu/somoni-script/issues) or
[contribute improvements](https://github.com/Slashmsu/somoni-script/blob/main/CONTRIBUTING.md).
