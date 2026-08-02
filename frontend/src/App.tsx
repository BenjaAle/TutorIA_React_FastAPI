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
}) { // creo directamente la interfaz de ChatRouteSync
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

function App() {
  // selectedChatId parte siendo null o el id del chat seleccionado, solo que al entregarlo "como una función",
  // se le entregan unas instrucciones para tomar la decisión de que valor inicial tomar.
  // - El return manda: lo que entregue el return, es lo que es el valor inicial
  // si quisiera que retornara una funcion, seria: 
  /*
  const [miCalculadora, setMiCalculadora] = useState(() => {
    // React va a ejecutar esta capa externa y se va a guardar lo que la flecha verde esté apuntando
    return (a: number, b: number) => {
        return a + b;
    };
  });*/
  const [selectedChatId, setSelectedChatId] = useState<number | null>(() => {
    const storedChatId = window.localStorage.getItem(CHAT_STORAGE_KEY); // Obtiene el id del chat seleccionado de la variable CHAT_STORAGE_KEY

    if (!storedChatId) return null; // Si no hay id del chat seleccionado, devuelve null

    const parsedChatId = Number(storedChatId); // Convierte el id del chat seleccionado a número
    return Number.isNaN(parsedChatId) ? null : parsedChatId; // Si el id del chat seleccionado no es un número, devuelve null
  });

  useEffect(() => {
    if (selectedChatId === null) {
      window.localStorage.removeItem(CHAT_STORAGE_KEY); // Elimina el id del chat seleccionado de la variable CHAT_STORAGE_KEY
      return;
    }

    window.localStorage.setItem(CHAT_STORAGE_KEY, String(selectedChatId)); // Guarda el id del chat seleccionado en la variable CHAT_STORAGE_KEY
  }, [selectedChatId]); // Se ejecuta cuando el id del chat seleccionado cambia

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
