# Refactoring (Fowler) — Instruções de Review

Identifique os seguintes "code smells" e sugira o refactoring correspondente:

## Duplicação
- **Código duplicado:** mesma lógica em dois lugares. Sugira extração para função/método compartilhado.
- **Algoritmo duplicado:** mesmo algoritmo com variações pequenas. Sugira parametrização.

## Funções longas
- Blocos de código que poderiam ser nomeados e extraídos. Um comentário acima de um bloco é sinal de que o bloco merece virar função.

## Listas de parâmetros longas (> 3–4)
- Sugira agrupar parâmetros relacionados em um objeto/struct.

## Divergência e shotgun surgery
- Se uma mudança de requisito exige alterações em muitas classes não relacionadas, aponte o acoplamento excessivo.

## Feature Envy
- Um método usa mais dados de outra classe do que da própria. Sugira mover o método para onde os dados estão.

## Classes de dados / anêmicas
- Classes que só têm getters/setters sem comportamento. Verifique se a lógica que as manipula deveria estar dentro delas.

## Herança inadequada
- `instanceof` em cadeia ou `switch` em tipo sugere polimorfismo mal aplicado.
- Herança para reutilização de implementação quando composição seria melhor.

## Comentários como desodorante
- Comentário extenso tentando explicar código confuso. A solução é reescrever o código, não o comentário.
