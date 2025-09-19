#!/usr/bin/env node
/**
 * # SomonScript CLI Entry Point
 *
 * Provides the `somon` executable that wraps the compiler with a rich command-line
 * experience. The CLI mirrors the behavior of the npm package and is primarily intended
 * for Node.js environments.
 */

import { createProgram } from './cli/program';

const program = createProgram();

// Parse command line arguments
program.parse();
