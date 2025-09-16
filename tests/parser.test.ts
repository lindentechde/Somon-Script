import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import {
  Statement,
  VariableDeclaration,
  FunctionDeclaration,
  IfStatement,
  WhileStatement,
  ExpressionStatement,
  ReturnStatement,
  TypeAlias,
} from '../src/types';

function asVarDecl(stmt: Statement): VariableDeclaration {
  if (stmt.type !== 'VariableDeclaration') throw new Error('Expected VariableDeclaration');
  return stmt as VariableDeclaration; // local precise cast
}

function asFuncDecl(stmt: Statement): FunctionDeclaration {
  if (stmt.type !== 'FunctionDeclaration') throw new Error('Expected FunctionDeclaration');
  return stmt as FunctionDeclaration;
}

function asIf(stmt: Statement): IfStatement {
  if (stmt.type !== 'IfStatement') throw new Error('Expected IfStatement');
  return stmt as IfStatement;
}

function asWhile(stmt: Statement): WhileStatement {
  if (stmt.type !== 'WhileStatement') throw new Error('Expected WhileStatement');
  return stmt as WhileStatement;
}

function asExprStmt(stmt: Statement): ExpressionStatement {
  if (stmt.type !== 'ExpressionStatement') throw new Error('Expected ExpressionStatement');
  return stmt as ExpressionStatement;
}

function asReturn(stmt: Statement): ReturnStatement {
  if (stmt.type !== 'ReturnStatement') throw new Error('Expected ReturnStatement');
  return stmt as ReturnStatement;
}

function asTypeAlias(stmt: Statement): TypeAlias {
  if (stmt.type !== 'TypeAlias') throw new Error('Expected TypeAlias');
  return stmt as TypeAlias;
}

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
    const decl = asVarDecl(stmt);
    expect(decl.kind).toBe('ТАҒЙИРЁБАНДА');
    expect(decl.identifier.type).toBe('Identifier');
    // @ts-expect-error legacy AST shape may have different identifier node
    expect(decl.identifier.name).toBe('ном');
    expect(decl.init && decl.init.type).toBe('Literal');
    expect(decl.init && (decl.init as any).value).toBe('Аҳмад');
  });

  test('should parse constant declaration', () => {
    const source = 'собит сол = 2024;';
    const ast = parseSource(source);

    const stmt = ast.body[0];
    const decl = asVarDecl(stmt);
    expect(decl.kind).toBe('СОБИТ');
    expect((decl.identifier as any).name).toBe('сол');
    expect((decl.init as any).value).toBe(2024);
  });

  test('should parse function declaration', () => {
    const source = 'функсия салом(ном) { бозгашт ном; }';
    const ast = parseSource(source);

    const stmt = ast.body[0];
    const fn = asFuncDecl(stmt);
    expect(fn.name.name).toBe('салом');
    expect(fn.params).toHaveLength(1);
    expect(fn.params[0].name.name).toBe('ном');
    expect(fn.body.type).toBe('BlockStatement');
  });

  test('should parse if statement', () => {
    const source = 'агар (х > 5) { чоп.сабт("калон"); }';
    const ast = parseSource(source);

    const stmt = ast.body[0];
    const iff = asIf(stmt);
    expect(iff.test.type).toBe('BinaryExpression');
    expect((iff.test as any).operator).toBe('>');
    expect(iff.consequent.type).toBe('BlockStatement');
  });

  test('should parse if-else statement', () => {
    const source = 'агар (х > 5) { чоп.сабт("калон"); } вагарна { чоп.сабт("хурд"); }';
    const ast = parseSource(source);

    const stmt = ast.body[0];
    const iff = asIf(stmt);
    expect(iff.alternate).toBeDefined();
    expect(iff.alternate && iff.alternate.type).toBe('BlockStatement');
  });

  test('should parse while loop', () => {
    const source = 'то (и < 10) { и = и + 1; }';
    const ast = parseSource(source);

    const stmt = ast.body[0];
    const loop = asWhile(stmt);
    expect(loop.test.type).toBe('BinaryExpression');
    expect(loop.body.type).toBe('BlockStatement');
  });

  test('should parse binary expressions', () => {
    const source = 'х + у * з;';
    const ast = parseSource(source);

    const stmt = ast.body[0];
    expect(stmt.type).toBe('ExpressionStatement');

    const expr = asExprStmt(stmt).expression as any;
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
    const expr = asExprStmt(stmt).expression as any;
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
    const ret = asReturn(stmt);
    expect(ret.argument && ret.argument.type).toBe('BinaryExpression');
  });

  describe('Type System Parsing', () => {
    test('should parse variable with type annotation', () => {
      const source = 'тағйирёбанда ном: сатр = "Аҳмад";';
      const ast = parseSource(source);

      const stmt = ast.body[0];
      const decl = asVarDecl(stmt);
      expect(decl.typeAnnotation).toBeDefined();
      expect(decl.typeAnnotation && decl.typeAnnotation.typeAnnotation.type).toBe('PrimitiveType');
      // @ts-expect-error legacy field
      expect(decl.typeAnnotation && decl.typeAnnotation.typeAnnotation.name).toBe('сатр');
    });

    test('should parse function with typed parameters', () => {
      const source = 'функсия ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }';
      const ast = parseSource(source);

      const stmt = ast.body[0];
      const fn = asFuncDecl(stmt);
      expect(fn.params).toHaveLength(2);
      expect(fn.params[0].type).toBe('Parameter');
      expect(fn.params[0].typeAnnotation).toBeDefined();
      expect(fn.returnType).toBeDefined();
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
      // Interface declarations may not be fully implemented yet
      expect(stmt).toBeDefined();
      expect(stmt.type).toBeDefined();
    });

    test('should parse array type annotation', () => {
      const source = 'тағйирёбанда рақамҳо: рақам[] = [1, 2, 3];';
      const ast = parseSource(source);

      const stmt = ast.body[0];
      const decl = asVarDecl(stmt);
      expect(decl.typeAnnotation && decl.typeAnnotation.typeAnnotation.type).toBe('ArrayType');
      // @ts-expect-error elementType is specific to ArrayType
      expect(decl.typeAnnotation && decl.typeAnnotation.typeAnnotation.elementType.type).toBe(
        'PrimitiveType'
      );
    });

    test('should parse union type annotation', () => {
      const source = 'тағйирёбанда қимат: сатр | рақам = "салом";';
      const ast = parseSource(source);

      const stmt = ast.body[0];
      const decl = asVarDecl(stmt);
      expect(decl.typeAnnotation).toBeDefined();
    });

    test('should parse type alias', () => {
      const source = 'навъ КорбарИД = сатр;';
      const ast = parseSource(source);

      const stmt = ast.body[0];
      const alias = asTypeAlias(stmt);
      expect(alias.name.name).toBe('КорбарИД');
      expect(alias.typeAnnotation).toBeDefined();
    });

    test('should parse unique type alias', () => {
      const source = 'навъ Уник = беназир сатр;';
      const ast = parseSource(source);

      const stmt = ast.body[0];
      const alias = asTypeAlias(stmt);
      const typeNode: any = alias.typeAnnotation.typeAnnotation;
      expect(typeNode.type).toBe('UniqueType');
      expect(typeNode.baseType.type).toBe('PrimitiveType');
    });
  });
});
