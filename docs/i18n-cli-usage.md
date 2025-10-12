# SomonScript CLI Internationalization

The SomonScript CLI now supports multiple languages: English (en), Tajik (tj),
and Russian (ru).

## Setting the Language

There are several ways to set the CLI language:

### 1. Command-line Flag

Use the `--lang` flag with any command:

```bash
# Use Tajik interface
somon --lang tj compile app.som

# Use Russian interface
somon --lang ru запустить app.som

# Use English interface (default)
somon --lang en compile app.som
```

### 2. Environment Variables

Set the language via environment variables (in order of precedence):

```bash
# SomonScript-specific variable (highest priority)
export SOMON_LANG=tj

# Standard locale variables
export LANG=ru_RU.UTF-8
export LC_ALL=tj_TJ.UTF-8
export LC_MESSAGES=ru_RU.UTF-8
```

### 3. Localization Modes

The CLI supports two localization modes:

#### Mixed Mode (Default)

Shows both English and localized commands:

```bash
export SOMON_LOCALIZATION_MODE=mixed
somon --help

# Shows:
# Commands:
#   compile|компайл|к    Compile SomonScript files...
#   run|иҷро|и           Compile and run...
```

#### Pure Mode

Shows only localized commands:

```bash
export SOMON_LOCALIZATION_MODE=pure
export SOMON_LANG=tj
somon --help

# Shows only Tajik commands:
# Фармонҳо:
#   компайл|к    Файлҳои СомонСкриптро ба JavaScript компайл кардан
#   иҷро|и       Файли СомонСкриптро компайл ва иҷро кардан
```

## Command Examples

### English (Default)

```bash
somon compile app.som -o dist/app.js
somon run app.som --production
somon bundle src/main.som --minify
somon init my-project
```

### Tajik (тоҷикӣ)

```bash
# Compile command
somon --lang tj компайл app.som -o dist/app.js
somon --lang tj к app.som --source-map

# Run command
somon --lang tj иҷро app.som --production
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

# Start server
somon --lang tj хидмат --port 8080
```

### Russian (русский)

```bash
# Compile command
somon --lang ru компилировать app.som -o dist/app.js
somon --lang ru к app.som --source-map

# Run command
somon --lang ru запустить app.som --production
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

# Start server
somon --lang ru сервер --port 8080
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
export SOMON_LOCALIZATION_MODE=mixed
```

## Compatibility

- The English commands always work regardless of language setting in mixed mode
- In pure mode, only the selected language commands are available
- All existing scripts using English commands remain compatible in mixed mode
- The `--lang` flag can be used anywhere in the command line

## Implementation Details

The internationalization system:

- Auto-detects system locale from environment variables
- Supports command-line override via `--lang` flag
- Provides complete translations for all commands, options, and messages
- Maintains backward compatibility with existing scripts
- Supports both mixed (multilingual) and pure (single language) modes

## Adding New Languages

To request support for additional languages, please open an issue on GitHub
with:

- The language name and ISO code
- Volunteers to help with translation
- Use cases for the language support
