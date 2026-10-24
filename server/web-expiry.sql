-- Existing accounts remain usable until the administrator explicitly changes their expiry.
ALTER TABLE users ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 8640000000000000;
