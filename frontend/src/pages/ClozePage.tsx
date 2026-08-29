import { useState, useEffect } from "react";
import "../styles/style.css";
import ModalAnki, { type CartaAnki } from "../components/ModalAnki";

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
  const [userInput, setUserInput] = useState("");
  const [showRespuesta, setShowRespuesta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [origenSel, setOrigenSel] = useState<"anki" | "ia">("anki");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cartasAExportar, setCartasAExportar] = useState<CartaAnki[]>([]);

  // Variables derivadas
  const currentOracion = oraciones[currentIndex];

  const getClozeDetails = (frase: string, palabra_oculta?: string) => {
    if (!frase) return { fraseOculta: "", palabraCorrecta: "" };

    const palabras = frase.split(" ");
    let wordIndex = -1;

    // Si el backend dictó una palabra específica, la buscamos
    if (palabra_oculta) {
      const pOc = palabra_oculta.toLowerCase().replace(/[^a-z]/g, "");
      wordIndex = palabras.findIndex(
        (w) => w.toLowerCase().replace(/[^a-z]/g, "") === pOc,
      );
    }

    // Fallback: si no hay palabra_oculta (tarjetas viejas) o no se encontró
    if (wordIndex === -1) {
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
      wordIndex = palabras.findIndex((w) =>
        preposiciones.includes(w.toLowerCase().replace(/[^a-z]/g, "")),
      );
    }

    // Fallback final
    if (wordIndex === -1) {
      wordIndex = Math.max(0, Math.floor(palabras.length / 2));
    }

    const wordOriginal = palabras[wordIndex];
    if (!wordOriginal) return { fraseOculta: frase, palabraCorrecta: "" };

    const cleanWord = wordOriginal.replace(/[^a-zA-Z]/g, "");
    const replacementMask = "____";

    const maskedArray = [...palabras];
    maskedArray[wordIndex] = wordOriginal.replace(cleanWord, replacementMask);
    const fraseOculta = maskedArray.join(" ");

    return { fraseOculta, palabraCorrecta: cleanWord };
  };

  const { fraseOculta, palabraCorrecta } = getClozeDetails(
    currentOracion?.ingles || "",
    currentOracion?.palabra_oculta,
  );

  useEffect(() => {
    cargarOraciones();
  }, [origenSel]);

  const cargarOraciones = async () => {
    setLoading(true);
    setCurrentIndex(0);
    setUserInput("");
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
          setUserInput("");
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
    if (!palabraCorrecta) return;

    if (
      userInput.toLowerCase().trim() === palabraCorrecta.toLowerCase().trim()
    ) {
      setShowRespuesta(true);
      playAudio(currentOracion.ingles);
    } else {
      const inputElem = document.getElementById("cloze-input");
      if (inputElem) {
        inputElem.style.borderColor = "red";
        inputElem.style.animation = "shake 0.5s";
        setTimeout(() => {
          inputElem.style.borderColor = "transparent";
          inputElem.style.animation = "";
        }, 500);
      }
    }
  };

  const guardarEnAnki = () => {
    const palabra = palabraCorrecta || "Palabra";
    setCartasAExportar([
      {
        frente: fraseOculta,
        reverso: palabra,
        ejemplo_ingles: currentOracion.ingles,
        ejemplo_espanol: currentOracion.espanol,
        termino_imagen: palabra,
        categoria: "Vocabulario",
      },
    ]);
    setIsModalOpen(true);
  };

  const handleHint = () => {
    if (!palabraCorrecta) return;
    if (userInput.length < palabraCorrecta.length) {
      setUserInput(palabraCorrecta.substring(0, userInput.length + 1));
    }
  };

  const playAudio = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const nextQuestion = () => {
    setUserInput("");
    setShowRespuesta(false);
    if (currentIndex + 1 < oraciones.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      cargarOraciones();
    }
  };

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
                color: showRespuesta ? "#4CAF50" : "white",
                fontSize: "2rem",
                letterSpacing: "1px",
              }}
            >
              {showRespuesta ? currentOracion.ingles : fraseOculta}
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
                <input
                  id="cloze-input"
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComprobar()}
                  placeholder="Escribe la palabra..."
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "2px solid #555",
                    background: "#333",
                    color: "white",
                    fontSize: "1.1rem",
                    width: "100%",
                    outline: "none",
                    transition: "border-color 0.3s ease",
                  }}
                  autoFocus
                />
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
