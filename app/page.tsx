'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────────────
type Slide = { headline: string; body: string; handle: string }
type Theme = 'dark'|'darker'|'white'|'cream'|'darkred'|'charcoal'
type PostStatus = 'scheduled'|'published'|'failed'|'draft'|'processing'
type Post = {
  id:number; slides_json:string; caption:string; theme:Theme; font_scale:number
  status:PostStatus; scheduled_at:string; published_at:string|null
  ig_media_id:string|null; error_msg:string|null; image_urls:string|null; created_at:string
}

// ─── Theme definitions ────────────────────────────────────────
const T: Record<Theme,{bg:string;text:string;sub:string;brand:string;hl:string;label:string}> = {
  dark:     {bg:'#111111',text:'#F0EDE8',sub:'rgba(240,237,232,0.65)',brand:'rgba(240,237,232,0.35)',hl:'#CC3333',label:'Dark'},
  darker:   {bg:'#050505',text:'#F5F5F5',sub:'rgba(245,245,245,0.58)',brand:'rgba(245,245,245,0.30)',hl:'#CC3333',label:'Black'},
  white:    {bg:'#FFFFFF',text:'#111111',sub:'rgba(17,17,17,0.60)',   brand:'rgba(17,17,17,0.35)',   hl:'#CC3333',label:'White'},
  cream:    {bg:'#F5F0E8',text:'#111111',sub:'rgba(17,17,17,0.56)',   brand:'rgba(17,17,17,0.32)',   hl:'#CC3333',label:'Cream'},
  darkred:  {bg:'#180404',text:'#FFF0F0',sub:'rgba(255,240,240,0.58)',brand:'rgba(255,240,240,0.30)',hl:'#FF5555',label:'Red'},
  charcoal: {bg:'#1C1C1C',text:'#EDEDED',sub:'rgba(237,237,237,0.60)',brand:'rgba(237,237,237,0.32)',hl:'#CC3333',label:'Charcoal'},
}

// ─── Parse **bold** markup ────────────────────────────────────
function parseSegments(text: string): {text:string; color:string|null}[] {
  const segs: {text:string;color:string|null}[] = []
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*)/g
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({text: text.slice(last, m.index), color: null})
    if (m[2])      segs.push({text: m[2], color: '#F5C842'})   // ***yellow***
    else if (m[3]) segs.push({text: m[3], color: '#CC3333'})   // **red**
    last = m.index + m[0].length
  }
  if (last < text.length) segs.push({text: text.slice(last), color: null})
  return segs
}

// ─── Draw one slide to an offscreen canvas → base64 JPEG ─────
function renderSlideToBase64(
  slide: Slide, idx: number, total: number, theme: Theme, fontScale: number,
  W = 1080, H = 1350
): string {
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  const t   = T[theme]
  const fs  = fontScale

  // Background
  ctx.fillStyle = t.bg
  ctx.fillRect(0, 0, W, H)

  // Subtle radial glow (top-right)
  const gr = ctx.createRadialGradient(W * 1.1, -H * 0.1, 0, W * 1.1, -H * 0.1, W * 0.85)
  gr.addColorStop(0, theme === 'darkred' ? 'rgba(204,51,51,0.45)' : 'rgba(204,51,51,0.22)')
  gr.addColorStop(1, 'transparent')
  ctx.fillStyle = gr
  ctx.fillRect(0, 0, W, H)

  // Red accent line bottom
  ctx.fillStyle = t.hl
  ctx.beginPath()
  ctx.roundRect(W - 195, H * 0.845, 115, 7, 4)
  ctx.fill()

  // Brand name top-center
  ctx.font = `900 ${Math.round(30 * fs)}px 'Tajawal', 'Cairo', sans-serif`
  ctx.fillStyle = t.brand
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText('5GATES', W / 2, 68)

  // Headline (RTL, right-aligned, multiline, with colored segments)
  const headSize  = Math.round(88 * fs)
  const lineH     = headSize * 1.3
  const textRight = W - 80
  const maxWidth  = W - 160

  ctx.font = `900 ${headSize}px 'Cairo', sans-serif`
  ctx.textAlign  = 'right'
  ctx.textBaseline = 'top'

  // Word-wrap helper
  function wrapText(fullText: string, maxW: number): string[] {
    const words = fullText.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w }
      else cur = test
    }
    if (cur) lines.push(cur)
    return lines
  }

  // Strip markup for wrapping measurement
  const plainHead = slide.headline.replace(/\*+/g, '')
  const lines     = wrapText(plainHead, maxWidth)
  const headY     = H * 0.32 - (lines.length * lineH) / 2

  // Draw each line with colored segments
  const allSegs = parseSegments(slide.headline)

  // Re-segment per line (simple approach: draw full headline with colors)
  // Split headline into lines respecting word boundaries, then draw with color
  let lineY = headY
  for (const line of lines) {
    // Find matching segments for this line
    const segsForLine = parseSegments(line.trim())
    let x = textRight
    // Measure total line width to start from right
    const totalW = segsForLine.reduce((sum, s) => {
      ctx.font = `900 ${headSize}px 'Cairo', sans-serif`
      return sum + ctx.measureText(s.text).width
    }, 0)
    x = textRight
    // Draw RTL: iterate segments right-to-left
    for (let si = segsForLine.length - 1; si >= 0; si--) {
      const seg = segsForLine[si]
      ctx.font = `900 ${headSize}px 'Cairo', sans-serif`
      ctx.fillStyle = seg.color || t.text
      const sw = ctx.measureText(seg.text).width
      ctx.fillText(seg.text, x, lineY)
      x -= sw
    }
    lineY += lineH
  }

  // Body text
  if (slide.body) {
    const bodySize = Math.round(42 * fs)
    ctx.font       = `500 ${bodySize}px 'Cairo', sans-serif`
    ctx.fillStyle  = t.sub
    ctx.textAlign  = 'right'
    ctx.textBaseline = 'top'

    const bodyLines = wrapText(slide.body, maxWidth)
    let by = lineY + 36
    for (const bl of bodyLines.slice(0, 4)) {
      ctx.fillText(bl, textRight, by)
      by += bodySize * 1.65
    }
  }

  // Footer: handle (right) + dots (center) + arrow (left)
  const footY = H - 110

  // Handle
  ctx.font = `700 ${Math.round(26 * fs)}px 'Cairo', sans-serif`
  ctx.fillStyle  = t.brand
  ctx.textAlign  = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(slide.handle || '@5gates.bh', textRight, footY + 22)

  // Progress dots (center)
  const dotCount = Math.min(total, 7)
  const dotW  = 14, activeW = 44, dotH = 14, dotGap = 8
  const totalDotsW = dotCount * dotW + (dotCount - 1) * dotGap + (activeW - dotW)
  let dx = (W - totalDotsW) / 2
  for (let d = 0; d < dotCount; d++) {
    const w = d === idx ? activeW : dotW
    ctx.fillStyle = d === idx ? t.hl : (theme === 'white' || theme === 'cream' ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)')
    ctx.beginPath()
    ctx.roundRect(dx, footY + 15, w, dotH, dotH / 2)
    ctx.fill()
    dx += w + dotGap
  }

  // Arrow circle (left)
  const arrowX = 100, arrowY = footY + 22
  ctx.strokeStyle = theme === 'white' || theme === 'cream' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.arc(arrowX, arrowY, 32, 0, Math.PI * 2); ctx.stroke()
  ctx.font = `400 32px 'Cairo', sans-serif`
  ctx.fillStyle = t.text
  ctx.globalAlpha = 0.45
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('›', arrowX, arrowY + 2)
  ctx.globalAlpha = 1

  return canvas.toDataURL('image/jpeg', 0.92)
}

// ─── Slide Preview (scaled-down) ─────────────────────────────
function SlidePreview({ slide, idx, total, theme, fs, active, onClick }:
  {slide:Slide;idx:number;total:number;theme:Theme;fs:number;active:boolean;onClick:()=>void}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const canvas = ref.current
    const full   = document.createElement('canvas')
    full.width = 1080; full.height = 1350
    const ctx = full.getContext('2d')!
    // Draw to full size then shrink
    renderSlideToBase64(slide, idx, total, theme, fs, 1080, 1350)
    // Actually draw directly at preview size for perf
    const t   = T[theme]
    const W   = canvas.width, H = canvas.height
    const pfs = fs * (W / 1080)
    const c   = canvas.getContext('2d')!

    c.fillStyle = t.bg; c.fillRect(0,0,W,H)
    const gr = c.createRadialGradient(W*1.1,-H*0.1,0,W*1.1,-H*0.1,W*0.85)
    gr.addColorStop(0, theme==='darkred'?'rgba(204,51,51,0.45)':'rgba(204,51,51,0.22)')
    gr.addColorStop(1,'transparent')
    c.fillStyle=gr; c.fillRect(0,0,W,H)
    c.fillStyle=t.hl; c.beginPath(); c.roundRect(W-195*W/1080,H*0.845,115*W/1080,7*H/1350,4); c.fill()
    c.font=`900 ${Math.round(30*pfs)}px 'Tajawal','Cairo',sans-serif`
    c.fillStyle=t.brand; c.textAlign='center'; c.textBaseline='top'
    c.fillText('5GATES',W/2,68*H/1350)
    const hs=Math.round(88*pfs), lh=hs*1.3, tr=W-80*W/1080, mx=W-160*W/1080
    c.font=`900 ${hs}px 'Cairo',sans-serif`
    c.textAlign='right'; c.textBaseline='top'
    const plain=slide.headline.replace(/\*+/g,'')
    const words=plain.split(' '); const lines:string[]=[]
    let cur=''
    for(const w of words){const test=cur?cur+' '+w:w;if(c.measureText(test).width>mx&&cur){lines.push(cur);cur=w}else cur=test}
    if(cur)lines.push(cur)
    let ly=H*0.32-(lines.length*lh)/2
    for(const line of lines){
      const segs=parseSegments(line.trim()); let x=tr
      for(let si=segs.length-1;si>=0;si--){
        const s=segs[si]; c.font=`900 ${hs}px 'Cairo',sans-serif`
        c.fillStyle=s.color||t.text; const sw=c.measureText(s.text).width
        c.fillText(s.text,x,ly); x-=sw
      }
      ly+=lh
    }
    if(slide.body){
      const bs=Math.round(42*pfs); c.font=`500 ${bs}px 'Cairo',sans-serif`
      c.fillStyle=t.sub; c.textAlign='right'; c.textBaseline='top'
      const bls=slide.body.split(' '); const blines:string[]=[]; let bc=''
      for(const w of bls){const test=bc?bc+' '+w:w;if(c.measureText(test).width>mx&&bc){blines.push(bc);bc=w}else bc=test}
      if(bc)blines.push(bc)
      let by=ly+36*H/1350
      for(const bl of blines.slice(0,4)){c.fillText(bl,tr,by);by+=bs*1.65}
    }
    const fy=H-110*H/1350
    c.font=`700 ${Math.round(26*pfs)}px 'Cairo',sans-serif`; c.fillStyle=t.brand; c.textAlign='right'; c.textBaseline='middle'
    c.fillText(slide.handle||'@5gates.bh',tr,fy+22*H/1350)
    const dc=Math.min(total,7),dw=14*W/1080,aw=44*W/1080,dh=14*H/1350,dg=8*W/1080
    let dx=(W-(dc*dw+(dc-1)*dg+(aw-dw)))/2
    for(let d=0;d<dc;d++){const w=d===idx?aw:dw; c.fillStyle=d===idx?t.hl:(theme==='white'||theme==='cream'?'rgba(0,0,0,0.18)':'rgba(255,255,255,0.18)'); c.beginPath(); c.roundRect(dx,fy+15*H/1350,w,dh,dh/2); c.fill(); dx+=w+dg}
  }, [slide, idx, total, theme, fs, active])

  return (
    <canvas ref={ref} width={300} height={375} onClick={onClick}
      style={{ borderRadius:14, cursor:'pointer', display:'block', flexShrink:0,
        boxShadow: active ? '0 0 0 2px #CC3333, 0 0 0 5px rgba(204,51,51,0.2), 0 20px 40px rgba(0,0,0,0.7)' : '0 0 0 1px rgba(255,255,255,0.07), 0 16px 32px rgba(0,0,0,0.6)',
        transform: active ? 'translateY(-3px)' : 'none', transition: 'transform .2s, box-shadow .2s' }} />
  )
}

// ─── Status badge ──────────────────────────────────────────────
function Badge({s}:{s:PostStatus}) {
  const m:Record<PostStatus,{l:string;c:string;bg:string}> = {
    scheduled:  {l:'مجدول',   c:'#60C8FF',bg:'rgba(96,200,255,0.1)'},
    published:  {l:'منشور ✓', c:'#55DD88',bg:'rgba(85,221,136,0.1)'},
    failed:     {l:'فشل ✕',   c:'#FF5555',bg:'rgba(255,85,85,0.1)'},
    draft:      {l:'مسودة',   c:'#888',   bg:'rgba(136,136,128,0.1)'},
    processing: {l:'ينشر…',   c:'#F5C842',bg:'rgba(245,200,66,0.1)'},
  }
  const {l,c,bg} = m[s]||m.draft
  return <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,color:c,background:bg,border:`1px solid ${c}40`}}>{l}</span>
}

// ─── Shared styles ─────────────────────────────────────────────
const inp:React.CSSProperties = {width:'100%',background:'#222',border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,color:'#F0EDE8',fontFamily:"'Cairo',sans-serif",fontSize:13,padding:'8px 11px',outline:'none',direction:'rtl'}
const btnR:React.CSSProperties = {background:'#CC3333',color:'#fff',border:'none',borderRadius:8,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:800,padding:'8px 15px',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,boxShadow:'0 3px 14px rgba(204,51,51,0.35)'}
const btnD:React.CSSProperties = {background:'#222',color:'#888',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,padding:'7px 12px',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5}

// ════════════════════════════════════════════════════════════
//  APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const [authed,setAuthed]  = useState(false)
  const [pw,setPw]          = useState('')
  const [pwErr,setPwErr]    = useState('')

  const [slides,setSlides]  = useState<Slide[]>([])
  const [active,setActive]  = useState(0)
  const [theme,setTheme]    = useState<Theme>('dark')
  const [fs,setFs]          = useState(1.0)

  const [eHead,setEHead]    = useState('')
  const [eBody,setEBody]    = useState('')
  const [eHandle,setEHandle]= useState('@5gates.bh')

  const [caption,setCaption]     = useState('')
  const [schedDate,setSchedDate] = useState('')
  const [schedTime,setSchedTime] = useState('09:00')
  const [uploading,setUploading] = useState(false)
  const [schedMsg,setSchedMsg]   = useState('')

  const [aiOpen,setAiOpen]    = useState(false)
  const [aiPrompt,setAiPrompt]= useState('')
  const [aiNum,setAiNum]      = useState('5')
  const [aiLang,setAiLang]    = useState('ar')
  const [aiType,setAiType]    = useState('hook')
  const [aiTone,setAiTone]    = useState('bold')
  const [genning,setGenning]  = useState(false)

  const [tab,setTab]          = useState<'builder'|'queue'|'settings'>('builder')
  const [posts,setPosts]      = useState<Post[]>([])
  const [loadingQ,setLoadingQ]= useState(false)

  const [igToken,setIgToken]  = useState('')
  const [igId,setIgId]        = useState('')
  const [settingsMsg,setSettingsMsg] = useState('')
  const [savingS,setSavingS]  = useState(false)

  const [toast,setToast]      = useState('')

  function showToast(m:string) { setToast(m); setTimeout(()=>setToast(''),3200) }

  async function login() {
    const r = await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})})
    if(r.ok){setAuthed(true);setPwErr('')}else setPwErr('كلمة المرور غير صحيحة')
  }

  // Sync edit fields when active slide changes
  useEffect(()=>{
    if(!slides.length)return
    const s=slides[active]
    setEHead(s.headline);setEBody(s.body);setEHandle(s.handle)
  },[active,slides.length])

  // Live edit
  useEffect(()=>{
    if(!slides.length)return
    setSlides(prev=>{const n=[...prev];n[active]={headline:eHead,body:eBody,handle:eHandle};return n})
  },[eHead,eBody,eHandle])

  async function generate() {
    if(!aiPrompt.trim()){showToast('أدخل موضوعاً');return}
    setGenning(true)
    try {
      const r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:aiPrompt,numSlides:+aiNum,lang:aiLang,type:aiType,tone:aiTone})})
      const d=await r.json()
      if(d.error)throw new Error(d.error)
      setSlides(d.slides);setActive(0);setAiOpen(false)
      showToast(`✦ تم توليد ${d.slides.length} شرائح`)
    } catch(e:any){showToast('خطأ: '+e.message)}
    finally{setGenning(false)}
  }

  // Render slides to base64 using Canvas API (runs in browser — no Puppeteer needed!)
  function renderAllSlides(): string[] {
    return slides.map((sl,i) => renderSlideToBase64(sl, i, slides.length, theme, fs))
  }

  async function schedulePost(publishNow=false) {
    if(!slides.length){showToast('أضف شرائح أولاً');return}
    if(!publishNow&&(!schedDate||!schedTime)){showToast('حدد تاريخ ووقت النشر');return}
    setUploading(true);setSchedMsg('')
    try {
      // Render slides to base64 in browser
      const imagesBase64 = renderAllSlides()
      const scheduledAt  = publishNow ? new Date().toISOString() : new Date(`${schedDate}T${schedTime}:00`).toISOString()

      const r = await fetch('/api/schedule',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slides,caption,theme,fontScale:fs,scheduledAt,imagesBase64,publishNow})})
      const d = await r.json()
      if(d.error)throw new Error(d.error)

      setSchedMsg(publishNow ? '🚀 تم الإرسال للنشر الفوري!' : `✓ تم الجدولة!\nسيُنشر: ${new Date(d.scheduledAt).toLocaleString('ar-BH')}`)
      showToast(publishNow?'🚀 سيُنشر الآن!':'📅 تم الجدولة!')
    } catch(e:any){showToast('خطأ: '+e.message)}
    finally{setUploading(false)}
  }

  async function loadQueue() {
    setLoadingQ(true)
    const r=await fetch('/api/schedule');const d=await r.json()
    setPosts(d.posts||[]);setLoadingQ(false)
  }
  useEffect(()=>{if(tab==='queue'&&authed)loadQueue()},[tab,authed])

  async function saveSettings() {
    setSavingS(true)
    const r=await fetch('/api/auth/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ig_access_token:igToken,ig_user_id:igId})})
    const d=await r.json()
    if(d.igCheck?.valid) setSettingsMsg(`✓ متصل: @${d.igCheck.username}`)
    else if(d.igCheck?.error) setSettingsMsg(`✕ ${d.igCheck.error}`)
    else setSettingsMsg('تم الحفظ ✓')
    setSavingS(false)
  }

  async function postAction(id:number, action:string, scheduledAt?:string) {
    await fetch('/api/posts',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action,scheduledAt})})
    loadQueue()
  }

  // ─── Login screen ──────────────────────────────────────────
  if(!authed) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0D0D0D'}}>
      <div style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.08)',borderTop:'2px solid #CC3333',borderRadius:18,padding:40,width:340,textAlign:'center'}}>
        <div style={{width:52,height:52,background:'#CC3333',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:22,color:'#fff',margin:'0 auto 18px',boxShadow:'0 4px 20px rgba(204,51,51,0.5)'}}>5G</div>
        <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:22,marginBottom:3}}>5GATES</div>
        <div style={{fontSize:10,color:'#CC3333',fontWeight:700,letterSpacing:1,marginBottom:26}}>CAROUSEL BUILDER</div>
        <input type="password" placeholder="كلمة المرور" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}
          style={{...inp,textAlign:'center',marginBottom:10,fontSize:16,letterSpacing:2}}/>
        {pwErr&&<div style={{color:'#FF5555',fontSize:12,marginBottom:8}}>{pwErr}</div>}
        <button onClick={login} style={{...btnR,width:'100%',justifyContent:'center',padding:'10px',fontSize:14}}>دخول</button>
      </div>
    </div>
  )

  // ─── Main app ──────────────────────────────────────────────
  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>

      {/* Header */}
      <header style={{height:52,background:'#1A1A1A',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',padding:'0 18px',gap:12,flexShrink:0,position:'relative'}}>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:1,background:'linear-gradient(90deg,#CC3333 0%,transparent 40%)'}}/>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:30,height:30,background:'#CC3333',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:13,color:'#fff',boxShadow:'0 3px 12px rgba(204,51,51,0.5)'}}>5G</div>
          <div>
            <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:16,letterSpacing:1}}>5GATES</div>
            <div style={{fontSize:9,color:'#CC3333',fontWeight:700,letterSpacing:0.5,lineHeight:1}}>Where Strength is in Numbers</div>
          </div>
        </div>
        <div style={{width:1,height:24,background:'rgba(255,255,255,0.12)',margin:'0 4px'}}/>
        {(['builder','queue','settings'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{background:'none',border:'none',color:tab===t?'#F0EDE8':'#555',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:tab===t?800:600,cursor:'pointer',padding:'4px 10px',borderBottom:tab===t?'2px solid #CC3333':'2px solid transparent',transition:'all .15s'}}>
            {t==='builder'?'المنشئ':t==='queue'?'قائمة الجدولة':'الإعدادات'}
          </button>
        ))}
        <div style={{marginRight:'auto',display:'flex',gap:8}}>
          {tab==='builder'&&<button onClick={()=>setAiOpen(true)} style={btnR}>✦ توليد AI</button>}
        </div>
      </header>

      {/* ── BUILDER TAB ── */}
      {tab==='builder'&&(
        <div style={{flex:1,display:'grid',gridTemplateColumns:'265px 1fr 285px',overflow:'hidden'}}>

          {/* Left - slide list */}
          <div style={{background:'#1A1A1A',borderLeft:'1px solid rgba(255,255,255,0.07)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'10px 12px 8px',borderBottom:'1px solid rgba(255,255,255,0.07)',fontSize:9,fontWeight:800,letterSpacing:2,color:'#888',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>الشرائح</span>
              <span style={{background:'#CC3333',color:'#fff',padding:'1px 7px',borderRadius:10,fontSize:9,fontWeight:800}}>{slides.length}</span>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:10,scrollbarWidth:'thin',scrollbarColor:'#333 transparent'}}>
              {slides.map((sl,i)=>(
                <div key={i} onClick={()=>setActive(i)} style={{background:active===i?'rgba(204,51,51,0.07)':'#222',border:`1px solid ${active===i?'#CC3333':'rgba(255,255,255,0.07)'}`,borderRadius:9,marginBottom:5,overflow:'hidden',display:'flex',cursor:'pointer',boxShadow:active===i?'inset 3px 0 0 #CC3333':'none'}}>
                  <div style={{width:28,minHeight:48,background:active===i?'#CC3333':'#2E2E2E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:active===i?'#fff':'#444',flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1,padding:'8px 8px',minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#F0EDE8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',direction:'rtl'}}>{sl.headline.replace(/\*+/g,'')||`شريحة ${i+1}`}</div>
                    <div style={{fontSize:10,color:'#444',marginTop:2}}>{sl.handle}</div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();const n=[...slides];n.splice(i,1);setSlides(n);setActive(Math.max(0,i===active?i-1:active))}}
                    style={{background:'none',border:'none',color:'#444',width:22,cursor:'pointer',transition:'color .14s'}}
                    onMouseEnter={e=>e.currentTarget.style.color='#ff5555'} onMouseLeave={e=>e.currentTarget.style.color='#444'}>✕</button>
                </div>
              ))}
              <button onClick={()=>{setSlides(p=>[...p,{headline:'**عنوان** جديد',body:'نص الشريحة...',handle:'@5gates.bh'}]);setActive(slides.length)}}
                style={{width:'100%',background:'none',border:'1px dashed rgba(255,255,255,0.12)',borderRadius:9,color:'#444',fontFamily:"'Cairo',sans-serif",fontSize:12,padding:'8px',cursor:'pointer',marginTop:4,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#CC3333';e.currentTarget.style.color='#CC3333'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.12)';e.currentTarget.style.color='#444'}}>
                + إضافة شريحة
              </button>
              <div style={{marginTop:16,marginBottom:8,fontSize:9,fontWeight:800,letterSpacing:2,color:'#444',textTransform:'uppercase'}}>مواضيع سريعة</div>
              {['أخطاء التدفق النقدي','ضريبة القيمة المضافة','نصائح ERP','تقييم الأعمال','المحاسبة الشهرية','نمو المشاريع الصغيرة'].map(tp=>(
                <div key={tp} onClick={()=>{setAiPrompt(tp);setAiOpen(true)}}
                  style={{background:'#222',border:'1px solid rgba(255,255,255,0.07)',borderRadius:7,padding:'6px 7px',fontSize:11,fontWeight:700,color:'#555',cursor:'pointer',marginBottom:4,textAlign:'center',transition:'all .14s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#CC3333';e.currentTarget.style.color='#F0EDE8'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';e.currentTarget.style.color='#555'}}>{tp}</div>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div style={{background:'#0D0D0D',backgroundImage:'radial-gradient(circle at 25% 60%,rgba(204,51,51,0.05) 0%,transparent 50%),linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)',backgroundSize:'auto,28px 28px,28px 28px',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'8px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:10,background:'rgba(13,13,13,0.85)',backdropFilter:'blur(10px)'}}>
              <span style={{fontSize:11,color:'#444'}}>انقر للتحديد</span>
              <div style={{display:'flex',alignItems:'center',gap:5,marginRight:'auto'}}>
                <button onClick={()=>setActive(Math.max(0,active-1))} disabled={active===0} style={{...btnD,width:26,height:26,padding:0,justifyContent:'center',opacity:active===0?.3:1}}>‹</button>
                <span style={{fontSize:13,color:'#888',minWidth:44,textAlign:'center',fontWeight:800}}>{slides.length?`${active+1}/${slides.length}`:'—'}</span>
                <button onClick={()=>setActive(Math.min(slides.length-1,active+1))} disabled={active>=slides.length-1} style={{...btnD,width:26,height:26,padding:0,justifyContent:'center',opacity:active>=slides.length-1?.3:1}}>›</button>
              </div>
            </div>
            <div style={{flex:1,overflow:'auto',display:'flex',alignItems:'center',justifyContent:'center',padding:'32px 20px',gap:16}}>
              {slides.length===0?(
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12,color:'#444',textAlign:'center'}}>
                  <div style={{width:64,height:64,background:'rgba(204,51,51,0.08)',border:'1px solid rgba(204,51,51,0.2)',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>✦</div>
                  <div style={{fontSize:14,color:'#777',fontWeight:800}}>ابدأ الكاروسيل</div>
                  <div style={{fontSize:12,color:'#444',lineHeight:1.6,maxWidth:220}}>اضغط توليد AI أو أضف شريحة يدوياً</div>
                  <button onClick={()=>setAiOpen(true)} style={{...btnR,marginTop:8}}>✦ توليد AI</button>
                </div>
              ):slides.map((sl,i)=>(
                <SlidePreview key={`${i}-${theme}-${fs}-${sl.headline.slice(0,10)}`} slide={sl} idx={i} total={slides.length} theme={theme} fs={fs} active={active===i} onClick={()=>setActive(i)}/>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div style={{background:'#1A1A1A',borderRight:'1px solid rgba(255,255,255,0.07)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'10px 12px 8px',borderBottom:'1px solid rgba(255,255,255,0.07)',fontSize:9,fontWeight:800,letterSpacing:2,color:'#888',textTransform:'uppercase'}}>التصميم والجدولة</div>
            <div style={{flex:1,overflowY:'auto',padding:12,scrollbarWidth:'thin',scrollbarColor:'#333 transparent'}}>

              {/* Theme */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:9,fontWeight:800,letterSpacing:2,color:'#444',marginBottom:7,textTransform:'uppercase'}}>الثيم</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>
                  {(Object.entries(T) as [Theme,typeof T.dark][]).map(([id,t])=>(
                    <div key={id} onClick={()=>setTheme(id)} style={{aspectRatio:'4/5',background:t.bg,borderRadius:8,cursor:'pointer',border:`2px solid ${theme===id?'#CC3333':'transparent'}`,transition:'all .15s',position:'relative',overflow:'hidden'}}>
                      {theme===id&&<div style={{position:'absolute',top:4,right:4,width:16,height:16,background:'#CC3333',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff'}}>✓</div>}
                      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:4,fontSize:8,fontWeight:800,textAlign:'center',background:'linear-gradient(to top,rgba(0,0,0,0.75),transparent)',color:'rgba(255,255,255,0.85)',textTransform:'uppercase'}}>{t.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Font scale */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:9,fontWeight:800,letterSpacing:2,color:'#444',marginBottom:6,textTransform:'uppercase'}}>حجم الخط</div>
                <input type="range" min="0.7" max="1.4" step="0.05" value={fs} onChange={e=>setFs(+e.target.value)} style={{width:'100%',accentColor:'#CC3333'}}/>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#444',marginTop:2}}>
                  <span>صغير</span><span style={{color:'#CC3333',fontWeight:800}}>{Math.round(fs*100)}%</span><span>كبير</span>
                </div>
              </div>

              {/* Edit */}
              {slides.length>0&&(
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:9,fontWeight:800,letterSpacing:2,color:'#888',marginBottom:8,textTransform:'uppercase'}}>تعديل الشريحة {active+1}</div>
                  <div style={{fontSize:9,color:'#444',marginBottom:4}}>العنوان <span style={{color:'#555'}}>(**كلمة** حمراء · ***رقم*** أصفر)</span></div>
                  <textarea value={eHead} onChange={e=>setEHead(e.target.value)} rows={2} style={{...inp,resize:'none',lineHeight:1.7,marginBottom:8}} placeholder="**الكلمة المهمة** هنا..."/>
                  <div style={{fontSize:9,color:'#444',marginBottom:4}}>النص التفصيلي</div>
                  <textarea value={eBody} onChange={e=>setEBody(e.target.value)} rows={2} style={{...inp,resize:'none',lineHeight:1.7,marginBottom:8}} placeholder="نص توضيحي..."/>
                  <div style={{fontSize:9,color:'#444',marginBottom:4}}>الحساب</div>
                  <input value={eHandle} onChange={e=>setEHandle(e.target.value)} style={{...inp,marginBottom:8}}/>
                  <div style={{display:'flex',gap:5}}>
                    <button onClick={()=>{const n=[...slides];n.splice(active+1,0,{...slides[active]});setSlides(n);setActive(active+1)}} style={{...btnD,flex:1,justifyContent:'center',fontSize:11}}>⧉ نسخ</button>
                    <button onClick={()=>{const n=[...slides];n.splice(active,1);setSlides(n);setActive(Math.max(0,active-1))}} style={{...btnD,flex:1,justifyContent:'center',fontSize:11,color:'#ff5555'}}>✕ حذف</button>
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:12}}>
                <div style={{fontSize:9,fontWeight:800,letterSpacing:2,color:'#888',marginBottom:10,textTransform:'uppercase'}}>📅 الجدولة والنشر</div>
                <div style={{fontSize:9,color:'#444',marginBottom:4}}>الكابشن / الوصف</div>
                <textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={3} style={{...inp,resize:'none',lineHeight:1.7,fontSize:12,marginBottom:8}} placeholder={'تابعونا لمزيد 💼\n#5gates #محاسبة #البحرين'}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10}}>
                  <div><div style={{fontSize:9,color:'#444',marginBottom:4}}>التاريخ</div><input type="date" value={schedDate} onChange={e=>setSchedDate(e.target.value)} style={{...inp,fontSize:12}}/></div>
                  <div><div style={{fontSize:9,color:'#444',marginBottom:4}}>الوقت</div><input type="time" value={schedTime} onChange={e=>setSchedTime(e.target.value)} style={{...inp,fontSize:12}}/></div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>schedulePost(false)} disabled={uploading} style={{...btnD,flex:1,justifyContent:'center',fontSize:11,opacity:uploading?.6:1}}>{uploading?'يرفع…':'📅 جدولة'}</button>
                  <button onClick={()=>schedulePost(true)} disabled={uploading} style={{...btnR,flex:1,justifyContent:'center',fontSize:11,opacity:uploading?.6:1}}>🚀 نشر الآن</button>
                </div>
                {schedMsg&&<div style={{marginTop:8,background:'rgba(85,221,136,0.08)',border:'1px solid rgba(85,221,136,0.2)',borderRadius:7,padding:'8px 10px',fontSize:11,color:'#55DD88',lineHeight:1.6,whiteSpace:'pre-line'}}>{schedMsg}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── QUEUE TAB ── */}
      {tab==='queue'&&(
        <div style={{flex:1,overflow:'auto',padding:24}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
            <h2 style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:20}}>قائمة الجدولة</h2>
            <button onClick={loadQueue} style={btnD}>{loadingQ?'…':'↻ تحديث'}</button>
            <button onClick={async()=>{await fetch('/api/publish',{method:'POST'});loadQueue()}} style={{...btnR,fontSize:11}}>▶ تشغيل المجدول</button>
          </div>
          {posts.length===0?<div style={{color:'#444',textAlign:'center',padding:60,fontSize:14}}>لا توجد بوستات مجدولة بعد</div>:(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {posts.map(post=>{
                const pSlides:Slide[]=JSON.parse(post.slides_json as string)
                const imgs:string[]=post.image_urls?JSON.parse(post.image_urls as string):[]
                return (
                  <div key={post.id} style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:14,display:'flex',gap:14,alignItems:'flex-start'}}>
                    <div style={{display:'flex',gap:5,flexShrink:0}}>
                      {imgs.slice(0,3).map((u,i)=><img key={i} src={u} alt="" style={{width:50,height:62,borderRadius:6,objectFit:'cover',border:'1px solid rgba(255,255,255,0.08)'}}/>)}
                      {imgs.length>3&&<div style={{width:50,height:62,borderRadius:6,background:'#222',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#555'}}>+{imgs.length-3}</div>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><Badge s={post.status}/><span style={{fontSize:11,color:'#444'}}>#{post.id}</span>{post.ig_media_id&&<span style={{fontSize:10,color:'#55DD88'}}>✓ {post.ig_media_id}</span>}</div>
                      <div style={{fontSize:12,color:'#F0EDE8',direction:'rtl',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginBottom:3}}>{pSlides[0]?.headline.replace(/\*+/g,'')||'—'}</div>
                      <div style={{fontSize:11,color:'#555'}}>📅 {new Date(post.scheduled_at as string).toLocaleString('ar-BH')}{post.published_at&&` · نُشر: ${new Date(post.published_at).toLocaleString('ar-BH')}`}</div>
                      {post.error_msg&&<div style={{fontSize:11,color:'#FF5555',marginTop:3,background:'rgba(255,85,85,0.08)',padding:'3px 7px',borderRadius:5}}>✕ {post.error_msg}</div>}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
                      {post.status==='failed'&&<button onClick={()=>postAction(post.id,'retry')} style={{...btnD,fontSize:10,padding:'4px 9px'}}>↻ إعادة</button>}
                      {post.status==='scheduled'&&<button onClick={()=>postAction(post.id,'cancel')} style={{...btnD,fontSize:10,padding:'4px 9px'}}>⏸ إلغاء</button>}
                      <button onClick={async()=>{if(confirm('حذف؟')){await fetch('/api/posts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:post.id})});loadQueue()}}} style={{...btnD,fontSize:10,padding:'4px 9px',color:'#ff5555'}}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab==='settings'&&(
        <div style={{flex:1,overflow:'auto',padding:24}}>
          <div style={{maxWidth:580,margin:'0 auto'}}>
            <h2 style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:20,marginBottom:20}}>الإعدادات</h2>
            <div style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.07)',borderTop:'2px solid #CC3333',borderRadius:14,padding:20,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:800,color:'#CC3333',marginBottom:16}}>🔗 ربط Instagram</div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:9,color:'#444',fontWeight:800,letterSpacing:1,marginBottom:5}}>Access Token (Long-lived)</div>
                <input value={igToken} onChange={e=>setIgToken(e.target.value)} type="password" style={{...inp,direction:'ltr',fontFamily:'monospace',fontSize:12}} placeholder="EAA..."/>
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:9,color:'#444',fontWeight:800,letterSpacing:1,marginBottom:5}}>Instagram User ID</div>
                <input value={igId} onChange={e=>setIgId(e.target.value)} style={{...inp,direction:'ltr',fontFamily:'monospace',fontSize:12}} placeholder="17841400000000000"/>
              </div>
              <button onClick={saveSettings} disabled={savingS} style={{...btnR,opacity:savingS?.6:1}}>{savingS?'يحفظ…':'💾 حفظ والتحقق'}</button>
              {settingsMsg&&<div style={{marginTop:10,fontSize:12,color:settingsMsg.includes('✓')?'#55DD88':'#FF5555'}}>{settingsMsg}</div>}
            </div>

            {/* Setup guide */}
            <div style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:20,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:800,marginBottom:14}}>📖 خطوات الإعداد الكاملة (مجاناً)</div>
              {[
                ['Vercel','انشر المشروع على vercel.com — مجاني 100%','#55DD88'],
                ['Turso','أنشئ DB على turso.tech ← turso db create 5gates-db — مجاني','#55DD88'],
                ['Cloudinary','سجل على cloudinary.com ← أخذ API credentials — مجاني 25GB/شهر','#55DD88'],
                ['cron-job.org','سجل على cron-job.org ← أضف URL: https://your-app.vercel.app/api/publish\nالهيدر: Authorization: Bearer YOUR_CRON_SECRET\nكل 5 دقائق — مجاني','#55DD88'],
                ['Instagram','developers.facebook.com ← أنشئ Business App ← Instagram Graph API ← Generate Token','#60C8FF'],
              ].map(([title,desc,color])=>(
                <div key={title} style={{display:'flex',gap:10,marginBottom:12,alignItems:'flex-start'}}>
                  <div style={{minWidth:80,fontSize:10,fontWeight:800,color,background:`${color}15`,border:`1px solid ${color}30`,borderRadius:5,padding:'3px 7px',textAlign:'center',flexShrink:0,marginTop:2}}>{title}</div>
                  <div style={{fontSize:12,color:'#888',lineHeight:1.6,whiteSpace:'pre-line'}}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{background:'rgba(245,200,66,0.08)',border:'1px solid rgba(245,200,66,0.2)',borderRadius:10,padding:14}}>
              <div style={{fontSize:12,color:'#F5C842',fontWeight:700,marginBottom:6}}>⚠️ تذكير مهم — Instagram Token</div>
              <div style={{fontSize:12,color:'#888',lineHeight:1.7}}>
                الـ Access Token ينتهي كل <strong style={{color:'#F0EDE8'}}>60 يوم</strong>. اضبط تنبيه كل 50 يوم لتجديده من:<br/>
                <code style={{background:'#111',padding:'2px 6px',borderRadius:4,fontSize:11,color:'#60C8FF'}}>
                  graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=TOKEN
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Modal ── */}
      {aiOpen&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setAiOpen(false)}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.82)',backdropFilter:'blur(14px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.12)',borderTop:'2px solid #CC3333',borderRadius:16,width:490,maxHeight:'87vh',overflowY:'auto',padding:22}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:18,display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:28,height:28,background:'rgba(204,51,51,0.15)',border:'1px solid rgba(204,51,51,0.3)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>✦</div>
                توليد بالذكاء الاصطناعي
              </div>
              <button onClick={()=>setAiOpen(false)} style={{...btnD,width:28,height:28,padding:0,justifyContent:'center'}}>✕</button>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:9,color:'#444',fontWeight:800,letterSpacing:1,marginBottom:4}}>الموضوع</div>
              <textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} rows={3} style={{...inp,fontSize:14,resize:'none',lineHeight:1.7}} placeholder="مثال: أهم أخطاء تدمر التدفق النقدي..."/>
              <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
                {['أهم ٥ أخطاء في التدفق النقدي','لماذا تفشل الشركات في المحاسبة','كيف تعرف أن شركتك تحتاج ERP'].map(p=>(
                  <div key={p} onClick={()=>setAiPrompt(p)} style={{background:'#222',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,padding:'4px 10px',fontSize:10,color:'#555',cursor:'pointer',fontFamily:"'Cairo',sans-serif",transition:'all .14s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#CC3333';e.currentTarget.style.color='#CC3333'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';e.currentTarget.style.color='#555'}}>
                    {p.slice(0,28)}…
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div><div style={{fontSize:9,color:'#444',fontWeight:800,letterSpacing:1,marginBottom:4}}>عدد الشرائح</div>
                <select value={aiNum} onChange={e=>setAiNum(e.target.value)} style={inp}>
                  {[['4','٤'],['5','٥'],['6','٦'],['7','٧']].map(([v,l])=><option key={v} value={v}>{l} شرائح</option>)}
                </select></div>
              <div><div style={{fontSize:9,color:'#444',fontWeight:800,letterSpacing:1,marginBottom:4}}>اللغة</div>
                <select value={aiLang} onChange={e=>setAiLang(e.target.value)} style={inp}>
                  <option value="ar">🇸🇦 العربية</option>
                  <option value="en">🇬🇧 English</option>
                </select></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              <div><div style={{fontSize:9,color:'#444',fontWeight:800,letterSpacing:1,marginBottom:4}}>نوع المحتوى</div>
                <select value={aiType} onChange={e=>setAiType(e.target.value)} style={inp}>
                  {[['hook','🔥 هوك صادم'],['tips','💡 نصائح'],['warning','⚠️ تحذيرات'],['facts','📊 حقائق'],['steps','📋 خطوات'],['contrast','⚡ مقارنة'],['myths','❌ خرافات']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select></div>
              <div><div style={{fontSize:9,color:'#444',fontWeight:800,letterSpacing:1,marginBottom:4}}>الأسلوب</div>
                <select value={aiTone} onChange={e=>setAiTone(e.target.value)} style={inp}>
                  {[['bold','🔥 جريء وصادم'],['direct','⚡ مباشر'],['question','❓ أسئلة'],['expert','🎩 خبير']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select></div>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setAiOpen(false)} style={btnD}>إلغاء</button>
              <button onClick={generate} disabled={genning} style={{...btnR,opacity:genning?.6:1}}>
                {genning?<><span style={{width:12,height:12,border:'2px solid rgba(255,255,255,0.2)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .6s linear infinite',display:'inline-block'}}/> جاري…</>:'✦ توليد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast&&<div style={{position:'fixed',bottom:20,left:'50%',transform:'translateX(-50%)',background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.12)',borderRight:'3px solid #CC3333',color:'#F0EDE8',padding:'10px 18px',borderRadius:9,fontSize:13,zIndex:9999,boxShadow:'0 6px 24px rgba(0,0,0,0.6)',whiteSpace:'nowrap',fontFamily:"'Cairo',sans-serif"}}>{toast}</div>}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
