# SomonScript Best Practices

This guide outlines industry-standard coding guidelines and best practices for
writing clean, maintainable, and efficient SomonScript code.

## Table of Contents

1. [Code Style and Formatting](#code-style-and-formatting)
2. [Naming Conventions](#naming-conventions)
3. [Type Safety](#type-safety)
4. [Function Design](#function-design)
5. [Class Design](#class-design)
6. [Error Handling](#error-handling)
7. [Performance](#performance)
8. [Module Organization](#module-organization)
9. [Testing](#testing)
10. [Documentation](#documentation)

## Code Style and Formatting

### General Formatting

```som
// ✅ Good: Consistent indentation (2 spaces)
агар шарт {
  тағйирёбанда натиҷа = ҳисоб_кардан();
  агар натиҷа > 0 {
    чоп.сабт("Мусбат");
  }
}

// ❌ Bad: Inconsistent indentation
агар шарт {
    тағйирёбанда натиҷа = ҳисоб_кардан();
      агар натиҷа > 0 {
      чоп.сабт("Мусбат");
    }
}
```

### Line Length and Breaks

```som
// ✅ Good: Break long lines logically
тағйирёбанда паёми_дароз =
  "Ин паёми хеле дароз аст ва бояд " +
  "ба якчанд сатр тақсим шавад " +
  "то хондан осон бошад.";

// ✅ Good: Break function parameters
функсия корбар_эҷод_кардан(
  ном: сатр,
  синну_сол: рақам,
  email: сатр,
  нишонӣ: сатр
): Корбар {
  // implementation
}

// ❌ Bad: Too long line
тағйирёбанда паёми_дароз = "Ин паёми хеле дароз аст ва бояд ба якчанд сатр тақсим шавад то хондан осон бошад ва стандарти кодгузорӣ риоя шавад.";
```

### Spacing and Brackets

```som
// ✅ Good: Consistent spacing
тағйирёбанда натиҷа = (а + б) * с;

агар (х > 0 && у < 10) {
  тағйирёбанда ҷавоб = ҳисоб_кардан(х, у);
}

// ❌ Bad: Inconsistent spacing
тағйирёбанда натиҷа=(а+б)*с;

агар(х>0&&у<10){
  тағйирёбанда ҷавоб=ҳисоб_кардан(х,у);
}
```

## Naming Conventions

### Variables and Functions

```som
// ✅ Good: Descriptive, camelCase in Tajik
тағйирёбанда номиКорбар = "Анвар";
тағйирёбанда синнуСолиКорбар = 25;
тағйирёбанда рўйхатиМаҳсулот = [];

функсия корбар_эҷод_кардан(номи_корбар: сатр): Корбар {
  // implementation
}

функсия маълумоти_корбар_гирифтан(идентификатор: сатр): Promise<Корбар> {
  // implementation
}

// ❌ Bad: Unclear, abbreviated
тағйирёбанда н = "Анвар";
тағйирёбанда с = 25;
тағйирёбанда р = [];

функсия кр(н: сатр): Корбар {
  // implementation
}
```

### Constants

```som
// ✅ Good: UPPER_CASE for module-level constants
собит МАКС_СИННУ_СОЛ = 120;
собит НУСХАИ_БАРНОМА = "1.0.0";
собит СУРОҒАИ_API = "https://api.example.com";

// ✅ Good: Local constants can be camelCase
функсия ҳисоб_кардан() {
  собит коэффисиенти_тахфиф = 0.1;
  собит андозаи_пешфарз = 100;
}

// ❌ Bad: Inconsistent naming
собит максСинну = 120;
собит nuskhaiBarNoma = "1.0.0";
```

### Classes and Interfaces

```som
// ✅ Good: PascalCase with descriptive names
синф КорбариАсосӣ {
  // implementation
}

синф МудириМаҳсулот мерос_мебарад КорбариАсосӣ {
  // implementation
}

интерфейс ТанзимотиБарнома {
  нусха: сатр;
  мҳитӣ: сатр;
  хусусиятҳо: ХусусиятҳоиБарнома;
}

// ❌ Bad: Unclear or inconsistent
синф корбар {
  // implementation
}

синф mngr мерос_мебарад корбар {
  // implementation
}
```

## Type Safety

### Always Use Explicit Types

```som
// ✅ Good: Explicit types for parameters and return values
функсия ҳисоби_фоиз(маблағ: рақам, фоиз: рақам): рақам {
  бозгашт маблағ * (фоиз / 100);
}

функсия корбар_ёфтан(идентификатор: сатр): Promise<Корбар | ҳеҷ> {
  // implementation
}

// ❌ Bad: Missing types
функсия ҳисоби_фоиз(маблағ, фоиз) {
  бозгашт маблағ * (фоиз / 100);
}
```

### Use Union Types Effectively

```som
// ✅ Good: Specific union types
тағйирёбанда статус: "барқарор" | "хомӯш" | "дар_интизор" = "хомӯш";

функсия коркарди_маълумот(
  маълумот: сатр | рақам | мантиқӣ
): сатр {
  агар typeof маълумот === "сатр" {
    бозгашт маълумот.toUpperCase();
  } вагарна агар typeof маълумот === "рақам" {
    бозгашт маълумот.toString();
  } вагарна {
    бозгашт маълумот ? "рост" : "нодуруст";
  }
}

// ❌ Bad: Overly broad types
тағйирёбанда статус: ҳамаи_ҷур = "барқарор";
функсия коркарди_маълумот(маълумот: ҳамаи_ҷур): ҳамаи_ҷур {
  // implementation
}
```

### Prefer Interfaces Over Type Aliases

```som
// ✅ Good: Interfaces for object shapes
интерфейс Корбар {
  идентификатор: сатр;
  ном: сатр;
  синну_сол: рақам;
  email?: сатр;
  фаъол: мантиқӣ;
}

интерфейс ТанзимотиКорбар {
  огоҳӣҳо: мантиқӣ;
  забони_пешфарз: сатр;
  мавзўъ: "равшан" | "торик";
}

// ✅ Acceptable: Type aliases for unions or computed types
навъ ИдентификаторИ_корбар = сатр | рақам;
навъ ХусусиятҳоиКорбар = keyof Корбар;
```

## Function Design

### Single Responsibility Principle

```som
// ✅ Good: Each function has one clear purpose
функсия тасдиқи_email(email: сатр): мантиқӣ {
  собит намуна = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  бозгашт намуна.test(email);
}

функсия корбари_нав_эҷод_кардан(
  ном: сатр,
  email: сатр
): Promise<Корбар> {
  агар (!тасдиқи_email(email)) {
    партофтан нав Хато("Email нодуруст аст");
  }

  бозгашт database.корбар_эҷод_кардан({ ном, email });
}

// ❌ Bad: Function doing too many things
функсия корбари_нав_эҷод_кардан_ва_тасдиқ(
  ном: сатр,
  email: сатр
): Promise<Корбар> {
  // Validation
  собит намунаи_email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  агар (!намунаи_email.test(email)) {
    партофтан нав Хато("Email нодуруст аст");
  }

  // Create user
  тағйирёбанда корбар = database.корбар_эҷод_кардан({ ном, email });

  // Send welcome email
  email_service.хуш_омадед_фиристодан(email, ном);

  // Log activity
  logger.сабт_кардан("Корбари нав эҷод шуд", { ном, email });

  бозгашт корбар;
}
```

### Pure Functions When Possible

```som
// ✅ Good: Pure function (no side effects)
функсия ҳисоби_андоз(маблағ: рақам, нархи_андоз: рақам): рақам {
  бозгашт маблағ * нархи_андоз;
}

функсия форматкунии_ном(ном: сатр): сатр {
  бозгашт ном.trim().toLowerCase()
    .replace(/\b\w/g, ҳарф => ҳарф.toUpperCase());
}

// ❌ Bad: Function with side effects
тағйирёбанда ҷамъи_умумӣ = 0;
функсия илова_ба_ҷамъ(маблағ: рақам): рақам {
  ҷамъи_умумӣ += маблағ; // Side effect
  чоп.сабт("Илова шуд:", маблағ); // Side effect
  бозгашт ҷамъи_умумӣ;
}
```

### Function Parameters

```som
// ✅ Good: Limited parameters with clear types
функсия корбар_эҷод_кардан(
  ном: сатр,
  email: сатр,
  танзимот?: ТанзимотиКорбар
): Promise<Корбар> {
  // implementation
}

// ✅ Good: Use object for many parameters
интерфейс ПараметрҳоиЭҷодиКорбар {
  ном: сатр;
  email: сатр;
  синну_сол?: рақам;
  нишонӣ?: сатр;
  телефон?: сатр;
}

функсия корбар_эҷод_кардани_пурра(
  параметрҳо: ПараметрҳоиЭҷодиКорбар
): Promise<Корбар> {
  // implementation
}

// ❌ Bad: Too many parameters
функсия корбар_эҷод_кардан(
  ном: сатр,
  email: сатр,
  синну_сол: рақам,
  нишонӣ: сатр,
  телефон: сатр,
  шаҳр: сатр,
  кишвар: сатр,
  рамзи_почта: сатр
): Promise<Корбар> {
  // implementation
}
```

## Class Design

### Clear Encapsulation

```som
// ✅ Good: Proper encapsulation with clear access levels
синф Ҳисобдор {
  хосусӣ баланс: рақам;
  хосусӣ рақами_ҳисоб: сатр;
  хосусӣ соҳиби_ҳисоб: сатр;

  конструктор(соҳиби_ҳисоб: сатр, рақами_ҳисоб: сатр) {
    ин.соҳиби_ҳисоб = соҳиби_ҳисоб;
    ин.рақами_ҳисоб = рақами_ҳисоб;
    ин.баланс = 0;
  }

  ҷамъиятӣ пул_гузоштан(маблағ: рақам): ҳеҷ {
    агар (маблағ <= 0) {
      партофтан нав Хато("Маблағ бояд мусбат бошад");
    }
    ин.баланс += маблағ;
  }

  ҷамъиятӣ баланс_гирифтан(): рақам {
    бозгашт ин.баланс;
  }

  хосусӣ тасдиқи_маблағ(маблағ: рақам): мантиқӣ {
    бозгашт маблағ > 0 && маблағ <= ин.баланс;
  }
}

// ❌ Bad: All properties public
синф Ҳисобдор {
  ҷамъиятӣ баланс: рақам;
  ҷамъиятӣ рақами_ҳисоб: сатр;
  ҷамъиятӣ соҳиби_ҳисоб: сатр;

  конструктор(соҳиби_ҳисоб: сатр, рақами_ҳисоб: сатр) {
    ин.соҳиби_ҳисоб = соҳиби_ҳисоб;
    ин.рақами_ҳисоб = рақами_ҳисоб;
    ин.баланс = 0;
  }
}
```

### Composition Over Inheritance

```som
// ✅ Good: Using composition
интерфейс ОгоҳкунандаиEmail {
  огоҳӣ_фиристодан(паём: сатр, нишона: сатр): Promise<мантиқӣ>;
}

интерфейс ОгоҳкунандаиSMS {
  sms_фиристодан(паём: сатр, рақами_телефон: сатр): Promise<мантиқӣ>;
}

синф ХидматиОгоҳӣ {
  хосусӣ огоҳкунандаи_email: ОгоҳкунандаиEmail;
  хосусӣ огоҳкунандаи_sms: ОгоҳкунандаиSMS;

  конструктор(
    огоҳкунандаи_email: ОгоҳкунандаиEmail,
    огоҳкунандаи_sms: ОгоҳкунандаиSMS
  ) {
    ин.огоҳкунандаи_email = огоҳкунандаи_email;
    ин.огоҳкунандаи_sms = огоҳкунандаи_sms;
  }

  ҷамъиятӣ огоҳӣ_фиристодан(
    паём: сатр,
    навъ: "email" | "sms",
    нишона: сатр
  ): Promise<мантиқӣ> {
    агар (навъ === "email") {
      бозгашт ин.огоҳкунандаи_email.огоҳӣ_фиристодан(паём, нишона);
    } вагарна {
      бозгашт ин.огоҳкунандаи_sms.sms_фиристодан(паём, нишона);
    }
  }
}
```

## Error Handling

### Use Specific Error Types

```som
// ✅ Good: Custom error types
синф ХатоиТасдиқ мерос_мебарад Хато {
  конструктор(майдон: сатр, қимат: ҳамаи_ҷур) {
    супер(`Қимати "${қимат}" барои майдони "${майдон}" нодуруст аст`);
    ин.ном = "ХатоиТасдиқ";
  }
}

синф ХатоиШабака мерос_мебарад Хато {
  ҷамъиятӣ кодиСтатус: рақам;

  конструктор(паём: сатр, кодиСтатус: рақам) {
    супер(паём);
    ин.ном = "ХатоиШабака";
    ин.кодиСтатус = кодиСтатус;
  }
}

// Usage
функсия тасдиқи_синну_сол(синну_сол: рақам): ҳеҷ {
  агар (синну_сол < 0 || синну_сол > 150) {
    партофтан нав ХатоиТасдиқ("синну_сол", синну_сол);
  }
}
```

### Proper Error Handling

```som
// ✅ Good: Comprehensive error handling
ҳамзамон функсия корбар_гирифтан(идентификатор: сатр): Promise<Корбар> {
  кӯшиш {
    тасдиқи_идентификатор(идентификатор);

    тағйирёбанда корбар = интизор database.корбар_ёфтан(идентификатор);

    агар (!корбар) {
      партофтан нав ХатоиНаёфтан(`Корбар бо ID ${идентификатор} ёфт нашуд`);
    }

    бозгашт корбар;

  } гирифтан (хато) {
    агар (хато instanceof ХатоиТасдиқ) {
      чоп.огоҳӣ("Хатои тасдиқ:", хато.паём);
      партофтан хато;
    } вагарна агар (хато instanceof ХатоиШабака) {
      чоп.хато("Хатои шабака:", хато.паём);
      партофтан нав Хато("Хатои дохилӣ дар гирифтани корбар");
    } вагарна {
      чоп.хато("Хатои номаълум:", хато);
      партофтан нав Хато("Хатои дохилии сервер");
    }
  }
}

// ❌ Bad: Catching and ignoring errors
ҳамзамон функсия корбар_гирифтан(идентификатор: сатр): Promise<Корбар | ҳеҷ> {
  кӯшиш {
    бозгашт интизор database.корбар_ёфтан(идентификатор);
  } гирифтан (хато) {
    // Silently ignoring errors is bad practice
    бозгашт ҳеҷ;
  }
}
```

## Performance

### Avoid Premature Optimization

```som
// ✅ Good: Clear, readable code first
функсия ҳисоби_миёнаи_қиматҳо(қиматҳо: рақам[]): рақам {
  агар (қиматҳо.length === 0) {
    партофтан нав Хато("Рўйхат холӣ аст");
  }

  тағйирёбанда ҷамъ = 0;
  барои тағйирёбанда қимат аз қиматҳо {
    ҷамъ += қимат;
  }

  бозгашт ҷамъ / қиматҳо.length;
}

// ✅ Good: Optimized when needed (with comments)
функсия ҳисоби_миёнаи_қиматҳои_калон(қиматҳо: рақам[]): рақам {
  // Optimization for large arrays: single pass instead of two
  агар (қиматҳо.length === 0) {
    партофтан нав Хато("Рўйхат холӣ аст");
  }

  тағйирёбанда ҷамъ = 0;
  собит андоза = қиматҳо.length;

  // Use for loop for better performance with large arrays
  барои тағйирёбанда и = 0; и < андоза; и++ {
    ҷамъ += қиматҳо[и];
  }

  бозгашт ҷамъ / андоза;
}
```

### Memory Management

```som
// ✅ Good: Efficient array operations
функсия коркарди_маълумоти_калон(маълумот: рақам[]): рақам[] {
  // Use map for transformations
  бозгашт маълумот
    .filter(қ => қ > 0)
    .map(қ => қ * 2)
    .slice(0, 1000); // Limit result size
}

// ❌ Bad: Creating unnecessary intermediate arrays
функсия коркарди_маълумоти_калон(маълумот: рақам[]): рақам[] {
  тағйирёбанда натиҷа = [];
  барои тағйирёбанда элемент аз маълумот {
    агар (элемент > 0) {
      натиҷа.push(элемент * 2);
    }
  }
  бозгашт натиҷа;
}
```

## Module Organization

### Clear Module Structure

```som
// math.som - Export related functionality together
/**
 * Mathematical utility functions
 */

содор собит ПИ = 3.14159265359;
содор собит E = 2.71828182846;

содор функсия ҷамъ(а: рақам, б: рақам): рақам {
  бозгашт а + б;
}

содор функсия қувват(асос: рақам, нишондоди: рақам): рақам {
  бозгашт Math.pow(асос, нишондоди);
}

содор функсия дуръшака(рақам: рақам): рақам {
  агар (рақам < 0) {
    партофтан нав Хато("Дуръшакаи рақами манфӣ вуҷуд надорад");
  }
  бозгашт Math.sqrt(рақам);
}

// Default export for main functionality
содор пешфарз синф РиёзӣКунҷ {
  собити ПИ = ПИ;
  собити E = E;

  ҷамъ = ҷамъ;
  қувват = қувват;
  дуръшака = дуръшака;
}
```

### Proper Imports

```som
// ✅ Good: Explicit, organized imports
ворид { ПИ, ҷамъ, дуръшака } аз "./math";
ворид { ХатоиТасдиқ, ХатоиШабака } аз "./errors";
ворид { Корбар, ТанзимотиКорбар } аз "./types";

// Group imports by source
ворид * чун fs аз "fs";
ворид * чун path аз "path";

ворид РиёзӣКунҷ аз "./math";

// ❌ Bad: Mixed import styles and unclear grouping
ворид { ПИ } аз "./math";
ворид * чун fs аз "fs";
ворид { Корбар } аз "./types";
ворид { ҷамъ } аз "./math";
ворид * чун path аз "path";
```

## Testing

### Write Testable Code

```som
// ✅ Good: Easy to test (pure functions, dependency injection)
синф ХидматиКорбар {
  хосусӣ намунаи_корбар: НамунаиКорбар;
  хосусӣ огоҳкунанда: ОгоҳкунандаиEmail;

  конструктор(
    намунаи_корбар: НамунаиКорбар,
    огоҳкунанда: ОгоҳкунандаиEmail
  ) {
    ин.намунаи_корбар = намунаи_корбар;
    ин.огоҳкунанда = огоҳкунанда;
  }

  ҷамъиятӣ ҳамзамон корбар_эҷод_кардан(
    маълумоти_корбар: МаълумотиКорбар
  ): Promise<Корбар> {
    тасдиқи_маълумоти_корбар(маълумоти_корбар);

    тағйирёбанда корбар = интизор ин.намунаи_корбар.эҷод_кардан(маълумоти_корбар);

    интизор ин.огоҳкунанда.хуш_омадед_фиристодан(
      корбар.email,
      корбар.ном
    );

    бозгашт корбар;
  }
}

// Supporting pure function (easy to unit test)
содор функсия тасдиқи_маълумоти_корбар(
  маълумот: МаълумотиКорбар
): ҳеҷ {
  агар (!маълумот.ном || маълумот.ном.trim().length === 0) {
    партофтан нав ХатоиТасдиқ("ном", "Ном хеҷ буда наметавонад");
  }

  агар (!тасдиқи_email(маълумот.email)) {
    партофтан нав ХатоиТасдиқ("email", "Формати email нодуруст");
  }
}
```

### Test Organization

```som
// user-service.test.som
ворид { ХидматиКорбар, тасдиқи_маълумоти_корбар } аз "./user-service";
ворид { МокиНамунаиКорбар, МокиОгоҳкунандаиEmail } аз "./mocks";

describe("ХидматиКорбар", () => {
  тағйирёбанда хидмат: ХидматиКорбар;
  тағйирёбанда моки_намуна: МокиНамунаиКорбар;
  тағйирёбанда моки_огоҳкунанда: МокиОгоҳкунандаиEmail;

  beforeEach(() => {
    моки_намуна = нав МокиНамунаиКорбар();
    моки_огоҳкунанда = нав МокиОгоҳкунандаиEmail();
    хидмат = нав ХидматиКорбар(моки_намуна, моки_огоҳкунанда);
  });

  test("корбар_эҷод_кардан бояд корбар созад", ҳамзамон () => {
    // Arrange
    собит маълумоти_корбар = {
      ном: "Анвар Саидов",
      email: "anvar@example.com"
    };

    // Act
    тағйирёбанда корбар = интизор хидмат.корбар_эҷод_кардан(маълумоти_корбар);

    // Assert
    expect(корбар).toBeDefined();
    expect(корбар.ном).toBe("Анвар Саидов");
    expect(моки_огоҳкунанда.хуш_омадед_фиристодан).toHaveBeenCalled();
  });
});
```

## Documentation

### Code Comments

````som
/**
 * Ҳисоб кардани миёнаи қиматҳои рақамӣ
 *
 * @param қиматҳо - Рўйхати рақамҳо барои ҳисоб кардани миёна
 * @returns Қимати миёнаи ҳисобӣ
 * @throws ХатоиПараметр агар рўйхат холӣ бошад
 *
 * @example
 * ```som
 * тағйирёбанда миёна = ҳисоби_миёна([1, 2, 3, 4, 5]);
 * чоп.сабт(миёна); // 3
 * ```
 */
содор функсия ҳисоби_миёна(қиматҳо: рақам[]): рақам {
  агар (қиматҳо.length === 0) {
    партофтан нав ХатоиПараметр("Рўйхат барои ҳисоби миёна холӣ буда наметавонад");
  }

  // Ҷамъ кардани ҳамаи қиматҳо
  тағйирёбанда ҷамъ = 0;
  барои тағйирёбанда қимат аз қиматҳо {
    ҷамъ += қимат;
  }

  // Тақсим ба миқдори элементҳо
  бозгашт ҷамъ / қиматҳо.length;
}
````

### README and Documentation

````som
// README.som for modules
/**
 * # Модули Ҳисоботи Малиявӣ
 *
 * Ин модул функсияҳои ҳисоботи молиявӣ ва таҳлили маълумотро фароҳам меорад.
 *
 * ## Истифода
 *
 * ```som
 * ворид { ҲисобкуниМолиявӣ } аз "./financial-calculator";
 *
 * тағйирёбанда ҳисобкун = нав ҲисобкуниМолиявӣ();
 * тағйирёбанда фоиз = ҳисобкун.ҳисоби_фоизи_солона(1000, 0.05, 2);
 * ```
 *
 * ## API
 *
 * ### ҲисобкуниМолиявӣ
 *
 * Синфи асосӣ барои ҳисобҳои молиявӣ.
 *
 * #### Усулҳо
 *
 * - `ҳисоби_фоизи_солона(маблағ, нарх, солҳо)` - Ҳисоби фоизи мураккаб
 * - `ҳисоби_пардохтҳои_оинаам(маблағ, нарх, муддат)` - Ҳисоби пардохтҳои моҳвор
 *
 * ## Талабот
 *
 * - SomonScript 0.2.57+
 * - Node.js 20.x or 22.x
 */
````

## Summary

Following these best practices will help you write:

- **Readable Code**: Clear naming and consistent formatting
- **Maintainable Code**: Proper separation of concerns and modular design
- **Reliable Code**: Comprehensive error handling and type safety
- **Testable Code**: Pure functions and dependency injection
- **Performant Code**: Efficient algorithms and memory usage
- **Well-Documented Code**: Clear comments and documentation

Remember: **Code is read more often than it's written**. Always prioritize
clarity and maintainability over cleverness.

For more specific guidance, see:

- [Architecture Guide](../explanation/architecture.md)
- [Testing Guide](../explanation/testing.md)
- [Language Reference](../reference/)

---

_These guidelines are based on industry best practices adapted for SomonScript
development._
