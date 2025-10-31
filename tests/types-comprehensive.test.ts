import { compile } from '../src/compiler';
import * as fs from 'fs';
import * as path from 'path';

describe('SomonScript Types - Comprehensive Tests', () => {
  const examplesDir = path.join(__dirname, '..', 'examples');

  describe('Primitive Types', () => {
    it('should compile 40-primitive-types.som successfully', () => {
      const filePath = path.join(examplesDir, '40-primitive-types.som');
      if (fs.existsSync(filePath)) {
        const code = fs.readFileSync(filePath, 'utf-8');
        const result = compile(code);
        expect(result.errors).toEqual([]);
        expect(result.code.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Special Types', () => {
    it('should compile 41-special-types.som successfully', () => {
      const filePath = path.join(examplesDir, '41-special-types.som');
      if (fs.existsSync(filePath)) {
        const code = fs.readFileSync(filePath, 'utf-8');
        const result = compile(code);
        expect(result.errors).toEqual([]);
        expect(result.code.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Composite Types', () => {
    it('should compile 42-composite-types.som successfully', () => {
      const filePath = path.join(examplesDir, '42-composite-types.som');
      if (fs.existsSync(filePath)) {
        const code = fs.readFileSync(filePath, 'utf-8');
        const result = compile(code);
        expect(result.errors).toEqual([]);
        expect(result.code.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Collections (Map, Set, WeakMap, WeakSet)', () => {
    it('should compile 43-collections-guide.som successfully', () => {
      const filePath = path.join(examplesDir, '43-collections-guide.som');
      if (fs.existsSync(filePath)) {
        const code = fs.readFileSync(filePath, 'utf-8');
        const result = compile(code);
        expect(result.errors).toEqual([]);
        expect(result.code.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Utility Types', () => {
    it('should compile 44-utility-types-guide.som successfully', () => {
      const filePath = path.join(examplesDir, '44-utility-types-guide.som');
      if (fs.existsSync(filePath)) {
        const code = fs.readFileSync(filePath, 'utf-8');
        const result = compile(code);
        expect(result.errors).toEqual([]);
        expect(result.code.length).toBeGreaterThan(0);
      }
    });
  });
});
