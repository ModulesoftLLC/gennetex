import { useEffect, useMemo, useState } from 'react';
import {
  Activity, BarChart3, Bell, Boxes, BriefcaseBusiness, CalendarCheck,
  ChevronRight, Command, Database, DollarSign, LayoutDashboard, LogOut, Menu,
  Search, ShieldCheck, Users, Wifi, WifiOff, X, MapPinned, Smartphone, Sun, Moon, RefreshCw,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { cancelVerification, checkVerification, getVerificationRevenue, logout, normalizePhone, phonePinLogin, setPin as saveVerifiedPin, startVerification } from './lib/auth';
import { subscribeCollection, subscribeProfiles } from './lib/realtime';
import type { ErpRecord, Profile, WorkspacePage } from './types';
import { CrudRecords, DeviceApprovals, LiveLocations } from './AdminModules';

const baseNav = [
  ['dashboard', 'Хяналтын самбар', LayoutDashboard], ['calls', 'Дуудлага', BriefcaseBusiness],
  ['employees', 'Ажилтнууд', Users], ['attendance', 'Ирц', CalendarCheck],
  ['inventory', 'Агуулах', Boxes], ['locations', 'Realtime байршил', MapPinned],
  ['devices', 'Төхөөрөмж зөвшөөрөл', Smartphone], ['analytics', 'Тайлан, аналитик', BarChart3],
  ['system', 'Системийн төлөв', Activity],
] as const;

const dateValue = (row: ErpRecord) => {
  const value = row.updated_at || row.updatedAt || row.created_at || row.createdAt;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate();
  return null;
};
const text = (value: unknown) => String(value ?? '—');

type AuthMode='phone'|'login'|'verify'|'create-pin'|'confirm-pin';
type VerifySession={sessionId:string;displayCode?:string;displayInstruction?:string;smsUri?:string;expiresAt?:string;status?:string;verificationToken?:string};
function Login({ onLogin }: { onLogin: (profile: Profile) => void }) {
  const [phone,setPhone]=useState('');const[pin,setPin]=useState('');const[confirmPin,setConfirmPin]=useState('');
  const[mode,setMode]=useState<AuthMode>('phone');const[purpose,setPurpose]=useState<'PHONE_ACTIVATION'|'PIN_SETUP'>('PHONE_ACTIVATION');
  const[session,setSession]=useState<VerifySession|null>(null);const[pendingPin,setPendingPin]=useState('');
  const[busy,setBusy]=useState(false);const[error,setError]=useState('');
  const fail=(reason:unknown)=>setError(reason instanceof Error?reason.message:'Нэвтрэхэд алдаа гарлаа.');
  const begin=async()=>{setBusy(true);setError('');try{normalizePhone(phone);if(phone==='95238118'){setMode('login');return;}const next=await startVerification(phone,'PHONE_ACTIVATION');if(next.activated)setMode('login');else{setPurpose('PHONE_ACTIVATION');setSession(next);setMode('verify');}}catch(reason){fail(reason);}finally{setBusy(false);}};
  const login=async()=>{setBusy(true);setError('');try{onLogin(await phonePinLogin(phone,pin));}catch(reason){fail(reason);}finally{setBusy(false);}};
  const check=async()=>{if(!session?.sessionId||busy)return;setBusy(true);setError('');try{const next=await checkVerification(session.sessionId);setSession(old=>({...old,...next}));if(next.status==='VERIFIED'){if(purpose==='PIN_SETUP')onLogin(await saveVerifiedPin(session.sessionId,next.verificationToken,pendingPin));else{setPin('');setConfirmPin('');setMode('create-pin');}}else if(next.status==='EXPIRED')setError('Баталгаажуулах хугацаа дууссан байна. Дахин эхлүүлнэ үү.');}catch(reason){fail(reason);}finally{setBusy(false);}};
  useEffect(()=>{if(mode!=='verify'||!session?.sessionId)return;const timer=window.setInterval(check,3000);return()=>window.clearInterval(timer);},[mode,session?.sessionId,purpose,pendingPin,busy]);
  const confirm=async()=>{if(!/^\d{4}$/.test(pin))return setError('PIN яг 4 оронтой байна.');if(pin!==confirmPin)return setError('PIN кодууд тохирохгүй байна.');setBusy(true);setError('');try{const next=await startVerification(phone,'PIN_SETUP');setPendingPin(pin);setPurpose('PIN_SETUP');setSession(next);setMode('verify');}catch(reason){fail(reason);}finally{setBusy(false);}};
  const back=async()=>{if(session?.sessionId)await cancelVerification(session.sessionId).catch(()=>{});setSession(null);setPin('');setConfirmPin('');setError('');setMode('phone');};
  const submit=(event:React.FormEvent)=>{event.preventDefault();if(mode==='phone')void begin();else if(mode==='login')void login();else if(mode==='create-pin'){if(!/^\d{4}$/.test(pin))setError('PIN яг 4 оронтой байна.');else{setError('');setMode('confirm-pin');}}else if(mode==='confirm-pin')void confirm();else void check();};
  return <main className="login"><div className="aurora a"/><div className="aurora b"/><section className="login-card">
    <div className="brand-mark">G</div><p className="eyebrow">GENNETEX ENTERPRISE</p><h1>ERP Desktop</h1>
    <p className="muted">{mode==='verify'?(purpose==='PIN_SETUP'?'PIN хадгалахын өмнөх эцсийн Verify.mn баталгаажуулалт.':'Verify.mn-ээр утасны эзэмшигчээ баталгаажуулна.'):mode==='create-pin'||mode==='confirm-pin'?'Нэвтрэх 4 оронтой PIN-ээ хоёр удаа баталгаажуулна.':'Mobile болон admin web-тэй ижил утас, PIN болон эрхээр нэвтэрнэ.'}</p>
    <form onSubmit={submit}>{mode==='phone'&&<label>Утасны дугаар<div className="phone"><span>+976</span><input autoFocus inputMode="numeric" maxLength={8} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,''))} placeholder="9911 2233"/></div></label>}
      {mode==='login'&&<><label>Утасны дугаар<div className="phone"><span>+976</span><input value={phone} readOnly/></div></label><label>4 оронтой PIN<input autoFocus className="pin" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} placeholder="••••"/></label></>}
      {mode==='create-pin'&&<label>Шинэ 4 оронтой PIN<input autoFocus className="pin" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} placeholder="••••"/></label>}
      {mode==='confirm-pin'&&<label>PIN-ээ дахин оруулна уу<input autoFocus className="pin" type="password" inputMode="numeric" maxLength={4} value={confirmPin} onChange={e=>setConfirmPin(e.target.value.replace(/\D/g,''))} placeholder="••••"/></label>}
      {mode==='verify'&&<div className="verify-card"><span>144773 дугаарт илгээх код</span><strong>{session?.displayCode||'••••'}</strong><p>{session?.displayInstruction}</p><small>Утасныхаа Messages апп-аас дээрх кодыг илгээнэ үү.</small></div>}
      {error&&<div className="error" role="alert">{error}</div>}<button disabled={busy||(mode==='phone'&&phone.length!==8)||(mode==='login'&&pin.length!==4)||(mode==='create-pin'&&pin.length!==4)||(mode==='confirm-pin'&&confirmPin.length!==4)}>{busy?'Шалгаж байна...':mode==='phone'?'Үргэлжлүүлэх':mode==='login'?'Нэвтрэх':mode==='verify'?'Баталгаажуулалтыг шалгах':mode==='create-pin'?'PIN үргэлжлүүлэх':'PIN баталгаажуулах'}<ChevronRight size={18}/></button>
      {mode!=='phone'&&<button type="button" className="back-button" onClick={back}>Буцах</button>}
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

type RevenueData={successful:number;failed:number;revenueMnt:number;change:number;trend:Array<{date:string;successful:number;failed:number}>};
function Revenue(){const[data,setData]=useState<RevenueData|null>(null);const[error,setError]=useState('');const[loading,setLoading]=useState(true);const load=async()=>{setLoading(true);setError('');try{setData(await getVerificationRevenue());}catch(reason){setError(reason instanceof Error?reason.message:'Орлогын мэдээлэл ачаалсангүй.');}finally{setLoading(false);}};useEffect(()=>{void load();},[]);const max=Math.max(1,...(data?.trend||[]).map(row=>Math.max(row.successful,row.failed)));return <><header className="page-head"><div><p className="eyebrow">VERIFY.MN REVENUE</p><h2>Миний орлого</h2><p>Зөвхөн 95238118 системийн админд харагдах баталгаажуулалтын орлого</p></div><button className="secondary" onClick={()=>void load()} disabled={loading}>{loading?'Шинэчилж байна...':'Шинэчлэх'}</button></header>{error&&<div className="error revenue-error">{error}</div>}<section className="kpis"><Kpi label="Нийт орлого" value={`${Number(data?.revenueMnt||0).toLocaleString()}₮`} detail={`${(data?.change||0)>=0?'Өссөн':'Буурсан'}: ${Math.abs(data?.change||0)*40}₮`} tone="green"/><Kpi label="Амжилттай" value={data?.successful||0} detail="40₮ / баталгаажуулалт"/><Kpi label="Амжилтгүй" value={data?.failed||0} detail="Шалгах шаардлагатай" tone="amber"/></section><article className="panel revenue-panel"><div className="panel-title"><div><h3>Сүүлийн 7 хоног</h3><p>Verify.mn хүсэлтийн чиг хандлага</p></div><DollarSign size={20}/></div><div className="revenue-chart">{(data?.trend||[]).map(row=><div className="revenue-day" key={row.date}><div className="revenue-bars"><i className="success" style={{height:`${Math.max(4,row.successful/max*120)}px`}}/><i className="failed" style={{height:`${Math.max(4,row.failed/max*120)}px`}}/></div><b>{row.successful}/{row.failed}</b><span>{row.date.slice(5)}</span></div>)}</div></article></>}

export default function App() {
  const [profile,setProfile]=useState<Profile|null>(null); const [ready,setReady]=useState(false);
  const [page,setPage]=useState<WorkspacePage>('dashboard'); const [palette,setPalette]=useState(false);
  const [paletteQuery,setPaletteQuery]=useState(''); const [menu,setMenu]=useState(false); const [notifications,setNotifications]=useState(false);
  const [online,setOnline]=useState(navigator.onLine); const [profiles,setProfiles]=useState<ErpRecord[]>([]);
  const [attendance,setAttendance]=useState<ErpRecord[]>([]); const [calls,setCalls]=useState<ErpRecord[]>([]); const [inventory,setInventory]=useState<ErpRecord[]>([]);
  const [devices,setDevices]=useState<ErpRecord[]>([]);const[refreshKey,setRefreshKey]=useState(0);const[theme,setTheme]=useState<'dark'|'light'>(()=>(localStorage.getItem('gennetex-theme') as 'dark'|'light')||'dark');
  useEffect(() => onAuthStateChanged(auth, async user => { setReady(false); if (!user) { setProfile(null); setReady(true); return; } try { const snap=await getDoc(doc(db,'profiles',user.uid)); const p=snap.exists()?({id:snap.id,...snap.data()} as Profile):null; if(!p||!['admin','superadmin'].includes(text(p.role))){await logout();setProfile(null);}else setProfile(p); } finally { setReady(true); } }), []);
  useEffect(() => { if(!profile)return; const off=[subscribeProfiles(setProfiles),subscribeCollection('attendance',setAttendance),subscribeCollection('service_calls',setCalls),subscribeCollection('inventory',setInventory),subscribeCollection('device_approvals',setDevices)]; return()=>off.forEach(fn=>fn()); }, [profile,refreshKey]);
  useEffect(()=>{const timer=window.setInterval(()=>setRefreshKey(v=>v+1),30000);return()=>window.clearInterval(timer);},[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('gennetex-theme',theme);},[theme]);
  useEffect(() => { const update=()=>setOnline(navigator.onLine); window.addEventListener('online',update); window.addEventListener('offline',update); return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);}; }, []);
  useEffect(() => { const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setPalette(v=>!v);}if(e.key==='Escape'){setPalette(false);setNotifications(false);setMenu(false);}}; window.addEventListener('keydown',key); return()=>window.removeEventListener('keydown',key); }, []);
  if(!ready)return <div className="boot"><div className="brand-mark">G</div><span>Workspace ачаалж байна...</span></div>;
  if(!profile)return <Login onLogin={setProfile}/>;
  const ownerPhone=String(profile.normalizedPhone||profile.phone||'').replace(/\D/g,'').replace(/^976/,'');
  const canSeeRevenue=ownerPhone==='95238118';
  const nav=[...baseNav.slice(0,8),...(canSeeRevenue?[['revenue','Миний орлого',DollarSign] as const]:[]),...baseNav.slice(8)];
  const title=nav.find(n=>n[0]===page)?.[1]||''; const data={profiles,attendance,calls,inventory};
  const alerts=[...inventory.filter(r=>Number(r.quantity||0)<=Number(r.min_quantity||5)).slice(0,5).map(r=>({id:`stock-${r.id}`,title:'Нөөц багассан',detail:text(r.name)})),...calls.filter(r=>!['Дууссан','done','closed'].includes(text(r.status))).slice(0,5).map(r=>({id:`call-${r.id}`,title:'Нээлттэй дуудлага',detail:text(r.customer||r.phone)}))];
  const filteredNav=nav.filter(([,label])=>label.toLocaleLowerCase('mn').includes(paletteQuery.toLocaleLowerCase('mn')));
  const selectPage=(id:WorkspacePage)=>{setPage(id);setPalette(false);setMenu(false);setPaletteQuery('');};
  return <div className={`shell ${menu?'menu-open':''}`}><aside><div className="window-brand"><div className="brand-mark sm">G</div><div><b>Gennetex</b><span>Enterprise ERP</span></div><button className="aside-close" onClick={()=>setMenu(false)}><X size={18}/></button></div><nav>{nav.map(([id,label,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>selectPage(id)}><Icon size={18}/><span>{label}</span>{page===id&&<i/>}</button>)}</nav><div className="aside-foot"><button onClick={()=>setPalette(true)}><Command size={17}/><span>Command palette</span><kbd>Ctrl K</kbd></button><div className="identity"><div className="avatar">{profile.name?.slice(0,1)||'A'}</div><div><b>{profile.name||'Админ'}</b><span>{profile.role==='superadmin'?'Системийн админ':'Админ'}</span></div><button onClick={()=>logout()} title="Гарах"><LogOut size={16}/></button></div></div></aside>{menu&&<button className="menu-scrim" aria-label="Цэс хаах" onClick={()=>setMenu(false)}/>}<main className="workspace"><div className="topbar"><button className="mobile-menu" onClick={()=>setMenu(true)}><Menu size={18}/></button><div className="crumb">Workspace <ChevronRight size={14}/><b>{title}</b></div><button className="global-search" onClick={()=>setPalette(true)}><Search size={16}/><span>Хайх эсвэл command ажиллуулах</span><kbd>Ctrl K</kbd></button><button className="icon-btn refresh-button" onClick={()=>setRefreshKey(v=>v+1)} title="Одоо шинэчлэх"><RefreshCw size={17}/></button><button className="icon-btn" onClick={()=>setTheme(v=>v==='dark'?'light':'dark')} title="Dark / Light mode">{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button><button className="icon-btn" onClick={()=>setNotifications(v=>!v)} aria-label="Мэдэгдэл"><Bell size={18}/>{alerts.length>0&&<i/>}</button></div>
    <div className="content">{page==='dashboard'?<Dashboard {...data}/>:page==='employees'?<CrudRecords title="Ажилтнууд" rows={profiles} kind={page}/>:page==='attendance'?<CrudRecords title="Ирцийн бүртгэл" rows={attendance} kind={page}/>:page==='calls'?<CrudRecords title="Дуудлагын удирдлага" rows={calls} kind={page}/>:page==='inventory'?<CrudRecords title="Агуулах, бараа материал" rows={inventory} kind={page}/>:page==='locations'?<LiveLocations profiles={profiles}/>:page==='devices'?<DeviceApprovals rows={devices}/>:page==='analytics'?<Analytics {...data}/>:page==='revenue'&&canSeeRevenue?<Revenue/>:<SystemStatus online={online} counts={[{label:'Ажилтнууд',value:profiles.length},{label:'Ирц',value:attendance.length},{label:'Дуудлага',value:calls.length},{label:'Агуулах',value:inventory.length},{label:'Төхөөрөмж',value:devices.length}]}/>}</div></main>
    {notifications&&<section className="notification-drawer"><header><div><b>Мэдэгдэл</b><span>{alerts.length} анхааруулга</span></div><button onClick={()=>setNotifications(false)}><X size={16}/></button></header>{alerts.length?alerts.map(alert=><div className="notice" key={alert.id}><i/><div><b>{alert.title}</b><span>{alert.detail}</span></div></div>):<div className="empty"><ShieldCheck size={28}/><b>Бүх зүйл хэвийн</b></div>}</section>}
    {palette&&<div className="palette-backdrop" onMouseDown={()=>setPalette(false)}><section className="palette" onMouseDown={e=>e.stopPropagation()}><header><Search size={19}/><input autoFocus value={paletteQuery} onChange={e=>setPaletteQuery(e.target.value)} placeholder="Хуудас хайх..."/><button onClick={()=>setPalette(false)}><X size={17}/></button></header>{filteredNav.map(([id,label,Icon])=><button key={id} onClick={()=>selectPage(id)}><Icon size={18}/><span>{label}</span><kbd>Enter</kbd></button>)}{!filteredNav.length&&<div className="empty">Тохирох хуудас олдсонгүй.</div>}</section></div>}
  </div>;
}
