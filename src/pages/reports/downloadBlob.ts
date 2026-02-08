// src/pages/reports/downloadBlob.ts
import type { AxiosResponse } from 'axios';

/**
 * Triggers a browser download from an Axios blob response.
 * Extracts filename from Content-Disposition header or uses the provided fallback.
 */
export function downloadBlob(response: AxiosResponse<Blob>, fallbackFilename: string): void {
  const disposition = response.headers['content-disposition'] as string | undefined;
  let filename = fallbackFilename;
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match) {
      filename = match[1];
    }
  }

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
