import { signInWithCustomToken,signOut } from 'firebase/auth';
import { doc,getDoc } from 'firebase/firestore';
import { auth,db } from './firebase';
import type { Profile } from '../types';
const endpoint=String(import.meta.env.VITE_EMPLOYEE_AUTH_API_URL||'https://adiya.site/api/employee-auth').replace(/\/$/,'');
const normalizePhone=(value:string)=>{const digits=value.replace(/\D/g,'');const local=digits.startsWith('976')?digits.slice(3):digits;if(!/^\d{8}$/.test(local))throw new Error('Монголын 8 оронтой дугаар оруулна уу.');return `976${local}`;};
export async function phonePinLogin(phone:string,pin:string){if(!/^\d{4}$/.test(pin))throw new Error('4 оронтой PIN оруулна уу.');const response=await fetch(`${endpoint}?action=login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:normalizePhone(phone),pin})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'Нэвтрэхэд алдаа гарлаа.');const result=await signInWithCustomToken(auth,payload.customToken);const snap=await getDoc(doc(db,'profiles',result.user.uid));if(!snap.exists())throw new Error('Админы профайл олдсонгүй.');const profile={id:snap.id,...snap.data()} as Profile;if(!['admin','superadmin'].includes(String(profile.role))) {await signOut(auth);throw new Error('Desktop ERP-д зөвхөн админ нэвтэрнэ.');}return profile;}
export const logout=()=>signOut(auth);
