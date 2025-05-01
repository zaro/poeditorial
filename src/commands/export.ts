import path from 'node:path';

import { downloadFile, getExportFileUrl, listProjects } from '../api/helpers';
import { loadConfig } from '../config';
import type { CommandOptions } from '../types';
import { colorize, print, printError, printInfo, printSuccess, printWarning } from '../utils/print';

interface ExportTask {
    projectName: string;
    language: string;
    destination: string;
    projectId: number;
    format: string;
}

export async function runExportCommand(projects: string[], options: CommandOptions): Promise<void> {
    const { config, basePath } = loadConfig(projects);
    const onlineProjects = await listProjects(options.accessToken);
    const exportTasks: ExportTask[] = [];

    for (const [projectName, projectConfig] of Object.entries(config)) {
        const project = onlineProjects[projectName];

        if (!project) {
            printWarning(`Project "${projectName}" not found on POEditor. Skipping export.`);
            continue;
        }

        for (const [language, langConfig] of Object.entries(projectConfig.languages)) {
            if (options.language && !options.language.includes(language)) {
                continue;
            }

            const destination = path.join(basePath, langConfig.file);
            // Use format override from command line if provided
            const format = options.format || langConfig.format;

            exportTasks.push({
                projectName,
                language,
                destination,
                projectId: project.id,
                format,
            });

            printInfo(
                `Preparing export for ${colorize(projectName, 'cyan')} ` +
                    `language ${colorize(language, 'yellow')} to ${colorize(destination, 'dim')}`,
            );
        }
    }

    if (exportTasks.length === 0) {
        printWarning('No export tasks to perform based on current configuration and arguments.');

        return;
    }

    printInfo(`Starting ${colorize(exportTasks.length.toString(), 'bright')} download(s)...`);

    let successCount = 0;
    let failCount = 0;

    for (const task of exportTasks) {
        try {
            const url = await getExportFileUrl(options.accessToken, task.projectId, task.language, task.format);

            printInfo(
                `Downloading ${colorize(task.language, 'yellow')} ` + `for ${colorize(task.projectName, 'cyan')}...`,
            );

            await downloadFile(url, task.destination);
            printSuccess(`✓ Successfully downloaded ${task.projectName}:${task.language} ` + `to ${task.destination}`);
            successCount++;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            printError(`Failed to export ${task.projectName}:${task.language}: ${message}`);
            failCount++;
        }
    }

    printInfo('──────── Export Summary ────────');
    print(`Total: ${exportTasks.length}`);
    print(`${colorize(`Success: ${successCount}`, 'green')}`);

    if (failCount > 0) {
        print(`${colorize(`Failed: ${failCount}`, 'red')}`);
    }
}
