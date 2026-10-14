import { Translations } from '../index';

const translations: Translations = {
  commands: {
    somon: {
      description:
        'Компилятор СомонСкрипт - Компиляция таджикского кириллического кода в JavaScript',
    },
    compile: {
      name: 'компилировать',
      alias: 'к',
      description: 'Компилировать файлы СомонСкрипт в JavaScript',
      usage: '[вход] [опции]',
      args: {
        input: 'Входной файл .som',
      },
      options: {
        output: 'Выходной файл (по умолчанию: вход с .som, заменённым на .js, иначе <вход>.js)',
        outDir: 'Выходная директория',
        target: 'Цель компиляции (по умолчанию: es2022)',
        lib: 'Библиотеки TypeScript, доступные при выполнении, через запятую (например es2022,dom)',
        useDefineForClassFields: 'Определять поля классов (по умолчанию начиная с es2022)',
        noUseDefineForClassFields: 'Присваивать поля классов в конструкторе',
        sourceMap: 'Генерировать исходные карты',
        noSourceMap: 'Отключить исходные карты',
        minify: 'Минифицировать вывод',
        noMinify: 'Отключить минификацию',
        noTypeCheck: 'Отключить проверку типов',
        strict: 'Включить строгую проверку типов',
        experimentalDecorators:
          'Использовать устаревшие (экспериментальные) декораторы, в том числе для параметров',
        watch: 'Перекомпилировать при изменении файлов',
        module: "Формат модулей вывода: 'commonjs' (по умолчанию) или 'esm'",
        checker: "Проверка типов: 'somon' (по умолчанию) или 'typescript' (компилятор TypeScript)",
        declaration: 'Также записать файл объявлений TypeScript (.d.ts)',
      },
      messages: {
        fileNotFound: (file: string) => `Ошибка: Файл '${file}' не найден`,
        compilationErrors: 'Ошибки компиляции:',
        warnings: 'Предупреждения:',
        compiled: (input: string, output: string) => `Скомпилировано '${input}' в '${output}'`,
        sourceMapGenerated: (file: string) => `Сгенерирована карта источников: '${file}'`,
        declarationGenerated: (file: string) => `Сгенерированы объявления: '${file}'`,
        watching: (file: string) => `Отслеживаем '${file}' на изменения...`,
        recompiling: (file: string) => `Перекомпилируем '${file}'...`,
        configChanged: (file: string) =>
          `Обнаружено изменение конфигурации в '${file}'. Перекомпилируем...`,
        sourceRemoved: (file: string) => `Исходный файл '${file}' удалён. Ждём его появления...`,
        configRemoved: (file: string) =>
          `Файл конфигурации '${file}' удалён. Используем прежние опции.`,
        stoppingWatcher: (signal: string) => `Получен ${signal}, останавливаем отслеживание...`,
        watchError: 'Ошибка отслеживания:',
        watchCloseFailed: 'Не удалось остановить отслеживание:',
      },
    },
    run: {
      name: 'запустить',
      alias: 'з',
      description: 'Компилировать и запустить файл СомонСкрипт',
      usage: '<вход> [опции] [-- аргументы...]',
      args: {
        input: 'Входной файл .som',
        args: 'Аргументы для программы (используйте -- перед аргументами, начинающимися с -)',
      },
      options: {
        stack: 'Показать полный стек ошибки программы (для отладки)',
      },
      messages: {
        failedToExecute: 'Не удалось выполнить Node:',
        terminatedWithSignal: (signal: string) => `Процесс завершён сигналом ${signal}`,
        cleanupFailed: 'Предупреждение: не удалось удалить временные файлы:',
        warning: 'Предупреждение',
      },
    },
    init: {
      name: 'инициализация',
      description: 'Инициализировать новый проект СомонСкрипт',
      args: {
        name: 'Имя проекта',
      },
      messages: {
        directoryExists: (name: string) => `Ошибка: Директория '${name}' уже существует`,
        projectCreated: (name: string) => `✅ Создан проект СомонСкрипт '${name}'`,
        nextSteps: 'Следующие шаги:',
      },
    },
    bundle: {
      name: 'пакет',
      alias: 'п',
      description: 'Собрать модули СомонСкрипт в один файл',
      usage: '[вход] [опции]',
      args: {
        input: 'Файл точки входа',
      },
      options: {
        output: 'Путь к выходному файлу',
        format:
          'Формат пакета: commonjs, esm или iife (по умолчанию esm, если модули компилируются в ES-модули, иначе commonjs)',
        globalName: 'Глобальная переменная, получающая экспорты пакета iife',
        inlineSources: 'Встроить оригинальные источники в карты источников',
        externals: 'Внешние модули (через запятую)',
      },
      messages: {
        bundling: (input: string) => `📦 Собираем ${input}...`,
        bundleCreated: (output: string) => `✅ Пакет создан: ${output}`,
        sourceMapCreated: (file: string) => `🗺️ Карта источников создана: ${file}`,
        bundledModules: (count: number) => `📊 Собрано модулей: ${count}`,
        bundleError: 'Ошибка сборки:',
      },
    },
    moduleInfo: {
      name: 'информация-модуля',
      alias: 'инфо',
      description: 'Показать информацию о зависимостях модуля',
      usage: '[вход] [опции]',
      args: {
        input: 'Файл точки входа',
      },
      options: {
        graph: 'Показать граф зависимостей',
        stats: 'Показать статистику модулей',
        circular: 'Проверить циклические зависимости',
      },
      messages: {
        analyzing: (input: string) => `🔍 Анализируем ${input}...`,
        moduleStatistics: '📊 Статистика модулей:',
        totalModules: 'Всего модулей:',
        totalDependencies: 'Всего зависимостей:',
        averageDependencies: 'Среднее зависимостей на модуль:',
        maxDepth: 'Максимальная глубина зависимостей:',
        circularDependencies: 'Циклические зависимости:',
        dependencyGraph: '🕸️  Граф зависимостей:',
        noCircularDeps: '✅ Циклические зависимости не найдены',
        issuesFound: '❌ Обнаружены проблемы:',
        analysisError: 'Ошибка анализа:',
      },
    },
    check: {
      name: 'проверить',
      description: 'Проверить типы в файлах СомонСкрипт без компиляции',
      usage: '<файлы...> [опции]',
      args: {
        files: 'Входные файлы .som',
      },
      messages: {
        noErrors: (files: number) => `✅ Ошибок типов нет (файлов: ${files})`,
        errorsFound: (errors: number, files: number) =>
          `❌ Найдено ошибок типов: ${errors} (файлов: ${files})`,
        fileErrors: (file: string) => `${file}:`,
      },
    },
    resolve: {
      name: 'разрешить',
      description: 'Разрешить спецификатор модуля к пути файла',
      usage: '<спецификатор> [опции]',
      args: {
        specifier: 'Спецификатор модуля для разрешения',
      },
      options: {
        from: 'Разрешить из этого файла (по умолчанию текущая директория)',
      },
      messages: {
        resolved: (specifier: string) => `🎯 Разрешён '${specifier}':`,
        path: 'Путь:',
        extension: 'Расширение:',
        external: 'Внешний:',
        package: 'Пакет:',
        yes: 'Да',
        no: 'Нет',
        resolveError: 'Ошибка разрешения:',
      },
    },
    fmt: {
      name: 'формат',
      description: 'Отформатировать файлы SomonScript в едином стиле',
      usage: '[параметры] <файлы или каталоги...>',
      args: {
        paths: 'Файлы .som или каталоги, в которых их искать',
      },
      options: {
        check: 'Только сообщить о неотформатированных файлах (код выхода 1, если они есть)',
        write: 'Записать отформатированный код в файлы (по умолчанию)',
        stdout: 'Вывести отформатированный код вместо записи',
        indent: 'Пробелов на уровень отступа (по умолчанию fmt.indent из somon.config.json или 4)',
      },
      messages: {
        formatted: (file: string) => `Отформатирован ${file}`,
        wouldReformat: (file: string) => `Не отформатирован: ${file}`,
        failed: (file: string) => `Не удалось отформатировать ${file}:`,
        summary: (changed: number, total: number) => `Изменено файлов: ${changed} из ${total}`,
        checkPassed: (total: number) => `Все файлы (${total}) отформатированы`,
        checkFailed: (changed: number) => `Не отформатировано файлов: ${changed}`,
        noFiles: 'Файлы .som не найдены',
        pathNotFound: (path: string) => `Ошибка: '${path}' не существует`,
        invalidIndent: (value: string) =>
          `Ошибка: --indent должен быть целым числом от 1 до 16, получено '${value}'`,
      },
    },
    repl: {
      name: 'интерактив',
      description: 'Запустить интерактивный сеанс SomonScript',
      messages: {
        banner: (version: string) =>
          `SomonScript ${version}. Введите .help (.ёрӣ) для справки, .exit (.баромад) для выхода.`,
        help: [
          '.ёрӣ, .help        Показать эту справку',
          '.баромад, .exit    Выйти из сеанса',
          '.пок, .clear       Забыть все объявления и текущий ввод',
          '.js                Показать JavaScript, скомпилированный из последнего ввода',
          '',
          'Ввод продолжается на следующей строке, пока открыта скобка, блок или шаблон.',
          'Объявления видны в следующих вводах; интизор работает на верхнем уровне.',
        ].join('\n'),
        cleared: 'Контекст очищен.',
        noCompiledCode: 'Пока ничего не скомпилировано.',
        exitHint: '(Чтобы выйти, нажмите Ctrl+C ещё раз или введите .exit)',
        error: 'Ошибка:',
      },
    },
    migrate: {
      name: 'миграция',
      description: 'Преобразовать файлы TypeScript в SomonScript',
      usage: '[параметры] <файл.ts или каталог>',
      args: {
        input: 'Файл .ts или каталог с файлами .ts',
      },
      options: {
        output: 'Выходной файл или выходной каталог для каталога',
        stdout: 'Вывести код SomonScript вместо записи файлов',
      },
      messages: {
        migrated: (input: string, output: string) => `'${input}' преобразован в '${output}'`,
        warning: 'предупреждение:',
        failed: (file: string) => `Не удалось преобразовать ${file}:`,
        noFiles: (input: string) => `В '${input}' не найдены файлы TypeScript`,
        summary: (files: number, warnings: number) =>
          `Преобразовано файлов: ${files}, предупреждений: ${warnings}`,
      },
    },
    lsp: {
      name: 'lsp',
      description: 'Запустить языковой сервер SomonScript (Language Server Protocol через stdio)',
      options: {
        stdio: 'Обмен через stdin/stdout (по умолчанию; принимается для редакторов)',
      },
    },
  },
  common: {
    version: 'вывести номер версии',
    help: 'показать справку по команде',
    error: 'Ошибка:',
    configError: 'Ошибка конфигурации:',
    languageOption: 'Установить язык интерфейса (en, tj, ru)',
    invalidLanguage: (value: string) =>
      `Ошибка: неподдерживаемый язык '${value}'. Поддерживаемые языки: en, tj, ru`,
    outputEqualsInput: (file: string) =>
      `Ошибка: выходной путь '${file}' совпадает с входным файлом; укажите другой путь через -o`,
    productionDeprecated: 'Предупреждение: --production устарел и ни на что не влияет',
  },
};

export default translations;
