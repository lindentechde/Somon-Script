/*
 * SomonScript
 * Copyright (c) 2025 LindenTech IT Consulting
 *
 * Licensed under the MIT License. See the LICENSE file for details.
 */

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
 * const result = compile("чоп.сабт('Салом, ҷаҳон!');");
 * if (result.errors.length === 0) {
 *   console.log(result.code); // console.log("Салом, ҷаҳон!");
 * }
 * ```
 */
export { compile } from './compiler';
export type { CompileOptions, CompileResult } from './compiler';
export { TARGETS, DEFAULT_TARGET, defaultLib, typeScriptLibNames } from './targets';
export type { Target } from './targets';
