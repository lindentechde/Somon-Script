/**
 * Loaded with `node --require` before every program `somon run` starts: sets
 * up the run time of src/runtime/node.ts, the input `хондан()` and
 * `хонданиРақам()` read (src/runtime/input.ts) and, when the CLI's language is
 * Tajik or Russian (`SOMON_RUN_LANGUAGE`), reports errors for learners
 * (src/runtime/node-errors.ts). Nothing here runs inside the CLI.
 */
import { createInput, INPUT_GLOBAL } from './input';
import { installTajikConsole } from './node';
import { installErrorReporter } from './node-errors';
import { nodeInputHost } from './node-input';

installTajikConsole();

const language = process.env.SOMON_RUN_LANGUAGE;
(global as unknown as Record<string, unknown>)[INPUT_GLOBAL] = createInput(
  nodeInputHost(),
  language === 'tj' || language === 'ru' ? language : 'en'
);
if (language === 'tj' || language === 'ru' || language === 'en') {
  installErrorReporter({
    language,
    showStack: process.env.SOMON_RUN_STACK === '1',
    cwd: process.env.SOMON_RUN_CWD,
  });
}
