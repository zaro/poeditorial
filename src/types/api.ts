/**
 * Base API types for POEditor
 */

/**
 * Base POEditor API response structure
 */
export interface PoEditorResponse<T = unknown> {
    response: {
        status: 'success' | 'fail';
        code?: string;
        message?: string;
    };
    result?: T;
}

/**
 * Options for API requests
 */
export interface RequestOptions {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
}

/**
 * Optional parameters for POEditor upload API
 */
export interface UploadOptionalParams {
    overwrite?: boolean;
    sync_terms?: boolean;
    tags?:
        | string
        | {
              all?: string;
              new?: string;
              obsolete?: string;
              overwritten_translations?: string;
          };
    read_from_source?: boolean;
    fuzzy_trigger?: boolean;
}
