// src/widget/api.ts
// Standalone fetch-based API client for the embeddable widget.
// No external dependencies - uses the browser's built-in fetch API.

import type {
  ApiErrorResponse,
  OrderConfirmation,
  OrderCreatePayload,
  PublicConcessionMenu,
  PublicShowtime,
  ShowtimeAvailability,
} from './types.ts';

export class ApiError extends Error {
  readonly status: number;
  readonly data: ApiErrorResponse;

  constructor(message: string, status: number, data: ApiErrorResponse) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function buildUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data: unknown = await response.json();
  if (!response.ok) {
    const errorData = data as ApiErrorResponse;
    const message = errorData.detail ?? 'Request failed';
    throw new ApiError(message, response.status, errorData);
  }
  return data as T;
}

async function get<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(buildUrl(baseUrl, path), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return handleResponse<T>(response);
}

async function post<T>(baseUrl: string, path: string, body: unknown): Promise<T> {
  const response = await fetch(buildUrl(baseUrl, path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

/** Fetch the concession menu (categories + combos) */
export function fetchConcessionMenu(baseUrl: string): Promise<PublicConcessionMenu> {
  return get<PublicConcessionMenu>(baseUrl, '/public/concessions/');
}

/** Fetch upcoming showtimes for the cinema */
export function fetchShowtimes(baseUrl: string, days: number = 7): Promise<PublicShowtime[]> {
  return get<PublicShowtime[]>(baseUrl, `/public/showtimes/?days=${days}`);
}

/** Fetch availability and ticket types for a specific showtime */
export function fetchAvailability(
  baseUrl: string,
  showtimeId: number,
): Promise<ShowtimeAvailability> {
  return get<ShowtimeAvailability>(baseUrl, `/public/showtimes/${showtimeId}/availability/`);
}

/** Create a new order (holds tickets for 15 minutes) */
export function createOrder(
  baseUrl: string,
  payload: OrderCreatePayload,
): Promise<OrderConfirmation> {
  return post<OrderConfirmation>(baseUrl, '/public/orders/', payload);
}

/** Submit payment nonce for a pending order */
export function payOrder(
  baseUrl: string,
  orderUuid: string,
  paymentNonce: string,
  verificationToken?: string,
): Promise<OrderConfirmation> {
  return post<OrderConfirmation>(baseUrl, `/public/orders/${orderUuid}/pay/`, {
    payment_nonce: paymentNonce,
    verification_token: verificationToken ?? '',
  });
}

/** Get order details/status */
export function fetchOrder(baseUrl: string, orderUuid: string): Promise<OrderConfirmation> {
  return get<OrderConfirmation>(baseUrl, `/public/orders/${orderUuid}/`);
}
