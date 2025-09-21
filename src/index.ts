/*
 * Copyright (c) 2025 LindenTech IT Consulting. All Rights Reserved.
 *
 * Original Creator: Bakhtier Gaibulloev
 *
 * This software is proprietary and confidential. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited. See LICENSE file for terms.
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
 * const result = compile("навис: 'Салом ҷаҳон!'");
 * if (result.errors.length === 0) {
 *   console.log(result.code);
 * }
 * ```
 */
export { compile } from './compiler';
export type { CompileOptions, CompileResult } from './compiler';
