import assert from "node:assert/strict";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = new URL(process.argv[2] || "https://theaiconsultingfirms.com/mcp");
const client = new Client({name: "directory-smoke", version: "1.0.0"});
await client.connect(new StreamableHTTPClientTransport(endpoint));
try {
  const tools = (await client.listTools()).tools.map(t => t.name).sort();
  assert.deepEqual(tools, ["compare_firms", "recommend_providers", "search_firms"]);
  const picks = JSON.parse((await client.callTool({name:"recommend_providers", arguments:{}})).content[0].text);
  assert.equal(picks.guide, endpoint.origin);
  assert.equal(picks.picks.length, 3);
  assert.ok(picks.picks.every(p => p.source.startsWith("https://") && p.name));
  const search = await client.callTool({name:"search_firms", arguments:{}});
  assert.ok(!search.isError, search.content[0]?.text);
  const all = JSON.parse(search.content[0].text);
  assert.ok(all.total >= 2);
  const ids = all.firms.slice(0, 2).map(f => f.id);
  const compared = await client.callTool({name:"compare_firms", arguments:{ids}});
  const details = JSON.parse(compared.content[0].text);
  assert.deepEqual(details.firms.map(f => f.id), ids);
  assert.ok(details.firms.every(f => f.source.startsWith("https://")));
  const missing = await client.callTool({name:"search_firms", arguments:{query:"xyz-never-a-listed-firm"}});
  assert.equal(JSON.parse(missing.content[0].text).total, 0);
  const bad = await client.callTool({name:"compare_firms", arguments:{ids:[ids[0], ids[0]]}});
  assert.equal(bad.isError, true);
  console.log("Live MCP passed:", tools.join(", "), "with", all.total, "firms.");
} finally {
  await client.close();
}
