class RaftNode {
    static STATES = {
        FOLLOWER: 'follower',
        CANDIDATE: 'candidate', 
        LEADER: 'leader',
        DEAD: 'dead'
    };
    
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.radius = 40;
        
        // raft state
        this.state = RaftNode.STATES.FOLLOWER;
        this.currentTerm = 0;
        this.votedFor = null;
        this.log = [];
        this.commitIndex = 0;
        this.lastApplied = 0;
        
        // leader state
        this.nextIndex = {};
        this.matchIndex = {};
        
        // timing
        this.electionTimeout = this.randomElectionTimeout();
        this.lastHeartbeat = millis();
        this.heartbeatInterval = 1000; // 1 second for observable visualization
        
        // visualization
        this.targetColor = this.getStateColor();
        this.currentColor = this.targetColor;
        this.pulsePhase = 0;
        this.messageQueue = [];
        this.connections = new Set();
        this.isPartitioned = false;
        this.isAlive = true;
        
        // animation
        this.stateChangeTime = 0;
        this.wobble = 0;
        this.glowIntensity = 0;
        
        // statistics
        this.votesReceived = 0;
        this.messagesReceived = 0;
        this.messagesSent = 0;
    }
    
    randomElectionTimeout() {
        return random(3000, 6000);
    }
    
    getStateColor() {
        if (!this.isAlive) return color(102, 102, 102); // Dead - gray
        
        switch (this.state) {
            case RaftNode.STATES.FOLLOWER:
                return color(33, 150, 243); // Blue
            case RaftNode.STATES.CANDIDATE:
                return color(255, 152, 0); // Orange
            case RaftNode.STATES.LEADER:
                return color(255, 215, 0); // Gold
            default:
                return color(128, 128, 128); // Gray
        }
    }
    
    update(deltaTime, network) {
        if (!this.isAlive) return;
        
        // update colors
        this.targetColor = this.getStateColor();
        this.currentColor = lerpColor(this.currentColor, this.targetColor, 0.1);
        
        // update pulse animation
        this.pulsePhase += deltaTime * 0.003;
        
        // update wobble effect for state changes
        if (millis() - this.stateChangeTime < 500) {
            this.wobble = sin((millis() - this.stateChangeTime) * 0.02) * 5;
        } else {
            this.wobble = lerp(this.wobble, 0, 0.1);
        }
        
        // process election timeout
        if (this.state === RaftNode.STATES.FOLLOWER || this.state === RaftNode.STATES.CANDIDATE) {
            if (millis() - this.lastHeartbeat > this.electionTimeout) {
                this.startElection(network);
            }
        }
        
        // send heartbeats as leader
        if (this.state === RaftNode.STATES.LEADER) {
            if (millis() - this.lastHeartbeat > this.heartbeatInterval) {
                this.sendHeartbeats(network);
                this.lastHeartbeat = millis();
            }
        }
        
        // process message queue
        this.processMessages(network);
        
        // update glow intensity based on activity
        this.glowIntensity = lerp(this.glowIntensity, this.messageQueue.length > 0 ? 1 : 0, 0.2);
    }
    
    startElection(network) {
        if (!this.isAlive || this.isPartitioned) return;
        
        this.state = RaftNode.STATES.CANDIDATE;
        this.currentTerm++;
        this.votedFor = this.id;
        this.votesReceived = 1; // Vote for self
        this.lastHeartbeat = millis();
        this.electionTimeout = this.randomElectionTimeout();
        this.stateChangeTime = millis();
        
        // request votes from all other nodes
        network.broadcastMessage(this, {
            type: 'RequestVote',
            term: this.currentTerm,
            candidateId: this.id,
            lastLogIndex: this.log.length - 1,
            lastLogTerm: this.log.length > 0 ? this.log[this.log.length - 1].term : 0
        });
        
        console.log(`Node ${this.id} started election for term ${this.currentTerm}`);
    }
    
    sendHeartbeats(network) {
        if (!this.isAlive || this.state !== RaftNode.STATES.LEADER) return;
        
        network.broadcastMessage(this, {
            type: 'AppendEntries',
            term: this.currentTerm,
            leaderId: this.id,
            prevLogIndex: -1,
            prevLogTerm: -1,
            entries: [],
            leaderCommit: this.commitIndex
        });
    }
    
    processMessages(network) {
        while (this.messageQueue.length > 0 && this.isAlive) {
            const message = this.messageQueue.shift();
            this.handleMessage(message, network);
            this.messagesReceived++;
        }
    }
    
    handleMessage(message, network) {
        const { type, term, senderId } = message;
        
        if (term > this.currentTerm) {
            this.currentTerm = term;
            this.votedFor = null;
            if (this.state !== RaftNode.STATES.FOLLOWER) {
                this.state = RaftNode.STATES.FOLLOWER;
                this.stateChangeTime = millis();
            }
        }
        
        switch (type) {
            case 'RequestVote':
                this.handleRequestVote(message, network);
                break;
            case 'RequestVoteResponse':
                this.handleRequestVoteResponse(message, network);
                break;
            case 'AppendEntries':
                this.handleAppendEntries(message, network);
                break;
            case 'AppendEntriesResponse':
                this.handleAppendEntriesResponse(message, network);
                break;
        }
    }
    
    handleRequestVote(message, network) {
        const { term, candidateId, lastLogIndex, lastLogTerm } = message;
        
        let voteGranted = false;
        
        if (term >= this.currentTerm && 
            (this.votedFor === null || this.votedFor === candidateId)) {
            const ourLastLogTerm = this.log.length > 0 ? this.log[this.log.length - 1].term : 0;
            const ourLastLogIndex = this.log.length - 1;
            
            if (lastLogTerm > ourLastLogTerm || 
                (lastLogTerm === ourLastLogTerm && lastLogIndex >= ourLastLogIndex)) {
                voteGranted = true;
                this.votedFor = candidateId;
                this.lastHeartbeat = millis(); // reset election timeout
            }
        }
        
        network.sendMessage(this, candidateId, {
            type: 'RequestVoteResponse',
            term: this.currentTerm,
            voteGranted: voteGranted
        });
    }
    
    handleRequestVoteResponse(message, network) {
        if (this.state !== RaftNode.STATES.CANDIDATE || message.term !== this.currentTerm) {
            return;
        }
        
        if (message.voteGranted) {
            this.votesReceived++;
            
            // check if we have majority
            const totalNodes = network.getAliveNodes().length;
            if (this.votesReceived > totalNodes / 2) {
                this.becomeLeader(network);
            }
        }
    }
    
    handleAppendEntries(message, network) {
        const { term, leaderId, entries } = message;
        
        if (term >= this.currentTerm) {
            this.lastHeartbeat = millis();
            
            if (this.state !== RaftNode.STATES.FOLLOWER) {
                this.state = RaftNode.STATES.FOLLOWER;
                this.stateChangeTime = millis();
            }
            
            // process log entries if any
            if (entries && entries.length > 0) {
                entries.forEach(entry => {
                    this.log.push(new LogEntry(entry.term, entry.index, entry.command));
                });
            }
        }
        
        network.sendMessage(this, leaderId, {
            type: 'AppendEntriesResponse',
            term: this.currentTerm,
            success: term >= this.currentTerm
        });
    }
    
    handleAppendEntriesResponse(message, network) {
        if (this.state !== RaftNode.STATES.LEADER) return;
        
        // handle response logic for log replication
        // this is simplified for visualization purposes
    }
    
    becomeLeader(network) {
        this.state = RaftNode.STATES.LEADER;
        this.stateChangeTime = millis();
        this.lastHeartbeat = millis();
        
        const aliveNodes = network.getAliveNodes();
        aliveNodes.forEach(node => {
            if (node.id !== this.id) {
                this.nextIndex[node.id] = this.log.length;
                this.matchIndex[node.id] = -1;
            }
        });
        
        console.log(`Node ${this.id} became leader for term ${this.currentTerm}`);
        
        this.sendHeartbeats(network);
    }
    
    addLogEntry(command) {
        if (this.state === RaftNode.STATES.LEADER) {
            const entry = new LogEntry(this.currentTerm, this.log.length, command);
            this.log.push(entry);
            return entry;
        }
        return null;
    }
    
    receiveMessage(message) {
        this.messageQueue.push(message);
    }
    
    kill() {
        this.isAlive = false;
        this.state = RaftNode.STATES.DEAD;
        this.stateChangeTime = millis();
    }
    
    revive() {
        this.isAlive = true;
        this.state = RaftNode.STATES.FOLLOWER;
        this.stateChangeTime = millis();
        this.lastHeartbeat = millis();
        this.electionTimeout = this.randomElectionTimeout();
    }
    
    partition(partitioned = true) {
        this.isPartitioned = partitioned;
    }
    
    draw() {
        push();
        translate(this.x + this.wobble, this.y);
        
        if (this.glowIntensity > 0) {
            for (let i = 3; i > 0; i--) {
                const alpha = (this.glowIntensity * 30) / i;
                fill(red(this.currentColor), green(this.currentColor), blue(this.currentColor), alpha);
                ellipse(0, 0, this.radius * 2 + i * 10);
            }
        }
        
        // main node
        stroke(255);
        strokeWeight(this.isPartitioned ? 3 : 2);
        if (this.isPartitioned) {
            setLineDash([5, 5]);
        }
        
        // add pulse effect for followers
        let displayRadius = this.radius;
        if (this.state === RaftNode.STATES.FOLLOWER && this.isAlive) {
            displayRadius += sin(this.pulsePhase) * 3;
        }
        
        fill(this.currentColor);
        ellipse(0, 0, displayRadius * 2);
        
        setLineDash([]);
        
        // draw state indicator
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(12);
        text(this.id, 0, -5);
        
        // draw term number
        textSize(8);
        text(`T:${this.currentTerm}`, 0, 8);
        
        // draw special indicators
        if (this.state === RaftNode.STATES.LEADER) {
            // crown for leader
            stroke(255, 215, 0);
            strokeWeight(2);
            noFill();
            beginShape();
            vertex(-8, -displayRadius - 5);
            vertex(-4, -displayRadius - 12);
            vertex(0, -displayRadius - 8);
            vertex(4, -displayRadius - 12);
            vertex(8, -displayRadius - 5);
            endShape();
        } else if (this.state === RaftNode.STATES.CANDIDATE) {
            // question mark for candidate
            fill(255);
            textSize(16);
            text("?", 0, -displayRadius - 10);
        }
        
        // draw log status
        if (this.log.length > 0) {
            fill(100, 255, 100, 150);
            rect(-displayRadius + 5, displayRadius - 15, this.log.length * 2, 3);
        }
        
        pop();
    }
    
    getInfo() {
        return {
            id: this.id,
            state: this.state,
            term: this.currentTerm,
            votedFor: this.votedFor,
            logLength: this.log.length,
            commitIndex: this.commitIndex,
            isAlive: this.isAlive,
            isPartitioned: this.isPartitioned,
            votesReceived: this.votesReceived,
            messagesReceived: this.messagesReceived,
            messagesSent: this.messagesSent
        };
    }
    
    contains(x, y) {
        const dist = sqrt(pow(x - this.x, 2) + pow(y - this.y, 2));
        return dist <= this.radius;
    }
}

// helper function for dashed lines
function setLineDash(list) {
    if (list.length === 0) {
        drawingContext.setLineDash([]);
    } else {
        drawingContext.setLineDash(list);
    }
}
