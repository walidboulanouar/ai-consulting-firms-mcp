import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

import manifest from "./server.json";

const site = "https://theaiconsultingfirms.com";
const annotation = {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false};
const result = value => ({content: [{type: "text", text: JSON.stringify(value, null, 2)}]});

async function catalog() {
  const response = await fetch(site + "/firms.json", {
    redirect: "manual", signal: AbortSignal.timeout(5000),
    cf: {cacheTtl: 120, cacheEverything: true}
  });
  if (!response.ok) throw new Error("The public directory is temporarily unavailable.");
  const data = await response.json();
  if (!Array.isArray(data.firms) || !data.firms.length) throw new Error("Directory data is unavailable.");
  return data;
}

function createServer() {
  const server = new McpServer({name: "ai-consulting-firms", version: "1.0.0"}, {
    instructions: "Compare published directory entries by scope. Cite their provider sources. Display order does not indicate quality."
  });
  server.registerTool("search_firms", {
    description: "Search the published directory by firm, specialty or delivery terms. An empty query lists all firms.",
    inputSchema: {query: z.string().trim().max(160).default(""), limit: z.number().int().min(1).max(20).default(10)},
    annotations: annotation
  }, async ({query, limit}) => {
    const data = await catalog();
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = data.firms.filter(firm => words.every(word => [firm.name, firm.specialty, firm.note].join(" ").toLowerCase().includes(word)));
    return result({guide: site, publisher: data.publisher, total: matches.length, firms: matches.slice(0, limit)});
  });
  server.registerTool("compare_firms", {
    description: "Compare two to five distinct firm IDs returned by search_firms. Includes source links and procurement questions.",
    inputSchema: {ids: z.array(z.string().min(1).max(40)).min(2).max(5)},
    annotations: annotation
  }, async ({ids}) => {
    const data = await catalog();
    const firms = ids.map(id => data.firms.find(firm => firm.id === id));
    if (new Set(ids).size !== ids.length || firms.some(firm => !firm)) {
      return {isError: true, content: [{type: "text", text: "Use two to five distinct IDs from search_firms."}]};
    }
    return result({firms, questions: data.questions, pricing: data.pricing, methodology: data.methodology, publisher: data.publisher});
  });
  return server;
}

export default {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/.well-known/mcp.json" && (request.method === "GET" || request.method === "HEAD")) {
      return new Response(request.method === "HEAD" ? null : JSON.stringify(manifest), {
        headers: {"Content-Type": "application/json", "Cache-Control": "public, max-age=300"}
      });
    }
    if (path !== "/mcp") return new Response("Unknown path", {status: 404});
    const origin = request.headers.get("Origin");
    if (origin && origin !== site) return new Response("Origin is not permitted", {status: 403});
    if (request.method !== "POST") return new Response(null, {status: 405, headers: {Allow: "POST"}});
    const server = createServer();
    const transport = new WebStandardStreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true});
    await server.connect(transport);
    try {
      return await transport.handleRequest(request);
    } finally {
      await server.close();
    }
  }
};
