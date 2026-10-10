# Дарси 4. Рақамҳо ва амалҳо

**Дар ин дарс:** бо рақамҳо ҳисоб мекунед: ҷамъ, тарҳ, зарб ва тақсим.

## Амалҳо

| Амал | Маъно  | Мисол   | Натиҷа |
| ---- | ------ | ------- | ------ |
| `+`  | ҷамъ   | `7 + 2` | `9`    |
| `-`  | тарҳ   | `7 - 2` | `5`    |
| `*`  | зарб   | `7 * 2` | `14`   |
| `/`  | тақсим | `7 / 2` | `3.5`  |

```som
тағ нарх = 12;
тағ шумора = 3;
чоп("Ҳамагӣ:", нарх * шумора, "сомонӣ");
чоп("Нисф:", нарх / 2);
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC90LDRgNGFID0gMTI7CtGC0LDSkyDRiNGD0LzQvtGA0LAgPSAzOwrRh9C-0L8oItKy0LDQvNCw0LPTozoiLCDQvdCw0YDRhSAqINGI0YPQvNC-0YDQsCwgItGB0L7QvNC-0L3ToyIpOwrRh9C-0L8oItCd0LjRgdGEOiIsINC90LDRgNGFIC8gMik7Cg)

Дар SomonScript қисми касрӣ бо **нуқта** навишта мешавад: `3.5`.

## Тартиби амалҳо

Мисли математика: аввал зарб ва тақсим, баъд ҷамъ ва тарҳ. Қавс тартибро иваз
мекунад:

```som
чоп(2 + 3 * 4);
чоп((2 + 3) * 4);
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KDIgKyAzICogNCk7CtGH0L7QvygoMiArIDMpICogNCk7Cg)

## Масоҳат ва периметр

```som
тағ тӯл = 8;
тағ бар = 5;
тағ масоҳат = тӯл * бар;
тағ периметр = 2 * (тӯл + бар);
чоп("Масоҳат:", масоҳат);
чоп("Периметр:", периметр);
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGC06_QuyA9IDg7CtGC0LDSkyDQsdCw0YAgPSA1OwrRgtCw0pMg0LzQsNGB0L7Ss9Cw0YIgPSDRgtOv0LsgKiDQsdCw0YA7CtGC0LDSkyDQv9C10YDQuNC80LXRgtGAID0gMiAqICjRgtOv0LsgKyDQsdCw0YApOwrRh9C-0L8oItCc0LDRgdC-0rPQsNGCOiIsINC80LDRgdC-0rPQsNGCKTsK0YfQvtC_KCLQn9C10YDQuNC80LXRgtGAOiIsINC_0LXRgNC40LzQtdGC0YApOwo)

## Рақам ва сатр

`5` — рақам, `"5"` — сатр. Бо рақамҳо ҳисоб мекунанд, сатрҳоро **мепайванданд**:

```som
чоп(5 + 5);
чоп("5" + "5");
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KDUgKyA1KTsK0YfQvtC_KCI1IiArICI1Iik7Cg)

Натиҷа: `10` ва `55`. Ба ин фарқ диққат диҳед — он дар дарси «Вуруд» лозим
мешавад.

## Хатоҳои маъмул

- Вергул ба ҷои нуқта: `2,5`. Дар барнома `2.5` нависед.
- Аломати зарбро партофтан: `2(3 + 4)`. Лозим аст: `2 * (3 + 4)`.

## Супоришҳо

1. [Сонияҳои рӯз](../tasks/04-soniyaho/README.md)
2. [Ҳавлӣ](../tasks/04-havli/README.md)
3. [Харид](../tasks/04-kharid/README.md)

---

[← Дарси 3](03-taghyirjobanda.md) · [Мундариҷа](README.md) ·
[Дарси 5 →](05-vurud.md)
