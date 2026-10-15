import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {loadConfig} from '../dist/config.js';
import {createApi} from '../dist/api.js';
import {callTool,tools} from '../dist/tools.js';
const id='00000000-0000-4000-8000-000000000001';

test('configuration fails closed and supports documented aliases',()=>{
 assert.throws(()=>loadConfig({}),/API_URL/);
 assert.throws(()=>loadConfig({API_URL:'https://example.com'}),/ATHENA_API_KEY/);
 assert.equal(loadConfig({NODE_ENV:'test',TEST_API_URL:'http://localhost:8000',TEST_AUTH_TOKEN:'fixture'}).authToken,'fixture');
 assert.throws(()=>loadConfig({API_URL:'http://example.com',ATHENA_API_KEY:'fixture'}),/HTTPS/);
});

test('schemas reject unsupported fields and require stable write metadata',async()=>{
 const no=async()=>{throw new Error('must not reach API');};
 await assert.rejects(()=>callTool(no,'athena_create_task',{title:'Task'}));
 await assert.rejects(()=>callTool(no,'athena_create_task',{title:'Task',idempotency_key:'a',assignee_id:id}));
 await assert.rejects(()=>callTool(no,'athena_update_task',{id,title:'Task',idempotency_key:'a'}));
 await assert.rejects(()=>callTool(no,'athena_get_task',{id:'../other'}));
 await assert.rejects(()=>callTool(no,'athena_create_deliverable',{task_id:id,title:'File',file_path:'/tmp/file',idempotency_key:'a'}));
});

test('v1 and legacy mappings preserve the actual backend contracts',async()=>{
 const capture=async(...a)=>a;
 let args=await callTool(capture,'athena_create_task',{title:'Task',idempotency_key:'once',assignees:[id]});
 assert.equal(args[1],'/api/v1/tasks');assert.deepEqual(args[2],{title:'Task',assignees:[id]});assert.equal(args[3].idempotencyKey,'once');
 args=await callTool(capture,'athena_add_comment',{task_id:id,content:'Note',idempotency_key:'once'});
 assert.equal(args[2].body,'Note');
 args=await callTool(capture,'athena_create_subtask',{task_id:id,title:'Child'});
 assert.deepEqual(args[2],{name:'Child'});assert.equal(args[3].legacy,true);
 assert.equal(tools.length,20);
});

test('real stdio handshake, discovery and tool request through HTTP (no mock runtime)',async()=>{
 const requests=[];
 const server=http.createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;
  requests.push({path:req.url,headers:req.headers,body:raw?JSON.parse(raw):null});
  res.setHeader('Content-Type','application/json');
  if(req.url==='/api/v1/me')res.end(JSON.stringify({team_id:id}));
  else if(req.url==='/api/v1/tasks')res.end(JSON.stringify({id,title:JSON.parse(raw).title}));
  else {res.statusCode=409;res.end(JSON.stringify({detail:{error:{code:'stale_revision',message:'Read again',request_id:'req-1'}}}));}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const transport=new StdioClientTransport({command:process.execPath,args:['dist/server.js'],env:{PATH:process.env.PATH,API_URL:base,ATHENA_API_KEY:'fixture',NODE_ENV:'test'},stderr:'pipe'});
 const client=new Client({name:'test',version:'1.0.0'});
 try {
  await client.connect(transport);
  const listed=await client.listTools();assert.equal(listed.tools.length,20);
  const result=await client.callTool({name:'athena_create_task',arguments:{title:'Real HTTP',idempotency_key:'stable'}});
  assert.equal(result.isError,undefined);assert.equal(JSON.parse(result.content[0].text).title,'Real HTTP');
  assert.equal(requests[0].headers['x-api-key'],'fixture');assert.equal(requests[0].headers['idempotency-key'],'stable');
  const failed=await client.callTool({name:'athena_update_task',arguments:{id,title:'Next',expected_updated_at:'2026-10-15T12:00:00Z',idempotency_key:'next'}});
  assert.equal(failed.isError,true);assert.equal(JSON.parse(failed.content[0].text).error.code,'stale_revision');
 }finally{await client.close();await new Promise(resolve=>server.close(resolve));}
});

test('legacy auth is explicit, never substitutes an API key for JWT',async()=>{
 const api=createApi(loadConfig({API_URL:'http://localhost:1',ATHENA_API_KEY:'fixture'}));
 await assert.rejects(()=>api('GET','/api/mobile/categories',undefined,{legacy:true}),/AUTH_TOKEN/);
});
