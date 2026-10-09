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
      },
      messages: {
        fileNotFound: (file: string) => `Ошибка: Файл '${file}' не найден`,
        compilationErrors: 'Ошибки компиляции:',
        warnings: 'Предупреждения:',
        compiled: (input: string, output: string) => `Скомпилировано '${input}' в '${output}'`,
        sourceMapGenerated: (file: string) => `Сгенерирована карта источников: '${file}'`,
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
      messages: {
        failedToExecute: 'Не удалось выполнить Node:',
        terminatedWithSignal: (signal: string) => `Процесс завершён сигналом ${signal}`,
        cleanupFailed: 'Предупреждение: не удалось удалить временные файлы:',
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
        format: 'Формат пакета: commonjs, esm или iife',
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
