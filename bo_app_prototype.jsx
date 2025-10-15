import React, { useEffect, useRef, useState } from "react";

// Bo_Chat_Web.jsx
// Full-page ChatGPT-style web prototype for "بو - Bo" (Light theme, Anime cat assistant)
// Features:
// - Chat UI (full page, like ChatGPT)
// - Anime avatar (SVG) with idle + speaking animations
// - Speech-to-text (Web Speech API) and Text-to-speech (SpeechSynthesis)
// - Local persistent memory (localStorage) for simple notes & tasks
// - Placeholder hooks for server-side LLM integration (/api/bo)
// - Light theme: white × soft-purple × gray

export default function BoChatWeb() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "صباح الورد يا لولتي 🌸 جاهز نبدأ يومنا ولا نعمل فنجان نسكافيه الأول؟ 😽☕" },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [notes, setNotes] = useState(() => JSON.parse(localStorage.getItem("bo_notes") || "[]"));
  const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem("bo_tasks") || "[]"));
  const [speaking, setSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  useEffect(() => localStorage.setItem("bo_notes", JSON.stringify(notes)), [notes]);
  useEffect(() => localStorage.setItem("bo_tasks", JSON.stringify(tasks)), [tasks]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.lang = "ar-EG";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      sendMessage(text);
    };
    r.onend = () => setListening(false);
    recognitionRef.current = r;
  }, []);

  function speak(text) {
    if (!window.speechSynthesis) return;
    setSpeaking(true);
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    let v = voices.find((x) => x.lang && x.lang.startsWith("ar"));
    if (!v) v = voices.find((x) => /female|woman|feminine/i.test(x.name));
    if (v) u.voice = v;
    u.rate = 1.0; u.pitch = 1.05;
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  async function sendMessage(text) {
    if (!text || !text.trim()) return;
    const userMsg = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    // Optimistic assistant reply while waiting for LLM
    setMessages((m) => [...m, { role: "assistant", text: "بو بتفكر... 😺" }]);

    try {
      // Replace '/api/bo' with your backend endpoint that proxies to OpenAI
      const res = await fetch("/api/bo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, memory: { notes, tasks } }),
      });
      const data = await res.json();
      const reply = data?.reply || "معليش، حصلت مشكلة بسيطة. جرب تاني.";

      // Remove last optimistic message and append real reply
      setMessages((m) => {
        const withoutOptimistic = m.slice(0, -1);
        return [...withoutOptimistic, { role: "assistant", text: reply }];
      });
      speak(reply);
    } catch (e) {
      // Fallback local rule-based reply
      const fallback = localFallbackReply(text);
      setMessages((m) => {
        const withoutOptimistic = m.slice(0, -1);
        return [...withoutOptimistic, { role: "assistant", text: fallback }];
      });
      speak(fallback);
    }
  }

  function localFallbackReply(t) {
    const low = t.toLowerCase();
    if (low.includes("ملاحظة") || low.includes("اكتبي")) {
      setNotes((n) => [t, ...n]);
      return "خلاص يا لولتي، كتبت الملاحظة عندي ❤️";
    }
    if (low.includes("ذكرني") || low.includes("فكّرني")) return "قولي المعاد اللي عايزني أفكرك فيه؟";
    if (low.includes("فكرة") || low.includes("بوست") || low.includes("اعلان")) return "عايزة بوست لنوع إيه؟ شغل ولا شخصي؟";
    return "حاضر يا لولتي! سأساعدك في اللي تطلبيه 💜";
  }

  function toggleListen() {
    if (!recognitionRef.current) return alert("الميكروفون غير متاح في المتصفح ده.");
    if (listening) recognitionRef.current.stop();
    else recognitionRef.current.start();
    setListening((s) => !s);
  }

  function addTask(text) {
    setTasks((t) => [{ id: Date.now(), text, done: false }, ...t]);
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 p-6 flex justify-center">
      <div className="w-full max-w-5xl shadow-lg rounded-2xl grid grid-cols-12 overflow-hidden">
        {/* Left panel: avatar + quick controls */}
        <aside className="col-span-4 bg-gradient-to-b from-white via-gray-50 to-purple-50 p-6">
          <div className="flex flex-col items-center">
            <div className={`w-40 h-40 rounded-full p-2 shadow-md bg-gradient-to-br from-gray-100 to-purple-100`}>
              {/* Anime cat avatar (animated) */}
              <svg viewBox="0 0 200 200" className={`w-full h-full ${speaking ? "animate-bounce" : ""}`}>
                <defs>
                  <linearGradient id="g1" x1="0" x2="1">
                    <stop offset="0%" stopColor="#e6e6e6" />
                    <stop offset="100%" stopColor="#c89de6" />
                  </linearGradient>
                </defs>
                <g transform="translate(100,100)">
                  <ellipse cx="0" cy="22" rx="64" ry="54" fill="url(#g1)" />
                  <g transform="translate(-22,-6)">
                    <ellipse cx="0" cy="0" rx="14" ry="22" fill="#fff" />
                    <circle cx="-2" cy="0" r="6" fill="#2c2c2c" />
                  </g>
                  <g transform="translate(22,-6)">
                    <ellipse cx="0" cy="0" rx="14" ry="22" fill="#fff" />
                    <circle cx="2" cy="0" r="6" fill="#2c2c2c" />
                  </g>
                  <path d="M -14 28 Q 0 36 14 28" stroke="#2c2c2c" strokeWidth="2" fill="none">
                    <animate attributeName="d" dur="1s" repeatCount="indefinite" values="M -14 28 Q 0 36 14 28; M -14 28 Q 0 32 14 28; M -14 28 Q 0 36 14 28" />
                  </path>
                  <polygon points="-44,-24 -68,-64 -22,-46" fill="#e6e6e6" />
                  <polygon points="44,-24 22,-46 68,-64" fill="#c89de6" />
                </g>
              </svg>
            </div>

            <h2 className="mt-4 text-2xl font-bold">بو — قطتك الذكية</h2>
            <p className="mt-2 text-sm text-gray-600 text-center">صوت ناعم، أنمي كيوت، بتدير يومك وتفكر معاك.</p>

            <div className="mt-4 w-full">
              <button
                onClick={() => {
                  const g = "صباح الورد يا لولتي 🌸 جاهز نبدأ يومنا ولا نعمل فنجان نسكافيه الأول؟ 😽☕";
                  setMessages((m) => [...m, { role: "assistant", text: g }]);
                  speak(g);
                }}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-700 text-white font-semibold shadow"
              >
                نادي بو (جربي صوتها)
              </button>

              <div className="mt-4 bg-white rounded-xl p-3 shadow-inner">
                <h3 className="font-semibold">ملاحظات</h3>
                <ul className="mt-2 text-sm text-gray-700 max-h-40 overflow-auto">
                  {notes.length === 0 && <li className="text-gray-400">مافيش ملاحظات لسه</li>}
                  {notes.map((n, i) => <li key={i} className="py-1 border-b last:border-b-0">{n}</li>)}
                </ul>
              </div>

              <div className="mt-4 bg-white rounded-xl p-3">
                <h3 className="font-semibold">مهام سريعة</h3>
                <input
                  placeholder="اكتب مهمة واضغط Enter"
                  className="w-full p-2 mt-2 rounded-md border"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.value.trim()) {
                      addTask(e.target.value.trim());
                      e.target.value = "";
                    }
                  }}
                />
                <ul className="mt-2">
                  {tasks.map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-1">
                      <label className={`flex-1 ${t.done ? "line-through text-gray-400" : ""}`}>{t.text}</label>
                      <input type="checkbox" checked={t.done} onChange={() => setTasks(tasks.map(x => x.id === t.id ? {...x, done: !x.done} : x))} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </aside>

        {/* Right: Chat area */}
        <main className="col-span-8 bg-white p-6 flex flex-col">
          <div className="flex-1 overflow-auto p-4 rounded-xl shadow-inner bg-gradient-to-b from-white to-purple-50">
            {messages.map((m, i) => (
              <div key={i} className={`mb-4 flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
                <div className={`${m.role === "assistant" ? "bg-purple-100 text-purple-900" : "bg-gray-100 text-gray-900"} px-4 py-3 rounded-2xl max-w-3/4`}> {m.text} </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={toggleListen} className={`px-4 py-2 rounded-full border ${listening ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"}`}>
              {listening ? "...بتسمع" : "اتكلمي (مايك)"}
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب أو اضغط مايك وتكلم لبو..."
              className="flex-1 p-3 rounded-xl border"
              onKeyDown={(e) => { if (e.key === "Enter") sendMessage(input); }}
            />

            <button onClick={() => sendMessage(input)} className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold">ارسل</button>
          </div>

          <div className="mt-2 text-xs text-gray-500">نسخة تجريبية. للردود الذكية فعليًا اربط نقطة النهاية <code>/api/bo</code> بسيرفرك لدخول OpenAI أو أي LLM.</div>
        </main>
      </div>
    </div>
  );
}

/* Deployment & Next Steps (short):

1) Put this component in a React app (Vite or CRA). Use Tailwind or convert classes to plain CSS.
2) Backend: create /api/bo that accepts { message, memory } and calls OpenAI's API (with system prompt describing Bo's persona).
3) Persona prompt example (server-side):
   - System: "You are 'Bo' — an affectionate anime cat assistant who speaks Egyptian Arabic casually. You call the user 'لولتي' and are helpful, upbeat, and concise. Remember notes and tasks sent in memory."
4) For voice TTS upgrade: integrate ElevenLabs or similar for higher-quality Arabic female voice, or use Web Speech as fallback.
5) Host frontend on Vercel/Netlify and backend on Vercel functions/Render/Heroku.

Security: secure API keys on the server, and authenticate users if storing private notes in DB.
*/
