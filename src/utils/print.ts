/**
 * Terminal output utilities for consistent colored printing
 */

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

export type ColorName = keyof typeof colors;

/**
 * Applies color to text for terminal output
 */
export function colorize(text: string, color: ColorName): string {
    return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Prints a regular message to the console
 */
export function print(message: string): void {
    console.log(message);
}

/**
 * Prints an error message in red
 */
export function printError(message: string): void {
    console.error(colorize(`ERROR: ${message}`, 'red'));
}

/**
 * Prints a success message in green
 */
export function printSuccess(message: string): void {
    console.log(colorize(message, 'green'));
}

/**
 * Prints a warning message in yellow
 */
export function printWarning(message: string): void {
    console.warn(colorize(`WARNING: ${message}`, 'yellow'));
}

/**
 * Prints an info message in cyan
 */
export function printInfo(message: string): void {
    console.info(colorize(message, 'cyan'));
}

/**
 * Prints a divider line to the console
 */
export function printDivider(length: number = 50, char: string = '─'): void {
    console.log(char.repeat(length));
}

/**
 * Prints a formatted object to the console
 */
export function printObject(obj: Record<string, unknown>): void {
    console.log(JSON.stringify(obj, null, 2));
}
