/*
 * The `require(…)` calls of JavaScript code, found in its syntax tree: a
 * `require('./x')` in a comment or a string is no call.
 */
import { parseSync } from '@babel/core';

export interface RequireCall {
  /** The module of `require('x')` or require(`x`); undefined when it is computed. */
  specifier?: string;
  /** The computed specifier is a template literal with substitutions: require(`./${x}`). */
  template: boolean;
  /** Offsets of the first argument (the module), or of the call when it has none. */
  start: number;
  end: number;
  /** 1-based position of the call. */
  line: number;
  column: number;
}

/** The parts of a Babel AST node that the scan looks at. */
interface BabelNode {
  type: string;
  name?: string;
  value?: unknown;
  start: number;
  end: number;
  loc: { start: { line: number; column: number } };
  callee?: BabelNode;
  arguments?: BabelNode[];
  expressions?: unknown[];
  quasis?: Array<{ value: { cooked?: string | null } }>;
}

/** Keys of Babel nodes that hold no code. */
const SKIPPED_KEYS = new Set(['loc', 'leadingComments', 'trailingComments', 'innerComments']);

/** The constant module name of `require`'s first argument. */
function constantSpecifier(argument: BabelNode): string | undefined {
  if (argument.type === 'StringLiteral') return argument.value as string;
  if (argument.type === 'TemplateLiteral' && argument.expressions!.length === 0) {
    return argument.quasis![0].value.cooked ?? undefined;
  }
  return undefined;
}

function requireCall(call: BabelNode): RequireCall {
  const position = { line: call.loc.start.line, column: call.loc.start.column + 1 };
  const [argument] = call.arguments!;
  if (argument === undefined) {
    return { template: false, start: call.start, end: call.end, ...position };
  }
  return {
    specifier: constantSpecifier(argument),
    template: argument.type === 'TemplateLiteral' && argument.expressions!.length > 0,
    start: argument.start,
    end: argument.end,
    ...position,
  };
}

/**
 * The calls of `require` (the identifier, not `о.require` or `require.resolve`) in
 * `code`, in source order; undefined when the code cannot be parsed.
 */
export function findRequireCalls(code: string): RequireCall[] | undefined {
  let program: unknown;
  try {
    program = parseSync(code, {
      configFile: false,
      babelrc: false,
      sourceType: 'unambiguous',
      parserOpts: { allowReturnOutsideFunction: true, errorRecovery: true },
    })!.program;
  } catch {
    return undefined;
  }

  const calls: RequireCall[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const candidate = node as BabelNode;
    if (
      candidate.type === 'CallExpression' &&
      candidate.callee!.type === 'Identifier' &&
      candidate.callee!.name === 'require'
    ) {
      calls.push(requireCall(candidate));
    }
    for (const [key, value] of Object.entries(node)) {
      if (!SKIPPED_KEYS.has(key)) visit(value);
    }
  };
  visit(program);
  return calls.sort((a, b) => a.start - b.start);
}
