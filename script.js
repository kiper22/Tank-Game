const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let backgroundImage = new Image();
backgroundImage.src = "bg.png";

class Tank {
    constructor(x, y, imageSrc, gunSrc) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.gunAngle = 45;
        this.image = new Image();
        this.image.src = imageSrc;
        this.gunImage = new Image();
        this.gunImage.src = gunSrc;
        this.imageLoaded = false;
        this.gunLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
            this.width = this.image.width;
            this.height = this.image.height;
        };
        this.gunImage.onload = () => {
            this.gunLoaded = true;
            this.gunWidth = this.gunImage.width;
            this.gunHeight = this.gunImage.height;
        };
    }
    draw() {
        if (!this.imageLoaded || !this.gunLoaded) return;
        this.width = this.image.width * x_ratio / 2;
        this.height = this.image.height * y_ratio / 2;
        // tank
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();

        this.gunWidth = this.gunImage.width * x_ratio / 2;
        this.gunHeight = this.gunImage.height * y_ratio / 2;
        // gun
        ctx.save();
        ctx.translate(this.x, this.y - this.height * 0.35);
        ctx.rotate((this.gunAngle - 90) * Math.PI / 180);
        ctx.drawImage(this.gunImage, -this.gunWidth / 2, -this.gunHeight / 2, this.gunWidth, this.gunHeight);
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, angle, power) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 18 * power / 100;
        this.speed_x = Math.cos(this.angle) * this.speed;
        this.speed_y = Math.sin(this.angle) * this.speed;
        this.active = true;
        this.gravity = 0.07;
    }
    move(windSpeed) {
        this.speed_x = (this.speed_x * 0.9987 + windSpeed / 150);
        this.x += this.speed_x * x_ratio;
        this.speed_y += this.gravity;
        this.speed_y *= 0.995;
        this.y += this.speed_y * y_ratio;
        if (this.y > canvas.height || this.x > canvas.width || this.x < 0) {
            this.active = false;
        }
    }
    draw() {
        if (!this.active) return;
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Target {
    constructor(difficulty) {
        this.image = new Image();
        this.image.src = "target.png";
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
            this.width = this.image.width;
            this.height = this.image.height;
        };
        const marginX = 400 / 1920;
        const maxX = canvas.width - 100;
        const maxY = canvas.height - 150;
        this.x_ratio_original = Math.random() * (1 - 2 * marginX) + marginX;
        this.y_ratio_original = Math.random() * 0.7 + 0.1;

        this.updatePosition();
    }
    updatePosition() {
        this.x = this.x_ratio_original * canvas.width;
        this.y = this.y_ratio_original * canvas.height;
        this.pos_x = this.x;
        this.pos_y = this.y;
    }
    draw() {
        if (!this.imageLoaded) return;
        this.width = this.image.width * x_ratio * Math.max(0.1, (100 - score) / 100);
        this.height = this.image.height * y_ratio * Math.max(0.1, (100 - score) / 100);
        ctx.save();
        ctx.translate(this.pos_x, this.pos_y);
        ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
    getPos() {
        return [this.x_ratio_original, this.y_ratio_original];
    }
}


function checkCollision(bullet, target) {
    const tx1 = target.pos_x - target.width / 2;
    const tx2 = target.pos_x + target.width / 2;
    const ty1 = target.pos_y - target.height / 2;
    const ty2 = target.pos_y + target.height / 2;

    const prev_x = bullet.x - bullet.speed_x;
    const prev_y = bullet.y - bullet.speed_y;

    function lineIntersectsRect(x1, y1, x2, y2, rx1, ry1, rx2, ry2) {
        function lineIntersectsLine(p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y) {
            const s1_x = p1_x - p0_x;
            const s1_y = p1_y - p0_y;
            const s2_x = p3_x - p2_x;
            const s2_y = p3_y - p2_y;

            const s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y);
            const t = ( s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y);

            return s >= 0 && s <= 1 && t >= 0 && t <= 1;
        }

        return (
            lineIntersectsLine(x1, y1, x2, y2, rx1, ry1, rx2, ry1) || // top
            lineIntersectsLine(x1, y1, x2, y2, rx1, ry2, rx2, ry2) || // bottom
            lineIntersectsLine(x1, y1, x2, y2, rx1, ry1, rx1, ry2) || // left
            lineIntersectsLine(x1, y1, x2, y2, rx2, ry1, rx2, ry2)    // right
        );
    }

    return lineIntersectsRect(prev_x, prev_y, bullet.x, bullet.y, tx1, ty1, tx2, ty2);
}

let tank = new Tank(200, 950, "tank.png", "gun.png"); // pozycja jest w funkcji resizeCanvas ustawiana
let bullets = [];
let target = new Target(0);
let animationId;

let score = 0;
let ammo = 10;
let windSpeed = 0;
let power = 80;
let x_ratio, y_ratio;

function updateInfo() {
    document.getElementById("score").textContent = score;
    document.getElementById("ammo").textContent = ammo;
    document.getElementById("windSpeed").textContent = windSpeed;
    document.getElementById("power").textContent = power;
}

function update() {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    tank.draw();
    target.draw();

    bullets.forEach(b => b.move(windSpeed));
    bullets.forEach(b => b.draw());
    bullets = bullets.filter(b => {
        if (!b.active) return false;
        if (checkCollision(b, target)) {
            target = new Target(score);
            score++;
            ammo += 1;
            windSpeed = Math.max(-10, Math.min(10, (0.4 * score * (Math.random() - 0.5)).toFixed(2)));
            updateInfo();
            return false;
            }
        return true;
    });

    if (ammo <= 0 && bullets.length === 0) {
        document.getElementById("gameOverScreen").style.display = "flex";
        cancelAnimationFrame(animationId);
    }
}

function gameLoop() {
    update();
    animationId = requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const minWidth = 480;
    const minHeight = 270;
    const width = Math.max(window.innerWidth, minWidth);
    const height = Math.max(window.innerHeight, minHeight);
    canvas.width = width;
    canvas.height = height;

    x_ratio = width / 1920;
    y_ratio = height / 1080;

    // tank position
    tank.x = 200 * x_ratio;
    tank.y = 950 * y_ratio;

    // target position
    const [target_x_ratio, target_y_ratio] = target.getPos();
    target.x_ratio_original = target_x_ratio;
    target.y_ratio_original = target_y_ratio;
    target.updatePosition();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

document.addEventListener("keydown", (event) => {
    if (event.key === "a" && tank.gunAngle > 0) {
        tank.gunAngle -= 1;
    } else if (event.key === "d" && tank.gunAngle < 90) {
        tank.gunAngle += 1;
    } else if (event.key === "s" && power > 0) {
        power -= 1;
        updateInfo();
    } else if (event.key === "w" && power < 100) {
        power += 1;
        updateInfo();
    } else if (event.key === "p") {
        ammo += 1;
        updateInfo();
    } else if (event.key === " ") {
        if (ammo > 0) {
            bullets.push(new Bullet(tank.x, tank.y - tank.height * 0.35, (tank.gunAngle - 90) * Math.PI / 180, power));
            ammo--;
            updateInfo();
        }
    }
});

function restartGame() {
    score = 0;
    ammo = 10;
    power = 80;
    windSpeed = 0;
    bullets = [];
    target = new Target(0);
    updateInfo();
    document.getElementById("gameOverScreen").style.display = "none";
    gameLoop();
}

gameLoop();