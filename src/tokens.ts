// Token types for lexical analysis
export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  IDENTIFIER = 'IDENTIFIER',
  
  // Keywords (in Tajik Cyrillic)
  ТАҒЙИРЁБАНДА = 'ТАҒЙИРЁБАНДА', // variable (let/var)
  СОБИТ = 'СОБИТ',               // constant
  ФУНКСИЯ = 'ФУНКСИЯ',           // function
  АГАР = 'АГАР',                 // if
  ВАГАРНА = 'ВАГАРНА',           // else
  БАРОИ = 'БАРОИ',               // for
  ТО = 'ТО',                     // while
  БОЗГАШТ = 'БОЗГАШТ',           // return
  СИНФ = 'СИНФ',                 // class
  НАВ = 'НАВ',                   // new
  ИН = 'ИН',                     // this
  ДУРУСТ = 'ДУРУСТ',             // true
  НОДУРУСТ = 'НОДУРУСТ',         // false
  ХОЛӢ = 'ХОЛӢ',                 // null
  
  // Import/Export keywords
  ВОРИД = 'ВОРИД',               // import
  СОДИР = 'СОДИР',               // export
  АЗ = 'АЗ',                     // from
  ПЕШФАРЗ = 'ПЕШФАРЗ',           // default
  ЧУН = 'ЧУН',                   // as
  
  // Built-in functions and objects
  ЧОП = 'ЧОП',                   // console (print)
  САБТ = 'САБТ',                 // log
  ХАТО = 'ХАТО',                 // error
  ОГОҲӢ = 'ОГОҲӢ',               // warn
  МАЪЛУМОТ = 'МАЪЛУМОТ',         // info
  
  // Array methods
  РӮЙХАТ = 'РӮЙХАТ',             // Array
  ИЛОВА = 'ИЛОВА',               // push
  БАРОВАРДАН = 'БАРОВАРДАН',     // pop
  ДАРОЗӢ = 'ДАРОЗӢ',             // length
  ХАРИТА = 'ХАРИТА',             // map
  ФИЛТР = 'ФИЛТР',               // filter
  КОФТАН = 'КОФТАН',             // find
  
  // String methods
  САТР_МЕТОДҲО = 'САТР_МЕТОДҲО', // String methods
  ДАРОЗИИ_САТР = 'ДАРОЗИИ_САТР', // length
  ПАЙВАСТАН = 'ПАЙВАСТАН',       // concat
  ҶОЙИВАЗКУНӢ = 'ҶОЙИВАЗКУНӢ',   // replace
  ҶУДОКУНӢ = 'ҶУДОКУНӢ',         // split
  
  // Object methods
  ОБЪЕКТ = 'ОБЪЕКТ',             // Object
  КАЛИДҲО = 'КАЛИДҲО',           // keys
  ҚИМАТҲО = 'ҚИМАТҲО',           // values
  
  // Math functions
  МАТЕМАТИКА = 'МАТЕМАТИКА',     // Math
  ҶАМЪ = 'ҶАМЪ',                 // add (custom)
  ТАРҲ = 'ТАРҲ',                 // subtract (custom)
  ЗАРБ = 'ЗАРБ',                 // multiply (custom)
  ТАҚСИМ = 'ТАҚСИМ',             // divide (custom)
  
  // Control flow additions
  ШИКАСТАН = 'ШИКАСТАН',         // break
  ДАВОМ = 'ДАВОМ',               // continue
  КӮШИШ = 'КӮШИШ',               // try
  ГИРИФТАН = 'ГИРИФТАН',         // catch
  НИҲОЯТ = 'НИҲОЯТ',             // finally
  ПАРТОФТАН = 'ПАРТОФТАН',       // throw
  
  // Async keywords
  ҲАМЗАМОН = 'ҲАМЗАМОН',         // async
  ИНТИЗОР = 'ИНТИЗОР',           // await
  ВАЪДА = 'ВАЪДА',               // Promise
  
  // Type system keywords
  САТР = 'САТР',                 // string type
  РАҚАМ = 'РАҚАМ',               // number type
  МАНТИҚӢ = 'МАНТИҚӢ',           // boolean type
  ИНТЕРФЕЙС = 'ИНТЕРФЕЙС',       // interface
  НАВЪ = 'НАВЪ',                 // type
  ЯКХЕЛА = 'ЯКХЕЛА',             // generic (same/uniform)
  МЕРОС = 'МЕРОС',               // extends/inherits
  ТАТБИҚ = 'ТАТБИҚ',             // implements
  СУПЕР = 'СУПЕР',               // super
  КОНСТРУКТОР = 'КОНСТРУКТОР',   // constructor
  ХОСУСӢ = 'ХОСУСӢ',             // private
  МУҲОФИЗАТШУДА = 'МУҲОФИЗАТШУДА', // protected
  ҶАМЪИЯТӢ = 'ҶАМЪИЯТӢ',         // public
  СТАТИКӢ = 'СТАТИКӢ',           // static
  МАВҲУМ = 'МАВҲУМ',             // abstract
  НОМФАЗО = 'НОМФАЗО',           // namespace
  КАЛИДҲОИ = 'КАЛИДҲОИ',         // keyof
  ИНФЕР = 'ИНФЕР',               // infer
  READONLY = 'READONLY',         // readonly (keeping English for now)
  UNIQUE = 'UNIQUE',             // unique (keeping English for now)
  
  // Operators
  PLUS = '+',
  MINUS = '-',
  MULTIPLY = '*',
  DIVIDE = '/',
  MODULO = '%',
  ASSIGN = '=',
  EQUAL = '==',
  NOT_EQUAL = '!=',
  LESS_THAN = '<',
  GREATER_THAN = '>',
  LESS_EQUAL = '<=',
  GREATER_EQUAL = '>=',
  AND = '&&',
  OR = '||',
  PIPE = '|',
  AMPERSAND = '&',
  NOT = '!',
  
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
  WHITESPACE = 'WHITESPACE'
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}