CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO admins (id, ip_address) VALUES 
(gen_random_uuid(), '127.0.0.1')
ON CONFLICT (ip_address) DO NOTHING;