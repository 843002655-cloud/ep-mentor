-- Migration: Add mapping_system field to cases table
ALTER TABLE cases ADD COLUMN IF NOT EXISTS mapping_system TEXT DEFAULT '';

-- Optional: update existing seed data
UPDATE cases SET mapping_system = 'Carto' WHERE title LIKE '%SVT%' OR title LIKE '%窄QRS%';
UPDATE cases SET mapping_system = 'EnSite' WHERE title LIKE '%VT%' OR title LIKE '%宽QRS%';
UPDATE cases SET mapping_system = 'Carto' WHERE title LIKE '%房颤%' OR title LIKE '%AF%';
UPDATE cases SET mapping_system = 'Rhythmia' WHERE title LIKE '%房扑%' OR title LIKE '%AFL%';
