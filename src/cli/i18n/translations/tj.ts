import { Translations } from '../index';

const translations: Translations = {
  commands: {
    somon: {
      description: 'Компайлери СомонСкрипт - Коди кириллии тоҷикиро ба JavaScript табдил медиҳад',
    },
    compile: {
      name: 'компайл',
      alias: 'к',
      description: 'Файлҳои СомонСкриптро ба JavaScript компайл кардан',
      usage: '[вуруд] [интихобҳо]',
      args: {
        input: 'Файли вурудии .som',
      },
      options: {
        output: 'Файли баромад (бо нобаёнӣ: вуруд бо .som ба .js иваз шуда, вагарна <вуруд>.js)',
        outDir: 'Феҳристи баромад',
        target: 'Ҳадафи компилятсия',
        sourceMap: 'Харитаи манбаъҳоро эҷод кардан',
        noSourceMap: 'Харитаи манбаъҳоро хомӯш кардан',
        minify: 'Баромадро минималӣ кардан',
        noMinify: 'Минимализатсияро хомӯш кардан',
        noTypeCheck: 'Тафтиши навъҳоро хомӯш кардан',
        strict: 'Тафтиши қатъии навъҳоро фаъол кардан',
        experimentalDecorators:
          'Декораторҳои кӯҳна (озмоишӣ)-ро истифода бурдан, ки параметрҳоро низ оро медиҳанд',
        watch: 'Дар тағйирёбии файл аз нав компайл кардан',
      },
      messages: {
        fileNotFound: (file: string) => `Хато: Файли '${file}' ёфт нашуд`,
        compilationErrors: 'Хатоҳои компилятсия:',
        warnings: 'Огоҳиҳо:',
        compiled: (input: string, output: string) => `'${input}' ба '${output}' компайл шуд`,
        sourceMapGenerated: (file: string) => `Харитаи манбаъ эҷод шуд: '${file}'`,
        watching: (file: string) => `'${file}'-ро барои тағйирот назорат мекунем...`,
        recompiling: (file: string) => `'${file}'-ро аз нав компайл мекунем...`,
        configChanged: (file: string) =>
          `Тағйири конфигуратсия дар '${file}' муайян шуд. Аз нав компайл мекунем...`,
        sourceRemoved: (file: string) =>
          `Файли манбаи '${file}' нест карда шуд. Интизори пайдо шудани он...`,
        configRemoved: (file: string) =>
          `Файли конфигуратсияи '${file}' нест карда шуд. Интихобҳои пешина истифода мешаванд.`,
        stoppingWatcher: (signal: string) => `${signal} қабул шуд, назоратро қатъ мекунем...`,
        watchError: 'Хатои назорат:',
        watchCloseFailed: 'Қатъ кардани назорат сар назад:',
      },
    },
    run: {
      name: 'иҷро',
      alias: 'и',
      description: 'Файли СомонСкриптро компайл ва иҷро кардан',
      usage: '<вуруд> [интихобҳо] [-- аргументҳо...]',
      args: {
        input: 'Файли вурудии .som',
        args: 'Аргументҳо барои барнома (пеш аз аргументҳое, ки бо - оғоз мешаванд, -- нависед)',
      },
      messages: {
        failedToExecute: 'Иҷрои Node сар назад:',
        terminatedWithSignal: (signal: string) => `Раванд бо сигнали ${signal} қатъ шуд`,
        cleanupFailed: 'Огоҳӣ: файлҳои муваққатиро тоза кардан нашуд:',
      },
    },
    init: {
      name: 'оғоз',
      description: 'Лоиҳаи нави СомонСкриптро оғоз кардан',
      args: {
        name: 'Номи лоиҳа',
      },
      messages: {
        directoryExists: (name: string) => `Хато: Феҳристи '${name}' аллакай вуҷуд дорад`,
        projectCreated: (name: string) => `✅ Лоиҳаи СомонСкрипт '${name}' эҷод шуд`,
        nextSteps: 'Қадамҳои навбатӣ:',
      },
    },
    bundle: {
      name: 'баста',
      alias: 'б',
      description: 'Модулҳои СомонСкриптро дар як файл ҷамъ кардан',
      usage: '[вуруд] [интихобҳо]',
      args: {
        input: 'Файли нуқтаи вуруд',
      },
      options: {
        output: 'Роҳи файли баромад',
        format: "Формати баста (танҳо 'commonjs' дастгирӣ мешавад)",
        inlineSources: 'Манбаъҳои аслиро дар харитаи манбаъҳо ҷойгир кардан',
        externals: 'Модулҳои берунӣ (бо вергул ҷудошуда)',
      },
      messages: {
        bundling: (input: string) => `📦 ${input}-ро баста мекунем...`,
        bundleCreated: (output: string) => `✅ Баста эҷод шуд: ${output}`,
        sourceMapCreated: (file: string) => `🗺️ Харитаи манбаъ эҷод шуд: ${file}`,
        bundledModules: (count: number) => `📊 ${count} модул баста шуд`,
        onlyCommonJsSupported: (format: string) =>
          `СомонСкрипт дар ҳоли ҳозир танҳо формати бастаи 'commonjs'-ро дастгирӣ мекунад. Қабул шуд: '${format}'.`,
        bundleError: 'Хатои бастабандӣ:',
      },
    },
    moduleInfo: {
      name: 'маълумоти-модул',
      alias: 'маълумот',
      description: 'Маълумоти вобастагии модулро нишон додан',
      usage: '[вуруд] [интихобҳо]',
      args: {
        input: 'Файли нуқтаи вуруд',
      },
      options: {
        graph: 'Графи вобастагиро нишон додан',
        stats: 'Омори модулро нишон додан',
        circular: 'Вобастагиҳои даврӣ санҷидан',
      },
      messages: {
        analyzing: (input: string) => `🔍 ${input}-ро таҳлил мекунем...`,
        moduleStatistics: '📊 Омори модулҳо:',
        totalModules: 'Ҳамагӣ модулҳо:',
        totalDependencies: 'Ҳамагӣ вобастагиҳо:',
        averageDependencies: 'Миёнаи вобастагиҳо барои ҳар модул:',
        maxDepth: 'Амиқии максималии вобастагӣ:',
        circularDependencies: 'Вобастагиҳои даврӣ:',
        dependencyGraph: '🕸️  Графи вобастагӣ:',
        noCircularDeps: '✅ Вобастагиҳои даврӣ ёфт нашуданд',
        issuesFound: '❌ Мушкилот ёфт шуданд:',
        analysisError: 'Хатои таҳлил:',
      },
    },
    resolve: {
      name: 'ҳал',
      description: 'Мушаххаскунандаи модулро ба роҳи файл ҳал кардан',
      usage: '<мушаххаскунанда> [интихобҳо]',
      args: {
        specifier: 'Мушаххаскунандаи модул барои ҳал',
      },
      options: {
        from: 'Аз ин файл ҳал кардан (бо нобаёнӣ феҳристи ҷорӣ)',
      },
      messages: {
        resolved: (specifier: string) => `🎯 '${specifier}' ҳал шуд:`,
        path: 'Роҳ:',
        extension: 'Васеъшавӣ:',
        external: 'Берунӣ:',
        package: 'Баста:',
        yes: 'Ҳа',
        no: 'Не',
        resolveError: 'Хатои ҳалкунӣ:',
      },
    },
  },
  common: {
    version: 'рақами версияро баровардан',
    help: 'кӯмак барои фармон нишон додан',
    error: 'Хато:',
    configError: 'Хатои конфигуратсия:',
    languageOption: 'Забони интерфейсро муқаррар кунед (en, tj, ru)',
    invalidLanguage: (value: string) =>
      `Хато: забони '${value}' дастгирӣ намешавад. Забонҳои дастгиришаванда: en, tj, ru`,
    outputEqualsInput: (file: string) =>
      `Хато: роҳи баромади '${file}' бо файли вурудӣ якхела аст; бо -o роҳи дигар интихоб кунед`,
    productionDeprecated: 'Огоҳӣ: --production кӯҳна шудааст ва ҳеҷ таъсир надорад',
  },
};

export default translations;
