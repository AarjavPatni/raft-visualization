class LogEntry {
    constructor(term, index, command) {
        this.term = term;
        this.index = index;
        this.command = command;
        this.timestamp = millis();
        this.committed = false;
        this.applied = false;
        
        this.color = color(100, 255, 100, 150);
        this.commitColor = color(50, 255, 50, 200);
        this.size = { width: 20, height: 8 };
        this.animationPhase = 0;
    }
    
    commit() {
        this.committed = true;
        this.color = this.commitColor;
    }
    
    apply() {
        this.applied = true;
    }
    
    update() {
        this.animationPhase += 0.1;
        
        // uncommitted entries - pulse effect
        if (!this.committed) {
            const pulse = sin(this.animationPhase) * 0.2 + 0.8;
            this.color = lerpColor(
                color(100, 255, 100, 100), 
                color(100, 255, 100, 200), 
                pulse
            );
        }
    }
    
    draw(x, y, width = this.size.width, height = this.size.height) {
        push();
        
        // entry background
        fill(this.color);
        if (this.committed) {
            stroke(0, 255, 0);
            strokeWeight(2);
        } else {
            stroke(255, 255, 255, 100);
            strokeWeight(1);
        }
        
        rect(x, y, width, height, 2);
        
        // term number
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(6);
        text(this.term, x + width/2, y + height/2 - 1);
        
        // index
        textSize(4);
        text(this.index, x + width/2, y + height/2 + 2);
        
        // commit indicator
        if (this.committed) {
            fill(0, 255, 0);
            noStroke();
            ellipse(x + width - 2, y + 2, 3);
        }
        
        pop();
    }
    
    getInfo() {
        return {
            term: this.term,
            index: this.index,
            command: this.command,
            committed: this.committed,
            applied: this.applied,
            age: millis() - this.timestamp
        };
    }
    
    static fromObject(obj) {
        const entry = new LogEntry(obj.term, obj.index, obj.command);
        entry.committed = obj.committed || false;
        entry.applied = obj.applied || false;
        entry.timestamp = obj.timestamp || millis();
        return entry;
    }
    
    toObject() {
        return {
            term: this.term,
            index: this.index,
            command: this.command,
            committed: this.committed,
            applied: this.applied,
            timestamp: this.timestamp
        };
    }
}
