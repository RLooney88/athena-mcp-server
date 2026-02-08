// Athena API Type Definitions

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee_id?: string;
  assignee?: User;
  created_by: string;
  category_id: string;
  category?: Category;
  due_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  needs_review: boolean;
  work_for_type?: string;
  work_for_id?: string;
  subtasks?: Subtask[];
  deliverables?: Deliverable[];
  comments_count?: number;
  unread_comments_count?: number;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  user?: User;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deliverable {
  id: string;
  task_id: string;
  type: 'link' | 'file';
  title: string;
  url?: string;
  file_path?: string;
  mime_type?: string;
  size?: number;
  created_by: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  parent_id?: string;
  sort_order?: number;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface TaskListParams extends PaginationParams {
  include_completed?: boolean;
  needs_review?: boolean;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee_id?: string;
  category_id?: string;
  due_date?: string;
  work_for_type?: string;
  work_for_id?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee_id?: string;
  category_id?: string;
  due_date?: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface CreateSubtaskRequest {
  title: string;
}

export interface CreateDeliverableRequest {
  type: 'link' | 'file';
  title: string;
  url?: string;
  file_path?: string;
}

export interface TaskListResponse {
  tasks: Task[];
  cursor?: string;
  has_more: boolean;
  total_count?: number;
}

export interface PaginatedCommentsResponse {
  comments: Comment[];
  cursor?: string;
  has_more: boolean;
}

export interface ReviewCountResponse {
  count: number;
}

export interface UnreadCommentsResponse {
  count: number;
}

export interface SearchUsersResponse {
  users: User[];
}

export interface SearchProjectsResponse {
  projects: { id: string; name: string; type: string }[];
}
