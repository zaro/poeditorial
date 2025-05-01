/**
 * Translation-related types for POEditor API
 */

/**
 * Translation statistics as returned by the API
 * Matches the structure from the official swagger documentation
 */
export interface TranslationStatistics {
    parsed: number;
    added: number;
    deleted: number;
}

/**
 * Translation statistics for update operations
 */
export interface TranslationUpdateStatistics {
    parsed: number;
    updated: number;
}

/**
 * Result of the automatic translation API call
 */
export interface TranslationAutomaticResult {
    successful: Array<{
        source: string;
        target: string;
        chars: number;
    }>;
    failed: Array<{
        source: string;
        target: string | null;
        message: string;
    }>;
}
