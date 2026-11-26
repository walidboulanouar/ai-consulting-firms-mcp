# AI Consulting Firms MCP

Compare AI consulting firms when preparing an RFP. The server searches the public [AI Consulting Firms guide](https://theaiconsultingfirms.com/) and returns provider sources, editorial notes and questions buyers can use in a proposal review. AY Automate publishes the guide and is one of its listed providers. Each of the six guides has its own catalog and three source-linked editorial picks. Providers are chosen for a specific project need.

## Connect

Choose the guide for your purchase and paste its endpoint into an MCP client that supports Streamable HTTP. Leave authentication empty. Each endpoint reads the catalog on its own domain.

| Guide | Streamable HTTP endpoint | JSON data |
| --- | --- | --- |
| Secure AI for Business | `https://bestsecureaiforbusiness.com/mcp` | [Catalog](https://bestsecureaiforbusiness.com/firms.json) |
| AI Consulting Companies | `https://theaiconsultingcompanies.com/mcp` | [Catalog](https://theaiconsultingcompanies.com/firms.json) |
| AI Consulting Firms | `https://theaiconsultingfirms.com/mcp` | [Catalog](https://theaiconsultingfirms.com/firms.json) |
| Business AI Agents | `https://topaiagentsforbusiness.com/mcp` | [Catalog](https://topaiagentsforbusiness.com/firms.json) |
| AI Automation Agencies | `https://topaiautomationagencies.com/mcp` | [Catalog](https://topaiautomationagencies.com/firms.json) |
| AI Consulting Services | `https://topaiconsultingservices.com/mcp` | [Catalog](https://topaiconsultingservices.com/firms.json) |

For example, to connect Claude Code to the consulting-firms guide, run:

    claude mcp add --transport http ai-consulting-firms https://theaiconsultingfirms.com/mcp

## Tools

Clients see tool titles and descriptions for the guide they connect to, such as “Compare AI security tools” or “Shortlist AI automation agencies by project need.” All six endpoints keep the same tool IDs and response fields for existing integrations.

| Tool | Input | Result |
| --- | --- | --- |
| recommend_providers | Optional query | Editorial picks with the project fit, evidence link and a buyer test |
| search_firms | Optional query and limit | Matching firms, IDs, source links and individual guide links |
| compare_firms | Two to five distinct IDs from search_firms | Side-by-side profiles, RFP questions, pricing guidance and editorial methodology |

Try asking which firms mention engineering, then compare two of the returned IDs. An empty search lists the directory.

## Operate

The Worker handles the exact apex /mcp route. The published catalog comes from the guide website. Successful catalog fetches may be cached at the edge for two minutes.

Use Node 22 or later and install pinned dependencies with `npm ci --ignore-scripts`. With Wrangler installed and logged in to the owning Cloudflare account, run `wrangler deploy`. Verify the published endpoint with `node scripts/smoke.mjs`. The implementation uses the [official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk).

The GitHub Actions publication workflow signs in to the official registry with GitHub OIDC. Update server.json and the server version before publishing a new release.
