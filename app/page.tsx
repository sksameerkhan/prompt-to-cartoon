'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [credits, setCredits] = useState(null);

  const [prompt, setPrompt] = useState('');
  const [scenes, setScenes] = useState([]);
  const [current, setCurrent] = useState(-1);
  const [status, setStatus] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) refreshCredits();
  }, [session]);

  async function refreshCredits() {
    const { data } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', session.user.id)
      .single();
    if (data) setCredits(data.credits);
  }

  async function sendMagicLink(e) {
    e.preventDefault();
    setStatus('Sending login link…');
    setStatusIsError(false);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setStatus(error.message);
      setStatusIsError(true);
    } else {
      setMagicLinkSent(true);
      setStatus('Check your email for the login link.');
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setScenes([]);
    setCurrent(-1);
  }

  async function generate() {
    if (!prompt.trim()) {
      setStatus('Write a story idea first.');
      setStatusIsError(true);
      return;
    }
    if (credits !== null && credits <= 0) {
      setStatus('No credits left — top up to keep generating.');
      setStatusIsError(true);
      return;
    }
    setBusy(true);
    setStatusIsError(false);
    setStatus('Writing the script and painting scenes… this takes a bit.');
    setScenes([]);
    setCurrent(-1);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, accessToken })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Something went wrong');

      setScenes(json.scenes);
      setCurrent(0);
      setCredits(json.creditsRemaining);
      setStatus('Ready — ' + (json.title || 'your cartoon') + '.');
    } catch (err) {
      setStatus(err.message);
      setStatusIsError(true);
    } finally {
      setBusy(false);
    }
  }

  function speak(text) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) return resolve();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.98;
      utter.onend = resolve;
      utter.onerror = resolve;
      window.speechSynthesis.speak(utter);
    });
  }

  async function play() {
    if (playingRef.current) {
      playingRef.current = false;
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    playingRef.current = true;
    setPlaying(true);
    const start = current >= 0 ? current : 0;
    for (let i = start; i < scenes.length; i++) {
      if (!playingRef.current) return;
      setCurrent(i);
      await speak(scenes[i].narration);
      if (!playingRef.current) return;
    }
    playingRef.current = false;
    setPlaying(false);
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  return (
    <div className="app">
      <div className="eyebrow">Prompt to Cartoon</div>
      <h1>STORY → <span>SCREEN</span></h1>
      <p className="sub">Type a story idea. It gets scripted into scenes, illustrated, and narrated.</p>

      {!session ? (
        <div className="card">
          {!magicLinkSent ? (
            <form onSubmit={sendMagicLink}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <button type="submit">Send login link</button>
            </form>
          ) : (
            <p>Check your email ({email}) and click the link to log in. You'll come straight back here.</p>
          )}
          {status && <div className={'status-line' + (statusIsError ? ' error' : '')}>{status}</div>}
        </div>
      ) : (
        <>
          <div className="card">
            <div className="row">
              <label style={{ margin: 0 }}>Story idea</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="credits-badge">{credits === null ? '…' : credits} credits</span>
                <button className="ghost" onClick={signOut} style={{ marginTop: 0, padding: '6px 12px' }}>
                  Sign out
                </button>
              </div>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A shy little cloud who is afraid to rain, until a thirsty garden needs her help"
            />
            <div className="row">
              <button onClick={generate} disabled={busy}>
                {busy ? 'Working…' : 'Generate cartoon'}
              </button>
            </div>
            {status && <div className={'status-line' + (statusIsError ? ' error' : '')}>{status}</div>}
            {credits === 0 && whatsappNumber && (
              <div className="status-line">
                Out of credits —{' '}
                <a
                  href={`https://wa.me/${whatsappNumber}?text=I'd%20like%20to%20top%20up%20my%20Prompt%20to%20Cartoon%20credits`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--amber)' }}
                >
                  message us on WhatsApp
                </a>{' '}
                to top up.
              </div>
            )}
          </div>

          {scenes.length > 0 && (
            <>
              <div className="screen">
                <img src={scenes[current]?.imageUrl} alt="" />
                <div className="caption">{scenes[current]?.narration}</div>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button onClick={play}>{playing ? 'Pause' : 'Play'}</button>
              </div>
              <div className="filmstrip">
                {scenes.map((s, i) => (
                  <div
                    key={i}
                    className={'frame' + (i === current ? ' current' : '')}
                    onClick={() => {
                      playingRef.current = false;
                      setPlaying(false);
                      setCurrent(i);
                    }}
                  >
                    <img src={s.imageUrl} alt="" />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
