import { useState, useEffect, useLayoutEffect, useRef } from "react";
import ModalAnki, { type CartaAnki } from "../components/ModalAnki";

// Los mensajes tienen un rol y un texto
interface Mensaje {
  rol: "user" | "bot";
  texto: string;
}

// -selectedChatId: Es el ID del chat que se está mostrando
interface ChatPageProps {
  selectedChatId: number | null;
}

export default function ChatPage({ selectedChatId }: ChatPageProps) {
  const [prevChatId, setPrevChatId] = useState(selectedChatId);

  // Estados
  const [isModalOpen, setIsModalOpen] = useState(false);

  // almacena arreglo de cartas para enviar a anki
  const [cartasPropuestas, setCartasPropuestas] = useState<CartaAnki[]>([]);
  const [cargandoAnki, setCargandoAnki] = useState(false);

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [inputTexto, setInputTexto] = useState("");

  // La IA esta escribiendo
  const [isEscribiendo, setIsEscribiendo] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(
    () => selectedChatId !== null,
  );

  // Sincronizar estado cuando se cambia de chat antes de que React dibuje el DOM (para evitar parpadeos)
  // Si son diferentes es porque cambié de chat
  if (selectedChatId !== prevChatId) {
    setPrevChatId(selectedChatId); // El prox renderizado es el nuevo chat
    setMensajes([]); // vacio los mensajes del chat anterior
    setInputTexto(""); // vacio el input
    setIsEscribiendo(false); // la IA no esta escribiendo
    setCargandoHistorial(!!selectedChatId); // cargando historial
  }

  /* 3. Referencias (Para manipular elementos físicos del DOM)
  Es como el document.getElementById().
  Le pone un puntero a ese div para poder manipularlo (ej: hacer scroll hacia abajo)*/
  const chatBoxRef = useRef<HTMLDivElement>(null); // Scroll
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Autoajustar altura

  // 4. Transformar Markdown a HTML
  const formatearMarkdown = (texto: string) => {
    // Se anulan <> para evitar inyeccion
    let html = texto
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Captura todo despues de los # (lo almacena en $1) y lo convierte en titulo
    html = html.replace(/^###### (.*$)/gim, "<h6>$1</h6>");
    html = html.replace(/^##### (.*$)/gim, "<h5>$1</h5>");
    html = html.replace(/^#### (.*$)/gim, "<h4>$1</h4>");
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // (^|\n) captura el inicio de una linea o un salto de linea
    // \s*[\*-]\s+ captura un asterisco o guion rodeado de espacios
    // $1 es el grupo capturado por (^|\n)
    // • es el bullet point que se inserta
    html = html.replace(/(^|\n)\s*[\*-]\s+/g, "$1• ");

    // Transforma los **texto** y *texto* en negrita y cursiva respectivamente
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Transforma los saltos de linea en <br>
    html = html.replace(/\n/g, "<br>");

    // Elimina los <br> que quedan despues de los titulos
    html = html.replace(/<\/h[1-6]><br>/g, (match) =>
      match.replace("<br>", ""),
    );
    return html;
  };

  // 5. Cargar historial cuando el chatId cambie
  useEffect(() => {
    if (!selectedChatId) {
      return;
    }

    // Cancela esta carga si el usuario cambia otra vez de chat.
    const controlador = new AbortController();

    const cargarHistorial = async () => {
      try {
        const res = await fetch(`/chats/${selectedChatId}/mensajes`, {
          signal: controlador.signal,
        });

        if (!res.ok) {
          throw new Error(`No se pudo cargar el chat ${selectedChatId}`);
        }

        const data = await res.json();

        if (controlador.signal.aborted) return;

        if (data.length === 0) {
          setMensajes([
            {
              rol: "bot",
              texto:
                "¡Hello! Soy tu tutor de inglés. ¿De qué hablaremos en esta sesión? 🚀",
            },
          ]);
        } else {
          setMensajes(data);
        }
      } catch (error) {
        if (controlador.signal.aborted) return;
        console.error("Error cargando historial", error);
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoHistorial(false);
        }
      }
    };

    cargarHistorial();

    return () => controlador.abort();
  }, [selectedChatId]); // Se ejecuta cuando una de las variables dentro de [] cambia su valor

  // 6. Efecto para auto-scroll hacia abajo cada vez que haya nuevos mensajes
  useLayoutEffect(() => {
    // current es la referencia al div del chat. Verificamos que exista antes del scroll
    // Al usar useLayoutEffect en lugar de useEffect, React cambia el scroll ANTES
    // de que el navegador dibuje en pantalla, evitando el parpadeo de ver el inicio del chat.
    if (chatBoxRef.current) {
      // scrollHeight es la altura total del contenido, scrollTop es la posición actual del scroll
      // de esta forma, se va altiro al final del chat.
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [mensajes, isEscribiendo]);

  /* 7. Autoajustar altura del textarea
  El evento "e" que recibo es porque alguien modificó un textarea
  */
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputTexto(e.target.value);
    if (textareaRef.current) {
      // Por si el usuario borra texto, primero reseteo la altura
      textareaRef.current.style.height = "auto";
      // Luego ajusto la altura al scrollHeight, que es la altura del contenido
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // 8. Enviar Mensaje
  const enviarMensaje = async () => {
    if (!selectedChatId || inputTexto.trim() === "") return;

    const nuevoMensaje: Mensaje = { rol: "user", texto: inputTexto.trim() };

    // Agregamos el mensaje del usuario inmediatamente a la pantalla
    // prev es la lista de mensajes que ya estaban en pantalla, y le agregamos el nuevo al final
    // ...prev es el spread operator, que toma todos los elementos de prev y los agrega al nuevo array
    setMensajes((prev) => [...prev, nuevoMensaje]);
    setInputTexto("");
    setIsEscribiendo(true); // Mostrar "Escribiendo..."

    // Restaurar altura del textarea
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // pasar la id como entero
        body: JSON.stringify({
          texto: nuevoMensaje.texto,
          chat_id: selectedChatId,
        }),
      });
      const data = await res.json();

      // Quitar "Escribiendo..." y agregar la respuesta del bot
      setMensajes((prev) => [...prev, { rol: "bot", texto: data.respuesta }]);
    } catch (error) {
      setMensajes((prev) => [...prev, { rol: "bot", texto: "Error de red." }]);
    } finally {
      setIsEscribiendo(false); // quitar "Escribiendo..."
    }
  };

  // 9. Manejar la tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Evita el salto de línea
      enviarMensaje();
    }
  };

  const extraerAAnki = async () => {
    if (!selectedChatId) return;

    setCargandoAnki(true);
    try {
      const res = await fetch("/proponer_cartas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: selectedChatId }),
      });
      const data = await res.json();

      if (data.error) {
        alert(data.error);
      } else if (!data.cartas || data.cartas.length === 0) {
        alert("🤷‍♂️ Gemini no encontró vocabulario nuevo para extraer.");
      } else {
        setCartasPropuestas(data.cartas);
        setIsModalOpen(true); // Abre el modal con las cartas
      }
    } catch (err) {
      alert("Error de conexión al extraer las cartas.");
    } finally {
      setCargandoAnki(false);
    }
  };

  // Si no hay ningún chat seleccionado (pantalla inicial)
  if (!selectedChatId) {
    return (
      <div className="chat-container empty-state">
        <h2 className="chat-empty-title">
          Selecciona o crea un chat para comenzar
        </h2>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="header">
        <h2>Tutor IA</h2>
        <button
          className="anki-btn"
          onClick={extraerAAnki}
          disabled={cargandoAnki}
        >
          {cargandoAnki ? "⏳ Analizando chat..." : "Extraer a Anki"}
        </button>
      </div>

      {/*ref sirve para mover el scroll de ese div*/}
      <div className="chat-box" ref={chatBoxRef}>
        {cargandoHistorial ? (
          <p className="chat-loading">Cargando conversación…</p>
        ) : (
          mensajes.map((msg, idx) => (
            //class "message user" o "message bot" según el rol
            <div key={idx} className={`message ${msg.rol}`}>
              {msg.rol === "bot" ? (
                /* React obliga a usar dangerouslySetInnerHTML para inyectar HTML puro por seguridad
                 *__html es el HTML que se va a inyectar, y se escribe asi para que no pase piola */
                <div
                  dangerouslySetInnerHTML={{
                    __html: formatearMarkdown(msg.texto),
                  }}
                />
              ) : (
                // Texto plano para el usuario para evitar XSS
                msg.texto
              )}
            </div>
          ))
        )}

        {isEscribiendo && (
          <div className="message bot">
            <i>Escribiendo...</i>
          </div>
        )}
      </div>

      <div className="input-area">
        <textarea
          ref={textareaRef}
          value={inputTexto}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje aquí... (Shift + Enter para salto de línea)"
          rows={1} //la caja parte con tamaño de 1 linea
        />
        <button className="send-btn" onClick={enviarMensaje}>
          Enviar
        </button>
      </div>

      <ModalAnki
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cartasIniciales={cartasPropuestas}
        chatId={selectedChatId}
        origen="chat"
      />
    </div>
  );
}
