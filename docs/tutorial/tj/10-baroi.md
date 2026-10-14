# Дарси 10. Давраи `барои`

**Дар ин дарс:** фармонҳоро бо давра чанд бор такрор мекунед.

## Давра чист?

Агар лозим бошад, ки 1 то 5-ро чоп кунем, панҷ `чоп` навиштан мумкин аст. Аммо 1
то 1000-ро? Барои такрор **давра** лозим аст:

```som
барои (тағ и = 1; и <= 5; и++) {
  чоп(и);
}
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0LHQsNGA0L7QuCAo0YLQsNKTINC4ID0gMTsg0LggPD0gNTsg0LgrKykgewogINGH0L7QvyjQuCk7Cn0K)

Дар қавси `барои` се қисм ҳаст, ки бо `;` ҷудо шудаанд:

1. `тағ и = 1` — оғоз: як бор, пеш аз давра.
2. `и <= 5` — шарт: давра то вақте ки шарт `дуруст` аст, давом мекунад.
3. `и++` — пас аз ҳар давр: `и`-ро як адад зиёд мекунад (`и = и + 1`).

## Ҷамъи рақамҳо аз 1 то н

```som
тағ н = хонданиРақам();
тағ ҷамъ = 0;
барои (тағ и = 1; и <= н; и++) {
  ҷамъ = ҷамъ + и;
}
чоп("Ҷамъ:", ҷамъ);
```

Вуруд:

```text
10
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC9ID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtGC0LDSkyDSt9Cw0LzRiiA9IDA7CtCx0LDRgNC-0LggKNGC0LDSkyDQuCA9IDE7INC4IDw9INC9OyDQuCsrKSB7CiAg0rfQsNC80YogPSDSt9Cw0LzRiiArINC4Owp9CtGH0L7Qvygi0rbQsNC80Yo6Iiwg0rfQsNC80YopOwo&i=MTAK)

`ҷамъ` пеш аз давра `0` аст ва дар ҳар давр `и`-ро ба худ илова мекунад.
`ҷамъ = ҷамъ + и`-ро кӯтоҳтар ҳам навиштан мумкин: `ҷамъ += и`.

## Ҷадвали зарб

```som
тағ н = хонданиРақам();
барои (тағ и = 1; и <= 10; и++) {
  чоп(н + " × " + и + " = " + н * и);
}
```

Вуруд:

```text
7
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC9ID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtCx0LDRgNC-0LggKNGC0LDSkyDQuCA9IDE7INC4IDw9IDEwOyDQuCsrKSB7CiAg0YfQvtC_KNC9ICsgIiDDlyAiICsg0LggKyAiID0gIiArINC9ICog0LgpOwp9Cg&i=Nwo)

## Хатоҳои маъмул

- Давраи беохир: `барои (тағ и = 1; и <= 5; и--)` — `и` хурд мешавад ва шарт
  ҳамеша `дуруст` аст. Майдони озмоиш барномаро пас аз чанд сония қатъ мекунад.
- Вергул ба ҷои `;` дар қавси `барои`.

## Супоришҳо

1. [Аз 1 то н](../tasks/10-1-to-n/README.md)
2. [Ҷамъ аз 1 то н](../tasks/10-jam-to-n/README.md)
3. [Факториал](../tasks/10-faktorial/README.md)
4. [Ҷуфтҳо](../tasks/10-juftho/README.md)

---

[← Дарси 9](09-shartho.md) · [Мундариҷа](README.md) · [Дарси 11 →](11-to.md)
