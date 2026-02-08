#!/usr/bin/env node
/**
 * Athena MCP Server - Tool Validation Test Script
 * 
 * This script validates all MCP tools are working correctly
 * by testing them against the mock data store.
 * 
 * Usage:
 *   node test-tools.js              # Run all tests
 *   node test-tools.js --verbose    # Show detailed output
 *   node test-tools.js --json       # Output JSON results
 */

import { mockStore } from './src/mock-data.js';
import { validateInput } from './src/validation.js';
import {
  taskListParamsSchema,
  createTaskSchema,
  updateTaskSchema,
  createCommentSchema,
  createSubtaskSchema,
  createDeliverableSchema,
  searchUsersSchema,
} from './src/validation.js';

// Test configuration
const VERBOSE = process.argv.includes('--verbose');
const JSON_OUTPUT = process.argv.includes('--json');

// Results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [] as Array<{ name: string; status: string; message?: string; duration: number }>,
};

// Helper functions
function log(message: string): void {
  if (VERBOSE || JSON_OUTPUT) {
    console.log(message);
  }
}

function pass(testName: string, message?: string): void {
  results.passed++;
  results.tests.push({ name: testName, status: 'PASS', message, duration: 0 });
  if (!JSON_OUTPUT) {
    console.log(`✓ ${testName}`);
  }
}

function fail(testName: string, error: string): void {
  results.failed++;
  results.tests.push({ name: testName, status: 'FAIL', message: error, duration: 0 });
  if (!JSON_OUTPUT) {
    console.log(`✗ ${testName}: ${error}`);
  }
}

async function test(name: string, testFn: () => Promise<void> | void): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    pass(name);
    if (VERBOSE) {
      console.log(`  (${duration}ms)`);
    }
  } catch (error) {
    const duration = Date.now() - start;
    fail(name, error instanceof Error ? error.message : String(error));
  }
}

// Test Suite
async function runTests(): Promise<void> {
  console.log('Athena MCP Server - Tool Validation Tests');
  console.log('==========================================\n');

  // Test 1: Task List
  await test('athena_list_tasks - List all tasks', async () => {
    const tasks = mockStore.getTasks();
    if (tasks.length === 0) {
      throw new Error('Expected tasks to be returned');
    }
    log(`  Found ${tasks.length} tasks`);
  });

  await test('athena_list_tasks - Filter completed tasks', async () => {
    const tasks = mockStore.getTasks({ include_completed: false });
    const hasCompleted = tasks.some(t => t.status === 'completed');
    if (hasCompleted) {
      throw new Error('Completed tasks should be filtered out');
    }
  });

  await test('athena_list_tasks - Filter needs review', async () => {
    const tasks = mockStore.getTasks({ needs_review: true });
    const hasNonReview = tasks.some(t => !t.needs_review);
    if (hasNonReview) {
      throw new Error('Only tasks needing review should be returned');
    }
  });

  // Test 2: Task Get
  await test('athena_get_task - Get existing task', async () => {
    const task = mockStore.getTask('task-1');
    if (!task) {
      throw new Error('Task not found');
    }
    if (task.id !== 'task-1') {
      throw new Error('Wrong task returned');
    }
  });

  await test('athena_get_task - Get non-existent task', async () => {
    const task = mockStore.getTask('non-existent');
    if (task) {
      throw new Error('Should return undefined for non-existent task');
    }
  });

  // Test 3: Task Create
  await test('athena_create_task - Create valid task', async () => {
    const newTask = mockStore.createTask({
      title: 'Test Task',
      description: 'Test Description',
      priority: 'high',
    });
    if (!newTask.id) {
      throw new Error('Task should have an ID');
    }
    if (newTask.title !== 'Test Task') {
      throw new Error('Task title mismatch');
    }
    if (newTask.status !== 'pending') {
      throw new Error('New task should have pending status');
    }
  });

  await test('athena_create_task - Validation rejects empty title', async () => {
    const validation = validateInput(createTaskSchema, { title: '' });
    if (validation.success) {
      throw new Error('Should reject empty title');
    }
  });

  // Test 4: Task Update
  await test('athena_update_task - Update task status', async () => {
    const updated = mockStore.updateTask('task-1', { status: 'completed' });
    if (!updated) {
      throw new Error('Task not found');
    }
    if (updated.status !== 'completed') {
      throw new Error('Status should be updated');
    }
    if (!updated.completed_at) {
      throw new Error('Completed_at should be set');
    }
  });

  await test('athena_update_task - Update non-existent task', async () => {
    const result = mockStore.updateTask('non-existent', { status: 'completed' });
    if (result) {
      throw new Error('Should return undefined for non-existent task');
    }
  });

  // Test 5: Comments
  await test('athena_get_comments - Get comments for task', async () => {
    const comments = mockStore.getComments('task-1');
    if (!Array.isArray(comments)) {
      throw new Error('Should return array of comments');
    }
  });

  await test('athena_add_comment - Add comment to task', async () => {
    const comment = mockStore.addComment('task-1', 'Test comment');
    if (!comment.id) {
      throw new Error('Comment should have an ID');
    }
    if (comment.content !== 'Test comment') {
      throw new Error('Comment content mismatch');
    }
    if (comment.user_id !== 'user-1') {
      throw new Error('Comment should have current user');
    }
  });

  await test('athena_add_comment - Validation rejects empty content', async () => {
    const validation = validateInput(createCommentSchema, { content: '' });
    if (validation.success) {
      throw new Error('Should reject empty content');
    }
  });

  // Test 6: Subtasks
  await test('athena_list_subtasks - Get subtasks for task', async () => {
    const subtasks = mockStore.getSubtasks('task-1');
    if (!Array.isArray(subtasks)) {
      throw new Error('Should return array of subtasks');
    }
  });

  await test('athena_create_subtask - Create subtask', async () => {
    const subtask = mockStore.createSubtask('task-1', 'New subtask');
    if (!subtask.id) {
      throw new Error('Subtask should have an ID');
    }
    if (subtask.is_completed !== false) {
      throw new Error('New subtask should not be completed');
    }
  });

  await test('athena_create_subtask - Delete subtask', async () => {
    const result = mockStore.deleteSubtask('subtask-1');
    if (!result) {
      throw new Error('Should successfully delete subtask');
    }
    const subtasks = mockStore.getSubtasks('task-1');
    if (subtasks.find(s => s.id === 'subtask-1')) {
      throw new Error('Subtask should be deleted');
    }
  });

  await test('athena_create_subtask - Validation rejects empty title', async () => {
    const validation = validateInput(createSubtaskSchema, { title: '' });
    if (validation.success) {
      throw new Error('Should reject empty title');
    }
  });

  // Test 7: Deliverables
  await test('athena_create_deliverable - Create link deliverable', async () => {
    const deliverable = mockStore.createDeliverable('task-1', {
      type: 'link',
      title: 'Documentation',
      url: 'https://example.com/docs',
    });
    if (!deliverable.id) {
      throw new Error('Deliverable should have an ID');
    }
    if (deliverable.type !== 'link') {
      throw new Error('Deliverable type mismatch');
    }
  });

  await test('athena_create_deliverable - Create file deliverable', async () => {
    const deliverable = mockStore.createDeliverable('task-1', {
      type: 'file',
      title: 'Design File',
      file_path: '/uploads/design.png',
    });
    if (!deliverable.id) {
      throw new Error('Deliverable should have an ID');
    }
    if (deliverable.type !== 'file') {
      throw new Error('Deliverable type mismatch');
    }
  });

  await test('athena_create_deliverable - Validation rejects link without URL', async () => {
    const validation = validateInput(createDeliverableSchema, {
      type: 'link',
      title: 'No URL',
    });
    if (validation.success) {
      throw new Error('Should reject link without URL');
    }
  });

  // Test 8: User Search
  await test('athena_search_users - Search by name', async () => {
    const users = mockStore.searchUsers('John');
    if (users.length === 0) {
      throw new Error('Should find John Doe');
    }
    if (!users[0].name.includes('John')) {
      throw new Error('Search results should match query');
    }
  });

  await test('athena_search_users - Search by email', async () => {
    const users = mockStore.searchUsers('jane');
    if (users.length === 0) {
      throw new Error('Should find Jane Smith by email');
    }
  });

  await test('athena_search_users - No results', async () => {
    const users = mockStore.searchUsers('nonexistent12345');
    if (users.length !== 0) {
      throw new Error('Should return empty array for no matches');
    }
  });

  await test('athena_search_users - Validation rejects empty query', async () => {
    const validation = validateInput(searchUsersSchema, { q: '' });
    if (validation.success) {
      throw new Error('Should reject empty query');
    }
  });

  // Test 9: Categories
  await test('athena_get_categories - Get all categories', async () => {
    const categories = mockStore.getCategories();
    if (categories.length === 0) {
      throw new Error('Should return categories');
    }
    const hasDevelopment = categories.some(c => c.name === 'Development');
    if (!hasDevelopment) {
      throw new Error('Should include Development category');
    }
  });

  // Test 10: Counts
  await test('Unread Comments Count - Returns valid number', async () => {
    const count = mockStore.getUnreadCommentsCount();
    if (typeof count !== 'number' || count < 0) {
      throw new Error('Count should be a non-negative number');
    }
  });

  await test('Review Count - Returns valid number', async () => {
    const count = mockStore.getReviewCount();
    if (typeof count !== 'number' || count < 0) {
      throw new Error('Count should be a non-negative number');
    }
  });

  // Test 11: Validation Schemas
  await test('Task List Params - Valid pagination', async () => {
    const validation = validateInput(taskListParamsSchema, {
      cursor: 'abc123',
      limit: 50,
      include_completed: true,
    });
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error}`);
    }
  });

  await test('Task List Params - Invalid limit', async () => {
    const validation = validateInput(taskListParamsSchema, { limit: 200 });
    if (validation.success) {
      throw new Error('Should reject limit > 100');
    }
  });

  await test('Update Task - Valid status', async () => {
    const validation = validateInput(updateTaskSchema, {
      status: 'in_progress',
      priority: 'high',
    });
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error}`);
    }
  });

  await test('Update Task - Invalid status', async () => {
    const validation = validateInput(updateTaskSchema, {
      status: 'invalid_status',
    });
    if (validation.success) {
      throw new Error('Should reject invalid status');
    }
  });
}

// Output Results
function outputResults(): void {
  console.log('\n==========================================');
  console.log('Test Results');
  console.log('==========================================');
  console.log(`Total: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log('==========================================\n');

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(results, null, 2));
  } else if (results.failed > 0) {
    console.log('Failed Tests:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(`  - ${t.name}`);
        console.log(`    Error: ${t.message}`);
      });
  }

  if (results.failed > 0) {
    process.exit(1);
  }
}

// Main execution
(async () => {
  try {
    await runTests();
    outputResults();
    console.log('All tests passed! ✓\n');
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
})();
