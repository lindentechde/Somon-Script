import { KEYWORDS } from '../src/keyword-map';
import { TokenType } from '../src/types';

describe('Keyword map coverage', () => {
  const cases: Array<[string, TokenType]> = [
    // Core language keywords
    ['тағйирёбанда', TokenType.ТАҒЙИРЁБАНДА],
    ['тағ', TokenType.ТАҒЙИРЁБАНДА], // Short form
    ['собит', TokenType.СОБИТ],
    ['функсия', TokenType.ФУНКСИЯ],
    ['функция', TokenType.ФУНКСИЯ], // Alternative spelling
    ['агар', TokenType.АГАР],
    ['вагарна', TokenType.ВАГАРНА],
    ['чунин', TokenType.ЧУНИН],
    ['барои', TokenType.БАРОИ],
    ['то', TokenType.ТО],
    ['бозгашт', TokenType.БОЗГАШТ],
    ['синф', TokenType.СИНФ],
    ['нав', TokenType.НАВ],
    ['ин', TokenType.ИН],
    ['дуруст', TokenType.ДУРУСТ],
    ['нодуруст', TokenType.НОДУРУСТ],
    ['холӣ', TokenType.ХОЛӢ],
    ['беқимат', TokenType.БЕҚИМАТ],

    // Import/Export
    ['ворид', TokenType.ВОРИД],
    ['содир', TokenType.СОДИР],
    ['аз', TokenType.АЗ],
    ['дар', TokenType.ДАР],
    ['пешфарз', TokenType.ПЕШФАРЗ],
    ['чун', TokenType.ЧУН],

    // Built-in functions
    ['чоп', TokenType.ЧОП],
    ['сабт', TokenType.САБТ],
    ['хато', TokenType.ХАТО],
    ['огоҳӣ', TokenType.ОГОҲӢ],
    ['маълумот', TokenType.МАЪЛУМОТ],
    ['исфти', TokenType.ИСФТИ],
    ['тасдиқ', TokenType.ТАСДИҚ],
    ['қайд', TokenType.ҚАЙД],
    ['қайдАсл', TokenType.ҚАЙДАСЛ],
    ['қайдасл', TokenType.ҚАЙДАСЛ], // Lowercase version
    ['вақт', TokenType.ВАҚТ],
    ['вақтСабт', TokenType.ВАҚТСАБТ],
    ['вақтсабт', TokenType.ВАҚТСАБТ], // Lowercase version
    ['вақтОхир', TokenType.ВАҚТОХИР],
    ['вақтохир', TokenType.ВАҚТОХИР], // Lowercase version
    ['ҷадвал', TokenType.ҶАДВАЛ],
    ['феҳрист', TokenType.ФЕҲРИСТ],
    ['xmlФеҳрист', TokenType.XMLФЕҲРИСТ],
    ['xmlфеҳрист', TokenType.XMLФЕҲРИСТ], // Lowercase version
    ['пайҷо', TokenType.ПАЙҶО],
    ['полиз', TokenType.ПОЛИЗ],
    ['гуруҳ', TokenType.ГУРУҲ],
    ['гуруҳОхир', TokenType.ГУРУҲОХИР],
    ['гуруҳохир', TokenType.ГУРУҲОХИР], // Lowercase version
    ['гуруҳПӯшида', TokenType.ГУРУҲПӮШИДА],
    ['гуруҳпӯшида', TokenType.ГУРУҲПӮШИДА], // Lowercase version

    // Array methods
    ['рӯйхат', TokenType.РӮЙХАТ],
    ['илова', TokenType.ИЛОВА],
    ['баровардан', TokenType.БАРОВАРДАН],
    ['дарозӣ', TokenType.ДАРОЗӢ],
    ['харита', TokenType.ХАРИТА],
    ['филтр', TokenType.ФИЛТР],
    ['кофтан', TokenType.КОФТАН],

    // String methods
    ['сатрМетодҳо', TokenType.САТРМЕТОДҲО],
    ['сатрметодҳо', TokenType.САТРМЕТОДҲО], // Lowercase version
    ['дарозииСатр', TokenType.ДАРОЗИИСАТР],
    ['дарозиисатр', TokenType.ДАРОЗИИСАТР], // Lowercase version
    ['пайвастан', TokenType.ПАЙВАСТАН],
    ['ҷойивазкунӣ', TokenType.ҶОЙИВАЗКУНӢ],
    ['ҷудокунӣ', TokenType.ҶУДОКУНӢ],

    // Object methods
    ['калидҳо', TokenType.КАЛИДҲО],
    ['қиматҳо', TokenType.ҚИМАТҲО],

    // Math
    ['математика', TokenType.МАТЕМАТИКА],
    ['ҷамъ', TokenType.ҶАМЪ],
    ['тарҳ', TokenType.ТАРҲ],
    ['зарб', TokenType.ЗАРБ],
    ['тақсим', TokenType.ТАҚСИМ],

    // Control flow
    ['шикастан', TokenType.ШИКАСТАН],
    ['давом', TokenType.ДАВОМ],
    ['интихоб', TokenType.ИНТИХОБ],
    ['ҳолат', TokenType.ҲОЛАТ],
    ['кӯшиш', TokenType.КӮШИШ],
    ['гирифтан', TokenType.ГИРИФТАН],
    ['ниҳоят', TokenType.НИҲОЯТ],
    ['партофтан', TokenType.ПАРТОФТАН],

    // Async
    ['ҳамзамон', TokenType.ҲАМЗАМОН],
    ['интизор', TokenType.ИНТИЗОР],
    ['ваъда', TokenType.ВАЪДА],

    // Type system - Primitive Types
    ['сатр', TokenType.САТР],
    ['рақам', TokenType.РАҚАМ],
    ['мантиқӣ', TokenType.МАНТИҚӢ],
    ['калонрақам', TokenType.КАЛОНРАҚАМ],
    ['рамз', TokenType.РАМЗ],

    // Type system - Special Types
    ['ҳар', TokenType.ҲАР],
    ['ношинос', TokenType.НОШИНОС],
    ['абадан', TokenType.АБАДАН],
    ['беджавоб', TokenType.БЕДЖАВОБ],
    ['объект', TokenType.ОБЪЕКТ],

    // Type system - Core Keywords
    ['интерфейс', TokenType.ИНТЕРФЕЙС],
    ['навъ', TokenType.НАВЪ],
    ['якхела', TokenType.ЯКХЕЛА],
    ['мерос', TokenType.МЕРОС],
    ['татбиқ', TokenType.ТАТБИҚ],
    ['супер', TokenType.СУПЕР],
    ['конструктор', TokenType.КОНСТРУКТОР],
    ['хосусӣ', TokenType.ХОСУСӢ],
    ['муҳофизатшуда', TokenType.МУҲОФИЗАТШУДА],
    ['ҷамъиятӣ', TokenType.ҶАМЪИЯТӢ],
    ['статикӣ', TokenType.СТАТИКӢ],
    ['мавҳум', TokenType.МАВҲУМ],
    ['номфазо', TokenType.НОМФАЗО],
    ['калидҳои', TokenType.КАЛИДҲОИ],
    ['инфер', TokenType.ИНФЕР],
    ['хулоса', TokenType.ХУЛОСА],
    ['танҳохонӣ', TokenType.ТАНҲОХОНӢ],
    ['беназир', TokenType.БЕНАЗИР],
    ['навъи', TokenType.НАВЪИ],
    ['аст', TokenType.АСТ],
    ['бармесоё', TokenType.БАРМЕСОЁ],

    // Type system - Utility Types
    ['қисмӣ', TokenType.ҚИСМӢ],
    ['ҳатмӣ', TokenType.ҲАТМӢ],
    ['танҳохон', TokenType.ТАНҲОХОН],
    ['сабт_навъ', TokenType.САБТ_НАВЪ],
    ['гирифтан_навъ', TokenType.ГИРИФТАН_НАВЪ],
    ['ҳазф', TokenType.ҲАЗФ],
    ['хориҷ', TokenType.ХОРИҶ],
    ['истихроҷ', TokenType.ИСТИХРОҶ],
    ['беналиӣ', TokenType.БЕНАЛИӢ],
    ['навъи_бозгашт', TokenType.НАВЪИ_БОЗГАШТ],
    ['параметрҳо', TokenType.ПАРАМЕТРҲО],
    ['навъи_намуна', TokenType.НАВЪИ_НАМУНА],
    ['параметрҳои_конструктор', TokenType.ПАРАМЕТРҲОИ_КОНСТРУКТОР],
    ['навъи_параметри_ин', TokenType.НАВЪИ_ПАРАМЕТРИ_ИН],
    ['интизоршуда', TokenType.ИНТИЗОРШУДА],
  ];

  test.each(cases)('maps %s to correct TokenType', (keyword, token) => {
    expect(KEYWORDS.get(keyword)).toBe(token);
  });

  test('all keywords are covered', () => {
    expect(KEYWORDS.size).toBe(cases.length);
  });
});
