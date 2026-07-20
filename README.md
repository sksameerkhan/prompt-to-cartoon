# Prompt to Cartoon — Apna Software Publish Karne Ki Guide

Ye ek chota SaaS hai: user story likhta hai, login karta hai, aur app usay
5-scene narrated cartoon bana ke deta hai. Har login-user ko 3 free credits
milte hain, phir top-up WhatsApp se manual hota hai.

Sab kuch **free tier** pe chalta hai jab tak aapke paas users na aayein.

---

## Cheezein jo chahiye (sab free)

1. **Supabase account** — https://supabase.com (login/database ke liye)
2. **Google AI Studio API key** — https://aistudio.google.com/app/apikey (free, story likhne ke liye)
3. **Vercel account** — https://vercel.com (hosting ke liye, GitHub se login karein)
4. **GitHub account** — code yahan rakhna hoga taake Vercel usay deploy kar sake

---

## Step 1 — Supabase setup

1. supabase.com pe naya project banayein.
2. Project ke andar **SQL Editor** kholein, `supabase/schema.sql` file ka
   pura content paste karein, aur **Run** dabayein. Ye 2 tables banayega:
   `profiles` (credits track karne ke liye) aur `generations` (history).
3. **Project Settings → API** mein jaayein, ye 3 cheezein copy kar lein:
   - Project URL
   - `anon` `public` key
   - `service_role` key (ye secret hai, kisi ko na dein)
4. **Authentication → Providers** mein "Email" provider on hona chahiye
   (default on hota hai). Ye "magic link" login ke liye chahiye — user
   password nahi banata, sirf email pe link aata hai.

## Step 2 — Gemini API key

1. https://aistudio.google.com/app/apikey pe jaayein, Google account se login.
2. "Create API key" dabayein, key copy kar lein. Free tier mein roz ka
   limit hai lekin shuruaat ke liye kaafi hai.

## Step 3 — Code apne computer/GitHub pe le jaayein

1. Ye poora folder (`prompt-to-cartoon`) GitHub pe ek naye repository mein
   upload kar dein.
2. `.env.example` ko copy kar ke `.env.local` naam ki file banayein, aur
   Step 1 & 2 se mili sab keys usme daal dein. **`.env.local` ko kabhi
   GitHub pe upload na karein** — ye secret hai.

## Step 4 — Vercel pe deploy

1. vercel.com pe GitHub se login karein.
2. "Add New Project" → apna GitHub repo select karein.
3. Deploy karne se pehle "Environment Variables" section mein wahi saari
   keys daal dein jo `.env.local` mein hain.
4. "Deploy" dabayein. 2-3 minute mein aapka app live ho jayega, ek link
   milegi jaise `your-app.vercel.app`.

## Step 5 — Test karein

1. Apni live link kholein, apni email se login karein (magic link).
2. Email mein link click karein, wapas app pe aa jayenge, logged in.
3. Story likhein, "Generate cartoon" dabayein.

---

## Credits/payment ka tareeqa (abhi ke liye manual)

Jab kisi user ke credits khatam hote hain, app unhe WhatsApp number pe
message karne ka button dikhata hai (`NEXT_PUBLIC_WHATSAPP_NUMBER` env
variable mein apna number daalein, jaise `923001234567`).

User JazzCash/Easypaisa se payment karega, screenshot WhatsApp pe bhejega,
aap Supabase dashboard mein jaa kar (`Table Editor → profiles`) manually
uske `credits` number badha dein. Jab volume badh jaye, isay automate
karwa lenge (JazzCash API ya Stripe).

---

## Aage kya karna hai (jab thora revenue aa jaye)

- Story quality behtar karne ke liye Gemini ki jagah Claude API use karein
- Images ke liye paid model (behtar quality, no watermark risk)
- Real awaz ke liye ElevenLabs jaisa TTS
- Asli MP4 download ke liye ek backend render step (ffmpeg) — jaisa pehle
  ffmpeg wala kaam kiya tha
- Payment automate karna (JazzCash Merchant API ya Stripe)

Jab is MVP ko live users try kar lein aur aapko lage ye chalega, mujhe
bata dein — hum agla step (real video export + auto-payment) bana lenge.
