# Lesson 6. Calculations: the remainder and `Риёзӣ`

**In this lesson:** you will find the remainder of a division, round numbers,
and use the functions of `Риёзӣ` ("math").

## The remainder: `%`

`а % б` is the remainder when you divide `а` by `б`:

```som
чоп(17 % 5);
чоп(10 % 2);
чоп(7 % 2);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KDE3ICUgNSk7CtGH0L7QvygxMCAlIDIpOwrRh9C-0L8oNyAlIDIpOwo)

You will need the remainder often: a number (`рақам`) is even if `рақам % 2` is
`0`; the last digit of `123` is `123 % 10`, that is, `3`.

## Division without the remainder: `Риёзӣ.поён`

`Риёзӣ.поён(х)` drops the decimal part (it rounds down):

```som
тағ дақиқаҳо = хонданиРақам();
тағ соат = Риёзӣ.поён(дақиқаҳо / 60);
тағ боқӣ = дақиқаҳо % 60;
чоп(соат, "соат", боқӣ, "дақиқа");
```

Input:

```text
135
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC00LDSm9C40pvQsNKz0L4gPSDRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKTsK0YLQsNKTINGB0L7QsNGCID0g0KDQuNGR0LfToy7Qv9C-0ZHQvSjQtNCw0pvQuNKb0LDSs9C-IC8gNjApOwrRgtCw0pMg0LHQvtKb06MgPSDQtNCw0pvQuNKb0LDSs9C-ICUgNjA7CtGH0L7QvyjRgdC-0LDRgiwgItGB0L7QsNGCIiwg0LHQvtKb06MsICLQtNCw0pvQuNKb0LAiKTsK&i=MTM1Cg)

## Other functions of `Риёзӣ`

| Function             | Meaning              | Example               | Result  |
| -------------------- | -------------------- | --------------------- | ------- |
| `Риёзӣ.поён(х)`      | round down           | `Риёзӣ.поён(3.7)`     | `3`     |
| `Риёзӣ.боло(х)`      | round up             | `Риёзӣ.боло(3.2)`     | `4`     |
| `Риёзӣ.дузкунӣ(х)`   | round to the nearest | `Риёзӣ.дузкунӣ(3.5)`  | `4`     |
| `Риёзӣ.мутлақ(х)`    | absolute value       | `Риёзӣ.мутлақ(-5)`    | `5`     |
| `Риёзӣ.дуръшака(х)`  | square root          | `Риёзӣ.дуръшака(16)`  | `4`     |
| `Риёзӣ.қувват(х, н)` | power                | `Риёзӣ.қувват(2, 10)` | `1024`  |
| `Риёзӣ.ПИ`           | the number π         | `Риёзӣ.ПИ`            | `3.14…` |

```som
тағ радиус = 3;
тағ масоҳат = Риёзӣ.ПИ * радиус * радиус;
чоп("Масоҳати доира:", масоҳат);
чоп("Яклухт:", Риёзӣ.дузкунӣ(масоҳат));
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGA0LDQtNC40YPRgSA9IDM7CtGC0LDSkyDQvNCw0YHQvtKz0LDRgiA9INCg0LjRkdC306Mu0J_QmCAqINGA0LDQtNC40YPRgSAqINGA0LDQtNC40YPRgTsK0YfQvtC_KCLQnNCw0YHQvtKz0LDRgtC4INC00L7QuNGA0LA6Iiwg0LzQsNGB0L7Ss9Cw0YIpOwrRh9C-0L8oItCv0LrQu9GD0YXRgjoiLCDQoNC40ZHQt9OjLtC00YPQt9C60YPQvdOjKNC80LDRgdC-0rPQsNGCKSk7Cg)

## Common mistakes

- Dividing by zero: `5 / 0` does not give an error; the result is `беохир`
  ("infinity").
- `Риёзӣ.Поён` with a capital letter: names must be written exactly as they are.

## Tasks

1. [Hours and minutes](../tasks/06-soat/README.md)
2. [Sum of digits](../tasks/06-jami-raqamho/README.md)
3. [Sharing apples](../tasks/06-sebho/README.md)
4. [Hypotenuse](../tasks/06-gipotenuza/README.md)

---

[← Lesson 5](05-vurud.md) · [Contents](README.md) · [Lesson 7 →](07-muqoisa.md)
