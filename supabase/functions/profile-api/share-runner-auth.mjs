import {createRemoteJWKSet,jwtVerify} from 'jose';

export const RUNNER_AUDIENCE='https://ascendo.lol/share-runner';
const ISSUER='https://token.actions.githubusercontent.com';
const REPOSITORY='internalcheat/ascendo.lol';
const WORKFLOW=REPOSITORY+'/.github/workflows/profile-sharing.yml@';
const keys=createRemoteJWKSet(new URL(ISSUER+'/.well-known/jwks'),{timeoutDuration:4000,cooldownDuration:30000,cacheMaxAge:3600000});

export async function verifyShareRunner(request,{health=false,jwks=keys,verify=jwtVerify}={}){
  const authorization=request.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer ')||authorization.length>16000)throw Object.assign(Error('Runner authentication required.'),{status:401});
  let payload;
  try{({payload}=await verify(authorization.slice(7),jwks,{
    issuer:ISSUER,audience:RUNNER_AUDIENCE,algorithms:['RS256'],clockTolerance:10,maxTokenAge:'10m',
    requiredClaims:['exp','iat','nbf','jti','repository_id','repository_owner_id','ref','workflow_ref','run_id','run_attempt','event_name']
  }));}catch{throw Object.assign(Error('Runner authentication failed.'),{status:401});}
  const refs=health?['refs/heads/main','refs/heads/profile-sharing','refs/heads/profile-expression']:['refs/heads/main'];
  if(payload.repository_id!=='1430026719'||payload.repository_owner_id!=='310857377'||payload.repository!==REPOSITORY||
    !refs.includes(payload.ref)||payload.workflow_ref!==WORKFLOW+payload.ref||!['push','schedule','workflow_dispatch'].includes(payload.event_name)||
    !/^[0-9]+$/.test(payload.run_id)||!/^[0-9]+$/.test(payload.run_attempt)||!/^[a-f0-9]{40}$/.test(payload.sha||''))
    throw Object.assign(Error('This workflow cannot run profile exports.'),{status:403});
  return {id:payload.run_id+':'+payload.run_attempt,ref:payload.ref,sha:payload.sha};
}
