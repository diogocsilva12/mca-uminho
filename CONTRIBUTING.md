# Guia de Contribuição — MCA UMinho

Para manter o repositório fidedigno, organizado e respeitar a privacidade de todos os estudantes, aplicam-se as seguintes regras de contribuição:

## Regras do Repositório

1. **Sem commits diretos na branch `main`**:
   - A branch `main` encontra-se protegida. Todos os novos conteúdos e alterações devem ser submetidos através de uma branch separada (ex: `feature/novo-material`, `update/exames`).
   
2. **Submissão obrigatória via Pull Request**:
   - Cria uma nova branch a partir de `main`, adiciona as alterações e abre um **Pull Request (PR)**.
   - O PR aciona automaticamente validações de sintaxe e verificação de ficheiros.

3. **Revisão e Aprovação Obrigatória**:
   - Todos os Pull Requests necessitam obrigatoriamente de **pelo menos 1 revisão e aprovação** do administrador e Code Owner (**@diogocsilva12**) antes de poderem ser integrados na branch `main`.

4. **Privacidade e Proteção de Dados (RGPD)**:
   - É terminantemente proibido submeter pautas de notas individuais, listas com números mecanográficos/nomes de alunos ou resultados de avaliação privada.
   - Apenas são aceites enunciados de exames/trabalhos, guiões de laboratório, slides de aulas teóricas e apontamentos públicos.

5. **Organização das Pastas**:
   - Os ficheiros devem ser colocados estritamente na hierarquia correta:
     `files/<ano>/<semestre>/<sigla-uc>/<categoria>/`
     (Categorias: `teoricas/`, `praticas/`, `trabalho/`, `exames/`, `books/`).
   - Registar as novas entradas em `assets/data/site-data.js`.
