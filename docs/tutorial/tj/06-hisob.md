# Дарси 6. Ҳисоб: бақия ва `Риёзӣ`

**Дар ин дарс:** бақияи тақсимро меёбед, рақамҳоро яклухт мекунед ва аз
функсияҳои `Риёзӣ` истифода мебаред.

## Бақия: `%`

`а % б` — бақияи тақсими `а` ба `б`:

```som
чоп(17 % 5);
чоп(10 % 2);
чоп(7 % 2);
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KDE3ICUgNSk7CtGH0L7QvygxMCAlIDIpOwrRh9C-0L8oNyAlIDIpOwo)

Бақия бисёр лозим мешавад: рақам ҷуфт аст, агар `рақам % 2` ба `0` баробар
бошад; рақами охирини `123` — `123 % 10`, яъне `3`.

## Тақсими бебақия: `Риёзӣ.поён`

`Риёзӣ.поён(х)` қисми касриро мепартояд (рақамро ба поён яклухт мекунад):

```som
тағ дақиқаҳо = хонданиРақам();
тағ соат = Риёзӣ.поён(дақиқаҳо / 60);
тағ боқӣ = дақиқаҳо % 60;
чоп(соат, "соат", боқӣ, "дақиқа");
```

Вуруд:

```text
135
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC00LDSm9C40pvQsNKz0L4gPSDRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKTsK0YLQsNKTINGB0L7QsNGCID0g0KDQuNGR0LfToy7Qv9C-0ZHQvSjQtNCw0pvQuNKb0LDSs9C-IC8gNjApOwrRgtCw0pMg0LHQvtKb06MgPSDQtNCw0pvQuNKb0LDSs9C-ICUgNjA7CtGH0L7QvyjRgdC-0LDRgiwgItGB0L7QsNGCIiwg0LHQvtKb06MsICLQtNCw0pvQuNKb0LAiKTsK&i=MTM1Cg)

## Функсияҳои дигари `Риёзӣ`

| Функсия              | Маъно                 | Мисол                 | Натиҷа  |
| -------------------- | --------------------- | --------------------- | ------- |
| `Риёзӣ.поён(х)`      | яклухт ба поён        | `Риёзӣ.поён(3.7)`     | `3`     |
| `Риёзӣ.боло(х)`      | яклухт ба боло        | `Риёзӣ.боло(3.2)`     | `4`     |
| `Риёзӣ.дузкунӣ(х)`   | яклухт ба наздиктарин | `Риёзӣ.дузкунӣ(3.5)`  | `4`     |
| `Риёзӣ.мутлақ(х)`    | қимати мутлақ         | `Риёзӣ.мутлақ(-5)`    | `5`     |
| `Риёзӣ.дуръшака(х)`  | решаи квадратӣ        | `Риёзӣ.дуръшака(16)`  | `4`     |
| `Риёзӣ.қувват(х, н)` | дараҷа                | `Риёзӣ.қувват(2, 10)` | `1024`  |
| `Риёзӣ.ПИ`           | рақами π              | `Риёзӣ.ПИ`            | `3.14…` |

```som
тағ радиус = 3;
тағ масоҳат = Риёзӣ.ПИ * радиус * радиус;
чоп("Масоҳати доира:", масоҳат);
чоп("Яклухт:", Риёзӣ.дузкунӣ(масоҳат));
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGA0LDQtNC40YPRgSA9IDM7CtGC0LDSkyDQvNCw0YHQvtKz0LDRgiA9INCg0LjRkdC306Mu0J_QmCAqINGA0LDQtNC40YPRgSAqINGA0LDQtNC40YPRgTsK0YfQvtC_KCLQnNCw0YHQvtKz0LDRgtC4INC00L7QuNGA0LA6Iiwg0LzQsNGB0L7Ss9Cw0YIpOwrRh9C-0L8oItCv0LrQu9GD0YXRgjoiLCDQoNC40ZHQt9OjLtC00YPQt9C60YPQvdOjKNC80LDRgdC-0rPQsNGCKSk7Cg)

## Хатоҳои маъмул

- Ба сифр тақсим кардан: `5 / 0` хато намедиҳад, балки `беохир` мешавад.
- `Риёзӣ.Поён` бо ҳарфи калон: номҳо бояд айнан ҳамин тавр навишта шаванд.

## Супоришҳо

1. [Соат ва дақиқа](../tasks/06-soat/README.md)
2. [Ҷамъи рақамҳо](../tasks/06-jami-raqamho/README.md)
3. [Тақсими себҳо](../tasks/06-sebho/README.md)
4. [Гипотенуза](../tasks/06-gipotenuza/README.md)

---

[← Дарси 5](05-vurud.md) · [Мундариҷа](README.md) · [Дарси 7 →](07-muqoisa.md)
