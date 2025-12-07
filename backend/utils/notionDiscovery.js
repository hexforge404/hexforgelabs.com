// backend/utils/notionDiscovery.js
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });

function getTitleFromObject(obj) {
  try {
    if (obj.object === "database") {
      const titleProp = obj.title?.[0]?.plain_text || obj.title?.[0]?.text?.content;
      return titleProp || "(untitled database)";
    }
    if (obj.object === "page") {
      // Try "Name" first, then fall back to first title-like property
      const props = obj.properties || {};
      if (props.Name && props.Name.title && props.Name.title.length) {
        return props.Name.title[0].plain_text || props.Name.title[0].text?.content;
      }

      // Fallback: first title property we can find
      for (const key of Object.keys(props)) {
        const p = props[key];
        if (p.type === "title" && p.title?.length) {
          return p.title[0].plain_text || p.title[0].text?.content;
        }
      }

      return "(untitled page)";
    }
  } catch (e) {
    // ignore, we’ll just return generic label below
  }

  return obj.object === "database" ? "(database)" : "(page)";
}

/**
 * List all Notion objects of a given type visible to this integration.
 * type: "database" | "page" | "both"
 * query: optional search string (title)
 */
async function listAllNotionObjects({ type = "database", query = "" } = {}) {
  const items = [];
  let hasMore = true;
  let cursor = undefined;

  while (hasMore) {
    const body = {
      page_size: 100,
      start_cursor: cursor,
    };

    if (query && query.trim().length) {
      body.query = query.trim();
    }

    if (type === "database" || type === "page") {
      body.filter = {
        property: "object",
        value: type,
      };
    }

    const res = await notion.search(body);

    for (const obj of res.results) {
      // If type === "both", we accept both; otherwise filter just in case.
      if (
        type === "both" ||
        type === obj.object
      ) {
        items.push({
          id: obj.id,
          object: obj.object,              // "database" or "page"
          title: getTitleFromObject(obj),
          url: obj.url,
          created_time: obj.created_time,
          last_edited_time: obj.last_edited_time,
        });
      }
    }

    hasMore = res.has_more;
    cursor = res.next_cursor || undefined;
  }

  return items;
}

/**
 * Try to retrieve any Notion object by ID and tell you what it is.
 */
async function getNotionObject(id) {
  if (!id) {
    throw new Error("Missing Notion ID");
  }

  // Try database first
  try {
    const db = await notion.databases.retrieve({ database_id: id });
    return {
      id: db.id,
      object: "database",
      title: getTitleFromObject(db),
      url: db.url,
      raw: db,
    };
  } catch (e) {
    // Not a database, fall through
  }

  // Then page
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    return {
      id: page.id,
      object: "page",
      title: getTitleFromObject(page),
      url: page.url,
      raw: page,
    };
  } catch (e2) {
    throw new Error(`ID ${id} is not a database or page (or not visible to this integration).`);
  }
}

module.exports = {
  listAllNotionObjects,
  getNotionObject,
};
