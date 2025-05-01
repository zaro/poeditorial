import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import type { PoEditorResponse, RequestOptions } from '../types/api';
import { printWarning } from '../utils/print';

const API_CONFIG = {
    BASE_URL: 'https://api.poeditor.com/v2',
    DEFAULT_TIMEOUT: 30000,
    RETRY_COUNT: 3,
    RETRY_DELAY: 1000,
};

// Custom error classes for better error handling
export class PoEditorApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public code?: string,
        public response?: unknown,
    ) {
        super(message);
        this.name = 'PoEditorApiError';
    }
}

export class PoEditorNetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PoEditorNetworkError';
    }
}

/**
 * Sends a request to the POEditor API
 *
 * @param url - API endpoint path
 * @param accessToken - POEditor API access token
 * @param data - Request payload
 * @param options - Additional request options
 * @returns API response
 * @throws {PoEditorApiError} - When API returns an error
 * @throws {PoEditorNetworkError} - When a network error occurs
 */
export async function poEditorApiRequest<T = unknown>(
    url: string,
    accessToken: string,
    data: Record<string, unknown> = {},
    options: RequestOptions = {},
): Promise<PoEditorResponse<T>> {
    if (!accessToken) {
        throw new Error('Access Token is missing');
    }

    const timeout = options.timeout ?? API_CONFIG.DEFAULT_TIMEOUT;
    const maxRetries = options.retries ?? API_CONFIG.RETRY_COUNT;
    const retryDelay = options.retryDelay ?? API_CONFIG.RETRY_DELAY;

    let retryCount = 0;
    const shouldRetry = true;

    while (shouldRetry) {
        try {
            const formData = await createFormData(data);
            formData.append('api_token', accessToken);

            const abortController = new AbortController();
            const timeoutId = setTimeout(() => {
                abortController.abort();
            }, timeout);

            const response = await fetch(`${API_CONFIG.BASE_URL}${url}`, {
                method: 'POST',
                body: formData,
                signal: abortController.signal,
            });

            clearTimeout(timeoutId);

            const responseData = (await response.json()) as PoEditorResponse<T>;

            if (!response.ok || responseData.response?.status !== 'success') {
                throw new PoEditorApiError(
                    `POEditor API request failed: ${responseData.response?.message || response.statusText}`,
                    response.status,
                    responseData.response?.code,
                    responseData,
                );
            }

            return responseData;
        } catch (error: unknown) {
            if (error instanceof PoEditorApiError) {
                throw error;
            }

            if (error instanceof Error && error.name === 'AbortError') {
                throw new PoEditorNetworkError('Request timed out');
            }

            if (retryCount >= maxRetries) {
                const message = error instanceof Error ? error.message : String(error);
                throw new PoEditorNetworkError(`Network error: ${message}`);
            }

            retryCount++;
            printWarning(`Request failed, retrying (${retryCount}/${maxRetries})...`);
            await sleep(retryDelay);
        }
    }

    throw new PoEditorNetworkError('Unexpected end of request loop');
}

/**
 * Helper function to convert form data with proper stream handling
 */
async function createFormData(data: Record<string, unknown>): Promise<FormData> {
    const formData = new FormData();

    for (const [key, value] of Object.entries(data)) {
        if (value instanceof fs.ReadStream) {
            const buffer = await streamToBuffer(value);
            formData.append(key, new Blob([buffer]), path.basename(value.path as string));
        } else if (value !== undefined && value !== null) {
            formData.append(key, String(value));
        }
    }

    return formData;
}

/**
 * Convert a stream to buffer efficiently using events
 */
async function streamToBuffer(stream: fs.ReadStream): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];

        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}
