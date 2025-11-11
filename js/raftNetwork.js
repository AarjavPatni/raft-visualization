class RaftNetwork {
    constructor() {
        this.nodes = new Map();
        this.messages = [];
        this.partitions = new Set(); // set of node pairs that can't communicate
        this.latency = 0;
        this.dropRate = 0; // message drop rate (0-1)
        this.speedMultiplier = 1;
        
        this.totalMessages = 0;
        this.droppedMessages = 0;
        this.elections = 0;
        this.terms = 0;
        
        this.connections = [];
        this.connectionPulses = [];
    }
    
    addNode(node) {
        this.nodes.set(node.id, node);
        this.updateConnections();
    }
    
    removeNode(nodeId) {
        this.nodes.delete(nodeId);
        this.updateConnections();
        
        // clean up partitions involving this node
        this.partitions = new Set([...this.partitions].filter(partition => 
            !partition.includes(nodeId)
        ));
    }
    
    updateConnections() {
        this.connections = [];
        const nodeArray = Array.from(this.nodes.values());
        
        for (let i = 0; i < nodeArray.length; i++) {
            for (let j = i + 1; j < nodeArray.length; j++) {
                const node1 = nodeArray[i];
                const node2 = nodeArray[j];
                
                if (node1.isAlive && node2.isAlive && !this.isPartitioned(node1.id, node2.id)) {
                    this.connections.push({
                        node1: node1,
                        node2: node2,
                        strength: 1.0,
                        lastMessage: 0
                    });
                }
            }
        }
    }
    
    sendMessage(sender, receiverId, content) {
        const receiver = this.nodes.get(receiverId);
        if (!receiver || !sender.isAlive || !receiver.isAlive) {
            return false;
        }
        
        // check - network partition
        if (this.isPartitioned(sender.id, receiverId)) {
            return false;
        }
        
        // check - message drop
        if (random() < this.dropRate) {
            this.droppedMessages++;
            return false;
        }
        
        const message = new Message(sender.id, receiverId, content);
        message.setPath(sender.x, sender.y, receiver.x, receiver.y);
        
        // add artificial latency
        const finalLatency = this.latency + random(-10, 10); 
        
        this.messages.push(message);
        this.totalMessages++;
        sender.messagesSent++;
        
        this.updateConnectionActivity(sender.id, receiverId);
        
        return true;
    }
    
    broadcastMessage(sender, content) {
        let sentCount = 0;
        
        for (const [nodeId, node] of this.nodes) {
            if (nodeId !== sender.id && node.isAlive) {
                if (this.sendMessage(sender, nodeId, content)) {
                    sentCount++;
                }
            }
        }
        
        return sentCount;
    }
    
    updateConnectionActivity(senderId, receiverId) {
        const connection = this.connections.find(conn => 
            (conn.node1.id === senderId && conn.node2.id === receiverId) ||
            (conn.node1.id === receiverId && conn.node2.id === senderId)
        );
        
        if (connection) {
            connection.lastMessage = millis();
            connection.strength = min(connection.strength + 0.3, 1.0);
            
            this.connectionPulses.push({
                connection: connection,
                progress: 0,
                intensity: 1.0
            });
        }
    }
    
    update(deltaTime) {
        this.messages = this.messages.filter(message => {
            const stillAnimating = message.update(this.speedMultiplier, this.latency);
            
            if (message.isDelivered()) {
                const receiver = this.nodes.get(message.receiverId);
                if (receiver && receiver.isAlive) {
                    receiver.receiveMessage(message.content);
                }
                return false;
            }
            
            return stillAnimating;
        });
        
        this.connections.forEach(connection => {
            const timeSinceMessage = millis() - connection.lastMessage;
            if (timeSinceMessage > 1000) {
                connection.strength = max(connection.strength - 0.01, 0.2);
            }
        });
        
        this.connectionPulses = this.connectionPulses.filter(pulse => {
            pulse.progress += 0.02;
            pulse.intensity = 1.0 - pulse.progress;
            return pulse.progress < 1.0;
        });
        
        this.nodes.forEach(node => {
            node.update(deltaTime, this);
        });
    }
    
    draw() {
        this.drawConnections();
        
        this.messages.forEach(message => {
            message.draw();
        });
        
        this.nodes.forEach(node => {
            node.draw();
        });
        
        this.drawConnectionPulses();
    }
    
    drawConnections() {
        this.connections.forEach(connection => {
            const { node1, node2, strength } = connection;
            
            push();
            stroke(255, 255, 255, 50 + strength * 100);
            strokeWeight(1 + strength * 2);
            
            if (node1.isPartitioned || node2.isPartitioned) {
                setLineDash([5, 5]);
            }
            
            line(node1.x, node1.y, node2.x, node2.y);
            setLineDash([]);
            pop();
        });
    }
    
    drawConnectionPulses() {
        this.connectionPulses.forEach(pulse => {
            const { connection, progress, intensity } = pulse;
            const { node1, node2 } = connection;
            
            const x = lerp(node1.x, node2.x, progress);
            const y = lerp(node1.y, node2.y, progress);
            
            push();
            fill(255, 255, 255, intensity * 100);
            noStroke();
            ellipse(x, y, 8);
            pop();
        });
    }
    
    partition(nodeIds1, nodeIds2) {
        // create partition between two groups of nodes
        for (const id1 of nodeIds1) {
            for (const id2 of nodeIds2) {
                this.partitions.add(`${id1}-${id2}`);
                this.partitions.add(`${id2}-${id1}`);
                
                const node1 = this.nodes.get(id1);
                const node2 = this.nodes.get(id2);
                if (node1) node1.partition(true);
                if (node2) node2.partition(true);
            }
        }
        this.updateConnections();
    }
    
    healPartition() {
        this.partitions.clear();
        this.nodes.forEach(node => {
            node.partition(false);
        });
        this.updateConnections();
    }
    
    isPartitioned(nodeId1, nodeId2) {
        return this.partitions.has(`${nodeId1}-${nodeId2}`);
    }
    
    getAliveNodes() {
        return Array.from(this.nodes.values()).filter(node => node.isAlive);
    }
    
    getLeader() {
        const aliveNodes = this.getAliveNodes();
        return aliveNodes.find(node => node.state === RaftNode.STATES.LEADER) || null;
    }
    
    getCurrentTerm() {
        let maxTerm = 0;
        this.nodes.forEach(node => {
            if (node.isAlive && node.currentTerm > maxTerm) {
                maxTerm = node.currentTerm;
            }
        });
        return maxTerm;
    }
    
    killRandomNode() {
        const aliveNodes = this.getAliveNodes();
        if (aliveNodes.length > 1) {
            const randomNode = random(aliveNodes);
            randomNode.kill();
            this.updateConnections();
            return randomNode;
        }
        return null;
    }
    
    reviveAllNodes() {
        this.nodes.forEach(node => {
            if (!node.isAlive) {
                node.revive();
            }
        });
        this.updateConnections();
    }
    
    addLatency(ms = 50) {
        this.latency += ms;
    }
    
    setDropRate(rate) {
        this.dropRate = constrain(rate, 0, 1);
    }
    
    setSpeedMultiplier(multiplier) {
        this.speedMultiplier = constrain(multiplier, 0.1, 10);
    }
    
    addClientRequest(command) {
        const leader = this.getLeader();
        if (leader) {
            const entry = leader.addLogEntry(command);
            if (entry) {
                console.log(`Added client request: ${command}`);
                return entry;
            }
        }
        return null;
    }
    
    getStatistics() {
        const aliveNodes = this.getAliveNodes();
        const leader = this.getLeader();
        
        return {
            totalNodes: this.nodes.size,
            aliveNodes: aliveNodes.length,
            currentTerm: this.getCurrentTerm(),
            leader: leader ? leader.id : 'None',
            totalMessages: this.totalMessages,
            droppedMessages: this.droppedMessages,
            activeMessages: this.messages.length,
            latency: this.latency,
            dropRate: this.dropRate,
            speedMultiplier: this.speedMultiplier,
            partitionsActive: this.partitions.size > 0
        };
    }
    
    reset() {
        this.messages = [];
        this.partitions.clear();
        this.latency = 0;
        this.dropRate = 0;
        this.totalMessages = 0;
        this.droppedMessages = 0;
        
        this.nodes.forEach(node => {
            node.currentTerm = 0;
            node.votedFor = null;
            node.log = [];
            node.state = RaftNode.STATES.FOLLOWER;
            node.lastHeartbeat = millis();
            node.electionTimeout = node.randomElectionTimeout();
            node.isAlive = true;
            node.isPartitioned = false;
            node.votesReceived = 0;
            node.messagesReceived = 0;
            node.messagesSent = 0;
            node.stateChangeTime = millis();
        });
        
        this.updateConnections();
    }
    
    getNodeAt(x, y) {
        for (const node of this.nodes.values()) {
            if (node.contains(x, y)) {
                return node;
            }
        }
        return null;
    }
}
