-- Increase avatar column length to support Fluent emoji URLs
ALTER TABLE family_members ALTER COLUMN avatar TYPE VARCHAR(500);
