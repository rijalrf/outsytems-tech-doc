-- ================================================================
-- OUTSYSTEMS APPLICATION & MODULE DATABASE SCHEMA (PostgreSQL)
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL PROJECTS (Menyimpan Informasi Project/Dokumen Master)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name VARCHAR(150) NOT NULL,
    platform VARCHAR(100) NULL,
    business_unit VARCHAR(100) NULL,
    project_manager VARCHAR(100) NULL,
    technical_leader VARCHAR(100) NULL,
    start_date DATE NULL,
    go_live_date DATE NULL,
    doc_version VARCHAR(20) DEFAULT '1.0',
    doc_status VARCHAR(50) DEFAULT 'Draft',
    background VARCHAR(2000) NULL,
    objectives VARCHAR(2000) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(project_name);

-- 2. TABEL APLIKASI (Menyimpan Metadata Paket .oap / File .oml)
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NULL,
    name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(10) NOT NULL, -- 'oap' atau 'oml'
    file_size_bytes BIGINT NOT NULL,
    file_hash VARCHAR(64) NULL,     -- SHA-256 Checksum
    total_modules INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    error_message TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT fk_project_application
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_applications_project_id ON applications(project_id);
CREATE INDEX IF NOT EXISTS idx_applications_name ON applications(name);
CREATE INDEX IF NOT EXISTS idx_applications_hash ON applications(file_hash);

-- 2. TABEL MODUL (Menyimpan Metadata Modul, Suffix & Response JSON)
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL,
    name VARCHAR(255) NULL,
    suffix VARCHAR(50) NULL,        -- Suffix nama modul (contoh: 'CS', 'WEB', 'BL', 'CW')
    module_filename VARCHAR(255) NOT NULL,
    espace_key VARCHAR(100) NULL,
    user_provider_espace VARCHAR(255) NULL,
    default_transition VARCHAR(100) NULL,
    use_cookies VARCHAR(10) NULL,
    web_screen_rendering_mode VARCHAR(100) NULL,
    module_type VARCHAR(100) NULL,
    
    -- Kolom JSONB menampung seluruh isi response API (Actions, Entities, Structures, dll.)
    parsed_data JSONB NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Foreign Key ke tabel applications
    CONSTRAINT fk_application_module 
        FOREIGN KEY (application_id) 
        REFERENCES applications(id) 
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_modules_app_id ON modules(application_id);
CREATE INDEX IF NOT EXISTS idx_modules_name ON modules(name);
CREATE INDEX IF NOT EXISTS idx_modules_suffix ON modules(suffix);
CREATE INDEX IF NOT EXISTS idx_modules_espace_key ON modules(espace_key);

-- GIN Index untuk query pencarian cepat di dalam isi JSONB
CREATE INDEX IF NOT EXISTS idx_modules_parsed_data_gin ON modules USING GIN (parsed_data);
