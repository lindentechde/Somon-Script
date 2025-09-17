# Getting Started with SomonScript

Welcome to SomonScript! This tutorial will guide you through your first steps
with the language, from installation to writing your first programs.

## What You'll Learn

By the end of this tutorial, you'll be able to:

- Install and set up SomonScript
- Write and run your first SomonScript program
- Understand basic syntax and language features
- Work with variables, functions, and control flow
- Create simple classes and objects

## Prerequisites

- Basic programming knowledge (any language)
- Node.js 16+ installed on your system
- A text editor or IDE (VS Code recommended)

## Step 1: Installation

### Global Installation (Recommended)

Install SomonScript globally to use it from anywhere:

```bash
npm install -g somon-script
```

### Project Installation

For project-specific installation:

```bash
mkdir my-somon-project
cd my-somon-project
npm init -y
npm install somon-script --save-dev
```

### Verify Installation

Check that SomonScript is installed correctly:

```bash
somon --version
```

You should see the current version number (0.2.57 or newer).

## Step 2: Your First Program

Let's start with the traditional "Hello, World!" program.

### Create Your First File

Create a new file called `hello.som`:

```bash
echo 'чоп.сабт("Салом, Ҷаҳон!");' > hello.som
```

### Run Your Program

```bash
somon run hello.som
```

You should see:

```
Салом, Ҷаҳон!
```

**Congratulations!** You've just written and executed your first SomonScript
program.

## Step 3: Understanding the Syntax

Let's break down what happened:

```som
чоп.сабт("Салом, Ҷаҳон!");
```

- `чоп` (chop) means "console" in Tajik
- `сабт` (sabt) means "log" or "record"
- `чоп.сабт()` is equivalent to JavaScript's `console.log()`
- `"Салом, Ҷаҳон!"` means "Hello, World!" in Tajik

## Step 4: Working with Variables

Create a new file called `variables.som`:

```som
// Variables with type inference
тағйирёбанда ном = "Аҳмад";
тағйирёбанда синну_сол = 25;
тағйирёбанда мусиқӣ_дӯст_медорад = рост;

// Constants
собит ПИ = 3.14159;
собит МАКС_СИННУ_СОЛ = 120;

// Display values
чоп.сабт("Ном: " + ном);
чоп.сабт("Синну сол: " + синну_сол);
чоп.сабт("Мусиқӣ дӯст медорад: " + мусиқӣ_дӯст_медорад);
чоп.сабт("ПИ: " + ПИ);
```

Run it:

```bash
somon run variables.som
```

### Key Vocabulary

- `тағйирёбанда` = variable (changeable)
- `собит` = constant
- `рост` = true
- `нодуруст` = false

## Step 5: Functions

Create `functions.som`:

```som
// Simple function
функсия салом_кардан(ном: сатр): сатр {
    бозгашт "Салом, " + ном + "!";
}

// Function with multiple parameters
функсия ҷамъ_кардан(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

// Function with default parameter
функсия танзими_паём(ном: сатр, салом: сатр = "Салом"): сатр {
    бозгашт салом + ", " + ном + "!";
}

// Use the functions
тағйирёбанда паёми_салом = салом_кардан("Дониёр");
тағйирёбанда натиҷа = ҷамъ_кардан(10, 15);
тағйирёбанда паёми_танзимӣ = танзими_паём("Фаридун", "Хайр омадед");

чоп.сабт(паёми_салом);      // "Салом, Дониёр!"
чоп.сабт("Натиҷа: " + натиҷа); // "Натиҷа: 25"
чоп.сабт(паёми_танзимӣ);     // "Хайр омадед, Фаридун!"
```

### Key Vocabulary

- `функсия` = function
- `бозгашт` = return
- `сатр` = string
- `рақам` = number

## Step 6: Control Flow

Create `control-flow.som`:

```som
тағйирёбанда синну_сол = 18;

// Conditional statements
агар синну_сол >= 18 {
    чоп.сабт("Шумо калонсол ҳастед");
} вагарна агар синну_сол >= 13 {
    чоп.сабт("Шумо наврас ҳастед");
} вагарна {
    чоп.сабт("Шумо кӯдак ҳастед");
}

// For loop
барои тағйирёбанда и = 1; и <= 5; и++ {
    чоп.сабт("Адад: " + и);
}

// While loop
тағйирёбанда ҳисоб = 0;
то ҳисоб < 3 {
    чоп.сабт("Ҳисоб: " + ҳисоб);
    ҳисоб++;
}
```

### Key Vocabulary

- `агар` = if
- `вагарна` = else
- `барои` = for
- `то` = while (until)

## Step 7: Arrays and Objects

Create `data-structures.som`:

```som
// Arrays
тағйирёбанда мева = ["себ", "мӯз", "анор"];
тағйирёбанда рақамҳо = [1, 2, 3, 4, 5];

// Access array elements
чоп.сабт("Мевани аввал: " + мева[0]);
чоп.сабт("Миқдори мева: " + мева.length);

// Object
тағйирёбанда корбар = {
    ном: "Анвар",
    синну_сол: 30,
    шаҳр: "Душанбе"
};

// Access object properties
чоп.сабт("Номи корбар: " + корбар.ном);
чоп.сабт("Синну соли корбар: " + корбар.синну_сол);

// Iterate through array
барои тағйирёбанда и = 0; и < мева.length; и++ {
    чоп.сабт("Мева " + (и + 1) + ": " + мева[и]);
}
```

## Step 8: Basic Classes

Create `classes.som`:

```som
// Define a class
синф Шахс {
    хосусӣ ном: сатр;
    хосусӣ синну_сол: рақам;

    // Constructor
    конструктор(ном: сатр, синну_сол: рақам) {
        ин.ном = ном;
        ин.синну_сол = синну_сол;
    }

    // Public method
    ҷамъиятӣ салом_кардан(): сатр {
        бозгашт "Салом, ман " + ин.ном + " ҳастам ва " + ин.синну_сол + " сола дорам.";
    }

    // Getter method
    ҷамъиятӣ ном_гирифтан(): сатр {
        бозгашт ин.ном;
    }
}

// Create and use objects
тағйирёбанда шахс1 = нав Шахс("Олим", 28);
тағйирёбанда шахс2 = нав Шахс("Мариям", 24);

чоп.сабт(шахс1.салом_кардан());
чоп.сабт(шахс2.салом_кардан());
```

### Key Vocabulary

- `синф` = class
- `конструктор` = constructor
- `хосусӣ` = private
- `ҷамъиятӣ` = public
- `нав` = new
- `ин` = this

## Step 9: Type Annotations

SomonScript supports advanced type safety. Create `types.som`:

```som
// Explicit types
тағйирёбанда ном: сатр = "Зарина";
тағйирёбанда синну_сол: рақам = 25;
тағйирёбанда фаъол: мантиқӣ = рост;

// Union types
тағйирёбанда идентификатор: сатр | рақам = "user123";

// Interface
интерфейс Корбар {
    ном: сатр;
    синну_сол: рақам;
    email?: сатр; // Optional property
}

// Function with typed parameters
функсия корбар_эҷод_кардан(ном: сатр, синну_сол: рақам): Корбар {
    бозгашт {
        ном: ном,
        синну_сол: синну_сол
    };
}

тағйирёбанда навИ_корбар = корбар_эҷод_кардан("Сайфулло", 32);
чоп.сабт("Корбари нав: " + навИ_корбар.ном);
```

### Key Vocabulary

- `мантиқӣ` = boolean
- `интерфейс` = interface

## Step 10: Error Handling

Create `error-handling.som`:

```som
функсия тақсим_кардан(а: рақам, б: рақам): рақам {
    агар б === 0 {
        партофтан нав Хато("Тақсим ба сифр имконнопазир аст");
    }
    бозгашт а / б;
}

// Try-catch block
кӯшиш {
    тағйирёбанда натиҷа1 = тақсим_кардан(10, 2);
    чоп.сабт("Натиҷа: " + натиҷа1);

    тағйирёбанда натиҷа2 = тақсим_кардан(10, 0); // This will throw an error
    чоп.сабт("Натиҷа: " + натиҷа2);
} гирифтан (хато) {
    чоп.сабт("Хато рух дод: " + хато.паём);
}
```

### Key Vocabulary

- `кӯшиш` = try
- `гирифтан` = catch
- `партофтан` = throw
- `Хато` = Error

## Next Steps

Congratulations! You've completed the SomonScript getting started tutorial. You
now know:

- ✅ How to install and run SomonScript
- ✅ Basic syntax and vocabulary
- ✅ Variables and constants
- ✅ Functions with parameters and return types
- ✅ Control flow (if/else, loops)
- ✅ Arrays and objects
- ✅ Classes and objects
- ✅ Type annotations and interfaces
- ✅ Error handling

### What's Next?

1. **[Explore Examples](../../examples/)** - Browse 32+ comprehensive examples
2. **[Language Reference](../reference/)** - Deep dive into language features
3. **[How-to Guides](../how-to/)** - Solve specific problems
4. **[Architecture Guide](../explanation/architecture.md)** - Understand how
   SomonScript works

### Practice Exercises

Try building these projects to reinforce your learning:

1. **Calculator**: Create a calculator with basic arithmetic operations
2. **Todo List**: Build a simple todo list manager
3. **Student Grades**: Create a system to manage student grades
4. **Library System**: Build a book lending system

### Getting Help

- 📚 [Documentation](../../README.md)
- 💬 [GitHub Discussions](https://github.com/Slashmsu/somoni-script/discussions)
- 🐛 [Report Issues](https://github.com/Slashmsu/somoni-script/issues)

Happy coding with SomonScript! 🚀
