import { compile } from '../src/compiler';

describe('Comprehensive Standard Library Example', () => {
  test('should compile complex example with array methods using camelCase', () => {
    const source = `
// Факториал ҳисобкунӣ
функсия дарахт(баландӣ: рақам): сатр {
  тағ сатр = "";
  
  // Барои дарахт
  барои (тағ і = 0; і < баландӣ; і++) {
    тағ сатр = "";
  }
  
  // Фазохои чап
  барои (тағ ҷ = 0; ҷ < баландӣ - 1; ҷ++) {
    сатр = сатр + " ";
  }
  
  // Ситорахо
  барои (тағ к = 0; к < 2 * і + 1; к++) {
    сатр = сатр + "*";
  }
  
  чоп.сабт(сатр);
}

// Таҳияи дарахт
тағ пахнон_тана = Риёзӣ.поён(баландӣ / 3);
барои (тағ і = 0; і < баландӣ / 2; і++) {
  барои (тағ ҷ = 0; ҷ < баландӣ - пахнон_тана - 1; ҷ++) {
    тана = тана + " ";
  }
  барои (тағ к = 0; к < пахнон_тана * 2 + 1; к++) {
    тана = тана + "|";
  }
  чоп.сабт(тана);
}

дарахт(10);
`;

    const result = compile(source);

    // Should compile without errors
    expect(result.errors).toHaveLength(0);

    // Should use camelCase methods
    expect(result.code).toContain('Math.floor');
    expect(result.code).toContain('console.log');
  });

  test('should produce correct JavaScript output for camelCase methods', () => {
    const source = `
тағ рақамҳо = [1, 2, 3, 4, 5];
тағ натиҷа = рақамҳо.харита(х => х * 2);
чоп.сабт(натиҷа);

тағ матн = "Салом";
тағ калон = матн.калон();
чоп.сабт(калон);

тағ квадрат = Риёзӣ.қувват(3, 2);
чоп.сабт(квадрат);
`;

    const result = compile(source);

    expect(result.errors).toHaveLength(0);

    // Verify exact JS output
    const expectedLines = [
      'let рақамҳо = [1, 2, 3, 4, 5];',
      'let натиҷа = рақамҳо.map((х) => х * 2);',
      'console.log(натиҷа);',
      'let матн = "Салом";',
      'let калон = матн.toUpperCase();',
      'console.log(калон);',
      'let квадрат = Math.pow(3, 2);',
      'console.log(квадрат);',
    ];

    for (const line of expectedLines) {
      expect(result.code).toContain(line);
    }

    // Ensure тағ is transpiled to let
    expect(result.code).toContain('let рақамҳо');
    expect(result.code).toContain('let натиҷа');
    expect(result.code).toContain('let матн');
    expect(result.code).toContain('let калон');
    expect(result.code).toContain('let квадрат');

    // Ensure camelCase methods are transpiled correctly
    expect(result.code).toContain('.map(');
    expect(result.code).toContain('.toUpperCase()');
    expect(result.code).toContain('Math.pow(');
    expect(result.code).toContain('console.log(');
  });

  test('should compile array manipulation example with camelCase', () => {
    const source = `
// Мисоли истифодаи методҳои массив
тағ рақамҳо = [5, 2, 8, 1, 9, 3, 7, 4, 6];

// Истифодаи филтр
тағ калонҳо = рақамҳо.филтр(х => х > 5);
чоп.сабт("Калонҳо:", калонҳо);

// Истифодаи харита
тағ квадратҳо = рақамҳо.харита(х => х * х);
чоп.сабт("Квадратҳо:", квадратҳо);

// Истифодаи ҷамъбаст
тағ ҷамъ = рақамҳо.ҷамъбаст((а, б) => а + б, 0);
чоп.сабт("Ҷамъ:", ҷамъ);

// Истифодаи тартиб
тағ тартибшуда = рақамҳо.тартиб((а, б) => а - б);
чоп.сабт("Тартибшуда:", тартибшуда);

// Истифодаи бароиҲар
рақамҳо.бароиҲар((рақам, индекс) => {
  чоп.сабт(\`Индекс \${индекс}: \${рақам}\`);
});
`;

    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('.filter');
    expect(result.code).toContain('.map');
    expect(result.code).toContain('.reduce');
    expect(result.code).toContain('.sort');
    expect(result.code).toContain('.forEach');
  });

  test('should compile string methods example with camelCase', () => {
    const source = `
тағ матн = "Салом, Ҷаҳон!";

// Дарозии сатр
тағ дарозӣ = матн.дарозииСатр;
чоп.сабт("Дарозӣ:", дарозӣ);

// Ба калон
тағ калон = матн.калон();
чоп.сабт("Калон:", калон);

// Ба хурд  
тағ хурд = матн.хурд();
чоп.сабт("Хурд:", хурд);

// Ҷудокунӣ
тағ калимаҳо = матн.ҷудокунӣ(", ");
чоп.сабт("Калимаҳо:", калимаҳо);


`;

    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('.length');
    expect(result.code).toContain('.toUpperCase');
    expect(result.code).toContain('.toLowerCase');
    expect(result.code).toContain('.split');
  });

  test('should compile Math methods example with camelCase', () => {
    const source = `
тағ радиус = 5;

// Ҳисоби майдон
тағ майдон = Риёзӣ.ПИ * Риёзӣ.қувват(радиус, 2);
чоп.сабт("Майдон:", майдон);

// Ҳисоби решаи квадратӣ
тағ решаи = Риёзӣ.дуръшака(16);
чоп.сабт("Решаи 16:", решаи);

// Рақами тасодуфӣ
тағ тасодуфӣ = Риёзӣ.поён(Риёзӣ.тасодуфӣ() * 10) + 1;
чоп.сабт("Рақами тасодуфӣ 1-10:", тасодуфӣ);

// Гирдкунӣ
тағ гирд = Риёзӣ.дузкунӣ(4.7);
чоп.сабт("Гирдкунӣ 4.7:", гирд);

// Ҳадди аксар ва ақал
тағ максимум = Риёзӣ.ҳаддиАксар(3, 7, 9);
тағ минимум = Риёзӣ.ҳаддиАқал(3, 7, 9);
чоп.сабт("Ҳадди аксар:", максимум);
чоп.сабт("Ҳадди ақал:", минимум);
`;

    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('Math.PI');
    expect(result.code).toContain('Math.pow');
    expect(result.code).toContain('Math.sqrt');
    expect(result.code).toContain('Math.floor');
    expect(result.code).toContain('Math.random');
    expect(result.code).toContain('Math.round');
    expect(result.code).toContain('Math.max');
    expect(result.code).toContain('Math.min');
  });
});
