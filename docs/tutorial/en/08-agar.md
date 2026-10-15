# Lesson 8. Conditions: `агар` and `вагарна`

**In this lesson:** the program makes a decision that depends on a condition.

## `агар`

`агар` means "if":

```som
тағ ҳарорат = хонданиРақам();
агар (ҳарорат > 30) {
  чоп("Имрӯз гарм аст!");
}
чоп("Рӯзи хуш!");
```

Input:

```text
35
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINKz0LDRgNC-0YDQsNGCID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtCw0LPQsNGAICjSs9Cw0YDQvtGA0LDRgiA-IDMwKSB7CiAg0YfQvtC_KCLQmNC80YDTr9C3INCz0LDRgNC8INCw0YHRgiEiKTsKfQrRh9C-0L8oItCg06_Qt9C4INGF0YPRiCEiKTsK&i=MzUK)

<!-- anim: if-branch -->

- The condition is written in brackets `( )`.
- The commands inside `{ }` run only if the condition is `дуруст`.
- `чоп("Рӯзи хуш!")` is outside the `{ }`, so it always runs.

Change the input to `20` and run the program again.

## `вагарна`

`вагарна` means "else" (otherwise). It says what to do if the condition is
false:

```som
тағ рақам = хонданиРақам();
агар (рақам % 2 === 0) {
  чоп(рақам, "ҷуфт аст");
} вагарна {
  чоп(рақам, "тоқ аст");
}
```

Input:

```text
7
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGA0LDSm9Cw0LwgPSDRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKTsK0LDQs9Cw0YAgKNGA0LDSm9Cw0LwgJSAyID09PSAwKSB7CiAg0YfQvtC_KNGA0LDSm9Cw0LwsICLSt9GD0YTRgiDQsNGB0YIiKTsKfSDQstCw0LPQsNGA0L3QsCB7CiAg0YfQvtC_KNGA0LDSm9Cw0LwsICLRgtC-0psg0LDRgdGCIik7Cn0K&i=Nwo)

<!-- anim: if-branch -->

Only one of the two parts runs, never both.

<!-- quiz
q: What does this program print?
code: |
  тағ х = 3;
  агар (х > 5) {
    чоп("калон");
  } вагарна {
    чоп("хурд");
  }
options: калон | *хурд | калон and хурд | nothing
explain: `3 > 5` is false, so the `вагарна` part runs.
-->

## The greater of two numbers

```som
тағ а = хонданиРақам();
тағ б = хонданиРақам();
агар (а > б) {
  чоп(а);
} вагарна {
  чоп(б);
}
```

Input:

```text
4
9
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINCwID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtGC0LDSkyDQsSA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrQsNCz0LDRgCAo0LAgPiDQsSkgewogINGH0L7QvyjQsCk7Cn0g0LLQsNCz0LDRgNC90LAgewogINGH0L7QvyjQsSk7Cn0K&i=NAo5Cg)

## Formatting

The commands inside `{ }` are written two spaces further to the right. The
computer does not care, but people can read the program more easily. In the
playground, when you type `{` and press Enter, the spaces are added for you.

## Common mistakes

- `агар (х = 5)`: `=` instead of `===`.
- `;` after the condition: `агар (х > 5); { … }`. Then the `{ }` part always
  runs.
- Forgetting the `}`. The playground tells you on which line the bracket was
  opened.

## Tasks

1. [Even or odd](../tasks/08-juft-yo-toq/README.md)
2. [The greatest](../tasks/08-kalontarin/README.md)
3. [The exam](../tasks/08-imtihon/README.md)
4. [Absolute value](../tasks/08-mutlaq/README.md)

---

[← Lesson 7](07-muqoisa.md) · [Contents](README.md) ·
[Lesson 9 →](09-shartho.md)
