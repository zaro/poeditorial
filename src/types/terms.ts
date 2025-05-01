/**
 * Term-related types for POEditor API
 */

/**
 * Term statistics as returned by the API
 * Matches the structure from the official swagger documentation
 */
export interface TermStatistics {
    parsed: number;
    added: number;
    deleted: number;
}

/**
 * Term statistics for sync operations
 */
export interface TermSyncStatistics extends TermStatistics {
    updated: number;
}

/**
 * Term comment statistics
 */
export interface TermCommentStatistics {
    parsed: number;
    with_added_comment: number;
}

/**
 * Term details as returned by terms/list API
 */
export interface POEditorTerm {
    term: string;
    context: string;
    plural: string;
    created: string;
    updated: string;
    translation?: {
        content:
            | string
            | {
                  one: string;
                  other: string;
                  [key: string]: string;
              };
        fuzzy: number;
        proofread: number;
        updated: string;
    };
    reference: string;
    tags: string[];
    comment: string;
}

/**
 * Result of the terms list API call
 */
export interface TermsListResult {
    terms: POEditorTerm[];
}
