import { signInWithCustomToken,signOut } from 'firebase/auth';
import { doc,getDoc } from 'firebase/firestore';
import { auth,db } from './firebase';
import type { Profile } from '../types';
const endpoint=String(import.meta.env.VITE_EMPLOYEE_AUTH_API_URL||'https://gennetex.vercel.app/api/employee-auth').replace(/\/$/,'');
export const normalizePhone=(value:string)=>{const digits=value.replace(/\D/g,'');const local=digits.startsWith('976')?digits.slice(3):digits;if(!/^\d{8}$/.test(local))throw new Error('Монголын 8 оронтой дугаар оруулна уу.');return `976${local}`;};
async function request(action:string,body:Record<string,unknown>={},authenticated=false){
  const headers:Record<string,string>={'Content-Type':'application/json'};
  if(authenticated){const token=await auth.currentUser?.getIdToken();if(!token)throw new Error('Админ нэвтрээгүй байна.');headers.Authorization=`Bearer ${token}`;}
  let response:Response|undefined;
  const requestClients:Array<typeof globalThis.fetch>=[globalThis.fetch.bind(globalThis)];
  if(typeof window!=='undefined'&&'__TAURI_INTERNALS__' in window){
    const httpPlugin=await import('@tauri-apps/plugin-http');
    requestClients.unshift(httpPlugin.fetch);
  }
  let lastError:unknown;
  for(const requestFetch of requestClients){for(let attempt=0;attempt<2;attempt+=1){try{response=await requestFetch(`${endpoint}?action=${encodeURIComponent(action)}`,{method:'POST',headers,body:JSON.stringify(body)});break;}catch(error){lastError=error;if(attempt===0)await new Promise(resolve=>setTimeout(resolve,400));}}if(response)break;}
  if(!response)throw new Error(`Сервертэй холбогдож чадсангүй (${endpoint}). ${lastError instanceof Error?lastError.message:'HTTP хүсэлт амжилтгүй.'}`);
  const payload=await response!.json().catch(()=>({}));if(!response!.ok)throw new Error(payload.error||'Сервертэй холбогдоход алдаа гарлаа.');return payload;
}
async function finishLogin(customToken:string){const result=await signInWithCustomToken(auth,customToken);const snap=await getDoc(doc(db,'profiles',result.user.uid));if(!snap.exists())throw new Error('Админы профайл олдсонгүй.');const profile={id:snap.id,...snap.data()} as Profile;if(!['admin','superadmin'].includes(String(profile.role))){await signOut(auth);throw new Error('Desktop ERP-д зөвхөн админ нэвтэрнэ.');}return profile;}
export const startVerification=(phone:string,purpose:'PHONE_ACTIVATION'|'PIN_SETUP')=>request('start',{phone:normalizePhone(phone),purpose});
export const checkVerification=(sessionId:string)=>request('check',{sessionId});
export const cancelVerification=(sessionId:string)=>request('cancel',{sessionId});
export const setPin=async(sessionId:string,verificationToken:string,pin:string)=>{const payload=await request('set-pin',{sessionId,verificationToken,pin});return finishLogin(payload.customToken);};
export async function phonePinLogin(phone:string,pin:string){if(!/^\d{4}$/.test(pin))throw new Error('4 оронтой PIN оруулна уу.');const payload=await request('login',{phone:normalizePhone(phone),pin});return finishLogin(payload.customToken);}
export const getVerificationRevenue=()=>request('revenue',{},true);
export const logout=()=>signOut(auth);
