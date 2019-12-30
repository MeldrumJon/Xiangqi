let lastId = null;
if (sessionStorage) {
    lastId = sessionStorage.getItem('myId');
}

export default class PeerCom extends EventTarget {
    constructor() {
        super();
        this._peer = null;
        this._conn = null;
        this._receiveHandlers = {};
        this.isConnected = false;
        this.peerId = null;
    }

    /**
     * Establishes a connection between two peers.  If a peer ID is provided, it 
     * begins a connection with that Peer.  Otherwise, it calls the wait callback 
     * function, passing a connection ID.  The user must send this ID to their 
     * peer so that they can connect.
     *
     * Several events may be dispatched while the peers are connecting/connected:
     * - wait
     * - connectedslave
     * - connectedmaster
     * - disconnected
     * 
     * @param {String} pId If given, the peer ID to connect to.
     */
    begin(pId=null) {
        console.log('Connecting to Peer server.');
        this.peerId = pId;
        if (lastId) {
            this._peer = new Peer(lastId);
        }
        else {
            this._peer = new Peer();
        }

        let ondisconnected = function () {
            console.log("Data connection has been closed.");
            this.isConnected = false
            this.dispatchEvent(new Event('disconnected'));
            this._conn = null;
            this.peerId = null;
        }.bind(this);

        let onconnected = function () {
            console.log('Connected to peer at ID: ' + this._conn.peer);
            this.dispatchEvent(new CustomEvent('connectedpeer', {
                detail: this._conn.peer
            }));
            this._conn.on('data', this._received.bind(this)); // Call received when we receive data.
            this.peerId = this._conn.peer;
            this.isConnected = true;
        }.bind(this);

        let onconnect = function (conn) {
            this._conn = conn;
            this._conn.on('open', onconnected);
            this._conn.on('close', ondisconnected);
        }.bind(this);

        let onopen = function (id) {
            console.log('Established connection to Peer server. My ID: ' + id);
            if (sessionStorage) {
                sessionStorage.setItem('myId', id);
            }
            if (pId) { // Connect to the peer.
                console.log('Connecting to peer at ID: ' + pId);
                onconnect(this._peer.connect(pId));
            } else { // or wait for a connection
                console.log('Waiting for connection from peer.')
                this.dispatchEvent(new CustomEvent('wait', { detail: id }));
            }
            this._peer.on('connection', onconnect);
        }.bind(this);

        this._peer.on('open', onopen);
    }

    disconnect() {
        if (this._conn) { this._conn.close(); }
        if (this._peer) { this._peer.disconnect(); }
    }

    /**
     * Received data from a peer.
     * @param {Object} obj JSON object containing 'type' (type of data) and 'data'
     * (data received)
     */
    _received(obj) {
        let type = obj.type;
        let data = obj.data;
        if (this._receiveHandlers[type]) {
            let handle = function () {
                this._receiveHandlers[type](data)
            }.bind(this);
            window.setTimeout(handle, 0);
        }
    }

    /**
     * When the we receive data from the peer, call a function if it matches
     * the given type.
     * @param {String} type Type of data to handle.
     * @param {Function} fct Function to call when we receive that type of data.  
     * The data is passed to fct as a parameter.
     */
    addReceiveHandler(type, fct) {
        this._receiveHandlers[type] = fct;
    }

    removeReceiveHandler(type) {
        delete this._receiveHandlers[type];
    }


    /**
     * Send data to peer.
     * @param {String} type String that describes the data.
     * @param {*} data Data to send.
     */
    send(type, data) {
        if (!this._conn) { throw new Error('Connection not established!'); }
        this._conn.send({
            'type': type,
            'data': data
        });
    }
}

