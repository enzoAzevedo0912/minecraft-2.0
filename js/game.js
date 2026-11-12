// ==========================================
// 1. RENDERIZADOR OTIMIZADO (CHUNK STREAMING + INSTANCED MESH)
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec0ee);
scene.fog = new THREE.FogExp2(0x7ec0ee, 0.011);

let baseFov = 75;
let renderRadius = 48; // Alcance de renderização dinâmica ao redor do jogador
const camera = new THREE.PerspectiveCamera(baseFov, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5e0, 0.8);
sunLight.position.set(45, 80, 35);
scene.add(sunLight);

// Sol Redondo 3D
const sunGroup = new THREE.Group();
const sunSphere = new THREE.Mesh(
    new THREE.SphereGeometry(6, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xffeb3b })
);
const sunHalo = new THREE.Mesh(
    new THREE.SphereGeometry(8, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff176, transparent: true, opacity: 0.28 })
);
sunGroup.add(sunSphere, sunHalo);
scene.add(sunGroup);

// Nuvens 3D
const clouds = [];
function createClouds() {
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
    for (let i = 0; i < 45; i++) {
        const cluster = new THREE.Group();
        for (let p = 0; p < 3; p++) {
            const puff = new THREE.Mesh(
                new THREE.BoxGeometry(6 + Math.random() * 6, 1.3, 4 + Math.random() * 5),
                cloudMat
            );
            puff.position.set((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 5);
            cluster.add(puff);
        }
        cluster.position.set((Math.random() - 0.5) * 320, 32 + Math.random() * 6, (Math.random() - 0.5) * 320);
        scene.add(cluster);
        clouds.push(cluster);
    }
}
createClouds();

// ==========================================
// 2. TEXTURAS HD PIXEL ART (32x32) PARA BLOCOS E CRAFTING TABLE
// ==========================================
function buildRichTexture(drawFn) {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    drawFn(ctx);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

// Grama Topo (32x32 com tufos e flores minúsculas)
const texGrassTop = buildRichTexture((ctx) => {
    const greens = ["#4ca630", "#58b839", "#3f8e26", "#64c943"];
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            ctx.fillStyle = greens[(x * 7 + y * 13 + Math.floor(Math.random() * 4)) % greens.length];
            ctx.fillRect(x, y, 1, 1);
        }
    }
    // Pequenas flores silvestres aleatórias
    ctx.fillStyle = "#ffeb3b";
    ctx.fillRect(6, 9, 2, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(22, 24, 2, 2);
});

// Terra (32x32 com pedrinhas orgânicas)
const texDirt = buildRichTexture((ctx) => {
    const browns = ["#795548", "#6b493d", "#876153", "#5c3d32"];
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            ctx.fillStyle = browns[Math.floor(Math.random() * browns.length)];
            ctx.fillRect(x, y, 1, 1);
        }
    }
    ctx.fillStyle = "#9e9e9e";
    ctx.fillRect(5, 14, 2, 2);
    ctx.fillRect(21, 22, 2, 2);
});

// Lateral da Grama (32x32 com borda irregular realista)
const texGrassSide = buildRichTexture((ctx) => {
    const browns = ["#795548", "#6b493d", "#876153"];
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            ctx.fillStyle = browns[Math.floor(Math.random() * browns.length)];
            ctx.fillRect(x, y, 1, 1);
        }
    }
    for (let x = 0; x < 32; x++) {
        const drop = 5 + ((x * 5) % 5);
        for (let y = 0; y < drop; y++) {
            ctx.fillStyle = y === drop - 1 ? "#387c21" : "#4ca630";
            ctx.fillRect(x, y, 1, 1);
        }
    }
});

// Pedra (32x32 com rachaduras e estratos)
const texStone = buildRichTexture((ctx) => {
    const grays = ["#7d7d7d", "#6e6e6e", "#8c8c8c", "#616161"];
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            ctx.fillStyle = grays[Math.floor(Math.random() * grays.length)];
            ctx.fillRect(x, y, 1, 1);
        }
    }
    ctx.fillStyle = "#525252";
    ctx.fillRect(4, 8, 9, 1);
    ctx.fillRect(15, 19, 11, 1);
    ctx.fillRect(8, 26, 8, 1);
});

// Carvão (32x32 com cristais pretos brilhantes)
const texCoal = buildRichTexture((ctx) => {
    ctx.drawImage(texStone.image, 0, 0);
    const spots = [[5, 6], [18, 8], [10, 18], [22, 21], [7, 25]];
    spots.forEach(([sx, sy]) => {
        ctx.fillStyle = "#141414";
        ctx.fillRect(sx, sy, 5, 4);
        ctx.fillStyle = "#3a3a3a";
        ctx.fillRect(sx + 1, sy + 1, 2, 1);
    });
});

// Rocha Matriz (Bedrock 32x32)
const texBedrock = buildRichTexture((ctx) => {
    const shades = ["#1c1c1c", "#2e2e2e", "#0d0d0d", "#424242"];
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            ctx.fillStyle = shades[Math.floor(Math.random() * shades.length)];
            ctx.fillRect(x, y, 1, 1);
        }
    }
});

// Tronco de Madeira (32x32 com casca vertical)
const texWood = buildRichTexture((ctx) => {
    for (let x = 0; x < 32; x++) {
        const stripe = x % 4 === 0 ? "#472e21" : (x % 2 === 0 ? "#5c3c2b" : "#6b4733");
        for (let y = 0; y < 32; y++) {
            ctx.fillStyle = Math.random() < 0.2 ? "#3b251a" : stripe;
            ctx.fillRect(x, y, 1, 1);
        }
    }
});

// Tábuas de Madeira (32x32 com 4 tábuas horizontais e pregos)
const texPlank = buildRichTexture((ctx) => {
    const tones = ["#c99654", "#bd8a48", "#d4a15f", "#b37f3e"];
    for (let p = 0; p < 4; p++) {
        const y0 = p * 8;
        ctx.fillStyle = tones[p % tones.length];
        ctx.fillRect(0, y0, 32, 8);
        for (let y = y0; y < y0 + 8; y++) {
            for (let x = 0; x < 32; x++) {
                if (Math.random() < 0.25) {
                    ctx.fillStyle = "rgba(80, 45, 15, 0.22)";
                    ctx.fillRect(x, y, 2, 1);
                }
            }
        }
        ctx.fillStyle = "#6e4720";
        ctx.fillRect(0, y0 + 7, 32, 1);
    }
});

// Folhas (32x32 com profundidade e transparência leve)
const texLeaves = buildRichTexture((ctx) => {
    const greens = ["#2d7520", "#225c17", "#388c28", "#1b4a12"];
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            ctx.fillStyle = greens[Math.floor(Math.random() * greens.length)];
            ctx.fillRect(x, y, 1, 1);
        }
    }
});

// Crafting Table (Topo 3x3 e Laterais com Ferramentas)
const texCraftingTop = buildRichTexture((ctx) => {
    ctx.fillStyle = "#b57c3e";
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = "#4d2f14";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 30, 30);
    // Grade 3x3 desenhada no topo
    ctx.fillStyle = "#6e441e";
    for (let gx = 0; gx < 3; gx++) {
        for (let gy = 0; gy < 3; gy++) {
            ctx.fillRect(5 + gx * 8, 5 + gy * 8, 6, 6);
        }
    }
});

const texCraftingSide = buildRichTexture((ctx) => {
    ctx.drawImage(texPlank.image, 0, 0);
    ctx.fillStyle = "#4d2f14";
    ctx.fillRect(0, 0, 32, 5);
    // Desenho de serra e martelo pendurados na lateral
    ctx.fillStyle = "#cfd8dc";
    ctx.fillRect(7, 9, 4, 14);
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(20, 10, 3, 14);
    ctx.fillStyle = "#90a4ae";
    ctx.fillRect(17, 9, 9, 4);
});

const BLOCK_TYPES = ["grass", "dirt", "stone", "coal", "bedrock", "wood", "plank", "leaves", "crafting_table"];
const MATERIALS = {
    grass: [
        new THREE.MeshLambertMaterial({ map: texGrassSide }),
        new THREE.MeshLambertMaterial({ map: texGrassSide }),
        new THREE.MeshLambertMaterial({ map: texGrassTop }),
        new THREE.MeshLambertMaterial({ map: texDirt }),
        new THREE.MeshLambertMaterial({ map: texGrassSide }),
        new THREE.MeshLambertMaterial({ map: texGrassSide })
    ],
    dirt: new THREE.MeshLambertMaterial({ map: texDirt }),
    stone: new THREE.MeshLambertMaterial({ map: texStone }),
    coal: new THREE.MeshLambertMaterial({ map: texCoal }),
    bedrock: new THREE.MeshLambertMaterial({ map: texBedrock }),
    wood: new THREE.MeshLambertMaterial({ map: texWood }),
    plank: new THREE.MeshLambertMaterial({ map: texPlank }),
    leaves: new THREE.MeshLambertMaterial({ map: texLeaves }),
    crafting_table: [
        new THREE.MeshLambertMaterial({ map: texCraftingSide }),
        new THREE.MeshLambertMaterial({ map: texCraftingSide }),
        new THREE.MeshLambertMaterial({ map: texCraftingTop }),
        new THREE.MeshLambertMaterial({ map: texPlank }),
        new THREE.MeshLambertMaterial({ map: texCraftingSide }),
        new THREE.MeshLambertMaterial({ map: texCraftingSide })
    ]
};

// ==========================================
// 3. ITENS, INVENTÁRIO VAZIO E RECEITAS (2x2 + CRAFTING TABLE 3x3)
// ==========================================
const ITEM_DEFS = {
    grass: { name: "Grama", icon: "🟩", isBlock: true, hardness: 0.5, toolType: "any", drop: "dirt", dropColor: 0x795548 },
    dirt: { name: "Terra", icon: "🟫", isBlock: true, hardness: 0.45, toolType: "any", drop: "dirt", dropColor: 0x795548 },
    stone: { name: "Pedra", icon: "🪨", isBlock: true, hardness: 1.8, toolType: "pickaxe", drop: "stone", dropColor: 0x7a7a7a },
    coal: { name: "Carvão", icon: "⬛", isBlock: true, hardness: 2.1, toolType: "pickaxe", drop: "coal", dropColor: 0x222222 },
    bedrock: { name: "Rocha Base", icon: "🛑", isBlock: true, hardness: 9999, toolType: "none", drop: null },
    wood: { name: "Tronco", icon: "🪵", isBlock: true, hardness: 1.2, toolType: "axe", drop: "wood", dropColor: 0x5c3d2e },
    plank: { name: "Tábua", icon: "🟧", isBlock: true, hardness: 0.9, toolType: "axe", drop: "plank", dropColor: 0xc28e4e },
    leaves: { name: "Folha", icon: "🌿", isBlock: true, hardness: 0.2, toolType: "any", drop: null },
    crafting_table: { name: "Bancada", icon: "🛠️", isBlock: true, isCraftingTable: true, hardness: 1.0, toolType: "axe", drop: "crafting_table", dropColor: 0xb57c3e },
    stick: { name: "Graveto", icon: "🥢", isBlock: false, dropColor: 0x6d4c41 },
    pickaxe: { name: "Picareta", icon: "⛏️", isTool: true, toolType: "pickaxe", speed: 5.2, damage: 3, dropColor: 0x90a4ae },
    axe: { name: "Machado", icon: "🪓", isTool: true, toolType: "axe", speed: 4.8, damage: 4, dropColor: 0x90a4ae },
    sword: { name: "Espada", icon: "⚔️", isTool: true, toolType: "sword", speed: 1.2, damage: 8, dropColor: 0xffca28 },
    knife: { name: "Faca", icon: "🔪", isTool: true, toolType: "knife", speed: 1.5, damage: 5, dropColor: 0xeceff1 },
    bow: { name: "Arco", icon: "🏹", isTool: true, isBow: true, toolType: "bow", speed: 1.0, damage: 3, dropColor: 0x6d4c41 },
    meat: { name: "Carne", icon: "🥩", isFood: true, healHunger: 4, healHp: 3, dropColor: 0xd32f2f },
    rotten_flesh: { name: "Carne Podre", icon: "🤢", isFood: true, healHunger: 2, healHp: -1, dropColor: 0x558b2f },
    bone: { name: "Osso", icon: "🦴", isBlock: false, dropColor: 0xf5f5f5 },
    wool: { name: "Lã", icon: "🧶", isBlock: false, dropColor: 0xf5f5f5 }
};

// Inventário 100% vazio ao iniciar
const inventorySlots = new Array(36).fill(null);
const craftGrid2x2 = new Array(4).fill(null);
const craftGrid3x3 = new Array(9).fill(null);

let selectedSlot = 0;
let heldCursorItem = null;

// Receitas básicas na grade 2x2 do inventário (B)
const RECIPES_2X2 = [
    {
        name: "4× Tábuas (1 Tronco)",
        check: (c) => c.wood >= 1 && Object.keys(c).length === 1,
        consume: { wood: 1 },
        result: { id: "plank", count: 4 }
    },
    {
        name: "🛠️ Crafting Table (4 Tábuas)",
        check: (c) => c.plank >= 4 && Object.keys(c).length === 1,
        consume: { plank: 4 },
        result: { id: "crafting_table", count: 1 }
    },
    {
        name: "🥢 4× Gravetos (2 Tábuas)",
        check: (c) => c.plank >= 2 && Object.keys(c).length === 1,
        consume: { plank: 2 },
        result: { id: "stick", count: 4 }
    }
];

// Receitas completas na Crafting Table (3x3)
const RECIPES_3X3 = [
    ...RECIPES_2X2,
    {
        name: "⛏️ Picareta (3 Pedras + 2 Gravetos)",
        check: (c) => c.stone >= 3 && c.stick >= 2,
        consume: { stone: 3, stick: 2 },
        result: { id: "pickaxe", count: 1 }
    },
    {
        name: "⛏️ Picareta Madeira (3 Tábuas + 2 Gravetos)",
        check: (c) => c.plank >= 3 && c.stick >= 2 && !c.stone,
        consume: { plank: 3, stick: 2 },
        result: { id: "pickaxe", count: 1 }
    },
    {
        name: "🪓 Machado (3 Pedras + 2 Gravetos)",
        check: (c) => c.stone >= 3 && c.stick >= 2 && Object.keys(c).length === 2,
        consume: { stone: 3, stick: 2 },
        result: { id: "axe", count: 1 }
    },
    {
        name: "⚔️ Espada (2 Pedras + 1 Graveto)",
        check: (c) => c.stone >= 2 && c.stick >= 1,
        consume: { stone: 2, stick: 1 },
        result: { id: "sword", count: 1 }
    },
    {
        name: "🔪 Faca (1 Pedra + 1 Graveto)",
        check: (c) => c.stone >= 1 && c.stick >= 1,
        consume: { stone: 1, stick: 1 },
        result: { id: "knife", count: 1 }
    },
    {
        name: "🏹 Arco (3 Gravetos + 1 Lã)",
        check: (c) => c.stick >= 3 && c.wool >= 1,
        consume: { stick: 3, wool: 1 },
        result: { id: "bow", count: 1 }
    }
];

function addItemToInventory(id, qty = 1) {
    if (!ITEM_DEFS[id].isTool) {
        for (let i = 0; i < inventorySlots.length; i++) {
            if (inventorySlots[i] && inventorySlots[i].id === id && inventorySlots[i].count < 64) {
                const space = 64 - inventorySlots[i].count;
                const add = Math.min(space, qty);
                inventorySlots[i].count += add;
                qty -= add;
                if (qty <= 0) {
                    renderAllInventoryUI();
                    return true;
                }
            }
        }
    }
    for (let i = 0; i < inventorySlots.length; i++) {
        if (!inventorySlots[i]) {
            inventorySlots[i] = { id, count: qty };
            renderAllInventoryUI();
            return true;
        }
    }
    return false;
}

// ==========================================
// 4. DROPS FÍSICOS NO CHÃO
// ==========================================
const droppedItems = [];

function spawnDroppedItem(id, count, x, y, z) {
    const def = ITEM_DEFS[id];
    let mesh;

    if (def.isBlock) {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), MATERIALS[id]);
    } else if (id === "bone" || id === "stick") {
        mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8),
            new THREE.MeshLambertMaterial({ color: def.dropColor })
        );
        mesh.rotation.z = Math.PI / 2;
    } else if (id === "bow") {
        mesh = buildBowMesh3D();
        mesh.scale.set(0.65, 0.65, 0.65);
    } else {
        mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.22, 0.35),
            new THREE.MeshLambertMaterial({ color: def.dropColor || 0xffffff })
        );
    }

    mesh.position.set(
        x + (Math.random() - 0.5) * 0.6,
        y + 0.5,
        z + (Math.random() - 0.5) * 0.6
    );
    scene.add(mesh);

    droppedItems.push({
        id, count, mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 3.2, 4.5, (Math.random() - 0.5) * 3.2),
        pickupDelay: 0.55,
        age: 0
    });
}

function updateDroppedItems(dt) {
    for (let i = droppedItems.length - 1; i >= 0; i--) {
        const drop = droppedItems[i];
        drop.age += dt;
        if (drop.pickupDelay > 0) drop.pickupDelay -= dt;

        drop.vel.y -= 18 * dt;
        drop.mesh.position.x += drop.vel.x * dt;
        drop.mesh.position.z += drop.vel.z * dt;
        drop.mesh.position.y += drop.vel.y * dt;

        const bx = Math.floor(drop.mesh.position.x + 0.5);
        const by = Math.floor(drop.mesh.position.y - 0.18 + 0.5);
        const bz = Math.floor(drop.mesh.position.z + 0.5);
        if (worldData.has(getKey(bx, by, bz))) {
            drop.mesh.position.y = by + 0.68;
            drop.vel.set(0, 0, 0);
        }

        drop.mesh.rotation.y += dt * 2.5;
        drop.mesh.position.y += Math.sin(drop.age * 4) * 0.002;

        const dist = drop.mesh.position.distanceTo(new THREE.Vector3(player.pos.x, player.pos.y + 0.8, player.pos.z));
        if (drop.pickupDelay <= 0 && dist < 1.45) {
            if (addItemToInventory(drop.id, drop.count)) {
                scene.remove(drop.mesh);
                droppedItems.splice(i, 1);
            }
        }
    }
}

// ==========================================
// 5. SISTEMA DE FLECHAS 3D
// ==========================================
const activeArrows = [];

function shootArrow(origin, direction, fromPlayer = false) {
    const arrowGroup = new THREE.Group();

    const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.72, 6),
        new THREE.MeshLambertMaterial({ color: 0x8d6e63 })
    );
    shaft.rotation.x = Math.PI / 2;

    const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.14, 4),
        new THREE.MeshStandardMaterial({ color: 0xeceff1, metalness: 0.8 })
    );
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.40;

    const fletch = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.02, 0.16),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    fletch.position.z = -0.32;

    arrowGroup.add(shaft, tip, fletch);
    arrowGroup.position.copy(origin);
    arrowGroup.lookAt(origin.clone().add(direction));
    scene.add(arrowGroup);

    activeArrows.push({
        mesh: arrowGroup,
        vel: direction.clone().normalize().multiplyScalar(22),
        fromPlayer,
        life: 3.5
    });
}

function updateArrows(dt) {
    for (let i = activeArrows.length - 1; i >= 0; i--) {
        const arr = activeArrows[i];
        arr.life -= dt;
        arr.vel.y -= 7.5 * dt;

        arr.mesh.position.addScaledVector(arr.vel, dt);
        arr.mesh.lookAt(arr.mesh.position.clone().add(arr.vel));

        const bx = Math.floor(arr.mesh.position.x + 0.5);
        const by = Math.floor(arr.mesh.position.y + 0.5);
        const bz = Math.floor(arr.mesh.position.z + 0.5);
        if (worldData.has(getKey(bx, by, bz)) || arr.life <= 0) {
            scene.remove(arr.mesh);
            activeArrows.splice(i, 1);
            continue;
        }

        if (!arr.fromPlayer) {
            const playerCenter = new THREE.Vector3(player.pos.x, player.pos.y + 0.9, player.pos.z);
            if (arr.mesh.position.distanceTo(playerCenter) < 0.75) {
                survival.hp = Math.max(0, survival.hp - 1.5);
                updateSurvivalUI();
                scene.remove(arr.mesh);
                activeArrows.splice(i, 1);
                if (survival.hp <= 0) {
                    document.exitPointerLock();
                    document.getElementById("death-screen").classList.remove("hidden");
                }
            }
        } else {
            for (let j = entities.length - 1; j >= 0; j--) {
                const ent = entities[j];
                const entCenter = new THREE.Vector3(ent.group.position.x, ent.group.position.y + 0.9, ent.group.position.z);
                if (arr.mesh.position.distanceTo(entCenter) < 0.9) {
                    damageEntity(ent, 6);
                    scene.remove(arr.mesh);
                    activeArrows.splice(i, 1);
                    break;
                }
            }
        }
    }
}

// ==========================================
// 6. MUNDO DE 256 CHUNKS (256x256 BLOCOS) COM STREAMING DINÂMICO
// ==========================================
const worldData = new Map();
const caveSpots = [];
const instancedMeshes = {};
const MAX_INSTANCES_PER_TYPE = 36000;
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const dummyObj = new THREE.Object3D();

const WORLD_RADIUS = 128; // 256x256 blocos = 16x16 chunks = 256 CHUNKS!
const MIN_DEPTH = -14;
let lastChunkCenter = { cx: 9999, cz: 9999 };

function getKey(x, y, z) { return `${x},${y},${z}`; }

BLOCK_TYPES.forEach((type) => {
    const im = new THREE.InstancedMesh(boxGeo, MATERIALS[type], MAX_INSTANCES_PER_TYPE);
    im.count = 0;
    im.frustumCulled = false;
    scene.add(im);
    instancedMeshes[type] = im;
});

function isBlockExposed(x, y, z) {
    return (
        !worldData.has(getKey(x + 1, y, z)) ||
        !worldData.has(getKey(x - 1, y, z)) ||
        !worldData.has(getKey(x, y + 1, z)) ||
        !worldData.has(getKey(x, y - 1, z)) ||
        !worldData.has(getKey(x, y, z + 1)) ||
        !worldData.has(getKey(x, y, z - 1))
    );
}

// Renderiza os chunks dentro do alcance do jogador (garantindo 60 FPS num mundo de 256 chunks)
function rebuildVisibleChunks(force = false) {
    const px = Math.floor(player ? player.pos.x : 0);
    const pz = Math.floor(player ? player.pos.z : 0);
    const cx = Math.floor(px / 8);
    const cz = Math.floor(pz / 8);

    if (!force && cx === lastChunkCenter.cx && cz === lastChunkCenter.cz) return;
    lastChunkCenter = { cx, cz };

    BLOCK_TYPES.forEach((type) => {
        instancedMeshes[type].count = 0;
    });

    const minX = Math.max(-WORLD_RADIUS, px - renderRadius);
    const maxX = Math.min(WORLD_RADIUS, px + renderRadius);
    const minZ = Math.max(-WORLD_RADIUS, pz - renderRadius);
    const maxZ = Math.min(WORLD_RADIUS, pz + renderRadius);

    for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
            for (let y = MIN_DEPTH; y <= 18; y++) {
                const type = worldData.get(getKey(x, y, z));
                if (!type || !isBlockExposed(x, y, z)) continue;

                const im = instancedMeshes[type];
                if (im.count < MAX_INSTANCES_PER_TYPE) {
                    dummyObj.position.set(x, y, z);
                    dummyObj.updateMatrix();
                    im.setMatrixAt(im.count, dummyObj.matrix);
                    im.count++;
                }
            }
        }
    }

    BLOCK_TYPES.forEach((type) => {
        instancedMeshes[type].instanceMatrix.needsUpdate = true;
    });
}

function setBlock(x, y, z, type) {
    worldData.set(getKey(x, y, z), type);
    rebuildVisibleChunks(true);
}

function breakBlock(x, y, z) {
    if (!worldData.delete(getKey(x, y, z))) return;
    rebuildVisibleChunks(true);
}

function raycastVoxel(origin, direction, maxDist = 5.5) {
    let x = Math.floor(origin.x + 0.5);
    let y = Math.floor(origin.y + 0.5);
    let z = Math.floor(origin.z + 0.5);

    const stepX = direction.x > 0 ? 1 : -1;
    const stepY = direction.y > 0 ? 1 : -1;
    const stepZ = direction.z > 0 ? 1 : -1;

    const tDeltaX = Math.abs(1 / (direction.x || 1e-6));
    const tDeltaY = Math.abs(1 / (direction.y || 1e-6));
    const tDeltaZ = Math.abs(1 / (direction.z || 1e-6));

    let tMaxX = ((direction.x > 0 ? (x + 0.5 - origin.x) : (origin.x - (x - 0.5)))) * tDeltaX;
    let tMaxY = ((direction.y > 0 ? (y + 0.5 - origin.y) : (origin.y - (y - 0.5)))) * tDeltaY;
    let tMaxZ = ((direction.z > 0 ? (z + 0.5 - origin.z) : (origin.z - (z - 0.5)))) * tDeltaZ;

    let normal = new THREE.Vector3();
    let dist = 0;

    while (dist <= maxDist) {
        const type = worldData.get(getKey(x, y, z));
        if (type) return { x, y, z, type, normal };

        if (tMaxX < tMaxY) {
            if (tMaxX < tMaxZ) {
                dist = tMaxX; tMaxX += tDeltaX; x += stepX; normal.set(-stepX, 0, 0);
            } else {
                dist = tMaxZ; tMaxZ += tDeltaZ; z += stepZ; normal.set(0, 0, -stepZ);
            }
        } else {
            if (tMaxY < tMaxZ) {
                dist = tMaxY; tMaxY += tDeltaY; y += stepY; normal.set(0, -stepY, 0);
            } else {
                dist = tMaxZ; tMaxZ += tDeltaZ; z += stepZ; normal.set(0, 0, -stepZ);
            }
        }
    }
    return null;
}

function isCaveAt(x, y, z, surfaceY) {
    if (y <= MIN_DEPTH + 1 || y >= surfaceY - 2) return false;
    const n1 = Math.sin(x * 0.16) * Math.cos(z * 0.16) + Math.sin(y * 0.25);
    const n2 = Math.cos(x * 0.11 + z * 0.13) * Math.sin(y * 0.22);
    return (n1 + n2) > 0.98;
}

function generateWorld() {
    worldData.clear();
    caveSpots.length = 0;
    droppedItems.forEach((d) => scene.remove(d.mesh));
    droppedItems.length = 0;
    activeArrows.forEach((a) => scene.remove(a.mesh));
    activeArrows.length = 0;

    const seedOffset = Math.random() * 100;

    for (let x = -WORLD_RADIUS; x < WORLD_RADIUS; x++) {
        for (let z = -WORLD_RADIUS; z < WORLD_RADIUS; z++) {
            const surfaceY = Math.floor(
                Math.sin((x + seedOffset) * 0.10) * 3 +
                Math.cos((z + seedOffset) * 0.10) * 3 +
                Math.sin((x + z) * 0.06) * 2
            ) + 4;

            for (let y = MIN_DEPTH; y <= surfaceY; y++) {
                if (y === MIN_DEPTH) {
                    worldData.set(getKey(x, y, z), "bedrock");
                } else if (isCaveAt(x + seedOffset, y, z + seedOffset, surfaceY)) {
                    if (y < 0 && Math.random() < 0.025) caveSpots.push({ x, y, z });
                    continue;
                } else if (y === surfaceY) {
                    worldData.set(getKey(x, y, z), "grass");
                } else if (y >= surfaceY - 3) {
                    worldData.set(getKey(x, y, z), "dirt");
                } else {
                    const isCoal = Math.random() < 0.07;
                    worldData.set(getKey(x, y, z), isCoal ? "coal" : "stone");
                }
            }

            if ((Math.abs(x) > 2 || Math.abs(z) > 2) && Math.random() < 0.025) {
                if (worldData.get(getKey(x, surfaceY, z)) === "grass") {
                    createTreeData(x, surfaceY + 1, z);
                }
            }
        }
    }

    // Entrada de caverna próxima ao spawn
    for (let step = 0; step < 16; step++) {
        const cx = 6 + Math.floor(step * 0.65);
        const cy = 4 - step;
        const cz = 5 + Math.floor(Math.sin(step * 0.35) * 2);
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = 0; dy <= 3; dy++) {
                for (let dz = -2; dz <= 2; dz++) {
                    if (cy + dy > MIN_DEPTH) worldData.delete(getKey(cx + dx, cy + dy, cz + dz));
                }
            }
        }
        if (step > 6) caveSpots.push({ x: cx, y: cy + 1, z: cz });
    }

    rebuildVisibleChunks(true);
}

function createTreeData(x, y, z) {
    for (let i = 0; i < 4; i++) worldData.set(getKey(x, y + i, z), "wood");
    for (let lx = x - 2; lx <= x + 2; lx++) {
        for (let lz = z - 2; lz <= z + 2; lz++) {
            for (let ly = y + 3; ly <= y + 5; ly++) {
                if (Math.abs(lx - x) === 2 && Math.abs(lz - z) === 2 && ly === y + 5) continue;
                const k = getKey(lx, ly, lz);
                if (!worldData.has(k)) worldData.set(k, "leaves");
            }
        }
    }
}

// ==========================================
// 7. TEXTURAS DETALHADAS PARA ANIMAIS E ENTIDADES 3D
// ==========================================
const texWool = buildRichTexture((ctx) => {
    const w = ["#f7f7f7", "#e8e8e8", "#ffffff", "#dcdcdc"];
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            ctx.fillStyle = w[(x * 3 + y * 5 + Math.floor(Math.random() * 4)) % w.length];
            ctx.fillRect(x, y, 1, 1);
        }
    }
});

const texPigSkin = buildRichTexture((ctx) => {
    const p = ["#f48fb1", "#f06292", "#f8bbd0", "#ec407a"];
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            ctx.fillStyle = p[Math.floor(Math.random() * p.length)];
            ctx.fillRect(x, y, 1, 1);
        }
    }
});

const texCowHide = buildRichTexture((ctx) => {
    ctx.fillStyle = "#4e342e";
    ctx.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            if (Math.random() < 0.3) {
                ctx.fillStyle = "#3e2723";
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(3, 4, 11, 9);
    ctx.fillRect(18, 16, 10, 11);
});

function buildBowMesh3D() {
    const bowGroup = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41 });
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });

    const centerGrip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.22, 0.055), woodMat);
    const limbTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.045), woodMat);
    limbTop.position.set(0, 0.20, -0.07);
    limbTop.rotation.x = -0.55;

    const limbBot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.045), woodMat);
    limbBot.position.set(0, -0.20, -0.07);
    limbBot.rotation.x = 0.55;

    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.58, 6), stringMat);
    string.position.set(0, 0, -0.14);

    bowGroup.add(centerGrip, limbTop, limbBot, string);
    return bowGroup;
}

const entities = [];
const entityHitboxes = [];

function spawnEntity(type, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const isHostile = type === "zombie" || type === "skeleton";
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    let legs = [];
    let hp = 10;

    if (!isHostile) {
        hp = type === "cow" ? 14 : (type === "sheep" ? 12 : 10);
        const bodyTex = type === "pig" ? texPigSkin : (type === "sheep" ? texWool : texCowHide);
        const headColor = type === "pig" ? 0xf06292 : (type === "sheep" ? 0xffe0b2 : 0x5d4037);
        const legColor = type === "pig" ? 0xd81b60 : (type === "sheep" ? 0xd7ccc8 : 0x3e2723);

        const bodyMat = new THREE.MeshLambertMaterial({ map: bodyTex });
        const headMat = new THREE.MeshLambertMaterial({ color: headColor });
        const legMat = new THREE.MeshLambertMaterial({ color: legColor });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.66, 1.16), bodyMat);
        body.position.y = 0.65;
        group.add(body);

        // Camada fofa de lã 3D na Ovelha
        if (type === "sheep") {
            const fleeceOuter = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.72, 1.08), bodyMat);
            fleeceOuter.position.y = 0.66;
            const headWool = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.18, 0.64), bodyMat);
            headWool.position.set(0, 1.15, 0.72);
            group.add(fleeceOuter, headWool);
        }

        // Cabeça + olhos expressivos
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 0.58), headMat);
        head.position.set(0, 0.85, 0.72);
        group.add(head);

        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.04), whiteMat);
        eyeL.position.set(-0.19, 0.92, 1.01);
        const pupilL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.05), pupilMat);
        pupilL.position.set(-0.21, 0.92, 1.015);

        const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.04), whiteMat);
        eyeR.position.set(0.19, 0.92, 1.01);
        const pupilR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.05), pupilMat);
        pupilR.position.set(0.21, 0.92, 1.015);
        group.add(eyeL, pupilL, eyeR, pupilR);

        if (type === "cow") {
            const hornMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
            const hornL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.09), hornMat);
            hornL.position.set(-0.29, 1.18, 0.72);
            const hornR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.09), hornMat);
            hornR.position.set(0.29, 1.18, 0.72);

            const earMat = new THREE.MeshLambertMaterial({ color: 0x4e342e });
            const earL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.08), earMat);
            earL.position.set(-0.34, 1.02, 0.72);
            const earR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.08), earMat);
            earR.position.set(0.34, 1.02, 0.72);

            const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.13), new THREE.MeshLambertMaterial({ color: 0xd7ccc8 }));
            muzzle.position.set(0, 0.72, 1.04);
            const nL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.03), pupilMat);
            nL.position.set(-0.10, 0.74, 1.11);
            const nR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.03), pupilMat);
            nR.position.set(0.10, 0.74, 1.11);
            group.add(hornL, hornR, earL, earR, muzzle, nL, nR);
        } else if (type === "pig") {
            const earL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.08), legMat);
            earL.position.set(-0.28, 1.10, 0.75);
            const earR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.08), legMat);
            earR.position.set(0.28, 1.10, 0.75);

            const snout = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.20, 0.14), new THREE.MeshLambertMaterial({ color: 0xec407a }));
            snout.position.set(0, 0.76, 1.05);
            const nL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.03), pupilMat);
            nL.position.set(-0.07, 0.76, 1.12);
            const nR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.03), pupilMat);
            nR.position.set(0.07, 0.76, 1.12);

            const tail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.14), legMat);
            tail.position.set(0, 0.78, -0.62);
            group.add(earL, earR, snout, nL, nR, tail);
        } else {
            const earL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.08), legMat);
            earL.position.set(-0.32, 0.96, 0.72);
            const earR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.08), legMat);
            earR.position.set(0.32, 0.96, 0.72);
            const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.06), legMat);
            mouth.position.set(0, 0.72, 1.02);
            group.add(earL, earR, mouth);
        }

        [[-0.22, 0.2, 0.35], [0.22, 0.2, 0.35], [-0.22, 0.2, -0.35], [0.22, 0.2, -0.35]].forEach(([lx, ly, lz]) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.4, 0.21), legMat);
            leg.position.set(lx, ly, lz);
            group.add(leg);
            legs.push(leg);
        });
    } else {
        hp = type === "zombie" ? 18 : 15;
        const isZombie = type === "zombie";

        const skinMat = new THREE.MeshLambertMaterial({ color: isZombie ? 0x43a047 : 0xe0e0e0 });
        const shirtMat = new THREE.MeshLambertMaterial({ color: isZombie ? 0x00838f : 0x9e9e9e });
        const pantsMat = new THREE.MeshLambertMaterial({ color: isZombie ? 0x283593 : 0x757575 });

        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.22), pantsMat);
        legL.position.set(-0.14, 0.32, 0);
        const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.22), pantsMat);
        legR.position.set(0.14, 0.32, 0);
        legs.push(legL, legR);
        group.add(legL, legR);

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.28), shirtMat);
        torso.position.y = 0.98;
        group.add(torso);

        if (!isZombie) {
            for (let r = 0; r < 3; r++) {
                const rib = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.30), pupilMat);
                rib.position.set(0, 0.85 + r * 0.14, 0);
                group.add(rib);
            }
        }

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.52), skinMat);
        head.position.y = 1.58;
        group.add(head);

        const eyeColor = isZombie ? new THREE.MeshBasicMaterial({ color: 0x1b5e20 }) : pupilMat;
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), eyeColor);
        eyeL.position.set(-0.13, 1.62, 0.265);
        const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), eyeColor);
        eyeR.position.set(0.13, 1.62, 0.265);

        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.05), pupilMat);
        browL.position.set(-0.13, 1.68, 0.268);
        browL.rotation.z = -0.25;
        const browR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.05), pupilMat);
        browR.position.set(0.13, 1.68, 0.268);
        browR.rotation.z = 0.25;

        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.04), pupilMat);
        mouth.position.set(0, 1.46, 0.265);
        group.add(eyeL, eyeR, browL, browR, mouth);

        const armGeo = isZombie ? new THREE.BoxGeometry(0.2, 0.2, 0.65) : new THREE.BoxGeometry(0.13, 0.13, 0.65);
        const armL = new THREE.Mesh(armGeo, skinMat);
        armL.position.set(-0.36, 1.20, 0.28);
        const armR = new THREE.Mesh(armGeo, skinMat);
        armR.position.set(0.36, 1.20, 0.28);
        group.add(armL, armR);

        if (!isZombie) {
            const skeletonBow = buildBowMesh3D();
            skeletonBow.position.set(0.36, 1.20, 0.62);
            group.add(skeletonBow);
        }
    }

    const hitbox = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, isHostile ? 1.85 : 1.2, 1.2),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    hitbox.position.y = isHostile ? 0.95 : 0.65;
    group.add(hitbox);

    const entityData = {
        type, isHostile, group, legs, hp, hitbox,
        vel: new THREE.Vector3(),
        dirAngle: Math.random() * Math.PI * 2,
        moveTimer: 2, panicTimer: 0, hurtTimer: 0,
        attackCooldown: 1 + Math.random()
    };

    hitbox.userData = { isEntity: true, entity: entityData };
    entityHitboxes.push(hitbox);
    entities.push(entityData);
    scene.add(group);
}

function spawnInitialEntities() {
    entities.forEach((e) => scene.remove(e.group));
    entities.length = 0;
    entityHitboxes.length = 0;

    const passiveTypes = ["pig", "sheep", "cow"];
    for (let i = 0; i < 24; i++) {
        const rx = (Math.random() - 0.5) * 160;
        const rz = (Math.random() - 0.5) * 160;
        spawnEntity(passiveTypes[i % 3], rx, 14, rz);
    }

    const monsterCount = Math.min(28, caveSpots.length);
    for (let i = 0; i < monsterCount; i++) {
        const spot = caveSpots[Math.floor(Math.random() * caveSpots.length)];
        spawnEntity(i % 2 === 0 ? "zombie" : "skeleton", spot.x, spot.y, spot.z);
    }
}

function damageEntity(entity, amount) {
    entity.hp -= amount;
    entity.hurtTimer = 0.25;
    entity.panicTimer = 3.5;
    entity.dirAngle = yaw + Math.PI;
    entity.vel.y = 5;

    if (entity.hp <= 0) {
        const pos = entity.group.position;

        if (entity.type === "sheep") {
            spawnDroppedItem("meat", 2, pos.x, pos.y, pos.z);
            spawnDroppedItem("wool", 1, pos.x, pos.y, pos.z);
        } else if (entity.type === "pig") {
            spawnDroppedItem("meat", 2, pos.x, pos.y, pos.z);
        } else if (entity.type === "cow") {
            spawnDroppedItem("meat", 3, pos.x, pos.y, pos.z);
        } else if (entity.type === "skeleton") {
            const boneQty = Math.random() < 0.5 ? 1 : 2;
            spawnDroppedItem("bone", boneQty, pos.x, pos.y, pos.z);
            if (Math.random() < 0.35) {
                spawnDroppedItem("bow", 1, pos.x, pos.y, pos.z);
            }
        } else if (entity.type === "zombie") {
            const fleshQty = Math.random() < 0.5 ? 1 : 2;
            spawnDroppedItem("rotten_flesh", fleshQty, pos.x, pos.y, pos.z);
        }

        scene.remove(entity.group);
        const idx = entities.indexOf(entity);
        if (idx > -1) entities.splice(idx, 1);
        const hbIdx = entityHitboxes.indexOf(entity.hitbox);
        if (hbIdx > -1) entityHitboxes.splice(hbIdx, 1);
    }
}

function updateEntities(dt) {
    for (let i = entities.length - 1; i >= 0; i--) {
        const e = entities[i];
        const distToPlayer = e.group.position.distanceTo(player.pos);

        // Pausa física de entidades muito distantes (otimização para 256 chunks)
        if (distToPlayer > 75) continue;

        if (e.hurtTimer > 0) {
            e.hurtTimer -= dt;
            e.group.children.forEach((part) => {
                if (part.material && part.material.emissive) {
                    part.material.emissive.setHex(e.hurtTimer > 0 ? 0xaa0000 : 0x000000);
                }
            });
        }

        if (e.attackCooldown > 0) e.attackCooldown -= dt;

        let speed = 1.3;

        if (e.isHostile && distToPlayer < 16) {
            const dx = player.pos.x - e.group.position.x;
            const dz = player.pos.z - e.group.position.z;
            e.dirAngle = Math.atan2(dx, dz);

            if (e.type === "skeleton") {
                speed = distToPlayer > 7 ? 1.8 : 0.2;
                if (e.attackCooldown <= 0) {
                    e.attackCooldown = 2.2;
                    const bowOrigin = new THREE.Vector3(e.group.position.x, e.group.position.y + 1.35, e.group.position.z);
                    const targetPoint = new THREE.Vector3(player.pos.x, player.pos.y + 1.1, player.pos.z);
                    const aimDir = targetPoint.sub(bowOrigin).normalize();
                    aimDir.y += 0.04;
                    shootArrow(bowOrigin, aimDir, false);
                }
            } else {
                speed = 2.5;
                if (distToPlayer < 1.35 && e.attackCooldown <= 0) {
                    e.attackCooldown = 1.2;
                    survival.hp = Math.max(0, survival.hp - 1.5);
                    updateSurvivalUI();
                    if (survival.hp <= 0) {
                        document.exitPointerLock();
                        document.getElementById("death-screen").classList.remove("hidden");
                    }
                }
            }
        } else {
            e.moveTimer -= dt;
            if (e.panicTimer > 0) {
                e.panicTimer -= dt;
                speed = 4.2;
            } else if (e.moveTimer <= 0) {
                e.dirAngle = Math.random() * Math.PI * 2;
                e.moveTimer = 2 + Math.random() * 3;
            }
        }

        const vx = Math.sin(e.dirAngle) * speed;
        const vz = Math.cos(e.dirAngle) * speed;
        e.group.rotation.y = e.dirAngle;

        const entityHeight = e.isHostile ? 1.7 : 1.0;

        e.group.position.x += vx * dt;
        if (checkBoxCollision(e.group.position, 0.35, entityHeight)) {
            e.group.position.x -= vx * dt;
            e.vel.y = 6.8;
        }

        e.group.position.z += vz * dt;
        if (checkBoxCollision(e.group.position, 0.35, entityHeight)) {
            e.group.position.z -= vz * dt;
            e.vel.y = 6.8;
        }

        e.vel.y -= 20 * dt;
        e.group.position.y += e.vel.y * dt;
        if (checkBoxCollision(e.group.position, 0.35, entityHeight)) {
            e.group.position.y -= e.vel.y * dt;
            e.vel.y = 0;
        }

        const walkCycle = Math.sin(performance.now() * 0.01 * Math.max(speed, 0.5)) * 0.5;
        if (e.legs.length === 4) {
            e.legs[0].rotation.x = walkCycle;
            e.legs[1].rotation.x = -walkCycle;
            e.legs[2].rotation.x = -walkCycle;
            e.legs[3].rotation.x = walkCycle;
        } else if (e.legs.length === 2) {
            e.legs[0].rotation.x = walkCycle;
            e.legs[1].rotation.x = -walkCycle;
        }

        if (e.group.position.y < -20) e.group.position.set(0, 14, 0);
    }
}

// ==========================================
// 8. BRAÇO E MÃO 3D DO STEVE (HIERARQUIA UNIFICADA)
// ==========================================
const handContainer = new THREE.Group();
// Ancorado exatamente no canto inferior direito da câmera
handContainer.position.set(0.46, -0.38, -0.52);
camera.add(handContainer);
scene.add(camera);

let currentHandMesh = null;
function updateHandModel() {
    if (currentHandMesh) handContainer.remove(currentHandMesh);

    // Hierarquia: armRoot -> sleeve + forearm -> handSocket (onde o item encaixa perfeito!)
    const armRoot = new THREE.Group();
    armRoot.rotation.set(-0.68, -0.36, 0.22);

    const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x00a8a8 });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xb5835a });

    // Manga azul-ciano da camisa do Steve (parte traseira perto do ombro)
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, 0.26), sleeveMat);
    sleeve.position.set(0, 0, 0.22);

    // Antebraço e punho do Steve (parte frontal)
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.34), skinMat);
    forearm.position.set(0, 0, -0.06);

    // Ponto exato do punho fechado do Steve (z = -0.22)
    const handSocket = new THREE.Group();
    handSocket.position.set(0, 0.02, -0.21);
    // Desfaz a inclinação do braço para que ferramentas/blocos fiquem retos na mão
    handSocket.rotation.set(0.68, 0.36, -0.22);

    armRoot.add(sleeve, forearm, handSocket);

    const slot = inventorySlots[selectedSlot];
    if (slot) {
        const item = ITEM_DEFS[slot.id];
        let heldObj = null;

        if (item.isBlock) {
            heldObj = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), MATERIALS[slot.id]);
            heldObj.position.set(-0.04, 0.08, -0.05);
            heldObj.rotation.set(0.15, 0.65, 0.1);
        } else if (slot.id === "bow") {
            heldObj = buildBowMesh3D();
            heldObj.position.set(-0.04, 0.08, -0.06);
            heldObj.rotation.set(0.12, Math.PI - 0.25, 0.08);
        } else if (item.isTool) {
            const toolGroup = new THREE.Group();
            const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
            const leatherMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
            const ironMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.7, roughness: 0.25 });
            const edgeMat = new THREE.MeshStandardMaterial({ color: 0xeceff1, metalness: 0.85, roughness: 0.15 });
            const goldMat = new THREE.MeshStandardMaterial({ color: 0xffca28, metalness: 0.8, roughness: 0.2 });

            if (slot.id === "sword") {
                const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.035, 10), goldMat);
                pommel.position.y = -0.10;
                const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.14, 10), leatherMat);
                grip.position.y = -0.02;
                const guardCenter = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.055), goldMat);
                guardCenter.position.y = 0.06;
                const bladeCore = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.42, 0.022), ironMat);
                bladeCore.position.y = 0.28;
                const bladeEdges = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.42, 0.012), edgeMat);
                bladeEdges.position.y = 0.28;
                const tip = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.10, 4), edgeMat);
                tip.position.y = 0.54;
                tip.rotation.y = Math.PI / 4;
                tip.scale.set(1.2, 1, 0.35);
                toolGroup.add(pommel, grip, guardCenter, bladeCore, bladeEdges, tip);
            } else if (slot.id === "pickaxe") {
                const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.52, 10), woodMat);
                handle.position.y = 0.16;
                const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 10), ironMat);
                collar.position.y = 0.37;
                const centerBlock = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.065, 0.055), ironMat);
                centerBlock.position.y = 0.38;
                const armL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.042), ironMat);
                armL.position.set(-0.10, 0.36, 0);
                armL.rotation.z = 0.28;
                const spikeL = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.11, 4), edgeMat);
                spikeL.position.set(-0.20, 0.32, 0);
                spikeL.rotation.z = Math.PI / 2 + 0.45;
                const armR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.042), ironMat);
                armR.position.set(0.10, 0.36, 0);
                armR.rotation.z = -0.28;
                const spikeR = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.11, 4), edgeMat);
                spikeR.position.set(0.20, 0.32, 0);
                spikeR.rotation.z = -Math.PI / 2 - 0.45;
                toolGroup.add(handle, collar, centerBlock, armL, spikeL, armR, spikeR);
            } else if (slot.id === "axe") {
                const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.028, 0.52, 10), woodMat);
                handle.position.y = 0.16;
                const socket = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.06), ironMat);
                socket.position.set(-0.01, 0.35, 0);
                const bladeBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.21, 0.036), ironMat);
                bladeBody.position.set(-0.09, 0.34, 0);
                const sharpEdge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.23, 0.014), edgeMat);
                sharpEdge.position.set(-0.16, 0.34, 0);
                toolGroup.add(handle, socket, bladeBody, sharpEdge);
            } else if (slot.id === "knife") {
                const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.023, 0.13, 10), leatherMat);
                const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.045), goldMat);
                guard.position.y = 0.07;
                const blade = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.22, 0.018), edgeMat);
                blade.position.y = 0.19;
                const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), edgeMat);
                tip.position.y = 0.34;
                tip.rotation.y = Math.PI / 4;
                tip.scale.set(1.1, 1, 0.4);
                toolGroup.add(grip, guard, blade, tip);
            }

            toolGroup.position.set(-0.02, 0.04, -0.02);
            toolGroup.rotation.set(-0.22, -0.45, 0.18);
            heldObj = toolGroup;
        } else if (slot.id === "bone" || slot.id === "stick") {
            heldObj = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025, 0.025, 0.36, 8),
                new THREE.MeshLambertMaterial({ color: item.dropColor })
            );
            heldObj.position.set(-0.02, 0.08, -0.02);
            heldObj.rotation.set(-0.2, -0.4, 0.25);
        } else {
            heldObj = new THREE.Mesh(
                new THREE.BoxGeometry(0.20, 0.10, 0.20),
                new THREE.MeshLambertMaterial({ color: item.dropColor || 0xffffff })
            );
            heldObj.position.set(-0.03, 0.07, -0.03);
            heldObj.rotation.set(0.15, 0.5, 0);
        }

        if (heldObj) handSocket.add(heldObj);
    }

    currentHandMesh = armRoot;
    handContainer.add(currentHandMesh);
}

// ==========================================
// 9. INTERFACE DO INVENTÁRIO (2x2) & CRAFTING TABLE (3x3)
// ==========================================
const survival = { hp: 10, maxHp: 10, hunger: 10, maxHunger: 10, hungerTimer: 0 };

function updateSurvivalUI() {
    document.getElementById("health-bar").textContent =
        "❤️".repeat(Math.ceil(survival.hp)) + "🖤".repeat(survival.maxHp - Math.ceil(survival.hp));
    document.getElementById("hunger-bar").textContent =
        "🍗".repeat(Math.ceil(survival.hunger)) + "🦴".repeat(survival.maxHunger - Math.ceil(survival.hunger));
}

function getCraftResultFromGrid(gridArray, recipesList) {
    const counts = {};
    gridArray.forEach((item) => {
        if (item) counts[item.id] = (counts[item.id] || 0) + item.count;
    });
    if (Object.keys(counts).length === 0) return null;

    for (const rec of recipesList) {
        if (rec.check(counts)) return rec;
    }
    return null;
}

function handleSlotClick(containerType, index) {
    let targetArray = inventorySlots;
    if (containerType === "craft2") targetArray = craftGrid2x2;
    else if (containerType === "craft3") targetArray = craftGrid3x3;

    const slotItem = targetArray[index];

    if (!heldCursorItem && slotItem) {
        heldCursorItem = slotItem;
        targetArray[index] = null;
    } else if (heldCursorItem && !slotItem) {
        targetArray[index] = heldCursorItem;
        heldCursorItem = null;
    } else if (heldCursorItem && slotItem) {
        if (heldCursorItem.id === slotItem.id && !ITEM_DEFS[slotItem.id].isTool) {
            slotItem.count += heldCursorItem.count;
            heldCursorItem = null;
        } else {
            targetArray[index] = heldCursorItem;
            heldCursorItem = slotItem;
        }
    }

    updateCursorItemVisual();
    renderAllInventoryUI();
}

function handleCraftResultClick(gridArray, recipesList) {
    const recipe = getCraftResultFromGrid(gridArray, recipesList);
    if (!recipe) return;

    if (heldCursorItem && (heldCursorItem.id !== recipe.result.id || ITEM_DEFS[recipe.result.id].isTool)) {
        return;
    }

    Object.entries(recipe.consume).forEach(([reqId, reqQty]) => {
        let remaining = reqQty;
        for (let i = 0; i < gridArray.length; i++) {
            if (gridArray[i] && gridArray[i].id === reqId && remaining > 0) {
                const take = Math.min(gridArray[i].count, remaining);
                gridArray[i].count -= take;
                remaining -= take;
                if (gridArray[i].count <= 0) gridArray[i] = null;
            }
        }
    });

    if (!heldCursorItem) {
        heldCursorItem = { id: recipe.result.id, count: recipe.result.count };
    } else {
        heldCursorItem.count += recipe.result.count;
    }

    updateCursorItemVisual();
    renderAllInventoryUI();
}

function updateCursorItemVisual() {
    const cursorEl = document.getElementById("cursor-item");
    if (!heldCursorItem) {
        cursorEl.classList.add("hidden");
    } else {
        cursorEl.classList.remove("hidden");
        cursorEl.innerHTML = `${ITEM_DEFS[heldCursorItem.id].icon}<span style="font-size:12px;color:#fff">${heldCursorItem.count > 1 ? heldCursorItem.count : ""}</span>`;
    }
}

document.addEventListener("mousemove", (e) => {
    const cursorEl = document.getElementById("cursor-item");
    if (!cursorEl.classList.contains("hidden")) {
        cursorEl.style.left = `${e.clientX}px`;
        cursorEl.style.top = `${e.clientY}px`;
    }
});

function createMcSlotElement(item, onClick) {
    const div = document.createElement("div");
    div.className = "mc-slot";
    if (item) {
        const def = ITEM_DEFS[item.id];
        div.title = `${def.name} (${item.count})`;
        div.innerHTML = `
            <span>${def.icon}</span>
            ${item.count > 1 ? `<span class="mc-slot-qty">${item.count}</span>` : ""}
        `;
    }
    div.onclick = onClick;
    return div;
}

function renderAllInventoryUI() {
    // 1. Hotbar inferior na tela
    const hudHotbar = document.getElementById("hotbar");
    hudHotbar.innerHTML = "";
    for (let i = 0; i < 9; i++) {
        const slot = inventorySlots[i];
        const div = document.createElement("div");
        div.className = `slot ${i === selectedSlot ? "active" : ""}`;
        if (slot) {
            const def = ITEM_DEFS[slot.id];
            div.innerHTML = `
                <span class="slot-key">${i + 1}</span>
                <div class="slot-icon">${def.icon}</div>
                <div class="slot-name">${def.name}</div>
                <span class="slot-count">${slot.count > 1 ? slot.count : ""}</span>
            `;
        } else {
            div.innerHTML = `<span class="slot-key">${i + 1}</span>`;
        }
        hudHotbar.appendChild(div);
    }

    // 2. Grade 2x2 do Inventário (B)
    const craftGrid2El = document.getElementById("craft-grid-2x2");
    craftGrid2El.innerHTML = "";
    for (let i = 0; i < 4; i++) {
        craftGrid2El.appendChild(createMcSlotElement(craftGrid2x2[i], () => handleSlotClick("craft2", i)));
    }

    const result2El = document.getElementById("craft-result-slot");
    const rec2 = getCraftResultFromGrid(craftGrid2x2, RECIPES_2X2);
    result2El.innerHTML = "";
    if (rec2) {
        const def = ITEM_DEFS[rec2.result.id];
        result2El.innerHTML = `<span>${def.icon}</span>${rec2.result.count > 1 ? `<span class="mc-slot-qty">${rec2.result.count}</span>` : ""}`;
        result2El.onclick = () => handleCraftResultClick(craftGrid2x2, RECIPES_2X2);
    } else {
        result2El.onclick = null;
    }

    // 3. Mochila & Hotbar no Inventário (B)
    const mainGridEl = document.getElementById("main-inventory-grid");
    mainGridEl.innerHTML = "";
    for (let i = 9; i < 36; i++) {
        mainGridEl.appendChild(createMcSlotElement(inventorySlots[i], () => handleSlotClick("inv", i)));
    }

    const invHotbarEl = document.getElementById("inv-hotbar-grid");
    invHotbarEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
        invHotbarEl.appendChild(createMcSlotElement(inventorySlots[i], () => handleSlotClick("inv", i)));
    }

    // 4. Grade 3x3 da Bancada de Trabalho (Crafting Table)
    const craftGrid3El = document.getElementById("craft-grid-3x3");
    craftGrid3El.innerHTML = "";
    for (let i = 0; i < 9; i++) {
        craftGrid3El.appendChild(createMcSlotElement(craftGrid3x3[i], () => handleSlotClick("craft3", i)));
    }

    const result3El = document.getElementById("ct-result-slot");
    const rec3 = getCraftResultFromGrid(craftGrid3x3, RECIPES_3X3);
    result3El.innerHTML = "";
    if (rec3) {
        const def = ITEM_DEFS[rec3.result.id];
        result3El.innerHTML = `<span>${def.icon}</span>${rec3.result.count > 1 ? `<span class="mc-slot-qty">${rec3.result.count}</span>` : ""}`;
        result3El.onclick = () => handleCraftResultClick(craftGrid3x3, RECIPES_3X3);
    } else {
        result3El.onclick = null;
    }

    const ctMainGridEl = document.getElementById("ct-main-inventory-grid");
    ctMainGridEl.innerHTML = "";
    for (let i = 9; i < 36; i++) {
        ctMainGridEl.appendChild(createMcSlotElement(inventorySlots[i], () => handleSlotClick("inv", i)));
    }

    const ctHotbarEl = document.getElementById("ct-inv-hotbar-grid");
    ctHotbarEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
        ctHotbarEl.appendChild(createMcSlotElement(inventorySlots[i], () => handleSlotClick("inv", i)));
    }

    const ctListEl = document.getElementById("ct-recipes-list");
    ctListEl.innerHTML = RECIPES_3X3.map((r) => `• ${r.name}`).join("<br>");

    updateHandModel();
}

document.getElementById("toggle-recipes-btn").onclick = () => {
    const panel = document.getElementById("quick-recipes-panel");
    panel.classList.toggle("hidden");
    panel.innerHTML = "";
    RECIPES_2X2.forEach((r) => {
        const btn = document.createElement("button");
        btn.className = "quick-rec-btn";
        btn.textContent = r.name;
        panel.appendChild(btn);
    });
};

// ==========================================
// 10. CONTROLES, MODAIS E INTERAÇÃO COM CRAFTING TABLE
// ==========================================
const escMenu = document.getElementById("esc-menu");
const invModal = document.getElementById("inventory-modal");
const ctModal = document.getElementById("crafting-table-modal");
let isLocked = false;
let mouseSensitivity = 0.0022;

function closeAllModalsAndLock() {
    if (heldCursorItem) {
        addItemToInventory(heldCursorItem.id, heldCursorItem.count);
        heldCursorItem = null;
        updateCursorItemVisual();
    }
    invModal.classList.add("hidden");
    ctModal.classList.add("hidden");
    document.body.requestPointerLock();
}

document.getElementById("close-ct-btn").onclick = closeAllModalsAndLock;
document.getElementById("btn-resume").onclick = () => document.body.requestPointerLock();
document.getElementById("btn-respawn").onclick = () => {
    player.pos.set(0, 14, 0);
    player.vel.set(0, 0, 0);
    rebuildVisibleChunks(true);
    document.body.requestPointerLock();
};
document.getElementById("btn-regen").onclick = () => {
    inventorySlots.fill(null);
    craftGrid2x2.fill(null);
    craftGrid3x3.fill(null);
    renderAllInventoryUI();
    generateWorld();
    spawnInitialEntities();
    player.pos.set(0, 14, 0);
    player.vel.set(0, 0, 0);
    rebuildVisibleChunks(true);
    document.body.requestPointerLock();
};
document.getElementById("btn-revive").onclick = () => {
    document.getElementById("death-screen").classList.add("hidden");
    survival.hp = 10;
    survival.hunger = 10;
    updateSurvivalUI();
    player.pos.set(0, 14, 0);
    player.vel.set(0, 0, 0);
    rebuildVisibleChunks(true);
    document.body.requestPointerLock();
};

document.getElementById("opt-fov").oninput = (e) => {
    baseFov = Number(e.target.value);
    document.getElementById("val-fov").textContent = baseFov;
    camera.fov = baseFov;
    camera.updateProjectionMatrix();
};

document.getElementById("opt-sens").oninput = (e) => {
    const pct = Number(e.target.value);
    document.getElementById("val-sens").textContent = `${pct}%`;
    mouseSensitivity = 0.0022 * (pct / 100);
};

document.getElementById("opt-render").oninput = (e) => {
    renderRadius = Number(e.target.value);
    document.getElementById("val-render").textContent = `${renderRadius} blocos`;
    rebuildVisibleChunks(true);
};

document.addEventListener("pointerlockchange", () => {
    isLocked = document.pointerLockElement === document.body;
    const anyModalOpen = !invModal.classList.contains("hidden") || !ctModal.classList.contains("hidden");
    if (!isLocked && !anyModalOpen && document.getElementById("death-screen").classList.contains("hidden")) {
        escMenu.style.display = "flex";
    } else {
        escMenu.style.display = "none";
    }
});

let yaw = 0, pitch = 0;
document.addEventListener("mousemove", (e) => {
    if (!isLocked) return;
    yaw -= e.movementX * mouseSensitivity;
    pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch - e.movementY * mouseSensitivity));
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
});

const keys = {};
window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
        e.preventDefault();
    }

    keys[e.code] = true;

    if (e.code >= "Digit1" && e.code <= "Digit9") {
        selectedSlot = Number(e.code.replace("Digit", "")) - 1;
        renderAllInventoryUI();
    }

    if (e.code === "KeyB") {
        if (!ctModal.classList.contains("hidden")) {
            closeAllModalsAndLock();
            return;
        }
        if (invModal.classList.contains("hidden")) {
            document.exitPointerLock();
            escMenu.style.display = "none";
            invModal.classList.remove("hidden");
            renderAllInventoryUI();
        } else {
            closeAllModalsAndLock();
        }
    }
});
window.addEventListener("keyup", (e) => (keys[e.code] = false));

window.addEventListener("wheel", (e) => {
    if (!isLocked) return;
    selectedSlot = (selectedSlot + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
    renderAllInventoryUI();
});

let isMouseDown = false;
let swingTimer = 0;
let playerBowCooldown = 0;
let miningState = { key: null, progress: 0 };

const raycaster = new THREE.Raycaster();
raycaster.far = 5.5;

const highlightBox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)),
    new THREE.LineBasicMaterial({ color: 0x000000 })
);
scene.add(highlightBox);

window.addEventListener("mousedown", (e) => {
    if (!isLocked) return;
    swingTimer = 1;

    if (e.button === 0) {
        isMouseDown = true;
        handleAttack();
    } else if (e.button === 2) {
        handleRightClick();
    }
});

window.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
        isMouseDown = false;
        miningState = { key: null, progress: 0 };
        document.getElementById("mining-bar-container").classList.add("hidden");
    }
});

function handleAttack() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(entityHitboxes);
    if (hits.length > 0) {
        const entity = hits[0].object.userData.entity;
        const held = inventorySlots[selectedSlot];
        const def = held ? ITEM_DEFS[held.id] : null;
        const damage = def && def.damage ? def.damage : 1;
        damageEntity(entity, damage);
    }
}

function handleRightClick() {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const hit = raycastVoxel(camera.position, dir, 5.5);

    // 1. Se clicar com botão direito na Crafting Table colocada no mundo (sem agachar), abre a Bancada 3x3!
    const isCrouching = Boolean(keys["ControlLeft"] || keys["ControlRight"]);
    if (hit && hit.type === "crafting_table" && !isCrouching) {
        document.exitPointerLock();
        escMenu.style.display = "none";
        ctModal.classList.remove("hidden");
        renderAllInventoryUI();
        return;
    }

    const held = inventorySlots[selectedSlot];
    if (!held) return;
    const def = ITEM_DEFS[held.id];

    // 2. Atirar flecha com o Arco
    if (def.isBow && playerBowCooldown <= 0) {
        playerBowCooldown = 0.55;
        shootArrow(camera.position.clone().addScaledVector(dir, 0.7), dir, true);
        return;
    }

    // 3. Comer alimento
    if (def.isFood && (survival.hunger < survival.maxHunger || survival.hp < survival.maxHp)) {
        held.count--;
        if (held.count <= 0) inventorySlots[selectedSlot] = null;
        survival.hunger = Math.min(survival.maxHunger, survival.hunger + def.healHunger);
        survival.hp = Math.max(1, Math.min(survival.maxHp, survival.hp + def.healHp));
        updateSurvivalUI();
        renderAllInventoryUI();
        return;
    }

    // 4. Colocar bloco (incluindo a Crafting Table!)
    if (def.isBlock && hit) {
        const nx = hit.x + hit.normal.x;
        const ny = hit.y + hit.normal.y;
        const nz = hit.z + hit.normal.z;

        const inPlayer =
            Math.abs(nx - player.pos.x) < 0.7 &&
            Math.abs(nz - player.pos.z) < 0.7 &&
            ny >= Math.floor(player.pos.y) &&
            ny <= Math.floor(player.pos.y + 1.6);

        if (!inPlayer) {
            setBlock(nx, ny, nz, held.id);
            held.count--;
            if (held.count <= 0) inventorySlots[selectedSlot] = null;
            renderAllInventoryUI();
        }
    }
}

function updateMining(dt) {
    const barContainer = document.getElementById("mining-bar-container");
    const barFill = document.getElementById("mining-bar-fill");

    if (!isMouseDown || !isLocked) {
        barContainer.classList.add("hidden");
        return;
    }

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const hit = raycastVoxel(camera.position, dir, 5.5);

    if (!hit) {
        miningState = { key: null, progress: 0 };
        barContainer.classList.add("hidden");
        return;
    }

    const key = getKey(hit.x, hit.y, hit.z);
    const blockDef = ITEM_DEFS[hit.type];

    if (blockDef.hardness > 1000) return;
    if (miningState.key !== key) miningState = { key, progress: 0 };

    const held = inventorySlots[selectedSlot];
    const heldDef = held ? ITEM_DEFS[held.id] : null;
    let speed = 1;
    if (heldDef && heldDef.isTool && heldDef.toolType === blockDef.toolType) {
        speed = heldDef.speed;
    }

    miningState.progress += dt * speed;
    const pct = Math.min(100, (miningState.progress / blockDef.hardness) * 100);
    barContainer.classList.remove("hidden");
    barFill.style.width = `${pct}%`;

    if (miningState.progress >= blockDef.hardness) {
        if (blockDef.drop) spawnDroppedItem(blockDef.drop, 1, hit.x, hit.y, hit.z);
        breakBlock(hit.x, hit.y, hit.z);
        miningState = { key: null, progress: 0 };
        barContainer.classList.add("hidden");
    }
}

// ==========================================
// 11. FÍSICA DO JOGADOR (SHIFT CORRER + CTRL AGACHAR)
// ==========================================
const player = {
    pos: new THREE.Vector3(0, 14, 0),
    vel: new THREE.Vector3(0, 0, 0),
    grounded: false,
    eyeOffset: 1.5
};

function checkBoxCollision(pos, radius, height) {
    const minX = Math.floor(pos.x - radius + 0.5);
    const maxX = Math.floor(pos.x + radius + 0.5);
    const minY = Math.floor(pos.y + 0.5);
    const maxY = Math.floor(pos.y + height + 0.4);
    const minZ = Math.floor(pos.z - radius + 0.5);
    const maxZ = Math.floor(pos.z + radius + 0.5);

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {
                if (worldData.has(getKey(x, y, z))) return true;
            }
        }
    }
    return false;
}

function hasGroundSupport(x, y, z) {
    const bx = Math.floor(x + 0.5);
    const by = Math.floor(y - 0.15 + 0.5);
    const bz = Math.floor(z + 0.5);
    return worldData.has(getKey(bx, by, bz));
}

function updatePlayer(dt) {
    if (playerBowCooldown > 0) playerBowCooldown -= dt;

    const isCrouching = Boolean(keys["ControlLeft"] || keys["ControlRight"]);
    const isSprinting = Boolean((keys["ShiftLeft"] || keys["ShiftRight"]) && !isCrouching && keys["KeyW"]);

    const speed = isCrouching ? 2.3 : (isSprinting ? 8.6 : 5.5);
    const playerHeight = isCrouching ? 1.25 : 1.65;

    const targetFov = isSprinting ? baseFov + 8 : baseFov;
    if (Math.abs(camera.fov - targetFov) > 0.1) {
        camera.fov += (targetFov - camera.fov) * 10 * dt;
        camera.updateProjectionMatrix();
    }

    const targetEye = isCrouching ? 1.08 : 1.5;
    player.eyeOffset += (targetEye - player.eyeOffset) * 14 * dt;

    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    const move = new THREE.Vector3();
    if (keys["KeyW"]) move.add(forward);
    if (keys["KeyS"]) move.sub(forward);
    if (keys["KeyD"]) move.add(right);
    if (keys["KeyA"]) move.sub(right);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * dt);

    player.pos.x += move.x;
    if (checkBoxCollision(player.pos, 0.3, playerHeight) ||
        (isCrouching && player.grounded && !hasGroundSupport(player.pos.x, player.pos.y, player.pos.z))) {
        player.pos.x -= move.x;
    }

    player.pos.z += move.z;
    if (checkBoxCollision(player.pos, 0.3, playerHeight) ||
        (isCrouching && player.grounded && !hasGroundSupport(player.pos.x, player.pos.y, player.pos.z))) {
        player.pos.z -= move.z;
    }

    if (keys["Space"] && player.grounded) {
        player.vel.y = 8.4;
        player.grounded = false;
    }

    player.vel.y -= 22 * dt;
    player.pos.y += player.vel.y * dt;
    player.grounded = false;

    if (checkBoxCollision(player.pos, 0.3, playerHeight)) {
        if (player.vel.y < 0) player.grounded = true;
        player.pos.y -= player.vel.y * dt;
        player.vel.y = 0;
    }

    if (player.pos.y < -25) {
        player.pos.set(0, 14, 0);
        player.vel.set(0, 0, 0);
    }

    camera.position.set(player.pos.x, player.pos.y + player.eyeOffset, player.pos.z);

    // Atualiza chunks visíveis conforme o jogador anda pelo mundo de 256 chunks
    rebuildVisibleChunks(false);

    if (move.lengthSq() > 0 && player.grounded) {
        const bobFreq = isSprinting ? 0.016 : 0.011;
        const bobAmp = isSprinting ? 0.022 : 0.012;
        handContainer.position.y = -0.38 + Math.sin(performance.now() * bobFreq) * bobAmp;
        handContainer.position.x = 0.46 + Math.cos(performance.now() * bobFreq * 0.5) * bobAmp;
    }

    survival.hungerTimer += dt * (isSprinting ? 1.8 : 1.0);
    if (survival.hungerTimer >= 18) {
        survival.hungerTimer = 0;
        if (survival.hunger > 0) survival.hunger -= 0.5;
        else if (survival.hp > 1) survival.hp -= 0.5;
        updateSurvivalUI();
    }
}

let worldTime = 480;
let dayNumber = 1;
let frames = 0, lastFpsTime = performance.now(), currentFps = 60;
const lookDir = new THREE.Vector3();

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

generateWorld();
spawnInitialEntities();
renderAllInventoryUI();
updateSurvivalUI();

let lastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    frames++;
    if (now - lastFpsTime >= 1000) {
        currentFps = frames;
        frames = 0;
        lastFpsTime = now;
    }

    clouds.forEach((c) => {
        c.position.x += dt * 1.1;
        if (c.position.x > 160) c.position.x = -160;
    });

    worldTime += dt * 4;
    if (worldTime >= 1440) {
        worldTime = 0;
        dayNumber++;
    }
    const hh = String(Math.floor(worldTime / 60)).padStart(2, "0");
    const mm = String(Math.floor(worldTime % 60)).padStart(2, "0");
    const isNight = worldTime < 360 || worldTime > 1140;
    document.getElementById("time-hud").textContent = `${isNight ? "🌙" : "☀️"} Dia ${dayNumber} - ${hh}:${mm}`;

    const sunAngle = ((worldTime - 360) / 1440) * Math.PI * 2;
    sunGroup.position.set(player.pos.x + Math.cos(sunAngle) * 95, Math.sin(sunAngle) * 85, player.pos.z - 45);
    sunLight.position.copy(sunGroup.position);

    const skyColor = isNight ? new THREE.Color(0x0b1021) : new THREE.Color(0x7ec0ee);
    scene.background.lerp(skyColor, 0.02);
    scene.fog.color.copy(scene.background);
    sunLight.intensity = isNight ? 0.2 : 0.8;
    ambientLight.intensity = isNight ? 0.35 : 0.72;

    if (isLocked) {
        updatePlayer(dt);
        updateEntities(dt);
        updateArrows(dt);
        updateDroppedItems(dt);
        updateMining(dt);

        document.getElementById("debug-hud").textContent =
            `FPS: ${currentFps} | XYZ: ${player.pos.x.toFixed(1)} / ${player.pos.y.toFixed(1)} / ${player.pos.z.toFixed(1)} | Mundo: 256 Chunks`;

        camera.getWorldDirection(lookDir);
        const hit = raycastVoxel(camera.position, lookDir, 5.5);
        if (hit) {
            highlightBox.visible = true;
            highlightBox.position.set(hit.x, hit.y, hit.z);
        } else {
            highlightBox.visible = false;
        }
    }

    if (swingTimer > 0) {
        swingTimer -= dt * 5;
        handContainer.rotation.x = -Math.sin(swingTimer * Math.PI) * 0.85;
    } else {
        handContainer.rotation.x = 0;
    }

    renderer.render(scene, camera);
}

animate();