/**
 * network-animation.js
 * Handles the background particle network animation.
 * Depends on global variables: networkCanvas, networkCtx, can_w, can_h (defined in main.js)
 */

// --- Network Animation Parameters ---
const NET_BALL_NUM = 35; // Number of particles
const net_ball_color = { r: 100, g: 180, b: 255 }; // Particle color
const NET_R = 1.5; // Particle radius
let net_balls = []; // Array for network particles
const net_alpha_f = 0.04; // Alpha fade speed
const net_link_line_width = 0.6; // Connecting line width
const net_dis_limit = 280; // Max connection distance
let net_mouse_in = false; // Mouse over canvas flag
const net_mouse_ball = { x: 0, y: 0, vx: 0, vy: 0, r: 0, type: 'mouse' }; // Mouse pseudo-particle

// --- Network Animation Helper Functions (Moved Here) ---

/**
 * Generates a random number within a specified range.
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} - A random number between min and max.
 */
function randomNumFrom(min, max) { // Renamed back (no prefix needed within this file)
    return Math.random() * (max - min) + min;
}

/**
 * Selects a random item from an array.
 * @param {Array} arr - The input array.
 * @returns {*} - A random element from the array.
 */
function randomArrayItem(arr) { // Renamed back
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates random speed vector based on spawn edge.
 * Uses the helper functions defined above.
 * @param {string} pos - The edge ('top', 'right', 'bottom', 'left').
 * @returns {Array<number>} - [vx, vy] speed vector.
 */
function getRandomSpeed(pos) { // Renamed back
    const min = -1, max = 1;
    switch (pos) {
        case 'top': return [randomNumFrom(min, max), randomNumFrom(0.1, max)];
        case 'right': return [randomNumFrom(min, -0.1), randomNumFrom(min, max)];
        case 'bottom': return [randomNumFrom(min, max), randomNumFrom(min, -0.1)];
        case 'left': return [randomNumFrom(0.1, max), randomNumFrom(min, max)];
        default: return [0, 0];
    }
}

/**
 * Generates a random position along one edge of the canvas.
 * @param {number} length - The width or height of the canvas edge.
 * @returns {number} - A random position along the edge.
 */
function randomSidePos(length) { // Renamed back
    return Math.ceil(Math.random() * Math.max(1, length));
}

/**
 * Creates a new network particle object with random properties based on spawn edge.
 * @returns {object} - A particle object {x, y, vx, vy, r, alpha, phase}.
 */
function getRandomBall() { // Renamed back
    const pos = randomArrayItem(['top', 'right', 'bottom', 'left']); // Use renamed helper
    let ballProps = { r: NET_R, alpha: 1, phase: randomNumFrom(0, 10) }; // Use renamed helper
    const speed = getRandomSpeed(pos); // Use renamed helper
    ballProps.vx = speed[0];
    ballProps.vy = speed[1];

    // Use global can_w, can_h from main.js
    const current_w = typeof can_w !== 'undefined' ? can_w : window.innerWidth;
    const current_h = typeof can_h !== 'undefined' ? can_h : window.innerHeight;

    switch (pos) {
        case 'top': ballProps.x = randomSidePos(current_w); ballProps.y = -NET_R; break; // Use renamed helper
        case 'right': ballProps.x = current_w + NET_R; ballProps.y = randomSidePos(current_h); break; // Use renamed helper
        case 'bottom': ballProps.x = randomSidePos(current_w); ballProps.y = current_h + NET_R; break; // Use renamed helper
        case 'left': ballProps.x = -NET_R; ballProps.y = randomSidePos(current_h); break; // Use renamed helper
    }
    return ballProps;
}

/**
 * Calculates the Euclidean distance between two points (particles).
 * @param {object} b1 - First particle {x, y}.
 * @param {object} b2 - Second particle {x, y}.
 * @returns {number} - The distance between the particles.
 */
function getDisOf(b1, b2) { // Renamed back
    const delta_x = Math.abs(b1.x - b2.x);
    const delta_y = Math.abs(b1.y - b2.y);
    return Math.sqrt(delta_x * delta_x + delta_y * delta_y);
}


// --- Network Animation Rendering and Update Functions ---

function renderNetworkBalls() {
    if (!networkCtx) return;
    net_balls.forEach(function (b) {
        if (!b.hasOwnProperty('type')) {
            networkCtx.fillStyle = `rgba(${net_ball_color.r},${net_ball_color.g},${net_ball_color.b},${b.alpha})`;
            networkCtx.beginPath();
            networkCtx.arc(b.x, b.y, NET_R, 0, Math.PI * 2, true);
            networkCtx.closePath();
            networkCtx.fill();
        }
    });
}

function updateNetworkBalls() {
    const new_balls = [];
    // Use global can_w, can_h
    const current_w = typeof can_w !== 'undefined' ? can_w : window.innerWidth;
    const current_h = typeof can_h !== 'undefined' ? can_h : window.innerHeight;

    net_balls.forEach(function (b) {
        b.x += b.vx;
        b.y += b.vy;

        if (b.x > -50 && b.x < current_w + 50 && b.y > -50 && b.y < current_h + 50) {
            new_balls.push(b);
        }
        b.phase += net_alpha_f;
        b.alpha = Math.abs(Math.cos(b.phase));
    });
    net_balls = new_balls;
}

function renderNetworkLines() {
    if (!networkCtx) return;
    let fraction, alpha;
    for (let i = 0; i < net_balls.length; i++) {
        for (let j = i + 1; j < net_balls.length; j++) {
            fraction = getDisOf(net_balls[i], net_balls[j]) / net_dis_limit; // Use renamed helper
            if (fraction < 1) {
                alpha = (1 - fraction);
                networkCtx.strokeStyle = `rgba(180, 180, 200, ${alpha * 0.5})`;
                networkCtx.lineWidth = net_link_line_width;
                networkCtx.beginPath();
                networkCtx.moveTo(net_balls[i].x, net_balls[i].y);
                networkCtx.lineTo(net_balls[j].x, net_balls[j].y);
                networkCtx.stroke();
                networkCtx.closePath();
            }
        }
    }
}

function addBallIfy() {
    if (net_balls.length < NET_BALL_NUM) {
        net_balls.push(getRandomBall()); // Use renamed helper
    }
}

// Main function to render one frame of the network animation
function renderNetworkAnimation() {
    if (!networkCtx) return;
    renderNetworkBalls();
    renderNetworkLines();
    updateNetworkBalls();
    addBallIfy();
}

// --- Network Animation Initialization ---

function initNetworkBalls() {
    net_balls = []; // Clear existing balls
    // Use global can_w, can_h
    const current_w = typeof can_w !== 'undefined' ? can_w : window.innerWidth;
    const current_h = typeof can_h !== 'undefined' ? can_h : window.innerHeight;

    for (let i = 1; i <= NET_BALL_NUM; i++) {
        const speed = getRandomSpeed('top'); // Use renamed helper
        net_balls.push({
            x: randomSidePos(current_w), // Use renamed helper
            y: randomSidePos(current_h), // Use renamed helper
            vx: speed[0],
            vy: speed[1],
            r: NET_R,
            alpha: Math.random(),
            phase: randomNumFrom(0, 10) // Use renamed helper
        });
    }
}

// Function to be called to setup the network animation
function setupNetworkAnimation() {
    console.log("Setting up network animation...");
    // Canvas size is set in main.js's resizeCanvas
    initNetworkBalls(); // Initialize particles
    // Add mouse listeners specific to network animation
    if (networkCanvas) { // Access global networkCanvas
        networkCanvas.addEventListener('mouseenter', () => {
            net_mouse_in = true;
            if (!net_balls.find(b => b.type === 'mouse')) {
                 net_balls.push(net_mouse_ball);
            }
        });
        networkCanvas.addEventListener('mouseleave', () => {
            net_mouse_in = false;
            net_balls = net_balls.filter(b => b.type !== 'mouse');
        });
        networkCanvas.addEventListener('mousemove', (e) => {
            const event = e || window.event;
            net_mouse_ball.x = event.clientX;
            net_mouse_ball.y = event.clientY;
        });
         console.log("Network animation mouse listeners attached.");
    }
    console.log("Network animation setup complete.");
}