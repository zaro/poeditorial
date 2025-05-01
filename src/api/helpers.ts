import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';

import type { UploadOptionalParams } from '../types/api';
import type { ExportResult, ListProjectsResult, POEditorProject, UploadResult } from '../types/projects';
import { printInfo } from '../utils/print';
import { PoEditorApiError, poEditorApiRequest, PoEditorNetworkError } from './client';

/**
 * Lists all projects available to the user
 *
 * @param accessToken - POEditor API access token
 * @returns Map of project names to project details
 */
export async function listProjects(accessToken: string): Promise<Record<string, POEditorProject>> {
    try {
        const response = await poEditorApiRequest<ListProjectsResult>('/projects/list', accessToken);

        if (!response.result?.projects) {
            return {};
        }

        return response.result.projects.reduce((map: Record<string, POEditorProject>, project) => {
            map[project.name] = project;

            return map;
        }, {});
    } catch (error) {
        if (error instanceof PoEditorApiError) {
            throw new Error(`Failed to list projects: ${error.message}`);
        }
        if (error instanceof PoEditorNetworkError) {
            throw new Error(`Network error while listing projects: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Gets the export URL for a specific project language
 *
 * @param accessToken - POEditor API access token
 * @param projectId - Project ID
 * @param language - Language code
 * @param type - Export file format
 * @returns URL to download the exported file
 */
export async function getExportFileUrl(
    accessToken: string,
    projectId: number,
    language: string,
    type = 'key_value_json',
): Promise<string> {
    try {
        const response = await poEditorApiRequest<ExportResult>('/projects/export', accessToken, {
            id: projectId,
            language,
            type,
        });

        if (!response.result?.url) {
            throw new Error(`Export URL not found in API response for project ${projectId}, language ${language}`);
        }

        return response.result.url;
    } catch (error) {
        if (error instanceof PoEditorApiError) {
            throw new Error(`Failed to export project ${projectId}, language ${language}: ${error.message}`);
        }
        if (error instanceof PoEditorNetworkError) {
            throw new Error(
                `Network error during export for project ${projectId}, language ${language}: ${error.message}`,
            );
        }
        throw error;
    }
}

/**
 * Uploads a file to a POEditor project
 *
 * @param accessToken - POEditor API access token
 * @param projectId - Project ID
 * @param language - Language code
 * @param filePath - Path to the file to upload
 * @param updating - Update mode (terms, terms_translations, translations)
 * @param optionalParams - Additional upload parameters
 * @returns Upload result statistics
 */
export async function uploadProjectFile(
    accessToken: string,
    projectId: number,
    language: string,
    filePath: string,
    updating: string,
    optionalParams: UploadOptionalParams = {},
): Promise<UploadResult> {
    const fileStream = fs.createReadStream(filePath);

    const payload: Record<string, unknown> = {
        id: projectId,
        updating,
        language,
        file: fileStream,
    };

    // Add optional parameters with proper type conversion
    if (optionalParams.overwrite !== undefined) {
        payload.overwrite = optionalParams.overwrite ? 1 : 0;
    }
    if (optionalParams.sync_terms !== undefined) {
        payload.sync_terms = optionalParams.sync_terms ? 1 : 0;
    }
    if (optionalParams.read_from_source !== undefined) {
        payload.read_from_source = optionalParams.read_from_source ? 1 : 0;
    }
    if (optionalParams.fuzzy_trigger !== undefined) {
        payload.fuzzy_trigger = optionalParams.fuzzy_trigger ? 1 : 0;
    }

    if (optionalParams.tags) {
        payload.tags =
            typeof optionalParams.tags === 'object' ? JSON.stringify(optionalParams.tags) : optionalParams.tags;
    }

    try {
        const response = await poEditorApiRequest<UploadResult>(
            '/projects/upload',
            accessToken,
            payload,
            { timeout: 60000 }, // Longer timeout for uploads
        );

        if (!response.result) {
            throw new Error(`Upload failed for project ${projectId}, language ${language}: No result data`);
        }

        return response.result;
    } catch (error) {
        if (error instanceof PoEditorApiError) {
            throw new Error(`Failed to upload project ${projectId}, language ${language}: ${error.message}`);
        }
        if (error instanceof PoEditorNetworkError) {
            throw new Error(
                `Network error during upload for project ${projectId}, language ${language}: ${error.message}`,
            );
        }
        throw error;
    }
}

/**
 * Downloads a file from a URL and optionally saves it to a file
 *
 * @param url - URL to download from
 * @param destination - File path to save to (optional)
 * @returns File content as string if no destination provided
 */
export async function downloadFile(url: string, destination?: string): Promise<string | void> {
    try {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30000);

        const response = await fetch(url, { signal: abortController.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const fileBuffer = Buffer.from(await response.arrayBuffer());

        if (destination) {
            const dir = path.dirname(destination);
            await fs.promises.mkdir(dir, { recursive: true });
            await fs.promises.writeFile(destination, fileBuffer);
            printInfo(`Successfully downloaded and saved to ${destination}`);

            return;
        }

        return fileBuffer.toString('utf-8');
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Download timed out for ${url}`);
        }

        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to download from ${url}: ${message}`);
    }
}
