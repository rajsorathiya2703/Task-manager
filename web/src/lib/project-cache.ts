/**
 * project-cache.ts — In-memory session cache for projects list.
 * Ensures that once projects are loaded, clicking/opening dropdowns
 * will read from cache with zero API calls until the user refreshes the page.
 */
import { fetchProjects } from "./api";

let sessionProjects: any[] | null = null;
let inFlightPromise: Promise<any[]> | null = null;

export async function getSessionProjects(fresh: boolean = false): Promise<any[]> {
  if (!fresh && sessionProjects !== null) {
    return sessionProjects;
  }

  if (inFlightPromise !== null) {
    return inFlightPromise;
  }

  inFlightPromise = fetchProjects({ fresh })
    .then((data) => {
      const list = Array.isArray(data) ? data : (data as any)?.projects || [];
      sessionProjects = list;
      return list;
    })
    .catch((err) => {
      console.error("Failed to load projects into session cache", err);
      return sessionProjects || [];
    })
    .finally(() => {
      inFlightPromise = null;
    });

  return inFlightPromise;
}

export function getCachedProjectsSync(): any[] | null {
  return sessionProjects;
}

export function setSessionProjects(projects: any[]): void {
  sessionProjects = projects;
}
