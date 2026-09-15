import { FormEvent, KeyboardEvent, useState } from "react";
import { ApiError } from "../../lib/api";
import { useModalDialog } from "../../lib/useModalDialog";
import { useAuth } from "./AuthContext";
import { register } from "./auth-api";

type Mode = "login" | "register";

interface AuthPanelProps {
  onClose(): void;
}

export function AuthPanel({ onClose }: AuthPanelProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
  const { dialogRef, onKeyDown } = useModalDialog(onClose);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        await register({ name, email, password });
      }
      await signIn(email, password);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível concluir. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextMode = mode === "login" ? "register" : "login";
    changeMode(nextMode);
    document.getElementById(`auth-tab-${nextMode}`)?.focus();
  }

  return (
    <div className="authBackdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="authPanel"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="auth-title"
        onKeyDown={onKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="closeButton" type="button" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <p className="eyebrow">{mode === "login" ? "Bem-vindo de volta" : "Sua memória de compras"}</p>
        <h2 id="auth-title">{mode === "login" ? "Entre na sua conta" : "Crie sua conta"}</h2>

        <div className="authTabs" role="tablist" aria-label="Acesso">
          <button id="auth-tab-login" role="tab" aria-selected={mode === "login"} aria-controls="auth-tabpanel" tabIndex={mode === "login" ? 0 : -1} type="button" className={mode === "login" ? "active" : ""} onKeyDown={handleTabKeyDown} onClick={() => changeMode("login")}>
            Entrar
          </button>
          <button id="auth-tab-register" role="tab" aria-selected={mode === "register"} aria-controls="auth-tabpanel" tabIndex={mode === "register" ? 0 : -1} type="button" className={mode === "register" ? "active" : ""} onKeyDown={handleTabKeyDown} onClick={() => changeMode("register")}>
            Cadastrar
          </button>
        </div>

        <form id="auth-tabpanel" className="authForm" role="tabpanel" aria-labelledby={`auth-tab-${mode}`} onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Nome público
              <input
                autoComplete="name"
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
          )}
          <label>
            E-mail
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "register" ? 15 : 1}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {mode === "register" && (
            <small>A senha deve ter entre 15 e 128 caracteres.</small>
          )}
          {error && <p className="formError" role="alert">{error}</p>}
          <button className="primaryButton" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
          </button>
        </form>
      </section>
    </div>
  );
}
