// src/App.tsx
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import Sidebar from "./components/Sidebar.tsx";
import ChatPage from "./components/ChatPage.tsx";
import HistoriasPage from "./components/HistoriasPage";
import FoneticaPage from "./components/FoneticaPage";
import "./styles/style.css";
import "./styles/chats.css";

// Variable que pasa al navegador y guarda el id del ultimo chat seleccionado
const CHAT_STORAGE_KEY = "selectedChatId";

// Esta funcion se encarga de sincronizar el id del chat con la URL
function ChatRouteSync({
  onSelectChat,
}: {
  onSelectChat: (chatId: number | null) => void;
}) {
  // creo directamente la interfaz de ChatRouteSync
  const navigate = useNavigate(); // Hook que permite navegar entre páginas
  const { chatId } = useParams(); // Hook que permite obtener los parámetros de la URL (lo guarda en chatId)

  useEffect(() => {
    const parsedChatId = Number(chatId);

    // Si no hay id del chat seleccionado, o si el id del chat seleccionado no es un número, navega a la página principal
    if (!chatId || Number.isNaN(parsedChatId)) {
      navigate("/", { replace: true }); // Navega a la página principal
      return;
    }

    onSelectChat(parsedChatId); // Actualiza el estado del chat seleccionado
    // dispara setSelectedChatId(parsedChatId) accionando el useEffect de App.tsx (ie renderizando la pagina)
    navigate("/", { replace: true }); // Navega a la página principal.
    // replace: true para que no pueda volver una pagina atras y caer en un bucle infinito de ir atras a adelante
  }, [chatId, navigate, onSelectChat]);

  return null; // Componente que no renderiza nada, solo sincroniza el estado del chat con la URL
}

import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { Login } from "./components/Login";

// Interceptar fetch GLOBAL para enviar token en Headers siempre
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [resource, config] = args;
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    if (config) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    } else {
      args[1] = { headers: { Authorization: `Bearer ${token}` } };
    }
  }
  return originalFetch(...args);
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Authentication observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [selectedChatId, setSelectedChatId] = useState<number | null>(() => {
    const storedChatId = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!storedChatId) return null;
    const parsedChatId = Number(storedChatId);
    return Number.isNaN(parsedChatId) ? null : parsedChatId;
  });

  useEffect(() => {
    if (selectedChatId === null) {
      window.localStorage.removeItem(CHAT_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(CHAT_STORAGE_KEY, String(selectedChatId));
  }, [selectedChatId]);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1a1a1a",
          color: "white",
        }}
      >
        <h2>Cargando...</h2>
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    return <Login />;
  }

  const MainLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="app-container">
      <Sidebar
        selectedChatId={selectedChatId}
        // Aqui le paso la funcion setSelectedChatId al Sidebar para que pueda seleccionar un chat
        // Se lo paso como prop (le estoy pasando los 2 elementos que pide el props del componente Sidebar)
        onSelectChat={setSelectedChatId}
      />

      {children}
    </div>
  );

  return (
    //BrowserRouter es el componente que permite la navegación entre páginas en React
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <MainLayout>
              {/*Renderiza el chat guardado en el localStorage*/}
              <ChatPage selectedChatId={selectedChatId} />
            </MainLayout>
          }
        />
        <Route
          path="/chat/:chatId"
          element={<ChatRouteSync onSelectChat={setSelectedChatId} />}
        />

        <Route path="/historias" element={<HistoriasPage />} />

        <Route
          path="/fonetica"
          element={
            <MainLayout>
              <FoneticaPage />
            </MainLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
