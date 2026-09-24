import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { ApiError } from "../../lib/api";
import { useModalDialog } from "../../lib/useModalDialog";
import { useAuth } from "./AuthContext";
import {
  confirmPasswordReset,
  register,
  requestPasswordReset,
  resendVerification,
  verifyEmail,
} from "./auth-api";

type Mode = "login" | "register" | "verify" | "forgot" | "reset";

const RESEND_COOLDOWN_SECONDS = 60;

const headings: Record<Mode, { eyebrow: string; title: string }> = {
  login: { eyebrow: "Bem-vindo de volta", title: "Entre na sua conta" },
  register: { eyebrow: "Sua memória de compras", title: "Crie sua conta" },
  verify: { eyebrow: "Falta pouco", title: "Confirme seu e-mail" },
  forgot: { eyebrow: "Recuperar acesso", title: "Esqueceu a senha?" },
  reset: { eyebrow: "Recuperar acesso", title: "Crie uma nova senha" },
};

interface AuthPanelProps {
  onClose(): void;
}

export function AuthPanel({ onClose }: AuthPanelProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, signInWithToken } = useAuth();
  const { dialogRef, onKeyDown } = useModalDialog(onClose);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function changeMode(nextMode: Mode, message = "") {
    setMode(nextMode);
    setError("");
    setNotice(message);
    setCode("");
  }

  function describe(caught: unknown) {
    return caught instanceof ApiError ? caught.message : "Não foi possível concluir. Tente novamente.";
  }

  async function run(action: () => Promise<void>) {
    setError("");
    setIsSubmitting(true);
    try {
      await action();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "email_not_verified") {
        changeMode("verify", "Confirme seu e-mail com o código que enviamos. Se ele expirou, peça um novo.");
      } else {
        setError(describe(caught));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      if (mode === "login") {
        await signIn(email, password);
        onClose();
      } else if (mode === "register") {
        const user = await register({ name, email, password });
        // API anterior à confirmação não envia o campo: a conta já nasce ativa.
        if (user.email_verified !== false) {
          await signIn(email, password);
          onClose();
          return;
        }
        setCooldown(RESEND_COOLDOWN_SECONDS);
        changeMode("verify", `Enviamos um código de 6 dígitos para ${email}.`);
      } else if (mode === "verify") {
        const response = await verifyEmail(email, code);
        signInWithToken(response.access_token);
        onClose();
      } else if (mode === "forgot") {
        await requestPasswordReset(email);
        setCooldown(RESEND_COOLDOWN_SECONDS);
        changeMode("reset", `Se existir uma conta com ${email}, enviamos um código de 6 dígitos.`);
      } else {
        await confirmPasswordReset(email, code, newPassword);
        await signIn(email, newPassword);
        onClose();
      }
    });
  }

  function resendCode() {
    void run(async () => {
      if (mode === "verify") await resendVerification(email);
      else await requestPasswordReset(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice("Se o e-mail estiver correto, um novo código chegará em instantes. O anterior deixou de valer.");
    });
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextMode = mode === "login" ? "register" : "login";
    changeMode(nextMode);
    document.getElementById(`auth-tab-${nextMode}`)?.focus();
  }

  const showsTabs = mode === "login" || mode === "register";
  const needsCode = mode === "verify" || mode === "reset";
  const submitLabel = {
    login: "Entrar",
    register: "Criar conta",
    verify: "Confirmar e entrar",
    forgot: "Enviar código",
    reset: "Salvar nova senha",
  }[mode];

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
        <p className="eyebrow">{headings[mode].eyebrow}</p>
        <h2 id="auth-title">{headings[mode].title}</h2>
        {showsTabs && (
          <div className="authTabs" role="tablist" aria-label="Acesso">
            <button id="auth-tab-login" role="tab" aria-selected={mode === "login"} aria-controls="auth-tabpanel" tabIndex={mode === "login" ? 0 : -1} type="button" className={mode === "login" ? "active" : ""} onKeyDown={handleTabKeyDown} onClick={() => changeMode("login")}>
              Entrar
            </button>
            <button id="auth-tab-register" role="tab" aria-selected={mode === "register"} aria-controls="auth-tabpanel" tabIndex={mode === "register" ? 0 : -1} type="button" className={mode === "register" ? "active" : ""} onKeyDown={handleTabKeyDown} onClick={() => changeMode("register")}>
              Cadastrar
            </button>
          </div>
        )}
        {notice && <p className="authNotice" role="status">{notice}</p>}
        <form
          id="auth-tabpanel"
          className="authForm"
          role={showsTabs ? "tabpanel" : undefined}
          aria-labelledby={showsTabs ? `auth-tab-${mode}` : "auth-title"}
          onSubmit={handleSubmit}
        >
          {mode === "register" && (
            <label>
              Nome público
              <input autoComplete="name" minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
          )}
          {(mode === "login" || mode === "register" || mode === "forgot") && (
            <label>
              E-mail
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
          )}
          {(mode === "login" || mode === "register") && (
            <label>
              Senha
              <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 15 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
          )}
          {mode === "register" && <small>A senha deve ter entre 15 e 128 caracteres.</small>}
          {needsCode && (
            <label>
              Código de 6 dígitos
              <input
                className="codeInput"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                required
              />
            </label>
          )}
          {mode === "reset" && (
            <>
              <label>
                Nova senha
                <input type="password" autoComplete="new-password" minLength={15} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
              </label>
              <small>Entre 15 e 128 caracteres. Sessões abertas em outros aparelhos serão encerradas.</small>
            </>
          )}
          {error && <p className="formError" role="alert">{error}</p>}
          <button className="primaryButton" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Aguarde..." : submitLabel}
          </button>
          {needsCode && (
            <button className="linkButton" type="button" disabled={isSubmitting || cooldown > 0} onClick={resendCode}>
              {cooldown > 0 ? `Reenviar código em ${cooldown} s` : "Reenviar código"}
            </button>
          )}
          {mode === "login" && (
            <button className="linkButton" type="button" onClick={() => changeMode("forgot")}>
              Esqueci minha senha
            </button>
          )}
          {!showsTabs && (
            <button className="linkButton" type="button" onClick={() => changeMode("login")}>
              Voltar para entrar
            </button>
          )}
        </form>
      </section>
    </div>
  );
}
