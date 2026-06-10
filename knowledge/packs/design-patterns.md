# Design Patterns (GoF) — Instruções de Review

O objetivo é identificar onde padrões ajudam E onde estão sendo sobre-aplicados.

## Quando sugerir um padrão
- **Strategy:** lógica que varia por tipo/contexto e está em um `switch/if-else` extenso → extrair para interface com implementações.
- **Observer/EventEmitter:** acoplamento direto entre componentes que deveriam ser independentes.
- **Factory:** `new ConcreteClass()` espalhado por todo o código → centralizar criação.
- **Decorator:** adição de comportamento por composição em vez de herança.
- **Repository:** acesso a dados misturado com lógica de negócio.

## Quando alertar sobre uso excessivo
- **Singleton:** em código testável é um problema (dificulta mocks). Aponte e sugira injeção de dependência.
- **Abstract Factory / Builder complexos:** para objetos simples, são over-engineering.
- **Chain of Responsibility sem critério de parada claro.**

## SOLID
- **S — Single Responsibility:** classe/módulo que muda por mais de um motivo.
- **O — Open/Closed:** lógica que exige edição da classe existente para adicionar novos casos (vs. extensão).
- **L — Liskov:** subclasse que quebra o contrato da superclasse (lança exceção onde não deveria, etc).
- **I — Interface Segregation:** interface grande forçando implementações desnecessárias.
- **D — Dependency Inversion:** módulo de alto nível dependendo de detalhes de implementação.
