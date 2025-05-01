/**
 * Project-related types for POEditor API
 */
import type { TermStatistics } from './terms';
import type { TranslationStatistics } from './translations';

/**
 * Project details as returned by the API
 */
export interface POEditorProject {
    id: number;
    name: string;
    public: number;
    open: number;
    created: string;
}

/**
 * Extended project details with additional information
 */
export interface POEditorProjectDetail extends POEditorProject {
    description?: string;
    reference_language?: string;
    fallback_language?: string;
    terms?: number;
}

/**
 * Result of the list projects API call
 */
export interface ListProjectsResult {
    projects: POEditorProject[];
}

/**
 * Result of the project view API call
 */
export interface ProjectViewResult {
    project: POEditorProjectDetail;
}

/**
 * Result of the export API call
 */
export interface ExportResult {
    url: string;
}

/**
 * Result of the upload API call
 */
export interface UploadResult {
    terms: TermStatistics;
    translations?: TranslationStatistics;
}
