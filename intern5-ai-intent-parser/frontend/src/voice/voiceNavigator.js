/**
 * voiceNavigator.js — Voice Navigation Router
 *
 * Day 7-8 Deliverable: Design voice routing instructions converting user spoken
 * commands (e.g. "Take me to worker list") to matching UI page paths.
 *
 * Converts a ParseResult with intent == "navigate" into a { route, action }
 * object that the App.jsx `setActiveTab` handler can consume.
 *
 * This module is pure JS (no dependencies) and works offline.
 *
 * Feature: ai-intent-parser
 * Intern 5 — AI Intent Parser | KissanShakti
 */

// ---------------------------------------------------------------------------
// Route Map — spoken keyword groups → { tab, label }
// ---------------------------------------------------------------------------

/**
 * Each entry maps a group of trigger words to a frontend tab name and a
 * human-readable label for logging.
 *
 * Tab names match the values used in App.jsx's `activeTab` state:
 *   'dashboard' | 'workers' | 'jobs' | 'sync_audit' | 'schema'
 */
const NAVIGATION_RULES = [
  {
    keywords: [
      // English
      'worker', 'workers', 'laborer', 'laborers', 'register',
      'worker list', 'workers list', 'worker registry', 'majdoor list',
      // Hindi romanised
      'majdoor', 'mazdoor', 'majoor', 'darj karo', 'worker add',
      // Hindi Devanagari
      'मजदूर', 'मजूर', 'दर्ज',
      // Marathi
      'नोंद',
    ],
    tab: 'workers',
    label: 'Workers Registry',
    action: 'scroll_top',
  },
  {
    keywords: [
      // English
      'job', 'jobs', 'post', 'task', 'hire', 'job board', 'post job',
      'task board', 'job posting', 'kaam dena',
      // Hindi romanised
      'kaam post', 'kaam taka', 'kaam hai', 'naukri',
      // Hindi Devanagari
      'काम', 'नौकरी',
      // Marathi
      'kaam hava',
    ],
    tab: 'jobs',
    label: 'Jobs Board',
    action: 'open_form',
  },
  {
    keywords: [
      // English
      'dashboard', 'home', 'main', 'start', 'crops', 'crop board',
      // Hindi romanised
      'ghar', 'shuru', 'fasal',
      // Hindi Devanagari
      'घर', 'फसल',
    ],
    tab: 'dashboard',
    label: 'Dashboard',
    action: 'scroll_top',
  },
  {
    keywords: [
      // English
      'sync', 'audit', 'logs', 'queue', 'sync audit', 'sync log', 'offline log',
      // Hindi romanised
      'sync log', 'audit log',
    ],
    tab: 'sync_audit',
    label: 'Sync Audit Logs',
    action: 'scroll_top',
  },
  {
    keywords: [
      // English
      'schema', 'database', 'db', 'spec', 'api spec', 'technical', 'specification',
      'database schema', 'api schema',
      // Hindi romanised
      'database',
    ],
    tab: 'schema',
    label: 'Schema Specifications',
    action: 'scroll_top',
  },
];

// ---------------------------------------------------------------------------
// Filler tokens to strip (mirrors intentParser.js)
// ---------------------------------------------------------------------------
const FILLER_TOKENS = new Set(['umm', 'arre', 'bhai', 'yaar', 'acha', 'hmm', 'uh', 'haan']);

// Navigation indicator phrases — presence of these increases confidence that
// the user genuinely wants to navigate (rather than, say, post a job).
const NAVIGATION_INDICATORS = [
  'take me to', 'show me', 'open', 'go to', 'le chalo', 'dikhao', 'kholo',
  'दिखाओ', 'खोलो', 'दिखाओ मुझे',
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalise and tokenise a transcript string.
 * @param {string} text
 * @returns {string} lowercased, trimmed
 */
function normalise(text) {
  if (!text) return '';
  return String(text).toLowerCase().trim();
}

/**
 * @param {string} norm - normalised text
 * @returns {string[]} tokens with fillers removed
 */
function tokenise(norm) {
  return norm.split(/\s+/).filter((t) => t.length > 0 && !FILLER_TOKENS.has(t));
}

/**
 * Score how well a transcript matches a navigation rule's keyword list.
 * Multi-word keywords (e.g. "workers list") are checked as substrings first.
 *
 * @param {string} norm - normalised transcript
 * @param {string[]} tokens
 * @param {string[]} keywords
 * @returns {number} score ≥ 0
 */
function scoreRule(norm, tokens, keywords) {
  let score = 0;
  for (const kw of keywords) {
    if (kw.includes(' ')) {
      // multi-word phrase
      if (norm.includes(kw)) score += 1.5;
    } else {
      if (tokens.includes(kw)) score += 1.0;
    }
  }
  return score;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} NavigationResult
 * @property {string} tab        - App.jsx activeTab value ('workers' | 'jobs' | 'dashboard' | 'sync_audit' | 'schema')
 * @property {string} label      - Human-readable label for logging
 * @property {string} action     - UI action ('scroll_top' | 'open_form')
 * @property {number} confidence - Confidence score [0.0, 1.0]
 * @property {boolean} matched   - true if a route was found; false if fallback to dashboard
 */

/**
 * Resolves a transcript or ParseResult to a navigation target.
 *
 * Can be called with:
 *   1. A raw transcript string
 *   2. A ParseResult object (uses parseResult.entities.desc as transcript)
 *
 * @param {string | Object} input - transcript string or ParseResult
 * @returns {NavigationResult}
 */
export function resolveNavigation(input) {
  const transcript =
    typeof input === 'string'
      ? input
      : (input?.entities?.desc ?? input?.raw_transcript ?? '');

  const norm = normalise(transcript);
  const tokens = tokenise(norm);

  // Boost score if navigation indicator phrases are present
  const hasNavigationIndicator = NAVIGATION_INDICATORS.some((ind) => norm.includes(ind));
  const indicatorBoost = hasNavigationIndicator ? 0.5 : 0.0;

  // Score every rule
  let bestScore = 0;
  let bestRule = null;

  for (const rule of NAVIGATION_RULES) {
    const score = scoreRule(norm, tokens, rule.keywords) + indicatorBoost;
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  if (!bestRule || bestScore === 0) {
    return {
      tab: 'dashboard',
      label: 'Dashboard',
      action: 'scroll_top',
      confidence: 0.0,
      matched: false,
    };
  }

  const confidence = Math.min(1.0, bestScore / 3.0);

  return {
    tab: bestRule.tab,
    label: bestRule.label,
    action: bestRule.action,
    confidence,
    matched: true,
  };
}

/**
 * Given a ParseResult (from intentParser.js or the backend API), determines
 * whether it should trigger navigation and — if so — which route.
 *
 * Rules:
 *   1. If intent === 'navigate' → resolve route from transcript/desc
 *   2. If intent === 'register_worker' → go to /workers (open_form)
 *   3. If intent === 'post_job' → go to /jobs (open_form)
 *   4. If intent === 'find_worker' → go to /workers (scroll_top)
 *   5. Otherwise → no navigation
 *
 * @param {Object} parseResult - output of parseIntent() or POST /intent/parse
 * @returns {{ shouldNavigate: boolean, tab: string, action: string, label: string } | null}
 */
export function getNavigationFromParseResult(parseResult) {
  if (!parseResult) return null;

  const intent = parseResult.intent;

  switch (intent) {
    case 'navigate': {
      // Try backend-provided navigation first
      if (parseResult.navigation?.route) {
        // Map backend route paths to App.jsx tab names
        const routeToTab = {
          '/workers': 'workers',
          '/jobs': 'jobs',
          '/dashboard': 'dashboard',
          '/sync-audit': 'sync_audit',
          '/schema': 'schema',
          '/': 'dashboard',
          '': 'dashboard',
        };
        const tab = routeToTab[parseResult.navigation.route] ?? 'dashboard';
        return {
          shouldNavigate: true,
          tab,
          action: parseResult.navigation.action || 'scroll_top',
          label: `Navigate to ${tab}`,
        };
      }
      // Fallback: resolve from transcript
      const resolved = resolveNavigation(parseResult);
      if (resolved.matched) {
        return {
          shouldNavigate: true,
          tab: resolved.tab,
          action: resolved.action,
          label: resolved.label,
        };
      }
      return null;
    }

    case 'register_worker':
      return {
        shouldNavigate: true,
        tab: 'workers',
        action: 'open_form',
        label: 'Workers Registry',
      };

    case 'post_job':
      return {
        shouldNavigate: true,
        tab: 'jobs',
        action: 'open_form',
        label: 'Jobs Board',
      };

    case 'find_worker':
      return {
        shouldNavigate: true,
        tab: 'workers',
        action: 'scroll_top',
        label: 'Workers Registry (find)',
      };

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Convenience: get all valid tab names (for validation)
// ---------------------------------------------------------------------------

export const VALID_TABS = ['dashboard', 'workers', 'jobs', 'sync_audit', 'schema'];
