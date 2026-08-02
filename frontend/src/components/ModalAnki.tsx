import { useState, useEffect } from "react";

// 1. Estructura de una Carta
export interface CartaAnki {
  frente: string;
  reverso: string;
  ejemplo_ingles: string;
  ejemplo_espanol: string;
  termino_imagen: string;
  categoria: string;
}

// 2. Propiedades que nuestro componente espera recibir
interface ModalAnkiProps {
  isOpen: boolean; // ¿El modal está visible u oculto?
  onClose: () => void; // Función para cerrar el modal
  cartasIniciales: CartaAnki[]; // Las cartas que propuso Gemini
  chatId: number; // El ID del chat o historia (0 si es de selección libre)
  onSuccess?: (cartasInyectadas: CartaAnki[]) => void; // Acción opcional al terminar con éxito
  origen?: "chat" | "historia"; // Opcional, para saber si viene de chat o historia
}

const CATEGORIAS_VALIDAS = [
  "Vocabulario",
  "Phrasal Verbs",
  "Falsos Amigos",
  "Verbos Irregulares",
  "Gramatica y Teoria",
  "Expresiones Nativas",
  "Colocaciones",
  "Otros",
];

export default function ModalAnki({
  isOpen,
  onClose,
  cartasIniciales,
  chatId,
  onSuccess,
  origen,
}: ModalAnkiProps) {
  // 3. Estado local para manejar las cartas mientras el usuario las edita o borra
  const [cartas, setCartas] = useState<CartaAnki[]>([]);
  const [injectedLoading, setInjectedLoading] = useState(false);

  // Cuando se abre el modal o cambian las cartas iniciales, cargamos esas cartas al estado
  useEffect(() => {
    setCartas(cartasIniciales);
  }, [cartasIniciales]);

  // Si no está abierto, no renderizamos nada
  if (!isOpen) return null;

  // 4. Función para actualizar un campo específico de una carta
  const handleFieldChange = (
    index: number, // pos. carta en la lista
    campo: keyof CartaAnki, // campo: frente, reverso, ejemplo_ingles, etc.
    valor: string, // valor: el nuevo valor del campo
  ) => {
    setCartas((prev) =>
      prev.map((carta, i) => {
        if (i === index) {
          return { ...carta, [campo]: valor }; // retorno un nuevo objeto con el campo actualizado
        }
        return carta;
      }),
    );
  };

  // 5. Función para eliminar una carta individual de la lista
  // filter pide value, index, pero me quedo solo con index
  const handleEliminarCarta = (index: number) => {
    setCartas((prev) => prev.filter((_, i) => i !== index));
  };

  // 6. Cierre con confirmación de seguridad
  const handleCerrar = () => {
    if (injectedLoading) {
      alert("Por favor espera a que termine la inyección.");
      return; // para que no llegue al onClose()
    }

    if (cartas.length > 0) {
      const confirmar = window.confirm(
        "⚠️ ¿Estás seguro de cerrar? Se perderán las cartas no guardadas.",
      );
      if (!confirmar) return; // si no confirma, no cerrar
    }
    onClose();
  };

  // 7. Enviar y procesar las cartas con el backend
  const handleConfirmarTodo = async () => {
    if (cartas.length === 0) {
      alert("No hay cartas para enviar.");
      return;
    }

    setInjectedLoading(true);

    try {
      const res = await fetch("/inyectar_cartas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, cartas: cartas }),
      });

      // En caso de error, lo capturo con catch y retorno un objeto vacío
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(
          `Error de red: ${data.detail || data.mensaje || "Fallo de conexión"}`,
        );
        return; // Importantísimo: Cortar la ejecución para no destruir las cartas editadas!
      }

      if (
        data.error ||
        (data.mensaje &&
          typeof data.mensaje === "string" &&
          data.mensaje.toLowerCase().includes("error"))
      ) {
        alert(data.error || data.mensaje);
        return;
      }

      alert(data.mensaje || "Cartas procesadas.");

      // Guardar el vocabulario nuevo en la base de datos local para activar el subrayado permanente
      if (origen === "historia") {
        try {
          const palabrasNuevas = cartas.map((c) =>
            c.frente.replace(/\(.*\)/g, "").trim(),
          );
          await fetch("/api/vocabulario", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ palabras: palabrasNuevas }),
          });
        } catch (e) {
          console.error("Error guardando vocabulario en BD local", e);
        }
      }

      // Si nos pasaron una función para actualizar el vocabulario en pantalla, la ejecutamos
      if (onSuccess) {
        onSuccess(cartas);
      }

      onClose(); // Cerramos el modal tras inyectar todo
    } catch (err) {
      alert("Error al conectar o inyectar las cartas.");
      console.error(err);
    } finally {
      setInjectedLoading(false);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>🔍 Revisa tu(s) nueva(s) carta(s)</h3>
          <span className="close-modal" onClick={handleCerrar}>
            &times;
          </span>
        </div>

        <div className="lista-revision">
          {cartas.length === 0 ? (
            <p className="modal-empty-state">No quedan cartas por revisar.</p>
          ) : (
            cartas.map((carta, index) => (
              <div key={index} className="card-revision">
                <span
                  className="delete-card"
                  onClick={() => handleEliminarCarta(index)}
                >
                  ✕ Eliminar
                </span>

                <div className="grid-edit">
                  <div className="field-group">
                    <label>Frente (Concepto)</label>
                    <input
                      type="text"
                      className="edit-frente"
                      value={carta.frente}
                      onChange={(e) =>
                        handleFieldChange(index, "frente", e.target.value)
                      }
                    />
                  </div>

                  <div className="field-group">
                    <label>Categoría</label>
                    <select
                      className="edit-categoria"
                      value={carta.categoria}
                      onChange={(e) =>
                        handleFieldChange(index, "categoria", e.target.value)
                      }
                    >
                      {CATEGORIAS_VALIDAS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group full-width">
                    <label>Reverso (Significado/Definición)</label>
                    <textarea
                      className="edit-reverso"
                      rows={2}
                      value={carta.reverso}
                      onChange={(e) =>
                        handleFieldChange(index, "reverso", e.target.value)
                      }
                    />
                  </div>

                  <div className="field-group">
                    <label>Oración Ejemplo (Inglés)</label>
                    <input
                      type="text"
                      className="edit-ejemplo"
                      value={carta.ejemplo_ingles}
                      onChange={(e) =>
                        handleFieldChange(
                          index,
                          "ejemplo_ingles",
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="field-group">
                    <label>Oración Ejemplo (Español)</label>
                    <input
                      type="text"
                      className="edit-traduccion"
                      value={carta.ejemplo_espanol || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          index,
                          "ejemplo_espanol",
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="field-group">
                    <label>Término para Imagen (Pexels)</label>
                    <input
                      type="text"
                      className="edit-imagen"
                      value={carta.termino_imagen}
                      onChange={(e) =>
                        handleFieldChange(
                          index,
                          "termino_imagen",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="modal-footer">
          <button
            className="confirm-btn"
            onClick={handleConfirmarTodo}
            disabled={injectedLoading || cartas.length === 0}
          >
            {injectedLoading
              ? "🚀 Inyectando a Anki..."
              : "Confirmar e Inyectar a Anki"}
          </button>
        </div>
      </div>
    </div>
  );
}
