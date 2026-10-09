#!/usr/bin/env node

/*
 * SomonScript CLI Entry Point with Localization Support
 * Copyright (c) 2025 LindenTech IT Consulting
 *
 * Licensed under the MIT License. See the LICENSE file for details.
 */

import { createProgram } from './cli/program';
import { detectLanguage, i18n } from './cli/i18n';

// The language must be known before the program is built: command aliases,
// descriptions and messages are taken from the active translation.
try {
  i18n.setLanguage(detectLanguage(process.argv.slice(2), process.env));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const program = createProgram();
program.parse(process.argv);
