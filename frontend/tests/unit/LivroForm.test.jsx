import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LivroForm from "../../src/components/LivroForm.jsx";

const lido = {
  id: 3,
  titulo: "Duna",
  autor: "Frank Herbert",
  status: "lido",
  avaliacao: 4,
  notas: "Releitura",
  concluido_em: "2026-11-10",
};

async function preencher(user, { titulo, autor }) {
  await user.type(screen.getByLabelText("Título"), titulo);
  await user.type(screen.getByLabelText("Autor"), autor);
}

describe("LivroForm: cadastro", () => {
  it("so mostra a avaliacao quando o status e Lido", async () => {
    const user = userEvent.setup();
    render(<LivroForm onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText("Avaliação")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Status"), "lido");

    expect(screen.getByLabelText("Avaliação")).toBeInTheDocument();
  });

  it("limpa a avaliacao ao sair de Lido", async () => {
    const user = userEvent.setup();
    render(<LivroForm onSubmit={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText("Status"), "lido");
    await user.selectOptions(screen.getByLabelText("Avaliação"), "5");
    await user.selectOptions(screen.getByLabelText("Status"), "lendo");
    await user.selectOptions(screen.getByLabelText("Status"), "lido");

    expect(screen.getByLabelText("Avaliação")).toHaveValue("");
  });

  it("envia os dados normalizados e limpa o formulario quando a API aceita", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<LivroForm onSubmit={onSubmit} />);

    await preencher(user, { titulo: "  O   Hobbit ", autor: "Tolkien" });
    await user.selectOptions(screen.getByLabelText("Status"), "lido");
    await user.selectOptions(screen.getByLabelText("Avaliação"), "5");
    await user.type(screen.getByLabelText("Notas"), "Clássico");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(onSubmit).toHaveBeenCalledWith({
      titulo: "O Hobbit",
      autor: "Tolkien",
      status: "lido",
      avaliacao: 5,
      notas: "Clássico",
    });
    expect(screen.getByLabelText("Título")).toHaveValue("");
    expect(screen.getByLabelText("Status")).toHaveValue("quero_ler");
  });

  it("mantem os dados quando a API recusa", async () => {
    const user = userEvent.setup();
    render(<LivroForm onSubmit={vi.fn().mockResolvedValue(false)} />);

    await preencher(user, { titulo: "Duna", autor: "Frank Herbert" });
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(screen.getByLabelText("Título")).toHaveValue("Duna");
  });

  it("mostra os erros e nao chama a API com dados invalidos", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LivroForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Título"), "   ");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(screen.getByText("Informe o título.")).toBeInTheDocument();
    expect(screen.getByText("Informe o autor.")).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("desabilita o botao enquanto salva", () => {
    render(<LivroForm onSubmit={vi.fn()} enviando />);

    expect(screen.getByRole("button", { name: "Salvando..." })).toBeDisabled();
  });
});

describe("LivroForm: edicao", () => {
  it("preenche os campos com o livro e envia as alteracoes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<LivroForm livro={lido} onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.getByRole("form", { name: 'Editar "Duna"' })).toBeInTheDocument();
    expect(screen.getByLabelText("Avaliação")).toHaveValue("4");

    await user.clear(screen.getByLabelText("Notas"));
    await user.type(screen.getByLabelText("Notas"), "Melhor na segunda vez");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(onSubmit).toHaveBeenCalledWith({
      titulo: "Duna",
      autor: "Frank Herbert",
      status: "lido",
      avaliacao: 4,
      notas: "Melhor na segunda vez",
    });
  });

  it("cancela a edicao", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<LivroForm livro={lido} onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
