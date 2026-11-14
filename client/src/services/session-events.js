export const SESSION_EXPIRED_EVENT = "campus:session-expired";

export function notifySessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

export function handleUnauthorized(error) {
  const status = error?.response?.status;
  const url = error?.config?.url ?? "";
  const credentialAttempt = /\/auth\/(login|register)$/.test(url);
  if (status === 401 && !credentialAttempt) notifySessionExpired();
  return Promise.reject(error);
}