# SomonScript Quick Reference

A comprehensive cheat sheet for SomonScript syntax and common patterns.

## Basic Syntax

### Variables and Constants

```som
// Variables (mutable)
тағйирёбанда ном = "Аҳмад";
тағйирёбанда синну_сол = 25;
тағйирёбанда фаъол = рост;

// Constants (immutable)
собит ПИ = 3.14159;
собит МАКС_СИННУ_СОЛ = 120;

// With explicit types
тағйирёбанда маълумот: сатр = "Салом";
тағйирёбанда рақам: рақам = 42;
тағйирёбанда мантиқӣ: мантиқӣ = нодуруст;
```

### Data Types

| Tajik      | English   | JavaScript  |
| ---------- | --------- | ----------- |
| `сатр`     | string    | `string`    |
| `рақам`    | number    | `number`    |
| `мантиқӣ`  | boolean   | `boolean`   |
| `рост`     | true      | `true`      |
| `нодуруст` | false     | `false`     |
| `ҳеҷ`      | null      | `null`      |
| `номуайян` | undefined | `undefined` |

## Functions

### Basic Functions

```som
// Simple function
функсия салом(ном: сатр): сатр {
    бозгашт "Салом, " + ном;
}

// Multiple parameters
функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

// Optional parameters
функсия танзим(ном: сатр, салом?: сатр): сатр {
    салом = салом || "Салом";
    бозгашт салом + ", " + ном;
}

// Default parameters
функсия пешфарз(ном: сатр, салом: сатр = "Салом"): сатр {
    бозгашт салом + ", " + ном;
}

// Arrow functions (anonymous)
тағйирёбанда ҳисоб = (а: рақам, б: рақам): рақам => а * б;
```

### Advanced Functions

```som
// Generic functions
функсия якхела<T>(элемент: T): T {
    бозгашт элемент;
}

// Rest parameters
функсия ҷамъи_ҳама(...рақамҳо: рақам[]): рақам {
    тағйирёбанда натиҷа = 0;
    барои тағйирёбанда рақам аз рақамҳо {
        натиҷа += рақам;
    }
    бозгашт натиҷа;
}
```

## Control Flow

### Conditionals

```som
// If-else
агар шарт {
    // код
} вагарна агар дигар_шарт {
    // код
} вагарна {
    // код
}

// Ternary operator
тағйирёбанда натиҷа = шарт ? "рост" : "нодуруст";

// Switch equivalent
мувофиқи (қимат) {
    ҳолати "A":
        чоп.сабт("Алиф");
        пайваст;
    ҳолати "B":
        чоп.сабт("Бо");
        пайваст;
    пешфарз:
        чоп.сабт("Номаълум");
}
```

### Loops

```som
// For loop
барои тағйирёбанда и = 0; и < 10; и++ {
    чоп.сабт(и);
}

// For-in loop (arrays)
барои тағйирёбанда элемент аз массив {
    чоп.сабт(элемент);
}

// For-in loop (objects)
барои тағйирёбанда калид дар объект {
    чоп.сабт(калид + ": " + объект[калид]);
}

// While loop
то шарт {
    // код
}

// Do-while loop
анҷом {
    // код
} то шарт;
```

## Data Structures

### Arrays

```som
// Array creation
тағйирёбанда мева = ["себ", "мӯз", "анор"];
тағйирёбанда рақамҳо = [1, 2, 3, 4, 5];
тағйирёбанда холӣ: сатр[] = [];

// Array methods with Tajik names
мева.илова("шафтолу");         // push - Илова ба охир
мева.пуш("ангур");             // push (alternative)
мева.баровардан();             // pop - Баровардан аз охир
мева.дарозӣ;                   // length - Дарозии массив

// Array iteration methods
мева.харита(м => м.калон());   // map - Табдил додан
мева.филтр(м => м !== "себ");  // filter - Филтр кардан
мева.кофтан(м => м === "мӯз"); // find - Ёфтан
мева.буридан(0, 2);            // slice - Буридан

// Array iteration
мева.forEach((элемент, индекс) => {
    чоп.сабт(`${индекс}: ${элемент}`);
});

тағйирёбанда калонҳо = мева.map(м => м.toUpperCase());
тағйирёбанда сони_кӯтоҳ = мева.filter(м => м.length < 4);
```

### Objects

```som
// Object creation
тағйирёбанда корбар = {
    ном: "Анвар",
    синну_сол: 30,
    шаҳр: "Душанбе",
    салом_кардан: () => "Салом!"
};

// Property access
корбар.ном;                    // Dot notation
корбар["синну_сол"];          // Bracket notation

// Add/modify properties
корбар.email = "anvar@example.com";
корбар["вазифа"] = "барномасоз";

// Delete properties
ҳазф корбар.вазифа;

// Object methods
Object.keys(корбар);           // Get keys
Object.values(корбар);         // Get values
Object.entries(корбар);        // Get key-value pairs
```

## Classes and Interfaces

### Basic Class

```som
синф Шахс {
    хосусӣ ном: сатр;
    хосусӣ синну_сол: рақам;

    конструктор(ном: сатр, синну_сол: рақам) {
        ин.ном = ном;
        ин.синну_сол = синну_сол;
    }

    ҷамъиятӣ салом(): сатр {
        бозгашт `Салом, ман ${ин.ном}`;
    }

    ҷамъиятӣ синну_сол_гирифтан(): рақам {
        бозгашт ин.синну_сол;
    }

    ҷамъиятӣ синну_сол_гузоштан(синну_сол: рақам): ҳеҷ {
        ин.синну_сол = синну_сол;
    }
}
```

### Inheritance

```som
синф Ҳайвон {
    хосусӣ ном: сатр;

    конструктор(ном: сатр) {
        ин.ном = ном;
    }

    ҷамъиятӣ овоз_додан(): сатр {
        бозгашт "Садои умумӣ";
    }
}

синф Саг мерос_мебарад Ҳайвон {
    хосусӣ зот: сатр;

    конструктор(ном: сатр, зот: сатр) {
        супер(ном);
        ин.зот = зот;
    }

    ҷамъиятӣ овоз_додан(): сатр {
        бозгашт "Вақ-вақ!";
    }
}
```

### Interfaces

```som
интерфейс Корбар {
    ном: сатр;
    синну_сол: рақам;
    email?: сатр;  // Optional property
}

интерфейс Админ мерос_мебарад Корбар {
    сатҳи_дастрасӣ: рақам;
    иҷозатҳо: сатр[];
}

// Implementing interface
синф КорбариАсосӣ мерос_мебарад Корбар {
    ном: сатр;
    синну_сол: рақам;
    email?: сатр;

    конструктор(ном: сатр, синну_сол: рақам, email?: сатр) {
        ин.ном = ном;
        ин.синну_сол = синну_сол;
        ин.email = email;
    }
}
```

## Advanced Types

### Union Types

```som
тағйирёбанда идентификатор: сатр | рақам = "user123";
тағйирёбанда статус: "барқарор" | "хомӯш" | "дар_интизор" = "барқарор";

функсия коркард_кардан(маълумот: сатр | рақам): сатр {
    агар typeof маълумот === "сатр" {
        бозгашт маълумот.toUpperCase();
    } вагарна {
        бозгашт маълумот.toString();
    }
}
```

### Intersection Types

```som
интерфейс Корбар {
    ном: сатр;
    синну_сол: рақам;
}

интерфейс Админ {
    сатҳи_дастрасӣ: рақам;
}

тағйирёбанда супер_корбар: Корбар & Админ = {
    ном: "Алӣ",
    синну_сол: 30,
    сатҳи_дастрасӣ: 9
};
```

### Tuple Types

```som
тағйирёбанда координата: [рақам, рақам] = [41.2, 69.1];
тағйирёбанда корбар_маълумот: [сатр, рақам, мантиқӣ] = ["Анвар", 25, рост];

// Named tuple
тағйирёбанда нуқта: [х: рақам, у: рақам, номи_шаҳр: сатр] = [41.2, 69.1, "Душанбе"];
```

## Error Handling

```som
// Try-catch-finally
кӯшиш {
    тағйирёбанда натиҷа = хатарнок_амал();
    чоп.сабт(натиҷа);
} гирифтан (хато) {
    чоп.хато("Хато рух дод:", хато.паём);
} ниҳоят {
    чоп.сабт("Тамом шуд");
}

// Throwing errors
функсия тақсим(а: рақам, б: рақам): рақам {
    агар б === 0 {
        партофтан нав Хато("Тақсим ба сифр");
    }
    бозгашт а / б;
}

// Custom error types
синф ХатоиТанзим мерос_мебарад Хато {
    конструктор(паём: сатр) {
        супер(паём);
        ин.ном = "ХатоиТанзим";
    }
}
```

## Modules and Imports

### Exporting

```som
// Named exports
содир функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

содир собит ПИ = 3.14159;

содир синф Calculator {
    // class implementation
}

// Default export
содир пешфарз функсия асосӣ(): ҳеҷ {
    чоп.сабт("Функсияи асосӣ");
}
```

### Importing

```som
// Named imports
ворид { ҷамъ, ПИ } аз "./math";

// Default import
ворид асосӣ аз "./main";

// Namespace import
ворид * чун Math аз "./math";

// Mixed imports
ворид асосӣ, { ҷамъ, ПИ } аз "./math";

// Dynamic imports
ҳамзамон функсия loadModule() {
    собит модул = интизор ворид("./dynamic-module");
    бозгашт модул.someFunction();
}
```

## Async Programming

### Promises

```som
// Promise creation
тағйирёбанда ваъда = нав Promise<сатр>((ҳал_кардан, рад_кардан) => {
    setTimeout(() => {
        ҳал_кардан("Муваффақият");
    }, 1000);
});

// Promise usage
ваъда.then(натиҷа => {
    чоп.сабт(натиҷа);
}).catch(хато => {
    чоп.хато(хато);
});
```

### Async/Await

```som
ҳамзамон функсия маълумот_гирифтан(url: сатр): Promise<сатр> {
    кӯшиш {
        тағйирёбанда ҷавоб = интизор fetch(url);
        тағйирёбанда маълумот = интизор ҷавоб.text();
        бозгашт маълумот;
    } гирифтан (хато) {
        чоп.хато("Хато дар гирифтани маълумот:", хато);
        партофтан хато;
    }
}

// Usage
ҳамзамон функсия асосӣ() {
    тағйирёбанда маълумот = интизор маълумот_гирифтан("https://api.example.com");
    чоп.сабт(маълумот);
}
```

## Template Literals

### Basic Template Literals

```som
тағйирёбанда ном = "Аҳмад";
тағйирёбанда синну = 25;

// String interpolation
тағйирёбанда паём = `Салом, ${ном}! Шумо ${синну} сола доред.`;

// Multiline strings
тағйирёбанда матни_чандсатра = `
Ин сатри якум
Ин сатри дуюм
Ин сатри сеюм
`;
```

### Advanced Template Usage

```som
// Expression evaluation
тағйирёбанда ҳисоб = `Натиҷа: ${2 + 3}`;

// Function calls in templates
функсия форматкунии_сана(сана: Date): сатр {
    бозгашт сана.toLocaleDateString();
}

тағйирёбанда паёми_сана = `Имрӯз: ${форматкунии_сана(нав Date())}`;
```

## Common Operators

### Arithmetic

```som
+ // Addition
- // Subtraction
* // Multiplication
/ // Division
% // Modulus
** // Exponentiation
++ // Increment
-- // Decrement
```

### Comparison

```som
=== // Strict equality
!== // Strict inequality
== // Loose equality
!= // Loose inequality
< // Less than
> // Greater than
<= // Less than or equal
>= // Greater than or equal
```

### Logical

```som
&& // AND
|| // OR
! // NOT
?? // Nullish coalescing
?. // Optional chaining
```

### Assignment

```som
= // Assignment
+= // Add and assign
-= // Subtract and assign
*= // Multiply and assign
/= // Divide and assign
%= // Modulus and assign
```

## Built-in Objects and Methods

### Console

```som
// Basic console methods
чоп.сабт("Паём");              // console.log
чоп.хато("Хато");              // console.error
чоп.огоҳӣ("Огоҳӣ");           // console.warn
чоп.маълумот("Маълумот");      // console.info
чоп.исфти("Debug");            // console.debug

// Console table and grouping
чоп.ҷадвал(маълумот);          // console.table
чоп.гуруҳ("Гуруҳ");           // console.group
чоп.гуруҳ_охир();              // console.groupEnd
чоп.гуруҳ_пӯшида("Пӯшида");  // console.groupCollapsed

// Console timing
чоп.вақт("timer");            // console.time
чоп.вақт_сабт("timer");       // console.timeLog
чоп.вақт_охир("timer");       // console.timeEnd

// Console counting and misc
чоп.қайд("counter");          // console.count
чоп.қайд_асл("counter");      // console.countReset
чоп.тасдиқ(шарт, "паём");     // console.assert
чоп.полиз();                   // console.clear
чоп.феҳрист(объект);          // console.dir
чоп.пайҷо();                   // console.trace
```

### Math (Риёзӣ)

```som
// Math methods - Методҳои математикӣ
Риёзӣ.дуръшака(9);            // Math.sqrt(9) = 3 - Решаи квадратӣ
Риёзӣ.қувват(2, 3);           // Math.pow(2, 3) = 8 - Қувват/дараҷа
Риёзӣ.тасодуфӣ();            // Math.random() - Рақами тасодуфӣ (0-1)
Риёзӣ.дузкунӣ(4.7);          // Math.round(4.7) = 5 - Гирдкунӣ
Риёзӣ.боло(4.2);             // Math.ceil(4.2) = 5 - Гирдкунӣ ба боло
Риёзӣ.поён(4.7);             // Math.floor(4.7) = 4 - Гирдкунӣ ба поён

// Complex calculations example
тағйирёбанда радиус = 5;
тағйирёбанда майдон = 3.14159 * Риёзӣ.қувват(радиус, 2);
тағйирёбанда аз_1_то_10 = Риёзӣ.поён(Риёзӣ.тасодуфӣ() * 10) + 1;
```

### String Methods

```som
// String properties and methods
сатр.дарозӣ;                  // string.length - Дарозии сатр
сатр.калон();                 // string.toUpperCase() - Ба ҳарфҳои калон
сатр.хурд();                  // string.toLowerCase() - Ба ҳарфҳои хурд
сатр.қисмат(0, 5);           // string.substring(0, 5) - Зерсатр
сатр.ҷойгузин("a", "b");     // string.replace("a", "b") - Иваз кардан
сатр.ҷудокунӣ(",");          // string.split(",") - Ҷудо кардан
сатр.пайвастан(" Ҷаҳон");     // string.concat(" World") - Пайваст кардан

// Example usage
тағйирёбанда матн = "Салом, Ҷаҳон!";
чоп.сабт(матн.дарозӣ);        // 13
чоп.сабт(матн.калон());       // САЛОМ, ҶАҲОН!
чоп.сабт(матн.хурд());        // салом, ҷаҳон!
чоп.сабт(матн.қисмат(0, 5));  // Салом
```

## Best Practices

### Naming Conventions

```som
// Variables: camelCase in Tajik
тағйирёбанда номиКорбар = "Анвар";
тағйирёбанда синнуСолиКорбар = 25;

// Constants: UPPER_CASE
собит МАКС_АНДОЗА = 100;
собит НУСХАИ_БАРНОМА = "1.0.0";

// Functions: descriptive verbs
функсия корбарэҷод_кардан() { }
функсия маълумот_гирифтан() { }

// Classes: PascalCase
синф КорбариАсосӣ { }
синф МудириМаҳсулот { }
```

### Type Annotations

```som
// Always use explicit types for parameters and return values
функсия ҳисоб_кардан(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

// Use union types for flexible APIs
функсия коркард(маълумот: сатр | рақам | мантиқӣ): сатр {
    бозгашт String(маълумот);
}

// Prefer interfaces for object shapes
интерфейс ТанзимотиКорбар {
    ном: сатр;
    синну_сол: рақам;
    email?: сатр;
}
```

### Error Handling

```som
// Always handle potential errors
кӯшиш {
    тағйирёбанда натиҷа = амали_хатарнок();
    // Handle success
} гирифтан (хато) {
    // Handle specific error types
    агар хато instanceof ХатоиШабака {
        чоп.хато("Хатои шабака:", хато.паём);
    } вагарна {
        чоп.хато("Хатои номаълум:", хато);
    }
}
```

---

This quick reference covers the essential SomonScript syntax. For more detailed
examples and advanced features, see the [complete documentation](../README.md).
