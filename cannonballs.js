// Game variables
let world, scene, camera, renderer, controls;
let timeStep = 1/60;
let cannonBody, cannonMesh;  // Changed from const to let
let boxes = [], boxMeshes = [];
let balls = [], ballMeshes = [];
let platform;
let scoreElement;
let score = 0;
let gameStarted = false;
let currentStage = 1;  // Track current stage
let victoryElement = null;  // Store reference to victory message
let continueButton = null;  // Store reference to continue button
let infoElement = null;  // Store reference to info text

// Store the mouse position globally
let mouseTarget = new THREE.Vector3();
let debugSphere;
// Add a variable for storing the direction from cannon to target
let targetDirection = new THREE.Vector3(0, -3, -15);

// Add at the very top of the file, after other variable declarations but before any functions
let mouse = new THREE.Vector2(-8, -8);

// Add explosion shot variables
let hasExplosionShot = true; // Track if explosion shot is available
let explosionButton = null; // Store reference to explosion button
let isExplosionShotActive = false; // Track if the next shot should be explosive

// Define clouds array for animation
let clouds = [];

// Initialize the game
window.addEventListener('load', init);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', (e) => {
    // Only shoot if we didn't click the explosion button
    if (!explosionButton || !explosionButton.contains(e.target)) {
        shootBall();
    }
});

// Add touch event listeners
window.addEventListener('touchstart', onTouchStart);
window.addEventListener('touchmove', onTouchMove);
window.addEventListener('touchend', onTouchEnd);

// Track touch state
let isTouching = false;
let lastTouchX = 0;
let lastTouchY = 0;

function init() {
    // Create score display
    createScoreDisplay();
    
    // Store reference to info text
    infoElement = document.getElementById('info');
    
    // Initialize physics world
    setupPhysicsWorld();
    
    // Initialize Three.js scene
    setupGraphics();
    
    // Create game objects
    createPlatform();
    createBoxes();
    createCannon();
    
    // Create explosion button
    createExplosionButton();
    
    // Start the game loop
    animate();
}

function createScoreDisplay() {
    scoreElement = document.createElement('div');
    scoreElement.id = 'score';
    scoreElement.style.position = 'absolute';
    scoreElement.style.top = '20px';
    scoreElement.style.left = '20px';
    scoreElement.style.color = 'white';
    scoreElement.style.fontSize = 'clamp(18px, 6vw, 24px)';
    scoreElement.style.fontFamily = 'Arial, sans-serif';
    scoreElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    scoreElement.style.userSelect = 'none';
    scoreElement.style.pointerEvents = 'none';
    scoreElement.textContent = `Score: ${score}`;
    document.body.appendChild(scoreElement);
    
    // Create an info text display
    const infoElement = document.createElement('div');
    infoElement.id = 'info';
    infoElement.style.position = 'absolute';
    infoElement.style.top = '50%';
    infoElement.style.left = '50%';
    infoElement.style.transform = 'translate(-50%, -50%)';
    infoElement.style.color = 'white';
    infoElement.style.fontSize = '24px';
    infoElement.style.fontFamily = 'Arial, sans-serif';
    infoElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    infoElement.style.textAlign = 'center';
    infoElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    infoElement.style.padding = '20px';
    infoElement.style.borderRadius = '10px';
}

function setupPhysicsWorld() {
    // Create a physics world with gravity
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // Earth gravity
    
    // Improve collision detection with smaller timestep and more iterations
    world.broadphase = new CANNON.SAPBroadphase(world); // More precise broadphase
    world.solver.iterations = 20; // More solver iterations for better accuracy
    world.defaultContactMaterial.contactEquationStiffness = 1e8; // Stiffer contacts
    world.defaultContactMaterial.contactEquationRelaxation = 3;
    
    // Set default collision behavior
    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
        defaultMaterial, 
        defaultMaterial, 
        { 
            friction: 0.5,
            restitution: 0.3
        }
    );
    world.defaultMaterial = defaultMaterial;
    world.addContactMaterial(defaultContactMaterial);
}

function setupGraphics() {
    // Create Three.js scene, camera and renderer
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Create fixed camera positioned in front of the platform
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // We'll set the camera position toward the platform
    camera.position.set(0, 0, 0); // Will be positioned later
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Add debug sphere to visualize target position
    const debugGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const debugMat = new THREE.MeshBasicMaterial({color: 0xff0000});
    debugSphere = new THREE.Mesh(debugGeo, debugMat);
    scene.add(debugSphere);
    
    // Add clouds in the background instead of stars
    createCloudBackground();
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Brighter ambient for daytime sky
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(-1, 10, 6);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Set camera position once
    positionCamera();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Position the camera once at setup
function positionCamera() {
    // Position camera higher up and further back for a better view of the platform
    camera.position.set(0, 3, 4); // Higher up and slightly back
    camera.lookAt(new THREE.Vector3(0, -3, -15)); // Look down at the platform
}

// Replace starfield with dynamic clouds
function createCloudBackground() {
    // Create a large skybox
    const skySize = 500;
    const cloudCount = 30;
    clouds = [];
    
    // Create cloud particles with different sizes and positions
    for (let i = 0; i < cloudCount; i++) {
        // Random cloud size
        const size = Math.random() * 8 + 5;
        
        // Create cloud material with soft edges
        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: Math.random() * 0.5 + 0.3,
            roughness: 1,
            metalness: 0
        });
        
        // Create random cloud shape using multiple spheres
        const cloudGroup = new THREE.Group();
        const segments = Math.floor(Math.random() * 4) + 3;
        
        for (let j = 0; j < segments; j++) {
            const puffSize = size * (Math.random() * 0.4 + 0.8);
            const puffGeo = new THREE.SphereGeometry(puffSize, 7, 7);
            const puffMesh = new THREE.Mesh(puffGeo, cloudMaterial);
            
            // Position puffs to form a cloud-like shape
            const offset = size * 0.7;
            puffMesh.position.set(
                (Math.random() - 0.5) * offset,
                (Math.random() - 0.5) * offset * 0.3,
                (Math.random() - 0.5) * offset
            );
            
            cloudGroup.add(puffMesh);
        }
        
        // Position the cloud randomly in the sky, but LOWER than before
        cloudGroup.position.set(
            (Math.random() - 0.5) * skySize, 
            Math.random() * 20 + 20,  // Lower height: between 20 and 40 units
            (Math.random() - 0.5) * skySize
        );
        
        // Random rotation
        cloudGroup.rotation.y = Math.random() * Math.PI * 2;
        
        // Store cloud movement properties
        const cloud = {
            mesh: cloudGroup,
            speed: Math.random() * 0.05 + 0.01,
            rotationSpeed: (Math.random() - 0.5) * 0.001
        };
        
        clouds.push(cloud);
        scene.add(cloudGroup);
    }
}

const platformZ = -25;  // Match the platform position from above
function createPlatform() {
    // Create a raised platform where boxes will be stacked
    const platformSize = { width: 10, height: 1, depth: 8 };
    const platformShape = new CANNON.Box(new CANNON.Vec3(platformSize.width/2, platformSize.height/2, platformSize.depth/2));
    const platformBody = new CANNON.Body({ 
        mass: 0,
        type: CANNON.Body.STATIC,
        material: world.defaultMaterial
    });
    platformBody.addShape(platformShape);
    // Keep the platform at the same position but ensure it's visible
    platformBody.position.set(0, -6, platformZ); // Slightly lower to be in full view
    world.addBody(platformBody);
    
    // Visual platform - make it look like wood
    const platformGeometry = new THREE.BoxGeometry(platformSize.width, platformSize.height, platformSize.depth);
    
    // Create wood texture
    const woodTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/hardwood2_diffuse.jpg');
    woodTexture.wrapS = THREE.RepeatWrapping;
    woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set(4, 4);
    
    const platformMaterial = new THREE.MeshStandardMaterial({ 
        map: woodTexture,
        roughness: 0.8,
        metalness: 0.1
    });
    
    platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.copy(platformBody.position);
    platform.castShadow = true;
    platform.receiveShadow = true;
    
    // Add wooden planks detail to the platform
    const edgeGeometry = new THREE.BoxGeometry(platformSize.width + 0.5, 0.2, platformSize.depth + 0.5);
    const edgeMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513, // SaddleBrown - darker wood color for edges
        roughness: 1.0,
        metalness: 0.0
    });
    
    const platformEdge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    platformEdge.position.set(0, platformSize.height/2 + 0.1, 0);
    platform.add(platformEdge);
    
    // Add platform to scene
    scene.add(platform);
}

function createBoxes() {
    const boxSize = 1;
    const patterns = [
        createPyramid,
        createCastle,
        createCylinder,
        createTriangleWall,
        createArchway
    ];
    
    // Select pattern based on stage
    const patternIndex = (currentStage - 1) % patterns.length;
    patterns[patternIndex](boxSize);
    
    // Update stage display
    const stageElement = document.getElementById('stage') || createStageDisplay();
    stageElement.textContent = `Stage ${currentStage}`;
}

function createPyramid(boxSize) {
    const baseSize = 7; // Number of boxes in the base
    const height = 5; // Number of layers
    
    for (let layer = 0; layer < height; layer++) {
        const layerSize = baseSize - (layer * 2);
        const startHeight = -6.4 + 1 + boxSize/2 + (layer * boxSize);
        
        for (let row = 0; row < layerSize; row++) {
            for (let col = 0; col < layerSize; col++) {
                const x = (row - (layerSize - 1) / 2) * (boxSize + 0.1);
                const z = platformZ + (col - (layerSize - 1) / 2) * (boxSize + 0.1);
                createBox(x, startHeight, z, boxSize, layer);
            }
        }
    }
}

function createCastle(boxSize) {
    // Create main walls
    const wallHeight = 5;
    const wallLength = 6;
    
    // Create four towers
    const towerPositions = [
        [-wallLength/2, -wallLength/2],
        [-wallLength/2, wallLength/2],
        [wallLength/2, -wallLength/2],
        [wallLength/2, wallLength/2]
    ];
    
    // Create towers
    towerPositions.forEach(pos => {
        for (let height = 0; height < wallHeight + 2; height++) {
            const y = -6.4 + 1 + boxSize/2 + (height * boxSize);
            createBox(pos[0], y, platformZ + pos[1], boxSize, height);
        }
    });
    
    // Create walls
    for (let height = 0; height < wallHeight; height++) {
        const y = -6.4 + 1 + boxSize/2 + (height * boxSize);
        
        // Connect towers with walls
        for (let i = -wallLength/2 + 1; i < wallLength/2; i++) {
            createBox(i, y, platformZ - wallLength/2, boxSize, height); // Front wall
            createBox(i, y, platformZ + wallLength/2, boxSize, height); // Back wall
            createBox(-wallLength/2, y, platformZ + i, boxSize, height); // Left wall
            createBox(wallLength/2, y, platformZ + i, boxSize, height); // Right wall
        }
    }
}

function createCylinder(boxSize) {
    const radius = 3;
    const height = 6;
    const segments = 8;
    
    for (let h = 0; h < height; h++) {
        const y = -6.4 + 1 + boxSize/2 + (h * boxSize);
        
        for (let segment = 0; segment < segments; segment++) {
            const angle = (segment / segments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            createBox(x, y, platformZ + z, boxSize, h);
        }
    }
}

function createTriangleWall(boxSize) {
    const baseWidth = 7;
    const height = 5;
    
    for (let h = 0; h < height; h++) {
        const y = -6.4 + 1 + boxSize/2 + (h * boxSize);
        const width = baseWidth - h;
        
        for (let w = 0; w < width; w++) {
            const x = (w - (width - 1) / 2) * (boxSize + 0.1);
            // Create depth by making it 3 boxes deep
            for (let d = 0; d < 3; d++) {
                const z = platformZ + (d - 1) * (boxSize + 0.1);
                createBox(x, y, z, boxSize, h);
            }
        }
    }
}

function createArchway(boxSize) {
    const width = 7;
    const height = 6;
    const archHeight = 4;
    
    // Create pillars
    for (let h = 0; h < height; h++) {
        const y = -6.4 + 1 + boxSize/2 + (h * boxSize);
        
        // Left pillar
        createBox(-width/2, y, platformZ, boxSize, h);
        createBox(-width/2, y, platformZ + boxSize, boxSize, h);
        createBox(-width/2, y, platformZ - boxSize, boxSize, h);
        
        // Right pillar
        createBox(width/2, y, platformZ, boxSize, h);
        createBox(width/2, y, platformZ + boxSize, boxSize, h);
        createBox(width/2, y, platformZ - boxSize, boxSize, h);
        
        // Create arch
        if (h >= archHeight) {
            for (let w = -width/2 + 1; w < width/2; w++) {
                createBox(w, y, platformZ, boxSize, h);
                createBox(w, y, platformZ + boxSize, boxSize, h);
                createBox(w, y, platformZ - boxSize, boxSize, h);
            }
        }
    }
}

function createBox(x, y, z, boxSize, layer) {
    const boxShape = new CANNON.Box(new CANNON.Vec3(boxSize/2, boxSize/2, boxSize/2));
    const boxBody = new CANNON.Body({ 
        mass: 5 + (currentStage * 0.5),
        material: world.defaultMaterial,
        angularDamping: 0.3,
        linearDamping: 0.1
    });
    boxBody.addShape(boxShape);
    boxBody.position.set(x, y, z);
    
    world.addBody(boxBody);
    boxes.push(boxBody);
    
    // Visual box with color based on layer
    const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    
    const colorSchemes = [
        [0xFF5733, 0x33FF57, 0x3357FF, 0xFFFF33], // Stage 1
        [0xFF33FF, 0x33FFFF, 0xFFFF33, 0xFF3333], // Stage 2
        [0x00FF00, 0xFF0000, 0x0000FF, 0xFFFF00], // Stage 3
        [0xFF00FF, 0x00FFFF, 0xFFFF00, 0xFF0000]  // Stage 4+
    ];
    
    const schemeIndex = Math.min(currentStage - 1, colorSchemes.length - 1);
    const colors = colorSchemes[schemeIndex];
    
    const boxMaterial = new THREE.MeshStandardMaterial({
        color: colors[layer % colors.length],
        roughness: 0.5,
        metalness: 0.5
    });
    
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    boxMesh.position.copy(boxBody.position);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    scene.add(boxMesh);
    boxMeshes.push(boxMesh);
}

function createStageDisplay() {
    const stageElement = document.createElement('div');
    stageElement.id = 'stage';
    stageElement.style.position = 'absolute';
    stageElement.style.top = '60px';
    stageElement.style.left = '20px';
    stageElement.style.color = 'white';
    stageElement.style.fontSize = 'clamp(18px, 6vw, 24px)';
    stageElement.style.fontFamily = 'Arial, sans-serif';
    stageElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    stageElement.style.userSelect = 'none';
    stageElement.style.pointerEvents = 'none';
    document.body.appendChild(stageElement);
    return stageElement;
}

function createCannon() {
    // Make the cannon smaller
    const scale = 0.6; // Scale factor to make the cannon smaller
    
    // Cannon base (static)
    const baseRadius = 1.5 * scale;
    const baseHeight = 1 * scale;
    const baseShape = new CANNON.Cylinder(baseRadius, baseRadius, baseHeight, 16);
    const baseBody = new CANNON.Body({ mass: 0 });
    // Position the cannon at the bottom center of the view
    baseBody.position.set(0, -2, 0); // Centered horizontally, lower vertically
    world.addBody(baseBody);
    
    // Visual base
    const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius * 1.2, baseHeight, 32);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.8,
        metalness: 0.5
    });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.copy(baseBody.position);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);
    
    // Cannon barrel
    const barrelLength = 3 * scale;
    const barrelBackRadius = 0.9 * scale;
    const barrelFrontRadius = 0.7 * scale;
    const barrelShape = new CANNON.Cylinder(barrelBackRadius, barrelFrontRadius, barrelLength, 16);
    cannonBody = new CANNON.Body({ mass: 0 });
    // Adjust shape position so it points forward (negative Z is forward in our scene)
    cannonBody.addShape(barrelShape, new CANNON.Vec3(0, 0, -barrelLength/2));
    cannonBody.position.set(0, baseBody.position.y + (baseHeight + barrelBackRadius) * scale, baseBody.position.z);
    world.addBody(cannonBody);
    
    // Visual barrel (with more realistic cannon shape)
    cannonMesh = new THREE.Group();
    
    // Main barrel - now tapered to look more like a cannon
    const barrelGeometry = new THREE.CylinderGeometry(barrelFrontRadius, barrelBackRadius, barrelLength, 32);
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444,
        roughness: 0.7,
        metalness: 0.6
    });
    
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI/2; // Correct rotation for the cannon to point forward (negative Z)
    barrel.position.z = -barrelLength/2; // Position barrel to extend forward
    
    // Add decorative rim around the back of the cannon
    const rimGeometry = new THREE.TorusGeometry(barrelBackRadius * 1.1, barrelBackRadius * 0.2, 16, 32);
    const rimMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.6,
        metalness: 0.7
    });
    
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI/2;
    rim.position.z = 0.1;
    
    // Add them to the cannon group
    cannonMesh.add(barrel);
    cannonMesh.add(rim);
    
    cannonMesh.position.copy(cannonBody.position);
    cannonMesh.castShadow = true;
    cannonMesh.receiveShadow = true;
    scene.add(cannonMesh);
}

function onMouseMove(event) {
    if (!cannonMesh) return;
    
    updateCannonAim(event.clientX, event.clientY);
}

// Helper function to update cannon aim based on screen coordinates
function updateCannonAim(x, y) {
    // Update the global mouse variable
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;
    
    // Create ray from camera through mouse position
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Find intersection with a far plane to get a point in 3D space for aiming
    const farDistance = 1000;
    const rayDirection = raycaster.ray.direction.clone().normalize();
    mouseTarget.copy(raycaster.ray.origin).add(rayDirection.multiplyScalar(farDistance));
    
    // Update debug sphere position to show target
    debugSphere.position.copy(mouseTarget);
    
    // Get direction from cannon to target
    targetDirection = new THREE.Vector3().subVectors(mouseTarget, cannonMesh.position).normalize();
    
    // Calculate the horizontal angle (around Y axis)
    const horizontalAngle = Math.atan2(-targetDirection.x, -targetDirection.z);
    
    // Calculate the vertical angle (around X axis)
    // First, project the direction vector onto the YZ plane
    const verticalDirection = new THREE.Vector3(0, targetDirection.y, targetDirection.z);
    verticalDirection.normalize();
    
    // Calculate the angle between this vector and the Z axis
    const verticalDot = verticalDirection.dot(new THREE.Vector3(0, 0, -1));
    const verticalAngleMagnitude = Math.acos(Math.min(Math.abs(verticalDot), 1.0));
    const verticalAngle = verticalDirection.y >= 0 ? verticalAngleMagnitude : -verticalAngleMagnitude;
    
    // Limit the vertical angle to prevent the cannon from aiming too high or too low
    const maxVerticalAngle = Math.PI / 3; // 60 degrees up or down
    const clampedVerticalAngle = Math.max(Math.min(verticalAngle, maxVerticalAngle), -maxVerticalAngle);
    
    // Update the cannon rotation - first rotate horizontally, then vertically
    cannonMesh.rotation.y = horizontalAngle;
    
    // Find the barrel within the cannon group and rotate it vertically
    const barrel = cannonMesh.children[0]; // First child is the barrel
    barrel.rotation.x = Math.PI/2 + clampedVerticalAngle; // Start from PI/2 (initial barrel rotation) and add the vertical angle
}

function shootBall() {
    if (!gameStarted) {
        gameStarted = true;
        if (infoElement) {
            infoElement.remove();
            infoElement = null;
        }
    }
    
    // Create ball with different properties based on shot type
    const ballRadius = isExplosionShotActive ? 0.7 : 0.5;
    const ballMass = isExplosionShotActive ? 8 : 5;
    
    // Create ball physics body
    const ballShape = new CANNON.Sphere(ballRadius);
    const ballBody = new CANNON.Body({
        mass: ballMass,
        material: world.defaultMaterial,
        linearDamping: 0.01,
    });
    ballBody.addShape(ballShape);
    ballBody.allowSleep = false;
    ballBody.collisionResponse = true;
    
    // Set explosive flag for explosion shots
    ballBody.isExplosive = isExplosionShotActive;
    
    // Get the barrel rotation information
    const barrel = cannonMesh.children[0];
    const horizontalAngle = cannonMesh.rotation.y;
    const verticalAngle = barrel.rotation.x - Math.PI/2;
    
    // Calculate barrel direction for visual placement only
    const barrelDirection = new THREE.Vector3(
        -Math.sin(horizontalAngle) * Math.cos(verticalAngle),
        Math.sin(verticalAngle),
        -Math.cos(horizontalAngle) * Math.cos(verticalAngle)
    ).normalize();
    
    // Position at the end of the barrel
    const barrelLength = 3;
    const barrelTip = new THREE.Vector3().copy(cannonMesh.position).add(
        barrelDirection.clone().multiplyScalar(barrelLength)
    );
    
    // Create a raycaster from camera through mouse position
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Get the ray direction and apply y-correction
    const shootDirection = raycaster.ray.direction.clone();
    
    // Apply a y-offset correction of +0.3 to fix the aiming
    shootDirection.y += 0.15;
    shootDirection.normalize(); // Re-normalize after the adjustment
    
    // Position the ball at the barrel tip
    ballBody.position.copy(barrelTip);
    
    // Apply velocity in the direction of the ray with y-correction
    const shootVelocity = 60;
    ballBody.velocity.set(
        shootDirection.x * shootVelocity,
        shootDirection.y * shootVelocity,
        shootDirection.z * shootVelocity
    );
    
    // Add collision detection
    ballBody.addEventListener('collide', ballCollision);
    
    // Add the ball to the world and arrays
    world.addBody(ballBody);
    balls.push(ballBody);
    
    // Create visual ball with special appearance for explosive balls
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    let ballMaterial;
    
    if (isExplosionShotActive) {
        // Red glowing material for explosive balls
        ballMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0xff2200,
            emissiveIntensity: 0.6
        });
    } else {
        // Normal ball material
        ballMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.4,
            metalness: 0.7
        });
    }
    
    const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
    ballMesh.castShadow = true;
    ballMesh.receiveShadow = true;
    scene.add(ballMesh);
    ballMeshes.push(ballMesh);
    
    // Add muzzle flash effect at the barrel tip
    createMuzzleFlash(barrelTip, shootDirection);
    
    // Reset explosion shot flag after firing
    isExplosionShotActive = false;
    
    // Limit the number of balls
    if (balls.length > 10) {
        world.removeBody(balls[0]);
        scene.remove(ballMeshes[0]);
        balls.shift();
        ballMeshes.shift();
    }
}

function ballCollision(event) {
    // Extract the colliding bodies
    const bodyA = event.body;
    const bodyB = event.target;
    
    // Check if either body is an explosive ball
    const explosiveBall = bodyA.isExplosive ? bodyA : (bodyB.isExplosive ? bodyB : null);
    
    // If we found an explosive ball in this collision
    if (explosiveBall) {
        // Use collision point for explosion
        const collisionPosition = new THREE.Vector3().copy(explosiveBall.position);
        
        // Create explosion effect with moderate size
        createExplosion(collisionPosition, 7);
        
        // Improved 3D explosion force parameters
        const explosionRadius = 6; // Increased from 5 for better depth reach
        const explosionForce = 150000; // Increased from 120000 for more power
        
        // More dramatic screen shake for depth cue
        camera.position.x += (Math.random() - 0.5) * 0.15;
        camera.position.y += (Math.random() - 0.5) * 0.15;
        camera.position.z += (Math.random() - 0.5) * 0.15;
        
        // Increase affected boxes for better depth coverage
        const maxAffectedBoxes = 20; // Increased from 12
        
        // Add a direct depth visual cue - several particles that fly directly toward the camera
        const depthCueCount = 5;
        for (let i = 0; i < depthCueCount; i++) {
            // Create particle that flies toward camera
            const particleGeometry = new THREE.SphereGeometry(Math.random() * 0.5 + 0.2, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.9
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(collisionPosition);
            
            // Calculate direction toward camera
            const toCameraDir = new THREE.Vector3();
            toCameraDir.subVectors(camera.position, collisionPosition).normalize();
            
            // Apply spread to make it look more natural
            toCameraDir.x += (Math.random() - 0.5) * 0.3;
            toCameraDir.y += (Math.random() - 0.5) * 0.3;
            
            // Create velocity vector
            const speed = 10 + Math.random() * 15;
            const velocity = toCameraDir.multiplyScalar(speed);
            
            // Add to scene with animation
            scene.add(particle);
            
            // Simple animation
            const startTime = Date.now();
            const lifetime = 500 + Math.random() * 200;
            
            function animateDepthParticle() {
                const elapsed = Date.now() - startTime;
                if (elapsed > lifetime) {
                    scene.remove(particle);
                    return;
                }
                
                // Move toward camera
                particle.position.x += velocity.x * 0.02;
                particle.position.y += velocity.y * 0.02;
                particle.position.z += velocity.z * 0.02;
                
                // Fade out
                particle.material.opacity = 0.9 * (1 - elapsed / lifetime);
                
                // Grow in size as it approaches camera for emphasized depth cue
                const scale = 1 + elapsed / lifetime * 2;
                particle.scale.set(scale, 1, scale);
                
                requestAnimationFrame(animateDepthParticle);
            }
            
            animateDepthParticle();
        }
        
        // Find ALL boxes within explosion radius without any directional bias
        const boxesInRange = [];
        boxes.forEach(box => {
            if (!box || !box.position) return;
            
            const distanceVec = new CANNON.Vec3();
            box.position.vsub(collisionPosition, distanceVec);
            const distance = distanceVec.length();
            
            if (distance < explosionRadius) {
                boxesInRange.push({
                    box: box,
                    distance: distance,
                    direction: distanceVec.unit() // Store normalized direction vector
                });
            }
        });
        
        // Instead of just picking closest, ensure directional diversity by using octants
        const boxesToAffect = [];
        
        // First, add some closest boxes regardless of direction for consistent core effect
        const closestBoxes = [...boxesInRange].sort((a, b) => a.distance - b.distance).slice(0, 8);
        closestBoxes.forEach(box => boxesToAffect.push(box));
        
        // Then select boxes from different 3D octants for directional diversity
        // This ensures boxes behind the explosion are also affected
        const octants = Array(8).fill().map(() => []);
        
        // Classify remaining boxes into octants (3D space divided into 8 sectors)
        boxesInRange
            .filter(item => !closestBoxes.includes(item))
            .forEach(item => {
                const dir = item.direction;
                const octantIndex = (dir.x > 0 ? 1 : 0) + 
                                  (dir.y > 0 ? 2 : 0) + 
                                  (dir.z > 0 ? 4 : 0);
                octants[octantIndex].push(item);
            });
        
        // Pick the closest box from each octant to ensure directional diversity
        octants.forEach(octant => {
            if (octant.length > 0) {
                octant.sort((a, b) => a.distance - b.distance);
                boxesToAffect.push(octant[0]);
                // Add a second box from more populated octants
                if (octant.length > 3 && boxesToAffect.length < maxAffectedBoxes) {
                    boxesToAffect.push(octant[1]);
                }
            }
        });
        
        // Apply force to each affected box with improved directional bias
        boxesToAffect.forEach(item => {
            const box = item.box;
            const distance = item.distance;
            const direction = item.direction.clone();
            
            // Calculate force with quadratic falloff for more consistent force
            const forceMagnitude = explosionForce * Math.pow((1 - distance / explosionRadius), 2);
            
            // Adjust upward bias based on position
            const isBehindExplosion = direction.z < -0.3; // Is the block behind the explosion?
            const upwardBias = isBehindExplosion ? 0.15 : 0.3;
            direction.y += upwardBias;
            direction.normalize();
            
            // Apply impulse force
            box.applyImpulse(new CANNON.Vec3(
                direction.x * forceMagnitude,
                direction.y * forceMagnitude,
                direction.z * forceMagnitude
            ), box.position);
            
            // Add more rotation for more dynamic effect
            const rotationForce = 180 * (1 - distance / explosionRadius);
            box.angularVelocity.set(
                (Math.random() - 0.5) * rotationForce,
                (Math.random() - 0.5) * rotationForce,
                (Math.random() - 0.5) * rotationForce
            );
            
            // Ensure box is active in physics
            box.wakeUp();
        });
        
        // Remove the explosive ball after detonation
        const ballIndex = balls.indexOf(explosiveBall);
        if (ballIndex !== -1) {
            world.removeBody(explosiveBall);
            scene.remove(ballMeshes[ballIndex]);
            balls.splice(ballIndex, 1);
            ballMeshes.splice(ballIndex, 1);
        }
        
        // Return early as we've handled this collision
        return;
    }
    
    // Continue with normal collision handling
    checkBoxesOffPlatform();
}

function checkBoxesOffPlatform() {
    // Check each box to see if it's fallen off the platform
    for (let i = 0; i < boxes.length; i++) {
        // If box falls far below the platform or far to the sides, consider it "fallen off"
        if (boxes[i].position.y < -20 || 
            Math.abs(boxes[i].position.x) > 20 || 
            Math.abs(boxes[i].position.z) > 30) {
            
            // Remove box from physics world and scene
            world.removeBody(boxes[i]);
            scene.remove(boxMeshes[i]);
            
            // Update score
            score += 100;
            scoreElement.textContent = `Score: ${score}`;
            
            // Remove from arrays
            boxes.splice(i, 1);
            boxMeshes.splice(i, 1);
            i--;
        }
    }
    
    // Check if all boxes are cleared
    if (boxes.length === 0) {
        // Clean up any existing UI elements first
        if (victoryElement) {
            victoryElement.remove();
            victoryElement = null;
        }
        if (continueButton) {
            continueButton.remove();
            continueButton = null;
        }
        
        // Show victory message
        victoryElement = document.createElement('div');
        victoryElement.style.position = 'absolute';
        victoryElement.style.top = '50%';
        victoryElement.style.left = '50%';
        victoryElement.style.transform = 'translate(-50%, -50%)';
        victoryElement.style.color = 'white';
        victoryElement.style.fontFamily = 'Arial, sans-serif';
        victoryElement.style.fontSize = 'clamp(32px, 8vw, 48px)';
        victoryElement.style.background = 'rgba(0,0,0,0.7)';
        victoryElement.style.padding = '20px';
        victoryElement.style.borderRadius = '10px';
        victoryElement.style.textAlign = 'center';
        victoryElement.style.userSelect = 'none';
        victoryElement.className = 'victory-message';
        victoryElement.innerHTML = `Stage ${currentStage} Complete!<br>Score: ${score}`;
        document.body.appendChild(victoryElement);
        
        // Create continue button with hover and touch effects
        continueButton = document.createElement('button');
        continueButton.style.position = 'absolute';
        continueButton.style.top = '70%';
        continueButton.style.left = '50%';
        continueButton.style.transform = 'translate(-50%, -50%)';
        continueButton.style.color = 'white';
        continueButton.style.fontSize = 'clamp(16px, 5vw, 24px)';
        continueButton.style.backgroundColor = '#4CAF50';
        continueButton.style.padding = 'clamp(10px, 3vw, 15px) clamp(20px, 6vw, 30px)';
        continueButton.style.border = 'none';
        continueButton.style.borderRadius = '5px';
        continueButton.style.cursor = 'pointer';
        continueButton.style.transition = 'background-color 0.3s ease';
        continueButton.style.userSelect = 'none';
        continueButton.style.touchAction = 'manipulation';
        continueButton.textContent = 'Continue to Stage ' + (currentStage + 1);
        
        // Add hover and touch effects
        continueButton.addEventListener('mouseover', () => {
            continueButton.style.backgroundColor = '#45a049';
        });
        continueButton.addEventListener('mouseout', () => {
            continueButton.style.backgroundColor = '#4CAF50';
        });
        continueButton.addEventListener('touchstart', () => {
            continueButton.style.backgroundColor = '#45a049';
        });
        continueButton.addEventListener('touchend', () => {
            continueButton.style.backgroundColor = '#4CAF50';
        });
        
        document.body.appendChild(continueButton);
        
        // Add event listener to continue button
        continueButton.addEventListener('click', handleContinueClick);
        continueButton.addEventListener('touchend', handleContinueClick);
    }
}

function handleContinueClick(event) {
    event.preventDefault();
    if (victoryElement) {
        victoryElement.remove();
        victoryElement = null;
    }
    if (continueButton) {
        continueButton.remove();
        continueButton = null;
    }
    resetGame();
}

// Remove the incorrect animate function wrapper and add a proper animation function
function animate() {
    requestAnimationFrame(animate);
    
    // Move clouds
    if (clouds && clouds.length > 0) {
        clouds.forEach(cloud => {
            // Move clouds slowly across the sky
            cloud.mesh.position.x += cloud.speed;
            cloud.mesh.rotation.y += cloud.rotationSpeed;
            
            // If cloud moves too far, reset to the other side
            if (cloud.mesh.position.x > 300) {
                cloud.mesh.position.x = -500;
            }
        });
    }
    
    // Update physics world with smaller time steps for better collision detection
    const timeStep = 1/120;
    const maxSubSteps = 4;
    world.step(timeStep, 1/60, maxSubSteps);
    
    // Update visual positions based on physics
    for (let i = 0; i < boxes.length; i++) {
        boxMeshes[i].position.copy(boxes[i].position);
        boxMeshes[i].quaternion.copy(boxes[i].quaternion);
    }
    
    for (let i = 0; i < balls.length; i++) {
        ballMeshes[i].position.copy(balls[i].position);
        ballMeshes[i].quaternion.copy(balls[i].quaternion);
    }
    
    // Check for proximity detonation of explosive balls
    for (let i = 0; i < balls.length; i++) {
        const ball = balls[i];
        if (ball && ball.isExplosive) {
            let shouldDetonate = false;
            
            // Check if close to any box
            boxes.forEach(box => {
                if (!box || !box.position) return;
                
                const distanceVec = new CANNON.Vec3();
                box.position.vsub(ball.position, distanceVec);
                const distance = distanceVec.length();
                
                // Detonate if very close to a box
                if (distance < 2.0) {
                    shouldDetonate = true;
                }
            });
            
            // Handle detonation if needed
            if (shouldDetonate) {
                // Create explosion at ball position
                const position = new THREE.Vector3().copy(ball.position);
                createExplosion(position, 7);
                
                // Apply explosive force using same parameters as in ballCollision
                const explosionRadius = 6; // Increased from 5
                const explosionForce = 150000; // Increased from 120000
                const maxAffectedBoxes = 20; // Increased from 12
                
                // Find ALL boxes within explosion radius without any directional bias
                const boxesInRange = [];
                boxes.forEach(box => {
                    if (!box || !box.position) return;
                    
                    const distanceVec = new CANNON.Vec3();
                    box.position.vsub(position, distanceVec);
                    const distance = distanceVec.length();
                    
                    if (distance < explosionRadius) {
                        boxesInRange.push({
                            box: box,
                            distance: distance,
                            direction: distanceVec.unit() // Store normalized direction vector
                        });
                    }
                });
                
                // Instead of just picking closest, ensure directional diversity by using octants
                const boxesToAffect = [];
                
                // First, add some closest boxes regardless of direction for consistent core effect
                const closestBoxes = [...boxesInRange].sort((a, b) => a.distance - b.distance).slice(0, 8);
                closestBoxes.forEach(box => boxesToAffect.push(box));
                
                // Then select boxes from different 3D octants for directional diversity
                // This ensures boxes behind the explosion are also affected
                const octants = Array(8).fill().map(() => []);
                
                // Classify remaining boxes into octants (3D space divided into 8 sectors)
                boxesInRange
                    .filter(item => !closestBoxes.includes(item))
                    .forEach(item => {
                        const dir = item.direction;
                        const octantIndex = (dir.x > 0 ? 1 : 0) + 
                                          (dir.y > 0 ? 2 : 0) + 
                                          (dir.z > 0 ? 4 : 0);
                        octants[octantIndex].push(item);
                    });
                
                // Pick the closest box from each octant to ensure directional diversity
                octants.forEach(octant => {
                    if (octant.length > 0) {
                        octant.sort((a, b) => a.distance - b.distance);
                        boxesToAffect.push(octant[0]);
                        // Add a second box from more populated octants
                        if (octant.length > 3 && boxesToAffect.length < maxAffectedBoxes) {
                            boxesToAffect.push(octant[1]);
                        }
                    }
                });
                
                // Apply improved force to each affected box
                boxesToAffect.forEach(item => {
                    const box = item.box;
                    const distance = item.distance;
                    const direction = item.direction.clone();
                    
                    // Calculate force with quadratic falloff
                    const forceMagnitude = explosionForce * Math.pow((1 - distance / explosionRadius), 2);
                    
                    // Adjust upward bias based on position
                    const isBehindExplosion = direction.z < -0.3; // Is the block behind the explosion?
                    const upwardBias = isBehindExplosion ? 0.15 : 0.3;
                    direction.y += upwardBias;
                    direction.normalize();
                    
                    // Apply impulse force
                    box.applyImpulse(new CANNON.Vec3(
                        direction.x * forceMagnitude,
                        direction.y * forceMagnitude,
                        direction.z * forceMagnitude
                    ), box.position);
                    
                    // Add rotation
                    const rotationForce = 180 * (1 - distance / explosionRadius);
                    box.angularVelocity.set(
                        (Math.random() - 0.5) * rotationForce,
                        (Math.random() - 0.5) * rotationForce,
                        (Math.random() - 0.5) * rotationForce
                    );
                    
                    // Ensure box is active
                    box.wakeUp();
                });
                
                // Remove the ball
                if (ball.world) world.removeBody(ball);
                if (ballMeshes[i] && ballMeshes[i].parent) scene.remove(ballMeshes[i]);
                balls.splice(i, 1);
                ballMeshes.splice(i, 1);
                i--; // Adjust loop counter
                
                // Screen shake
                camera.position.x += (Math.random() - 0.5) * 0.15;
                camera.position.y += (Math.random() - 0.5) * 0.15;
                camera.position.z += (Math.random() - 0.5) * 0.15;
            }
        }
    }
    
    // Render the scene
    renderer.render(scene, camera);
}

// Add a muzzle flash effect when firing
function createMuzzleFlash(position, direction) {
    // Create a point light for the flash
    const flashLight = new THREE.PointLight(0xffaa00, 3, 4);
    flashLight.position.copy(position);
    scene.add(flashLight);
    
    // Create a small particle for the flash
    const flashGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        transparent: true,
        opacity: 0.8
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(position);
    scene.add(flash);
    
    // Animate the flash
    const startScale = 1;
    const endScale = 2;
    const duration = 200; // milliseconds
    const startTime = Date.now();
    
    function animateFlash() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Scale and fade out
        const scale = startScale + (endScale - startScale) * progress;
        flash.scale.set(scale, scale, scale);
        flash.material.opacity = 0.8 * (1 - progress);
        flashLight.intensity = 3 * (1 - progress);
        
        if (progress < 1) {
            requestAnimationFrame(animateFlash);
        } else {
            // Remove the flash when animation is complete
            scene.remove(flash);
            scene.remove(flashLight);
        }
    }
    
    // Start animation
    animateFlash();
}

function resetGame() {
    // Remove all existing boxes and balls
    for (let i = boxes.length - 1; i >= 0; i--) {
        world.removeBody(boxes[i]);
        scene.remove(boxMeshes[i]);
    }
    boxes = [];
    boxMeshes = [];
    
    for (let i = balls.length - 1; i >= 0; i--) {
        world.removeBody(balls[i]);
        scene.remove(ballMeshes[i]);
    }
    balls = [];
    ballMeshes = [];
    
    // Clean up any remaining UI elements
    if (victoryElement) {
        victoryElement.remove();
        victoryElement = null;
    }
    if (continueButton) {
        continueButton.remove();
        continueButton = null;
    }
    if (infoElement) {
        infoElement.remove();
        infoElement = null;
    }
    
    // Update stage
    currentStage++;
    
    // Create new boxes for the next stage
    createBoxes();
    
    // Update stage display with animation
    const stageElement = document.getElementById('stage');
    if (stageElement) {
        stageElement.style.transform = 'scale(1.5)';
        stageElement.style.transition = 'transform 0.3s ease-out';
        setTimeout(() => {
            stageElement.style.transform = 'scale(1)';
        }, 300);
    }
    
    // Add stage transition effect
    const transitionOverlay = document.createElement('div');
    transitionOverlay.style.position = 'fixed';
    transitionOverlay.style.top = '0';
    transitionOverlay.style.left = '0';
    transitionOverlay.style.width = '100%';
    transitionOverlay.style.height = '100%';
    transitionOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    transitionOverlay.style.transition = 'opacity 0.5s ease-out';
    transitionOverlay.style.pointerEvents = 'none';
    document.body.appendChild(transitionOverlay);
    
    // Fade out the overlay
    setTimeout(() => {
        transitionOverlay.style.opacity = '0';
        setTimeout(() => {
            transitionOverlay.remove();
        }, 500);
    }, 100);
    
    // Update game state
    gameStarted = true;
    
    // Reset explosion shot
    hasExplosionShot = true;
    isExplosionShotActive = false;
    updateExplosionButton();
}

function onTouchStart(event) {
    event.preventDefault();
    if (!cannonMesh) return;
    
    isTouching = true;
    const touch = event.touches[0];
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
    
    // Update cannon aim immediately on touch start
    updateCannonAim(touch.clientX, touch.clientY);
}

function onTouchMove(event) {
    event.preventDefault();
    if (!cannonMesh || !isTouching) return;
    
    const touch = event.touches[0];
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
    
    // Update cannon aim during touch move
    updateCannonAim(touch.clientX, touch.clientY);
}

function onTouchEnd(event) {
    event.preventDefault();
    if (isTouching) {
        isTouching = false;
        // Only shoot if we haven't moved too far from the start position
        const touch = event.changedTouches[0];
        const moveDistance = Math.hypot(touch.clientX - lastTouchX, touch.clientY - lastTouchY);
        if (moveDistance < 20) { // Only shoot if the touch hasn't moved too much
            shootBall();
        }
    }
}

function createExplosionButton() {
    explosionButton = document.createElement('button');
    explosionButton.id = 'explosion-button';
    explosionButton.style.position = 'fixed';
    explosionButton.style.bottom = '20px';
    explosionButton.style.right = '20px';
    explosionButton.style.width = 'clamp(50px, 15vw, 80px)';
    explosionButton.style.height = 'clamp(50px, 15vw, 80px)';
    explosionButton.style.borderRadius = '50%';
    explosionButton.style.backgroundColor = '#ff4444';
    explosionButton.style.border = '3px solid #ffffff';
    explosionButton.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    explosionButton.style.cursor = 'pointer';
    explosionButton.style.display = 'flex';
    explosionButton.style.justifyContent = 'center';
    explosionButton.style.alignItems = 'center';
    explosionButton.style.transition = 'transform 0.2s, opacity 0.3s';
    explosionButton.style.touchAction = 'manipulation';
    explosionButton.style.zIndex = '1000'; // Ensure button is above other elements
    
    // Replace emoji with SVG explosion icon (more reliable than emoji)
    explosionButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="70%" height="70%">
            <!-- Center burst -->
            <circle cx="50" cy="50" r="15" fill="#FFFF00" />
            
            <!-- Explosion rays -->
            <polygon points="50,50 65,20 55,50 85,35 60,55 90,65 60,65 75,90 50,70 35,95 40,65 10,75 35,55 15,30 45,45" fill="#FF5500" />
            
            <!-- Small particles -->
            <circle cx="75" cy="30" r="3" fill="#FFCC00" />
            <circle cx="20" cy="40" r="4" fill="#FFCC00" />
            <circle cx="30" cy="80" r="3" fill="#FFCC00" />
            <circle cx="80" cy="75" r="4" fill="#FFCC00" />
        </svg>
    `;
    
    // Add hover and active states
    explosionButton.addEventListener('mouseover', () => {
        if (hasExplosionShot) explosionButton.style.transform = 'scale(1.1)';
    });
    explosionButton.addEventListener('mouseout', () => {
        explosionButton.style.transform = 'scale(1)';
    });
    
    // Add click/touch handlers with stopPropagation
    explosionButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event from bubbling up
        activateExplosionShot();
    });
    
    explosionButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event from bubbling up
        activateExplosionShot();
    });
    
    // Update button state
    updateExplosionButton();
    
    document.body.appendChild(explosionButton);
}

function updateExplosionButton() {
    if (!explosionButton) return;
    
    if (hasExplosionShot) {
        explosionButton.style.opacity = '1';
        explosionButton.style.cursor = 'pointer';
        explosionButton.style.backgroundColor = '#ff4444';
    } else {
        explosionButton.style.opacity = '0.5';
        explosionButton.style.cursor = 'not-allowed';
        explosionButton.style.backgroundColor = '#666666';
    }
}

function activateExplosionShot() {
    if (!hasExplosionShot) return;
    
    isExplosionShotActive = true;
    hasExplosionShot = false;
    updateExplosionButton();
    
    // Visual feedback
    explosionButton.style.transform = 'scale(0.9)';
    setTimeout(() => {
        explosionButton.style.transform = 'scale(1)';
    }, 100);
}

// Update createExplosion function for more impressive visuals
function createExplosion(position, size = 7) {
    // Ensure we have a valid position
    if (!position) {
        position = new THREE.Vector3(0, 10, 0);
    }
    
    // Define vibrant colors for particles and lights
    const colors = [0xffff66, 0xff3300, 0xff9900, 0xffcc00];
    const lights = [];
    
    // Create central light
    const centralLight = new THREE.PointLight(0xffaa00, 25, size * 1.0);
    centralLight.position.copy(position);
    scene.add(centralLight);
    lights.push(centralLight);
    
    // Create surrounding lights
    const lightCount = 4;
    for (let i = 0; i < lightCount; i++) {
        const light = new THREE.PointLight(
            [0xff5500, 0xff2200, 0xffcc00, 0xffff00][i % 4],
            15,
            size * 0.8
        );
        
        light.position.set(
            position.x + (Math.random() - 0.5) * size * 0.3,
            position.y + (Math.random() - 0.5) * size * 0.3,
            position.z + (Math.random() - 0.5) * size * 0.3
        );
        
        scene.add(light);
        lights.push(light);
    }
    
    // Create particles
    const particleCount = 120; // Doubled from 60 for more visible effect
    const particles = [];
    
    // Create a particle system for trails
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(particleCount * 3 * 10); // Each particle can have up to 10 trail points
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    
    const trailMaterial = new THREE.LineBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.7,
        linewidth: 1
    });
    
    const trailLines = [];
    
    // Color gradient for particles
    const particleColors = [
        0xffff00, // Yellow
        0xff6600, // Orange
        0xff3300, // Dark orange
        0xff0000, // Red
        0xff9900  // Light orange
    ];
    
    for (let i = 0; i < particleCount; i++) {
        // Create LARGER particles with more varied sizes
        const particleSize = Math.random() * size * 0.15 + size * 0.05; // Much larger particles
        const geometry = new THREE.SphereGeometry(particleSize, 8, 8);
        
        // Use a brighter material
        const color = particleColors[Math.floor(Math.random() * particleColors.length)];
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);
        
        // Initial velocity in random direction, but with HIGHER speed
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        const speed = size * (1.2 + Math.random() * 1.0); // Much higher speed
        
        particle.velocity = new THREE.Vector3(
            Math.sin(theta) * Math.cos(phi) * speed,
            Math.sin(theta) * Math.sin(phi) * speed + (Math.random() * 1.5), // More upward drift
            Math.cos(theta) * speed
        );
        
        // LONGER lifetime for particles
        particle.life = 1.0 + Math.random() * 1.5; // Much longer lifetime
        
        // Create trail for each particle
        particle.trail = [];
        particle.trailLength = 8; // Longer trails
        
        // Create line for trail
        const lineGeometry = new THREE.BufferGeometry();
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.7
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        trailLines.push(line);
        particle.trailLine = line;
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Create central flash with glow effect
    const flashGeometry = new THREE.SphereGeometry(size * 0.4, 32, 32); // Larger flash
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(position);
    scene.add(flash);
    
    // Add a bright point light at the explosion center for dramatic lighting
    const explosionLight = new THREE.PointLight(0xffffff, 5, size * 5);
    explosionLight.position.copy(position);
    scene.add(explosionLight);
    
    // Create expanding fire sphere for core explosion
    const fireSphereGeometry = new THREE.SphereGeometry(size * 0.3, 32, 32);
    const fireSphereMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.9
    });
    const fireSphere = new THREE.Mesh(fireSphereGeometry, fireSphereMaterial);
    fireSphere.position.copy(position);
    scene.add(fireSphere);
    
    // Create improved shockwave rings
    const shockwaveCount = 4; // More shockwaves
    const shockwaves = [];
    
    // Shockwave colors with higher intensity
    const shockwaveColors = [0xffff00, 0xff6600, 0xff3300, 0xff0000];
    
    for (let i = 0; i < shockwaveCount; i++) {
        // Thicker rings for better visibility
        const shockwaveGeometry = new THREE.RingGeometry(0.3, 0.6, 32);
        const shockwaveMaterial = new THREE.MeshBasicMaterial({
            color: shockwaveColors[i % shockwaveColors.length],
            transparent: true,
            opacity: 0.9, // Higher opacity
            side: THREE.DoubleSide
        });
        
        const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
        shockwave.position.copy(position);
        shockwave.lookAt(camera.position);
        shockwave.startDelay = i * 0.08; // Staggered but closer together
        scene.add(shockwave);
        shockwaves.push(shockwave);
    }
    
    // Create secondary particles for sparks
    const sparkCount = 30;
    const sparks = [];
    
    for (let i = 0; i < sparkCount; i++) {
        const sparkGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const sparkMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 1
        });
        
        const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
        spark.position.copy(position);
        
        // Random direction but faster speed for sparks
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        const speed = size * (1.5 + Math.random() * 2.0); // Even faster than particles
        
        spark.velocity = new THREE.Vector3(
            Math.sin(theta) * Math.cos(phi) * speed,
            Math.sin(theta) * Math.sin(phi) * speed + 1,
            Math.cos(theta) * speed
        );
        
        spark.life = 0.5 + Math.random() * 0.5; // Shorter life than main particles
        
        scene.add(spark);
        sparks.push(spark);
    }
    
    // Add depth-enhancing features - particles that specifically move in Z direction
    const depthParticleCount = 15;
    const depthParticles = [];
    
    for (let i = 0; i < depthParticleCount; i++) {
        // Create depth particles with elongated shape for better Z-motion perception
        const length = Math.random() * 0.7 + 0.3;
        const depthGeometry = new THREE.CylinderGeometry(0.1, 0.1, length, 8);
        const depthMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.9
        });
        
        const depthParticle = new THREE.Mesh(depthGeometry, depthMaterial);
        depthParticle.position.copy(position);
        
        // Rotate to align with Z axis
        depthParticle.rotation.x = Math.PI / 2;
        
        // Create velocity primarily along z-axis (forward/backward) for depth effect
        const zDirection = i % 2 === 0 ? 1 : -1; // Alternate forward/backward
        const zStrength = 0.7 + Math.random() * 0.3; // Strong Z component
        
        depthParticle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * size * 0.3,
            (Math.random() - 0.5) * size * 0.3,
            zDirection * zStrength * size * 1.5
        );
        
        depthParticle.life = 0.7 + Math.random() * 0.8;
        
        scene.add(depthParticle);
        depthParticles.push(depthParticle);
    }
    
    // Setup animation with LONGER duration
    const clock = new THREE.Clock();
    const startTime = clock.getElapsedTime();
    const duration = 2.5; // Longer duration (was 1.5)
    
    function animateExplosion() {
        const elapsed = clock.getElapsedTime() - startTime;
        const progress = Math.min(1.0, elapsed / duration);
        
        // Update central explosion light
        explosionLight.intensity = 5 * (1 - progress * progress);
        explosionLight.distance = size * (5 + progress * 5);
        
        // Update central fire sphere
        if (fireSphere.parent) {
            fireSphere.scale.set(
                1 + elapsed * 6,
                1 + elapsed * 6,
                1 + elapsed * 6
            );
            fireSphere.material.opacity = Math.max(0, 0.9 - elapsed * 1.2);
            
            // Add pulsating effect
            const pulseScale = 1 + Math.sin(elapsed * 20) * 0.05;
            fireSphere.scale.multiplyScalar(pulseScale);
        }
        
        // Update sparks
        for (let i = 0; i < sparks.length; i++) {
            const spark = sparks[i];
            if (!spark.parent) continue;
            
            // Move spark faster
            spark.position.add(spark.velocity);
            
            // Rapidly fade out
            spark.material.opacity = Math.max(0, 1 - elapsed / spark.life);
            
            // Add gravity effect
            spark.velocity.y -= 0.1;
            
            // Remove if faded out
            if (spark.material.opacity <= 0.1) {
                scene.remove(spark);
            }
        }
        
        // Update particles
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            
            // Move particle
            particle.position.add(particle.velocity);
            
            // SLOWER fade out based on lifetime for longer visible particles
            particle.material.opacity = Math.max(0, 1 - (elapsed / particle.life) * 0.8);
            
            // Add MORE turbulence for chaotic motion
            particle.velocity.x += (Math.random() - 0.5) * size * 0.08;
            particle.velocity.y += (Math.random() - 0.5) * size * 0.08 + 0.04; // More upward drift
            particle.velocity.z += (Math.random() - 0.5) * size * 0.08;
            
            // Update trail
            if (particle.trail) {
                particle.trail.unshift(particle.position.clone());
                if (particle.trail.length > particle.trailLength) {
                    particle.trail.pop();
                }
                
                // Update trail line
                if (particle.trailLine && particle.trail.length > 1) {
                    const positions = [];
                    for (let j = 0; j < particle.trail.length; j++) {
                        positions.push(particle.trail[j].x, particle.trail[j].y, particle.trail[j].z);
                    }
                    
                    // Update trail geometry
                    particle.trailLine.geometry.dispose();
                    const lineGeometry = new THREE.BufferGeometry();
                    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                    particle.trailLine.geometry = lineGeometry;
                    
                    // Make trail fade out toward the end
                    particle.trailLine.material.opacity = particle.material.opacity * 0.7;
                }
            }
            
            // Add rotation to particles for more dynamic movement
            particle.rotation.x += 0.05;
            particle.rotation.y += 0.05;
            particle.rotation.z += 0.05;
            
            // Scale particles slightly based on elapsed time
            const scale = 1.0 - 0.3 * (elapsed / particle.life);
            particle.scale.set(scale, scale, scale);
        }
        
        // Update lights
        lights.forEach((light, index) => {
            if (index === 0) { // Central light
                light.intensity = 25 * (1 - progress);
            } else {
                light.intensity = 15 * (1 - progress) * (0.8 + Math.random() * 0.4);
            }
            
            // Expand light radius
            light.distance = size * (1.0 + progress * 1.0);
            
            // Add subtle movement to non-central lights
            if (index > 0) {
                light.position.x += (Math.random() - 0.5) * 0.1;
                light.position.y += (Math.random() - 0.5) * 0.1;
                light.position.z += (Math.random() - 0.5) * 0.1;
            }
        });
        
        // Update central flash with more dramatic scaling
        if (elapsed < 0.4) { // Longer flash duration
            flash.scale.set(
                1 + elapsed * 12, // More dramatic expansion
                1 + elapsed * 12,
                1 + elapsed * 12
            );
            flash.material.opacity = Math.max(0, 1 - elapsed * 3.5);
        } else if (flash.parent) {
            scene.remove(flash);
        }
        
        // Update shockwaves with improved animation
        shockwaves.forEach((shockwave, index) => {
            const shockwaveProgress = Math.max(0, (elapsed - shockwave.startDelay) / duration);
            if (shockwaveProgress > 0) {
                // Faster expansion and larger maximum size
                const expansionSpeed = 3.0 + index * 0.6;
                const maxSize = size * (1.2 - index * 0.1);
                
                // Expand ring with easing for realistic physics
                const easeOut = 1 - Math.pow(1 - Math.min(1, shockwaveProgress), 3); // Cubic ease-out
                const newRadius = Math.min(maxSize, easeOut * size * expansionSpeed);
                const scale = newRadius / 0.45; // Scale relative to initial geometry size
                shockwave.scale.set(scale, scale, scale);
                
                // More dramatic fade with flash at beginning
                let opacity;
                if (shockwaveProgress < 0.1) {
                    // Initial flash
                    opacity = 0.9;
                } else {
                    // Gradual fade with longer persistence
                    opacity = Math.max(0, 0.9 - (shockwaveProgress - 0.1) * 1.0);
                }
                shockwave.material.opacity = opacity;
                
                // Keep facing camera
                shockwave.lookAt(camera.position);
                
                // Color shift effect - transition from yellow to red
                if (shockwaveProgress < 0.5) {
                    const colorProgress = shockwaveProgress / 0.5;
                    const r = 1.0;
                    const g = 1.0 - colorProgress * 0.8;
                    const b = 0;
                    shockwave.material.color.setRGB(r, g, b);
                }
            }
        });
        
        // Update depth particles
        for (let i = 0; i < depthParticles.length; i++) {
            const particle = depthParticles[i];
            if (!particle.parent) continue;
            
            // Move depth particle
            particle.position.add(particle.velocity);
            
            // Scale based on Z position to enhance depth perception
            // Objects appear smaller as they move away from camera
            const zDistanceFromCamera = Math.abs(camera.position.z - particle.position.z);
            const scaleFromZ = Math.max(0.3, 1.0 - (zDistanceFromCamera / 20));
            particle.scale.set(scaleFromZ, 1, scaleFromZ);
            
            // Fade out
            particle.material.opacity = Math.max(0, 1 - elapsed / particle.life);
            
            // Add z-specific turbulence for more depth movement
            particle.velocity.z += (Math.random() - 0.5) * 0.1;
            
            // Rotate to emphasize movement
            particle.rotation.z += 0.1;
        }
        
        // Cleanup when animation completes
        if (elapsed > duration) {
            // Remove sparks
            sparks.forEach(spark => {
                if (spark.parent) scene.remove(spark);
            });
            
            // Remove fire sphere and explosion light
            if (fireSphere.parent) scene.remove(fireSphere);
            if (explosionLight.parent) scene.remove(explosionLight);
            
            // Remove all particles and their trails
            particles.forEach((particle, index) => {
                if (particle.parent) scene.remove(particle);
                if (trailLines[index] && trailLines[index].parent) scene.remove(trailLines[index]);
            });
            
            // Remove all lights
            lights.forEach(light => {
                if (light.parent) scene.remove(light);
            });
            
            // Remove all shockwaves
            shockwaves.forEach(shockwave => {
                if (shockwave.parent) scene.remove(shockwave);
            });
        } else {
            requestAnimationFrame(animateExplosion);
        }
    }
    
    // Start animation
    animateExplosion();
}
