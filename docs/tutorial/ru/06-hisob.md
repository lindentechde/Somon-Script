# Урок 6. Вычисления: остаток и `Риёзӣ`

**В этом уроке:** вы найдёте остаток от деления, округлите числа и
воспользуетесь функциями `Риёзӣ` («математика»).

## Остаток: `%`

`а % б` — остаток от деления `а` на `б`:

```som
чоп(17 % 5);
чоп(10 % 2);
чоп(7 % 2);
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KDE3ICUgNSk7CtGH0L7QvygxMCAlIDIpOwrRh9C-0L8oNyAlIDIpOwo)

Остаток нужен часто: число чётное, если `число % 2` равно `0`; последняя цифра
`123` — это `123 % 10`, то есть `3`.

## Деление без остатка: `Риёзӣ.поён`

`Риёзӣ.поён(х)` отбрасывает дробную часть (округляет вниз):

```som
тағ дақиқаҳо = хонданиРақам();
тағ соат = Риёзӣ.поён(дақиқаҳо / 60);
тағ боқӣ = дақиқаҳо % 60;
чоп(соат, "соат", боқӣ, "дақиқа");
```

Ввод:

```text
135
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC00LDSm9C40pvQsNKz0L4gPSDRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKTsK0YLQsNKTINGB0L7QsNGCID0g0KDQuNGR0LfToy7Qv9C-0ZHQvSjQtNCw0pvQuNKb0LDSs9C-IC8gNjApOwrRgtCw0pMg0LHQvtKb06MgPSDQtNCw0pvQuNKb0LDSs9C-ICUgNjA7CtGH0L7QvyjRgdC-0LDRgiwgItGB0L7QsNGCIiwg0LHQvtKb06MsICLQtNCw0pvQuNKb0LAiKTsK&i=MTM1Cg)

## Другие функции `Риёзӣ`

| Функция              | Смысл                   | Пример                | Результат |
| -------------------- | ----------------------- | --------------------- | --------- |
| `Риёзӣ.поён(х)`      | округлить вниз          | `Риёзӣ.поён(3.7)`     | `3`       |
| `Риёзӣ.боло(х)`      | округлить вверх         | `Риёзӣ.боло(3.2)`     | `4`       |
| `Риёзӣ.дузкунӣ(х)`   | округлить до ближайшего | `Риёзӣ.дузкунӣ(3.5)`  | `4`       |
| `Риёзӣ.мутлақ(х)`    | модуль                  | `Риёзӣ.мутлақ(-5)`    | `5`       |
| `Риёзӣ.дуръшака(х)`  | квадратный корень       | `Риёзӣ.дуръшака(16)`  | `4`       |
| `Риёзӣ.қувват(х, н)` | степень                 | `Риёзӣ.қувват(2, 10)` | `1024`    |
| `Риёзӣ.ПИ`           | число π                 | `Риёзӣ.ПИ`            | `3.14…`   |

```som
тағ радиус = 3;
тағ масоҳат = Риёзӣ.ПИ * радиус * радиус;
чоп("Масоҳати доира:", масоҳат);
чоп("Яклухт:", Риёзӣ.дузкунӣ(масоҳат));
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGA0LDQtNC40YPRgSA9IDM7CtGC0LDSkyDQvNCw0YHQvtKz0LDRgiA9INCg0LjRkdC306Mu0J_QmCAqINGA0LDQtNC40YPRgSAqINGA0LDQtNC40YPRgTsK0YfQvtC_KCLQnNCw0YHQvtKz0LDRgtC4INC00L7QuNGA0LA6Iiwg0LzQsNGB0L7Ss9Cw0YIpOwrRh9C-0L8oItCv0LrQu9GD0YXRgjoiLCDQoNC40ZHQt9OjLtC00YPQt9C60YPQvdOjKNC80LDRgdC-0rPQsNGCKSk7Cg)

## Частые ошибки

- Деление на ноль: `5 / 0` не даёт ошибки, а получается `беохир`
  (бесконечность).
- `Риёзӣ.Поён` с большой буквы: имена пишутся в точности так.

## Задачи

1. [Часы и минуты](../tasks/06-soat/README.md)
2. [Сумма цифр](../tasks/06-jami-raqamho/README.md)
3. [Делим яблоки](../tasks/06-sebho/README.md)
4. [Гипотенуза](../tasks/06-gipotenuza/README.md)

---

[← Урок 5](05-vurud.md) · [Оглавление](README.md) · [Урок 7 →](07-muqoisa.md)
