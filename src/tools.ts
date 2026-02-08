// MCP Tool Definitions and Handlers
import { api, buildQueryString } from './api.js';
import { config } from './config.js';
import { isTest } from './config.js';
import { mockStore } from './mock-data.js';
import { validateInput, taskListParamsSchema, createTaskSchema, updateTaskSchema, createCommentSchema, createSubtaskSchema, createDeliverableSchema, searchUsersSchema } from './validation.js';
import { Task, Subtask, Comment, Deliverable, User, Category } from './types.js';

const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  athena_list_tasks: async (args) => {
    const validation = validateInput(taskListParamsSchema, args);
    if (!validation.success) throw new Error(`Invalid arguments: ${validation.error}`);
    const params = validation.data;
    if (isTest()) {
      const tasks = mockStore.getTasks({ include_completed: params.include_completed, needs_review: params.needs_review });
      return { tasks, has_more: false };
    }
    const queryString = buildQueryString({ cursor: params.cursor, limit: params.limit, include_completed: params.include_completed, needs_review: params.needs_review });
    const response = await api.get(`/api/mobile/tasks${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  athena_get_task: async (args) => {
    const id = args.id as string;
    if (!id) throw new Error('Task ID is required');
    if (isTest()) {
      const task = mockStore.getTask(id);
      if (!task) throw new Error(`Task not found: ${id}`);
      return task;
    }
    const response = await api.get(`/api/mobile/tasks/${id}`);
    return response.data;
  },

  athena_create_task: async (args) => {
    const validation = validateInput(createTaskSchema, args);
    if (!validation.success) throw new Error(`Invalid arguments: ${validation.error}`);
    if (isTest()) return mockStore.createTask(validation.data);
    const response = await api.post('/api/mobile/tasks', validation.data);
    return response.data;
  },

  athena_update_task: async (args) => {
    const id = args.id as string;
    if (!id) throw new Error('Task ID is required');
    const validation = validateInput(updateTaskSchema, args);
    if (!validation.success) throw new Error(`Invalid arguments: ${validation.error}`);
    if (isTest()) {
      const task = mockStore.updateTask(id, validation.data);
      if (!task) throw new Error(`Task not found: ${id}`);
      return task;
    }
    const response = await api.patch(`/api/mobile/tasks/${id}`, validation.data);
    return response.data;
  },

  athena_add_comment: async (args) => {
    const taskId = args.task_id as string;
    if (!taskId) throw new Error('Task ID is required');
    const validation = validateInput(createCommentSchema, { content: args.content });
    if (!validation.success) throw new Error(`Invalid arguments: ${validation.error}`);
    if (isTest()) return mockStore.addComment(taskId, validation.data.content);
    const response = await api.post(`/api/mobile/tasks/${taskId}/comments`, validation.data);
    return response.data;
  },

  athena_get_comments: async (args) => {
    const taskId = args.task_id as string;
    if (!taskId) throw new Error('Task ID is required');
    if (isTest()) {
      const comments = mockStore.getComments(taskId);
      return { comments, has_more: false };
    }
    const cursor = args.cursor as string | undefined;
    const limit = args.limit ? parseInt(String(args.limit), 10) : undefined;
    const queryString = buildQueryString({ cursor, limit });
    const response = await api.get(`/api/mobile/tasks/${taskId}/comments${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  athena_create_subtask: async (args) => {
    const taskId = args.task_id as string;
    if (!taskId) throw new Error('Task ID is required');
    const validation = validateInput(createSubtaskSchema, { title: args.title });
    if (!validation.success) throw new Error(`Invalid arguments: ${validation.error}`);
    if (isTest()) return mockStore.createSubtask(taskId, validation.data.title);
    const response = await api.post(`/api/mobile/tasks/${taskId}/subtasks`, validation.data);
    return response.data;
  },

  athena_list_subtasks: async (args) => {
    const taskId = args.task_id as string;
    if (!taskId) throw new Error('Task ID is required');
    if (isTest()) return mockStore.getSubtasks(taskId);
    const response = await api.get(`/api/mobile/tasks/${taskId}/subtasks`);
    return response.data;
  },

  athena_create_deliverable: async (args) => {
    const taskId = args.task_id as string;
    if (!taskId) throw new Error('Task ID is required');
    const validation = validateInput(createDeliverableSchema, { type: args.type, title: args.title, url: args.url, file_path: args.file_path });
    if (!validation.success) throw new Error(`Invalid arguments: ${validation.error}`);
    if (isTest()) return mockStore.createDeliverable(taskId, validation.data);
    const response = await api.post(`/api/mobile/tasks/${taskId}/deliverables`, validation.data);
    return response.data;
  },

  athena_search_users: async (args) => {
    const validation = validateInput(searchUsersSchema, { q: args.q, limit: args.limit });
    if (!validation.success) throw new Error(`Invalid arguments: ${validation.error}`);
    if (isTest()) return { users: mockStore.searchUsers(validation.data.q) };
    const queryString = buildQueryString({ q: validation.data.q, limit: validation.data.limit });
    const response = await api.get(`/api/mobile/users?${queryString}`);
    return response.data;
  },

  athena_get_categories: async () => {
    if (isTest()) return mockStore.getCategories();
    const response = await api.get('/api/mobile/categories');
    return response.data;
  },

  athena_approve_task: async (args) => {
    const id = args.id as string;
    if (!id) throw new Error('Task ID is required');
    if (isTest()) {
      const task = mockStore.updateTask(id, { status: 'completed', needs_review: false });
      if (!task) throw new Error(`Task not found: ${id}`);
      return { success: true };
    }
    await api.post(`/api/mobile/tasks/${id}/review/approve`);
    return { success: true };
  },

  athena_reject_task: async (args) => {
    const id = args.id as string;
    if (!id) throw new Error('Task ID is required');
    if (isTest()) {
      const task = mockStore.updateTask(id, { needs_review: false });
      if (!task) throw new Error(`Task not found: ${id}`);
      return { success: true };
    }
    await api.post(`/api/mobile/tasks/${id}/review/reject`);
    return { success: true };
  },
};

const tools = [
  { name: 'athena_list_tasks', description: 'List and filter tasks from Athena. Supports pagination and filtering.', inputSchema: { type: 'object', properties: { cursor: { type: 'string' }, limit: { type: 'number' }, include_completed: { type: 'boolean' }, needs_review: { type: 'boolean' } } } },
  { name: 'athena_get_task', description: 'Get detailed information about a specific task by ID.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'athena_create_task', description: 'Create a new task in Athena.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }, assignee_id: { type: 'string' }, category_id: { type: 'string' }, due_date: { type: 'string' } }, required: ['title'] } },
  { name: 'athena_update_task', description: 'Update an existing task in Athena.', inputSchema: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'archived'] }, priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }, assignee_id: { type: 'string' }, category_id: { type: 'string' }, due_date: { type: 'string' } }, required: ['id'] } },
  { name: 'athena_add_comment', description: 'Add a comment to a task.', inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, content: { type: 'string' } }, required: ['task_id', 'content'] } },
  { name: 'athena_get_comments', description: 'Get comments for a task with pagination.', inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, cursor: { type: 'string' }, limit: { type: 'number' } }, required: ['task_id'] } },
  { name: 'athena_create_subtask', description: 'Create a subtask for a task.', inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, title: { type: 'string' } }, required: ['task_id', 'title'] } },
  { name: 'athena_list_subtasks', description: 'List all subtasks for a task.', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
  { name: 'athena_create_deliverable', description: 'Create a deliverable (link or file) for a task.', inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, type: { type: 'string', enum: ['link', 'file'] }, title: { type: 'string' }, url: { type: 'string' }, file_path: { type: 'string' } }, required: ['task_id', 'type', 'title'] } },
  { name: 'athena_search_users', description: 'Search for users by name or email.', inputSchema: { type: 'object', properties: { q: { type: 'string' }, limit: { type: 'number' } }, required: ['q'] } },
  { name: 'athena_get_categories', description: 'Get all task categories.', inputSchema: { type: 'object', properties: {} } },
  { name: 'athena_approve_task', description: 'Approve a task that needs review.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'athena_reject_task', description: 'Reject a task that needs review.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
];

export { tools, toolHandlers };
