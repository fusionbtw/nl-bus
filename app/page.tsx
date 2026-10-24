"use client";

import { useEffect, useRef, useState } from "react";

const TABS = ["mapa", "linhas", "favoritos"] as const;
type Tab = (typeof TABS)[number];

const IG_PROFILE = "https://instagram.com/mobilidade.nlbus";
const IG_DM = "https://ig.me/m/mobilidade.nlbus";

/* linhas reais do transporte municipal de Nova Lima (fonte: Prefeitura), operação Via Ouro */
const MAP_ROUTES = [
  { num: "011", name: "Alphaville ↔ Nova Lima (Centro)", path: "M40 260 C80 240 60 190 120 180 S200 140 230 90", eta: "6 min", next: "38 min", stops: ["Centro", "Alphaville"] },
  { num: "014", name: "Água Limpa ↔ Jardim Canadá", path: "M60 110 C90 160 160 200 210 250", eta: "9 min", next: "42 min", stops: ["Água Limpa", "Jardim Canadá"] },
];
const OTHER_LINES = [
  { num: "001", name: "Honório Bicalho" },
  { num: "002", name: "Bela Fama" },
  { num: "004", name: "Água Limpa / Nova Lima" },
  { num: "006", name: "Mingu" },
  { num: "010", name: "Nossa Senhora de Fátima" },
  { num: "012", name: "Fiat Biocor" },
  { num: "016", name: "Jardim Petrópolis / Macacos" },
  { num: "017", name: "Macacos / Jardim Canadá" },
];
const PINS = [
  { name: "Centro", x: 40, y: 260, anchor: "start" as const },
  { name: "Alphaville", x: 230, y: 90, anchor: "end" as const },
  { name: "Água Limpa", x: 60, y: 110, anchor: "start" as const },
  { name: "Jardim Canadá", x: 210, y: 250, anchor: "end" as const },
];

type Fav = { id: number; num: string; stop: string | null; alerts: boolean };

const INIT_FAVS: Fav[] = [
  { id: 0, num: "011", stop: null, alerts: true },
  { id: 1, num: "014", stop: null, alerts: true },
];

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "O que é o NL Bus?",
    a: "É uma plataforma inteligente que conecta passageiros ao transporte público, reunindo rotas, horários, localização dos ônibus em tempo real, alertas de chegada e muito mais.",
  },
  {
    q: "Quem está por trás do projeto?",
    a: "Quatro jovens: Pedro Costa, Yago, Sarah e Ana. Acreditamos no poder da inovação para solucionar desafios reais da sociedade, começando pela nossa cidade.",
  },
  {
    q: "O aplicativo já está disponível?",
    a: "Ainda não. O projeto está em construção: o protótipo navegável aqui no site simula a experiência planejada. Quando houver novidades sobre lançamento, publicamos primeiro no Instagram @mobilidade.nlbus.",
  },
  {
    q: "Como funciona o rastreamento em tempo real?",
    a: 'Os ônibus compartilham sua posição e o app mostra, minutos antes, quanto tempo falta até eles chegarem ao seu ponto, como o aviso "chegando em 6 minutos" do protótipo.',
  },
  {
    q: "O que é o totem de autoatendimento?",
    a: "É a mesma experiência da plataforma, instalada fisicamente nos pontos de ônibus: tela sensível ao toque com mapa, linhas e favoritos, e impressão no pedestal. As medidas do equipamento de referência estão na seção do Totem.",
  },
  {
    q: "Como a cidade ou parceiros podem apoiar?",
    a: "Empresas, concessionárias e a prefeitura podem conversar com o time para apoiar na evolução da plataforma. O canal oficial é o Instagram @mobilidade.nlbus: a caixa de mensagens está aberta.",
  },
];

type FormFeedback = { kind: "ok" | "err"; text: string };

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("mapa");
  const [animOn, setAnimOn] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; src: string }[]>([]);
  const [routeIdx, setRouteIdx] = useState(0);
  const [stop, setStop] = useState<string | null>(null);
  const active = MAP_ROUTES[routeIdx];
  const [clock, setClock] = useState("9:41");
  const [year, setYear] = useState("2026");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showMais, setShowMais] = useState(false);
  const [favs, setFavs] = useState<Fav[]>(INIT_FAVS);

  const sceneRef = useRef<HTMLDivElement>(null);
  const totemRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const motionOff = useRef(false);
  const rippleId = useRef(0);

  const nameRef = useRef<HTMLInputElement>(null);
  const goalRef = useRef<HTMLSelectElement>(null);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const favId = useRef(1);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const off =
      reduced ||
      new URLSearchParams(window.location.search).get("motion") === "off";
    if (off) document.documentElement.setAttribute("data-motion", "off");
    motionOff.current = off;
    setAnimOn(!off);

    setYear(String(new Date().getFullYear()));

    const tick = () => {
      const d = new Date();
      setClock(d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"));
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  /* foco automático no campo de busca quando abre */
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  /* vídeo de fundo: roda só quando o movimento está permitido */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    if (animOn) {
      v.play().catch(() => {
        /* autoplay bloqueado pelo navegador: o fundo fica estático no quadro atual */
      });
    } else {
      v.pause();
    }
  }, [animOn]);

  /* tilt + reflexo do totem (respeita motion off; funciona no toque também) */
  function handlePointer(e: React.PointerEvent) {
    if (motionOff.current) return;
    const scene = sceneRef.current;
    const totem = totemRef.current;
    if (!scene || !totem) return;
    const r = scene.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    totem.style.transform = "rotateY(" + x * 6 + "deg) rotateX(" + -y * 4 + "deg)";
    scene.style.setProperty("--sx", (((x + 0.5) * 100).toFixed(1)) + "%");
    scene.style.setProperty("--sy", (((y + 0.5) * 100).toFixed(1)) + "%");
  }
  function resetTilt() {
    if (totemRef.current) totemRef.current.style.transform = "";
  }

  /* toque na tela gera ondinha, marcada por dispositivo */
  function handleTap(e: React.PointerEvent<HTMLDivElement>, src: string) {
    if (motionOff.current) return;
    const box = e.currentTarget.getBoundingClientRect();
    const id = ++rippleId.current;
    setRipples((rs) => [
      ...rs,
      { id, x: e.clientX - box.left, y: e.clientY - box.top, src },
    ]);
    setTimeout(() => {
      setRipples((rs) => rs.filter((r2) => r2.id !== id));
    }, 700);
  }

  /* navegação de abas por teclado */
  function onTabKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const cur = TABS.indexOf(activeTab);
    const dir = e.key === "ArrowRight" ? 1 : TABS.length - 1;
    setActiveTab(TABS[(cur + dir) % TABS.length]);
  }

  /* busca: pontos e linhas que batem com o termo, sem inventar dados */
  function norm(s: string) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  const results = PINS
    .map((p) => {
      const serving = MAP_ROUTES.filter((r) => r.stops.includes(p.name));
      const q = norm(query.trim());
      const hit =
        !q ||
        norm(p.name).includes(q) ||
        serving.some((r) => norm(r.num + " " + r.name).includes(q));
      return { pin: p, serving, hit };
    })
    .filter((x) => x.hit);

  function pickStop(stopName: string, routes: { num: string }[]) {
    const idx = MAP_ROUTES.findIndex((r) => r.num === routes[0]?.num);
    if (idx < 0) return;
    setRouteIdx(idx);
    setStop(stopName);
    setShowMais(false);
    setSearchOpen(false);
    setQuery("");
    setActiveTab("mapa");
  }

  function openSearch() {
    setShowMais(false);
    setQuery("");
    setSearchOpen(true);
  }
  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  function toggleAlert(id: number) {
    setFavs((fs) => fs.map((f) => (f.id === id ? { ...f, alerts: !f.alerts } : f)));
  }
  function removeFav(id: number) {
    setFavs((fs) => fs.filter((f) => f.id !== id));
  }
  function openFav(f: Fav) {
    const idx = MAP_ROUTES.findIndex(
      (r) => r.num === f.num && (f.stop === null || r.stops.includes(f.stop))
    );
    if (idx < 0) return;
    setRouteIdx(idx);
    setStop(f.stop);
    setShowMais(false);
    setActiveTab("mapa");
  }
  const isSaved = favs.some(
    (f) => f.num === active.num && (f.stop ?? null) === (stop ?? null)
  );
  function toggleSave() {
    if (isSaved) {
      setFavs((fs) =>
        fs.filter((f) => !(f.num === active.num && (f.stop ?? null) === (stop ?? null)))
      );
      return;
    }
    setFavs((fs) => [...fs, { id: ++favId.current, num: active.num, stop, alerts: true }]);
  }
  function resetDemo() {
    setRouteIdx(0);
    setStop(null);
    setQuery("");
    setActiveTab("mapa");
    setFavs(INIT_FAVS);
    setShowMais(false);
  }
  function goTab(tab: Tab, clearStop: boolean) {
    setShowMais(false);
    setSearchOpen(false);
    if (clearStop) setStop(null);
    setActiveTab(tab);
  }

  /* formulário: copia a mensagem e abre o Direct do Instagram */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = nameRef.current?.value.trim() ?? "";
    const goal = goalRef.current?.value ?? "";
    const msg = msgRef.current?.value.trim() ?? "";

    if (!name || !msg) {
      setFeedback({ kind: "err", text: "Preencha seu nome e a mensagem para enviar." });
      return;
    }

    const text = "Olá, NL Bus!\n\nMeu nome é " + name + ".\nQuero: " + goal + ".\n\n" + msg;

    const done = () =>
      setFeedback({
        kind: "ok",
        text: "Mensagem copiada! Agora cola no Direct do @mobilidade.nlbus que abri pra você.",
      });

    const fallback = (t: string) => {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* clipboard indisponível, segue com a mensagem aberta */
      }
      document.body.removeChild(ta);
      done();
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallback(text));
    } else {
      fallback(text);
    }

    setTimeout(() => {
      const win = window.open(IG_DM, "_blank", "noopener");
      if (!win) window.location.href = IG_DM;
    }, 500);
  }

  return (
    <>
      <header>
        <div className="wrap nav">
          <a className="logo" href="#inicio" aria-label="NL Bus, início">
            <span className="badge" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.6a6.7 6.7 0 016.7 6.7c0 4.6-5 9.4-6.35 10.55a.55.55 0 01-.7 0C10.3 18.7 5.3 13.9 5.3 9.3A6.7 6.7 0 0112 2.6z" fill="#0FA3B0" />
                <rect x="8.7" y="7.1" width="6.6" height="6.2" rx="1.8" fill="#fff" />
                <rect x="9.9" y="8.2" width="4.2" height="2.8" rx="0.9" fill="#0E5E75" />
                <circle cx="10.3" cy="12" r="0.8" fill="#0E5E75" />
                <circle cx="13.7" cy="12" r="0.8" fill="#0E5E75" />
              </svg>
            </span>
            NL&nbsp;Bus
          </a>
          <nav className="nav-links" aria-label="Navegação principal">
            <a href="#sobre">Sobre</a>
            <a href="#o-app">O aplicativo</a>
            <a href="#totem">Totem</a>
            <a href="#projeto">O projeto</a>
            <a href="#faq">FAQ</a>
          </nav>
          <a className="btn btn-primary" href="#contato">Falar com o time</a>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="hero" id="inicio" aria-label="Apresentação">
        <video ref={videoRef} className="hero-video" src="/hero-drone.mp4" muted loop playsInline autoPlay preload="auto" aria-hidden="true" />
        <div className="wrap hero-grid">
          <div>
            <span className="status">
              <span className="dot" aria-hidden="true" /> Projeto em andamento · Nova Lima, MG
            </span>
            <h1>
              Conectando Nova Lima em <em className="serif">tempo real</em>.
            </h1>
            <p className="lead">
              O <strong>NL Bus</strong> é uma plataforma inteligente que conecta passageiros ao transporte público: rotas, horários, localização dos ônibus em tempo real e alertas de chegada, nascida de quatro jovens que acreditam na inovação para resolver desafios reais da sociedade.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#contato">
                Apoiar ou investir
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>
              <a className="btn btn-ghost" href="#o-app">Conhecer a plataforma</a>
            </div>
            <a className="tag-note" href={IG_PROFILE} target="_blank" rel="noopener">@mobilidade.nlbus: acompanhe o projeto no Instagram</a>
          </div>

          {/* TELA INTERATIVA NO TABLET */}
          <div className="totem-stage" id="totem">
            <div className="totem-scene" ref={sceneRef} onPointerMove={handlePointer} onPointerLeave={resetTilt}>
              <div className="totem-float">
              <div className="totem" ref={totemRef}>
                <div className="tablet">
                  <span className="tablet-cam" aria-hidden="true" />
                <div className="screen">
                  <div className="screen-inner" role="group" aria-label="Aplicativo do NL Bus simulado no tablet" onPointerDown={(e) => handleTap(e, "totem")}>
                    <span key="cam" className="cam-dot" aria-hidden="true" />
                    <div key="app-top" className="app-top">
                      <button type="button" className="search" onClick={openSearch}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8FB3C6" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                        {stop ? "Ir para outro ponto" : "Para onde você vai?"}
                      </button>
                      <div className="row">
                        <strong className="app-brand">NL&nbsp;Bus</strong>
                        <span style={{ fontSize: 10, color: "#8FB3C6" }}>Nova&nbsp;Lima&nbsp;·&nbsp;{clock}</span>
                      </div>
                    </div>

                    <div key="app-tabs" className="app-tabs" role="tablist" aria-label="Seções do app" onKeyDown={onTabKey}>
                      {TABS.map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          role="tab"
                          aria-selected={activeTab === tab}
                          data-panel={tab}
                          onClick={() => setActiveTab(tab)}
                        >
                          {tab === "mapa" ? "Mapa" : tab === "linhas" ? "Linhas" : "Favoritos"}
                        </button>
                      ))}
                    </div>

                    <div key="app-body" className="app-body">
                      {/* MAPA */}
                      <div className="panel" data-panel="mapa" role="tabpanel" hidden={activeTab !== "mapa"}>
                        <div className="route-map" aria-hidden="true">
                          <svg viewBox="0 0 280 380" preserveAspectRatio="xMidYMid slice">
                            <rect width="280" height="380" fill="#EFF7F8" />
                            <g stroke="#D8E7EA" strokeWidth="5" fill="none">
                              <path d="M0 90 H280" /><path d="M0 200 H280" /><path d="M0 300 H280" />
                              <path d="M70 0 V380" /><path d="M160 0 V380" /><path d="M240 0 V380" />
                            </g>
                            <rect x="100" y="55" width="52" height="30" rx="6" fill="#DBEBEE" />
                            <rect x="30" y="185" width="60" height="40" rx="6" fill="#DBEBEE" />
                            {/* rotas: ativa em destaque, alternativa tracejada */}
                            {MAP_ROUTES.map((r, i) => (
                              <path key={r.num} d={r.path} fill="none" strokeLinecap="round"
                                stroke={i === routeIdx ? "#22C7D6" : "#AFC9CE"}
                                strokeWidth={i === routeIdx ? 4.5 : 3}
                                strokeDasharray={i === routeIdx ? undefined : "6 6"} />
                            ))}
                            {/* ônibus percorrendo a rota ativa em tempo real */}
                            {animOn && (
                              <g key={active.num}>
                                <circle r="5.5" fill="#0A2033">
                                  <animateMotion dur="6s" repeatCount="indefinite" path={active.path} />
                                </circle>
                                <circle r="2.4" fill="#fff" cy="-1.8">
                                  <animateMotion dur="6s" repeatCount="indefinite" path={active.path} />
                                </circle>
                              </g>
                            )}
                            {/* pontos de ônibus tocáveis */}
                            {PINS.map((p) => {
                              const onRoute = active.stops.includes(p.name);
                              return (
                                <g key={p.name} role="button" tabIndex={0} aria-pressed={stop === p.name}
                                  style={{ cursor: "pointer" }}
                                  onClick={() => setStop(p.name)}
                                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStop(p.name); } }}>
                                  {stop === p.name && <circle cx={p.x} cy={p.y} r="11" fill="none" stroke="#FFB547" strokeWidth="2" />}
                                  <circle cx={p.x} cy={p.y} r="6" fill={onRoute ? "#0FA3B0" : "#9FB9C2"} stroke="#fff" strokeWidth="1.5" />
                                  <text x={p.anchor === "end" ? p.x - 9 : p.x + 9} y={p.y + 3} fontSize="8" fontWeight="600"
                                    textAnchor={p.anchor} fill="#41626F">{p.name}</text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                        <span className="arriving">
                          <span className="dot" aria-hidden="true" /> Ônibus chegando em <b style={{ color: "#22C7D6", marginLeft: 3 }}>{active.eta}</b>
                        </span>
                        <div className="route-card">
                          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                            {MAP_ROUTES.map((r, i) => (
                              <button key={r.num} type="button" className={i === routeIdx ? "chip chip-on" : "chip"}
                                aria-pressed={i === routeIdx}
                                onClick={() => { setRouteIdx(i); setStop(null); }}>
                                {r.num}
                              </button>
                            ))}
                            <span style={{ marginLeft: "auto", fontSize: 9.5, color: "#5C7A88", alignSelf: "center" }}>operação Via Ouro</span>
                          </div>
                          <div className="lc">
                            <span className="num">{active.num}</span>
                            <span className="pl">{active.name}</span>
                            <button type="button" className="save-btn" aria-pressed={isSaved} onClick={toggleSave}>
                              {isSaved ? "Salvo" : "Salvar"}
                            </button>
                          </div>
                          {stop ? (
                            active.stops.includes(stop) ? (
                              <div className="eta"><b>{active.eta}</b> até o ponto {stop}</div>
                            ) : (
                              <div className="eta">A linha {active.num} não passa por {stop}. Toque na rota {MAP_ROUTES[1 - routeIdx].num}.</div>
                            )
                          ) : (
                            <div className="eta"><b>{active.eta}</b> chegando · próximo <b style={{ color: "#EAF4F8" }}>{active.next}</b> seguinte</div>
                          )}
                        </div>
                      </div>

                      {/* LINHAS */}
                      <div className="panel" data-panel="linhas" role="tabpanel" hidden={activeTab !== "linhas"} style={{ overflowY: "auto" }}>
                        {MAP_ROUTES.map((r) => (
                          <button key={r.num} className="line-row" type="button"
                            onClick={() => { setRouteIdx(MAP_ROUTES.indexOf(r)); setStop(null); setActiveTab("mapa"); }}>
                            <span className="num">{r.num}</span>
                            <span className="info"><b>{r.name}</b><span>No mapa</span></span>
                            <span className="min">{r.eta}<small>chegando</small></span>
                          </button>
                        ))}
                        {OTHER_LINES.map((l) => (
                          <div key={l.num} className="line-row" style={{ cursor: "default" }}>
                            <span className="num">{l.num}</span>
                            <span className="info"><b>{l.name}</b><span>Em mapeamento</span></span>
                          </div>
                        ))}
                        <div className="route-card" style={{ left: 0, right: 0, bottom: 0, background: "#fff", border: "1px solid #E2ECEF", position: "static" }}>
                          <p style={{ fontSize: 10.5, color: "#5C7A88", lineHeight: 1.5 }}>
                            Protótipo com linhas reais do transporte municipal de Nova Lima (fonte: Prefeitura), operação Via Ouro. Tempos apenas ilustrativos.
                          </p>
                        </div>
                      </div>

                      {/* FAVORITOS */}
                      <div className="panel" data-panel="favoritos" role="tabpanel" hidden={activeTab !== "favoritos"}>
                        {favs.map((f) => {
                          const meta = MAP_ROUTES.find((r) => r.num === f.num);
                          const label = f.stop ? "Ponto " + f.stop : meta ? meta.name : "Linha " + f.num;
                          return (
                            <div className="fav-row" key={f.id}>
                              <button type="button" className="fav-main" onClick={() => openFav(f)} aria-label={"Abrir " + label + " no mapa"}>
                                <span className="num">{f.num}</span>
                                <span><b>{label}</b><span>{f.alerts ? "Alerta de chegada ativo" : "Alerta desativado"}</span></span>
                              </button>
                              <button type="button" className={f.alerts ? "bell" : "bell bell-off"} aria-pressed={f.alerts}
                                aria-label={(f.alerts ? "Desativar" : "Ativar") + " alerta de chegada da linha " + f.num}
                                onClick={() => toggleAlert(f.id)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 22a2.5 2.5 0 002.45-2h-4.9A2.5 2.5 0 0012 22zM12 3a6 6 0 00-6 6v4l-1.6 2.6a1 1 0 00.86 1.5h13.48a1 1 0 00.86-1.5L18 13V9a6 6 0 00-6-6z" /></svg>
                              </button>
                              <button type="button" className="fav-x" aria-label={"Remover " + label + " dos favoritos"} onClick={() => removeFav(f.id)}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                              </button>
                            </div>
                          );
                        })}
                        {favs.length === 0 && (
                          <div className="fav-empty">Nenhum favorito ainda. Toque em Salvar no mapa para guardar aqui.</div>
                        )}
                        <div className="route-card" style={{ left: 0, right: 0, bottom: 0, background: "#fff", border: "1px solid #E2ECEF" }}>
                          <p style={{ fontSize: 10.5, color: "#5C7A88", lineHeight: 1.5 }}>
                            Toque em Salvar no mapa para guardar linhas e pontos aqui, e ative o alerta de chegada.
                          </p>
                        </div>
                      </div>

                      {/* BUSCA */}
                      <div key="s-pop" className="search-pop" role="dialog" aria-label="Buscar ponto ou linha" hidden={!searchOpen}>
                        <div className="sp-head">
                          <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ponto ou linha, ex: Centro ou 011" aria-label="Buscar ponto ou linha" />
                          <button type="button" onClick={closeSearch} aria-label="Fechar busca">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                          </button>
                        </div>
                        <div className="sp-results">
                          {results.map(({ pin, serving }) => (
                            <button key={pin.name} type="button" className="sp-row" onClick={() => pickStop(pin.name, serving)}>
                              <span className="num">{serving.map((r) => r.num).join(" ")}</span>
                              <span><b>{pin.name}</b><span>{serving.map((r) => "Linha " + r.num).join(", ")}</span></span>
                            </button>
                          ))}
                          {results.length === 0 && (
                            <p className="sp-none">Nada encontrado para "{query}". Tente Centro, Alphaville, Água Limpa ou Jardim Canadá.</p>
                          )}
                        </div>
                      </div>

                      {/* MAIS */}
                      <div key="m-pop" className="mais-pop" role="dialog" aria-label="Mais opções do app" hidden={!showMais}>
                        <div className="mp-head">
                          <span>Mais opções</span>
                          <button type="button" onClick={() => setShowMais(false)} aria-label="Fechar">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                          </button>
                        </div>
                        <div className="mais-actions">
                          <button type="button" className="mais-btn" onClick={resetDemo}>
                            <span>Reiniciar demonstração</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
                          </button>
                          <a className="mais-btn" href={IG_DM} target="_blank" rel="noopener">
                            <span>Falar com o time</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
                          </a>
                        </div>
                        <p className="mais-note">
                          Demonstração fictícia para navegação. Linhas reais do transporte municipal de Nova Lima (fonte: Prefeitura), operação Via Ouro. Tempos apenas ilustrativos.
                        </p>
                      </div>
                    </div>

                    <div key="app-bottom" className="app-bottom" role="navigation" aria-label="Barra inferior do app">
                      <button type="button" data-active={activeTab === "mapa" && !showMais && !stop ? "" : undefined} onClick={() => goTab("mapa", true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 11l9-8 9 8v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" /></svg>Início
                      </button>
                      <button type="button" data-active={activeTab === "mapa" && !showMais ? "" : undefined} onClick={() => goTab("mapa", false)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="10" r="3" /><path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z" /></svg>Mapa
                      </button>
                      <button type="button" data-active={activeTab === "linhas" && !showMais ? "" : undefined} onClick={() => goTab("linhas", false)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="16" height="13" rx="3" /><path d="M8.5 18.5h7" /></svg>Linhas
                      </button>
                      <button type="button" data-active={activeTab === "favoritos" && !showMais ? "" : undefined} onClick={() => goTab("favoritos", false)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 21s-7-4.6-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.4-9.5 9-9.5 9z" /></svg>Favoritos
                      </button>
                      <button type="button" data-active={showMais ? "" : undefined} onClick={() => { setSearchOpen(false); setShowMais(!showMais); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="12" cy="18" r="2" /><path d="M7.5 7.5l3 8M16.5 7.5l-3 8" /></svg>Mais
                      </button>
                    </div>
                    {ripples.filter((r) => r.src === "totem").map((r) => (
                      <span key={r.id} className="screen-ripple" style={{ left: r.x, top: r.y }} />
                    ))}
                  </div>
                </div>
                </div>
              </div>
              </div>
            </div>
            <span className="tag-note"><span className="hl">Toque na tela</span> e navegue pelo app · Rotas do transporte municipal de Nova Lima, operado em conjunto com a Via Ouro</span>          </div>
        </div>

        <div className="wrap">
          <div className="facts" role="list" aria-label="Dados do projeto">
            <div role="listitem"><strong>4 jovens fundadores</strong><span>Pedro Costa, Yago, Sarah e Ana, a equipe idealizadora.</span></div>
            <div role="listitem"><strong>5 recursos essenciais</strong><span>Rastreamento, horários, ponto mais próximo, alertas e rotas.</span></div>
            <div role="listitem"><strong>Começando por Nova Lima</strong><span>Futuramente, levar esta visão a outras cidades.</span></div>
          </div>
        </div>
      </section>

      {/* ============ PROVA RÁPIDA ============ */}
      <section id="destaques" aria-label="Destaques">
        <div className="wrap">
          <span className="kicker">Destaques</span>
          <h2>O que já está em <em className="serif">movimento</em>.</h2>
          <div className="trio">
            <article>
              <span className="pill">Feito</span>
              <h3>Primeiros encontros com a comunidade</h3>
              <p>Escutamos ativamente quem usa o ônibus todo dia e recebemos respostas positivas para transformar a mobilidade de Nova Lima.</p>
              <span className="go">Detalhes no Instagram <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
            </article>
            <article>
              <span className="pill">Feito</span>
              <h3>Apresentação à Via Ouro e ao Pedro Dornas</h3>
              <p>Apresentamos a ideia, trocamos experiência e recebemos contribuições extremamente positivas: nossa proposta foi acolhida com entusiasmo e incentivo.</p>
              <a className="go" href="#projeto">Ver o processo <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg></a>
            </article>
            <article>
              <span className="pill">Agora</span>
              <h3>Protótipo do aplicativo e do totem</h3>
              <p>A plataforma está em construção: rastreamento em tempo real, horários atualizados e o totem de autoatendimento para os pontos de ônibus.</p>
              <a className="go" href="#totem">Testar o protótipo <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg></a>
            </article>
          </div>
        </div>
      </section>

      {/* ============ SOBRE ============ */}
      <section id="sobre" aria-label="Sobre o projeto">
        <div className="wrap about-grid">
          <div>
            <span className="kicker">Sobre o projeto</span>
            <h2>Nascemos para transformar a mobilidade de <em className="serif">Nova Lima</em>.</h2>
            <p className="lead">
              E se a tecnologia pudesse transformar a maneira como nos movimentamos pela nossa cidade? Foi com essa visão que nasceu o NL Bus, um projeto desenvolvido por quatro jovens que acreditam no poder da inovação para solucionar desafios reais da sociedade.
            </p>
            <p className="lead" style={{ marginTop: 16 }}>
              Nos primeiros encontros, recebemos respostas muito positivas e seguimos ainda mais motivados. Este é um trabalho em conjunto com a <strong className="t-strong">Via Ouro</strong>, empresa que opera o transporte coletivo de Nova Lima, e com o apoio do <strong className="t-strong">Pedro Dornas</strong>, parceiros que acreditam em um futuro melhor.
            </p>
            <p className="blockquote">Tecnologia a favor de pessoas reais. A mesma cidade, novas possibilidades.</p>
          </div>
          <div>
            <span className="kicker">Nossa equipe</span>
            <h3 style={{ fontSize: 24, marginBottom: 6 }}>Ideias, tecnologia e propósito.</h3>
            <ul className="team-list">
              <li><b>Pedro Costa</b><span>Cofundador, produto e tecnologia</span></li>
              <li><b>Yago</b><span>Cofundador, produto e tecnologia</span></li>
              <li><b>Sarah</b><span>Cofundadora, produto e tecnologia</span></li>
              <li><b>Ana</b><span>Cofundadora, produto e tecnologia</span></li>
            </ul>
            <p className="tag-note" style={{ marginTop: 18 }}>Papéis internos em definição pelo time, placeholder a confirmar com a equipe.</p>
          </div>
        </div>
      </section>

      {/* ============ O APP ============ */}
      <section id="o-app" aria-label="O aplicativo">
        <div className="wrap">
          <span className="kicker">O que a plataforma entrega</span>
          <h2>Uma plataforma inteligente que conecta passageiros ao <em className="serif">transporte público</em>.</h2>
          <p className="lead">Reunindo rotas, horários, localização dos ônibus em tempo real, alertas de chegada e muito mais, em um só lugar, do celular ao totem nos pontos.</p>
          <div className="features">
            <div className="feature">
              <div className="ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z" /></svg></div>
              <div><h3>Rastreamento em tempo real</h3><p>Veja exatamente onde o ônibus está enquanto ele chega até o seu ponto.</p></div>
              <div className="ex"><b>No app</b>Ônibus chegando em <strong>6 min</strong>, como na simulação no topo da página.</div>
            </div>
            <div className="feature">
              <div className="ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg></div>
              <div><h3>Horários atualizados</h3><p>Informação de confiança: horários de partida sempre sincronizados.</p></div>
              <div className="ex"><b>No app</b>Próxima partida <strong>38 min</strong> da linha selecionada.</div>
            </div>
            <div className="feature">
              <div className="ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 22a2.5 2.5 0 002.45-2h-4.9A2.5 2.5 0 0012 22zM12 3a6 6 0 00-6 6v4l-1.6 2.6a1 1 0 00.86 1.5h13.48a1 1 0 00.86-1.5L18 13V9a6 6 0 00-6-6z" /></svg></div>
              <div><h3>Alertas de chegada</h3><p>Receba um aviso quando a linha que interessa estiver próxima.</p></div>
              <div className="ex"><b>No app</b>Alerta ativo para a linha <strong>320</strong>, salvo nos favoritos.</div>
            </div>
            <div className="feature">
              <div className="ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg></div>
              <div><h3>Ponto mais próximo</h3><p>Descubra o ponto de ônibus mais perto de você, sem adivinhar.</p></div>
              <div className="ex"><b>No app</b>Mapa com todos os pontos de <strong>Nova Lima</strong>.</div>
            </div>
            <div className="feature">
              <div className="ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="13" rx="3" /><path d="M4 10h16" /><circle cx="8.5" cy="19" r="1.3" fill="currentColor" /><circle cx="15.5" cy="19" r="1.3" fill="currentColor" /></svg></div>
              <div><h3>Rotas de Nova Lima</h3><p>Todas as linhas que circulam pela cidade, organizadas e fáceis de consultar.</p></div>
              <div className="ex"><b>No app</b>Linhas municipais da Via Ouro no protótipo, destaque para a 011, Alphaville ↔ Nova Lima.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TOTEM FÍSICO ============ */}
      <section id="totem-fisico" aria-label="Totem de autoatendimento">
        <div className="wrap kiosk-grid">
          <div>
            <span className="kicker">No ponto de ônibus</span>
            <h2>Totem de autoatendimento: a parada que <em className="serif">responde</em>.</h2>
            <p className="lead">A mesma experiência do app, disponível fisicamente nos pontos de ônibus: consulte rotas, veja em tempo real quando o ônibus está chegando e acesse os horários sem depender da bateria do celular.</p>
            <p className="lead" style={{ marginTop: 16 }}>O protótipo interativo no topo do site reproduz a tela e o fluxo do aplicativo que planejamos para a cidade. As medidas abaixo são as do equipamento de referência que orientam o projeto físico.</p>
            <table className="spec-table" aria-label="Medidas do totem">
              <tbody>
                <tr><td>Tela (diagonal / largura)</td><td>380 mm × 245 mm (9,7&apos;&apos; autoatendimento)</td></tr>
                <tr><td>Altura total do totem</td><td>578 mm</td></tr>
                <tr><td>Base: largura × profundidade</td><td>280 mm × 205 mm</td></tr>
                <tr><td>Impressão no pedestal</td><td>Emissão de bilhete / recibo</td></tr>
                <tr><td>Janela de leitura</td><td>Scanner integrado no corpo</td></tr>
              </tbody>
            </table>
            <p className="tag-note" style={{ marginTop: 20 }}>Especificações baseadas no equipamento de referência: detalhes finais de fabricação em definição com o time. (placeholder)</p>
          </div>
          <div>
            <span className="kicker">Do app para a rua</span>
            <div className="features" style={{ marginTop: 0 }}>
              <div className="feature" style={{ gridTemplateColumns: "52px 1fr", gap: 18 }}>
                <div className="ico" style={{ width: 52, height: 52 }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20V9m6 11V5m6 15v-8" strokeLinecap="round" /></svg></div>
                <div><h3>Consulte no toque</h3><p>Interface do app no totem, com as mesmas abas de mapa, linhas e favoritos.</p></div>
              </div>
              <div className="feature" style={{ gridTemplateColumns: "52px 1fr", gap: 18 }}>
                <div className="ico" style={{ width: 52, height: 52 }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V4h12v5M6 18v3h12v-3M4 9h16v9H4z" /><circle cx="8.5" cy="13.5" r="1" fill="currentColor" /><circle cx="15.5" cy="13.5" r="1" fill="currentColor" /></svg></div>
                <div><h3>Impressão de bilhetes</h3><p>Emissão integrada no pedestal para compra e consulta impressa.</p></div>
              </div>
              <div className="feature" style={{ gridTemplateColumns: "52px 1fr", gap: 18 }}>
                <div className="ico" style={{ width: 52, height: 52 }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="8" width="16" height="12" rx="2" /><rect x="7" y="8" width="10" height="5" rx="1" /><path d="M8 4h8l3 4M4 8l3-4" /></svg></div>
                <div><h3>Acessível para todos</h3><p>Um futuro mais acessível: linguagem simples, tamanho de tela confortável e leitura clara.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PROCESSO ============ */}
      <section id="projeto" aria-label="Etapas do projeto">
        <div className="wrap">
          <span className="kicker">O projeto</span>
          <h2>Como tiramos a ideia do papel e para onde vamos.</h2>
          <p className="lead">Cada etapa abaixo é real, e o processo todo está documentado no Instagram do projeto.</p>
          <div className="steps">
            <div className="step">
              <h3 style={{ gridColumn: 2 }}><span className="when done">Concluído</span><br />Primeiros encontros</h3>
              <p>Planejamento, escuta da comunidade e muita aprendizagem sobre a mobilidade de Nova Lima. Respostas muito positivas da população.</p>
            </div>
            <div className="step">
              <h3 style={{ gridColumn: 2 }}><span className="when done">Concluído</span><br />Apresentação à Via Ouro e ao Pedro Dornas</h3>
              <p>Trocamos experiência, recebemos contribuições extremamente positivas e a proposta foi acolhida com entusiasmo e incentivo para evoluir.</p>
            </div>
            <div className="step">
              <h3 style={{ gridColumn: 2 }}><span className="when now">Em andamento</span><br />Construção da plataforma</h3>
              <p>Protótipo do aplicativo funcional com rastreamento, horários, rotas e alertas, além do projeto físico do totem de autoatendimento para os pontos.</p>
            </div>
            <div className="step">
              <h3 style={{ gridColumn: 2 }}><span className="when next">Próximo passo</span><br />Operação em Nova Lima</h3>
              <p>Começar por Nova Lima e, futuramente, levar esta visão a outras cidades. Data de operação a ser definida com os parceiros.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" aria-label="Perguntas frequentes">
        <div className="wrap">
          <span className="kicker">FAQ</span>
          <h2 style={{ textAlign: "center" }}>Perguntas que a cidade vem fazendo.</h2>
          <div className="faq">
            {FAQ_ITEMS.map((item, i) => (
              <div className="faq-item" key={item.q}>
                <h3>
                  <button type="button" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    {item.q}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                </h3>
                <div className={openFaq === i ? "answer open" : "answer"}>
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CONTATO ============ */}
      <section id="contato" aria-label="Contato">
        <div className="wrap contact-grid">
          <div>
            <span className="kicker">Contato</span>
            <h2>Vamos colocar Nova Lima em <em className="serif">movimento</em>.</h2>
            <p className="lead">Quer apoiar, investir ou levar o NL Bus para a sua operação? Escreva uma mensagem e envia direto no nosso Instagram, respondemos por lá.</p>
            <div className="channels">
              <a className="channel" href={IG_DM} target="_blank" rel="noopener">
                <span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg></span>
                <span><b>Direct no Instagram</b><span>@mobilidade.nlbus: abre a conversa direto</span></span>
              </a>
              <a className="channel" href={IG_PROFILE} target="_blank" rel="noopener">
                <span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4.5" /><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" /></svg></span>
                <span><b>Seguir o projeto</b><span>@mobilidade.nlbus: novidades em tempo real</span></span>
              </a>
              <span className="channel disabled" role="link" aria-disabled="true">
                <span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg></span>
                <span><b>WhatsApp</b><span>Número em breve</span></span>
                <span className="soon">Em breve</span>
              </span>
            </div>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="fName">Seu nome</label>
              <input id="fName" name="name" type="text" autoComplete="name" placeholder="Como podemos te chamar?" ref={nameRef} />
            </div>
            <div className="field">
              <label htmlFor="fGoal">Quero</label>
              <select id="fGoal" name="goal" ref={goalRef}>
                <option>Apoiar o projeto</option>
                <option>Investir</option>
                <option>Propor parceria</option>
                <option>Conhecer mais</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="fMsg">Mensagem</label>
              <textarea id="fMsg" name="message" placeholder="Conte pra gente como você quer fazer parte do NL Bus..." ref={msgRef} />
            </div>
            <button type="submit" className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
              Copiar e abrir no Instagram
            </button>
            {feedback && (
              <p className={"form-msg show " + feedback.kind} role="status" aria-live="polite">
                {feedback.text}
              </p>
            )}
            <p className="tag-note" style={{ marginTop: 16 }}>Por ainda não termos WhatsApp e e-mail oficiais, a mensagem vai direto para o Direct do Instagram do projeto.</p>
          </form>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <a className="logo" href="#inicio" style={{ marginBottom: 14 }}>
                <span className="badge" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.6a6.7 6.7 0 016.7 6.7c0 4.6-5 9.4-6.35 10.55a.55.55 0 01-.7 0C10.3 18.7 5.3 13.9 5.3 9.3A6.7 6.7 0 0112 2.6z" fill="#0FA3B0" />
                    <rect x="8.7" y="7.1" width="6.6" height="6.2" rx="1.8" fill="#fff" />
                    <rect x="9.9" y="8.2" width="4.2" height="2.8" rx="0.9" fill="#0E5E75" />
                    <circle cx="10.3" cy="12" r="0.8" fill="#0E5E75" />
                    <circle cx="13.7" cy="12" r="0.8" fill="#0E5E75" />
                  </svg>
                </span>
                NL&nbsp;Bus
              </a>
              <p className="muted" style={{ fontSize: 14.5, maxWidth: "34ch", marginTop: 12 }}>Sua cidade em movimento: mobilidade inclusiva e conectada.</p>
              <p className="city-line" style={{ marginTop: 16 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z" /></svg>
                Nova Lima, Minas Gerais
              </p>
            </div>
            <div>
              <h4>Navegue</h4>
              <ul>
                <li><a href="#sobre">Sobre o projeto</a></li>
                <li><a href="#o-app">O aplicativo</a></li>
                <li><a href="#totem-fisico">Totem de autoatendimento</a></li>
                <li><a href="#projeto">Etapas do projeto</a></li>
                <li><a href="#faq">Perguntas frequentes</a></li>
              </ul>
            </div>
            <div>
              <h4>Redes</h4>
              <ul>
                <li><a href={IG_PROFILE} target="_blank" rel="noopener">Instagram: @mobilidade.nlbus</a></li>
                <li><a href={IG_DM} target="_blank" rel="noopener">Direct: falar com o time</a></li>
              </ul>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© {year} NL Bus: mobilidade, tecnologia e inovação para Nova Lima.</span>
            <span>Projeto de Pedro Costa, Yago, Sarah e Ana · Apoio Via Ouro e Pedro Dornas</span>
          </div>
        </div>
      </footer>
    </>
  );
}
