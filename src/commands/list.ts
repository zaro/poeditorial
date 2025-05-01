import { listProjects } from '../api/helpers';
import { loadConfig } from '../config';
import type { CommandOptions } from '../types';
import { colorize, print, printDivider, printInfo, printWarning } from '../utils/print';

export async function runListCommand(projects: string[], options: CommandOptions): Promise<void> {
    const { config } = loadConfig(projects);
    const onlineProjects = await listProjects(options.accessToken);

    printInfo('Available Projects:');
    printDivider();
    print(`${colorize('ID', 'bright')}\t${colorize('Project Name', 'bright')}`);
    printDivider();

    const matchingProjects = Object.entries(onlineProjects).filter(
        ([projectName]) => options.all || config[projectName],
    );

    if (matchingProjects.length === 0) {
        printWarning('No projects found matching the criteria.');

        return;
    }

    // Sort projects by name for better readability
    matchingProjects.sort((a, b) => a[0].localeCompare(b[0]));

    for (const [projectName, project] of matchingProjects) {
        const isConfigured = config[projectName] ? colorize('✓', 'green') : ' ';
        print(`${project.id}\t${projectName} ${isConfigured}`);

        // If language filter is provided, show matching languages
        if (config[projectName] && options.language?.length) {
            const configuredLanguages = Object.keys(config[projectName].languages);
            const matchingLanguages = configuredLanguages.filter((lang) => options.language!.includes(lang));

            if (matchingLanguages.length) {
                print(`\t${colorize('Languages:', 'dim')} ${matchingLanguages.join(', ')}`);
            }
        }
    }

    printDivider();
    printInfo(`Total: ${matchingProjects.length} project(s)`);
}
