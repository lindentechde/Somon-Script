# Дарси 12. Давра дар дохили давра

**Дар ин дарс:** бо ду давраи якдигарро дарбаргиранда шаклҳо мекашед ва ҷадвалҳо
месозед.

## Росткунҷа аз ситораҳо

```som
тағ баландӣ = 3;
тағ бар = 5;
барои (тағ қатор = 1; қатор <= баландӣ; қатор++) {
  тағ хат = "";
  барои (тағ сутун = 1; сутун <= бар; сутун++) {
    хат = хат + "*";
  }
  чоп(хат);
}
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINCx0LDQu9Cw0L3QtNOjID0gMzsK0YLQsNKTINCx0LDRgCA9IDU7CtCx0LDRgNC-0LggKNGC0LDSkyDSm9Cw0YLQvtGAID0gMTsg0pvQsNGC0L7RgCA8PSDQsdCw0LvQsNC90LTTozsg0pvQsNGC0L7RgCsrKSB7CiAg0YLQsNKTINGF0LDRgiA9ICIiOwogINCx0LDRgNC-0LggKNGC0LDSkyDRgdGD0YLRg9C9ID0gMTsg0YHRg9GC0YPQvSA8PSDQsdCw0YA7INGB0YPRgtGD0L0rKykgewogICAg0YXQsNGCID0g0YXQsNGCICsgIioiOwogIH0KICDRh9C-0L8o0YXQsNGCKTsKfQo)

- Давраи берунӣ сатрҳоро месозад, давраи дохилӣ — аломатҳои як сатрро.
- `хат` дар ҳар сатр аз нав холӣ (`""`) сар мешавад.

## Зина

```som
тағ н = хонданиРақам();
барои (тағ и = 1; и <= н; и++) {
  тағ хат = "";
  барои (тағ ҷ = 1; ҷ <= и; ҷ++) {
    хат += "#";
  }
  чоп(хат);
}
```

Вуруд:

```text
4
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC9ID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtCx0LDRgNC-0LggKNGC0LDSkyDQuCA9IDE7INC4IDw9INC9OyDQuCsrKSB7CiAg0YLQsNKTINGF0LDRgiA9ICIiOwogINCx0LDRgNC-0LggKNGC0LDSkyDStyA9IDE7INK3IDw9INC4OyDStysrKSB7CiAgICDRhdCw0YIgKz0gIiMiOwogIH0KICDRh9C-0L8o0YXQsNGCKTsKfQo&i=NAo)

Давраи дохилӣ `и` бор кор мекунад: дар сатри якум як аломат, дар сатри дуюм ду
аломат ва ҳоказо.

## Супоришҳо

1. [Росткунҷа](../tasks/12-rostkunja/README.md)
2. [Секунҷаи рақамҳо](../tasks/12-sekunjai-raqamho/README.md)
3. [Ҷадвали зарби пурра](../tasks/12-jadvali-zarb/README.md)

---

[← Дарси 11](11-to.md) · [Мундариҷа](README.md) · [Дарси 13 →](13-funksiya.md)
