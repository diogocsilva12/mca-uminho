# MCA site

Site estático para partilha de materiais de estudo, calendário académico e horário de aulas do **Mestrado em Computação Avançada (MCA)** da **Universidade do Minho**. Plain HTML/CSS/JS — sem dependências nem etapas de compilação.

```
index.html              Página de materiais de estudo (pesquisa + navegação por ano e semestre)
calendar.html            Calendário académico e instruções de subscrição de calendário
schedule.html            Página de horário de aulas (ferramenta externa por João Alves)
assets/favicon.svg      Ícone do site (SVG)
assets/style.css         Estilos CSS partilhados (suporte a modo claro/escuro)
assets/main.js           Interatividade, pesquisa em tempo real e renderização
assets/data/site-data.js Base de dados dos ficheiros e datas do calendário
files/                   Estrutura organizada de materiais de estudo
```

## Estrutura de Ficheiros (`files/`)

Todos os materiais partilhados encontram-se organizados por ano curricular e semestre:

```
files/
└── 1-ano/
    ├── 1-semestre/
    │   ├── aac/   — Arquiteturas Avançadas de Computadores
    │   ├── cpar/  — Computação Paralela
    │   ├── fced/  — Ferramentas de Computação de Elevado Desempenho
    │   ├── sac/   — Sistemas e Arquiteturas de Computadores
    │   ├── sne/   — Simulação Numérica em Engenharia
    │   └── vc/    — Visualização Científica
    └── 2-semestre/
        ├── aded/  — Análise de Dados de Elevado Desempenho
        ├── ap/    — Algoritmos Paralelos
        ├── chle/  — Computação Híbrida de Larga Escala
        ├── pced/  — Projeto em Computação de Elevado Desempenho
        └── sade/  — Sistemas de Armazenamento de Dados Eficientes
```

Dentro de cada unidade curricular os ficheiros estão categorizados por `teoricas/`, `praticas/`, `trabalho/`, `exames/` e `books/`.

## Ferramenta de Horários e Créditos

Um agradecimento especial e reconhecimento ao **João Alves** pelo desenvolvimento da ferramenta de horários e subscrição de calendário do MCA:
- Ferramenta: [mca.jalves.dev/calendar](https://mca.jalves.dev/calendar)
- GitHub: [github.com/joaoalves03](https://github.com/joaoalves03)

## Publicação no GitHub Pages

1. No repositório, acede a **Settings → Pages**.
2. Sob "Build and deployment", seleciona **Source** como "Deploy from a branch".
3. Escolhe a branch `main` e a pasta `/ (root)`, e clica em **Save**.
4. O GitHub Pages disponibiliza o site no URL `https://<username>.github.io/<repo>/`.

