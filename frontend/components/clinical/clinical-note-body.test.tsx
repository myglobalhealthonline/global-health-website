import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ClinicalNoteBody } from "./clinical-note-body";

/**
 * The share and print sheets used to dump the note into a `pre-wrap`
 * block, so a referring colleague saw literal `## Motivo da Consulta:`
 * and `- Realizada Meta 1` markers. These guard the markers actually
 * turning into structure — and, just as importantly, that unknown
 * syntax degrades to visible text instead of vanishing.
 */

const render = (body: string | null | undefined) =>
  renderToStaticMarkup(<ClinicalNoteBody body={body} prefix="vk-note" />);

describe("ClinicalNoteBody", () => {
  it("renders headings as elements, not literal hashes", () => {
    const html = render("## Motivo da Consulta:\n\nPaciente em acompanhamento.");
    expect(html).toContain("Motivo da Consulta:");
    expect(html).not.toContain("##");
    expect(html).toContain('class="vk-note-h2"');
    expect(html).toContain('<p class="vk-note-p">Paciente em acompanhamento.');
  });

  it("groups consecutive bullets into one list", () => {
    const html = render("- Meta 1: Identificação correta\n- Meta 2: Revisão");
    expect(html).toContain('<ul class="vk-note-ul">');
    expect((html.match(/<li>/g) ?? []).length).toBe(2);
    expect(html).not.toContain("- Meta");
  });

  it("keeps ordered and unordered lists separate", () => {
    const html = render("- a\n1. b");
    expect(html).toContain('<ul class="vk-note-ul">');
    expect(html).toContain('<ol class="vk-note-ol">');
  });

  it("renders inline bold, italic and code", () => {
    const html = render("Dose **225mg** de *venlafaxina* via `oral`");
    expect(html).toContain("<strong>225mg</strong>");
    expect(html).toContain("<em>venlafaxina</em>");
    expect(html).toContain("<code>oral</code>");
  });

  it("preserves soft line breaks inside a paragraph", () => {
    const html = render("linha um\nlinha dois");
    expect(html).toContain("<br/>");
    expect((html.match(/vk-note-p/g) ?? []).length).toBe(1);
  });

  it("keeps unmatched markers as literal text rather than dropping them", () => {
    const html = render("peso 70 * 2 e um ** solto");
    expect(html).toContain("peso 70 * 2 e um ** solto");
  });

  it("never emits raw HTML from the note body", () => {
    const html = render("<script>alert(1)</script> **ok**");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders nothing for empty or whitespace-only notes", () => {
    expect(render(null)).toBe("");
    expect(render("   \n  ")).toBe("");
  });
});
