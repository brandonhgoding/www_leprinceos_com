// src/utils/engagementKinds.ts
import type { EngagementKind } from '../api/types';

// Short, title-cased labels for displaying an engagement kind (badges, detail rows).
export const KIND_LABELS: Record<EngagementKind, string> = {
  REGULAR: 'Regular',
  SPECIAL_EVENT: 'Event',
  CLASSIC: 'Classic',
  DOUBLE_FEATURE: 'Double Feature',
};
