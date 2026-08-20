export interface ProjectSummary {
  id: string;
  name: string;
  project_name?: string;
  platform?: string | null;
  business_unit?: string | null;
  project_manager?: string | null;
  technical_leader?: string | null;
  start_date?: string | null;
  go_live_date?: string | null;
  doc_version?: string | null;
  doc_status?: string | null;
  description?: string | null;
  background?: string | null;
  objectives?: string | null;
  created_at: string;
  updated_at: string;
  total_applications: number;
}

export interface ProjectCreate {
  name: string;
  project_name?: string;
  platform?: string;
  business_unit?: string;
  project_manager?: string;
  technical_leader?: string;
  start_date?: string;
  go_live_date?: string;
  doc_version?: string;
  doc_status?: string;
  description?: string;
  background?: string;
  objectives?: string;
}

export interface ProjectUpdate {
  project_name?: string;
  platform?: string;
  business_unit?: string;
  project_manager?: string;
  technical_leader?: string;
  start_date?: string;
  go_live_date?: string;
  doc_version?: string;
  doc_status?: string;
  background?: string;
  objectives?: string;
}

export interface ApplicationSummary {
  id: string;
  name: string;
  file_type: string;
  file_size?: number;
  status: string;
  total_modules: number;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends ProjectSummary {
  applications: ApplicationSummary[];
}

export interface ModuleSummary {
  id: string;
  application_id: string;
  module_name: string;
  module_suffix: string | null;
  espace_key: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ModuleDetail extends ModuleSummary {
  response_data: Record<string, any> | null;
  application?: ApplicationSummary;
}

export interface BatchProcessResponse {
  message: string;
  total_files: number;
  results: {
    filename: string;
    success: boolean;
    error: string | null;
    module_info: Record<string, any> | null;
    data: Record<string, any> | null;
  }[];
}

// ==========================================
// AGENTIC AI CHAT INTERFACES
// ==========================================

export interface AgentChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: ToolCallTrace[];
  timestamp?: string;
  isError?: boolean;
}

export interface ChatContextInfo {
  project_id?: string;
  application_id?: string;
  application_name?: string;
  module_id?: string;
  module_name?: string;
}

export interface ToolCallTrace {
  id?: string;
  tool_name: string;
  arguments: Record<string, any>;
  result_preview?: string;
}

export interface AgentChatRequest {
  messages: {
    role: string;
    content: string;
  }[];
  context?: ChatContextInfo;
  model?: string;
  temperature?: number;
}

export interface AgentChatResponse {
  role: string;
  content: string;
  tool_calls: ToolCallTrace[];
  model: string;
  usage?: Record<string, any>;
  iterations: number;
}

export interface AgentStatus {
  is_configured: boolean;
  base_url: string;
  active_model: string;
  total_tools_available: number;
}

export interface TemplateResponse {
  status: string;
  template_name: string;
  filename: string;
  total_lines: number;
  template_content: string;
}

export interface DocumentSection {
  id: string;
  title: string;
  level: number;
  lineStart: number;
  lineEnd: number;
}


