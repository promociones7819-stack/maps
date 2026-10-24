-- One-time additive migration. Administrative reference, independent of hardware binding.
ALTER TABLE licenses ADD COLUMN pc_identifier TEXT NOT NULL DEFAULT '';
