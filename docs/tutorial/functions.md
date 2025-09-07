# Functions

Learn how to define, call, and work with functions in SomonScript, including
advanced features like type annotations, default parameters, and async
functions.

## Function Declaration

### Basic Function Syntax

```somon
// Simple function declaration
функсия салом() {
    чоп.сабт("Салом, ҷаҳон!");
}

// Calling the function
салом();  // Output: Салом, ҷаҳон!
```

### Functions with Parameters

```somon
// Function with parameters
функсия салом_ба(ном) {
    чоп.сабт("Салом, " + ном + "!");
}

салом_ба("Аҳмад");   // Output: Салом, Аҳмад!
салом_ба("Фотима");  // Output: Салом, Фотима!
```

### Functions with Return Values

```somon
// Function that returns a value
функсия ҷамъ(а, б) {
    бозгашт а + б;
}

тағйирёбанда натиҷа = ҷамъ(5, 3);
чоп.сабт(натиҷа);  // Output: 8
```

## Type Annotations

### Typed Parameters and Return Types

```somon
// Function with typed parameters and return type
функсия ҳисоби_масоҳат(дарозӣ: рақам, паҳнӣ: рақам): рақам {
    бозгашт дарозӣ * паҳнӣ;
}

тағйирёбанда масоҳат = ҳисоби_масоҳат(10, 5);
чоп.сабт("Масоҳат: " + масоҳат);  // Output: Масоҳат: 50
```

### Multiple Parameter Types

```somon
// Function with different parameter types
функсия маълумоти_корбар(ном: сатр, синну_сол: рақам, фаъол: мантиқӣ): сатр {
    тағйирёбанда ҳолат = фаъол ? "фаъол" : "ғайрифаъол";
    бозгашт ном + " (" + синну_сол + " сола, " + ҳолат + ")";
}

тағйирёбанда маълумот = маълумоти_корбар("Аҳмад", 25, дуруст);
чоп.сабт(маълумот);  // Output: Аҳмад (25 сола, фаъол)
```

## Optional Parameters

### Basic Optional Parameters

```somon
// Function with optional parameter (marked with ?)
функсия таҳият(ном: сатр, унвон?: сатр): сатр {
    агар (унвон) {
        бозгашт "Салом, " + унвон + " " + ном;
    } вагарна {
        бозгашт "Салом, " + ном;
    }
}

чоп.сабт(таҳият("Аҳмад"));           // Output: Салом, Аҳмад
чоп.сабт(таҳият("Аҳмад", "устод"));  // Output: Салом, устод Аҳмад
```

### Default Parameters

```somon
// Function with default parameter values
функсия эҷоди_корбар(
    ном: сатр,
    синну_сол: рақам = 18,
    шаҳр: сатр = "Душанбе"
): сатр {
    бозгашт ном + " (" + синну_сол + " сола) аз " + шаҳр;
}

чоп.сабт(эҷоди_корбар("Алӣ"));                    // Алӣ (18 сола) аз Душанбе
чоп.сабт(эҷоди_корбар("Марям", 25));              // Марям (25 сола) аз Душанбе
чоп.сабт(эҷоди_корбар("Ҳасан", 30, "Хуҷанд"));   // Ҳасан (30 сола) аз Хуҷанд
```

## Advanced Function Features

### Rest Parameters

```somon
// Function that accepts variable number of arguments
функсия ҷамъи_ҳама(...рақамҳо: рақам[]): рақам {
    тағйирёбанда ҷамъ = 0;
    барои (тағйирёбанда рақам of рақамҳо) {
        ҷамъ += рақам;
    }
    бозгашт ҷамъ;
}

чоп.сабт(ҷамъи_ҳама(1, 2, 3));        // Output: 6
чоп.сабт(ҷамъи_ҳама(1, 2, 3, 4, 5));  // Output: 15
```

### Function Overloading

```somon
// Multiple function signatures
функсия форматкунӣ(қимат: сатр): сатр;
функсия форматкунӣ(қимат: рақам): сатр;
функсия форматкунӣ(қимат: сатр | рақам): сатр {
    агар (typeof қимат === "рақам") {
        бозгашт "Рақам: " + қимат;
    } вагарна {
        бозгашт "Матн: " + қимат;
    }
}

чоп.сабт(форматкунӣ(42));      // Output: Рақам: 42
чоп.сабт(форматкунӣ("Салом")); // Output: Матн: Салом
```

## Function Expressions

### Anonymous Functions

```somon
// Function assigned to variable
тағйирёбанда зарб = функсия(а: рақам, б: рақам): рақам {
    бозгашт а * б;
};

чоп.сабт(зарб(4, 5));  // Output: 20
```

### Arrow Functions

```somon
// Arrow function syntax
тағйирёбанда квадрат = (х: рақам): рақам => х * х;
тағйирёбанда салом = (ном: сатр): сатр => "Салом, " + ном + "!";

чоп.сабт(квадрат(5));        // Output: 25
чоп.сабт(салом("Фотима"));   // Output: Салом, Фотима!

// Multi-line arrow functions
тағйирёбанда маълумоти_пурра = (ном: сатр, синну_сол: рақам): сатр => {
    тағйирёбанда категория = синну_сол < 18 ? "хурдсол" : "калонсол";
    бозгашт ном + " - " + категория;
};
```

## Higher-Order Functions

### Functions as Parameters

```somon
// Function that takes another function as parameter
функсия татбиқи_амал(
    рақамҳо: рақам[],
    амал: (х: рақам) => рақам
): рақам[] {
    тағйирёбанда натиҷа: рақам[] = [];
    барои (тағйирёбанда рақам of рақамҳо) {
        натиҷа.илова(амал(рақам));
    }
    бозгашт натиҷа;
}

// Using the higher-order function
тағйирёбанда аслӣ = [1, 2, 3, 4, 5];
тағйирёбанда квадратҳо = татбиқи_амал(аслӣ, х => х * х);
тағйирёбанда дубора = татбиқи_амал(аслӣ, х => х * 2);

чоп.сабт(квадратҳо);  // [1, 4, 9, 16, 25]
чоп.сабт(дубора);     // [2, 4, 6, 8, 10]
```

### Functions Returning Functions

```somon
// Function factory
функсия эҷоди_зарбкунанда(зариб: рақам): (х: рақам) => рақам {
    бозгашт (х: рақам): рақам => х * зариб;
}

тағйирёбанда дубора_кун = эҷоди_зарбкунанда(2);
тағйирёбанда се_баробар = эҷоди_зарбкунанда(3);

чоп.сабт(дубора_кун(5));   // Output: 10
чоп.сабт(се_баробар(4));   // Output: 12
```

## Array Methods with Functions

### Map, Filter, Reduce

```somon
тағйирёбанда рақамҳо = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Map: transform each element
тағйирёбанда квадратҳо = рақамҳо.харита(х => х * х);
чоп.сабт(квадратҳо);  // [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]

// Filter: select elements that match condition
тағйирёбанда ҷуфт = рақамҳо.филтр(х => х % 2 === 0);
чоп.сабт(ҷуфт);  // [2, 4, 6, 8, 10]

// Reduce: combine all elements into single value
тағйирёбанда ҷамъ = рақамҳо.кам_кун((аккумулятор, қимат) => аккумулятор + қимат, 0);
чоп.сабт(ҷамъ);  // 55
```

### Real-world Example

```somon
// Working with array of objects
тағйирёбанда кормандон = [
    { ном: "Аҳмад", маош: 2000, шуъба: "IT" },
    { ном: "Фотима", маош: 1800, шуъба: "HR" },
    { ном: "Алӣ", маош: 2200, шуъба: "IT" },
    { ном: "Марям", маош: 1900, шуъба: "Маркетинг" }
];

// Filter IT employees
тағйирёбанда кормандони_IT = кормандон.филтр(к => к.шуъба === "IT");

// Calculate total salary for IT department
тағйирёбанда маоши_умумӣ = кормандони_IT
    .кам_кун((ҷамъ, корманд) => ҷамъ + корманд.маош, 0);

чоп.сабт("Маоши умумии шуъбаи IT: " + маоши_умумӣ);  // 4200
```

## Async Functions

### Basic Async Functions

```somon
// Async function declaration
ҳамзамон функсия маълумот_гирифтан(): Ваъда<сатр> {
    // Simulate async operation
    бозгашт нав Ваъда((ҳал_кун) => {
        setTimeout(() => {
            ҳал_кун("Маълумот аз сервер");
        }, 1000);
    });
}

// Using async function with await
ҳамзамон функсия асосӣ() {
    кӯшиш {
        тағйирёбанда натиҷа = интизор маълумот_гирифтан();
        чоп.сабт(натиҷа);
    } гирифтан (хато) {
        чоп.хато("Хато: " + хато);
    }
}

асосӣ();
```

### Parallel Async Operations

```somon
// Multiple async operations
ҳамзамон функсия гирифтани_корбар(id: рақам): Ваъда<сатр> {
    бозгашт нав Ваъда((ҳал_кун) => {
        setTimeout(() => {
            ҳал_кун("Корбар " + id);
        }, Math.random() * 1000);
    });
}

ҳамзамон функсия гирифтани_ҳамаи_корбарон() {
    // Parallel execution
    тағйирёбанда [корбар1, корбар2, корбар3] = интизор Promise.all([
        гирифтани_корбар(1),
        гирифтани_корбар(2),
        гирифтани_корбар(3)
    ]);

    чоп.сабт(корбар1, корбар2, корбар3);
}
```

## Error Handling in Functions

### Try-Catch with Functions

```somon
функсия тақсими_бехатар(сурат: рақам, махраҷ: рақам): рақам | сатр {
    кӯшиш {
        агар (махраҷ === 0) {
            партофтан нав Error("Ба сифр тақсим кардан мумкин нест!");
        }
        бозгашт сурат / махраҷ;
    } гирифтан (хато) {
        бозгашт "Хато: " + хато.паём;
    }
}

чоп.сабт(тақсими_бехатар(10, 2));  // 5
чоп.сабт(тақсими_бехатар(10, 0));  // Хато: Ба сифр тақсим кардан мумкин нест!
```

### Custom Error Types

```somon
синф ХатоиТақсим extends Error {
    конструктор(паём: сатр) {
        супер(паём);
        ин.ном = "ХатоиТақсим";
    }
}

функсия тақсим(а: рақам, б: рақам): рақам {
    агар (б === 0) {
        партофтан нав ХатоиТақсим("Махраҷ набояд сифр бошад");
    }
    бозгашт а / б;
}
```

## Function Best Practices

### 1. Use Descriptive Names

```somon
// ✅ Good: Descriptive function names
функсия ҳисоби_миёнаи_бахо(бахоҳо: рақам[]): рақам {
    тағйирёбанда ҷамъ = бахоҳо.кам_кун((а, б) => а + б, 0);
    бозгашт ҷамъ / бахоҳо.дарозӣ;
}

// ❌ Avoid: Unclear names
функсия калк(х: рақам[]): рақам {
    бозгашт х.кам_кун((а, б) => а + б, 0) / х.дарозӣ;
}
```

### 2. Keep Functions Small and Focused

```somon
// ✅ Good: Single responsibility
функсия тозакунии_сатр(сатр: сатр): сатр {
    бозгашт сатр.trim().toLowerCase();
}

функсия эътибори_email(email: сатр): мантиқӣ {
    тағйирёбанда тоза_email = тозакунии_сатр(email);
    бозгашт тоза_email.includes("@") && тоза_email.includes(".");
}

// ❌ Avoid: Too many responsibilities
функсия коркарди_корбар(ном: сатр, email: сатр, синну_сол: рақам) {
    // Too much logic in one function
}
```

### 3. Use Type Annotations

```somon
// ✅ Good: Clear types
функсия ҳисоби_фоиз(
    асл: рақам,
    фоиз: рақам,
    вақт: рақам
): рақам {
    бозгашт асл * фоиз * вақт / 100;
}

// ❌ Avoid: No type information
функсия ҳисоби_фоиз(асл, фоиз, вақт) {
    бозгашт асл * фоиз * вақт / 100;
}
```

### 4. Handle Edge Cases

```somon
функсия гирифтани_элементи_аввал<T>(рӯйхат: T[]): T | холӣ {
    агар (рӯйхат.дарозӣ === 0) {
        бозгашт холӣ;
    }
    бозгашт рӯйхат[0];
}
```

## Practical Examples

### Example 1: Calculator Functions

```somon
// Calculator with multiple operations
синф Ҳисобгар {
    статикӣ ҷамъ(а: рақам, б: рақам): рақам {
        бозгашт а + б;
    }

    статикӣ тарҳ(а: рақам, б: рақам): рақам {
        бозгашт а - б;
    }

    статикӣ зарб(а: рақам, б: рақам): рақам {
        бозгашт а * б;
    }

    статикӣ тақсим(а: рақам, б: рақам): рақам {
        агар (б === 0) {
            партофтан нав Error("Ба сифр тақсим кардан мумкин нест");
        }
        бозгашт а / б;
    }
}

// Usage
чоп.сабт(Ҳисобгар.ҷамъ(10, 5));   // 15
чоп.сабт(Ҳисобгар.зарб(4, 3));    // 12
```

### Example 2: Data Processing Pipeline

```somon
// Data processing functions
функсия хондани_маълумот(): корбари_хом[] {
    бозгашт [
        { ном: "ahmad", синну_сол: 25, email: "AHMAD@EXAMPLE.COM" },
        { ном: "fatima", синну_сол: 30, email: "fatima@example.com" },
        { ном: "ali", синну_сол: 22, email: "ALI@TEST.COM" }
    ];
}

функсия тозакунии_корбар(корбар: корбари_хом): корбари_тоза {
    бозгашт {
        ном: корбар.ном.charAt(0).toUpperCase() + корбар.ном.slice(1),
        синну_сол: корбар.синну_сол,
        email: корбар.email.toLowerCase()
    };
}

функсия коркарди_маълумот(): корбари_тоза[] {
    бозгашт хондани_маълумот()
        .харита(тозакунии_корбар)
        .филтр(корбар => корбар.синну_сол >= 25);
}

тағйирёбанда натиҷа = коркарди_маълумот();
чоп.сабт(натиҷа);
```

## Next Steps

Now that you understand functions, continue with:

1. **[Control Flow](control-flow.md)** - Advanced conditionals and loops
2. **[Classes and Objects](classes-and-objects.md)** - Object-oriented
   programming
3. **[Advanced Types](advanced-types.md)** - Union types, generics, and more
4. **[Reference - Functions](../reference/function-declarations.md)** - Complete
   function reference

---

**Ready for control flow?** → [Control Flow](control-flow.md)
