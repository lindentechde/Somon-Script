import { compile } from '../src/compiler';

describe('Standard Library - Math Tests', () => {
  test('should transpile all math properties and methods correctly', () => {
    const testCases = [
      // Constants
      { source: 'Риёзӣ.Е;', expected: 'Math.E' },
      { source: 'Риёзӣ.ЛН10;', expected: 'Math.LN10' },
      { source: 'Риёзӣ.ЛН2;', expected: 'Math.LN2' },
      { source: 'Риёзӣ.ЛОГ10Е;', expected: 'Math.LOG10E' },
      { source: 'Риёзӣ.ЛОГ2Е;', expected: 'Math.LOG2E' },
      { source: 'Риёзӣ.ПИ;', expected: 'Math.PI' },
      { source: 'Риёзӣ.РЕША1_2;', expected: 'Math.SQRT1_2' },
      { source: 'Риёзӣ.РЕША2;', expected: 'Math.SQRT2' },

      // Methods
      { source: 'Риёзӣ.мутлақ(-1);', expected: 'Math.abs(-1)' },
      { source: 'Риёзӣ.арккосинус(0);', expected: 'Math.acos(0)' },
      { source: 'Риёзӣ.арккосинусГиперболӣ(1);', expected: 'Math.acosh(1)' },
      { source: 'Риёзӣ.арксинус(0);', expected: 'Math.asin(0)' },
      { source: 'Риёзӣ.арксинусГиперболӣ(0);', expected: 'Math.asinh(0)' },
      { source: 'Риёзӣ.арктангенс(0);', expected: 'Math.atan(0)' },
      { source: 'Риёзӣ.арктангенс2(0, 0);', expected: 'Math.atan2(0, 0)' },
      { source: 'Риёзӣ.арктангенсГиперболӣ(0);', expected: 'Math.atanh(0)' },
      { source: 'Риёзӣ.решаиКубӣ(8);', expected: 'Math.cbrt(8)' },
      { source: 'Риёзӣ.боло(1.1);', expected: 'Math.ceil(1.1)' },
      { source: 'Риёзӣ.clz32(1);', expected: 'Math.clz32(1)' },
      { source: 'Риёзӣ.косинус(0);', expected: 'Math.cos(0)' },
      { source: 'Риёзӣ.косинусГиперболӣ(0);', expected: 'Math.cosh(0)' },
      { source: 'Риёзӣ.экспонента(1);', expected: 'Math.exp(1)' },
      { source: 'Риёзӣ.expm1(1);', expected: 'Math.expm1(1)' },
      { source: 'Риёзӣ.поён(1.9);', expected: 'Math.floor(1.9)' },
      { source: 'Риёзӣ.fround(1.5);', expected: 'Math.fround(1.5)' },
      { source: 'Риёзӣ.гипотенуза(3, 4);', expected: 'Math.hypot(3, 4)' },
      { source: 'Риёзӣ.imul(2, 2);', expected: 'Math.imul(2, 2)' },
      { source: 'Риёзӣ.логарифм(1);', expected: 'Math.log(1)' },
      { source: 'Риёзӣ.логарифм10(10);', expected: 'Math.log10(10)' },
      { source: 'Риёзӣ.логарифм1п(0);', expected: 'Math.log1p(0)' },
      { source: 'Риёзӣ.логарифм2(2);', expected: 'Math.log2(2)' },
      { source: 'Риёзӣ.ҳаддиАксар(1, 2);', expected: 'Math.max(1, 2)' },
      { source: 'Риёзӣ.ҳаддиАқал(1, 2);', expected: 'Math.min(1, 2)' },
      { source: 'Риёзӣ.қувват(2, 2);', expected: 'Math.pow(2, 2)' },
      { source: 'Риёзӣ.тасодуфӣ();', expected: 'Math.random()' },
      { source: 'Риёзӣ.дузкунӣ(1.5);', expected: 'Math.round(1.5)' },
      { source: 'Риёзӣ.аломат(-1);', expected: 'Math.sign(-1)' },
      { source: 'Риёзӣ.синус(0);', expected: 'Math.sin(0)' },
      { source: 'Риёзӣ.синусГиперболӣ(0);', expected: 'Math.sinh(0)' },
      { source: 'Риёзӣ.дуръшака(4);', expected: 'Math.sqrt(4)' },
      { source: 'Риёзӣ.тангенс(0);', expected: 'Math.tan(0)' },
      { source: 'Риёзӣ.тангенсГиперболӣ(0);', expected: 'Math.tanh(0)' },
      { source: 'Риёзӣ.бириданАдад(1.5);', expected: 'Math.trunc(1.5)' },
    ];

    testCases.forEach(({ source, expected }) => {
      const result = compile(source);
      expect(result.errors).toHaveLength(0);
      expect(result.code).toContain(expected);
    });
  });
});
