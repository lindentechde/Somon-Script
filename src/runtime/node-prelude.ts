/**
 * Loaded with `node --require` before every program `somon run` starts: sets
 * up the run time of src/runtime/node.ts. Nothing here runs inside the CLI.
 */
import { installTajikConsole } from './node';

installTajikConsole();
