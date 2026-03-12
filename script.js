const canvas = document.getElementById("jogoCanvas");
const ctx = canvas.getContext("2d");

// --- 1. ASSETS ---
const somMoeda = new Audio('moeda.mp3?v=' + Date.now());
const somMusica = new Audio('musica.mp3');
somMusica.loop = true;
somMusica.volume = 0.4;

let audioLiberado = false;
let joystickDados = { x: 0, y: 0, ativo: false };

const imgJogador = new Image(); imgJogador.src = 'jogador.png';
const imgMoeda = new Image(); imgMoeda.src = 'moeda.png';
const imgInimigo = new Image(); imgInimigo.src = 'inimigo.png';
const imgInimigo2 = new Image(); imgInimigo2.src = 'inimigo2.png';
const imgFundo = new Image(); imgFundo.src = 'espaco.png';
const imgCristal = new Image(); imgCristal.src = 'cristal.png';
const imgCoracao = new Image(); imgCoracao.src = 'coracao.png';

// --- 2. CONFIGURAÇÕES & ESTADO ---
const tamanho = 40;
const velocidadeBaseJogador = 5;
const itemTamanho = 40;
const inimigoTamanho = 40;

let estadoJogo = "menu";
let x, y, itemX, itemY;
let especialX = -100, especialY = -100;
let especialAtivo = false, powerUpAtivo = false, tempoPowerUp = 0;
let inimigos = [], particulas = [];
let pontos, tempoRestante, contagemRegressiva, vidas = 3;
let fundoY = 0, velocidadeFundo = 1;
let recorde = localStorage.getItem("recordeMaximo") || 0;
const teclas = {};

// --- 3. SISTEMAS (Partículas e Inimigos) ---
function criarParticulas(px, py, cor) {
    for (let i = 0; i < 10; i++) {
        particulas.push({
            x: px, y: py,
            velX: (Math.random() - 0.5) * 5,
            velY: (Math.random() - 0.5) * 5,
            vida: 1.0,
            cor: cor
        });
    }
}

function adicionarInimigo(tipo = "comum") {
    inimigos.push({
        x: Math.random() * (canvas.width - inimigoTamanho),
        y: Math.random() * (canvas.height - inimigoTamanho),
        velX: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2),
        velY: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2),
        tipo: tipo,
        rastro: []
    });
}

// --- 4. CORE DO JOGO ---
function iniciarJogo() {
    recorde = localStorage.getItem("recordeMaximo") || 0;
    x = 175; y = 175; pontos = 0; tempoRestante = 90; vidas = 3;
    estadoJogo = "jogando"; 
    inimigos = []; particulas = []; especialAtivo = false; powerUpAtivo = false; tempoPowerUp = 0;

    adicionarInimigo("comum");
    itemX = Math.random() * (canvas.width - itemTamanho);
    itemY = Math.random() * (canvas.height - itemTamanho);

    if (contagemRegressiva) clearInterval(contagemRegressiva);
    contagemRegressiva = setInterval(() => {
        if (tempoRestante > 0 && estadoJogo === "jogando") {
            tempoRestante--;
            if (powerUpAtivo) {
                tempoPowerUp--;
                if (tempoPowerUp <= 0) { powerUpAtivo = false; tempoPowerUp = 0; }
            }
        } else if (tempoRestante <= 0) {
            estadoJogo = "gameover";
            clearInterval(contagemRegressiva);
        }
    }, 1000);

    if (audioLiberado) somMusica.play().catch(() => {});
}

function atualizar() {
    if (estadoJogo !== "jogando") return;

    fundoY += velocidadeFundo;
    if (fundoY >= canvas.height) fundoY = 0;

    particulas.forEach((p, i) => {
        p.x += p.velX; p.y += p.velY;
        p.vida -= 0.02;
        if (p.vida <= 0) particulas.splice(i, 1);
    });

    let velAtual = powerUpAtivo ? velocidadeBaseJogador * 1.8 : velocidadeBaseJogador;

    // Movimento Híbrido (Teclado + Joystick)
    if (teclas["ArrowUp"] || teclas["w"] || teclas["W"]) y -= velAtual;
    if (teclas["ArrowDown"] || teclas["s"] || teclas["S"]) y += velAtual;
    if (teclas["ArrowLeft"] || teclas["a"] || teclas["A"]) x -= velAtual;
    if (teclas["ArrowRight"] || teclas["d"] || teclas["D"]) x += velAtual;

    x += joystickDados.x * velAtual;
    y += joystickDados.y * velAtual;

    x = Math.max(0, Math.min(x, canvas.width - tamanho));
    y = Math.max(0, Math.min(y, canvas.height - tamanho));

    inimigos.forEach((ini) => {
        ini.rastro.push({ x: ini.x, y: ini.y });
        if (ini.rastro.length > 8) ini.rastro.shift();

        if (ini.tipo === "perseguidor") {
            let dx = x - ini.x; let dy = y - ini.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) { ini.x += (dx / dist) * 1.8; ini.y += (dy / dist) * 1.8; }
        } else {
            ini.x += ini.velX; ini.y += ini.velY;
            if (ini.x <= 0 || ini.x + inimigoTamanho >= canvas.width) ini.velX *= -1;
            if (ini.y <= 0 || ini.y + inimigoTamanho >= canvas.height) ini.velY *= -1;
        }

        if (!powerUpAtivo && x < ini.x + inimigoTamanho && x + tamanho > ini.x && y < ini.y + inimigoTamanho && y + tamanho > ini.y) {
            vidas--;
            criarParticulas(x + tamanho/2, y + tamanho/2, "red");
            x = 175; y = 175;
            if (vidas <= 0) {
                estadoJogo = "gameover";
                somMusica.pause();
                clearInterval(contagemRegressiva);
            }
        }
    });

    // Colisões Itens
    if (x < itemX + itemTamanho && x + tamanho > itemX && y < itemY + itemTamanho && y + tamanho > itemY) {
        pontos++;
        criarParticulas(itemX, itemY, "yellow");
        if (!especialAtivo && Math.random() < 0.15) {
            especialAtivo = true;
            especialX = Math.random() * (canvas.width - itemTamanho);
            especialY = Math.random() * (canvas.height - itemTamanho);
        }
        if (pontos % 20 === 0) Math.random() < 0.5 ? adicionarInimigo("perseguidor") : adicionarInimigo("comum");
        if (pontos > recorde) { recorde = pontos; localStorage.setItem("recordeMaximo", recorde); }
        somMoeda.currentTime = 0; somMoeda.play().catch(() => {});
        itemX = Math.random() * (canvas.width - itemTamanho);
        itemY = Math.random() * (canvas.height - itemTamanho);
    }

    if (especialAtivo && x < especialX + itemTamanho && x + tamanho > especialX && y < especialY + itemTamanho && y + tamanho > especialY) {
        especialAtivo = false; powerUpAtivo = true; tempoPowerUp += 7;
        criarParticulas(especialX, especialY, "cyan");
    }
}

function desenhar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgFundo, 0, fundoY, canvas.width, canvas.height);
    ctx.drawImage(imgFundo, 0, fundoY - canvas.height, canvas.width, canvas.height);

    if (estadoJogo === "menu") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = "center"; ctx.fillStyle = "cyan"; ctx.font = "bold 40px Arial";
        ctx.fillText("SPACE SURVIVAL", canvas.width / 2, canvas.height / 2 - 50);
        ctx.fillStyle = "white"; ctx.font = "18px Arial";
        ctx.fillText("WASD para mover | 3 Vidas | Cristais Acumulam", canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillText("Toque ou ESPAÇO para Iniciar", canvas.width / 2, canvas.height / 2 + 60);

    } else if (estadoJogo === "jogando") {
        atualizar();
        particulas.forEach(p => {
            ctx.globalAlpha = p.vida; ctx.fillStyle = p.cor;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1.0;

        if (powerUpAtivo) { ctx.shadowBlur = 20; ctx.shadowColor = "cyan"; }
        ctx.drawImage(imgJogador, x, y, tamanho, tamanho);
        ctx.shadowBlur = 0;

        ctx.drawImage(imgMoeda, itemX, itemY, itemTamanho, itemTamanho);
        if (especialAtivo) ctx.drawImage(imgCristal, especialX, especialY, itemTamanho, itemTamanho);

        inimigos.forEach(ini => {
            if (ini.tipo === "perseguidor") {
                ini.rastro.forEach((pos, index) => {
                    ctx.globalAlpha = index / 15;
                    ctx.drawImage(imgInimigo2, pos.x, pos.y, inimigoTamanho, inimigoTamanho);
                });
                ctx.globalAlpha = 1.0;
            }
            ctx.drawImage(ini.tipo === "perseguidor" ? imgInimigo2 : imgInimigo, ini.x, ini.y, inimigoTamanho, inimigoTamanho);
        });

        for (let i = 0; i < vidas; i++) ctx.drawImage(imgCoracao, 10 + (i * 35), 50, 25, 25);

        ctx.textAlign = "left"; ctx.fillStyle = "white"; ctx.font = "bold 18px Arial";
        ctx.fillText("Pontos: " + pontos, 10, 30);
        ctx.fillText("Tempo: " + tempoRestante + "s", 310, 30);
        if (powerUpAtivo) { ctx.fillStyle = "cyan"; ctx.fillText("INVENCÍVEL: " + tempoPowerUp + "s", 10, 95); }
        ctx.textAlign = "center"; ctx.fillStyle = "yellow"; ctx.fillText("Recorde: " + recorde, canvas.width / 2, 30);

    } else if (estadoJogo === "gameover") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = "center"; ctx.fillStyle = "red"; ctx.font = "bold 40px Arial";
        ctx.fillText("MISSÃO FALHOU", canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = "white"; ctx.font = "20px Arial";
        ctx.fillText("Pontos: " + pontos + " | Recorde: " + recorde, canvas.width / 2, canvas.height / 2 + 30);
        ctx.fillText("Toque ou ESPAÇO para Recomeçar", canvas.width / 2, canvas.height / 2 + 90);
    }
    requestAnimationFrame(desenhar);
}

// --- 5. EVENTOS & CONTROLES ---
function setupJoystick() {
    const base = document.getElementById("joystick-base");
    const stick = document.getElementById("joystick-stick");
    const centro = 60;

    const moverJoystick = (e) => {
        if (!joystickDados.ativo) return;
        e.preventDefault();
        const toque = e.touches ? e.touches[0] : e;
        const rect = base.getBoundingClientRect();
        let posX = toque.clientX - rect.left - centro;
        let posY = toque.clientY - rect.top - centro;
        const distancia = Math.sqrt(posX * posX + posY * posY);
        const raioMax = 50;

        if (distancia > raioMax) {
            posX = (posX / distancia) * raioMax;
            posY = (posY / distancia) * raioMax;
        }
        stick.style.transform = `translate(${posX}px, ${posY}px)`;
        joystickDados.x = posX / raioMax;
        joystickDados.y = posY / raioMax;
        if (estadoJogo !== "jogando") iniciarJogo();
    };

    base.addEventListener("touchstart", (e) => { 
        joystickDados.ativo = true; 
        if (!audioLiberado) { audioLiberado = true; somMoeda.play().then(()=>somMoeda.pause()); }
        moverJoystick(e); 
    });
    window.addEventListener("touchmove", moverJoystick, { passive: false });
    window.addEventListener("touchend", () => {
        joystickDados.ativo = false;
        joystickDados.x = 0; joystickDados.y = 0;
        stick.style.transform = `translate(0px, 0px)`;
    });
}

// Eventos Globais
window.addEventListener("keydown", (e) => {
    teclas[e.key] = true;
    if (estadoJogo !== "jogando" && (e.key === " " || e.key === "Enter")) {
        if (!audioLiberado) { audioLiberado = true; somMoeda.play().then(()=>somMoeda.pause()); }
        iniciarJogo();
    }
});
window.addEventListener("keyup", (e) => teclas[e.key] = false);

window.addEventListener("touchstart", (e) => {
    if (estadoJogo !== "jogando") {
        if (!audioLiberado) { audioLiberado = true; somMoeda.play().then(()=>somMoeda.pause()); }
        iniciarJogo();
    }
}, { passive: false });

// Bloqueios de sistema
window.addEventListener('touchmove', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
window.addEventListener('contextmenu', (e) => e.preventDefault());

// Start
setupJoystick();
desenhar();