/**
 * Loaded with `node --require` before every program `somon run` starts: sets
 * up the run time of src/runtime/node.ts and, when the CLI's language is
 * Tajik or Russian (`SOMON_RUN_LANGUAGE`), reports errors for learners
 * (src/runtime/node-errors.ts). Nothing here runs inside the CLI.
 */
import { installTajikConsole } from './node';
import { installErrorReporter } from './node-errors';

installTajikConsole();

const language = process.env.SOMON_RUN_LANGUAGE;
if (language === 'tj' || language === 'ru' || language === 'en') {
  installErrorReporter({
    language,
    showStack: process.env.SOMON_RUN_STACK === '1',
    cwd: process.env.SOMON_RUN_CWD,
  });
}
