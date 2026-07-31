import { useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Check, MapPin, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { db } from './lib/firebase';
import type { ErpRecord, WorkspacePage } from './types';

const value=(input:unknown)=>String(input??'—');
const fields:Record<string,Array<[string,string,string?]>>={
  employees:[['name','Нэр'],['phone','Утас'],['position','Албан тушаал'],['role','Эрх (employee/admin)']],
  calls:[['customer','Харилцагч'],['phone','Утас'],['address','Хаяг'],['problem','Асуудал'],['status','Төлөв']],
  attendance:[['staff_name','Ажилтан'],['type','Төрөл (check_in/check_out)'],['status','Төлөв']],
  inventory:[['name','Бараа, материал'],['quantity','Тоо ширхэг','number'],['unit','Нэгж'],['category','Ангилал'],['min_quantity','Доод үлдэгдэл','number']],
};
const collections:Record<string,string>={employees:'profiles',calls:'service_calls',attendance:'attendance',inventory:'inventory'};
const columns:Record<string,string[]>={employees:['name','phone','position','role'],calls:['customer','phone','address','status'],attendance:['staff_name','type','status','created_at'],inventory:['name','quantity','unit','category']};

export function CrudRecords({title,rows,kind}:{title:string;rows:ErpRecord[];kind:WorkspacePage}){
  const [query,setQuery]=useState('');const[open,setOpen]=useState(false);const[form,setForm]=useState<Record<string,string>>({});const[busy,setBusy]=useState(false);const[error,setError]=useState('');
  const visible=useMemo(()=>rows.filter(row=>!query||Object.values(row).some(v=>value(v).toLowerCase().includes(query.toLowerCase()))),[rows,query]);
  const save=async()=>{setBusy(true);setError('');try{const payload:Record<string,unknown>={...form,created_at:new Date().toISOString(),createdAt:serverTimestamp()};for(const [key,,type] of fields[kind]||[])if(type==='number')payload[key]=Number(form[key]||0);if(kind==='employees'){const digits=String(form.phone||'').replace(/\D/g,'');payload.normalizedPhone=digits.startsWith('976')?digits:`976${digits}`;payload.role=form.role||'employee';}if(kind==='calls')payload.status=form.status||'Шинэ';if(kind==='attendance')payload.status=form.status||'approved';await addDoc(collection(db,collections[kind]),payload);setForm({});setOpen(false);}catch(e){setError(e instanceof Error?e.message:'Хадгалж чадсангүй.');}finally{setBusy(false);}};
  const remove=async(row:ErpRecord)=>{if(!confirm(`${value(row.name||row.customer||row.staff_name)} бүртгэлийг устгах уу?`))return;await deleteDoc(doc(db,collections[kind],row.id)).catch(e=>setError(e.message));};
  return <><header className="page-head"><div><p className="eyebrow">REALTIME MANAGEMENT</p><h2>{title}</h2><p>{visible.length} / {rows.length} бүртгэл · өөрчлөлт автоматаар шинэчлэгдэнэ</p></div><button className="primary-action" onClick={()=>setOpen(true)}><Plus size={16}/>Нэмэх</button></header>{error&&<div className="error module-error">{error}</div>}<article className="panel table-panel"><div className="table-tools"><div className="search"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Бүх талбараас хайх..."/></div><span className="auto-refresh"><RefreshCw size={13}/>AUTO REFRESH</span></div><div className="table-wrap"><table><thead><tr>{(columns[kind]||[]).map(c=><th key={c}>{c.replace('_',' ')}</th>)}<th>Үйлдэл</th></tr></thead><tbody>{visible.map(row=><tr key={row.id}>{(columns[kind]||[]).map(c=><td key={c}>{value(row[c])}</td>)}<td><button className="danger-icon" onClick={()=>void remove(row)} title="Устгах"><Trash2 size={15}/></button></td></tr>)}</tbody></table>{!visible.length&&<div className="empty">Бүртгэл олдсонгүй</div>}</div></article>{open&&<div className="modal-backdrop"><form className="modal panel" onSubmit={e=>{e.preventDefault();void save();}}><header><div><b>{title} — шинэ бүртгэл</b><span>Firebase-д шууд хадгална</span></div><button type="button" onClick={()=>setOpen(false)}><X size={18}/></button></header>{(fields[kind]||[]).map(([key,label,type])=><label key={key}>{label}<input required={['name','customer','staff_name'].includes(key)} type={type||'text'} value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}{error&&<div className="error">{error}</div>}<button className="primary-action" disabled={busy}>{busy?'Хадгалж байна...':'Хадгалах'}</button></form></div>}</>;
}

export function DeviceApprovals({rows}:{rows:ErpRecord[]}){
  const decide=async(row:ErpRecord,status:'approved'|'rejected')=>updateDoc(doc(db,'device_approvals',row.id),{status,decided_at:new Date().toISOString()});
  return <><header className="page-head"><div><p className="eyebrow">DEVICE SECURITY</p><h2>Төхөөрөмж зөвшөөрөл</h2><p>{rows.filter(r=>r.status==='pending').length} хүлээгдэж буй хүсэлт · realtime</p></div></header><section className="device-grid">{rows.map(row=><article className="panel device-card" key={row.id}><div><b>{value(row.user_name)}</b><span>{value(row.device_brand)} {value(row.device_model)} · {value(row.os)}</span><small>IP: {value(row.public_ip)} · {value(row.requested_at)}</small></div><i className={`status ${value(row.status)}`}>{value(row.status)}</i>{row.status==='pending'&&<footer><button onClick={()=>void decide(row,'approved')}><Check size={15}/>Зөвшөөрөх</button><button className="reject" onClick={()=>void decide(row,'rejected')}><X size={15}/>Татгалзах</button></footer>}</article>)}</section></>;
}

export function LiveLocations({profiles}:{profiles:ErpRecord[]}){
  const located=profiles.filter(p=>Number.isFinite(Number(p.latitude))&&Number.isFinite(Number(p.longitude)));const[selected,setSelected]=useState<ErpRecord|null>(located[0]||null);
  const target=selected||located[0];const mapUrl=target?`https://maps.google.com/maps?q=${Number(target.latitude)},${Number(target.longitude)}&z=15&output=embed`:'';
  const isOnline=(p:ErpRecord)=>Date.now()-new Date(value(p.last_seen)).getTime()<10*60*1000;
  return <><header className="page-head"><div><p className="eyebrow">LIVE WORKFORCE MAP</p><h2>Ажилтнуудын realtime байршил</h2><p>{located.length} байршилтай · {located.filter(isOnline).length} ажиллаж байна · auto refresh</p></div></header><section className="location-layout"><article className="panel people-list">{located.map(p=><button className={target?.id===p.id?'active':''} key={p.id} onClick={()=>setSelected(p)}><MapPin size={17}/><div><b>{value(p.name)}</b><span>{isOnline(p)?'Ажиллаж байна':'Offline'} · {value(p.last_seen)}</span></div><i className={isOnline(p)?'online':''}/></button>)}{!located.length&&<div className="empty">Mobile app байршил илгээмэгц энд харагдана.</div>}</article><article className="panel map-panel">{mapUrl?<iframe title="Google Map" src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>:<div className="empty">Байршлын өгөгдөл алга</div>}</article></section></>;
}
