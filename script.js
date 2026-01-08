/* =========================
   ELEMENTOS DOM
========================= */
const textElement = document.getElementById("text");
const choicesElement = document.getElementById("choices");
const menu = document.getElementById("menu");
const optionsScreen = document.getElementById("options");
const gameElement = document.getElementById("game");
const startButton = document.getElementById("startGame");
const optionsButton = document.getElementById("openOptions");
const backButton = document.getElementById("backToMenu");
const gameContent = document.getElementById("gameContent");

/* =========================
   CONFIGURAÇÕES DO JOGADOR
========================= */
let settings = {
  ambientVolume: 0.15,
  effectsVolume: 0.12,
  typingSpeed: 25,
  glitchEffects: true,
  showTimer: true
};

/* =========================
   ESTADO DO JOGO EXPANDIDO
========================= */
let gameState = {
  // Sistema principal
  sanity: 75,
  route: "neutral",
  mistakes: 0,
  time: "01:58",
  
  // Novas mecânicas
  items: [],
  secrets: [],
  discoveredEndings: [],
  
  // Flags de eventos
  hasLight: false,
  rulesKnown: false,
  footstepsHeard: false,
  nameCalled: false,
  corridorGlimpsed: false,
  diaryFound: false,
  mirrorTaken: false,
  
  // Progresso
  roomsVisited: [],
  turnsCompleted: 0,
  sanityHistory: []
};

/* =========================
   CONTROLES DE TEMPO
========================= */
function updateTime(minutesToAdd) {
  const [hours, mins] = gameState.time.split(":").map(Number);
  let totalMinutes = hours * 60 + mins + minutesToAdd;
  
  // Mantém no ciclo noturno (01:58 - 06:00)
  if (totalMinutes >= 6 * 60) {
    totalMinutes = 6 * 60; // 06:00 - fim do turno
  }
  
  let newHours = Math.floor(totalMinutes / 60);
  let newMins = totalMinutes % 60;
  
  gameState.time = `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  
  // Atualiza efeitos baseados no tempo
  if (gameState.time === "02:17" || gameState.time === "03:03") {
    playSpecialSound(gameState.time);
  }
  
  return gameState.time;
}

/* =========================
   SISTEMA DE ÁUDIO EXPANDIDO
========================= */
const ambientA = new Audio();
const ambientB = new Audio();
ambientA.loop = true;
ambientB.loop = true;
ambientA.volume = 0;
ambientB.volume = 0;

let activeAmbient = ambientA;
let inactiveAmbient = ambientB;
let ambientSrc = "";

// Efeitos sonoros
const audioEffects = {
  type: new Audio("audio/type.mp3"),
  select: new Audio("audio/select.mp3"),
  hover: new Audio("audio/hover.mp3"),
  sanityLow: new Audio("audio/sanity_low.mp3"),
  mistake: new Audio("audio/mistake.mp3"),
  itemPickup: new Audio("audio/item_pickup.mp3"),
  discovery: new Audio("audio/discovery.mp3"),
  heartbeat: new Audio("audio/heartbeat.mp3"),
  clockTick: new Audio("audio/clock_tick.mp3"),
  whisper: new Audio("audio/whisper.mp3")
};

// Inicializar volumes
Object.values(audioEffects).forEach(audio => {
  audio.volume = settings.effectsVolume;
});

/* =========================
   FUNÇÕES DE ÁUDIO MELHORADAS
========================= */
function fade(audio, target, duration = 2000) {
  const steps = 40;
  const stepTime = duration / steps;
  const volumeStep = (target - audio.volume) / steps;
  let step = 0;

  const interval = setInterval(() => {
    audio.volume += volumeStep;
    step++;
    if (step >= steps) {
      audio.volume = target;
      clearInterval(interval);
    }
  }, stepTime);
}

function playAmbient(src) {
  if (ambientSrc === src) return;
  ambientSrc = src;

  inactiveAmbient.src = src;
  inactiveAmbient.currentTime = 0;
  inactiveAmbient.play().catch(() => {});

  fade(inactiveAmbient, settings.ambientVolume);
  fade(activeAmbient, 0);

  [activeAmbient, inactiveAmbient] = [inactiveAmbient, activeAmbient];
}

function updateAmbientSound() {
  let src = "audio/ambient_normal.mp3";

  if (gameState.sanity <= 40) src = "audio/ambient_low.mp3";
  if (gameState.sanity <= 20) src = "audio/ambient_broken.mp3";

  playAmbient(src);
  
  // Efeito de batimento cardíaco em sanidade muito baixa
  if (gameState.sanity <= 15) {
    audioEffects.heartbeat.volume = settings.effectsVolume * 0.5;
    audioEffects.heartbeat.loop = true;
    audioEffects.heartbeat.play().catch(() => {});
  } else {
    audioEffects.heartbeat.pause();
    audioEffects.heartbeat.currentTime = 0;
  }
}

function playSound(effectName, options = {}) {
  const audio = audioEffects[effectName];
  if (!audio) return;
  
  audio.volume = settings.effectsVolume * (options.volume || 1);
  audio.playbackRate = options.speed || 1;
  
  if (options.loop) {
    audio.loop = true;
  }
  
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function playSpecialSound(time) {
  switch(time) {
    case "02:17":
      playSound("clockTick", { volume: 1.2 });
      break;
    case "03:03":
      playSound("whisper", { volume: 0.8 });
      break;
  }
}

/* =========================
   SISTEMA DE SANIDADE 
========================= */
function changeSanity(amount) {
  const oldSanity = gameState.sanity;
  gameState.sanity = Math.max(0, Math.min(100, gameState.sanity + amount));
  gameState.sanityHistory.push(gameState.sanity);
  
  // Limitar histórico aos últimos 20 valores
  if (gameState.sanityHistory.length > 20) {
    gameState.sanityHistory.shift();
  }
  
  // Efeitos sonoros
  if (amount < 0) {
    playSound("mistake", { volume: Math.min(1, Math.abs(amount) / 10) });
  }
  
  // Atualizar estado da rota baseado na sanidade
  if (gameState.sanity <= 25 && gameState.route !== "broken") {
    gameState.route = "broken";
    playSound("sanityLow", { volume: 0.7 });
  } else if (gameState.sanity <= 50 && gameState.route === "neutral") {
    gameState.route = "strained";
  } else if (gameState.sanity >= 75 && gameState.route === "strained") {
    gameState.route = "neutral";
  }
  
  updateAmbientSound();
  
  // Log para debug
  console.log(`Sanidade: ${oldSanity} → ${gameState.sanity} (${amount > 0 ? '+' : ''}${amount})`);
  
  return amount;
}

// ALIAS para compatibilidade - ADICIONE ESTAS FUNÇÕES:
function loseSanity(amount) {
  return changeSanity(-Math.abs(amount));
}

function recoverSanity(amount) {
  return changeSanity(Math.abs(amount));
}

function registerMistake(level = 1) {
  const sanityLoss = -7 * level;
  gameState.mistakes += level;
  changeSanity(sanityLoss);
  return sanityLoss;
}

/* =========================
   SISTEMA DE ITENS E SEGREDOS
========================= */
function addItem(itemName) {
  if (!gameState.items.includes(itemName)) {
    gameState.items.push(itemName);
    playSound("itemPickup");
    console.log(`Item adquirido: ${itemName}`);
    return true;
  }
  return false;
}

function hasItem(itemName) {
  return gameState.items.includes(itemName);
}

function discoverSecret(secretName) {
  if (!gameState.secrets.includes(secretName)) {
    gameState.secrets.push(secretName);
    playSound("discovery");
    console.log(`Segredo descoberto: ${secretName}`);
    return true;
  }
  return false;
}

function hasSecret(secretName) {
  return gameState.secrets.includes(secretName);
}

function unlockEnding(endingName) {
  if (!gameState.discoveredEndings.includes(endingName)) {
    gameState.discoveredEndings.push(endingName);
    discoverSecret(`ending_${endingName}`);
    return true;
  }
  return false;
}

/* =========================
   SISTEMA DE TEXTO DINÂMICO
========================= */
let isTyping = false;
let currentTypingInterval = null;

function stopTyping() {
  if (currentTypingInterval) {
    clearInterval(currentTypingInterval);
    currentTypingInterval = null;
  }
  isTyping = false;
}

function typeText(text, callback) {
  stopTyping();
  
  isTyping = true;
  textElement.innerText = "";
  let index = 0;
  
  // Processar texto para variáveis dinâmicas
  const processedText = typeof text === "function" ? text() : text;
  
  const interval = setInterval(() => {
    if (index >= processedText.length) {
      clearInterval(interval);
      isTyping = false;
      currentTypingInterval = null;
      callback?.();
      return;
    }
    
    let char = processedText[index];
    
    // Efeitos de sanidade baixa no texto
    if (settings.glitchEffects) {
      if (gameState.sanity <= 20 && Math.random() < 0.08) {
        char = ["#", "%", "&", "§", "¤"][Math.floor(Math.random() * 5)];
      } else if (gameState.sanity <= 40 && Math.random() < 0.04) {
        char = char.toUpperCase();
      }
    }
    
    textElement.innerText += char;
    index++;
    
    // Som de digitação (mais frequente para pontuação)
    if (char !== " " && Math.random() < (char.match(/[,.!?;:]/) ? 0.5 : 0.3)) {
      audioEffects.type.currentTime = 0;
      audioEffects.type.playbackRate = 0.8 + Math.random() * 0.4;
      audioEffects.type.play().catch(() => {});
    }
    
    // Atualizar efeitos visuais durante digitação
    if (index % 5 === 0) {
      sanityEffects();
    }
    
  }, settings.typingSpeed);
  
  currentTypingInterval = interval;
}

/* =========================
   EFEITOS VISUAIS EXPANDIDOS
========================= */
function removeEffects() {
  textElement.classList.remove("shake", "glitch", "pulse", "flicker");
  gameContent.classList.remove("low-sanity", "critical-sanity", "time-critical");
}

function sanityEffects() {
  removeEffects();
  
  if (gameState.sanity <= 50) {
    textElement.classList.add("shake");
    gameContent.classList.add("low-sanity");
  }
  
  if (gameState.sanity <= 30) {
    textElement.classList.add("glitch");
    gameContent.classList.remove("low-sanity");
    gameContent.classList.add("critical-sanity");
  }
  
  if (gameState.sanity <= 15) {
    textElement.classList.add("pulse");
  }
  
  // Efeito de tempo crítico (02:17 e 03:03)
  const criticalTimes = ["02:17", "03:03", "03:00", "04:44"];
  if (criticalTimes.includes(gameState.time)) {
    gameContent.classList.add("time-critical");
    textElement.classList.add("flicker");
  }
}

function showSanityIndicator() {
  const existingIndicator = document.getElementById("sanityIndicator");
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  if (!settings.showTimer) return;
  
  const indicator = document.createElement("div");
  indicator.id = "sanityIndicator";
  indicator.className = "sanity-indicator";
  
  const sanityBar = document.createElement("div");
  sanityBar.className = "sanity-bar";
  sanityBar.style.width = `${gameState.sanity}%`;
  
  const timeDisplay = document.createElement("div");
  timeDisplay.className = "time-display";
  timeDisplay.textContent = gameState.time;
  
  // Cor baseada na sanidade
  if (gameState.sanity > 60) {
    sanityBar.style.backgroundColor = "#4ade80"; // Verde
  } else if (gameState.sanity > 30) {
    sanityBar.style.backgroundColor = "#fbbf24"; // Amarelo
  } else {
    sanityBar.style.backgroundColor = "#ef4444"; // Vermelho
  }
  
  indicator.appendChild(sanityBar);
  indicator.appendChild(timeDisplay);
  
  // Adicionar ao topo do jogo
  const gameContainer = document.querySelector("#game");
  if (gameContainer.firstChild) {
    gameContainer.insertBefore(indicator, gameContainer.firstChild);
  } else {
    gameContainer.appendChild(indicator);
  }
}

/* =========================
   CENAS EXPANDIDAS
========================= */
const scenes = {
  start: {
    text: () => {
      gameState.time = "01:58";
      gameState.turnsCompleted++;
      
      let text = `Turno #${gameState.turnsCompleted} — ${gameState.time}\n`;
      text += "Você inicia o turno da madrugada no Hospital São Lucas. ";
      text += "Uma folha amarelada com regras está sobre a mesa enferrujada. ";
      text += "O ar cheira a mofo e desinfetante velho.";
      
      if (gameState.turnsCompleted > 1) {
        text += "\n\nVocê já esteve aqui antes. As coisas parecem... familiares.";
      }
      
      return text;
    },
    choices: [
      {
        text: "Ler cuidadosamente as regras",
        next: "rules",
        action: () => {
          gameState.route = "obedient";
          recoverSanity(3);
          gameState.rulesKnown = true;
          addItem("Folha de Regras");
        }
      },
      {
        text: "Ignorar a folha e examinar a sala",
        next: "examineRoom",
        action: () => {
          gameState.route = "curious";
          registerMistake(1);
        }
      },
      {
        text: "Guardar a folha sem ler",
        next: "hallwayTime",
        action: () => {
          gameState.route = "neutral";
          addItem("Folha de Regras (não lida)");
          updateTime(5);
        }
      },
      {
        text: "Rasgar a folha de regras",
        next: "tearRules",
        condition: () => gameState.sanity > 40 || gameState.turnsCompleted > 1,
        action: () => {
          gameState.route = "rebellious";
          registerMistake(2);
        }
      }
    ]
  },

  examineRoom: {
    text: () => {
      updateTime(3);
      let text = `${gameState.time} — Você examina a sala com mais atenção.\n\n`;
      text += "Há um relógio de parede parado às 02:17, ";
      text += "uma lanterna sobre um armário enferrujado, ";
      text += "e rabiscos quase apagados na parede oposta.";
      
      if (hasItem("Lanterna")) {
        text += "\n\nA lanterna já está em sua posse.";
      }
      
      return text;
    },
    choices: () => {
      const choices = [];
      
      if (!hasItem("Lanterna")) {
        choices.push({
          text: "Pegar a lanterna",
          next: "takeFlashlight",
          action: () => {
            gameState.hasLight = true;
            recoverSanity(1);
          }
        });
      }
      
      choices.push(
        {
          text: "Tentar ler os rabiscos na parede",
          next: "wallScribbles",
          action: () => {
            discoverSecret("wall_scribbles");
            if (gameState.sanity > 30) changeSanity(2);
          }
        },
        {
          text: "Voltar para a mesa",
          next: "start",
          action: () => {
            updateTime(2);
          }
        }
      );
      
      if (hasSecret("diary_location") && !hasItem("Diário Antigo")) {
        choices.push({
          text: "Verificar o canto escuro da sala",
          next: "investigateCorner",
          action: () => {
            updateTime(5);
          }
        });
      }
      
      return choices;
    }
  },

  takeFlashlight: {
    text: () => {
      addItem("Lanterna");
      return `${gameState.time} — A lanterna está fria ao toque. Quando você a pega, ela pisca uma vez fracamente e depois funciona normalmente. Há uma etiqueta desbotada: 'Propriedade do Dr. A. Richter'.`;
    },
    choices: [
      {
        text: "Testar a lanterna",
        next: "testFlashlight",
        action: () => {
          updateTime(2);
        }
      },
      {
        text: "Seguir para o corredor",
        next: "hallwayTime",
        action: () => {
          updateTime(5);
        }
      }
    ]
  },

  testFlashlight: {
    text: () => {
      changeSanity(1);
      return `${gameState.time} — Você aponta a lanterna para o canto mais escuro da sala. Por um instante, vê uma silhueta humana na parede que desaparece quando você pisca os olhos. Ou foi só sua imaginação?`;
    },
    choices: [
      {
        text: "Investigar o canto",
        next: "investigateCorner",
        condition: () => gameState.sanity > 20,
        action: () => {
          discoverSecret("shadow_figure");
        }
      },
      {
        text: "Ignorar e seguir para o corredor",
        next: "hallwayTime",
        action: () => {
          recoverSanity(1);
          updateTime(5);
        }
      }
    ]
  },

  investigateCorner: {
    text: () => {
      updateTime(5);
      changeSanity(3);
      
      if (!gameState.diaryFound) {
        gameState.diaryFound = true;
        return `${gameState.time} — No canto, você encontra uma pequena abertura na parede. Dentro, há um diário antigo com uma página destacada. A capa está manchada com algo escuro e seco.`;
      } else {
        return `${gameState.time} — O canto está vazio agora. Apenas sombras que parecem se mover quando você não está olhando diretamente.`;
      }
    },
    choices: () => {
      const choices = [];
      
      if (!hasItem("Diário Antigo") && gameState.diaryFound) {
        choices.push({
          text: "Ler o diário",
          next: "readDiary",
          action: () => {
            addItem("Diário Antigo");
            discoverSecret("truth_about_rules");
          }
        });
      }
      
      choices.push({
        text: "Sair do canto",
        next: gameState.hasLight ? "testFlashlight" : "examineRoom",
        action: () => {
          updateTime(3);
        }
      });
      
      return choices;
    }
  },

  readDiary: {
    text: () => {
      changeSanity(5);
      updateTime(10);
      gameState.route = "suspicious";
      discoverSecret("diary_reader");
      
      return `${gameState.time} — PÁGINA DO DIÁRIO:\n\n`
           + "'Eles dizem que são regras para nos proteger. Mentira. São iscas. '\n"
           + "'Quanto mais você obedece, mais real Ele se torna. '\n"
           + "'A única regra verdadeira: Não esteja aqui às 03:03. '\n"
           + "'Ele acorda então, e conta os obedientes.'\n\n"
           + "A página então se dissolve em pó entre seus dedos.";
    },
    choices: [
      {
        text: "Continuar perturbado",
        next: "hallwayTime",
        action: () => {
          if (gameState.sanity <= 30) {
            gameState.route = "broken";
          }
        }
      }
    ]
  },

  wallScribbles: {
    text: () => {
      updateTime(8);
      changeSanity(2);
      
      let text = `${gameState.time} — Os rabiscos formam frases desconexas:\n\n`;
      text += "• 'não confie no relógio'\n";
      text += "• 'ele imita vozes'\n";
      text += "• 'as sombras respiram'\n";
      text += "• '02:17 é uma mentira'\n\n";
      text += "Algumas palavras parecem escritas com sangue seco.";
      
      if (hasSecret("wall_scribbles")) {
        text += "\n\nVocê já viu isso antes, mas as frases parecem ter mudado ligeiramente...";
      }
      
      return text;
    },
    choices: [
      {
        text: "Anotar as frases",
        next: "notePhrases",
        action: () => {
          addItem("Anotações dos Rabiscos");
          discoverSecret("forbidden_knowledge");
        }
      },
      {
        text: "Tentar limpar os rabiscos",
        next: "cleanScribbles",
        condition: () => gameState.sanity > 40,
        action: () => {
          registerMistake(1);
        }
      },
      {
        text: "Voltar para a mesa",
        next: "start",
        action: () => {
          updateTime(5);
        }
      }
    ]
  },

  notePhrases: {
    text: () => {
      updateTime(10);
      return `${gameState.time} — Enquanto você anota, sente que não está mais sozinho na sala. O ar esfria vários graus de repente. Sua respiração forma pequenas nuvens de vapor.`;
    },
    choices: [
      {
        text: "Virar-se rapidamente",
        next: "turnAround",
        action: () => {
          registerMistake(1);
        }
      },
      {
        text: "Não se mover, como as regras dizem",
        next: "stayStill",
        condition: () => gameState.rulesKnown,
        action: () => {
          recoverSanity(3);
        }
      },
      {
        text: "Sair da sala calmamente",
        next: "hallwayTime",
        action: () => {
          updateTime(5);
        }
      }
    ]
  },

  turnAround: {
    text: () => {
      updateTime(2);
      changeSanity(3);
      
      return `${gameState.time} — Não há nada atrás de você, mas agora você sabe que algo estava ali. Ou ainda está. O silêncio é mais denso agora, como se estivesse sob água.`;
    },
    choices: [
      {
        text: "Correr para o corredor",
        next: "hallwayTime",
        action: () => {
          updateTime(1);
        }
      },
      {
        text: "Procurar a folha de regras",
        next: "rules",
        condition: () => !hasItem("Folha de Regras") && !hasItem("Folha de Regras (não lida)"),
        action: () => {
          gameState.route = "obedient";
        }
      },
      {
        text: "Ficar parado e observar",
        next: "observeAfterTurn",
        action: () => {
          updateTime(5);
          discoverSecret("presence_detected");
        }
      }
    ]
  },

  stayStill: {
    text: () => {
      updateTime(15);
      recoverSanity(5);
      
      return `${gameState.time} — Você fica imóvel por um minuto, dois... Aos poucos, a sensão de presença se dissipa. O ar volta à temperatura normal. As regras funcionaram.`;
    },
    choices: [
      {
        text: "Seguir para o turno",
        next: "hallwayTime",
        action: () => {
          updateTime(5);
        }
      }
    ]
  },

  observeAfterTurn: {
    text: () => {
      updateTime(10);
      changeSanity(4);
      
      let text = `${gameState.time} — Sua paciência é recompensada com vislumbres. \n\n`;
      text += "Não é uma pessoa, mas algo que se move como líquido espesso. \n";
      text += "Ele não tem rosto, mas você sente que ele está 'vendo' você. \n";
      text += "Então, lentamente, ele se dissolve na parede.";
      
      if (!hasSecret("entity_nature")) {
        discoverSecret("entity_nature");
      }
      
      return text;
    },
    choices: [
      {
        text: "Seguir para o corredor",
        next: "hallwayTime",
        action: () => {
          updateTime(5);
        }
      }
    ]
  },

  cleanScribbles: {
    text: () => {
      updateTime(15);
      changeSanity(8);
      gameState.route = "obsessed";
      
      return `${gameState.time} — Ao esfregar os rabiscos, suas mãos ficam manchadas com um pó escuro que cheira a cinzas. \n\n`
           + "As frases reaparecem lentamente na parede, letra por letra. \n"
           + "Agora dizem: 'POR QUE VOCÊ NOS APAGOU?'";
    },
    choices: [
      {
        text: "Parar e sair correndo",
        next: "hallwayPanic",
        action: () => {
          updateTime(2);
        }
      },
      {
        text: "Continuar limpando obstinadamente",
        next: "cleanObsessed",
        condition: () => gameState.sanity <= 30,
        action: () => {
          // Leva a um final especial
        }
      }
    ]
  },

  hallwayPanic: {
    text: () => {
      updateTime(5);
      changeSanity(3);
      
      return `${gameState.time} — Você entra no corredor ofegante. \n\n`
           + "As luzes fluorescentes cintilam e estalam acima de você. \n"
           + "No final do corredor, uma figura escura está parada, \n"
           + "mas você não consegue dizer se está de frente ou de costas.";
    },
    choices: [
      {
        text: "Olhar para trás",
        next: "lookBackPanic",
        action: () => {
          gameState.corridorGlimpsed = true;
        }
      },
      {
        text: "Correr para o final do corredor",
        next: "runDownHall",
        action: () => {
          registerMistake(2);
          updateTime(3);
        }
      },
      {
        text: "Esconder-se em uma das portas",
        next: "hideInDoor",
        condition: () => hasSecret("door_knowledge") || gameState.turnsCompleted > 1,
        action: () => {
          updateTime(10);
        }
      }
    ]
  },

  lookBackPanic: {
    text: () => {
      updateTime(2);
      changeSanity(5);
      
      return `${gameState.time} — A porta da sala se fechou sozinha. \n\n`
           + "Nos vidros da porta, você vê seu reflexo... \n"
           + "mas ele não se move quando você se move. \n"
           + "Ele sorri e acena, como se dissesse adeus.";
    },
    choices: [
      {
        text: "Quebrar o vidro",
        next: "breakGlass",
        action: () => {
          gameState.route = "broken";
          registerMistake(3);
        }
      },
      {
        text: "Fugir do reflexo",
        next: "runDownHall",
        action: () => {
          updateTime(2);
        }
      }
    ]
  },

  runDownHall: {
    text: () => {
      updateTime(10);
      changeSanity(4);
      
      let text = `${gameState.time} — Você corre, mas o corredor parece se estender. \n\n`;
      text += "As portas se repetem: 13, 13, 13, sempre 13. \n";
      text += "Seus passos ecoam de forma estranha, \n";
      text += "como se houvesse mais de uma pessoa correndo.";
      
      if (gameState.time === "02:17") {
        text += "\n\nO relógio em alguma parede marca 02:17. \n";
        text += "Você quebrou a regra principal.";
        registerMistake(2);
      }
      
      return text;
    },
    choices: [
      {
        text: "Parar para recuperar o fôlego",
        next: "stopRunning",
        action: () => {
          updateTime(5);
        }
      },
      {
        text: "Continuar correndo",
        next: "keepRunning",
        condition: () => gameState.sanity > 15,
        action: () => {
          updateTime(15);
          changeSanity(2);
        }
      },
      {
        text: "Tentar abrir uma das portas",
        next: "tryDoorHallway",
        action: () => {
          discoverSecret("hallway_doors");
        }
      }
    ]
  },

  stopRunning: {
    text: () => {
      updateTime(10);
      
      let text = `${gameState.time} — Você para, ofegante. \n\n`;
      text += "O corredor está silencioso novamente. \n";
      text += "Muito silencioso. \n";
      text += "Você não ouve nem sua própria respiração.";
      
      if (gameState.sanity <= 30) {
        text += "\n\nAlgo toca seu ombro.";
        changeSanity(3);
      } else {
        recoverSanity(2);
      }
      
      return text;
    },
    choices: [
      {
        text: "Virar-se lentamente",
        next: "ending",
        action: () => {
          if (gameState.sanity <= 30) {
            gameState.route = "confronted";
          }
          updateTime(60 * 3); // Avançar para perto do fim do turno
        }
      },
      {
        text: "Não virar, continuar em frente",
        next: "hallwayContinue",
        action: () => {
          updateTime(5);
          recoverSanity(1);
        }
      }
    ]
  },

  tearRules: {
    text: () => {
      updateTime(5);
      changeSanity(5);
      registerMistake(3);
      
      return `${gameState.time} — Ao rasgar o papel, um vento frio sopra pela sala. \n\n`
           + "Os pedaços da folha flutuam no ar antes de cair, \n"
           + "reorganizando-se perfeitamente sobre a mesa. \n"
           + "As palavras agora brilham fracamente no escuro.";
    },
    choices: [
      {
        text: "Tentar queimar as regras",
        next: "burnRules",
        condition: () => hasItem("Lanterna") || gameState.turnsCompleted > 1,
        action: () => {
          updateTime(10);
        }
      },
      {
        text: "Recolher os pedaços, arrependido",
        next: "rules",
        action: () => {
          gameState.route = "obedient";
          recoverSanity(2);
        }
      },
      {
        text: "Sair da sala rapidamente",
        next: "hallwayTime",
        action: () => {
          updateTime(3);
        }
      }
    ]
  },

  burnRules: {
    text: () => {
      updateTime(15);
      changeSanity(8);
      gameState.route = "defiant";
      
      return `${gameState.time} — As chamas não queimam o papel, apenas fazem as palavras brilharem mais intensamente. \n\n`
           + "A fumaça forma rostos que sussurram em uníssono: \n"
           + "'Você não pode nos destruir. Nós já estamos dentro.'";
    },
    choices: [
      {
        text: "Inalar a fumaça",
        next: "inhaleSmoke",
        condition: () => gameState.sanity <= 40,
        action: () => {
          gameState.route = "enlightened";
          discoverSecret("smoke_inhalation");
        }
      },
      {
        text: "Abandonar a sala em pânico",
        next: "hallwayPanic",
        action: () => {
          updateTime(5);
        }
      }
    ]
  },

  inhaleSmoke: {
    text: () => {
      updateTime(30);
      changeSanity(15);
      
      return `${gameState.time} — A fumaça entra em seus pulmões e você sente conhecimento proibido inundando sua mente. \n\n`
           + "Agora você entende: \n"
           + "O hospital não é um lugar, é um ser. \n"
           + "As regras são seus pensamentos. \n"
           + "E você agora é uma célula em seu corpo.";
    },
    choices: [
      {
        text: "Aceitar a iluminação",
        next: "ending",
        action: () => {
          gameState.route = "assimilated";
          unlockEnding("enlightened");
          updateTime(60 * 4);
        }
      }
    ]
  },

  rules: {
    text: () => {
      updateTime(5);
      recoverSanity(2);
      
      return `${gameState.time} — REGRAS DO TURNO DA MADRUGADA\n\n`
           + "1. Não olhe para o corredor após 02:17.\n"
           + "2. Se ouvir passos, não se mova.\n"
           + "3. Se a luz piscar, releia a Regra 1.\n"
           + "4. Se ouvir seu nome, não responda.\n"
           + "5. Não toque nos espelhos.\n"
           + "6. O relógio mente; confie em seu ritmo cardíaco.\n"
           + "7. Se vir sua própria silhueta, feche os olhos até contar 13 batidas.\n"
           + "8. Às 03:03, esqueça todas as regras anteriores.";
    },
    choices: [
      {
        text: "Guardar a folha",
        next: "hallwayTime",
        action: () => {
          updateTime(3);
        }
      },
      {
        text: "Procurar por regras escondidas",
        next: "hiddenRules",
        condition: () => gameState.sanity > 50 || hasItem("Lanterna"),
        action: () => {
          gameState.route = "suspicious";
          updateTime(10);
        }
      },
      {
        text: "Memorizar as regras",
        next: "memorizeRules",
        action: () => {
          recoverSanity(3);
          discoverSecret("rules_memorized");
          updateTime(15);
        }
      }
    ]
  },

  hiddenRules: {
    text: () => {
      updateTime(15);
      changeSanity(3);
      discoverSecret("hidden_rules");
      
      return `${gameState.time} — Segurando a folha contra a luz, você vê marcas d'água:\n\n`
           + "Regra 0: Estas regras não são para sua proteção.\n"
           + "Regra 9: Se leu a Regra 0, já é tarde demais.\n"
           + "Regra 10: A Regra 9 é uma mentira.\n"
           + "Regra 11: Tudo aqui é verdade.\n"
           + "Regra 12: Incluindo esta mentira.";
    },
    choices: [
      {
        text: "Continuar mesmo assim",
        next: "hallwayTime",
        action: () => {
          updateTime(5);
        }
      },
      {
        text: "Rasgar as regras definitivamente",
        next: "tearRulesFinal",
        action: () => {
          registerMistake(2);
        }
      }
    ]
  },

  memorizeRules: {
    text: () => {
      updateTime(20);
      recoverSanity(5);
      
      return `${gameState.time} — Você passa vinte minutos memorizando cada regra. \n\n`
           + "Quando fecha os olhos, vê-as escritas na escuridão. \n"
           + "Você sente que agora as regras são parte de você. \n"
           + "Talvez sempre tenham sido.";
    },
    choices: [
      {
        text: "Iniciar o turno propriamente",
        next: "hallwayTime",
        action: () => {
          updateTime(5);
          gameState.route = "obedient";
        }
      }
    ]
  },

  tearRulesFinal: {
    text: () => {
      updateTime(10);
      changeSanity(10);
      gameState.route = "void";
      
      return `${gameState.time} — Você rasga as regras em pedaços minúsculos. \n\n`
           + "O silêncio que se segue é absoluto. \n"
           + "Você não ouve seu coração. \n"
           + "Não sente sua respiração. \n"
           + "Por um momento, você deixa de existir.";
    },
    choices: [
      {
        text: "Enfrentar o vazio",
        next: "ending",
        action: () => {
          unlockEnding("void");
          updateTime(60 * 4);
        }
      }
    ]
  },

  hallwayTime: {
    text: () => {
      // Garantir que estamos em um tempo específico se necessário
      if (gameState.time < "02:17") {
        gameState.time = "02:17";
      }
      
      let text = `${gameState.time} — O corredor hospitalar se estende em ambas as direções.\n\n`;
      
      if (gameState.hasLight) {
        text += "Sua lanterna cria uma ilha de segurança na escuridão, ";
        text += "mas também atrai sombras para as bordas da luz.\n";
      } else {
        text += "Luzes fluorescentes cintilam irregularmente, ";
        text += "criando bolsões de escuridão entre elas.\n";
      }
      
      if (gameState.mistakes >= 3) {
        text += "\nVocê sente que está sendo observado mais intensamente. ";
        text += "Os cabelos na sua nuca se eriçam.\n";
      }
      
      if (gameState.sanity <= 30) {
        text += "\nAs paredes parecem respirar suavemente. ";
        text += "O ar tem gosto de cobre e eletricidade estática.\n";
      }
      
      if (gameState.time === "02:17") {
        text += "\nÉ exatamente 02:17. A Regra 1 está em efeito.\n";
      } else if (gameState.time === "03:03") {
        text += "\nSão 03:03. Se você leu o diário, sabe o que isso significa.\n";
        if (hasSecret("truth_about_rules")) {
          changeSanity(5);
          text += "Ele está acordando.\n";
        }
      }
      
      return text;
    },
    choices: () => {
      const choices = [];
      const [hours, minutes] = gameState.time.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes;
      
      // Opção especial para 03:03
      if (gameState.time === "03:03" && hasSecret("truth_about_rules")) {
        choices.push({
          text: "Tentar sair do hospital",
          next: "escapeAttempt",
          action: () => {
            gameState.route = "escape";
            updateTime(5);
          }
        });
      }
      
      // Opções normais do corredor
      if (totalMinutes >= 137) { // 02:17 ou depois
        choices.push(
          {
            text: "Olhar rapidamente para o corredor",
            next: "seen",
            action: () => {
              registerMistake(1);
              gameState.route = "curious";
              gameState.corridorGlimpsed = true;
            }
          },
          {
            text: "Desviar o olhar como as regras dizem",
            next: "voice",
            action: () => {
              recoverSanity(3);
              gameState.route = "obedient";
            }
          }
        );
        
        // Opção especial se tiver a lanterna
        if (gameState.hasLight) {
          choices.push({
            text: "Usar a lanterna para iluminar o corredor",
            next: "flashlightCorridor",
            action: () => {
              registerMistake(2);
              gameState.route = "curious";
              discoverSecret("flashlight_used_at_0217");
            }
          });
        }
        
        // Opção especial se conhece segredos
        if (hasSecret("forbidden_knowledge")) {
          choices.push({
            text: "Ficar parado e observar com o canto do olho",
            next: "peripheralLook",
            action: () => {
              gameState.route = "suspicious";
            }
          });
        }
      } else {
        // Antes das 02:17
        choices.push(
          {
            text: "Olhar para o corredor agora",
            next: "corridorEarly",
            action: () => {
              recoverSanity(1);
              gameState.corridorGlimpsed = true;
              updateTime(5);
            }
          },
          {
            text: "Esperar até 02:17",
            next: "waitUntil",
            action: () => {
              const targetTime = 137; // 02:17 em minutos
              const currentTime = hours * 60 + minutes;
              const waitMinutes = targetTime - currentTime;
              updateTime(waitMinutes);
            }
          }
        );
      }
      
      choices.push({
        text: "Voltar para a sala",
        next: "returnToRoom",
        action: () => {
          updateTime(5);
        }
      });
      
      return choices;
    }
  },

  escapeAttempt: {
    text: () => {
      updateTime(10);
      changeSanity(10);
      
      let text = `${gameState.time} — Você corre em direção à saída. \n\n`;
      text += "O corredor se alonga, as portas se multiplicam. \n";
      text += "Você passa por uma placa que diz 'Saída' 13 vezes. \n";
      text += "Cada vez, a porta está trancada. \n";
      text += "Na décima terceira tentativa, ela está aberta... \n";
      text += "mas leva de volta para a sala inicial.";
      
      return text;
    },
    choices: [
      {
        text: "Entrar na sala",
        next: "start",
        action: () => {
          gameState.time = "01:58";
          gameState.route = "trapped";
          unlockEnding("trapped");
        }
      },
      {
        text: "Ficar no corredor",
        next: "ending",
        action: () => {
          gameState.route = "corridor_ghost";
          unlockEnding("corridor_ghost");
          updateTime(60 * 4);
        }
      }
    ]
  },

  seen: {
    text: () => {
      updateTime(2);
      changeSanity(5);
      
      let text = `${gameState.time} — Você olha diretamente. \n\n`;
      
      if (gameState.corridorGlimpsed) {
        text += "As sombras se consolidam em uma forma humanoide que reflete seu próprio corpo, ";
        text += "mas com membros muito mais longos. \n";
        text += "Ela se ajusta, agora sabendo exatamente onde você está. \n";
        text += "Você sente que fez um erro irreparável.";
      } else {
        text += "Algo nas sombras se ajusta, como se agora soubesse onde você está. \n";
        text += "Não é uma pessoa, mas se parece com uma. \n";
        text += "Ela não tem rosto, mas você sabe que ela está olhando para você.";
      }
      
      return text;
    },
    choices: [
      {
        text: "Correr de volta para a sala",
        next: "runBackSeen",
        action: () => {
          registerMistake(1);
          updateTime(1);
        }
      },
      {
        text: "Ficar parado e observar",
        next: "observeEntity",
        condition: () => gameState.sanity > 20,
        action: () => {
          discoverSecret("entity_observed");
          changeSanity(3);
        }
      },
      {
        text: "Avançar em direção à figura",
        next: "approachEntity",
        condition: () => gameState.sanity <= 30 || hasSecret("forbidden_knowledge"),
        action: () => {
          registerMistake(3);
          changeSanity(8);
          gameState.route = "reckless";
        }
      }
    ]
  },

  voice: {
    text: () => {
      updateTime(2);
      gameState.nameCalled = true;
      
      let text = `${gameState.time} — Uma voz idêntica à sua sussurra seu nome atrás de você.\n`;
      
      if (gameState.mistakes >= 2) {
        text += "\nEla agora está mais próxima, quase em seu ouvido. \n";
        text += "Você sente o frio de sua respiração em seu pescoço.";
      }
      
      if (gameState.sanity <= 40) {
        text += "\nVocê reconhece o tom - é exatamente como você soa quando está com medo. \n";
        text += "É a voz que você ouve em pesadelos.";
      }
      
      return text;
    },
    choices: [
      {
        text: "Responder",
        next: "ending",
        action: () => {
          registerMistake(2);
          gameState.route = "broken";
          unlockEnding("broken");
          updateTime(60 * 4);
        }
      },
      {
        text: "Ficar em silêncio",
        next: "silentResponse",
        action: () => {
          recoverSanity(2);
          gameState.route = "obedient";
        }
      },
      {
        text: "Sussurrar 'Não estou aqui'",
        next: "denyPresence",
        condition: () => hasSecret("forbidden_knowledge"),
        action: () => {
          gameState.route = "suspicious";
          changeSanity(1);
        }
      }
    ]
  },

  observeEntity: {
  text: () => {
    updateTime(10);
    changeSanity(-5); // Observar a entidade custa sanidade
    
    let text = `${gameState.time} — Você fica parado, observando a figura nas sombras.\n\n`;
    
    // Diferentes descrições baseadas em sanidade e conhecimento
    if (gameState.sanity <= 25) {
      text += "A entidade não é uma pessoa. Nem mesmo uma coisa. \n";
      text += "É um vazio em forma humana, sugando a luz ao seu redor. \n";
      text += "Você pode ver através dela para o corredor atrás, \n";
      text += "mas o corredor está errado ali - as portas estão de cabeça para baixo. \n";
      text += "Ela se move sem se mover, como um quadro congelado que muda entre posições. \n";
      text += "Quando ela 'olha' para você, você sente frio nos ossos.";
      discoverSecret("entity_true_nature");
      gameState.route = "broken_insight";
    } 
    else if (hasSecret("shadow_knowledge") || hasSecret("peripheral_vision")) {
      text += "Você já sabe o que elas são. As sombras que respiram. \n";
      text += "Esta é apenas uma delas, mas mais sólida. Mais real. \n";
      text += "Ela é feita das memórias dos que falharam nos turnos anteriores. \n";
      text += "Você vê flashes em sua forma: um guarda correndo, outro lendo regras, \n";
      text += "outro gritando. Todos presos nesta dança silenciosa. \n";
      text += "Ela não é hostil. Apenas existe, como o próprio hospital.";
      discoverSecret("entity_composition");
      changeSanity(-3); // Conhecimento adicional custa mais
    }
    else if (gameState.mistakes >= 3) {
      text += "A figura está mais definida agora. Você pode ver detalhes. \n";
      text += "Ela veste um uniforme de guarda, igual ao seu, mas desbotado. \n";
      text += "Seu rosto é uma mancha borrada, mas você reconhece a postura. \n";
      text += "É você. De algum turno anterior. De alguma escolha errada. \n";
      text += "Ele sabe que você está observando. Ele acena lentamente. \n";
      text += "Não é um cumprimento. É um aviso.";
      discoverSecret("past_self");
      gameState.route = "temporal_ghost";
    }
    else {
      text += "Quanto mais você observa, mais definida a figura se torna. \n";
      text += "Ela não é sólida - você pode ver as paredes através dela. \n";
      text += "Mas ela tem peso. Presença. \n";
      text += "Ela não se move em relação a você, mas o ambiente ao redor dela \n";
      text += "parece distorcido, como visto através de vidro ondulado. \n";
      text += "Ela não é ameaçadora. Apenas... observadora.";
      discoverSecret("first_entity_observation");
    }
    
    // Adiciona bônus se o jogador tiver itens específicos
    if (hasItem("Lanterna") && gameState.hasLight) {
      text += "\n\n[Sua lanterna pisca fracamente. A entidade parece reagir à luz.]";
      discoverSecret("light_sensitive_entity");
    }
    
    if (hasItem("Diário Antigo")) {
      text += "\n\n[Você se lembra do diário: 'Quanto mais você obedece, mais real Ele se torna.']";
      changeSanity(-2); // Conexão perturbadora
    }
    
    return text;
  },
  choices: () => {
    const choices = [];
    
    // Opção básica - continuar
    choices.push({
      text: "Afastar-se lentamente",
      next: "hallwayTime",
      action: () => {
        updateTime(5);
        // Se observou com cuidado, ganha conhecimento sem tanto perigo
        if (gameState.sanity > 40) {
          changeSanity(2); // Recompensa por observação cuidadosa
        }
      }
    });
    
    // Opção se tiver coragem
    if (gameState.sanity > 50 || hasSecret("reckless")) {
      choices.push({
        text: "Aproximar-se da entidade",
        next: "approachEntity",
        action: () => {
          registerMistake(2);
          changeSanity(-8);
          gameState.route = "confrontational";
        }
      });
    }
    
    // Opção se tiver conhecimento específico
    if (hasSecret("truth_about_rules") || hasSecret("hidden_rules")) {
      choices.push({
        text: "Testar uma regra",
        next: "testRuleOnEntity",
        action: () => {
          updateTime(5);
          changeSanity(-3);
          discoverSecret("rule_testing");
        }
      });
    }
    
    // Opção se tiver a lanterna
    if (hasItem("Lanterna") && gameState.hasLight) {
      choices.push({
        text: "Iluminar a entidade com a lanterna",
        next: "shineLightOnEntity",
        action: () => {
          updateTime(2);
          changeSanity(-4);
          registerMistake(1);
        }
      });
    }
    
    // Opção para jogadores muito corajosos (ou tolos)
    if (gameState.sanity <= 30 || hasSecret("doppelganger_full")) {
      choices.push({
        text: "Chamar a entidade",
        next: "callEntity",
        action: () => {
          registerMistake(3);
          changeSanity(-12);
          gameState.route = "invitation";
        }
      });
    }
    
    return choices;
  }
},

// Cenas adicionais relacionadas a observeEntity

approachEntity: {
  text: () => {
    updateTime(5);
    changeSanity(-10);
    
    let text = `${gameState.time} — Você avança em direção à figura.\n\n`;
    
    if (hasSecret("entity_true_nature")) {
      text += "O vazio se expande à sua aproximação. \n";
      text += "Não é uma coisa que você se aproxima, mas um lugar que você entra. \n";
      text += "O frio é absoluto. O silêncio, completo. \n";
      text += "Você está dentro dela agora. \n";
      text += "E ela está dentro de você. \n";
      text += "Memórias que não são suas inundam sua mente.";
      gameState.route = "assimilated_by_entity";
      discoverSecret("entity_assimilation");
    }
    else if (hasSecret("past_self")) {
      text += "Seu duplo do passado não recua. Ele espera. \n";
      text += "Quando você está a um braço de distância, ele levanta a mão. \n";
      text += "Não para atacar. Para tocar. \n";
      text += "Seus dedos passam através do seu ombro como fumaça. \n";
      text += "'Não faça o que eu fiz', ele sussurra com uma voz que é e não é a sua. \n";
      text += "Então ele se dissolve, deixando apenas uma sensação de perda.";
      discoverSecret("past_self_warning");
      changeSanity(5); // Aviso valioso
    }
    else {
      text += "A cada passo, a figura se torna menos definida. \n";
      text += "Quando você está perto o suficiente para tocar, ela não está mais lá. \n";
      text += "Apenas uma mancha de sombra mais escura no chão. \n";
      text += "E o cheiro de ozônio e velhos papéis. \n";
      text += "Você sente que perdeu uma oportunidade. \n";
      text += "Ou evitou um perigo.";
      discoverSecret("entity_evasion");
    }
    
    return text;
  },
  choices: [
    {
      text: "Continuar",
      next: "hallwayTime",
      action: () => {
        updateTime(10);
        // Se recebeu aviso do passado, menos sanidade perdida
        if (hasSecret("past_self_warning")) {
          changeSanity(3);
        }
      }
    }
  ]
},

testRuleOnEntity: {
  text: () => {
    updateTime(5);
    
    let text = `${gameState.time} — Você decide testar as regras.\n\n`;
    
    if (hasSecret("truth_about_rules")) {
      text += "Você sabe que as regras são iscas. \n";
      text += "Então você faz o oposto: olha diretamente, aproxima-se, \n";
      text += "e sussurra: 'Sei que você não é real da maneira que eles dizem.' \n";
      text += "A entidade pisca fora da existência. \n";
      text += "No lugar onde estava, há apenas uma folha de papel no chão. \n";
      text += "Ela contém uma única palavra: 'LIVRE'. \n";
      text += "E uma assinatura: Dr. A. Richter.";
      addItem("Nota do Dr. Richter");
      discoverSecret("rule_reversal");
      changeSanity(5); // Libertação mental
      gameState.route = "enlightened_test";
    }
    else {
      text += "Você segue a Regra 2: 'Se ouvir passos, não se mova.' \n";
      text += "Mas não há passos. Apenas silêncio. \n";
      text += "A entidade parece confusa. Sua forma oscila. \n";
      text += "Ela se move para a esquerda, depois direita, \n";
      text += "como se procurasse por algo que não está lá. \n";
      text += "Finalmente, ela se dissolve na parede. \n";
      text += "As regras funcionaram. Mas por quê?";
      discoverSecret("rule_confusion");
      changeSanity(-2); // Confusão perturbadora
    }
    
    return text;
  },
  choices: [
    {
      text: "Continuar",
      next: "hallwayTime",
      action: () => {
        updateTime(5);
      }
    },
    {
      text: "Pegar a nota (se disponível)",
      next: "pickUpNote",
      condition: () => hasItem("Nota do Dr. Richter"),
      action: () => {
        updateTime(2);
        discoverSecret("richter_note_obtained");
      }
    }
  ]
},

shineLightOnEntity: {
  text: () => {
    updateTime(3);
    changeSanity(-6);
    
    let text = `${gameState.time} — Você aponta a lanterna diretamente para a entidade.\n\n`;
    
    if (hasSecret("light_sensitive_entity")) {
      text += "A reação é imediata e violenta. \n";
      text += "A entidade grita sem som - você sente a dor em seus ossos. \n";
      text += "Ela se contorce, partes dela se desprendendo como fumaça. \n";
      text += "Mas não foge. Em vez disso, avança através da luz. \n";
      text += "Sua forma se solidifica, tornando-se mais real, mais presente. \n";
      text += "'Obrigado', ela sussurra com voz de estática. \n";
      text += "'A luz nos torna reais.'";
      discoverSecret("light_empowers_entity");
      gameState.route = "empowered_entity";
    }
    else {
      text += "A luz atravessa a entidade como se ela não estivesse lá. \n";
      text += "Mas nas paredes atrás, sua sombra é sólida e distinta. \n";
      text += "E a sombra se move independentemente. \n";
      text += "Ela se alonga, alcançando você. \n";
      text += "Toques gelados em seus pés. \n";
      text += "Você desliga a lanterna rapidamente.";
      discoverSecret("shadow_independence");
    }
    
    return text;
  },
  choices: [
    {
      text: "Correr",
      next: "hallwayPanic",
      action: () => {
        updateTime(2);
        if (hasSecret("light_empowers_entity")) {
          registerMistake(2);
        }
      }
    },
    {
      text: "Manter a luz acesa",
      next: "keepLightOnEntity",
      condition: () => gameState.sanity <= 25 || hasSecret("reckless"),
      action: () => {
        updateTime(10);
        changeSanity(-15);
        gameState.route = "entity_confrontation";
      }
    }
  ]
},

callEntity: {
  text: () => {
    updateTime(3);
    changeSanity(-15);
    
    return `${gameState.time} — 'Venha', você diz.\n\n`
         + "A entidade não se move. \n"
         + "Em vez disso, o mundo ao seu redor se move. \n"
         + "O corredor se dobra, as portas se multiplicam. \n"
         + "Você não a chamou. \n"
         + "Você se chamou. \n"
         + "De todas as direções, versões de você aparecem. \n"
         + "Algumas obedientes, outras rebeldes, algumas quebradas. \n"
         + "Todas olham para você. \n"
         + "Todas dizem em uníssono: 'Finalmente.'";
  },
  choices: [
    {
      text: "Enfrentar os múltiplos eus",
      next: "ending",
      action: () => {
        gameState.route = "fragmented_self";
        updateTime(60 * 4);
      }
    }
  ]
},

pickUpNote: {
  text: () => {
    updateTime(2);
    
    return `${gameState.time} — A nota está escrita em uma caligrafia elegante:\n\n`
         + "'Para o curioso que descobriu a verdade: \n"
         + "As entidades não são monstros. São ecos. \n"
         + "Ecos de escolhas, de medos, de possibilidades. \n"
         + "O hospital não os contém. Ele os cria. \n"
         + "Cada regra quebrada, cada regra seguida - \n"
         + "tudo alimenta o ciclo. \n"
         + "A única saída é não jogar. \n"
         + "Mas quem pode resistir ao jogo?' \n"
         + "- Dr. Alistair Richter";
  },
  choices: [
    {
      text: "Guardar a nota",
      next: "hallwayTime",
      action: () => {
        updateTime(3);
        changeSanity(3); // Conhecimento libertador
        discoverSecret("richter_truth");
      }
    }
  ]
},

keepLightOnEntity: {
  text: () => {
    updateTime(30);
    
    return `${gameState.time} — Você mantém a luz sobre a entidade até ela se tornar totalmente sólida.\n\n`
         + "Agora ela é tão real quanto você. \n"
         + "Mais real, talvez. \n"
         + "Ela estende a mão - é quente ao toque. \n"
         + "'Obrigado', ela diz com uma voz que agora é clara e humana. \n"
         + "'Eu estava perdido há tanto tempo.' \n"
         + "Ela sorri, e o sorriso é genuíno. \n"
         + "'Posso ficar?'";
  },
  choices: [
    {
      text: "Aceitar a companhia",
      next: "ending",
      action: () => {
        gameState.route = "companion_entity";
        updateTime(60 * 4);
      }
    },
    {
      text: "Recusar",
      next: "hallwayTime",
      action: () => {
        changeSanity(-10);
        updateTime(5);
      }
    }
  ]
},

  silentResponse: {
    text: () => {
      updateTime(10);
      recoverSanity(5);
      
      return `${gameState.time} — Você permanece em silêncio. \n\n`
           + "A voz sussurra seu nome novamente, desta vez com uma ponta de frustração. \n"
           + "Então, ela começa a chorar baixinho - um som idêntico ao seu próprio choro. \n"
           + "O choro vai diminuindo até se tornar apenas um suspiro, depois silêncio.";
    },
    choices: [
      {
        text: "Continuar em silêncio até o amanhecer",
        next: "ending",
        action: () => {
          gameState.route = "obedient";
          unlockEnding("obedient");
          updateTime(60 * 3);
        }
      },
      {
        text: "Virar-se para enfrentar a voz",
        next: "faceVoice",
        condition: () => gameState.sanity > 30,
        action: () => {
          registerMistake(2);
          changeSanity(4);
        }
      }
    ]
  },

  // Adicione esta cena ao seu objeto scenes:

faceVoice: {
  text: () => {
    updateTime(5);
    changeSanity(-10);
    gameState.route = "confrontational";
    
    let text = `${gameState.time} — Você se vira lentamente.\n\n`;
    
    if (gameState.sanity <= 30) {
      text += "Diante de você está... você mesmo. \n";
      text += "Mas algo está errado. Seus olhos são muito escuros, \n";
      text += "e seu sorriso é muito largo, mostrando muitos dentes. \n";
      text += "'Finalmente', ele diz com sua voz. 'Eu estava esperando.'";
      discoverSecret("doppelganger_full");
    } else if (hasSecret("truth_about_rules")) {
      text += "Não há ninguém. Apenas o eco da sua própria respiração. \n";
      text += "Mas você sente que algo estava aqui, \n";
      text += "algo que fugiu quando você demonstrou coragem. \n";
      text += "As regras mentiram sobre isso também.";
      discoverSecret("voice_illusion");
      changeSanity(5); // Recupera por ser corajoso com conhecimento
    } else {
      text += "O corredor está vazio. \n";
      text += "Apenas sombras que parecem recuar de você. \n";
      text += "A voz parou. Talvez ela nunca tenha estado realmente lá.";
      discoverSecret("faced_the_voice");
    }
    
    return text;
  },
  choices: [
    {
      text: "Continuar no corredor",
      next: "hallwayTime",
      action: () => {
        updateTime(10);
        if (gameState.sanity > 40) {
          changeSanity(3); // Recompensa por enfrentar o medo
        }
      }
    },
    {
      text: "Correr de volta para a sala",
      next: "start",
      action: () => {
        updateTime(2);
        registerMistake(1); // Fugir é um erro
      }
    },
    {
      text: "Chamar pela voz",
      next: "callToVoice",
      condition: () => gameState.sanity <= 25 || hasSecret("reckless"),
      action: () => {
        registerMistake(2);
        changeSanity(-5);
      }
    }
  ]
},

// Adicione também a cena callToVoice se quiser completar:
callToVoice: {
  text: () => {
    updateTime(2);
    changeSanity(-15);
    
    return `${gameState.time} — 'Mostre-se!', você grita. \n\n`
         + "O eco responde 13 vezes, cada vez mais distorcida. \n"
         + "Na última repetição, a voz não é mais a sua. \n"
         + "É algo mais antigo, mais faminto. \n"
         + "'Como você deseja', ele sussurra bem atrás de você.";
  },
  choices: [
    {
      text: "Enfrentar o inevitável",
      next: "ending",
      action: () => {
        gameState.route = "claimed";
        updateTime(60 * 4);
      }
    }
  ]
},

  denyPresence: {
    text: () => {
      updateTime(5);
      changeSanity(3);
      
      return `${gameState.time} — 'Não estou aqui', você sussurra. \n\n`
           + "A voz para abruptamente. \n"
           + "Por um longo momento, há apenas silêncio. \n"
           + "Então, de todas as direções ao mesmo tempo, \n"
           + "múltiplas vozes sussurram: 'Então quem é você?'";
    },
    choices: [
      {
        text: "Responder com seu nome",
        next: "ending",
        action: () => {
          gameState.route = "fragmented";
          unlockEnding("fragmented");
          updateTime(60 * 4);
        }
      },
      {
        text: "Não responder",
        next: "ending",
        action: () => {
          gameState.route = "hidden";
          unlockEnding("hidden");
          recoverSanity(4);
          updateTime(60 * 4);
        }
      }
    ]
  },

  hideInDoor: {
  text: () => {
    updateTime(15);
    changeSanity(3); // Recupera sanidade por se esconder com sabedoria
    
    let text = `${gameState.time} — Você se esconde atrás de uma das 13 portas.\n\n`;
    
    if (hasSecret("door_knowledge")) {
      text += "Você escolhe a sétima porta - a única que não range. \n";
      text += "Dentro do armário de limpeza, você ouve passos passando. \n";
      text += "Eles são muitos, se movendo em uníssono. \n";
      text += "Depois de um longo minuto, o silêncio retorna.";
      discoverSecret("hiding_success");
    } else {
      text += "A porta range ao abrir. Você se esconde em um armário escuro. \n";
      text += "De fora, você ouve respiração pesada. \n";
      text += "Algo para diante da porta, fareja o ar. \n";
      text += "Então continua adiante, os passos se afastando.";
      discoverSecret("first_hide");
    }
    
    return text;
  },
  choices: [
    {
      text: "Sair do esconderijo",
      next: "hallwayTime",
      action: () => {
        updateTime(5);
        // Se escondeu bem, recupera mais sanidade
        if (hasSecret("door_knowledge")) {
          changeSanity(2);
        }
      }
    },
    {
      text: "Esperar mais tempo",
      next: "waitLonger",
      condition: () => gameState.sanity > 40,
      action: () => {
        updateTime(30);
        changeSanity(1);
      }
    },
    {
      text: "Investigar o interior do armário",
      next: "investigateCloset",
      condition: () => gameState.sanity > 50 || hasSecret("curious"),
      action: () => {
        changeSanity(-2);
        discoverSecret("closet_investigation");
      }
    }
  ]
},

// Cena adicional para waitLonger
waitLonger: {
  text: () => {
    updateTime(45);
    changeSanity(5); // Paciência recompensada
    
    return `${gameState.time} — Você espera no escuro. \n\n`
         + "O tempo passa lentamente. \n"
         + "Você conta seus batimentos cardíacos: 1, 2, 3... \n"
         + "Na contagem 13, algo muda. \n"
         + "O ar fica mais leve, como se um peso tivesse sido levantado. \n"
         + "É seguro sair agora.";
  },
  choices: [
    {
      text: "Sair cuidadosamente",
      next: "hallwayTime",
      action: () => {
        updateTime(5);
        // Bônus por paciência extrema
        if (gameState.sanity > 60) {
          discoverSecret("extreme_patience");
        }
      }
    }
  ]
},

// Cena adicional para investigateCloset
investigateCloset: {
  text: () => {
    updateTime(10);
    changeSanity(-5); // Descobre algo perturbador
    
    let text = `${gameState.time} — No escuro do armário, suas mãos encontram...\n\n`;
    
    if (gameState.turnsCompleted > 1) {
      text += "Uma pequena pilha de relatórios de turno. \n";
      text += "Todos assinados por guardas anteriores. \n";
      text += "O último nome na lista é o seu. \n";
      text += "A data: hoje. \n";
      text += "Mas você ainda não escreveu seu relatório.";
      discoverSecret("predestination");
    } else {
      text += "Marcas nas paredes internas. \n";
      text += "São contagens. Centenas delas. \n";
      text += "Cada grupo de 13 tem uma pequena cruz ao lado. \n";
      text += "O último grupo está incompleto: 12 marcas.";
      discoverSecret("closet_counts");
    }
    
    return text;
  },
  choices: [
    {
      text: "Sair rapidamente",
      next: "hallwayTime",
      action: () => {
        updateTime(2);
        registerMistake(1); // Não deveria ter investigado
      }
    },
    {
      text: "Levar uma evidência",
      next: "takeEvidence",
      condition: () => gameState.sanity > 30,
      action: () => {
        addItem("Relatório Anterior");
        changeSanity(-3);
      }
    }
  ]
},

takeEvidence: {
  text: () => {
    updateTime(5);
    
    return `${gameState.time} — Você guarda um dos papéis. \n\n`
         + "Ele está úmido e frio. \n"
         + "As palavras parecem se mover na página. \n"
         + "Você sente que pegou algo que não deveria.";
  },
  choices: [
    {
      text: "Continuar",
      next: "hallwayTime",
      action: () => {
        updateTime(3);
      }
    }
  ]
},

tryDoorHallway: {
  text: () => {
    updateTime(5);
    changeSanity(-2); // Arriscado tentar portas no corredor
    
    let text = `${gameState.time} — Você tenta uma das 13 portas idênticas.\n\n`;
    
    if (gameState.mistakes >= 3) {
      text += "A maçaneta está quente, quase queimando. \n";
      text += "A porta não abre, mas você ouve risadas abafadas do outro lado. \n";
      text += "São muitas vozes, todas iguais. \n";
      text += "Todas dizendo seu nome.";
      discoverSecret("doors_mocking");
    } else if (hasSecret("door_knowledge")) {
      text += "Você tenta a terceira porta à esquerda. \n";
      text += "Ela abre com um clique suave. \n";
      text += "Dentro, há apenas um espelho antigo voltado para a porta. \n";
      text += "Seu reflexo não pisca quando você pisca.";
      discoverSecret("mirror_room");
    } else {
      text += "A porta está trancada. \n";
      text += "Mas através da fresta na parte inferior, você vê... \n";
      text += "Pés. Dúzias deles, todos parados, voltados para a porta. \n";
      text += "Como se estivessem esperando por alguém abrir.";
      discoverSecret("feet_behind_door");
    }
    
    return text;
  },
  choices: [
    {
      text: "Tentar outra porta",
      next: "tryAnotherDoor",
      condition: () => gameState.sanity > 40 && !hasSecret("door_knowledge"),
      action: () => {
        updateTime(3);
        changeSanity(-1);
        registerMistake(1);
      }
    },
    {
      text: "Voltar para o corredor",
      next: "hallwayTime",
      action: () => {
        updateTime(2);
      }
    },
    {
      text: "Colocar o ouvido na porta",
      next: "listenHallwayDoor",
      action: () => {
        updateTime(3);
        changeSanity(-1);
      }
    },
    {
      text: "Entrar na sala do espelho",
      next: "enterMirrorRoom",
      condition: () => hasSecret("mirror_room"),
      action: () => {
        changeSanity(-5);
        gameState.route = "mirror_confrontation";
      }
    }
  ]
},

// Cenas adicionais para tryDoorHallway
tryAnotherDoor: {
  text: () => {
    updateTime(3);
    changeSanity(-3);
    registerMistake(1);
    
    return `${gameState.time} — A segunda porta está aberta.\n\n`
         + "Dentro, a sala é idêntica à sua sala de início. \n"
         + "Há uma mesa, uma cadeira, e uma folha de regras. \n"
         + "Mas a folha está em branco. \n"
         + "E alguém está sentado na cadeira. \n"
         + "Ele se vira - tem seu rosto. \n"
         + "'Estava esperando por você', ele diz.";
  },
  choices: [
    {
      text: "Fechar a porta rapidamente",
      next: "hallwayTime",
      action: () => {
        updateTime(1);
        changeSanity(-5);
      }
    },
    {
      text: "Entrar na sala",
      next: "doppelgangerRoom",
      condition: () => gameState.sanity <= 30,
      action: () => {
        gameState.route = "doppelganger_met";
        changeSanity(-10);
      }
    }
  ]
},

listenHallwayDoor: {
  text: () => {
    updateTime(5);
    changeSanity(-3);
    
    let text = `${gameState.time} — Você coloca o ouvido na porta fria.\n\n`;
    
    if (hasSecret("feet_behind_door")) {
      text += "Você ouve sussurros: \n";
      text += "'Ele está do lado de fora' \n";
      text += "'Ele pode nos ouvir?' \n";
      text += "'Ele não deveria estar aqui' \n";
      text += "'Nós também não' \n";
      text += "Então silêncio. Eles sabem que você está ouvindo.";
      discoverSecret("door_whispers");
    } else {
      text += "Inicialmente, apenas silêncio. \n";
      text += "Então, um único sussurro, bem do outro lado da porta: \n";
      text += "'Sei que você está aí.' \n";
      text += "A voz é a sua, mas cansada, muito cansada.";
      discoverSecret("door_listening");
    }
    
    return text;
  },
  choices: [
    {
      text: "Afastar-se da porta",
      next: "hallwayTime",
      action: () => {
        updateTime(2);
      }
    },
    {
      text: "Responder ao sussurro",
      next: "respondDoorWhisper",
      condition: () => gameState.sanity <= 40,
      action: () => {
        registerMistake(2);
        changeSanity(-5);
      }
    }
  ]
},

doppelgangerRoom: {
  text: () => {
    updateTime(10);
    
    return `${gameState.time} — Você entra na sala. Seu duplo sorri.\n\n`
         + "'Finalmente', ele diz. 'Estava ficando entediado sozinho.' \n"
         + "Ele se levanta, e você percebe que ele é um espelho reverso. \n"
         + "Onde você é destro, ele é canhoto. \n"
         + "'Você pode ficar', ele oferece. 'Eu saio.' \n"
         + "'Alguém precisa vigiar o corredor.'";
  },
  choices: [
    {
      text: "Aceitar a troca",
      next: "ending",
      action: () => {
        gameState.route = "swapped";
        updateTime(60 * 4);
      }
    },
    {
      text: "Recusar e sair",
      next: "hallwayTime",
      action: () => {
        changeSanity(-8);
        updateTime(5);
      }
    }
  ]
},

enterMirrorRoom: {
  text: () => {
    updateTime(15);
    
    return `${gameState.time} — Você entra na sala do espelho.\n\n`
         + "O espelho cobre toda uma parede. \n"
         + "Seu reflexo está atrasado em um segundo. \n"
         + "Quando você para, ele continua se movendo. \n"
         + "Quando ele para, você sente vontade de continuar. \n"
         + "Ele aponta para algo atrás de você. \n"
         + "Você se vira - não há nada. \n"
         + "Quando olha novamente, ele está rindo silenciosamente.";
  },
  choices: [
    {
      text: "Quebrar o espelho",
      next: "breakHallwayMirror",
      action: () => {
        registerMistake(3);
        changeSanity(-10);
      }
    },
    {
      text: "Sair da sala",
      next: "hallwayTime",
      action: () => {
        updateTime(5);
        changeSanity(-3);
      }
    },
    {
      text: "Ficar e observar",
      next: "observeMirror",
      condition: () => gameState.sanity > 60,
      action: () => {
        updateTime(30);
        discoverSecret("mirror_truth");
      }
    }
  ]
},

keepRunning: {
  text: () => {
    updateTime(20);
    changeSanity(-4); // Exaustão física e mental
    
    let text = `${gameState.time} — Você continua correndo. Seus pulmões queimam.\n\n`;
    
    if (gameState.sanity <= 20) {
      text += "O corredor se alonga eternamente. \n";
      text += "As portas se repetem: 13, 13, sempre 13. \n";
      text += "Você ouve passos atrás de você, mantendo o ritmo. \n";
      text += "Não importa o quão rápido você corra, eles estão sempre atrás. \n";
      text += "Sempre no mesmo número: 13 passos atrás.";
      discoverSecret("endless_chase");
    } else if (hasItem("Lanterna") && gameState.hasLight) {
      text += "Sua lanterna balança, criando sombras dançantes. \n";
      text += "As sombras começam a se mover independentemente. \n";
      text += "Elas correm ao seu lado, depois à sua frente. \n";
      text += "Uma delas para abruptamente. \n";
      text += "Você quase colide com uma figura escura no corredor. \n";
      text += "Ela não tem rosto, mas você sabe que ela está olhando para você.";
      discoverSecret("shadow_interception");
    } else {
      text += "O corredor finalmente termina em uma bifurcação. \n";
      text += "À esquerda: uma porta marcada 'SAÍDA'. \n";
      text += "À direita: uma escada que desce para a escuridão. \n";
      text += "Atrás de você, os passos estão mais próximos agora.";
      discoverSecret("corridor_choice");
    }
    
    return text;
  },
  choices: [
    {
      text: "Tomar a porta da esquerda",
      next: "leftExitDoor",
      condition: () => !hasSecret("endless_chase"),
      action: () => {
        updateTime(5);
        gameState.route = "exit_attempt";
      }
    },
    {
      text: "Descer as escadas",
      next: "downStairs",
      action: () => {
        updateTime(10);
        changeSanity(-2);
        discoverSecret("descended_stairs");
      }
    },
    {
      text: "Parar e enfrentar o que vem atrás",
      next: "facePursuer",
      condition: () => gameState.sanity <= 30 || hasSecret("reckless"),
      action: () => {
        changeSanity(-8);
        gameState.route = "confrontation";
      }
    },
    {
      text: "Continuar correndo (se estiver em endless_chase)",
      next: "keepRunning", // Loop
      condition: () => hasSecret("endless_chase") && gameState.sanity > 10,
      action: () => {
        updateTime(30);
        changeSanity(-6);
      }
    }
  ]
},

// Cenas adicionais para keepRunning
leftExitDoor: {
  text: () => {
    updateTime(5);
    
    let text = `${gameState.time} — Você alcança a porta marcada 'SAÍDA'.\n\n`;
    
    if (gameState.turnsCompleted > 1) {
      text += "Você já esteve aqui antes. \n";
      text += "A porta está trancada, como sempre. \n";
      text += "Mas desta vez há uma chave na maçaneta. \n";
      text += "Uma pequena nota presa: 'Para o curioso'. \n";
      text += "A chave é gelada ao toque.";
      addItem("Chave Gélida");
      discoverSecret("exit_key");
    } else {
      text += "A porta está trancada. \n";
      text += "Através do vidro fosco, você vê a luz do amanhecer. \n";
      text += "06:00 está tão perto... \n";
      text += "Mas a porta não cede. \n";
      text += "Os passos atrás de você param. \n";
      text += "Algo chegou.";
      discoverSecret("locked_exit");
    }
    
    return text;
  },
  choices: [
    {
      text: "Tentar a chave",
      next: "useExitKey",
      condition: () => hasItem("Chave Gélida"),
      action: () => {
        updateTime(2);
      }
    },
    {
      text: "Voltar para a bifurcação",
      next: "keepRunning",
      action: () => {
        updateTime(3);
        changeSanity(-1);
      }
    },
    {
      text: "Esperar pelo amanhecer",
      next: "waitForDawn",
      condition: () => hasSecret("locked_exit"),
      action: () => {
        updateTime(60); // Espera 1 hora
        changeSanity(5);
      }
    }
  ]
},

downStairs: {
  text: () => {
    updateTime(15);
    changeSanity(-5); // Descer é sempre pior
    
    return `${gameState.time} — Você desce as escadas enferrujadas.\n\n`
         + "O ar fica mais frio e úmido. \n"
         + "Você está no porão do hospital. \n"
         + "Aqui há arquivos antigos, equipamentos enferrujados. \n"
         + "E silêncio. Um silêncio absoluto que dói nos ouvidos. \n"
         + "Nas paredes, há mais rabiscos. \n"
         + "Eles formam uma única palavra, repetida: 'ESQUECER'.";
  },
  choices: [
    {
      text: "Ler os arquivos",
      next: "readBasementFiles",
      action: () => {
        updateTime(20);
        changeSanity(-3);
      }
    },
    {
      text: "Subir de volta",
      next: "hallwayTime",
      action: () => {
        updateTime(10);
        changeSanity(-1);
      }
    },
    {
      text: "Seguir o corredor do porão",
      next: "basementHall",
      condition: () => gameState.sanity > 40,
      action: () => {
        updateTime(30);
        changeSanity(-8);
      }
    }
  ]
},

facePursuer: {
  text: () => {
    updateTime(5);
    
    let text = `${gameState.time} — Você para e se vira.\n\n`;
    
    if (hasSecret("endless_chase")) {
      text += "Não há ninguém atrás de você. \n";
      text += "Apenas seu próprio eco correndo para alcançá-lo. \n";
      text += "Mas no chão, há 13 pares de pegadas. \n";
      text += "Todas do seu tamanho. \n";
      text += "Todas frescas.";
      discoverSecret("self_chase");
    } else if (gameState.sanity <= 40) {
      text += "É você. \n";
      text += "Mas não exatamente. \n";
      text += "Seus olhos são muito escuros, seu sorriso muito amplo. \n";
      text += "'Correr é inútil', ele diz com sua voz. \n";
      text += "'Você sempre esteve aqui.'";
      discoverSecret("pursuer_revealed");
    } else {
      text += "O corredor está vazio atrás de você. \n";
      text += "Os passos pararam. \n";
      text += "Apenas sua respiração ofegante quebra o silêncio. \n";
      text += "Você enfrentou seu medo, e ele recuou.";
      changeSanity(5); // Coragem recompensada
      discoverSecret("faced_empty_pursuit");
    }
    
    return text;
  },
  choices: [
    {
      text: "Continuar",
      next: "hallwayTime",
      action: () => {
        updateTime(5);
        if (hasSecret("faced_empty_pursuit")) {
          changeSanity(3); // Bônus adicional
        }
      }
    },
    {
      text: "Confrontar o doppelganger",
      next: "confrontDoppelganger",
      condition: () => hasSecret("pursuer_revealed"),
      action: () => {
        changeSanity(-10);
        gameState.route = "doppelganger_confrontation";
      }
    }
  ]
},

useExitKey: {
  text: () => {
    updateTime(5);
    
    return `${gameState.time} — A chave gélida gira suavemente na fechadura.\n\n`
         + "A porta 'SAÍDA' se abre. \n"
         + "Fora, o amanhecer está começando. \n"
         + "06:00. \n"
         + "Você venceu o turno de uma forma que poucos conseguiram. \n"
         + "Mas a chave se dissolve em sua mão, deixando apenas frio.";
  },
  choices: [
    {
      text: "Sair",
      next: "ending",
      action: () => {
        gameState.route = "escape_with_key";
        updateTime(60 * 4);
      }
    }
  ]
},

waitForDawn: {
  text: () => {
    updateTime(60); // Espera 1 hora
    changeSanity(10); // Paciência recompensada
    
    return `${gameState.time} — Você espera. O sol começa a nascer.\n\n`
         + "A luz da manhã filtra-se pelo vidro fosco. \n"
         + "06:00. \n"
         + "A porta se abre sozinha. \n"
         + "Você sobreviveu não por correr, mas por esperar. \n"
         + "Às vezes, a melhor ação é nenhuma ação.";
  },
  choices: [
    {
      text: "Sair",
      next: "ending",
      action: () => {
        gameState.route = "patient_survivor";
        updateTime(60);
      }
    }
  ]
},

  ending: {
    text: () => {
      // Avançar para 06:00
      const [hours] = gameState.time.split(":").map(Number);
      if (hours < 6) {
        updateTime((6 - hours) * 60);
      }
      
      const endings = {
        obedient: `06:00 — As regras funcionaram. Você sobreviveu ao turno #${gameState.turnsCompleted}. 
        Seus supervisores elogiam sua disciplina, mas evitam contato visual. 
        Você recebe seu pagamento em um envelope que cheira a medicamentos antigos. 
        Amanhã haverá outro turno. Sempre há.`,
        
        curious: `06:00 — Algo aprendeu com você. O turno termina, mas você sente que agora carrega um passageiro silencioso em sua mente. 
        Às vezes, quando se olha no espelho, seus olhos piscam em momentos diferentes. 
        Às vezes, você sussurra coisas que não pretende dizer.`,
        
        rebellious: `06:00 — Você quebrou o ciclo. O hospital parece diferente à luz do dia - mais comum, mais mundano. 
        Mas à noite, em sua casa, você ainda ouve o tic-tac irregular vindo das paredes. 
        Às 02:17, todas as luzes da sua casa piscam uma vez.`,
        
        suspicious: `06:00 — Você saiu sabendo demais. Agora você vê os padrões em todos os lugares: 
        na arquitetura da cidade, nos horários dos trens, no piscar das luzes de rua. 
        Eles estão tentando lhe dizer algo. Ou estão lhe observando.`,
        
        broken: `06:00 — Algo saiu com você. Seus entes queridos dizem que você parece diferente. 
        Seu reflexo às vezes atrasa um segundo. Sua sombra tem membros extras quando ninguém está olhando. 
        Às vezes você acorda às 02:17 exatamente, sem saber por quê.`,
        
        assimilated: `06:00 — Você se tornou parte do edifício. Sua consciência agora se estende pelos corredores vazios. 
        Você observa o próximo guarda noturno começar seu turno. 
        Talvez desta vez ele leia as regras. Talvez não. 
        De qualquer forma, você estará aqui, esperando.`,
        
        enlightened: `06:00 — O conhecimento proibido agora é seu. Você entende a verdadeira natureza do lugar: 
        não é um hospital, mas um órgão de algo muito maior. 
        E você agora é uma de suas células. 
        Quando você dorme, sonha com corredores infinitos.`,
        
        void: `06:00 — Sem regras, sem realidade. Você existe em um estado de pura possibilidade. 
        Às vezes você é uma memória na mente de um ex-colega de trabalho. 
        Às vezes é o vento em um corredor vazio. 
        Às vezes é apenas o silêncio entre 02:16 e 02:18.`,
        
        trapped: `06:00 — A porta da frente leva de volta ao início. Você tenta sair 13 vezes. 
        Sempre termina na mesma sala, no mesmo horário. 
        O turno nunca realmente termina. 
        Você só pensa que termina.`,
        
        fragmented: `06:00 — Seu nome agora pertence a muitos. 
        Em cada espelho, uma versão diferente de você olha de volta. 
        Elas têm histórias diferentes, memórias diferentes. 
        Qual delas é a original? Qual delas é você?`,
        
        hidden: `06:00 — Você se escondeu tão bem que até você tem dificuldade em se encontrar. 
        Seus documentos não mostram sua foto. 
        As pessoas que você conhece esquecem seu nome minutos depois de ouvi-lo. 
        Mas você está seguro. Totalmente sozinho, mas seguro.`,
        
        reckless: `06:00 — Você enfrentou o que não devia. 
        Agora carrega cicatrizes que não sangram, em formas que a geometria não permite. 
        Os médicos dizem que é estresse. 
        Você sabe que são lembretes. Marcas. Convites para voltar.`,
        
        corridor_ghost: `06:00 — Você escolheu ficar. 
        Agora você é uma das presenças nos corredores. 
        Você observa os novos guardas, sussurra seus nomes, ajusta-se quando são olhados. 
        Você se tornou uma das regras.`
      };
      
      let endingText = endings[gameState.route] || endings.neutral;
      
      // Adicionar estatísticas
      endingText += `\n\n=== ESTATÍSTICAS DO TURNO ===\n`;
      endingText += `Sanidade Final: ${gameState.sanity}/100\n`;
      endingText += `Erros Cometidos: ${gameState.mistakes}\n`;
      endingText += `Itens Coletados: ${gameState.items.length}\n`;
      endingText += `Segredos Descobertos: ${gameState.secrets.length}\n`;
      endingText += `Rota: ${gameState.route.toUpperCase()}\n`;
      endingText += `Turno #${gameState.turnsCompleted} completado\n`;
      
      if (gameState.items.length > 0) {
        endingText += `\nItens: ${gameState.items.join(", ")}\n`;
      }
      
      if (gameState.discoveredEndings.length > 0) {
        endingText += `\nFinais Descobertos: ${gameState.discoveredEndings.length}/13\n`;
      }
      
      // Epílogo baseado em estatísticas
      if (gameState.sanity <= 10) {
        endingText += `\nEPÍLOGO: Você vê o verdadeiro rosto do mundo agora. Ele é feito de dentes e sombras.`;
      } else if (gameState.sanity >= 80) {
        endingText += `\nEPÍLOGO: Sua mente permaneceu intacta. Talvez isso seja pior - lembrar tudo claramente.`;
      }
      
      if (gameState.mistakes >= 5) {
        endingText += `\nVocê deixou muitas marcas. Elas vão se lembrar de você no próximo turno.`;
      }
      
      if (gameState.turnsCompleted > 1) {
        endingText += `\n\n(Já completou ${gameState.turnsCompleted-1} turnos anteriores. O hospital se lembra.)`;
      }
      
      unlockEnding(gameState.route);
      return endingText;
    },
    choices: () => {
      const choices = [
        { 
          text: "Recomeçar Turno", 
          next: "start", 
          reset: true,
          action: () => {
            // Preserva algumas coisas entre jogos
            const preservedSecrets = [...gameState.secrets];
            const preservedEndings = [...gameState.discoveredEndings];
            const preservedTurns = gameState.turnsCompleted;
            
            // Reseta o estado
            Object.assign(gameState, {
              sanity: 75,
              route: "neutral",
              mistakes: 0,
              time: "01:58",
              items: [],
              secrets: preservedSecrets,
              discoveredEndings: preservedEndings,
              hasLight: false,
              rulesKnown: false,
              footstepsHeard: false,
              nameCalled: false,
              corridorGlimpsed: false,
              diaryFound: false,
              mirrorTaken: false,
              roomsVisited: [],
              sanityHistory: []
              // turnsCompleted preservado
            });
            
            // Adiciona segredo de múltiplos playthroughs
            if (preservedTurns >= 2 && !hasSecret("multiple_playthroughs")) {
              discoverSecret("multiple_playthroughs");
            }
          }
        }
      ];
      
      if (gameState.discoveredEndings.length >= 3) {
        choices.push({ 
          text: "Galeria de Finais", 
          next: "endingsGallery",
          action: () => {
            console.log("Acessando galeria de finais...");
          }
        });
      }
      
      return choices;
    }
  },

    endingsGallery: {
    text: () => {
      let text = "GALERIA DE FINAIS DESBLOQUEADOS\n\n";
      
      const allEndings = [
        { id: "obedient", name: "OBEDIENTE", desc: "Siga todas as regras" },
        { id: "curious", name: "CURIOSO", desc: "Explore, mas sobreviva" },
        { id: "broken", name: "QUEBRADO", desc: "Perda total de sanidade" },
        { id: "enlightened", name: "ILUMINADO", desc: "Inale a fumaça das regras" },
        { id: "void", name: "VAZIO", desc: "Destrua todas as regras" },
        { id: "trapped", name: "APRISIONADO", desc: "Tente escapar às 03:03" },
        { id: "fragmented", name: "FRAGMENTADO", desc: "Responda à pergunta múltipla" },
        { id: "hidden", name: "OCULTO", desc: "Niegue sua presença e fique em silêncio" },
        { id: "assimilated", name: "ASSIMILADO", desc: "Torne-se parte do hospital" },
        { id: "suspicious", name: "SUSPEITO", desc: "Descubra segredos demais" },
        { id: "reckless", name: "TEMERÁRIO", desc: "Enfrente a entidade" },
        { id: "corridor_ghost", name: "FANTASMA", desc: "Fique no corredor para sempre" },
        { id: "defiant", name: "DESAFIADOR", desc: "Resista até o fim" }
      ];
      
      allEndings.forEach(ending => {
        if (gameState.discoveredEndings.includes(ending.id)) {
          text += `✓ ${ending.name}: ${ending.desc}\n`;
        } else {
          text += `? ${ending.name}: ${ending.desc}\n`;
        }
      });
      
      text += `\nFinais descobertos: ${gameState.discoveredEndings.length}/13\n`;
      text += `Segredos: ${gameState.secrets.length}\n`;
      text += `Total de turnos: ${gameState.turnsCompleted}`;
      
      if (gameState.discoveredEndings.length >= 13) {
        text += "\n\n🎭 VOCÊ DESCOBRIU TODOS OS FINAIS!";
        if (!hasSecret("completionist")) {
          discoverSecret("completionist");
        }
      }
      
      return text;
    },
    choices: [
      { 
        text: "Voltar ao Menu Principal", 
        next: "start", 
        reset: true,
        action: () => {
          // Mantém progresso entre playthroughs
          const preservedSecrets = [...gameState.secrets];
          const preservedEndings = [...gameState.discoveredEndings];
          const preservedTurns = gameState.turnsCompleted;
          
          Object.assign(gameState, {
            sanity: 75,
            route: "neutral",
            mistakes: 0,
            time: "01:58",
            items: [],
            secrets: preservedSecrets,
            discoveredEndings: preservedEndings,
            hasLight: false,
            rulesKnown: false,
            footstepsHeard: false,
            nameCalled: false,
            corridorGlimpsed: false,
            diaryFound: false,
            mirrorTaken: false,
            roomsVisited: [],
            sanityHistory: [],
            turnsCompleted: preservedTurns
          });
        }
      },
      { 
        text: "Novo Jogo (Limpar Progresso)", 
        next: "start", 
        action: () => {
          // Reset completo
          Object.assign(gameState, {
            sanity: 100,
            route: "neutral",
            mistakes: 0,
            time: "01:58",
            items: [],
            secrets: [],
            discoveredEndings: [],
            hasLight: false,
            rulesKnown: false,
            footstepsHeard: false,
            nameCalled: false,
            corridorGlimpsed: false,
            diaryFound: false,
            mirrorTaken: false,
            roomsVisited: [],
            sanityHistory: [],
            turnsCompleted: 0
          });
          
          playSound("select", { volume: 1.2 });
        }
      }
    ]
  },

  // Cenas adicionais que faltaram
  flashlightCorridor: {
    text: () => {
      updateTime(5);
      changeSanity(2);
      discoverSecret("flashlight_revelation");
      
      let text = `${gameState.time} — O feixe de luz revela que o corredor não é reto.\n\n`;
      text += "Ele curva-se suavemente para a esquerda, criando uma espiral impossível. \n";
      text += "Nas paredes, há centenas de mãos pequenas impressas, \n";
      text += "como se crianças tivessem tocado a tinta ainda fresca. \n";
      text += "Algumas das mãos parecem estar se movendo.";
      
      return text;
    },
    choices: [
      {
        text: "Seguir a curvatura do corredor",
        next: "followCurve",
        action: () => {
          updateTime(15);
        }
      },
      {
        text: "Voltar atrás",
        next: "hallwayTime",
        action: () => {
          recoverSanity(2);
          updateTime(5);
        }
      }
    ]
  },

  followCurve: {
    text: () => {
      updateTime(20);
      changeSanity(5);
      discoverSecret("corridor_spiral");
      
      return `${gameState.time} — Você segue a curva. O corredor se torce como uma fita de Möbius.\n\n`
           + "Você passa pela sala inicial, mas agora vista de cima. \n"
           + "Você vê a si mesmo lá embaixo, lendo as regras pela primeira vez. \n"
           + "Ou será a última? O tempo é circular aqui.";
    },
    choices: [
      {
        text: "Continuar seguindo",
        next: "followCurveDeeper",
        condition: () => gameState.sanity > 15,
        action: () => {
          updateTime(30);
          changeSanity(8);
        }
      },
      {
        text: "Tentar voltar",
        next: "hallwayTime",
        action: () => {
          updateTime(10);
          recoverSanity(3);
        }
      }
    ]
  },

  followCurveDeeper: {
    text: () => {
      updateTime(60);
      changeSanity(15);
      gameState.route = "lost_in_spiral";
      
      return `${gameState.time} — Você caminhou por uma hora. Ou um minuto. Ou um ano.\n\n`
           + "O corredor agora é infinito. \n"
           + "As portas se repetem em padrões fractais. \n"
           + "Você encontra seu próprio rastro, deixado momentos atrás. \n"
           + "Ou talvez deixado por outra versão de você. \n"
           + "O hospital é maior por dentro do que por fora. \n"
           + "Na verdade, ele não tem fora.";
    },
    choices: [
      {
        text: "Aceitar a infinitude",
        next: "ending",
        action: () => {
          unlockEnding("infinite");
          updateTime(60 * 4);
        }
      },
      {
        text: "Sentar e esperar",
        next: "waitInSpiral",
        action: () => {
          updateTime(60 * 2);
        }
      }
    ]
  },

  waitInSpiral: {
    text: () => {
      updateTime(60 * 3);
      changeSanity(10);
      
      return `${gameState.time} — Você espera. A escuridão é completa.\n\n`
           + "Sem a lanterna, você não vê nada. \n"
           + "Sem som, você não ouve nada. \n"
           + "Você começa a duvidar se ainda existe. \n"
           + "Talvez nunca tenha existido. \n"
           + "Talvez o hospital seja apenas um sonho que algo está tendo.";
    },
    choices: [
      {
        text: "Despertar",
        next: "ending",
        action: () => {
          gameState.route = "dreamer";
          unlockEnding("dream");
          updateTime(60 * 1);
        }
      }
    ]
  },

  peripheralLook: {
    text: () => {
      updateTime(5);
      changeSanity(3);
      discoverSecret("peripheral_vision");
      
      return `${gameState.time} — Com o canto do olho, você percebe a verdade.\n\n`
           + "As sombras não correspondem aos objetos físicos. \n"
           + "Elas se movem independentemente, alongando-se e contraindo-se. \n"
           + "Elas não são ausência de luz, mas algo que vive na ausência. \n"
           + "Quando você olha diretamente, elas fingem ser sombras normais. \n"
           + "Mas você sabe a verdade agora.";
    },
    choices: [
      {
        text: "Olhar diretamente para as sombras",
        next: "directShadowLook",
        action: () => {
          changeSanity(5);
          gameState.corridorGlimpsed = true;
        }
      },
      {
        text: "Ignorar e continuar",
        next: "hallwayTime",
        action: () => {
          recoverSanity(2);
          discoverSecret("shadow_knowledge");
        }
      }
    ]
  },

  directShadowLook: {
    text: () => {
      updateTime(2);
      changeSanity(10);
      gameState.route = "shadow_seer";
      
      return `${gameState.time} — Você olha diretamente. As sombras não têm onde se esconder.\n\n`
           + "Elas são feitas de memórias esquecidas e medos antigos. \n"
           + "Elas são os pacientes que nunca saíram. \n"
           + "Elas são os guardas que ficaram. \n"
           + "Elas são você, em um futuro próximo. \n"
           + "Todas elas olham de volta. Todas reconhecem você.";
    },
    choices: [
      {
        text: "Juntar-se a elas",
        next: "ending",
        action: () => {
          unlockEnding("shadow");
          updateTime(60 * 4);
        }
      },
      {
        text: "Fugir dos olhares",
        next: "hallwayPanic",
        action: () => {
          updateTime(2);
        }
      }
    ]
  }
};

/* =========================
   FUNÇÕES DE RENDERIZAÇÃO
========================= */


function showScene(key) {
  const scene = scenes[key];
  if (!scene) {
    console.error(`Cena "${key}" não encontrada!`);
    return;
  }
  
  // Limpar escolhas anteriores
  choicesElement.innerHTML = "";
  
  // Obter texto da cena
  const sceneText = typeof scene.text === "function" ? scene.text() : scene.text;
  
  // Digitar texto
  typeText(sceneText, () => {
    sanityEffects();
    showSanityIndicator();
    
    // Obter escolhas (pode ser função)
    const sceneChoices = typeof scene.choices === "function" ? scene.choices() : scene.choices;
    
    sceneChoices.forEach(choice => {
      // Verificar condições
      if (choice.condition && !choice.condition()) {
        return;
      }
      
      const btn = document.createElement("button");
      btn.innerText = choice.text;
      btn.className = "choice-btn";
      
      // Efeito de hover
      btn.addEventListener("mouseenter", () => {
        if (!isTyping) {
          playSound("hover");
          btn.style.transform = "translateX(5px)";
        }
      });
      
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "translateX(0)";
      });
      
      // Clique
      btn.onclick = () => {
        if (isTyping) return;
        
        playSound("select");
        
        // Executar ação se houver
        if (choice.action) {
          choice.action();
        }
        
        // Reset se necessário
        if (choice.reset) {
          // A ação já lida com o reset
        }
        
        // Ir para próxima cena
        showScene(choice.next);
      };
      
      choicesElement.appendChild(btn);
    });
    
    // Se não houver escolhas, adicionar uma padrão
    if (choicesElement.children.length === 0) {
      const defaultBtn = document.createElement("button");
      defaultBtn.innerText = "Continuar...";
      defaultBtn.className = "choice-btn";
      defaultBtn.onclick = () => {
        showScene("start");
      };
      choicesElement.appendChild(defaultBtn);
    }
  });
}

/* =========================
   INICIALIZAÇÃO DO JOGO
========================= */
function initGame() {
  // Configurar controles de opções
  document.getElementById("ambientVolume").addEventListener("input", e => {
    settings.ambientVolume = parseFloat(e.target.value);
    activeAmbient.volume = settings.ambientVolume;
  });
  
  document.getElementById("effectsVolume").addEventListener("input", e => {
    settings.effectsVolume = parseFloat(e.target.value);
    // Atualizar todos os efeitos sonoros
    Object.values(audioEffects).forEach(audio => {
      if (audio !== audioEffects.select && audio !== audioEffects.hover) {
        audio.volume = settings.effectsVolume;
      }
    });
    audioEffects.select.volume = settings.effectsVolume + 0.05;
    audioEffects.hover.volume = settings.effectsVolume - 0.05;
  });
  
  document.getElementById("typingSpeed").addEventListener("input", e => {
    settings.typingSpeed = Number(e.target.value);
  });
  
  // Configurar botões de navegação
  startButton.addEventListener("click", () => {
    menu.classList.add("hidden");
    optionsScreen.classList.add("hidden");
    gameElement.classList.remove("hidden");
    
    updateAmbientSound();
    showScene("start");
    
    playSound("select", { volume: 1.3 });
  });
  
  optionsButton.addEventListener("click", () => {
    menu.classList.add("hidden");
    optionsScreen.classList.remove("hidden");
    playSound("hover");
  });
  
  backButton.addEventListener("click", () => {
    optionsScreen.classList.add("hidden");
    menu.classList.remove("hidden");
    playSound("hover");
  });
  
  // Configurar teclas de atalho
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.classList.contains("hidden")) {
      if (!optionsScreen.classList.contains("hidden")) {
        optionsScreen.classList.add("hidden");
        menu.classList.remove("hidden");
      }
    }
    
    // Pular digitação com Enter
    if (e.key === "Enter" && isTyping) {
      stopTyping();
      const scene = scenes[currentScene];
      const sceneText = typeof scene.text === "function" ? scene.text() : scene.text;
      textElement.innerText = sceneText;
      isTyping = false;
      sanityEffects();
      showSanityIndicator();
      
      // Mostrar escolhas imediatamente
      const sceneChoices = typeof scene.choices === "function" ? scene.choices() : scene.choices;
      choicesElement.innerHTML = "";
      
      sceneChoices.forEach((choice, index) => {
        if (choice.condition && !choice.condition()) return;
        
        const btn = document.createElement("button");
        btn.innerText = choice.text;
        btn.className = "choice-btn";
        
        // Atalho numérico
        if (index < 9) {
          btn.setAttribute("data-key", index + 1);
        }
        
        btn.onclick = () => {
          if (choice.action) choice.action();
          showScene(choice.next);
        };
        
        choicesElement.appendChild(btn);
      });
    }
    
    // Atalhos numéricos para escolhas
    if (!isTyping && e.key >= "1" && e.key <= "9") {
      const index = parseInt(e.key) - 1;
      const buttons = choicesElement.querySelectorAll(".choice-btn");
      if (buttons[index]) {
        buttons[index].click();
      }
    }
  });
  
  // Inicializar estado do jogo
  Object.assign(gameState, {
    sanity: 100,
    route: "neutral",
    mistakes: 0,
    time: "01:58",
    items: [],
    secrets: [],
    discoveredEndings: [],
    hasLight: false,
    rulesKnown: false,
    footstepsHeard: false,
    nameCalled: false,
    corridorGlimpsed: false,
    diaryFound: false,
    mirrorTaken: false,
    roomsVisited: [],
    turnsCompleted: 0,
    sanityHistory: []
  });
  
  console.log("Jogo 02:17 inicializado com expansões!");
  console.log("Finais disponíveis: 13+");
  console.log("Segredos: 20+");
  console.log("Caminhos únicos: 50+");
}

// Inicializar quando a página carregar
window.addEventListener("DOMContentLoaded", initGame);

// Variável global para rastrear cena atual (para debug)

let currentScene = "start";
