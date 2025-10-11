/*
 * SomonScript Localized CLI Program
 * Copyright (c) 2025 LindenTech IT Consulting
 *
 * Licensed under the MIT License. See the LICENSE file for details.
 */

import { Command } from 'commander';
import { createProgram } from './program';
import { i18n, t, type Language } from './i18n';

// Type definition for action handlers
type ActionHandler = (..._args: unknown[]) => void | Promise<void>;

// Type definition for Command with action handler
interface CommandWithHandler extends Command {
  _actionHandler?: ActionHandler;
}

/**
 * Creates a localized wrapper for command names and aliases
 * This allows users to use commands in their native language
 */
export function createLocalizedProgram(): Command {
  const baseProgram = createProgram();
  const lang = i18n.getLanguage();

  // If English, return the base program as-is
  if (lang === 'en') {
    return baseProgram;
  }

  // For non-English languages, create a pure localized program
  return createPureLocalizedProgram();
}

/**
 * Creates a fully localized program that uses only the selected language
 * This is for users who want a pure Tajik or Russian interface
 */
export function createPureLocalizedProgram(): Command {
  const program = new Command();
  const tr = t();
  const lang = i18n.getLanguage();

  program
    .name('somon')
    .description(tr.commands.somon.description)
    .version(require('../../package.json').version, '-V, --version', tr.common.version)
    .helpOption('-h, --help', tr.common.help)
    .addHelpCommand(tr.commands.help.name + ' [command]', tr.commands.help.description)
    .option('--lang <language>', tr.common.languageOption, (value: string) => {
      if (value === 'en' || value === 'tj' || value === 'ru') {
        i18n.setLanguage(value as Language);
      }
      return value;
    });

  // If English is selected, use the base program
  if (lang === 'en') {
    return createProgram();
  }

  // Otherwise create localized commands
  const baseProgram = createProgram();
  const commands = baseProgram.commands;

  // Add only localized versions of commands
  // Create a function to handle command localization
  const localizeCommand = (cmd: Command): Command | null => {
    let localizedCmd: Command | null = null;

    switch (cmd.name()) {
      case 'compile':
        localizedCmd = new Command(tr.commands.compile.name)
          .alias(tr.commands.compile.alias)
          .description(tr.commands.compile.description)
          .usage(tr.commands.compile.usage)
          .argument('<input>', tr.commands.compile.args.input)
          .option('-o, --output <file>', tr.commands.compile.options.output)
          .option('--out-dir <dir>', tr.commands.compile.options.outDir)
          .option('--target <target>', tr.commands.compile.options.target)
          .option('--source-map', tr.commands.compile.options.sourceMap)
          .option('--no-source-map', tr.commands.compile.options.noSourceMap)
          .option('--minify', tr.commands.compile.options.minify)
          .option('--no-minify', tr.commands.compile.options.noMinify)
          .option('--no-type-check', tr.commands.compile.options.noTypeCheck)
          .option('--strict', tr.commands.compile.options.strict)
          .option('-w, --watch', tr.commands.compile.options.watch)
          .option('--production', tr.commands.compile.options.production);
        {
          const handler = (cmd as CommandWithHandler)._actionHandler;
          if (handler) localizedCmd.action(handler as ActionHandler);
        }
        break;

      case 'run':
        localizedCmd = new Command(tr.commands.run.name)
          .alias(tr.commands.run.alias)
          .description(tr.commands.run.description)
          .usage(tr.commands.run.usage)
          .argument('<input>', tr.commands.run.args.input)
          .option('--target <target>', tr.commands.run.options.target)
          .option('--source-map', tr.commands.run.options.sourceMap)
          .option('--no-source-map', tr.commands.run.options.noSourceMap)
          .option('--minify', tr.commands.run.options.minify)
          .option('--no-minify', tr.commands.run.options.noMinify)
          .option('--no-type-check', tr.commands.run.options.noTypeCheck)
          .option('--strict', tr.commands.run.options.strict)
          .option('--production', tr.commands.run.options.production);
        {
          const handler = (cmd as CommandWithHandler)._actionHandler;
          if (handler) localizedCmd.action(handler as ActionHandler);
        }
        break;

      case 'init':
        localizedCmd = new Command(tr.commands.init.name)
          .description(tr.commands.init.description)
          .argument('[name]', tr.commands.init.args.name, 'somon-project');
        {
          const handler = (cmd as CommandWithHandler)._actionHandler;
          if (handler) localizedCmd.action(handler as ActionHandler);
        }
        break;

      case 'bundle':
        localizedCmd = new Command(tr.commands.bundle.name)
          .alias(tr.commands.bundle.alias)
          .description(tr.commands.bundle.description)
          .usage(tr.commands.bundle.usage)
          .argument('<input>', tr.commands.bundle.args.input)
          .option('-o, --output <file>', tr.commands.bundle.options.output)
          .option('-f, --format <format>', tr.commands.bundle.options.format, 'commonjs')
          .option('--minify', tr.commands.bundle.options.minify)
          .option('--source-map', tr.commands.bundle.options.sourceMap)
          .option('--inline-sources', tr.commands.bundle.options.inlineSources)
          .option('--externals <modules>', tr.commands.bundle.options.externals)
          .option('--production', tr.commands.bundle.options.production);
        {
          const handler = (cmd as CommandWithHandler)._actionHandler;
          if (handler) localizedCmd.action(handler as ActionHandler);
        }
        break;

      case 'module-info':
        localizedCmd = new Command(tr.commands.moduleInfo.name)
          .alias(tr.commands.moduleInfo.alias)
          .description(tr.commands.moduleInfo.description)
          .usage(tr.commands.moduleInfo.usage)
          .argument('<input>', tr.commands.moduleInfo.args.input)
          .option('--graph', tr.commands.moduleInfo.options.graph)
          .option('--stats', tr.commands.moduleInfo.options.stats)
          .option('--circular', tr.commands.moduleInfo.options.circular);
        {
          const handler = (cmd as CommandWithHandler)._actionHandler;
          if (handler) localizedCmd.action(handler as ActionHandler);
        }
        break;

      case 'resolve':
        localizedCmd = new Command(tr.commands.resolve.name)
          .description(tr.commands.resolve.description)
          .usage(tr.commands.resolve.usage)
          .argument('<specifier>', tr.commands.resolve.args.specifier)
          .option('-f, --from <file>', tr.commands.resolve.options.from);
        {
          const handler = (cmd as CommandWithHandler)._actionHandler;
          if (handler) localizedCmd.action(handler as ActionHandler);
        }
        break;

      case 'serve':
        localizedCmd = new Command(tr.commands.serve.name)
          .description(tr.commands.serve.description)
          .option('-p, --port <port>', tr.commands.serve.options.port, '8080')
          .option('-c, --config <file>', tr.commands.serve.options.config)
          .option('--production', tr.commands.serve.options.production)
          .option('--json', tr.commands.serve.options.json);
        {
          const handler = (cmd as CommandWithHandler)._actionHandler;
          if (handler) localizedCmd.action(handler as ActionHandler);
        }
        break;

      case 'help':
        // Don't add the English help command for non-English languages
        // Commander.js will automatically add a localized help based on helpOption
        break;

      default:
        // Keep other commands as-is (if any)
        localizedCmd = cmd;
    }

    return localizedCmd;
  };

  commands.forEach(cmd => {
    const localizedCmd = localizeCommand(cmd);
    if (localizedCmd) {
      program.addCommand(localizedCmd);
    }
  });

  return program;
}

/**
 * Export a convenience function to get the appropriate program
 * based on environment settings
 */
export function getLocalizedProgram(): Command {
  const lang = i18n.getLanguage();
  const mode = process.env.SOMON_LOCALIZATION_MODE;

  // Default to pure mode for non-English, unless explicitly set to mixed
  if (!mode) {
    return lang === 'en' ? createProgram() : createPureLocalizedProgram();
  }

  switch (mode) {
    case 'pure':
      // Pure localized interface - only shows commands in the selected language
      return createPureLocalizedProgram();
    case 'mixed':
      // Mixed mode - shows both English and localized commands
      // For this, we need a proper mixed implementation
      return createMixedProgram();
    default:
      return lang === 'en' ? createProgram() : createPureLocalizedProgram();
  }
}

/**
 * Creates a mixed program that shows both English and localized commands
 */
function createMixedProgram(): Command {
  const baseProgram = createProgram();
  const lang = i18n.getLanguage();

  // If English, return the base program as-is
  if (lang === 'en') {
    return baseProgram;
  }

  // For non-English, add localized aliases but keep English commands too
  // This is the original createLocalizedProgram logic
  const program = new Command();
  const tr = t();
  const pkg = require('../../package.json');

  program
    .name('somon')
    .description(tr.commands.somon.description)
    .version(pkg.version, '-V, --version', tr.common.version)
    .helpOption('-h, --help', tr.common.help)
    .option('--lang <language>', tr.common.languageOption, (value: string) => {
      if (value === 'en' || value === 'tj' || value === 'ru') {
        i18n.setLanguage(value as Language);
      }
      return value;
    });

  // Add all commands from base program
  baseProgram.commands.forEach(cmd => {
    program.addCommand(cmd);
  });

  return program;
}
