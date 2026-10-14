// Observer credentials are stored as SHA-256 hex, so a leaked table never reveals a usable token.
export async function hashObserverToken(token: string) {
   const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
   return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
