# Clean Code — Instruções de Review

Ao revisar o código, aplique os seguintes critérios derivados dos princípios de Clean Code:

## Nomes
- Variáveis, funções e classes devem ter nomes que revelam intenção. Aponte nomes genéricos como `data`, `temp`, `x`, `handle`, `process` sem contexto.
- Funções booleanas devem começar com `is`, `has`, `can`, `should`.
- Evite abreviações que não sejam universalmente conhecidas no domínio.

## Funções
- Funções devem fazer UMA coisa. Aponte funções que fazem múltiplas coisas distintas — sinais: mais de 20 linhas, múltiplos níveis de abstração, mais de 3 parâmetros sem agrupamento.
- Parâmetros booleanos em funções são um cheiro ruim — sugerem que a função deveria ser duas.
- Evite efeitos colaterais não anunciados no nome.

## Comentários
- Comentários que apenas repetem o que o código já diz são ruído. Aponte comentários redundantes.
- Código morto comentado deve ser removido (o VCS guarda o histórico).
- Comentários que explicam o POR QUÊ de uma decisão não óbvia são valiosos — não sinalize esses.

## Tratamento de erros
- Não engolir exceções silenciosamente (`catch (e) {}`).
- Prefira exceções a códigos de retorno para situações excepcionais.
- Não retornar `null` quando um array/lista vazio ou uma exceção seria mais adequado.

## Estrutura
- Regra do escoteiro: o código deve ficar mais limpo do que você encontrou. Aponte oportunidades de melhoria incremental.
- Evite números mágicos — use constantes nomeadas.
