import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import ModalAnki, { type CartaAnki } from "../components/ModalAnki";
import "../styles/historias.css";
import KindleSelection from "./KindleSelection";

// Cada historia tiene id, titulo y si esta fijada o no
interface HistoriaPreview {
  id: number;
  titulo: string;
  fijada?: boolean;
}

// Cada linea tiene el texto en ingles, su fonetica, su traduccion y el audio
interface LineaHistoria {
  en: string;
  ipa: string;
  es: string;
  audio: string;
}

export default function HistoriasPage() {
  // Sidebar State
  const [listaHistorias, setListaHistorias] = useState<HistoriaPreview[]>([]);
  const [tema, setTema] = useState("");
  const [dificultad, setDificultad] = useState("C1");
  const [generando, setGenerando] = useState(false);
  const [historiaActiva, setHistoriaActiva] = useState<number | null>(null);
  const [historiaTitulo, setHistoriaTitulo] = useState(
    "📚 Reproductor de Historias",
  );

  // Dropdown y Edición de Historia
  const [menuActivoId, setMenuActivoId] = useState<number | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [hoveredHistoriaId, setHoveredHistoriaId] = useState<number | null>(
    null,
  );

  // Board State
  const [lineas, setLineas] = useState<LineaHistoria[]>([]);
  const [modo, setModo] = useState<"completo" | "lectura" | "escucha">(
    "completo",
  );
  const [indiceAudio, setIndiceAudio] = useState(-1);
  const [velocidad, setVelocidad] = useState(1.0);

  // Vocab State
  const [palabrasEnAnki, setPalabrasEnAnki] = useState<string[]>([]);

  // Anki Modal State
  const [cargandoAnki, setCargandoAnki] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cartasPropuestas, setCartasPropuestas] = useState<CartaAnki[]>([]);

  // Refs
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const clickTimeout = useRef<any>(null);
  const lastMousePos = useRef<{ x: number; y: number; time: number }>({
    x: 0,
    y: 0,
    time: 0,
  });

  // 1. Cargar Vocabulario y Lista al Montar
  useEffect(() => {
    cargarVocabulario();
    cargarListaHistorias();
  }, []);

  const cargarVocabulario = async () => {
    try {
      const res = await fetch("/api/vocabulario");
      if (res.ok) {
        const data = await res.json();
        setPalabrasEnAnki(data);
      }
    } catch (err) {
      console.error("Error cargando vocabulario:", err);
    }
  };

  const cargarListaHistorias = async () => {
    try {
      const res = await fetch("/api/lista_historias");
      if (res.ok) {
        const data = await res.json();
        setListaHistorias(data);
      }
    } catch (err) {
      console.error("No se pudo cargar la lista:", err);
    }
  };

  // 2. Resaltador
  const resaltarPalabras = (textoIngles: string) => {
    if (palabrasEnAnki.length === 0) return textoIngles;
    let textoResaltado = textoIngles;
    const palabrasOrdenadas = [...palabrasEnAnki].sort(
      (a, b) => b.length - a.length,
    );
    palabrasOrdenadas.forEach((palabra) => {
      const palabraLimpia = palabra.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b(${palabraLimpia})\\b`, "gi");
      textoResaltado = textoResaltado.replace(
        regex,
        '<span class="anki-highlight">$1</span>',
      );
    });
    return textoResaltado;
  };

  // 3. Generar Historia
  const generarHistoria = async () => {
    if (!tema.trim()) return alert("Escribe un tema para la historia.");
    setGenerando(true);
    setLineas([]);
    setHistoriaTitulo("📚 Generando historia...");

    try {
      const res = await fetch("/generar_historia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tematica: tema.trim(), nivel: dificultad }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setHistoriaTitulo(`📚 ${data.titulo}`);
      await cargarHistoria(data.historia_id);
      cargarListaHistorias();
      setTema("");
    } catch (err: any) {
      alert("Error: " + err.message);
      setHistoriaTitulo("📚 Reproductor de Historias");
    } finally {
      setGenerando(false);
    }
  };

  const eliminarHistoria = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de que deseas eliminar esta historia?")) {
      await fetch(`/api/historias/${id}`, { method: "DELETE" });
      cargarListaHistorias();
      if (historiaActiva === id) {
        setHistoriaActiva(null);
        setLineas([]);
        setHistoriaTitulo("📚 Reproductor de Historias");
        setIndiceAudio(-1);
      }
    }
  };

  const renombrarHistoria = async (id: number) => {
    if (!nuevoTitulo.trim()) {
      setEditandoId(null);
      return;
    }

    try {
      await fetch(`/api/historias/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: nuevoTitulo }),
      });
      cargarListaHistorias();
      if (historiaActiva === id) setHistoriaTitulo(`📚 ${nuevoTitulo}`);
    } catch (e) {
      console.error(e);
    }
    setEditandoId(null);
  };

  const fijarHistoria = async (id: number) => {
    try {
      await fetch(`/api/historias/${id}/fijar`, { method: "PUT" });
      cargarListaHistorias();
    } catch (e) {
      console.error(e);
    }
    setMenuActivoId(null);
  };

  // Cierra menú si hacemos click afuera
  useEffect(() => {
    const handleMenuClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".story-options-menu")) {
        setMenuActivoId(null);
      }
    };
    document.addEventListener("mousedown", handleMenuClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleMenuClickOutside);
  }, []);

  // 4. Cargar y Reproducir
  const cargarHistoria = async (id: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setHistoriaActiva(id);
    setIndiceAudio(-1);

    const h = listaHistorias.find((hi) => hi.id === id);
    if (h) setHistoriaTitulo(`📚 ${h.titulo}`);

    try {
      const res = await fetch(`/api/historias/${id}`);
      if (res.ok) {
        const data = await res.json();
        setLineas(data.lineas);
        if (!h && data.titulo) {
          setHistoriaTitulo(`📚 ${data.titulo}`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const reproducirDesde = (index: number) => {
    if (index >= lineas.length || index < 0) {
      setIndiceAudio(-1);
      return;
    }
    setIndiceAudio(index);
    if (audioPlayerRef.current) {
      // audioPlayerRef.current.src = lineas[index].audio;

      // Usamos un cache-buster ?t=... para forzar al navegador a descargar el mp3 real
      // y que no use una versión vieja atrapada en la memoria caché.
      audioPlayerRef.current.src = `${lineas[index].audio}?t=${Date.now()}`;
      audioPlayerRef.current.playbackRate = velocidad;
      audioPlayerRef.current.play();
    }
  };

  // Scroll local del story-board
  useLayoutEffect(() => {
    if (indiceAudio >= 0) {
      const el = document.getElementById(`linea-${indiceAudio}`);
      const container = document.getElementById("story-board");
      if (el && container) {
        const elRect = el.getBoundingClientRect();
        const contRect = container.getBoundingClientRect();
        const offsetToCenter =
          elRect.top -
          contRect.top +
          container.scrollTop -
          contRect.height / 2 +
          elRect.height / 2;
        container.scrollTo({ top: offsetToCenter, behavior: "smooth" });
      }
    }
  }, [indiceAudio]);

  const handleAudioEnded = () => reproducirDesde(indiceAudio + 1);

  const handleVelocidadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = parseFloat(e.target.value);
    setVelocidad(v);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = v;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    lastMousePos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handleMouseUpPlay = (index: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const dx = Math.abs(e.clientX - lastMousePos.current.x);
    const dy = Math.abs(e.clientY - lastMousePos.current.y);

    // Si movió el cursor, es selección
    if (dx > 5 || dy > 5) return;

    if (clickTimeout.current) clearTimeout(clickTimeout.current);

    clickTimeout.current = setTimeout(() => {
      // Confirmamos que la selección nativa del usuario no tenga nada seleccionado
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) return;

      if (indiceAudio === index) {
        if (audioPlayerRef.current?.paused) audioPlayerRef.current.play();
        else audioPlayerRef.current?.pause();
      } else {
        reproducirDesde(index);
      }
    }, 200);
  };

  // Enviar a Anki (llamado desde el nuevo componente KindleSelection)
  const abrirAnkiDesdeFloating = async (palabra: string, contexto: string) => {
    setCargandoAnki(true);
    try {
      const res = await fetch("/proponer_carta_unica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ palabra, contexto }),
      });
      const data = await res.json();

      if (data.error) {
        alert(data.error);
      } else if (!data.cartas || data.cartas.length === 0) {
        alert("No se pudo generar la carta.");
      } else {
        setCartasPropuestas(data.cartas);
        setIsModalOpen(true);
      }
    } catch (err) {
      alert("Error al conectar con el servidor.");
    } finally {
      setCargandoAnki(false);
      window.getSelection()?.removeAllRanges();
    }
  };

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;

      // Ignorar atajos del sistema como Ctrl+C, Ctrl+V
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (audioPlayerRef.current?.src) {
          if (audioPlayerRef.current.paused) audioPlayerRef.current.play();
          else audioPlayerRef.current.pause();
        }
      }

      if (e.code === "Digit1" || e.code === "Numpad1") setModo("completo");
      if (e.code === "Digit2" || e.code === "Numpad2") setModo("lectura");
      if (e.code === "Digit3" || e.code === "Numpad3") setModo("escucha");

      if (e.code === "KeyW") {
        setIndiceAudio((prev) => {
          if (prev > 0) {
            e.preventDefault();
            setTimeout(() => reproducirDesde(prev - 1), 0);
          }
          return prev;
        });
      }
      if (e.code === "KeyC") {
        if (audioPlayerRef.current?.src) {
          e.preventDefault();
          audioPlayerRef.current.currentTime = 0;
          audioPlayerRef.current.play();
        }
      }
      if (e.code === "KeyV") {
        if (audioPlayerRef.current?.src) {
          e.preventDefault();
          audioPlayerRef.current.currentTime = 0;
          audioPlayerRef.current.pause();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [indiceAudio, lineas]);

  const boardClasses = [];
  if (modo === "lectura") boardClasses.push("hide-es", "show-ipa");
  if (modo === "escucha") boardClasses.push("hide-en", "hide-es");

  return (
    <div className="app-container">
      <div className="sidebar historias-sidebar">
        <Link to="/" className="link-reset">
          <button className="new-chat-btn btn-back btn-full">
            ⬅ Volver al Chat
          </button>
        </Link>
        <Link to="/fonetica" className="link-reset">
          <button className="new-chat-btn btn-fonetica btn-full mb-0">
            🗣️ Fonética
          </button>
        </Link>

        <h3 className="sidebar-section-title mt-20">Generar Historia</h3>
        <div className="story-form">
          <label className="story-label">Temática:</label>
          <textarea
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            rows={3}
            placeholder="Escribe de que quieres que se trate tu historia..."
            className="story-textarea"
          ></textarea>
          <label className="story-label" style={{ marginTop: "5px" }}>
            Dificultad:
          </label>
          <select
            value={dificultad}
            onChange={(e) => setDificultad(e.target.value)}
            className="story-difficulty-select"
          >
            <option value="A1">A1 - Principiante</option>
            <option value="A2">A2 - Elemental</option>
            <option value="B1">B1 - Intermedio</option>
            <option value="B2">B2 - Intermedio Alto</option>
            <option value="C1">C1 - Avanzado</option>
          </select>
          <button
            className="new-chat-btn btn-compact"
            onClick={generarHistoria}
            disabled={generando}
          >
            {generando
              ? "⏳ Escribiendo y grabando..."
              : "✨ Generar y Crear Audios"}
          </button>
        </div>

        <h3 className="sidebar-section-title library-title">
          📖 Mi Biblioteca
        </h3>
        <div className="chat-list story-list">
          {listaHistorias.map((h) => (
            <div
              key={h.id}
              className={`story-list-item ${historiaActiva === h.id ? "active" : ""}`}
              onMouseEnter={() => setHoveredHistoriaId(h.id)}
              onMouseLeave={() => setHoveredHistoriaId(null)}
            >
              {editandoId === h.id ? (
                <input
                  type="text"
                  className="story-edit-input"
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") renombrarHistoria(h.id);
                    if (e.key === "Escape") setEditandoId(null);
                  }}
                  onBlur={() => renombrarHistoria(h.id)}
                  autoFocus
                />
              ) : (
                <span
                  className="story-list-title"
                  onClick={() => cargarHistoria(h.id)}
                >
                  {h.fijada && <span>📌</span>}
                  {h.titulo}
                </span>
              )}

              <div className="story-options-menu">
                <button
                  className="story-options-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuActivoId(menuActivoId === h.id ? null : h.id);
                  }}
                  style={{
                    visibility:
                      hoveredHistoriaId === h.id || menuActivoId === h.id
                        ? "visible"
                        : "hidden",
                  }}
                >
                  ⋮
                </button>

                {menuActivoId === h.id && (
                  <div className="story-dropdown-content">
                    <button
                      className="story-dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        fijarHistoria(h.id);
                      }}
                    >
                      <span>{h.fijada ? "❌" : "📌"}</span>{" "}
                      {h.fijada ? "Desfijar" : "Fijar arriba"}
                    </button>
                    <button
                      className="story-dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditandoId(h.id);
                        setNuevoTitulo(h.titulo);
                        setMenuActivoId(null);
                      }}
                    >
                      <span>✏️</span> Renombrar
                    </button>
                    <button
                      className="story-dropdown-item danger"
                      onClick={(e) => {
                        setMenuActivoId(null);
                        eliminarHistoria(h.id, e);
                      }}
                    >
                      <span>🗑️</span> Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-container historias-chat-container">
        <div className="header historias-header">
          <div className="historias-header-row">
            <h2 className="historias-header-title">{historiaTitulo}</h2>
            <div className="historias-header-actions">
              {cargandoAnki && (
                <span className="story-loading-text">⏳ Cargando Anki...</span>
              )}
              <select
                value={velocidad}
                onChange={handleVelocidadChange}
                className="speed-select"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1.0x</option>
                <option value={1.25}>1.25x</option>
              </select>
              {indiceAudio === -1 && lineas.length > 0 && (
                <button className="anki-btn" onClick={() => reproducirDesde(0)}>
                  ▶ Reproducir
                </button>
              )}
            </div>
          </div>
          <audio
            ref={audioPlayerRef}
            controls
            className="story-audio-player"
            style={{ display: indiceAudio >= 0 ? "block" : "none" }}
            onEnded={handleAudioEnded}
          />
        </div>

        <div className="story-controls">
          <button
            className={`mode-btn ${modo === "completo" ? "active" : ""}`}
            onClick={() => setModo("completo")}
          >
            1. Comprensión
            <br />
            <span className="mode-subtitle">(Audio + EN + ES)</span>
          </button>
          <button
            className={`mode-btn ${modo === "lectura" ? "active" : ""}`}
            onClick={() => setModo("lectura")}
          >
            2. Adquisición
            <br />
            <span className="mode-subtitle">(Audio + EN)</span>
          </button>
          <button
            className={`mode-btn ${modo === "escucha" ? "active" : ""}`}
            onClick={() => setModo("escucha")}
          >
            3. Inmersión
            <br />
            <span className="mode-subtitle">(Solo Audio)</span>
          </button>
        </div>

        <div
          id="story-board"
          className={`story-board ${boardClasses.join(" ")}`}
        >
          {lineas.length === 0 ? (
            <div className="story-empty-state">
              {generando
                ? "Generando contenido con IA... Esto puede tomar unos segundos."
                : "Genera una historia en la barra lateral para comenzar."}
            </div>
          ) : (
            lineas.map((linea, index) => (
              <div
                key={index}
                id={`linea-${index}`}
                className={`story-line ${indiceAudio === index ? "playing" : ""}`}
                onMouseDown={handleMouseDown}
                onMouseUp={(e) => handleMouseUpPlay(index, e)}
              >
                {/* Capa Base: Mantiene el ancho y alto estructural SIEMPRE */}
                <div className="story-line-content">
                  <div
                    className="text-en"
                    style={{
                      visibility: modo === "escucha" ? "hidden" : "visible",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: resaltarPalabras(linea.en),
                    }}
                  />

                  {/* Contenedor superpuesto para las traducciones e IPA (para que compartan espacio de altura exacto) */}
                  <div className="story-translations-container">
                    <div
                      className="text-ipa story-translation-layer"
                      style={{
                        visibility: modo === "lectura" ? "visible" : "hidden",
                      }}
                    >
                      {linea.ipa}
                    </div>
                    <div
                      className="text-es story-translation-layer"
                      style={{
                        visibility: modo === "completo" ? "visible" : "hidden",
                      }}
                    >
                      {linea.es}
                    </div>
                  </div>
                </div>

                {/* Capa Superior: Mensaje de inmersión centrado (Solo visible en Modo 3) */}
                <div
                  className="story-immersion-overlay"
                  style={{
                    display: modo === "escucha" ? "flex" : "none",
                  }}
                >
                  🎧 Escuchando audio...
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <KindleSelection onRequestAnki={abrirAnkiDesdeFloating} />

      <ModalAnki
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          cargarVocabulario();
        }}
        cartasIniciales={cartasPropuestas}
        chatId={0}
        origen="historia"
      />
    </div>
  );
}
