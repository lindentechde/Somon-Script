# Console Methods - Quick Reference Card

**Perfect for keeping at your desk while coding SomonScript!**

---

## 📌 Basic Output

```somonscript
чоп.сабт(...)        // console.log()     - Standard output
чоп.хато(...)        // console.error()   - Error output
чоп.огоҳӣ(...)       // console.warn()    - Warning output
чоп.маълумот(...)    // console.info()    - Info messages
чоп.исфти(...)       // console.debug()   - Debug info
```

## ✅ Assertions

```somonscript
чоп.тасдиқ(условие, "сообщение")   // Throws if false
```

## 🔢 Counting

```somonscript
чоп.қайд('метка')           // Increment counter
чоп.қайд_асл('метка')       // Reset counter
```

## ⏱️ Timing

```somonscript
чоп.вақт('метка')            // Start timer
чоп.вақт_сабт('метка')       // Log elapsed time
чоп.вақт_охир('метка')       // End timer & log
```

## 📊 Display

```somonscript
чоп.ҷадвал(массив)           // Display as table
чоп.ҷадвал(массив, ['кол1', 'кол2'])  // Show specific columns
чоп.феҳрист(объект)          // List object properties
чоп.xml_феҳрист(элемент)     // Show XML structure (DOM)
```

## 🔍 Debugging

```somonscript
чоп.пайҷо('сообщение')       // Print stack trace
чоп.полиз()                   // Clear console
```

## 📦 Grouping

```somonscript
чоп.гуруҳ('название')        // Start collapsible group
чоп.гуруҳ_пӯшида('название') // Start collapsed group
чоп.гуруҳ_охир()              // End group
```

---

## 🎯 Real-World Examples

### Logging with context

```somonscript
тағйирёбанда корбар = { номи: 'Ғүфор', синну: 25 };
чоп.сабт('Корбари jorido:', корбар);
```

### Error handling

```somonscript
агар (!натиҷа) {
  чоп.хато('Хатоҳо бар паси амал:', хатоҳо);
}
```

### Performance testing

```somonscript
чоп.вақт('обработка');
// ... do something ...
чоп.вақт_охир('обработка');
// Output: обработка: 42.5ms
```

### Data inspection

```somonscript
чоп.ҷадвал(хариданҳо, ['номи', 'қиммат', 'сана']);
```

### Organized output

```somonscript
чоп.гуруҳ('Марҳалаи 1');
  чоп.сабт('Қадами 1');
  чоп.сабт('Қадами 2');
чоп.гуруҳ_охир();

чоп.гуруҳ_пӯшида('Марҳалаи 2');
  чоп.маълумот('Натиҷа:', натиҷа);
чоп.гуруҳ_охир();
```

---

## 🔑 Complete Method List

| Tajik                | JavaScript                 | Purpose         |
| -------------------- | -------------------------- | --------------- |
| `чоп.сабт()`         | `console.log()`            | Basic output    |
| `чоп.хато()`         | `console.error()`          | Error messages  |
| `чоп.огоҳӣ()`        | `console.warn()`           | Warnings        |
| `чоп.маълумот()`     | `console.info()`           | Info            |
| `чоп.исфти()`        | `console.debug()`          | Debug           |
| `чоп.тасдиқ()`       | `console.assert()`         | Assert          |
| `чоп.қайд()`         | `console.count()`          | Count           |
| `чоп.қайд_асл()`     | `console.countReset()`     | Reset count     |
| `чоп.вақт()`         | `console.time()`           | Timer start     |
| `чоп.вақт_сабт()`    | `console.timeLog()`        | Timer log       |
| `чоп.вақт_охир()`    | `console.timeEnd()`        | Timer end       |
| `чоп.ҷадвал()`       | `console.table()`          | Table format    |
| `чоп.феҳрист()`      | `console.dir()`            | Directory       |
| `чоп.xml_феҳрист()`  | `console.dirxml()`         | XML directory   |
| `чоп.пайҷо()`        | `console.trace()`          | Stack trace     |
| `чоп.полиз()`        | `console.clear()`          | Clear           |
| `чоп.гуруҳ()`        | `console.group()`          | Start group     |
| `чоп.гуруҳ_охир()`   | `console.groupEnd()`       | End group       |
| `чоп.гуруҳ_пӯшида()` | `console.groupCollapsed()` | Collapsed group |

---

## 💡 Tips

✨ **Output styles vary by environment:**

- Errors appear in red in browsers/terminals
- Warnings appear in yellow
- Tables format automatically
- Colors depend on console support

✨ **Method chaining:** Not supported directly, use multiple calls:

```somonscript
чоп.сабт('Линия 1');
чоп.сабт('Линия 2');
```

✨ **Performance:** Console calls are synchronous - heavy logging can slow your
program

✨ **Production:** Consider removing or disabling console.\* calls in production
code

---

## 📚 For More Information

- Full English Guide: `examples/CONSOLE_METHODS.md`
- Full Tajik Guide: `examples/CONSOLE_METHODS.tj.md`
- Full Russian Guide: `examples/CONSOLE_METHODS.ru.md`
- Simple Examples: `examples/console-log-simple.som`
- Advanced Examples: `examples/console-methods-guide.som`
