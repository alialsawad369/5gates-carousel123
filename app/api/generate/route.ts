import { NextRequest, NextResponse } from 'next/server'
import { isAuthed } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { prompt, numSlides = 5, lang = 'ar', type = 'hook', tone = 'bold' } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  const isAr = lang === 'ar'
  const typeMap: Record<string, string> = {
    hook:     isAr ? 'الشريحة الأولى هوك صادم يثير الفضول، باقي الشرائح تبني قيمة حقيقية' : 'First slide shocking hook, rest deliver real value',
    tips:     isAr ? 'نصائح عملية مرقمة قابلة للتطبيق فوراً' : 'numbered actionable tips',
    warning:  isAr ? 'تحذيرات وأخطاء شائعة بأسلوب صريح' : 'direct warnings and common mistakes',
    facts:    isAr ? 'حقائق مثيرة بأرقام ومعطيات محددة' : 'surprising facts with specific numbers',
    steps:    isAr ? 'خطوات تطبيقية واضحة مرقمة' : 'numbered clear actionable steps',
    contrast: isAr ? 'مقارنة صادمة بين نقيضين أو فكرتين' : 'shocking contrast between two opposites',
    myths:    isAr ? 'خرافات شائعة يهدمها الحقيقة' : 'common myths destroyed by facts',
  }
  const toneMap: Record<string, string> = {
    bold:     isAr ? 'جريء صادم. يتحدى المفاهيم المعتادة. يستخدم: "هذا خطأ"، "الحقيقة هي"، "أغلب الناس لا يعرف"' : 'bold, challenge assumptions',
    direct:   isAr ? 'مباشر مختصر. كلمات قليلة وقوية. بدون حشو' : 'direct, brief, powerful',
    question: isAr ? 'أسئلة تستفز التفكير. كل عنوان يبدأ بسؤال' : 'every headline is a provocative question',
    expert:   isAr ? 'خبير موثوق يشارك معرفة قيّمة بثقة عالية' : 'authoritative expert sharing high-value knowledge',
  }

  const system = `أنت كاتب محتوى لشركة 5GATES للاستشارات المالية والمحاسبية في البحرين.
شعار الشركة: "Where Strength is in Numbers"
خدماتنا: محاسبة، ضريبة القيمة المضافة، ERP، تقييم أعمال، رواتب، تدفق نقدي.

${isAr ? 'اكتب بالعربية الفصحى البسيطة. المفاتيح JSON بالإنجليزية.' : 'Write in clear English.'}
الأسلوب: ${toneMap[tone] || toneMap.bold}
نوع المحتوى: ${typeMap[type] || typeMap.hook}

قواعد الـ headline (مهمة جداً):
- استخدم **كلمة** لتمييز الكلمات المفتاحية (ستظهر بالأحمر)
- استخدم ***رقم*** لتمييز الأرقام والإحصاءات (ستظهر بالأصفر)
- العنوان قصير وصادم: 5-9 كلمات فقط
- أمثلة جيدة:
  "**أنت مشغول** لذلك **أنت فقير**"
  "لماذا ***٨٠٪*** من الشركات **تفشل** ماليًا"
  "**احذر** هذا الخطأ في **محاسبتك**"

الشريحة الأولى: هوك قوي يثير الفضول أو يخلق ألم فوري.
الشريحة الأخيرة: CTA واضح للتواصل مع 5GATES أو حجز استشارة.

أعد JSON array فقط. لا markdown. لا أي نص خارج الـ array.
كل object: { "headline": "...", "body": "...", "handle": "@5gates.bh" }`

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: `الموضوع: "${prompt}"\nعدد الشرائح: ${numSlides}\nJSON array فقط.` }],
    })
    const raw    = (msg.content[0] as any).text || ''
    const clean  = raw.replace(/```json\n?|```\n?/g, '').trim()
    const slides = JSON.parse(clean)
    return NextResponse.json({ slides })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
