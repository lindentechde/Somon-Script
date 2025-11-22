# Math Object (Риёзӣ)

**Math Methods and Constants**

The `Риёзӣ` or `математика` object maps to JavaScript's `Math` object.

---

## Constants

| Tajik           | JavaScript     | Value    |
| --------------- | -------------- | -------- |
| `Риёзӣ.Е`       | `Math.E`       | ≈2.718   |
| `Риёзӣ.ЛН10`    | `Math.LN10`    | ln(10)   |
| `Риёзӣ.ЛН2`     | `Math.LN2`     | ln(2)    |
| `Риёзӣ.ЛОГ10Е`  | `Math.LOG10E`  | log₁₀(e) |
| `Риёзӣ.ЛОГ2Е`   | `Math.LOG2E`   | log₂(e)  |
| `Риёзӣ.ПИ`      | `Math.PI`      | ≈3.14159 |
| `Риёзӣ.РЕША1_2` | `Math.SQRT1_2` | √(1/2)   |
| `Риёзӣ.РЕША2`   | `Math.SQRT2`   | √2       |

---

## Basic Functions

| Tajik                 | JavaScript     | Purpose          |
| --------------------- | -------------- | ---------------- |
| `Риёзӣ.мутлақ()`      | `Math.abs()`   | Absolute value   |
| `Риёзӣ.боло()`        | `Math.ceil()`  | Round up         |
| `Риёзӣ.поён()`        | `Math.floor()` | Round down       |
| `Риёзӣ.дузкунӣ()`     | `Math.round()` | Round nearest    |
| `Риёзӣ.бириданАдад()` | `Math.trunc()` | Truncate decimal |
| `Риёзӣ.аломат()`      | `Math.sign()`  | Sign of number   |

```som
Риёзӣ.мутлақ(-5)        // Math.abs(-5) → 5
Риёзӣ.боло(4.3)         // Math.ceil(4.3) → 5
Риёзӣ.поён(4.7)         // Math.floor(4.7) → 4
Риёзӣ.дузкунӣ(4.5)      // Math.round(4.5) → 5
```

---

## Power & Root

| Tajik                | JavaScript    | Purpose     |
| -------------------- | ------------- | ----------- |
| `Риёзӣ.қувват()`     | `Math.pow()`  | Power (x^y) |
| `Риёзӣ.дуръшака()`   | `Math.sqrt()` | Square root |
| `Риёзӣ.решаиКубӣ()`  | `Math.cbrt()` | Cube root   |
| `Риёзӣ.экспонента()` | `Math.exp()`  | e^x         |

```som
Риёзӣ.қувват(2, 3)      // Math.pow(2, 3) → 8
Риёзӣ.дуръшака(16)      // Math.sqrt(16) → 4
Риёзӣ.решаиКубӣ(27)     // Math.cbrt(27) → 3
```

---

## Logarithms

| Tajik                | JavaScript     | Purpose     |
| -------------------- | -------------- | ----------- |
| `Риёзӣ.логарифм()`   | `Math.log()`   | Natural log |
| `Риёзӣ.логарифм10()` | `Math.log10()` | Base-10 log |
| `Риёзӣ.логарифм2()`  | `Math.log2()`  | Base-2 log  |
| `Риёзӣ.логарифм1п()` | `Math.log1p()` | ln(1 + x)   |

---

## Trigonometry

| Tajik                 | JavaScript     | Purpose           |
| --------------------- | -------------- | ----------------- |
| `Риёзӣ.синус()`       | `Math.sin()`   | Sine              |
| `Риёзӣ.косинус()`     | `Math.cos()`   | Cosine            |
| `Риёзӣ.тангенс()`     | `Math.tan()`   | Tangent           |
| `Риёзӣ.арксинус()`    | `Math.asin()`  | Arc sine          |
| `Риёзӣ.арккосинус()`  | `Math.acos()`  | Arc cosine        |
| `Риёзӣ.арктангенс()`  | `Math.atan()`  | Arc tangent       |
| `Риёзӣ.арктангенс2()` | `Math.atan2()` | Arc tangent (y/x) |

---

## Hyperbolic Functions

| Tajik                         | JavaScript     | Purpose            |
| ----------------------------- | -------------- | ------------------ |
| `Риёзӣ.синусГиперболӣ()`      | `Math.sinh()`  | Hyperbolic sine    |
| `Риёзӣ.косинусГиперболӣ()`    | `Math.cosh()`  | Hyperbolic cosine  |
| `Риёзӣ.тангенсГиперболӣ()`    | `Math.tanh()`  | Hyperbolic tangent |
| `Риёзӣ.арксинусГиперболӣ()`   | `Math.asinh()` | Inverse sinh       |
| `Риёзӣ.арккосинусГиперболӣ()` | `Math.acosh()` | Inverse cosh       |
| `Риёзӣ.арктангенсГиперболӣ()` | `Math.atanh()` | Inverse tanh       |

---

## Min/Max & Random

| Tajik                | JavaScript      | Purpose      |
| -------------------- | --------------- | ------------ |
| `Риёзӣ.ҳаддиАксар()` | `Math.max()`    | Maximum      |
| `Риёзӣ.ҳаддиАқал()`  | `Math.min()`    | Minimum      |
| `Риёзӣ.тасодуфӣ()`   | `Math.random()` | Random [0,1) |

```som
Риёзӣ.ҳаддиАксар(5, 10, 3)     // Math.max(5, 10, 3) → 10
Риёзӣ.ҳаддиАқал(5, 10, 3)      // Math.min(5, 10, 3) → 3
Риёзӣ.тасодуфӣ()                // Math.random() → 0.xxx
```

---

## Special Functions

| Tajik                | JavaScript      | Purpose               |
| -------------------- | --------------- | --------------------- |
| `Риёзӣ.гипотенуза()` | `Math.hypot()`  | Hypotenuse            |
| `Риёзӣ.expm1()`      | `Math.expm1()`  | e^x - 1               |
| `Риёзӣ.clz32()`      | `Math.clz32()`  | Count leading zeros   |
| `Риёзӣ.imul()`       | `Math.imul()`   | 32-bit multiplication |
| `Риёзӣ.fround()`     | `Math.fround()` | Round to float32      |

---

**Next**: [Array Methods](06-array.md)
