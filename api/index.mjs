import {createApplication} from '../src/app.mjs';
import {blobStudyStore} from '../src/blob-study-store.mjs';

// Fail closed: never expose the studies or the Packet API key without credentials.
if(!process.env.APP_USER||!process.env.APP_PASSWORD)throw Error('APP_USER et APP_PASSWORD requis sur Vercel');
const handler=createApplication({store:blobStudyStore(),auth:{username:process.env.APP_USER,password:process.env.APP_PASSWORD}});
export default handler;
