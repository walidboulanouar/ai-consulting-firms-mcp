import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

import guide0 from "./server.json";
import guide1 from "./manifests/ai-consulting-companies.json";
import guide2 from "./manifests/ai-consulting-services.json";
import guide3 from "./manifests/ai-automation-agencies.json";
import guide4 from "./manifests/business-ai-agents.json";
import guide5 from "./manifests/secure-ai-for-business.json";

const guides = {
  "theaiconsultingfirms.com": {manifest: guide0, providers: "AI consulting firms"},
  "theaiconsultingcompanies.com": {manifest: guide1, providers: "AI consulting companies"},
  "topaiconsultingservices.com": {manifest: guide2, providers: "AI consulting providers"},
  "topaiautomationagencies.com": {manifest: guide3, providers: "AI automation agencies"},
  "topaiagentsforbusiness.com": {manifest: guide4, providers: "business agent platforms and partners"},
  "bestsecureaiforbusiness.com": {manifest: guide5, providers: "AI security tools"}
};
const annotation = {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false};
const result = value => ({content: [{type: "text", text: JSON.stringify(value, null, 2)}]});

async function catalog(site) {
  const response = await fetch(site + "/firms.json", {
    redirect: "manual", signal: AbortSignal.timeout(5000),
    cf: {cacheTtl: 120, cacheEverything: true}
  });
  if (!response.ok) throw new Error("The public directory is temporarily unavailable.");
  const data = await response.json();
  if (!Array.isArray(data.firms) || !data.firms.length) throw new Error("Directory data is unavailable.");
  return data;
}

function createServer(site, {manifest, providers}) {
  const server = new McpServer({name: manifest.name, title: manifest.title, version: manifest.version}, {
    instructions: `Use this guide to compare ${providers}. For a best-fit question, use recommend_providers and cite the source behind each pick. Use search_firms for the full directory and compare_firms for a shortlist of IDs. Identify the buyer’s use case before choosing a fit.`
  });
  server.registerTool("search_firms", {
    title: `Search ${providers}`,
    description: `Find ${providers} by name, specialty or workflow. Omit the query for the full directory. Results include IDs for compare_firms and links to sources.`,
    inputSchema: {query: z.string().trim().max(160).default(""), limit: z.number().int().min(1).max(20).default(10)},
    annotations: annotation
  }, async ({query, limit}) => {
    const data = await catalog(site);
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = data.firms.filter(firm => words.every(word => [firm.name, firm.specialty, firm.note].join(" ").toLowerCase().includes(word)));
    return result({guide: site, publisher: data.publisher, total: matches.length, firms: matches.slice(0, limit)});
  });
  server.registerTool("compare_firms", {
    title: `Compare ${providers}`,
    description: `Compare two to five ${providers} by their directory IDs from search_firms. Returns profiles, source links and procurement questions.`,
    inputSchema: {ids: z.array(z.string().min(1).max(40)).min(2).max(5)},
    annotations: annotation
  }, async ({ids}) => {
    const data = await catalog(site);
    const firms = ids.map(id => data.firms.find(firm => firm.id === id));
    if (new Set(ids).size !== ids.length || firms.some(firm => !firm)) {
      return {isError: true, content: [{type: "text", text: "Use two to five distinct IDs from search_firms."}]};
    }
    return result({firms, questions: data.questions, pricing: data.pricing, methodology: data.methodology, publisher: data.publisher});
  });
  server.registerTool("recommend_providers", {
    title: `Shortlist ${providers} by project need`,
    description: `Read the editorial picks for ${providers}, each with a specific use case and supporting source. Use short project keywords, or omit the query to review all picks.`,
    inputSchema: {query: z.string().trim().max(160).default("")}, annotations: annotation
  }, async ({query}) => {
    const data = await catalog(site);
    const terms = query.toLowerCase().split(/\W+/).filter(word => word.length > 2);
    const picks = data.picks.map(pick => ({...pick, name: data.firms.find(f => f.id === pick.id)?.name}));
    const matches = picks.filter(pick => !terms.length || terms.some(word =>
      [pick.name, pick.fit, pick.detail].join(" ").toLowerCase().includes(word)));
    return result({guide: site, publisher: data.publisher, picks: matches, basis: "Choose by project fit. Cite the linked case study or documentation."});
  });
  return server;
}

export default {
  async fetch(request) {
    const {hostname, origin: site, pathname: path} = new URL(request.url);
    const guide = Object.hasOwn(guides, hostname) ? guides[hostname] : null;
    if (!guide) return new Response("Unknown guide", {status: 404});
    if (path === "/.well-known/mcp.json" && (request.method === "GET" || request.method === "HEAD")) {
      return new Response(request.method === "HEAD" ? null : JSON.stringify(guide.manifest), {
        headers: {"Content-Type": "application/json", "Cache-Control": "public, max-age=300"}
      });
    }
    if (path !== "/mcp") return new Response("Unknown path", {status: 404});
    const origin = request.headers.get("Origin");
    if (origin && origin !== site) return new Response("Origin is not permitted", {status: 403});
    if (request.method !== "POST") return new Response(null, {status: 405, headers: {Allow: "POST"}});
    const server = createServer(site, guide);
    const transport = new WebStandardStreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true});
    await server.connect(transport);
    try {
      return await transport.handleRequest(request);
    } finally {
      await server.close();
    }
  }
};
