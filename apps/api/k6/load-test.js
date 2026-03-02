// =============================================================
// TaskFlow — k6 Load Test
// Goal: expose N+1 query impact on GET /tasks (offset pagination)
//
// Install k6: winget install k6
// Run:        k6 run load-test.js
// =============================================================

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// -------------------------------------------------------------
// Custom metrics
// -------------------------------------------------------------
const taskListDuration = new Trend("task_list_duration", true);
const errorRate        = new Rate("error_rate");
const totalRequests    = new Counter("total_requests");

// -------------------------------------------------------------
// Test configuration
// -------------------------------------------------------------
export const options = {
  stages: [
    { duration: "15s", target: 5  },  // warm up
    { duration: "30s", target: 20 },  // ramp to 20 concurrent users
    { duration: "60s", target: 20 },  // hold — this is where N+1 hurts
    { duration: "15s", target: 50 },  // spike
    { duration: "15s", target: 0  },  // ramp down
  ],
  thresholds: {
    // These will likely FAIL before the fix — that's the point
    http_req_duration:  ["p(95)<500"],
    task_list_duration: ["p(95)<300"],
    error_rate:         ["rate<0.01"],
  },
};

// -------------------------------------------------------------
// Config
// -------------------------------------------------------------
const BASE_URL       = process.env.BASE_URL || "http://localhost:8080";
const KEYCLOAK_URL   = process.env.KEYCLOAK_AUTH_SERVER_URL || "http://localhost:8081";
const REALM          = process.env.KEYCLOAK_REALM || "taskflow-dev";
const CLIENT_ID      = process.env.KEYCLOAK_CLIENT_ID || "taskflow-api";
const CLIENT_SECRET  = process.env.KEYCLOAK_CLIENT_SECRET || "*";
const SEED_PASSWORD  = "Test@1234";

// ⚠️ Replace with real IDs from:
// SELECT id FROM "Project" LIMIT 5;
const PROJECT_IDS = [
  "ee47aadf-5dfb-41f4-af69-3bbb5c828105",
  "91fdd89b-14f5-4e71-abd6-0416178a5589",
  "069a83a7-e055-422a-aed2-652d17325b24",
  "a09f8937-f841-49c4-b735-fe5700bb0e57",
  "17252e72-92c0-45af-aef1-c4f44a5b5e18"
];

// 50 seed users to rotate between — simulates real concurrent users
const USERS = Array.from({ length: 50 }, (_, i) => ({
  username: `user${i + 1}@taskflow.dev`,
  password: SEED_PASSWORD,
}));

const STATUSES  = ["todo", "inProgress", "done", ""];
const SORT_DIRS = ["asc", "desc"];
const SORT_BYS  = ["createdAt", "updatedAt", "title"];

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Get a Keycloak token for a given user
// k6 runs this per VU — each virtual user logs in as a different seed user
function getToken(user) {
  const res = http.post(
    `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
    {
      grant_type:    "password",
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      username:      user.username,
      password:      user.password,
    },
    { tags: { name: "POST /token" } },
  );

  const body = JSON.parse(res.body);
  return body.access_token;
}

// -------------------------------------------------------------
// Setup — runs once before the test
// Each VU gets a different user to simulate real concurrent load
// -------------------------------------------------------------
export function setup() {
  // Pre-fetch one token to verify auth works before hammering the API
  const testToken = getToken(USERS[0]);
  if (!testToken) {
    throw new Error("❌ Could not get Keycloak token — check credentials and Keycloak config");
  }
  console.log("✅ Auth verified — starting load test");
  return {};
}

// -------------------------------------------------------------
// Main virtual user scenario
// -------------------------------------------------------------
export default function () {
  // Each VU picks a user based on its ID to spread load across all 50 users
  const user  = USERS[__VU % USERS.length];
  const token = getToken(user);

  if (!token) {
    errorRate.add(1);
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const projectId = randomItem(PROJECT_IDS);

  // Simulate realistic frontend pagination behaviour
  const scenarios = [
    // Page 1 — most common
    { limit: 20, offset: 0,  projectId, sortBy: "createdAt", sortDir: "desc" },
    // Page 2
    { limit: 20, offset: 20, projectId, sortBy: "createdAt", sortDir: "desc" },
    // Filtered by status
    { limit: 20, offset: 0,  projectId, status: randomItem(STATUSES), sortDir: "desc" },
    // Different sort
    { limit: 20, offset: 0,  projectId, sortBy: randomItem(SORT_BYS), sortDir: randomItem(SORT_DIRS) },
    // Large page — worst case for N+1
    { limit: 50, offset: 0,  projectId, sortBy: "createdAt", sortDir: "desc" },
  ];

  const params = randomItem(scenarios);
  const qs     = Object.entries(params)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  const res = http.get(`${BASE_URL}/api/tasks?${qs}`, {
    headers,
    tags: { name: "GET /tasks" },
  });

  taskListDuration.add(res.timings.duration);
  totalRequests.add(1);

  const ok = check(res, {
    "status is 200":        (r) => r.status === 200,
    "has data array":       (r) => {
      try { return Array.isArray(JSON.parse(r.body).data); }
      catch { return false; }
    },
    "response under 500ms": (r) => r.timings.duration < 500,
  });

  errorRate.add(!ok);

  // Simulate think time between page loads
  sleep(Math.random() * 2 + 0.5);
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
export function handleSummary(data) {
  const p50  = data.metrics.task_list_duration?.values?.["p(50)"]?.toFixed(0) ?? "n/a";
  const p95  = data.metrics.task_list_duration?.values?.["p(95)"]?.toFixed(0) ?? "n/a";
  const p99  = data.metrics.task_list_duration?.values?.["p(99)"]?.toFixed(0) ?? "n/a";
  const errs = data.metrics.error_rate?.values?.rate?.toFixed(4)              ?? "n/a";
  const reqs = data.metrics.total_requests?.values?.count                      ?? "n/a";

  console.log(`
╔══════════════════════════════════════════════╗
║         TaskFlow — Load Test Results         ║
╠══════════════════════════════════════════════╣
║  Total requests :  ${String(reqs).padEnd(25)}║
║  Error rate     :  ${String(errs).padEnd(25)}║
╠══════════════════════════════════════════════╣
║  GET /tasks latency (ms)                     ║
║    p50  :  ${String(p50 + " ms").padEnd(33)}║
║    p95  :  ${String(p95 + " ms").padEnd(33)}║
║    p99  :  ${String(p99 + " ms").padEnd(33)}║
╚══════════════════════════════════════════════╝

  Run BEFORE the fix, then AFTER — compare p95.
  `);

  return { "stdout": JSON.stringify(data, null, 2) };
}