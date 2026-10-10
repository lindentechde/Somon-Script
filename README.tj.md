# СомонСкрипт

<div align="center">
  <img src="https://raw.githubusercontent.com/lindentechde/Somon-Script/main/images/somon-script-banner.png" alt="СомонСкрипт Баннер" width="500" style="max-width: 100%; height: auto;" />
</div>

**Барномарезиро бо забони модарӣ омӯзед — қадами аввал сӯи JavaScript**

[![Версия](https://img.shields.io/npm/v/@lindentech/somon-script)](https://www.npmjs.com/package/@lindentech/somon-script)
[![Васеъшавии VS Code](https://img.shields.io/visual-studio-marketplace/v/LindenTechITConsulting.somonscript?label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=LindenTechITConsulting.somonscript)
[![Ҳолати Сохтан](https://img.shields.io/github/actions/workflow/status/lindentechde/Somon-Script/automated-release.yml?branch=main&label=build)](https://github.com/lindentechde/Somon-Script/actions)
[![Пӯшиши Тест](https://img.shields.io/codecov/c/github/lindentechde/Somon-Script)](https://codecov.io/gh/lindentechde/Somon-Script)
[![Муваффақияти Намунаҳо](https://img.shields.io/github/actions/workflow/status/lindentechde/Somon-Script/automated-release.yml?branch=main&label=examples&job=test)](https://github.com/lindentechde/Somon-Script/actions)
[![Иҷозатнома](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

[![Ҳолати Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=lindentechde_Somon-Script&metric=alert_status)](https://sonarcloud.io/project/overview?id=lindentechde_Somon-Script)
[![Хатоҳо](https://sonarcloud.io/api/project_badges/measure?project=lindentechde_Somon-Script&metric=bugs)](https://sonarcloud.io/project/overview?id=lindentechde_Somon-Script)
[![Мушкилоти Код](https://sonarcloud.io/api/project_badges/measure?project=lindentechde_Somon-Script&metric=code_smells)](https://sonarcloud.io/project/overview?id=lindentechde_Somon-Script)
[![Рейтинги Бехатарӣ](https://sonarcloud.io/api/project_badges/measure?project=lindentechde_Somon-Script&metric=security_rating)](https://sonarcloud.io/project/overview?id=lindentechde_Somon-Script)
[![Рейтинги Нигоҳдорӣ](https://sonarcloud.io/api/project_badges/measure?project=lindentechde_Somon-Script&metric=sqale_rating)](https://sonarcloud.io/project/overview?id=lindentechde_Somon-Script)

СомонСкрипт забоне барои омӯзиши барномарезӣ бо забони тоҷикӣ аст. Калимаҳои
калидӣ ва номҳои дарунсохти он калимаҳои тоҷикӣ бо хати кириллӣ мебошанд, ва ҳар
барнома ба JavaScript компайл мешавад, ки онро дар паҳлӯ дидан мумкин аст: он чи
хонанда омӯхт, ба JavaScript, яке аз забонҳои маъмултарин, мегузарад. Компилятор
фаъолона рушд меёбад (версияи 0.4.0) ва барои арзёбӣ, озмоиш дар таълим ва
таҷрибаҳо мувофиқ аст; дар бораи мушкилоте, ки меёбед, хабар диҳед.

## 🗣️ **Забонҳои дигар**

- 🇺🇸 [English](README.md) - Забони асосӣ
- 🇹🇯 **Тоҷикӣ** - Забони модарӣ
- 🇷🇺 [Русский](README.ru.md) - Забони русӣ

---

## **Барномарезӣ бе монеаи забонӣ**

Одатан барои омӯхтани барномарезӣ ҳамзамон калимаҳои калидии англисиро омӯхтан
лозим меояд. СомонСкрипт ба хонандае, ки тоҷикӣ мехонад, имкон медиҳад, ки аз
худи мафҳумҳо — қиматҳо, тағйирёбандаҳо, шартҳо, давраҳо, функсияҳо — бо
калимаҳои шинос сар кунад ва баъд, вақте ки омода шуд, ҳамон барномаро бо
JavaScript бинад.

---

## ✨ Чаро СомонСкриптро интихоб кунед?

### 🌍 **Нест кардани монеаҳои забонӣ дар барномарезӣ**

**Тавонманд кардани рушди забони модарӣ**

СомонСкрипт рушди нармафзорро инқилоб мекунад бо нест кардани монеаи асосии
забонӣ:

- **Табиӣ фикр кардан**: Алгоритмҳо ва мантиқи мураккабро дар шаклҳои забони
  модарӣ ифода кунед
- **Кам кардани боркунии когнитивӣ**: Қабати тарҷумаи ақлиро байни концепсия ва
  код нест кунед
- **Беҳтар кардани фаҳмиши код**: Коди худмуаррифшударо нависед, ки барои
  дастаҳои тоҷикзабон фавран хондашаванда аст
- **Суръат додан ба омӯхтан**: Барномарезони нав метавонанд ба консепсияҳои
  барномарезӣ тамаркуз кунанд, на ба синтаксиси хориҷӣ

### 🔒 **Санҷиши навъҳо**

Компилятор навъҳоро пеш аз иҷрои барнома месанҷад, бо ҳамон навъҳое, ки дар
TypeScript ҳастанд:

- Навъҳои иттиҳод ва буриш
- Навъҳои tuple бо хулосаи дарозӣ
- Мерос ва таркиби интерфейс
- Параметрҳои навъи умумӣ
- Ифодаҳои навъи шартӣ

### ⚡ **Манзараи рушди ҷорӣ**

- **Аудити худкори намунаҳо** – `npm run audit:examples` барномаҳои намунавиро
  пеш аз нашр санҷида мебарояд.
- **Маҷмӯи васеи тестҳо** – зиёда аз 300 тест марҳилаҳои лексер, парсер, санҷиши
  навъ ва CLI-ро мепӯшонад. Ҳисоботҳои пӯшиш бо дархост дастрасанд.
- **Услуб ва формати ягона** – ESLint ва Prettier покии кодро нигоҳ медоранд.
- **Меъмории қабатӣ** – Компилятор, CLI ва системаи модулӣ ҳамчун қисмҳои
  ҷудогона нигоҳ дошта мешаванд.
- **Рушди фаъол** – Барои арзёбӣ ва лоиҳаҳои пилотӣ мувофиқ аст; дар бораи
  мушкилоте, ки меёбед, хабар диҳед.

---

## 🎨 **Васеъшавии VS Code**

Дастгирии пурраи IDE бо рӯшноии синтаксис, IntelliSense ва фрагментҳои код:

- **Насб аз Бозори VS Code**: "SomonScript"-ро ҷустуҷӯ кунед ё
  [бевосита насб кунед](https://marketplace.visualstudio.com/items?itemName=LindenTechITConsulting.somonscript)
- **Хусусиятҳо**: Рӯшноии синтаксис, толеби худшиносъанд-намуд, 30+ фрагмент,
  вазнданиҳои ҳам-замон
- **Маълумоти Hovering**: Ҳуҷҷатгузории кунҷи тоҷикӣ бо эквивалентҳои
  JavaScript-ро бубинед

---

## 🚀 Шурӯъи зуд

### Насб

```bash
# NPM (тавсияшуда барои аксари корбарон)
npm install -g @lindentech/somon-script

# JSR (тавсияшуда барои лоиҳаҳои TypeScript)
npx jsr add @lindentechde/somon-script

# Ё дар лоиҳа истифода баред
npm install @lindentech/somon-script --save-dev
```

### Интерфейси бисёрзабонаи CLI

CLI СомонСкрипт акнун **се забонро** дастгирӣ мекунад: Англисӣ, Тоҷикӣ ва Русӣ.
Ин ба барномарезон имкон медиҳад, ки компиляторро дар забони дӯстдоштаашон
истифода баранд.

#### Танзими забон

```bash
# Истифодаи интерфейси тоҷикӣ
somon --lang tj компайл app.som

# Истифодаи интерфейси русӣ
somon --lang ru компилировать app.som

# Истифодаи интерфейси англисӣ (бо нобаёнӣ)
somon --lang en compile app.som
```

Бо `--lang tj` ё `--lang ru` компилятор хатоҳояшро барои хонандагон бо ҳамон
забон шарҳ медиҳад: сатри код бо аломати `^` дар зери ҷои хато ва маслиҳат
(«Шояд `агар`-ро дар назар доштед?»). Нигаред:
[Паёмҳои компилятор](docs/reference/diagnostics.md).

#### Муайян кардани худкори забон

CLI забони системаи шуморо аз тағйирёбандаҳои муҳитӣ худкор муайян мекунад:

```bash
# Танзими забони дӯстдошта тавассути муҳит
export SOMON_LANG=tj  # Тоҷикӣ
export SOMON_LANG=ru  # Русӣ
export SOMON_LANG=en  # Англисӣ

# Ё истифодаи забони системавӣ
export LANG=tg_TJ.UTF-8  # Худкор тоҷикиро истифода мебарад
export LANG=ru_RU.UTF-8  # Худкор русиро истифода мебарад
```

#### Фармонҳои дастрас дар ҳар забон

<table>
<tr><th>Англисӣ</th><th>Тоҷикӣ</th><th>Русӣ</th></tr>
<tr>
<td>

```bash
compile app.som
run app.som
init my-project
bundle src/main.som
module-info src/main.som
resolve "./utils"
```

</td>
<td>

```bash
компайл app.som
иҷро app.som
оғоз лоиҳаи-ман
баста src/main.som
маълумоти-модул src/main.som
ҳал "./utils"
```

</td>
<td>

```bash
компилировать app.som
запустить app.som
инициализация мой-проект
пакет src/main.som
информация-модуля src/main.som
разрешить "./utils"
```

</td>
</tr>
</table>

#### Намунаҳои истифода

```bash
# Бо забони тоҷикӣ
somon --lang tj компайл файли-ман.som -o dist/файл.js
somon --lang tj иҷро барнома.som
somon --lang tj баста src/асосӣ.som --minify

# Паёмҳо ҳам дар забони интихобшуда нишон дода мешаванд:
# ✅ 'app.som' ба 'app.js' компайл шуд
# 📦 src/main.som-ро баста мекунем...
# 🔍 src/main.som-ро таҳлил мекунем...
```

### Барномаи аввалини шумо

```bash
# Намунаи Салом ҷаҳон
echo 'чоп("Салом, ҷаҳон!");' > hello.som
somon run hello.som

# Мантиқи тиҷоратӣ бо бехатарии навъ
cat > calculator.som << 'EOF'
функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

тағ натиҷа = ҷамъ(5, 3);
чоп.сабт("Натиҷа: " + натиҷа);
EOF

somon run calculator.som
```

### Бандлинг (Системаи модул)

- SomonScript бастаҳои CommonJS-и омода ба иҷро месозад.

```bash
somon bundle src/main.som -o dist/bundle.js
```

Барои дебаг `--source-map`-ро истифода баред, то харитаи манбаъҳоро гиред:

```bash
somon bundle src/main.som -o dist/bundle.js --source-map
```

Харитаҳо акнун роҳҳои модулро нисбат ба феҳристи файли асосӣ нигоҳ медоранд, аз
ин рӯ роҳҳои мутлақ ифшо намешаванд. Флаги `--inline-sources` (ё
`inlineSources: true` дар конфиг) матни SomonScript-ро ба `.map` замим мекунад,
агар ба шумо ниёз бошад, ки манбаъ дар артефакт мавҷуд бошад.

### **Истифода дар сохтан ва CI**

СомонСкрипт компилятор аст: файлҳои `.som` бо CLI-и `somon` ё функсияи
`compile()` ба JavaScript-и оддӣ табдил дода мешаванд ва ин JavaScript мисли
дигар коди Node.js ҷойгир карда мешавад. Ҳангоми хатои компилятсия CLI бо рамзи
ғайрисифрӣ анҷом меёбад, бинобар ин онро мустақиман дар CI истифода бурдан
мумкин аст.

📖 **Тафсилот**: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🎯 Хусусиятҳои забон

### **Қобилиятҳои асосии забон**

```som
// Тағйирёбандаҳо бо хулосаи навъ
тағ ном = "Дониёр";
собит МАКС_СИННУ_СОЛ: рақам = 120;

// Функсияҳо бо аннотсияҳои навъ
функсия ҳисоб_кардан(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}
```

### **Воситаҳои барномарезии объекторавона**

```som
синф Ҳайвон {
    хосусӣ ном: сатр;

    конструктор(ном: сатр) {
        ин.ном = ном;
    }

    ҷамъиятӣ овоз_додан(): сатр {
        бозгашт "Садои умумӣ";
    }
}
```

## 🚀 Ҷойгиркунӣ

СомонСкрипт сервер ё раванди доимӣ надорад: JavaScript-и компилятсияшуда ҷойгир
карда мешавад.

```bash
somon compile src/main.som -o dist/main.js --strict
node dist/main.js
```

Флаги `--production` кӯҳна шудааст ва ҳеҷ таъсир надорад; он танҳо барои
мувофиқат бо скриптҳои кӯҳна қабул карда мешавад.

📖 **Дастури пурра**: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 📊 Санҷишҳои сифат

Лоиҳа дорои санҷишҳои автоматиест, ки шумо метавонед маҳалли иҷро кунед:

| Санҷиш                 | Фармон                   | Мақсад                                                      |
| ---------------------- | ------------------------ | ----------------------------------------------------------- |
| **Аудити намунаҳо**    | `npm run audit:examples` | Мутмаин мешавад, ки барномаҳои намунавӣ ҳамоно кор мекунанд |
| **Маҷмӯи тестҳо**      | `npm test`               | Фазаҳои компилятор, CLI ва рафтори иҷроиро месанҷад         |
| **Linting ва формат**  | `npm run lint`           | Қоидаҳои услуб ва таҳлили статикӣ-ро месанҷад               |
| **Сохтани TypeScript** | `npm run build`          | Пеш аз нашр манбаи TypeScript-ро компил мекунад             |

---

## 🛠️ Рушд ва саҳмгузорӣ

### Талаботи пешакӣ

- Node.js 20.x, 22.x, 23.x ё 24.x
- npm 8.x ё баландтар
- Дониши TypeScript (барои рушди дохилӣ)

### Танзимот

```bash
# Клон кардани репозиторий
git clone https://github.com/lindentechde/Somon-Script.git
cd Somon-Script

# Насби вобастагиҳо
npm install

# Сохтани компилятор
npm run build

# Иҷрои тестҳо
npm test

# Режими рушд (назорат барои тағйирот)
npm run dev
```

### Тестгузаронӣ

```bash
# Маҷмӯи пурраи тестҳо
npm test

# Бо пӯшиш
npm run test:coverage

# Категорияҳои мушаххаси тест
npm run test:unit
npm run test:integration
npm run audit:examples
```

---

## 📚 Захираҳои омӯзишӣ

### **Барои хонандагон ва омӯзгорон**

- [🎓 Дастур](docs/tutorial/) - Роҳи омӯзиши сохторӣ
- [📋 Намунаҳо](examples/) - Намунаи барномаҳо
- [🎯 Маълумотномаи зуд](docs/reference/quick-start.md) - Дастури синтаксиси
  асосӣ
- [🩺 Паёмҳои компилятор](docs/reference/diagnostics.md) - Хатоҳо чӣ мегӯянд ва
  рамзҳои онҳо
- [⌨️ Вуруд аз клавиатура](docs/reference/input.md) - `хондан()` ва
  `хонданиРақам()`

### **Барои дастаҳои техникӣ**

- [📘 Маълумотномаи забон](docs/reference/) - Ҳуҷҷатгузории пурраи API
- [🔧 Дастурҳои амалӣ](docs/how-to/) - Шаблонҳои татбиқ
- [⚡ Таҷрибаи беҳтарин](docs/how-to/best-practices.md) - Дастурҳои кодгузории
  стандартӣ

### **Барои дастаҳои рушд**

- [🏛️ Дастури меъморӣ](docs/explanation/architecture.md) - Принсипҳои тарроҳии
  система
- [🧪 Дастури тестгузаронӣ](docs/explanation/testing.md) - Методологияи таъмини
  сифат
- [🤝 Иштироки ҷомеа](CONTRIBUTING.md) - Дастурҳои иштирок

### **Функсияҳои ворид ва API-ҳо**

- [📖 Маълумотномаи методҳои чоп](examples/CONSOLE_METHODS.tj.md) -
  Маълумотномаи мукаммали ҳамаи методҳои `чоп.*` (сабт, хато, огоҳӣ, маълумот,
  исфти, тасдиқ, ҳисоб, вақт, ҷадвал, пайҷо ва бисёр дигар)
  - [English](examples/CONSOLE_METHODS.md)
  - [Русский](examples/CONSOLE_METHODS.ru.md)
- [🖨️ Намунаҳои содаи чоп](examples/console-log-simple.som) - Намунаҳои оддӣ
  барои оғоз
- [📊 Истифодаи пешрафтаи чоп](examples/console-methods-guide.som) - Дастури
  мукаммал бо ҳамаи методҳои чоп

---

## 🌍 Дастгирии касбӣ

### Хидматҳои техникӣ

- 💬
  [Муҳокимаҳои GitHub](https://github.com/lindentechde/Somon-Script/discussions) -
  Муҳокимаҳо ва саволу ҷавоб
- 🐛 [Мушкилот](https://github.com/lindentechde/Somon-Script/issues) -
  Гузоришҳои хатогӣ ва дархостҳои хусусият
- 📧 Почтаи электронӣ: **info@lindentech.de**

### Хидматҳои касбӣ

LindenTech IT Consulting хидматҳои касбии рушдро пешниҳод мекунад:

1. **Рушди асосӣ**: Беҳтар кардани қобилиятҳо ва самаранокии компилятор
2. **Ҳуҷҷатгузорӣ**: Беҳтар кардани ҳуҷҷатҳо ва дастурҳои техникӣ
3. **Тестгузаронӣ**: Васеъ кардани пӯшиши тест ва таъмини сифат
4. **Ҳамгироӣ**: Сохтани асбобҳо ва дастгирии IDE
5. **Самаранокӣ**: Оптимизатсияи компилятсия ва иҷрои вақти кор

📖 **Ҳуҷҷатгузорӣ**:

- [Дастури раванди нашр](docs/RELEASE-PROCESS.md) - Версия чӣ тавр иваз мешавад
  ва баста дар npm ва JSR чӣ тавр нашр мешавад
- [CONTRIBUTING.md](CONTRIBUTING.md) - Услуби код, паёмҳои commit ва тестҳо

---

## 📄 Иҷозатнома

SomonScript таҳти **иҷозатномаи MIT** паҳн мешавад. Матни пурра дар файли
[LICENSE](LICENSE) дастрас аст.

---

## 🏢 Шарикии корхона

### **Дар ҳамкорӣ бо LindenTech IT Consulting сохта шудааст**

СомонСкрипт дар ҳамкорӣ бо [**LindenTech IT Consulting**](https://lindentech.de)
сохта шудааст - консалтинги пешбари технологияи корхона.

**Веб-сайт**: [lindentech.de](https://lindentech.de)  
**Тамос**: info@lindentech.de

---

## 🌟 Олии техникӣ

Дар асоси принсипҳои исботшудаи муҳандисии нармафзор ва технологияи муосири
компилятор сохта шудааст:

- **Системаи пешрафтаи навъ** - Дар асоси тадқиқоти исботшудаи назарияи навъ
- **Меъмории тоза** - Тарроҳии модулӣ бо принсипҳои SOLID
- **Стандартҳои саноатӣ** - Мувофиқ бо экосистемаи JavaScript-и мавҷуда
- **Оптимизатсияи самаранокӣ** - Компилятсия ва иҷрои самараноки вақти кор

### Стеки технология

- Татбиқи асосии TypeScript барои эътимод
- Мувофиқати экосистемаи Node.js
- Компилятсияи мақсадноки JavaScript-и муосир
- Чаҳорчӯбаи ҳамаҷонибаи тестгузаронӣ

<div align="center">

**СомонСкрипт** - _Барномарезиро бо тоҷикӣ, баъд бо JavaScript омӯзед_

[GitHub](https://github.com/lindentechde/Somon-Script) • [Ҳуҷҷатгузорӣ](docs/) •
[Дастгирӣ](https://github.com/lindentechde/Somon-Script/discussions)

</div>
