/**
 * # SomonScript Compiler API
 *
 * SomonScript provides a localized programming language that compiles to modern JavaScript.
 * This entrypoint exposes a minimal, well-documented API for embedding the compiler in
 * build pipelines, CLIs, and editors.
 *
 * @example
 * ```ts
 * import { compile } from "jsr:@lindentechde/somon-script";
 *
 * const result = compile("навис: 'Салом ҷаҳон!'");
 * if (result.errors.length === 0) {
 *   console.log(result.code);
 * }
 * ```
 */
export { compile } from './compiler';
export type { CompileOptions, CompileResult } from './compiler';
