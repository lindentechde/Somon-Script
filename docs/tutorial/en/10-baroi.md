# Lesson 10. The `барои` loop

**In this lesson:** you will repeat commands several times with a loop.

## What is a loop?

To print the numbers from 1 to 5, you can write five `чоп` commands. But what
about 1 to 1000? To repeat things, you need a **loop** (`давра`). `барои` means
"for":

```som
барои (тағ и = 1; и <= 5; и++) {
  чоп(и);
}
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0LHQsNGA0L7QuCAo0YLQsNKTINC4ID0gMTsg0LggPD0gNTsg0LgrKykgewogINGH0L7QvyjQuCk7Cn0K)

<!-- anim: loop-counter {"counter": "и"} -->

The brackets of `барои` have three parts, separated by `;`:

1. `тағ и = 1` is the start: it runs once, before the loop.
2. `и <= 5` is the condition: the loop goes on while it is `дуруст`.
3. `и++` runs after each step: it makes `и` one bigger (`и = и + 1`).

## Sum of the numbers from 1 to n

```som
тағ н = хонданиРақам();
тағ ҷамъ = 0;
барои (тағ и = 1; и <= н; и++) {
  ҷамъ = ҷамъ + и;
}
чоп("Ҷамъ:", ҷамъ);
```

Input:

```text
10
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC9ID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtGC0LDSkyDSt9Cw0LzRiiA9IDA7CtCx0LDRgNC-0LggKNGC0LDSkyDQuCA9IDE7INC4IDw9INC9OyDQuCsrKSB7CiAg0rfQsNC80YogPSDSt9Cw0LzRiiArINC4Owp9CtGH0L7Qvygi0rbQsNC80Yo6Iiwg0rfQsNC80YopOwo&i=MTAK)

<!-- anim: loop-counter {"counter": "и", "total": "ҷамъ"} -->

`ҷамъ` ("sum") is `0` before the loop, and at each step `и` is added to it.
`ҷамъ = ҷамъ + и` can also be written shorter: `ҷамъ += и`.

<!-- quiz
q: How many times does `чоп` run in this loop?
code: |
  барои (тағ и = 0; и < 3; и++) {
    чоп(и);
  }
options: 2 | *3 | 4 | 0
explain: `и` is 0, then 1, then 2; when `и` becomes 3, the condition `и < 3` is false.
-->

## Multiplication table

```som
тағ н = хонданиРақам();
барои (тағ и = 1; и <= 10; и++) {
  чоп(н + " × " + и + " = " + н * и);
}
```

Input:

```text
7
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC9ID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtCx0LDRgNC-0LggKNGC0LDSkyDQuCA9IDE7INC4IDw9IDEwOyDQuCsrKSB7CiAg0YfQvtC_KNC9ICsgIiDDlyAiICsg0LggKyAiID0gIiArINC9ICog0LgpOwp9Cg&i=Nwo)

<!-- anim: loop-counter {"counter": "и"} -->

## Common mistakes

- A loop that never ends: `барои (тағ и = 1; и <= 5; и--)`. Here `и` gets
  smaller, so the condition is always true. The playground stops the program
  after a few seconds.
- A comma instead of `;` in the brackets of `барои`.

## Tasks

1. [From 1 to n](../tasks/10-1-to-n/README.md)
2. [Sum from 1 to n](../tasks/10-jam-to-n/README.md)
3. [Factorial](../tasks/10-faktorial/README.md)
4. [Even numbers](../tasks/10-juftho/README.md)

---

[← Lesson 9](09-shartho.md) · [Contents](README.md) · [Lesson 11 →](11-to.md)
