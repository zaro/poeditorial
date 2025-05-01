import { Command, Option } from 'commander';

import { PoEditorApiError, PoEditorNetworkError } from './api/client';
import { runExportCommand } from './commands/export';
import { runListCommand } from './commands/list';
import { runUploadCommand } from './commands/upload';
import { ConfigError } from './config';
import type { CommandOptions } from './types';
import { PACKAGE_NAME, PACKAGE_VERSION } from './utils/package';
import { colorize, printError, printInfo, printSuccess } from './utils/print';

const program = new Command()
    .name(PACKAGE_NAME)
    .usage('<command> [options]')
    .description('CLI tool for interacting with POEditor API')
    .version(PACKAGE_VERSION)
    .showHelpAfterError();

async function runCommandWithErrorHandling(
    commandFn: (projects: string[], options: CommandOptions) => Promise<void>,
    projects: string[],
    options: CommandOptions,
    commandName: string,
): Promise<void> {
    try {
        await commandFn(projects, options);
        printSuccess(`Command "${commandName}" completed successfully.`);
    } catch (error: unknown) {
        // Handle specific error types
        if (error instanceof ConfigError) {
            printError(`Configuration error: ${error.message}`);
        } else if (error instanceof PoEditorApiError) {
            printError(`API error: ${error.message}`);
        } else if (error instanceof PoEditorNetworkError) {
            printError(`Network error: ${error.message}`);
        } else {
            const message = error instanceof Error ? error.message : String(error);
            printError(`An error occurred while executing command "${commandName}": ${message}`);
        }

        // Show troubleshooting help
        printInfo('\nTroubleshooting:');
        printInfo('- Check your internet connection');
        printInfo('- Verify your POEditor API token is correct');
        printInfo('- Make sure your configuration file is valid');
        printInfo(`- Run with --help for command usage information\n`);

        process.exit(1);
    }
}

// Define common options
const accessTokenOption = new Option('-a, --access-token <token>', 'POEditor API Token')
    .env('POEDITOR_TOKEN')
    .makeOptionMandatory();

const languageOption = new Option(
    '-l, --language <languages...>',
    'Specify languages (default: all configured languages)',
);

// List command
program
    .command('list [projects...]')
    .description('List projects (configured by default, use --all for all)')
    .option('--all', 'List all projects on POEditor, not just configured ones', false)
    .addOption(languageOption)
    .addOption(accessTokenOption)
    .action(async (projects, options) => {
        await runCommandWithErrorHandling(runListCommand, projects, options as CommandOptions, 'list');
    });

// Export command
program
    .command('export [projects...]')
    .description('Get translations from POEditor')
    .addOption(languageOption)
    .addOption(accessTokenOption)
    .option('--format <format>', 'Override export format')
    .action(async (projects, options) => {
        await runCommandWithErrorHandling(runExportCommand, projects, options as CommandOptions, 'export');
    });

// Upload command
program
    .command('upload [projects...]')
    .description('Upload translations to POEditor')
    .addOption(languageOption)
    .addOption(accessTokenOption)
    .option('--overwrite', 'Overwrite translations')
    .option('--sync-terms', 'Sync terms')
    .option('--no-fuzzy-trigger', 'Disable fuzzy trigger')
    .action(async (projects, options) => {
        await runCommandWithErrorHandling(runUploadCommand, projects, options as CommandOptions, 'upload');
    });

export async function main(): Promise<void> {
    // Display program banner
    printInfo(
        `\n${colorize(PACKAGE_NAME, 'cyan')} ${colorize(`v${PACKAGE_VERSION}`, 'dim')}\n` +
            `${colorize('POEditor management CLI tool', 'yellow')}\n`,
    );

    await program.parseAsync(process.argv);
}
