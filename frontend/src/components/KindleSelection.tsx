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
    let timeoutId: ReturnType<typeof setTimeout>;

    const checkSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setSeleccion(null);
        return;
      }

      const texto = selection.toString().trim();

      // Obtener nodo donde ocurrió la selección
      const anchorNode = selection.anchorNode;
      if (!anchorNode || !anchorNode.parentElement) {
        setSeleccion(null);
        return;
      }

      const lineaCercana = anchorNode.parentElement.closest(".story-line");

      // Validar que no sea vacío y esté dentro de una línea de cuento
      if (texto.length > 0 && lineaCercana) {
        const contexto =
          lineaCercana.querySelector(".text-en")?.textContent || "";
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Evitar que el botón traspase la botonera superior (menú)
        const headerControls = document.querySelector(".story-controls");
        if (headerControls) {
          const headerRect = headerControls.getBoundingClientRect();
          // Si el texto seleccionado sube por encima del borde inferior del header, ocultamos
          if (rect.top < headerRect.bottom) {
            setSeleccion(null);
            return;
          }
        }

        setSeleccion({ palabra: texto, contexto, rect });
      } else {
        setSeleccion(null);
      }
    };

    const handleSelectionChange = () => {
      // Debounce para evitar sobrecargar a React mientras arrastra el dedo en mobile
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(checkSelection, 50);
    };

    // Usar selectionchange es el único método 100% nativo confiable en iOS/Android
    document.addEventListener("selectionchange", handleSelectionChange);

    // Al hacer scroll o resize, recalculamos la posicion en lugar de ocultarlo
    window.addEventListener("scroll", handleSelectionChange, true);
    window.addEventListener("resize", handleSelectionChange);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("selectionchange", handleSelectionChange);
      window.removeEventListener("scroll", handleSelectionChange, true);
      window.removeEventListener("resize", handleSelectionChange);
    };
  }, []);

  if (!seleccion || !seleccion.rect) return null;

  // Determine if it is a mobile viewport to swap the top/bottom placement to avoid OS native menus
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  return (
    <div
      className="floating-anki-btn"
      style={{
        top: isMobile
          ? `${seleccion.rect.bottom + 15}px`
          : `${seleccion.rect.top - 40}px`,
        left: `${seleccion.rect.left + seleccion.rect.width / 2 - 40}px`,
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
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
