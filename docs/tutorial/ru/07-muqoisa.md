# Урок 7. Сравнение: `дуруст` и `нодуруст`

**В этом уроке:** вы будете сравнивать значения и познакомитесь с логическими
значениями.

## Логические значения

Ответ на вопрос «правда ли, что …?» — `дуруст` (да, истина) или `нодуруст` (нет,
ложь). Эти значения называют **логическими** (`мантиқӣ`):

```som
чоп(5 > 3);
чоп(2 > 7);
тағ офтобӣ = дуруст;
чоп("Имрӯз офтобӣ:", офтобӣ);
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KDUgPiAzKTsK0YfQvtC_KDIgPiA3KTsK0YLQsNKTINC-0YTRgtC-0LHToyA9INC00YPRgNGD0YHRgjsK0YfQvtC_KCLQmNC80YDTr9C3INC-0YTRgtC-0LHTozoiLCDQvtGE0YLQvtCx06MpOwo)

## Знаки сравнения

| Знак  | Смысл            | Пример        | Результат  |
| ----- | ---------------- | ------------- | ---------- |
| `>`   | больше           | `5 > 3`       | `дуруст`   |
| `<`   | меньше           | `5 < 3`       | `нодуруст` |
| `>=`  | больше или равно | `5 >= 5`      | `дуруст`   |
| `<=`  | меньше или равно | `4 <= 3`      | `нодуруст` |
| `===` | равно            | `2 + 2 === 4` | `дуруст`   |
| `!==` | не равно         | `3 !== 3`     | `нодуруст` |

```som
тағ рақам = хонданиРақам();
чоп("Мусбат:", рақам > 0);
чоп("Ҷуфт:", рақам % 2 === 0);
чоп("Даҳ:", рақам === 10);
```

Ввод:

```text
10
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGA0LDSm9Cw0LwgPSDRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKTsK0YfQvtC_KCLQnNGD0YHQsdCw0YI6Iiwg0YDQsNKb0LDQvCA-IDApOwrRh9C-0L8oItK20YPRhNGCOiIsINGA0LDSm9Cw0LwgJSAyID09PSAwKTsK0YfQvtC_KCLQlNCw0rM6Iiwg0YDQsNKb0LDQvCA9PT0gMTApOwo&i=MTAK)

## `=` и `===`

- `=` — **присваивание**: `тағ х = 5;` даёт `х` значение 5.
- `===` — **сравнение**: `х === 5` спрашивает «равно ли `х` пяти?».

Не путайте эти знаки. Если написать `=` в условии, песочница предупредит.

## Сравнение строк

```som
тағ ҷавоб = хондан();
чоп(ҷавоб === "Душанбе");
```

Ввод:

```text
Душанбе
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINK30LDQstC-0LEgPSDRhdC-0L3QtNCw0L0oKTsK0YfQvtC_KNK30LDQstC-0LEgPT09ICLQlNGD0YjQsNC90LHQtSIpOwo&i=0JTRg9GI0LDQvdCx0LUK)

Строки равны, только если все буквы совпадают: `"душанбе"` не равно `"Душанбе"`.

## Задачи

1. [Больше?](../tasks/07-kalontar/README.md)
2. [Чётное?](../tasks/07-juft/README.md)
3. [Пароль](../tasks/07-ramz/README.md)

---

[← Урок 6](06-hisob.md) · [Оглавление](README.md) · [Урок 8 →](08-agar.md)
