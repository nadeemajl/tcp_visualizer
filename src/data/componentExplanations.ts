export interface ComponentInfo {
  id: string;
  title: string;
  subtitle: string;
  category: 'Packet Type' | 'Network Hardware' | 'Host Architecture' | 'Protocol Mechanism';
  colorTag: string; // Tailwind color accent
  role: string;
  significance: string;
  analogy: string;
  keyFields?: { label: string; value: string; description: string }[];
  rfcReference?: string;
  commonPitfalls?: string;
}

export const COMPONENT_EXPLANATIONS: Record<string, ComponentInfo> = {
  'syn-packet': {
    id: 'syn-packet',
    title: 'SYN Packet (Synchronize)',
    subtitle: 'The conversation starter of TCP',
    category: 'Packet Type',
    colorTag: 'indigo',
    role: 'Initiates a new TCP connection and synchronizes sequence numbers between two endpoints.',
    significance: 'Without a SYN packet, neither computer knows what sequence numbers to expect. The SYN packet ensures that both sides agree on a starting count (ISN) and support basic options (like Maximum Segment Size - MSS).',
    analogy: 'Like dialling a phone number and saying: "Hello! Let\'s start tracking our sentences starting from page 1,000."',
    keyFields: [
      { label: 'SYN Flag', value: '1 (Active)', description: 'Tells the recipient this is an initial synchronization packet.' },
      { label: 'Sequence Number', value: 'ISN (e.g. 1000)', description: 'Randomly generated Initial Sequence Number to protect against stale packets.' },
      { label: 'ACK Number', value: '0', description: 'Not used in the very first SYN packet.' },
      { label: 'Payload', value: '0 Bytes', description: 'Handshake SYN packets carry no application data.' },
    ],
    rfcReference: 'RFC 793 Section 3.1 & RFC 9293',
    commonPitfalls: 'In a SYN flood attack, attackers send thousands of SYN packets with forged IP addresses and never finish the handshake, exhausting the server\'s connection queue.',
  },

  'syn-ack-packet': {
    id: 'syn-ack-packet',
    title: 'SYN-ACK Packet (Synchronize + Acknowledge)',
    subtitle: 'The server agreement & reciprocal hello',
    category: 'Packet Type',
    colorTag: 'violet',
    role: 'Acknowledges the client\'s initial SYN request while simultaneously offering the server\'s own initial sequence number.',
    significance: 'Combines two operations into a single round trip: "I received your hello (ACK), and here is my hello to you (SYN)." This keeps connection setup to exactly 3 steps rather than 4.',
    analogy: 'The person answering the phone responds: "Got your call! I heard you loud and clear (ACK=1001), and let\'s start my side of the conversation from page 5,000 (SYN)."',
    keyFields: [
      { label: 'SYN Flag', value: '1', description: 'Server asks to synchronize its sequence stream.' },
      { label: 'ACK Flag', value: '1', description: 'Confirms receipt of client sequence number.' },
      { label: 'ACK Number', value: 'Client Seq + 1', description: 'Acknowledges the 1 phantom byte consumed by client SYN.' },
      { label: 'Window Size', value: 'e.g. 65535', description: 'Server declares its maximum receive buffer capacity.' },
    ],
    rfcReference: 'RFC 793 Section 3.4',
  },

  'ack-packet': {
    id: 'ack-packet',
    title: 'ACK Packet (Acknowledgment)',
    subtitle: 'The confirmation receipt',
    category: 'Packet Type',
    colorTag: 'emerald',
    role: 'Notifies the sender that data or handshake steps were successfully received up to a specific byte sequence.',
    significance: 'ACK is the engine of TCP\'s reliability. If an ACK isn\'t received within a calculated timeout (RTO), the sender assumes the packet was lost and re-transmits it automatically.',
    analogy: 'Like a registered mail return receipt signed by the recipient confirming delivery.',
    keyFields: [
      { label: 'ACK Flag', value: '1', description: 'Indicates the Acknowledgment field contains valid confirmation.' },
      { label: 'ACK Number', value: 'Next Expected Byte', description: 'TCP uses cumulative ACKs: all bytes prior to this number are confirmed.' },
      { label: 'Window Size', value: 'Advertised Buffer', description: 'Informs sender how many more bytes receiver can accept right now.' },
    ],
    rfcReference: 'RFC 793 & RFC 5681',
    commonPitfalls: 'A pure ACK carries 0 bytes of payload and does NOT increment sequence numbers.',
  },

  'data-packet': {
    id: 'data-packet',
    title: 'Data Segment (PSH + ACK)',
    subtitle: 'The payload carrier',
    category: 'Packet Type',
    colorTag: 'amber',
    role: 'Transports real application data (such as web pages, API requests, images, or files) across the network.',
    significance: 'Each data packet has a sequence number corresponding to the byte offset of its first payload byte. This allows the receiver to stitch chunks back together in pristine order even if they arrive scrambled.',
    analogy: 'Numbered freight train railcars. Even if railcars arrive in different order, the railway worker reassembles them using their car numbers.',
    keyFields: [
      { label: 'Seq Number', value: 'Byte offset (e.g. 1001)', description: 'Where this chunk fits in the continuous byte stream.' },
      { label: 'Length', value: 'Payload bytes (e.g. 500 B)', description: 'Size of data payload contained in this segment.' },
      { label: 'PSH Flag', value: 'Push flag', description: 'Tells receiver kernel to immediately push data to application without buffering delay.' },
      { label: 'Checksum', value: '16-bit 1\'s complement', description: 'Verifies no bits were flipped or corrupted in transit.' },
    ],
    rfcReference: 'RFC 793 Section 2.6',
  },

  'fin-packet': {
    id: 'fin-packet',
    title: 'FIN Packet (Finish)',
    subtitle: 'The polite goodbye',
    category: 'Packet Type',
    colorTag: 'rose',
    role: 'Signals that the sending endpoint has completed sending data and wants to gracefully close its half of the connection.',
    significance: 'Unlike a harsh sudden drop, a FIN allows the other endpoint to finish sending any lingering response data before the entire socket is terminated.',
    analogy: 'Saying: "I\'ve finished talking for today, but I\'ll keep listening until you\'re finished speaking too."',
    keyFields: [
      { label: 'FIN Flag', value: '1', description: 'Requests termination of sending direction.' },
      { label: 'Sequence Number', value: 'Last Seq + 1', description: 'A FIN flag consumes 1 sequence number space.' },
    ],
    rfcReference: 'RFC 793 Section 3.5',
  },

  'rst-packet': {
    id: 'rst-packet',
    title: 'RST Packet (Reset)',
    subtitle: 'The emergency abort switch',
    category: 'Packet Type',
    colorTag: 'orange',
    role: 'Abruptly aborts a TCP connection due to unrecoverable errors, closed ports, or security rejections.',
    significance: 'Unlike FIN (which waits for orderly cleanup), RST immediately tears down connection resources on both ends. Often seen when connecting to a closed port ("Connection Refused").',
    analogy: 'Slamming down the phone receiver without waiting for an orderly goodbye.',
    keyFields: [
      { label: 'RST Flag', value: '1', description: 'Immediate connection termination signal.' },
    ],
    rfcReference: 'RFC 793 Section 3.4',
  },

  'retransmit-packet': {
    id: 'retransmit-packet',
    title: 'Retransmitted Segment',
    subtitle: 'Guaranteed delivery in action',
    category: 'Packet Type',
    colorTag: 'amber',
    role: 'A re-send of a segment that was previously dropped, corrupted, or delayed beyond the retransmission threshold.',
    significance: 'This is the very essence of TCP! While UDP lets dropped packets disappear forever, TCP detects missing chunks (via Duplicate ACKs or RTO timeouts) and retransmits until successful.',
    analogy: 'A postal re-shipment sent automatically because the package tracking shows it never arrived.',
    keyFields: [
      { label: 'Is Retransmission', value: 'Yes', description: 'Identical sequence number and payload as original segment.' },
      { label: 'Trigger', value: 'Fast Retransmit / RTO', description: 'Fired by 3 duplicate ACKs or retransmission timer expiration.' },
    ],
    rfcReference: 'RFC 5681 Section 3.2',
  },

  'client-host': {
    id: 'client-host',
    title: 'Client Node (Workstation)',
    subtitle: 'Source endpoint (IP: 192.168.1.42)',
    category: 'Host Architecture',
    colorTag: 'sky',
    role: 'Initiates outbound connections, manages local application requests (e.g. browser or API client), and runs the sender sliding window.',
    significance: 'Maintains Transmission Control Blocks (TCB), allocates ephemeral ports (e.g. Port 52418), monitors Round-Trip Times (RTT), and calculates congestion window limits.',
    analogy: 'Your laptop or smartphone browser requesting a webpage.',
    keyFields: [
      { label: 'Ephemeral Port', value: '52418', description: 'Temporarily assigned port from client OS dynamic range.' },
      { label: 'Send Buffer', value: 'Sliding Window', description: 'Keeps copies of sent bytes until ACKs arrive.' },
    ],
    rfcReference: 'RFC 1122 Requirements for Internet Hosts',
  },

  'server-host': {
    id: 'server-host',
    title: 'Server Node (Host Daemon)',
    subtitle: 'Destination service (IP: 93.184.216.34:80)',
    category: 'Host Architecture',
    colorTag: 'teal',
    role: 'Listens for incoming connection requests on well-known ports, buffers incoming segment streams, and advertises receive window space.',
    significance: 'Uses an accept queue for incoming handshakes. Reassembles out-of-order packets into a contiguous stream before presenting them to the web server application.',
    analogy: 'A warehouse shipping desk that receives crates from delivery trucks, organizes them numerically, and passes them to the shop floor.',
    keyFields: [
      { label: 'Listen Port', value: '80 (HTTP) / 443', description: 'Standard well-known port for web traffic.' },
      { label: 'Receive Window (rwnd)', value: '64 KB Buffer', description: 'Current available memory capacity in kernel receive queue.' },
    ],
    rfcReference: 'RFC 793',
  },

  'router-node': {
    id: 'router-node',
    title: 'Intermediate Router Gateway',
    subtitle: 'The Layer 3 transit hop',
    category: 'Network Hardware',
    colorTag: 'amber',
    role: 'Inspects IP destination addresses and forwards packets toward the next physical hop across the Internet.',
    significance: 'Routers do NOT speak TCP; they operate at Layer 3 (IP). When router queues overflow during congestion, they drop packets (Tail Drop or RED). TCP endpoints must detect and adapt to this.',
    analogy: 'A postal sorting facility redirecting mailbags along interstate highways.',
    keyFields: [
      { label: 'Routing Protocol', value: 'BGP / OSPF', description: 'Finds optimal paths between network autonomous systems.' },
      { label: 'Buffer Queue', value: 'FIFO Queue', description: 'Holds packets awaiting transmission on the outgoing link.' },
      { label: 'Drop Mechanism', value: 'Congestion Drop', description: 'Drops packets when link bandwidth is saturated.' },
    ],
    rfcReference: 'RFC 1812 Requirements for IP Version 4 Routers',
  },

  'conduit-forward': {
    id: 'conduit-forward',
    title: 'Forward Transmission Path',
    subtitle: 'Client -> Server physical & logical conduit',
    category: 'Network Hardware',
    colorTag: 'sky',
    role: 'The fiber-optic and copper pathway carrying outbound packets from client to server.',
    significance: 'Characterized by bandwidth (capacity) and propagation delay (latency). The product of these two is the Bandwidth-Delay Product (BDP), determining how many bytes can fill the pipe.',
    analogy: 'A water pipe: wider pipe = higher bandwidth; longer distance = higher latency.',
  },

  'conduit-reverse': {
    id: 'conduit-reverse',
    title: 'Return ACK Transmission Path',
    subtitle: 'Server -> Client feedback conduit',
    category: 'Network Hardware',
    colorTag: 'emerald',
    role: 'Carries acknowledgment packets, window advertisements, and server responses back to the client.',
    significance: 'Because TCP is full-duplex, the reverse path operates concurrently with the forward path, allowing simultaneous two-way conversation.',
    analogy: 'The opposite lane of a two-way highway.',
  },

  'sliding-window': {
    id: 'sliding-window',
    title: 'TCP Sliding Window Buffer',
    subtitle: 'Flow control & pipelining engine',
    category: 'Protocol Mechanism',
    colorTag: 'indigo',
    role: 'Enables high-throughput pipelining by allowing multiple segments to be in flight without waiting for each one to be acknowledged individually.',
    significance: 'Without a sliding window (Stop-and-Wait), throughput would crawl on high-latency links. The window dynamically slides forward as cumulative ACKs arrive.',
    analogy: 'A sliding viewfinder on a film reel: you can only see and send frames inside the viewfinder until the reel moves forward.',
    keyFields: [
      { label: 'SND.UNA', value: 'Oldest Unacked Seq', description: 'Left edge of the window.' },
      { label: 'SND.NXT', value: 'Next Seq to Send', description: 'Position of new data transmission.' },
      { label: 'SND.WND', value: 'Window Capacity', description: 'Determined by minimum of cwnd (congestion) and rwnd (receiver).' },
    ],
    rfcReference: 'RFC 793 & RFC 1323',
  },

  'state-machine': {
    id: 'state-machine',
    title: 'TCP Finite State Machine',
    subtitle: 'Connection lifecycle rules',
    category: 'Protocol Mechanism',
    colorTag: 'slate',
    role: 'Governs every legal state a TCP socket can inhabit from creation to termination.',
    significance: 'Guarantees both sides never enter contradictory conditions. States include CLOSED, LISTEN, SYN_SENT, SYN_RCVD, ESTABLISHED, FIN_WAIT, and TIME_WAIT.',
    analogy: 'The formal protocol rules of a diplomatic negotiation: formal greetings first, agenda discussion second, formal signatures, and closing ceremonies.',
    rfcReference: 'RFC 793 Section 3.2',
  },
};
