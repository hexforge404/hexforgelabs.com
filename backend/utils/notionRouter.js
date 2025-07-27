// backend/utils/notionRouter.js

// Canonical Notion Database IDs
const databaseMap = {
  assistant_log: process.env.NOTION_DB_ASSISTANT_LOG_ID,
  build_recipes: process.env.NOTION_DB_BUILD_RECIPES_ID,
  build_tasks: process.env.NOTION_DB_BUILD_TASKS_ID,
  build_tracker: process.env.NOTION_DB_BUILD_TRACKER_ID,
  hardware_logs: process.env.NOTION_DB_HARDWARE_LOGS_ID,
  inventory: process.env.NOTION_DB_INVENTORY_ID,
  knowledge_base: process.env.NOTION_DB_KNOWLEDGE_BASE_ID,
  laser_archive: process.env.NOTION_DB_LASER_ARCHIVE_ID,
  market_tasks: process.env.NOTION_DB_MARKET_TASKS_ID,
};

// Canonical Notion Page IDs
const pageMap = {
  build_command_center: process.env.NOTION_PAGE_BUILD_COMMAND_CENTER_ID,
  business_plan: process.env.NOTION_PAGE_BUSINESS_PLAN_ID,
  dashboard: process.env.NOTION_PAGE_DASHBOARD_ID,
  dev_dashboard: process.env.NOTION_PAGE_DEV_DASHBOARD_ID,
  dev_notes: process.env.NOTION_PAGE_DEV_NOTES_ID,
  dev_summary: process.env.NOTION_PAGE_DEV_SUMMARY_ID,
  idea_vault: process.env.NOTION_PAGE_IDEA_VAULT_ID,
  internal_secrets: process.env.NOTION_PAGE_INTERNAL_SECRETS_ID,
  legal_formation: process.env.NOTION_PAGE_LEGAL_FORMATION_ID,
  market_projects: process.env.NOTION_PAGE_MARKET_PROJECTS_ID,
  motivational_archives: process.env.NOTION_PAGE_MOTIVATIONAL_ARCHIVES_ID,
  pricing_analysis: process.env.NOTION_PAGE_PRICING_ANALYSIS_ID,
  template_pack: process.env.NOTION_PAGE_TEMPLATE_PACK_ID,
  workspace_root: process.env.NOTION_PAGE_WORKSPACE_ID,
};

// Aliases → Canonical key mapping
const aliasMap = {
  memory: "assistant_log",
  kb: "knowledge_base",
  recipes: "build_recipes",
  tasks: "build_tasks",
  tracker: "build_tracker",
  inv: "inventory",
  logs: "hardware_logs",
  laser: "laser_archive",
  projects: "market_projects",
  secrets: "internal_secrets",
  bizplan: "business_plan",
  summary: "dev_summary",
};

/**
 * Resolves a short alias or canonical key to its full Notion database or page ID.
 * @param {string} type - Canonical name or alias.
 * @returns {string|null}
 */
function getNotionTarget(type) {
  const key = aliasMap[type] || type;

  if (databaseMap[key]) {
    return databaseMap[key];
  }

  if (pageMap[key]) {
    return pageMap[key];
  }

  console.warn(`[⚠️ NotionRouter] Unknown target '${type}'`);
  return null;
}

module.exports = {
  getNotionTarget,
  databaseMap,
  pageMap,
  aliasMap,
};
