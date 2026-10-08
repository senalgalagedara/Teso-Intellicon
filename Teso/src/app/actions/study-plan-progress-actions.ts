// Re-export from study-plan-actions to keep a single server-actions module and avoid Turbopack multi-module SSR chunk collision
export {
  type DayProgressRecord,
  updateDayProgress,
  getPlanProgress,
  getPlanProgressSummary,
} from "./study-plan-actions";
