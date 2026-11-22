export const VERCEL_APP_URL='https://encheres-kohl.vercel.app/';
export const LOCAL_APP_URL='http://127.0.0.1:3000/';

export function applicationOrigin(value){
 let url;
 try{url=new URL(value)}catch{throw Error('Destination de l’import inconnue.')}
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||![VERCEL_APP_URL,LOCAL_APP_URL].includes(url.href))throw Error('Choisissez l’application Vercel configurée ou le serveur local.');
 return url.origin;
}

export function permissionPattern(origin){const url=new URL(origin);return `${url.protocol}//${url.hostname}/*`}
