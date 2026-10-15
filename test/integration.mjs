// Executed only by the backend disposable fixture. Never point at a live API.
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const url=new URL(process.env.API_URL || 'http://invalid');
assert.equal(url.hostname,'127.0.0.1');assert.equal(process.env.ATHENA_API_KEY,'fixture');
const client=new Client({name:'athena-integration-test',version:'1.0.0'});
const transport=new StdioClientTransport({command:process.execPath,args:['dist/server.js'],env:{PATH:process.env.PATH,API_URL:process.env.API_URL,ATHENA_API_KEY:'fixture'},stderr:'pipe'});
async function call(name,args={}) {
 const result=await client.callTool({name,arguments:args});
 return {error:result.isError,data:JSON.parse(result.content[0].text)};
}
try {
 await client.connect(transport);
 const discovered=await client.listTools();assert.equal(discovered.tools.length,20);
 const args={title:'MCP task',idempotency_key:'mcp-create',due_date:'2026-10-20T12:00:00Z'};
 const [a,b]=await Promise.all([call('athena_create_task',args),call('athena_create_task',args)]);
 assert.ok(!a.error && !b.error);assert.equal(a.data.id,b.data.id);
 let read=await call('athena_get_task',{id:a.data.id});assert.equal(read.data.title,'MCP task');
 const update={id:a.data.id,title:'MCP updated',expected_updated_at:read.data.updated_at,idempotency_key:'mcp-update'};
 const updated=await call('athena_update_task',update);assert.ok(!updated.error,JSON.stringify(updated));
 assert.deepEqual((await call('athena_update_task',update)).data,updated.data);
 const stale=await call('athena_update_task',{...update,title:'Must not overwrite',idempotency_key:'new-intent'});
 assert.equal(stale.data.error.code,'stale_revision');
 const foreign=await call('athena_create_task',{title:'Foreign',project_id:'00000000-0000-4000-8000-000000000004',idempotency_key:'foreign'});
 assert.equal(foreign.error,true);assert.equal(foreign.data.error.status,404);
 await call('athena_create_task',{title:'Second task',idempotency_key:'second'});
 let page=await call('athena_list_tasks',{limit:1});assert.equal(page.data.data.length,1);assert.ok(page.data.meta.next_cursor);
 let next=await call('athena_list_tasks',{limit:1,cursor:page.data.meta.next_cursor});assert.notEqual(page.data.data[0].id,next.data.data[0].id);assert.equal(next.data.meta.next_cursor,null);
 for(const [name,args] of [['athena_add_comment',{task_id:a.data.id,content:'MCP note',idempotency_key:'note'}],['athena_create_deliverable',{task_id:a.data.id,title:'Document',url:'https://example.com/document',idempotency_key:'doc'}]]) {
  const first=await call(name,args),again=await call(name,args);assert.ok(!first.error,JSON.stringify(first));assert.deepEqual(first.data,again.data);
 }
 read=await call('athena_get_task',{id:a.data.id});assert.equal(read.data.title,'MCP updated');
 console.log('MCP → HTTP API → PostgreSQL acceptance passed (discovery, create, concurrent retry, update, stale rejection, tenant validation, pagination, comment, deliverable, read-back).');
} finally { await client.close(); }
