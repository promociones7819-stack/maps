import {writeFile} from 'node:fs/promises';
import {passwordHash} from '../server/password.js';
await writeFile('/tmp/rutasad-auth-test.sql',`DELETE FROM sessions; DELETE FROM login_limits; DELETE FROM users; INSERT OR REPLACE INTO users VALUES('test-admin','admin@example.test','${await passwordHash('Test-only-admin-8527')}','admin',1,1);`,{mode:0o600});
