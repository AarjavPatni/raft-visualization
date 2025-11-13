# Raft Consensus Protocol Visualization

An interactive, real-time visualization of the Raft consensus algorithm built with p5.js. Watch distributed systems concepts come to life as nodes elect leaders, replicate logs, and handle network partitions.

![Raft Visualization Demo](https://img.shields.io/badge/Status-Live%20Demo-green)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This visualization demonstrates the **Raft consensus protocol**, a distributed consensus algorithm designed to be more understandable than Paxos. It shows how distributed systems achieve consistency through leader election, log replication, and fault tolerance.

### Key Features

- **Leader Election** - Watch real-time elections with randomized timeouts
- **Log Replication** - See how leaders distribute log entries to followers  
- **State Transitions** - Observe nodes switching between follower/candidate/leader states
- **Message Flow** - Animated message passing with visual trails
- **Network Partitions** - Simulate split-brain scenarios and recovery
- **Node Failures** - Kill and revive nodes to test fault tolerance
- **Real-time Metrics** - Performance statistics and consensus state
- **Interactive Controls** - Speed control, step-through debugging, and more

## Quick Start

### Option 1: Live Demo
Visit the hosted version: [**Live Demo**](https://raft-visualization-aarjavpatni.vercel.app)

### Option 2: Local Development
```bash
# Clone the repository
git clone https://github.com/AarjavPatni/raft-visualization.git
cd raft-visualization

# Serve locally (any HTTP server works)
python -m http.server 8000
# or
npx serve .
# or
php -S localhost:8000

# Open http://localhost:8000
```

## How to Use

### Mouse Controls
- **Click** - Select a node to view details
- **Double-click** - Kill/revive a node
- **Drag** - Reposition nodes in the cluster

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `SPACE` | Pause/resume simulation |
| `R` | Arrange nodes in circle |
| `Q` | Arrange nodes in grid |
| `D` | Toggle debug information |
| `G` | Toggle background grid |
| `M` | Toggle metrics display |
| `K` | Kill random node |
| `P` | Create random partition |
| `H` | Heal network partition |

### Interactive Controls
- **Speed Control** - Adjust simulation speed from 1x to 10x
- **Cluster Management** - Add/remove nodes dynamically
- **Network Simulation** - Create partitions and add latency
- **Client Requests** - Send individual requests or bursts

## Understanding the Visualization

### Node States
- **Blue (Follower)** - Default state, responds to leaders and candidates
- **Orange (Candidate)** - Requesting votes during election
- **Gold (Leader)** - Handling client requests and sending heartbeats
- **Gray (Dead)** - Failed node, not participating in consensus

### Message Types
- **Vote Requests** - Orange arrows during elections
- **Vote Responses** - Green confirmations
- **Heartbeats** - Blue pulses from leader to followers
- **Log Entries** - Data replication messages

### Visual Elements
- **Connection Lines** - Network links between nodes
- **Message Trails** - Animated particles showing message flow
- **Node Glow** - Activity indicators based on message volume
- **Log Bars** - Visual representation of log length and commits

## Educational Value

This visualization helps understand:

1. **Leader Election Process**
   - How timeouts trigger elections
   - Why randomization prevents split votes
   - How majority consensus is achieved

2. **Log Replication**
   - How leaders distribute entries
   - When entries become committed
   - Log consistency guarantees

3. **Fault Tolerance**
   - Handling node failures
   - Network partition scenarios
   - Split-brain prevention

4. **Performance Characteristics**
   - Message complexity
   - Latency impact
   - Throughput under various conditions

## Technical Implementation

### Architecture
```
├── index.html          # Main application interface
├── js/
│   ├── main.js         # Application entry point and UI controls
│   ├── raftNode.js     # Complete Raft node implementation
│   ├── raftNetwork.js  # Network coordination and messaging
│   ├── message.js      # Animated message visualization
│   ├── logEntry.js     # Log entry management
│   └── visualization.js # Rendering and interaction handling
└── README.md
```

### Core Components

**RaftNode Class**
- Implements full Raft state machine
- Handles elections, voting, and log replication
- Manages timeouts and term transitions

**RaftNetwork Class**
- Coordinates message passing between nodes
- Simulates network conditions (latency, partitions)
- Tracks global state and statistics

**Visualization Engine**
- Real-time rendering with p5.js
- Smooth animations and state transitions
- Interactive mouse/keyboard handling

### Key Algorithms Implemented

- **Leader Election** with randomized timeouts
- **Log Replication** with consistency checks
- **Heartbeat System** for leader maintenance
- **Vote Counting** with majority rules
- **Term Management** for conflict resolution

## Customization

### Timing Parameters
```javascript
// In raftNode.js
this.heartbeatInterval = 1000;  // Leader heartbeat frequency
this.randomElectionTimeout();   // 3-6 second election timeouts
```

### Visual Styling
```javascript
// In visualization.js
this.backgroundGrid = true;     // Grid overlay
this.showMetrics = true;        // Performance display
this.showDebugInfo = false;     // Debug information
```

### Network Simulation
```javascript
// In raftNetwork.js
this.latency = 0;              // Base network latency
this.dropRate = 0;             // Message drop probability
this.speedMultiplier = 1;      // Animation speed
```

## Deployment

### GitHub Pages
1. Push code to GitHub repository
2. Go to Settings → Pages
3. Select source branch (usually `main`)
4. Visit `https://yourusername.github.io/raft-visualization`

### Vercel
1. Connect GitHub repository to Vercel
2. No build configuration needed (static files)
3. Automatic deployment on push

### Netlify
1. Drag and drop project folder to Netlify
2. Or connect GitHub repository
3. Instant deployment

## Contributing

Contributions welcome! Areas for improvement:

- **Educational Features** - Step-by-step guided tours
- **Advanced Scenarios** - More complex failure modes
- **Performance Metrics** - Detailed analytics dashboard
- **Mobile Support** - Touch-friendly interactions
- **Export Features** - Save scenarios and configurations

### Development Setup
```bash
# Fork and clone the repository
git clone https://github.com/AarjavPatni/raft-visualization.git
cd raft-visualization

# Make changes and test locally
python -m http.server 8000

# Submit pull request
```

## Resources

### Raft Algorithm
- [Original Raft Paper](https://raft.github.io/raft.pdf) by Diego Ongaro and John Ousterhout
- [Raft Consensus Homepage](https://raft.github.io/)
- [The Secret Lives of Data - Raft](http://thesecretlivesofdata.com/raft/)

### Related Visualizations
- [Raft Playground](https://raft.github.io/)
- [Consensus Protocols Comparison](https://aphyr.com/posts/313-strong-consistency-models)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Diego Ongaro and John Ousterhout** for the Raft algorithm
- **p5.js Community** for the excellent visualization library
- **Distributed Systems Community** for educational resources

---

**Made for distributed systems education**

*Star this repository if you found it helpful!*