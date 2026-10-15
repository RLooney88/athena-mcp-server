import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { Api } from './api.js';

const id = z.string().uuid();
const text = z.string().trim().min(1).max(500);
const timestamp = z.iso.datetime({offset: true});
const key = z.string().min(1).max(200).describe('Stable key for this intended write. Reuse the same key and payload when retrying.');
const page = {cursor: z.string().regex(/^\d+$/).optional(), limit: z.number().int().min(1).max(100).optional()};
const taskFields = {
  title: text, description: z.string().max(50000).nullable().optional(),
  status: z.string().min(1).max(100).optional(), priority: z.enum(['Low','Normal','High','Critical']).optional(),
  project_id: id.nullable().optional(), client_id: id.nullable().optional(), stage_id: id.nullable().optional(),
  assignees: z.array(id).max(100).optional(), due_date: timestamp.nullable().optional(),
};
const query = (a: Record<string, unknown>) => { const q = new URLSearchParams(); for (const [k,v] of Object.entries(a)) if (v !== undefined) q.set(k, String(v)); return q.size ? `?${q}` : ''; };
type Definition = {name:string; description:string; schema:z.ZodObject; method:string; path:(a:any)=>string; body?:(a:any)=>unknown; legacy?:boolean};
const definitions: Definition[] = [
  {name:'athena_me', description:'Inspect authenticated identity and scopes.', schema:z.strictObject({}), method:'GET', path:()=>'/api/v1/me'},
  {name:'athena_list_tasks', description:'List team tasks. Follow meta.next_cursor until null. Filters are exact; results may change while paging.', schema:z.strictObject({...page, project_id:id.optional(),client_id:id.optional(),assignee_id:id.optional(),status:z.string().optional(),stage_id:id.optional(),due_before:timestamp.optional(),updated_after:timestamp.optional()}), method:'GET',path:a=>'/api/v1/tasks'+query(a)},
  {name:'athena_get_task',description:'Read a task, including updated_at for optimistic updates.',schema:z.strictObject({id}),method:'GET',path:a=>`/api/v1/tasks/${a.id}`},
  {name:'athena_create_task',description:'Create a task once per idempotency_key. Uses v1 fields, not mobile fields.',schema:z.strictObject({...taskFields,idempotency_key:key}),method:'POST',path:()=>'/api/v1/tasks',body:({idempotency_key,...body})=>body},
  {name:'athena_update_task',description:'Update a task using expected_updated_at from its last read. On 409, read and reconcile before making a new write.',schema:z.strictObject({...taskFields,title:text.optional(),id,expected_updated_at:timestamp,idempotency_key:key}),method:'PATCH',path:a=>`/api/v1/tasks/${a.id}`,body:({id,idempotency_key,...body})=>body},
  {name:'athena_add_comment',description:'Add a task comment once per idempotency_key.',schema:z.strictObject({task_id:id,content:z.string().trim().min(1).max(10000),parent_comment_id:id.optional(),idempotency_key:key}),method:'POST',path:a=>`/api/v1/tasks/${a.task_id}/comments`,body:a=>({body:a.content,parent_comment_id:a.parent_comment_id})},
  {name:'athena_get_comments',description:'Read task comments, following meta.next_cursor.',schema:z.strictObject({task_id:id,...page}),method:'GET',path:({task_id,...a})=>`/api/v1/tasks/${task_id}/comments`+query(a)},
  {name:'athena_create_deliverable',description:'Attach a hosted URL to a task. Local file paths are not uploaded. Retry using the same key.',schema:z.strictObject({task_id:id,title:text,url:z.url({protocol:/^https?$/}),description:z.string().max(5000).optional(),deliverable_type:z.enum(['link','file','image','video','pdf','document','spreadsheet']).optional(),idempotency_key:key}),method:'POST',path:a=>`/api/v1/tasks/${a.task_id}/deliverables`,body:({task_id,idempotency_key,...a})=>a},
  {name:'athena_list_projects',description:'List projects in the authenticated team.',schema:z.strictObject({...page,client_id:id.optional(),status:z.string().optional()}),method:'GET',path:a=>'/api/v1/projects'+query(a)},
  {name:'athena_get_project',description:'Get a project by ID.',schema:z.strictObject({id}),method:'GET',path:a=>`/api/v1/projects/${a.id}`},
  {name:'athena_list_project_stages',description:'Get valid stage IDs for a project before assigning a task.',schema:z.strictObject({project_id:id}),method:'GET',path:a=>`/api/v1/projects/${a.project_id}/stages`},
  {name:'athena_list_companies',description:'List team companies.',schema:z.strictObject({...page}),method:'GET',path:a=>'/api/v1/companies'+query(a)},
  {name:'athena_list_contacts',description:'List contacts, optionally scoped to a company.',schema:z.strictObject({...page,company_id:id.optional()}),method:'GET',path:a=>'/api/v1/contacts'+query(a)},
  {name:'athena_search',description:'Search tasks, projects or clients. Requires search:read.',schema:z.strictObject({query:z.string().trim().min(1).max(500),entities:z.array(z.enum(['tasks','projects','clients'])).optional(),limit:z.number().int().min(1).max(100).optional()}),method:'POST',path:()=>'/api/v1/search',body:a=>a},
  // Existing mobile-only operations remain compatibility tools, not duplicate business logic.
  {name:'athena_create_subtask',description:'Mobile compatibility: requires AUTH_TOKEN. Creates a subtask. No retry guarantee; reconcile an uncertain response before retrying.',schema:z.strictObject({task_id:id,title:text}),method:'POST',path:a=>`/api/mobile/tasks/${a.task_id}/subtasks`,body:a=>({name:a.title}),legacy:true},
  {name:'athena_list_subtasks',description:'Mobile compatibility: requires AUTH_TOKEN. List subtasks.',schema:z.strictObject({task_id:id}),method:'GET',path:a=>`/api/mobile/tasks/${a.task_id}/subtasks`,legacy:true},
  {name:'athena_search_users',description:'Mobile compatibility: requires AUTH_TOKEN. Search users.',schema:z.strictObject({q:z.string().min(1),limit:z.number().int().min(1).max(50).optional()}),method:'GET',path:a=>'/api/mobile/users'+query(a),legacy:true},
  {name:'athena_get_categories',description:'Mobile compatibility: requires AUTH_TOKEN. Read categories.',schema:z.strictObject({}),method:'GET',path:()=>'/api/mobile/categories',legacy:true},
  {name:'athena_approve_task',description:'Mobile compatibility: requires AUTH_TOKEN and backend review permission. Reconcile uncertain outcomes before retrying.',schema:z.strictObject({id}),method:'POST',path:a=>`/api/mobile/tasks/${a.id}/review/approve`,legacy:true},
  {name:'athena_reject_task',description:'Mobile compatibility: requires AUTH_TOKEN and backend review permission. Reconcile uncertain outcomes before retrying.',schema:z.strictObject({id}),method:'POST',path:a=>`/api/mobile/tasks/${a.id}/review/reject`,legacy:true},
];

export const tools: Tool[] = definitions.map(d=>({name:d.name,description:d.description,inputSchema:z.toJSONSchema(d.schema) as Tool['inputSchema']}));
export async function callTool(api:Api,name:string,args:unknown) {
  const def=definitions.find(d=>d.name===name);
  if (!def) throw new Error(`Unknown tool: ${name}`);
  const a=def.schema.parse(args) as Record<string,any>;
  return api(def.method,def.path(a),def.body?.(a),{legacy:def.legacy,idempotencyKey:a.idempotency_key});
}
