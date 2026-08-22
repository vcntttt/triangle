const CONVEX_ID_RE = /^[a-z0-9]{16,64}$/i;

export const asConvexId = (value: string | undefined): string | undefined =>
   value && CONVEX_ID_RE.test(value) ? value : undefined;
