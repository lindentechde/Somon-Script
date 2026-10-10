# Дарси 14. Функсия бо `бозгашт`

**Дар ин дарс:** функсия натиҷа ҳисоб карда, онро бармегардонад.

## `бозгашт`

```som
функсия квадрат(х: рақам): рақам {
  бозгашт х * х;
}

чоп(квадрат(4));
тағ натиҷа = квадрат(3) + квадрат(4);
чоп(натиҷа);
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0LrQstCw0LTRgNCw0YIo0YU6INGA0LDSm9Cw0LwpOiDRgNCw0pvQsNC8IHsKICDQsdC-0LfQs9Cw0YjRgiDRhSAqINGFOwp9CgrRh9C-0L8o0LrQstCw0LTRgNCw0YIoNCkpOwrRgtCw0pMg0L3QsNGC0LjSt9CwID0g0LrQstCw0LTRgNCw0YIoMykgKyDQutCy0LDQtNGA0LDRgig0KTsK0YfQvtC_KNC90LDRgtC40rfQsCk7Cg)

- `бозгашт х * х;` — қиматро ба ҷое, ки функсия даъват шуд, бармегардонад.
- `: рақам` пас аз қавс мегӯяд, ки функсия рақам бармегардонад.
- Пас аз `бозгашт` функсия тамом мешавад.

## Функсия бо шарт

```som
функсия калонтарин(а: рақам, б: рақам): рақам {
  агар (а > б) {
    бозгашт а;
  }
  бозгашт б;
}

чоп(калонтарин(3, 7));
чоп(калонтарин(калонтарин(1, 9), 4));
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0LrQsNC70L7QvdGC0LDRgNC40L0o0LA6INGA0LDSm9Cw0LwsINCxOiDRgNCw0pvQsNC8KTog0YDQsNKb0LDQvCB7CiAg0LDQs9Cw0YAgKNCwID4g0LEpIHsKICAgINCx0L7Qt9Cz0LDRiNGCINCwOwogIH0KICDQsdC-0LfQs9Cw0YjRgiDQsTsKfQoK0YfQvtC_KNC60LDQu9C-0L3RgtCw0YDQuNC9KDMsIDcpKTsK0YfQvtC_KNC60LDQu9C-0L3RgtCw0YDQuNC9KNC60LDQu9C-0L3RgtCw0YDQuNC9KDEsIDkpLCA0KSk7Cg)

## Функсияе, ки `дуруст` ё `нодуруст` бармегардонад

```som
функсия ҷуфтАст(н: рақам): мантиқӣ {
  бозгашт н % 2 === 0;
}

тағ рақам = хонданиРақам();
агар (ҷуфтАст(рақам)) {
  чоп("Ҷуфт");
} вагарна {
  чоп("Тоқ");
}
```

Вуруд:

```text
12
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0rfRg9GE0YLQkNGB0YIo0L06INGA0LDSm9Cw0LwpOiDQvNCw0L3RgtC40pvToyB7CiAg0LHQvtC30LPQsNGI0YIg0L0gJSAyID09PSAwOwp9CgrRgtCw0pMg0YDQsNKb0LDQvCA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrQsNCz0LDRgCAo0rfRg9GE0YLQkNGB0YIo0YDQsNKb0LDQvCkpIHsKICDRh9C-0L8oItK20YPRhNGCIik7Cn0g0LLQsNCz0LDRgNC90LAgewogINGH0L7Qvygi0KLQvtKbIik7Cn0K&i=MTIK)

## `чоп` ва `бозгашт`

`чоп` қиматро ба экран менависад; `бозгашт` онро ба барнома бармегардонад, то
онро истифода баред: дар ҳисоб, дар тағйирёбанда ё дар шарт.

## Супоришҳо

1. [Ҳароратҳо](../tasks/14-harorat/README.md)
2. [Адади содда](../tasks/14-sodda/README.md)
3. [Дараҷа](../tasks/14-daraja/README.md)
4. [Калонтарин аз се](../tasks/14-kalontarin-az-se/README.md)

---

[← Дарси 13](13-funksiya.md) · [Мундариҷа](README.md) ·
[Дарси 15 →](15-ruykhat.md)
