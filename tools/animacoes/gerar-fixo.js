// Gera o bloco "codigo" da leitura de registros de tamanho fixo por RRN. Uso: node gerar-fixo.js
const { executarEConferir, lerEventos, conferirQuadros, gravarBloco } = require("./lib.js");
const { it } = require("./texto.js");

const { codigo, tagLinha, bruto, impresso } = executarEConferir("fixo.c", __dirname);
if (impresso.replace(/\r/g, "").trim() !== "registro 2: Carla, EM\nregistro 2: Carla, SI") throw new Error("resultado inesperado: " + impresso);

const TAM = 24, CAB = 4;
const alunos = [["Ana", "SI"], ["Bruno", "EC"], ["Carla", "EM"], ["Davi", "CC"]];
const letras = alunos.map((a) => a[0][0]);
const inicios = alunos.map((_, i) => CAB + i * TAM);
const FIM = CAB + alunos.length * TAM;
const cor = (s) => s.charCodeAt(0) % 12;
const eventos = lerEventos(bruto, tagLinha);

const quadros = [];
let alvo = -1;          // RRN em foco
let cursoNovo = false;  // o curso do registro 2 já foi regravado?
for (const ev of eventos) {
  const t = ev.tag, v = ev.vars;
  if (v.rrn !== undefined) alvo = v.rrn;
  const pos = v.pos !== undefined ? v.pos : -1;
  const curso = (i) => (i === 2 && cursoNovo ? "SI" : alunos[i][1]);
  let caption = "", marca = "", memoria = null, stack = "le ← main";
  if (t === "criado") { stack = "main"; caption = `O programa gravou o cabeçalho (4 bytes, com a quantidade de registros) e 4 registros de ${TAM} bytes cada. O registro de RRN i começa no byte ${CAB} + i × ${TAM}: ${inicios.join(", ")}. O arquivo termina no byte ${FIM}.`; }
  if (t === "pede") { stack = "main"; caption = "Queremos o registro de RRN 2 (o terceiro). Não vamos ler os registros 0 e 1: vamos calcular onde o 2 começa."; }
  if (t === "conta") { marca = "c"; caption = `Conta direta: cabeçalho + RRN × tamanho = ${CAB} + ${v.rrn} × ${TAM} = ${v.alvo}. É o byte onde o registro ${v.rrn} começa.`; }
  if (t === "salta") { marca = "c"; caption = `O fseek leva a cabeça de leitura direto ao byte ${pos}. Foi um único salto, sem ler nenhum outro registro.`; }
  if (t === "leu") { marca = "p"; memoria = alunos[alvo].slice(0, 1).concat(curso(alvo)); caption = `O fread copiou ${TAM} bytes para a variável a. Agora a cabeça de leitura está no byte ${pos}, onde começa o registro seguinte.`; }
  if (t === "mostra" || t === "mostra2") { stack = "main"; marca = "p"; memoria = [alunos[alvo][0], curso(alvo)]; caption = `Registro ${alvo} lido: ${alunos[alvo][0]}, ${curso(alvo)}.`; }
  if (t === "atualiza") { stack = "main"; marca = "p"; memoria = [alunos[alvo][0], "EM"]; caption = "Vamos trocar o curso do registro 2, de EM para SI, primeiro na memória."; }
  if (t === "regrava") { stack = "main"; cursoNovo = true; marca = "p"; memoria = [alunos[alvo][0], "SI"]; caption = "Na memória o curso já é SI. O grava usa a mesma conta (4 + 2 × 24 = 52) e escreve os 24 bytes por cima do registro antigo. O tamanho é igual, então nada se desloca e os outros registros não são tocados."; }
  if (t === "fim") { stack = "main"; caption = "Pronto: lemos e atualizamos o registro 2 sem mexer nos demais. Com tamanho fixo, cada registro tem endereço calculável."; }

  const foco = (i) => (i === alvo && marca && t !== "criado" ? marca : "");
  const cab = it("cab", "", 8);
  const regs = alunos.map((a, i) => it(letras[i], foco(i), cor(a[0])));
  const itens = [cab, ...regs, it("·", "g", 0)];
  const offs = [it("0", "", 8), ...inicios.map((x, i) => it(String(x), foco(i), cor(alunos[i][0]))), it(String(FIM), "", 0)];
  const rows = [
    [{ s: 0, n: 6, i: itens, l: "arquivo (cab = cabeçalho; A = Ana, B = Bruno, C = Carla, D = Davi)" }],
    [{ s: 0, n: 6, i: offs, l: "byte onde cada parte começa (o último é o fim do arquivo)" }],
  ];
  if (memoria) rows.push([{ i: memoria.map((x, k) => it(x, "p", cor(x) + k)), l: "campos do registro na memória (nome, curso)" }]);
  const vars = {};
  if (alvo >= 0 && t !== "criado") vars.rrn = alvo;
  if (t === "conta") vars.alvo = v.alvo;
  if (pos >= 0 && t !== "criado") vars["cabeça (byte)"] = pos;
  quadros.push({ line: tagLinha[t], caption, vars, rows, stack });
}
conferirQuadros(quadros);
gravarBloco(__dirname, "fixo", { title: "Registros de tamanho fixo: do RRN ao byte", code: codigo, steps: quadros });
