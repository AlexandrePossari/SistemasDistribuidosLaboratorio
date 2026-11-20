import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LivroCard from "../../src/components/LivroCard.jsx";

const base = {
  id: 7,
  titulo: "Duna",
  autor: "Frank Herbert",
  status: "lendo",
  avaliacao: null,
  notas: "",
  concluido_em: null,
};

function renderizar(livro = {}) {
  const acoes = {
    onEditar: vi.fn(),
    onAlterarStatus: vi.fn(),
    onAvaliar: vi.fn(),
    onExcluir: vi.fn(),
  };
  render(
    <ul>
      <LivroCard livro={{ ...base, ...livro }} {...acoes} />
    </ul>,
  );
  return acoes;
}

describe("LivroCard", () => {
  it("mostra titulo, autor e status", () => {
    renderizar();

    expect(screen.getByRole("heading", { name: "Duna" })).toBeInTheDocument();
    expect(screen.getByText("Frank Herbert")).toBeInTheDocument();
    expect(screen.getByLabelText("Status de Duna")).toHaveValue("lendo");
  });

  it("muda o status pelo seletor", async () => {
    const user = userEvent.setup();
    const { onAlterarStatus } = renderizar();

    await user.selectOptions(screen.getByLabelText("Status de Duna"), "lido");

    expect(onAlterarStatus).toHaveBeenCalledWith(7, "lido");
  });

  it("nao mostra estrelas em livro nao lido", () => {
    renderizar({ status: "quero_ler" });

    expect(screen.queryByRole("button", { name: /Avaliar Duna/ })).not.toBeInTheDocument();
  });

  it("mostra estrelas e a data de conclusao em livro lido", () => {
    renderizar({ status: "lido", avaliacao: 3, concluido_em: "2026-11-10" });

    expect(screen.getByText("Lido em 10/11/2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover avaliação de Duna" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("avalia ao clicar numa estrela e remove ao clicar na nota atual", async () => {
    const user = userEvent.setup();
    const { onAvaliar } = renderizar({ status: "lido", avaliacao: 3, concluido_em: "2026-11-10" });

    await user.click(screen.getByRole("button", { name: "Avaliar Duna com 5 de 5" }));
    await user.click(screen.getByRole("button", { name: "Remover avaliação de Duna" }));

    expect(onAvaliar).toHaveBeenNthCalledWith(1, 7, 5);
    expect(onAvaliar).toHaveBeenNthCalledWith(2, 7, null);
  });

  it("recolhe notas longas com ver mais / ver menos", async () => {
    const user = userEvent.setup();
    const notas = `${"palavra ".repeat(40)}FIM`;
    renderizar({ notas });

    expect(screen.queryByText(/FIM/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ver mais" }));
    expect(screen.getByText(/FIM/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ver menos" }));
    expect(screen.queryByText(/FIM/)).not.toBeInTheDocument();
  });

  it("nao mostra ver mais em notas curtas", () => {
    renderizar({ notas: "Curto e bom." });

    expect(screen.getByText("Curto e bom.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ver mais" })).not.toBeInTheDocument();
  });

  it("chama onEditar com o id", async () => {
    const user = userEvent.setup();
    const { onEditar } = renderizar();

    await user.click(screen.getByRole("button", { name: "Editar Duna" }));

    expect(onEditar).toHaveBeenCalledWith(7);
  });

  it("pede confirmacao antes de excluir", async () => {
    const user = userEvent.setup();
    const { onExcluir } = renderizar();

    await user.click(screen.getByRole("button", { name: "Excluir Duna" }));
    expect(screen.getByText("Excluir este livro?")).toBeInTheDocument();
    expect(onExcluir).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Sim, excluir" }));
    expect(onExcluir).toHaveBeenCalledWith(7);
  });

  it("desiste da exclusao com Nao", async () => {
    const user = userEvent.setup();
    const { onExcluir } = renderizar();

    await user.click(screen.getByRole("button", { name: "Excluir Duna" }));
    await user.click(screen.getByRole("button", { name: "Não" }));

    expect(onExcluir).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Excluir Duna" })).toBeInTheDocument();
  });
});
