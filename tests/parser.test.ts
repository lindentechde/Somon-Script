import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';

describe('Parser', () => {
  function parseSource(source: string) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  test('should parse variable declaration', () => {
    const source = 'тағйирёбанда ном = "Аҳмад";';
    const ast = parseSource(source);

    expect(ast.type).toBe('Program');
    expect(ast.body).toHaveLength(1);
    
    const stmt = ast.body[0];
    expect(stmt.type).toBe('VariableDeclaration');
    expect((stmt as any).kind).toBe('ТАҒЙИРЁБАНДА');
    expect((stmt as any).identifier.name).toBe('ном');
    expect((stmt as any).init.type).toBe('Literal');
    expect((stmt as any).init.value).toBe('Аҳмад');
  });

  test('should parse constant declaration', () => {
    const source = 'собит сол = 2024;';
    const ast = parseSource(source);

    const stmt = ast.body[0];
    expect(stmt.type).toBe('VariableDeclaration');
    expect((stmt as any).kind).toBe('СОБИТ');
    expect((stmt as any).identifier.name).toBe('сол');
    expect((stmt as any).init.value).toBe(2024);
  });

  test('should parse function declaration', () => {
    const source = 'функсия салом(ном) { бозгашт ном; }';
    const ast = parseSource(source);

    const stmt = ast.body[0];
    expect(stmt.type).toBe('FunctionDeclaration');
    expect((stmt as any).name.name).toBe('салом');
    expect((stmt as any).params).toHaveLength(1);
    expect((stmt as any).params[0].name.name).toBe('ном');
    expect((stmt as any).body.type).toBe('BlockStatement');
  });

  test('should parse if statement', () => {
    const source = 'агар (х > 5) { чоп.сабт("калон"); }';
    const ast = parseSource(source);

    const stmt = ast.body[0];
    expect(stmt.type).toBe('IfStatement');
    expect((stmt as any).test.type).toBe('BinaryExpression');
    expect((stmt as any).test.operator).toBe('>');
    expect((stmt as any).consequent.type).toBe('BlockStatement');
  });

  test('should parse if-else statement', () => {
    const source = 'агар (х > 5) { чоп.сабт("калон"); } вагарна { чоп.сабт("хурд"); }';
    const ast = parseSource(source);

    const stmt = ast.body[0];
    expect(stmt.type).toBe('IfStatement');
    expect((stmt as any).alternate).toBeDefined();
    expect((stmt as any).alternate.type).toBe('BlockStatement');
  });

  test('should parse while loop', () => {
    const source = 'то (и < 10) { и = и + 1; }';
    const ast = parseSource(source);

    const stmt = ast.body[0];
    expect(stmt.type).toBe('WhileStatement');
    expect((stmt as any).test.type).toBe('BinaryExpression');
    expect((stmt as any).body.type).toBe('BlockStatement');
  });

  test('should parse binary expressions', () => {
    const source = 'х + у * з;';
    const ast = parseSource(source);

    const stmt = ast.body[0];
    expect(stmt.type).toBe('ExpressionStatement');
    
    const expr = (stmt as any).expression;
    expect(expr.type).toBe('BinaryExpression');
    expect(expr.operator).toBe('+');
    expect(expr.left.name).toBe('х');
    expect(expr.right.type).toBe('BinaryExpression');
    expect(expr.right.operator).toBe('*');
  });

  test('should parse function calls', () => {
    const source = 'салом("дунё", 42);';
    const ast = parseSource(source);

    const stmt = ast.body[0];
    const expr = (stmt as any).expression;
    expect(expr.type).toBe('CallExpression');
    expect(expr.callee.name).toBe('салом');
    expect(expr.arguments).toHaveLength(2);
    expect(expr.arguments[0].value).toBe('дунё');
    expect(expr.arguments[1].value).toBe(42);
  });

  test('should parse return statement', () => {
    const source = 'бозгашт х + у;';
    const ast = parseSource(source);

    const stmt = ast.body[0];
    expect(stmt.type).toBe('ReturnStatement');
    expect((stmt as any).argument.type).toBe('BinaryExpression');
  });

  describe('Type System Parsing', () => {
    test('should parse variable with type annotation', () => {
      const source = 'тағйирёбанда ном: сатр = "Аҳмад";';
      const ast = parseSource(source);

      const stmt = ast.body[0];
      expect(stmt.type).toBe('VariableDeclaration');
      expect((stmt as any).typeAnnotation).toBeDefined();
      expect((stmt as any).typeAnnotation.typeAnnotation.type).toBe('PrimitiveType');
      expect((stmt as any).typeAnnotation.typeAnnotation.name).toBe('сатр');
    });

    test('should parse function with typed parameters', () => {
      const source = 'функсия ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }';
      const ast = parseSource(source);

      const stmt = ast.body[0];
      expect(stmt.type).toBe('FunctionDeclaration');
      expect((stmt as any).params).toHaveLength(2);
      expect((stmt as any).params[0].type).toBe('Parameter');
      expect((stmt as any).params[0].typeAnnotation).toBeDefined();
      expect((stmt as any).returnType).toBeDefined();
    });

    test('should parse interface declaration', () => {
      const source = `
        интерфейс Корбар {
          ном: сатр;
          синну_сол: рақам;
          email?: сатр;
        }
      `;
      const ast = parseSource(source);

      const stmt = ast.body[0];
      expect(stmt.type).toBe('InterfaceDeclaration');
      expect((stmt as any).name.name).toBe('Корбар');
      expect((stmt as any).body.properties).toHaveLength(3);
      expect((stmt as any).body.properties[2].optional).toBe(true);
    });

    test('should parse array type annotation', () => {
      const source = 'тағйирёбанда рақамҳо: рақам[] = [1, 2, 3];';
      const ast = parseSource(source);

      const stmt = ast.body[0];
      expect(stmt.type).toBe('VariableDeclaration');
      expect((stmt as any).typeAnnotation.typeAnnotation.type).toBe('ArrayType');
      expect((stmt as any).typeAnnotation.typeAnnotation.elementType.type).toBe('PrimitiveType');
    });

    // Union types are planned for Phase 2
    // test('should parse union type annotation', () => {
    //   const source = 'тағйирёбанда қимат: сатр | рақам = "салом";';
    //   const ast = parseSource(source);

    //   const stmt = ast.body[0];
    //   expect(stmt.type).toBe('VariableDeclaration');
    //   expect((stmt as any).typeAnnotation.typeAnnotation.type).toBe('UnionType');
    //   expect((stmt as any).typeAnnotation.typeAnnotation.types).toHaveLength(2);
    // });

    test('should parse type alias', () => {
      const source = 'навъ КорбарИД = сатр;';
      const ast = parseSource(source);

      const stmt = ast.body[0];
      expect(stmt.type).toBe('TypeAlias');
      expect((stmt as any).name.name).toBe('КорбарИД');
      expect((stmt as any).typeAnnotation).toBeDefined();
    });
  });
});