#!/usr/bin/env node

/*
 * SomonScript CLI Entry Point with Localization Support
 * Copyright (c) 2025 LindenTech IT Consulting
 *
 * Licensed under the MIT License. See the LICENSE file for details.
 */

import { getLocalizedProgram } from './cli/localized-program';
import { i18n } from './cli/i18n';

// Detect language from arguments before creating program
const langIndex = process.argv.indexOf('--lang');
if (langIndex !== -1 && process.argv[langIndex + 1]) {
  const lang = process.argv[langIndex + 1];
  if (lang === 'tj' || lang === 'ru' || lang === 'en') {
    i18n.setLanguage(lang as 'en' | 'tj' | 'ru');
  }
}

const program = getLocalizedProgram();
program.parse(process.argv);
