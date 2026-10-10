# Урок 14. Функция с `бозгашт`

**В этом уроке:** функция вычисляет результат и возвращает его.

## `бозгашт`

`бозгашт` значит «вернуть»:

```som
функсия квадрат(х: рақам): рақам {
  бозгашт х * х;
}

чоп(квадрат(4));
тағ натиҷа = квадрат(3) + квадрат(4);
чоп(натиҷа);
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0LrQstCw0LTRgNCw0YIo0YU6INGA0LDSm9Cw0LwpOiDRgNCw0pvQsNC8IHsKICDQsdC-0LfQs9Cw0YjRgiDRhSAqINGFOwp9CgrRh9C-0L8o0LrQstCw0LTRgNCw0YIoNCkpOwrRgtCw0pMg0L3QsNGC0LjSt9CwID0g0LrQstCw0LTRgNCw0YIoMykgKyDQutCy0LDQtNGA0LDRgig0KTsK0YfQvtC_KNC90LDRgtC40rfQsCk7Cg)

- `бозгашт х * х;` возвращает значение туда, где функцию вызвали.
- `: рақам` после скобок говорит, что функция возвращает число.
- После `бозгашт` функция заканчивается.

## Функция с условием

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

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0LrQsNC70L7QvdGC0LDRgNC40L0o0LA6INGA0LDSm9Cw0LwsINCxOiDRgNCw0pvQsNC8KTog0YDQsNKb0LDQvCB7CiAg0LDQs9Cw0YAgKNCwID4g0LEpIHsKICAgINCx0L7Qt9Cz0LDRiNGCINCwOwogIH0KICDQsdC-0LfQs9Cw0YjRgiDQsTsKfQoK0YfQvtC_KNC60LDQu9C-0L3RgtCw0YDQuNC9KDMsIDcpKTsK0YfQvtC_KNC60LDQu9C-0L3RgtCw0YDQuNC9KNC60LDQu9C-0L3RgtCw0YDQuNC9KDEsIDkpLCA0KSk7Cg)

## Функция, которая возвращает `дуруст` или `нодуруст`

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

Ввод:

```text
12
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0rfRg9GE0YLQkNGB0YIo0L06INGA0LDSm9Cw0LwpOiDQvNCw0L3RgtC40pvToyB7CiAg0LHQvtC30LPQsNGI0YIg0L0gJSAyID09PSAwOwp9CgrRgtCw0pMg0YDQsNKb0LDQvCA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrQsNCz0LDRgCAo0rfRg9GE0YLQkNGB0YIo0YDQsNKb0LDQvCkpIHsKICDRh9C-0L8oItK20YPRhNGCIik7Cn0g0LLQsNCz0LDRgNC90LAgewogINGH0L7Qvygi0KLQvtKbIik7Cn0K&i=MTIK)

## `чоп` и `бозгашт`

`чоп` выводит значение на экран; `бозгашт` возвращает его в программу, чтобы им
воспользоваться: в вычислении, в переменной или в условии.

## Задачи

1. [Температура](../tasks/14-harorat/README.md)
2. [Простое число](../tasks/14-sodda/README.md)
3. [Степень](../tasks/14-daraja/README.md)
4. [Наибольшее из трёх](../tasks/14-kalontarin-az-se/README.md)

---

[← Урок 13](13-funksiya.md) · [Оглавление](README.md) ·
[Урок 15 →](15-ruykhat.md)
