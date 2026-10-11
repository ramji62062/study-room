-- ============================================================================
-- Migration: Study Room Scene Support (Scene ID and Room-wide Scene Sharing)
-- Date: 2026-10-11
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'scene_id'
  ) THEN
    ALTER TABLE rooms ADD COLUMN scene_id VARCHAR(50) DEFAULT 'night-library';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'scene_shared'
  ) THEN
    ALTER TABLE rooms ADD COLUMN scene_shared BOOLEAN DEFAULT false;
  END IF;
END $$;
