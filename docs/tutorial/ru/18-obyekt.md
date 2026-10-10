# Урок 18. Объекты

**В этом уроке:** вы будете хранить сведения об одной вещи под именами в одном
объекте.

## Что такое объект?

Список хранит значения под номерами (индексами). Объект — под **именами**:

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

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7QvdCw0L3QtNCwID0gewogINC90L7QvDogItCX0LDRgNC40L3QsCIsCiAg0YHQuNC90YQ6IDcsCiAg0LDRitC70L7Rh9OjOiDQtNGD0YDRg9GB0YIsCn07CtGH0L7QvyjRhdC-0L3QsNC90LTQsCk7CtGH0L7QvyjRhdC-0L3QsNC90LTQsC7QvdC-0LwpOwrRh9C-0L8oItCh0LjQvdGEOiIsINGF0L7QvdCw0L3QtNCwLtGB0LjQvdGEKTsK)

- Объект пишется в скобках `{ }`: `имя: значение`, через запятую.
- Каждое `имя: значение` — **свойство** (`хосият`). Его читают через точку:
  `хонанда.ном`.

## Изменить и добавить свойство

```som
тағ китоб = { ном: "Шоҳнома", саҳифаҳо: 500 };
китоб.саҳифаҳо = 520;
китоб.муаллиф = "Фирдавсӣ";
чоп(китоб);
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC60LjRgtC-0LEgPSB7INC90L7QvDogItCo0L7Ss9C90L7QvNCwIiwg0YHQsNKz0LjRhNCw0rPQvjogNTAwIH07CtC60LjRgtC-0LEu0YHQsNKz0LjRhNCw0rPQviA9IDUyMDsK0LrQuNGC0L7QsS7QvNGD0LDQu9C70LjRhCA9ICLQpNC40YDQtNCw0LLRgdOjIjsK0YfQvtC_KNC60LjRgtC-0LEpOwo)

## Список объектов

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

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7QvdCw0L3QtNCw0LPQvtC9ID0gWwogIHsg0L3QvtC8OiAi0JDQu9OjIiwg0YXQvtC7OiA3OCB9LAogIHsg0L3QvtC8OiAi0JfQsNGA0LjQvdCwIiwg0YXQvtC7OiA5NSB9LAogIHsg0L3QvtC8OiAi0KTQsNGA0rPQvtC0Iiwg0YXQvtC7OiA4OCB9LApdOwrRgtCw0pMg0LHQtdKz0YLQsNGA0LjQvSA9INGF0L7QvdCw0L3QtNCw0LPQvtC9WzBdOwrQsdCw0YDQvtC4ICjRgtCw0pMg0YUg0LDQtyDRhdC-0L3QsNC90LTQsNCz0L7QvSkgewogINCw0LPQsNGAICjRhS7RhdC-0LsgPiDQsdC10rPRgtCw0YDQuNC9LtGF0L7QuykgewogICAg0LHQtdKz0YLQsNGA0LjQvSA9INGFOwogIH0KfQrRh9C-0L8oItCR0LXSs9GC0LDRgNC40L06Iiwg0LHQtdKz0YLQsNGA0LjQvS7QvdC-0LwsINCx0LXSs9GC0LDRgNC40L0u0YXQvtC7KTsK)

## Частые ошибки

- Читать несуществующее свойство: `хонанда.суроға` даёт `беқимат`.
- Не называйте свойства именами методов языка, например `дарозӣ` или `илова`: у
  них особый смысл.

## Задачи

1. [Ученик](../tasks/18-khonanda/README.md)
2. [Покупки](../tasks/18-kharid/README.md)
3. [Лучший](../tasks/18-behtarin/README.md)

---

[← Урок 17](17-satrho.md) · [Оглавление](README.md)
