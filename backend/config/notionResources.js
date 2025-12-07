// backend/config/notionResources.js
module.exports = {
  // 🔁 Assistant Memory
  assistantLogDbId: process.env.NOTION_DB_ASSISTANT_LOG_ID,

  // 📘 Knowledge Base & logs
  knowledgeBaseDbId: process.env.NOTION_DB_KNOWLEDGE_BASE_ID,
  hardwareLogsDbId: process.env.NOTION_DB_HARDWARE_LOGS_ID,
  laserArchiveDbId: process.env.NOTION_DB_LASER_ARCHIVE_ID,

  // 📦 Production / builds
  inventoryDbId: process.env.NOTION_DB_INVENTORY_ID,
  buildRecipesDbId: process.env.NOTION_DB_BUILD_RECIPES_ID,
  buildTasksDbId: process.env.NOTION_DB_BUILD_TASKS_ID,
  buildTrackerDbId: process.env.NOTION_DB_BUILD_TRACKER_ID,

  // 🛒 Market / Makers’ Market
  marketTasksDbId: process.env.NOTION_DB_MARKET_TASKS_ID,

  // 📂 Key pages
  buildCommandCenterPageId: process.env.NOTION_PAGE_BUILD_COMMAND_CENTER_ID,
  workspaceRootPageId: process.env.NOTION_PAGE_WORKSPACE_ID,
  ideaVaultPageId: process.env.NOTION_PAGE_IDEA_VAULT_ID,
  internalSecretsPageId: process.env.NOTION_PAGE_INTERNAL_SECRETS_ID,
  dashboardPageId: process.env.NOTION_PAGE_DASHBOARD_ID,
  devDashboardPageId: process.env.NOTION_PAGE_DEV_DASHBOARD_ID,
  devSummaryPageId: process.env.NOTION_PAGE_DEV_SUMMARY_ID,
  devNotesPageId: process.env.NOTION_PAGE_DEV_NOTES_ID,
  pricingAnalysisPageId: process.env.NOTION_PAGE_PRICING_ANALYSIS_ID,
  businessPlanPageId: process.env.NOTION_PAGE_BUSINESS_PLAN_ID,
  legalFormationPageId: process.env.NOTION_PAGE_LEGAL_FORMATION_ID,
  templatePackPageId: process.env.NOTION_PAGE_TEMPLATE_PACK_ID,
  marketProjectsPageId: process.env.NOTION_PAGE_MARKET_PROJECTS_ID,
  motivationalArchivesPageId: process.env.NOTION_PAGE_MOTIVATIONAL_ARCHIVES_ID,
};
