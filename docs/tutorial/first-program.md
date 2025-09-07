# Your First Program

Welcome to writing your first SomonScript program! In this guide, you'll create
a simple "Hello, World!" program and learn the basics of running SomonScript
code.

## Prerequisites

Make sure you have completed the [Installation](installation.md) guide and have
SomonScript working on your system.

## Creating Your First File

### Step 1: Create a Project Directory

```bash
mkdir my-first-somon-app
cd my-first-somon-app
```

### Step 2: Create Your First SomonScript File

Create a file called `hello.som` (SomonScript files use the `.som` extension):

```somon
// Your first SomonScript program
чоп.сабт("Салом, ҷаҳон!");
```

This simple program:

- Uses `чоп.сабт()` (console.log) to print a message
- Says "Салом, ҷаҳон!" which means "Hello, World!" in Tajik
- Ends with a semicolon (like JavaScript)

### Step 3: Run Your Program

```bash
somon run hello.som
```

You should see the output:

```
Салом, ҷаҳон!
```

Congratulations! You've just written and run your first SomonScript program! 🎉

## Understanding the Code

Let's break down what happened:

### SomonScript vs JavaScript

Your SomonScript code:

```somon
чоп.сабт("Салом, ҷаҳон!");
```

Compiles to this JavaScript:

```javascript
console.log('Салом, ҷаҳон!');
```

### Key Concepts

1. **Tajik Keywords**: `чоп.сабт` is the Tajik equivalent of `console.log`
2. **Familiar Syntax**: The structure (parentheses, semicolons) is familiar to
   JavaScript developers
3. **Unicode Support**: SomonScript fully supports Tajik Cyrillic characters

## Let's Try More Examples

### Example 2: Variables

Create a file called `variables.som`:

```somon
// Declaring variables in Tajik
тағйирёбанда ном = "Аҳмад";
тағйирёбанда синну_сол = 25;

чоп.сабт("Ном: " + ном);
чоп.сабт("Синну сол: " + синну_сол);
```

Run it:

```bash
somon run variables.som
```

Output:

```
Ном: Аҳмад
Синну сол: 25
```

### Example 3: Simple Function

Create `function.som`:

```somon
// Function definition in Tajik
функсия салом(ном) {
    бозгашт "Салом, " + ном + "!";
}

// Call the function
тағйирёбанда паём = салом("Фотима");
чоп.сабт(паём);
```

Run it:

```bash
somon run function.som
```

Output:

```
Салом, Фотима!
```

## Key Language Elements

| SomonScript    | English     | JavaScript    |
| -------------- | ----------- | ------------- |
| `тағйирёбанда` | variable    | `let`         |
| `собит`        | constant    | `const`       |
| `функсия`      | function    | `function`    |
| `бозгашт`      | return      | `return`      |
| `чоп.сабт`     | console.log | `console.log` |

## Compilation Process

When you run `somon run hello.som`, here's what happens:

1. **Lexical Analysis**: SomonScript breaks your code into tokens
2. **Parsing**: Builds an Abstract Syntax Tree (AST)
3. **Code Generation**: Converts the AST to JavaScript
4. **Execution**: Runs the JavaScript with Node.js

You can also compile without running:

```bash
# Compile to JavaScript file
somon compile hello.som

# This creates hello.js
cat hello.js
```

## Common Beginner Mistakes

### 1. Forgetting Semicolons

```somon
// ❌ Wrong
чоп.сабт("Hello")

// ✅ Correct
чоп.сабт("Hello");
```

### 2. Mixing Languages

```somon
// ❌ Wrong - mixing JavaScript keywords
let ном = "Ahmad";

// ✅ Correct - use SomonScript keywords
тағйирёбанда ном = "Ahmad";
```

### 3. Wrong File Extension

```bash
# ❌ Wrong
somon run hello.js

# ✅ Correct
somon run hello.som
```

## Project Structure

For larger programs, organize your code:

```
my-project/
├── src/
│   ├── main.som
│   └── helpers.som
├── package.json
└── dist/           # Compiled JavaScript
```

Initialize a proper project:

```bash
somon init my-project
cd my-project
```

## What's Next?

Now that you've written your first program, continue learning:

1. **[Basic Syntax](basic-syntax.md)** - Learn language fundamentals
2. **[Variables and Types](variables-and-types.md)** - Understand data types
3. **[Functions](functions.md)** - Master function definitions
4. **[Examples](../../examples/)** - Explore more code samples

## Practice Exercises

Try these simple exercises:

### Exercise 1: Personal Greeting

Write a program that prints your name and age:

```somon
тағйирёбанда манАм = "Your Name";
тағйирёбанда синнуСолиМан = 20;

чоп.сабт("Ман " + манАм + " ҳастам ва " + синнуСолиМан + " сола дорам.");
```

### Exercise 2: Simple Calculator

Create a program that adds two numbers:

```somon
функсия ҷамъ(а, б) {
    бозгашт а + б;
}

тағйирёбанда натиҷа = ҷамъ(10, 5);
чоп.сабт("10 + 5 = " + натиҷа);
```

### Exercise 3: Conditional Logic

Write a program that checks if a number is positive:

```somon
тағйирёбанда рақам = 7;

агар (рақам > 0) {
    чоп.сабт("Рақам мусбат аст");
} вагарна {
    чоп.сабт("Рақам мусбат нест");
}
```

## Troubleshooting

### Program doesn't run?

1. Check that the file has `.som` extension
2. Verify SomonScript is installed: `somon --version`
3. Make sure you're in the correct directory

### Syntax errors?

1. Check for missing semicolons
2. Ensure you're using SomonScript keywords, not JavaScript
3. Verify parentheses and brackets are balanced

### Need help?

- Check the [How-to Guides](../how-to/) for specific problems
- Look at [Reference](../reference/) for language details
- Visit
  [GitHub Discussions](https://github.com/Slashmsu/somoni-script/discussions)

---

**Ready for more?** → [Basic Syntax](basic-syntax.md)
