// Athena MCP Server - Main Entry Point
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { config } from './config.js';
import { tools, toolHandlers } from './tools.js';
import { AthenaApiError } from './api.js';

class AthenaMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server('athena-mcp-server', '1.0.0', {
      capabilities: { tools: {} },
    });
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      if (!name) {
        return { content: [{ type: 'text', text: 'Error: No tool name provided' }], isError: true };
      }
      const handler = toolHandlers[name];
      if (!handler) {
        return { content: [{ type: 'text', text: `Error: Unknown tool: ${name}` }], isError: true };
      }
      try {
        const result = await handler(args || {});
        return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof AthenaApiError ? `API Error (${error.statusCode}): ${error.message}` : error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Athena MCP] Tool error: ${name}`, error);
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
      }
    });
  }

  async connect(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('[Athena MCP] Server connected and ready');
    if (config.environment !== 'production') {
      console.log(`[Athena MCP] Environment: ${config.environment}`);
      console.log(`[Athena MCP] API URL: ${config.apiUrl}`);
    }
  }

  async start(): Promise<void> {
    await this.connect();
  }

  async stop(): Promise<void> {
    await this.server.close();
    console.log('[Athena MCP] Server stopped');
  }
}

async function main(): Promise<void> {
  const server = new AthenaMCPServer();
  process.on('SIGINT', async () => { console.log('\nShutting down...'); await server.stop(); process.exit(0); });
  process.on('SIGTERM', async () => { console.log('\nShutting down...'); await server.stop(); process.exit(0); });
  try {
    await server.start();
  } catch (error) {
    console.error('[Athena MCP] Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => { console.error('[Athena MCP] Fatal error:', error); process.exit(1); });

export { AthenaMCPServer };
