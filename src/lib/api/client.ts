/**
 * API client for Hobby Inventory backend
 * All endpoints are at /api/* on the same origin
 */

const API_BASE = '/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  total?: number;
  limit?: number;
  offset?: number;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!response.ok) {
        if (isJson) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error || `HTTP ${response.status}`);
        } else {
          // Not JSON, probably an error page or the server is down
          throw new Error(`Server returned ${response.status}. Make sure the backend is running at http://localhost:3000/api/`);
        }
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      // Try to parse as JSON, but handle non-JSON responses gracefully
      if (!isJson) {
        throw new Error('Server returned non-JSON response. Make sure the backend is running at http://localhost:3000/api/');
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error. Make sure the backend is running at http://localhost:3000/api/');
    }
  }

  // Health
  async getHealth() {
    return this.request<{ status: string; timestamp: string; version: string }>('/health');
  }

  // Parts
  async getParts(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    category?: string;
    archived?: boolean;
  }) {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.archived !== undefined) query.append('archived', params.archived.toString());

    return this.request<ApiResponse<any[]>>(`/parts?${query}`);
  }

  async getPart(id: string) {
    return this.request<ApiResponse<any>>(`/parts/${id}`);
  }

  async createPart(data: any) {
    return this.request<any>('/parts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePart(id: string, data: any) {
    return this.request<any>(`/parts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePart(id: string) {
    return this.request<any>(`/parts/${id}`, {
      method: 'DELETE',
    });
  }

  // Lots
  async getLots(params?: {
    limit?: number;
    offset?: number;
    q?: string;
    status?: string;
    locationId?: string;
    projectId?: string;
    partId?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    if (params?.q) query.append('q', params.q);
    if (params?.status) query.append('status', params.status);
    if (params?.locationId) query.append('locationId', params.locationId);
    if (params?.projectId) query.append('projectId', params.projectId);
    if (params?.partId) query.append('partId', params.partId);

    return this.request<ApiResponse<any[]>>(`/lots?${query}`);
  }

  async getLot(id: string) {
    return this.request<ApiResponse<any>>(`/lots/${id}`);
  }

  async createLot(data: any) {
    return this.request<any>('/lots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLot(id: string, data: any) {
    return this.request<any>(`/lots/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async moveLot(id: string, locationId: string, notes?: string) {
    return this.request<any>(`/lots/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ locationId, notes }),
    });
  }

  // Locations
  async getLocations(params?: {
    tree?: boolean;
    q?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.tree) query.append('tree', 'true');
    if (params?.q) query.append('q', params.q);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    return this.request<ApiResponse<any[]>>(`/locations?${query}`);
  }

  async getLocation(id: string) {
    return this.request<ApiResponse<any>>(`/locations/${id}`);
  }

  async createLocation(data: any) {
    return this.request<any>('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLocation(id: string, data: any) {
    return this.request<any>(`/locations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteLocation(id: string) {
    return this.request<void>(`/locations/${id}`, {
      method: 'DELETE',
    });
  }

  // Projects
  async getProjects(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    tags?: string;
    includeArchived?: boolean;
  }) {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.tags) query.append('tags', params.tags);
    if (params?.includeArchived) query.append('includeArchived', 'true');

    return this.request<ApiResponse<any[]>>(`/projects?${query}`);
  }

  async getProject(id: string) {
    return this.request<ApiResponse<any>>(`/projects/${id}`);
  }

  async createProject(data: any) {
    return this.request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: any) {
    return this.request<any>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request<any>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Allocations
  async getAllocations(params?: {
    limit?: number;
    offset?: number;
    lotId?: string;
    projectId?: string;
    status?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    if (params?.lotId) query.append('lotId', params.lotId);
    if (params?.projectId) query.append('projectId', params.projectId);
    if (params?.status) query.append('status', params.status);

    return this.request<ApiResponse<any[]>>(`/allocations?${query}`);
  }

  async createAllocation(data: any) {
    return this.request<any>('/allocations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAllocation(id: string, data: any) {
    return this.request<any>(`/allocations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async returnAllocation(id: string) {
    return this.request<any>(`/allocations/${id}/return`, {
      method: 'POST',
    });
  }

  async scrapAllocation(id: string) {
    return this.request<any>(`/allocations/${id}/scrap`, {
      method: 'POST',
    });
  }

  // Events
  async getEvents(params?: {
    limit?: number;
    offset?: number;
    lotId?: string;
    partId?: string;
    projectId?: string;
    type?: string;
    since?: string;
    until?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    if (params?.lotId) query.append('lotId', params.lotId);
    if (params?.partId) query.append('partId', params.partId);
    if (params?.projectId) query.append('projectId', params.projectId);
    if (params?.type) query.append('type', params.type);
    if (params?.since) query.append('since', params.since);
    if (params?.until) query.append('until', params.until);

    return this.request<ApiResponse<any[]>>(`/events?${query}`);
  }

  // Categories
  async getCategories(params?: {
    limit?: number;
    offset?: number;
    includeDefaults?: boolean;
  }) {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    if (params?.includeDefaults !== undefined) {
      query.append('includeDefaults', params.includeDefaults.toString());
    }

    return this.request<ApiResponse<any[]>>(`/categories?${query}`);
  }
}

export const api = new ApiClient();