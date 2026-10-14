# Урок 4. Числа и действия

**В этом уроке:** вы будете считать: складывать, вычитать, умножать и делить.

## Действия

| Знак | Смысл     | Пример  | Результат |
| ---- | --------- | ------- | --------- |
| `+`  | сложение  | `7 + 2` | `9`       |
| `-`  | вычитание | `7 - 2` | `5`       |
| `*`  | умножение | `7 * 2` | `14`      |
| `/`  | деление   | `7 / 2` | `3.5`     |

```som
тағ нарх = 12;
тағ шумора = 3;
чоп("Ҳамагӣ:", нарх * шумора, "сомонӣ");
чоп("Нисф:", нарх / 2);
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC90LDRgNGFID0gMTI7CtGC0LDSkyDRiNGD0LzQvtGA0LAgPSAzOwrRh9C-0L8oItKy0LDQvNCw0LPTozoiLCDQvdCw0YDRhSAqINGI0YPQvNC-0YDQsCwgItGB0L7QvNC-0L3ToyIpOwrRh9C-0L8oItCd0LjRgdGEOiIsINC90LDRgNGFIC8gMik7Cg)

В SomonScript дробная часть пишется через **точку**: `3.5`.

## Порядок действий

Как в математике: сначала умножение и деление, потом сложение и вычитание.
Скобки меняют порядок:

```som
чоп(2 + 3 * 4);
чоп((2 + 3) * 4);
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KDIgKyAzICogNCk7CtGH0L7QvygoMiArIDMpICogNCk7Cg)

## Площадь и периметр

```som
тағ тӯл = 8;
тағ бар = 5;
тағ масоҳат = тӯл * бар;
тағ периметр = 2 * (тӯл + бар);
чоп("Масоҳат:", масоҳат);
чоп("Периметр:", периметр);
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGC06_QuyA9IDg7CtGC0LDSkyDQsdCw0YAgPSA1OwrRgtCw0pMg0LzQsNGB0L7Ss9Cw0YIgPSDRgtOv0LsgKiDQsdCw0YA7CtGC0LDSkyDQv9C10YDQuNC80LXRgtGAID0gMiAqICjRgtOv0LsgKyDQsdCw0YApOwrRh9C-0L8oItCc0LDRgdC-0rPQsNGCOiIsINC80LDRgdC-0rPQsNGCKTsK0YfQvtC_KCLQn9C10YDQuNC80LXRgtGAOiIsINC_0LXRgNC40LzQtdGC0YApOwo)

## Число и строка

`5` — число, `"5"` — строка. Числа складывают, строки **соединяют**:

```som
чоп(5 + 5);
чоп("5" + "5");
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KDUgKyA1KTsK0YfQvtC_KCI1IiArICI1Iik7Cg)

Результат: `10` и `55`. Запомните эту разницу — она понадобится в уроке о вводе.

## Частые ошибки

- Запятая вместо точки: `2,5`. В программе пишите `2.5`.
- Пропустить знак умножения: `2(3 + 4)`. Нужно: `2 * (3 + 4)`.

## Задачи

1. [Секунды в сутках](../tasks/04-soniyaho/README.md)
2. [Двор](../tasks/04-havli/README.md)
3. [Покупка](../tasks/04-kharid/README.md)

---

[← Урок 3](03-taghyirjobanda.md) · [Оглавление](README.md) ·
[Урок 5 →](05-vurud.md)
