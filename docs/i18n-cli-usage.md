# SomonScript CLI Internationalization

The SomonScript CLI now supports multiple languages: English (en), Tajik (tj),
and Russian (ru).

## Setting the Language

There are several ways to set the CLI language:

### 1. Command-line Flag

Use the `--lang` flag (`--lang tj` or `--lang=tj`) with any command. An
unsupported value is an error.

```bash
# Use Tajik interface
somon --lang tj compile app.som

# Use Russian interface
somon --lang ru запустить app.som

# Use English interface (default)
somon --lang en compile app.som
```

### 2. Environment Variables

Without `--lang`, the language comes from the first of these variables that is
set, in this order:

```bash
# SomonScript-specific variable (highest priority)
export SOMON_LANG=tj

# Standard locale variables, in POSIX precedence order
export LC_ALL=tj_TJ.UTF-8
export LC_MESSAGES=ru_RU.UTF-8
export LANG=ru_RU.UTF-8
```

Locale values match on their language part (`ru`, `tg`/`tj`); anything else
falls back to English.

### 3. Command Names

The English command names always work, whatever the language. When the interface
language is Tajik or Russian, each command also accepts its localized name and
short alias, and `--help` lists both names:

```bash
somon --lang tj --help

# Commands:
#   compile|компайл [options] <input>   Файлҳои СомонСкриптро ба JavaScript компайл кардан
#   run|иҷро [options] <input> [args...] Файли СомонСкриптро компайл ва иҷро кардан
```

Commander's own labels (`Usage:`, `Options:`, `Commands:`) stay in English.

## Command Examples

### English (Default)

```bash
somon compile app.som -o dist/app.js
somon run app.som
somon bundle src/main.som --minify
somon init my-project
```

### Tajik (тоҷикӣ)

```bash
# Compile command
somon --lang tj компайл app.som -o dist/app.js
somon --lang tj к app.som --source-map

# Run command
somon --lang tj иҷро app.som
somon --lang tj и app.som

# Bundle command
somon --lang tj баста src/main.som --minify
somon --lang tj б src/main.som

# Initialize project
somon --lang tj оғоз лоиҳаи-ман

# Module info
somon --lang tj маълумоти-модул src/main.som --graph
somon --lang tj маълумот src/main.som --stats

# Resolve module
somon --lang tj ҳал "./utils" --from src/main.som

```

### Russian (русский)

```bash
# Compile command
somon --lang ru компилировать app.som -o dist/app.js
somon --lang ru к app.som --source-map

# Run command
somon --lang ru запустить app.som
somon --lang ru з app.som

# Bundle command
somon --lang ru пакет src/main.som --minify
somon --lang ru п src/main.som

# Initialize project
somon --lang ru инициализация мой-проект

# Module info
somon --lang ru информация-модуля src/main.som --graph
somon --lang ru инфо src/main.som --stats

# Resolve module
somon --lang ru разрешить "./utils" --from src/main.som

```

## Help in Different Languages

```bash
# English help
somon --help
somon compile --help

# Tajik help
somon --lang tj --help
somon --lang tj компайл --help

# Russian help
somon --lang ru --help
somon --lang ru компилировать --help
```

## Messages and Output

All CLI messages, errors, and output are localized based on the selected
language:

### English

```
✅ Created SomonScript project 'my-app'
Compiled 'app.som' to 'app.js'
Watching 'app.som' for changes...
```

### Tajik

```
✅ Лоиҳаи СомонСкрипт 'my-app' эҷод шуд
'app.som' ба 'app.js' компайл шуд
'app.som'-ро барои тағйирот назорат мекунем...
```

### Russian

```
✅ Создан проект СомонСкрипт 'my-app'
Скомпилировано 'app.som' в 'app.js'
Отслеживаем 'app.som' на изменения...
```

## Persistent Language Settings

To make a language preference persistent, add it to your shell profile:

```bash
# ~/.bashrc or ~/.zshrc
export SOMON_LANG=tj
```

## Compatibility

- English command names work under every language setting, so existing scripts
  keep working.
- Localized names and aliases are available only while their language is active.
- The `--lang` flag can be used anywhere before a `--` separator.

## Implementation Details

The internationalization system:

- Detects the language once from `--lang` and the environment variables above
- Translates command descriptions, option help and CLI messages; the English,
  Tajik and Russian translation files are checked by a test to define the same
  keys

## Adding New Languages

To request support for additional languages, please open an issue on GitHub
with:

- The language name and ISO code
- Volunteers to help with translation
- Use cases for the language support
