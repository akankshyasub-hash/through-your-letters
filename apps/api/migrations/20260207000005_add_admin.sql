CREATE TABLE admins (
    id UUID PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add your IP as admin
INSERT INTO admins (id, ip_address) VALUES 
(gen_random_uuid(), '127.0.0.1');