-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Cities table
CREATE TABLE cities (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Letterings table
CREATE TABLE letterings (
    id UUID PRIMARY KEY,
    city_id UUID NOT NULL REFERENCES cities(id),
    contributor_tag VARCHAR(30) NOT NULL,
    image_url TEXT NOT NULL,
    thumbnail_small TEXT,
    thumbnail_medium TEXT,
    thumbnail_large TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    pin_code VARCHAR(6) NOT NULL,
    detected_text TEXT,
    ml_style VARCHAR(50),
    ml_script VARCHAR(50),
    ml_confidence REAL,
    ml_color_palette JSONB,
    is_lettering BOOLEAN DEFAULT true,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    uploaded_by_ip INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Likes table
CREATE TABLE likes (
    id UUID PRIMARY KEY,
    lettering_id UUID NOT NULL REFERENCES letterings(id) ON DELETE CASCADE,
    user_ip INET NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lettering_id, user_ip)
);

-- Comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY,
    lettering_id UUID NOT NULL REFERENCES letterings(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    user_ip INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_letterings_city ON letterings(city_id);
CREATE INDEX idx_letterings_status ON letterings(status);
CREATE INDEX idx_letterings_contributor ON letterings(contributor_tag);
CREATE INDEX idx_letterings_location ON letterings USING GIST(location);
CREATE INDEX idx_letterings_created ON letterings(created_at DESC);
CREATE INDEX idx_likes_lettering ON likes(lettering_id);
CREATE INDEX idx_comments_lettering ON comments(lettering_id);

-- Insert Bengaluru
INSERT INTO cities (id, name, country_code) 
VALUES ('0194f123-4567-7abc-8def-0123456789ab', 'Bengaluru', 'IN');