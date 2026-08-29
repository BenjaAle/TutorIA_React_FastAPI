import { useState, useEffect } from "react";
import "../styles/fonetica.css"; // Ensure styles are bundled

interface Fonema {
  id: string;
  simbolo: string;
  nombre: string;
  desc: string;
  ejemplos: string[];
}

interface ReglaSpeech {
  regla: string;
  nombre: string;
  desc: string;
  ejemplos: string[];
}

export default function FoneticaPage() {
  const [fonemas, setFonemas] = useState<Fonema[]>([]);
  const [reglas, setReglas] = useState<ReglaSpeech[]>([]);

  useEffect(() => {
    // 1. Cargar la Tabla Fonética
    const cargarFonemas = async () => {
      try {
        const res = await fetch("/api/fonemas");
        if (res.ok) {
          const data = await res.json();
          setFonemas(data);
        }
      } catch (err) {
        console.error("Error al cargar fonemas:", err);
      }
    };

    // 2. Cargar Connected Speech
    const cargarConnectedSpeech = async () => {
      try {
        const res = await fetch("/api/connected_speech");
        if (res.ok) {
          const data = await res.json();
          setReglas(data);
        }
      } catch (err) {
        console.error("Error al cargar connected speech:", err);
      }
    };

    cargarFonemas();
    cargarConnectedSpeech();
  }, []);

  // Manejador de click en tarjeta de fonema
  const handleClickFonema = (ejemplos: string[]) => {
    window.speechSynthesis.cancel();

    // "book (/bʊk/)" -> al hacer split(" ") toma solo "book".
    const palabrasLimpias = ejemplos.map((ej) => ej.split(" ")[0]);

    // Unimos con coma para la pausa entre palabras
    const textoAReproducir = palabrasLimpias.join(", ");

    const utterance = new SpeechSynthesisUtterance(textoAReproducir);
    utterance.lang = "en-US";
    utterance.rate = 0.7;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  };

  // Manejador de click en tarjeta de connected speech
  const handleClickConnected = (ejemplos: string[]) => {
    window.speechSynthesis.cancel();

    // Extraemos la abreviación (lo que está entre paréntesis) para que el audio suene más natural (ej: "kinda" en vez de "kind of")
    const frasesLimpias = ejemplos.map((ej) => {
      const match = ej.match(/\((.*?)\)/);
      return match && match[1] ? match[1] : ej.split(" (")[0];
    });
    const textoAReproducir = frasesLimpias.join(". ");

    const utterance = new SpeechSynthesisUtterance(textoAReproducir);
    utterance.lang = "en-US";
    utterance.rate = 0.9; // Velocidad 90%

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="chat-container fonetica-chat-container">
      <div className="chat-box fonetica-chat-box">
        <div className="fonetica-header">
          <h2 className="fonetica-header-title">🗣️ Laboratorio de Fonética</h2>
        </div>

        {/* La Tabla Fonética */}
        <h3 className="section-title mt-0">1. Fonemas Individuales</h3>
        <p className="section-description">
          Da click en cualquier fonema para escuchar la pronunciación de cada
          uno de sus ejemplos.
        </p>

        <div className="grid-fonemas">
          {fonemas.map((f) => (
            <div
              key={f.id}
              className="card-fonema"
              onClick={() => handleClickFonema(f.ejemplos)}
            >
              <div className="simbolo-fonema">{f.simbolo}</div>
              <div className="fonema-nombre">{f.nombre}</div>
              <div className="fonema-desc">{f.desc}</div>
              <div className="fonema-ejemplos">Ej: {f.ejemplos.join(", ")}</div>
            </div>
          ))}
        </div>

        {/* La Tabla de Connected Speech */}
        <h3 className="section-title connected-title">
          2. Discurso Conectado (Velocidad Nativa)
        </h3>
        <p className="section-description">
          Cómo los nativos unen, cortan y transforman las palabras por "pereza"
          muscular. Haz click en una regla para escuchar las diferencias a
          velocidad real.
        </p>

        <div className="grid-fonemas">
          {reglas.map((r, i) => (
            <div
              key={i}
              className="card-fonema"
              onClick={() => handleClickConnected(r.ejemplos)}
            >
              <div className="simbolo-fonema connected">{r.regla}</div>
              <div className="fonema-nombre">{r.nombre}</div>
              <div className="fonema-desc">{r.desc}</div>
              <div className="connected-ejemplos">
                {r.ejemplos.map((ej, index) => (
                  <div key={index} className="connected-ejemplo-item">
                    ➔ {ej}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
