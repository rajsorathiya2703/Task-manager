/**
 * Day Off Module Feature Flag
 * Can be completely toggled off by setting NEXT_PUBLIC_DAYOFF_ENABLED=false
 * When false, all day-off navigation links, routes, and config options are hidden.
 */
export const isDayOffModuleEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_DAYOFF_ENABLED !== 'false';
};
