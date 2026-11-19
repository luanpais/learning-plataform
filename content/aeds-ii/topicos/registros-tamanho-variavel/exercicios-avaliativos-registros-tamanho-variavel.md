## Exercícios avaliativos — Registros de tamanho variável

Resolva os exercícios abaixo e abra o gabarito de cada um para conferir. Eles cobrem todas as páginas deste tópico.

## Exercícios de fixação

Marque uma alternativa em cada questão e clique em **Conferir resposta** para ver se acertou e qual é a resposta.

```quiz
{
  "question": "Qual é a vantagem do prefixo de tamanho sobre o separador de campos?",
  "options": [
    { "text": "O arquivo sempre fica menor do que com separadores", "correct": false },
    { "text": "O programa sabe quantos bytes ler sem olhar o conteúdo, então nenhum caractere dos dados atrapalha", "correct": true },
    { "text": "Permite campos de qualquer tamanho, sem limite", "correct": false }
  ],
  "correctFeedback": "✅ Correto! Com o prefixo o programa lê o número e depois exatamente essa quantidade de bytes, sem examinar o conteúdo. Por isso ele não tem o problema do separador.",
  "incorrectFeedback": "❌ Ainda não. A resposta certa é: o programa sabe quantos bytes ler sem olhar o conteúdo, então nenhum caractere dos dados atrapalha. O prefixo não deixa o arquivo menor (no exemplo da aula, 27 ou 28 bytes, igual ou maior que com separadores) e tem limite: 255 bytes com 1 byte de prefixo."
}
```

```quiz
{
  "question": "Como fica o registro nome = Rui, curso = Fisica no formato keyword=value, com ';' entre os campos e '#' no fim do registro?",
  "options": [
    { "text": "Rui;Fisica#", "correct": false },
    { "text": "1=Rui;2=Fisica#", "correct": false },
    { "text": "nome=Rui;curso=Fisica#", "correct": true }
  ],
  "correctFeedback": "✅ Correto! Cada campo traz o próprio nome (nome=valor), ';' separa os campos e '#' termina o registro.",
  "incorrectFeedback": "❌ Ainda não. A resposta certa é: nome=Rui;curso=Fisica#. No keyword=value cada campo vem com o seu nome. 'Rui;Fisica#' só tem separadores, e '1=Rui;2=Fisica#' usa código do tipo de campo."
}
```

```quiz
{
  "question": "Por que o caractere separador não pode aparecer dentro dos dados?",
  "options": [
    { "text": "Porque o sistema operacional reserva esse caractere", "correct": false },
    { "text": "Porque o separador deixaria o arquivo maior", "correct": false },
    { "text": "Porque o programa não distinguiria o separador de um caractere do dado e acharia um campo a mais", "correct": true }
  ],
  "correctFeedback": "✅ Correto! Em 'Rua A; casa 2', por exemplo, o ';' dentro do endereço seria lido como fim de campo, e todos os campos seguintes ficariam deslocados.",
  "incorrectFeedback": "❌ Ainda não. A resposta certa é: o programa não distinguiria o separador de um caractere do dado e acharia um campo a mais. Isso desloca todos os campos seguintes. A saída é escolher um caractere que não apareça, usar escape ou usar prefixo de tamanho."
}
```

```quiz
{
  "question": "Quando o número fixo de campos por registro é uma boa solução para delimitar registros?",
  "options": [
    { "text": "Quando há campos opcionais que podem faltar", "correct": false },
    { "text": "Quando todo registro tem sempre a mesma quantidade de campos, pois ao ler o último o registro acabou", "correct": true },
    { "text": "Quando é preciso achar o registro n sem percorrer o arquivo", "correct": false }
  ],
  "correctFeedback": "✅ Correto! Se todo registro tem, por exemplo, 3 campos, ao ler o terceiro o programa sabe que o registro terminou.",
  "incorrectFeedback": "❌ Ainda não. A resposta certa é: quando todo registro tem sempre a mesma quantidade de campos. Com campos opcionais a contagem muda de registro para registro, e achar o registro n sem percorrer o arquivo exige um índice de byte offsets."
}
```
