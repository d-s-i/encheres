#!/usr/bin/env node
import {createServer} from 'node:http';
import {createApplication} from '../src/app.mjs';
const port=Number(process.env.PORT??3000);
if(!Number.isSafeInteger(port)||port<1||port>65535)throw Error('PORT invalide');
const host=process.env.HOST??'127.0.0.1';
createServer(createApplication()).listen(port,host,()=>console.log(`Application montres : http://${host}:${port}/`));
