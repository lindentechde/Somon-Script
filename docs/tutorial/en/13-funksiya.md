# Lesson 13. Functions

**In this lesson:** you will give a name to a part of a program and use it
several times.

## What is a function?

A function (`функсия`) is a part of a program with a name. You write it once and
**call** it as many times as you like:

```som
функсия салом() {
  чоп("Салом!");
  чоп("Хуш омадед!");
}

салом();
салом();
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0YHQsNC70L7QvCgpIHsKICDRh9C-0L8oItCh0LDQu9C-0LwhIik7CiAg0YfQvtC_KCLQpdGD0Ygg0L7QvNCw0LTQtdC0ISIpOwp9CgrRgdCw0LvQvtC8KCk7CtGB0LDQu9C-0LwoKTsK)

- `функсия салом() { … }` declares a function. Nothing is printed yet.
- `салом();` calls the function: the commands inside it run.

## Parameters

You can give values to a function. They are called **parameters**:

```som
функсия саломДиҳ(ном: сатр) {
  чоп("Салом, " + ном + "!");
}

саломДиҳ("Зарина");
саломДиҳ("Фарҳод");
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0YHQsNC70L7QvNCU0LjSsyjQvdC-0Lw6INGB0LDRgtGAKSB7CiAg0YfQvtC_KCLQodCw0LvQvtC8LCAiICsg0L3QvtC8ICsgIiEiKTsKfQoK0YHQsNC70L7QvNCU0LjSsygi0JfQsNGA0LjQvdCwIik7CtGB0LDQu9C-0LzQlNC40rMoItCk0LDRgNKz0L7QtCIpOwo)

`ном: сатр` is the parameter `ном` of type `сатр` (string). The type says what
value is expected: `сатр` (string), `рақам` (number) or `мантиқӣ` (logical). If
you pass a number instead of a string, the playground warns you.

## Several parameters

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

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0YXQsNGCKNCw0LvQvtC80LDRgjog0YHQsNGC0YAsINGI0YPQvNC-0YDQsDog0YDQsNKb0LDQvCkgewogINGC0LDSkyDQvdCw0YLQuNK30LAgPSAiIjsKICDQsdCw0YDQvtC4ICjRgtCw0pMg0LggPSAwOyDQuCA8INGI0YPQvNC-0YDQsDsg0LgrKykgewogICAg0L3QsNGC0LjSt9CwICs9INCw0LvQvtC80LDRgjsKICB9CiAg0YfQvtC_KNC90LDRgtC40rfQsCk7Cn0KCtGF0LDRgigiKiIsIDUpOwrRhdCw0YIoIi0iLCAxMCk7Cg)

## Common mistakes

- Declaring a function and not calling it: then nothing runs.
- Forgetting the brackets when you call it: `салом;` instead of `салом();`.
- A mistake in the name of the function: the playground suggests a similar name.

## Tasks

1. [Greeting](../tasks/13-salomdihi/README.md)
2. [A line](../tasks/13-khat/README.md)
3. [A table](../tasks/13-jadval/README.md)

---

[← Lesson 12](12-davraho.md) · [Contents](README.md) ·
[Lesson 14 →](14-bozgasht.md)
