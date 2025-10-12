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
        output: 'Выходной файл (по умолчанию: то же имя с расширением .js)',
        outDir: 'Выходная директория',
        target: 'Цель компиляции',
        sourceMap: 'Генерировать исходные карты',
        noSourceMap: 'Отключить исходные карты',
        minify: 'Минифицировать вывод',
        noMinify: 'Отключить минификацию',
        noTypeCheck: 'Отключить проверку типов',
        strict: 'Включить строгую проверку типов',
        watch: 'Перекомпилировать при изменении файлов',
        production: 'Включить производственный режим со строгой валидацией',
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
        watchError: 'Ошибка отслеживания:',
      },
    },
    run: {
      name: 'запустить',
      alias: 'з',
      description: 'Компилировать и запустить файл СомонСкрипт',
      usage: '[вход] [опции]',
      args: {
        input: 'Входной файл .som',
      },
      options: {
        target: 'Цель компиляции',
        sourceMap: 'Генерировать исходные карты',
        noSourceMap: 'Отключить исходные карты',
        minify: 'Минифицировать вывод',
        noMinify: 'Отключить минификацию',
        noTypeCheck: 'Отключить проверку типов',
        strict: 'Включить строгую проверку типов',
        production: 'Включить производственный режим со строгой валидацией',
      },
      messages: {
        failedToExecute: 'Не удалось выполнить Node:',
        terminatedWithSignal: (signal: string) => `Процесс завершён сигналом ${signal}`,
        productionValidationFailed: 'Валидация производства не удалась:',
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
        format: "Формат пакета (поддерживается только 'commonjs')",
        minify: 'Минифицировать вывод',
        sourceMap: 'Генерировать исходные карты',
        inlineSources: 'Встроить оригинальные источники в карты источников',
        externals: 'Внешние модули (через запятую)',
        production: 'Включить производственный режим со строгой валидацией',
      },
      messages: {
        bundling: (input: string) => `📦 Собираем ${input}...`,
        bundleCreated: (output: string) => `✅ Пакет создан: ${output}`,
        sourceMapCreated: (file: string) => `🗺️ Карта источников создана: ${file}`,
        bundledModules: (count: number) => `📊 Собрано модулей: ${count}`,
        onlyCommonJsSupported: (format: string) =>
          `СомонСкрипт в настоящее время поддерживает только формат пакета 'commonjs'. Получено: '${format}'.`,
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
    serve: {
      name: 'сервер',
      description: 'Запустить управляющий сервер для проверки работоспособности и метрик',
      options: {
        port: 'Порт для прослушивания',
        config: 'Путь к файлу конфигурации',
        production: 'Включить производственный режим со всеми функциями безопасности',
        json: 'Использовать структурированное JSON логирование',
      },
    },
    help: {
      name: 'помощь',
      description: 'показать справку по команде',
    },
  },
  common: {
    version: 'вывести номер версии',
    help: 'показать справку по команде',
    displayHelp: 'показать справку по команде',
    error: 'Ошибка:',
    configError: 'Ошибка конфигурации:',
    productionValidationFailed: 'Валидация производства не удалась:',
    languageOption: 'Установить язык интерфейса (en, tj, ru)',
  },
};

export default translations;
