/* eslint-disable no-unused-vars */
// Token types for lexical analysis
export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  TEMPLATE_LITERAL = 'TEMPLATE_LITERAL',
  TEMPLATE_START = 'TEMPLATE_START',
  TEMPLATE_MIDDLE = 'TEMPLATE_MIDDLE',
  TEMPLATE_END = 'TEMPLATE_END',
  BOOLEAN = 'BOOLEAN',
  IDENTIFIER = 'IDENTIFIER',

  // Keywords (in Tajik Cyrillic)
  ТАҒЙИРЁБАНДА = 'ТАҒЙИРЁБАНДА', // variable (let/var)
  СОБИТ = 'СОБИТ', // constant
  ФУНКСИЯ = 'ФУНКСИЯ', // function
  АГАР = 'АГАР', // if
  ВАГАРНА = 'ВАГАРНА', // else if
  ЧУНИН = 'ЧУНИН', // else
  БАРОИ = 'БАРОИ', // for
  ТО = 'ТО', // while
  БОЗГАШТ = 'БОЗГАШТ', // return
  СИНФ = 'СИНФ', // class
  НАВ = 'НАВ', // new
  ИН = 'ИН', // this
  ДУРУСТ = 'ДУРУСТ', // true
  НОДУРУСТ = 'НОДУРУСТ', // false
  ХОЛӢ = 'ХОЛӢ', // null
  БЕҚИМАТ = 'БЕҚИМАТ', // undefined

  // Import/Export keywords
  ВОРИД = 'ВОРИД', // import
  СОДИР = 'СОДИР', // export
  АЗ = 'АЗ', // from
  ДАР = 'ДАР', // in
  ПЕШФАРЗ = 'ПЕШФАРЗ', // default
  ЧУН = 'ЧУН', // as

  // Built-in functions and objects
  ЧОП = 'ЧОП', // console (print)
  САБТ = 'САБТ', // log
  ХАТО = 'ХАТО', // error
  ОГОҲӢ = 'ОГОҲӢ', // warn
  МАЪЛУМОТ = 'МАЪЛУМОТ', // info
  ИСФТИ = 'ИСФТИ', // debug
  ТАСДИҚ = 'ТАСДИҚ', // assert
  ҚАЙД = 'ҚАЙД', // count
  ҚАЙДАСЛ = 'ҚАЙДАСЛ', // countReset
  ВАҚТ = 'ВАҚТ', // time
  ВАҚТСАБТ = 'ВАҚТСАБТ', // timeLog
  ВАҚТОХИР = 'ВАҚТОХИР', // timeEnd
  ҶАДВАЛ = 'ҶАДВАЛ', // table
  ФЕҲРИСТ = 'ФЕҲРИСТ', // dir
  XMLФЕҲРИСТ = 'XMLФЕҲРИСТ', // dirxml
  ПАЙҶО = 'ПАЙҶО', // trace
  ПОЛИЗ = 'ПОЛИЗ', // clear
  ГУРУҲ = 'ГУРУҲ', // group
  ГУРУҲОХИР = 'ГУРУҲОХИР', // groupEnd
  ГУРУҲПӮШИДА = 'ГУРУҲПӮШИДА', // groupCollapsed

  // Array methods
  РӮЙХАТ = 'РӮЙХАТ', // Array
  ИЛОВА = 'ИЛОВА', // push
  БАРОВАРДАН = 'БАРОВАРДАН', // pop
  ДАРОЗӢ = 'ДАРОЗӢ', // length
  ХАРИТА = 'ХАРИТА', // map
  ФИЛТР = 'ФИЛТР', // filter
  КОФТАН = 'КОФТАН', // find

  // String methods
  САТРМЕТОДҲО = 'САТРМЕТОДҲО', // String methods
  ДАРОЗИИСАТР = 'ДАРОЗИИСАТР', // length
  ПАЙВАСТАН = 'ПАЙВАСТАН', // concat
  ҶОЙИВАЗКУНӢ = 'ҶОЙИВАЗКУНӢ', // replace
  ҶУДОКУНӢ = 'ҶУДОКУНӢ', // split

  // Object methods
  КАЛИДҲО = 'КАЛИДҲО', // keys
  ҚИМАТҲО = 'ҚИМАТҲО', // values

  // Math functions
  МАТЕМАТИКА = 'МАТЕМАТИКА', // Math
  ҶАМЪ = 'ҶАМЪ', // add (custom)
  ТАРҲ = 'ТАРҲ', // subtract (custom)
  ЗАРБ = 'ЗАРБ', // multiply (custom)
  ТАҚСИМ = 'ТАҚСИМ', // divide (custom)

  // Control flow additions
  ШИКАСТАН = 'ШИКАСТАН', // break
  ДАВОМ = 'ДАВОМ', // continue
  ИНТИХОБ = 'ИНТИХОБ', // switch
  ҲОЛАТ = 'ҲОЛАТ', // case
  КӮШИШ = 'КӮШИШ', // try
  ГИРИФТАН = 'ГИРИФТАН', // catch
  НИҲОЯТ = 'НИҲОЯТ', // finally
  ПАРТОФТАН = 'ПАРТОФТАН', // throw

  // Async keywords
  ҲАМЗАМОН = 'ҲАМЗАМОН', // async
  ИНТИЗОР = 'ИНТИЗОР', // await
  ВАЪДА = 'ВАЪДА', // Promise

  // Type system keywords (Primitive Types)
  САТР = 'САТР', // string type
  РАҚАМ = 'РАҚАМ', // number type
  МАНТИҚӢ = 'МАНТИҚӢ', // boolean type
  КАЛОНРАҚАМ = 'КАЛОНРАҚАМ', // bigint type
  РАМЗ = 'РАМЗ', // symbol type

  // Special Types
  ҲАР = 'ҲАР', // any type
  НОШИНОС = 'НОШИНОС', // unknown type
  АБАДАН = 'АБАДАН', // never type
  БЕДЖАВОБ = 'БЕДЖАВОБ', // void type
  ОБЪЕКТ = 'ОБЪЕКТ', // object type

  // Type System Keywords
  ИНТЕРФЕЙС = 'ИНТЕРФЕЙС', // interface
  НАВЪ = 'НАВЪ', // type
  ЯКХЕЛА = 'ЯКХЕЛА', // generic (same/uniform)
  МЕРОС = 'МЕРОС', // extends/inherits
  ТАТБИҚ = 'ТАТБИҚ', // implements
  СУПЕР = 'СУПЕР', // super
  КОНСТРУКТОР = 'КОНСТРУКТОР', // constructor
  ХОСУСӢ = 'ХОСУСӢ', // private
  МУҲОФИЗАТШУДА = 'МУҲОФИЗАТШУДА', // protected
  ҶАМЪИЯТӢ = 'ҶАМЪИЯТӢ', // public
  СТАТИКӢ = 'СТАТИКӢ', // static
  МАВҲУМ = 'МАВҲУМ', // abstract
  НОМФАЗО = 'НОМФАЗО', // namespace
  КАЛИДҲОИ = 'КАЛИДҲОИ', // keyof
  ИНФЕР = 'ИНФЕР', // infer
  ХУЛОСА = 'ХУЛОСА', // infer (alternative)
  ТАНҲОХОНӢ = 'ТАНҲОХОНӢ', // readonly
  БЕНАЗИР = 'БЕНАЗИР', // unique
  НАВЪИ = 'НАВЪИ', // typeof
  АСТ = 'АСТ', // is (type predicate)
  БАРМЕСОЁ = 'БАРМЕСОЁ', // asserts (type predicate)

  // Utility Type Keywords
  ҚИСМӢ = 'ҚИСМӢ', // Partial<T>
  ҲАТМӢ = 'ҲАТМӢ', // Required<T>
  ТАНҲОХОН = 'ТАНҲОХОН', // Readonly<T>
  САБТ_НАВЪ = 'САБТ_НАВЪ', // Record<K, V>
  ГИРИФТАН_НАВЪ = 'ГИРИФТАН_НАВЪ', // Pick<T, K>
  ҲАЗФ = 'ҲАЗФ', // Omit<T, K>
  ХОРИҶ = 'ХОРИҶ', // Exclude<T, U>
  ИСТИХРОҶ = 'ИСТИХРОҶ', // Extract<T, U>
  БЕНАЛИӢ = 'БЕНАЛИӢ', // NonNullable<T>
  НАВЪИ_БОЗГАШТ = 'НАВЪИ_БОЗГАШТ', // ReturnType<T>
  ПАРАМЕТРҲО = 'ПАРАМЕТРҲО', // Parameters<T>
  НАВЪИ_НАМУНА = 'НАВЪИ_НАМУНА', // InstanceType<T>
  ПАРАМЕТРҲОИ_КОНСТРУКТОР = 'ПАРАМЕТРҲОИ_КОНСТРУКТОР', // ConstructorParameters<T>
  НАВЪИ_ПАРАМЕТРИ_ИН = 'НАВЪИ_ПАРАМЕТРИ_ИН', // ThisParameterType<T>
  ИНТИЗОРШУДА = 'ИНТИЗОРШУДА', // Awaited<T>

  // Operators
  PLUS = '+',
  MINUS = '-',
  INCREMENT = '++',
  DECREMENT = '--',
  MULTIPLY = '*',
  DIVIDE = '/',
  MODULO = '%',
  EXPONENT = '**',
  ASSIGN = '=',
  PLUS_ASSIGN = '+=',
  MINUS_ASSIGN = '-=',
  MULTIPLY_ASSIGN = '*=',
  DIVIDE_ASSIGN = '/=',
  MODULO_ASSIGN = '%=',
  EXPONENT_ASSIGN = '**=',
  ARROW = '=>',
  EQUAL = '==',
  STRICT_EQUAL = '===',
  NOT_EQUAL = '!=',
  STRICT_NOT_EQUAL = '!==',
  LESS_THAN = '<',
  GREATER_THAN = '>',
  LESS_EQUAL = '<=',
  GREATER_EQUAL = '>=',
  AND = '&&',
  OR = '||',
  AND_ASSIGN = '&&=',
  OR_ASSIGN = '||=',
  NULLISH_COALESCING = '??',
  NULLISH_ASSIGN = '??=',
  BITWISE_AND = '&',
  BITWISE_OR = '|',
  BITWISE_XOR = '^',
  BITWISE_NOT = '~',
  BITWISE_AND_ASSIGN = '&=',
  BITWISE_OR_ASSIGN = '|=',
  BITWISE_XOR_ASSIGN = '^=',
  LEFT_SHIFT = '<<',
  RIGHT_SHIFT = '>>',
  UNSIGNED_RIGHT_SHIFT = '>>>',
  LEFT_SHIFT_ASSIGN = '<<=',
  RIGHT_SHIFT_ASSIGN = '>>=',
  UNSIGNED_RIGHT_SHIFT_ASSIGN = '>>>=',
  NOT = '!',
  SPREAD = '...',
  OPTIONAL_CHAINING = '?.',

  // Punctuation
  SEMICOLON = ';',
  COMMA = ',',
  DOT = '.',
  COLON = ':',
  QUESTION = '?',

  // Brackets
  LEFT_PAREN = '(',
  RIGHT_PAREN = ')',
  LEFT_BRACE = '{',
  RIGHT_BRACE = '}',
  LEFT_BRACKET = '[',
  RIGHT_BRACKET = ']',

  // Special
  EOF = 'EOF',
  NEWLINE = 'NEWLINE',
  WHITESPACE = 'WHITESPACE',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}
