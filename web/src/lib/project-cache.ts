import { fetchProjects, getCompanySlug } from "./api";
import { peekCache } from "./cache";

let sessionProjects: any[] | null = null;
let inFlightPromise: Promise<any[]> | null = null;

export async function getSessionProjects(fresh: boolean = false): Promise<any[]> {
  if (!fresh && sessionProjects !== null) {
    return sessionProjects;
  }

  // Check multi-tier cache
  if (!fresh) {
    const slug = getCompanySlug();
    const cached = peekCache<any[]>(`projects:${slug}`, "session");
    if (cached) {
      const list: any[] = Array.isArray(cached) ? cached : (cached as any)?.projects || [];
      sessionProjects = list;
      return list;
    }
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
  if (sessionProjects !== null) return sessionProjects;
  const slug = getCompanySlug();
  const cached = peekCache<any[]>(`projects:${slug}`, "session");
  if (cached) {
    sessionProjects = Array.isArray(cached) ? cached : (cached as any)?.projects || [];
    return sessionProjects;
  }
  return null;
}

export function setSessionProjects(projects: any[]): void {
  sessionProjects = projects;
}
