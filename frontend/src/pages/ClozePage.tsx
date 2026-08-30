import { useState, useEffect } from "react";
import "../styles/style.css";
import ModalAnki, { type CartaAnki } from "../components/ModalAnki";

type Token =
  | { type: "text"; val: string }
  | { type: "input"; val: string; id: number };

interface Oracion {
  id: number;
  ingles: string;
  espanol: string;
  palabra_oculta?: string;
}

export default function ClozePage() {
  const [oraciones, setOraciones] = useState<Oracion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userInputs, setUserInputs] = useState<Record<number, string>>({});
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const [showRespuesta, setShowRespuesta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [origenSel, setOrigenSel] = useState<"anki" | "ia">("anki");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cartasAExportar, setCartasAExportar] = useState<CartaAnki[]>([]);

  // Variables derivadas
  const currentOracion = oraciones[currentIndex];

  const getClozeDetails = (frase: string, palabra_oculta?: string) => {
    if (!frase) return { tokens: [], answerMap: {} };

    // 1. Array de palabras a ocultar
    let wordsToHide: string[] = [];
    if (palabra_oculta) {
      wordsToHide = palabra_oculta
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);
    }

    // 2. Fallback por si backend omitió
    if (wordsToHide.length === 0) {
      const preposiciones = [
        "in",
        "on",
        "at",
        "to",
        "into",
        "for",
        "with",
        "about",
        "of",
        "from",
        "by",
        "onto",
      ];
      const palabras = frase.split(" ");
      const found = palabras.find((w) =>
        preposiciones.includes(w.toLowerCase().replace(/[^a-z]/g, "")),
      );
      if (found) {
        wordsToHide.push(found.replace(/[^a-zA-Z]/g, ""));
      } else {
        const midWord = palabras[Math.max(0, Math.floor(palabras.length / 2))];
        if (midWord) {
          wordsToHide.push(midWord.replace(/[^a-zA-Z]/g, ""));
        }
      }
    }

    wordsToHide = wordsToHide.filter((w) => w.length > 0);
    if (wordsToHide.length === 0)
      return { tokens: [{ type: "text", val: frase }], answerMap: {} };

    // 3. Crear regex mágico de palabra completa (escapando caracteres especiales para no romper JS)
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regexPattern = `\\b(${wordsToHide.map(escapeRegex).join("|")})\\b`;
    const regex = new RegExp(regexPattern, "gi");

    let match;
    let lastIndex = 0;
    let idCounter = 0;
    const tokens: Token[] = [];
    const answerMap: Record<number, string> = {};

    while ((match = regex.exec(frase)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          type: "text",
          val: frase.substring(lastIndex, match.index),
        });
      }
      tokens.push({ type: "input", val: match[0], id: idCounter });
      answerMap[idCounter] = match[0];
      idCounter++;
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < frase.length) {
      tokens.push({ type: "text", val: frase.substring(lastIndex) });
    }

    if (tokens.length === 0) {
      tokens.push({ type: "text", val: frase });
    }

    return { tokens, answerMap };
  };

  const { tokens, answerMap } = getClozeDetails(
    currentOracion?.ingles || "",
    currentOracion?.palabra_oculta,
  );

  useEffect(() => {
    cargarOraciones();
  }, [origenSel]);

  const cargarOraciones = async () => {
    setLoading(true);
    setCurrentIndex(0);
    setUserInputs({});
    setWrongIds([]);
    setShowRespuesta(false);
    setError(null);
    try {
      const res = await fetch(`/ejercicios/cloze?origen=${origenSel}`);
      const data = await res.json();
      if (data.oraciones) {
        setOraciones(data.oraciones);
      } else {
        setOraciones([]);
      }
    } catch (e) {
      setError("Error cargando ejercicios. " + e);
    }
    setLoading(false);
  };

  const generarConIA = async () => {
    setGenerando(true);
    try {
      const res = await fetch("/ejercicios/generar_cloze", { method: "POST" });
      const data = await res.json();
      if (data.exito) {
        if (origenSel === "ia") {
          await cargarOraciones();
        } else {
          setOrigenSel("ia"); // Esto disparará cargarOraciones vía useEffect
        }
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error al conectar con IA.");
    }
    setGenerando(false);
  };

  const handleEliminar = async () => {
    if (!currentOracion) return;
    const confirm = window.confirm(
      "¿Seguro que deseas eliminar permanentemente este ejercicio?",
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/ejercicios/cloze/${currentOracion.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.exito) {
        const nuevas = oraciones.filter((o) => o.id !== currentOracion.id);
        if (nuevas.length > 0) {
          setOraciones(nuevas);
          if (currentIndex >= nuevas.length) setCurrentIndex(nuevas.length - 1);
          setUserInputs({});
          setWrongIds([]);
          setShowRespuesta(false);
        } else {
          cargarOraciones();
        }
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error eliminando: " + e);
    }
  };

  const handleComprobar = () => {
    if (Object.keys(answerMap).length === 0) return;

    let allCorrect = true;
    const errors: number[] = [];

    Object.keys(answerMap).forEach((key) => {
      const id = Number(key);
      const expected = answerMap[id].toLowerCase().trim();
      const actual = (userInputs[id] || "").toLowerCase().trim();
      if (actual !== expected) {
        allCorrect = false;
        errors.push(id);
      }
    });

    if (allCorrect) {
      setShowRespuesta(true);
      playAudio(currentOracion.ingles);
      setWrongIds([]);
    } else {
      setWrongIds(errors);
      errors.forEach((id) => {
        const el = document.getElementById(`cloze-input-${id}`);
        if (el) {
          el.style.borderColor = "red";
          el.style.animation = "shake 0.5s";
          setTimeout(() => {
            el.style.borderColor = "transparent";
            el.style.animation = "";
          }, 500);
        }
      });
    }
  };

  const guardarEnAnki = () => {
    let frenteHTML = "";
    let palabrasSecretas = "";
    tokens.forEach((tok) => {
      if (tok.type === "text") frenteHTML += tok.val;
      else {
        frenteHTML += "____";
        if (palabrasSecretas.length > 0) palabrasSecretas += ", ";
        palabrasSecretas += tok.val;
      }
    });

    if (!palabrasSecretas) palabrasSecretas = "Palabras Clave";

    setCartasAExportar([
      {
        frente: frenteHTML,
        reverso: palabrasSecretas,
        ejemplo_ingles: currentOracion.ingles,
        ejemplo_espanol: currentOracion.espanol,
        termino_imagen: palabrasSecretas,
        categoria: "Vocabulario",
      },
    ]);
    setIsModalOpen(true);
  };

  const handleHint = () => {
    if (Object.keys(answerMap).length === 0) return;
    const newInputs = { ...userInputs };
    Object.keys(answerMap).forEach((key) => {
      const id = Number(key);
      const expected = answerMap[id];
      const current = userInputs[id] || "";
      if (current.toLowerCase().trim() !== expected.toLowerCase().trim()) {
        if (current.length < expected.length) {
          newInputs[id] = expected.substring(0, current.length + 1);
        }
      }
    });
    setUserInputs(newInputs);
    setWrongIds([]);
  };

  const playAudio = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const nextQuestion = () => {
    setUserInputs({});
    setWrongIds([]);
    setShowRespuesta(false);
    if (currentIndex + 1 < oraciones.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      cargarOraciones();
    }
  };

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.repeat) return; // Si mantiene presionada la tecla, la ignoramos
      if (e.target instanceof HTMLInputElement) return; // Si presionó enter dentro de la caja de texto, ignorar

      if (showRespuesta && !isModalOpen && e.key === "Enter") {
        e.preventDefault();
        nextQuestion();
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  });

  const BotonGenerar = () => (
    <div style={{ marginTop: "2rem", textAlign: "center" }}>
      <button
        onClick={generarConIA}
        disabled={generando}
        className="new-chat-btn"
        style={{
          width: "auto",
          background: "linear-gradient(45deg, #FF9800, #F44336)",
          padding: "12px 24px",
          opacity: generando ? 0.7 : 1,
        }}
      >
        {generando
          ? "⏳ Analizando chats y creando..."
          : "✨ Generar ejercicios con IA"}
      </button>
    </div>
  );

  const headerTabs = (
    <>
      <h2 style={{ color: "black", marginBottom: "0.5rem" }}>
        🧩 Práctica de Cloze
      </h2>
      <p style={{ marginBottom: "1.5rem", color: "#666" }}>
        Completa la palabra faltante según el contexto de la traducción en
        español.
      </p>
      <div style={{ display: "flex", gap: "10px", marginBottom: "2rem" }}>
        <button
          onClick={() => setOrigenSel("anki")}
          style={{
            padding: "8px 16px",
            borderRadius: "20px",
            border: "none",
            cursor: "pointer",
            background: origenSel === "anki" ? "#4CAF50" : "#ddd",
            color: origenSel === "anki" ? "white" : "#444",
            fontWeight: "bold",
            outline: "none",
            transition: "0.2s",
          }}
        >
          📚 Tarjetas Anki
        </button>
        <button
          onClick={() => setOrigenSel("ia")}
          style={{
            padding: "8px 16px",
            borderRadius: "20px",
            border: "none",
            cursor: "pointer",
            background: origenSel === "ia" ? "#FF9800" : "#ddd",
            color: origenSel === "ia" ? "white" : "#444",
            fontWeight: "bold",
            outline: "none",
            transition: "0.2s",
          }}
        >
          ✨ Ejercicios IA
        </button>
      </div>
    </>
  );

  return (
    <div
      className="historias-container"
      style={{
        padding: "2rem",
        color: "black",
        width: "100%",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      {headerTabs}

      {loading ? (
        <div style={{ color: "black", padding: "20px" }}>
          Cargando ejercicios...
        </div>
      ) : error ? (
        <div style={{ color: "black", padding: "20px" }}>{error}</div>
      ) : !oraciones.length ? (
        <>
          <div
            style={{
              background: "#ffffffff",
              padding: "2rem",
              borderRadius: "12px",
              borderLeft: "5px solid #FF9800",
            }}
          >
            {origenSel === "anki"
              ? "No tienes ejercicios provenientes de Anki. ¡Ve a tus chats y extrae vocabulario a tus mazos para que aparezcan aquí automáticamente!"
              : "No hay ejercicios creados. ¡Pulsa el botón de abajo para que la IA escudriñe tus chats y cree nuevos ejercicios ahora mismo!"}
          </div>
          {origenSel === "ia" && <BotonGenerar />}
        </>
      ) : (
        <>
          <div
            style={{
              background: "#2a2a2a",
              padding: "2rem",
              borderRadius: "12px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <h3
                style={{
                  color: "#eee",
                  fontWeight: "300",
                  marginRight: "1rem",
                }}
              >
                {currentOracion.espanol}
              </h3>
              <button
                onClick={handleEliminar}
                title="Eliminar este ejercicio"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.4rem",
                  opacity: 0.6,
                  transition: "opacity 0.2s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseOut={(e) => (e.currentTarget.style.opacity = "0.6")}
              >
                🗑️
              </button>
            </div>

            <h1
              style={{
                margin: "2rem 0",
                color: "white",
                fontSize: "2rem",
                letterSpacing: "1px",
                lineHeight: "2.5em",
              }}
            >
              {tokens.map((tok, i) => {
                if (tok.type === "text") {
                  return (
                    <span
                      key={i}
                      style={{ color: showRespuesta ? "#4CAF50" : "inherit" }}
                    >
                      {tok.val}
                    </span>
                  );
                } else {
                  if (showRespuesta) {
                    return (
                      <span
                        key={i}
                        style={{ color: "#4CAF50", fontWeight: "bold" }}
                      >
                        {tok.val}
                      </span>
                    );
                  }
                  return (
                    <input
                      key={i}
                      id={`cloze-input-${tok.id}`}
                      type="text"
                      value={userInputs[tok.id] || ""}
                      onChange={(e) =>
                        setUserInputs({
                          ...userInputs,
                          [tok.id]: e.target.value,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleComprobar();
                        }
                      }}
                      style={{
                        padding: "8px 12px",
                        margin: "0 8px",
                        borderRadius: "8px",
                        border: `2px solid ${
                          wrongIds.includes(tok.id) ? "red" : "#555"
                        }`,
                        background: "#333",
                        color: "white",
                        fontSize: "2rem",
                        width: `${Math.max(3, tok.val.length)}ch`,
                        textAlign: "center",
                        outline: "none",
                        transition: "border-color 0.3s ease",
                      }}
                      autoFocus={tok.id === 0}
                    />
                  );
                }
              })}
            </h1>

            {!showRespuesta && (
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "20px",
                  alignItems: "center",
                }}
              >
                <div style={{ flexGrow: 1 }} />
                <button
                  onClick={handleHint}
                  className="new-chat-btn"
                  style={{
                    width: "auto",
                    padding: "12px 20px",
                    background: "#444",
                  }}
                >
                  💡 Pista
                </button>
                <button
                  onClick={handleComprobar}
                  className="new-chat-btn confirm"
                  style={{
                    width: "auto",
                    padding: "12px 20px",
                    marginLeft: "auto",
                  }}
                >
                  ✅ Comprobar
                </button>
              </div>
            )}

            {showRespuesta && (
              <div
                style={{
                  marginTop: "20px",
                  display: "flex",
                  gap: "15px",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    color: "#4CAF50",
                    fontWeight: "bold",
                    fontSize: "1.2rem",
                    flexGrow: 1,
                  }}
                >
                  ¡Acertaste! 🎉
                </div>
                <button
                  onClick={() => playAudio(currentOracion.ingles)}
                  className="new-chat-btn"
                  style={{ width: "auto", background: "#444" }}
                >
                  🔊 Escuchar
                </button>
                {origenSel === "ia" && (
                  <button
                    onClick={guardarEnAnki}
                    className="new-chat-btn"
                    style={{ width: "auto", background: "#8E24AA" }}
                  >
                    🧠 Guardar en Anki
                  </button>
                )}
                <button
                  onClick={nextQuestion}
                  className="new-chat-btn confirm"
                  style={{ marginLeft: "auto", width: "auto" }}
                >
                  Siguiente ➡️
                </button>
              </div>
            )}
          </div>
          {origenSel === "ia" && <BotonGenerar />}
        </>
      )}

      <ModalAnki
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cartasIniciales={cartasAExportar}
        chatId={0}
        origen="historia"
      />

      <style>{`
        @keyframes shake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            50% { transform: translateX(5px); }
            75% { transform: translateX(-5px); }
            100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
