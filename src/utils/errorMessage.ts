// src/utils/errorMessage.ts
import type { AxiosError } from 'axios';

interface ApiErrorData {
  detail?: string;
  non_field_errors?: string[];
  [key: string]: unknown;
}

/**
 * Extracts a user-friendly error message from an API error.
 * Handles DRF's common error formats.
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred.'): string {
  const axiosError = error as AxiosError<ApiErrorData>;

  if (axiosError?.response?.data) {
    const data = axiosError.response.data;

    if (typeof data === 'string') {
      return data;
    }

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (typeof data.detail === 'string') {
        return data.detail;
      }

      if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
        return data.non_field_errors[0];
      }

      // Pick the first field error
      for (const key of Object.keys(data)) {
        const val = data[key];
        if (typeof val === 'string') return val;
        if (Array.isArray(val) && typeof val[0] === 'string') return `${key}: ${val[0]}`;
      }
    }
  }

  if (axiosError?.message) {
    return axiosError.message;
  }

  return fallback;
}
