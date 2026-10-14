# Дарси 7. Муқоиса: `дуруст` ва `нодуруст`

**Дар ин дарс:** қиматҳоро муқоиса мекунед ва бо қиматҳои мантиқӣ шинос мешавед.

## Қиматҳои мантиқӣ

Ҷавоби саволи «оё …?» `дуруст` (ҳа) ё `нодуруст` (не) аст. Ин қиматҳоро
**мантиқӣ** меноманд:

```som
чоп(5 > 3);
чоп(2 > 7);
тағ офтобӣ = дуруст;
чоп("Имрӯз офтобӣ:", офтобӣ);
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KDUgPiAzKTsK0YfQvtC_KDIgPiA3KTsK0YLQsNKTINC-0YTRgtC-0LHToyA9INC00YPRgNGD0YHRgjsK0YfQvtC_KCLQmNC80YDTr9C3INC-0YTRgtC-0LHTozoiLCDQvtGE0YLQvtCx06MpOwo)

## Аломатҳои муқоиса

| Аломат | Маъно              | Мисол         | Натиҷа     |
| ------ | ------------------ | ------------- | ---------- |
| `>`    | калонтар           | `5 > 3`       | `дуруст`   |
| `<`    | хурдтар            | `5 < 3`       | `нодуруст` |
| `>=`   | калонтар ё баробар | `5 >= 5`      | `дуруст`   |
| `<=`   | хурдтар ё баробар  | `4 <= 3`      | `нодуруст` |
| `===`  | баробар            | `2 + 2 === 4` | `дуруст`   |
| `!==`  | нобаробар          | `3 !== 3`     | `нодуруст` |

```som
тағ рақам = хонданиРақам();
чоп("Мусбат:", рақам > 0);
чоп("Ҷуфт:", рақам % 2 === 0);
чоп("Даҳ:", рақам === 10);
```

Вуруд:

```text
10
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGA0LDSm9Cw0LwgPSDRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKTsK0YfQvtC_KCLQnNGD0YHQsdCw0YI6Iiwg0YDQsNKb0LDQvCA-IDApOwrRh9C-0L8oItK20YPRhNGCOiIsINGA0LDSm9Cw0LwgJSAyID09PSAwKTsK0YfQvtC_KCLQlNCw0rM6Iiwg0YDQsNKb0LDQvCA9PT0gMTApOwo&i=MTAK)

## `=` ва `===`

- `=` — **додан**: `тағ х = 5;` ба `х` қимати 5-ро медиҳад.
- `===` — **муқоиса**: `х === 5` мепурсад «оё `х` ба 5 баробар аст?».

Ин ду аломатро омехта накунед. Агар дар шарт `=` нависед, майдони озмоиш огоҳ
мекунад.

## Сатрҳоро муқоиса кардан

```som
тағ ҷавоб = хондан();
чоп(ҷавоб === "Душанбе");
```

Вуруд:

```text
Душанбе
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINK30LDQstC-0LEgPSDRhdC-0L3QtNCw0L0oKTsK0YfQvtC_KNK30LDQstC-0LEgPT09ICLQlNGD0YjQsNC90LHQtSIpOwo&i=0JTRg9GI0LDQvdCx0LUK)

Сатрҳо танҳо вақте баробаранд, ки ҳамаи ҳарфҳояшон якхела бошанд: `"душанбе"` ба
`"Душанбе"` баробар нест.

## Супоришҳо

1. [Калонтар?](../tasks/07-kalontar/README.md)
2. [Ҷуфт?](../tasks/07-juft/README.md)
3. [Рамз](../tasks/07-ramz/README.md)

---

[← Дарси 6](06-hisob.md) · [Мундариҷа](README.md) · [Дарси 8 →](08-agar.md)
