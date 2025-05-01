#!/usr/bin/env node

import { main } from './cli';

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('An unexpected error occurred:', message);
    process.exit(1);
});
