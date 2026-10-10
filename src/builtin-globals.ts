/**
 * The built-in objects SomonScript names in Tajik (`чоп`, `математика`, `Риёзӣ`):
 * which members they have, so the type checker reports `чоп.сабтт(…)` or
 * `математика.решаа(…)` before the program runs, and which of them cannot be
 * called (`математика(…)`).
 */
import { BUILTIN_MAPPINGS } from './builtin-names';

/** The console methods of the Console Standard and Node.js. */
const CONSOLE_METHODS: ReadonlySet<string> = new Set([
  'assert',
  'clear',
  'count',
  'countReset',
  'debug',
  'dir',
  'dirxml',
  'error',
  'group',
  'groupCollapsed',
  'groupEnd',
  'info',
  'log',
  'profile',
  'profileEnd',
  'table',
  'time',
  'timeEnd',
  'timeLog',
  'timeStamp',
  'trace',
  'warn',
]);

/** The object each Tajik name stands for, as the code generator emits it (`mapBuiltinObject`). */
const BUILTIN_OBJECTS: ReadonlyMap<string, object> = new Map<string, object>([
  ['чоп', console],
  ['математика', Math],
  ['Риёзӣ', Math],
]);

/** Built-in objects that are not functions: calling one always fails. */
const NOT_CALLABLE: ReadonlySet<string> = new Set(['математика', 'Риёзӣ']);

/** Whether `name` is a built-in object whose members are checked. */
export function isCheckedBuiltinObject(name: string): boolean {
  return BUILTIN_OBJECTS.has(name);
}

/**
 * JavaScript name of member `member` of built-in object `objectName`: every
 * Tajik alias is translated there (`математика.поён` → `Math.floor`), and
 * `чоп.Хато` is `console.error`, as `чоп.хато` is.
 */
export function builtinObjectMemberName(objectName: string, member: string): string {
  const jsName = BUILTIN_MAPPINGS.get(member) ?? member;
  return objectName === 'чоп' && jsName === 'Error' ? 'error' : jsName;
}

/** Whether built-in object `objectName` (one of `isCheckedBuiltinObject`) has `member`. */
export function builtinObjectHasMember(objectName: string, member: string): boolean {
  const jsName = builtinObjectMemberName(objectName, member);
  const object = BUILTIN_OBJECTS.get(objectName)!;
  if (objectName === 'чоп' && CONSOLE_METHODS.has(jsName)) return true;
  return jsName in object;
}

/** Whether `name` is a built-in object that cannot be called (`математика(…)`). */
export function isNotCallableBuiltin(name: string): boolean {
  return NOT_CALLABLE.has(name);
}
