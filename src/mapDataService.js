// =============================================================================
// MATCHD — Map Data Service  v3
// =============================================================================
//
// Mock layer has been removed. All functions return empty data until a real
// backend adapter is uncommented below.
//
// Switching to a real backend:
//   • Fill in ONE of the adapter blocks (REST, Supabase, or Firebase) in each
//     function below.
//   • The hook + components need zero changes — they only consume this API.
// =============================================================================

// ─── 1. CONFIG ───────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

/** How often (ms) to poll when using polling adapters. */
export const LIVE_POLL_INTERVAL_MS = 30_000;

// ─── 2. TYPES ─────────────────────────────────────────────────────────────────

/**
 * @typedef {"run"|"ride"|"walk"|"football"|"basketball"|"swimming"|"padel"|"all"} SportType
 * @typedef {Object} HeatPoint
 * @property {number} lat
 * @property {number} lng
 * @property {number} weight   1–10
 * @property {SportType} type
 *
 * @typedef {Object} LiveUser
 * @property {string} id
 * @property {number} lat
 * @property {number} lng
 * @property {SportType} type
 *
 * @typedef {Object} ZoneStat
 * @property {string} name
 * @property {SportType} type
 * @property {number} count
 * @property {string} trend
 *
 * @typedef {Object} Subscription
 * @property {() => void} unsubscribe
 */

// ─── 3. PUBLIC API — one-shot fetches ────────────────────────────────────────

/**
 * Heatmap intensity points.
 * Returns [] until a real backend adapter is wired up.
 * @param {SportType} sport
 * @returns {Promise<HeatPoint[]>}
 */
export async function fetchHeatmapPoints(sport = "all") {
  // ── REST adapter ──────────────────────────────────────────────────────────
  // const url = sport === "all" ? `${API_BASE}/api/heatmap` : `${API_BASE}/api/heatmap?sport=${sport}`;
  // const res = await fetch(url);
  // if (!res.ok) throw new Error(`heatmap ${res.status}`);
  // return res.json();

  // ── Supabase adapter ──────────────────────────────────────────────────────
  // import { supabase } from "../lib/supabaseClient";
  // const q = supabase.from("activity_points").select("lat,lng,weight,type");
  // if (sport !== "all") q.eq("type", sport);
  // const { data, error } = await q;
  // if (error) throw error;
  // return data;

  return [];
}

/**
 * All live users currently on the map.
 * Returns [] until a real backend is wired up.
 * @returns {Promise<LiveUser[]>}
 */
export async function fetchLiveUsers() {
  // ── REST adapter ──────────────────────────────────────────────────────────
  // const res = await fetch(`${API_BASE}/api/live-users`);
  // if (!res.ok) throw new Error(`live-users ${res.status}`);
  // return res.json();

  // ── Supabase adapter ──────────────────────────────────────────────────────
  // const { data, error } = await supabase.from("user_presence").select("id,lat,lng,type").eq("online", true);
  // if (error) throw error;
  // return data;

  return [];
}

/**
 * Hot-zone statistics.
 * Returns [] until a real backend is wired up.
 * @param {SportType} sport
 * @returns {Promise<ZoneStat[]>}
 */
export async function fetchZoneStats(sport = "all") {
  // ── REST adapter ──────────────────────────────────────────────────────────
  // const url = sport === "all" ? `${API_BASE}/api/zone-stats` : `${API_BASE}/api/zone-stats?sport=${sport}`;
  // const res = await fetch(url);
  // if (!res.ok) throw new Error(`zone-stats ${res.status}`);
  // return res.json();

  // ── Supabase adapter ──────────────────────────────────────────────────────
  // const q = supabase.from("zone_stats_24h").select("name,type,count,trend").order("count", { ascending: false });
  // if (sport !== "all") q.eq("type", sport);
  // const { data, error } = await q;
  // if (error) throw error;
  // return data;

  return [];
}

/**
 * Total live user count.
 * Returns 0 until a real backend is wired up.
 * @returns {Promise<number>}
 */
export async function fetchLiveCount() {
  // ── REST adapter ──────────────────────────────────────────────────────────
  // const res = await fetch(`${API_BASE}/api/live-count`);
  // if (!res.ok) throw new Error(`live-count ${res.status}`);
  // const { count } = await res.json();
  // return count;

  // ── Supabase ──────────────────────────────────────────────────────────────
  // const { count, error } = await supabase.from("user_presence").select("id", { count: "exact", head: true }).eq("online", true);
  // if (error) throw error;
  // return count;

  return 0;
}

// ─── 4. PUBLIC API — real-time subscriptions ─────────────────────────────────
//
// Until a real adapter is wired up these call the callback once with
// empty data and return a no-op Subscription, so the UI shows proper
// empty states rather than fake activity.

/**
 * Subscribe to live user positions.
 * @param {(users: LiveUser[]) => void} callback
 * @param {number} [pollMs]
 * @returns {Subscription}
 */
export function subscribeToLiveUsers(callback, pollMs = LIVE_POLL_INTERVAL_MS) {
  // ── Supabase Realtime ─────────────────────────────────────────────────────
  // const channel = supabase.channel("live_users")
  //   .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" },
  //     () => fetchLiveUsers().then(callback))
  //   .subscribe();
  // fetchLiveUsers().then(callback);
  // return { unsubscribe: () => supabase.removeChannel(channel) };

  // ── Firebase RTDB ─────────────────────────────────────────────────────────
  // const r = ref(rtdb, "live_users");
  // onValue(r, snap => callback(Object.values(snap.val() ?? {})));
  // return { unsubscribe: () => off(r) };

  // ── Polling fallback ──────────────────────────────────────────────────────
  // fetchLiveUsers().then(callback);
  // const id = setInterval(() => fetchLiveUsers().then(callback), pollMs);
  // return { unsubscribe: () => clearInterval(id) };

  // No backend — emit empty once.
  callback([]);
  return { unsubscribe: () => {} };
}

/**
 * Subscribe to live user count.
 * @param {(count: number) => void} callback
 * @param {number} [pollMs]
 * @returns {Subscription}
 */
export function subscribeToLiveCount(callback, pollMs = LIVE_POLL_INTERVAL_MS) {
  // ── Supabase Realtime ─────────────────────────────────────────────────────
  // const channel = supabase.channel("live_count")
  //   .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" },
  //     () => fetchLiveCount().then(callback))
  //   .subscribe();
  // fetchLiveCount().then(callback);
  // return { unsubscribe: () => supabase.removeChannel(channel) };

  // ── Firebase RTDB ─────────────────────────────────────────────────────────
  // const r = ref(rtdb, "stats/live_count");
  // onValue(r, snap => callback(snap.val() ?? 0));
  // return { unsubscribe: () => off(r) };

  // No backend — emit 0 once.
  callback(0);
  return { unsubscribe: () => {} };
}