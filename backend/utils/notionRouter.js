// backend/utils/notionRouter.js

// Canonical Notion Database IDs
const databaseMap = {
  // 🔁 Logs & Knowledge
  assistant_log: process.env.NOTION_DB_ASSISTANT_LOG_ID,
  knowledge_base: process.env.NOTION_DB_KNOWLEDGE_BASE_ID,

  // 🧱 Systems
  inventory: process.env.NOTION_DB_INVENTORY_ID,
  build_recipes: process.env.NOTION_DB_BUILD_RECIPES_ID,
  build_tasks: process.env.NOTION_DB_BUILD_TASKS_ID,
  build_tracker: process.env.NOTION_DB_BUILD_TRACKER_ID,

  // 🛠️ Hardware & Laser
  hardware_logs: process.env.NOTION_DB_HARDWARE_LOGS_ID,
  laser_archive: process.env.NOTION_DB_LASER_ARCHIVE_ID,

  // 🛒 Market
  market_tasks: process.env.NOTION_DB_MARKET_TASKS_ID,
};

// Canonical Notion Page IDs
const pageMap = {
  build_command_center: process.env.NOTION_PAGE_BUILD_COMMAND_CENTER_ID,
  workspace_root: process.env.NOTION_PAGE_WORKSPACE_ID,

  idea_vault: process.env.NOTION_PAGE_IDEA_VAULT_ID,
  internal_secrets: process.env.NOTION_PAGE_INTERNAL_SECRETS_ID,

  dashboard: process.env.NOTION_PAGE_DASHBOARD_ID,
  dev_dashboard: process.env.NOTION_PAGE_DEV_DASHBOARD_ID,
  dev_summary: process.env.NOTION_PAGE_DEV_SUMMARY_ID,
  dev_notes: process.env.NOTION_PAGE_DEV_NOTES_ID,

  pricing_analysis: process.env.NOTION_PAGE_PRICING_ANALYSIS_ID,
  business_plan: process.env.NOTION_PAGE_BUSINESS_PLAN_ID,
  legal_formation: process.env.NOTION_PAGE_LEGAL_FORMATION_ID,

  template_pack: process.env.NOTION_PAGE_TEMPLATE_PACK_ID,
  market_projects: process.env.NOTION_PAGE_MARKET_PROJECTS_ID,
  motivational_archives: process.env.NOTION_PAGE_MOTIVATIONAL_ARCHIVES_ID,
};

// Aliases → Canonical key mapping
const aliasMap = {
  // DB aliases
  memory: "assistant_log",
  kb: "knowledge_base",

  recipes: "build_recipes",
  tasks: "build_tasks",
  tracker: "build_tracker",
  inv: "inventory",
  logs: "hardware_logs",
  laser: "laser_archive",
  market: "market_tasks",

  // Page aliases
  root: "workspace_root",
  work: "workspace_root",
  cmd: "build_command_center",
  ideas: "idea_vault",
  secrets: "internal_secrets",
  dash: "dashboard",
  devdash: "dev_dashboard",
  summary: "dev_summary",
  notes: "dev_notes",
  pricing: "pricing_analysis",
  bizplan: "business_plan",
  legal: "legal_formation",
  templates: "template_pack",
  projects: "market_projects",
  vibe: "motivational_archives",
};

/**
 * Resolves a short alias or canonical key to its full Notion database or page ID.
 * @param {string} type - Canonical name or alias.
 * @returns {string|null} The Notion database or page ID, or null if the type is unknown.
 */
function getNotionTarget(type) {
  const key = aliasMap[type] || type;

  if (databaseMap[key]) return databaseMap[key];
  if (pageMap[key]) return pageMap[key];

  const useEmoji = process.env.NOTION_ROUTER_USE_EMOJI === "true";
  const prefix = useEmoji ? "[⚠️ NotionRouter]" : "[NotionRouter][WARN]";
  console.warn(`${prefix} Unknown target '${type}'`);
  return null;
}

module.exports = {
  getNotionTarget,
  databaseMap,
  pageMap,
  aliasMap,
};
