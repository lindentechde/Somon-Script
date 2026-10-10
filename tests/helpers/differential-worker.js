'use strict';

/**
 * Worker process of the differential test: runs the jobs that
 * tests/helpers/differential.ts sends it (see `DifferentialPool`), with the
 * compiler loaded from the TypeScript sources.
 */
require('./ts-require');
require('./differential').serveWorker();
