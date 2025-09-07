# Variables and Types

Master SomonScript's type system and learn how to work with variables, type
annotations, and complex data structures.

## Variable Declaration

### Basic Variable Types

SomonScript provides two ways to declare variables:

```somon
// Mutable variables (can be changed)
тағйирёбанда ном = "Аҳмад";
ном = "Фотима";  // ✅ This works

// Constants (cannot be changed)
собит синну_сол = 25;
// синну_сол = 26;  // ❌ Error: Cannot reassign constant
```

### Type Annotations

SomonScript supports optional type annotations for better code safety:

```somon
// Basic types with annotations
тағйирёбанда ном: сатр = "Аҳмад";
тағйирёбанда синну_сол: рақам = 25;
тағйирёбанда фаъол: мантиқӣ = дуруст;
```

## Primitive Types

### String Type (`сатр`)

```somon
// String declarations
тағйирёбанда ном: сатр = "Аҳмад";
тағйирёбанда фамилия: сатр = 'Аҳмадов';
тағйирёбанда маълумот: сатр = `Ном: ${ном} ${фамилия}`;

// String operations
тағйирёбанда салом = "Салом, " + ном + "!";
тағйирёбанда дарозӣ = ном.дарозии_сатр;
тағйирёбанда калон = ном.ба_калон();
```

### Number Type (`рақам`)

```somon
// Integer numbers
тағйирёбанда синну_сол: рақам = 25;
тағйирёбанда соли_таввалуд: рақам = 1998;

// Floating-point numbers
тағйирёбанда қад: рақам = 175.5;
тағйирёбанда ПИ: рақам = 3.14159;

// Mathematical operations
тағйирёбанда ҷамъ = синну_сол + 5;
тағйирёбанда зарб = қад * 2;
тағйирёбанда тақсим = синну_сол / 5;
```

### Boolean Type (`мантиқӣ`)

```somon
// Boolean values
тағйирёбанда фаъол: мантиқӣ = дуруст;
тағйирёбанда тамом: мантиқӣ = нодуруст;

// Boolean operations
тағйирёбанда калонсол = синну_сол >= 18;
тағйирёбанда навҷавон = синну_сол < 30 && синну_сол >= 18;
```

### Null Type (`холӣ`)

```somon
// Null values
тағйирёбанда натиҷа: сатр | холӣ = холӣ;
тағйирёбанда маълумот: рақам | холӣ = холӣ;

// Checking for null
агар (натиҷа != холӣ) {
    чоп.сабт("Натиҷа: " + натиҷа);
}
```

## Array Types

### Basic Arrays

```somon
// Array without type annotation
тағйирёбанда рақамҳо = [1, 2, 3, 4, 5];
тағйирёбанда номҳо = ["Аҳмад", "Фотима", "Ҳасан"];

// Array with type annotation
тағйирёбанда синнуСолҳо: рақам[] = [25, 30, 22, 35];
тағйирёбанда шаҳрҳо: сатр[] = ["Душанбе", "Хуҷанд", "Кӯлоб"];
```

### Array Operations

```somon
// Array methods
тағйирёбанда мевањо: сатр[] = ["себ", "банан", "гелос"];

// Adding elements
мевањо.илова("шафтолу");  // push
мевањо.дар_аввал_илова("помидор");  // unshift

// Removing elements
тағйирёбанда охирин = мевањо.баровардан();  // pop
тағйирёбанда аввалин = мевањо.аввалин_хориҷ();  // shift

// Array properties
чоп.сабт("Теъдоди мевањо: " + мевањо.дарозӣ);

// Array iteration
барои (тағйирёбанда и = 0; и < мевањо.дарозӣ; и++) {
    чоп.сабт("Мева " + и + ": " + мевањо[и]);
}
```

### Multi-dimensional Arrays

```somon
// 2D arrays
тағйирёбанда матрица: рақам[][] = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
];

// Accessing 2D array elements
чоп.сабт(матрица[0][0]);  // 1
чоп.сабт(матрица[1][2]);  // 6
```

## Object Types

### Basic Objects

```somon
// Object without type annotation
тағйирёбанда шахс = {
    ном: "Аҳмад",
    синну_сол: 25,
    шаҳр: "Душанбе",
    фаъол: дуруст
};

// Accessing object properties
чоп.сабт(шахс.ном);
чоп.сабт(шахс["синну_сол"]);

// Modifying object properties
шахс.синну_сол = 26;
шахс["шаҳр"] = "Хуҷанд";
```

### Typed Objects

```somon
// Object with interface-like typing
тағйирёбанда корбар: {
    ном: сатр,
    синну_сол: рақам,
    email?: сатр  // Optional property
} = {
    ном: "Фотима",
    синну_сол: 28
};

// Adding optional property later
корбар.email = "fotima@example.com";
```

## Union Types

Union types allow a variable to hold values of multiple types:

```somon
// Union types with |
тағйирёбанда маълумот: сатр | рақам = "Салом";
маълумот = 42;  // ✅ Both string and number are allowed

тағйирёбанда натиҷа: дуруст | нодуруст | сатр = дуруст;
натиҷа = "Муваффақ";  // ✅ Can change to string
```

### Practical Union Type Examples

```somon
// Function that accepts multiple types
функсия намоиш(қимат: сатр | рақам | мантиқӣ): сатр {
    бозгашт "Қимат: " + қимат;
}

чоп.сабт(намоиш("Салом"));    // "Қимат: Салом"
чоп.сабт(намоиш(42));         // "Қимат: 42"
чоп.сабт(намоиш(дуруст));     // "Қимат: дуруст"

// Array with union types
тағйирёбанда маълумотҳо: (сатр | рақам)[] = ["Аҳмад", 25, "Душанбе", 1998];
```

## Intersection Types

Intersection types combine multiple types:

```somon
// Define base types
тағйирёбанда корбар = {
    ном: "Аҳмад",
    синну_сол: 25
};

тағйирёбанда админ = {
    сатҳи_дастрасӣ: "олӣ",
    рамзи_убур: "секret123"
};

// Intersection type (combining properties)
тағйирёбанда супер_корбар: typeof корбар & typeof админ = {
    ном: "Аҳмад",
    синну_сол: 25,
    сатҳи_дастрасӣ: "олӣ",
    рамзи_убур: "secret123"
};
```

## Tuple Types

Tuples are arrays with fixed length and specific types for each position:

```somon
// Basic tuple
тағйирёбанда корбар_маълумот: [сатр, рақам, мантиқӣ] = ["Алӣ", 25, дуруст];

// Accessing tuple elements
чоп.сабт(корбар_маълумот[0]);  // "Алӣ"
чоп.сабт(корбар_маълумот[1]);  // 25
чоп.сабт(корбар_маълумот[2]);  // дуруст

// Tuple array (array of tuples)
тағйирёбанда координатаҳо: [рақам, рақам][] = [
    [10, 20],
    [30, 40],
    [50, 60]
];
```

## Type Checking and Validation

### Runtime Type Checking

```somon
функсия тафтиши_навъ(қимат: ҳарчӣ): сатр {
    агар (typeof қимат == "сатр") {
        бозгашт "Ин сатр аст";
    } вагарна агар (typeof қимат == "рақам") {
        бозгашт "Ин рақам аст";
    } вагарна агар (typeof қимат == "мантиқӣ") {
        бозгашт "Ин мантиқӣ аст";
    } вагарна {
        бозгашт "Навъи номаълум";
    }
}

чоп.сабт(тафтиши_навъ("Салом"));  // "Ин сатр аст"
чоп.сабт(тафтиши_навъ(42));       // "Ин рақам аст"
```

### Type Guards

```somon
// Type guard function
функсия сатр_аст(қимат: ҳарчӣ): қимат is сатр {
    бозгашт typeof қимат === "сатр";
}

функсия коркарди_маълумот(қимат: сатр | рақам): сатр {
    агар (сатр_аст(қимат)) {
        // TypeScript knows this is a string
        бозгашт қимат.ба_калон();
    } вагарна {
        // TypeScript knows this is a number
        бозгашт қимат.toString();
    }
}
```

## Advanced Type Features

### Optional Properties

```somon
// Object with optional properties
тағйирёбанда танзимот: {
    ном: сатр,
    синну_сол?: рақам,     // Optional
    email?: сатр,          // Optional
    фаъол: мантиқӣ
} = {
    ном: "Аҳмад",
    фаъол: дуруст
    // синну_сол and email can be omitted
};

// Adding optional properties later
танзимот.синну_сол = 25;
танзимот.email = "ahmad@example.com";
```

### Function Types

```somon
// Function type annotations
тағйирёбанда ҳисобгар: (а: рақам, б: рақам) => рақам = (а, б) => а + б;

// Function as parameter
функсия татбиқи_амал(а: рақам, б: рақам, амал: (х: рақам, у: рақам) => рақам): рақам {
    бозгашт амал(а, б);
}

тағйирёбанда натиҷа = татбиқи_амал(5, 3, ҳисобгар);
чоп.сабт(натиҷа);  // 8
```

## Type Inference

SomonScript can often infer types automatically:

```somon
// Type inference (no explicit type needed)
тағйирёбанда ном = "Аҳмад";          // Inferred as сатр
тағйирёбанда синну_сол = 25;         // Inferred as рақам
тағйирёбанда фаъол = дуруст;         // Inferred as мантиқӣ
тағйирёбанда рӯйхат = [1, 2, 3];     // Inferred as рақам[]

// Function return type inference
функсия ҷамъ(а: рақам, б: рақам) {   // Return type inferred as рақам
    бозгашт а + б;
}
```

## Common Type Patterns

### Conditional Assignment

```somon
// Conditional assignment based on type
тағйирёбанда ворудӣ: сатр | рақам = "42";
тағйирёбанда натиҷа: рақам;

агар (typeof ворудӣ === "сатр") {
    натиҷа = parseInt(ворудӣ);
} вагарна {
    натиҷа = ворудӣ;
}
```

### Default Values

```somon
// Function with default values
функсия эҷоди_корбар(
    ном: сатр,
    синну_сол: рақам = 18,
    шаҳр: сатр = "Душанбе"
): объекти_корбар {
    бозгашт {
        ном: ном,
        синну_сол: синну_сол,
        шаҳр: шаҳр
    };
}

тағйирёбанда корбар1 = эҷоди_корбар("Аҳмад");
тағйирёбанда корбар2 = эҷоди_корбар("Фотима", 25, "Хуҷанд");
```

## Working with Complex Data

### Nested Objects

```somon
тағйирёбанда компания = {
    ном: "ТехКом",
    нишонӣ: {
        кӯча: "Хиёбони Рӯдакӣ 12",
        шаҳр: "Душанбе",
        кишвар: "Тоҷикистон"
    },
    кормандон: [
        {
            ном: "Аҳмад",
            вазифа: "Барномасоз",
            маош: 2000
        },
        {
            ном: "Фотима",
            вазифа: "Дизайнер",
            маош: 1800
        }
    ]
};

// Accessing nested data
чоп.сабт(компания.нишонӣ.шаҳр);
чоп.сабт(компания.кормандон[0].ном);
```

### Array of Objects

```somon
тағйирёбанда донишҷӯён: {
    ном: сатр,
    синну_сол: рақам,
    курс: рақам,
    бахоҳо: рақам[]
}[] = [
    {
        ном: "Алӣ",
        синну_сол: 20,
        курс: 2,
        бахоҳо: [85, 90, 88]
    },
    {
        ном: "Марям",
        синну_сол: 19,
        курс: 1,
        бахоҳо: [92, 88, 95]
    }
];

// Processing array of objects
барои (тағйирёбанда донишҷӯ of донишҷӯён) {
    тағйирёбанда миёнаи_бахо = донишҷӯ.бахоҳо.reduce((ҷамъ, бахо) => ҷамъ + бахо, 0) / донишҷӯ.бахоҳо.дарозӣ;
    чоп.сабт(донишҷӯ.ном + ": " + миёнаи_бахо);
}
```

## Best Practices

### 1. Use Type Annotations

```somon
// ✅ Good: Clear type annotations
функсия ҳисоби_маош(соатҳо: рақам, нарх_соат: рақам): рақам {
    бозгашт соатҳо * нарх_соат;
}

// ❌ Avoid: No type information
функсия ҳисоби_маош(соатҳо, нарх_соат) {
    бозгашт соатҳо * нарх_соат;
}
```

### 2. Use Union Types for Flexibility

```somon
// ✅ Good: Union types for multiple valid values
тағйирёбанда ҳолат: "кушод" | "пӯшида" | "дар_интизор" = "кушод";

// ❌ Avoid: Too permissive
тағйирёбанда ҳолат: сатр = "кушод";
```

### 3. Use Optional Properties

```somon
// ✅ Good: Clear optional properties
интерфейс Танзимот {
    равшанӣ: рақам;
    садо?: рақам;        // Optional
    забон?: сатр;        // Optional
}
```

## Next Steps

Now that you understand variables and types, continue with:

1. **[Functions](functions.md)** - Master function definitions and usage
2. **[Control Flow](control-flow.md)** - Advanced conditionals and loops
3. **[Classes and Objects](classes-and-objects.md)** - Object-oriented
   programming
4. **[Reference - Data Types](../reference/data-types.md)** - Complete type
   reference

---

**Ready to learn functions?** → [Functions](functions.md)
