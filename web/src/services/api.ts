import type { 
  ProjectSummary, 
  ProjectDetail, 
  ProjectCreate, 
  ProjectUpdate,
  ApplicationSummary, 
  ModuleSummary, 
  ModuleDetail, 
  BatchProcessResponse,
  AgentChatRequest,
  AgentChatResponse,
  AgentStatus,
  TemplateResponse
} from '../types/api';


const BASE_URL = '/api/v1';

export const api = {
  // Health check (FastAPI root level /health)
  async checkHealth(): Promise<{ status: string; app: string; version: string }> {
    const res = await fetch('/health');
    if (!res.ok) throw new Error('API server unreachable');
    return res.json();
  },

  // Projects
  async getProjects(): Promise<ProjectSummary[]> {
    const res = await fetch(`${BASE_URL}/projects`);
    if (!res.ok) throw new Error('Gagal mengambil daftar project');
    const data = await res.json();
    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.project_name || p.name || 'Unnamed Project',
      project_name: p.project_name || p.name || 'Unnamed Project',
      platform: p.platform || null,
      business_unit: p.business_unit || null,
      project_manager: p.project_manager || null,
      technical_leader: p.technical_leader || null,
      start_date: p.start_date || null,
      go_live_date: p.go_live_date || null,
      doc_version: p.doc_version || '1.0',
      doc_status: p.doc_status || 'Draft',
      description: p.background || p.description || null,
      background: p.background || null,
      objectives: p.objectives || null,
      created_at: p.created_at,
      updated_at: p.updated_at,
      total_applications: Array.isArray(p.applications) ? p.applications.length : (p.total_applications || 0),
    }));
  },

  async getProjectDetail(projectId: string): Promise<ProjectDetail> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}`);
    if (!res.ok) throw new Error(`Project dengan ID ${projectId} tidak ditemukan`);
    const p = await res.json();
    return {
      id: p.id,
      name: p.project_name || p.name || 'Unnamed Project',
      project_name: p.project_name || p.name || 'Unnamed Project',
      platform: p.platform || null,
      business_unit: p.business_unit || null,
      project_manager: p.project_manager || null,
      technical_leader: p.technical_leader || null,
      start_date: p.start_date || null,
      go_live_date: p.go_live_date || null,
      doc_version: p.doc_version || '1.0',
      doc_status: p.doc_status || 'Draft',
      description: p.background || p.description || null,
      background: p.background || null,
      objectives: p.objectives || null,
      created_at: p.created_at,
      updated_at: p.updated_at,
      total_applications: Array.isArray(p.applications) ? p.applications.length : (p.total_applications || 0),
      applications: (p.applications || []).map((app: any) => ({
        id: app.id,
        name: app.name || app.filename || 'Unnamed App',
        file_type: app.file_type,
        file_size: app.file_size_bytes,
        status: app.status,
        total_modules: app.total_modules || (app.modules ? app.modules.length : 0),
        project_id: app.project_id,
        created_at: app.created_at,
        updated_at: app.updated_at,
      })),
    };
  },

  async createProject(data: ProjectCreate): Promise<ProjectSummary> {
    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_name: data.project_name || data.name,
        platform: data.platform || null,
        business_unit: data.business_unit || null,
        project_manager: data.project_manager || null,
        technical_leader: data.technical_leader || null,
        start_date: data.start_date || null,
        go_live_date: data.go_live_date || null,
        doc_version: data.doc_version || '1.0',
        doc_status: data.doc_status || 'Draft',
        background: data.background || data.description || '',
        objectives: data.objectives || '',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Gagal membuat project baru');
    }
    const p = await res.json();
    return {
      id: p.id,
      name: p.project_name || p.name,
      project_name: p.project_name || p.name,
      platform: p.platform || null,
      business_unit: p.business_unit || null,
      project_manager: p.project_manager || null,
      technical_leader: p.technical_leader || null,
      start_date: p.start_date || null,
      go_live_date: p.go_live_date || null,
      doc_version: p.doc_version || '1.0',
      doc_status: p.doc_status || 'Draft',
      description: p.background || p.description || null,
      background: p.background || null,
      objectives: p.objectives || null,
      created_at: p.created_at,
      updated_at: p.updated_at,
      total_applications: 0,
    };
  },

  async updateProject(projectId: string, data: ProjectUpdate): Promise<ProjectSummary> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Gagal memperbarui informasi project');
    }
    const p = await res.json();
    return {
      id: p.id,
      name: p.project_name || p.name,
      project_name: p.project_name || p.name,
      platform: p.platform || null,
      business_unit: p.business_unit || null,
      project_manager: p.project_manager || null,
      technical_leader: p.technical_leader || null,
      start_date: p.start_date || null,
      go_live_date: p.go_live_date || null,
      doc_version: p.doc_version || '1.0',
      doc_status: p.doc_status || 'Draft',
      description: p.background || p.description || null,
      background: p.background || null,
      objectives: p.objectives || null,
      created_at: p.created_at,
      updated_at: p.updated_at,
      total_applications: Array.isArray(p.applications) ? p.applications.length : (p.total_applications || 0),
    };
  },

  async deleteProject(projectId: string): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Gagal menghapus project');
    return res.json();
  },

  async getProjectApplications(projectId: string): Promise<ApplicationSummary[]> {
    const res = await fetch(`${BASE_URL}/projects/${projectId}/applications`);
    if (!res.ok) throw new Error('Gagal mengambil daftar aplikasi');
    const data = await res.json();
    return (data || []).map((app: any) => ({
      id: app.id,
      name: app.name || app.filename || 'Unnamed App',
      file_type: app.file_type,
      file_size: app.file_size_bytes,
      status: app.status,
      total_modules: app.total_modules || 0,
      project_id: app.project_id,
      created_at: app.created_at,
      updated_at: app.updated_at,
    }));
  },

  // Applications
  async getApplications(): Promise<ApplicationSummary[]> {
    const res = await fetch(`${BASE_URL}/applications`);
    if (!res.ok) throw new Error('Gagal mengambil daftar aplikasi');
    const data = await res.json();
    return (data || []).map((app: any) => ({
      id: app.id,
      name: app.name || app.filename || 'Unnamed App',
      file_type: app.file_type,
      file_size: app.file_size_bytes,
      status: app.status,
      total_modules: app.total_modules || 0,
      project_id: app.project_id,
      created_at: app.created_at,
      updated_at: app.updated_at,
    }));
  },

  async getApplicationDetail(appId: string): Promise<ApplicationSummary & { modules: ModuleSummary[] }> {
    const res = await fetch(`${BASE_URL}/applications/${appId}`);
    if (!res.ok) throw new Error('Aplikasi tidak ditemukan');
    const app = await res.json();
    return {
      id: app.id,
      name: app.name || app.filename || 'Unnamed App',
      file_type: app.file_type,
      file_size: app.file_size_bytes,
      status: app.status,
      total_modules: app.total_modules || (app.modules ? app.modules.length : 0),
      project_id: app.project_id,
      created_at: app.created_at,
      updated_at: app.updated_at,
      modules: (app.modules || []).map((m: any) => ({
        id: m.id,
        application_id: m.application_id,
        module_name: m.name || m.module_filename || 'Unnamed Module',
        module_suffix: m.suffix || null,
        espace_key: m.espace_key || null,
        status: 'COMPLETED',
        created_at: m.created_at,
        updated_at: m.created_at,
      })),
    };
  },

  async getApplicationModules(appId: string): Promise<ModuleSummary[]> {
    const res = await fetch(`${BASE_URL}/applications/${appId}/modules`);
    if (!res.ok) throw new Error('Gagal mengambil daftar modul');
    const data = await res.json();
    return (data || []).map((m: any) => ({
      id: m.id,
      application_id: m.application_id,
      module_name: m.name || m.module_filename || 'Unnamed Module',
      module_suffix: m.suffix || null,
      espace_key: m.espace_key || null,
      status: 'COMPLETED',
      created_at: m.created_at,
      updated_at: m.created_at,
    }));
  },

  // Modules
  async getModuleDetail(moduleId: string): Promise<ModuleDetail> {
    const res = await fetch(`${BASE_URL}/modules/${moduleId}`);
    if (!res.ok) throw new Error('Modul tidak ditemukan');
    const m = await res.json();
    return {
      id: m.id,
      application_id: m.application_id,
      module_name: m.name || m.module_filename || 'Unnamed Module',
      module_suffix: m.suffix || null,
      espace_key: m.espace_key || null,
      status: 'COMPLETED',
      created_at: m.created_at,
      updated_at: m.created_at,
      response_data: m.parsed_data || null,
    };
  },

  async getModuleData(moduleId: string): Promise<Record<string, any>> {
    const res = await fetch(`${BASE_URL}/modules/${moduleId}/data`);
    if (!res.ok) throw new Error('Gagal mengambil respon data mentah modul');
    return res.json();
  },

  async getModuleEntities(moduleId: string, search?: string, isStatic?: boolean): Promise<any> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (isStatic !== undefined) params.append('is_static', String(isStatic));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${BASE_URL}/modules/${moduleId}/entities${qs}`);
    if (!res.ok) throw new Error('Gagal mengambil data entities modul');
    return res.json();
  },

  async getApplicationEntities(appId: string, search?: string, isStatic?: boolean): Promise<any[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (isStatic !== undefined) params.append('is_static', String(isStatic));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${BASE_URL}/applications/${appId}/entities${qs}`);
    if (!res.ok) throw new Error('Gagal mengambil entities aplikasi');
    return res.json();
  },

  // Upload & Parse OAP / OML File
  async uploadFile(file: File, projectId?: string): Promise<BatchProcessResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const url = projectId 
      ? `${BASE_URL}/oml/parse?project_id=${encodeURIComponent(projectId)}`
      : `${BASE_URL}/oml/parse`;

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Gagal memproses dan mengunggah file');
    }

    return res.json();
  },

  // ==========================================
  // AGENTIC AI ASSISTANT
  // ==========================================
  async sendAgentChat(request: AgentChatRequest): Promise<AgentChatResponse> {
    const res = await fetch(`${BASE_URL}/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Gagal memproses percakapan dengan AI');
    }
    return res.json();
  },

  async getAgentStatus(): Promise<AgentStatus> {
    const res = await fetch(`${BASE_URL}/agent/status`);
    if (!res.ok) throw new Error('Gagal memeriksa status AI Agent');
    return res.json();
  },

  async getAgentTools(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/agent/tools`);
    if (!res.ok) throw new Error('Gagal mengambil daftar tools AI');
    return res.json();
  },

  async getTechnicalDocTemplate(): Promise<TemplateResponse> {
    const res = await fetch(`${BASE_URL}/agent/template`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Gagal memuat template dokumen spesifikasi teknis');
    }
    return res.json();
  },
};


