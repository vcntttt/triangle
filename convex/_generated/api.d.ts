/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as devState_contract from "../devState/contract.js";
import type * as devState_credentials from "../devState/credentials.js";
import type * as devState_ingest from "../devState/ingest.js";
import type * as devState_tables from "../devState/tables.js";
import type * as devState_token from "../devState/token.js";
import type * as experiments from "../experiments.js";
import type * as http from "../http.js";
import type * as issueAutomations from "../issueAutomations.js";
import type * as issueStatusOptions from "../issueStatusOptions.js";
import type * as issueStatuses from "../issueStatuses.js";
import type * as issues from "../issues.js";
import type * as labels from "../labels.js";
import type * as liveReferences from "../liveReferences.js";
import type * as projects from "../projects.js";
import type * as viewer from "../viewer.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "devState/contract": typeof devState_contract;
  "devState/credentials": typeof devState_credentials;
  "devState/ingest": typeof devState_ingest;
  "devState/tables": typeof devState_tables;
  "devState/token": typeof devState_token;
  experiments: typeof experiments;
  http: typeof http;
  issueAutomations: typeof issueAutomations;
  issueStatusOptions: typeof issueStatusOptions;
  issueStatuses: typeof issueStatuses;
  issues: typeof issues;
  labels: typeof labels;
  liveReferences: typeof liveReferences;
  projects: typeof projects;
  viewer: typeof viewer;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
