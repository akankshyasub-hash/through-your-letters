INSERT INTO cities (id, name, country_code) VALUES
('0194f123-4567-7abc-8def-0123456789ac', 'Mumbai', 'IN'),
('0194f123-4567-7abc-8def-0123456789ad', 'Delhi', 'IN'),
('0194f123-4567-7abc-8def-0123456789ae', 'Chennai', 'IN'),
('0194f123-4567-7abc-8def-0123456789af', 'Kolkata', 'IN'),
('0194f123-4567-7abc-8def-0123456789b0', 'Hyderabad', 'IN'),
('0194f123-4567-7abc-8def-0123456789b1', 'Pune', 'IN')
ON CONFLICT (id) DO NOTHING;

-- Add city selection endpoint
CREATE INDEX idx_cities_name ON cities(name);