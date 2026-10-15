# Lesson 18. Objects

**In this lesson:** you will keep facts about one thing in one object, each
under its own name.

## What is an object?

A list keeps values under numbers (indexes). An object keeps them under
**names**:

```som
тағ хонанда = {
  ном: "Зарина",
  синф: 7,
  аълочӣ: дуруст,
};
чоп(хонанда);
чоп(хонанда.ном);
чоп("Синф:", хонанда.синф);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7QvdCw0L3QtNCwID0gewogINC90L7QvDogItCX0LDRgNC40L3QsCIsCiAg0YHQuNC90YQ6IDcsCiAg0LDRitC70L7Rh9OjOiDQtNGD0YDRg9GB0YIsCn07CtGH0L7QvyjRhdC-0L3QsNC90LTQsCk7CtGH0L7QvyjRhdC-0L3QsNC90LTQsC7QvdC-0LwpOwrRh9C-0L8oItCh0LjQvdGEOiIsINGF0L7QvdCw0L3QtNCwLtGB0LjQvdGEKTsK)

- An object is written in curly brackets `{ }`: `name: value`, separated by
  commas.
- Each `name: value` is a **property** (`хосият`). You read it with a dot:
  `хонанда.ном`.

## Change and add a property

```som
тағ китоб = { ном: "Шоҳнома", саҳифаҳо: 500 };
китоб.саҳифаҳо = 520;
китоб.муаллиф = "Фирдавсӣ";
чоп(китоб);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC60LjRgtC-0LEgPSB7INC90L7QvDogItCo0L7Ss9C90L7QvNCwIiwg0YHQsNKz0LjRhNCw0rPQvjogNTAwIH07CtC60LjRgtC-0LEu0YHQsNKz0LjRhNCw0rPQviA9IDUyMDsK0LrQuNGC0L7QsS7QvNGD0LDQu9C70LjRhCA9ICLQpNC40YDQtNCw0LLRgdOjIjsK0YfQvtC_KNC60LjRgtC-0LEpOwo)

## A list of objects

```som
тағ хонандагон = [
  { ном: "Алӣ", хол: 78 },
  { ном: "Зарина", хол: 95 },
  { ном: "Фарҳод", хол: 88 },
];
тағ беҳтарин = хонандагон[0];
барои (тағ х аз хонандагон) {
  агар (х.хол > беҳтарин.хол) {
    беҳтарин = х;
  }
}
чоп("Беҳтарин:", беҳтарин.ном, беҳтарин.хол);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7QvdCw0L3QtNCw0LPQvtC9ID0gWwogIHsg0L3QvtC8OiAi0JDQu9OjIiwg0YXQvtC7OiA3OCB9LAogIHsg0L3QvtC8OiAi0JfQsNGA0LjQvdCwIiwg0YXQvtC7OiA5NSB9LAogIHsg0L3QvtC8OiAi0KTQsNGA0rPQvtC0Iiwg0YXQvtC7OiA4OCB9LApdOwrRgtCw0pMg0LHQtdKz0YLQsNGA0LjQvSA9INGF0L7QvdCw0L3QtNCw0LPQvtC9WzBdOwrQsdCw0YDQvtC4ICjRgtCw0pMg0YUg0LDQtyDRhdC-0L3QsNC90LTQsNCz0L7QvSkgewogINCw0LPQsNGAICjRhS7RhdC-0LsgPiDQsdC10rPRgtCw0YDQuNC9LtGF0L7QuykgewogICAg0LHQtdKz0YLQsNGA0LjQvSA9INGFOwogIH0KfQrRh9C-0L8oItCR0LXSs9GC0LDRgNC40L06Iiwg0LHQtdKz0YLQsNGA0LjQvS7QvdC-0LwsINCx0LXSs9GC0LDRgNC40L0u0YXQvtC7KTsK)

## Common mistakes

- Reading a property that does not exist: `хонанда.суроға` gives `беқимат`.
- Do not give properties the names of the language's methods, such as `дарозӣ`
  or `илова`: they have a special meaning.

## Tasks

1. [The student](../tasks/18-khonanda/README.md)
2. [Shopping](../tasks/18-kharid/README.md)
3. [The best](../tasks/18-behtarin/README.md)

---

[← Lesson 17](17-satrho.md) · [Contents](README.md)
