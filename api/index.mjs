import {createApplication} from '../src/app.mjs';
import {blobStudyStore} from '../src/blob-study-store.mjs';

const handler=createApplication({store:blobStudyStore(),favoriteStore:blobStudyStore(undefined,{prefix:'favorites/'})});
export default handler;
