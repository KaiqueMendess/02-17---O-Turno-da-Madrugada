📖 README - 02:17: O Turno da Madrugada
https://img.shields.io/badge/02:17-Horror_Narrativo-8b0000
https://img.shields.io/badge/STATUS-COMPLETO-green
https://img.shields.io/badge/TECH-HTML5_CSS3_JS-ff6b6b
https://img.shields.io/badge/LICENSE-MIT-blue

<p align="center"> <img src="https://img.shields.io/badge/PLAY%20NOW-https://seuusuario.github.io/02-17/8b0000" alt="Play Now"> <img src="https://img.shields.io/badge/17+-ENDINGS-purple" alt="17+ Endings"> <img src="https://img.shields.io/badge/100%25-Client_Side-orange" alt="100% Client Side"> </p>
🏥 SINOPSE
02:17 - O Turno da Madrugada é um jogo de horror psicológico narrativo onde você assume o papel de um guarda noturno no Hospital São Lucas. Seu turno começa às 02:00 e termina às 06:00. As regras para sobrevivência estão escritas em uma folha amarelada... mas e se essas regras estiverem mentindo?

"Quanto mais você obedece, mais real Ele se torna."

🎮 CARACTERÍSTICAS PRINCIPAIS
🧠 Sistema de Sanidade Dinâmico
Sua sanidade afeta texto, sons e visuais

Efeitos visuais degradam progressivamente (glitch, shake, flicker)

Múltiplos estados mentais alteram a narrativa

Histórico de sanidade para análise pós-jogo

📖 Narrativa Não-Linear
50+ cenas interconectadas

17+ finais diferentes baseados em suas escolhas

Sistema de flags e condições complexas

Múltiplos caminhos para cada jogador

🔊 Sistema de Áudio Imersivo
3 camadas de áudio ambiente que evoluem com sua sanidade

13 efeitos sonoros reativos

Crossfade suave entre estados mentais

Pistas auditivas ocultas na trilha sonora

🎯 Mecânicas Únicas
Sistema de itens colecionáveis

Segredos desbloqueáveis

Galeria de finais

Progresso salvo entre sessões

Efeitos baseados em horários específicos (02:17, 03:03)

🚀 COMO JOGAR
Online (Recomendado)
Acesse: https://seuusuario.github.io/02-17/

Localmente

# 1. Clone o repositório
git clone https://github.com/seuusuario/02-17.git

# 2. Entre na pasta
cd 02-17

# 3. Abra o jogo
# Método 1: Live Server (VS Code)
# Método 2: Python
python -m http.server 8000
# Método 3: Node.js
npx serve

# 4. Acesse no navegador
# http://localhost:8000

🛠️ TECNOLOGIAS UTILIZADAS
Tecnologia	Uso
HTML5	Estrutura do jogo e semântica
CSS3	Animações, efeitos visuais, responsividade
JavaScript Vanilla	Lógica completa do jogo
ElevenLabs API	Geração de áudio para efeitos sonoros
LocalStorage	Salvamento de progresso
GitHub Pages	Hospedagem gratuita
📁 ESTRUTURA DO PROJETO
02-17/
├── index.html              # Página principal
├── style.css              # Estilos principais
├── script.js             # Lógica completa do jogo
├── audio/                # Efeitos sonoros
│   ├── ambient_normal.mp3
│   ├── ambient_low.mp3
│   ├── ambient_broken.mp3
│   ├── type.mp3
│   ├── select.mp3
│   ├── hover.mp3
│   ├── sanity_low.mp3
│   ├── mistake.mp3
│   ├── item_pickup.mp3
│   ├── discovery.mp3
│   ├── heartbeat.mp3
│   ├── clock_tick.mp3
│   └── whisper.mp3
├── assets/               # Imagens e ícones (se houver)
└── README.md            # Este arquivo
🎨 SISTEMA TÉCNICO
Arquitetura do Jogo
// Estrutura principal
const gameState = {
    sanity: 100,            // 0-100, afeta tudo
    route: "neutral",       // Rota narrativa atual
    time: "01:58",         // Tempo interno do jogo
    items: [],             // Itens coletados
    secrets: [],           // Segredos descobertos
    discoveredEndings: []  // Finais desbloqueados
};

// Sistema de cenas
const scenes = {
    start: {
        text: () => "Texto da cena...",
        choices: [
            {
                text: "Opção 1",
                next: "cena2",
                action: () => changeSanity(-5),
                condition: () => hasItem("Lanterna")
            }
        ]
    }
};

Features Implementadas
✅ Sistema completo de sanidade

✅ 17+ finais com galeria

✅ 50+ cenas interconectadas

✅ Sistema de áudio reativo

✅ Efeitos visuais dinâmicos

✅ Salvamento automático

✅ Controles por teclado

✅ Interface responsiva

✅ Sistema de segredos

✅ Mecânicas de tempo real

🔮 ROTAS E FINAIS
Principais Rotas Narrativas
Obediente - Seguir todas as regras

Curioso - Explorar além do permitido

Rebelde - Desafiar as regras

Suspeito - Descobrir segredos ocultos

Quebrado - Perder totalmente a sanidade

Alguns Finais
O Paciente - Aceitar a rotina

O Iluminado - Compreender a verdade

O Fantasma - Tornar-se parte do hospital

O Vazio - Destruir todas as regras

O Sonhador - Despertar do pesadelo

🎵 SISTEMA DE ÁUDIO
O jogo utiliza um sistema de áudio em três camadas:
// Exemplo do sistema de áudio
const ambientLayers = {
    normal: "audio/ambient_normal.mp3",   // Sanidade > 60
    low: "audio/ambient_low.mp3",         // Sanidade 20-60  
    broken: "audio/ambient_broken.mp3"    // Sanidade < 20
};

// Transição suave entre camadas
function updateAmbientSound() {
    let src = gameState.sanity <= 20 ? ambientLayers.broken :
              gameState.sanity <= 60 ? ambientLayers.low :
              ambientLayers.normal;
    // Crossfade automático
}

🎯 CONTROLES
Mouse
Clique: Selecionar opções

Hover: Visualizar botões

Teclado
1-9: Atalhos para opções numeradas

Enter: Pular digitação de texto

ESC: Voltar ao menu (nas opções)

📊 ESTATÍSTICAS DO PROJETO
Linhas de código: ~2.500

Cenas implementadas: 50+

Efeitos sonoros: 13

Animações CSS: 15+

Variáveis de estado: 20+

Tamanho total: < 3MB

🚀 DEPLOY NO GITHUB PAGES
No repositório do GitHub:

# Push do código
git add .
git commit -m "Initial commit"
git push origin main

Configurar GitHub Pages:

Vá em Settings > Pages

Branch: main

Folder: / (root)

Salve

Seu jogo estará em:
https://[seu-usuario].github.io/[nome-repo]/
🤝 CONTRIBUIÇÃO
Encontrou um bug? Tem uma ideia para melhoria?

Fork o projeto

Crie uma branch (git checkout -b feature/NovaFeature)

Commit suas mudanças (git commit -m 'Add: Nova feature')

Push para a branch (git push origin feature/NovaFeature)

Abra um Pull Request

Áreas para contribuição:
🔧 Correção de bugs

🎨 Melhorias visuais

🔊 Novos efeitos sonoros

📖 Traduções

📱 Responsividade mobile

🎯 Balanceamento de dificuldade

📝 LICENÇA
Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

👨‍💻 AUTOR
Kaique Da Silva Mendes - GitHub - LinkedIn

Agradecimentos Especiais
ElevenLabs pela API de áudio

Comunidade de game dev no Discord

Todos os testadores beta

Você, por jogar! 🎮

🌟 APOIE O PROJETO
Se você gostou do jogo, considere:

⭐ Dar uma estrela no GitHub

🐛 Reportar bugs encontrados

💬 Compartilhar com amigos

🎮 Sugerir novas features

<p align="center"> <b>Lembre-se: Não olhe para o corredor após 02:17.</b><br> <i>"Às 03:03, esqueça todas as regras anteriores."</i> </p><p align="center"> <img src="https://img.shields.io/badge/JOGUE%20AGORA-https://seuusuario.github.io/02-17/red" alt="Jogue Agora"> </p>
