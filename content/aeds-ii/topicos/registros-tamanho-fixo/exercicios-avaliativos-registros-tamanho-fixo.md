## Exercícios avaliativos — Registros de tamanho fixo

Escolha a alternativa de cada exercício: o site mostra na hora se ela está correta e, se não estiver, explica o erro. Depois abra o gabarito para ver a resolução completa. Os exercícios cobrem todas as páginas deste tópico.

## Exercícios com gabarito

```exercicio
{
  "title": "Exercício 1: onde começa o registro",
  "statement": "Um arquivo tem cabeçalho de 8 bytes e registros de 70 bytes. Os RRN começam em zero.\n\na) Em que byte começa o registro de RRN 0?\nb) E o de RRN 5?\nc) E o de RRN 199?\nd) Se o arquivo tem 200 registros, qual é o tamanho total dele?",
  "options": [
    {
      "text": "a) 0\nb) 350\nc) 13 930\nd) 14 000 bytes",
      "feedback": "Isso ignora o cabeçalho de 8 bytes, que vem antes do primeiro registro. O offset é cabeçalho + RRN × tamanho."
    },
    {
      "text": "a) 8\nb) 358\nc) 13 938\nd) 14 008 bytes",
      "correct": true,
      "feedback": "Offset = 8 + RRN × 70. O registro de RRN 199 termina exatamente onde o arquivo termina (13 938 + 70 = 14 008)."
    },
    {
      "text": "a) 0\nb) 390\nc) 15 522\nd) 15 600 bytes",
      "feedback": "Aqui o cabeçalho foi somado a cada registro (70 + 8 = 78). Ele aparece uma única vez, no começo do arquivo."
    },
    {
      "text": "a) 8\nb) 358\nc) 13 938\nd) 14 000 bytes",
      "feedback": "Os três primeiros itens estão certos, mas o tamanho total também inclui o cabeçalho: 8 + 200 × 70 = 14 008."
    }
  ],
  "answer": "Use offset = cabeçalho + RRN x tamanho.\n\na) 8 + 0 x 70 = 8.\n\nb) 8 + 5 x 70 = 8 + 350 = 358.\n\nc) 8 + 199 x 70 = 8 + 13 930 = 13 938.\n\nd) 8 + 200 x 70 = 8 + 14 000 = 14 008 bytes. Repare que o registro de RRN 199 termina exatamente onde o arquivo termina: 13 938 + 70 = 14 008."
}
```

```exercicio
{
  "title": "Exercício 2: quantos registros tem o arquivo",
  "statement": "Um programa abre um arquivo de registros fixos de 70 bytes, com cabeçalho de 4 bytes. Ele usa fseek para ir ao fim do arquivo e ftell devolve 7 004. Quantos registros o arquivo guarda? Qual é o RRN do último?",
  "options": [
    {
      "text": "100 registros; o último tem RRN 100.",
      "feedback": "O RRN começa em zero: com 100 registros, o último é o RRN 99. O RRN 100 seria o próximo a ser inserido."
    },
    {
      "text": "101 registros; o último tem RRN 100.",
      "feedback": "Esse resultado vem de 7 004 / 70 = 100,06 arredondado para cima. Falta descontar o cabeçalho de 4 bytes, que não é registro."
    },
    {
      "text": "100 registros; o último tem RRN 99.",
      "correct": true,
      "feedback": "(7 004 − 4) / 70 = 100 registros. Como o RRN começa em zero, o último é o 99."
    },
    {
      "text": "99 registros; o último tem RRN 98.",
      "feedback": "(7 004 − 4) / 70 dá 100, não 99. Confira a divisão."
    }
  ],
  "answer": "Quantidade = (tamanho do arquivo - cabeçalho) / tamanho do registro = (7 004 - 4) / 70 = 7 000 / 70 = 100 registros.\n\nComo o RRN começa em zero, o último registro tem RRN 99. Um registro novo, inserido no fim, receberia o RRN 100."
}
```

```exercicio
{
  "title": "Exercício 3: o sizeof surpreende",
  "statement": "Considere a struct abaixo, com int de 4 bytes e alinhamento em múltiplos de 4:\n\nstruct Item {\n    char tipo;\n    int codigo;\n    char sigla[3];\n};\n\na) Qual é a soma dos tamanhos dos campos?\nb) Qual será o sizeof(struct Item)? Explique.\nc) Reordene os campos para diminuir o tamanho.",
  "options": [
    {
      "text": "a) 8 bytes\nb) 8 bytes, sem preenchimento\nc) A ordem dos campos não altera o tamanho.",
      "feedback": "O compilador alinha o int em um endereço múltiplo de 4 e insere bytes de preenchimento. Por isso a ordem dos campos muda o sizeof."
    },
    {
      "text": "a) 8 bytes\nb) 11 bytes\nc) int codigo; char tipo; char sigla[3];",
      "feedback": "Faltou 1 byte: depois de sigla entra mais um byte de preenchimento, para o tamanho da struct ser múltiplo de 4. O sizeof é 12."
    },
    {
      "text": "a) 8 bytes\nb) 12 bytes\nc) Não existe ordem que reduza o tamanho.",
      "feedback": "Existe: agrupando o int primeiro e os char juntos, os preenchimentos desaparecem e o sizeof cai para 8."
    },
    {
      "text": "a) 8 bytes\nb) 12 bytes (3 de preenchimento depois de tipo e 1 no final)\nc) int codigo; char tipo; char sigla[3]; (sizeof 8)",
      "correct": true,
      "feedback": "1 + 4 + 3 = 8, mas o alinhamento leva o sizeof a 12. Com o int primeiro, os campos somam 8 e já ficam alinhados."
    }
  ],
  "answer": "a) 1 + 4 + 3 = 8 bytes.\n\nb) O sizeof é 12 bytes. O compilador coloca 3 bytes de preenchimento depois de tipo, para que o int comece em um endereço múltiplo de 4. Depois de sigla, mais 1 byte de preenchimento completa o tamanho para um múltiplo de 4, que é o alinhamento da struct.\n\nc) Colocando o int primeiro: int codigo; char tipo; char sigla[3]; Os campos somam 4 + 1 + 3 = 8 bytes, já alinhados, e o sizeof fica 8. Em um arquivo com milhões de registros, essa diferença de 4 bytes por registro importa."
}
```

```exercicio
{
  "title": "Exercício 4: blocagem",
  "statement": "Os blocos do disco têm 2 048 bytes e os registros têm 100 bytes. O arquivo tem 10 000 registros. Na organização NÃO espalhada, calcule:\n\na) o fator de bloco;\nb) a sobra em cada bloco;\nc) o número de blocos;\nd) quantos bytes são desperdiçados em sobras (considere todos os blocos cheios).\n\nE na organização espalhada, de quantos blocos o arquivo precisa?",
  "options": [
    {
      "text": "a) 20 registros por bloco\nb) 48 bytes de sobra por bloco\nc) 500 blocos\nd) 24 000 bytes de sobra\nEspalhada: 489 blocos",
      "correct": true,
      "feedback": "20 = 2 048 / 100 (divisão inteira); sobra = 2 048 − 20 × 100 = 48; 10 000 / 20 = 500 blocos; 500 × 48 = 24 000. Espalhada: 1 000 000 / 2 048 = 488,3, ou seja, 489 blocos."
    },
    {
      "text": "a) 20 registros por bloco\nb) 48 bytes de sobra por bloco\nc) 500 blocos\nd) 24 000 bytes de sobra\nEspalhada: 500 blocos",
      "feedback": "Os itens a) a d) estão certos. Na organização espalhada não há sobra: 1 000 000 / 2 048 = 488,3, então são 489 blocos."
    },
    {
      "text": "a) 20 registros por bloco\nb) 48 bytes de sobra por bloco\nc) 489 blocos\nd) 23 472 bytes de sobra\nEspalhada: 489 blocos",
      "feedback": "489 é o número de blocos da organização espalhada. Na não espalhada, cada bloco guarda 20 registros: 10 000 / 20 = 500 blocos."
    },
    {
      "text": "a) 20 registros por bloco\nb) 48 bytes de sobra por bloco\nc) 500 blocos\nd) 48 bytes de sobra\nEspalhada: 489 blocos",
      "feedback": "A sobra de 48 bytes acontece em cada um dos 500 blocos: 500 × 48 = 24 000 bytes no arquivo todo."
    }
  ],
  "answer": "a) Fator de bloco = 2 048 / 100 = 20 (divisão inteira).\n\nb) Sobra = 2 048 - 20 x 100 = 48 bytes por bloco.\n\nc) Blocos = 10 000 / 20 = 500 blocos.\n\nd) 500 x 48 = 24 000 bytes de sobra, cerca de 2,3% do espaço ocupado (500 x 2 048 = 1 024 000 bytes para 1 000 000 de bytes de dados).\n\nNa organização espalhada não há sobra entre registros: 1 000 000 / 2 048 = 488,3, então o arquivo ocupa 489 blocos. A economia de 11 blocos custa o fato de alguns registros ficarem divididos entre dois blocos, o que exige duas leituras."
}
```

```exercicio
{
  "title": "Exercício 5: fragmentação interna",
  "statement": "Um cadastro tem 50 000 registros. O campo nome tem 40 bytes e os nomes têm, em média, 12 caracteres. O campo curso tem 20 bytes e os cursos têm, em média, 9 caracteres.\n\na) Quantos bytes são desperdiçados por registro nesses dois campos?\nb) Quantos bytes são desperdiçados no arquivo todo?\nc) O que você poderia fazer para reduzir esse desperdício?",
  "options": [
    {
      "text": "a) 21 bytes por registro\nb) 1 050 000 bytes no arquivo\nc) Reduzir o tamanho dos campos ou usar registros variáveis.",
      "feedback": "21 (12 + 9) é o que os campos usam. O desperdício é o que sobra: 28 + 11 = 39 bytes por registro."
    },
    {
      "text": "a) 39 bytes por registro\nb) 1 950 000 bytes no arquivo\nc) Aumentar o tamanho dos campos para caber nomes mais longos.",
      "feedback": "Os cálculos estão certos, mas aumentar os campos aumenta o desperdício. O caminho é reduzir os campos ou passar para registros de tamanho variável."
    },
    {
      "text": "a) 39 bytes por registro\nb) 1 950 000 bytes no arquivo\nc) Reduzir o tamanho dos campos ou usar registros variáveis.",
      "correct": true,
      "feedback": "nome: 40 − 12 = 28; curso: 20 − 9 = 11; total 39 por registro. 39 × 50 000 = 1 950 000 bytes (cerca de 1,95 MB)."
    },
    {
      "text": "a) 39 bytes por registro\nb) 195 000 bytes no arquivo\nc) Reduzir o tamanho dos campos ou usar registros variáveis.",
      "feedback": "Faltou um zero na multiplicação: 39 × 50 000 = 1 950 000 bytes."
    }
  ],
  "answer": "a) nome: 40 - 12 = 28 bytes. curso: 20 - 9 = 11 bytes. Total: 28 + 11 = 39 bytes por registro.\n\nb) 39 x 50 000 = 1 950 000 bytes, cerca de 1,95 MB.\n\nc) Reduzir o tamanho dos campos para perto do maior valor realmente esperado (sem cortar dados), ou, se os tamanhos variam muito, passar para registros de tamanho variável, assunto do próximo tópico."
}
```

```exercicio
{
  "title": "Exercício 6: atualizando um registro",
  "statement": "Um arquivo tem cabeçalho de 16 bytes e registros de 64 bytes. Descreva, em passos, como atualizar o registro de RRN 7. Em que byte ele começa? É preciso mover algum outro registro?",
  "options": [
    {
      "text": "Offset = 7 × 64 = 448; fseek(f, 448, SEEK_SET) e fwrite dos 64 bytes. Nenhum outro registro é movido.",
      "feedback": "Esse cálculo esqueceu o cabeçalho de 16 bytes. O offset é 16 + 7 × 64 = 464."
    },
    {
      "text": "Offset = 16 + 7 × 64 = 464; fseek(f, 464, SEEK_SET) e fwrite dos 64 bytes. Nenhum outro registro é movido.",
      "correct": true,
      "feedback": "O registro novo tem o mesmo tamanho do antigo e ocupa exatamente o mesmo espaço, então nada precisa ser deslocado."
    },
    {
      "text": "Offset = 16 + 7 × 64 = 464; fseek, fwrite e depois deslocar os registros seguintes para acomodar o novo.",
      "feedback": "Deslocar registros só é necessário quando o tamanho muda, como nos registros variáveis. Com tamanho fixo o novo registro cobre exatamente o antigo."
    },
    {
      "text": "Offset = 16 + 8 × 64 = 528; fseek(f, 528, SEEK_SET) e fwrite dos 64 bytes.",
      "feedback": "O RRN começa em zero, então o registro de RRN 7 é o oitavo do arquivo, mas seu offset usa 7, não 8: 16 + 7 × 64 = 464."
    }
  ],
  "answer": "1) Ler o registro de RRN 7 para uma variável (opcional, se for alterar só alguns campos).\n\n2) Calcular o offset: 16 + 7 x 64 = 16 + 448 = 464.\n\n3) Posicionar com fseek(f, 464, SEEK_SET).\n\n4) Gravar os 64 bytes com fwrite(&registro, 64, 1, f) por cima do registro antigo.\n\nNão é preciso mover nenhum outro registro, porque o registro novo tem o mesmo tamanho do antigo e ocupa exatamente o mesmo espaço."
}
```

```exercicio
{
  "title": "Exercício 7: busca binária e RRN",
  "statement": "Um arquivo de registros fixos, ordenado pela matrícula, tem 1 000 000 de registros. Quantas leituras de registro, no máximo, a busca binária faz para achar uma matrícula? Compare com a busca sequencial. Por que a busca binária só funciona bem porque o tamanho é fixo?",
  "options": [
    {
      "text": "Cerca de 1 000 leituras, a raiz quadrada de 1 000 000. A busca sequencial faria 500 000 em média.",
      "feedback": "A busca binária divide o intervalo ao meio a cada leitura, então o número de leituras é log₂ de 1 000 000, cerca de 20."
    },
    {
      "text": "Cerca de 20 leituras. Funciona do mesmo jeito com registros fixos ou variáveis.",
      "feedback": "A leitura 20 está certa, mas com registros variáveis não dá para calcular onde fica o registro do meio. A busca binária depende do acesso por RRN."
    },
    {
      "text": "Cerca de 500 000 leituras, igual à sequencial. O tamanho fixo não faz diferença.",
      "feedback": "500 000 é a média da busca sequencial. A binária faz cerca de 20 leituras, e o tamanho fixo é justamente o que permite ir direto ao meio."
    },
    {
      "text": "Cerca de 20 leituras, contra 500 000 em média na sequencial. Só funciona porque o RRN dá o offset do registro do meio: cabeçalho + RRN × tamanho.",
      "correct": true,
      "feedback": "2²⁰ = 1 048 576, então bastam cerca de 20 leituras. Sem tamanho fixo não existe essa conta."
    }
  ],
  "answer": "A busca binária divide o intervalo ao meio a cada leitura. Como 2 elevado a 20 vale 1 048 576, bastam cerca de 20 leituras.\n\nNa busca sequencial seriam, em média, uns 500 000 registros lidos, e no pior caso 1 000 000.\n\nA busca binária precisa ir direto ao registro do meio do intervalo, e isso é o acesso por RRN: offset = cabeçalho + RRN x tamanho. Com registros de tamanho variável essa conta não existe, e a busca binária não pode pular direto para o meio."
}
```

```exercicio
{
  "title": "Exercício 8: fixo ou variável?",
  "statement": "Para cada situação, diga se registros de tamanho fixo são uma boa escolha e justifique.\n\na) Um arquivo de leituras de sensor, cada uma com data, hora e valor numérico.\nb) Um arquivo de comentários de usuários, de 0 a 5 000 caracteres.\nc) Um cadastro de alunos com matrícula, nome, curso e cidade.",
  "options": [
    {
      "text": "a) Sim\nb) Não\nc) Depende: serve se os campos forem bem dimensionados.",
      "correct": true,
      "feedback": "Sensor: tamanhos conhecidos e iguais. Comentários: de 0 a 5 000 caracteres, e reservar 5 000 bytes para todos desperdiça quase tudo. Cadastro: aceitável com campos bem dimensionados."
    },
    {
      "text": "a) Sim\nb) Sim\nc) Sim, sempre",
      "feedback": "Nos comentários o tamanho varia de 0 a 5 000 bytes. Reservar o máximo para todos desperdiçaria a maior parte do arquivo."
    },
    {
      "text": "a) Não\nb) Não\nc) Não",
      "feedback": "Os dados do sensor têm tamanho conhecido e igual em todos os registros, o melhor cenário para registros fixos."
    },
    {
      "text": "a) Sim\nb) Não\nc) Não, nunca",
      "feedback": "No cadastro, nome, curso e cidade variam pouco. Com campos bem dimensionados o desperdício é aceitável, e o acesso direto compensa."
    }
  ],
  "answer": "a) Sim. Data, hora e valor têm tamanho conhecido e igual em todos os registros. Quase não há fragmentação interna, e o acesso por RRN é simples.\n\nb) Não. O tamanho do comentário varia de 0 a 5 000 bytes. Reservar 5 000 bytes para todos desperdiçaria quase tudo na maioria dos registros. Registros de tamanho variável (ou um BLOB guardado à parte) são melhores.\n\nc) Depende. A matrícula tem tamanho fixo. Nome, curso e cidade variam pouco, e com campos bem dimensionados o desperdício é aceitável. Vale pela simplicidade e pelo acesso direto, desde que os campos de texto não variem muito de tamanho."
}
```
