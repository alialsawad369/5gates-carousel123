'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'

type TextAlign = 'top'|'middle'|'bottom'
type Slide = {
  headline:string; body:string; handle:string; icon?:string; bgImage?:string;
  textAlign?:TextAlign; textX?:number; textY?:number; overlayOpacity?:number;
  headX?:number; headY?:number; bodyX?:number; bodyY?:number;
  headSize?:number; bodySize?:number;
  uploadedBg?:string; mode?:'carousel'|'story';
}
type Theme = 'dark'|'darker'|'white'|'cream'|'darkred'|'charcoal'|'bizbay'|'bizbay_light'
type PostStatus = 'scheduled'|'published'|'failed'|'draft'|'processing'

// Brand config per theme
const BRAND_META: Record<Theme,{name:string;handle:string;isBizbay:boolean}> = {
  dark:        {name:'5GATES', handle:'@5gates.bh', isBizbay:false},
  darker:      {name:'5GATES', handle:'@5gates.bh', isBizbay:false},
  white:       {name:'5GATES', handle:'@5gates.bh', isBizbay:false},
  cream:       {name:'5GATES', handle:'@5gates.bh', isBizbay:false},
  darkred:     {name:'5GATES', handle:'@5gates.bh', isBizbay:false},
  charcoal:    {name:'5GATES', handle:'@5gates.bh', isBizbay:false},
  bizbay:      {name:'bizbay', handle:'@mybizbay',  isBizbay:true},
  bizbay_light:{name:'bizbay', handle:'@mybizbay',  isBizbay:true},
}
type SavedCarousel = { name:string; slides:Slide[]; theme:Theme; fs:number; date:string; caption:string }

type ChatMsg = { role:'user'|'assistant'; content:string }
type AiStep = 'input'|'chat'|'done'

const T: Record<Theme,{bg:string;text:string;sub:string;brand:string;hl:string;label:string}> = {
  dark:        {bg:'#111111',text:'#F0EDE8',sub:'rgba(240,237,232,0.68)',brand:'rgba(240,237,232,0.35)',hl:'#CC3333',label:'Dark'},
  darker:      {bg:'#050505',text:'#F5F5F5',sub:'rgba(245,245,245,0.60)',brand:'rgba(245,245,245,0.30)',hl:'#CC3333',label:'Black'},
  white:       {bg:'#FFFFFF',text:'#111111',sub:'rgba(17,17,17,0.62)',   brand:'rgba(17,17,17,0.35)',   hl:'#CC3333',label:'White'},
  cream:       {bg:'#F5F0E8',text:'#111111',sub:'rgba(17,17,17,0.58)',   brand:'rgba(17,17,17,0.32)',   hl:'#CC3333',label:'Cream'},
  darkred:     {bg:'#180404',text:'#FFF0F0',sub:'rgba(255,240,240,0.60)',brand:'rgba(255,240,240,0.30)',hl:'#FF5555',label:'Red'},
  charcoal:    {bg:'#1C1C1C',text:'#EDEDED',sub:'rgba(237,237,237,0.62)',brand:'rgba(237,237,237,0.32)',hl:'#CC3333',label:'Charcoal'},
  bizbay:      {bg:'#0D0D0D',text:'#FFFFFF', sub:'rgba(255,255,255,0.65)',brand:'rgba(0,188,212,0.7)',  hl:'#00BCD4',label:'Bizbay 🌊'},
  bizbay_light:{bg:'#FFFFFF',text:'#0D0D0D', sub:'rgba(13,13,13,0.62)',  brand:'rgba(0,188,212,0.8)',  hl:'#00BCD4',label:'Bizbay ☀️'},
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
  const accentRgb = (theme==='bizbay'||theme==='bizbay_light') ? '0,188,212' : theme==='darkred' ? '204,51,51' : '204,51,51'
  gr.addColorStop(0,`rgba(${accentRgb},0.25)`)
  gr.addColorStop(1,'transparent'); ctx.fillStyle=gr; ctx.fillRect(0,0,W,CH)
  ctx.fillStyle=t.hl; ctx.beginPath(); ctx.roundRect(W-195,CH*0.845,115,7,4); ctx.fill()

  // Force RTL direction on canvas context — fixes punctuation placement in Arabic
  ctx.direction = 'rtl'

  const brand = BRAND_META[theme]
  const icon=getIcon(slide.headline,slide.icon)
  ctx.font=`${Math.round(160*fs)}px serif`; ctx.globalAlpha=0.12; ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillText(icon,60,CH*0.07); ctx.globalAlpha=1
  ctx.font=`${Math.round(88*fs)}px serif`; ctx.textAlign='right'; ctx.textBaseline='top'; ctx.fillText(icon,W-75,72)
  // Brand watermark — bizbay uses lowercase italic, 5GATES uses bold caps
  if(brand.isBizbay){
    ctx.font=`italic 900 ${Math.round(34*fs)}px 'Arial',sans-serif`
    ctx.fillStyle=bgSrc?'rgba(0,188,212,0.7)':t.brand
  } else {
    ctx.font=`900 ${Math.round(30*fs)}px 'Tajawal','Cairo',sans-serif`
    ctx.fillStyle=bgSrc?'rgba(255,255,255,0.5)':t.brand
  }
  ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText(brand.name,W/2,65)

  // Headline position - use headX/headY if set, otherwise fall back to textX/textY
  // headX/headY are absolute % positions (0-100) of canvas — set by InlineEditor drag
  // If not set, fall back to textAlign-based positioning
  const hasAbsPos = slide.headX !== undefined && slide.headY !== undefined
  const headAbsX = (slide.headX??50)/100*W
  const headAbsY = (slide.headY??(isStory?40:38))/100*CH
  const hxOff = hasAbsPos ? 0 : (slide.textX??0)/100*W*0.3
  const hyOff = hasAbsPos ? 0 : (slide.textY??0)/100*CH*0.25
  const vPos=slide.textAlign??'middle'
  const baseY = hasAbsPos ? headAbsY
    : isStory
    ? (vPos==='top'?CH*0.15:vPos==='bottom'?CH*0.60:CH*0.32)
    : (vPos==='top'?CH*0.18:vPos==='bottom'?CH*0.55:CH*0.28)

  // Proportional text layout — identical math to drawThumb for WYSIWYG consistency
  const hs=Math.round(88*fs),lh=hs*1.32,mx=W*0.85,rx=hasAbsPos?(headAbsX+W*0.43):W*0.93+hxOff
  ctx.font=`900 ${hs}px 'Cairo',sans-serif`
  ctx.textAlign='right'; ctx.textBaseline='top'
  ctx.fillStyle=bgSrc?'#FFFFFF':t.text

  const plain=slide.headline.replace(/\*+/g,'')
  const words=plain.split(' '); const lines:string[]=[]; let cur=''
  for(const w of words){
    const test=cur?cur+' '+w:w
    if(ctx.measureText(test).width>mx&&cur){lines.push(cur);cur=w}else cur=test
  }
  if(cur)lines.push(cur)
  let ly=baseY+hyOff-(lines.length*lh)/2
  for(const line of lines){ ctx.fillText(line.trim(),rx,ly); ly+=lh }

  if(slide.body){
    const hasAbsBody = slide.bodyX !== undefined && slide.bodyY !== undefined
    const bodyAbsX = (slide.bodyX??50)/100*W
    const bodyAbsY = (slide.bodyY??(isStory?55:58))/100*CH
    const bs=Math.round(42*fs)
    ctx.font=`500 ${bs}px 'Cairo',sans-serif`
    ctx.fillStyle=bgSrc?'rgba(255,255,255,0.85)':t.sub
    ctx.textAlign='right'; ctx.textBaseline='top'
    const bwords=slide.body.split(' '); const blines:string[]=[]; let bc=''
    for(const w of bwords){
      const test=bc?bc+' '+w:w
      if(ctx.measureText(test).width>mx&&bc){blines.push(bc);bc=w}else bc=test
    }
    if(bc)blines.push(bc)
    let by=hasAbsBody?bodyAbsY:ly+Math.round(18*fs)
    const brx=hasAbsBody?(bodyAbsX+W*0.43):W*0.93
    for(const b of blines.slice(0,4)){ ctx.fillText(b,brx,by); by+=bs*1.6 }
  }

  const fy=CH-CH*0.06
  ctx.font=`700 ${Math.round(26*fs)}px 'Cairo',sans-serif`; ctx.fillStyle=bgSrc?'rgba(255,255,255,0.4)':t.brand
  ctx.textAlign='right'; ctx.textBaseline='middle'; ctx.fillText(slide.handle||brand.handle,W*0.93,fy)
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
  const pfs = isStory ? fs*(H/1920) : fs*(W/700)
  const ctx=canvas.getContext('2d')!
  if((bgImg)&&(slide.bgImage||slide.uploadedBg)){ctx.drawImage(bgImg,0,0,W,H);ctx.fillStyle=`rgba(0,0,0,${slide.overlayOpacity??0.72})`;ctx.fillRect(0,0,W,H)}
  else{ctx.fillStyle=t.bg;ctx.fillRect(0,0,W,H)}
  const gr=ctx.createRadialGradient(W*1.1,-H*0.1,0,W*1.1,-H*0.1,W*0.9)
  const accentRgb2 = (theme==='bizbay'||theme==='bizbay_light') ? '0,188,212' : '204,51,51'
  gr.addColorStop(0,`rgba(${accentRgb2},0.25)`)
  gr.addColorStop(1,'transparent'); ctx.fillStyle=gr; ctx.fillRect(0,0,W,H)
  ctx.fillStyle=t.hl; ctx.beginPath(); ctx.roundRect(W-195*W/1080,H*0.845,115*W/1080,7*H/1350,4); ctx.fill()

  // Force RTL direction on canvas context — fixes punctuation placement in Arabic
  ctx.direction = 'rtl'

  const brand2 = BRAND_META[theme]
  ctx.font=`${Math.round(88*pfs)}px serif`; ctx.textAlign='right'; ctx.textBaseline='top'
  ctx.fillText(getIcon(slide.headline,slide.icon),W-75*W/1080,72*H/(isStory?1920:1350))
  const F="'Cairo','Tajawal',Arial,sans-serif"
  if(brand2.isBizbay){
    ctx.font=`italic 900 ${Math.round(30*pfs)}px Arial,sans-serif`
    ctx.fillStyle=(slide.bgImage||slide.uploadedBg)?'rgba(0,188,212,0.7)':t.brand
  } else {
    ctx.font=`900 ${Math.round(30*pfs)}px ${F}`
    ctx.fillStyle=(slide.bgImage||slide.uploadedBg)?'rgba(255,255,255,0.5)':t.brand
  }
  ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText(brand2.name,W/2,65*H/(isStory?1920:1350))
  const hasAbsPos2 = slide.headX !== undefined && slide.headY !== undefined
  const headAbsX2 = (slide.headX??50)/100*W
  const headAbsY2 = (slide.headY??(isStory?40:38))/100*H
  const hxOff=(hasAbsPos2?0:(slide.textX??0)/100*W*0.3)
  const vPos=slide.textAlign??'middle'
  const baseY = hasAbsPos2 ? headAbsY2
    : isStory
    ? (vPos==='top'?H*0.15:vPos==='bottom'?H*0.60:H*0.32)
    : (vPos==='top'?H*0.18:vPos==='bottom'?H*0.55:H*0.28)
  // Native RTL rendering — same approach as renderSlide
  const hs=Math.round(88*pfs),lh=hs*1.32,mx=W*0.85,rx=hasAbsPos2?(headAbsX2+W*0.43):W*0.93+hxOff
  ctx.font=`900 ${hs}px ${F}`
  ctx.textAlign='right'; ctx.textBaseline='top'
  ctx.fillStyle=(slide.bgImage||slide.uploadedBg)?'#FFFFFF':t.text

  const plain=slide.headline.replace(/\*+/g,'')
  const words=plain.split(' '); const lines:string[]=[]; let cur=''
  for(const w of words){
    const test=cur?cur+' '+w:w
    if(ctx.measureText(test).width>mx&&cur){lines.push(cur);cur=w}else cur=test
  }
  if(cur)lines.push(cur)
  let ly=baseY+hyOff-(lines.length*lh)/2
  for(const line of lines){ ctx.fillText(line.trim(),rx,ly); ly+=lh }

  if(slide.body){
    const hasAbsBody2 = slide.bodyX !== undefined && slide.bodyY !== undefined
    const bodyAbsX2 = (slide.bodyX??50)/100*W
    const bodyAbsY2 = (slide.bodyY??(isStory?55:58))/100*H
    const bs=Math.round(42*pfs)
    ctx.font=`500 ${bs}px ${F}`
    ctx.fillStyle=(slide.bgImage||slide.uploadedBg)?'rgba(255,255,255,0.85)':t.sub
    ctx.textAlign='right'; ctx.textBaseline='top'
    const bwords=slide.body.split(' '); const blines:string[]=[]; let bc=''
    for(const w of bwords){
      const test=bc?bc+' '+w:w
      if(ctx.measureText(test).width>mx&&bc){blines.push(bc);bc=w}else bc=test
    }
    if(bc)blines.push(bc)
    let by=hasAbsBody2?bodyAbsY2:ly+Math.round(18*pfs)
    const brx2=hasAbsBody2?(bodyAbsX2+W*0.43):W*0.93
    for(const b of blines.slice(0,4)){ ctx.fillText(b,brx2,by); by+=bs*1.6 }
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
// IMAGE → AI VISION → ARABIC SLIDE MODAL
// Upload any Foundr/inspiration post → AI reads it
// → rewrites in Gulf Arabic → branded slide
// ═══════════════════════════════════════════════════
function AiBrandingModal({onClose, onApply}: {
  onClose: () => void;
  onApply: (slide: Partial<Slide>) => void;
}) {
  const [imgData, setImgData] = useState<string|null>(null)
  const [brand, setBrand] = useState<'5gates'|'bizbay'>('5gates')
  const [outputMode, setOutputMode] = useState<'carousel'|'story'>('carousel')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [result, setResult] = useState<{headline:string;body:string}|null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const accent = brand==='bizbay' ? '#00BCD4' : '#CC3333'
  const brandName = brand==='bizbay' ? 'Bizbay — منصة بيع وشراء الأعمال' : '5Gates — استشارات محاسبية'
  const handle = brand==='bizbay' ? '@mybizbay' : '@5gates.bh'

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if(!f) return
    setResult(null); setError('')
    const reader = new FileReader()
    reader.onload = ev => setImgData(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  async function generate() {
    if(!imgData){ setError('ارفع صورة أولاً'); return }
    setLoading(true); setError(''); setResult(null)
    setLoadingMsg('📸 يقرأ الصورة...')

    try {
      const base64 = imgData.split(',')[1]
      const mtype = imgData.startsWith('data:image/png') ? 'image/png'
        : imgData.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'

      setTimeout(()=>setLoadingMsg('✍️ يكتب بالعربي الخليجي...'), 1800)

      const r = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: mtype,
          system: `أنت خبير محتوى سوشيال ميديا خليجي. مهمتك: اقرأ الصورة المرفقة (بوست إنجليزي من حسابات مثل Foundr)، افهم الفكرة الأساسية، ثم أعد كتابتها بالكامل بالعربي الخليجي لحساب ${brandName}.

قواعد الكتابة:
- العنوان: جملة واحدة أو جملتان قصيرتان، جريئة، مباشرة، بالعربي الخليجي
- لا ترجمة حرفية — أعد صياغة الفكرة بأسلوب خليجي أصيل
- النص: جملة دعم قصيرة تعزز الفكرة
- ممكن تستخدم **كلمة** للتمييز بالأحمر

أجب فقط بـ JSON بدون أي نص خارجه:
{"headline":"العنوان هنا","body":"النص الداعم هنا"}`,
          prompt: `اقرأ هذا البوست وأعد كتابته بالعربي الخليجي لـ ${brandName}. أجب بـ JSON فقط.`
        })
      })

      if(!r.ok) throw new Error('فشل الاتصال بـ AI')
      const d = await r.json()
      const text = d.reply || ''
      const clean = text.replace(/```json|```/g,'').trim()
      const match = clean.match(/\{[\s\S]*\}/)
      if(!match) throw new Error('لم يرجع AI نتيجة صحيحة')
      const parsed = JSON.parse(match[0])
      if(!parsed.headline) throw new Error('لم يرجع AI عنواناً')
      setResult(parsed)
    } catch(e:any) {
      setError(e.message || 'حدث خطأ، حاول مجدداً')
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  function apply() {
    if(!result) return
    onApply({
      headline: result.headline,
      body: result.body,
      handle,
      uploadedBg: undefined,
      overlayOpacity: 0.72,
      mode: outputMode,
      textAlign: 'middle',
    })
    onClose()
  }

  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose()}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.94)',backdropFilter:'blur(20px)',zIndex:1500,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:'#161616',border:'1px solid rgba(255,255,255,0.08)',borderTop:`3px solid ${accent}`,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:560,maxHeight:'92dvh',display:'flex',flexDirection:'column'}}>

        {/* Header */}
        <div style={{padding:'16px 20px 14px',flexShrink:0}}>
          <div style={{width:36,height:4,background:'rgba(255,255,255,0.12)',borderRadius:2,margin:'0 auto 14px'}}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:17}}>
              📸 صورة → عربي
            </div>
            <button onClick={onClose} style={{...btnD,width:32,height:32,padding:0,justifyContent:'center'}}>✕</button>
          </div>
          <div style={{fontSize:11,color:'#555',direction:'rtl',marginBottom:14,lineHeight:1.7}}>
            ارفع أي بوست إنجليزي → AI يقرأه ويعيد كتابته بالعربي الخليجي
          </div>

          {/* Brand picker */}
          <div style={{display:'flex',gap:0,background:'#111',borderRadius:10,padding:3}}>
            {(['5gates','bizbay'] as const).map(b=>(
              <button key={b} onClick={()=>setBrand(b)} style={{flex:1,padding:'9px',background:brand===b?(b==='bizbay'?'#00BCD4':'#CC3333'):'transparent',border:'none',borderRadius:8,color:brand===b?'#fff':'#444',fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:800,cursor:'pointer',transition:'all .15s',WebkitTapHighlightColor:'transparent'}}>
                {b==='5gates'?'🔴 5Gates':'🔵 Bizbay'}
              </button>
            ))}
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'0 20px 20px'}}>

          {/* Format */}
          <div style={{display:'flex',gap:0,marginBottom:16,background:'#111',borderRadius:10,padding:3}}>
            {(['carousel','story'] as const).map(m=>(
              <button key={m} onClick={()=>setOutputMode(m)} style={{flex:1,padding:'8px',background:outputMode===m?accent:'transparent',border:'none',borderRadius:8,color:outputMode===m?'#fff':'#444',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .15s',WebkitTapHighlightColor:'transparent'}}>
                {m==='carousel'?'🎠 كاروسيل':'📱 ستوري'}
              </button>
            ))}
          </div>

          {/* Image upload — BIG and prominent */}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}}/>
          {!imgData ? (
            <button onClick={()=>fileRef.current?.click()} style={{width:'100%',background:'#111',border:`2px dashed ${accent}40`,borderRadius:16,padding:'36px 20px',cursor:'pointer',color:'#555',fontFamily:"'Cairo',sans-serif",display:'flex',flexDirection:'column',alignItems:'center',gap:10,marginBottom:16,transition:'border-color .2s'}}>
              <span style={{fontSize:44}}>📸</span>
              <span style={{fontSize:14,fontWeight:700,color:'#888'}}>ارفع بوست Foundr أو أي صورة إنجليزية</span>
              <span style={{fontSize:11,color:'#333'}}>JPG, PNG, WebP — AI سيقرأ النص من الصورة</span>
            </button>
          ) : (
            <div style={{position:'relative',borderRadius:14,overflow:'hidden',marginBottom:16}}>
              <img src={imgData} style={{width:'100%',maxHeight:240,objectFit:'contain',display:'block',background:'#111'}}/>
              <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 60%,rgba(0,0,0,0.8))',pointerEvents:'none'}}/>
              <button onClick={()=>{setImgData(null);setResult(null);setError('')}} style={{position:'absolute',top:8,right:8,...btnD,width:30,height:30,padding:0,justifyContent:'center',fontSize:13}}>✕</button>
              {!result && !loading && (
                <div style={{position:'absolute',bottom:10,left:'50%',transform:'translateX(-50%)',fontSize:11,color:'rgba(255,255,255,0.6)',whiteSpace:'nowrap'}}>
                  ✓ جاهز للتحليل
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{background:'rgba(255,85,85,0.08)',border:'1px solid rgba(255,85,85,0.25)',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#FF5555',direction:'rtl'}}>
              ⚠️ {error}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{background:`rgba(${brand==='bizbay'?'0,188,212':'204,51,51'},0.06)`,border:`1px solid rgba(${brand==='bizbay'?'0,188,212':'204,51,51'},0.2)`,borderRadius:12,padding:'20px',marginBottom:14,textAlign:'center'}}>
              <div style={{display:'flex',justifyContent:'center',gap:6,marginBottom:10}}>
                {[0,1,2].map(d=><div key={d} style={{width:8,height:8,background:accent,borderRadius:'50%',animation:`bounce .9s ${d*0.2}s ease-in-out infinite`}}/>)}
              </div>
              <div style={{fontSize:13,color:accent,fontWeight:700}}>{loadingMsg}</div>
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div style={{background:`rgba(${brand==='bizbay'?'0,188,212':'204,51,51'},0.06)`,border:`1px solid ${accent}40`,borderRadius:14,padding:16,marginBottom:14,direction:'rtl'}}>
              <div style={{fontSize:10,color:accent,fontWeight:800,marginBottom:10,letterSpacing:1}}>✦ النتيجة — جاهزة للإضافة</div>
              <div style={{fontSize:18,fontWeight:900,color:'#F0EDE8',marginBottom:10,lineHeight:1.5,fontFamily:"'Cairo',sans-serif"}}>
                {result.headline.replace(/\*+/g,'')}
              </div>
              <div style={{fontSize:13,color:'rgba(240,237,232,0.65)',lineHeight:1.7,fontFamily:"'Cairo',sans-serif"}}>
                {result.body}
              </div>
              <div style={{marginTop:10,fontSize:10,color:'#444',display:'flex',alignItems:'center',gap:6}}>
                <span style={{background:accent,color:'#fff',padding:'2px 8px',borderRadius:6,fontWeight:800,fontSize:9}}>{brand==='bizbay'?'BIZBAY':'5GATES'}</span>
                <span>{handle} · {outputMode==='story'?'ستوري 📱':'كاروسيل 🎠'}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{display:'flex',gap:10}}>
            {!result ? (
              <>
                <button onClick={onClose} style={{...btnD,flex:1,justifyContent:'center'}}>إلغاء</button>
                <button onClick={generate} disabled={loading||!imgData}
                  style={{...btnR,flex:2,justifyContent:'center',background:accent,boxShadow:`0 3px 14px ${accent}44`,opacity:(loading||!imgData)?.5:1}}>
                  {loading
                    ? <><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .6s linear infinite',display:'inline-block'}}/> يحلل...</>
                    : '✦ حلّل واكتب بالعربي'}
                </button>
              </>
            ) : (
              <>
                <button onClick={()=>{setResult(null)}} style={{...btnD,flex:1,justifyContent:'center'}}>↺ مجدداً</button>
                <button onClick={apply} style={{...btnR,flex:2,justifyContent:'center',background:accent,boxShadow:`0 3px 14px ${accent}44`}}>
                  ✓ أضف للمنشئ
                </button>
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

// ═══════════════════════════════════════════════════
// INLINE EDITOR — Canva-style drag & resize text
// directly on the slide preview in the main screen
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// CANVAS PREVIEW EDITOR
// Uses actual SlideThumb canvas (WYSIWYG) + HTML
// drag handles layered precisely on top
// ═══════════════════════════════════════════════════
function InlineEditor({ slide, theme, fs, onUpdate, total }: {
  slide: Slide; theme: Theme; fs: number; total: number;
  onUpdate: (u: Partial<Slide>) => void;
}) {
  const isStory = slide.mode === 'story'
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement|null>(null)
  const [canvasW, setCanvasW] = useState(0)
  const [canvasH, setCanvasH] = useState(0)
  const [selected, setSelected] = useState<'head'|'body'|null>(null)
  const [headPos, setHeadPos] = useState({ x: slide.headX??50, y: slide.headY??(isStory?40:38) })
  const [bodyPos, setBodyPos] = useState({ x: slide.bodyX??50, y: slide.bodyY??(isStory?55:58) })
  const [headSize, setHeadSize] = useState(slide.headSize??1.0)
  const [bodySize, setBodySize] = useState(slide.bodySize??1.0)
  const dragging = useRef<{which:'head'|'body';mx:number;my:number;ox:number;oy:number}|null>(null)

  // Reset when slide changes
  useEffect(()=>{
    setHeadPos({ x:slide.headX??50, y:slide.headY??(isStory?40:38) })
    setBodyPos({ x:slide.bodyX??50, y:slide.bodyY??(isStory?55:58) })
    setHeadSize(slide.headSize??1.0)
    setBodySize(slide.bodySize??1.0)
    setSelected(null)
  },[slide.headline, slide.body, slide.mode])

  // Measure canvas element size after render
  useEffect(()=>{
    if(!canvasRef.current) return
    const obs = new ResizeObserver(()=>{
      if(canvasRef.current){
        setCanvasW(canvasRef.current.offsetWidth)
        setCanvasH(canvasRef.current.offsetHeight)
      }
    })
    obs.observe(canvasRef.current)
    return ()=>obs.disconnect()
  },[])

  // Redraw canvas when slide changes
  useEffect(()=>{
    if(!canvasRef.current) return
    const bgSrc = slide.uploadedBg || slide.bgImage
    const draw = () => { if(canvasRef.current) drawThumb(slide,0,total,theme,fs,canvasRef.current,imgRef.current) }
    const run = () => {
      if(bgSrc && (!imgRef.current || imgRef.current.src !== bgSrc)){
        const img = new Image(); img.crossOrigin='anonymous'
        img.onload=()=>{ imgRef.current=img; draw() }
        img.onerror=()=>{ imgRef.current=null; draw() }
        img.src = bgSrc
      } else draw()
    }
    if(document.fonts?.ready) document.fonts.ready.then(run); else run()
  })

  function startDrag(e: React.PointerEvent, which: 'head'|'body'){
    e.preventDefault(); e.stopPropagation()
    setSelected(which)
    const pos = which==='head' ? headPos : bodyPos
    dragging.current = { which, mx:e.clientX, my:e.clientY, ox:pos.x, oy:pos.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onMove(e: React.PointerEvent){
    if(!dragging.current || !canvasW || !canvasH) return
    const dx = (e.clientX - dragging.current.mx) / canvasW * 100
    const dy = (e.clientY - dragging.current.my) / canvasH * 100
    const nx = Math.max(5, Math.min(95, dragging.current.ox + dx))
    const ny = Math.max(5, Math.min(95, dragging.current.oy + dy))
    if(dragging.current.which==='head') setHeadPos({x:nx,y:ny})
    else setBodyPos({x:nx,y:ny})
  }

  function onUp(){
    if(!dragging.current) return
    if(dragging.current.which==='head') onUpdate({headX:Math.round(headPos.x), headY:Math.round(headPos.y)})
    else onUpdate({bodyX:Math.round(bodyPos.x), bodyY:Math.round(bodyPos.y)})
    dragging.current = null
  }

  const accent = (theme==='bizbay'||theme==='bizbay_light') ? '#00BCD4' : '#CC3333'
  const headlineClean = slide.headline.replace(/\*+/g,'')
  // Canvas dimensions
  const slideH = isStory ? Math.round(canvasW * 16/9) : Math.round(canvasW * 1350/1080)

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#0A0A0A'}}>
      {/* Toolbar */}
      <div style={{height:42,display:'flex',alignItems:'center',gap:8,padding:'0 12px',flexShrink:0,borderBottom:'1px solid rgba(255,255,255,0.05)',justifyContent:'center'}}>
        {selected ? (
          <>
            <span style={{fontSize:11,color:selected==='head'?accent:'#60C8FF',fontWeight:800,minWidth:40}}>{selected==='head'?'العنوان':'النص'}</span>
            <button onClick={()=>{const ns=Math.max(0.4,(selected==='head'?headSize:bodySize)-0.1); if(selected==='head'){setHeadSize(ns);onUpdate({headSize:ns})} else{setBodySize(ns);onUpdate({bodySize:ns})}}}
              style={{width:30,height:30,background:'#222',border:'1px solid #333',borderRadius:6,color:'#aaa',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>−</button>
            <span style={{fontSize:12,color:'#F0EDE8',fontWeight:800,minWidth:38,textAlign:'center'}}>{Math.round((selected==='head'?headSize:bodySize)*100)}%</span>
            <button onClick={()=>{const ns=Math.min(2.5,(selected==='head'?headSize:bodySize)+0.1); if(selected==='head'){setHeadSize(ns);onUpdate({headSize:ns})} else{setBodySize(ns);onUpdate({bodySize:ns})}}}
              style={{width:30,height:30,background:'#222',border:'1px solid #333',borderRadius:6,color:'#aaa',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>+</button>
            <button onClick={()=>{if(selected==='head'){setHeadSize(1.0);onUpdate({headSize:1.0})}else{setBodySize(1.0);onUpdate({bodySize:1.0})}}}
              style={{padding:'4px 8px',background:'#222',border:'1px solid #333',borderRadius:6,color:'#555',fontSize:10,cursor:'pointer'}}>↺</button>
            <button onClick={()=>setSelected(null)}
              style={{padding:'4px 8px',background:'#222',border:'1px solid #333',borderRadius:6,color:'#555',fontSize:10,cursor:'pointer'}}>✕</button>
          </>
        ) : (
          <span style={{fontSize:10,color:'#333'}}>اضغط على العنوان أو النص في الشريحة ← اسحبه أو غيّر حجمه</span>
        )}
      </div>

      {/* Canvas + drag overlays */}
      <div ref={wrapRef}
        onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
        onClick={e=>{ if(e.target===wrapRef.current) setSelected(null) }}
        style={{flex:1,overflow:'auto',display:'flex',alignItems:'center',justifyContent:'center',padding:16,position:'relative'}}>

        <div style={{position:'relative',flexShrink:0, height:'100%', maxWidth:'100%',
          width:`calc(min(100%, (100vh - 200px) * ${isStory?'0.5625':'0.8'}))`
        }}>
          {/* Actual canvas — WYSIWYG */}
          <canvas ref={canvasRef}
            width={isStory?405:432} height={isStory?720:540}
            style={{width:'100%',height:'auto',display:'block',borderRadius:12,boxShadow:'0 6px 40px rgba(0,0,0,0.8)'}}
          />

          {/* Drag overlay — only shown when canvas has size */}
          {canvasW > 0 && <>
            {/* Guide lines while dragging */}
            {dragging.current && <div style={{position:'absolute',inset:0,borderRadius:12,pointerEvents:'none',zIndex:5}}>
              <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:'rgba(255,255,255,0.25)'}}/>
              <div style={{position:'absolute',top:'33%',left:0,right:0,height:1,background:'rgba(255,255,255,0.25)'}}/>
              <div style={{position:'absolute',top:'66%',left:0,right:0,height:1,background:'rgba(255,255,255,0.25)'}}/>
            </div>}

            {/* HEADLINE handle */}
            <div onPointerDown={e=>startDrag(e,'head')}
              style={{position:'absolute',
                left:`${headPos.x}%`, top:`${headPos.y}%`,
                transform:'translate(-50%,-50%)',
                cursor:'grab', touchAction:'none', zIndex:selected==='head'?10:6,
                maxWidth:'88%', textAlign:'center',
              }}>
              <div style={{
                border:selected==='head'?`2px solid ${accent}`:`1.5px dashed ${accent}66`,
                borderRadius:6, padding:'3px 6px',
                background:selected==='head'?`${accent}22`:'transparent',
                transition:'background 0.15s, border-color 0.15s',
              }}>
                {selected==='head' && <div style={{position:'absolute',top:-18,left:'50%',transform:'translateX(-50%)',fontSize:9,color:accent,fontWeight:800,whiteSpace:'nowrap',background:'#111',padding:'1px 5px',borderRadius:3,zIndex:20}}>↕ ↔ اسحب</div>}
                <div style={{
                  fontFamily:"'Cairo',sans-serif", fontWeight:900,
                  fontSize:`${Math.max(10, canvasW * 0.065 * headSize)}px`,
                  color:'transparent', lineHeight:1.35, direction:'rtl',
                  wordBreak:'break-word', whiteSpace:'pre-wrap',
                  // Invisible text — just for hit area sizing
                  WebkitTextStroke:`1px ${accent}44`,
                }}>{headlineClean}</div>
              </div>
            </div>

            {/* BODY handle */}
            {slide.body && (
              <div onPointerDown={e=>startDrag(e,'body')}
                style={{position:'absolute',
                  left:`${bodyPos.x}%`, top:`${bodyPos.y}%`,
                  transform:'translate(-50%,-50%)',
                  cursor:'grab', touchAction:'none', zIndex:selected==='body'?10:6,
                  maxWidth:'88%', textAlign:'center',
                }}>
                <div style={{
                  border:selected==='body'?'2px solid #60C8FF':'1.5px dashed rgba(96,200,255,0.4)',
                  borderRadius:6, padding:'3px 6px',
                  background:selected==='body'?'rgba(96,200,255,0.1)':'transparent',
                  transition:'background 0.15s, border-color 0.15s',
                }}>
                  {selected==='body' && <div style={{position:'absolute',top:-18,left:'50%',transform:'translateX(-50%)',fontSize:9,color:'#60C8FF',fontWeight:800,whiteSpace:'nowrap',background:'#111',padding:'1px 5px',borderRadius:3,zIndex:20}}>↕ ↔ اسحب</div>}
                  <div style={{
                    fontFamily:"'Cairo',sans-serif", fontWeight:500,
                    fontSize:`${Math.max(7, canvasW * 0.04 * bodySize)}px`,
                    color:'transparent', lineHeight:1.6, direction:'rtl',
                    wordBreak:'break-word', whiteSpace:'pre-wrap',
                    WebkitTextStroke:'1px rgba(96,200,255,0.4)',
                  }}>{slide.body}</div>
                </div>
              </div>
            )}
          </>}
        </div>
      </div>
    </div>
  )
}


// BIZ4SALE REEL GENERATOR
// Fill form → renders branded business-for-sale card
// ═══════════════════════════════════════════════════
type Biz4SaleData = {
  bizTypeAr: string; bizTypeEn: string;
  locationAr: string; locationEn: string;
  price: string; currency: string;
  monthlySales: string; rent: string;
  employees: string; salaries: string;
  extraLabel1: string; extraValue1: string;
  extraLabel2: string; extraValue2: string;
  bgImage: string|null;
}

async function renderBiz4Sale(data: Biz4SaleData, format: 'story'|'carousel'): Promise<string> {
  const W = 1080
  const H = format === 'story' ? 1920 : 1350
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.direction = 'rtl'

  // Background
  if (data.bgImage) {
    await new Promise<void>(res => {
      const img = new Image(); img.crossOrigin = 'anonymous'
      img.onload = () => { ctx.drawImage(img, 0, 0, W, H); res() }
      img.onerror = () => res()
      img.src = data.bgImage!
    })
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, W, H)
  } else {
    // Gradient dark background like the image
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#1a1a1a')
    grad.addColorStop(1, '#0d0d0d')
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)
  }

  // Subtle teal glow top-right
  const glow = ctx.createRadialGradient(W*0.85, 0, 0, W*0.85, 0, W*0.7)
  glow.addColorStop(0, 'rgba(0,188,212,0.15)')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)

  const pad = 70
  const teal = '#00BCD4'
  const white = '#FFFFFF'
  const F_AR = "'Cairo','Tajawal',sans-serif"
  const F_EN = "Arial,sans-serif"

  // FOR SALE badge — top right
  const badgeW = 220, badgeH = 90, badgeR = 18
  const bx = W - pad - badgeW, by = format === 'story' ? 120 : 90
  ctx.fillStyle = teal
  ctx.beginPath(); ctx.roundRect(bx, by, badgeW, badgeH, badgeR); ctx.fill()
  ctx.fillStyle = white; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `800 28px ${F_EN}`; ctx.fillText('For Sale', bx + badgeW/2, by + 28)
  ctx.font = `700 26px ${F_AR}`; ctx.fillText('للبيع', bx + badgeW/2, by + 62)

  // Business type — big Arabic title
  const titleY = format === 'story' ? 270 : 220
  ctx.fillStyle = white; ctx.textAlign = 'right'; ctx.textBaseline = 'top'
  ctx.font = `900 88px ${F_AR}`; ctx.fillText(data.bizTypeAr || 'اسم النشاط', W - pad, titleY)
  ctx.font = `700 52px ${F_EN}`; ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText(data.bizTypeEn || 'Business Name', W - pad, titleY + 100)

  // Location
  const locY = titleY + 185
  ctx.font = `600 38px ${F_AR}`; ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.textAlign = 'right'
  const locText = `${data.locationAr || ''}${data.locationEn ? ' - ' + data.locationEn : ''}`
  ctx.fillText('📍 ' + locText, W - pad, locY)

  // Price card — full width
  const priceCardY = locY + 70
  const priceCardH = 150
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.beginPath(); ctx.roundRect(pad, priceCardY, W - pad*2, priceCardH, 20); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect(pad, priceCardY, W - pad*2, priceCardH, 20); ctx.stroke()
  // Price label
  ctx.font = `600 28px ${F_AR}`; ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.textAlign = 'right'; ctx.textBaseline = 'top'
  ctx.fillText('السعر / Price', W - pad - 24, priceCardY + 18)
  // Price value
  ctx.font = `900 82px ${F_EN}`; ctx.fillStyle = white
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'
  ctx.fillText(`${data.price || '0'} ${data.currency || 'BHD'}`, W - pad - 24, priceCardY + priceCardH - 14)

  // Stats grid — 2 columns x 2 rows
  const stats = [
    { arLabel: 'المبيعات الشهرية', enLabel: 'Monthly Sales', value: data.monthlySales || '—' },
    { arLabel: 'الإيجار', enLabel: 'Rent', value: data.rent || '—' },
    { arLabel: 'الموظفين', enLabel: 'Employees', value: data.employees || '—' },
    { arLabel: 'المعاشات', enLabel: 'Salaries', value: data.salaries || '—' },
  ]
  // Add extra fields if filled
  if (data.extraLabel1 && data.extraValue1) stats.push({ arLabel: data.extraLabel1, enLabel: '', value: data.extraValue1 })
  if (data.extraLabel2 && data.extraValue2) stats.push({ arLabel: data.extraLabel2, enLabel: '', value: data.extraValue2 })

  const gridY = priceCardY + priceCardH + 30
  const cols = 2
  const cellGap = 20
  const cellW = (W - pad*2 - cellGap) / cols
  const cellH = 160

  stats.forEach((s, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = pad + col * (cellW + cellGap)
    const cy = gridY + row * (cellH + cellGap)
    // Cell bg
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.beginPath(); ctx.roundRect(cx, cy, cellW, cellH, 16); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.roundRect(cx, cy, cellW, cellH, 16); ctx.stroke()
    // Labels
    ctx.font = `600 24px ${F_AR}`; ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'
    ctx.fillText(s.arLabel, cx + cellW - 20, cy + 18)
    if (s.enLabel) {
      ctx.font = `500 20px ${F_EN}`; ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.textAlign = 'right'
      ctx.fillText(s.enLabel, cx + cellW - 20, cy + 46)
    }
    // Value
    ctx.font = `900 64px ${F_EN}`; ctx.fillStyle = white
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'
    ctx.fillText(s.value, cx + cellW - 20, cy + cellH - 14)
  })

  // Bottom website
  const webY = H - 80
  ctx.font = `700 34px ${F_EN}`; ctx.fillStyle = teal
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('www.mybizbay.com', W/2, webY)

  // Bizbay logo mark top-left
  ctx.font = `italic 900 36px ${F_EN}`; ctx.fillStyle = 'rgba(0,188,212,0.5)'
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText('bizbay®', pad, format === 'story' ? 120 : 90)

  return canvas.toDataURL('image/jpeg', 0.93)
}

function Biz4SaleModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<Biz4SaleData>({
    bizTypeAr: '', bizTypeEn: '', locationAr: '', locationEn: '',
    price: '', currency: 'BHD', monthlySales: '', rent: '',
    employees: '', salaries: '', extraLabel1: '', extraValue1: '',
    extraLabel2: '', extraValue2: '', bgImage: null,
  })
  const [format, setFormat] = useState<'story'|'carousel'>('story')
  const [preview, setPreview] = useState<string|null>(null)
  const [generating, setGenerating] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function set(k: keyof Biz4SaleData, v: string|null) {
    setData(d => ({ ...d, [k]: v })); setPreview(null)
  }

  async function generate() {
    setGenerating(true)
    try {
      const img = await renderBiz4Sale(data, format)
      setPreview(img)
    } catch(e) { console.error(e) }
    finally { setGenerating(false) }
  }

  function download() {
    if (!preview) return
    const a = document.createElement('a')
    a.href = preview
    a.download = `bizbay-4sale-${data.bizTypeEn||'biz'}-${format}.jpg`
    a.click()
  }

  function handleBgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = ev => { set('bgImage', ev.target?.result as string); setPreview(null) }
    reader.readAsDataURL(f)
  }

  const inpLTR: React.CSSProperties = { ...inp, direction: 'ltr', textAlign: 'left' }
  const inpSm: React.CSSProperties = { ...inp, padding: '8px 10px', fontSize: 12 }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.94)',backdropFilter:'blur(20px)',zIndex:1500,display:'flex',alignItems:'flex-end',justifyContent:'center' }}>
      <div style={{ background:'#161616',border:'1px solid rgba(0,188,212,0.2)',borderTop:'3px solid #00BCD4',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:600,maxHeight:'94dvh',display:'flex',flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px 12px',flexShrink:0 }}>
          <div style={{ width:36,height:4,background:'rgba(255,255,255,0.12)',borderRadius:2,margin:'0 auto 14px' }}/>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ width:36,height:36,background:'#00BCD4',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🏪</div>
              <div>
                <div style={{ fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:16 }}>Biz4Sale Reel</div>
                <div style={{ fontSize:10,color:'#00BCD4',fontWeight:700 }}>BIZBAY</div>
              </div>
            </div>
            <button onClick={onClose} style={{ ...btnD,width:32,height:32,padding:0,justifyContent:'center' }}>✕</button>
          </div>
          {/* Format toggle */}
          <div style={{ display:'flex',gap:0,marginTop:14,background:'#111',borderRadius:10,padding:3 }}>
            {(['story','carousel'] as const).map(f => (
              <button key={f} onClick={() => { setFormat(f); setPreview(null) }}
                style={{ flex:1,padding:'8px',background:format===f?'#00BCD4':'transparent',border:'none',borderRadius:8,color:format===f?'#fff':'#444',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:800,cursor:'pointer',transition:'all .15s',WebkitTapHighlightColor:'transparent' }}>
                {f === 'story' ? '📱 ستوري 9:16' : '🎠 كاروسيل 4:5'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex:1,overflowY:'auto',padding:'0 20px 20px' }}>

          {/* Preview */}
          {preview && (
            <div style={{ marginBottom:16,borderRadius:14,overflow:'hidden',position:'relative' }}>
              <img src={preview} style={{ width:'100%',display:'block',borderRadius:14 }}/>
              <button onClick={() => setPreview(null)}
                style={{ position:'absolute',top:8,left:8,...btnD,width:28,height:28,padding:0,justifyContent:'center',fontSize:11 }}>✕</button>
              <button onClick={download}
                style={{ position:'absolute',bottom:10,left:'50%',transform:'translateX(-50%)',...btnD,background:'rgba(0,188,212,0.9)',color:'#fff',borderColor:'transparent',padding:'8px 20px',fontSize:12,fontWeight:800,whiteSpace:'nowrap' }}>
                ⬇️ تحميل
              </button>
            </div>
          )}

          {/* Form */}
          {!preview && <>
            {/* Business type */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10,color:'#00BCD4',fontWeight:800,marginBottom:6,letterSpacing:1 }}>🏪 النشاط التجاري</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                <input value={data.bizTypeAr} onChange={e=>set('bizTypeAr',e.target.value)} style={inpSm} placeholder="مطعم ومقهى"/>
                <input value={data.bizTypeEn} onChange={e=>set('bizTypeEn',e.target.value)} style={{...inpSm,...inpLTR}} placeholder="Cafe & Restaurant"/>
              </div>
            </div>

            {/* Location */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10,color:'#00BCD4',fontWeight:800,marginBottom:6,letterSpacing:1 }}>📍 الموقع</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                <input value={data.locationAr} onChange={e=>set('locationAr',e.target.value)} style={inpSm} placeholder="الغريفة"/>
                <input value={data.locationEn} onChange={e=>set('locationEn',e.target.value)} style={{...inpSm,...inpLTR}} placeholder="Ghuraifa"/>
              </div>
            </div>

            {/* Price */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10,color:'#00BCD4',fontWeight:800,marginBottom:6,letterSpacing:1 }}>💰 السعر</div>
              <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:8 }}>
                <input value={data.price} onChange={e=>set('price',e.target.value)} style={{...inpSm,...inpLTR}} placeholder="17,000"/>
                <select value={data.currency} onChange={e=>set('currency',e.target.value)} style={{...inpSm,...inpLTR}}>
                  <option>BHD</option><option>SAR</option><option>USD</option><option>AED</option><option>KWD</option><option>QAR</option>
                </select>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10,color:'#00BCD4',fontWeight:800,marginBottom:6,letterSpacing:1 }}>📊 الإحصائيات</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                <div>
                  <div style={{ fontSize:9,color:'#555',marginBottom:3 }}>المبيعات الشهرية / Monthly Sales</div>
                  <input value={data.monthlySales} onChange={e=>set('monthlySales',e.target.value)} style={{...inpSm,...inpLTR}} placeholder="6,500"/>
                </div>
                <div>
                  <div style={{ fontSize:9,color:'#555',marginBottom:3 }}>الإيجار / Rent</div>
                  <input value={data.rent} onChange={e=>set('rent',e.target.value)} style={{...inpSm,...inpLTR}} placeholder="650"/>
                </div>
                <div>
                  <div style={{ fontSize:9,color:'#555',marginBottom:3 }}>الموظفين / Employees</div>
                  <input value={data.employees} onChange={e=>set('employees',e.target.value)} style={{...inpSm,...inpLTR}} placeholder="6"/>
                </div>
                <div>
                  <div style={{ fontSize:9,color:'#555',marginBottom:3 }}>المعاشات / Salaries</div>
                  <input value={data.salaries} onChange={e=>set('salaries',e.target.value)} style={{...inpSm,...inpLTR}} placeholder="1,200"/>
                </div>
              </div>
            </div>

            {/* Extra fields */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10,color:'#555',fontWeight:800,marginBottom:6,letterSpacing:1 }}>➕ حقول إضافية (اختياري)</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:6 }}>
                <input value={data.extraLabel1} onChange={e=>set('extraLabel1',e.target.value)} style={inpSm} placeholder="التسمية (مثال: الأرباح)"/>
                <input value={data.extraValue1} onChange={e=>set('extraValue1',e.target.value)} style={{...inpSm,...inpLTR}} placeholder="القيمة"/>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                <input value={data.extraLabel2} onChange={e=>set('extraLabel2',e.target.value)} style={inpSm} placeholder="التسمية"/>
                <input value={data.extraValue2} onChange={e=>set('extraValue2',e.target.value)} style={{...inpSm,...inpLTR}} placeholder="القيمة"/>
              </div>
            </div>

            {/* Background image */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10,color:'#555',fontWeight:800,marginBottom:6,letterSpacing:1 }}>🖼️ صورة الخلفية (اختياري)</div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleBgFile} style={{ display:'none' }}/>
              {data.bgImage ? (
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <img src={data.bgImage} style={{ width:60,height:40,objectFit:'cover',borderRadius:8,border:'1px solid rgba(0,188,212,0.3)' }}/>
                  <span style={{ fontSize:11,color:'#00BCD4' }}>✓ تم رفع الصورة</span>
                  <button onClick={()=>set('bgImage',null)} style={{ ...btnD,padding:'4px 8px',fontSize:10,color:'#ff5555',marginRight:'auto' }}>✕</button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  style={{ width:'100%',background:'#111',border:'1px dashed rgba(0,188,212,0.3)',borderRadius:10,padding:'12px',cursor:'pointer',color:'#555',fontFamily:"'Cairo',sans-serif",fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
                  📸 ارفع صورة للخلفية
                </button>
              )}
            </div>
          </>}

          {/* Action buttons */}
          <div style={{ display:'flex',gap:10 }}>
            {!preview ? (
              <>
                <button onClick={onClose} style={{ ...btnD,flex:1,justifyContent:'center' }}>إلغاء</button>
                <button onClick={generate} disabled={generating||!data.bizTypeAr}
                  style={{ ...btnR,flex:2,justifyContent:'center',background:'#00BCD4',boxShadow:'0 3px 14px rgba(0,188,212,0.4)',opacity:(generating||!data.bizTypeAr)?0.5:1 }}>
                  {generating
                    ? <><span style={{ width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .6s linear infinite',display:'inline-block' }}/> يولّد...</>
                    : '✦ توليد الكارت'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setPreview(null)} style={{ ...btnD,flex:1,justifyContent:'center' }}>← تعديل</button>
                <button onClick={download} style={{ ...btnR,flex:2,justifyContent:'center',background:'#00BCD4',boxShadow:'0 3px 14px rgba(0,188,212,0.4)' }}>
                  ⬇️ تحميل
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Sec({label,children}:{label:string;children:React.ReactNode}){
  return <div style={{marginBottom:14,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:12}}><div style={{fontSize:9,fontWeight:800,letterSpacing:2,color:'#555',marginBottom:9,textTransform:'uppercase'}}>{label}</div>{children}</div>
}

export default function App(){
  const [activeBrand,setActiveBrand]=useState<'none'|'5gates'|'bizbay'>('none')
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
  const [brandingOpen, setBrandingOpen] = useState(false)
  const [biz4saleOpen, setBiz4saleOpen] = useState(false)
  const uploadBgRef = useRef<HTMLInputElement>(null)

  // AI Chat state
  const [aiStep,setAiStep]=useState<AiStep>('input')
  const [aiPrompt,setAiPrompt]=useState('')
  const [aiNum,setAiNum]=useState('5')
  const [aiLang,setAiLang]=useState('ar')
  const [aiType,setAiType]=useState('hook')
  const [aiTone,setAiTone]=useState('bold')
  const [aiInputMode,setAiInputMode]=useState<'topic'|'manual'|'foundr'>('topic')
  const [aiPostMode,setAiPostMode]=useState<'post'|'carousel'>('carousel')
  const [aiSlideMode,setAiSlideMode]=useState<'carousel'|'story'>('carousel')
  const [aiManualText,setAiManualText]=useState('')
  const [foundrText,setFoundrText]=useState('')
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
    setAiStep('input'); setAiPrompt(''); setAiManualText(''); setFoundrText(''); setChatMsgs([]); setChatInput(''); setPreviewSlides([]); setConfirming(false); setAiPostMode('carousel')
  }

  function openAi(){setAiOpen(true); resetAiModal()}
  function closeAi(){setAiOpen(false); resetAiModal()}



  async function startGeneration(){
    const isBizbayTheme = theme==='bizbay'||theme==='bizbay_light'
    const brand = BRAND_META[theme]
    const topic = aiInputMode==='topic' ? aiPrompt.trim()
      : aiInputMode==='manual' ? aiManualText.trim()
      : foundrText.trim()
    if(!topic){showToast('أدخل موضوعاً أو نصاً');return}
    setChatLoading(true)
    setAiStep('chat')

    // For Foundr mode — use /api/chat to translate+adapt, then convert to slides
    if(aiInputMode==='foundr'){
      const userMsg: ChatMsg = { role:'user', content: `ترجمة Foundr:\n${topic}` }
      setChatMsgs([userMsg])
      try{
        const brandName = brand.isBizbay ? 'Bizbay (منصة بيع وشراء الأعمال)' : '5GATES (استشارات محاسبية)'
        const r = await fetch('/api/chat',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            system: `أنت متخصص في إعادة صياغة محتوى انجليزي لسوشيال ميديا وتحويله لمحتوى عربي خليجي قوي لشركة ${brandName}.
أسلوب المحتوى: جريء، مباشر، مثل Foundr — جمل قصيرة وقوية.
اللغة: عربية خليجية واضحة.

حوّل النص المدخل إلى ${aiPostMode==='post'?'شريحة واحدة':aiNum+' شرائح'} وأعد JSON فقط:
\`\`\`json
[{"headline":"العنوان القوي","body":"جملة دعم قصيرة"}]
\`\`\``,
            messages:[{role:'user',content:`حوّل هذا لمحتوى عربي لـ ${brandName}:\n\n${topic}`}]
          })
        })
        const d = await r.json()
        const aiReply = d.reply || d.content || d.message || ''
        const parsed = parseSlidesFromText(aiReply)
        if(parsed){
          const generatedSlides: Slide[] = parsed.map((s:any)=>({
            ...s, textAlign:'middle', overlayOpacity:0.72, mode:aiSlideMode,
            handle: brand.handle
          }))
          setPreviewSlides(generatedSlides)
          const previewText = generatedSlides.map((sl,i)=>`**شريحة ${i+1}:** ${sl.headline.replace(/\*+/g,'')}\n${sl.body||''}`).join('\n\n')
          setChatMsgs([userMsg,{role:'assistant',content:`✦ تم التحويل لـ ${brand.name} (${generatedSlides.length} شرائح):\n\n${previewText}\n\n---\nعدّل أو اكتب **"تأكيد"**`}])
        } else {
          setChatMsgs([userMsg,{role:'assistant',content:aiReply||'حدث خطأ، حاول مجدداً'}])
        }
      }catch(e:any){
        setChatMsgs(prev=>[...prev,{role:'assistant',content:`خطأ: ${e.message}`}])
        setAiStep('input')
      }finally{ setChatLoading(false) }
      return
    }

    const userMsg: ChatMsg = { role:'user', content: aiInputMode==='topic' ? `الموضوع: ${topic}` : `النص المدخل:\n${topic}` }
    setChatMsgs([userMsg])
    try{
      const r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:topic,numSlides:aiPostMode==='post'?1:+aiNum,lang:aiLang,type:aiType,tone:aiTone})})
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
    const isConfirm = /^(تأكيد|confirm|ok|done|apply|yes|يلا|كمّل|perfect|looks good)$/i.test(msg.trim())
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
      const currentSlidesJson = JSON.stringify(previewSlides.map((s,i)=>({index:i+1,headline:s.headline,body:s.body})))
      const brand = BRAND_META[theme]
      const systemPrompt = `You are a social media carousel content editor for ${brand.name} (${brand.isBizbay?'business marketplace in Bahrain':'accounting consultancy in Bahrain'}).

The user will give you edit instructions in ENGLISH or ARABIC. You MUST understand and apply both languages perfectly.

CURRENT SLIDES (${previewSlides.length} slides):
${currentSlidesJson}

RULES — apply the user's instruction EXACTLY:
- "first slide heading only" or "slide 1 no body" → set body to "" for slide 1
- "make it shorter" → shorten the text
- "slide X should be..." → modify only that slide
- "remove body from slide X" → set body to "" for slide X  
- "rewrite" → rewrite all slides keeping the same topic
- Always keep the slide COUNT the same unless asked to add/remove
- Content language stays ${aiLang==='ar'?'Arabic':'English'} unless asked to change

RESPOND with the full updated slides array as JSON, then a SHORT summary of what changed:

\`\`\`json
[{"headline":"...","body":"..."},...]
\`\`\`

Then: what you changed (1 line, in the same language the user wrote in).`
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
    imgs.forEach((b,i)=>{const a=document.createElement('a');a.href=b;a.download=`${activeBrand==='bizbay'?'bizbay':'5gates'}-${i+1}.jpg`;a.click()})
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
  useEffect(()=>{if(tab==='queue')loadQ()},[tab])

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

  if(activeBrand==='none')return(
    <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0D0D0D',padding:20,flexDirection:'column'}}>
      <div style={{textAlign:'center',marginBottom:40}}>
        <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:28,color:'#F0EDE8',marginBottom:8}}>
          منشئ المحتوى
        </div>
        <div style={{fontSize:13,color:'#444'}}>اختر البراند للبدء</div>
      </div>

      <div style={{display:'flex',gap:16,flexWrap:'wrap',justifyContent:'center',width:'100%',maxWidth:520}}>
        {/* 5Gates card */}
        <button onClick={()=>{setActiveBrand('5gates');setTheme('dark')}}
          style={{flex:1,minWidth:220,background:'#1A1A1A',border:'1px solid rgba(204,51,51,0.3)',borderTop:'4px solid #CC3333',borderRadius:20,padding:'32px 24px',cursor:'pointer',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:12,transition:'all .2s',WebkitTapHighlightColor:'transparent'}}>
          <div style={{width:64,height:64,background:'#CC3333',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:26,color:'#fff',boxShadow:'0 6px 24px rgba(204,51,51,0.5)'}}>5G</div>
          <div style={{fontFamily:"'Tajawal',sans-serif",fontWeight:900,fontSize:20,color:'#F0EDE8'}}>5GATES</div>
          <div style={{fontSize:11,color:'#555',lineHeight:1.6}}>استشارات محاسبية · البحرين</div>
          <div style={{marginTop:4,background:'#CC3333',color:'#fff',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:800,fontFamily:"'Cairo',sans-serif"}}>ابدأ →</div>
        </button>

        {/* Bizbay card */}
        <button onClick={()=>{setActiveBrand('bizbay');setTheme('bizbay')}}
          style={{flex:1,minWidth:220,background:'#1A1A1A',border:'1px solid rgba(0,188,212,0.3)',borderTop:'4px solid #00BCD4',borderRadius:20,padding:'32px 24px',cursor:'pointer',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:12,transition:'all .2s',WebkitTapHighlightColor:'transparent'}}>
          <div style={{width:64,height:64,background:'#00BCD4',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Arial',sans-serif",fontWeight:900,fontSize:18,fontStyle:'italic',color:'#fff',boxShadow:'0 6px 24px rgba(0,188,212,0.5)'}}>biz</div>
          <div style={{fontFamily:"'Arial',sans-serif",fontWeight:900,fontSize:20,fontStyle:'italic',color:'#F0EDE8'}}>bizbay</div>
          <div style={{fontSize:11,color:'#555',lineHeight:1.6}}>منصة بيع وشراء الأعمال</div>
          <div style={{marginTop:4,background:'#00BCD4',color:'#fff',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:800,fontFamily:"'Cairo',sans-serif"}}>ابدأ →</div>
        </button>
      </div>
    </div>
  )

  return(
    <div style={{height:'100dvh',display:'flex',flexDirection:'column',overflow:'hidden',background:'#0D0D0D'}}>
      <header style={{height:54,background:'#1A1A1A',borderBottom:activeBrand==='bizbay'?'2px solid #00BCD4':'2px solid #CC3333',display:'flex',alignItems:'center',padding:'0 12px',gap:8,flexShrink:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
          <div style={{width:34,height:34,background:activeBrand==='bizbay'?'#00BCD4':'#CC3333',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:activeBrand==='bizbay'?"'Arial',sans-serif":"'Tajawal',sans-serif",fontWeight:900,fontSize:13,color:'#fff',fontStyle:activeBrand==='bizbay'?'italic':'normal',boxShadow:activeBrand==='bizbay'?'0 3px 12px rgba(0,188,212,0.5)':'0 3px 12px rgba(204,51,51,0.5)',flexShrink:0}}>{activeBrand==='bizbay'?'biz':'5G'}</div>
          <span style={{fontFamily:activeBrand==='bizbay'?"'Arial',sans-serif":"'Tajawal',sans-serif",fontWeight:900,fontSize:15,fontStyle:activeBrand==='bizbay'?'italic':'normal'}}>{activeBrand==='bizbay'?'bizbay':'5GATES'}</span>
          <button onClick={()=>setActiveBrand('none')} style={{...btnD,padding:'3px 8px',fontSize:10,marginLeft:4,opacity:0.5}}>⇄</button>
        </div>
        {tab==='builder'&&<>
          <button onClick={()=>setBrandingOpen(true)} style={{...btnD,padding:'7px 11px',fontSize:12,color:activeBrand==='bizbay'?'#00BCD4':'#CC3333',borderColor:activeBrand==='bizbay'?'rgba(0,188,212,0.3)':'rgba(204,51,51,0.3)'}}>📸</button>
          {activeBrand==='bizbay'&&<button onClick={()=>setBiz4saleOpen(true)} style={{...btnD,padding:'7px 11px',fontSize:11,color:'#00BCD4',borderColor:'rgba(0,188,212,0.3)',fontWeight:800}}>🏪 4Sale</button>}
          <button onClick={openAi} style={{...btnR,padding:'8px 13px',fontSize:12,background:activeBrand==='bizbay'?'#00BCD4':'#CC3333',boxShadow:activeBrand==='bizbay'?'0 3px 14px rgba(0,188,212,0.35)':'0 3px 14px rgba(204,51,51,0.35)'}}>✦ AI</button>
          {slides.length>0&&<>
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
                  <button onClick={()=>{setSlides(p=>[...p,{headline:'**عنوان** جديد',body:'نص الشريحة...',handle:BRAND_META[theme].handle,textAlign:'middle',overlayOpacity:0.72,mode:'carousel'}]);setActive(slides.length);setMPanel('preview')}} style={{width:'100%',background:'none',border:'1px dashed rgba(255,255,255,0.1)',borderRadius:10,color:'#444',fontFamily:"'Cairo',sans-serif",fontSize:13,padding:'9px',cursor:'pointer',marginTop:4}}>
                    + كاروسيل
                  </button>
                  <button onClick={()=>{setSlides(p=>[...p,{headline:'**عنوان** جديد',body:'نص الشريحة...',handle:BRAND_META[theme].handle,textAlign:'middle',overlayOpacity:0.72,mode:'story'}]);setActive(slides.length);setMPanel('preview')}} style={{width:'100%',background:'none',border:'1px dashed rgba(100,100,255,0.2)',borderRadius:10,color:'#555',fontFamily:"'Cairo',sans-serif",fontSize:13,padding:'9px',cursor:'pointer',marginTop:6}}>
                    + ستوري 📱
                  </button>
                  <div style={{marginTop:14,marginBottom:7,fontSize:9,fontWeight:800,letterSpacing:2,color:'#333',textTransform:'uppercase'}}>مواضيع سريعة</div>
                  {['أخطاء التدفق النقدي','ضريبة القيمة المضافة','نصائح ERP','تقييم الأعمال','المحاسبة الشهرية','نمو المشاريع الصغيرة'].map(tp=>(
                    <div key={tp} onClick={()=>{setAiPrompt(tp);openAi()}} style={{background:'#1E1E1E',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'7px 8px',fontSize:12,fontWeight:700,color:'#444',cursor:'pointer',marginBottom:5,textAlign:'center'}}>{tp}</div>
                  ))}
                </div>
              </div>

              {/* CENTER — inline Canva-style editor */}
              <div className={`pnl pnl-C ${mPanel==='preview'?'m-on':''}`} style={{flex:1,background:'#0D0D0D',backgroundImage:'radial-gradient(circle at 20% 60%,rgba(204,51,51,0.05),transparent 50%)',display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
                <div style={{padding:'7px 12px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:8,background:'rgba(13,13,13,0.9)',flexShrink:0}}>
                  <button onClick={()=>setActive(Math.max(0,active-1))} disabled={active===0} style={{...btnD,width:32,height:32,padding:0,justifyContent:'center',opacity:active===0?.3:1,fontSize:18}}>‹</button>
                  <span style={{fontSize:13,color:'#555',fontWeight:800,flex:1,textAlign:'center'}}>{slides.length?`${active+1} / ${slides.length}`:'—'}</span>
                  <button onClick={()=>setActive(Math.min(slides.length-1,active+1))} disabled={active>=slides.length-1} style={{...btnD,width:32,height:32,padding:0,justifyContent:'center',opacity:active>=slides.length-1?.3:1,fontSize:18}}>›</button>
                  <button className="m-only" onClick={()=>setMPanel('design')} style={{...btnD,padding:'6px 10px',fontSize:12}}>✏️</button>
                </div>
                {slides.length===0?(
                  <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div style={{textAlign:'center',color:'#444',padding:20}}>
                      <div style={{fontSize:52,marginBottom:12}}>✦</div>
                      <div style={{fontSize:15,color:'#555',fontWeight:800,marginBottom:8}}>ابدأ الكاروسيل أو الستوري</div>
                      <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                        <button onClick={openAi} style={btnR}>✦ توليد AI</button>
                        <button onClick={()=>setBrandingOpen(true)} style={{...btnD,color:'#CC3333',borderColor:'rgba(204,51,51,0.3)'}}>🎨 برندة</button>
                      </div>
                    </div>
                  </div>
                ):(
                  <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
                    {/* Slide strip — small thumbnails */}
                    <div style={{display:'flex',gap:8,padding:'8px 12px',overflowX:'auto',flexShrink:0,borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                      {slides.map((sl,i)=>(
                        <SlideThumb key={i+'-'+theme+'-'+fs+'-'+(sl.mode||'carousel')+'-'+(sl.uploadedBg?'u':sl.bgImage||'')+'-'+(sl.headX||0)+'-'+(sl.headY||0)}
                          slide={sl} idx={i} total={slides.length} theme={theme} fs={fs} active={active===i} onClick={()=>setActive(i)} size={60}/>
                      ))}
                    </div>
                    {/* Main inline editor */}
                    {sl && <InlineEditor slide={sl} theme={theme} fs={fs} total={slides.length} onUpdate={upd}/>}
                  </div>
                )}
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
                      {/* User upload button */}
                      <input ref={uploadBgRef} type="file" accept="image/*" onChange={handleBgUpload} style={{display:'none'}}/>
                      <button onClick={()=>uploadBgRef.current?.click()} style={{width:'100%',background:sl?.uploadedBg?'rgba(204,51,51,0.08)':'#111',border:`1px dashed ${sl?.uploadedBg?'#CC3333':'rgba(255,255,255,0.12)'}`,borderRadius:10,padding:'10px',cursor:'pointer',color:sl?.uploadedBg?'#CC3333':'#444',fontFamily:"'Cairo',sans-serif",fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:8,fontWeight:700}}>
                        {sl?.uploadedBg ? '🖼️ صورتك المرفوعة ✓ (غيّر)' : '⬆️ ارفع صورتك'}
                      </button>
                      {sl?.uploadedBg && (
                        <>
                          <button onClick={()=>upd({uploadedBg:undefined})} style={{...btnD,width:'100%',justifyContent:'center',fontSize:11,color:'#ff5555',marginBottom:8}}>✕ حذف الصورة</button>
                          <div style={{fontSize:9,color:'#444',marginBottom:4}}>شفافية التعتيم — {Math.round((sl.overlayOpacity??0.72)*100)}%</div>
                          <input type="range" min="0.2" max="0.95" step="0.05" value={sl.overlayOpacity??0.72} onChange={e=>upd({overlayOpacity:+e.target.value})} style={{width:'100%',accentColor:'#CC3333'}}/>
                        </>
                      )}
                    </Sec>

                    <Sec label="النص 🎯">
                      <div style={{fontSize:10,color:'#444',marginBottom:6}}>اسحب العنوان أو النص مباشرة على الشريحة في المعاينة</div>
                      <button onClick={()=>upd({headX:50,headY:38,bodyX:50,bodyY:58,textX:0,textY:0,textAlign:'middle'})} style={{...btnD,fontSize:11,padding:'7px 12px',width:'100%',justifyContent:'center'}}>↺ إعادة ضبط الموضع</button>
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
                  <div style={{display:'flex',gap:0,marginTop:14,background:'#111',borderRadius:10,padding:3}}>
                    {(['post','carousel'] as const).map(m=>(
                      <button key={m} onClick={()=>setAiPostMode(m)} style={{flex:1,padding:'9px',background:aiPostMode===m?'#CC3333':'transparent',border:'none',borderRadius:8,color:aiPostMode===m?'#fff':'#444',fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:800,cursor:'pointer',transition:'all .15s',WebkitTapHighlightColor:'transparent'}}>
                        {m==='post'?'📸 بوست واحد':'🎠 كاروسيل'}
                      </button>
                    ))}
                  </div>
                  {/* Story / Carousel output format */}
                  <div style={{display:'flex',gap:0,marginTop:8,background:'#111',borderRadius:10,padding:3}}>
                    {(['carousel','story'] as const).map(m=>(
                      <button key={m} onClick={()=>setAiSlideMode(m)} style={{flex:1,padding:'8px',background:aiSlideMode===m?'rgba(204,51,51,0.7)':'transparent',border:'none',borderRadius:8,color:aiSlideMode===m?'#fff':'#444',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .15s',WebkitTapHighlightColor:'transparent'}}>
                        {m==='carousel'?'🎠 تنسيق كاروسيل':'📱 تنسيق ستوري'}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {aiStep==='chat'&&<div style={{marginTop:8,fontSize:11,color:'#555',direction:'rtl'}}>اكتب تعديلاتك بالعربي أو الإنجليزي ← اكتب <span style={{color:'#CC3333',fontWeight:800}}>confirm</span> أو <span style={{color:'#CC3333',fontWeight:800}}>تأكيد</span> للتحويل</div>}
            </div>

            {aiStep==='input'&&(
              <div style={{flex:1,overflowY:'auto',padding:'0 20px 20px'}}>
                <div style={{display:'flex',gap:0,marginBottom:16,background:'#111',borderRadius:10,padding:3}}>
                  {(['topic','manual','foundr'] as const).map(m=>(
                    <button key={m} onClick={()=>setAiInputMode(m)} style={{flex:1,padding:'8px 4px',background:aiInputMode===m?'#CC3333':'transparent',border:'none',borderRadius:8,color:aiInputMode===m?'#fff':'#444',fontFamily:"'Cairo',sans-serif",fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .15s',WebkitTapHighlightColor:'transparent'}}>
                      {m==='topic'?'🎯 موضوع':m==='manual'?'✍️ نص':'📋 Foundr'}
                    </button>
                  ))}
                </div>
                {aiInputMode==='topic'?(
                  <>
                    <textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} rows={3} style={{...inp,fontSize:14,resize:'none',lineHeight:1.8,marginBottom:10}} placeholder="مثال: أهم أخطاء تدمر التدفق النقدي للشركات الصغيرة..."/>
                    <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:14}}>
                      {['أهم ٥ أخطاء في التدفق النقدي','لماذا تفشل الشركات في المحاسبة','كيف تعرف أن شركتك تحتاج ERP'].map(p=>(
                        <div key={p} onClick={()=>setAiPrompt(p)} style={{background:'#222',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'5px 12px',fontSize:11,color:'#555',cursor:'pointer',fontFamily:"'Cairo',sans-serif"}}>{p.slice(0,22)}…</div>
                      ))}
                    </div>
                  </>
                ):aiInputMode==='manual'?(
                  <textarea value={aiManualText} onChange={e=>setAiManualText(e.target.value)} rows={6} style={{...inp,fontSize:13,resize:'none',lineHeight:1.8,marginBottom:14}} placeholder="الصق نصك هنا، AI سيحوّله لشرائح منسّقة..."/>
                ):(
                  /* FOUNDR MODE */
                  <div style={{marginBottom:14}}>
                    <div style={{background:'rgba(0,188,212,0.06)',border:'1px solid rgba(0,188,212,0.2)',borderRadius:10,padding:'10px 12px',marginBottom:10,direction:'rtl'}}>
                      <div style={{fontSize:11,color:'#00BCD4',fontWeight:800,marginBottom:4}}>📋 ترجمة Foundr → عربي</div>
                      <div style={{fontSize:11,color:'#555',lineHeight:1.7}}>الصق أي بوست من Foundr أو أي محتوى إنجليزي → AI يترجمه ويكيّفه بالعربي الخليجي لـ <span style={{color:(theme==='bizbay'||theme==='bizbay_light')?'#00BCD4':'#CC3333',fontWeight:800}}>{BRAND_META[theme].name}</span></div>
                    </div>
                    <textarea
                      value={foundrText}
                      onChange={e=>setFoundrText(e.target.value)}
                      rows={6}
                      style={{...inp,fontSize:13,resize:'none',lineHeight:1.8,marginBottom:10,direction:'ltr',textAlign:'left'}}
                      placeholder="Paste Foundr post here...&#10;&#10;e.g. 'The great idea is the easy part. Execution is everything. Most founders never start because they're waiting for the perfect moment.'"
                    />
                    <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                      {[
                        'The great idea is the easy part.',
                        'You only need one good product.',
                        'Stop guessing. Start building.',
                        'Growth requires looking stupid for a while.'
                      ].map(p=>(
                        <div key={p} onClick={()=>setFoundrText(p)} style={{background:'#1A1A1A',border:'1px solid rgba(0,188,212,0.15)',borderRadius:20,padding:'4px 10px',fontSize:10,color:'#555',cursor:'pointer',fontFamily:'monospace'}}>{p.slice(0,28)}…</div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  {aiPostMode==='carousel'
                    ?<div><div style={{fontSize:10,color:'#444',marginBottom:4}}>الشرائح</div><select value={aiNum} onChange={e=>setAiNum(e.target.value)} style={inp}>{[['4','٤'],['5','٥'],['6','٦'],['7','٧']].map(([v,l])=><option key={v} value={v}>{l} شرائح</option>)}</select></div>
                    :<div><div style={{fontSize:10,color:'#444',marginBottom:4}}>الشرائح</div><div style={{...inp,color:'#CC3333',fontWeight:800,fontSize:12,display:'flex',alignItems:'center',gap:6}}>📸 شريحة واحدة</div></div>
                  }
                  <div><div style={{fontSize:10,color:'#444',marginBottom:4}}>اللغة</div><select value={aiLang} onChange={e=>setAiLang(e.target.value)} style={inp}><option value="ar">🇸🇦 عربي</option><option value="en">🇬🇧 English</option></select></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
                  <div><div style={{fontSize:10,color:'#444',marginBottom:4}}>النوع</div><select value={aiType} onChange={e=>setAiType(e.target.value)} style={inp}>{[['hook','🔥 هوك'],['tips','💡 نصائح'],['warning','⚠️ تحذيرات'],['facts','📊 حقائق'],['steps','📋 خطوات'],['contrast','⚡ مقارنة'],['myths','❌ خرافات']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
                  <div><div style={{fontSize:10,color:'#444',marginBottom:4}}>الأسلوب</div><select value={aiTone} onChange={e=>setAiTone(e.target.value)} style={inp}>{[['bold','🔥 جريء'],['direct','⚡ مباشر'],['question','❓ أسئلة'],['expert','🎩 خبير']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={closeAi} style={{...btnD,flex:1,justifyContent:'center'}}>إلغاء</button>
                  <button onClick={startGeneration} disabled={chatLoading} style={{...btnR,flex:2,justifyContent:'center',opacity:chatLoading?.6:1,background:aiInputMode==='foundr'?'linear-gradient(135deg,#00BCD4,#0097A7)':'#CC3333'}}>
                    {chatLoading?<><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.2)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .6s linear infinite',display:'inline-block'}}/> يولّد…</>
                      :aiInputMode==='foundr'?'📋 ترجم وحوّل':'✦ عرض المقترح'}
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
                    <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&!chatLoading&&sendChat()} placeholder="اكتب تعديلك... أو type in English" style={{...inp,flex:1,fontSize:13}} disabled={chatLoading}/>
                    <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()} style={{...btnD,width:40,height:40,padding:0,justifyContent:'center',fontSize:18,opacity:(chatLoading||!chatInput.trim())?.4:1}}>↑</button>
                  </div>
                  <button onClick={()=>{setChatInput('تأكيد');setTimeout(sendChat,50)}} disabled={confirming||previewSlides.length===0}
                    style={{...btnR,width:'100%',justifyContent:'center',fontSize:14,padding:'13px',opacity:confirming?.6:1,background:'linear-gradient(135deg,#CC3333,#FF4444)',boxShadow:'0 4px 20px rgba(204,51,51,0.45)'}}>
                    {confirming?<><span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .6s linear infinite',display:'inline-block'}}/> جاري التحويل…</>:'✦ تأكيد — تحويل '+(aiPostMode==='post'?'لبوست بصري':'لكاروسيل بصري')}
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



      {/* AI BRANDING MODAL */}
      {brandingOpen && (
        <AiBrandingModal
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

      {biz4saleOpen && <Biz4SaleModal onClose={()=>setBiz4saleOpen(false)}/>}

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
