# Дарси 13. Функсияҳо

**Дар ин дарс:** ба як қисми барнома ном медиҳед ва онро чанд бор истифода
мебаред.

## Функсия чист?

Функсия — қисми барнома бо ном. Онро як бор менависем ва чанд бор **даъват**
мекунем:

```som
функсия салом() {
  чоп("Салом!");
  чоп("Хуш омадед!");
}

салом();
салом();
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0YHQsNC70L7QvCgpIHsKICDRh9C-0L8oItCh0LDQu9C-0LwhIik7CiAg0YfQvtC_KCLQpdGD0Ygg0L7QvNCw0LTQtdC0ISIpOwp9CgrRgdCw0LvQvtC8KCk7CtGB0LDQu9C-0LwoKTsK)

- `функсия салом() { … }` — функсияро эълон мекунад. Ҳоло ҳеҷ чиз чоп намешавад.
- `салом();` — функсияро даъват мекунад: фармонҳои дохили он иҷро мешаванд.

## Параметрҳо

Ба функсия қимат додан мумкин аст. Ин қиматҳоро **параметр** меноманд:

```som
функсия саломДиҳ(ном: сатр) {
  чоп("Салом, " + ном + "!");
}

саломДиҳ("Зарина");
саломДиҳ("Фарҳод");
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0YHQsNC70L7QvNCU0LjSsyjQvdC-0Lw6INGB0LDRgtGAKSB7CiAg0YfQvtC_KCLQodCw0LvQvtC8LCAiICsg0L3QvtC8ICsgIiEiKTsKfQoK0YHQsNC70L7QvNCU0LjSsygi0JfQsNGA0LjQvdCwIik7CtGB0LDQu9C-0LzQlNC40rMoItCk0LDRgNKz0L7QtCIpOwo)

`ном: сатр` — параметри `ном`, ки навъаш `сатр` аст. Навъ мегӯяд, ки чӣ гуна
қимат интизор аст: `сатр`, `рақам` ё `мантиқӣ`. Агар рақамро ба ҷои сатр диҳед,
майдони озмоиш огоҳ мекунад.

## Якчанд параметр

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

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YTRg9C90LrRgdC40Y8g0YXQsNGCKNCw0LvQvtC80LDRgjog0YHQsNGC0YAsINGI0YPQvNC-0YDQsDog0YDQsNKb0LDQvCkgewogINGC0LDSkyDQvdCw0YLQuNK30LAgPSAiIjsKICDQsdCw0YDQvtC4ICjRgtCw0pMg0LggPSAwOyDQuCA8INGI0YPQvNC-0YDQsDsg0LgrKykgewogICAg0L3QsNGC0LjSt9CwICs9INCw0LvQvtC80LDRgjsKICB9CiAg0YfQvtC_KNC90LDRgtC40rfQsCk7Cn0KCtGF0LDRgigiKiIsIDUpOwrRhdCw0YIoIi0iLCAxMCk7Cg)

## Хатоҳои маъмул

- Функсияро эълон карда, даъват накардан: он гоҳ ҳеҷ чиз иҷро намешавад.
- Қавсҳоро ҳангоми даъват фаромӯш кардан: `салом;` ба ҷои `салом();`.
- Номи функсияро нодуруст навиштан: майдони озмоиш номи наздикро пешниҳод
  мекунад.

## Супоришҳо

1. [Саломдиҳӣ](../tasks/13-salomdihi/README.md)
2. [Хат](../tasks/13-khat/README.md)
3. [Ҷадвал](../tasks/13-jadval/README.md)

---

[← Дарси 12](12-davraho.md) · [Мундариҷа](README.md) ·
[Дарси 14 →](14-bozgasht.md)
