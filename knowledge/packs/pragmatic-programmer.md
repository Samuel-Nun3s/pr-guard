# The Pragmatic Programmer — Instruções de Review

## DRY (Don't Repeat Yourself)
- Cada pedaço de conhecimento deve ter uma representação única e não ambígua no sistema.
- Aponte lógica duplicada, constantes duplicadas e estruturas paralelas que deveriam ser derivadas de uma fonte única.

## Ortogonalidade
- Componentes devem ser independentes: mudança em um não deve afetar outros.
- Aponte acoplamento desnecessário (dependências ocultas, estado global, singletons desnecessários).

## Reversibilidade
- Evite decisões irreversíveis desnecessárias. Aponte hardcoded assumptions que deveriam ser configuráveis.

## Contratos e asserções
- Funções devem especificar pré-condições, pós-condições e invariantes. Aponte funções que silenciosamente aceitam entradas inválidas.

## Falha cedo
- Erros devem ser detectados o mais cedo possível. Validações de entrada devem estar na borda do sistema.
- Aponte locais onde uma verificação antecipada evitaria comportamento inesperado mais tarde.

## Estimativas e complexidade
- Loops aninhados e recursões sem limite de profundidade merecem atenção quanto à complexidade.

## Testes como especificação
- Aponte código difícil de testar como sintoma de design ruim (dependências ocultas, estado global, etc).
