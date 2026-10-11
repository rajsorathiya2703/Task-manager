export const COMPLETED_STATUSES = ['Done', 'Completed'] as const;
export type CompletedStatus = (typeof COMPLETED_STATUSES)[number];
