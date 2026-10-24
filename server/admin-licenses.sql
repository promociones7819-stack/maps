-- One-time additive migration: ADMIN licences share a key; each activation has its own signed identity.
ALTER TABLE licenses ADD COLUMN license_kind TEXT NOT NULL DEFAULT 'standard' CHECK(license_kind IN ('standard','admin'));
CREATE TABLE IF NOT EXISTS license_activations (
 id TEXT PRIMARY KEY,
 license_id TEXT NOT NULL REFERENCES licenses(id),
 device TEXT NOT NULL,
 public_key TEXT NOT NULL,
 activated_at INTEGER NOT NULL,
 UNIQUE(license_id,device,public_key)
);
CREATE INDEX IF NOT EXISTS license_activations_parent ON license_activations(license_id);
