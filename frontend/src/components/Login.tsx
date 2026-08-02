import React, { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import "../styles/login.css";

export const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>📚 Tutor de Inglés AI</h1>
        <p>Inicia sesión para continuar con tu aprendizaje.</p>
        <button className="google-btn" onClick={handleGoogleLogin}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google Logo"
            className="google-icon"
          />
          Ingresar con Google
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
};
