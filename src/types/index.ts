/**
 * Type definitions for POEditorial configuration and operations
 */
import type { UploadOptionalParams } from './api';

export * from './api';
export * from './languages';
export * from './projects';
export * from './terms';
export * from './translations';

/**
 * Valid updating modes for POEditor uploads
 */
export type UpdatingMode = 'terms' | 'terms_translations' | 'translations';

/**
 * Extended language configuration for project use
 */
export interface LanguageConfig {
    file: string;
    format: string;
    updating: UpdatingMode;
    uploadOptionalParams?: UploadOptionalParams;
    [key: string]: unknown;
}

/**
 * Result from loading and processing configuration
 */
export interface LoadConfigResult {
    config: NormalizedConfig;
    basePath: string;
}

/**
 * Raw project configuration from the config file
 */
export interface RawProjectConfig {
    languages: Record<string, string | RawLanguageSpecificConfig>;
    defaults?: RawDefaultsConfig;
}

/**
 * Raw defaults section in configuration
 */
export interface RawDefaultsConfig extends Omit<Partial<LanguageConfig>, 'uploadOptionalParams'> {
    params?: {
        uploadOptionalParams?: UploadOptionalParams;
    };
    uploadOptionalParams?: UploadOptionalParams;
}

/**
 * Raw language-specific configuration overrides
 */
export interface RawLanguageSpecificConfig extends Omit<Partial<LanguageConfig>, 'uploadOptionalParams'> {
    file?: string;
    uploadOptionalParams?: UploadOptionalParams;
}

/**
 * Raw configuration object from the file
 */
export interface RawMainConfig {
    [projectName: string]: RawProjectConfig;
}

/**
 * Normalized project configuration after processing
 */
export interface NormalizedProjectConfig {
    languages: Record<string, LanguageConfig>;
}

/**
 * Normalized complete configuration
 */
export interface NormalizedConfig {
    [projectName: string]: NormalizedProjectConfig;
}

/**
 * Upload task details for a specific language
 */
export interface UploadTask {
    projectName: string;
    language: string;
    sourcePath: string;
    langConfig: LanguageConfig;
    projectId: number;
}

/**
 * Command line options from Commander
 */
export interface CommandOptions {
    accessToken: string;
    language?: string[];
    all?: boolean;
    format?: string;
    overwrite?: boolean;
    syncTerms?: boolean;
    fuzzyTrigger?: boolean;
    [key: string]: unknown;
}
