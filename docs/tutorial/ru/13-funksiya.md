# Урок 13. Функции

**В этом уроке:** вы дадите имя части программы и будете использовать её
несколько раз.

## Что такое функция?

Функция (`функсия`) — часть программы с именем. Её пишут один раз и **вызывают**
сколько угодно раз:

```som
функсия салом() {
  чоп("Салом!");
  чоп("Хуш омадед!");
}

салом();
салом();
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0YHQsNC70L7QvCgpIHsKICDRh9C-0L8oItCh0LDQu9C-0LwhIik7CiAg0YfQvtC_KCLQpdGD0Ygg0L7QvNCw0LTQtdC0ISIpOwp9CgrRgdCw0LvQvtC8KCk7CtGB0LDQu9C-0LwoKTsK)

- `функсия салом() { … }` объявляет функцию. Пока ничего не выводится.
- `салом();` вызывает функцию: выполняются команды внутри неё.

## Параметры

Функции можно передать значения. Их называют **параметрами**:

```som
функсия саломДиҳ(ном: сатр) {
  чоп("Салом, " + ном + "!");
}

саломДиҳ("Зарина");
саломДиҳ("Фарҳод");
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0YHQsNC70L7QvNCU0LjSsyjQvdC-0Lw6INGB0LDRgtGAKSB7CiAg0YfQvtC_KCLQodCw0LvQvtC8LCAiICsg0L3QvtC8ICsgIiEiKTsKfQoK0YHQsNC70L7QvNCU0LjSsygi0JfQsNGA0LjQvdCwIik7CtGB0LDQu9C-0LzQlNC40rMoItCk0LDRgNKz0L7QtCIpOwo)

`ном: сатр` — параметр `ном` типа `сатр` (строка). Тип говорит, какое значение
ожидается: `сатр` (строка), `рақам` (число) или `мантиқӣ` (логическое). Если
передать число вместо строки, песочница предупредит.

## Несколько параметров

```som
функсия хат(аломат: сатр, шумора: рақам) {
  тағ натиҷа = "";
  барои (тағ и = 0; и < шумора; и++) {
    натиҷа += аломат;
  }
  чоп(натиҷа);
}

хат("*", 5);
хат("-", 10);
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0YXQsNGCKNCw0LvQvtC80LDRgjog0YHQsNGC0YAsINGI0YPQvNC-0YDQsDog0YDQsNKb0LDQvCkgewogINGC0LDSkyDQvdCw0YLQuNK30LAgPSAiIjsKICDQsdCw0YDQvtC4ICjRgtCw0pMg0LggPSAwOyDQuCA8INGI0YPQvNC-0YDQsDsg0LgrKykgewogICAg0L3QsNGC0LjSt9CwICs9INCw0LvQvtC80LDRgjsKICB9CiAg0YfQvtC_KNC90LDRgtC40rfQsCk7Cn0KCtGF0LDRgigiKiIsIDUpOwrRhdCw0YIoIi0iLCAxMCk7Cg)

## Частые ошибки

- Объявить функцию и не вызвать: тогда ничего не выполнится.
- Забыть скобки при вызове: `салом;` вместо `салом();`.
- Ошибиться в имени функции: песочница предложит похожее имя.

## Задачи

1. [Приветствие](../tasks/13-salomdihi/README.md)
2. [Линия](../tasks/13-khat/README.md)
3. [Таблица](../tasks/13-jadval/README.md)

---

[← Урок 12](12-davraho.md) · [Оглавление](README.md) ·
[Урок 14 →](14-bozgasht.md)
