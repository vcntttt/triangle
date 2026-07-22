const resolvedIssueStatusIds = new Set(['completed', 'archived', 'canceled', 'cancelled']);

export const isResolvedIssueStatus = (statusId: string) => resolvedIssueStatusIds.has(statusId);
