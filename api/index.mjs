import {createApplication} from '../src/app.mjs';
import {blobStudyStore} from '../src/blob-study-store.mjs';

const handler=createApplication({store:blobStudyStore()});
export default handler;
