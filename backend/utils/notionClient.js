// backend/utils/notionClient.js
const { Client } = require('@notionhq/client');

if (!process.env.NOTION_API_KEY) {
  console.warn('[notionClient] NOTION_API_KEY is not set. Notion routes will fail.');
}

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const INVENTORY_DB_ID = process.env.NOTION_INVENTORY_DB_ID;

async function queryInventoryDatabase() {
  if (!INVENTORY_DB_ID) {
    throw new Error('NOTION_INVENTORY_DB_ID is not set');
  }

  const response = await notion.databases.query({
    database_id: INVENTORY_DB_ID,
    sorts: [
      { property: 'Item', direction: 'ascending' },
    ],
  });

  return response;
}

async function updateInventoryQuantity(pageId, newQty) {
  if (!pageId) throw new Error('pageId is required');

  const response = await notion.pages.update({
    page_id: pageId,
    properties: {
      Quantity: {
        number: newQty,
      },
    },
  });

  return response;
}

module.exports = {
  notion,
  queryInventoryDatabase,
  updateInventoryQuantity,
};
