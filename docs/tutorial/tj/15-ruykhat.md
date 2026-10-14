# Дарси 15. Рӯйхатҳо

**Дар ин дарс:** якчанд қиматро дар як рӯйхат нигоҳ медоред.

## Рӯйхат чист?

Рӯйхат якчанд қиматро бо тартиб нигоҳ медорад. Онро дар қавси квадратӣ `[ ]`
менависанд:

```som
тағ холҳо = [5, 4, 5, 3];
чоп(холҳо);
чоп("Аввалин:", холҳо[0]);
чоп("Дуюмин:", холҳо[1]);
чоп("Шумора:", холҳо.дарозӣ);
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7Qu9Kz0L4gPSBbNSwgNCwgNSwgM107CtGH0L7QvyjRhdC-0LvSs9C-KTsK0YfQvtC_KCLQkNCy0LLQsNC70LjQvToiLCDRhdC-0LvSs9C-WzBdKTsK0YfQvtC_KCLQlNGD0Y7QvNC40L06Iiwg0YXQvtC70rPQvlsxXSk7CtGH0L7Qvygi0KjRg9C80L7RgNCwOiIsINGF0L7Qu9Kz0L4u0LTQsNGA0L7Qt9OjKTsK)

- Ҳар қимат дар рӯйхат **унсур** аст. Рақами унсур — **индекс** — аз `0` сар
  мешавад: унсури аввал `холҳо[0]` аст.
- `холҳо.дарозӣ` — шумораи унсурҳо. Унсури охирин: `холҳо[холҳо.дарозӣ - 1]`.

## Иваз кардан ва илова кардан

```som
тағ меваҳо = ["себ", "нок"];
меваҳо[0] = "анор";
меваҳо.илова("ангур");
чоп(меваҳо);
чоп(меваҳо.дарозӣ);
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC80LXQstCw0rPQviA9IFsi0YHQtdCxIiwgItC90L7QuiJdOwrQvNC10LLQsNKz0L5bMF0gPSAi0LDQvdC-0YAiOwrQvNC10LLQsNKz0L4u0LjQu9C-0LLQsCgi0LDQvdCz0YPRgCIpOwrRh9C-0L8o0LzQtdCy0LDSs9C-KTsK0YfQvtC_KNC80LXQstCw0rPQvi7QtNCw0YDQvtC306MpOwo)

`илова` унсурро ба охири рӯйхат илова мекунад.

## Давра аз рӯи рӯйхат

`барои (тағ х аз рӯйхат)` ҳар унсурро як-як мегирад:

```som
тағ холҳо = [5, 4, 5, 3, 4];
тағ ҷамъ = 0;
барои (тағ хол аз холҳо) {
  ҷамъ += хол;
}
чоп("Миёна:", ҷамъ / холҳо.дарозӣ);
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7Qu9Kz0L4gPSBbNSwgNCwgNSwgMywgNF07CtGC0LDSkyDSt9Cw0LzRiiA9IDA7CtCx0LDRgNC-0LggKNGC0LDSkyDRhdC-0Lsg0LDQtyDRhdC-0LvSs9C-KSB7CiAg0rfQsNC80YogKz0g0YXQvtC7Owp9CtGH0L7Qvygi0JzQuNGR0L3QsDoiLCDSt9Cw0LzRiiAvINGF0L7Qu9Kz0L4u0LTQsNGA0L7Qt9OjKTsK)

## Рӯйхатро аз вуруд пур кардан

Аввал шумораи унсурҳо, баъд худи унсурҳо, ҳар кадом дар сатри алоҳида:

```som
тағ н = хонданиРақам();
тағ рақамҳо = [];
барои (тағ и = 0; и < н; и++) {
  рақамҳо.илова(хонданиРақам());
}
чоп(рақамҳо);
```

Вуруд:

```text
3
10
20
30
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC9ID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtGC0LDSkyDRgNCw0pvQsNC80rPQviA9IFtdOwrQsdCw0YDQvtC4ICjRgtCw0pMg0LggPSAwOyDQuCA8INC9OyDQuCsrKSB7CiAg0YDQsNKb0LDQvNKz0L4u0LjQu9C-0LLQsCjRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKSk7Cn0K0YfQvtC_KNGA0LDSm9Cw0LzSs9C-KTsK&i=MwoxMAoyMAozMAo)

## Хатоҳои маъмул

- Индекс аз `1` не, аз `0` сар мешавад.
- Унсури берун аз рӯйхат: `холҳо[10]` қимати `беқимат` медиҳад, ва
  `холҳо[10].дарозӣ` хатои иҷро мешавад.

## Супоришҳо

1. [Ҷамъи рӯйхат](../tasks/15-jami-ruykhat/README.md)
2. [Калонтарин дар рӯйхат](../tasks/15-kalontarin/README.md)
3. [Баръакс](../tasks/15-baraks/README.md)
4. [Шумораи ҷуфтҳо](../tasks/15-shumorai-juftho/README.md)

---

[← Дарси 14](14-bozgasht.md) · [Мундариҷа](README.md) ·
[Дарси 16 →](16-ruykhatho.md)
