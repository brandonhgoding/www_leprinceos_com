// src/api/payments.ts
import apiClient from './client';
import type {
  PaymentIntentResponse,
  PaymentRecord,
  POSSaleCreate,
  POSSaleResponse,
  StripeAccountStatus,
} from './types';

export const paymentsApi = {
  // Stripe Connect
  getConnectStatus: async (): Promise<StripeAccountStatus> => {
    const response = await apiClient.get<StripeAccountStatus>('/v1/payments/connect/status/');
    return response.data;
  },

  startOnboarding: async (
    returnUrl: string,
    refreshUrl: string,
  ): Promise<{ onboarding_url: string }> => {
    const response = await apiClient.post<{ onboarding_url: string }>(
      '/v1/payments/connect/onboard/',
      { return_url: returnUrl, refresh_url: refreshUrl },
    );
    return response.data;
  },

  // Payment Intents
  createPaymentIntent: async (
    amount: string,
    paymentMethodType: string,
    metadata?: Record<string, string>,
  ): Promise<PaymentIntentResponse> => {
    const response = await apiClient.post<PaymentIntentResponse>('/v1/payments/create-intent/', {
      amount,
      payment_method_type: paymentMethodType,
      metadata,
    });
    return response.data;
  },

  // Refunds
  refundPayment: async (
    paymentId: number,
    amount: string,
    reason: string,
  ): Promise<PaymentRecord> => {
    const response = await apiClient.post<PaymentRecord>(`/v1/payments/${paymentId}/refund/`, {
      amount,
      reason,
    });
    return response.data;
  },

  // Stripe Terminal
  getTerminalConnectionToken: async (): Promise<{ secret: string }> => {
    const response = await apiClient.post<{ secret: string }>(
      '/v1/payments/terminal/connection-token/',
    );
    return response.data;
  },

  // POS Sales
  createPOSSale: async (data: POSSaleCreate): Promise<POSSaleResponse> => {
    const response = await apiClient.post<POSSaleResponse>('/v1/pos/sales/', data);
    return response.data;
  },
};

export default paymentsApi;
