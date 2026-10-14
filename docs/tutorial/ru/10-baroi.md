# Урок 10. Цикл `барои`

**В этом уроке:** вы повторите команды несколько раз с помощью цикла.

## Что такое цикл?

Чтобы вывести числа от 1 до 5, можно написать пять `чоп`. А от 1 до 1000? Для
повторения нужен **цикл** (`давра`). `барои` значит «для»:

```som
барои (тағ и = 1; и <= 5; и++) {
  чоп(и);
}
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0LHQsNGA0L7QuCAo0YLQsNKTINC4ID0gMTsg0LggPD0gNTsg0LgrKykgewogINGH0L7QvyjQuCk7Cn0K)

В скобках `барои` три части через `;`:

1. `тағ и = 1` — начало: один раз, перед циклом.
2. `и <= 5` — условие: цикл продолжается, пока оно `дуруст`.
3. `и++` — после каждого шага: увеличивает `и` на единицу (`и = и + 1`).

## Сумма чисел от 1 до н

```som
тағ н = хонданиРақам();
тағ ҷамъ = 0;
барои (тағ и = 1; и <= н; и++) {
  ҷамъ = ҷамъ + и;
}
чоп("Ҷамъ:", ҷамъ);
```

Ввод:

```text
10
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC9ID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtGC0LDSkyDSt9Cw0LzRiiA9IDA7CtCx0LDRgNC-0LggKNGC0LDSkyDQuCA9IDE7INC4IDw9INC9OyDQuCsrKSB7CiAg0rfQsNC80YogPSDSt9Cw0LzRiiArINC4Owp9CtGH0L7Qvygi0rbQsNC80Yo6Iiwg0rfQsNC80YopOwo&i=MTAK)

`ҷамъ` («сумма») до цикла равна `0`, и на каждом шаге к ней прибавляется `и`.
`ҷамъ = ҷамъ + и` можно записать короче: `ҷамъ += и`.

## Таблица умножения

```som
тағ н = хонданиРақам();
барои (тағ и = 1; и <= 10; и++) {
  чоп(н + " × " + и + " = " + н * и);
}
```

Ввод:

```text
7
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC9ID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtCx0LDRgNC-0LggKNGC0LDSkyDQuCA9IDE7INC4IDw9IDEwOyDQuCsrKSB7CiAg0YfQvtC_KNC9ICsgIiDDlyAiICsg0LggKyAiID0gIiArINC9ICog0LgpOwp9Cg&i=Nwo)

## Частые ошибки

- Бесконечный цикл: `барои (тағ и = 1; и <= 5; и--)` — `и` уменьшается, и
  условие всегда истинно. Песочница остановит программу через несколько секунд.
- Запятая вместо `;` в скобках `барои`.

## Задачи

1. [От 1 до н](../tasks/10-1-to-n/README.md)
2. [Сумма от 1 до н](../tasks/10-jam-to-n/README.md)
3. [Факториал](../tasks/10-faktorial/README.md)
4. [Чётные](../tasks/10-juftho/README.md)

---

[← Урок 9](09-shartho.md) · [Оглавление](README.md) · [Урок 11 →](11-to.md)
