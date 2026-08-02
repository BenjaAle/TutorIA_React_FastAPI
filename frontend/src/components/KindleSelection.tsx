import { useState, useEffect } from "react";

// 🪄 Componente Aislado para manejar la selección sin re-renderizar HistoriasPage
const KindleSelection = ({
  onRequestAnki,
}: {
  onRequestAnki: (palabra: string, contexto: string) => void;
}) => {
  const [seleccion, setSeleccion] = useState<{
    palabra: string;
    contexto: string;
    rect: DOMRect;
  } | null>(null);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Ignorar clicks dentro del boton flotante
      if ((e.target as HTMLElement).closest(".floating-anki-btn")) return;

      const selection = window.getSelection();
      const texto = selection?.toString().trim() || "";
      const lineaCercana = (e.target as HTMLElement).closest(".story-line");

      if (texto.length > 0 && lineaCercana) {
        const contexto =
          lineaCercana.querySelector(".text-en")?.textContent || "";
        const range = selection!.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSeleccion({ palabra: texto, contexto, rect });
      } else {
        setSeleccion(null);
      }
    };

    const hideBtn = () => setSeleccion(null);

    document.addEventListener("mouseup", handleMouseUp);
    // true for capture phase to catch internal scroll of story-board
    window.addEventListener("scroll", hideBtn, true);
    window.addEventListener("resize", hideBtn);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("scroll", hideBtn, true);
      window.removeEventListener("resize", hideBtn);
    };
  }, []);

  if (!seleccion || !seleccion.rect) return null;

  return (
    <div
      className="floating-anki-btn"
      style={{
        top: `${seleccion.rect.top - 40}px`,
        left: `${seleccion.rect.left + seleccion.rect.width / 2 - 40}px`,
      }}
      onMouseDown={(e) => e.stopPropagation()} // Evita que se pierda la selección nativa al darle click
      onClick={(e) => {
        e.stopPropagation();
        onRequestAnki(seleccion.palabra, seleccion.contexto);
        setSeleccion(null);
      }}
    >
      🪄 + Anki
    </div>
  );
};

export default KindleSelection;
