// src/hooks/useSmartAlerts.ts
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Alert } from '../components/AlertBanner';
import type { Engagement, Showtime } from '../api/types';

interface UseSmartAlertsOptions {
  engagements: Engagement[];
  todayShowtimes: Showtime[];
  tomorrowShowtimes?: Showtime[];
}

export function useSmartAlerts({
  engagements,
  todayShowtimes,
  tomorrowShowtimes = []
}: UseSmartAlertsOptions): Alert[] {
  const navigate = useNavigate();

  return useMemo(() => {
    const alerts: Alert[] = [];

    // Check for missing showtimes tomorrow
    if (tomorrowShowtimes.length === 0 && engagements.length > 0) {
      alerts.push({
        id: 'no-showtimes-tomorrow',
        type: 'warning',
        message: 'No showtimes scheduled for tomorrow',
        dismissible: true,
      });
    }

    // Check for engagements ending soon (within 2 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);

    engagements
      .filter(e => e.status === 'CONFIRMED')
      .forEach((engagement) => {
        const endDate = new Date(engagement.end_date);
        endDate.setHours(0, 0, 0, 0);

        if (endDate <= twoDaysFromNow && endDate >= today) {
          const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          alerts.push({
            id: `ending-soon-${engagement.id}`,
            type: 'info',
            message: `${engagement.film_title} ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
            dismissible: true,
          });
        }
      });

    // Check for draft engagements
    const draftCount = engagements.filter(e => e.status === 'DRAFT').length;
    if (draftCount > 0) {
      alerts.push({
        id: 'draft-engagements',
        type: 'info',
        message: `You have ${draftCount} draft engagement${draftCount !== 1 ? 's' : ''} waiting to be confirmed`,
        dismissible: true,
      });
    }

    return alerts;
  }, [engagements, todayShowtimes, tomorrowShowtimes, navigate]);
}
