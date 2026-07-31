import { useEffect, useMemo, useState } from 'react';
import {
  Activity, BarChart3, Bell, Boxes, BriefcaseBusiness, CalendarCheck,
  ChevronRight, Command, Database, LayoutDashboard, LogOut, Menu,
  Search, ShieldCheck, Users, Wifi, WifiOff, X,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { logout, phonePinLogin } from './lib/auth';
import { subscribeCollection, subscribeProfiles } from './lib/realtime';
import type { ErpRecord, Profile, WorkspacePage } from './types';

const nav = [
  ['dashboard', 'Хяналтын самбар', LayoutDashboard], ['calls', 'Дуудлага', BriefcaseBusiness],
  ['employees', 'Ажилтнууд', Users], ['attendance', 'Ирц', CalendarCheck],
  ['inventory', 'Агуулах', Boxes], ['analytics', 'Тайлан, аналитик', BarChart3],
  ['system', 'Системийн төлөв', Activity],
] as const;

const dateValue = (row: ErpRecord) => {
  const value = row.updated_at || row.updatedAt || row.created_at || row.createdAt;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate();
  return null;
};
const text = (value: unknown) => String(value ?? '—');

function Login({ onLogin }: { onLogin: (profile: Profile) => void }) {
  const [phone, setPhone] = useState(''); const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { onLogin(await phonePinLogin(phone, pin)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Нэвтрэхэд алдаа гарлаа.'); }
    finally { setBusy(false); }
  };
  return <main className="login"><div className="aurora a"/><div className="aurora b"/><section className="login-card">
    <div className="brand-mark">G</div><p className="eyebrow">GENNETEX ENTERPRISE</p><h1>ERP Desktop</h1>
    <p className="muted">Mobile болон admin web-тэй ижил утас, PIN болон эрхээр нэвтэрнэ.</p>
    <form onSubmit={submit}><label>Утасны дугаар<div className="phone"><span>+976</span><input autoFocus inputMode="numeric" maxLength={8} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="9911 2233"/></div></label>
      <label>4 оронтой PIN<input className="pin" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••"/></label>
      {error && <div className="error" role="alert">{error}</div>}<button disabled={busy || phone.length !== 8 || pin.length !== 4}>{busy ? 'Шалгаж байна...' : 'Нэвтрэх'}<ChevronRight size={18}/></button>
    </form><small><ShieldCheck size={14}/> Шифрлэгдсэн Firebase session · Admin only</small>
  </section></main>;
}

function Kpi({ label, value, detail, tone = 'blue' }: { label: string; value: string | number; detail: string; tone?: string }) {
  return <article className={`kpi ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small><div className="spark">{[32,47,39,62,55,78,68,88,74,96].map((h,i) => <i key={i} style={{height:`${h}%`}}/>)}</div></article>;
}

function Dashboard({ profiles, attendance, calls, inventory }: DataProps) {
  const today = new Date().toDateString();
  const checked = new Set(attendance.filter(r => dateValue(r)?.toDateString() === today).map(r => text(r.staff_id || r.user_id))).size;
  const low = inventory.filter(r => Number(r.quantity || 0) <= Number(r.min_quantity || 5)).length;
  const days = useMemo(() => Array.from({length: 7}, (_, back) => { const d = new Date(); d.setDate(d.getDate() - (6 - back)); return {label:new Intl.DateTimeFormat('mn',{weekday:'short'}).format(d), value:attendance.filter(r => dateValue(r)?.toDateString() === d.toDateString()).length}; }), [attendance]);
  const max = Math.max(1, ...days.map(d => d.value));
  return <><header className="page-head"><div><p className="eyebrow">REALTIME OVERVIEW</p><h2>Хяналтын самбар</h2><p>Байгууллагын өнөөдрийн үйл ажиллагааны нэгдсэн зураглал</p></div><div className="live"><i/>Шууд шинэчлэлт</div></header>
    <section className="kpis"><Kpi label="Нийт ажилтан" value={profiles.length} detail="Идэвхтэй профайл"/><Kpi label="Өнөөдрийн ирц" value={checked} detail={`${Math.round(checked/Math.max(1,profiles.length)*100)}% идэвх`} tone="green"/><Kpi label="Нээлттэй дуудлага" value={calls.filter(c => !['Дууссан','done','closed'].includes(text(c.status))).length} detail={`${calls.length} нийт дуудлага`} tone="violet"/><Kpi label="Нөөцийн анхааруулга" value={low} detail="Доод үлдэгдэлтэй" tone="amber"/></section>
    <section className="grid"><article className="panel chart-panel"><div className="panel-title"><div><h3>Ирцийн идэвх</h3><p>Сүүлийн 7 хоногийн бүртгэл</p></div><CalendarCheck size={20}/></div><div className="bars">{days.map(d => <div className="bar-col" key={d.label}><div className="bar-track"><div style={{height:`${Math.max(6,d.value/max*100)}%`}}/></div><b>{d.value}</b><span>{d.label}</span></div>)}</div></article>
      <article className="panel"><div className="panel-title"><div><h3>Сүүлийн үйл ажиллагаа</h3><p>Realtime stream</p></div><Bell size={20}/></div><div className="timeline">{attendance.slice(0,6).map((row,i) => <div className="event" key={row.id}><i className={i<2?'ok':''}/><div><b>{text(row.staff_name || row.user_name || 'Ажилтан')}</b><p>Ирц бүртгүүлсэн · {dateValue(row)?.toLocaleString('mn-MN') || '—'}</p></div></div>)}{!attendance.length && <div className="empty">Одоогоор ирцийн үйл ажиллагаа алга.</div>}</div></article></section></>;
}

const columns: Record<string, string[]> = { employees:['name','phone','position','role'], calls:['customer','phone','address','status'], attendance:['staff_name','type','status','created_at'], inventory:['name','quantity','unit','category'] };
function Records({ title, rows, kind }: { title:string; rows:ErpRecord[]; kind:WorkspacePage }) {
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('all');
  const cols = columns[kind] || [];
  const statuses = useMemo(() => [...new Set(rows.map(r => text(r.status)).filter(v => v !== '—'))].sort(), [rows]);
  const visible = useMemo(() => rows.filter(row => {
    const matchesQuery = !query || Object.values(row).some(value => text(value).toLocaleLowerCase('mn').includes(query.toLocaleLowerCase('mn')));
    return matchesQuery && (filter === 'all' || text(row.status) === filter);
  }), [rows, query, filter]);
  return <><header className="page-head"><div><p className="eyebrow">ENTERPRISE DATA</p><h2>{title}</h2><p>{visible.length} / {rows.length} бодит бүртгэл · realtime synchronization</p></div>{statuses.length > 0 && <select className="filter" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Бүх төлөв</option>{statuses.map(status => <option key={status}>{status}</option>)}</select>}</header>
    <article className="panel table-panel"><div className="table-tools"><div className="search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Бүх талбараас хайх..."/>{query && <button title="Хайлтыг цэвэрлэх" onClick={() => setQuery('')}><X size={14}/></button>}</div></div>
      <div className="table-wrap"><table><thead><tr>{cols.map(c => <th key={c}>{c.replace('_',' ')}</th>)}<th>Шинэчлэгдсэн</th></tr></thead><tbody>{visible.map(row => <tr key={row.id}>{cols.map(c => <td key={c} title={text(row[c])}>{text(row[c])}</td>)}<td>{dateValue(row)?.toLocaleString('mn-MN') || '—'}</td></tr>)}</tbody></table>{!visible.length && <div className="empty"><Database size={30}/><b>{rows.length ? 'Хайлтад тохирох бүртгэл алга' : 'Бүртгэл олдсонгүй'}</b><span>{rows.length ? 'Хайлт эсвэл шүүлтээ өөрчилнө үү.' : 'Backend-д өгөгдөл нэмэгдэхэд энд автоматаар харагдана.'}</span></div>}</div>
    </article></>;
}

type DataProps = { profiles:ErpRecord[]; attendance:ErpRecord[]; calls:ErpRecord[]; inventory:ErpRecord[] };
function Analytics({ profiles, attendance, calls, inventory }: DataProps) {
  const closed = calls.filter(r => ['Дууссан','done','closed'].includes(text(r.status))).length;
  const low = inventory.filter(r => Number(r.quantity || 0) <= Number(r.min_quantity || 5)).length;
  const attended = new Set(attendance.map(r => text(r.staff_id || r.user_id))).size;
  const metrics = [{label:'Дуудлага шийдвэрлэлт',value:calls.length?closed/calls.length*100:0},{label:'Ажилтны ирцийн хамралт',value:profiles.length?attended/profiles.length*100:0},{label:'Хэвийн нөөц',value:inventory.length?(inventory.length-low)/inventory.length*100:0}];
  return <><header className="page-head"><div><p className="eyebrow">OPERATIONAL INSIGHTS</p><h2>Тайлан, аналитик</h2><p>Realtime өгөгдлөөс тооцсон гол гүйцэтгэл</p></div></header><section className="kpis"><Kpi label="Нийт дуудлага" value={calls.length} detail={`${closed} шийдвэрлэсэн`}/><Kpi label="Ирцийн бичлэг" value={attendance.length} detail={`${attended} ажилтан`} tone="green"/><Kpi label="Барааны төрөл" value={inventory.length} detail={`${low} анхаарах нөөц`} tone="amber"/><Kpi label="Нийт хэрэглэгч" value={profiles.length} detail="Системийн профайл" tone="violet"/></section><article className="panel analytics-panel"><div className="panel-title"><div><h3>Гүйцэтгэлийн үзүүлэлт</h3><p>Одоогийн өгөгдлийн харьцаа</p></div><BarChart3 size={20}/></div>{metrics.map(metric => <div className="metric" key={metric.label}><div><b>{metric.label}</b><span>{Math.round(metric.value)}%</span></div><div><i style={{width:`${Math.min(100,metric.value)}%`}}/></div></div>)}</article></>;
}

function SystemStatus({ counts, online }: { counts:{label:string;value:number}[]; online:boolean }) {
  return <><header className="page-head"><div><p className="eyebrow">SYSTEM HEALTH</p><h2>Системийн төлөв</h2><p>Desktop client болон realtime cache-ийн хяналт</p></div><div className={`live ${online?'':'offline'}`}><i/>{online?'Сүлжээнд холбогдсон':'Offline горим'}</div></header><section className="status-grid"><article className="panel status-card">{online?<Wifi size={28}/>:<WifiOff size={28}/>}<div><b>Интернэт холболт</b><span>{online?'Хэвийн ажиллаж байна':'Cache өгөгдөл харуулж байна'}</span></div></article><article className="panel status-card"><ShieldCheck size={28}/><div><b>Firebase session</b><span>Админ эрх баталгаажсан</span></div></article></section><article className="panel cache-panel"><div className="panel-title"><div><h3>Realtime цуглуулгууд</h3><p>Орон нутгийн cache-д ачаалсан бичлэг</p></div><Database size={20}/></div>{counts.map(item => <div className="cache-row" key={item.label}><span>{item.label}</span><b>{item.value}</b></div>)}</article></>;
}

export default function App() {
  const [profile,setProfile]=useState<Profile|null>(null); const [ready,setReady]=useState(false);
  const [page,setPage]=useState<WorkspacePage>('dashboard'); const [palette,setPalette]=useState(false);
  const [paletteQuery,setPaletteQuery]=useState(''); const [menu,setMenu]=useState(false); const [notifications,setNotifications]=useState(false);
  const [online,setOnline]=useState(navigator.onLine); const [profiles,setProfiles]=useState<ErpRecord[]>([]);
  const [attendance,setAttendance]=useState<ErpRecord[]>([]); const [calls,setCalls]=useState<ErpRecord[]>([]); const [inventory,setInventory]=useState<ErpRecord[]>([]);
  useEffect(() => onAuthStateChanged(auth, async user => { setReady(false); if (!user) { setProfile(null); setReady(true); return; } try { const snap=await getDoc(doc(db,'profiles',user.uid)); const p=snap.exists()?({id:snap.id,...snap.data()} as Profile):null; if(!p||!['admin','superadmin'].includes(text(p.role))){await logout();setProfile(null);}else setProfile(p); } finally { setReady(true); } }), []);
  useEffect(() => { if(!profile)return; const off=[subscribeProfiles(setProfiles),subscribeCollection('attendance',setAttendance),subscribeCollection('service_calls',setCalls),subscribeCollection('inventory',setInventory)]; return()=>off.forEach(fn=>fn()); }, [profile]);
  useEffect(() => { const update=()=>setOnline(navigator.onLine); window.addEventListener('online',update); window.addEventListener('offline',update); return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);}; }, []);
  useEffect(() => { const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setPalette(v=>!v);}if(e.key==='Escape'){setPalette(false);setNotifications(false);setMenu(false);}}; window.addEventListener('keydown',key); return()=>window.removeEventListener('keydown',key); }, []);
  if(!ready)return <div className="boot"><div className="brand-mark">G</div><span>Workspace ачаалж байна...</span></div>;
  if(!profile)return <Login onLogin={setProfile}/>;
  const title=nav.find(n=>n[0]===page)?.[1]||''; const data={profiles,attendance,calls,inventory};
  const alerts=[...inventory.filter(r=>Number(r.quantity||0)<=Number(r.min_quantity||5)).slice(0,5).map(r=>({id:`stock-${r.id}`,title:'Нөөц багассан',detail:text(r.name)})),...calls.filter(r=>!['Дууссан','done','closed'].includes(text(r.status))).slice(0,5).map(r=>({id:`call-${r.id}`,title:'Нээлттэй дуудлага',detail:text(r.customer||r.phone)}))];
  const filteredNav=nav.filter(([,label])=>label.toLocaleLowerCase('mn').includes(paletteQuery.toLocaleLowerCase('mn')));
  const selectPage=(id:WorkspacePage)=>{setPage(id);setPalette(false);setMenu(false);setPaletteQuery('');};
  return <div className={`shell ${menu?'menu-open':''}`}><aside><div className="window-brand"><div className="brand-mark sm">G</div><div><b>Gennetex</b><span>Enterprise ERP</span></div><button className="aside-close" onClick={()=>setMenu(false)}><X size={18}/></button></div><nav>{nav.map(([id,label,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>selectPage(id)}><Icon size={18}/><span>{label}</span>{page===id&&<i/>}</button>)}</nav><div className="aside-foot"><button onClick={()=>setPalette(true)}><Command size={17}/><span>Command palette</span><kbd>Ctrl K</kbd></button><div className="identity"><div className="avatar">{profile.name?.slice(0,1)||'A'}</div><div><b>{profile.name||'Админ'}</b><span>{profile.role==='superadmin'?'Системийн админ':'Админ'}</span></div><button onClick={()=>logout()} title="Гарах"><LogOut size={16}/></button></div></div></aside>{menu&&<button className="menu-scrim" aria-label="Цэс хаах" onClick={()=>setMenu(false)}/>}<main className="workspace"><div className="topbar"><button className="mobile-menu" onClick={()=>setMenu(true)}><Menu size={18}/></button><div className="crumb">Workspace <ChevronRight size={14}/><b>{title}</b></div><button className="global-search" onClick={()=>setPalette(true)}><Search size={16}/><span>Хайх эсвэл command ажиллуулах</span><kbd>Ctrl K</kbd></button><button className="icon-btn" onClick={()=>setNotifications(v=>!v)} aria-label="Мэдэгдэл"><Bell size={18}/>{alerts.length>0&&<i/>}</button></div>
    <div className="content">{page==='dashboard'?<Dashboard {...data}/>:page==='employees'?<Records title="Ажилтнууд" rows={profiles} kind={page}/>:page==='attendance'?<Records title="Ирцийн бүртгэл" rows={attendance} kind={page}/>:page==='calls'?<Records title="Дуудлагын удирдлага" rows={calls} kind={page}/>:page==='inventory'?<Records title="Агуулах, бараа материал" rows={inventory} kind={page}/>:page==='analytics'?<Analytics {...data}/>:<SystemStatus online={online} counts={[{label:'Ажилтнууд',value:profiles.length},{label:'Ирц',value:attendance.length},{label:'Дуудлага',value:calls.length},{label:'Агуулах',value:inventory.length}]}/>}</div></main>
    {notifications&&<section className="notification-drawer"><header><div><b>Мэдэгдэл</b><span>{alerts.length} анхааруулга</span></div><button onClick={()=>setNotifications(false)}><X size={16}/></button></header>{alerts.length?alerts.map(alert=><div className="notice" key={alert.id}><i/><div><b>{alert.title}</b><span>{alert.detail}</span></div></div>):<div className="empty"><ShieldCheck size={28}/><b>Бүх зүйл хэвийн</b></div>}</section>}
    {palette&&<div className="palette-backdrop" onMouseDown={()=>setPalette(false)}><section className="palette" onMouseDown={e=>e.stopPropagation()}><header><Search size={19}/><input autoFocus value={paletteQuery} onChange={e=>setPaletteQuery(e.target.value)} placeholder="Хуудас хайх..."/><button onClick={()=>setPalette(false)}><X size={17}/></button></header>{filteredNav.map(([id,label,Icon])=><button key={id} onClick={()=>selectPage(id)}><Icon size={18}/><span>{label}</span><kbd>Enter</kbd></button>)}{!filteredNav.length&&<div className="empty">Тохирох хуудас олдсонгүй.</div>}</section></div>}
  </div>;
}
