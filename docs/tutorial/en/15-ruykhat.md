# Lesson 15. Lists

**In this lesson:** you will keep several values in one list.

## What is a list?

A list (`рӯйхат`) keeps several values in order. You write it in square brackets
`[ ]`:

```som
тағ холҳо = [5, 4, 5, 3];
чоп(холҳо);
чоп("Аввалин:", холҳо[0]);
чоп("Дуюмин:", холҳо[1]);
чоп("Шумора:", холҳо.дарозӣ);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7Qu9Kz0L4gPSBbNSwgNCwgNSwgM107CtGH0L7QvyjRhdC-0LvSs9C-KTsK0YfQvtC_KCLQkNCy0LLQsNC70LjQvToiLCDRhdC-0LvSs9C-WzBdKTsK0YfQvtC_KCLQlNGD0Y7QvNC40L06Iiwg0YXQvtC70rPQvlsxXSk7CtGH0L7Qvygi0KjRg9C80L7RgNCwOiIsINGF0L7Qu9Kz0L4u0LTQsNGA0L7Qt9OjKTsK)

- Each value in a list is an **element** (`унсур`). The number of an element,
  its **index**, starts at `0`: the first element is `холҳо[0]`.
- `холҳо.дарозӣ` ("length") is the number of elements. The last element is
  `холҳо[холҳо.дарозӣ - 1]`.

## Change and add

```som
тағ меваҳо = ["себ", "нок"];
меваҳо[0] = "анор";
меваҳо.илова("ангур");
чоп(меваҳо);
чоп(меваҳо.дарозӣ);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC80LXQstCw0rPQviA9IFsi0YHQtdCxIiwgItC90L7QuiJdOwrQvNC10LLQsNKz0L5bMF0gPSAi0LDQvdC-0YAiOwrQvNC10LLQsNKz0L4u0LjQu9C-0LLQsCgi0LDQvdCz0YPRgCIpOwrRh9C-0L8o0LzQtdCy0LDSs9C-KTsK0YfQvtC_KNC80LXQstCw0rPQvi7QtNCw0YDQvtC306MpOwo)

`илова` ("add") adds an element to the end of the list.

## A loop over a list

`барои (тағ х аз рӯйхат)` takes the elements one by one:

```som
тағ холҳо = [5, 4, 5, 3, 4];
тағ ҷамъ = 0;
барои (тағ хол аз холҳо) {
  ҷамъ += хол;
}
чоп("Миёна:", ҷамъ / холҳо.дарозӣ);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7Qu9Kz0L4gPSBbNSwgNCwgNSwgMywgNF07CtGC0LDSkyDSt9Cw0LzRiiA9IDA7CtCx0LDRgNC-0LggKNGC0LDSkyDRhdC-0Lsg0LDQtyDRhdC-0LvSs9C-KSB7CiAg0rfQsNC80YogKz0g0YXQvtC7Owp9CtGH0L7Qvygi0JzQuNGR0L3QsDoiLCDSt9Cw0LzRiiAvINGF0L7Qu9Kz0L4u0LTQsNGA0L7Qt9OjKTsK)

## Fill a list from the input

First the number of elements, then the elements themselves, each on its own
line:

```som
тағ н = хонданиРақам();
тағ рақамҳо = [];
барои (тағ и = 0; и < н; и++) {
  рақамҳо.илова(хонданиРақам());
}
чоп(рақамҳо);
```

Input:

```text
3
10
20
30
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC9ID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtGC0LDSkyDRgNCw0pvQsNC80rPQviA9IFtdOwrQsdCw0YDQvtC4ICjRgtCw0pMg0LggPSAwOyDQuCA8INC9OyDQuCsrKSB7CiAg0YDQsNKb0LDQvNKz0L4u0LjQu9C-0LLQsCjRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKSk7Cn0K0YfQvtC_KNGA0LDSm9Cw0LzSs9C-KTsK&i=MwoxMAoyMAozMAo)

## Common mistakes

- The index starts at `0`, not at `1`.
- An element outside the list: `холҳо[10]` gives `беқимат` (no value), and
  `холҳо[10].дарозӣ` gives an error while the program runs.

## Tasks

1. [Sum of a list](../tasks/15-jami-ruykhat/README.md)
2. [The greatest in a list](../tasks/15-kalontarin/README.md)
3. [Backwards](../tasks/15-baraks/README.md)
4. [Number of even numbers](../tasks/15-shumorai-juftho/README.md)

---

[← Lesson 14](14-bozgasht.md) · [Contents](README.md) ·
[Lesson 16 →](16-ruykhatho.md)
