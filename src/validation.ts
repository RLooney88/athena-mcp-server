// Input Validation using Zod
import { z } from 'zod';

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const taskListParamsSchema = paginationSchema.extend({
  include_completed: z.boolean().optional(),
  needs_review: z.boolean().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignee_id: z.string().uuid().optional().or(z.literal('')),
  category_id: z.string().optional(),
  due_date: z.string().datetime().optional(),
  work_for_type: z.string().optional(),
  work_for_id: z.string().optional(),
});

export const updateTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignee_id: z.string().uuid().optional().or(z.literal('')),
  category_id: z.string().optional(),
  due_date: z.string().datetime().optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(10000),
});

export const createSubtaskSchema = z.object({
  title: z.string().min(1).max(500),
});

export const createDeliverableSchema = z.object({
  type: z.enum(['link', 'file']),
  title: z.string().min(1).max(500),
  url: z.string().url().optional(),
  file_path: z.string().optional(),
}).refine((data) => {
  if (data.type === 'link' && !data.url) {
    return false;
  }
  return true;
}, {
  message: 'URL is required for link type deliverables',
  path: ['url'],
});

export const searchUsersSchema = z.object({
  q: z.string().min(1),
  limit: z.number().min(1).max(50).optional(),
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  return { success: false, error: errors.join('; ') };
}
