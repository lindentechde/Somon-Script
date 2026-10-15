# Programming in SomonScript: lessons for beginners

These lessons are for people who have never written a program. Each lesson has a
short explanation, examples and tasks. You can run the examples with one click
in the **playground**: <https://lindentechde.github.io/Somon-Script/>. You do
not need to install anything. The playground page is in Tajik and Russian.

SomonScript programs are written in Tajik; the lessons explain what each word
means.

_These lessons in Tajik and Russian: [Дарсҳо бо забони тоҷикӣ](../tj/README.md)
· [Уроки на русском](../ru/README.md)._

## Lessons

| No. | Lesson                                                 | What we learn                        |
| --- | ------------------------------------------------------ | ------------------------------------ |
| 1   | [Your first program](01-chop.md)                       | `чоп`, string, number                |
| 2   | [Errors and comments](02-khato.md)                     | reading error messages, `//`         |
| 3   | [Variables](03-taghyirjobanda.md)                      | `тағ`, `собит`                       |
| 4   | [Numbers and operations](04-raqam.md)                  | `+ - * /`, the order of operations   |
| 5   | [Input: `хондан` and `хонданиРақам`](05-vurud.md)      | `хондан()`, `хонданиРақам()`         |
| 6   | [Calculations: the remainder and `Риёзӣ`](06-hisob.md) | `%`, `Риёзӣ.поён`, `Риёзӣ.дуръшака`  |
| 7   | [Comparison: `дуруст` and `нодуруст`](07-muqoisa.md)   | `дуруст`, `нодуруст`, `> < ===`      |
| 8   | [Conditions: `агар` and `вагарна`](08-agar.md)         | `агар`, `вагарна`                    |
| 9   | [Several conditions](09-shartho.md)                    | `вагарна агар`, `&&`, `\|\|`, `!`    |
| 10  | [The `барои` loop](10-baroi.md)                        | `барои`, `и++`                       |
| 11  | [The `то` loop, `шикастан` and `давом`](11-to.md)      | `то`, `шикастан`, `давом`            |
| 12  | [A loop inside a loop](12-davraho.md)                  | shapes and tables                    |
| 13  | [Functions](13-funksiya.md)                            | `функсия`, parameters                |
| 14  | [A function with `бозгашт`](14-bozgasht.md)            | `бозгашт`, the type of the result    |
| 15  | [Lists](15-ruykhat.md)                                 | `[ ]`, index, `дарозӣ`, `илова`      |
| 16  | [Working with lists](16-ruykhatho.md)                  | `дорад`, `тартиб`, `филтр`, `харита` |
| 17  | [Strings](17-satrho.md)                                | letters, `калон`, `ҷудокунӣ`         |
| 18  | [Objects](18-obyekt.md)                                | `{ ном: қимат }`, properties         |

## Tasks and how to check them

Every task comes with tests: [all tasks](../tasks/README.md). A task page has
the statement, an example and a link to the playground. The link opens the
playground with the tests of the task: the **✓ Санҷидан** ("Check") button
checks the program against all the tests and tells you which ones passed. If
Node.js and SomonScript are installed on your computer, you can also check the
program with a command:

```bash
npm run check-task -- 05-jam program.som
```

## For teachers

The teacher's guide is in Tajik and Russian:
[Дастур барои омӯзгор](../omuzgor.md) (Tajik) and
[Памятка для учителя](../uchitelyu.md) (Russian). It covers the playground
without the internet, handing out tasks, and the common mistakes of students.
