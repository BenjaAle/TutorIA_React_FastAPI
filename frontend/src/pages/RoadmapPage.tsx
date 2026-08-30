import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/roadmap.css";
import { auth } from "../firebase";

interface Ejemplo {
  en: string;
  es: string;
}

interface Nodo {
  id: string;
  titulo: string;
  teoria: string;
  ejemplos: Ejemplo[];
  prompt_context: string;
}

interface Nivel {
  id: string;
  titulo: string;
  nodos: Nodo[];
}

interface RoadmapData {
  niveles: Nivel[];
}

export default function RoadmapPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<RoadmapData | null>(null);
  const [progreso, setProgreso] = useState<Record<string, string>>({});
  const [selectedNode, setSelectedNode] = useState<Nodo | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch JSON
      const res = await fetch("http://localhost:8000/roadmap/");
      const d = await res.json();
      setData(d);

      // 2. Fetch User Progress
      const userId = auth.currentUser?.uid || "migrado";
      const resProg = await fetch(
        `http://localhost:8000/roadmap/progreso/${userId}`,
      );
      const prog = await resProg.json();
      setProgreso(prog);
    } catch (error) {
      console.error("Error fetching roadmap:", error);
    }
  };

  const markAsCompleted = async (nodeId: string) => {
    try {
      const userId = auth.currentUser?.uid || "migrado";
      await fetch("http://localhost:8000/roadmap/progreso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          node_id: nodeId,
          status: "completed",
        }),
      });
      setProgreso((prev) => ({ ...prev, [nodeId]: "completed" }));
    } catch (e) {
      console.error("Error saving progress", e);
    }
  };

  const isCompleted = (nodeId: string) => progreso[nodeId] === "completed";

  if (!data)
    return <div style={{ color: "white", padding: 20 }}>Cargando Ruta...</div>;

  return (
    <div className="roadmap-container">
      <div className="roadmap-main">
        <h1 className="roadmap-title">Hoja de Ruta</h1>
        <p className="roadmap-subtitle">
          Sigue tu camino de aprendizaje paso a paso.
        </p>

        {data.niveles.map((nivel) => (
          <div key={nivel.id} className="roadmap-level">
            <h2 className="level-title">{nivel.titulo}</h2>
            <div className="nodes-container">
              {nivel.nodos.map((nodo) => {
                const complete = isCompleted(nodo.id);
                const isSelected = selectedNode?.id === nodo.id;
                return (
                  <div
                    key={nodo.id}
                    className={`roadmap-node ${complete ? "completed" : ""} ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedNode(nodo)}
                  >
                    <div className="node-icon">{complete ? "⭐" : "🔒"}</div>
                    <div className="node-name">{nodo.titulo}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedNode && (
        <div className="roadmap-sidepanel">
          <h3>{selectedNode.titulo}</h3>

          <div className="theory-block">
            <h4>Concepto Clave</h4>
            <p>{selectedNode.teoria}</p>
          </div>

          <div className="examples-block">
            <h4>Ejemplos</h4>
            <ul>
              {selectedNode.ejemplos.map((ej, idx) => (
                <li key={idx}>
                  <strong>{ej.en}</strong>
                  <br />
                  <span>{ej.es}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="action-buttons">
            {!isCompleted(selectedNode.id) && (
              <button
                className="btn-complete"
                onClick={() => markAsCompleted(selectedNode.id)}
              >
                Marcar como Completado
              </button>
            )}

            <button
              className="btn-practice"
              onClick={() => navigate(`/chat?missionId=${selectedNode.id}`)}
              title="Abre el chat preparado para hablar de este tema"
            >
              ¡Practicar en Chat!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
