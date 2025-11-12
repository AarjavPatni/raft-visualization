let network;
let visualization;
let isRunning = true;
let speedMultiplier = 1;
let lastUpdateTime = 0;

let requestCounter = 0;

function setup() {
    const canvas = createCanvas(800, 600);
    canvas.parent('p5-canvas');
    
    network = new RaftNetwork();
    visualization = new Visualization();
    visualization.setup(canvas);
    
    createInitialCluster();
    
    network.setSpeedMultiplier(speedMultiplier);
    
    console.log('Raft visualization initialized');
}

function draw() {
    if (!network || !visualization) return;
    
    const currentTime = millis();
    const deltaTime = currentTime - lastUpdateTime;
    lastUpdateTime = currentTime;
    
    if (isRunning) {
        network.update(deltaTime);
    }
    
    visualization.draw(network);
    
    updateStatusDisplay();
}

function createInitialCluster() {
    const nodeCount = 5;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = min(width, height) * 0.3;
    
    for (let i = 0; i < nodeCount; i++) {
        const angle = (i / nodeCount) * TWO_PI - PI/2;
        const x = centerX + cos(angle) * radius;
        const y = centerY + sin(angle) * radius;
        
        const node = new RaftNode(i, x, y);
        network.addNode(node);
    }
    
    console.log(`Created cluster with ${nodeCount} nodes`);
}

function updateStatusDisplay() {
    const statusElement = document.getElementById('status');
    const stats = network.getStatistics();
    
    if (statusElement) {
        statusElement.innerHTML = `
            Term: ${stats.currentTerm}<br>
            Leader: ${stats.leader}<br>
            Nodes: ${stats.aliveNodes}/${stats.totalNodes}<br>
            Messages: ${stats.activeMessages}<br>
            Speed: ${speedMultiplier}x<br>
            ${stats.partitionsActive ? '<span style="color: #f44336;">PARTITIONED</span>' : ''}
        `;
    }
    
    const speedValueElement = document.getElementById('speedValue');
    if (speedValueElement) {
        speedValueElement.textContent = `${speedMultiplier}x`;
    }
}

function mousePressed() {
    visualization.handleMousePressed(network);
}

function mouseReleased() {
    visualization.handleMouseReleased(network);
}

function mouseDragged() {
    visualization.handleMouseDragged(network);
}

function keyPressed() {
    visualization.handleKeyPressed(key, network);
}

function toggleSimulation() {
    isRunning = !isRunning;
    console.log(`Simulation ${isRunning ? 'resumed' : 'paused'}`);
}

function resetSimulation() {
    network.reset();
    network.setSpeedMultiplier(speedMultiplier);
    isRunning = true;
    requestCounter = 0;
    console.log('Simulation reset');
}

function stepSimulation() {
    if (!isRunning) {
        const currentTime = millis();
        const deltaTime = currentTime - lastUpdateTime;
        lastUpdateTime = currentTime;
        network.update(deltaTime);
        console.log('Simulation stepped');
    }
}

function updateSpeed(value) {
    speedMultiplier = parseInt(value);
    network.setSpeedMultiplier(speedMultiplier);
}

function addNode() {
    const nodeCount = network.nodes.size;
    if (nodeCount >= 9) {
        console.log('Maximum of 9 nodes allowed');
        return;
    }
    
    const x = random(100, width - 100);
    const y = random(100, height - 100);
    
    const newNode = new RaftNode(nodeCount, x, y);
    network.addNode(newNode);
    
    console.log(`Added node ${nodeCount}`);
}

function removeNode() {
    const aliveNodes = network.getAliveNodes();
    if (aliveNodes.length <= 1) {
        console.log('Cannot remove the last node');
        return;
    }
    
    const nodeIds = Array.from(network.nodes.keys()).sort((a, b) => b - a);
    const nodeToRemove = nodeIds[0];
    
    network.removeNode(nodeToRemove);
    console.log(`Removed node ${nodeToRemove}`);
}

function killRandomNode() {
    const killedNode = network.killRandomNode();
    if (killedNode) {
        console.log(`Killed node ${killedNode.id}`);
    } else {
        console.log('No nodes available to kill');
    }
}

function reviveAll() {
    network.reviveAllNodes();
    console.log('All nodes revived');
}

function createPartition() {
    const aliveNodes = network.getAliveNodes();
    if (aliveNodes.length < 3) {
        console.log('Need at least 3 alive nodes to create partition');
        return;
    }
    
    const shuffled = [...aliveNodes].sort(() => random() - 0.5);
    const mid = floor(shuffled.length / 2);
    const group1 = shuffled.slice(0, mid).map(n => n.id);
    const group2 = shuffled.slice(mid).map(n => n.id);
    
    network.partition(group1, group2);
    console.log(`Created partition: Group 1: ${group1.join(',')}, Group 2: ${group2.join(',')}`);
}

function healPartition() {
    network.healPartition();
    console.log('Network partition healed');
}

function addLatency() {
    network.addLatency(50);
    console.log(`Added 50ms latency (total: ${network.latency}ms)`);
}

function sendRequest() {
    requestCounter++;
    const command = `REQUEST_${requestCounter}`;
    const entry = network.addClientRequest(command);
    
    if (entry) {
        console.log(`Sent client request: ${command}`);
    } else {
        console.log('No leader available to handle request');
    }
}

function sendBurst() {
    let sentCount = 0;
    for (let i = 0; i < 5; i++) {
        requestCounter++;
        const command = `BURST_${requestCounter}`;
        const entry = network.addClientRequest(command);
        if (entry) sentCount++;
    }
    
    console.log(`Sent burst of ${sentCount} requests`);
}

function windowResized() {
}

function exportVisualization() {
    visualization.exportScreenshot();
    console.log('Screenshot exported');
}

function showHelp() {
    const helpText = `
Raft Consensus Protocol Visualization Help:

Mouse Controls:
- Click: Select node
- Double-click: Kill/revive node
- Drag: Move node

Keyboard Shortcuts:
- SPACE: Pause/resume
- R: Arrange nodes in circle
- Q: Arrange nodes in grid
- D: Toggle debug info
- G: Toggle background grid
- M: Toggle metrics
- K: Kill random node
- P: Create random partition
- H: Heal partition

Node States:
- Blue: Follower
- Orange: Candidate
- Gold: Leader
- Gray: Dead

Features:
- Real-time Raft consensus simulation
- Interactive network partitions
- Message visualization
- Performance metrics
- Speed control
- Node failure simulation
    `;
    
    console.log(helpText);
    alert(helpText);
}

window.showHelp = showHelp;

setTimeout(() => {
    if (network && network.nodes.size > 0) {
        console.log('Raft cluster initialized. Leader election will begin naturally...');
        console.log('Tip: The simulation is now running at a comfortable pace for observation.');
        console.log('Use the speed slider to adjust if needed, or press SPACE to pause.');
    }
}, 2000);
