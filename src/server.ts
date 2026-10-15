import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config.js';
import { createApi, AthenaApiError } from './api.js';
import { tools, callTool } from './tools.js';

async function main() {
  const api=createApi(loadConfig());
  const server=new Server({name:'athena-mcp-server',version:'1.1.0'},{capabilities:{tools:{}}});
  server.setRequestHandler(ListToolsRequestSchema,async()=>({tools}));
  server.setRequestHandler(CallToolRequestSchema,async request=>{
    try {
      const data=await callTool(api,request.params.name,request.params.arguments || {});
      return {content:[{type:'text',text:JSON.stringify(data)}]};
    } catch(error) {
      const detail=error instanceof AthenaApiError ? {code:error.errorCode,status:error.statusCode,message:error.message,request_id:error.requestId} : {code:'invalid_request',message:error instanceof Error ? error.message : 'Request failed'};
      return {isError:true,content:[{type:'text',text:JSON.stringify({error:detail})}]};
    }
  });
  await server.connect(new StdioServerTransport());
  // stdout belongs exclusively to the MCP transport.
  for (const signal of ['SIGINT','SIGTERM'] as const) process.once(signal,()=>{void server.close().finally(()=>process.exit(0));});
}
main().catch(error=>{console.error(error instanceof Error ? error.message : 'Startup failed');process.exitCode=1;});
