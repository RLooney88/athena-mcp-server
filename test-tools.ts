#!/usr/bin/env node
/**
 * Athena MCP Server - Tool Validation Test Script
 * Tests all MCP tools against mock data store
 */

import { mockStore } from './src/mock-data.js';
import { validateInput } from './src/validation.js';
import { taskListParamsSchema, createTaskSchema, updateTaskSchema, createCommentSchema, createSubtaskSchema, createDeliverableSchema, searchUsersSchema } from './src/validation.js';

const results = { passed: 0, failed: 0, tests: [] as Array<{ name: string; status: string; message?: string }> };

function pass(name: string) {
  results.passed++;
  results.tests.push({ name, status: 'PASS' });
  console.log(`✓ ${name}`);
}

function fail(name: string, error: string) {
  results.failed++;
  results.tests.push({ name, status: 'FAIL', message: error });
  console.log(`✗ ${name}: ${error}`);
}

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
  } catch (error) {
    fail(name, error instanceof Error ? error.message : String(error));
  }
}

async function runTests() {
  console.log('Athena MCP Server - Tool Validation Tests\n');
  console.log('==========================================\n');

  await test('athena_list_tasks - List all tasks', async () => {
    const tasks = mockStore.getTasks();
    if (tasks.length === 0) throw new Error('Expected tasks to be returned');
    console.log(`  Found ${tasks.length} tasks`);
  });

  await test('athena_list_tasks - Filter completed tasks', async () => {
    const tasks = mockStore.getTasks({ include_completed: false });
    if (tasks.some(t => t.status === 'completed')) throw new Error('Completed tasks should be filtered');
  });

  await test('athena_list_tasks - Filter needs review', async () => {
    const tasks = mockStore.getTasks({ needs_review: true });
    if (tasks.some(t => !t.needs_review)) throw new Error('Only review tasks should be returned');
  });

  await test('athena_get_task - Get existing task', async () => {
    const task = mockStore.getTask('task-1');
    if (!task) throw new Error('Task not found');
    if (task.id !== 'task-1') throw new Error('Wrong task returned');
  });

  await test('athena_get_task - Get non-existent task', async () => {
    const task = mockStore.getTask('non-existent');
    if (task) throw new Error('Should return undefined');
  });

  await test('athena_create_task - Create valid task', async () => {
    const newTask = mockStore.createTask({ title: 'Test Task', description: 'Test', priority: 'high' });
    if (!newTask.id) throw new Error('Task should have ID');
    if (newTask.title !== 'Test Task') throw new Error('Title mismatch');
  });

  await test('athena_create_task - Validation rejects empty title', async () => {
    const result = validateInput(createTaskSchema, { title: '' });
    if (result.success) throw new Error('Should reject empty title');
  });

  await test('athena_update_task - Update status', async () => {
    const updated = mockStore.updateTask('task-1', { status: 'completed' });
    if (!updated) throw new Error('Task not found');
    if (updated.status !== 'completed') throw new Error('Status should update');
    if (!updated.completed_at) throw new Error('completed_at should be set');
  });

  await test('athena_get_comments - Get comments', async () => {
    const comments = mockStore.getComments('task-1');
    if (!Array.isArray(comments)) throw new Error('Should return array');
  });

  await test('athena_add_comment - Add comment', async () => {
    const comment = mockStore.addComment('task-1', 'Test comment');
    if (!comment.id) throw new Error('Comment should have ID');
    if (comment.content !== 'Test comment') throw new Error('Content mismatch');
  });

  await test('athena_add_comment - Validation rejects empty content', async () => {
    const result = validateInput(createCommentSchema, { content: '' });
    if (result.success) throw new Error('Should reject empty content');
  });

  await test('athena_list_subtasks - Get subtasks', async () => {
    const subtasks = mockStore.getSubtasks('task-1');
    if (!Array.isArray(subtasks)) throw new Error('Should return array');
  });

  await test('athena_create_subtask - Create subtask', async () => {
    const subtask = mockStore.createSubtask('task-1', 'New subtask');
    if (!subtask.id) throw new Error('Subtask should have ID');
    if (subtask.is_completed !== false) throw new Error('Should not be completed');
  });

  await test('athena_create_subtask - Validation rejects empty title', async () => {
    const result = validateInput(createSubtaskSchema, { title: '' });
    if (result.success) throw new Error('Should reject empty title');
  });

  await test('athena_create_deliverable - Create link', async () => {
    const deliverable = mockStore.createDeliverable('task-1', { type: 'link', title: 'Docs', url: 'https://example.com' });
    if (!deliverable.id) throw new Error('Deliverable should have ID');
    if (deliverable.type !== 'link') throw new Error('Type mismatch');
  });

  await test('athena_create_deliverable - Validation rejects link without URL', async () => {
    const result = validateInput(createDeliverableSchema, { type: 'link', title: 'No URL' });
    if (result.success) throw new Error('Should reject link without URL');
  });

  await test('athena_search_users - Search by name', async () => {
    const users = mockStore.searchUsers('John');
    if (users.length === 0) throw new Error('Should find John');
  });

  await test('athena_search_users - No results', async () => {
    const users = mockStore.searchUsers('nonexistent12345');
    if (users.length !== 0) throw new Error('Should return empty');
  });

  await test('athena_search_users - Validation rejects empty query', async () => {
    const result = validateInput(searchUsersSchema, { q: '' });
    if (result.success) throw new Error('Should reject empty query');
  });

  await test('athena_get_categories - Get categories', async () => {
    const categories = mockStore.getCategories();
    if (categories.length === 0) throw new Error('Should return categories');
  });

  await test('Unread Comments Count - Valid number', async () => {
    const count = mockStore.getUnreadCommentsCount();
    if (typeof count !== 'number' || count < 0) throw new Error('Should be non-negative number');
  });

  await test('Review Count - Valid number', async () => {
    const count = mockStore.getReviewCount();
    if (typeof count !== 'number' || count < 0) throw new Error('Should be non-negative number');
  });

  await test('Task List Params - Valid pagination', async () => {
    const result = validateInput(taskListParamsSchema, { cursor: 'abc', limit: 50 });
    if (!result.success) throw new Error(`Validation failed: ${result.error}`);
  });

  await test('Task List Params - Invalid limit', async () => {
    const result = validateInput(taskListParamsSchema, { limit: 200 });
    if (result.success) throw new Error('Should reject limit > 100');
  });

  await test('Update Task - Valid status', async () => {
    const result = validateInput(updateTaskSchema, { status: 'in_progress', priority: 'high' });
    if (!result.success) throw new Error(`Validation failed: ${result.error}`);
  });

  await test('Update Task - Invalid status', async () => {
    const result = validateInput(updateTaskSchema, { status: 'invalid' });
    if (result.success) throw new Error('Should reject invalid status');
  });

  console.log('\n==========================================');
  console.log(`Test Results: ${results.passed} passed, ${results.failed} failed`);
  console.log('==========================================\n');

  if (results.failed > 0) {
    console.log('Failed Tests:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`  - ${t.name}: ${t.message}`);
    });
    process.exit(1);
  }

  console.log('All tests passed! ✓\n');
}

runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
