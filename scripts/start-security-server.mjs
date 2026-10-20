import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
process.loadEnvFile('.env.security');
if(!process.env.DATABASE_URL)throw new Error('Test database unavailable');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3002'],{stdio:'inherit',windowsHide:true,env:{...process.env,NEXT_DIST_DIR:'.next-security',BETTER_AUTH_URL:'http://127.0.0.1:3002',BETTER_AUTH_SECRET:randomBytes(32).toString('hex'),ALLOW_LOCAL_ADMIN_SETUP:'true'}});
child.on('exit',code=>process.exit(code||0));
