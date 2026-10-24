ALTER TABLE licenses ADD COLUMN plan TEXT NOT NULL DEFAULT 'basic' CHECK(plan IN ('basic','premium'));
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'basic' CHECK(plan IN ('basic','premium'));
CREATE INDEX IF NOT EXISTS license_nonces_created ON license_nonces(created_at);
