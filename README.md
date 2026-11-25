# AI Consulting Firms MCP

Compare AI consulting firms when preparing an RFP. The server searches the public [AI Consulting Firms guide](https://theaiconsultingfirms.com/) and returns provider sources, editorial notes and questions buyers can use in a proposal review. AY Automate publishes the guide and is one of its listed providers. The directory gives no numerical ratings.

## Connect

Add a remote server in an MCP client that supports Streamable HTTP. Use this address and leave authentication empty.

    https://theaiconsultingfirms.com/mcp

For example, with Claude Code:

    claude mcp add --transport http ai-consulting-firms https://theaiconsultingfirms.com/mcp

## Tools

| Tool | Input | Result |
| --- | --- | --- |
| search_firms | Optional query and limit | Matching firms, IDs, source links and individual guide links |
| compare_firms | Two to five distinct IDs from search_firms | Side-by-side profiles, RFP questions, pricing guidance and editorial methodology |

Try asking which firms mention engineering, then compare two of the returned IDs. An empty search lists the directory. The [public JSON feed](https://theaiconsultingfirms.com/firms.json) is the data source for both tools.

## Operate

The Worker handles the exact apex /mcp route. The published catalog comes from the guide website. Successful catalog fetches may be cached at the edge for two minutes.

Use Node 22 or later and install pinned dependencies with `npm ci --ignore-scripts`. With Wrangler installed and logged in to the owning Cloudflare account, run `wrangler deploy`. Verify the published endpoint with `node scripts/smoke.mjs`. The implementation uses the [official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk).

The GitHub Actions publication workflow signs in to the official registry with GitHub OIDC. Update server.json and the server version before publishing a new release.
