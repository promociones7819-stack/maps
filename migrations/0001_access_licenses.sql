-- RutasAD existing installation: additive migration, applied by Wrangler migrations.
CREATE TABLE IF NOT EXISTS licenses(id TEXT PRIMARY KEY,key_hash TEXT NOT NULL UNIQUE,label TEXT NOT NULL,expires_at INTEGER NOT NULL,active INTEGER NOT NULL DEFAULT 1,device TEXT,public_key TEXT,activated_at INTEGER,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS license_nonces(nonce TEXT PRIMARY KEY,created_at INTEGER NOT NULL);
ALTER TABLE licenses ADD COLUMN plan TEXT NOT NULL DEFAULT 'basic' CHECK(plan IN ('basic','premium'));
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'premium' CHECK(plan IN ('basic','premium'));
CREATE INDEX IF NOT EXISTS license_nonces_created ON license_nonces(created_at);
-- One-time, additive migration. Does not change activation or signed permits.
ALTER TABLE licenses ADD COLUMN key_ciphertext TEXT;
ALTER TABLE licenses ADD COLUMN owner_email TEXT NOT NULL DEFAULT '';
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
-- One-time additive migration. Administrative reference, independent of hardware binding.
ALTER TABLE licenses ADD COLUMN pc_identifier TEXT NOT NULL DEFAULT '';
-- Existing accounts remain usable until the administrator explicitly changes their expiry.
ALTER TABLE users ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 8640000000000000;
