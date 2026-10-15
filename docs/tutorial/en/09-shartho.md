# Lesson 9. Several conditions

**In this lesson:** you will check more than two cases and join conditions with
the words "and", "or" and "not".

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

Input:

```text
85
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7QuyA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrQsNCz0LDRgCAo0YXQvtC7ID49IDkwKSB7CiAg0YfQvtC_KCLQkdCw0rPQvjogNSIpOwp9INCy0LDQs9Cw0YDQvdCwINCw0LPQsNGAICjRhdC-0LsgPj0gNzApIHsKICDRh9C-0L8oItCR0LDSs9C-OiA0Iik7Cn0g0LLQsNCz0LDRgNC90LAg0LDQs9Cw0YAgKNGF0L7QuyA-PSA1MCkgewogINGH0L7Qvygi0JHQsNKz0L46IDMiKTsKfSDQstCw0LPQsNGA0L3QsCB7CiAg0YfQvtC_KCLQkdCw0rPQvjogMiIpOwp9Cg&i=ODUK)

The conditions are checked from top to bottom. Only the part of the first true
condition runs; the others do not.

## "And", "or", "not"

| Sign   | Meaning | Example                    | When it is `дуруст`      |
| ------ | ------- | -------------------------- | ------------------------ |
| `&&`   | and     | `х > 0 && х < 10`          | both conditions are true |
| `\|\|` | or      | `рӯз === 6 \|\| рӯз === 7` | at least one is true     |
| `!`    | not     | `!борон`                   | `борон` is false         |

```som
тағ синну = хонданиРақам();
агар (синну >= 7 && синну <= 17) {
  чоп("Хонандаи мактаб");
} вагарна {
  чоп("Хонандаи мактаб нест");
}
```

Input:

```text
13
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGB0LjQvdC90YMgPSDRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKTsK0LDQs9Cw0YAgKNGB0LjQvdC90YMgPj0gNyAmJiDRgdC40L3QvdGDIDw9IDE3KSB7CiAg0YfQvtC_KCLQpdC-0L3QsNC90LTQsNC4INC80LDQutGC0LDQsSIpOwp9INCy0LDQs9Cw0YDQvdCwIHsKICDRh9C-0L8oItCl0L7QvdCw0L3QtNCw0Lgg0LzQsNC60YLQsNCxINC90LXRgdGCIik7Cn0K&i=MTMK)

## Leap year

A year is a leap year if it can be divided by 4 but not by 100, or if it can be
divided by 400:

```som
тағ сол = хонданиРақам();
агар ((сол % 4 === 0 && сол % 100 !== 0) || сол % 400 === 0) {
  чоп("Кабиса");
} вагарна {
  чоп("Кабиса нест");
}
```

Input:

```text
2024
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGB0L7QuyA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrQsNCz0LDRgCAoKNGB0L7QuyAlIDQgPT09IDAgJiYg0YHQvtC7ICUgMTAwICE9PSAwKSB8fCDRgdC-0LsgJSA0MDAgPT09IDApIHsKICDRh9C-0L8oItCa0LDQsdC40YHQsCIpOwp9INCy0LDQs9Cw0YDQvdCwIHsKICDRh9C-0L8oItCa0LDQsdC40YHQsCDQvdC10YHRgiIpOwp9Cg&i=MjAyNAo)

## Tasks

1. [Sign of a number](../tasks/09-alomat/README.md)
2. [The grade](../tasks/09-baho/README.md)
3. [Leap year](../tasks/09-kabisa/README.md)
4. [Triangle](../tasks/09-sekunja/README.md)

---

[← Lesson 8](08-agar.md) · [Contents](README.md) · [Lesson 10 →](10-baroi.md)
