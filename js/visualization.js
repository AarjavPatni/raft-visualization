class Visualization {
    constructor() {
        this.canvas = null;
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this.background = color(26, 26, 26);
        
        // UI state
        this.selectedNode = null;
        this.draggingNode = null;
        this.dragOffset = { x: 0, y: 0 };
        this.showDebugInfo = false;
        this.lastFrameTime = millis();
        this.frameCount = 0;
        this.fps = 60;
        
        // Animation state
        this.nodePositions = [];
        this.gridSpacing = 150;
        this.centerX = 0;
        this.centerY = 0;
        
        // Interaction state
        this.mouseDown = false;
        this.lastClickTime = 0;
        this.doubleClickThreshold = 300;
        
        // Visual effects
        this.backgroundGrid = true;
        this.showMetrics = true;
        this.showConnections = true;
        
        this.initializePositions();
    }
    
    initializePositions() {
        // Calculate positions for nodes in a circle
        this.centerX = this.canvasWidth / 2;
        this.centerY = this.canvasHeight / 2;
        this.radius = min(this.canvasWidth, this.canvasHeight) * 0.3;
    }
    
    setup(canvas) {
        this.canvas = canvas;
        this.canvasWidth = canvas.canvas.width;
        this.canvasHeight = canvas.canvas.height;
        this.initializePositions();
    }
    
    arrangeNodesInCircle(nodes) {
        const nodeArray = Array.from(nodes.values());
        const nodeCount = nodeArray.length;
        
        nodeArray.forEach((node, index) => {
            const angle = (index / nodeCount) * TWO_PI - PI/2; // Start from top
            node.x = this.centerX + cos(angle) * this.radius;
            node.y = this.centerY + sin(angle) * this.radius;
        });
    }
    
    arrangeNodesInGrid(nodes) {
        const nodeArray = Array.from(nodes.values());
        const cols = ceil(sqrt(nodeArray.length));
        const rows = ceil(nodeArray.length / cols);
        
        const startX = this.centerX - (cols - 1) * this.gridSpacing / 2;
        const startY = this.centerY - (rows - 1) * this.gridSpacing / 2;
        
        nodeArray.forEach((node, index) => {
            const col = index % cols;
            const row = floor(index / cols);
            node.x = startX + col * this.gridSpacing;
            node.y = startY + row * this.gridSpacing;
        });
    }
    
    draw(network) {
        // Update FPS
        this.updateFPS();
        
        // Clear background
        background(this.background);
        
        // Draw background grid
        if (this.backgroundGrid) {
            this.drawBackgroundGrid();
        }
        
        // Draw network
        network.draw();
        
        // Draw UI overlays
        this.drawMetrics(network);
        
        // Draw debug info if enabled
        if (this.showDebugInfo) {
            this.drawDebugInfo(network);
        }
        
        // Draw selection highlight
        if (this.selectedNode) {
            this.drawNodeSelection(this.selectedNode);
        }
        
        // Draw mouse interaction feedback
        this.drawInteractionFeedback();
    }
    
    drawBackgroundGrid() {
        push();
        stroke(40, 40, 40);
        strokeWeight(1);
        
        // Vertical lines
        for (let x = 0; x < this.canvasWidth; x += 50) {
            line(x, 0, x, this.canvasHeight);
        }
        
        // Horizontal lines
        for (let y = 0; y < this.canvasHeight; y += 50) {
            line(0, y, this.canvasWidth, y);
        }
        
        pop();
    }
    
    drawMetrics(network) {
        if (!this.showMetrics) return;
        
        const stats = network.getStatistics();
        
        push();
        // Semi-transparent background
        fill(0, 0, 0, 150);
        noStroke();
        rect(10, 10, 200, 120, 5);
        
        // Metrics text
        fill(255);
        textAlign(LEFT, TOP);
        textSize(12);
        text(`FPS: ${this.fps}`, 20, 25);
        text(`Term: ${stats.currentTerm}`, 20, 40);
        text(`Leader: ${stats.leader}`, 20, 55);
        text(`Alive: ${stats.aliveNodes}/${stats.totalNodes}`, 20, 70);
        text(`Messages: ${stats.activeMessages}`, 20, 85);
        text(`Total Sent: ${stats.totalMessages}`, 20, 100);
        text(`Dropped: ${stats.droppedMessages}`, 20, 115);
        
        pop();
    }
    
    drawDebugInfo(network) {
        push();
        fill(0, 0, 0, 180);
        noStroke();
        rect(this.canvasWidth - 250, 10, 240, 200, 5);
        
        fill(255);
        textAlign(LEFT, TOP);
        textSize(10);
        let y = 25;
        
        text('Debug Information:', this.canvasWidth - 240, y);
        y += 20;
        
        // Node states
        network.nodes.forEach(node => {
            const info = node.getInfo();
            fill(node.getStateColor());
            text(`Node ${info.id}: ${info.state} T:${info.term}`, this.canvasWidth - 240, y);
            y += 12;
        });
        
        pop();
    }
    
    drawNodeSelection(node) {
        push();
        noFill();
        stroke(255, 255, 0);
        strokeWeight(3);
        ellipse(node.x, node.y, node.radius * 2 + 20);
        
        // Draw selection pulse
        const pulseSize = node.radius * 2 + 20 + sin(millis() * 0.01) * 10;
        stroke(255, 255, 0, 100);
        strokeWeight(1);
        ellipse(node.x, node.y, pulseSize);
        
        pop();
    }
    
    drawInteractionFeedback() {
        // Draw hover effects, click feedback, etc.
        if (this.draggingNode) {
            push();
            stroke(255, 255, 255, 100);
            strokeWeight(2);
            setLineDash([5, 5]);
            line(this.draggingNode.x, this.draggingNode.y, mouseX, mouseY);
            setLineDash([]);
            pop();
        }
    }
    
    updateFPS() {
        this.frameCount++;
        const currentTime = millis();
        
        if (currentTime - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
        }
    }
    
    handleMousePressed(network) {
        const clickedNode = network.getNodeAt(mouseX, mouseY);
        
        if (clickedNode) {
            // Check for double-click
            const currentTime = millis();
            if (currentTime - this.lastClickTime < this.doubleClickThreshold && this.selectedNode === clickedNode) {
                this.handleDoubleClick(clickedNode, network);
            } else {
                this.selectedNode = clickedNode;
                this.draggingNode = clickedNode;
                this.dragOffset.x = mouseX - clickedNode.x;
                this.dragOffset.y = mouseY - clickedNode.y;
                
                // Update node info display
                this.updateNodeInfoDisplay(clickedNode);
            }
            this.lastClickTime = currentTime;
        } else {
            this.selectedNode = null;
            this.draggingNode = null;
        }
        
        this.mouseDown = true;
    }
    
    handleMouseReleased(network) {
        this.draggingNode = null;
        this.mouseDown = false;
    }
    
    handleMouseDragged(network) {
        if (this.draggingNode) {
            this.draggingNode.x = mouseX - this.dragOffset.x;
            this.draggingNode.y = mouseY - this.dragOffset.y;
            
            // Keep node within canvas bounds
            this.draggingNode.x = constrain(this.draggingNode.x, this.draggingNode.radius, this.canvasWidth - this.draggingNode.radius);
            this.draggingNode.y = constrain(this.draggingNode.y, this.draggingNode.radius, this.canvasHeight - this.draggingNode.radius);
        }
    }
    
    handleDoubleClick(node, network) {
        // Toggle node state on double-click
        if (node.isAlive) {
            node.kill();
            console.log(`Killed node ${node.id}`);
        } else {
            node.revive();
            console.log(`Revived node ${node.id}`);
        }
        network.updateConnections();
    }
    
    handleKeyPressed(key, network) {
        switch (key.toLowerCase()) {
            case 'd':
                this.showDebugInfo = !this.showDebugInfo;
                break;
            case 'g':
                this.backgroundGrid = !this.backgroundGrid;
                break;
            case 'm':
                this.showMetrics = !this.showMetrics;
                break;
            case 'c':
                this.showConnections = !this.showConnections;
                break;
            case 'r':
                this.arrangeNodesInCircle(network.nodes);
                break;
            case 'q':
                this.arrangeNodesInGrid(network.nodes);
                break;
            case ' ':
                // Spacebar - pause/unpause
                if (typeof toggleSimulation === 'function') {
                    toggleSimulation();
                }
                break;
            case 'k':
                // Kill random node
                network.killRandomNode();
                break;
            case 'p':
                // Create partition
                this.createRandomPartition(network);
                break;
            case 'h':
                // Heal partition
                network.healPartition();
                break;
        }
    }
    
    createRandomPartition(network) {
        const aliveNodes = network.getAliveNodes();
        if (aliveNodes.length < 3) return;
        
        // Split nodes into two groups
        const shuffled = [...aliveNodes].sort(() => random() - 0.5);
        const mid = floor(shuffled.length / 2);
        const group1 = shuffled.slice(0, mid).map(n => n.id);
        const group2 = shuffled.slice(mid).map(n => n.id);
        
        network.partition(group1, group2);
        console.log(`Created partition: ${group1} | ${group2}`);
    }
    
    updateNodeInfoDisplay(node) {
        const infoElement = document.getElementById('nodeInfo');
        if (infoElement && node) {
            const info = node.getInfo();
            infoElement.innerHTML = `
                <strong>Node ${info.id}</strong><br>
                State: ${info.state}<br>
                Term: ${info.term}<br>
                Voted For: ${info.votedFor || 'None'}<br>
                Log Entries: ${info.logLength}<br>
                Commit Index: ${info.commitIndex}<br>
                Alive: ${info.isAlive ? 'Yes' : 'No'}<br>
                Partitioned: ${info.isPartitioned ? 'Yes' : 'No'}<br>
                Votes Received: ${info.votesReceived}<br>
                Messages Received: ${info.messagesReceived}<br>
                Messages Sent: ${info.messagesSent}
            `;
        }
    }
    
    resize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.initializePositions();
    }
    
    toggleFullscreen() {
        if (this.canvas) {
            const elem = this.canvas.canvas;
            if (!document.fullscreenElement) {
                elem.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }
    }
    
    exportScreenshot() {
        if (this.canvas) {
            saveCanvas(this.canvas, 'raft-visualization', 'png');
        }
    }
    
    getSettings() {
        return {
            backgroundGrid: this.backgroundGrid,
            showMetrics: this.showMetrics,
            showConnections: this.showConnections,
            showDebugInfo: this.showDebugInfo
        };
    }
    
    applySettings(settings) {
        this.backgroundGrid = settings.backgroundGrid !== false;
        this.showMetrics = settings.showMetrics !== false;
        this.showConnections = settings.showConnections !== false;
        this.showDebugInfo = settings.showDebugInfo || false;
    }
}