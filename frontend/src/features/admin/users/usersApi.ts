import { apiRequest, type BaseResponse, type Page } from '@/lib/apiClient';

export type UserRole = 'USER' | 'ADMIN';

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserFilters = {
  role?: UserRole;
  emailVerified?: boolean;
  deleted?: boolean;
};

export type PageRequest = {
  page?: number;
  size?: number;
};

export type AdminUserEditValues = {
  username: string;
  email: string;
};

// The backend response is not trusted verbatim: only these known fields are
// ever read off it, so an unexpected field (e.g. a token hash) can never
// reach the UI even if the API were to start returning one.
function toAdminUser(raw: AdminUser): AdminUser {
  return {
    createdAt: raw.createdAt,
    deleted: raw.deleted,
    email: raw.email,
    emailVerified: raw.emailVerified,
    id: raw.id,
    role: raw.role,
    updatedAt: raw.updatedAt,
    username: raw.username,
  };
}

export async function listUsers(
  filters: AdminUserFilters = {},
  pageRequest: PageRequest = {},
): Promise<Page<AdminUser>> {
  const result = await get<Page<AdminUser>>('/api/admin/users', {
    ...filters,
    ...pageRequest,
  });

  return { ...result, content: result.content.map(toAdminUser) };
}

export function deleteUser(id: string) {
  return apiRequest<void>(`/api/admin/users/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function restoreUser(id: string): Promise<AdminUser> {
  const response = await apiRequest<BaseResponse<AdminUser>>(
    `/api/admin/users/${id}/restore`,
    { auth: true, method: 'POST' },
  );
  return toAdminUser(response.data);
}

export async function updateUser(
  id: string,
  values: AdminUserEditValues,
): Promise<AdminUser> {
  const response = await apiRequest<BaseResponse<AdminUser>>(
    `/api/admin/users/${id}`,
    { auth: true, body: JSON.stringify(values), method: 'PUT' },
  );
  return toAdminUser(response.data);
}

async function get<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const response = await apiRequest<BaseResponse<T>>(
    `${path}${toQuery(params)}`,
    { auth: true },
  );

  return response.data;
}

function toQuery(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}
