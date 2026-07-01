import cronParser from 'cron-parser';

/**
 * Validates a cron expression using cron-parser.
 */
export function validateCronExpression(schedule: string): boolean {
  try {
    (cronParser as any).parseExpression(schedule);
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculates the next execution time relative string.
 */
export function calculateNextRun(schedule: string): string {
  try {
    const interval = (cronParser as any).parseExpression(schedule);
    const next = interval.next().toDate();
    const now = new Date();
    
    const diffMs = next.getTime() - now.getTime();
    if (diffMs <= 0) return 'Just now';
    
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 1) return 'In < 1 min';
    if (diffMins < 60) return `In ${diffMins} mins`;
    
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `In ${diffHours} hours`;
    
    const diffDays = Math.round(diffHours / 24);
    return `In ${diffDays} days`;
  } catch {
    return 'Invalid Schedule';
  }
}
