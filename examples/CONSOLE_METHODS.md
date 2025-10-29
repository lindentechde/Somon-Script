# SomonScript Console Methods - Методҳои Чоп

Complete reference guide for all console methods in SomonScript.

## Quick Reference Table

| JavaScript                 | SomonScript          | Tajik (Тоҷикӣ) | Purpose                   |
| -------------------------- | -------------------- | -------------- | ------------------------- |
| `console.log()`            | `чоп.сабт()`         | Ҷойи дохил     | General output to console |
| `console.error()`          | `чоп.хато()`         | Хатоҳо         | Error messages            |
| `console.warn()`           | `чоп.огоҳӣ()`        | Огоҳиҳо        | Warning messages          |
| `console.info()`           | `чоп.маълумот()`     | Маълумот       | Informational messages    |
| `console.debug()`          | `чоп.исфти()`        | Исфти          | Debug information         |
| `console.assert()`         | `чоп.тасдиқ()`       | Тасдиқ         | Assertion testing         |
| `console.count()`          | `чоп.қайд()`         | Ҳисоб          | Count occurrences         |
| `console.countReset()`     | `чоп.қайд_асл()`     | Ҳисоб асл      | Reset counter             |
| `console.time()`           | `чоп.вақт()`         | Вақт           | Start timer               |
| `console.timeLog()`        | `чоп.вақт_сабт()`    | Вақт сабт      | Log elapsed time          |
| `console.timeEnd()`        | `чоп.вақт_охир()`    | Вақт охир      | End timer                 |
| `console.table()`          | `чоп.ҷадвал()`       | Ҷадвал         | Table format output       |
| `console.dir()`            | `чоп.феҳрист()`      | Феҳрист        | List object properties    |
| `console.dirxml()`         | `чоп.xml_феҳрист()`  | XML феҳрист    | XML/DOM structure         |
| `console.trace()`          | `чоп.пайҷо()`        | Пайҷо          | Stack trace               |
| `console.clear()`          | `чоп.полиз()`        | Полиз          | Clear console             |
| `console.group()`          | `чоп.гуруҳ()`        | Гуруҳ          | Start output group        |
| `console.groupEnd()`       | `чоп.гуруҳ_охир()`   | Гуруҳ охир     | End output group          |
| `console.groupCollapsed()` | `чоп.гуруҳ_пӯшида()` | Гуруҳ пӯшида   | Collapsed group           |

---

## Detailed Usage Examples

### 1. **Basic Output (Натиҷаҳои Асосӣ)**

```somonscript
// Log message
чоп.сабт('Салом!');

// Log with multiple arguments
чоп.сабт('Номи:', 'Рефина', 'Синну:', 25);

// Log objects
тағйирёбанда шахс = { номи: 'Қаҳҳор', шахр: 'Душанбе' };
чоп.сабт('Шахс:', шахс);
```

**Output:**

```
Салом!
Номи: Рефина Синну: 25
Шахс: { номи: 'Қаҳҳор', шахр: 'Душанбе' }
```

---

### 2. **Error Handling (Роҳикомории Хатоҳо)**

```somonscript
чоп.хато('Хатои ҷанбии-ҷадам!');
чоп.хато('Кодо:', 500);
```

**Output (in red/highlighted):**

```
Хатои ҷанбии-ҷадам!
Кодо: 500
```

---

### 3. **Warnings (Огоҳиҳо)**

```somonscript
чоп.огоҳӣ('Функсияи куҳна!');
чоп.огоҳӣ('Истифода набарад');
```

**Output (in yellow/highlighted):**

```
Функсияи куҳна!
Истифода набарад
```

---

### 4. **Information (Маълумот)**

```somonscript
чоп.маълумот('Барнома шурӯъ шуд');
чоп.маълумот('Версия: 1.0.0');
```

**Output (informational style):**

```
Барнома шурӯъ шуд
Версия: 1.0.0
```

---

### 5. **Debug Information (Маълумоти Исфти)**

```somonscript
тағйирёбанда x = 10;
тағйирёбанда y = 20;
чоп.исфти('Қиматҳо:', { x, y });
```

**Output:**

```
Қиматҳо: { x: 10, y: 20 }
```

---

### 6. **Assertions (Тасдиқҳо)**

```somonscript
чоп.тасдиқ(2 + 2 === 4, 'Математика дуруст');
чоп.тасдиқ(5 > 10, 'Ин нодуруст аст');
```

**Output:**

```
// First assertion passes (no output if true)
// Second assertion fails:
Assertion failed: Ин нодуруст аст
```

---

### 7. **Counting (Ҳисобкунӣ)**

```somonscript
функсия функсия_фиалӣ() {
  чоп.ҳисоб('вызов');
}

функсия_фиалӣ();  // вызов: 1
функсия_фиалӣ();  // вызов: 2
функсия_фиалӣ();  // вызов: 3

чоп.қайд_асл('вызов');  // Reset counter
```

---

### 8. **Timing (Ҳисобкунии Вақт)**

```somonscript
чоп.вақт('шумора');

барои (тағйирёбанда i = 0; i < 1000000; i++) {
  // Operations
}

чоп.вақт_охир('шумора');
// Output: ҳисоб: 123.45ms

// Or with intermediate logging
чоп.вақт('эҳсоскунӣ');
чоп.вақт_сабт('эҳсоскунӣ', 'Марҳалаи 1 иҷро');
// More operations
чоп.вақт_охир('эҳсоскунӣ');
```

---

### 9. **Table Display (Намойиши Ҷадвал)**

```somonscript
тағйирёбанда ҳотими = [
  { номи: 'Қаҳҳор', синну: 25, шахр: 'Душанбе' },
  { номи: 'Рефина', синну: 23, шахр: 'Хуҷанд' },
  { номи: 'Фоҳима', синну: 27, шахр: 'Қургонтеппа' }
];

чоп.ҷадвал(ҳотими);

// Show only specific columns
чоп.ҷадвал(ҳотими, ['номи', 'синну']);
```

**Output:**

```
┌─────────┬──────────┬───────┬────────────────┐
│ (index) │ номи     │ синну │ шахр           │
├─────────┼──────────┼───────┼────────────────┤
│ 0       │ 'Қаҳҳор' │ 25    │ 'Душанбе'      │
│ 1       │ 'Рефина' │ 23    │ 'Хуҷанд'       │
│ 2       │ 'Фоҳима' │ 27    │ 'Қургонтеппа'  │
└─────────┴──────────┴───────┴────────────────┘
```

---

### 10. **Object Inspection (Тафқиқи Объектҳо)**

```somonscript
тағйирёбанда объект = {
  x: 10,
  y: 20,
  z: { а: 1, б: 2 }
};

// List all properties
чоп.феҳрист(объект);

// For DOM elements (if supported)
// чоп.xml_феҳрист(document.body);
```

---

### 11. **Stack Trace (Пайҷои Стакк)**

```somonscript
функсия сатҳи_аввал() {
  сатҳи_дуввум();
}

функсия сатҳи_дуввум() {
  сатҳи_сеюм();
}

функсия сатҳи_сеюм() {
  чоп.пайҷо('Стакк трас:');
}

сатҳи_аввал();
```

**Output:**

```
Стакк трас:
  at сатҳи_сеюм (file.som:line:col)
  at сатҳи_дуввум (file.som:line:col)
  at сатҳи_аввал (file.som:line:col)
```

---

### 12. **Grouping Output (Гуруҳбандии Натиҷаҳо)**

```somonscript
чоп.гуруҳ('Фасли 1');
чоп.сабт('Даромади 1.1');
чоп.сабт('Даромади 1.2');
чоп.гуруҳ_охир();

чоп.гуруҳ_пӯшида('Фасли 2 (қалаб)');
чоп.сабт('Даромади 2.1');
чоп.сабт('Даромади 2.2');
чоп.гуруҳ_охир();

чоп.сабт('Ҷалали муаллиф');
```

**Output (hierarchical):**

```
▼ Фасли 1
    Даромади 1.1
    Даромади 1.2
▶ Фасли 2 (қалаб)
Ҷалали муаллиф
```

---

### 13. **Clearing Console (Полизи Консол)**

```somonscript
чоп.сабт('Матни аввал');
чоп.сабт('Матни дуввум');

чоп.полиз();  // Clear all output

чоп.сабт('Матни навин (баъди пока)');
```

---

## Complete Example - Мисоли Мукаммал

```somonscript
функсия раҳгирӣ_веб_сохӣ(URL) {
  чоп.гуруҳ('Раҳгирӣ: ' + URL);
  чоп.вақт('раҳгирӣ');

  // Log info
  чоп.маълумот('URL: ' + URL);
  чоп.маълумот('Модаб: GET');

  // Simulated requests
  агар (URL) {
    чоп.тасдиқ(URL.дарозӣ > 0, 'URL муаллиқ');
  } вагарна {
    чоп.хато('URL беморубата');
  }

  // Debug values
  тағйирёбанда натиҷа = {
    статус: 200,
    вақти_ҷавоб: '145ms',
    андомазаҳо: 1024
  };

  чоп.ҷадвал(натиҷа);
  чоп.вақт_охир('раҳгирӣ');

  чоп.гуруҳ_охир();
}

раҳгирӣ_веб_сохӣ('https://example.com');
```

---

## Notes

- Most methods output to **stdout** (standard output)
- `console.error()` typically outputs to **stderr** (error stream)
- Methods like `time()`, `count()`, etc., maintain internal state
- Grouped output shows indentation in browsers and supporting environments
- Table formatting depends on the JavaScript engine capabilities

## See Also

- [JavaScript Console API](https://developer.mozilla.org/en-US/docs/Web/API/Console)
- [Node.js Console Documentation](https://nodejs.org/api/console.html)
- [SomonScript Examples](../examples)
