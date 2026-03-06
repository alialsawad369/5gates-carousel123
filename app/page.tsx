'use client'
import { useState, useEffect, useRef } from 'react'

type Slide = { headline: string; body: string; handle: string; icon?: string }
type Theme = 'dark'|'darker'|'white'|'cream'|'darkred'|'charcoal'
type PostStatus = 'scheduled'|'published'|'failed'|'draft'|'processing'
type Post = {
  id:number; slides_json:string; caption:string; theme:Theme; font_scale:number
  status:PostStatus; scheduled_at:string; published_at:string|null
  ig_media_id:string|null; error_msg:string|null; image_urls:string|null; created_at:string
}

const T: Record<Theme,{bg:string;text:string;sub:string;brand:string;hl:string;label:string}> = {
  dark:     {bg:'#111111',text:'#F0EDE8',sub:'rgba(240,237,232,0.65)',brand:'rgba(240,237,232,0.35)',hl:'#CC3333',label:'Dark'},
  darker:   {bg:'#050505',text:'#F5F5F5',sub:'rgba(245,245,245,0.58)',brand:'rgba(245,245,245,0.30)',hl:'#CC3333',label:'Black'},
  white:    {bg:'#FFFFFF',text:'#111111',sub:'rgba(17,17,17,0.60)',   brand:'rgba(17,17,17,0.35)',   hl:'#CC3333',label:'White'},
  cream:    {bg:'#F5F0E8',text:'#111111',sub:'rgba(17,17,17,0.56)',   brand:'rgba(17,17,17,0.32)',   hl:'#CC3333',label:'Cream'},
  darkred:  {bg:'#180404',text:'#FFF0F0',sub:'rgba(255,240,240,0.58)',brand:'rgba(255,240,240,0.30)',hl:'#FF5555',label:'Red'},
  charcoal: {bg:'#1C1C1C',text:'#EDEDED',sub:'rgba(237,237,237,0.60)',brand:'rgba(237,237,237,0.32)',hl:'#CC3333',label:'Charcoal'},
}

const ICONS: Record<string,string> = {
  money:'💰',chart:'📊',warning:'⚠️',rocket:'🚀',bulb:'💡',check:'✅',
  fire:'🔥',question:'❓',bank:'🏦',document:'📋',growth:'📈',tax:'🧾',
  erp:'🖥️',salary:'💳',trophy:'🏆',time:'⏰',loss:'📉',people:'👥',
}

function getIcon(headline:string, icon?:string):string {
  if(icon&&ICONS[icon]) return ICONS[icon]
  const h=headline.toLowerCase()
  if(h.includes('خطأ')||h.includes('تحذير')||h.includes('احذر')) return ICONS.warning
  if(h.includes('نمو')||h.includes('زيادة')) return ICONS.growth
  if(h.includes('ضريبة')||h.includes('vat')) return ICONS.tax
  if(h.includes('erp')||h.includes('نظام')) return ICONS.erp
  if(h.includes('راتب')) return ICONS.salary
  if(h.includes('تقرير')) return ICONS.document
  if(h.includes('نقدي')||h.includes('مال')) return ICONS.money
  if(h.includes('نصيحة')||h.includes('فكرة')) return ICONS.bulb
  if(h.includes('نجاح')) return ICONS.trophy
  if(h.includes('خطوة')||h.includes('كيف')) return ICONS.check
  return ICONS.chart
}

function parseSegments(text:string):{text:string;color:string|null}[] {
  const segs:{text:string;color:string|null}[]=[]
  const re=/(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*)/g
  let last=0,m
  while((m=re.exec(text))!==null){
    if(m.index>last) segs.push({text:text.slice(last,m.index),color:null})
    if(m[2]) segs.push({text:m[2],color:'#F5C842'})
    else if(m[3]) segs.push({text:m[3],color:'#CC3333'})
    last=m.index+m[0].length
  }
  if(last<text.length) segs.push({text:text.slice(last),color:null})
  return segs
}

function renderSlide(slide:Slide,idx:number,total:number,theme:Theme,fontScale:number,W=1080,H=1350):string {
  const canvas=document.createElement('canvas')
  canvas.width=W;canvas.height=H
  const ctx=canvas.getContext('2d')!
  const t=T[theme],fs=fontScale
  ctx.fillStyle=t.bg;ctx.fillRect(0,0,W,H)
  const gr=ctx.createRadialGradient(W*1.1,-H*0.1,0,W*1.1,-H*0.1,W*0.85)
  gr.addColorStop(0,theme==='darkred'?'rgba(204,51,51,0.45)':'rgba(204,51,51,0.22)')
  gr.addColorStop(1,'transparent')
  ctx.fillStyle=gr;ctx.fillRect(0,0,W,H)
  ctx.fillStyle=t.hl;ctx.beginPath();ctx.roundRect(W-195,H*0.845,115,7,4);ctx.fill()
  const icon=getIcon(slide.headline,slide.icon)
  ctx.font=`${Math.round(160*fs)}px serif`;ctx.globalAlpha=0.15
  ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(icon,60,H*0.08)
  ctx.globalAlpha=1
  ctx.font=`${Math.round(90*fs)}px serif`;ctx.textAlign='right';ctx.textBaseline='top'
  ctx.fillText(icon,W-75,75)
  ctx.font=`900 ${Math.round(30*fs)}px 'Tajawal','Cairo',sans-serif`
  ctx.fillStyle=t.brand;ctx.textAlign='center';ctx.textBaseline='top'
  ctx.fillText('5GATES',W/2,68)
  const hs=Math.round(88*fs),lh=hs*1.3,tr=W-80,mx=W-160
  ctx.font=`900 ${hs}px 'Cairo',sans-serif`;ctx.textAlign='right';ctx.textBaseline='top'
  const plain=slide.headline.replace(/\*+/g,'')
  const words=plain.split(' ');const lines:string[]=[];let cur=''
  for(const w of words){const test=cur?cur+' '+w:w;if(ctx.measureText(test).width>mx&&cur){lines.push(cur);cur=w}else cur=test}
  if(cur)lines.push(cur)
  let ly=H*0.32-(lines.length*lh)/2
  for(const line of lines){
    const segs=parseSegments(line.trim());let x=tr
    for(let si=segs.length-1;si>=0;si--){
      const s=segs[si];ctx.font=`900 ${hs}px 'Cairo',sans-serif`
      ctx.fillStyle=s.color||t.text;const sw=ctx.measureText(s.text).width
      ctx.fillText(s.text,x,ly);x-=sw
    }
    ly+=lh
  }
  if(slide.body){
    const bs=Math.round(42*fs);ctx.font=`500 ${bs}px 'Cairo',sans-serif`
    ctx.fillStyle=t.sub;ctx.textAlign='right';ctx.textBaseline='top'
    const bw=slide.body.split(' ');const bl:string[]=[];let bc=''
    for(const w of bw){const test=bc?bc+' '+w:w;if(ctx.measureText(test).width>mx&&bc){bl.push(bc);bc=w}else bc=test}
    if(bc)bl.push(bc)
    let by=ly+36
    for(const b of bl.slice(0,4)){ctx.fillText(b,tr,by);by+=bs*1.65}
  }
  const fy=H-110
  ctx.font=`700 ${Math.round(26*fs)}px 'Cairo',sans-serif`;ctx.fillStyle=t.brand
  ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(slide.handle||'@5gates.bh',tr,fy+22)
  const dc=Math.min(total,7),dw=14,aw=44,dh=14,dg=8
  let dx=(W-(dc*dw+(dc-1)*dg+(aw-dw)))/2
  for(let d=0;d<dc;d++){
    const w=d===idx?aw:dw
    ctx.fillStyle=d===idx?t.hl:(theme==='white'||theme==='cream'?'rgba(0,0,0,0.18)':'rgba(255,255,255,0.18)')
    ctx.beginPath();ctx.roundRect(dx,fy+15,w,dh,dh/2);ctx.fill();dx+=w+dg
  }
  return canvas.toDataURL('image/jpeg',0.92)
}

function SlideThumb({slide,idx,total,theme,fs,active,onClick}:{slide:Slide;idx:number;total:number;theme:Theme;fs:number;active:boolean;onClick:()=>void}) {
  const ref=useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    if(!ref.current)return
    const c=ref.current,W=c.width,H=c.height
    const t=T[theme],pfs=fs*(W/1080)
    const ctx=c.getContext('2d')!
    ctx.fillStyle=t.bg;ctx.fillRect(0,0,W,H)
    const gr=ctx.createRadialGradient(W*1.1,-H*0.1,0,W*1.1,-H*0.1,W*0.85)
    gr.addColorStop(0,theme==='darkred'?'rgba(204,51,51,0.45)':'rgba(204,51,51,0.22)')
    gr.addColorStop(1,'transparent')
    ctx.fillStyle=gr;ctx.fillRect(0,0,W,H)
    ctx.fillStyle=t.hl;ctx.beginPath();ctx.roundRect(W-195*W/1080,H*0.845,115*W/1080,7*H/1350,4);ctx.fill()
    const icon=getIcon(slide.headline,slide.icon)
    ctx.font=`${Math.round(90*pfs)}px serif`;ctx.textAlign='right';ctx.textBaseline='top'
    ctx.fillText(icon,W-75*W/1080,75*H/1350)
    ctx.font=`900 ${Math.round(30*pfs)}px 'Tajawal','Cairo',sans-serif`
    ctx.fillStyle=t.brand;ctx.textAlign='center';ctx.textBaseline='top'
    ctx.fillText('5GATES',W/2,68*H/1350)
    const hs=Math.round(88*pfs),lh=hs*1.3,tr=W-80*W/1080,mx=W-160*W/1080
    ctx.font=`900 ${hs}px 'Cairo',sans-serif`;ctx.textAlign='right';ctx.textBaseline='top'
    const plain=slide.headline.replace(/\*+/g,'')
    const words=plain.split(' ');const lines:string[]=[];let cur=''
    for(const w of words){const test=cur?cur+' '+w:w;if(ctx.measureText(test).width>mx&&cur){lines.push(cur);cur=w}else cur=test}
    if(cur)lines.push(cur)
    let ly=H*0.32-(lines.length*lh)/2
    for(const line of lines){
      const segs=parseSegments(line.trim());let x=tr
      for(let si=segs.length-1;si>=0;si--){
        const s=segs[si];ctx.font=`900 ${hs}px 'Cairo',sans-serif`
        ctx.fillStyle=s.color||t.text;const sw=ctx.measureText(s.text).width
        ctx.fillText(s.text,x,ly);x-=sw
      }
      ly+=lh
    }
  },[slide,theme,fs,idx,total])
  return(
    <canvas ref={ref} width={200} height={250} onClick={onClick} style={{
      borderRadius:12,cursor:'pointer',display:'block',flexShrink:0,
      boxShadow:active?'0 0 0 3px #CC3333,0 0 0 6px rgba(204,51,51,0.2)':'0 0 0 1px rgba(255,255,255,0.07)',
      transform:active?'translateY(-3px) scale(1.02)':'none',transition:'all .2s'
    }}/>
  )
}

function Badge({s}:{s:PostStatus}){
  const m:Record<PostStatus,{l:string;c:string;bg:string}>={
    scheduled:{l:'مجدول',c:'#60C8FF',bg:'rgba(96,200,255,0.1)'},
    published:{l:'منشور ✓',c:'#55DD88',bg:'rgba(85,221,136,0.1)'},
    failed:{l:'فشل ✕',c:'#FF5555',bg:'rgba(255,85,85,0.1)'},
    draft:{l:'مسودة',c:'#888',bg:'rgba(136,136,128,0.1)'},
    processing:{l:'ينشر…',c:'#F5C842',bg:'rgba(245,200,66,0.1)'},
  }
  const{l,c,bg}=m[s]||m.draft
  return <span style={{fontSize:10,fontWeight:700,padding:'2px 9px',borderRadius:20,color:c,background:bg,border:`1px solid ${c}40`}}>{l}</span>
}

const inp:React.CSSProperties={width:'100%',background:'#1E1E1E',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,color:'#F0EDE8',fontFamily:"'Cairo',sans-serif",fontSize:14,padding:'11px 13px',outline:'none',direction:'rtl',WebkitAppearance:'none',appearance:'none'}
const btnR:React.CSSProperties={background:'#CC3333',color:'#fff',border:'none',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:800,padding:'11px 18px',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,boxShadow:'0 3px 14px rgba(204,51,51,0.35)',WebkitTapHighlightColor:'transparent'}
const btnD:React.CSSProperties={background:'#2A2A2A',color:'#888',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:700,padding:'10px 14px',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5,WebkitTapHighlightColor:'transparent'}

export default function App() {
  const [authed,setAuthed]=useState(false)
  const [pw,setPw]=useState('');const [pwErr,setPwErr]=useState('')
  const [slides,setSlides]=useState<Slide[]>([])
  const [active,setActive]=useState(0)
  const [theme,setTheme]=useState<Theme>('dark')
  const [fs,setFs]=useState(1.0)
  const [eHead,setEHead]=useState('');const [eBody,setEBody]=useState('');const [eHandle,setEHandle]=useState('@5gates.bh')
  const [caption,setCaption]=useState('');const [schedDate,setSchedDate]=useState('');const [schedTime,setSchedTime]=useState('09:00')
  const [uploading,setUploading]=useState(false);const [schedMsg,setSchedMsg]=useState('')
  const [aiOpen,setAiOpen]=useState(false);const [aiPrompt,setAiPrompt]=useState('')
  const [aiNum,setAiNum]=useState('5');const [aiLang,setAiLang]=useState('ar')
  const [aiType,setAiType]=useState('hook');const [aiTone,setAiTone]=useState('bold')
  const [genning,setGenning]=useState(false)
  const [tab,setTab]=useState<'builder'|'queue'|'settings'>('builder')
  const [posts,setPosts]=useState<Post[]>([]);const [loadingQ,setLoadingQ]=useState(false)
  const [igToken,setIgToken]=useState('');const [igId,setIgId]=useState('')
  const [settingsMsg,setSettingsMsg]=useState('');const [savingS,setSavingS]=useState(false)
  const [toast,setToast]=useState('')
  const [savedCarousels,setSavedCarousels]=useState<{name:string;slides:Slide[];theme:Theme;fs:number;date:string}[]>([])
  const [saveOpen,setSaveOpen]=useState(false);const [saveName,setSaveName]=useState('')
  const [mPanel,setMPanel]=useState<'slides'|'preview'|'design'>('preview')

  function showToast(m:string){setToast(m);setTimeout(()=>setToast(''),3000)}

  useEffect(()=>{
    try{const r=localStorage.getItem('5gates_saved');if(r)setSavedCarousels(JSON.parse(r))}catch(_){}
  },[])

  useEffect(()=>{
    if(!slides.length)return
    const s=slides[active];setEHead(s.headline);setEBody(s.body);setEHandle(s.handle)
  },[active,slides.length])

  useEffect(()=>{
    if(!slides.length)return
    setSlides(p=>{const n=[...p];n[active]={...n[active],headline:eHead,body:eBody,handle:eHandle};return n})
  },[eHead,eBody,eHandle])

  async function login(){
    const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})})
    if(r.ok){setAuthed(true)}else setPwErr('كلمة المرور غير صحيحة')
  }

  async function generate(){
    if(!aiPrompt.trim()){showToast('أدخل موضوعاً');return}
    setGenning(true)
    try{
      const r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:aiPrompt,numSlides:+aiNum,lang:aiLang,type:aiType,tone:aiTone})})
      const d=await r.json();if(d.error)throw new Error(d.error)
      setSlides(d.slides);setActive(0);setAiOpen(false);setMPanel('preview')
      showToast(`✦ تم توليد ${d.slides.length} شرائح`)
    }catch(e:any){showToast('خطأ: '+e.message)}
    finally{setGenning(false)}
  }

  function renderAll(){return slides.map((sl,i)=>renderSlide(sl,i,slides.length,theme,fs))}

  function downloadSlides(){
    if(!slides.length){showToast('أضف شرائح أولاً');return}
    renderAll().forEach((b64,i)=>{const a=document.createElement('a');a.href=b64;a.download=`5gates-slide-${i+1}.jpg`;a.click()})
    showToast(`⬇️ تم تحميل ${slides.length} صورة`)
  }

  function saveCarousel(){
    if(!slides.length||!saveName.trim()){showToast('أدخل اسماً');return}
    const item={name:saveName,slides,theme,fs,date:new Date().toLocaleDateString('ar-BH')}
    const updated=[item,...savedCarousels.filter(c=>c.name!==saveName)]
    setSavedCarousels(updated);localStorage.setItem('5gates_saved',JSON.stringify(updated))
    setSaveOpen(false);setSaveName('');showToast('💾 تم الحفظ!')
  }

  function loadCarousel(c:{name:string;slides:Slide[];theme:Theme;fs:number}){
    setSlides(c.slides);setTheme(c.theme);setFs(c.fs);setActive(0)
    showToast(`📂 ${c.name}`)
  }

  async function schedulePost(publishNow=false){
    if(!slides.length){showToast('أضف شرائح أولاً');return}
    if(!publishNow&&(!schedDate||!schedTime)){showToast('حدد تاريخ ووقت');return}
    setUploading(true);setSchedMsg('')
    try{
      const imagesBase64=renderAll()
      const scheduledAt=publishNow?new Date().toISOString():new Date(`${schedDate}T${schedTime}:00`).toISOString()
      const r=await fetch('/api/schedule',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slides,caption,theme,fontScale:fs,scheduledAt,imagesBase64})})
      const d=await r.json();if(d.error)throw new Error(d.error)
      setSchedMsg(publishNow?'🚀 سيُنشر الآن!':`✓ تم الجدولة`)
      showToast(publishNow?'🚀 سيُنشر الآن!':'📅 تم الجدولة!')
    }catch(e:any){showToast('خطأ: '+e.message)}
    finally{setUploading(false)}
  }

  async function loadQueue(){
    setLoadingQ(true)
    const r=await fetch('/api/schedule');const d=await r.json()
    setPosts(d.posts||[]);setLoadingQ(false)
  }
  useEffect(()=>{if(tab==='queue'&&authed)loadQueue()},[tab,authed])

  async function saveSettings(){
    setSavingS(true)
    const r=await fetch('/api/auth/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ig_access_token:igToken,ig_user_id:igId})})
    const d=await r.json()
    if(d.igCheck?.valid)setSettingsMsg(`✓ متصل: @${d.igCheck.username}`)
    else if(d.igCheck?.error)setSettingsMsg(`✕ ${d.igCheck.error}`)
    else setSettingsMsg('تم الحفظ ✓')
    setSavingS(false)
  }

  async function postAction(id:number,action:string){
    await fetch('/api/posts',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action})})
    loadQueue()
  }

  // ── LOGIN ──
  if(!authed) return (
    <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0D0D0D',padding:20}}>
      <div style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.08)',borderTop:'3px solid #CC3333',borderRadius:20,padding:36,width:'100%',maxWidth:360,textAlign:'center'}}>
        <div style={{width:60,height:60,background:'#CC3333',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:24,color:'#fff',margin:'0 auto 16px',boxShadow:'0 4px 24px rgba(204,51,51,0.5)'}}>5G</div>
        <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:24,marginBottom:4}}>5GATES</div>
        <div style={{fontSize:11,color:'#CC3333',fontWeight:700,letterSpacing:1,marginBottom:28}}>CAROUSEL BUILDER</div>
        <input type="password" placeholder="كلمة المرور" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}
          style={{...inp,textAlign:'center',marginBottom:10,fontSize:16}}/>
        {pwErr&&<div style={{color:'#FF5555',fontSize:13,marginBottom:10}}>{pwErr}</div>}
        <button onClick={login} style={{...btnR,width:'100%',justifyContent:'center',padding:'13px',fontSize:15}}>دخول</button>
      </div>
    </div>
  )

  // ── MAIN ──
  return (
    <div style={{height:'100dvh',display:'flex',flexDirection:'column',overflow:'hidden',background:'#0D0D0D'}}>

      {/* TOP HEADER */}
      <header style={{height:54,background:'#1A1A1A',borderBottom:'2px solid #CC3333',display:'flex',alignItems:'center',padding:'0 14px',gap:8,flexShrink:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
          <div style={{width:34,height:34,background:'#CC3333',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:14,color:'#fff',boxShadow:'0 3px 12px rgba(204,51,51,0.5)',flexShrink:0}}>5G</div>
          <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:16}}>5GATES</div>
        </div>
        {tab==='builder'&&<>
          <button onClick={()=>setAiOpen(true)} style={{...btnR,padding:'8px 14px',fontSize:12,gap:4}}>✦ <span className="txt-hide">توليد</span> AI</button>
          {slides.length>0&&<>
            <button onClick={downloadSlides} title="تحميل PNG" style={{...btnD,padding:'8px 11px',fontSize:16,minWidth:40,justifyContent:'center'}}>⬇️</button>
            <button onClick={()=>setSaveOpen(true)} title="حفظ" style={{...btnD,padding:'8px 11px',fontSize:16,minWidth:40,justifyContent:'center'}}>💾</button>
          </>}
        </>}
        {tab==='queue'&&<button onClick={loadQueue} style={{...btnD,padding:'8px 12px',fontSize:13}}>↻ تحديث</button>}
      </header>

      {/* CONTENT */}
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>

        {/* ═══ BUILDER ═══ */}
        {tab==='builder'&&(
          <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>

            {/* Mobile sub-tabs */}
            <div className="m-tabs" style={{display:'flex',background:'#161616',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
              {(['slides','preview','design'] as const).map(p=>(
                <button key={p} onClick={()=>setMPanel(p)} style={{flex:1,padding:'10px 4px',background:'none',border:'none',color:mPanel===p?'#F0EDE8':'#444',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:mPanel===p?800:600,cursor:'pointer',borderBottom:mPanel===p?'2px solid #CC3333':'2px solid transparent',transition:'all .15s',WebkitTapHighlightColor:'transparent'}}>
                  {p==='slides'?`الشرائح (${slides.length})`:p==='preview'?'معاينة':'التصميم'}
                </button>
              ))}
            </div>

            <div style={{flex:1,overflow:'hidden',display:'flex'}}>

              {/* LEFT PANEL — slides */}
              <div className={`pnl pnl-slides ${mPanel==='slides'?'m-active':''}`}
                style={{width:240,minWidth:240,background:'#1A1A1A',borderLeft:'1px solid rgba(255,255,255,0.07)',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
                <div style={{flex:1,overflowY:'auto',padding:10}}>
                  {slides.map((sl,i)=>(
                    <div key={i} onClick={()=>{setActive(i);setMPanel('preview')}}
                      style={{background:active===i?'rgba(204,51,51,0.08)':'#222',border:`1px solid ${active===i?'#CC3333':'rgba(255,255,255,0.07)'}`,borderRadius:10,marginBottom:6,overflow:'hidden',display:'flex',cursor:'pointer',boxShadow:active===i?'inset 3px 0 0 #CC3333':'none'}}>
                      <div style={{width:30,minHeight:52,background:active===i?'#CC3333':'#2A2A2A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:active===i?'#fff':'#444',flexShrink:0}}>{i+1}</div>
                      <div style={{flex:1,padding:'8px',minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:'#F0EDE8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',direction:'rtl'}}>{sl.headline.replace(/\*+/g,'')||`شريحة ${i+1}`}</div>
                        <div style={{fontSize:11,color:'#444',marginTop:2}}>{getIcon(sl.headline,sl.icon)}</div>
                      </div>
                      <button onClick={e=>{e.stopPropagation();const n=[...slides];n.splice(i,1);setSlides(n);setActive(Math.max(0,i===active?i-1:active))}}
                        style={{background:'none',border:'none',color:'#333',width:28,cursor:'pointer',fontSize:14,flexShrink:0}}>✕</button>
                    </div>
                  ))}
                  <button onClick={()=>{setSlides(p=>[...p,{headline:'**عنوان** جديد',body:'نص الشريحة...',handle:'@5gates.bh'}]);setActive(slides.length);setMPanel('preview')}}
                    style={{width:'100%',background:'none',border:'1px dashed rgba(255,255,255,0.1)',borderRadius:10,color:'#444',fontFamily:"'Cairo',sans-serif",fontSize:13,padding:'10px',cursor:'pointer',marginTop:4,WebkitTapHighlightColor:'transparent'}}>
                    + إضافة شريحة
                  </button>
                  <div style={{marginTop:14,marginBottom:7,fontSize:9,fontWeight:800,letterSpacing:2,color:'#333',textTransform:'uppercase'}}>مواضيع سريعة</div>
                  {['أخطاء التدفق النقدي','ضريبة القيمة المضافة','نصائح ERP','تقييم الأعمال','المحاسبة الشهرية','نمو المشاريع الصغيرة'].map(tp=>(
                    <div key={tp} onClick={()=>{setAiPrompt(tp);setAiOpen(true)}}
                      style={{background:'#1E1E1E',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'8px',fontSize:12,fontWeight:700,color:'#444',cursor:'pointer',marginBottom:5,textAlign:'center'}}>
                      {tp}
                    </div>
                  ))}
                  {savedCarousels.length>0&&<>
                    <div style={{marginTop:14,marginBottom:7,fontSize:9,fontWeight:800,letterSpacing:2,color:'#333',textTransform:'uppercase'}}>محفوظات ({savedCarousels.length})</div>
                    {savedCarousels.map((c,i)=>(
                      <div key={i} style={{background:'#1E1E1E',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'7px 8px',fontSize:12,fontWeight:700,color:'#555',cursor:'pointer',marginBottom:5,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span onClick={()=>loadCarousel(c)}>📂 {c.name}</span>
                        <button onClick={()=>{const u=savedCarousels.filter(x=>x.name!==c.name);setSavedCarousels(u);localStorage.setItem('5gates_saved',JSON.stringify(u))}}
                          style={{background:'none',border:'none',color:'#333',cursor:'pointer',fontSize:13}}>✕</button>
                      </div>
                    ))}
                  </>}
                </div>
              </div>

              {/* CENTER PANEL — preview */}
              <div className={`pnl pnl-preview ${mPanel==='preview'?'m-active':''}`}
                style={{flex:1,background:'#0D0D0D',backgroundImage:'radial-gradient(circle at 20% 60%,rgba(204,51,51,0.05),transparent 50%)',display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
                <div style={{padding:'8px 12px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:8,background:'rgba(13,13,13,0.9)',flexShrink:0}}>
                  <button onClick={()=>setActive(Math.max(0,active-1))} disabled={active===0}
                    style={{...btnD,width:34,height:34,padding:0,justifyContent:'center',opacity:active===0?.3:1,fontSize:20}}>‹</button>
                  <span style={{fontSize:13,color:'#555',fontWeight:800,flex:1,textAlign:'center'}}>{slides.length?`${active+1} / ${slides.length}`:'—'}</span>
                  <button onClick={()=>setActive(Math.min(slides.length-1,active+1))} disabled={active>=slides.length-1}
                    style={{...btnD,width:34,height:34,padding:0,justifyContent:'center',opacity:active>=slides.length-1?.3:1,fontSize:20}}>›</button>
                  {slides.length>0&&<button className="m-only" onClick={()=>setMPanel('design')}
                    style={{...btnD,padding:'7px 11px',fontSize:12}}>✏️ تعديل</button>}
                </div>
                <div style={{flex:1,overflow:'auto',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px 14px',gap:12,flexWrap:'nowrap'}}>
                  {slides.length===0?(
                    <div style={{textAlign:'center',color:'#444',padding:20}}>
                      <div style={{fontSize:52,marginBottom:12}}>✦</div>
                      <div style={{fontSize:15,color:'#555',fontWeight:800,marginBottom:16}}>ابدأ الكاروسيل</div>
                      <button onClick={()=>setAiOpen(true)} style={{...btnR}}>✦ توليد AI</button>
                    </div>
                  ):slides.map((sl,i)=>(
                    <SlideThumb key={`${i}-${theme}-${fs}-${sl.headline.slice(0,6)}-${sl.icon}`}
                      slide={sl} idx={i} total={slides.length} theme={theme} fs={fs}
                      active={active===i} onClick={()=>setActive(i)}/>
                  ))}
                </div>
              </div>

              {/* RIGHT PANEL — design + edit + schedule */}
              <div className={`pnl pnl-design ${mPanel==='design'?'m-active':''}`}
                style={{width:285,minWidth:285,background:'#1A1A1A',borderRight:'1px solid rgba(255,255,255,0.07)',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
                <div style={{flex:1,overflowY:'auto',padding:14}}>

                  {/* Theme */}
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:9,fontWeight:800,letterSpacing:2,color:'#444',marginBottom:8,textTransform:'uppercase'}}>الثيم</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                      {(Object.entries(T) as [Theme,typeof T.dark][]).map(([id,t])=>(
                        <div key={id} onClick={()=>setTheme(id)} style={{aspectRatio:'4/5',background:t.bg,borderRadius:9,cursor:'pointer',border:`2px solid ${theme===id?'#CC3333':'transparent'}`,position:'relative',overflow:'hidden',transition:'border-color .15s'}}>
                          {theme===id&&<div style={{position:'absolute',top:4,right:4,width:16,height:16,background:'#CC3333',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff'}}>✓</div>}
                          <div style={{position:'absolute',bottom:0,left:0,right:0,padding:4,fontSize:8,fontWeight:800,textAlign:'center',background:'linear-gradient(to top,rgba(0,0,0,0.8),transparent)',color:'rgba(255,255,255,0.85)',textTransform:'uppercase'}}>{t.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Font scale */}
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:9,fontWeight:800,letterSpacing:2,color:'#444',marginBottom:6,textTransform:'uppercase'}}>حجم الخط — {Math.round(fs*100)}%</div>
                    <input type="range" min="0.7" max="1.4" step="0.05" value={fs} onChange={e=>setFs(+e.target.value)} style={{width:'100%',accentColor:'#CC3333',height:4}}/>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#333',marginTop:4}}><span>صغير</span><span>كبير</span></div>
                  </div>

                  {/* Edit */}
                  {slides.length>0&&(
                    <div style={{marginBottom:16,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:14}}>
                      <div style={{fontSize:9,fontWeight:800,letterSpacing:2,color:'#888',marginBottom:10,textTransform:'uppercase'}}>تعديل الشريحة {active+1}</div>
                      <div style={{fontSize:10,color:'#444',marginBottom:5}}>العنوان <span style={{color:'#333'}}>(**أحمر** · ***أصفر***)</span></div>
                      <textarea value={eHead} onChange={e=>setEHead(e.target.value)} rows={2} style={{...inp,resize:'none',lineHeight:1.8,marginBottom:10,fontSize:13}}/>
                      <div style={{fontSize:10,color:'#444',marginBottom:5}}>النص</div>
                      <textarea value={eBody} onChange={e=>setEBody(e.target.value)} rows={2} style={{...inp,resize:'none',lineHeight:1.8,marginBottom:10,fontSize:13}}/>
                      <div style={{fontSize:10,color:'#444',marginBottom:7}}>الأيقونة</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
                        {Object.entries(ICONS).map(([k,v])=>(
                          <div key={k} onClick={()=>setSlides(p=>{const n=[...p];n[active]={...n[active],icon:k};return n})}
                            style={{width:36,height:36,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,cursor:'pointer',background:slides[active]?.icon===k?'rgba(204,51,51,0.2)':'#222',border:`1px solid ${slides[active]?.icon===k?'#CC3333':'rgba(255,255,255,0.07)'}`,transition:'all .15s',WebkitTapHighlightColor:'transparent'}}>
                            {v}
                          </div>
                        ))}
                      </div>
                      <div style={{fontSize:10,color:'#444',marginBottom:5}}>الحساب</div>
                      <input value={eHandle} onChange={e=>setEHandle(e.target.value)} style={{...inp,marginBottom:10,fontSize:13}}/>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>{const n=[...slides];n.splice(active+1,0,{...slides[active]});setSlides(n);setActive(active+1)}} style={{...btnD,flex:1,justifyContent:'center',fontSize:12}}>⧉ نسخ</button>
                        <button onClick={()=>{const n=[...slides];n.splice(active,1);setSlides(n);setActive(Math.max(0,active-1))}} style={{...btnD,flex:1,justifyContent:'center',fontSize:12,color:'#ff5555'}}>✕ حذف</button>
                      </div>
                    </div>
                  )}

                  {/* Schedule */}
                  <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:14}}>
                    <div style={{fontSize:9,fontWeight:800,letterSpacing:2,color:'#888',marginBottom:10,textTransform:'uppercase'}}>الجدولة والنشر</div>
                    <div style={{fontSize:10,color:'#444',marginBottom:5}}>الكابشن</div>
                    <textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={3}
                      style={{...inp,resize:'none',lineHeight:1.7,fontSize:12,marginBottom:10}} placeholder={'تابعونا 💼\n#5gates #محاسبة #البحرين'}/>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                      <div><div style={{fontSize:10,color:'#444',marginBottom:4}}>التاريخ</div><input type="date" value={schedDate} onChange={e=>setSchedDate(e.target.value)} style={{...inp,fontSize:12}}/></div>
                      <div><div style={{fontSize:10,color:'#444',marginBottom:4}}>الوقت</div><input type="time" value={schedTime} onChange={e=>setSchedTime(e.target.value)} style={{...inp,fontSize:12}}/></div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>schedulePost(false)} disabled={uploading} style={{...btnD,flex:1,justifyContent:'center',fontSize:12,opacity:uploading?.6:1}}>📅 جدولة</button>
                      <button onClick={()=>schedulePost(true)} disabled={uploading} style={{...btnR,flex:1,justifyContent:'center',fontSize:12,opacity:uploading?.6:1}}>🚀 الآن</button>
                    </div>
                    {schedMsg&&<div style={{marginTop:8,background:'rgba(85,221,136,0.08)',border:'1px solid rgba(85,221,136,0.2)',borderRadius:8,padding:'8px',fontSize:12,color:'#55DD88'}}>{schedMsg}</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ QUEUE ═══ */}
        {tab==='queue'&&(
          <div style={{flex:1,overflow:'auto',padding:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
              <h2 style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:18,flex:1}}>قائمة الجدولة</h2>
              <button onClick={async()=>{await fetch('/api/publish',{method:'POST'});loadQueue()}} style={{...btnR,fontSize:12,padding:'8px 14px'}}>▶ تشغيل</button>
            </div>
            {loadingQ?<div style={{textAlign:'center',padding:40,color:'#444',fontSize:14}}>يحمّل…</div>:
             posts.length===0?<div style={{color:'#444',textAlign:'center',padding:60,fontSize:14}}>لا توجد بوستات مجدولة بعد</div>:(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {posts.map(post=>{
                  const pSlides:Slide[]=JSON.parse(post.slides_json as string)
                  const imgs:string[]=post.image_urls?JSON.parse(post.image_urls as string):[]
                  return(
                    <div key={post.id} style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:14}}>
                      <div style={{display:'flex',gap:7,marginBottom:10}}>
                        {imgs.slice(0,5).map((u,i)=><img key={i} src={u} alt="" style={{width:46,height:57,borderRadius:7,objectFit:'cover',border:'1px solid rgba(255,255,255,0.06)'}}/>)}
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5,flexWrap:'wrap'}}>
                        <Badge s={post.status}/><span style={{fontSize:11,color:'#333'}}>#{post.id}</span>
                        {post.ig_media_id&&<span style={{fontSize:10,color:'#55DD88'}}>✓ منشور</span>}
                      </div>
                      <div style={{fontSize:13,color:'#F0EDE8',direction:'rtl',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:5}}>{pSlides[0]?.headline.replace(/\*+/g,'')||'—'}</div>
                      <div style={{fontSize:11,color:'#444',marginBottom:8}}>📅 {new Date(post.scheduled_at as string).toLocaleString('ar-BH')}</div>
                      {post.error_msg&&<div style={{fontSize:11,color:'#FF5555',background:'rgba(255,85,85,0.07)',padding:'5px 8px',borderRadius:6,marginBottom:8}}>{post.error_msg}</div>}
                      <div style={{display:'flex',gap:6}}>
                        {post.status==='failed'&&<button onClick={()=>postAction(post.id,'retry')} style={{...btnD,fontSize:12,padding:'6px 12px'}}>↻ إعادة</button>}
                        {post.status==='scheduled'&&<button onClick={()=>postAction(post.id,'cancel')} style={{...btnD,fontSize:12,padding:'6px 12px'}}>⏸ إلغاء</button>}
                        <button onClick={async()=>{if(confirm('حذف؟')){await fetch('/api/posts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:post.id})});loadQueue()}}}
                          style={{...btnD,fontSize:12,padding:'6px 12px',color:'#ff5555'}}>✕ حذف</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ SETTINGS ═══ */}
        {tab==='settings'&&(
          <div style={{flex:1,overflow:'auto',padding:16}}>
            <h2 style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:18,marginBottom:16}}>الإعدادات</h2>
            <div style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.07)',borderTop:'2px solid #CC3333',borderRadius:14,padding:16,marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:800,color:'#CC3333',marginBottom:14}}>🔗 ربط Instagram</div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:10,color:'#444',fontWeight:800,marginBottom:5}}>Access Token</div>
                <input value={igToken} onChange={e=>setIgToken(e.target.value)} type="password" style={{...inp,direction:'ltr',fontFamily:'monospace'}} placeholder="EAA..."/>
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,color:'#444',fontWeight:800,marginBottom:5}}>User ID</div>
                <input value={igId} onChange={e=>setIgId(e.target.value)} style={{...inp,direction:'ltr',fontFamily:'monospace'}} placeholder="17841400000000000"/>
              </div>
              <button onClick={saveSettings} disabled={savingS} style={{...btnR,opacity:savingS?.6:1,width:'100%',justifyContent:'center'}}>{savingS?'يحفظ…':'💾 حفظ والتحقق'}</button>
              {settingsMsg&&<div style={{marginTop:10,fontSize:13,color:settingsMsg.includes('✓')?'#55DD88':'#FF5555',textAlign:'center'}}>{settingsMsg}</div>}
            </div>
            <div style={{background:'rgba(245,200,66,0.07)',border:'1px solid rgba(245,200,66,0.2)',borderRadius:12,padding:14}}>
              <div style={{fontSize:12,color:'#F5C842',fontWeight:700,marginBottom:6}}>⚠️ جدّد الـ Token كل 50 يوم</div>
              <div style={{fontSize:11,color:'#666',lineHeight:1.8,wordBreak:'break-all',direction:'ltr',textAlign:'left'}}>
                graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=YOUR_TOKEN
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <nav style={{height:62,background:'#1A1A1A',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'stretch',flexShrink:0,zIndex:10}}>
        {([['builder','🏗️','المنشئ'],['queue','📅','الجدولة'],['settings','⚙️','الإعدادات']] as const).map(([t,icon,label])=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,color:tab===t?'#CC3333':'#555',fontFamily:"'Cairo',sans-serif",transition:'color .15s',borderTop:tab===t?'2px solid #CC3333':'2px solid transparent',WebkitTapHighlightColor:'transparent'}}>
            <span style={{fontSize:22,lineHeight:1}}>{icon}</span>
            <span style={{fontSize:10,fontWeight:700}}>{label}</span>
          </button>
        ))}
      </nav>

      {/* AI MODAL — slides up from bottom on mobile */}
      {aiOpen&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setAiOpen(false)}}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(16px)',zIndex:1000,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.1)',borderTop:'3px solid #CC3333',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:580,maxHeight:'92dvh',overflowY:'auto',padding:22}}>
            <div style={{width:36,height:4,background:'rgba(255,255,255,0.15)',borderRadius:2,margin:'0 auto 16px'}}/>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:18}}>✦ توليد بالذكاء الاصطناعي</div>
              <button onClick={()=>setAiOpen(false)} style={{...btnD,width:34,height:34,padding:0,justifyContent:'center'}}>✕</button>
            </div>
            <div style={{fontSize:11,color:'#444',marginBottom:5}}>الموضوع</div>
            <textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} rows={3}
              style={{...inp,fontSize:14,resize:'none',lineHeight:1.8,marginBottom:10}} placeholder="مثال: أهم أخطاء تدمر التدفق النقدي..."/>
            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:14}}>
              {['أهم ٥ أخطاء في التدفق النقدي','لماذا تفشل الشركات في المحاسبة','كيف تعرف أن شركتك تحتاج ERP'].map(p=>(
                <div key={p} onClick={()=>setAiPrompt(p)} style={{background:'#222',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'5px 12px',fontSize:11,color:'#555',cursor:'pointer',fontFamily:"'Cairo',sans-serif",WebkitTapHighlightColor:'transparent'}}>{p.slice(0,22)}…</div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div><div style={{fontSize:10,color:'#444',marginBottom:5}}>الشرائح</div>
                <select value={aiNum} onChange={e=>setAiNum(e.target.value)} style={inp}>
                  {[['4','٤'],['5','٥'],['6','٦'],['7','٧']].map(([v,l])=><option key={v} value={v}>{l} شرائح</option>)}
                </select></div>
              <div><div style={{fontSize:10,color:'#444',marginBottom:5}}>اللغة</div>
                <select value={aiLang} onChange={e=>setAiLang(e.target.value)} style={inp}>
                  <option value="ar">🇸🇦 عربي</option><option value="en">🇬🇧 English</option>
                </select></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:18}}>
              <div><div style={{fontSize:10,color:'#444',marginBottom:5}}>النوع</div>
                <select value={aiType} onChange={e=>setAiType(e.target.value)} style={inp}>
                  {[['hook','🔥 هوك'],['tips','💡 نصائح'],['warning','⚠️ تحذيرات'],['facts','📊 حقائق'],['steps','📋 خطوات'],['contrast','⚡ مقارنة'],['myths','❌ خرافات']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select></div>
              <div><div style={{fontSize:10,color:'#444',marginBottom:5}}>الأسلوب</div>
                <select value={aiTone} onChange={e=>setAiTone(e.target.value)} style={inp}>
                  {[['bold','🔥 جريء'],['direct','⚡ مباشر'],['question','❓ أسئلة'],['expert','🎩 خبير']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select></div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setAiOpen(false)} style={{...btnD,flex:1,justifyContent:'center'}}>إلغاء</button>
              <button onClick={generate} disabled={genning} style={{...btnR,flex:2,justifyContent:'center',opacity:genning?.6:1}}>
                {genning?<><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.2)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .6s linear infinite',display:'inline-block'}}/> جاري…</>:'✦ توليد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE MODAL */}
      {saveOpen&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setSaveOpen(false)}}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(16px)',zIndex:1000,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.1)',borderTop:'3px solid #CC3333',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:520,padding:24}}>
            <div style={{width:36,height:4,background:'rgba(255,255,255,0.15)',borderRadius:2,margin:'0 auto 16px'}}/>
            <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:18,marginBottom:14}}>💾 حفظ الكاروسيل</div>
            <input value={saveName} onChange={e=>setSaveName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveCarousel()}
              style={{...inp,marginBottom:16,fontSize:15}} placeholder="مثال: أخطاء التدفق النقدي"/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setSaveOpen(false)} style={{...btnD,flex:1,justifyContent:'center'}}>إلغاء</button>
              <button onClick={saveCarousel} style={{...btnR,flex:2,justifyContent:'center'}}>💾 حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast&&<div style={{position:'fixed',bottom:72,left:'50%',transform:'translateX(-50%)',background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.12)',borderRight:'3px solid #CC3333',color:'#F0EDE8',padding:'10px 20px',borderRadius:10,fontSize:13,zIndex:9999,boxShadow:'0 8px 28px rgba(0,0,0,0.7)',whiteSpace:'nowrap',fontFamily:"'Cairo',sans-serif"}}>{toast}</div>}

      <style>{`
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#2A2A2A;border-radius:2px}

        /* ── Desktop: hide mobile tabs, show all panels ── */
        @media(min-width:768px){
          .m-tabs{display:none!important}
          .m-only{display:none!important}
          .pnl{display:flex!important}
        }

        /* ── Mobile: show only selected panel ── */
        @media(max-width:767px){
          .m-tabs{display:flex!important}
          .pnl{display:none!important;width:100%!important;min-width:0!important;flex:1!important}
          .pnl.m-active{display:flex!important;flex-direction:column!important}
          .txt-hide{display:none}
        }
      `}</style>
    </div>
  )
}
