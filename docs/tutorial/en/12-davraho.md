# Lesson 12. A loop inside a loop

**In this lesson:** you will use nested loops to draw shapes and build tables.

## A rectangle of stars

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

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINCx0LDQu9Cw0L3QtNOjID0gMzsK0YLQsNKTINCx0LDRgCA9IDU7CtCx0LDRgNC-0LggKNGC0LDSkyDSm9Cw0YLQvtGAID0gMTsg0pvQsNGC0L7RgCA8PSDQsdCw0LvQsNC90LTTozsg0pvQsNGC0L7RgCsrKSB7CiAg0YLQsNKTINGF0LDRgiA9ICIiOwogINCx0LDRgNC-0LggKNGC0LDSkyDRgdGD0YLRg9C9ID0gMTsg0YHRg9GC0YPQvSA8PSDQsdCw0YA7INGB0YPRgtGD0L0rKykgewogICAg0YXQsNGCID0g0YXQsNGCICsgIioiOwogIH0KICDRh9C-0L8o0YXQsNGCKTsKfQo)

- The outer loop makes the rows (`қатор`). The inner loop makes the symbols of
  one row.
- In each row, `хат` ("line") starts again as an empty string (`""`).

## A staircase

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

Input:

```text
4
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC9ID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtCx0LDRgNC-0LggKNGC0LDSkyDQuCA9IDE7INC4IDw9INC9OyDQuCsrKSB7CiAg0YLQsNKTINGF0LDRgiA9ICIiOwogINCx0LDRgNC-0LggKNGC0LDSkyDStyA9IDE7INK3IDw9INC4OyDStysrKSB7CiAgICDRhdCw0YIgKz0gIiMiOwogIH0KICDRh9C-0L8o0YXQsNGCKTsKfQo&i=NAo)

The inner loop runs `и` times: one symbol in the first row, two in the second,
and so on.

## Tasks

1. [Rectangle](../tasks/12-rostkunja/README.md)
2. [Triangle of digits](../tasks/12-sekunjai-raqamho/README.md)
3. [The full multiplication table](../tasks/12-jadvali-zarb/README.md)

---

[← Lesson 11](11-to.md) · [Contents](README.md) · [Lesson 13 →](13-funksiya.md)
