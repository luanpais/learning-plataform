## Exercícios avaliativos — Ordenação em disco e reutilização de espaço

Resolva os exercícios abaixo e abra o gabarito de cada um para conferir. Eles cobrem todas as páginas deste tópico.

## Exercícios com gabarito

```exercicio
{
  "title": "Exercício 1: intercalando à mão",
  "statement": "Intercale as runs A = [1, 4, 7, 10] e B = [2, 3, 8, 12, 15]. Escreva a saída e conte quantas comparações foram feitas.",
  "answer": "Compara 1 e 2: sai 1.\nCompara 4 e 2: sai 2.\nCompara 4 e 3: sai 3.\nCompara 4 e 8: sai 4.\nCompara 7 e 8: sai 7.\nCompara 10 e 8: sai 8.\nCompara 10 e 12: sai 10. A run A acabou.\nCopia o que sobrou de B (12 e 15) sem comparar.\n\nSaída: 1, 2, 3, 4, 7, 8, 10, 12, 15.\nComparações: 7 (o máximo possível seria 4 + 5 - 1 = 8)."
}
```

```exercicio
{
  "title": "Exercício 2: contando passadas",
  "statement": "Um arquivo tem T = 2 000 000 de registros e a memória comporta n = 50 000 de cada vez.\n\na) Quantos arquivos ordenados (k) a fase 1 gera?\nb) Quantas passadas de intercalação são necessárias com p = 2 vias? E com p = 4? E com p = 40?\nc) Contando também a fase 1, quantas vezes cada registro é lido do disco em cada caso?\nd) Por que não usar sempre o maior número de vias possível? Compare o tamanho do buffer b com p = 2 e com p = 40.",
  "answer": "a) k = 2 000 000 / 50 000 = 40 arquivos ordenados.\n\nb) p = 2: ⌈log2 40⌉ = 6 (2^5 = 32 < 40 <= 64 = 2^6). p = 4: ⌈log4 40⌉ = 3 (4^2 = 16 < 40 <= 64 = 4^3). p = 40: 1 passada.\n\nc) Cada registro é lido uma vez na fase 1 e uma vez em cada passada: 1 + 6 = 7 leituras (p = 2), 1 + 3 = 4 leituras (p = 4) e 1 + 1 = 2 leituras (p = 40).\n\nd) Com p vias existem p + 1 buffers de tamanho b = n / (p + 1). Com p = 2: b = piso(50 000 / 3) = 16 666 registros. Com p = 40: b = piso(50 000 / 41) = 1219 registros. Buffers pequenos significam leituras de poucos registros por vez e muito mais seeks entre os 40 arquivos, o que pode anular o ganho de ter menos passadas."
}
```

```exercicio
{
  "title": "Exercício 3: o esquema da aula com k + 1 buffers",
  "statement": "Um arquivo tem T = 20 000 registros e a memória comporta n = 1000 registros. Use o esquema da aula (um arquivo ordenado por bloco de n registros e uma única passada de intercalação).\n\na) Quantos arquivos ordenados (k) são gerados?\nb) Quantos buffers existem na fase 2 e qual o tamanho b de cada um?\nc) Quantas leituras de buffer são feitas, no total, para ler os k arquivos? E quantas gravações do buffer de saída?\nd) Quantas comparações, no máximo, são necessárias para escolher cada valor, com varredura linear?",
  "answer": "a) k = 20 000 / 1000 = 20 arquivos ordenados.\n\nb) Existem k + 1 = 21 buffers (20 de entrada e 1 de saída). Cada um tem b = piso(1000 / 21) = 47 registros.\n\nc) Cada arquivo tem 1000 registros, lidos em blocos de 47: teto(1000 / 47) = 22 leituras por arquivo, ou 20 x 22 = 440 leituras no total. O arquivo final tem 20 000 registros, gravados de 47 em 47: teto(20 000 / 47) = 426 gravações.\n\nd) A varredura compara as cabeças dos 20 buffers: no máximo k - 1 = 19 comparações por registro. (Um heap reduziria isso para cerca de log2 20.)"
}
```

```exercicio
{
  "title": "Exercício 4: seleção por substituição",
  "statement": "A memória comporta n = 3 registros. A entrada é: 29, 14, 38, 11, 24, 7, 33, 10, 45, 3, 18, 26.\n\na) Gere as runs com seleção por substituição.\nb) Compare com o método de ordenar blocos de 3 registros na memória: quantas runs cada método gera?",
  "answer": "a) Carrega 29, 14 e 38. Saem, na run 1: 14 (entra 11, que é menor que 14 e fica para a próxima run), 29 (entra 24, também fica para a próxima) e 38 (entra 7, fica para a próxima). Run 1 = [14, 29, 38].\n\nRun 2 começa com 11, 24 e 7 na memória: sai 7 (entra 33, que serve), sai 11 (entra 10, fica para a próxima), sai 24 (entra 45, serve), sai 33 (entra 3, fica para a próxima), sai 45 (entra 18, fica para a próxima). Run 2 = [7, 11, 24, 33, 45].\n\nRun 3 começa com 10, 3 e 18: sai 3 (entra 26, serve), 10, 18 e 26. Run 3 = [3, 10, 18, 26].\n\nb) Seleção por substituição: 3 runs, de tamanhos 3, 5 e 4. Blocos de 3 ordenados na memória: 4 runs, todas de tamanho 3 ([14,29,38], [7,11,24], [10,33,45], [3,18,26]). A seleção por substituição gera menos runs, o que reduz o trabalho da fase 2."
}
```

```exercicio
{
  "title": "Exercício 5: polifásica com 3 arquivos",
  "statement": "Há 13 runs distribuídas em 3 arquivos: 8 no arquivo 1, 5 no arquivo 2 e 0 no arquivo 3. Simule a intercalação polifásica e indique, a cada fase, quantas runs há em cada arquivo. Quantas fases são necessárias?",
  "answer": "Fase 0: (8, 5, 0)\nFase 1: intercala 5 runs de 1 e 2 em 3 -> (3, 0, 5)\nFase 2: intercala 3 runs de 1 e 3 em 2 -> (0, 3, 2)\nFase 3: intercala 2 runs de 2 e 3 em 1 -> (2, 1, 0)\nFase 4: intercala 1 run de 1 e 2 em 3 -> (1, 0, 1)\nFase 5: intercala 1 run de 1 e 3 em 2 -> (0, 1, 0)\n\nSão 5 fases de intercalação e, no final, o arquivo 2 tem uma única run com tudo ordenado. Note que 8 e 5 são números consecutivos de Fibonacci, por isso nenhuma run fictícia foi necessária."
}
```

```exercicio
{
  "title": "Exercício 6: first-fit, best-fit e worst-fit",
  "statement": "A lista de vagas, na ordem do arquivo, é: 100, 40, 70 e 30 bytes. Para o best-fit a lista é mantida em ordem crescente e, para o worst-fit, em ordem decrescente. Chegam dois pedidos, nesta ordem: 35 bytes e 50 bytes. A sobra de cada vaga volta à lista (na posição certa, se ela for ordenada).\n\na) Qual a lista de vagas depois dos dois pedidos com first-fit, com best-fit e com worst-fit?\nb) Em qual caso um terceiro pedido de 80 bytes ainda seria atendido?\nc) Se o registro de 35 bytes for gravado na vaga de 40 bytes sem dividi-la, o que são os 5 bytes que sobram? E se a vaga for dividida e o pedaço de 5 bytes voltar para a lista?",
  "answer": "a) First-fit (lista na ordem do arquivo): 35 vai para a 100 (sobra 65); 50 vai para a 65 (sobra 15). Lista: 15, 40, 70, 30.\nBest-fit (lista crescente: 30, 40, 70, 100): 35 vai para a 40 (sobra 5); 50 vai para a 70 (sobra 20). Lista: 5, 20, 30, 100.\nWorst-fit (lista decrescente: 100, 70, 40, 30): 35 vai para a 100 (sobra 65); 50 vai para a 70, a maior que sobrou (sobra 20). Lista: 65, 40, 30, 20.\n\nb) Só com best-fit: sobrou uma vaga de 100. Com first-fit a maior vaga é 70 e com worst-fit é 65.\n\nc) Sem dividir a vaga: os 5 bytes são fragmentação interna (espaço desperdiçado dentro da área do registro). Dividindo: o pedaço de 5 bytes fica na lista como uma vaga pequena demais para quase qualquer registro, e isso é fragmentação externa."
}
```

```exercicio
{
  "title": "Exercício 7: compactar ou não?",
  "statement": "Um arquivo de registros de tamanho variável tem 40% do espaço em vagas pequenas e espalhadas, e pedidos de gravação de registros maiores que qualquer vaga estão falhando. Qual problema é esse? Cite uma solução e o seu custo.",
  "answer": "É fragmentação externa: há espaço livre suficiente no total, mas nenhuma vaga serve sozinha.\n\nSolução: compactar o arquivo. O jeito mais simples, havendo espaço em disco, é copiar o arquivo para outro pulando os registros removidos; o espaço livre passa a ficar todo no fim. Custo: é preciso ler e reescrever grande parte do arquivo, o que é caro em acessos ao disco, e se há índices que guardam posições eles precisam ser atualizados. Compactar no próprio arquivo é possível, mas mais complicado e mais lento. Por isso a compactação costuma ser feita de tempos em tempos, e não a cada remoção. Uma alternativa mais barata é juntar vagas vizinhas assim que ficam lado a lado."
}
```
