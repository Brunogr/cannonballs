// Game variables
let world, scene, camera, renderer, controls;
let timeStep = 1/60;
let cannonBody, cannonMesh;
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

// Define clouds array for animation
let clouds = [];

// Initialize the game
window.addEventListener('load', init);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', shootBall);

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
    scoreElement.style.fontSize = '24px';
    scoreElement.style.fontFamily = 'Arial, sans-serif';
    scoreElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
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
    // Parameters for box arrangement - scale with stage
    const boxSize = 1;
    const baseNumRows = 4;
    const baseNumPerRow = 5;
    
    // Increase difficulty with stage
    const numRows = Math.min(baseNumRows + Math.floor(currentStage / 2), 7); // Cap at 7 rows
    const numPerRow = Math.min(baseNumPerRow + Math.floor(currentStage / 3), 8); // Cap at 8 per row
    
    // Adjust start height to match platform position
    const startHeight = -6 + 1 + boxSize/2;
    
    // Create stacked boxes
    for (let row = 0; row < numRows; row++) {
        const y = startHeight + boxSize * row;
        const rowOffset = (row % 2) * 0.5; // Offset every other row
        
        const boxesInThisRow = numPerRow - (row % 2);
        
        for (let i = 0; i < boxesInThisRow; i++) {
            const boxShape = new CANNON.Box(new CANNON.Vec3(boxSize/2, boxSize/2, boxSize/2));
            const boxBody = new CANNON.Body({ 
                mass: 5 + (currentStage * 0.5), // Boxes get slightly heavier each stage
                material: world.defaultMaterial,
                angularDamping: 0.3,
                linearDamping: 0.1
            });
            boxBody.addShape(boxShape);
            
            const x = (i - (boxesInThisRow - 1) / 2) * (boxSize + 0.1) + rowOffset;
            boxBody.position.set(x, y, platformZ);
            
            // Add some random rotation to make it more interesting
            boxBody.quaternion.setFromEuler(
                Math.random() * 0.1,
                Math.random() * 0.1,
                Math.random() * 0.1
            );
            
            world.addBody(boxBody);
            boxes.push(boxBody);
            
            // Visual box - make them more colorful with stage-based colors
            const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
            
            // Use different color schemes for different stages
            const colorSchemes = [
                [0xFF5733, 0x33FF57, 0x3357FF, 0xFFFF33], // Stage 1
                [0xFF33FF, 0x33FFFF, 0xFFFF33, 0xFF3333], // Stage 2
                [0x00FF00, 0xFF0000, 0x0000FF, 0xFFFF00], // Stage 3
                [0xFF00FF, 0x00FFFF, 0xFFFF00, 0xFF0000]  // Stage 4+
            ];
            
            const schemeIndex = Math.min(currentStage - 1, colorSchemes.length - 1);
            const colors = colorSchemes[schemeIndex];
            
            const boxMaterial = new THREE.MeshStandardMaterial({
                color: colors[row % colors.length],
                roughness: 0.5,
                metalness: 0.5
            });
            
            const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
            boxMesh.castShadow = true;
            boxMesh.receiveShadow = true;
            scene.add(boxMesh);
            boxMeshes.push(boxMesh);
        }
    }
    
    // Update stage display
    const stageElement = document.getElementById('stage') || createStageDisplay();
    stageElement.textContent = `Stage ${currentStage}`;
}

function createStageDisplay() {
    const stageElement = document.createElement('div');
    stageElement.id = 'stage';
    stageElement.style.position = 'absolute';
    stageElement.style.top = '60px';
    stageElement.style.left = '20px';
    stageElement.style.color = 'white';
    stageElement.style.fontSize = '24px';
    stageElement.style.fontFamily = 'Arial, sans-serif';
    stageElement.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
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
    
    // Update the global mouse variable
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
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
    
    // Ball properties
    const ballRadius = 0.5; 
    const ballMass = 5;
    
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
    const shootVelocity = 50;
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
    
    // Create visual ball
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0.4,
        metalness: 0.7
    });
    const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
    ballMesh.castShadow = true;
    ballMesh.receiveShadow = true;
    scene.add(ballMesh);
    ballMeshes.push(ballMesh);
    
    // Add muzzle flash effect at the barrel tip
    createMuzzleFlash(barrelTip, shootDirection);
    
    // Limit the number of balls
    if (balls.length > 10) {
        world.removeBody(balls[0]);
        scene.remove(ballMeshes[0]);
        balls.shift();
        ballMeshes.shift();
    }
}

function ballCollision(event) {
    console.log("Ball collision detected!", event);
        
    // Check if boxes have fallen off the platform
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
        victoryElement.style.fontSize = '48px';
        victoryElement.style.background = 'rgba(0,0,0,0.7)';
        victoryElement.style.padding = '20px';
        victoryElement.style.borderRadius = '10px';
        victoryElement.style.textAlign = 'center';
        victoryElement.innerHTML = `Stage ${currentStage} Complete!<br>Score: ${score}`;
        document.body.appendChild(victoryElement);
        
        // Create continue button with hover effect
        continueButton = document.createElement('button');
        continueButton.style.position = 'absolute';
        continueButton.style.top = '70%';
        continueButton.style.left = '50%';
        continueButton.style.transform = 'translate(-50%, -50%)';
        continueButton.style.color = 'white';
        continueButton.style.fontSize = '24px';
        continueButton.style.backgroundColor = '#4CAF50';
        continueButton.style.padding = '15px 30px';
        continueButton.style.border = 'none';
        continueButton.style.borderRadius = '5px';
        continueButton.style.cursor = 'pointer';
        continueButton.style.transition = 'background-color 0.3s ease';
        continueButton.textContent = 'Continue to Stage ' + (currentStage + 1);
        
        // Add hover effect
        continueButton.addEventListener('mouseover', () => {
            continueButton.style.backgroundColor = '#45a049';
        });
        continueButton.addEventListener('mouseout', () => {
            continueButton.style.backgroundColor = '#4CAF50';
        });
        
        document.body.appendChild(continueButton);
        
        // Add event listener to continue button
        continueButton.addEventListener('click', () => {
            // Reset the game
            if (victoryElement) {
                victoryElement.remove();
                victoryElement = null;
            }
            if (continueButton) {
                continueButton.remove();
                continueButton = null;
            }
            resetGame();
        });
    }
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
                cloud.mesh.position.x = -300;
            }
        });
    }
    
    // Update physics world with smaller time steps for better collision detection
    const timeStep = 1/120; // More frequent updates
    const maxSubSteps = 4; // Allow multiple substeps per frame
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
}
