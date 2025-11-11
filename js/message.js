class Message {
    constructor(senderId, receiverId, content, priority = 0) {
        this.id = random(1000000);
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.content = content;
        this.priority = priority;
        this.timestamp = millis();
        this.delivered = false;
        this.dropped = false;
        
        this.startX = 0;
        this.startY = 0;
        this.endX = 0;
        this.endY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.progress = 0;
        this.speed = 0.008;
        this.color = this.getMessageColor();
        this.size = 6;
        this.trail = [];
        this.maxTrailLength = 8;
    }
    
    getMessageColor() {
        switch (this.content.type) {
            case 'RequestVote':
                return color(255, 152, 0, 200); // Orange - vote requests
            case 'RequestVoteResponse':
                return color(76, 175, 80, 200); // Green - vote responses
            case 'AppendEntries':
                return color(33, 150, 243, 200); // Blue - heartbeats/log entries
            case 'AppendEntriesResponse':
                return color(156, 39, 176, 200); // Purple - responses
            default:
                return color(255, 255, 255, 200); // White - unknown
        }
    }
    
    setPath(startX, startY, endX, endY) {
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.currentX = startX;
        this.currentY = startY;
    }
    
    update(speedMultiplier = 1, latencyMs = 0) {
        if (this.delivered || this.dropped) return false;
        
        // add artificial latency
        if (millis() - this.timestamp < latencyMs) {
            return true;
        }
        
        this.progress += this.speed * speedMultiplier;
        
        this.trail.push({ x: this.currentX, y: this.currentY });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        if (this.progress >= 1) {
            this.progress = 1;
            this.delivered = true;
            return false;
        }
        
        const easedProgress = this.easeInOutQuad(this.progress);
        
        // calculate position along curved path
        const midX = (this.startX + this.endX) / 2;
        const midY = (this.startY + this.endY) / 2 - 30;
        
        // quadratic bezier curve
        const t = easedProgress;
        this.currentX = pow(1 - t, 2) * this.startX + 2 * (1 - t) * t * midX + pow(t, 2) * this.endX;
        this.currentY = pow(1 - t, 2) * this.startY + 2 * (1 - t) * t * midY + pow(t, 2) * this.endY;
        
        return true;
    }
    
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    draw() {
        if (this.delivered || this.dropped) return;
        
        push();
        
        // trail
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = map(i, 0, this.trail.length - 1, 20, 100);
            const size = map(i, 0, this.trail.length - 1, 2, this.size);
            
            fill(red(this.color), green(this.color), blue(this.color), alpha);
            noStroke();
            ellipse(this.trail[i].x, this.trail[i].y, size);
        }
        
        // main message
        fill(this.color);
        stroke(255, 150);
        strokeWeight(1);
        ellipse(this.currentX, this.currentY, this.size * 2);
        
        // message type indicator
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(8);
        
        let indicator = '';
        switch (this.content.type) {
            case 'RequestVote': indicator = 'V'; break;
            case 'RequestVoteResponse': indicator = '✓'; break;
            case 'AppendEntries': indicator = 'H'; break;
            case 'AppendEntriesResponse': indicator = 'R'; break;
        }
        
        text(indicator, this.currentX, this.currentY);
        
        pop();
    }
    
    drop() {
        this.dropped = true;
    }
    
    isDelivered() {
        return this.delivered;
    }
    
    isDropped() {
        return this.dropped;
    }
    
    getAge() {
        return millis() - this.timestamp;
    }
    
    getInfo() {
        return {
            id: this.id,
            type: this.content.type,
            from: this.senderId,
            to: this.receiverId,
            term: this.content.term || 0,
            age: this.getAge(),
            delivered: this.delivered,
            dropped: this.dropped
        };
    }
}
