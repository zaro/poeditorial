import path from 'node:path';

import { cosmiconfigSync } from 'cosmiconfig';

import type {
    LanguageConfig,
    LoadConfigResult,
    NormalizedConfig,
    RawLanguageSpecificConfig,
    RawMainConfig,
    RawProjectConfig, // Add RawProjectConfig import
} from '../types';
import { PACKAGE_NAME } from '../utils/package';

/**
 * Configuration errors specific to poeditorial
 */
export class ConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigError';
    }
}

/**
 * Loads and processes the configuration file
 *
 * @param requestedProjects - Specific projects to load (optional)
 * @returns Processed configuration and base path
 * @throws {ConfigError} When configuration is invalid or not found
 */
export function loadConfig(requestedProjects?: string[]): LoadConfigResult {
    try {
        const explorerSync = cosmiconfigSync(PACKAGE_NAME);
        const foundConfig = explorerSync.search();

        if (!foundConfig) {
            throw new ConfigError(
                'Configuration file not found.\n' +
                    `Create a .${PACKAGE_NAME}rc, ${PACKAGE_NAME}.config.js, or add a "${PACKAGE_NAME}" key to package.json.`,
            );
        }

        const { config = {} as RawMainConfig, filepath } = foundConfig;

        if (Object.keys(config).length === 0) {
            throw new ConfigError('Configuration file is empty or invalid.');
        }

        const basePath = path.dirname(filepath);
        const normalizedConfig: NormalizedConfig = {};
        const activeProjects = requestedProjects?.length ? requestedProjects : Object.keys(config);

        if (activeProjects.length === 0) {
            throw new ConfigError('No projects specified in configuration.');
        }

        for (const projectName of activeProjects) {
            const projectConfig = config[projectName];

            if (!projectConfig) {
                console.warn(`Project "${projectName}" requested but not found in configuration. Skipping.`);
                continue;
            }

            validateProjectConfig(projectName, projectConfig);
            normalizedConfig[projectName] = processProjectConfig(projectName, projectConfig);
        }

        if (Object.keys(normalizedConfig).length === 0) {
            const message = requestedProjects?.length
                ? 'None of the specified projects were found in the configuration.'
                : 'No projects found or configured.';
            throw new ConfigError(message);
        }

        return {
            config: normalizedConfig,
            basePath,
        };
    } catch (error) {
        if (error instanceof ConfigError) {
            throw error;
        }
        throw new ConfigError(
            `Error processing configuration: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

/**
 * Validates a project configuration for required properties
 */
function validateProjectConfig(projectName: string, projectConfig: RawMainConfig): void {
    if (!projectConfig.languages || typeof projectConfig.languages !== 'object') {
        throw new ConfigError(`"languages" must be a valid object for project "${projectName}".`);
    }
}

/**
 * Process a project configuration into a normalized format
 */
function processProjectConfig(
    projectName: string,
    projectConfig: RawProjectConfig, // Change type from any to RawProjectConfig
): { languages: Record<string, LanguageConfig> } {
    const defaults: Partial<LanguageConfig> = { ...projectConfig.defaults };
    const defaultUploadParams =
        projectConfig.defaults?.params?.uploadOptionalParams ?? projectConfig.defaults?.uploadOptionalParams;

    if (defaultUploadParams) {
        defaults.uploadOptionalParams = defaultUploadParams;
    }

    delete defaults.params;

    const languagesConfig: Record<string, LanguageConfig> = {};

    for (const [language, langConfigValue] of Object.entries(projectConfig.languages)) {
        let finalLangConfig: Partial<LanguageConfig> = { ...defaults };

        if (typeof langConfigValue === 'string') {
            finalLangConfig.file = langConfigValue;
        } else if (typeof langConfigValue === 'object' && langConfigValue !== null) {
            const specificConfig = langConfigValue as RawLanguageSpecificConfig;
            finalLangConfig = { ...finalLangConfig, ...specificConfig };

            if (specificConfig.uploadOptionalParams) {
                finalLangConfig.uploadOptionalParams = specificConfig.uploadOptionalParams;
            }
        } else {
            throw new ConfigError(`Invalid configuration for language "${language}" in project "${projectName}".`);
        }

        validateLanguageConfig(projectName, language, finalLangConfig);
        languagesConfig[language] = finalLangConfig as LanguageConfig;
    }

    return {
        languages: languagesConfig,
    };
}

/**
 * Validates a language configuration for required fields
 */
function validateLanguageConfig(projectName: string, language: string, config: Partial<LanguageConfig>): void {
    const requiredFields: Array<keyof LanguageConfig> = ['format', 'updating', 'file'];

    for (const field of requiredFields) {
        if (!config[field]) {
            throw new ConfigError(`"${field}" is required for project "${projectName}", language "${language}".`);
        }
    }

    // Validate updating field has valid value
    const validUpdatingValues = ['terms', 'terms_translations', 'translations'];

    if (!validUpdatingValues.includes(config.updating as string)) {
        throw new ConfigError(
            `Invalid "updating" value "${config.updating}" for project "${projectName}", language "${language}". ` +
                `Must be one of: ${validUpdatingValues.join(', ')}.`,
        );
    }
}
