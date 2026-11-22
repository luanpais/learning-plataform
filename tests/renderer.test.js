const test = require("node:test");
const assert = require("node:assert");
const { escapeHtml, renderMarkdown, stepIndex } = require("../js/renderer.js");

test("escapeHtml escapes the five special characters", () => {
  assert.strictEqual(escapeHtml(`<&">`), "&lt;&amp;&quot;&gt;");
  assert.strictEqual(escapeHtml("'"), "&#39;");
});

test("renderMarkdown renders headings", () => {
  assert.match(renderMarkdown("# T"), /<h1>T<\/h1>/);
});

test("renderMarkdown renders unordered lists", () => {
  const html = renderMarkdown("- a\n- b");
  assert.match(html, /<ul>\n<li>a<\/li>\n<li>b<\/li>\n<\/ul>/);
});

test("renderMarkdown renders text fences as pre/code", () => {
  const html = renderMarkdown("```text\nx <- 1\n```");
  assert.match(html, /<pre><code>x &lt;- 1<\/code><\/pre>/);
});

test("renderMarkdown renders a valid quiz with the right answer index", () => {
  const quiz = JSON.stringify({
    question: "Q?",
    options: [{ text: "a" }, { text: "b", correct: true }],
  });
  const html = renderMarkdown("```quiz\n" + quiz + "\n```");
  assert.match(html, /class="knowledge-test"/);
  assert.match(html, /data-correct="1"/);
});

test("renderMarkdown shows quiz-error for invalid quiz JSON", () => {
  const html = renderMarkdown("```quiz\n{nao e json\n```");
  assert.match(html, /class="quiz-error"/);
});

test("renderMarkdown gives identical output for CRLF input", () => {
  const lf = "# T\n\n- a\n- b\n\ntexto";
  assert.strictEqual(renderMarkdown(lf.replace(/\n/g, "\r\n")), renderMarkdown(lf));
});

test("stepIndex clamps to the valid range", () => {
  assert.strictEqual(stepIndex(0, -1, 3), 0);
  assert.strictEqual(stepIndex(2, 1, 3), 2);
  assert.strictEqual(stepIndex(0, 1, 3), 1);
  assert.strictEqual(stepIndex(0, 1, 0), 0);
});

// ---- Task 2: tables and fences ----
test("table renders thead and tbody", () => {
  const html = renderMarkdown("| A | B |\n|---|---|\n| 1 | 2 |");
  assert.match(html, /<table>/);
  assert.match(html, /<th>A<\/th><th>B<\/th>/);
  assert.match(html, /<td>1<\/td><td>2<\/td>/);
});

test("table pads short rows with empty cells", () => {
  const html = renderMarkdown("| A | B |\n|---|---|\n| 1 |");
  assert.match(html, /<td>1<\/td><td><\/td>/);
});

test("table escapes html in cells", () => {
  const html = renderMarkdown("| A |\n|---|\n| <b>x</b> |");
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>/);
});

test("a stray pipe in a paragraph does not become a table", () => {
  const html = renderMarkdown("a | b\n\ntexto");
  assert.doesNotMatch(html, /<table>/);
  assert.match(html, /<p>a \| b<\/p>/);
});

test("estrutura and pseudocodigo fences get their own class", () => {
  assert.match(renderMarkdown("```estrutura\n[x]\n```"), /<pre class="estrutura"><code>\[x\]<\/code><\/pre>/);
  assert.match(renderMarkdown("```pseudocodigo\nx <- 1\n```"), /<pre class="pseudocodigo"><code>x &lt;- 1<\/code><\/pre>/);
});

// ---- Task 3: video ----
const fence = (lang, obj) => "```" + lang + "\n" + (typeof obj === "string" ? obj : JSON.stringify(obj)) + "\n```";

test("video with null url renders the placeholder and no iframe", () => {
  const html = renderMarkdown(fence("video", { title: "Aula", url: null }));
  assert.match(html, /video-placeholder/);
  assert.doesNotMatch(html, /<iframe/);
});

test("video with an allowed embed url renders an iframe", () => {
  for (const url of [
    "https://www.youtube.com/embed/abc",
    "https://www.youtube-nocookie.com/embed/abc",
    "https://player.vimeo.com/video/123",
  ]) {
    assert.match(renderMarkdown(fence("video", { title: "Aula", url })), /<iframe class="video-embed" src="/, url);
  }
});

test("video rejects unsafe or foreign urls", () => {
  for (const url of ["javascript:alert(1)", "http://www.youtube.com/embed/x", "https://evil.com/embed/x", "https://www.youtube.com.evil.com/embed/x"]) {
    const html = renderMarkdown(fence("video", { title: "Aula", url }));
    assert.doesNotMatch(html, /<iframe/, url);
    assert.match(html, /video-placeholder/, url);
  }
});

test("video escapes the title", () => {
  const html = renderMarkdown(fence("video", { title: "<i>x</i>", url: null }));
  assert.match(html, /&lt;i&gt;x&lt;\/i&gt;/);
  assert.doesNotMatch(html, /<i>/);
});

test("video with invalid json shows quiz-error", () => {
  assert.match(renderMarkdown(fence("video", "{nope")), /class="quiz-error"/);
});

// ---- Task 4: slides, demo, exercicio ----
test("slides render one panel per slide, only the first visible", () => {
  const html = renderMarkdown(fence("slides", { slides: [{ title: "A", bullets: ["x", "y"] }, { title: "B", bullets: [] }] }));
  assert.match(html, /data-kind="slides" data-count="2"/);
  assert.strictEqual((html.match(/data-step="/g) || []).length, 2);
  assert.strictEqual((html.match(/ hidden>/g) || []).length, 1);
  assert.match(html, /<li>x<\/li>/);
  assert.match(html, /1 \/ 2/);
});

test("slides with an empty list shows quiz-error", () => {
  const html = renderMarkdown(fence("slides", { slides: [] }));
  assert.match(html, /class="quiz-error"/);
  assert.match(html, /pelo menos um/);
});

test("demo with a single step disables both buttons", () => {
  const html = renderMarkdown(fence("demo", { title: "D", steps: [{ caption: "c", state: "s" }] }));
  assert.match(html, /data-kind="demo" data-count="1"/);
  assert.match(html, /data-stepper="prev" disabled/);
  assert.match(html, /data-stepper="next" disabled/);
});

test("demo with two steps starts with prev disabled and next enabled", () => {
  const html = renderMarkdown(fence("demo", { title: "D", steps: [{ caption: "c", state: "s" }, { caption: "d", state: "t" }] }));
  assert.match(html, /data-stepper="prev" disabled/);
  assert.doesNotMatch(html, /data-stepper="next" disabled/);
});

test("slides, demo, exercicio and video escape script text", () => {
  const evil = "<script>alert(1)</script>";
  const out = [
    renderMarkdown(fence("slides", { slides: [{ title: evil, bullets: [evil] }] })),
    renderMarkdown(fence("demo", { title: evil, steps: [{ caption: evil, state: evil }, { caption: evil, state: evil }] })),
    renderMarkdown(fence("exercicio", { title: evil, statement: evil, answer: evil })),
    renderMarkdown("| H |\n|---|\n| " + evil + " |"),
  ].join("\n");
  assert.doesNotMatch(out, /<script>/);
});

test("exercicio shows the statement and hides the answer in a details element", () => {
  const html = renderMarkdown(fence("exercicio", { title: "Ex 1", statement: "Enunciado", answer: "Gabarito" }));
  assert.match(html, /<h4>Ex 1<\/h4>/);
  assert.match(html, /<p class="exercise-statement">Enunciado<\/p>/);
  assert.match(html, /<details class="exercise-solution"><summary>Ver gabarito<\/summary><div class="exercise-answer">Gabarito<\/div><\/details>/);
});

test("slides, demo and exercicio with invalid json show quiz-error", () => {
  for (const lang of ["slides", "demo", "exercicio"]) {
    assert.match(renderMarkdown(fence(lang, "{nope")), /class="quiz-error"/, lang);
  }
});

test("exercicio without an answer shows quiz-error", () => {
  assert.match(renderMarkdown(fence("exercicio", { title: "t", statement: "s" })), /class="quiz-error"/);
});

// ---- Final review: edge case in table detection ----
test("a line with a pipe followed by a horizontal rule is not a table", () => {
  const html = renderMarkdown("ligar a | b\n---\ndepois");
  assert.doesNotMatch(html, /<table>/);
  assert.match(html, /<hr>/);
});

test("a table needs as many separator cells as header cells", () => {
  const html = renderMarkdown("| A | B |\n|---|\n| 1 | 2 |");
  assert.doesNotMatch(html, /<table>/);
});

// ---- Integração com o renderizador do site (marked + DOMPurify) ----
const { renderBlock, isAllowedEmbed } = require("../js/renderer.js");

test("renderBlock renders the custom block languages and ignores the others", () => {
  assert.match(renderBlock("slides", JSON.stringify({ slides: [{ title: "A", bullets: ["x"] }] })), /class="stepper"/);
  assert.match(renderBlock("demo", JSON.stringify({ title: "D", steps: [{ caption: "c", state: "s" }] })), /data-kind="demo"/);
  assert.match(renderBlock("exercicio", JSON.stringify({ title: "t", statement: "s", answer: "a" })), /exercise-solution/);
  assert.match(renderBlock("estrutura", "[x] <b>"), /<pre class="estrutura"><code>\[x\] &lt;b&gt;<\/code><\/pre>/);
  assert.match(renderBlock("pseudocodigo", "x <- 1"), /<pre class="pseudocodigo"><code>x &lt;- 1<\/code><\/pre>/);
  assert.strictEqual(renderBlock("c", "int x;"), null);
  assert.strictEqual(renderBlock("quiz", "{}"), null, "quiz continua sendo tratado pelo renderizador do site");
  assert.strictEqual(renderBlock(undefined, "x"), null);
});

test("renderBlock shows block errors for invalid json", () => {
  assert.match(renderBlock("slides", "{nope"), /class="quiz-error"/);
});

test("deferred video emits a slot (no iframe) so DOMPurify cannot strip it", () => {
  const url = "https://www.youtube.com/embed/abc";
  const html = renderBlock("video", JSON.stringify({ title: "Aula", url }), { defer: true });
  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, new RegExp(`data-embed-src="${url}"`));
  assert.match(html, /data-embed-title="Aula"/);
});

test("deferred video with a null or foreign url keeps the placeholder", () => {
  for (const url of [null, "http://www.youtube.com/embed/x", "https://evil.com/embed/x", "javascript:alert(1)"]) {
    const html = renderBlock("video", JSON.stringify({ title: "Aula", url }), { defer: true });
    assert.doesNotMatch(html, /data-embed-src/, String(url));
    assert.match(html, /video-placeholder/, String(url));
  }
});

test("isAllowedEmbed accepts only the three embed hosts", () => {
  assert.strictEqual(isAllowedEmbed("https://www.youtube.com/embed/x"), true);
  assert.strictEqual(isAllowedEmbed("https://player.vimeo.com/video/1"), true);
  assert.strictEqual(isAllowedEmbed("https://www.youtube.com.evil.com/embed/x"), false);
  assert.strictEqual(isAllowedEmbed(""), false);
  assert.strictEqual(isAllowedEmbed(null), false);
});

// ---- bloco "codigo": código em C + animação ----
const { highlightC } = require("../js/renderer.js");
const codigoBloco = (extra = {}) => JSON.stringify({
  title: "Soma", code: "int a = 1;\nint b = a + 2; // soma",
  steps: [
    { line: 1, caption: "Cria `a`.", vars: { a: 1 }, rows: [[{ s: 0, n: 2, i: [3, [1, "p"]], l: "v", a: 1 }]] },
    { line: 2, caption: "Cria b.", rows: [[[5, 4]]] },
  ], ...extra,
});

test("codigo block renders code lines, one panel per step and the first line highlighted", () => {
  const html = renderBlock("codigo", codigoBloco());
  assert.match(html, /data-kind="codigo" data-count="2"/);
  assert.strictEqual((html.match(/class="cline/g) || []).length, 2);
  assert.match(html, /class="cline on"><span class="ln">1<\/span>/);
  assert.strictEqual((html.match(/class="stepper-panel cv-panel"/g) || []).length, 2);
  assert.match(html, /data-line="2"/);
  assert.match(html, /class="sp c3 f3"/);          // 3 -> cor 3
  assert.match(html, /class="sp c1 f1 pick"/);    // item marcado
  assert.match(html, /<code>a<\/code>/);           // `a` na legenda
  assert.match(html, /<em>a<\/em> = 1/);           // variável
  assert.match(html, /data-stepper="play"/);
});

test("codigo block rejects broken json, missing steps and lines outside the code", () => {
  assert.match(renderBlock("codigo", "{nope"), /quiz-error/);
  assert.match(renderBlock("codigo", JSON.stringify({ code: "x", steps: [] })), /quiz-error/);
  assert.match(renderBlock("codigo", codigoBloco({ steps: [{ line: 9, caption: "c" }] })), /não existe no código/);
});

test("codigo block escapes html coming from the data", () => {
  const html = renderBlock("codigo", JSON.stringify({ title: "<b>t</b>", code: "a < b;", steps: [{ line: 1, caption: "<img src=x>", vars: { "<i>": "<u>" }, rows: [[{ i: [1], l: "<s>" }]] }] }));
  assert.doesNotMatch(html, /<(img|u>|s>|i>)|<b>t/);
  assert.match(html, /&lt;img src=x&gt;/);
});

test("highlightC colors C tokens, escapes html and keeps one entry per line", () => {
  const lines = highlightC('#include <stdio.h>\nint main(void) { return 0; } /* a\nb */');
  assert.strictEqual(lines.length, 3);
  assert.match(lines[0], /tk-p">#include<\/span>/);
  assert.match(lines[1], /tk-t">int<\/span> <span class="tk-f">main/);
  assert.match(lines[1], /tk-k">return<\/span> <span class="tk-n">0/);
  assert.match(lines[1], /tk-c">\/\* a<\/span>/);
  assert.match(lines[2], /tk-c">b \*\/<\/span>/);
  assert.match(highlightC("a < b")[0], /a &lt; b/);
});

test("codigo sprites accept letters and an explicit color", () => {
  const html = renderBlock("codigo", JSON.stringify({
    code: "x", steps: [{ line: 1, caption: "c", rows: [[{ i: ["a", ["B", "c"], [100, "", 2], 7] }]] }],
  }));
  assert.match(html, /<span class="sp c1 f1"><b>a<\/b>/);          // 'a' = 97 -> 97 % 12 = 1
  assert.match(html, /<span class="sp c6 f2 cmp"><b>B<\/b>/);       // 'B' = 66 -> 66 % 12 = 6
  assert.match(html, /<span class="sp c2 f2"><b>100<\/b>/);         // cor explícita 2
  assert.match(html, /<span class="sp c7 f3"><b>7<\/b>/);
});

test("codigo sprites accept the ghost flag for empty slots", () => {
  const html = renderBlock("codigo", JSON.stringify({ code: "x", steps: [{ line: 1, caption: "c", rows: [[{ i: [["·", "g", 0]] }]] }] }));
  assert.match(html, /class="sp c0 f0 ghost"/);
});

test("codigo sprites with long labels get wider, short ones do not", () => {
  const html = renderBlock("codigo", JSON.stringify({ code: "x", steps: [{ line: 1, caption: "c", rows: [[{ i: ["Ana", "Sistemas", 60] }]] }] }));
  assert.match(html, /<span class="sp c\d+ f\d+ wide" style="--len:8"><b>Sistemas<\/b>/);
  assert.doesNotMatch(html, /wide[^>]*><b>Ana</);
  assert.doesNotMatch(html, /wide[^>]*><b>60</);
});

test("carrossel renders one panel per image with prev disabled", () => {
  const html = renderMarkdown(fence("carrossel", { title: "C", images: [{ src: "img/a.png", alt: "A" }, { src: "img/b.png" }] }));
  assert.match(html, /data-kind="carrossel" data-count="2"/);
  assert.match(html, /<img class="carrossel-img" src="img\/a.png" alt="A"/);
  assert.match(html, /data-stepper="prev" disabled/);
  assert.doesNotMatch(html, /data-stepper="next" disabled/);
});

test("carrossel rejects javascript:, data: and empty sources", () => {
  for (const src of ["javascript:alert(1)", "data:image/png;base64,AAAA", "", "http://x.org/a.png"]) {
    const html = renderMarkdown(fence("carrossel", { images: [{ src }] }));
    assert.match(html, /class="quiz-error"/, src);
  }
});

test("carrossel escapes attribute text and rejects an empty list", () => {
  const html = renderMarkdown(fence("carrossel", { title: '<b>"x"', images: [{ src: 'a"><script>.png', alt: "<i>" }] }));
  assert.doesNotMatch(html, /<script>|<i>|<b>/);
  assert.match(renderMarkdown(fence("carrossel", { images: [] })), /pelo menos uma/);
});

// ---- Bloco "registro": campos de tamanho fixo em barra proporcional ----
const REGISTRO = {
  titulo: "Registro Aluno (70 bytes)",
  campos: [{ nome: "nome", tamanho: 30 }, { nome: "curso", tamanho: 20 }, { nome: "cidade", tamanho: 20 }],
  exemplos: [
    { rotulo: "Ana", valores: ["Ana Souza", "Sistemas", "Mariana"] },
    { rotulo: "Vazio", valores: ["", "", ""] },
  ],
};
const registro = (data) => renderBlock("registro", JSON.stringify(data));

test("registro renders one proportional segment per field and one panel per example", () => {
  const html = registro(REGISTRO);
  assert.match(html, /<section class="registro" data-kind="registro" aria-label="Registro Aluno \(70 bytes\)">/);
  assert.strictEqual((html.match(/class="registro-ex"/g) || []).length, 2);
  assert.strictEqual((html.match(/class="registro-seg /g) || []).length, 6);
  assert.match(html, /data-registro-campo="0" aria-pressed="false" aria-label="nome: 9 de 30 bytes usados" style="--w:42\.857"/);
  assert.match(html, /class="registro-used" style="--u:30">Ana Souza/);
  assert.match(html, /<span class="registro-count" style="--w:28\.571">8 usados \+ 12 sem uso<\/span>/);
  assert.match(html, /byte 30/);
  assert.match(html, /byte 70/);
});

test("registro shows only the first example, with tabs, and the summary first", () => {
  const html = registro(REGISTRO);
  assert.match(html, /<div class="registro-ex" data-ex="0"><div/);
  assert.match(html, /<div class="registro-ex" data-ex="1" hidden>/);
  assert.match(html, /data-registro-ex="0" aria-pressed="true">Ana</);
  assert.match(html, /data-registro-ex="1" aria-pressed="false">Vazio</);
  assert.match(html, /<strong>24 bytes usados<\/strong> de 70[^<]*sobram 46 \(66%\)/);
  assert.match(html, /Registro vazio: os 70 bytes continuam reservados/);
  assert.match(html, /data-info="resumo">/);
  assert.match(html, /data-info="2" hidden>/);
});

test("registro explains where each field starts, with the header size when given", () => {
  const sem = registro(REGISTRO);
  assert.match(sem, /Campo <code>nome<\/code>: bytes 0 a 29 dentro do registro/);
  assert.match(sem, /<code>cabeçalho \+ RRN × 70<\/code>/);
  assert.match(sem, /Campo <code>curso<\/code>: bytes 30 a 49/);
  assert.match(sem, /<code>cabeçalho \+ RRN × 70 \+ 30<\/code>/);
  const com = registro({ ...REGISTRO, cabecalho: 64 });
  assert.match(com, /<code>64 \+ RRN × 70 \+ 50<\/code>/);
});

test("registro without examples shows just the layout, with no tabs", () => {
  const html = registro({ campos: REGISTRO.campos });
  assert.doesNotMatch(html, /registro-tabs/);
  assert.strictEqual((html.match(/class="registro-ex"/g) || []).length, 1);
  assert.match(html, /Registro vazio: os 70 bytes/);
  assert.match(html, /<span class="registro-free">vazio<\/span>/);
});

test("registro counts bytes, not characters (UTF-8)", () => {
  const html = registro({ campos: [{ nome: "nome", tamanho: 10 }], exemplos: [{ rotulo: "a", valores: ["João"] }] });
  assert.match(html, /5 de 10 bytes usados/);
  assert.match(html, /5 usados \+ 5 sem uso/);
});

test("registro single-byte field says 'byte' and not 'bytes 0 a 0'", () => {
  const html = registro({ campos: [{ nome: "ativo", tamanho: 1 }, { nome: "id", tamanho: 4 }] });
  assert.match(html, /Campo <code>ativo<\/code>: byte 0 dentro/);
});

test("registro escapes html coming from names, values, labels and title", () => {
  const html = registro({
    titulo: "<img src=x>",
    campos: [{ nome: "<b>n</b>", tamanho: 40 }],
    exemplos: [{ rotulo: "<script>x</script>", valores: ["<i>a</i>"] }, { rotulo: "<u>y</u>", valores: [""] }],
  });
  assert.doesNotMatch(html, /<script>|<img|<b>n|<i>a|<u>y/);
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.match(html, /&lt;i&gt;a&lt;\/i&gt;/);
});

test("registro rejects broken json, bad fields and bad examples with quiz-error", () => {
  const bad = [
    "{",
    JSON.stringify({}),
    JSON.stringify({ campos: [] }),
    JSON.stringify({ campos: Array.from({ length: 13 }, (_, i) => ({ nome: "c" + i, tamanho: 1 })) }),
    JSON.stringify({ campos: [{ nome: "", tamanho: 5 }] }),
    JSON.stringify({ campos: [{ nome: "a", tamanho: 0 }] }),
    JSON.stringify({ campos: [{ nome: "a", tamanho: 2.5 }] }),
    JSON.stringify({ campos: [{ nome: "a", tamanho: 5 }], exemplos: [] }),
    JSON.stringify({ campos: [{ nome: "a", tamanho: 5 }], exemplos: [{ rotulo: "x", valores: [] }] }),
    JSON.stringify({ campos: [{ nome: "a", tamanho: 5 }], exemplos: [{ rotulo: "x", valores: [7] }] }),
    JSON.stringify({ campos: [{ nome: "a", tamanho: 5 }], exemplos: [{ valores: ["x"] }] }),
  ];
  bad.forEach((source) => assert.match(renderBlock("registro", source), /class="quiz-error"/, source));
});

test("registro rejects a value that does not fit in its field", () => {
  const html = registro({ campos: [{ nome: "sigla", tamanho: 3 }], exemplos: [{ rotulo: "x", valores: ["ABCD"] }] });
  assert.match(html, /class="quiz-error"[^>]*>O valor &quot;ABCD&quot; não cabe no campo sigla \(3 bytes\)/);
});

test("registro works through renderMarkdown like the other blocks", () => {
  const html = renderMarkdown("## Estrutura\n\n```registro\n" + JSON.stringify(REGISTRO) + "\n```\n");
  assert.match(html, /<h2>Estrutura<\/h2>/);
  assert.match(html, /data-kind="registro"/);
});

// ---- Exercício com alternativas clicáveis ----
const EX_OPCOES = {
  title: "Ex", statement: "Quanto é 2 + 2?", answer: "Resolução",
  options: [
    { text: "3", feedback: "Confira a conta." },
    { text: "4", correct: true, feedback: "Soma simples." },
    { text: "5" },
  ],
};
const exercicio = (data) => renderBlock("exercicio", JSON.stringify(data));

test("exercicio with options renders one button per option and marks the right one", () => {
  const html = exercicio(EX_OPCOES);
  assert.match(html, /<section class="exercise" data-correct="1">/);
  assert.strictEqual((html.match(/class="exercise-option"/g) || []).length, 3);
  assert.match(html, /data-exercise-option="0" aria-pressed="false"><span class="exercise-option-mark" aria-hidden="true">A<\/span><span class="exercise-option-text">3<\/span>/);
  assert.match(html, /data-exercise-option="2"[^>]*><span[^>]*>C<\/span>/);
  assert.match(html, /Escolha a alternativa correta/);
});

test("exercicio feedback: hidden until a click, per-option text, default text for wrong answers", () => {
  const html = exercicio(EX_OPCOES);
  assert.match(html, /<p class="exercise-feedback no" data-for="0" hidden><strong>Incorreto\.<\/strong> Confira a conta\.<\/p>/);
  assert.match(html, /<p class="exercise-feedback ok" data-for="1" hidden><strong>Correto!<\/strong> Soma simples\.<\/p>/);
  assert.match(html, /data-for="2" hidden><strong>Incorreto\.<\/strong> Confira os cálculos e tente outra alternativa\./);
});

test("exercicio with options keeps the gabarito available", () => {
  assert.match(exercicio(EX_OPCOES), /<details class="exercise-solution"><summary>Ver gabarito<\/summary><div class="exercise-answer">Resolução<\/div>/);
});

test("exercicio without options is unchanged: no buttons and no data-correct", () => {
  const html = exercicio({ title: "t", statement: "s", answer: "a" });
  assert.strictEqual(html, '<section class="exercise"><h4>t</h4><p class="exercise-statement">s</p><details class="exercise-solution"><summary>Ver gabarito</summary><div class="exercise-answer">a</div></details></section>');
});

test("exercicio rejects bad option lists with quiz-error", () => {
  const um = [{ text: "x", correct: true }];
  const semCerta = [{ text: "a" }, { text: "b" }];
  const duasCertas = [{ text: "a", correct: true }, { text: "b", correct: true }];
  const semTexto = [{ text: "a", correct: true }, { text: "  " }];
  const feedbackRuim = [{ text: "a", correct: true }, { text: "b", feedback: 3 }];
  const muitas = Array.from({ length: 7 }, (_, i) => ({ text: "o" + i, correct: i === 0 }));
  for (const options of [um, semCerta, duasCertas, semTexto, feedbackRuim, muitas, "abc", {}, []]) {
    assert.match(exercicio({ ...EX_OPCOES, options }), /class="quiz-error"/, JSON.stringify(options).slice(0, 40));
  }
});

test("exercicio with options escapes html in options and feedback", () => {
  const html = exercicio({ ...EX_OPCOES, options: [
    { text: "<b>x</b>", feedback: "<img src=x>" },
    { text: "<script>y</script>", correct: true, feedback: "<i>ok</i>" },
  ] });
  assert.doesNotMatch(html, /<b>x|<img|<script>|<i>ok/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(html, /&lt;img src=x&gt;/);
});

test("exercicio with options works through renderMarkdown", () => {
  const html = renderMarkdown("```exercicio\n" + JSON.stringify(EX_OPCOES) + "\n```\n");
  assert.match(html, /data-correct="1"/);
});

// ---- Bloco "arquivo": cabeçalho + registros fixos, com calculadora de RRN ----
const NB = "\u00a0"; // separador de milhar usado nos números
const arquivo = (data) => renderBlock("arquivo", JSON.stringify(data));

test("arquivo draws header, records and offsets (same numbers as the old ASCII)", () => {
  const html = arquivo({ cabecalho: 8, registro: 70, mostrar: 4, rrn: 3 });
  assert.match(html, /<section class="arquivo" data-kind="arquivo" data-cab="8" data-reg="70"/);
  assert.match(html, /arquivo-head"><span class="arquivo-label">cabeçalho<\/span><span class="arquivo-size">8 bytes/);
  assert.strictEqual((html.match(/class="arquivo-cell arquivo-rec"/g) || []).length, 4);
  const marcas = [...html.matchAll(/class="arquivo-tick[^"]*">([^<]*)</g)].map((m) => m[1]);
  assert.deepStrictEqual(marcas, ["0", "8", "78", "148", "218", "288"]);
  assert.match(html, /data-arquivo-rrn="3" aria-pressed="true"/);
  assert.match(html, /data-arquivo-rrn="0" aria-pressed="false"/);
});

test("arquivo calculator shows the offset formula, with big numbers formatted", () => {
  assert.match(arquivo({ cabecalho: 8, registro: 70, rrn: 3 }), /O RRN 3 começa no byte <code>8 \+ 3 × 70 = 218<\/code> e ocupa os bytes 218 a 287\./);
  const grande = arquivo({ cabecalho: 8, registro: 70, rrn: 199 });
  assert.match(grande, new RegExp(`<code>8 \\+ 199 × 70 = 13${NB}938</code> e ocupa os bytes 13${NB}938 a 14${NB}007`));
});

test("arquivo without header skips the header cell and the '+ cabeçalho' in the formula", () => {
  const html = arquivo({ registro: 100, mostrar: 3, rrn: 1 });
  assert.doesNotMatch(html, /arquivo-head/);
  assert.match(html, /<code>1 × 100 = 100<\/code>/);
});

test("arquivo exposes a numeric input limited to valid RRNs", () => {
  assert.match(arquivo({ registro: 70 }), /<input type="number" class="arquivo-input" data-arquivo-input min="0" max="999999999" step="1" inputmode="numeric" value="3">/);
});

test("arquivo rejects bad data with quiz-error and escapes the title", () => {
  const bad = [{}, { registro: 0 }, { registro: 2.5 }, { registro: 70, cabecalho: -1 }, { registro: 70, mostrar: 0 }, { registro: 70, mostrar: 9 }, { registro: 70, rrn: -2 }];
  bad.forEach((d) => assert.match(arquivo(d), /class="quiz-error"/, JSON.stringify(d)));
  assert.match(renderBlock("arquivo", "{"), /class="quiz-error"/);
  assert.doesNotMatch(arquivo({ registro: 70, titulo: "<img src=x>" }), /<img/);
});

// ---- Bloco "bloco": bloco de disco com fator de bloco e sobra ----
const bloco = (data) => renderBlock("bloco", JSON.stringify(data));

test("bloco computes blocking factor and leftover (4 096 / 70 = 58, sobra 36)", () => {
  const html = bloco({ bloco: 4096, registro: 70 });
  assert.match(html, new RegExp(`fator de bloco = 4${NB}096 / 70 = <strong>58 registros</strong>`));
  assert.match(html, new RegExp(`registros: 58 × 70 = 4${NB}060 bytes`));
  assert.match(html, new RegExp(`sobra: 4${NB}096 − 4${NB}060 = <strong>36 bytes</strong> \\(0,9% do bloco\\)`));
  assert.match(html, /class="bloco-recs" data-dense="false" style="--w:99\.121;--n:58"/);
  assert.match(html, /class="bloco-sobra" data-has="true" style="--w:0\.879"/);
  assert.match(html, /aria-label="Bloco de 4\u00a0096 bytes com 58 registros de 70 bytes e 36 bytes de sobra\."/);
});

test("bloco with no leftover, with singular text and with dense mode", () => {
  const exato = bloco({ bloco: 4096, registro: 64 });
  assert.match(exato, /data-has="false" style="--w:0"/);
  assert.match(exato, /sobra: 4\u00a0096 − 4\u00a0096 = <strong>0 bytes<\/strong> \(0%/);
  assert.match(bloco({ bloco: 100, registro: 100 }), /= <strong>1 registro<\/strong>/);
  assert.match(bloco({ bloco: 4096, registro: 10 }), /data-dense="true"/);
});

test("bloco renders inputs and optional preset buttons", () => {
  const html = bloco({ bloco: 4096, registro: 70, exemplos: [{ rotulo: "100 bytes", registro: 100 }, { rotulo: "Bloco 8K", registro: 70, bloco: 8192 }] });
  assert.match(html, /data-bloco-input="bloco" min="1" max="1048576" step="1" inputmode="numeric" value="4096"/);
  assert.match(html, /data-bloco-input="registro"[^>]*value="70"/);
  assert.match(html, /<button type="button" class="bloco-preset" data-bloco-set data-registro="100">100 bytes<\/button>/);
  assert.match(html, /data-registro="70" data-bloco="8192">Bloco 8K</);
  assert.doesNotMatch(bloco({ bloco: 4096, registro: 70 }), /bloco-presets/);
});

test("bloco rejects bad data with quiz-error and escapes title and labels", () => {
  const bad = [{}, { bloco: 4096 }, { bloco: 0, registro: 1 }, { bloco: 100, registro: 101 }, { bloco: 4096, registro: 70.5 }, { bloco: 2000000, registro: 70 },
    { bloco: 4096, registro: 70, exemplos: "x" }, { bloco: 4096, registro: 70, exemplos: [{ registro: 5 }] }, { bloco: 4096, registro: 70, exemplos: [{ rotulo: "a", registro: 0 }] },
    { bloco: 4096, registro: 70, exemplos: Array.from({ length: 7 }, () => ({ rotulo: "a", registro: 5 })) }];
  bad.forEach((d) => assert.match(bloco(d), /class="quiz-error"/, JSON.stringify(d)));
  const html = bloco({ bloco: 4096, registro: 70, titulo: "<img src=x>", exemplos: [{ rotulo: "<b>x</b>", registro: 5 }] });
  assert.doesNotMatch(html, /<img|<b>x/);
});

test("arquivo and bloco work through renderMarkdown", () => {
  const html = renderMarkdown("```arquivo\n{\"registro\":70}\n```\n\n```bloco\n{\"bloco\":4096,\"registro\":70}\n```\n");
  assert.match(html, /data-kind="arquivo"/);
  assert.match(html, /data-kind="bloco"/);
});

test("bloco says 'menos de 0,1%' instead of a misleading 0% for a tiny leftover", () => {
  assert.match(bloco({ bloco: 8192, registro: 70 }), /sobra: 8\u00a0192 − 8\u00a0190 = <strong>2 bytes<\/strong> \(menos de 0,1% do bloco\)/);
});
