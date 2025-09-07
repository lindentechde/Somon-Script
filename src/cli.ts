#!/usr/bin/env node

import { createProgram } from './cli/program';

const program = createProgram();

// Parse command line arguments
program.parse();
