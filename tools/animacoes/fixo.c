#include <stdio.h>
#include <string.h>
#include <stdarg.h>

/* ---- Rastreador: T(...), H(...) e o trecho OCULTO não aparecem na aula (ver lib.js) ---- */
#define V(x) #x, (int)(x)
#define T(tag, ...) trace(tag, ##__VA_ARGS__, (const char *)0)
#define H(x) x
static void trace(const char *tag, ...) {
    va_list ap;
    const char *nome;
    va_start(ap, tag);
    printf("%s", tag);
    while ((nome = va_arg(ap, const char *)) != 0) printf(" %s=%d", nome, va_arg(ap, int));
    va_end(ap);
    printf("\n");
}
//---MOSTRAR---
#include <stdio.h>
#include <string.h>

typedef struct {
    char nome[16];
    char curso[8];
} Aluno;                                   /* 24 bytes por registro */

#define CAB 4                              /* cabeçalho: um int com a quantidade de registros */

/* grava o registro na posição do RRN (sem ler nada antes) */
void grava(FILE *f, int rrn, Aluno a) {
    fseek(f, (long)(CAB + rrn * sizeof(Aluno)), SEEK_SET);
    fwrite(&a, sizeof(Aluno), 1, f);
}

/* lê o registro de número RRN indo direto ao byte dele */
Aluno le(FILE *f, int rrn) {
    Aluno a;
    T("conta", V(rrn), "alvo", (int)(CAB + rrn * sizeof(Aluno)));
    long pos = (long)(CAB + rrn * sizeof(Aluno));
    fseek(f, pos, SEEK_SET);
    T("salta", V(rrn), "pos", (int)ftell(f));
    fread(&a, sizeof(Aluno), 1, f);
    T("leu", V(rrn), "pos", (int)ftell(f));
    return a;
}

int main(void) {
    FILE *f = fopen("alunos.dat", "w+b");
    int qtd = 4;
    fwrite(&qtd, sizeof(int), 1, f);
    grava(f, 0, (Aluno){"Ana", "SI"});
    grava(f, 1, (Aluno){"Bruno", "EC"});
    grava(f, 2, (Aluno){"Carla", "EM"});
    grava(f, 3, (Aluno){"Davi", "CC"});
    T("criado", "pos", (int)ftell(f));

    /* leitura direta: queremos o registro de RRN 2 */
    T("pede", "rrn", 2);
    Aluno a = le(f, 2);                    /* vai direto ao RRN 2, sem passar pelos outros */
    T("mostra", "rrn", 2);
    printf("registro 2: %s, %s\n", a.nome, a.curso);

    T("atualiza", "rrn", 2);
    strcpy(a.curso, "SI");                 /* atualiza na memória... */
    T("regrava", "rrn", 2);
    grava(f, 2, a);                        /* ...e regrava no mesmo lugar */
    a = le(f, 2);
    T("mostra2", "rrn", 2);
    printf("registro 2: %s, %s\n", a.nome, a.curso);
    T("fim", "pos", (int)ftell(f));
    fclose(f);
    return 0;
}
