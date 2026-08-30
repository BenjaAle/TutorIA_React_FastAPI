import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"; // link equivale a <a> pero sin recargar la página

// Los chats tienen id y titulo
interface Chat {
  id: number;
  titulo: string;
}

// - selectedChatId es el id del chat seleccionado
// - onSelectChat es una funcion que se ejecuta cuando se selecciona un chat
//   Recibe el id del chat seleccionado y no devuelve nada
interface SidebarProps {
  selectedChatId: number | null;
  onSelectChat: (chatId: number | null) => void;
}

// desestructuro las props para usar las vars directamente
export default function Sidebar({
  selectedChatId,
  onSelectChat,
}: SidebarProps) {
  const navigate = useNavigate();
  // Mobile toggle state
  const [isMobileOpen, setIsMobileOpenState] = useState(
    () => localStorage.getItem("sidebarOpen") === "true",
  );
  const setIsMobileOpen = (open: boolean) => {
    setIsMobileOpenState(open);
    localStorage.setItem("sidebarOpen", open ? "true" : "false");
  };

  // Saber si estamos en la página de chats para alternar el botón principal
  const location = useLocation();
  const isChatPage = location.pathname === "/";

  /*2. Estados (Variables que, al cambiar, redibujan la pantalla)
  Cada vez que un estado cambia, React vuelve a dibujar el componente (Sidebar en este caso).

  const [variable, funcionParaActualizar] = useState(valorInicial)
  useState devuelve un arreglo de dos elementos:
  - variable guarda el valor actual, y - funcionParaActualizar lo cambia y redibuja la pantalla
  funcionParaActualizar es una funcion prefabricada por React, no la define uno

  2.1. Estados para la lista de chats
  - chats: arreglo de chats que vienen de FastAPI
  - mostrarFormulario: booleano que indica si se muestra el formulario para crear un nuevo chat
  - nuevoTitulo: string que guarda el título del nuevo chat que se va a crear */

  const [chats, setChats] = useState<Chat[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");

  /* 2.2. Estados para la edición de un chat existente
  - editandoId: guarda el id (number) del chat que se está editando, o null si no se está editando ninguno*/
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [tituloEditado, setTituloEditado] = useState("");

  // 3. funcion para cargar los chats cuando el componente aparece en pantalla
  const cargarChats = async () => {
    try {
      const res = await fetch("/chats");
      const data = await res.json(); // lo transformo a json
      setChats(data); // Actualizo el estado de los chats con la data
    } catch (error) {
      console.error("Error cargando chats:", error);
    }
  };

  // useEffect le dice a React "Haz esto después de dibujar el componente en pantalla"
  // se usa [] para que solo se ejecute una vez (cuando aparece el componente), y no cada vez que se redibuja
  // si la variable que está dentro del arreglo cambia, se vuelve a ejecutar el useEffect, en este caso, no hay variables
  // Los useEffect siempre se ejecutan después de que el componente se dibuja en pantalla
  useEffect(() => {
    cargarChats();
  }, []);

  // 4. Funciones de interacción con FastAPI: crear, eliminar y guardar edición de chats
  const crearChat = async () => {
    if (!nuevoTitulo.trim()) return; // si el titulo está vacío (solo espacios), no hago nada

    await fetch("/crear_chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: nuevoTitulo }),
    });

    setNuevoTitulo(""); // Limpio el input para un segundo futuro chat nuevo
    setMostrarFormulario(false); // fue verdadero para crear el chat, ahora vuelve a ser falso
    cargarChats(); // Volvemos a pedir la lista para que aparezca el nuevo chat
  };

  const eliminarChat = async (id: number) => {
    await fetch(`/chats/${id}`, { method: "DELETE" });

    // si se borra el chat seleccionado, se deselecciona
    if (selectedChatId === id) {
      onSelectChat(null);
    }

    cargarChats(); // actualizo la lista
  };

  // Tomo un objeto { titulo: "Titulo del chat" } y lo convierto en string con forma JSON
  const guardarEdicion = async (id: number) => {
    if (tituloEditado.trim()) {
      await fetch(`/chats/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: tituloEditado }),
      });
    }
    setEditandoId(null); // vuelvo a poner null para que no se muestre el input de edición
    cargarChats(); // actualizo la lista
  };

  return (
    <>
      <button
        className={`mobile-menu-btn ${isMobileOpen ? "hidden" : ""}`}
        onClick={() => setIsMobileOpen(true)}
      >
        ☰
      </button>
      {isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}
      <div className={`sidebar ${isMobileOpen ? "open" : ""}`}>
        <div className="sidebar-actions">
          {/* if: Si no mostramos el formulario, mostramos los botones de nuevo chat, historias, etc */}
          {!mostrarFormulario ? (
            <>
              {isChatPage ? (
                <button
                  className="new-chat-btn btn-compact"
                  onClick={() => setMostrarFormulario(true)}
                >
                  + Nuevo Chat
                </button>
              ) : (
                <Link to="/" className="sidebar-link">
                  <button className="new-chat-btn btn-compact btn-back">
                    💬 Volver al Chat
                  </button>
                </Link>
              )}

              <Link to="/roadmap" className="sidebar-link">
                <button className="new-chat-btn btn-compact">
                  🗺️ Ruta Guiada
                </button>
              </Link>

              {/* Link reemplaza a las etiquetas <a> para navegar sin recargar la página */}
              <Link to="/historias" className="sidebar-link">
                <button className="new-chat-btn btn-compact btn-historias">
                  📚 Historias IA
                </button>
              </Link>

              <Link to="/fonetica" className="sidebar-link">
                <button className="new-chat-btn btn-compact btn-fonetica">
                  🗣️ Fonética
                </button>
              </Link>

              <Link to="/cloze" className="sidebar-link">
                <button className="new-chat-btn btn-compact">
                  🧩 Ejercicios
                </button>
              </Link>
            </>
          ) : (
            /* Formulario para nuevo chat */
            <div className="new-chat-form">
              <input
                type="text"
                placeholder="Nombre del chat..."
                className="new-chat-input"
                // con cada tecleo, se actualiza el componente y tecnicamente se actualiza todo el sidebar
                // pero por el virtualDOM, solo se actualiza el input (unica diferencia)
                value={nuevoTitulo} // inicialmente es ""
                onChange={(e) => setNuevoTitulo(e.target.value)} // Actualizo nuevoTitulo con cada tecleo
                onKeyDown={(e) => e.key === "Enter" && crearChat()} // Si presiono Enter, creo el chat
                autoFocus // Indica que el cursor este dentro del input listo para escribir
              />
              <div className="new-chat-actions">
                <button className="new-chat-action confirm" onClick={crearChat}>
                  Crear
                </button>
                <button
                  className="new-chat-action cancel"
                  onClick={() => setMostrarFormulario(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="chat-list">
          {/* Recorremos el arreglo de chats y dibujamos un div por cada uno */}
          {isChatPage &&
            chats.map((chat) => (
              // key es para identificar cada elemento de la lista y que React no se confunda al redibujar
              <div
                key={chat.id}
                className={`chat-item ${selectedChatId === chat.id ? "active" : ""}`}
                onClick={() => {
                  onSelectChat(chat.id);
                  setIsMobileOpen(false);
                  navigate("/");
                }}
                role="button" // Indica que el div se comporta como un boton
                // No hago un boton directamente para no tener un boton dentro de otro boton (eliminar y renombrar)
                tabIndex={0} // navegable con el tab
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onSelectChat(chat.id);
                    setIsMobileOpen(false);
                    navigate("/");
                  }
                }}
              >
                {/* Si estamos editando este chat, mostramos un input, si no, mostramos el título */}
                {editandoId === chat.id ? (
                  <input
                    type="text"
                    value={tituloEditado}
                    onChange={(e) => setTituloEditado(e.target.value)}
                    onBlur={() => guardarEdicion(chat.id)} // Guarda los cambios al clicear fuera del input
                    onKeyDown={(e) =>
                      e.key === "Enter" && guardarEdicion(chat.id)
                    }
                    autoFocus
                    className="edit-chat-input"
                  />
                ) : (
                  <span className="chat-item-title">{chat.titulo}</span> //span solo contiene el nombre del chat
                )}

                <div className="chat-item-actions">
                  <button
                    className="action-btn"
                    title="Renombrar"
                    onClick={(e) => {
                      e.stopPropagation(); // Evita que se propague el evento al div padre y se seleccione el chat
                      setEditandoId(chat.id);
                      setTituloEditado(chat.titulo); // guardo el titulo actual en el input
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    className="action-btn"
                    title="Eliminar"
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminarChat(chat.id);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
