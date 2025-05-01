/**
 * Language-related types for POEditor API
 */

/**
 * Basic language information
 */
export interface POEditorLanguage {
    name: string;
    code: string;
}

/**
 * Extended language information with statistics
 */
export interface POEditorLanguageExtended extends POEditorLanguage {
    translations: number;
    percentage: number;
    updated: string;
}

/**
 * Result of the languages/available API call
 */
export interface LanguagesAvailableResult {
    languages: POEditorLanguage[];
}

/**
 * Result of the languages/list API call
 */
export interface LanguagesListResult {
    languages: POEditorLanguageExtended[];
}
