import {
  taskListParamsSchema,
  createTaskSchema,
  updateTaskSchema,
  createCommentSchema,
  createSubtaskSchema,
  createDeliverableSchema,
  searchUsersSchema,
  validateInput,
} from '../src/validation.js';
import { mockStore } from '../src/mock-data.js';

describe('Validation Tests', () => {
  describe('taskListParamsSchema', () => {
    it('should accept valid pagination params', () => {
      const result = validateInput(taskListParamsSchema, { cursor: 'abc123', limit: 20 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ cursor: 'abc123', limit: 20 });
    });

    it('should accept empty params', () => {
      const result = validateInput(taskListParamsSchema, {});
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should reject invalid limit', () => {
      const result = validateInput(taskListParamsSchema, { limit: 200 });
      expect(result.success).toBe(false);
    });

    it('should reject negative limit', () => {
      const result = validateInput(taskListParamsSchema, { limit: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe('createTaskSchema', () => {
    it('should accept valid task data', () => {
      const result = validateInput(createTaskSchema, {
        title: 'Test Task',
        description: 'A test task description',
        priority: 'high',
      });
      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Test Task');
    });

    it('should reject empty title', () => {
      const result = validateInput(createTaskSchema, { title: '' });
      expect(result.success).toBe(false);
    });

    it('should reject title too long', () => {
      const result = validateInput(createTaskSchema, {
        title: 'x'.repeat(600),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid priority', () => {
      const result = validateInput(createTaskSchema, {
        title: 'Test',
        priority: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const result = validateInput(createTaskSchema, {
        title: 'Test Task',
        assignee_id: 'user-1',
        category_id: 'cat-1',
        due_date: '2024-03-15T17:00:00Z',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateTaskSchema', () => {
    it('should accept partial updates', () => {
      const result = validateInput(updateTaskSchema, {
        title: 'Updated Title',
      });
      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Updated Title');
    });

    it('should accept status update', () => {
      const result = validateInput(updateTaskSchema, {
        status: 'completed',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = validateInput(updateTaskSchema, {
        status: 'invalid_status',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createCommentSchema', () => {
    it('should accept valid comment', () => {
      const result = validateInput(createCommentSchema, {
        content: 'This is a test comment',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty comment', () => {
      const result = validateInput(createCommentSchema, { content: '' });
      expect(result.success).toBe(false);
    });

    it('should reject comment too long', () => {
      const result = validateInput(createCommentSchema, {
        content: 'x'.repeat(11000),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createSubtaskSchema', () => {
    it('should accept valid subtask', () => {
      const result = validateInput(createSubtaskSchema, {
        title: 'Subtask Title',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const result = validateInput(createSubtaskSchema, { title: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('createDeliverableSchema', () => {
    it('should accept valid link deliverable', () => {
      const result = validateInput(createDeliverableSchema, {
        type: 'link',
        title: 'Documentation',
        url: 'https://example.com/docs',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid file deliverable', () => {
      const result = validateInput(createDeliverableSchema, {
        type: 'file',
        title: 'Design Mockup',
        file_path: '/uploads/design.png',
      });
      expect(result.success).toBe(true);
    });

    it('should reject link without URL', () => {
      const result = validateInput(createDeliverableSchema, {
        type: 'link',
        title: 'No URL',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type', () => {
      const result = validateInput(createDeliverableSchema, {
        type: 'invalid',
        title: 'Test',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('searchUsersSchema', () => {
    it('should accept valid search query', () => {
      const result = validateInput(searchUsersSchema, { q: 'john' });
      expect(result.success).toBe(true);
    });

    it('should reject empty query', () => {
      const result = validateInput(searchUsersSchema, { q: '' });
      expect(result.success).toBe(false);
    });

    it('should accept optional limit', () => {
      const result = validateInput(searchUsersSchema, { q: 'john', limit: 10 });
      expect(result.success).toBe(true);
    });
  });
});

describe('Mock Data Tests', () => {
  describe('Task Store', () => {
    it('should list all tasks', () => {
      const tasks = mockStore.getTasks();
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should filter completed tasks', () => {
      const tasks = mockStore.getTasks({ include_completed: false });
      expect(tasks.every((t) => t.status !== 'completed')).toBe(true);
    });

    it('should filter tasks needing review', () => {
      const tasks = mockStore.getTasks({ needs_review: true });
      expect(tasks.every((t) => t.needs_review)).toBe(true);
    });

    it('should get task by ID', () => {
      const task = mockStore.getTask('task-1');
      expect(task).toBeDefined();
      expect(task?.title).toBe('Implement user authentication');
    });

    it('should create new task', () => {
      const newTask = mockStore.createTask({
        title: 'New Test Task',
        description: 'Test description',
        priority: 'high',
      });
      
      expect(newTask.id).toBeDefined();
      expect(newTask.title).toBe('New Test Task');
      expect(newTask.status).toBe('pending');
    });

    it('should update task', () => {
      const updated = mockStore.updateTask('task-1', {
        status: 'completed',
      });
      
      expect(updated?.status).toBe('completed');
      expect(updated?.completed_at).toBeDefined();
    });
  });

  describe('Comment Store', () => {
    it('should get comments for task', () => {
      const comments = mockStore.getComments('task-1');
      expect(comments.length).toBeGreaterThan(0);
      expect(comments.every((c) => c.task_id === 'task-1')).toBe(true);
    });

    it('should add comment to task', () => {
      const newComment = mockStore.addComment('task-1', 'Test comment');
      
      expect(newComment.id).toBeDefined();
      expect(newComment.content).toBe('Test comment');
    });
  });

  describe('Subtask Store', () => {
    it('should get subtasks for task', () => {
      const subtasks = mockStore.getSubtasks('task-1');
      expect(subtasks.length).toBeGreaterThan(0);
      expect(subtasks.every((s) => s.task_id === 'task-1')).toBe(true);
    });

    it('should create subtask', () => {
      const newSubtask = mockStore.createSubtask('task-1', 'New subtask');
      
      expect(newSubtask.id).toBeDefined();
      expect(newSubtask.title).toBe('New subtask');
      expect(newSubtask.is_completed).toBe(false);
    });

    it('should delete subtask', () => {
      const result = mockStore.deleteSubtask('subtask-1');
      expect(result).toBe(true);
      
      const subtasks = mockStore.getSubtasks('task-1');
      expect(subtasks.find((s) => s.id === 'subtask-1')).toBeUndefined();
    });
  });

  describe('Deliverable Store', () => {
    it('should get deliverables for task', () => {
      const deliverables = mockStore.getDeliverables('task-1');
      expect(deliverables.length).toBeGreaterThan(0);
    });

    it('should create deliverable', () => {
      const newDeliverable = mockStore.createDeliverable('task-1', {
        type: 'link',
        title: 'New Link',
        url: 'https://example.com',
      });
      
      expect(newDeliverable.id).toBeDefined();
      expect(newDeliverable.type).toBe('link');
    });
  });

  describe('User Search', () => {
    it('should find users by name', () => {
      const users = mockStore.searchUsers('John');
      expect(users.length).toBeGreaterThan(0);
      expect(users[0].name).toContain('John');
    });

    it('should find users by email', () => {
      const users = mockStore.searchUsers('jane');
      expect(users.length).toBeGreaterThan(0);
    });

    it('should return empty for no matches', () => {
      const users = mockStore.searchUsers('nonexistent');
      expect(users.length).toBe(0);
    });
  });

  describe('Categories', () => {
    it('should return all categories', () => {
      const categories = mockStore.getCategories();
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('Counts', () => {
    it('should return unread comments count', () => {
      const count = mockStore.getUnreadCommentsCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should return review count', () => {
      const count = mockStore.getReviewCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
