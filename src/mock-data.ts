// Mock Data Fixtures for Athena MCP Server Offline Testing
// This file provides mock data to test all MCP tools without a real API connection

// Mock Users
export const mockUsers = [
  { id: 'user-1', name: 'John Doe', email: 'john.doe@example.com', role: 'developer' },
  { id: 'user-2', name: 'Jane Smith', email: 'jane.smith@example.com', role: 'manager' },
  { id: 'user-3', name: 'Bob Wilson', email: 'bob.wilson@example.com', role: 'designer' },
];

// Mock Categories
export const mockCategories = [
  { id: 'cat-1', name: 'Development', color: '#3B82F6', icon: 'code', sort_order: 1 },
  { id: 'cat-2', name: 'Design', color: '#8B5CF6', icon: 'palette', sort_order: 2 },
  { id: 'cat-3', name: 'Marketing', color: '#10B981', icon: 'megaphone', sort_order: 3 },
  { id: 'cat-4', name: 'Operations', color: '#F59E0B', icon: 'cog', sort_order: 4 },
];

// Mock Tasks
export const mockTasks = [
  {
    id: 'task-1',
    title: 'Implement user authentication',
    description: 'Add OAuth2 authentication with Google and GitHub providers',
    status: 'in_progress',
    priority: 'high',
    assignee_id: 'user-1',
    created_by: 'user-2',
    category_id: 'cat-1',
    due_date: '2024-03-15T17:00:00Z',
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-05T14:30:00Z',
    needs_review: false,
    comments_count: 5,
    unread_comments_count: 2,
  },
  {
    id: 'task-2',
    title: 'Design new landing page',
    description: 'Create wireframes and mockups for the new marketing landing page',
    status: 'pending',
    priority: 'medium',
    assignee_id: 'user-3',
    created_by: 'user-2',
    category_id: 'cat-2',
    due_date: '2024-03-20T17:00:00Z',
    created_at: '2024-03-02T09:00:00Z',
    updated_at: '2024-03-02T09:00:00Z',
    needs_review: false,
    comments_count: 0,
    unread_comments_count: 0,
  },
  {
    id: 'task-3',
    title: 'Fix memory leak in dashboard',
    description: 'Investigate and fix memory leak causing dashboard to slow down over time',
    status: 'in_progress',
    priority: 'critical',
    assignee_id: 'user-1',
    created_by: 'user-1',
    category_id: 'cat-1',
    created_at: '2024-03-03T11:00:00Z',
    updated_at: '2024-03-04T16:00:00Z',
    needs_review: true,
    comments_count: 3,
    unread_comments_count: 1,
  },
  {
    id: 'task-4',
    title: 'Update API documentation',
    description: 'Review and update API documentation for v2 endpoints',
    status: 'completed',
    priority: 'low',
    assignee_id: 'user-1',
    created_by: 'user-2',
    category_id: 'cat-1',
    completed_at: '2024-03-01T15:00:00Z',
    created_at: '2024-02-25T10:00:00Z',
    updated_at: '2024-03-01T15:00:00Z',
    needs_review: false,
    comments_count: 2,
    unread_comments_count: 0,
  },
];

// Mock Comments
export const mockComments = [
  {
    id: 'comment-1',
    task_id: 'task-1',
    user_id: 'user-2',
    content: 'Looking good! Just make sure to handle edge cases for expired tokens.',
    is_read: true,
    created_at: '2024-03-04T10:00:00Z',
    updated_at: '2024-03-04T10:00:00Z',
  },
  {
    id: 'comment-2',
    task_id: 'task-1',
    user_id: 'user-1',
    content: "Good point! I'll add token refresh logic and error handling.",
    is_read: true,
    created_at: '2024-03-04T11:30:00Z',
    updated_at: '2024-03-04T11:30:00Z',
  },
];

// Mock Subtasks
export const mockSubtasks = [
  { id: 'subtask-1', task_id: 'task-1', title: 'Set up OAuth2 providers', is_completed: true, created_at: '2024-03-01T10:30:00Z', updated_at: '2024-03-02T14:00:00Z' },
  { id: 'subtask-2', task_id: 'task-1', title: 'Implement login flow', is_completed: true, created_at: '2024-03-02T14:30:00Z', updated_at: '2024-03-03T11:00:00Z' },
  { id: 'subtask-3', task_id: 'task-1', title: 'Add session management', is_completed: false, created_at: '2024-03-03T11:30:00Z', updated_at: '2024-03-03T11:30:00Z' },
];

// Mock Deliverables
export const mockDeliverables = [
  { id: 'deliv-1', task_id: 'task-1', type: 'link', title: 'OAuth2 Specification', url: 'https://docs.example.com/oauth2', created_by: 'user-1', created_at: '2024-03-01T11:00:00Z' },
  { id: 'deliv-2', task_id: 'task-1', type: 'file', title: 'Architecture Diagram', file_path: '/uploads/architecture.png', mime_type: 'image/png', size: 245000, created_by: 'user-1', created_at: '2024-03-02T14:00:00Z' },
];

// Mock Data Store
export class MockDataStore {
  private tasks = [...mockTasks];
  private subtasks = [...mockSubtasks];
  private comments = [...mockComments];
  private deliverables = [...mockDeliverables];
  
  getTasks() { return this.tasks; }
  getTask(id: string) { return this.tasks.find(t => t.id === id); }
  getComments(taskId: string) { return this.comments.filter(c => c.task_id === taskId); }
  getSubtasks(taskId: string) { return this.subtasks.filter(s => s.task_id === taskId); }
  getDeliverables(taskId: string) { return this.deliverables.filter(d => d.task_id === taskId); }
  getCategories() { return mockCategories; }
  searchUsers(query: string) {
    const q = query.toLowerCase();
    return mockUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }
  getUnreadCommentsCount() { return this.comments.filter(c => !c.is_read).length; }
  getReviewCount() { return this.tasks.filter(t => t.needs_review).length; }
}

export const mockStore = new MockDataStore();
