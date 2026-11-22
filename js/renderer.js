(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LessonRenderer = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function renderInline(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  function stepIndex(current, delta, count) {
    if (count <= 0) return 0;
    return Math.min(Math.max(current + delta, 0), count - 1);
  }

  const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
  const FENCE_CLASSES = { estrutura: "estrutura", pseudocodigo: "pseudocodigo" };

  function parseRow(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  }

  function renderTable(rows) {
    const cols = Math.max(...rows.map((row) => row.length));
    const cells = (row, tag) => {
      const padded = row.concat(Array(cols - row.length).fill(""));
      return "<tr>" + padded.map((cell) => `<${tag}>${renderInline(cell)}</${tag}>`).join("") + "</tr>";
    };
    const [head, ...body] = rows;
    return `<div class="table-wrap"><table><thead>${cells(head, "th")}</thead><tbody>${body.map((row) => cells(row, "td")).join("")}</tbody></table></div>`;
  }

  const VIDEO_PREFIXES = [
    "https://www.youtube.com/embed/",
    "https://www.youtube-nocookie.com/embed/",
    "https://player.vimeo.com/video/"
  ];

  function parseJson(source) {
    try { return JSON.parse(source); } catch { return null; }
  }

  function blockError(message) {
    return `<p class="quiz-error">${escapeHtml(message)}</p>`;
  }

  function isAllowedEmbed(url) {
    return typeof url === "string" && VIDEO_PREFIXES.some((prefix) => url.startsWith(prefix));
  }

  // options.defer: em vez do <iframe> (que o DOMPurify remove), emite um "slot" com data-*;
  // hydrateVideoEmbeds() cria o iframe depois da sanitização, revalidando o endereço.
  function renderVideo(source, options = {}) {
    const data = parseJson(source);
    if (!data || typeof data !== "object") return blockError("Este bloco de vídeo tem um erro de formato.");
    const title = escapeHtml(data.title || "Vídeo explicativo");
    const url = typeof data.url === "string" ? data.url : "";
    if (isAllowedEmbed(url)) {
      if (options.defer) {
        return `<div class="video-frame"><div class="video-embed-slot" data-embed-src="${escapeHtml(url)}" data-embed-title="${title}"></div></div>`;
      }
      return `<div class="video-frame"><iframe class="video-embed" src="${escapeHtml(url)}" title="${title}" allowfullscreen loading="lazy"></iframe></div>`;
    }
    return `<div class="video-frame"><div class="video-placeholder"><strong>${title}</strong><span>Vídeo explicativo em breve</span></div></div>`;
  }

  function renderStepper(kind, label, headingHtml, panels) {
    const count = panels.length;
    const panelHtml = panels.map((panel, i) => `<div class="stepper-panel" data-step="${i}"${i ? " hidden" : ""}>${panel}</div>`).join("");
    return `<section class="stepper" data-kind="${kind}" data-count="${count}" tabindex="0" aria-label="${escapeHtml(label)}">${headingHtml}<div class="stepper-panels">${panelHtml}</div><div class="stepper-controls"><button type="button" data-stepper="prev" disabled>‹ Anterior</button><span class="stepper-counter" aria-live="polite">1 / ${count}</span><button type="button" data-stepper="next"${count < 2 ? " disabled" : ""}>Próximo ›</button></div></section>`;
  }

  function renderSlides(source) {
    const data = parseJson(source);
    if (!data || !Array.isArray(data.slides)) return blockError("Este bloco de slides tem um erro de formato.");
    if (data.slides.length < 1) return blockError("Os slides precisam de pelo menos um item.");
    const panels = data.slides.map((slide) => {
      const item = slide || {};
      const bullets = Array.isArray(item.bullets) ? item.bullets : [];
      return `<h4>${renderInline(String(item.title || ""))}</h4>` + (bullets.length ? `<ul>${bullets.map((b) => `<li>${renderInline(String(b))}</li>`).join("")}</ul>` : "");
    });
    return renderStepper("slides", "Slides", '<p class="stepper-title">Slides</p>', panels);
  }

  function renderDemo(source) {
    const data = parseJson(source);
    if (!data || !Array.isArray(data.steps)) return blockError("Esta demonstração tem um erro de formato.");
    if (data.steps.length < 1) return blockError("A demonstração precisa de pelo menos um passo.");
    const title = String(data.title || "Demonstração");
    const panels = data.steps.map((step) => {
      const item = step || {};
      return `<p class="demo-caption">${renderInline(String(item.caption || ""))}</p><pre class="demo-state"><code>${escapeHtml(String(item.state || ""))}</code></pre>`;
    });
    return renderStepper("demo", title, `<p class="stepper-title">${escapeHtml(title)}</p>`, panels);
  }


  // ---- Bloco "codigo": código em C de um lado e, do outro, o que acontece a cada linha ----
  const C_TIPOS = new Set(["int", "char", "void", "long", "short", "float", "double", "unsigned", "signed", "size_t", "FILE", "struct"]);
  const C_PALAVRAS = new Set(["if", "else", "while", "for", "do", "return", "break", "continue", "sizeof", "typedef", "static", "const", "switch", "case", "default", "define", "include"]);
  const C_TOKEN = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|<[a-z_.]+\.h>)|(#\s*\w+)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|([\s\S])/g;

  // Devolve uma lista com o HTML (já colorido) de cada linha do código.
  function highlightC(source) {
    const lines = [""];
    const put = (text, cls) => {
      text.split("\n").forEach((piece, i) => {
        if (i) lines.push("");
        if (piece) lines[lines.length - 1] += cls ? '<span class="' + cls + '">' + escapeHtml(piece) + "</span>" : escapeHtml(piece);
      });
    };
    let m;
    C_TOKEN.lastIndex = 0;
    while ((m = C_TOKEN.exec(source)) !== null) {
      if (m[1] !== undefined) put(m[1], "tk-c");
      else if (m[2] !== undefined) put(m[2], "tk-s");
      else if (m[3] !== undefined) put(m[3], "tk-p");
      else if (m[4] !== undefined) put(m[4], "tk-n");
      else if (m[5] !== undefined) {
        const next = source.slice(C_TOKEN.lastIndex).match(/^\s*\(/);
        put(m[5], C_TIPOS.has(m[5]) ? "tk-t" : C_PALAVRAS.has(m[5]) ? "tk-k" : next ? "tk-f" : "");
      } else put(m[6], "");
    }
    return lines;
  }

  // value: número ou texto (ex.: uma letra); flag: "c" comparando, "p" escolhido; color: 0 a 11 (opcional, senão depende do valor)
  function renderSprite(value, flag, color) {
    const n = Number(value);
    const isNumber = String(value).trim() !== "" && Number.isFinite(n);
    const seed = isNumber ? Math.abs(Math.round(n)) : String(value).charCodeAt(0) || 0;
    const shade = Number.isInteger(color) ? ((color % 12) + 12) % 12 : seed % 12;
    const cls = "sp c" + shade + " f" + (shade % 4) + (flag === "c" ? " cmp" : flag === "p" ? " pick" : flag === "g" ? " ghost" : "");
    const text = String(isNumber ? n : value);
    // rótulo comprido (mais de 3 caracteres): o bichinho se alarga para o texto não invadir o vizinho
    const wide = text.length > 3 ? ' wide" style="--len:' + Math.min(text.length, 10) : "";
    return '<span class="' + cls + wide + '"><b>' + escapeHtml(text) + "</b></span>";
  }

  function renderGroup(group) {
    const items = Array.isArray(group) ? group : (Array.isArray(group.i) ? group.i : []);
    const sprites = items.map((it) => Array.isArray(it) ? renderSprite(it[0], it[1], it[2]) : renderSprite(it)).join("");
    const positioned = !Array.isArray(group) && Number.isFinite(group.s) && Number.isFinite(group.n);
    const style = positioned ? ' style="--s:' + group.s + ";--n:" + group.n + '"' : "";
    const label = !Array.isArray(group) && group.l ? '<span class="cg-label">' + escapeHtml(String(group.l)) + "</span>" : "";
    return '<div class="cg' + (positioned ? " pos" : "") + (!Array.isArray(group) && group.a ? " on" : "") + '"' + style + ">" + label + '<div class="cb">' + sprites + "</div></div>";
  }

  function renderRows(rows) {
    return rows.map((row) => '<div class="cr">' + row.map(renderGroup).join("") + "</div>").join("");
  }

  function renderCodigo(source) {
    const data = parseJson(source);
    if (!data || typeof data.code !== "string" || !Array.isArray(data.steps)) return blockError("Este bloco de código tem um erro de formato.");
    if (data.steps.length < 1) return blockError("O bloco de código precisa de pelo menos um passo.");
    const codeLines = highlightC(data.code);
    for (const step of data.steps) {
      if (!step || typeof step !== "object") return blockError("Um dos passos do código tem um erro de formato.");
      if (step.line !== undefined && !(Number.isInteger(step.line) && step.line >= 1 && step.line <= codeLines.length)) {
        return blockError("Um passo aponta para uma linha que não existe no código.");
      }
    }
    let cols = Number(data.cols) || 0;
    if (!cols) {
      for (const step of data.steps) for (const row of step.rows || []) for (const g of row) {
        if (!Array.isArray(g) && Number.isFinite(g.s) && Number.isFinite(g.n)) cols = Math.max(cols, g.s + g.n);
      }
    }
    const maxRows = Math.max(1, ...data.steps.map((step) => (Array.isArray(step.rows) ? step.rows.length : 0)));
    const title = String(data.title || "Código passo a passo");
    const first = data.steps[0].line;
    const codeHtml = codeLines.map((html, i) =>
      '<div class="cline' + (first === i + 1 ? " on" : "") + '"><span class="ln">' + (i + 1) + '</span><span class="lc">' + (html || " ") + "</span></div>").join("");
    const panels = data.steps.map((step, i) => {
      const vars = step.vars && typeof step.vars === "object" ? Object.entries(step.vars) : [];
      const varsHtml = vars.length ? '<p class="cv-vars">' + vars.map(([k, v]) => "<span><em>" + escapeHtml(k) + "</em> = " + escapeHtml(String(v)) + "</span>").join("") + "</p>" : "";
      const stack = step.stack ? '<p class="cv-stack">Chamadas ativas: ' + escapeHtml(String(step.stack)) + "</p>" : "";
      return '<div class="stepper-panel cv-panel" data-step="' + i + '" data-line="' + (step.line || "") + '"' + (i ? " hidden" : "") + ">" +
        '<div class="cv-rows">' + renderRows(Array.isArray(step.rows) ? step.rows : []) + "</div>" +
        '<p class="cv-caption">' + renderInline(String(step.caption || "")) + "</p>" + varsHtml + stack + "</div>";
    }).join("");
    const count = data.steps.length;
    return '<section class="stepper codigo" data-kind="codigo" data-count="' + count + '" tabindex="0" aria-label="' + escapeHtml(title) + '"' + (cols > 10 ? ' data-layout="stack"' : cols > 8 ? ' data-layout="wide"' : "") + ' style="--cols:' + (cols || 8) + ";--rows:" + maxRows + '">' +
      '<p class="stepper-title">' + escapeHtml(title) + "</p>" +
      '<div class="codigo-body"><div class="codigo-screen"><div class="stepper-panels">' + panels + "</div></div>" +
      '<pre class="codigo-code" aria-label="Código em C"><code>' + codeHtml + "</code></pre></div>" +
      '<div class="stepper-controls"><button type="button" data-stepper="prev" disabled>‹ Anterior</button><button type="button" data-stepper="play" class="play">▶ Executar</button><span class="stepper-counter" aria-live="polite">1 / ' + count + '</span><button type="button" data-stepper="next"' + (count < 2 ? " disabled" : "") + ">Próximo ›</button></div></section>";
  }

  // Exercício com gabarito. Se tiver "options", o aluno clica numa alternativa e vê na hora se acertou
  // (cada alternativa pode ter um "feedback" próprio, útil para explicar o erro típico).
  const EXERCISE_MAX_OPCOES = 6;

  function renderExercise(source) {
    const data = parseJson(source);
    if (!data || typeof data.title !== "string" || typeof data.statement !== "string" || typeof data.answer !== "string" || !data.answer.trim()) {
      return blockError("Este exercício precisa de title, statement e answer.");
    }
    let escolha = "";
    let certa = "";
    if (data.options !== undefined) {
      const options = data.options;
      const ok = Array.isArray(options) && options.length >= 2 && options.length <= EXERCISE_MAX_OPCOES
        && options.every((o) => o && typeof o.text === "string" && o.text.trim() && (o.feedback === undefined || typeof o.feedback === "string"))
        && options.filter((o) => o.correct === true).length === 1;
      if (!ok) return blockError(`As alternativas do exercício precisam de 2 a ${EXERCISE_MAX_OPCOES} itens com text e exatamente uma com "correct": true.`);
      certa = ` data-correct="${options.findIndex((o) => o.correct === true)}"`;
      const botoes = options.map((o, n) => `<button type="button" class="exercise-option" data-exercise-option="${n}" aria-pressed="false"><span class="exercise-option-mark" aria-hidden="true">${String.fromCharCode(65 + n)}</span><span class="exercise-option-text">${escapeHtml(o.text)}</span></button>`).join("");
      const retornos = options.map((o, n) => o.correct === true
        ? `<p class="exercise-feedback ok" data-for="${n}" hidden><strong>Correto!</strong> ${escapeHtml(o.feedback || "")}</p>`
        : `<p class="exercise-feedback no" data-for="${n}" hidden><strong>Incorreto.</strong> ${escapeHtml(o.feedback || "Confira os cálculos e tente outra alternativa.")}</p>`).join("");
      escolha = `<p class="exercise-prompt">Escolha a alternativa correta:</p><div class="exercise-options" role="group" aria-label="Alternativas">${botoes}</div><div class="exercise-feedbacks" aria-live="polite">${retornos}</div>`;
    }
    return `<section class="exercise"${certa}><h4>${escapeHtml(data.title)}</h4><p class="exercise-statement">${escapeHtml(data.statement)}</p>${escolha}<details class="exercise-solution"><summary>Ver gabarito</summary><div class="exercise-answer">${escapeHtml(data.answer)}</div></details></section>`;
  }

  // ---- Bloco "carrossel": um passo por imagem (caminho relativo ao .md ou URL https) ----
  function isAllowedImageSrc(src) {
    if (typeof src !== "string" || !src.trim()) return false;
    const scheme = src.trim().match(/^([a-z][a-z0-9+.-]*):/i);
    return !scheme || scheme[1].toLowerCase() === "https";
  }

  function renderCarrossel(source) {
    const data = parseJson(source);
    if (!data || !Array.isArray(data.images)) return blockError("Este carrossel tem um erro de formato.");
    if (data.images.length < 1) return blockError("O carrossel precisa de pelo menos uma imagem.");
    if (!data.images.every((image) => image && isAllowedImageSrc(image.src))) return blockError("Cada imagem do carrossel precisa de um endereço \"src\" (caminho relativo ou https).");
    const title = String(data.title || "Carrossel");
    const panels = data.images.map((image, i) => {
      const alt = escapeHtml(String(image.alt || `${title}, imagem ${i + 1}`));
      return `<img class="carrossel-img" src="${escapeHtml(image.src.trim())}" alt="${alt}" loading="lazy">`;
    });
    return renderStepper("carrossel", title, `<p class="stepper-title">${escapeHtml(title)}</p>`, panels);
  }


  // ---- Bloco "registro": campos de tamanho fixo numa barra proporcional; cada campo é clicável ----
  const REGISTRO_MAX_CAMPOS = 12;

  // Tamanho em bytes (UTF-8), como o arquivo vai gravar o texto: "João" ocupa 5 bytes.
  function byteLength(text) {
    return typeof TextEncoder === "function" ? new TextEncoder().encode(text).length : text.length;
  }

  function registroPct(value, total) {
    return Math.round((value / total) * 100000) / 1000;
  }

  function registroRange(start, size) {
    return size === 1 ? `byte ${start}` : `bytes ${start} a ${start + size - 1}`;
  }

  function renderRegistro(source) {
    const data = parseJson(source);
    if (!data || typeof data !== "object" || !Array.isArray(data.campos)) return blockError("Este bloco de registro tem um erro de formato.");
    const campos = data.campos;
    if (campos.length < 1 || campos.length > REGISTRO_MAX_CAMPOS) return blockError(`O registro precisa de 1 a ${REGISTRO_MAX_CAMPOS} campos.`);
    const camposOk = campos.every((c) => c && typeof c.nome === "string" && c.nome.trim() && Number.isInteger(c.tamanho) && c.tamanho > 0);
    if (!camposOk) return blockError("Cada campo do registro precisa de um nome e de um tamanho inteiro maior que zero.");
    const exemplos = data.exemplos === undefined ? [{ rotulo: "Layout", valores: campos.map(() => "") }] : data.exemplos;
    if (!Array.isArray(exemplos) || exemplos.length < 1) return blockError("Os exemplos do registro precisam de pelo menos um item.");
    for (const ex of exemplos) {
      if (!ex || typeof ex.rotulo !== "string" || !Array.isArray(ex.valores) || ex.valores.length !== campos.length || !ex.valores.every((v) => typeof v === "string")) {
        return blockError("Cada exemplo precisa de um rótulo e de um valor (texto) para cada campo.");
      }
      const longo = campos.findIndex((c, i) => byteLength(ex.valores[i]) > c.tamanho);
      if (longo >= 0) return blockError(`O valor "${ex.valores[longo]}" não cabe no campo ${campos[longo].nome} (${campos[longo].tamanho} bytes).`);
    }

    const titulo = String(data.titulo || "Registro de tamanho fixo");
    const cabecalho = Number.isInteger(data.cabecalho) && data.cabecalho >= 0 ? String(data.cabecalho) : "cabeçalho";
    const total = campos.reduce((soma, c) => soma + c.tamanho, 0);
    const inicios = [];
    campos.reduce((pos, c) => { inicios.push(pos); return pos + c.tamanho; }, 0);
    const largura = (c) => ` style="--w:${registroPct(c.tamanho, total)}"`;

    const paineis = exemplos.map((ex, e) => {
      const usados = ex.valores.map(byteLength);
      const usadoTotal = usados.reduce((soma, n) => soma + n, 0);
      const livre = total - usadoTotal;
      const nomes = campos.map((c) => `<span class="registro-name"${largura(c)}>${escapeHtml(c.nome)} (${c.tamanho} bytes)</span>`).join("");
      const barra = campos.map((c, i) => {
        const usado = usados[i] ? `<span class="registro-used" style="--u:${registroPct(usados[i], c.tamanho)}">${escapeHtml(ex.valores[i])}</span>` : "";
        return `<button type="button" class="registro-seg registro-f${i % 3}" data-registro-campo="${i}" aria-pressed="false" aria-label="${escapeHtml(c.nome)}: ${usados[i]} de ${c.tamanho} bytes usados"${largura(c)}>${usado}<span class="registro-free">${usados[i] ? "" : "vazio"}</span></button>`;
      }).join("");
      const marcas = campos.map((c, i) => `<span class="registro-tick${i === 0 ? " first" : ""}" style="--w:${registroPct(inicios[i], total)}">byte ${inicios[i]}</span>`).join("")
        + `<span class="registro-tick last">byte ${total}</span>`;
      const contagens = campos.map((c, i) => `<span class="registro-count"${largura(c)}>${usados[i]} usados + ${c.tamanho - usados[i]} sem uso</span>`).join("");
      const resumo = (usadoTotal === 0
        ? `Registro vazio: os ${total} bytes continuam reservados no arquivo.`
        : `Total: <strong>${usadoTotal} bytes usados</strong> de ${total}. Cada registro ocupa sempre ${total} bytes, então sobram ${livre} (${Math.round((livre / total) * 100)}%) sem uso.`)
        + " Clique em um campo para ver onde ele fica no arquivo.";
      const infos = campos.map((c, i) => {
        const valor = usados[i]
          ? `Valor guardado: <code>${escapeHtml(ex.valores[i])}</code> (${usados[i]} bytes usados e ${c.tamanho - usados[i]} sem uso).`
          : `Campo vazio: os ${c.tamanho} bytes continuam reservados.`;
        const offset = `${cabecalho} + RRN × ${total}${inicios[i] ? ` + ${inicios[i]}` : ""}`;
        return `<p class="registro-info" data-info="${i}" hidden>Campo <code>${escapeHtml(c.nome)}</code>: ${registroRange(inicios[i], c.tamanho)} dentro do registro. ${valor} No arquivo, ele começa no byte <code>${offset}</code>.</p>`;
      }).join("");
      return `<div class="registro-ex" data-ex="${e}"${e ? " hidden" : ""}><div class="registro-names">${nomes}</div><div class="registro-bar">${barra}</div><div class="registro-ticks">${marcas}</div><div class="registro-counts">${contagens}</div><div class="registro-infos" aria-live="polite"><p class="registro-info" data-info="resumo">${resumo}</p>${infos}</div></div>`;
    }).join("");

    const abas = exemplos.length > 1
      ? `<div class="registro-tabs" role="group" aria-label="Exemplos de registro">${exemplos.map((ex, e) => `<button type="button" class="registro-tab" data-registro-ex="${e}" aria-pressed="${e === 0}">${escapeHtml(ex.rotulo)}</button>`).join("")}</div>`
      : "";
    const legenda = '<p class="registro-legend"><span><i class="registro-key used"></i>bytes usados</span><span><i class="registro-key free"></i>reservados e sem uso</span></p>';
    return `<section class="registro" data-kind="registro" aria-label="${escapeHtml(titulo)}"><p class="registro-title">${escapeHtml(titulo)}</p>${abas}${paineis}${legenda}</section>`;
  }


  // ---- Blocos "arquivo" e "bloco": desenhos com calculadora (offset por RRN; fator de bloco e sobra) ----
  const ARQUIVO_MAX_RRN = 999999999;
  const ARQUIVO_MAX_BYTES = 1000000;
  const BLOCO_MAX = 1048576;
  const ARQUIVO_ERRO = "Digite um RRN inteiro, a partir de 0.";
  const BLOCO_ERRO = `Digite tamanhos inteiros em bytes, de 1 a ${fmtInt(BLOCO_MAX)}.`;

  function fmtInt(n) {
    return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  }

  function fmtPct(part, total) {
    const v = (part / total) * 100;
    if (v === 0) return "0%";
    if (v < 0.05) return "menos de 0,1%";
    return `${String(Math.round(v * 10) / 10).replace(".", ",")}%`;
  }

  const inteiro = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

  function arquivoResultado(cab, reg, rrn) {
    const inicio = cab + rrn * reg;
    const conta = cab > 0 ? `${fmtInt(cab)} + ${fmtInt(rrn)} × ${fmtInt(reg)}` : `${fmtInt(rrn)} × ${fmtInt(reg)}`;
    return `O RRN ${fmtInt(rrn)} começa no byte <code>${conta} = ${fmtInt(inicio)}</code> e ocupa os bytes ${fmtInt(inicio)} a ${fmtInt(inicio + reg - 1)}.`;
  }

  function renderArquivo(source) {
    const data = parseJson(source);
    if (!data || typeof data !== "object") return blockError("Este bloco de arquivo tem um erro de formato.");
    const cab = data.cabecalho === undefined ? 0 : data.cabecalho;
    const reg = data.registro;
    const mostrar = data.mostrar === undefined ? 4 : data.mostrar;
    if (!inteiro(reg, 1, ARQUIVO_MAX_BYTES) || !inteiro(cab, 0, ARQUIVO_MAX_BYTES) || !inteiro(mostrar, 1, 8)) {
      return blockError(`O arquivo precisa de "registro" (1 a ${ARQUIVO_MAX_BYTES} bytes), "cabecalho" opcional (0 a ${ARQUIVO_MAX_BYTES}) e "mostrar" opcional (1 a 8 registros).`);
    }
    const rrn = data.rrn === undefined ? Math.min(3, mostrar - 1) : data.rrn;
    if (!inteiro(rrn, 0, ARQUIVO_MAX_RRN)) return blockError(`O "rrn" inicial precisa ser um inteiro de 0 a ${ARQUIVO_MAX_RRN}.`);
    const titulo = String(data.titulo || "Arquivo de registros de tamanho fixo");

    const celulas = [];
    const marcas = [];
    if (cab > 0) {
      celulas.push(`<div class="arquivo-cell arquivo-head"><span class="arquivo-label">cabeçalho</span><span class="arquivo-size">${fmtInt(cab)} bytes</span></div>`);
      marcas.push('<span class="arquivo-tick head">0</span>');
    }
    for (let i = 0; i < mostrar; i += 1) {
      celulas.push(`<button type="button" class="arquivo-cell arquivo-rec" data-arquivo-rrn="${i}" aria-pressed="${i === rrn}" aria-label="RRN ${i}: ${fmtInt(reg)} bytes"><span class="arquivo-label">R${i}</span><span class="arquivo-size">${fmtInt(reg)} bytes</span></button>`);
      marcas.push(`<span class="arquivo-tick">${fmtInt(cab + i * reg)}</span>`);
    }
    celulas.push('<div class="arquivo-cell arquivo-more" aria-hidden="true">…</div>');
    marcas.push(`<span class="arquivo-tick more">${fmtInt(cab + mostrar * reg)}</span>`);

    return `<section class="arquivo" data-kind="arquivo" data-cab="${cab}" data-reg="${reg}" aria-label="${escapeHtml(titulo)}"><p class="arquivo-title">${escapeHtml(titulo)}</p>`
      + `<div class="arquivo-bar">${celulas.join("")}</div><div class="arquivo-ticks" aria-hidden="true">${marcas.join("")}</div>`
      + '<p class="arquivo-note">O número abaixo de cada faixa é o byte onde ela começa, contado a partir do início do arquivo.</p>'
      + `<div class="arquivo-calc"><label class="arquivo-field">RRN <input type="number" class="arquivo-input" data-arquivo-input min="0" max="${ARQUIVO_MAX_RRN}" step="1" inputmode="numeric" value="${rrn}"></label>`
      + `<p class="arquivo-result" aria-live="polite">${arquivoResultado(cab, reg, rrn)}</p></div></section>`;
  }

  function blocoParts(B, R) {
    const fator = Math.floor(B / R);
    const usado = fator * R;
    const sobra = B - usado;
    const plural = fator === 1 ? "registro" : "registros";
    const calc = fator === 0
      ? `<li>O registro (${fmtInt(R)} bytes) é maior que o bloco (${fmtInt(B)} bytes): na organização não espalhada, nenhum registro cabe.</li>`
      : `<li>fator de bloco = ${fmtInt(B)} / ${fmtInt(R)} = <strong>${fmtInt(fator)} ${plural}</strong></li>`
        + `<li>registros: ${fmtInt(fator)} × ${fmtInt(R)} = ${fmtInt(usado)} bytes</li>`
        + `<li>sobra: ${fmtInt(B)} − ${fmtInt(usado)} = <strong>${fmtInt(sobra)} bytes</strong> (${fmtPct(sobra, B)} do bloco)</li>`;
    return {
      fator,
      sobra,
      dense: fator > 200,
      wRecs: Math.round((usado / B) * 100000) / 1000,
      wSobra: Math.round((sobra / B) * 100000) / 1000,
      calc,
      legenda: `<span><i class="bloco-key recs"></i>${fmtInt(fator)} ${plural} (${fmtInt(usado)} bytes)</span><span><i class="bloco-key sobra"></i>sobra: ${fmtInt(sobra)} bytes</span>`,
      label: `Bloco de ${fmtInt(B)} bytes com ${fmtInt(fator)} ${plural} de ${fmtInt(R)} bytes e ${fmtInt(sobra)} bytes de sobra.`,
    };
  }

  function renderBloco(source) {
    const data = parseJson(source);
    if (!data || typeof data !== "object") return blockError("Este bloco de bloco de disco tem um erro de formato.");
    const B = data.bloco;
    const R = data.registro;
    if (!inteiro(B, 1, BLOCO_MAX) || !inteiro(R, 1, B)) {
      return blockError(`O bloco precisa de "bloco" (1 a ${BLOCO_MAX} bytes) e de "registro" (1 byte até o tamanho do bloco).`);
    }
    const exemplos = data.exemplos === undefined ? [] : data.exemplos;
    const exemplosOk = Array.isArray(exemplos) && exemplos.length <= 6
      && exemplos.every((e) => e && typeof e.rotulo === "string" && e.rotulo.trim() && inteiro(e.registro, 1, BLOCO_MAX) && (e.bloco === undefined || inteiro(e.bloco, 1, BLOCO_MAX)));
    if (!exemplosOk) return blockError(`Os exemplos do bloco aceitam até 6 itens, cada um com "rotulo" e "registro" (e "bloco" opcional), em bytes de 1 a ${BLOCO_MAX}.`);
    const titulo = String(data.titulo || "Bloco de disco com registros de tamanho fixo");
    const parts = blocoParts(B, R);
    const campo = (nome, rotulo, valor) => `<label class="bloco-field">${rotulo} <input type="number" class="bloco-input" data-bloco-input="${nome}" min="1" max="${BLOCO_MAX}" step="1" inputmode="numeric" value="${valor}"> bytes</label>`;
    const presets = exemplos.length
      ? `<div class="bloco-presets"><span class="bloco-presets-label">Experimente:</span>${exemplos.map((e) => `<button type="button" class="bloco-preset" data-bloco-set data-registro="${e.registro}"${e.bloco ? ` data-bloco="${e.bloco}"` : ""}>${escapeHtml(e.rotulo)}</button>`).join("")}</div>`
      : "";
    return `<section class="bloco" data-kind="bloco" aria-label="${escapeHtml(titulo)}"><p class="bloco-title">${escapeHtml(titulo)}</p>`
      + `<div class="bloco-fields">${campo("bloco", "Bloco", B)}${campo("registro", "Registro", R)}</div>${presets}`
      + `<div class="bloco-bar" role="img" aria-label="${parts.label}"><div class="bloco-recs" data-dense="${parts.dense}" style="--w:${parts.wRecs};--n:${Math.max(parts.fator, 1)}"></div><div class="bloco-sobra" data-has="${parts.sobra > 0}" style="--w:${parts.wSobra}"></div></div>`
      + `<div class="bloco-ticks" aria-hidden="true"><span>byte 0</span><span class="bloco-end">byte ${fmtInt(B)}</span></div>`
      + `<ul class="bloco-calc" aria-live="polite">${parts.calc}</ul><p class="bloco-legend">${parts.legenda}</p></section>`;
  }

  const BLOCK_RENDERERS = { video: renderVideo, slides: renderSlides, demo: renderDemo, carrossel: renderCarrossel, exercicio: renderExercise, codigo: renderCodigo, registro: renderRegistro, arquivo: renderArquivo, bloco: renderBloco };

  // Ponte para o renderizador do site: devolve o HTML do bloco, ou null se a linguagem não é nossa.
  function renderBlock(language, source, options = {}) {
    if (typeof language !== "string") return null;
    if (BLOCK_RENDERERS[language]) return BLOCK_RENDERERS[language](source, options);
    if (FENCE_CLASSES[language]) return `<pre class="${FENCE_CLASSES[language]}"><code>${escapeHtml(source)}</code></pre>`;
    return null;
  }

  // Depois da sanitização: troca cada "slot" de vídeo por um iframe, revalidando o endereço.
  function hydrateVideoEmbeds(root) {
    for (const slot of root.querySelectorAll("[data-embed-src]")) {
      const url = slot.getAttribute("data-embed-src");
      if (!isAllowedEmbed(url)) continue;
      const frame = document.createElement("iframe");
      frame.className = "video-embed";
      frame.src = url;
      frame.title = slot.getAttribute("data-embed-title") || "Vídeo explicativo";
      frame.loading = "lazy";
      frame.setAttribute("allowfullscreen", "");
      slot.replaceWith(frame);
    }
  }

  function showStep(stepper, delta) {
    const count = Number(stepper.dataset.count);
    const panels = Array.from(stepper.querySelectorAll(".stepper-panel"));
    const next = stepIndex(panels.findIndex((panel) => !panel.hidden), delta, count);
    panels.forEach((panel, i) => { panel.hidden = i !== next; });
    stepper.querySelector(".stepper-counter").textContent = `${next + 1} / ${count}`;
    stepper.querySelector('[data-stepper="prev"]').disabled = next === 0;
    stepper.querySelector('[data-stepper="next"]').disabled = next === count - 1;
    if (stepper.dataset.kind === "codigo") {
      const line = Number(panels[next].dataset.line) || 0;
      const lines = stepper.querySelectorAll(".cline");
      lines.forEach((el, i) => el.classList.toggle("on", i + 1 === line));
      // código longo: rola só a caixa do código (não a página) para a linha atual ficar visível
      const box = stepper.querySelector(".codigo-code");
      const el = lines[line - 1];
      if (box && el && (el.offsetTop < box.scrollTop + 24 || el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight - 24)) {
        box.scrollTop = Math.max(0, el.offsetTop - box.clientHeight / 2);
      }
    }
    return next;
  }

  function stopPlay(stepper) {
    if (stepper.__timer) { clearInterval(stepper.__timer); stepper.__timer = null; }
    const play = stepper.querySelector('[data-stepper="play"]');
    if (play) { play.textContent = "▶ Executar"; play.classList.remove("playing"); }
  }

  function togglePlay(stepper) {
    if (stepper.__timer) { stopPlay(stepper); return; }
    const count = Number(stepper.dataset.count);
    const panels = Array.from(stepper.querySelectorAll(".stepper-panel"));
    if (panels.findIndex((panel) => !panel.hidden) >= count - 1) showStep(stepper, -count);
    const play = stepper.querySelector('[data-stepper="play"]');
    play.textContent = "⏸ Pausar"; play.classList.add("playing");
    stepper.__timer = setInterval(() => {
      const at = showStep(stepper, 1);
      if (at >= count - 1) stopPlay(stepper);
    }, 1300);
  }

  // Bloco "registro": troca de exemplo (abas) e destaque de um campo (clique de novo para voltar ao resumo).
  function resetRegistroPanel(panel) {
    panel.querySelectorAll(".registro-seg").forEach((seg) => seg.setAttribute("aria-pressed", "false"));
    panel.querySelectorAll(".registro-info").forEach((info) => { info.hidden = info.dataset.info !== "resumo"; });
  }

  function toggleRegistro(button) {
    const root = button.closest(".registro");
    if (!root) return;
    if (button.dataset.registroEx !== undefined) {
      root.querySelectorAll(".registro-tab").forEach((tab) => tab.setAttribute("aria-pressed", String(tab === button)));
      root.querySelectorAll(".registro-ex").forEach((panel) => {
        panel.hidden = panel.dataset.ex !== button.dataset.registroEx;
        resetRegistroPanel(panel);
      });
      return;
    }
    const panel = button.closest(".registro-ex");
    const wasOn = button.getAttribute("aria-pressed") === "true";
    resetRegistroPanel(panel);
    if (wasOn) return;
    button.setAttribute("aria-pressed", "true");
    panel.querySelectorAll(".registro-info").forEach((info) => { info.hidden = info.dataset.info !== button.dataset.registroCampo; });
  }

  // Exercício com alternativas: acerto trava o exercício e abre o gabarito; erro marca só aquela alternativa.
  function answerExercise(button) {
    const root = button.closest(".exercise");
    if (!root || root.dataset.solved === "true" || button.classList.contains("wrong")) return;
    const picked = button.dataset.exerciseOption;
    const right = picked === root.dataset.correct;
    button.classList.add(right ? "correct" : "wrong");
    button.setAttribute("aria-pressed", "true");
    root.querySelectorAll(".exercise-feedback").forEach((feedback) => { feedback.hidden = feedback.dataset.for !== picked; });
    if (right) {
      root.dataset.solved = "true";
      const solution = root.querySelector(".exercise-solution");
      if (solution) solution.open = true;
    }
  }

  // Bloco "arquivo": clicar num registro (ou digitar um RRN) recalcula o offset.
  function updateArquivo(root, raw) {
    const text = String(raw).trim();
    const rrn = Number(text);
    const valid = /^\d+$/.test(text) && rrn <= ARQUIVO_MAX_RRN;
    root.querySelectorAll(".arquivo-rec").forEach((cell) => cell.setAttribute("aria-pressed", String(valid && cell.dataset.arquivoRrn === String(rrn))));
    root.querySelector(".arquivo-result").innerHTML = valid ? arquivoResultado(Number(root.dataset.cab), Number(root.dataset.reg), rrn) : ARQUIVO_ERRO;
  }

  // Bloco "bloco": recalcula fator de bloco, sobra e a barra quando o aluno muda os tamanhos.
  function updateBloco(root) {
    const parse = (name) => {
      const text = root.querySelector(`[data-bloco-input="${name}"]`).value.trim();
      const n = Number(text);
      return /^\d+$/.test(text) && n >= 1 && n <= BLOCO_MAX ? n : null;
    };
    const B = parse("bloco");
    const R = parse("registro");
    const calc = root.querySelector(".bloco-calc");
    if (B === null || R === null) { calc.innerHTML = `<li>${BLOCO_ERRO}</li>`; return; }
    const parts = blocoParts(B, R);
    const recs = root.querySelector(".bloco-recs");
    const sobra = root.querySelector(".bloco-sobra");
    recs.style.setProperty("--w", parts.wRecs);
    recs.style.setProperty("--n", Math.max(parts.fator, 1));
    recs.dataset.dense = String(parts.dense);
    sobra.style.setProperty("--w", parts.wSobra);
    sobra.dataset.has = String(parts.sobra > 0);
    root.querySelector(".bloco-bar").setAttribute("aria-label", parts.label);
    root.querySelector(".bloco-end").textContent = `byte ${fmtInt(B)}`;
    calc.innerHTML = parts.calc;
    root.querySelector(".bloco-legend").innerHTML = parts.legenda;
  }

  // Botões e setas ← → dos slides e das demonstrações (escuta delegada, instalada uma única vez).
  function attachInteractions(root) {
    if (root.__lessonInteractions) return;
    root.__lessonInteractions = true;
    root.addEventListener("input", (event) => {
      const target = event.target;
      if (!target || !target.matches) return;
      if (target.matches("[data-arquivo-input]")) {
        const box = target.closest(".arquivo");
        if (box) updateArquivo(box, target.value);
      } else if (target.matches("[data-bloco-input]")) {
        const box = target.closest(".bloco");
        if (box) updateBloco(box);
      }
    });
    root.addEventListener("click", (event) => {
      const arquivoCell = event.target.closest("[data-arquivo-rrn]");
      if (arquivoCell) {
        const box = arquivoCell.closest(".arquivo");
        box.querySelector("[data-arquivo-input]").value = arquivoCell.dataset.arquivoRrn;
        updateArquivo(box, arquivoCell.dataset.arquivoRrn);
        return;
      }
      const blocoPreset = event.target.closest("[data-bloco-set]");
      if (blocoPreset) {
        const box = blocoPreset.closest(".bloco");
        box.querySelector('[data-bloco-input="registro"]').value = blocoPreset.dataset.registro;
        if (blocoPreset.dataset.bloco) box.querySelector('[data-bloco-input="bloco"]').value = blocoPreset.dataset.bloco;
        updateBloco(box);
        return;
      }
      const exerciseButton = event.target.closest("[data-exercise-option]");
      if (exerciseButton) { answerExercise(exerciseButton); return; }
      const registroButton = event.target.closest("[data-registro-ex], [data-registro-campo]");
      if (registroButton) { toggleRegistro(registroButton); return; }
      const button = event.target.closest("[data-stepper]");
      if (!button || button.disabled) return;
      const stepper = button.closest(".stepper");
      if (button.dataset.stepper === "play") { togglePlay(stepper); return; }
      stopPlay(stepper);
      showStep(stepper, button.dataset.stepper === "next" ? 1 : -1);
    });
    root.addEventListener("keydown", (event) => {
      const stepper = event.target.closest(".stepper");
      if (!stepper || event.target !== stepper) return;
      if (event.key === "ArrowRight") { event.preventDefault(); stopPlay(stepper); showStep(stepper, 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); stopPlay(stepper); showStep(stepper, -1); }
    });
  }

  function renderQuiz(source, index) {
    let quiz;
    try { quiz = JSON.parse(source); }
    catch { return '<p class="quiz-error">Este teste tem um erro de formato. Confira o bloco de teste no arquivo Markdown.</p>'; }
    if (!quiz.question || !Array.isArray(quiz.options) || quiz.options.length < 2) {
      return '<p class="quiz-error">Este teste precisa de uma pergunta e pelo menos duas alternativas.</p>';
    }
    const correctIndex = quiz.options.findIndex((option) => option.correct === true);
    if (correctIndex < 0) return '<p class="quiz-error">Marque uma alternativa como correta usando "correct": true.</p>';
    const questionId = `quiz-${index}`;
    const options = quiz.options.map((option, optionIndex) =>
      `<label for="${questionId}-option-${optionIndex}"><input id="${questionId}-option-${optionIndex}" type="radio" name="${questionId}" value="${optionIndex}"><span>${escapeHtml(option.text || "")}</span></label>`
    ).join("");
    return `<section class="knowledge-test" aria-labelledby="${questionId}-title"><h3 id="${questionId}-title">Teste de conhecimento</h3><p class="question">${escapeHtml(quiz.question)}</p><form class="quiz-form" data-correct="${correctIndex}" data-correct-feedback="${escapeHtml(quiz.correctFeedback || "Correto!")}" data-incorrect-feedback="${escapeHtml(quiz.incorrectFeedback || "Ainda não. Revise o conteúdo e tente novamente.")}"><fieldset><legend class="sr-only">Selecione uma resposta</legend>${options}</fieldset><button type="submit">Conferir resposta</button><p class="quiz-feedback" role="status" aria-live="polite"></p></form></section>`;
  }

  function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r/g, "").split("\n");
    const html = [];
    let paragraph = [];
    let listType = "";
    let codeLines = [];
    let inCode = false;
    let codeLanguage = "";
    let quizIndex = 0;

    const flushParagraph = () => {
      if (paragraph.length) html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    };
    const closeList = () => {
      if (listType) html.push(`</${listType}>`);
      listType = "";
    };
    const renderCode = () => codeLanguage === "quiz"
      ? renderQuiz(codeLines.join("\n"), quizIndex++)
      : BLOCK_RENDERERS[codeLanguage]
      ? BLOCK_RENDERERS[codeLanguage](codeLines.join("\n"))
      : `<pre${FENCE_CLASSES[codeLanguage] ? ` class="${FENCE_CLASSES[codeLanguage]}"` : ""}><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`;

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (line.trim().startsWith("```")) {
        flushParagraph(); closeList();
        if (inCode) {
          html.push(renderCode());
          codeLines = [];
          codeLanguage = "";
        } else {
          codeLanguage = line.trim().slice(3).trim().split(/\s+/)[0].toLowerCase();
        }
        inCode = !inCode;
        continue;
      }
      if (inCode) { codeLines.push(line); continue; }
      if (line.includes("|") && index + 1 < lines.length && TABLE_SEPARATOR.test(lines[index + 1])
          && parseRow(line).length === parseRow(lines[index + 1]).length) {
        flushParagraph(); closeList();
        const rows = [parseRow(line)];
        index += 2;
        while (index < lines.length && lines[index].trim() && lines[index].includes("|")) rows.push(parseRow(lines[index++]));
        index--;
        html.push(renderTable(rows));
        continue;
      }
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      const listItem = line.match(/^\s*([-*]|\d+\.)\s+(.+)$/);
      const quote = line.match(/^>\s?(.*)$/);
      if (/^\s*---+\s*$/.test(line)) { flushParagraph(); closeList(); html.push("<hr>"); continue; }
      if (!line.trim()) { flushParagraph(); closeList(); continue; }
      if (heading) {
        flushParagraph(); closeList();
        const level = heading[1].length;
        html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      } else if (listItem) {
        flushParagraph();
        const nextType = /^\d/.test(listItem[1]) ? "ol" : "ul";
        if (listType !== nextType) { closeList(); html.push(`<${nextType}>`); listType = nextType; }
        html.push(`<li>${renderInline(listItem[2])}</li>`);
      } else if (quote) {
        flushParagraph(); closeList();
        html.push(`<blockquote>${renderInline(quote[1])}</blockquote>`);
      } else {
        closeList(); paragraph.push(line.trim());
      }
    }
    flushParagraph(); closeList();
    if (inCode) html.push(renderCode());
    return html.join("\n");
  }

  return { escapeHtml, renderInline, renderMarkdown, stepIndex, renderBlock, isAllowedEmbed, hydrateVideoEmbeds, attachInteractions, highlightC };
});
