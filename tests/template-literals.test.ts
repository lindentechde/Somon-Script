import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { CodeGenerator } from '../src/codegen';
import { TokenType } from '../src/tokens';

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
      const stmt = ast.body[0] as any;
      expect(stmt.type).toBe('ExpressionStatement');
      expect(stmt.expression.type).toBe('TemplateLiteral');
      expect(stmt.expression.quasis).toHaveLength(1);
      expect(stmt.expression.expressions).toHaveLength(0);
      expect(stmt.expression.quasis[0].value.cooked).toBe('Салом, ҷаҳон!');
    });

    test('should parse template literal with single interpolation', () => {
      const lexer = new Lexer('`Салом, ${ном}!`');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const stmt = ast.body[0] as any;
      expect(stmt.expression.type).toBe('TemplateLiteral');
      expect(stmt.expression.quasis).toHaveLength(2);
      expect(stmt.expression.expressions).toHaveLength(1);
      expect(stmt.expression.quasis[0].value.cooked).toBe('Салом, ');
      expect(stmt.expression.quasis[1].value.cooked).toBe('!');
      expect(stmt.expression.expressions[0].type).toBe('Identifier');
      expect(stmt.expression.expressions[0].name).toBe('ном');
    });

    test('should parse template literal with multiple interpolations', () => {
      const lexer = new Lexer('`${исм} ${фамилия} - ${синну} сола`');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const stmt = ast.body[0] as any;
      expect(stmt.expression.type).toBe('TemplateLiteral');
      expect(stmt.expression.quasis).toHaveLength(4);
      expect(stmt.expression.expressions).toHaveLength(3);
      expect(stmt.expression.expressions[0].name).toBe('исм');
      expect(stmt.expression.expressions[1].name).toBe('фамилия');
      expect(stmt.expression.expressions[2].name).toBe('синну');
    });

    test('should parse empty template literal', () => {
      const lexer = new Lexer('``');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const stmt = ast.body[0] as any;
      expect(stmt.expression.type).toBe('TemplateLiteral');
      expect(stmt.expression.quasis).toHaveLength(1);
      expect(stmt.expression.expressions).toHaveLength(0);
      expect(stmt.expression.quasis[0].value.cooked).toBe('');
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
  });
});
