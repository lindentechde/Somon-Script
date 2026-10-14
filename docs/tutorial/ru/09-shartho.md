# Урок 9. Несколько условий

**В этом уроке:** вы проверите больше двух случаев и соедините условия словами
«и», «или», «не».

## `вагарна агар`

```som
тағ хол = хонданиРақам();
агар (хол >= 90) {
  чоп("Баҳо: 5");
} вагарна агар (хол >= 70) {
  чоп("Баҳо: 4");
} вагарна агар (хол >= 50) {
  чоп("Баҳо: 3");
} вагарна {
  чоп("Баҳо: 2");
}
```

Ввод:

```text
85
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7QuyA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrQsNCz0LDRgCAo0YXQvtC7ID49IDkwKSB7CiAg0YfQvtC_KCLQkdCw0rPQvjogNSIpOwp9INCy0LDQs9Cw0YDQvdCwINCw0LPQsNGAICjRhdC-0LsgPj0gNzApIHsKICDRh9C-0L8oItCR0LDSs9C-OiA0Iik7Cn0g0LLQsNCz0LDRgNC90LAg0LDQs9Cw0YAgKNGF0L7QuyA-PSA1MCkgewogINGH0L7Qvygi0JHQsNKz0L46IDMiKTsKfSDQstCw0LPQsNGA0L3QsCB7CiAg0YfQvtC_KCLQkdCw0rPQvjogMiIpOwp9Cg&i=ODUK)

Условия проверяются сверху вниз. Выполняется первое истинное, остальные — нет.

## «И», «или», «не»

| Знак   | Смысл | Пример                     | Когда `дуруст`       |
| ------ | ----- | -------------------------- | -------------------- |
| `&&`   | и     | `х > 0 && х < 10`          | оба условия истинны  |
| `\|\|` | или   | `рӯз === 6 \|\| рӯз === 7` | хотя бы одно истинно |
| `!`    | не    | `!борон`                   | `борон` ложно        |

```som
тағ синну = хонданиРақам();
агар (синну >= 7 && синну <= 17) {
  чоп("Хонандаи мактаб");
} вагарна {
  чоп("Хонандаи мактаб нест");
}
```

Ввод:

```text
13
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGB0LjQvdC90YMgPSDRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKTsK0LDQs9Cw0YAgKNGB0LjQvdC90YMgPj0gNyAmJiDRgdC40L3QvdGDIDw9IDE3KSB7CiAg0YfQvtC_KCLQpdC-0L3QsNC90LTQsNC4INC80LDQutGC0LDQsSIpOwp9INCy0LDQs9Cw0YDQvdCwIHsKICDRh9C-0L8oItCl0L7QvdCw0L3QtNCw0Lgg0LzQsNC60YLQsNCxINC90LXRgdGCIik7Cn0K&i=MTMK)

## Високосный год

Год високосный, если делится на 4, но не на 100, или делится на 400:

```som
тағ сол = хонданиРақам();
агар ((сол % 4 === 0 && сол % 100 !== 0) || сол % 400 === 0) {
  чоп("Кабиса");
} вагарна {
  чоп("Кабиса нест");
}
```

Ввод:

```text
2024
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGB0L7QuyA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrQsNCz0LDRgCAoKNGB0L7QuyAlIDQgPT09IDAgJiYg0YHQvtC7ICUgMTAwICE9PSAwKSB8fCDRgdC-0LsgJSA0MDAgPT09IDApIHsKICDRh9C-0L8oItCa0LDQsdC40YHQsCIpOwp9INCy0LDQs9Cw0YDQvdCwIHsKICDRh9C-0L8oItCa0LDQsdC40YHQsCDQvdC10YHRgiIpOwp9Cg&i=MjAyNAo)

## Задачи

1. [Знак числа](../tasks/09-alomat/README.md)
2. [Оценка](../tasks/09-baho/README.md)
3. [Високосный год](../tasks/09-kabisa/README.md)
4. [Треугольник](../tasks/09-sekunja/README.md)

---

[← Урок 8](08-agar.md) · [Оглавление](README.md) · [Урок 10 →](10-baroi.md)
