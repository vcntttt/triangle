export const issueEnvironments = ['development', 'production'] as const;

export type IssueEnvironment = (typeof issueEnvironments)[number];

export const defaultIssueEnvironment: IssueEnvironment = 'development';

export const issueEnvironmentLabels: Record<IssueEnvironment, string> = {
   development: 'Desarrollo',
   production: 'Producción',
};
