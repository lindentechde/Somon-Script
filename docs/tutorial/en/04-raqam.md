# Lesson 4. Numbers and operations

**In this lesson:** you will do math: add, subtract, multiply and divide.

## Operations

| Sign | Meaning        | Example | Result |
| ---- | -------------- | ------- | ------ |
| `+`  | addition       | `7 + 2` | `9`    |
| `-`  | subtraction    | `7 - 2` | `5`    |
| `*`  | multiplication | `7 * 2` | `14`   |
| `/`  | division       | `7 / 2` | `3.5`  |

```som
тағ нарх = 12;
тағ шумора = 3;
чоп("Ҳамагӣ:", нарх * шумора, "сомонӣ");
чоп("Нисф:", нарх / 2);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC90LDRgNGFID0gMTI7CtGC0LDSkyDRiNGD0LzQvtGA0LAgPSAzOwrRh9C-0L8oItKy0LDQvNCw0LPTozoiLCDQvdCw0YDRhSAqINGI0YPQvNC-0YDQsCwgItGB0L7QvNC-0L3ToyIpOwrRh9C-0L8oItCd0LjRgdGEOiIsINC90LDRgNGFIC8gMik7Cg)

In SomonScript, decimal numbers are written with a **dot**: `3.5`.

## The order of operations

It works as in math: first multiplication and division, then addition and
subtraction. Brackets change the order:

```som
чоп(2 + 3 * 4);
чоп((2 + 3) * 4);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KDIgKyAzICogNCk7CtGH0L7QvygoMiArIDMpICogNCk7Cg)

## Area and perimeter

```som
тағ тӯл = 8;
тағ бар = 5;
тағ масоҳат = тӯл * бар;
тағ периметр = 2 * (тӯл + бар);
чоп("Масоҳат:", масоҳат);
чоп("Периметр:", периметр);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGC06_QuyA9IDg7CtGC0LDSkyDQsdCw0YAgPSA1OwrRgtCw0pMg0LzQsNGB0L7Ss9Cw0YIgPSDRgtOv0LsgKiDQsdCw0YA7CtGC0LDSkyDQv9C10YDQuNC80LXRgtGAID0gMiAqICjRgtOv0LsgKyDQsdCw0YApOwrRh9C-0L8oItCc0LDRgdC-0rPQsNGCOiIsINC80LDRgdC-0rPQsNGCKTsK0YfQvtC_KCLQn9C10YDQuNC80LXRgtGAOiIsINC_0LXRgNC40LzQtdGC0YApOwo)

## Numbers and strings

`5` is a number, `"5"` is a string. Numbers are added, strings are **joined**:

```som
чоп(5 + 5);
чоп("5" + "5");
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KDUgKyA1KTsK0YfQvtC_KCI1IiArICI1Iik7Cg)

The result: `10` and `55`. Remember this difference: you will need it in the
lesson about input.

## Common mistakes

- A comma instead of a dot: `2,5`. In a program, write `2.5`.
- Leaving out the multiplication sign: `2(3 + 4)`. Write: `2 * (3 + 4)`.

## Tasks

1. [Seconds in a day](../tasks/04-soniyaho/README.md)
2. [The yard](../tasks/04-havli/README.md)
3. [A purchase](../tasks/04-kharid/README.md)

---

[← Lesson 3](03-taghyirjobanda.md) · [Contents](README.md) ·
[Lesson 5 →](05-vurud.md)
