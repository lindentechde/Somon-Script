# Дарси 9. Якчанд шарт

**Дар ин дарс:** зиёда аз ду ҳолатро месанҷед ва шартҳоро бо «ва», «ё» ва «не»
пайваст мекунед.

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

Вуруд:

```text
85
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7QuyA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrQsNCz0LDRgCAo0YXQvtC7ID49IDkwKSB7CiAg0YfQvtC_KCLQkdCw0rPQvjogNSIpOwp9INCy0LDQs9Cw0YDQvdCwINCw0LPQsNGAICjRhdC-0LsgPj0gNzApIHsKICDRh9C-0L8oItCR0LDSs9C-OiA0Iik7Cn0g0LLQsNCz0LDRgNC90LAg0LDQs9Cw0YAgKNGF0L7QuyA-PSA1MCkgewogINGH0L7Qvygi0JHQsNKz0L46IDMiKTsKfSDQstCw0LPQsNGA0L3QsCB7CiAg0YfQvtC_KCLQkdCw0rPQvjogMiIpOwp9Cg&i=ODUK)

Шартҳо аз боло ба поён санҷида мешаванд. Аввалин шарти `дуруст` иҷро мешавад,
дигарҳо не.

## «Ва», «ё», «не»

| Аломат | Маъно | Мисол                      | Кай `дуруст`           |
| ------ | ----- | -------------------------- | ---------------------- |
| `&&`   | ва    | `х > 0 && х < 10`          | ҳар ду шарт дуруст     |
| `\|\|` | ё     | `рӯз === 6 \|\| рӯз === 7` | ақаллан яке дуруст     |
| `!`    | не    | `!борон`                   | `борон` нодуруст бошад |

```som
тағ синну = хонданиРақам();
агар (синну >= 7 && синну <= 17) {
  чоп("Хонандаи мактаб");
} вагарна {
  чоп("Хонандаи мактаб нест");
}
```

Вуруд:

```text
13
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGB0LjQvdC90YMgPSDRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKTsK0LDQs9Cw0YAgKNGB0LjQvdC90YMgPj0gNyAmJiDRgdC40L3QvdGDIDw9IDE3KSB7CiAg0YfQvtC_KCLQpdC-0L3QsNC90LTQsNC4INC80LDQutGC0LDQsSIpOwp9INCy0LDQs9Cw0YDQvdCwIHsKICDRh9C-0L8oItCl0L7QvdCw0L3QtNCw0Lgg0LzQsNC60YLQsNCxINC90LXRgdGCIik7Cn0K&i=MTMK)

## Соли кабиса

Сол кабиса аст, агар ба 4 тақсим шавад, вале ба 100 не, ё ба 400 тақсим шавад:

```som
тағ сол = хонданиРақам();
агар ((сол % 4 === 0 && сол % 100 !== 0) || сол % 400 === 0) {
  чоп("Кабиса");
} вагарна {
  чоп("Кабиса нест");
}
```

Вуруд:

```text
2024
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGB0L7QuyA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrQsNCz0LDRgCAoKNGB0L7QuyAlIDQgPT09IDAgJiYg0YHQvtC7ICUgMTAwICE9PSAwKSB8fCDRgdC-0LsgJSA0MDAgPT09IDApIHsKICDRh9C-0L8oItCa0LDQsdC40YHQsCIpOwp9INCy0LDQs9Cw0YDQvdCwIHsKICDRh9C-0L8oItCa0LDQsdC40YHQsCDQvdC10YHRgiIpOwp9Cg&i=MjAyNAo)

## Супоришҳо

1. [Аломати рақам](../tasks/09-alomat/README.md)
2. [Баҳо](../tasks/09-baho/README.md)
3. [Соли кабиса](../tasks/09-kabisa/README.md)
4. [Секунҷа](../tasks/09-sekunja/README.md)

---

[← Дарси 8](08-agar.md) · [Мундариҷа](README.md) · [Дарси 10 →](10-baroi.md)
