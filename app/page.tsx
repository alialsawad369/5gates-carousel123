'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'

type TextAlign = 'top'|'middle'|'bottom'
type Slide = {
  headline:string; body:string; handle:string; icon?:string; bgImage?:string;
  textAlign?:TextAlign; textX?:number; textY?:number; overlayOpacity?:number;
  headX?:number; headY?:number; bodyX?:number; bodyY?:number;
  uploadedBg?:string; // base64 user-uploaded image
  mode?:'carousel'|'story'; // story = 9:16
}
type Theme = 'dark'|'darker'|'white'|'cream'|'darkred'|'charcoal'
type PostStatus = 'scheduled'|'published'|'failed'|'draft'|'processing'
type SavedCarousel = { name:string; slides:Slide[]; theme:Theme; fs:number; date:string; caption:string }

type ChatMsg = { role:'user'|'assistant'; content:string }
type AiStep = 'input'|'chat'|'done'

const T: Record<Theme,{bg:string;text:string;sub:string;brand:string;hl:string;label:string}> = {
  dark:     {bg:'#111111',text:'#F0EDE8',sub:'rgba(240,237,232,0.68)',brand:'rgba(240,237,232,0.35)',hl:'#CC3333',label:'Dark'},
  darker:   {bg:'#050505',text:'#F5F5F5',sub:'rgba(245,245,245,0.60)',brand:'rgba(245,245,245,0.30)',hl:'#CC3333',label:'Black'},
  white:    {bg:'#FFFFFF',text:'#111111',sub:'rgba(17,17,17,0.62)',   brand:'rgba(17,17,17,0.35)',   hl:'#CC3333',label:'White'},
  cream:    {bg:'#F5F0E8',text:'#111111',sub:'rgba(17,17,17,0.58)',   brand:'rgba(17,17,17,0.32)',   hl:'#CC3333',label:'Cream'},
  darkred:  {bg:'#180404',text:'#FFF0F0',sub:'rgba(255,240,240,0.60)',brand:'rgba(255,240,240,0.30)',hl:'#FF5555',label:'Red'},
  charcoal: {bg:'#1C1C1C',text:'#EDEDED',sub:'rgba(237,237,237,0.62)',brand:'rgba(237,237,237,0.32)',hl:'#CC3333',label:'Charcoal'},
}
const ICONS: Record<string,string> = { money:'💰',chart:'📊',warning:'⚠️',rocket:'🚀',bulb:'💡',check:'✅',fire:'🔥',question:'❓',bank:'🏦',document:'📋',growth:'📈',tax:'🧾',erp:'🖥️',salary:'💳',trophy:'🏆',time:'⏰',loss:'📉',people:'👥' }
const BG_IMAGES = [
  {label:'بدون',  url:''},
  {label:'مكتب',  url:'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1080&q=80&fit=crop'},
  {label:'مال',   url:'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1080&q=80&fit=crop'},
  {label:'مخطط',  url:'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080&q=80&fit=crop'},
  {label:'اجتماع',url:'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1080&q=80&fit=crop'},
  {label:'مدينة', url:'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1080&q=80&fit=crop'},
  {label:'تقنية', url:'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&q=80&fit=crop'},
  {label:'حسابات',url:'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&q=80&fit=crop'},
  {label:'نجاح',  url:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&q=80&fit=crop'},
  {label:'شراكة', url:'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1080&q=80&fit=crop'},
  {label:'مبنى',  url:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&q=80&fit=crop'},
  {label:'بحرين', url:'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1080&q=80&fit=crop'},
]

function getIcon(h:string,icon?:string):string{
  if(icon&&ICONS[icon])return ICONS[icon]
  const l=h.toLowerCase()
  if(l.includes('خطأ')||l.includes('تحذير'))return ICONS.warning
  if(l.includes('نمو'))return ICONS.growth
  if(l.includes('ضريبة')||l.includes('vat'))return ICONS.tax
  if(l.includes('erp'))return ICONS.erp
  if(l.includes('راتب'))return ICONS.salary
  if(l.includes('نقدي')||l.includes('مال'))return ICONS.money
  if(l.includes('نصيحة'))return ICONS.bulb
  if(l.includes('نجاح'))return ICONS.trophy
  return ICONS.chart
}

function parseSegs(text:string):{text:string;color:string|null}[]{
  const segs:{text:string;color:string|null}[]=[]
  const re=/(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*)/g
  let last=0,m
  while((m=re.exec(text))!==null){
    if(m.index>last)segs.push({text:text.slice(last,m.index),color:null})
    if(m[2])segs.push({text:m[2],color:'#F5C842'})
    else if(m[3])segs.push({text:m[3],color:'#CC3333'})
    last=m.index+m[0].length
  }
  if(last<text.length)segs.push({text:text.slice(last),color:null})
  return segs
}

// Render slide to canvas - supports carousel (4:5) and story (9:16)
async function renderSlide(slide:Slide,idx:number,total:number,theme:Theme,fontScale:number,W=1080,H=1350):Promise<string>{
  const isStory = slide.mode==='story'
  const CH = isStory ? Math.round(W * 16/9) : H
  const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=CH
  const ctx=canvas.getContext('2d')!; const t=T[theme],fs=fontScale

  const bgSrc = slide.uploadedBg || slide.bgImage
  if(bgSrc){
    await new Promise<void>(res=>{
      const img=new Image(); img.crossOrigin='anonymous'
      img.onload=()=>{ctx.drawImage(img,0,0,W,CH);res()}
      img.onerror=()=>{ctx.fillStyle=t.bg;ctx.fillRect(0,0,W,CH);res()}
      img.src=bgSrc
    })
    const op=slide.overlayOpacity??0.72
    ctx.fillStyle=`rgba(0,0,0,${op})`; ctx.fillRect(0,0,W,CH)
  }else{ ctx.fillStyle=t.bg; ctx.fillRect(0,0,W,CH) }

  const gr=ctx.createRadialGradient(W*1.1,-CH*0.1,0,W*1.1,-CH*0.1,W*0.9)
  gr.addColorStop(0,theme==='darkred'?'rgba(204,51,51,0.5)':'rgba(204,51,51,0.25)')
  gr.addColorStop(1,'transparent'); ctx.fillStyle=gr; ctx.fillRect(0,0,W,CH)
  ctx.fillStyle=t.hl; ctx.beginPath(); ctx.roundRect(W-195,CH*0.845,115,7,4); ctx.fill()

  const icon=getIcon(slide.headline,slide.icon)
  ctx.font=`${Math.round(160*fs)}px serif`; ctx.globalAlpha=0.12; ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillText(icon,60,CH*0.07); ctx.globalAlpha=1
  ctx.font=`${Math.round(88*fs)}px serif`; ctx.textAlign='right'; ctx.textBaseline='top'; ctx.fillText(icon,W-75,72)
  ctx.font=`900 ${Math.round(30*fs)}px 'Tajawal','Cairo',sans-serif`
  ctx.fillStyle=bgSrc?'rgba(255,255,255,0.5)':t.brand; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText('5GATES',W/2,65)

  // Headline position - use headX/headY if set, otherwise fall back to textX/textY
  const hxOff = (slide.headX ?? slide.textX ?? 0)/100*W*0.3
  const hyOff = (slide.headY ?? slide.textY ?? 0)/100*CH*0.25
  const vPos=slide.textAlign??'middle'
  const baseY = isStory
    ? (vPos==='top'?CH*0.15:vPos==='bottom'?CH*0.60:CH*0.32)
    : (vPos==='top'?CH*0.18:vPos==='bottom'?CH*0.55:CH*0.28)

  const hs=Math.round(88*fs),lh=hs*1.32,tr=W-80+hxOff,mx=W-180
  ctx.font=`900 ${hs}px 'Cairo',sans-serif`; ctx.textAlign='right'; ctx.textBaseline='top'
  const plain=slide.headline.replace(/\*+/g,''),words=plain.split(' '),lines:string[]=[]; let cur=''
  for(const w of words){const test=cur?cur+' '+w:w; if(ctx.measureText(test).width>mx&&cur){lines.push(cur);cur=w}else cur=test}
  if(cur)lines.push(cur)
  let ly=baseY+hyOff-(lines.length*lh)/2
  for(const line of lines){
    const segs=parseSegs(line.trim()); let x=tr
    for(let si=segs.length-1;si>=0;si--){
      const s=segs[si]; ctx.font=`900 ${hs}px 'Cairo',sans-serif`
      ctx.fillStyle=s.color||(bgSrc?'#FFFFFF':t.text)
      const sw=ctx.measureText(s.text).width; ctx.fillText(s.text,x,ly); x-=sw
    }
    ly+=lh
  }

  if(slide.body){
    // Body position - use bodyX/bodyY if set
    const bxOff = (slide.bodyX ?? slide.textX ?? 0)/100*W*0.3
    const byOff = (slide.bodyY ?? slide.textY ?? 0)/100*CH*0.25
    const bs=Math.round(42*fs); ctx.font=`500 ${bs}px 'Cairo',sans-serif`
    ctx.fillStyle=bgSrc?'rgba(255,255,255,0.85)':t.sub; ctx.textAlign='right'; ctx.textBaseline='top'
    const bw=slide.body.split(' '),bl:string[]=[]; let bc=''
    for(const w of bw){const test=bc?bc+' '+w:w; if(ctx.measureText(test).width>mx&&bc){bl.push(bc);bc=w}else bc=test}
    if(bc)bl.push(bc)
    let by=ly+34+byOff*0.2
    for(const b of bl.slice(0,4)){ctx.fillText(b,tr+bxOff-hxOff,by);by+=bs*1.65}
  }

  const fy=CH-110
  ctx.font=`700 ${Math.round(26*fs)}px 'Cairo',sans-serif`; ctx.fillStyle=bgSrc?'rgba(255,255,255,0.4)':t.brand
  ctx.textAlign='right'; ctx.textBaseline='middle'; ctx.fillText(slide.handle||'@5gates.bh',W-80,fy+22)
  if(!isStory){
    const dc=Math.min(total,7),dw=14,aw=44,dh=14,dg=8; let dx=(W-(dc*dw+(dc-1)*dg+(aw-dw)))/2
    for(let d=0;d<dc;d++){
      const w=d===idx?aw:dw; ctx.fillStyle=d===idx?t.hl:'rgba(255,255,255,0.2)'
      ctx.beginPath(); ctx.roundRect(dx,fy+15,w,dh,dh/2); ctx.fill(); dx+=w+dg
    }
  }
  return canvas.toDataURL('image/jpeg',0.92)
}

function drawThumb(slide:Slide,idx:number,total:number,theme:Theme,fs:number,canvas:HTMLCanvasElement,bgImg?:HTMLImageElement|null){
  const isStory = slide.mode==='story'
  const W=canvas.width, H=canvas.height, t=T[theme]
  const pfs=fs*(W/700)
  const ctx=canvas.getContext('2d')!
  if((bgImg)&&(slide.bgImage||slide.uploadedBg)){ctx.drawImage(bgImg,0,0,W,H);ctx.fillStyle=`rgba(0,0,0,${slide.overlayOpacity??0.72})`;ctx.fillRect(0,0,W,H)}
  else{ctx.fillStyle=t.bg;ctx.fillRect(0,0,W,H)}
  const gr=ctx.createRadialGradient(W*1.1,-H*0.1,0,W*1.1,-H*0.1,W*0.9)
  gr.addColorStop(0,theme==='darkred'?'rgba(204,51,51,0.5)':'rgba(204,51,51,0.25)')
  gr.addColorStop(1,'transparent'); ctx.fillStyle=gr; ctx.fillRect(0,0,W,H)
  ctx.fillStyle=t.hl; ctx.beginPath(); ctx.roundRect(W-195*W/1080,H*0.845,115*W/1080,7*H/1350,4); ctx.fill()
  ctx.font=`${Math.round(88*pfs)}px serif`; ctx.textAlign='right'; ctx.textBaseline='top'
  ctx.fillText(getIcon(slide.headline,slide.icon),W-75*W/1080,72*H/(isStory?1920:1350))
  const F="'Cairo','Tajawal',Arial,sans-serif"
  ctx.font=`900 ${Math.round(30*pfs)}px ${F}`
  ctx.fillStyle=(slide.bgImage||slide.uploadedBg)?'rgba(255,255,255,0.5)':t.brand; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText('5GATES',W/2,65*H/(isStory?1920:1350))
  const hxOff=(slide.headX??slide.textX??0)/100*W*0.3
  const hyOff=(slide.headY??slide.textY??0)/100*H*0.25
  const vPos=slide.textAlign??'middle'
  const baseY = isStory
    ? (vPos==='top'?H*0.15:vPos==='bottom'?H*0.60:H*0.32)
    : (vPos==='top'?H*0.18:vPos==='bottom'?H*0.55:H*0.28)
  const hs=Math.round(88*pfs),lh=hs*1.32,tr=W-80*W/1080+hxOff,mx=W-180*W/1080
  ctx.font=`900 ${hs}px ${F}`; ctx.textAlign='right'; ctx.textBaseline='top'
  const plain=slide.headline.replace(/\*+/g,''),words=plain.split(' '),lines:string[]=[]; let cur=''
  for(const w of words){const test=cur?cur+' '+w:w; if(ctx.measureText(test).width>mx&&cur){lines.push(cur);cur=w}else cur=test}
  if(cur)lines.push(cur)
  let ly=baseY+hyOff-(lines.length*lh)/2
  for(const line of lines){
    const segs=parseSegs(line.trim()); let x=tr
    for(let si=segs.length-1;si>=0;si--){
      const s=segs[si]; ctx.font=`900 ${hs}px ${F}`
      ctx.fillStyle=s.color||((slide.bgImage||slide.uploadedBg)?'#FFFFFF':t.text)
      const sw=ctx.measureText(s.text).width; ctx.fillText(s.text,x,ly); x-=sw
    }
    ly+=lh
  }
  if(slide.body){
    const bxOff=(slide.bodyX??slide.textX??0)/100*W*0.3
    const byOff=(slide.bodyY??slide.textY??0)/100*H*0.25
    const bs=Math.round(42*pfs); ctx.font=`500 ${bs}px ${F}`
    ctx.fillStyle=(slide.bgImage||slide.uploadedBg)?'rgba(255,255,255,0.85)':t.sub; ctx.textAlign='right'; ctx.textBaseline='top'
    const bw=slide.body.split(' '),bl:string[]=[]; let bc=''
    for(const w of bw){const test=bc?bc+' '+w:w; if(ctx.measureText(test).width>mx&&bc){bl.push(bc);bc=w}else bc=test}
    if(bc)bl.push(bc)
    let by=ly+Math.round(18*pfs)
    for(const b of bl.slice(0,4)){ctx.fillText(b,tr+bxOff-hxOff,by);by+=bs*1.6}
  }
}

function SlideThumb({slide,idx,total,theme,fs,active,onClick,size=190}:{slide:Slide;idx:number;total:number;theme:Theme;fs:number;active:boolean;onClick:()=>void;size?:number}){
  const ref=useRef<HTMLCanvasElement>(null), imgRef=useRef<HTMLImageElement|null>(null)
  useEffect(()=>{
    if(!ref.current)return
    const isStory = slide.mode==='story'
    const H = isStory ? Math.round(size*16/9) : Math.round(size*1350/1080)
    if(ref.current.height !== H){ ref.current.height = H }
    const draw=()=>{if(ref.current)drawThumb(slide,idx,total,theme,fs,ref.current,imgRef.current)}
    const bgSrc = slide.uploadedBg || slide.bgImage
    const run=()=>{
      if(bgSrc&&(!imgRef.current||imgRef.current.src!==bgSrc)){
        const img=new Image(); img.crossOrigin='anonymous'
        img.onload=()=>{imgRef.current=img;draw()}; img.onerror=()=>{imgRef.current=null;draw()}; img.src=bgSrc
      }else draw()
    }
    if(document.fonts?.ready){document.fonts.ready.then(run)}else run()
  },[slide,theme,fs,idx,total,size])
  const isStory = slide.mode==='story'
  const H = isStory ? Math.round(size*16/9) : Math.round(size*1350/1080)
  return <canvas ref={ref} width={size} height={H} onClick={onClick} style={{borderRadius:11,cursor:'pointer',display:'block',flexShrink:0,boxShadow:active?'0 0 0 3px #CC3333,0 0 0 6px rgba(204,51,51,0.25)':'0 0 0 1px rgba(255,255,255,0.07)',transform:active?'translateY(-3px)':'none',transition:'all .18s'}}/>
}

function Badge({s}:{s:PostStatus}){
  const m:Record<PostStatus,{l:string;c:string;bg:string}>={scheduled:{l:'مجدول',c:'#60C8FF',bg:'rgba(96,200,255,0.1)'},published:{l:'منشور ✓',c:'#55DD88',bg:'rgba(85,221,136,0.1)'},failed:{l:'فشل ✕',c:'#FF5555',bg:'rgba(255,85,85,0.1)'},draft:{l:'مسودة',c:'#888',bg:'rgba(136,136,128,0.1)'},processing:{l:'ينشر…',c:'#F5C842',bg:'rgba(245,200,66,0.1)'}}
  const{l,c,bg}=m[s]||m.draft
  return <span style={{fontSize:10,fontWeight:700,padding:'2px 9px',borderRadius:20,color:c,background:bg,border:`1px solid ${c}40`}}>{l}</span>
}

function parseSlidesFromText(text:string): Slide[]|null {
  try {
    const match = text.match(/```json\s*([\s\S]+?)```/) || text.match(/(\[\s*\{[\s\S]+\}\s*\])/)
    if(match) {
      const parsed = JSON.parse(match[1])
      if(Array.isArray(parsed) && parsed[0]?.headline) return parsed
    }
  } catch(_) {}
  return null
}

function SlidePreviewCard({slide, idx}: {slide: Slide, idx: number}) {
  return (
    <div style={{background:'#1E1E1E',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'12px 14px',marginBottom:8,direction:'rtl'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
        <span style={{background:'#CC3333',color:'#fff',fontSize:10,fontWeight:800,padding:'2px 8px',borderRadius:6,flexShrink:0}}>{idx+1}</span>
        <span style={{fontSize:14,fontWeight:800,color:'#F0EDE8',lineHeight:1.5}}>{slide.headline.replace(/\*+/g,'')}</span>
      </div>
      {slide.body && <div style={{fontSize:12,color:'rgba(240,237,232,0.6)',lineHeight:1.7,paddingRight:32}}>{slide.body}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// DRAG TEXT EDITOR — Full-screen slide editor with
// draggable headline + body text blocks
// ═══════════════════════════════════════════════════
function DragEditor({slide, theme, fs, onSave, onClose}: {
  slide: Slide; theme: Theme; fs: number;
  onSave: (updates: Partial<Slide>) => void;
  onClose: () => void;
}) {
  const isStory = slide.mode === 'story'
  // Positions stored as % of container (0-100)
  const [headPos, setHeadPos] = useState({ x: slide.headX ?? 50, y: slide.headY ?? (isStory ? 40 : 38) })
  const [bodyPos, setBodyPos] = useState({ x: slide.bodyX ?? 50, y: slide.bodyY ?? (isStory ? 55 : 58) })
  const [dragging, setDragging] = useState<'head'|'body'|null>(null)
  const [activeEl, setActiveEl] = useState<'head'|'body'|null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{mx:number;my:number;ox:number;oy:number}|null>(null)
  const t = T[theme]
  const hasBg = !!(slide.uploadedBg || slide.bgImage)

  function getContainerRect() {
    return containerRef.current?.getBoundingClientRect() ?? {left:0,top:0,width:1,height:1}
  }

  function startDrag(e: React.PointerEvent, which: 'head'|'body') {
    e.preventDefault()
    e.stopPropagation()
    setDragging(which)
    setActiveEl(which)
    const pos = which === 'head' ? headPos : bodyPos
    const rect = getContainerRect()
    dragStart.current = {
      mx: e.clientX, my: e.clientY,
      ox: pos.x, oy: pos.y
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if(!dragging || !dragStart.current) return
    const rect = getContainerRect()
    const dx = (e.clientX - dragStart.current.mx) / rect.width * 100
    const dy = (e.clientY - dragStart.current.my) / rect.height * 100
    const nx = Math.max(5, Math.min(95, dragStart.current.ox + dx))
    const ny = Math.max(5, Math.min(95, dragStart.current.oy + dy))
    if(dragging === 'head') setHeadPos({x: nx, y: ny})
    else setBodyPos({x: nx, y: ny})
  }

  function onPointerUp() {
    setDragging(null)
    dragStart.current = null
  }

  function handleSave() {
    onSave({ headX: Math.round(headPos.x), headY: Math.round(headPos.y), bodyX: Math.round(bodyPos.x), bodyY: Math.round(bodyPos.y) })
    onClose()
  }

  function resetPositions() {
    const defHead = { x: 50, y: isStory ? 40 : 38 }
    const defBody = { x: 50, y: isStory ? 55 : 58 }
    setHeadPos(defHead)
    setBodyPos(defBody)
  }

  const aspectRatio = isStory ? 9/16 : 1080/1350
  const headlineClean = slide.headline.replace(/\*+/g, '')

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.97)',zIndex:2000,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
      {/* Header */}
      <div style={{width:'100%',maxWidth:600,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',flexShrink:0}}>
        <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:15,color:'#F0EDE8'}}>
          ✦ تحريك النصوص
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={resetPositions} style={{...btnD,padding:'7px 12px',fontSize:12}}>↺ إعادة</button>
          <button onClick={handleSave} style={{...btnR,padding:'7px 14px',fontSize:12}}>✓ حفظ</button>
          <button onClick={onClose} style={{...btnD,width:32,height:32,padding:0,justifyContent:'center',fontSize:16}}>✕</button>
        </div>
      </div>

      {/* Instruction bar */}
      <div style={{fontSize:11,color:'#555',marginBottom:10,textAlign:'center',padding:'0 20px',direction:'rtl'}}>
        اضغط مطولاً على <span style={{color:'#CC3333',fontWeight:800}}>العنوان</span> أو <span style={{color:'#60C8FF',fontWeight:800}}>النص</span> واسحبهم
      </div>

      {/* Slide canvas area */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',width:'100%',padding:'0 16px',minHeight:0}}>
        <div
          ref={containerRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{
            position:'relative',
            width:'min(100%, calc((100dvh - 160px) * '+aspectRatio+')',
            aspectRatio: `${isStory ? '9/16' : '1080/1350'}`,
            maxHeight:'calc(100dvh - 160px)',
            borderRadius:16,
            overflow:'hidden',
            background: hasBg ? 'transparent' : t.bg,
            userSelect:'none',
            touchAction:'none',
            flexShrink:0,
          }}
        >
          {/* Background */}
          {hasBg && (
            <img
              src={slide.uploadedBg || slide.bgImage}
              style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}
              crossOrigin="anonymous"
            />
          )}
          {hasBg && (
            <div style={{position:'absolute',inset:0,background:`rgba(0,0,0,${slide.overlayOpacity??0.72})`}}/>
          )}

          {/* Gradient accent */}
          <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 110% -10%, rgba(204,51,51,0.35), transparent 60%)',pointerEvents:'none'}}/>

          {/* 5GATES brand */}
          <div style={{position:'absolute',top:'3%',left:'50%',transform:'translateX(-50%)',fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:'clamp(8px,2.2vw,18px)',color:hasBg?'rgba(255,255,255,0.5)':t.brand,letterSpacing:2,pointerEvents:'none'}}>5GATES</div>

          {/* Icon watermark */}
          <div style={{position:'absolute',top:'5%',left:'5%',fontSize:'clamp(20px,6vw,60px)',opacity:0.1,pointerEvents:'none'}}>{getIcon(slide.headline,slide.icon)}</div>
          <div style={{position:'absolute',top:'4%',right:'4%',fontSize:'clamp(18px,5vw,48px)',pointerEvents:'none'}}>{getIcon(slide.headline,slide.icon)}</div>

          {/* Grid overlay - subtle guide lines */}
          <div style={{position:'absolute',inset:0,pointerEvents:'none',opacity:0.06}}>
            <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:'#fff'}}/>
            <div style={{position:'absolute',top:'33%',left:0,right:0,height:1,background:'#fff'}}/>
            <div style={{position:'absolute',top:'66%',left:0,right:0,height:1,background:'#fff'}}/>
          </div>

          {/* HEADLINE draggable */}
          <div
            onPointerDown={e => startDrag(e, 'head')}
            style={{
              position:'absolute',
              left:`${headPos.x}%`,
              top:`${headPos.y}%`,
              transform:'translate(-50%, -50%)',
              cursor: dragging==='head' ? 'grabbing' : 'grab',
              touchAction:'none',
              zIndex: activeEl==='head' ? 10 : 5,
              maxWidth:'80%',
              textAlign:'center',
            }}
          >
            <div style={{
              padding:'8px 12px',
              border: activeEl==='head' ? '2px dashed rgba(204,51,51,0.8)' : '2px dashed rgba(204,51,51,0.3)',
              borderRadius:10,
              background: activeEl==='head' ? 'rgba(204,51,51,0.1)' : 'transparent',
              transition: dragging ? 'none' : 'border-color 0.2s, background 0.2s',
            }}>
              {/* Drag handle label */}
              <div style={{position:'absolute',top:-20,left:'50%',transform:'translateX(-50%)',fontSize:9,fontWeight:800,color:'#CC3333',whiteSpace:'nowrap',opacity:activeEl==='head'?1:0,transition:'opacity 0.2s'}}>
                ↕↔ العنوان
              </div>
              <div style={{
                fontFamily:"'Cairo',sans-serif",
                fontWeight:900,
                fontSize:'clamp(12px,3.5vw,28px)',
                color: hasBg ? '#FFFFFF' : t.text,
                lineHeight:1.4,
                direction:'rtl',
                whiteSpace:'pre-wrap',
                wordBreak:'break-word',
              }}>
                {headlineClean}
              </div>
            </div>
          </div>

          {/* BODY draggable */}
          {slide.body && (
            <div
              onPointerDown={e => startDrag(e, 'body')}
              style={{
                position:'absolute',
                left:`${bodyPos.x}%`,
                top:`${bodyPos.y}%`,
                transform:'translate(-50%, -50%)',
                cursor: dragging==='body' ? 'grabbing' : 'grab',
                touchAction:'none',
                zIndex: activeEl==='body' ? 10 : 5,
                maxWidth:'80%',
                textAlign:'center',
              }}
            >
              <div style={{
                padding:'6px 10px',
                border: activeEl==='body' ? '2px dashed rgba(96,200,255,0.8)' : '2px dashed rgba(96,200,255,0.3)',
                borderRadius:10,
                background: activeEl==='body' ? 'rgba(96,200,255,0.08)' : 'transparent',
                transition: dragging ? 'none' : 'border-color 0.2s, background 0.2s',
              }}>
                <div style={{position:'absolute',top:-20,left:'50%',transform:'translateX(-50%)',fontSize:9,fontWeight:800,color:'#60C8FF',whiteSpace:'nowrap',opacity:activeEl==='body'?1:0,transition:'opacity 0.2s'}}>
                  ↕↔ النص
                </div>
                <div style={{
                  fontFamily:"'Cairo',sans-serif",
                  fontWeight:500,
                  fontSize:'clamp(9px,2.2vw,17px)',
                  color: hasBg ? 'rgba(255,255,255,0.85)' : t.sub,
                  lineHeight:1.7,
                  direction:'rtl',
                  whiteSpace:'pre-wrap',
                  wordBreak:'break-word',
                }}>
                  {slide.body}
                </div>
              </div>
            </div>
          )}

          {/* Handle bar bottom */}
          <div style={{position:'absolute',bottom:'4%',right:'5%',fontFamily:"'Cairo',sans-serif",fontWeight:700,fontSize:'clamp(7px,1.8vw,13px)',color:hasBg?'rgba(255,255,255,0.35)':t.brand,pointerEvents:'none'}}>
            {slide.handle||'@5gates.bh'}
          </div>
          <div style={{position:'absolute',bottom:'3%',right:'5%',width:'8%',height:3,borderRadius:2,background:'#CC3333',pointerEvents:'none'}}/>
        </div>
      </div>

      {/* Position readout */}
      <div style={{padding:'10px 0 4px',display:'flex',gap:16,fontSize:10,color:'#333',fontFamily:'monospace'}}>
        <span style={{color:'rgba(204,51,51,0.6)'}}>عنوان: {Math.round(headPos.x)}%, {Math.round(headPos.y)}%</span>
        <span style={{color:'rgba(96,200,255,0.6)'}}>نص: {Math.round(bodyPos.x)}%, {Math.round(bodyPos.y)}%</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// AI BRANDING MODAL — upload image + describe → branded slide
// ═══════════════════════════════════════════════════
function AiBrandingModal({onClose, onApply, theme}: {
  onClose: () => void;
  onApply: (slide: Partial<Slide>) => void;
  theme: Theme;
}) {
  const [imgData, setImgData] = useState<string|null>(null)
  const [prompt, setPrompt] = useState('')
  const [outputMode, setOutputMode] = useState<'carousel'|'story'>('carousel')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{headline:string;body:string}|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if(!f) return
    const reader = new FileReader()
    reader.onload = ev => setImgData(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  async function generate() {
    if(!prompt.trim()) return
    setLoading(true)
    try {
      const messages: any[] = [{ role: 'user', content: [] as any[] }]
      if(imgData) {
        const base64 = imgData.split(',')[1]
        const mtype = imgData.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'
        messages[0].content.push({ type: 'image', source: { type: 'base64', media_type: mtype, data: base64 } })
      }
      messages[0].content.push({
        type: 'text',
        text: `أنت مصمم محتوى لشركة FIVEGATES للاستشارات المحاسبية في البحرين.
هوية الشركة: ألوان - أحمر غامق #CC3333، خلفيات داكنة. خط عربي بولد. أسلوب احترافي ومباشر.

المطلوب: ${prompt}
نوع المحتوى: ${outputMode === 'story' ? 'ستوري (9:16)' : 'كاروسيل (4:5)'}
${imgData ? 'الصورة المرفوعة: استخدمها كخلفية للبوست.' : ''}

أجب فقط بـ JSON بهذا الشكل (بدون أي نص إضافي):
{"headline":"العنوان الرئيسي بالعربي (مختصر وقوي، ممكن يحتوي **تمييز أحمر**)","body":"النص الوصفي (جملة أو جملتين)"}`
      })

      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'أنت مصمم محتوى محترف. أجب فقط بـ JSON صالح بدون أي نص إضافي أو markdown.',
          messages
        })
      })
      const d = await r.json()
      const text = d.reply || d.content || d.message || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setResult(parsed)
    } catch(e: any) {
      // fallback if no /api/chat — build basic branded slide
      setResult({
        headline: `**${prompt.slice(0,20)}**`,
        body: 'تواصل مع فايف غيتس للاستشارات المحاسبية في البحرين'
      })
    } finally {
      setLoading(false)
    }
  }

  function apply() {
    if(!result) return
    onApply({
      headline: result.headline,
      body: result.body,
      handle: '@5gates.bh',
      uploadedBg: imgData || undefined,
      overlayOpacity: imgData ? 0.65 : 0.72,
      mode: outputMode,
      textAlign: 'middle',
    })
    onClose()
  }

  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose()}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',backdropFilter:'blur(18px)',zIndex:1500,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.1)',borderTop:'3px solid #CC3333',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:560,maxHeight:'92dvh',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'16px 20px 12px',flexShrink:0}}>
          <div style={{width:36,height:4,background:'rgba(255,255,255,0.15)',borderRadius:2,margin:'0 auto 14px'}}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:17}}>🎨 برندة AI — 5GATES</div>
            <button onClick={onClose} style={{...btnD,width:32,height:32,padding:0,justifyContent:'center'}}>✕</button>
          </div>
          <div style={{fontSize:11,color:'#444',marginTop:6,direction:'rtl'}}>ارفع صورة + وصف → AI يولّد محتوى ببراند 5GATES</div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'0 20px 20px'}}>
          {/* Output mode */}
          <div style={{display:'flex',gap:0,marginBottom:16,background:'#111',borderRadius:10,padding:3}}>
            {(['carousel','story'] as const).map(m=>(
              <button key={m} onClick={()=>setOutputMode(m)} style={{flex:1,padding:'9px',background:outputMode===m?'#CC3333':'transparent',border:'none',borderRadius:8,color:outputMode===m?'#fff':'#444',fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:800,cursor:'pointer',transition:'all .15s',WebkitTapHighlightColor:'transparent'}}>
                {m==='carousel'?'🎠 كاروسيل':'📱 ستوري'}
              </button>
            ))}
          </div>

          {/* Image upload */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:'#444',fontWeight:800,marginBottom:6}}>صورة الخلفية (اختياري)</div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}}/>
            {imgData ? (
              <div style={{position:'relative',borderRadius:12,overflow:'hidden',marginBottom:4}}>
                <img src={imgData} style={{width:'100%',maxHeight:160,objectFit:'cover',display:'block'}}/>
                <button onClick={()=>setImgData(null)} style={{position:'absolute',top:8,left:8,...btnD,width:28,height:28,padding:0,justifyContent:'center',fontSize:12}}>✕</button>
                <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'6px 10px',background:'linear-gradient(to top,rgba(0,0,0,0.8),transparent)',fontSize:11,color:'rgba(255,255,255,0.7)'}}>تم رفع الصورة ✓</div>
              </div>
            ) : (
              <button onClick={()=>fileRef.current?.click()} style={{width:'100%',background:'#111',border:'2px dashed rgba(255,255,255,0.1)',borderRadius:12,padding:'24px',cursor:'pointer',color:'#444',fontFamily:"'Cairo',sans-serif",fontSize:13,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                <span style={{fontSize:28}}>🖼️</span>
                <span>اضغط لرفع صورة</span>
                <span style={{fontSize:10,color:'#333'}}>JPG, PNG, WebP</span>
              </button>
            )}
          </div>

          {/* Prompt */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,color:'#444',fontWeight:800,marginBottom:6}}>وصف المطلوب</div>
            <textarea
              value={prompt}
              onChange={e=>setPrompt(e.target.value)}
              rows={3}
              style={{...inp,resize:'none',lineHeight:1.8,fontSize:13}}
              placeholder="مثال: اعمل بوست ترحيب بعميل جديد ببراند 5GATES، أو: بوست عن خدمة المحاسبة الشهرية"
            />
            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:6}}>
              {['بوست ترحيب بعميل','خدمة المحاسبة الشهرية','عروض رمضان','إطلاق خدمة جديدة'].map(p=>(
                <div key={p} onClick={()=>setPrompt(p)} style={{background:'#222',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'4px 10px',fontSize:11,color:'#555',cursor:'pointer',fontFamily:"'Cairo',sans-serif"}}>{p}</div>
              ))}
            </div>
          </div>

          {/* Result preview */}
          {result && (
            <div style={{background:'rgba(204,51,51,0.06)',border:'1px solid rgba(204,51,51,0.2)',borderRadius:12,padding:14,marginBottom:14,direction:'rtl'}}>
              <div style={{fontSize:10,color:'#CC3333',fontWeight:800,marginBottom:8}}>✦ النتيجة</div>
              <div style={{fontSize:14,fontWeight:800,color:'#F0EDE8',marginBottom:6,lineHeight:1.5}}>{result.headline.replace(/\*+/g,'')}</div>
              <div style={{fontSize:12,color:'rgba(240,237,232,0.6)',lineHeight:1.7}}>{result.body}</div>
            </div>
          )}

          <div style={{display:'flex',gap:10}}>
            {!result ? (
              <>
                <button onClick={onClose} style={{...btnD,flex:1,justifyContent:'center'}}>إلغاء</button>
                <button onClick={generate} disabled={loading||!prompt.trim()} style={{...btnR,flex:2,justifyContent:'center',opacity:(loading||!prompt.trim())?.6:1}}>
                  {loading ? <><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.2)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .6s linear infinite',display:'inline-block'}}/> يولّد…</> : '✦ توليد بـ AI'}
                </button>
              </>
            ) : (
              <>
                <button onClick={()=>setResult(null)} style={{...btnD,flex:1,justifyContent:'center'}}>↺ جرب مجدداً</button>
                <button onClick={apply} style={{...btnR,flex:2,justifyContent:'center'}}>✓ إضافة للمنشئ</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const inp:React.CSSProperties={width:'100%',background:'#1E1E1E',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,color:'#F0EDE8',fontFamily:"'Cairo',sans-serif",fontSize:13,padding:'10px 12px',outline:'none',direction:'rtl',WebkitAppearance:'none',appearance:'none',boxSizing:'border-box'}
const btnR:React.CSSProperties={background:'#CC3333',color:'#fff',border:'none',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:800,padding:'10px 16px',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,boxShadow:'0 3px 14px rgba(204,51,51,0.35)',WebkitTapHighlightColor:'transparent',flexShrink:0}
const btnD:React.CSSProperties={background:'#2A2A2A',color:'#888',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:700,padding:'9px 13px',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5,WebkitTapHighlightColor:'transparent',flexShrink:0}

function Sec({label,children}:{label:string;children:React.ReactNode}){
  return <div style={{marginBottom:14,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:12}}><div style={{fontSize:9,fontWeight:800,letterSpacing:2,color:'#555',marginBottom:9,textTransform:'uppercase'}}>{label}</div>{children}</div>
}

export default function App(){
  const [authed,setAuthed]=useState(false)
  const [pw,setPw]=useState(''); const [pwErr,setPwErr]=useState('')
  const [slides,setSlides]=useState<Slide[]>([])
  const [active,setActive]=useState(0)
  const [theme,setTheme]=useState<Theme>('dark')
  const [fs,setFs]=useState(1.0)
  const [eHead,setEHead]=useState(''); const [eBody,setEBody]=useState(''); const [eHandle,setEHandle]=useState('@5gates.bh')
  const [caption,setCaption]=useState(''); const [schedDate,setSchedDate]=useState(''); const [schedTime,setSchedTime]=useState('09:00')
  const [uploading,setUploading]=useState(false); const [schedMsg,setSchedMsg]=useState('')
  const [aiOpen,setAiOpen]=useState(false)
  const [tab,setTab]=useState<'builder'|'saved'|'queue'|'settings'>('builder')
  const [posts,setPosts]=useState<any[]>([]); const [loadingQ,setLoadingQ]=useState(false)
  const [igToken,setIgToken]=useState(''); const [igId,setIgId]=useState('')
  const [settingsMsg,setSettingsMsg]=useState(''); const [savingS,setSavingS]=useState(false)
  const [toast,setToast]=useState('')
  const [saved,setSaved]=useState<SavedCarousel[]>([])
  const [saveOpen,setSaveOpen]=useState(false); const [saveName,setSaveName]=useState('')
  const [mPanel,setMPanel]=useState<'slides'|'preview'|'design'>('preview')

  // New feature states
  const [dragEditorOpen, setDragEditorOpen] = useState(false)
  const [brandingOpen, setBrandingOpen] = useState(false)
  const uploadBgRef = useRef<HTMLInputElement>(null)

  // AI Chat state
  const [aiStep,setAiStep]=useState<AiStep>('input')
  const [aiPrompt,setAiPrompt]=useState('')
  const [aiNum,setAiNum]=useState('5')
  const [aiLang] = useState<string>('ar')
  const [aiType] = useState<string>('hook')
  const [aiTone] = useState<string>('bold')
  const [aiPostMode] = useState<string>('carousel')
  const [aiSlideMode,setAiSlideMode]=useState<'carousel'|'story'>('carousel')
  const [chatMsgs,setChatMsgs]=useState<ChatMsg[]>([])
  const [chatInput,setChatInput]=useState('')
  const [chatLoading,setChatLoading]=useState(false)
  const [previewSlides,setPreviewSlides]=useState<Slide[]>([])
  const [confirming,setConfirming]=useState(false)
  const chatBottomRef=useRef<HTMLDivElement>(null)

  const showToast=(m:string)=>{setToast(m);setTimeout(()=>setToast(''),3200)}

  useEffect(()=>{try{const r=localStorage.getItem('5gates_saved');if(r)setSaved(JSON.parse(r))}catch(_){}},[])

  useEffect(()=>{
    if(!slides[active])return
    const s=slides[active];setEHead(s.headline);setEBody(s.body);setEHandle(s.handle)
  },[active,slides.length])

  useEffect(()=>{
    if(!slides[active])return
    setSlides(p=>{const n=[...p];n[active]={...n[active],headline:eHead,body:eBody,handle:eHandle};return n})
  },[eHead,eBody,eHandle])

  useEffect(()=>{
    if(chatBottomRef.current) chatBottomRef.current.scrollIntoView({behavior:'smooth'})
  },[chatMsgs,chatLoading])

  const upd=(field:Partial<Slide>)=>setSlides(p=>{const n=[...p];n[active]={...n[active],...field};return n})

  // Handle user-uploaded background image
  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if(!f) return
    const reader = new FileReader()
    reader.onload = ev => {
      upd({ uploadedBg: ev.target?.result as string, bgImage: undefined })
      showToast('🖼️ تم رفع الصورة!')
    }
    reader.readAsDataURL(f)
  }

  function resetAiModal(){
    setAiStep('input'); setAiPrompt(''); setChatMsgs([]); setChatInput(''); setPreviewSlides([]); setConfirming(false)
  }

  function openAi(){setAiOpen(true); resetAiModal()}
  function closeAi(){setAiOpen(false); resetAiModal()}

  async function login(){
    const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})})
    if(r.ok)setAuthed(true); else setPwErr('كلمة المرور غير صحيحة')
  }

  async function startGeneration(){
    const topic = aiPrompt.trim()
    if(!topic){showToast('أدخل موضوعاً');return}
    setChatLoading(true)
    setAiStep('chat')
    const userMsg: ChatMsg = { role:'user', content: `الموضوع: ${topic}` }
    setChatMsgs([userMsg])
    try{
      const numSlides = aiSlideMode==='story' ? 1 : +aiNum
      const r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:topic,numSlides,lang:aiLang,type:aiType,tone:aiTone})})
      const d=await r.json(); if(d.error)throw new Error(d.error)
      const generatedSlides: Slide[] = d.slides.map((s:any)=>({...s,textAlign:'middle',overlayOpacity:0.72,mode:aiSlideMode}))
      setPreviewSlides(generatedSlides)
      const previewText = generatedSlides.map((sl,i)=>`**شريحة ${i+1}:** ${sl.headline.replace(/\*+/g,'')}\n${sl.body||''}`).join('\n\n')
      const assistantMsg: ChatMsg = { role:'assistant', content: `✦ ${aiPostMode==='post'?'هذا مقترح البوست':'هذه مقترحات الكاروسيل'} (${generatedSlides.length} ${generatedSlides.length===1?'شريحة':'شرائح'}) — نوع: ${aiSlideMode==='story'?'📱 ستوري':'🎠 كاروسيل'}:\n\n${previewText}\n\n---\nقل لي أي تعديل تريد، أو اكتب **"تأكيد"** للتحويل.` }
      setChatMsgs([userMsg, assistantMsg])
    }catch(e:any){
      setChatMsgs(prev=>[...prev,{role:'assistant',content:`خطأ: ${e.message}`}])
      setAiStep('input')
    }finally{
      setChatLoading(false)
    }
  }

  async function sendChat(){
    const msg=chatInput.trim()
    if(!msg)return
    setChatInput('')
    const isConfirm = /^تأكيد$|^confirm$|^تأكيد\s*$/i.test(msg)
    if(isConfirm){
      setConfirming(true)
      setSlides(previewSlides)
      setActive(0)
      setAiOpen(false)
      resetAiModal()
      setMPanel('preview')
      showToast(`✦ تم توليد ${previewSlides.length} شرائح`)
      setConfirming(false)
      return
    }
    const newMsgs: ChatMsg[] = [...chatMsgs, {role:'user',content:msg}]
    setChatMsgs(newMsgs)
    setChatLoading(true)
    try{
      const currentSlidesJson = JSON.stringify(previewSlides.map(s=>({headline:s.headline,body:s.body})))
      const systemPrompt = `أنت مساعد متخصص في إنشاء محتوى كاروسيل للسوشيال ميديا باللغة ${aiLang==='ar'?'العربية':'الإنجليزية'} لشركة 5GATES للاستشارات المحاسبية في البحرين.\n\nالشرائح الحالية:\n${currentSlidesJson}\n\nالمستخدم سيطلب تعديلات. قم بتطبيقها وأعد إرسال الشرائح المحدّثة بالتنسيق التالي:\n\n\`\`\`json\n[{"headline":"...","body":"..."},...]\n\`\`\`\n\nثم بعد الـ JSON أضف ملخصاً قصيراً بالعربية لما تم تعديله.`
      const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system:systemPrompt,messages:newMsgs.map(m=>({role:m.role,content:m.content}))})})
      let aiReply = ''
      if(r.ok){
        const d=await r.json()
        aiReply = d.reply || d.content || d.message || ''
      } else {
        const modPrompt = `${msg}. المحتوى الحالي: ${previewSlides.map(s=>s.headline).join('، ')}`
        const gr=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:modPrompt,numSlides:previewSlides.length,lang:aiLang,type:aiType,tone:aiTone})})
        const gd=await gr.json()
        if(!gd.error && gd.slides){
          const updatedSlides: Slide[] = gd.slides.map((s:any)=>({...s,textAlign:'middle',overlayOpacity:0.72,mode:aiSlideMode}))
          setPreviewSlides(updatedSlides)
          const previewText = updatedSlides.map((sl,i)=>`**شريحة ${i+1}:** ${sl.headline.replace(/\*+/g,'')}\n${sl.body||''}`).join('\n\n')
          aiReply = `✦ تم التعديل:\n\n${previewText}\n\n---\nاكتب **"تأكيد"** للمتابعة أو أخبرني بأي تعديل آخر.`
        }
      }
      const parsed = parseSlidesFromText(aiReply)
      if(parsed){
        const updSlides = parsed.map(s=>({...s,textAlign:'middle' as TextAlign,overlayOpacity:0.72,handle:'@5gates.bh',mode:aiSlideMode}))
        setPreviewSlides(updSlides)
        const cleanReply = aiReply.replace(/```json[\s\S]+?```/g,'').trim()
        const previewText = updSlides.map((sl,i)=>`**شريحة ${i+1}:** ${sl.headline.replace(/\*+/g,'')}\n${sl.body||''}`).join('\n\n')
        setChatMsgs([...newMsgs,{role:'assistant',content:`✦ تم التعديل:\n\n${previewText}\n\n---\n${cleanReply}\n\nاكتب **"تأكيد"** للمتابعة.`}])
      } else {
        setChatMsgs([...newMsgs,{role:'assistant',content:aiReply||'تم التعديل. اكتب **"تأكيد"** للمتابعة أو أخبرني بأي تعديل آخر.'}])
      }
    }catch(e:any){
      setChatMsgs([...newMsgs,{role:'assistant',content:`خطأ: ${e.message}`}])
    }finally{
      setChatLoading(false)
    }
  }

  async function renderAll():Promise<string[]>{
    const r:string[]=[]
    for(let i=0;i<slides.length;i++){
      const isStory = slides[i].mode==='story'
      r.push(await renderSlide(slides[i],i,slides.length,theme,fs,1080,isStory?Math.round(1080*16/9):1350))
    }
    return r
  }

  async function downloadSlides(){
    if(!slides.length){showToast('أضف شرائح أولاً');return}
    showToast('⏳ جاري التحضير...')
    const imgs=await renderAll()
    imgs.forEach((b,i)=>{const a=document.createElement('a');a.href=b;a.download=`5gates-${i+1}.jpg`;a.click()})
    showToast(`⬇️ تم تحميل ${imgs.length} صورة`)
  }

  function saveCar(){
    if(!slides.length||!saveName.trim()){showToast('أدخل اسماً');return}
    const item:SavedCarousel={name:saveName,slides,theme,fs,date:new Date().toLocaleDateString('ar-BH'),caption}
    const u=[item,...saved.filter(c=>c.name!==saveName)]
    setSaved(u);localStorage.setItem('5gates_saved',JSON.stringify(u))
    setSaveOpen(false);setSaveName('');showToast('💾 تم الحفظ!')
  }

  function loadCar(c:SavedCarousel){
    setSlides(c.slides);setTheme(c.theme);setFs(c.fs);setCaption(c.caption||'')
    setActive(0);setTab('builder');setMPanel('preview');showToast(`📂 ${c.name}`)
  }

  function delSaved(name:string){
    const u=saved.filter(c=>c.name!==name)
    setSaved(u);localStorage.setItem('5gates_saved',JSON.stringify(u));showToast('🗑️ تم الحذف')
  }

  async function schedPost(now=false){
    if(!slides.length){showToast('أضف شرائح أولاً');return}
    if(!now&&(!schedDate||!schedTime)){showToast('حدد تاريخ ووقت');return}
    setUploading(true);setSchedMsg('')
    try{
      showToast('⏳ يرفع الصور...')
      const imgs=await renderAll()
      const at=now?new Date().toISOString():new Date(`${schedDate}T${schedTime}:00`).toISOString()
      const r=await fetch('/api/schedule',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slides,caption,theme,fontScale:fs,scheduledAt:at,imagesBase64:imgs})})
      const d=await r.json(); if(d.error)throw new Error(d.error)
      setSchedMsg(now?'🚀 سيُنشر الآن!':'✓ تم الجدولة')
      showToast(now?'🚀 سيُنشر الآن!':'📅 تم الجدولة!')
    }catch(e:any){showToast('خطأ: '+e.message)}
    finally{setUploading(false)}
  }

  async function loadQ(){
    setLoadingQ(true)
    const r=await fetch('/api/schedule');const d=await r.json()
    setPosts(d.posts||[]);setLoadingQ(false)
  }
  useEffect(()=>{if(tab==='queue'&&authed)loadQ()},[tab,authed])

  async function saveSett(){
    setSavingS(true)
    const r=await fetch('/api/auth/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ig_access_token:igToken,ig_user_id:igId})})
    const d=await r.json()
    if(d.igCheck?.valid)setSettingsMsg(`✓ متصل: @${d.igCheck.username}`)
    else if(d.igCheck?.error)setSettingsMsg(`✕ ${d.igCheck.error}`)
    else setSettingsMsg('تم الحفظ ✓')
    setSavingS(false)
  }

  const sl=slides[active]

  if(!authed)return(
    <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0D0D0D',padding:20}}>
      <div style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.08)',borderTop:'3px solid #CC3333',borderRadius:20,padding:36,width:'100%',maxWidth:360,textAlign:'center'}}>
        <div style={{width:60,height:60,background:'#CC3333',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:24,color:'#fff',margin:'0 auto 16px',boxShadow:'0 4px 24px rgba(204,51,51,0.5)'}}>5G</div>
        <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:24,marginBottom:4}}>5GATES</div>
        <div style={{fontSize:11,color:'#CC3333',fontWeight:700,letterSpacing:1,marginBottom:28}}>CAROUSEL BUILDER</div>
        <input type="password" placeholder="كلمة المرور" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} style={{...inp,textAlign:'center',marginBottom:10,fontSize:16}}/>
        {pwErr&&<div style={{color:'#FF5555',fontSize:13,marginBottom:10}}>{pwErr}</div>}
        <button onClick={login} style={{...btnR,width:'100%',justifyContent:'center',padding:'13px',fontSize:15}}>دخول</button>
      </div>
    </div>
  )

  return(
    <div style={{height:'100dvh',display:'flex',flexDirection:'column',overflow:'hidden',background:'#0D0D0D'}}>
      <header style={{height:54,background:'#1A1A1A',borderBottom:'2px solid #CC3333',display:'flex',alignItems:'center',padding:'0 12px',gap:8,flexShrink:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
          <div style={{width:34,height:34,background:'#CC3333',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:14,color:'#fff',boxShadow:'0 3px 12px rgba(204,51,51,0.5)',flexShrink:0}}>5G</div>
          <span style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:15}}>5GATES</span>
        </div>
        {tab==='builder'&&<>
          <button onClick={()=>setBrandingOpen(true)} style={{...btnD,padding:'7px 11px',fontSize:12,color:'#CC3333',borderColor:'rgba(204,51,51,0.3)'}}>🎨 برندة</button>
          <button onClick={openAi} style={{...btnR,padding:'8px 13px',fontSize:12}}>✦ AI</button>
          {slides.length>0&&<>
            {sl && <button onClick={()=>setDragEditorOpen(true)} style={{...btnD,padding:'8px 11px',fontSize:15,minWidth:38,justifyContent:'center'}} title="تحريك النصوص">✥</button>}
            <button onClick={downloadSlides} style={{...btnD,padding:'8px 11px',fontSize:15,minWidth:38,justifyContent:'center'}}>⬇️</button>
            <button onClick={()=>setSaveOpen(true)} style={{...btnD,padding:'8px 11px',fontSize:15,minWidth:38,justifyContent:'center'}}>💾</button>
          </>}
        </>}
        {tab==='queue'&&<button onClick={loadQ} style={{...btnD,padding:'8px 12px',fontSize:12}}>↻</button>}
      </header>

      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>

        {tab==='builder'&&(
          <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div className="m-tabs" style={{display:'flex',background:'#161616',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
              {(['slides','preview','design'] as const).map(p=>(
                <button key={p} onClick={()=>setMPanel(p)} style={{flex:1,padding:'10px 4px',background:'none',border:'none',color:mPanel===p?'#F0EDE8':'#444',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:mPanel===p?800:600,cursor:'pointer',borderBottom:mPanel===p?'2px solid #CC3333':'2px solid transparent',WebkitTapHighlightColor:'transparent'}}>
                  {p==='slides'?`الشرائح (${slides.length})`:p==='preview'?'معاينة':'تصميم'}
                </button>
              ))}
            </div>
            <div style={{flex:1,overflow:'hidden',display:'flex'}}>

              {/* LEFT */}
              <div className={`pnl pnl-L ${mPanel==='slides'?'m-on':''}`} style={{width:225,minWidth:225,background:'#1A1A1A',borderLeft:'1px solid rgba(255,255,255,0.07)',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
                <div style={{flex:1,overflowY:'auto',padding:10}}>
                  {slides.map((sl,i)=>(
                    <div key={i} onClick={()=>{setActive(i);setMPanel('preview')}} style={{background:active===i?'rgba(204,51,51,0.08)':'#222',border:`1px solid ${active===i?'#CC3333':'rgba(255,255,255,0.07)'}`,borderRadius:10,marginBottom:6,overflow:'hidden',display:'flex',cursor:'pointer',boxShadow:active===i?'inset 3px 0 0 #CC3333':'none'}}>
                      <div style={{width:28,minHeight:50,background:active===i?'#CC3333':'#2A2A2A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:active===i?'#fff':'#444',flexShrink:0}}>{i+1}</div>
                      <div style={{flex:1,padding:'7px 8px',minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:'#F0EDE8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',direction:'rtl'}}>{sl.headline.replace(/\*+/g,'')||`شريحة ${i+1}`}</div>
                        <div style={{fontSize:10,color:'#444',marginTop:2,display:'flex',gap:4}}>
                          {getIcon(sl.headline,sl.icon)}
                          {(sl.bgImage||sl.uploadedBg)?'🖼️':''}
                          {sl.mode==='story'?<span style={{color:'#555',fontSize:9}}>📱ستوري</span>:''}
                        </div>
                      </div>
                      <button onClick={e=>{e.stopPropagation();const n=[...slides];n.splice(i,1);setSlides(n);setActive(Math.max(0,i===active?i-1:active))}} style={{background:'none',border:'none',color:'#333',width:26,cursor:'pointer',fontSize:13,flexShrink:0}}>✕</button>
                    </div>
                  ))}
                  <button onClick={()=>{setSlides(p=>[...p,{headline:'**عنوان** جديد',body:'نص الشريحة...',handle:'@5gates.bh',textAlign:'middle',overlayOpacity:0.72,mode:'carousel'}]);setActive(slides.length);setMPanel('preview')}} style={{width:'100%',background:'none',border:'1px dashed rgba(255,255,255,0.1)',borderRadius:10,color:'#444',fontFamily:"'Cairo',sans-serif",fontSize:13,padding:'9px',cursor:'pointer',marginTop:4}}>
                    + كاروسيل
                  </button>
                  <button onClick={()=>{setSlides(p=>[...p,{headline:'**عنوان** جديد',body:'نص الشريحة...',handle:'@5gates.bh',textAlign:'middle',overlayOpacity:0.72,mode:'story'}]);setActive(slides.length);setMPanel('preview')}} style={{width:'100%',background:'none',border:'1px dashed rgba(100,100,255,0.2)',borderRadius:10,color:'#555',fontFamily:"'Cairo',sans-serif",fontSize:13,padding:'9px',cursor:'pointer',marginTop:6}}>
                    + ستوري 📱
                  </button>
                  <div style={{marginTop:14,marginBottom:7,fontSize:9,fontWeight:800,letterSpacing:2,color:'#333',textTransform:'uppercase'}}>مواضيع سريعة</div>
                  {['أخطاء التدفق النقدي','ضريبة القيمة المضافة','نصائح ERP','تقييم الأعمال','المحاسبة الشهرية','نمو المشاريع الصغيرة'].map(tp=>(
                    <div key={tp} onClick={()=>{setAiPrompt(tp);openAi()}} style={{background:'#1E1E1E',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'7px 8px',fontSize:12,fontWeight:700,color:'#444',cursor:'pointer',marginBottom:5,textAlign:'center'}}>{tp}</div>
                  ))}
                </div>
              </div>

              {/* CENTER */}
              <div className={`pnl pnl-C ${mPanel==='preview'?'m-on':''}`} style={{flex:1,background:'#0D0D0D',backgroundImage:'radial-gradient(circle at 20% 60%,rgba(204,51,51,0.05),transparent 50%)',display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
                <div style={{padding:'7px 12px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:8,background:'rgba(13,13,13,0.9)',flexShrink:0}}>
                  <button onClick={()=>setActive(Math.max(0,active-1))} disabled={active===0} style={{...btnD,width:32,height:32,padding:0,justifyContent:'center',opacity:active===0?.3:1,fontSize:18}}>‹</button>
                  <span style={{fontSize:13,color:'#555',fontWeight:800,flex:1,textAlign:'center'}}>{slides.length?`${active+1} / ${slides.length}`:'—'}</span>
                  <button onClick={()=>setActive(Math.min(slides.length-1,active+1))} disabled={active>=slides.length-1} style={{...btnD,width:32,height:32,padding:0,justifyContent:'center',opacity:active>=slides.length-1?.3:1,fontSize:18}}>›</button>
                  {slides.length>0&&(
                    <>
                      <button onClick={()=>setDragEditorOpen(true)} style={{...btnD,padding:'6px 10px',fontSize:11,color:'rgba(204,51,51,0.8)',borderColor:'rgba(204,51,51,0.2)'}} title="تحريك النصوص">✥ تحريك</button>
                      <button className="m-only" onClick={()=>setMPanel('design')} style={{...btnD,padding:'6px 10px',fontSize:12}}>✏️</button>
                    </>
                  )}
                </div>
                <div style={{flex:1,overflow:'auto',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px 14px',gap:12,flexWrap:'nowrap'}}>
                  {slides.length===0?(
                    <div style={{textAlign:'center',color:'#444',padding:20}}>
                      <div style={{fontSize:52,marginBottom:12}}>✦</div>
                      <div style={{fontSize:15,color:'#555',fontWeight:800,marginBottom:8}}>ابدأ الكاروسيل أو الستوري</div>
                      <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                        <button onClick={openAi} style={btnR}>✦ توليد AI</button>
                        <button onClick={()=>setBrandingOpen(true)} style={{...btnD,color:'#CC3333',borderColor:'rgba(204,51,51,0.3)'}}>🎨 برندة</button>
                      </div>
                    </div>
                  ):slides.map((sl,i)=>(
                    <SlideThumb key={i+'-'+theme+'-'+fs+'-'+(sl.icon||'')+'-'+(sl.bgImage||'')+'-'+(sl.uploadedBg?'up':'')+'-'+(sl.textAlign||'')+'-'+(sl.headX||0)+'-'+(sl.headY||0)+'-'+(sl.bodyX||0)+'-'+(sl.bodyY||0)+'-'+(sl.mode||'carousel')}
                      slide={sl} idx={i} total={slides.length} theme={theme} fs={fs} active={active===i} onClick={()=>setActive(i)} size={sl.mode==='story'?135:180}/>
                  ))}
                </div>
              </div>

              {/* RIGHT */}
              <div className={`pnl pnl-R ${mPanel==='design'?'m-on':''}`} style={{width:290,minWidth:290,background:'#1A1A1A',borderRight:'1px solid rgba(255,255,255,0.07)',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
                <div style={{flex:1,overflowY:'auto',padding:13}}>

                  <Sec label="الثيم">
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
                      {(Object.entries(T) as [Theme,typeof T.dark][]).map(([id,t])=>(
                        <div key={id} onClick={()=>setTheme(id)} style={{aspectRatio:'4/5',background:t.bg,borderRadius:9,cursor:'pointer',border:`2px solid ${theme===id?'#CC3333':'transparent'}`,position:'relative',overflow:'hidden'}}>
                          {theme===id&&<div style={{position:'absolute',top:4,right:4,width:16,height:16,background:'#CC3333',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff'}}>✓</div>}
                          <div style={{position:'absolute',bottom:0,left:0,right:0,padding:4,fontSize:8,fontWeight:800,textAlign:'center',background:'linear-gradient(to top,rgba(0,0,0,0.85),transparent)',color:'rgba(255,255,255,0.9)',textTransform:'uppercase'}}>{t.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:9,color:'#444',marginBottom:4}}>حجم الخط — {Math.round(fs*100)}%</div>
                    <input type="range" min="0.7" max="1.4" step="0.05" value={fs} onChange={e=>setFs(+e.target.value)} style={{width:'100%',accentColor:'#CC3333'}}/>
                  </Sec>

                  {slides.length>0&&<>

                    {/* Slide mode toggle */}
                    <Sec label="نوع الشريحة">
                      <div style={{display:'flex',gap:0,background:'#111',borderRadius:10,padding:3,marginBottom:4}}>
                        {(['carousel','story'] as const).map(m=>(
                          <button key={m} onClick={()=>upd({mode:m})} style={{flex:1,padding:'8px',background:(sl?.mode||'carousel')===m?'#CC3333':'transparent',border:'none',borderRadius:8,color:(sl?.mode||'carousel')===m?'#fff':'#444',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:800,cursor:'pointer',transition:'all .15s',WebkitTapHighlightColor:'transparent'}}>
                            {m==='carousel'?'🎠 كاروسيل':'📱 ستوري'}
                          </button>
                        ))}
                      </div>
                    </Sec>

                    <Sec label="صورة الخلفية 🖼️">
                      <input ref={uploadBgRef} type="file" accept="image/*" onChange={handleBgUpload} style={{display:'none'}}/>
                      <button onClick={()=>uploadBgRef.current?.click()} style={{width:'100%',background:sl?.uploadedBg?'rgba(204,51,51,0.08)':'#111',border:`1px dashed ${sl?.uploadedBg?'#CC3333':'rgba(255,255,255,0.12)'}`,borderRadius:10,padding:'12px',cursor:'pointer',color:sl?.uploadedBg?'#CC3333':'#444',fontFamily:"'Cairo',sans-serif",fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:8,fontWeight:700}}>
                        {sl?.uploadedBg ? '🖼️ صورتك المرفوعة ✓ (غيّر)' : '⬆️ ارفع صورة خلفية'}
                      </button>
                      {sl?.uploadedBg && (
                        <button onClick={()=>upd({uploadedBg:undefined})} style={{...btnD,width:'100%',justifyContent:'center',fontSize:11,color:'#ff5555',marginBottom:8}}>✕ حذف الصورة</button>
                      )}
                      {sl?.uploadedBg&&<>
                        <div style={{fontSize:9,color:'#444',marginBottom:4,marginTop:4}}>شفافية التعتيم — {Math.round((sl.overlayOpacity??0.72)*100)}%</div>
                        <input type="range" min="0.2" max="0.95" step="0.05" value={sl.overlayOpacity??0.72} onChange={e=>upd({overlayOpacity:+e.target.value})} style={{width:'100%',accentColor:'#CC3333'}}/>
                      </>}
                    </Sec>

                    <Sec label="موضع النص 🎯">
                      <button onClick={()=>setDragEditorOpen(true)} style={{...btnR,width:'100%',justifyContent:'center',marginBottom:12,fontSize:12,padding:'10px',background:'linear-gradient(135deg,rgba(204,51,51,0.8),rgba(204,51,51,0.5))',boxShadow:'none',border:'1px solid rgba(204,51,51,0.4)'}}>
                        ✥ فتح محرر السحب والإفلات
                      </button>
                      <div style={{fontSize:10,color:'#444',marginBottom:8}}>الموضع السريع</div>
                      <div style={{display:'flex',gap:6,marginBottom:12}}>
                        {([['top','أعلى'],['middle','وسط'],['bottom','أسفل']] as [TextAlign,string][]).map(([p,label])=>(
                          <button key={p} onClick={()=>upd({textAlign:p, headY:0, bodyY:0, textY:0})}
                            style={{flex:1,padding:'10px 4px',borderRadius:8,border:`1px solid ${(sl?.textAlign??'middle')===p?'#CC3333':'rgba(255,255,255,0.1)'}`,background:(sl?.textAlign??'middle')===p?'rgba(204,51,51,0.15)':'#222',color:(sl?.textAlign??'middle')===p?'#CC3333':'#555',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:"'Cairo',sans-serif",WebkitTapHighlightColor:'transparent'}}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <div style={{fontSize:10,color:'#444',marginBottom:6}}>ضبط دقيق ⬆️⬇️</div>
                      <input type="range" min="-100" max="100" step="5"
                        value={sl?.textY??0}
                        onChange={e=>upd({textY:+e.target.value, headY:+e.target.value, bodyY:+e.target.value})}
                        style={{width:'100%',accentColor:'#CC3333',marginBottom:4}}/>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#555',marginBottom:10}}>
                        <span>⬆️</span>
                        <span style={{color:(sl?.textY??0)!==0?'#CC3333':'#555',fontWeight:800}}>{sl?.textY??0 > 0?'+':''}{sl?.textY??0}</span>
                        <span>⬇️</span>
                      </div>
                      <button onClick={()=>upd({headX:50,headY:38,bodyX:50,bodyY:58,textX:0,textY:0,textAlign:'middle'})} style={{...btnD,fontSize:11,padding:'5px 10px'}}>↺ إعادة ضبط</button>
                    </Sec>

                    <Sec label={`تعديل الشريحة ${active+1}`}>
                      <div style={{fontSize:10,color:'#444',marginBottom:4}}>العنوان <span style={{color:'#333'}}>(**أحمر** · ***أصفر***)</span></div>
                      <textarea value={eHead} onChange={e=>setEHead(e.target.value)} rows={2} style={{...inp,resize:'none',lineHeight:1.8,marginBottom:10,fontSize:12}}/>
                      <div style={{fontSize:10,color:'#444',marginBottom:4}}>النص</div>
                      <textarea value={eBody} onChange={e=>setEBody(e.target.value)} rows={2} style={{...inp,resize:'none',lineHeight:1.8,marginBottom:10,fontSize:12}}/>
                      <div style={{fontSize:10,color:'#444',marginBottom:6}}>الأيقونة</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
                        {Object.entries(ICONS).map(([k,v])=>(
                          <div key={k} onClick={()=>upd({icon:k})} style={{width:33,height:33,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,cursor:'pointer',background:sl?.icon===k?'rgba(204,51,51,0.2)':'#222',border:`1px solid ${sl?.icon===k?'#CC3333':'rgba(255,255,255,0.07)'}`,WebkitTapHighlightColor:'transparent'}}>{v}</div>
                        ))}
                      </div>
                      <div style={{fontSize:10,color:'#444',marginBottom:4}}>الحساب</div>
                      <input value={eHandle} onChange={e=>setEHandle(e.target.value)} style={{...inp,marginBottom:10,fontSize:12}}/>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>{const n=[...slides];n.splice(active+1,0,{...slides[active]});setSlides(n);setActive(active+1)}} style={{...btnD,flex:1,justifyContent:'center',fontSize:11}}>⧉ نسخ</button>
                        <button onClick={()=>{const n=[...slides];n.splice(active,1);setSlides(n);setActive(Math.max(0,active-1))}} style={{...btnD,flex:1,justifyContent:'center',fontSize:11,color:'#ff5555'}}>✕ حذف</button>
                      </div>
                    </Sec>
                  </>}

                  <Sec label="الجدولة والنشر">
                    <div style={{fontSize:10,color:'#444',marginBottom:4}}>الكابشن</div>
                    <textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={3} style={{...inp,resize:'none',lineHeight:1.7,fontSize:12,marginBottom:10}} placeholder={'تابعونا 💼\n#5gates #محاسبة #البحرين'}/>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                      <div><div style={{fontSize:10,color:'#444',marginBottom:4}}>التاريخ</div><input type="date" value={schedDate} onChange={e=>setSchedDate(e.target.value)} style={{...inp,fontSize:12}}/></div>
                      <div><div style={{fontSize:10,color:'#444',marginBottom:4}}>الوقت</div><input type="time" value={schedTime} onChange={e=>setSchedTime(e.target.value)} style={{...inp,fontSize:12}}/></div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>schedPost(false)} disabled={uploading} style={{...btnD,flex:1,justifyContent:'center',fontSize:12,opacity:uploading?.6:1}}>📅 جدولة</button>
                      <button onClick={()=>schedPost(true)} disabled={uploading} style={{...btnR,flex:1,justifyContent:'center',fontSize:12,opacity:uploading?.6:1}}>🚀 الآن</button>
                    </div>
                    {schedMsg&&<div style={{marginTop:8,background:'rgba(85,221,136,0.08)',border:'1px solid rgba(85,221,136,0.2)',borderRadius:8,padding:'8px',fontSize:12,color:'#55DD88'}}>{schedMsg}</div>}
                  </Sec>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='saved'&&(
          <div style={{flex:1,overflow:'auto',padding:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
              <h2 style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:18,flex:1}}>💾 التصاميم المحفوظة</h2>
              <span style={{fontSize:12,color:'#444'}}>{saved.length} تصميم</span>
            </div>
            {saved.length===0?(
              <div style={{textAlign:'center',padding:60,color:'#444'}}>
                <div style={{fontSize:48,marginBottom:12}}>💾</div>
                <div style={{fontSize:14,color:'#555',fontWeight:800,marginBottom:8}}>لا توجد تصاميم محفوظة</div>
                <div style={{fontSize:12,color:'#333',marginBottom:20}}>ابنِ كاروسيل واضغط 💾 لحفظه</div>
                <button onClick={()=>setTab('builder')} style={btnR}>← ابدأ الآن</button>
              </div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:14}}>
                {saved.map((c,i)=>(
                  <div key={i} style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,overflow:'hidden'}}>
                    <div style={{background:'#111',padding:10,display:'flex',gap:6,overflowX:'auto'}}>
                      {c.slides.slice(0,4).map((sl,si)=>(
                        <SlideThumb key={si} slide={sl} idx={si} total={c.slides.length} theme={c.theme} fs={c.fs} active={false} onClick={()=>{}} size={75}/>
                      ))}
                      {c.slides.length>4&&<div style={{width:75,height:94,borderRadius:8,background:'#222',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#444',flexShrink:0}}>+{c.slides.length-4}</div>}
                    </div>
                    <div style={{padding:14}}>
                      <div style={{fontSize:15,fontWeight:800,color:'#F0EDE8',marginBottom:4}}>{c.name}</div>
                      <div style={{fontSize:11,color:'#444',marginBottom:12}}>{c.date} · {c.slides.length} شرائح · {T[c.theme]?.label}</div>
                      <div style={{display:'flex',gap:8}}>
                        <button onClick={()=>loadCar(c)} style={{...btnR,flex:1,justifyContent:'center',fontSize:12,padding:'9px'}}>📂 تحميل وتعديل</button>
                        <button onClick={()=>delSaved(c.name)} style={{...btnD,fontSize:12,padding:'9px 12px',color:'#ff5555'}}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==='queue'&&(
          <div style={{flex:1,overflow:'auto',padding:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
              <h2 style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:18,flex:1}}>📅 قائمة الجدولة</h2>
              <button onClick={async()=>{await fetch('/api/publish',{method:'POST'});loadQ()}} style={{...btnR,fontSize:12,padding:'8px 14px'}}>▶ تشغيل</button>
            </div>
            {loadingQ?<div style={{textAlign:'center',padding:40,color:'#444'}}>يحمّل…</div>:
             posts.length===0?<div style={{color:'#444',textAlign:'center',padding:60,fontSize:14}}>لا توجد بوستات مجدولة</div>:(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {posts.map((post:any)=>{
                  const pS:Slide[]=JSON.parse(post.slides_json); const imgs:string[]=post.image_urls?JSON.parse(post.image_urls):[]
                  return(
                    <div key={post.id} style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:14}}>
                      <div style={{display:'flex',gap:7,marginBottom:10}}>{imgs.slice(0,5).map((u:string,i:number)=><img key={i} src={u} alt="" style={{width:46,height:57,borderRadius:7,objectFit:'cover',border:'1px solid rgba(255,255,255,0.06)'}}/>)}</div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5,flexWrap:'wrap'}}><Badge s={post.status}/><span style={{fontSize:11,color:'#333'}}>#{post.id}</span>{post.ig_media_id&&<span style={{fontSize:10,color:'#55DD88'}}>✓ منشور</span>}</div>
                      <div style={{fontSize:13,color:'#F0EDE8',direction:'rtl',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:5}}>{pS[0]?.headline.replace(/\*+/g,'')||'—'}</div>
                      <div style={{fontSize:11,color:'#444',marginBottom:8}}>📅 {new Date(post.scheduled_at).toLocaleString('ar-BH')}</div>
                      {post.error_msg&&<div style={{fontSize:11,color:'#FF5555',background:'rgba(255,85,85,0.07)',padding:'5px 8px',borderRadius:6,marginBottom:8}}>{post.error_msg}</div>}
                      <div style={{display:'flex',gap:6}}>
                        {post.status==='failed'&&<button onClick={async()=>{await fetch('/api/posts',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:post.id,action:'retry'})});loadQ()}} style={{...btnD,fontSize:12,padding:'6px 12px'}}>↻ إعادة</button>}
                        {post.status==='scheduled'&&<button onClick={async()=>{await fetch('/api/posts',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:post.id,action:'cancel'})});loadQ()}} style={{...btnD,fontSize:12,padding:'6px 12px'}}>⏸ إلغاء</button>}
                        <button onClick={async()=>{if(confirm('حذف؟')){await fetch('/api/posts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:post.id})});loadQ()}}} style={{...btnD,fontSize:12,padding:'6px 12px',color:'#ff5555'}}>✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab==='settings'&&(
          <div style={{flex:1,overflow:'auto',padding:16}}>
            <h2 style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:18,marginBottom:16}}>⚙️ الإعدادات</h2>
            <div style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.07)',borderTop:'2px solid #CC3333',borderRadius:14,padding:16,marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:800,color:'#CC3333',marginBottom:14}}>🔗 ربط Instagram</div>
              <div style={{marginBottom:10}}><div style={{fontSize:10,color:'#444',fontWeight:800,marginBottom:5}}>Access Token</div><input value={igToken} onChange={e=>setIgToken(e.target.value)} type="password" style={{...inp,direction:'ltr',fontFamily:'monospace'}} placeholder="EAA..."/></div>
              <div style={{marginBottom:16}}><div style={{fontSize:10,color:'#444',fontWeight:800,marginBottom:5}}>User ID</div><input value={igId} onChange={e=>setIgId(e.target.value)} style={{...inp,direction:'ltr',fontFamily:'monospace'}} placeholder="17841400000000000"/></div>
              <button onClick={saveSett} disabled={savingS} style={{...btnR,opacity:savingS?.6:1,width:'100%',justifyContent:'center'}}>{savingS?'يحفظ…':'💾 حفظ والتحقق'}</button>
              {settingsMsg&&<div style={{marginTop:10,fontSize:13,color:settingsMsg.includes('✓')?'#55DD88':'#FF5555',textAlign:'center'}}>{settingsMsg}</div>}
            </div>
            <div style={{background:'rgba(245,200,66,0.07)',border:'1px solid rgba(245,200,66,0.2)',borderRadius:12,padding:14}}>
              <div style={{fontSize:12,color:'#F5C842',fontWeight:700,marginBottom:6}}>⚠️ جدّد الـ Token كل 50 يوم</div>
              <div style={{fontSize:11,color:'#555',lineHeight:1.8,wordBreak:'break-all',direction:'ltr',textAlign:'left'}}>graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=TOKEN</div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <nav style={{height:62,background:'#1A1A1A',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'stretch',flexShrink:0,zIndex:10}}>
        {([['builder','🏗️','المنشئ'],['saved','💾','المحفوظات'],['queue','📅','الجدولة'],['settings','⚙️','إعدادات']] as const).map(([t,icon,label])=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,color:tab===t?'#CC3333':'#555',fontFamily:"'Cairo',sans-serif",transition:'color .15s',borderTop:tab===t?'2px solid #CC3333':'2px solid transparent',WebkitTapHighlightColor:'transparent',position:'relative'}}>
            <span style={{fontSize:20,lineHeight:1}}>{icon}</span>
            <span style={{fontSize:9,fontWeight:700}}>{label}</span>
            {t==='saved'&&saved.length>0&&<span style={{position:'absolute',top:6,right:'14%',background:'#CC3333',color:'#fff',fontSize:8,fontWeight:800,padding:'1px 5px',borderRadius:10,lineHeight:1.4}}>{saved.length}</span>}
          </button>
        ))}
      </nav>

      {/* AI MODAL */}
      {aiOpen&&(
        <div onClick={e=>{if(e.target===e.currentTarget)closeAi()}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(18px)',zIndex:1000,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.1)',borderTop:'3px solid #CC3333',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:600,maxHeight:'94dvh',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'16px 20px 12px',flexShrink:0}}>
              <div style={{width:36,height:4,background:'rgba(255,255,255,0.15)',borderRadius:2,margin:'0 auto 14px'}}/>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  {aiStep==='chat'&&<button onClick={()=>setAiStep('input')} style={{...btnD,width:30,height:30,padding:0,justifyContent:'center',fontSize:14}}>←</button>}
                  <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:17}}>
                    {aiStep==='input'?'✦ توليد بالذكاء الاصطناعي':'💬 راجع وعدّل المحتوى'}
                  </div>
                </div>
                <button onClick={closeAi} style={{...btnD,width:32,height:32,padding:0,justifyContent:'center'}}>✕</button>
              </div>
              {aiStep==='input'&&(
                <>
                  {/* Post / Story picker */}
                  <div style={{display:'flex',gap:0,marginTop:14,background:'#111',borderRadius:10,padding:3}}>
                    {(['post','story'] as const).map(m=>(
                      <button key={m} onClick={()=>setAiSlideMode(m==='post'?'carousel':'story')} style={{flex:1,padding:'10px',background:(m==='post'?aiSlideMode==='carousel':aiSlideMode==='story')?'#CC3333':'transparent',border:'none',borderRadius:8,color:(m==='post'?aiSlideMode==='carousel':aiSlideMode==='story')?'#fff':'#444',fontFamily:"'Cairo',sans-serif",fontSize:14,fontWeight:800,cursor:'pointer',transition:'all .15s',WebkitTapHighlightColor:'transparent'}}>
                        {m==='post'?'📲 بوست':'📱 ستوري'}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {aiStep==='chat'&&<div style={{marginTop:8,fontSize:11,color:'#555',direction:'rtl'}}>اكتب تعديلاتك بالعربي ← AI يعدّل المحتوى ← اكتب <span style={{color:'#CC3333',fontWeight:800}}>تأكيد</span> للتحويل</div>}
            </div>

            {aiStep==='input'&&(
              <div style={{flex:1,overflowY:'auto',padding:'0 20px 20px'}}>
                {/* Slide count — only shown for post (carousel) mode */}
                {aiSlideMode==='carousel'&&(
                  <div style={{display:'flex',gap:6,marginBottom:16,marginTop:4}}>
                    {[4,5,6,7,8].map(n=>(
                      <button key={n} onClick={()=>setAiNum(String(n))} style={{flex:1,padding:'9px 4px',background:aiNum===String(n)?'#CC3333':'#1A1A1A',border:`1px solid ${aiNum===String(n)?'#CC3333':'rgba(255,255,255,0.1)'}`,borderRadius:8,color:aiNum===String(n)?'#fff':'#555',fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:800,cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
                        {n}
                      </button>
                    ))}
                    <div style={{display:'flex',alignItems:'center',fontSize:10,color:'#333',paddingRight:4,whiteSpace:'nowrap'}}>شرائح</div>
                  </div>
                )}
                <textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} rows={4} style={{...inp,fontSize:14,resize:'none',lineHeight:1.9,marginBottom:12}} placeholder="اكتب الموضوع... مثال: أهم أخطاء تدمر التدفق النقدي"/>
                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:20}}>
                  {['أهم أخطاء في التدفق النقدي','لماذا تفشل الشركات في المحاسبة','كيف تعرف أن شركتك تحتاج ERP','ضريبة القيمة المضافة للمبتدئين'].map(p=>(
                    <div key={p} onClick={()=>setAiPrompt(p)} style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'5px 12px',fontSize:11,color:'#555',cursor:'pointer',fontFamily:"'Cairo',sans-serif"}}>{p}</div>
                  ))}
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={closeAi} style={{...btnD,flex:1,justifyContent:'center'}}>إلغاء</button>
                  <button onClick={startGeneration} disabled={chatLoading||!aiPrompt.trim()} style={{...btnR,flex:2,justifyContent:'center',opacity:(chatLoading||!aiPrompt.trim())?.6:1}}>
                    {chatLoading?<><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.2)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .6s linear infinite',display:'inline-block'}}/> يولّد…</>:'✦ توليد'}
                  </button>
                </div>
              </div>
            )}

            {aiStep==='chat'&&(
              <>
                <div style={{flex:1,overflowY:'auto',padding:'0 16px'}}>
                  {chatMsgs.map((msg,i)=>(
                    <div key={i} style={{marginBottom:14,direction:'rtl'}}>
                      {msg.role==='user'?(
                        <div style={{display:'flex',justifyContent:'flex-start',gap:8}}>
                          <div style={{background:'rgba(204,51,51,0.15)',border:'1px solid rgba(204,51,51,0.3)',borderRadius:'12px 12px 4px 12px',padding:'9px 13px',maxWidth:'85%',fontSize:13,color:'#F0EDE8',lineHeight:1.7,direction:'rtl'}}>{msg.content}</div>
                        </div>
                      ):(
                        <div style={{marginBottom:4}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                            <div style={{width:22,height:22,background:'#CC3333',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'#fff',flexShrink:0}}>5G</div>
                            <span style={{fontSize:10,color:'#CC3333',fontWeight:800}}>5GATES AI</span>
                          </div>
                          {previewSlides.length>0 && (i===1||(i===chatMsgs.length-1&&msg.role==='assistant')) && (
                            <div style={{marginBottom:10}}>{previewSlides.map((sl,si)=><SlidePreviewCard key={si} slide={sl} idx={si}/>)}</div>
                          )}
                          <div style={{background:'#222',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'4px 12px 12px 12px',padding:'9px 13px',fontSize:12,color:'rgba(240,237,232,0.7)',lineHeight:1.8,direction:'rtl',whiteSpace:'pre-wrap'}}>
                            {msg.content.includes('---') ? msg.content.split('---').slice(-1)[0].trim() : msg.content.replace(/\*\*شريحة \d+:\*\*.+\n?.*/g,'').trim()}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {chatLoading&&(
                    <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',direction:'rtl'}}>
                      <div style={{width:22,height:22,background:'#CC3333',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'#fff',flexShrink:0}}>5G</div>
                      <div style={{display:'flex',gap:4}}>{[0,1,2].map(d=><div key={d} style={{width:7,height:7,background:'#CC3333',borderRadius:'50%',animation:`bounce .9s ${d*0.2}s ease-in-out infinite`}}/>)}</div>
                    </div>
                  )}
                  <div ref={chatBottomRef}/>
                </div>
                <div style={{padding:'12px 16px 16px',borderTop:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
                  <div style={{display:'flex',gap:8,marginBottom:10}}>
                    <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&!chatLoading&&sendChat()} placeholder="اطلب تعديلاً..." style={{...inp,flex:1,fontSize:13}} disabled={chatLoading}/>
                    <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()} style={{...btnD,width:40,height:40,padding:0,justifyContent:'center',fontSize:18,opacity:(chatLoading||!chatInput.trim())?.4:1}}>↑</button>
                  </div>
                  <button onClick={()=>{setChatInput('تأكيد');setTimeout(sendChat,50)}} disabled={confirming||previewSlides.length===0}
                    style={{...btnR,width:'100%',justifyContent:'center',fontSize:14,padding:'13px',opacity:confirming?.6:1,background:'linear-gradient(135deg,#CC3333,#FF4444)',boxShadow:'0 4px 20px rgba(204,51,51,0.45)'}}>
                    {confirming?<><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .6s linear infinite',display:'inline-block'}}/> جاري التحويل…</>:'✦ تأكيد — تحويل '+(aiSlideMode==='story'?'لستوري بصري':'لبوست بصري')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* SAVE MODAL */}
      {saveOpen&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setSaveOpen(false)}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(16px)',zIndex:1000,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.1)',borderTop:'3px solid #CC3333',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:520,padding:24}}>
            <div style={{width:36,height:4,background:'rgba(255,255,255,0.15)',borderRadius:2,margin:'0 auto 16px'}}/>
            <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:18,marginBottom:14}}>💾 حفظ التصميم</div>
            <input value={saveName} onChange={e=>setSaveName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveCar()} style={{...inp,marginBottom:16,fontSize:15}} placeholder="مثال: أخطاء التدفق النقدي — مارس 2025"/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setSaveOpen(false)} style={{...btnD,flex:1,justifyContent:'center'}}>إلغاء</button>
              <button onClick={saveCar} style={{...btnR,flex:2,justifyContent:'center'}}>💾 حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* DRAG TEXT EDITOR */}
      {dragEditorOpen && sl && (
        <DragEditor
          slide={sl}
          theme={theme}
          fs={fs}
          onSave={updates => upd(updates)}
          onClose={() => setDragEditorOpen(false)}
        />
      )}

      {/* AI BRANDING MODAL */}
      {brandingOpen && (
        <AiBrandingModal
          theme={theme}
          onClose={() => setBrandingOpen(false)}
          onApply={newSlide => {
            setSlides(p => [...p, {
              ...newSlide,
              headline: newSlide.headline || '**عنوان** الشريحة',
              body: newSlide.body || '',
              handle: '@5gates.bh',
            } as Slide])
            setActive(slides.length)
            setMPanel('preview')
            showToast('✦ تم إضافة شريحة مبراندة!')
          }}
        />
      )}

      {toast&&<div style={{position:'fixed',bottom:72,left:'50%',transform:'translateX(-50%)',background:'#1A1A1A',border:'1px solid rgba(255,255,255,0.12)',borderRight:'3px solid #CC3333',color:'#F0EDE8',padding:'10px 20px',borderRadius:10,fontSize:13,zIndex:9999,boxShadow:'0 8px 28px rgba(0,0,0,0.7)',whiteSpace:'nowrap',fontFamily:"'Cairo',sans-serif"}}>{toast}</div>}

      <style>{`
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#2A2A2A;border-radius:2px}
        @media(min-width:768px){.m-tabs{display:none!important}.m-only{display:none!important}.pnl{display:flex!important}}
        @media(max-width:767px){.m-tabs{display:flex!important}.pnl{display:none!important;width:100%!important;min-width:0!important;flex:1!important}.pnl.m-on{display:flex!important;flex-direction:column!important}}
      `}</style>
    </div>
  )
}
