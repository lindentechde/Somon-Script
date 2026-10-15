# Lesson 2. Errors and comments

**In this lesson:** you will read an error message and fix the error; you will
write a comment in a program.

## Errors are normal

All programmers make mistakes. What matters is that you can read the error
message and fix the error. This program has an error. Run it:

```text
тағ синну = 15;
агр (синну > 14) {
  чоп("Шумо метавонед бозӣ кунед");
}
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGB0LjQvdC90YMgPSAxNTsK0LDQs9GAICjRgdC40L3QvdGDID4gMTQpIHsKICDRh9C-0L8oItCo0YPQvNC-INC80LXRgtCw0LLQvtC90LXQtCDQsdC-0LfToyDQutGD0L3QtdC0Iik7Cn0K)

The playground (in Tajik) will say:

```text
Хато дар сатри 2:
  Дар ин ҷо `{` интизор набуд: шояд пеш аз он `;` намерасад.
    2 | агр (синну > 14) {
      |                  ^
  Маслиҳат: Шояд `агар`-ро дар назар доштед?
Барнома компайл нашуд: 1 хато.
```

This is how to read the message:

1. **Хато дар сатри 2** means "error on line 2". The number of this line, to the
   left of the program, turns red.
2. Next comes **what is wrong**.
3. The line of the program and the `^` sign show **where exactly in the line**.
4. **Маслиҳат** is a hint on how to fix it. Here `агар` ("if") is spelled wrong:
   `агр`.

The playground page is in Tajik and Russian. If you switch it to Russian, the
messages will be in Russian too. Replace `агр` with `агар` and run it again.

## Errors while the program runs

Some errors appear only while the program is running. They are called **runtime
errors** (`Хатои иҷро`):

```som
тағ номҳо = ["Алӣ", "Зарина", "Фарҳод"];
чоп(номҳо[5].дарозӣ);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC90L7QvNKz0L4gPSBbItCQ0LvToyIsICLQl9Cw0YDQuNC90LAiLCAi0KTQsNGA0rPQvtC0Il07CtGH0L7QvyjQvdC-0LzSs9C-WzVdLtC00LDRgNC-0LfToyk7Cg)

The playground will say "Хатои иҷро дар сатри 2" ("runtime error on line 2"),
tell you what happened, and give a hint. We will understand errors like this
better in the next lessons.

## Comments

A comment is text that the computer does not run. It is written for people:

```som
// This program prints a greeting
чоп("Салом!"); // a comment can be at the end of a line

/* A comment
   on several lines */
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=Ly8gVGhpcyBwcm9ncmFtIHByaW50cyBhIGdyZWV0aW5nCtGH0L7Qvygi0KHQsNC70L7QvCEiKTsgLy8gYSBjb21tZW50IGNhbiBiZSBhdCB0aGUgZW5kIG9mIGEgbGluZQoKLyogQSBjb21tZW50CiAgIG9uIHNldmVyYWwgbGluZXMgKi8K)

- `//` starts a comment that goes to the end of the line.
- `/* … */` is a comment on several lines.

## Common mistakes and their messages

| Mistake                       | Message                                         |
| ----------------------------- | ----------------------------------------------- |
| `чоп("Салом);`                | Нохунаки пӯшандаи `"` намерасад (no quote mark) |
| `чоп("Салом";`                | Қавси пӯшандаи `)` намерасад (no bracket)       |
| `агр (х > 1) {}`              | Маслиҳат: Шояд `агар`-ро дар назар доштед?      |
| `чоп(ном);` without `тағ ном` | Номи `ном` эълон нашудааст (not declared)       |

## Tasks

Each task has a program with an error. Fix it so that the right result is
printed.

1. [The quote mark](../tasks/02-nokhunak/README.md)
2. [The bracket](../tasks/02-qavs/README.md)
3. [The keyword](../tasks/02-kalima/README.md)

---

[← Lesson 1](01-chop.md) · [Contents](README.md) ·
[Lesson 3 →](03-taghyirjobanda.md)
