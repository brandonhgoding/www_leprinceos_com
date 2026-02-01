// src/api/memberships.ts
import apiClient from './client';
import type {
  Member,
  MemberCreate,
  MemberLookup,
  MembershipTier,
  MembershipTierCreate,
  MembershipTierDetail,
  BenefitRule,
  BenefitRuleCreate,
  BenefitCondition,
  BenefitConditionCreate,
  Membership,
  MembershipCreate,
  BenefitAllocation,
  BenefitRedemption,
  MembershipAuditLog,
  MemberBenefits,
  PaginatedResponse,
  MemberFilters,
  MembershipFilters,
} from './types';

const buildQueryString = (filters: Record<string, any>): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  return params.toString();
};

// =============================================================================
// Members API
// =============================================================================

export const membersApi = {
  list: async (filters: MemberFilters = {}): Promise<Member[]> => {
    const query = buildQueryString(filters);
    const url = query ? `/v1/members/?${query}` : '/v1/members/';
    const response = await apiClient.get<PaginatedResponse<Member>>(url);
    return response.data.results;
  },

  get: async (id: number): Promise<Member> => {
    const response = await apiClient.get<Member>(`/v1/members/${id}/`);
    return response.data;
  },

  create: async (data: MemberCreate): Promise<Member> => {
    const response = await apiClient.post<Member>('/v1/members/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<MemberCreate>): Promise<Member> => {
    const response = await apiClient.patch<Member>(`/v1/members/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/members/${id}/`);
  },

  lookup: async (params: MemberLookup): Promise<Member | null> => {
    const query = buildQueryString(params);
    const response = await apiClient.get<Member>(`/v1/members/lookup/?${query}`);
    return response.data;
  },

  getMemberships: async (id: number): Promise<Membership[]> => {
    // This endpoint returns a plain array, not paginated
    const response = await apiClient.get<Membership[]>(
      `/v1/members/${id}/memberships/`
    );
    return response.data;
  },

  getBenefits: async (id: number): Promise<MemberBenefits> => {
    const response = await apiClient.get<MemberBenefits>(`/v1/members/${id}/benefits/`);
    return response.data;
  },
};

// =============================================================================
// Membership Tiers API
// =============================================================================

export const membershipTiersApi = {
  list: async (): Promise<MembershipTier[]> => {
    const response = await apiClient.get<PaginatedResponse<MembershipTier>>('/v1/membership-tiers/');
    return response.data.results;
  },

  get: async (id: number): Promise<MembershipTierDetail> => {
    const response = await apiClient.get<MembershipTierDetail>(`/v1/membership-tiers/${id}/`);
    return response.data;
  },

  create: async (data: MembershipTierCreate): Promise<MembershipTier> => {
    const response = await apiClient.post<MembershipTier>('/v1/membership-tiers/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<MembershipTierCreate>): Promise<MembershipTier> => {
    const response = await apiClient.patch<MembershipTier>(
      `/v1/membership-tiers/${id}/`,
      data
    );
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/membership-tiers/${id}/`);
  },

  getBenefitRules: async (id: number): Promise<BenefitRule[]> => {
    // This endpoint returns a plain array, not paginated
    const response = await apiClient.get<BenefitRule[]>(
      `/v1/membership-tiers/${id}/benefit-rules/`
    );
    return response.data;
  },
};

// =============================================================================
// Benefit Rules API
// =============================================================================

export const benefitRulesApi = {
  list: async (): Promise<BenefitRule[]> => {
    const response = await apiClient.get<PaginatedResponse<BenefitRule>>('/v1/benefit-rules/');
    return response.data.results;
  },

  get: async (id: number): Promise<BenefitRule> => {
    const response = await apiClient.get<BenefitRule>(`/v1/benefit-rules/${id}/`);
    return response.data;
  },

  create: async (data: BenefitRuleCreate): Promise<BenefitRule> => {
    const response = await apiClient.post<BenefitRule>('/v1/benefit-rules/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<BenefitRuleCreate>): Promise<BenefitRule> => {
    const response = await apiClient.patch<BenefitRule>(`/v1/benefit-rules/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/benefit-rules/${id}/`);
  },

  addCondition: async (ruleId: number, data: Omit<BenefitConditionCreate, 'rule'>): Promise<BenefitCondition> => {
    const response = await apiClient.post<BenefitCondition>(
      `/v1/benefit-rules/${ruleId}/conditions/`,
      data
    );
    return response.data;
  },
};

// =============================================================================
// Benefit Conditions API
// =============================================================================

export const benefitConditionsApi = {
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/benefit-conditions/${id}/`);
  },
};

// =============================================================================
// Memberships API
// =============================================================================

export const membershipsApi = {
  list: async (filters: MembershipFilters = {}): Promise<Membership[]> => {
    const query = buildQueryString(filters);
    const url = query ? `/v1/memberships/?${query}` : '/v1/memberships/';
    const response = await apiClient.get<PaginatedResponse<Membership>>(url);
    return response.data.results;
  },

  get: async (id: number): Promise<Membership> => {
    const response = await apiClient.get<Membership>(`/v1/memberships/${id}/`);
    return response.data;
  },

  create: async (data: MembershipCreate): Promise<Membership> => {
    const response = await apiClient.post<Membership>('/v1/memberships/', data);
    return response.data;
  },

  activate: async (id: number): Promise<Membership> => {
    const response = await apiClient.post<Membership>(`/v1/memberships/${id}/activate/`);
    return response.data;
  },

  renew: async (id: number, data?: { price_paid?: string }): Promise<Membership> => {
    const response = await apiClient.post<Membership>(`/v1/memberships/${id}/renew/`, data || {});
    return response.data;
  },

  cancel: async (id: number, data?: { notes?: string }): Promise<Membership> => {
    const response = await apiClient.post<Membership>(`/v1/memberships/${id}/cancel/`, data || {});
    return response.data;
  },

  getAllocations: async (id: number): Promise<BenefitAllocation[]> => {
    // This endpoint returns a plain array, not paginated
    const response = await apiClient.get<BenefitAllocation[]>(
      `/v1/memberships/${id}/allocations/`
    );
    return response.data;
  },

  getRedemptions: async (id: number): Promise<BenefitRedemption[]> => {
    // This endpoint returns a plain array, not paginated
    const response = await apiClient.get<BenefitRedemption[]>(
      `/v1/memberships/${id}/redemptions/`
    );
    return response.data;
  },

  getAuditLog: async (id: number): Promise<MembershipAuditLog[]> => {
    // This endpoint returns a plain array, not paginated
    const response = await apiClient.get<MembershipAuditLog[]>(
      `/v1/memberships/${id}/audit-log/`
    );
    return response.data;
  },
};

export default {
  members: membersApi,
  tiers: membershipTiersApi,
  memberships: membershipsApi,
  benefitRules: benefitRulesApi,
  benefitConditions: benefitConditionsApi,
};
