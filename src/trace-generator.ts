/**
 * The code generator of `compile(source, { trace: true })`: the generated
 * program records the steps it takes (src/runtime/trace.ts), for the
 * playground and the lessons to replay them line by line.
 *
 * Before each statement of a program, block or `ҳолат` arm, and at each test
 * of `агар`, `то`, `кун … то` and `барои`, it calls
 *
 *   __somonTrace.on && __somonTrace.step(line, names, [() => а, () => б])
 *
 * with a getter for each variable in scope: the tracer reads them itself, so
 * the program does what it did untraced. `names` indexes the table of names
 * the program gives the tracer first. The calls of functions are wrapped in
 * `enter(name)` and `exit()`, for the call depth. None of this has a position
 * marker: the mappings and the lines of runtime errors stay the statements'.
 *
 * Not traced: expression bodies of arrow functions (`х => х * 2`), and the
 * depth of `ҳамзамон` functions and generators, whose bodies run in parts.
 */
import { CodeGenerator, type FunctionInfo } from './codegen';
import { TRACE_GLOBAL } from './runtime/trace';
import type {
  BlockStatement,
  Expression,
  ForStatement,
  LabeledStatement,
  Parameter,
  Statement,
  TypeAnnotation,
} from './types';

/** Statements whose step is taken elsewhere, or that run nothing a learner would step through. */
const NOT_STEPPED = new Set([
  // Their test records the step, each time it is checked
  'IfStatement',
  'WhileStatement',
  // Declarations run before the code around them does
  'FunctionDeclaration',
  'ClassDeclaration',
  // Their statements have steps of their own
  'BlockStatement',
  'EmptyStatement',
  // Types: comments in the code
  'InterfaceDeclaration',
  'TypeAlias',
]);

export class TraceGenerator extends CodeGenerator {
  /** The names of the steps' getters (see `Tracer.names`), and the index of each list. */
  private readonly nameTable: string[] = [];
  private readonly nameIndex = new Map<string, number>();
  /** For each function around the current node: the number of scopes outside it. */
  private readonly functionStarts: number[] = [];

  protected override programPrologue(): string[] {
    return [`${TRACE_GLOBAL}.names([${this.nameTable.join(', ')}]);`];
  }

  /** The last step: the top level has run, with the variables it ends with. */
  protected override programEpilogue(): string[] {
    return [this.indent(`${this.stepCall(0)};`)];
  }

  protected override generateStatements(statements: Statement[]): string[] {
    const generated: string[] = [];
    for (const stmt of statements) {
      const code = this.generateStatement(stmt);
      if (code.length === 0) continue;
      if (TraceGenerator.isStepped(stmt))
        generated.push(this.indent(`${this.stepCall(stmt.line)};`));
      generated.push(code);
    }
    return generated;
  }

  protected override generateTest(test: Expression, code: string): string {
    return `(${this.stepCall(test.line)}, ${code})`;
  }

  protected override generateFunctionParts(
    params: Parameter[],
    body: BlockStatement,
    isAsync = false,
    thisType?: TypeAnnotation,
    info: FunctionInfo = {}
  ): { params: string; body: string } {
    this.functionStarts.push(this.scopes.length);
    try {
      const parts = super.generateFunctionParts(params, body, isAsync, thisType, info);
      // An async function or a generator returns before its body has run to its end
      if (isAsync || info.generator) return parts;
      const enter = `${TRACE_GLOBAL}.enter(${JSON.stringify(info.name ?? '')});`;
      return {
        params: parts.params,
        body: `{ ${enter} try ${parts.body} finally { ${TRACE_GLOBAL}.exit(); } }`,
      };
    } finally {
      this.functionStarts.pop();
    }
  }

  /**
   * A statement gets a step of its own unless its test records it, or it
   * declares a function or class. A `барои` without a test (`барои (;;)`)
   * gets one; a label gets the step of the statement it labels.
   */
  private static isStepped(stmt: Statement): boolean {
    let target: Statement = stmt;
    while (target.type === 'LabeledStatement') target = (target as LabeledStatement).body;
    if (target.type === 'ForStatement') return !(target as ForStatement).test;
    return !NOT_STEPPED.has(target.type);
  }

  /** `__somonTrace.on && __somonTrace.step(line, names, getters)` for the variables in scope. */
  private stepCall(line: number): string {
    const { names, outer } = this.visibleNames();
    const getters = names.map(name => `() => ${name}`).join(', ');
    const index = this.namesIndex([outer, ...names]);
    return `${TRACE_GLOBAL}.on && ${TRACE_GLOBAL}.step(${line}, ${index}, [${getters}])`;
  }

  /**
   * The names in scope, outer ones first, each once (an inner declaration
   * shadows an outer one); `outer` of them are declared outside the current
   * function. Functions and classes are among them: the tracer leaves out
   * values that are functions.
   */
  private visibleNames(): { names: string[]; outer: number } {
    const start =
      this.functionStarts.length > 0 ? this.functionStarts[this.functionStarts.length - 1] : 0;
    const seen = new Set<string>();
    const own: string[] = [];
    const outside: string[] = [];
    for (let depth = this.scopes.length - 1; depth >= 0; depth--) {
      for (const name of [...this.scopes[depth]].reverse()) {
        if (seen.has(name)) continue;
        seen.add(name);
        (depth >= start ? own : outside).push(name);
      }
    }
    return { names: [...outside.reverse(), ...own.reverse()], outer: outside.length };
  }

  private namesIndex(entry: [number, ...string[]]): number {
    const key = JSON.stringify(entry);
    let index = this.nameIndex.get(key);
    if (index === undefined) {
      index = this.nameTable.length;
      this.nameTable.push(key);
      this.nameIndex.set(key, index);
    }
    return index;
  }
}
