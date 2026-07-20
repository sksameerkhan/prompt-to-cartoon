import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This route runs on the server, so it's safe to use the service role key here.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function writeScript(storyPrompt) {
  const system = `You are a visual director for short cartoons. Break the given story idea into exactly 5 scenes.
Respond with ONLY valid JSON, no markdown fences, no preamble, in exactly this shape:
{"title":"short title","scenes":[{"narration":"1-2 simple spoken sentences","image_prompt":"a vivid, self-contained, family-friendly visual description in a colorful flat-illustration cartoon style, including character and setting details since scenes don't share context"}]}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: system + '\n\nStory idea: ' + storyPrompt }] }]
      })
    }
  );

  if (!res.ok) throw new Error('Script generation failed (' + res.status + ')');
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed.scenes || !parsed.scenes.length) throw new Error('Script had no scenes');
  return parsed;
}

function imageUrlFor(imagePrompt, seed) {
  const styled = imagePrompt + ", vibrant children's cartoon illustration, flat colors, clean bold outlines";
  return (
    'https://image.pollinations.ai/prompt/' +
    encodeURIComponent(styled) +
    '?width=768&height=480&seed=' + seed + '&nologo=true'
  );
}

export async function POST(request) {
  try {
    const { prompt, accessToken } = await request.json();
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Story idea is required' }, { status: 400 });
    }
    if (!accessToken) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }

    // Identify the user from their access token
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Session expired, please log in again' }, { status: 401 });
    }
    const userId = userData.user.id;

    // Check credits
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Could not load account' }, { status: 500 });
    }
    if (profile.credits <= 0) {
      return NextResponse.json({ error: 'No credits left. Please top up.' }, { status: 402 });
    }

    // Generate
    const script = await writeScript(prompt);
    const scenes = script.scenes.map((s, i) => ({
      narration: s.narration,
      imageUrl: imageUrlFor(s.image_prompt, Date.now() + i)
    }));

    // Deduct one credit and save history (best-effort, doesn't block the response)
    await supabaseAdmin.from('profiles').update({ credits: profile.credits - 1 }).eq('id', userId);
    await supabaseAdmin.from('generations').insert({
      user_id: userId,
      title: script.title || 'Untitled',
      prompt,
      scenes
    });

    return NextResponse.json({ title: script.title, scenes, creditsRemaining: profile.credits - 1 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Something went wrong' }, { status: 500 });
  }
}
