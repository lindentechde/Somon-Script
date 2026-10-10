# SomonScript

<div align="center">
  <img src="https://raw.githubusercontent.com/lindentechde/Somon-Script/main/images/somon-script-banner.png" alt="SomonScript Баннер" width="500" style="max-width: 100%; height: auto;" />
</div>

**Учитесь программировать на родном языке — первый шаг к JavaScript**

[![Версия](https://img.shields.io/npm/v/@lindentech/somon-script)](https://www.npmjs.com/package/@lindentech/somon-script)
[![Расширение VS Code](https://img.shields.io/visual-studio-marketplace/v/LindenTechITConsulting.somonscript?label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=LindenTechITConsulting.somonscript)
[![Статус Сборки](https://img.shields.io/github/actions/workflow/status/lindentechde/Somon-Script/automated-release.yml?branch=main&label=build)](https://github.com/lindentechde/Somon-Script/actions)
[![Покрытие Тестов](https://img.shields.io/codecov/c/github/lindentechde/Somon-Script)](https://codecov.io/gh/lindentechde/Somon-Script)
[![Успех Примеров](https://img.shields.io/github/actions/workflow/status/lindentechde/Somon-Script/automated-release.yml?branch=main&label=examples&job=test)](https://github.com/lindentechde/Somon-Script/actions)
[![Лицензия](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

[![Статус Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=lindentechde_Somon-Script&metric=alert_status)](https://sonarcloud.io/project/overview?id=lindentechde_Somon-Script)
[![Ошибки](https://sonarcloud.io/api/project_badges/measure?project=lindentechde_Somon-Script&metric=bugs)](https://sonarcloud.io/project/overview?id=lindentechde_Somon-Script)
[![Проблемы Кода](https://sonarcloud.io/api/project_badges/measure?project=lindentechde_Somon-Script&metric=code_smells)](https://sonarcloud.io/project/overview?id=lindentechde_Somon-Script)
[![Рейтинг Безопасности](https://sonarcloud.io/api/project_badges/measure?project=lindentechde_Somon-Script&metric=security_rating)](https://sonarcloud.io/project/overview?id=lindentechde_Somon-Script)
[![Рейтинг Поддерживаемости](https://sonarcloud.io/api/project_badges/measure?project=lindentechde_Somon-Script&metric=sqale_rating)](https://sonarcloud.io/project/overview?id=lindentechde_Somon-Script)

SomonScript — язык для обучения программированию на таджикском. Его ключевые
слова и встроенные имена — таджикские слова на кириллице, а каждая программа
компилируется в JavaScript, который можно посмотреть рядом: то, что ученик
освоил, переносится на JavaScript, один из самых распространённых языков.
Компилятор активно развивается (версия 0.4.0) и подходит для оценки, пилотного
использования в обучении и экспериментов; сообщайте о найденных проблемах.

## 🗣️ **Другие языки**

- 🇺🇸 [English](README.md) - Основной язык
- 🇹🇯 [Тоҷикӣ](README.tj.md) - Родной язык
- 🇷🇺 **Русский** - Русский язык

---

## **Программирование без языкового барьера**

Обычно, чтобы научиться программировать, приходится одновременно учить
английские ключевые слова. SomonScript позволяет ученику, читающему
по-таджикски, начать с самих идей — значений, переменных, условий, циклов,
функций — записанных знакомыми словами, а затем, когда он будет готов, увидеть
ту же программу на JavaScript.

---

## ✨ Почему выбрать SomonScript?

### 🌍 **Преодоление языковых барьеров в программировании**

**Расширение возможностей разработки на родном языке**

SomonScript революционизирует разработку программного обеспечения, устраняя
фундаментальный языковой барьер:

- **Естественное мышление**: Выражайте сложные алгоритмы и логику в паттернах
  родного языка
- **Снижение когнитивной нагрузки**: Устраните слой ментального перевода между
  концепцией и кодом
- **Улучшение понимания кода**: Пишите самодокументирующийся код, который сразу
  читается таджикскими командами
- **Ускорение обучения**: Новые программисты могут сосредоточиться на концепциях
  программирования, а не на иностранном синтаксисе

### 🔒 **Проверка типов**

Компилятор проверяет типы до запуска программы, с теми же видами типов, что и
TypeScript:

- Объединение и пересечение типов
- Кортежные типы с выводом длины
- Наследование и композиция интерфейсов
- Универсальные параметры типов
- Условные выражения типов

### ⚡ **Статус разработки**

- **Автоматический аудит примеров** – `npm run audit:examples` проверяет
  эталонные программы перед релизами.
- **Расширенный набор тестов** – более 300 тестов охватывают лексер, парсер,
  проверку типов и CLI. Отчёты о покрытии доступны по запросу.
- **Единый стиль кода** – ESLint и Prettier поддерживают чистую кодовую базу
  TypeScript.
- **Слоистая архитектура** – Компилятор, CLI и модульная система развиваются как
  отдельные, чётко определённые пакеты.
- **Активное развитие** – Подходит для оценки и пилотных проектов; сообщайте о
  найденных проблемах.

---

## 🎨 **Расширение VS Code**

Получите полную поддержку IDE с подсветкой синтаксиса, IntelliSense и
фрагментами кода:

- **Установка из VS Code Marketplace**: Поиск "SomonScript" или
  [прямая установка](https://marketplace.visualstudio.com/items?itemName=LindenTechITConsulting.somonscript)
- **Функции**: Подсветка синтаксиса, автодополнение с учётом типов, 30+
  фрагментов, диагностика в реальном времени
- **Информация при наведении**: Просмотрите документацию таджикских ключевых
  слов с эквивалентами JavaScript

---

## 🚀 Быстрый старт

### Установка

```bash
# NPM (рекомендуется для большинства пользователей)
npm install -g @lindentech/somon-script

# JSR (рекомендуется для проектов TypeScript)
npx jsr add @lindentechde/somon-script

# Или используйте в проекте
npm install @lindentech/somon-script --save-dev
```

### Многоязычный интерфейс CLI

CLI SomonScript теперь поддерживает **три языка**: английский, таджикский и
русский. Это позволяет разработчикам использовать компилятор на предпочитаемом
языке.

#### Установка языка

```bash
# Использование таджикского интерфейса
somon --lang tj компайл app.som

# Использование русского интерфейса
somon --lang ru компилировать app.som

# Использование английского интерфейса (по умолчанию)
somon --lang en compile app.som
```

#### Автоматическое определение языка

CLI автоматически определяет язык вашей системы из переменных окружения:

```bash
# Установка предпочитаемого языка через окружение
export SOMON_LANG=tj  # Таджикский
export SOMON_LANG=ru  # Русский
export SOMON_LANG=en  # Английский

# Или использование системной локали
export LANG=tg_TJ.UTF-8  # Автоматически использует таджикский
export LANG=ru_RU.UTF-8  # Автоматически использует русский
```

#### Доступные команды на каждом языке

<table>
<tr><th>Английский</th><th>Таджикский</th><th>Русский</th></tr>
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

#### Примеры использования

```bash
# На русском языке
somon --lang ru компилировать мой-файл.som -o dist/файл.js
somon --lang ru запустить программа.som
somon --lang ru пакет src/главный.som --minify

# Сообщения также отображаются на выбранном языке:
# ✅ Скомпилировано 'app.som' в 'app.js'
# 📦 Собираем src/main.som...
# 🔍 Анализируем src/main.som...
```

### Ваша первая программа

```bash
# Пример Hello World
echo 'чоп("Салом, ҷаҳон!");' > hello.som
somon run hello.som

# Бизнес-логика с типобезопасностью
cat > calculator.som << 'EOF'
функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

тағ натиҷа = ҷамъ(5, 3);
чоп.сабт("Результат: " + натиҷа);
EOF

somon run calculator.som
```

### Сборка (Module System)

- SomonScript генерирует готовые к запуску CommonJS-бандлы.

```bash
somon bundle src/main.som -o dist/bundle.js
```

Для отладки используйте `--source-map`, чтобы получить карту исходников:

```bash
somon bundle src/main.som -o dist/bundle.js --source-map
```

Карта теперь содержит пути модулей, относительные каталогу точки входа, что
исключает утечки абсолютных путей. Флаг `--inline-sources` (или параметр
`inlineSources: true` в конфигурации) встраивает текст SomonScript в `.map`,
если вам нужно иметь исходный код прямо в артефакте.

### **Использование в сборках**

SomonScript — это компилятор: исходники `.som` компилируются в обычный
JavaScript с помощью CLI `somon` или функции `compile()`, и этот JavaScript
разворачивается как любой другой код Node.js. При ошибках компиляции CLI
завершается с ненулевым кодом, поэтому его можно напрямую использовать в CI.

📖 **Подробности**: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🎯 Возможности языка

### **Основные возможности языка**

```som
// Переменные с выводом типов
тағ ном = "Донёр";
собит МАКС_СИННУ_СОЛ: рақам = 120;

// Функции с аннотациями типов
функсия ҳисоб_кардан(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}
```

### **Инструменты объектно-ориентированного программирования**

```som
синф Ҳайвон {
    хосусӣ ном: сатр;

    конструктор(ном: сатр) {
        ин.ном = ном;
    }

    ҷамъиятӣ овоз_додан(): сатр {
        бозгашт "Общий звук";
    }
}
```

## 🚀 Развертывание

У SomonScript нет сервера или фонового процесса: разворачивается
скомпилированный JavaScript.

```bash
somon compile src/main.som -o dist/main.js --strict
node dist/main.js
```

Флаг `--production` устарел и ни на что не влияет; он принимается только для
совместимости со старыми скриптами.

📖 **Полное руководство**: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 📊 Проверки качества

Проект включает автоматические проверки, которые можно запускать локально:

| Проверка                     | Команда                  | Назначение                                               |
| ---------------------------- | ------------------------ | -------------------------------------------------------- |
| **Аудит примеров**           | `npm run audit:examples` | Убеждается, что эталонные программы продолжают работать  |
| **Тестовый набор**           | `npm test`               | Проверяет компилятор, CLI и поведение времени выполнения |
| **Linting и форматирование** | `npm run lint`           | Контролирует стиль и статический анализ TypeScript       |
| **Сборка TypeScript**        | `npm run build`          | Компилирует исходники перед публикацией                  |

---

## 🛠️ Разработка и вклад

### Предварительные требования

- Node.js 20.x, 22.x, 23.x или 24.x
- npm 8.x или выше
- Знание TypeScript (для внутренней разработки)

### Настройка

```bash
# Клонирование репозитория
git clone https://github.com/lindentechde/Somon-Script.git
cd Somon-Script

# Установка зависимостей
npm install

# Сборка компилятора
npm run build

# Запуск тестов
npm test

# Режим разработки (отслеживание изменений)
npm run dev
```

### Тестирование

```bash
# Полный набор тестов
npm test

# С покрытием
npm run test:coverage

# Конкретные категории тестов
npm run test:unit
npm run test:integration
npm run audit:examples
```

---

## 📚 Образовательные ресурсы

### **Для учеников и учителей**

- [🎓 Учебник](docs/tutorial/) - Структурированный путь обучения
- [📋 Примеры](examples/) - Примеры программ
- [🎯 Краткий справочник](docs/reference/quick-start.md) - Руководство по
  основному синтаксису

### **Для технических команд**

- [📘 Справочник по языку](docs/reference/) - Полная документация API
- [🔧 Практические руководства](docs/how-to/) - Паттерны реализации
- [⚡ Лучшие практики](docs/how-to/best-practices.md) - Стандарты промышленного
  кодирования

### **Для команд разработки**

- [🏛️ Руководство по архитектуре](docs/explanation/architecture.md) - Принципы
  системного проектирования
- [🧪 Руководство по тестированию](docs/explanation/testing.md) - Методология
  обеспечения качества
- [🤝 Участие сообщества](CONTRIBUTING.md) - Рекомендации по участию

### **Встроенные функции и API**

- [📖 Справочник методов консоли](examples/CONSOLE_METHODS.ru.md) - Полная
  справка по всем методам `чоп.*` (log, error, warn, info, debug, assert, count,
  time, table, trace и многое другое)
  - [English](examples/CONSOLE_METHODS.md)
  - [Тоҷикӣ](examples/CONSOLE_METHODS.tj.md)
- [🖨️ Простые примеры вывода](examples/console-log-simple.som) - Простые примеры
  для начала работы
- [📊 Продвинутое использование консоли](examples/console-methods-guide.som) -
  Полное руководство со всеми методами консоли

---

## 🌍 Профессиональная поддержка

### Технические услуги

- 💬
  [Обсуждения GitHub](https://github.com/lindentechde/Somon-Script/discussions) -
  Технические обсуждения и Q&A
- 🐛 [Проблемы](https://github.com/lindentechde/Somon-Script/issues) - Отчеты об
  ошибках и запросы функций
- 📧 Электронная почта: **info@lindentech.de**

### Профессиональные услуги

LindenTech IT Consulting предлагает профессиональные услуги разработки:

1. **Основная разработка**: Улучшение возможностей и производительности
   компилятора
2. **Документация**: Улучшение технической документации и руководств
3. **Тестирование**: Расширение тестового покрытия и обеспечение качества
4. **Интеграция**: Создание инструментария и поддержка IDE
5. **Производительность**: Оптимизация компиляции и времени выполнения

📖 **Документация**:

- [Руководство по процессу релизов](docs/RELEASE-PROCESS.md) - Как повышается
  версия и как пакет публикуется в npm и JSR
- [CONTRIBUTING.md](CONTRIBUTING.md) - Стиль кода, сообщения коммитов и тесты

---

## 📄 Лицензия

SomonScript распространяется по **лицензии MIT**. Полный текст доступен в
[LICENSE](LICENSE).

---

## 🏢 Корпоративное партнерство

### **Разработано в партнерстве с LindenTech IT Consulting**

SomonScript профессионально разработан в сотрудничестве с
[**LindenTech IT Consulting**](https://lindentech.de) - ведущей консалтинговой
компанией корпоративных технологий.

**Веб-сайт**: [lindentech.de](https://lindentech.de)  
**Контакты**: info@lindentech.de

---

## 🌟 Техническое превосходство

Построен на проверенных принципах программной инженерии и современной технологии
компиляторов:

- **Продвинутая система типов** - Основана на проверенных исследованиях теории
  типов
- **Чистая архитектура** - Модульный дизайн с принципами SOLID
- **Отраслевые стандарты** - Совместимость с существующей экосистемой JavaScript
- **Оптимизированная производительность** - Эффективная компиляция и время
  выполнения

### Технологический стек

- Базовая реализация на TypeScript для надежности
- Совместимость с экосистемой Node.js
- Компиляция в современный JavaScript
- Комплексная тестовая инфраструктура

<div align="center">

**SomonScript** - _Учитесь программировать на таджикском, а затем на JavaScript_

[GitHub](https://github.com/lindentechde/Somon-Script) • [Документация](docs/) •
[Поддержка](https://github.com/lindentechde/Somon-Script/discussions)

</div>
