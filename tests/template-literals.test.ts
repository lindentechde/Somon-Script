import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { CodeGenerator } from '../src/codegen';
import { TokenType } from '../src/tokens';
import { Program, ExpressionStatement } from '../src/types';

// Helper type guards for cleaner tests without using 'as any'
function isExpressionStatement(node: unknown): node is ExpressionStatement {
  return (
    !!node && typeof node === 'object' && (node as { type?: string }).type === 'ExpressionStatement'
  );
}

function firstExpressionStatement(ast: Program): ExpressionStatement {
  const node = ast.body[0];
  if (!isExpressionStatement(node)) {
    throw new Error('AST first node is not an ExpressionStatement');
  }
  return node;
}

describe('Template Literals', () => {
  describe('Lexer', () => {
    test('should tokenize simple template literal', () => {
      const lexer = new Lexer('`Салом, ҷаҳон!`');
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // TEMPLATE_LITERAL + EOF
      expect(tokens[0].type).toBe(TokenType.TEMPLATE_LITERAL);
      expect(tokens[0].value).toBe('Салом, ҷаҳон!');
    });

    test('should tokenize template literal with interpolation', () => {
      const lexer = new Lexer('`Салом, ${ном}!`');
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // TEMPLATE_LITERAL + EOF
      expect(tokens[0].type).toBe(TokenType.TEMPLATE_LITERAL);
      expect(tokens[0].value).toBe('Салом, ${ном}!');
    });

    test('should tokenize multiline template literal', () => {
      const lexer = new Lexer('`Сатри якум\nСатри дуюм`');
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.TEMPLATE_LITERAL);
      expect(tokens[0].value).toBe('Сатри якум\nСатри дуюм');
    });

    test('should handle escaped characters in template literals', () => {
      const lexer = new Lexer('`Escaped \\` backtick and \\${not interpolation}`');
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.TEMPLATE_LITERAL);
      expect(tokens[0].value).toBe('Escaped ` backtick and ${not interpolation}');
    });

    test('should handle nested braces in interpolation', () => {
      const lexer = new Lexer('`Result: ${obj.method({key: value})}`');
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.TEMPLATE_LITERAL);
      expect(tokens[0].value).toBe('Result: ${obj.method({key: value})}');
    });

    test('should throw error for unterminated template literal', () => {
      const lexer = new Lexer('`Unterminated template');

      expect(() => lexer.tokenize()).toThrow('Unterminated template literal');
    });
  });

  describe('Parser', () => {
    test('should parse simple template literal', () => {
      const lexer = new Lexer('`Салом, ҷаҳон!`');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(ast.body).toHaveLength(1);
      const stmt = firstExpressionStatement(ast);
      const expr = stmt.expression;
      expect(expr.type).toBe('TemplateLiteral');
      // Template literal specific expectations
      // @ts-expect-error intentional narrow without full union refinement
      expect(expr.quasis).toHaveLength(1);
      // @ts-expect-error see above
      expect(expr.expressions).toHaveLength(0);
      // @ts-expect-error see above
      expect(expr.quasis[0].value.cooked).toBe('Салом, ҷаҳон!');
    });

    test('should parse template literal with single interpolation', () => {
      const lexer = new Lexer('`Салом, ${ном}!`');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const expr = firstExpressionStatement(ast).expression as any; // local constrained any to limit scope
      expect(expr.type).toBe('TemplateLiteral');
      expect(expr.quasis).toHaveLength(2);
      expect(expr.expressions).toHaveLength(1);
      expect(expr.quasis[0].value.cooked).toBe('Салом, ');
      expect(expr.quasis[1].value.cooked).toBe('!');
      expect(expr.expressions[0].type).toBe('Identifier');
      expect(expr.expressions[0].name).toBe('ном');
    });

    test('should parse template literal with multiple interpolations', () => {
      const lexer = new Lexer('`${исм} ${фамилия} - ${синну} сола`');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const expr = firstExpressionStatement(ast).expression as any;
      expect(expr.type).toBe('TemplateLiteral');
      expect(expr.quasis).toHaveLength(4);
      expect(expr.expressions).toHaveLength(3);
      expect(expr.expressions[0].name).toBe('исм');
      expect(expr.expressions[1].name).toBe('фамилия');
      expect(expr.expressions[2].name).toBe('синну');
    });

    test('should parse empty template literal', () => {
      const lexer = new Lexer('``');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const expr = firstExpressionStatement(ast).expression as any;
      expect(expr.type).toBe('TemplateLiteral');
      expect(expr.quasis).toHaveLength(1);
      expect(expr.expressions).toHaveLength(0);
      expect(expr.quasis[0].value.cooked).toBe('');
    });
  });

  describe('Code Generator', () => {
    test('should generate simple template literal', () => {
      const lexer = new Lexer('`Салом, ҷаҳон!`');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const generator = new CodeGenerator();
      const code = generator.generate(ast);

      expect(code.trim()).toBe('`Салом, ҷаҳон!`;');
    });

    test('should generate template literal with interpolation', () => {
      const lexer = new Lexer('`Салом, ${ном}!`');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const generator = new CodeGenerator();
      const code = generator.generate(ast);

      expect(code.trim()).toBe('`Салом, ${ном}!`;');
    });

    test('should generate multiline template literal', () => {
      const lexer = new Lexer('`Сатри якум\nСатри дуюм`');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const generator = new CodeGenerator();
      const code = generator.generate(ast);

      expect(code.trim()).toBe('`Сатри якум\nСатри дуюм`;');
    });

    test('should generate template literal with multiple interpolations', () => {
      const lexer = new Lexer('`${исм} ${фамилия} - ${синну} сола`');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const generator = new CodeGenerator();
      const code = generator.generate(ast);

      expect(code.trim()).toBe('`${исм} ${фамилия} - ${синну} сола`;');
    });
  });

  describe('Integration', () => {
    test('should compile and execute simple template literal', () => {
      const code = '`Салом, ҷаҳон!`';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const generator = new CodeGenerator();
      const jsCode = generator.generate(ast);

      // The generated code should be valid JavaScript
      expect(() => new Function(jsCode)).not.toThrow();

      // Execute and check result
      const result = eval(jsCode.replace(';', ''));
      expect(result).toBe('Салом, ҷаҳон!');
    });

    test('should compile template literal with variable interpolation', () => {
      const code = '`Салом, ${ном}!`';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const generator = new CodeGenerator();
      const jsCode = generator.generate(ast);

      // Should generate valid JavaScript
      expect(() => new Function('ном', jsCode.replace(';', ''))).not.toThrow();

      // Execute in a context with the variable
      const func = new Function('ном', 'return ' + jsCode.replace(';', ''));
      const result = func('Аҳмад');
      expect(result).toBe('Салом, Аҳмад!');
    });

    test('should handle template literals in function calls', () => {
      const code = 'чоп.сабт(`Натиҷа: ${42 + 8}`);';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const generator = new CodeGenerator();
      const jsCode = generator.generate(ast);

      expect(jsCode).toContain('console.log(`Натиҷа: ${42 + 8}`);');
    });

    test('should handle nested template literals', () => {
      const code = '`Берунӣ: ${`Дарунӣ: ${x}`}`';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const generator = new CodeGenerator();
      const jsCode = generator.generate(ast);

      // Should generate valid JavaScript (though nested templates are complex)
      expect(() => new Function('x', jsCode.replace(';', ''))).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed interpolation gracefully', () => {
      const lexer = new Lexer('`Broken ${}`');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      // Should not throw during parsing
      expect(() => parser.parse()).not.toThrow();
    });

    test('should handle complex expressions in interpolation', () => {
      const code = '`Result: ${a + b * c}`';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const generator = new CodeGenerator();
      const jsCode = generator.generate(ast);

      // Should generate valid JavaScript
      expect(() => new Function('a', 'b', 'c', jsCode.replace(';', ''))).not.toThrow();
    });

    test('should properly tokenize built-in functions in interpolations', () => {
      const code = '`Time: ${чоп.сабт("test")}`';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const generator = new CodeGenerator();
      const jsCode = generator.generate(ast);

      // Should translate чоп.сабт to console.log inside interpolation
      expect(jsCode).toContain('console.log("test")');
    });

    test('should properly tokenize expressions instead of single identifiers', () => {
      const code = '`Sum: ${a + b}`';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // The expression should be properly parsed as a binary expression, not a single identifier
      const expression = (firstExpressionStatement(ast).expression as any).expressions[0];
      expect(expression.type).toBe('BinaryExpression');
      expect(expression.operator).toBe('+');
      expect(expression.left.name).toBe('a');
      expect(expression.right.name).toBe('b');
    });

    test('should properly tokenize method calls in interpolations', () => {
      const code = '`Length: ${arr.length}`';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // The expression should be properly parsed as member access
      const expression = (firstExpressionStatement(ast).expression as any).expressions[0];
      expect(expression.type).toBe('MemberExpression');
      expect(expression.object.name).toBe('arr');
      expect(expression.property.name).toBe('length');
    });

    test('should properly tokenize function calls in interpolations', () => {
      const code = '`Result: ${func(arg1, arg2)}`';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // The expression should be properly parsed as a function call
      const expression = (firstExpressionStatement(ast).expression as any).expressions[0];
      expect(expression.type).toBe('CallExpression');
      expect(expression.callee.name).toBe('func');
      expect(expression.arguments).toHaveLength(2);
    });

    test('should handle nested expressions in interpolations', () => {
      const code = '`Complex: ${obj.method(arr[0] + 1)}`';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Should parse the complex nested expression correctly
      const expression = (firstExpressionStatement(ast).expression as any).expressions[0];
      expect(expression.type).toBe('CallExpression');
      expect(expression.callee.type).toBe('MemberExpression');
      expect(expression.arguments).toHaveLength(1);
      expect(expression.arguments[0].type).toBe('BinaryExpression');
    });

    test('should handle empty interpolations gracefully', () => {
      const code = '`Empty: ${}`';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Should parse empty interpolation as undefined identifier
      const expression = (firstExpressionStatement(ast).expression as any).expressions[0];
      expect(expression.type).toBe('Identifier');
      expect(expression.name).toBe('undefined');
    });

    test('should handle whitespace-only interpolations', () => {
      const code = '`Whitespace: ${   }`';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Should parse whitespace-only interpolation as undefined identifier
      const expression = (firstExpressionStatement(ast).expression as any).expressions[0];
      expect(expression.type).toBe('Identifier');
      expect(expression.name).toBe('undefined');
    });
  });
});
