import fs from 'node:fs';
const c=JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc',import.meta.url)));if(c.name!=='maps'||c.account_id!=='2e217cab4139eeb9cb7a294fd080ab99'||c.d1_databases?.[0]?.database_id!=='b4769b34-1321-4f6f-bfc4-74af49ff2713'||!c.vars?.PUBLIC_ORIGIN?.startsWith('https:'))throw Error('La configuración debe corresponder a RutasAD de promociones7819.');
