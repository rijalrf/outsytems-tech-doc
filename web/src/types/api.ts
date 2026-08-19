export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  total_applications: number;
}

export interface ProjectCreate {
  name: string;
  description?: string;
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
