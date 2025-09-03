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
    expect((stmt as any).params[0].name).toBe('ном');
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
});