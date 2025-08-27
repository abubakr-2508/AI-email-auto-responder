-- Fix vector dimensions for Gemini compatibility
-- Run this in your Supabase SQL Editor

-- Update the embedding column to accept 768 dimensions (Gemini's text-embedding-004 format)
-- instead of 1536 dimensions (OpenAI's text-embedding-3-small format)

ALTER TABLE email_sections 
ALTER COLUMN embedding TYPE vector(768);

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'email_sections' AND column_name = 'embedding';

-- If you have any existing data with 1536 dimensions, you'll need to delete it first:
-- TRUNCATE TABLE email_sections;
-- TRUNCATE TABLE emails;

SELECT 'Vector dimension updated successfully! Now Gemini embeddings (768D) will work.' as result;