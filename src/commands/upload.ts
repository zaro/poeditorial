import fs from 'node:fs';
import path from 'node:path';

import { listProjects, uploadProjectFile } from '../api/helpers';
import { loadConfig } from '../config';
import type { CommandOptions, UploadOptionalParams, UploadTask } from '../types';
import { colorize, print, printError, printInfo, printSuccess, printWarning } from '../utils/print';

const WAIT_BETWEEN_UPLOADS_SECONDS = 30;
const VALID_UPDATING_MODES = new Set(['terms', 'terms_translations', 'translations']);

export async function runUploadCommand(projects: string[], options: CommandOptions): Promise<void> {
    const { config, basePath } = loadConfig(projects);
    const onlineProjects = await listProjects(options.accessToken);
    const uploadTasks: UploadTask[] = [];

    for (const [projectName, projectConfig] of Object.entries(config)) {
        const project = onlineProjects[projectName];

        if (!project) {
            printWarning(`Project "${projectName}" not found on POEditor. Skipping upload.`);
            continue;
        }

        for (const [language, langConfig] of Object.entries(projectConfig.languages)) {
            if (options.language && !options.language.includes(language)) {
                continue;
            }

            const sourcePath = path.join(basePath, langConfig.file);

            if (!fs.existsSync(sourcePath)) {
                printError(`Source file not found: ${sourcePath}. Skipping upload.`);
                continue;
            }

            if (!VALID_UPDATING_MODES.has(langConfig.updating)) {
                printWarning(
                    `Skipping ${colorize(language, 'yellow')} upload for ${colorize(sourcePath, 'dim')}. ` +
                        `Invalid update mode: "${colorize(langConfig.updating, 'red')}". ` +
                        `Must be one of: ${Array.from(VALID_UPDATING_MODES).join(', ')}.`,
                );
                continue;
            }

            if ((langConfig.updating === 'terms_translations' || langConfig.updating === 'translations') && !language) {
                printWarning(
                    `Skipping upload for ${colorize(sourcePath, 'dim')}. ` +
                        `Language is required when updating mode is "${langConfig.updating}".`,
                );
                continue;
            }

            uploadTasks.push({
                projectName,
                language,
                sourcePath,
                langConfig,
                projectId: project.id,
            });
        }
    }

    if (uploadTasks.length === 0) {
        printWarning('No upload tasks to perform based on current configuration and arguments.');

        return;
    }

    printInfo(`Starting ${colorize(uploadTasks.length.toString(), 'bright')} upload(s)...`);

    let needsDelay = false;
    let successCount = 0;
    let failCount = 0;

    for (const [index, task] of uploadTasks.entries()) {
        if (needsDelay) {
            printInfo(`Waiting ${WAIT_BETWEEN_UPLOADS_SECONDS}s before next upload...`);
            await new Promise((resolve) => setTimeout(resolve, WAIT_BETWEEN_UPLOADS_SECONDS * 1000));
        }

        printInfo(
            `[${index + 1}/${uploadTasks.length}] Uploading ${colorize(task.language, 'yellow')} ` +
                `from ${colorize(task.sourcePath, 'dim')} ` +
                `with mode "${colorize(task.langConfig.updating, 'magenta')}"`,
        );

        try {
            // Apply CLI overrides to upload params
            const optionalParams: UploadOptionalParams = {
                ...(task.langConfig.uploadOptionalParams || {}),
            };

            // Override with command line options if provided
            if (options.overwrite !== undefined) {
                optionalParams.overwrite = options.overwrite;
            }
            if (options.syncTerms !== undefined) {
                optionalParams.sync_terms = options.syncTerms;
            }
            if (options.fuzzyTrigger !== undefined) {
                optionalParams.fuzzy_trigger = options.fuzzyTrigger;
            }

            const result = await uploadProjectFile(
                options.accessToken,
                task.projectId,
                task.language,
                task.sourcePath,
                task.langConfig.updating,
                optionalParams,
            );

            printSuccess(`✓ Upload successful for ${task.projectName}:${task.language}`);

            // Show detailed stats using the actual API response structure
            printInfo('  Upload statistics:');
            print(
                `  Terms: +${result.terms.added || 0}, ` +
                    `parsed: ${result.terms.parsed || 0}, ` +
                    `-${result.terms.deleted || 0}`,
            );

            if (result.translations) {
                print(
                    `  Translations: +${result.translations.added || 0}, ` +
                        `parsed: ${result.translations.parsed || 0}, ` +
                        `-${result.translations.deleted || 0}`,
                );
            }

            needsDelay = true;
            successCount++;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            printError(`Failed to upload ${task.projectName}:${task.language} from ${task.sourcePath}: ${message}`);
            failCount++;
        }
    }

    printInfo('──────── Upload Summary ────────');
    print(`Total: ${uploadTasks.length}`);
    print(`${colorize(`Success: ${successCount}`, 'green')}`);

    if (failCount > 0) {
        print(`${colorize(`Failed: ${failCount}`, 'red')}`);
    }
}
