/*
 * SomonScript CLI: the language server command (`somon lsp`)
 * Copyright (c) 2025 LindenTech IT Consulting
 *
 * Licensed under the MIT License. See the LICENSE file for details.
 */

import type { Command } from 'commander';

import { i18n, t } from './i18n';

/** `defineCommand` of program.ts: registers a command with its localized aliases. */
type DefineCommand = (_name: string, _key: 'lsp') => Command;

/** Registers `lsp`: the Language Server Protocol over stdin/stdout, in the CLI's language. */
export function registerLspCommand(define: DefineCommand, version: string): void {
  define('lsp', 'lsp')
    .option('--stdio', t().commands.lsp.options.stdio)
    // Editor clients may add their own flags (`--clientProcessId=…`)
    .allowUnknownOption()
    .action(async (): Promise<void> => {
      const { startLanguageServer } = await import('../lsp');
      startLanguageServer({ locale: i18n.getLanguage(), version });
    });
}
