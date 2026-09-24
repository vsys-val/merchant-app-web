import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../lib/api";
import { AuthPanel } from "./AuthPanel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signInWithToken: vi.fn(),
  register: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
}));

vi.mock("./AuthContext", () => ({
  useAuth: () => ({ signIn: mocks.signIn, signInWithToken: mocks.signInWithToken }),
}));

vi.mock("./auth-api", () => ({
  register: mocks.register,
  verifyEmail: mocks.verifyEmail,
  resendVerification: mocks.resendVerification,
  requestPasswordReset: mocks.requestPasswordReset,
  confirmPasswordReset: mocks.confirmPasswordReset,
}));

const EMAIL = "ana@example.com";
const PASSWORD = "frase secreta exclusiva";

describe("AuthPanel account flows", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onClose = vi.fn();

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<AuthPanel onClose={onClose} />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  function input(label: string) {
    const element = Array.from(container.querySelectorAll("label"))
      .find((candidate) => candidate.textContent?.startsWith(label))
      ?.querySelector("input");
    if (!element) throw new Error(`Campo ${label} não encontrado`);
    return element;
  }

  function fill(label: string, value: string) {
    const element = input(label);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function button(text: string) {
    const found = Array.from(container.querySelectorAll("button")).find((candidate) => candidate.textContent?.startsWith(text));
    if (!found) throw new Error(`Botão ${text} não encontrado`);
    return found;
  }

  async function click(text: string) {
    await act(async () => button(text).click());
  }

  async function submit() {
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  }

  const heading = () => container.querySelector("h2")?.textContent;

  it("asks for the emailed code after registration and signs in with it", async () => {
    mocks.register.mockResolvedValue({ id: 1, name: "Ana", email: EMAIL, email_verified: false });
    mocks.verifyEmail.mockResolvedValue({ access_token: "verified-token" });

    await click("Cadastrar");
    fill("Nome público", "Ana");
    fill("E-mail", EMAIL);
    fill("Senha", PASSWORD);
    await submit();

    expect(heading()).toBe("Confirme seu e-mail");
    expect(container.textContent).toContain(`Enviamos um código de 6 dígitos para ${EMAIL}.`);
    expect(mocks.signIn).not.toHaveBeenCalled();

    fill("Código de 6 dígitos", "48a2913");
    expect(input("Código de 6 dígitos").value).toBe("482913");
    await submit();

    expect(mocks.verifyEmail).toHaveBeenCalledWith(EMAIL, "482913");
    expect(mocks.signInWithToken).toHaveBeenCalledWith("verified-token");
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the previous flow when the API creates accounts already confirmed", async () => {
    mocks.register.mockResolvedValue({ id: 1, name: "Ana", email: EMAIL, email_verified: true });

    await click("Cadastrar");
    fill("Nome público", "Ana");
    fill("E-mail", EMAIL);
    fill("Senha", PASSWORD);
    await submit();

    expect(mocks.signIn).toHaveBeenCalledWith(EMAIL, PASSWORD);
    expect(onClose).toHaveBeenCalled();
  });

  it("sends an unconfirmed login to the code step", async () => {
    mocks.signIn.mockRejectedValue(
      new ApiError("Confirme seu e-mail com o código enviado antes de entrar.", 403, "email_not_verified"),
    );

    fill("E-mail", EMAIL);
    fill("Senha", PASSWORD);
    await submit();

    expect(heading()).toBe("Confirme seu e-mail");
    expect(container.querySelector("[role='alert']")).toBeNull();
    expect(button("Reenviar código").disabled).toBe(false);
  });

  it("limits code resends to one per minute", async () => {
    vi.useFakeTimers();
    mocks.register.mockResolvedValue({ id: 1, name: "Ana", email: EMAIL, email_verified: false });
    mocks.resendVerification.mockResolvedValue(undefined);

    await click("Cadastrar");
    fill("Nome público", "Ana");
    fill("E-mail", EMAIL);
    fill("Senha", PASSWORD);
    await submit();

    expect(button("Reenviar código").disabled).toBe(true);
    expect(button("Reenviar código").textContent).toBe("Reenviar código em 60 s");

    for (let second = 0; second < 60; second += 1) {
      await act(async () => vi.advanceTimersByTime(1000));
    }
    expect(button("Reenviar código").disabled).toBe(false);

    await click("Reenviar código");
    expect(mocks.resendVerification).toHaveBeenCalledWith(EMAIL);
    expect(button("Reenviar código").disabled).toBe(true);
  });

  it("resets the password with the emailed code and signs in with the new one", async () => {
    mocks.requestPasswordReset.mockResolvedValue(undefined);
    mocks.confirmPasswordReset.mockResolvedValue(undefined);
    mocks.signIn.mockResolvedValue(undefined);

    await click("Esqueci minha senha");
    expect(heading()).toBe("Esqueceu a senha?");
    fill("E-mail", EMAIL);
    await submit();

    expect(heading()).toBe("Crie uma nova senha");
    expect(container.textContent).toContain(`Se existir uma conta com ${EMAIL}, enviamos um código de 6 dígitos.`);

    fill("Código de 6 dígitos", "771204");
    fill("Nova senha", "outra frase secreta longa");
    await submit();

    expect(mocks.confirmPasswordReset).toHaveBeenCalledWith(EMAIL, "771204", "outra frase secreta longa");
    expect(mocks.signIn).toHaveBeenCalledWith(EMAIL, "outra frase secreta longa");
    expect(onClose).toHaveBeenCalled();
  });

  it("explains when email delivery is unavailable", async () => {
    mocks.requestPasswordReset.mockRejectedValue(
      new ApiError("O envio de e-mails está temporariamente indisponível.", 503, "email_unavailable"),
    );

    await click("Esqueci minha senha");
    fill("E-mail", EMAIL);
    await submit();

    expect(heading()).toBe("Esqueceu a senha?");
    expect(container.querySelector("[role='alert']")?.textContent).toBe(
      "O envio de e-mails está temporariamente indisponível.",
    );

    await click("Voltar para entrar");
    expect(heading()).toBe("Entre na sua conta");
  });
});
