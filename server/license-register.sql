-- One-time, additive migration. Does not change activation or signed permits.
ALTER TABLE licenses ADD COLUMN key_ciphertext TEXT;
ALTER TABLE licenses ADD COLUMN owner_email TEXT NOT NULL DEFAULT '';
