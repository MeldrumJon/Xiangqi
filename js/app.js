import * as notify from './notify.js';
import * as storage from './storage.js';
import PeerCom from './PeerCom.js';
import Board from './chess/board.js';

/*
import test from './chess/test.js';
test();
*/

const elBody = document.getElementById('xiangqi_board_game');

// Board
const elGame = document.getElementById('game');
const elBoard = document.getElementById('board');

const elBtnChat = document.getElementById('btnChat');
const elBtnSettings = document.getElementById('btnSettings');

const elSndCapture = document.getElementById('sndCapture');
const elSndCheck = document.getElementById('sndCheck');
const elSndMove = document.getElementById('sndMove');

// Forms
const elBtnOnline = document.getElementById('btnOnline');
const elBtnLocal = document.getElementById('btnLocal');
const elBtnComputer = document.getElementById('btnComputer');

const elBtnCloseGameover = document.getElementById('btnCloseGameover');
const elBtnCopyUrl = document.getElementById('btnCopyUrl');

const elMsgUrl = document.getElementById('msgUrl');
const elMsgResult = document.getElementById('msgResult');

const elPeerShow = document.getElementById('peerShow');
const elPeerWait = document.getElementById('peerWait');

const elSelFirstMove = document.getElementById('selFirstMove');
const elSelHandicap = document.getElementById('selHandicap');
const elSelSkill = document.getElementById('selSkill');
const elBtnComputerStart = document.getElementById('btnComputerStart');

// Chat
const elMessages = document.getElementById('bubbles');
const elTxtMsg = document.getElementById('txtMsg');
const elBtnSendMsg = document.getElementById('btnSendMsg');

// Controls
const elBtnUndo = document.getElementById('btnUndo');
const elSelSideSkill = document.getElementById('selSideSkill');
const elChkBoardSize = document.getElementById('chkBoardSize');
const elChkAnimated = document.getElementById('chkAnimated');
const elChkNotiSound = document.getElementById('chkNotiSound');
const elChkNotiPush = document.getElementById('chkNotiPush');

const MODALS = [
    'mod_gameselect',
    'mod_shareurl',
    'mod_waiting',
    'mod_disconnected',
    'mod_computer',
    'mod_gameover'
];

let showModal = function (name) {
    elBody.classList.add('shade');
    for (let i = 0, len = MODALS.length; i < len; ++i) {
        elBody.classList.remove(MODALS[i]);
    }
    elBody.classList.add(name);
}

let hideModals = function () {
    elBody.classList.remove('shade');
    for (let i = 0, len = MODALS.length; i < len; ++i) {
        elBody.classList.remove(MODALS[i]);
    }
}

const TYPE_LOCAL = -1;
const TYPE_FIRSTMOVE = 1;
const TYPE_OTHERMOVE = 0;

let main = function () {
    let peerId = new URLSearchParams(window.location.search).get('peerId');
    let peerCom = new PeerCom();

    if (peerId !== null) {
        console.log('I am slave');
        peerCom.begin(peerId);
        showModal('mod_waiting');
    } else {
        console.log('I am master');
        peerCom.begin();
        showModal('mod_gameselect');
    }

    elBody.classList.remove('preload');

    let board = null;

    let start = function (computer=false, skill=0) {
        board.animated = (storage.getItem('animated') !== 'disabled');

        if (computer) { // vs. computer
            board.setSearch(16);
            board.millis = Math.pow(10, skill + 1);
            board.response();
        }

        let onmove = function(evt) {
            let move = evt.detail;
            if (board.online) {
                if (!move.isComputer) {
                    peerCom.send('Move', move);
                }
                else {
                    if (move.check) {
                        notify.flashTitle('Check!');
                    }
                    else {
                        notify.flashTitle('Your move!');
                    }
                }
            }
            if (storage.getItem('notiSound') === 'enabled') {
                if (move.check) { notify.playSound(elSndCheck); }
                else if (move.capture) { notify.playSound(elSndCapture); }
                else { notify.playSound(elSndMove); }
            }
        };
        board.addEventListener('move', onmove);

        let ongameover = function(evt) {
            let details = evt.detail;
            if (board.online) {
                if (details.checkmate) {
                    notify.flashTitle('Checkmate!');
                }
                else {
                    notify.flashTitle('Gameover!');
                }
            }
            elMsgResult.innerHTML = details.message;
            showModal('mod_gameover');
        };
        board.addEventListener('gameover', ongameover);

        let cls = (computer) ? 'play_computer' : (board.online) ? 'play_online' : 'play_local';
        elBody.classList.add(cls);
    }

    // DOM
    let resize = function () {
        let availWidth = elGame.clientWidth;
        let availHeight = elGame.clientHeight;


        let height = availHeight;
        let width = ~~((height * 9)/10) + 1;
        if (width > availWidth) {
            width = availWidth;
            height = ~~((width * 10)/9) + 1;
        }

        width -= 2; // borders
        height -= 2;

        elBoard.style.width = width + 'px';
        elBoard.style.height = height + 'px';

        elMessages.scrollTop = elMessages.scrollHeight;

        if (board) { board.resize(); }
    };
    window.addEventListener('resize', resize);
    //resize(); // Not necessary because of setBoardSize() below

    let skillChange = function (evt) {
        let skill = evt.target.selectedIndex;
        elSelSkill.options[skill].selected = true;
        elSelSideSkill.options[skill].selected = true;
    };
    elSelSkill.addEventListener('change', skillChange);
    elSelSideSkill.addEventListener('change', skillChange);

    elBtnOnline.addEventListener('click', function () {
        showModal('mod_shareurl');
    });

    elBtnLocal.addEventListener('click', function () {
        board = new Board(elBoard, TYPE_LOCAL, false, 0);
        start();
        hideModals();
    });

    elBtnComputer.addEventListener('click', function() {
        showModal('mod_computer');
    });

    elBtnComputerStart.addEventListener('click', function() {
        board = new Board(elBoard, 1 - elSelFirstMove.selectedIndex, false, elSelHandicap.selectedIndex);
        start(true, elSelSkill.selectedIndex);
        hideModals();
    });

    elMsgUrl.addEventListener('click', function () {
        window.getSelection().selectAllChildren(elMsgUrl);
    });

    elBtnCopyUrl.addEventListener('click', function () {
        window.getSelection().selectAllChildren(elMsgUrl);
        document.execCommand('copy');
    });

    elBtnChat.addEventListener('click', function () {
        elBody.classList.toggle('chat');
        if (elBody.classList.contains('chat')) {
            elBody.classList.remove('unread');
        }
        resize();
    });

    elBtnSettings.addEventListener('click', function () {
        elBody.classList.toggle('settings');
        resize();
    });

    elBtnCloseGameover.addEventListener('click', function () {
        hideModals();
    });

    elBtnSendMsg.addEventListener('click', function() {
        let msg = elTxtMsg.value;
        elTxtMsg.value = '';
        if (msg.replace(/\s/g, '').length) {
            peerCom.send('Message', msg);
            let html = '';
            html += '<div class="sent">';
            html += '<span class="person">You</span>';
            html += '<span class="content"><span>' + msg + '</span></span>';
            html += '</div>';
            elMessages.innerHTML += html;
        }
        elMessages.scrollTop = elMessages.scrollHeight;
    });

    elTxtMsg.addEventListener('keypress', function (evt) {
        if (evt.keyCode === 13 && !evt.shiftKey) {
            evt.preventDefault();
            elBtnSendMsg.click();
        }
    });

    elBtnUndo.addEventListener('click', function (evt) {
        if (board) { board.retract(); }
    });

    let setBoardSize = function () {
        if (storage.getItem('boardSize') === 'disabled') {
            elBoard.style.maxWidth = '';
            elBoard.style.maxHeight = '';
        }
        else {
            elBoard.style.maxWidth = '521px';
            elBoard.style.maxHeight = '577px';
        }
        resize();
    };
    elChkBoardSize.addEventListener('change', function(evt) {
        let status = elChkBoardSize.checked ? 'enabled' : 'disabled';
        storage.setItem('boardSize', status);
        setBoardSize();
    });
    elChkBoardSize.checked = !(storage.getItem('boardSize') === 'disabled');
    setBoardSize();

    elChkNotiSound.addEventListener('change', function(evt) {
        let status = elChkNotiSound.checked ? 'enabled' : 'disabled';
        storage.setItem('notiSound', status);
    });
    elChkNotiSound.checked = (storage.getItem('notiSound') === 'enabled');

    elChkAnimated.addEventListener('change', function(evt) {
        let status = elChkAnimated.checked ? 'enabled' : 'disabled';
        storage.setItem('animated', status);
        if (board) {
            board.animated = elChkAnimated.checked;
        }
    });
    elChkAnimated.checked = (storage.getItem('animated') !== 'disabled');

    elChkNotiPush.addEventListener('change', function(evt) {
        if (notify.pushStatus() !== 'granted' && elChkNotiPush.checked) {
            notify.pushAsk(function (permission) {
                if (permission === 'granted') {
                    storage.setItem('notiPush', 'enabled');
                }
                else if (permission === 'denied') {
                    elChkNotiPush.checked = false;
                    elChkNotiPush.disabled = true;
                }
            });
        }
        else {
            let status = elChkNotiPush.checked ? 'enabled' : 'disabled';
            storage.setItem('notiPush', status);
        }
    });
    if (notify.pushStatus() === 'denied') { // disable
        elChkNotiPush.checked = false;
        elChkNotiPush.disabled = true;
    }
    else {
        elChkNotiPush.checked = (storage.getItem('notiPush') === 'enabled');
    }

    // Peer2Peer
    peerCom.addEventListener('wait', function (evt) {
        let peerUrl = new URL(window.location.href);
        peerUrl.searchParams.set('peerId', evt.detail);

        console.log('Have peer connect to: ' + peerUrl);
        elMsgUrl.innerHTML = peerUrl.href;

        peerWait.classList.toggle('hide');
        peerShow.classList.toggle('hide');
    });

    peerCom.addEventListener('connectedpeer', function (evt) {
        console.log('A peer connected');

        if (!peerId) { // New game
            board = new Board(elBoard, TYPE_FIRSTMOVE, true, 0);
            start();
        }
        peerId = evt.detail;

        if (board) { // Send start signal to peer
            peerCom.send('Start', {
                type: board.computer,
                moves: board.pos.mvList
            });
        }
        hideModals();

        // Append URL with peerId
        let peerUrl = new URL(window.location.href);
        peerUrl.searchParams.set('peerId', peerId);
        window.history.pushState({ path: peerUrl.href }, '', peerUrl.href);
    });

    peerCom.addEventListener('disconnected', function () {
        console.log('Peer disconnected')
        showModal('mod_disconnected');
    });

    // Peer2Peer Data
    // Games Start / Reconnect
    peerCom.addReceiveHandler('Start', function (obj) {
        board = new Board(elBoard, (obj.type) ? 0 : 1, true, 0);
        for (let i = 1, len = obj.moves.length-1; i < len; ++i) {
            board.addMove(obj.moves[i], board.computerMove());
        }
        start();
        board.addMove(obj.moves[obj.moves.length-1], board.computerMove());
        hideModals();
    });

    // Move
    let notiMove = null;
    peerCom.addReceiveHandler('Move', function (move) {
        board.addMove(move.move, true);
        if (!document.hasFocus()) {
            if (storage.getItem('notiPush') === 'enabled') {
                // We should check for gameover here
                notiMove = notify.pushNotify('Your Move');
            }
        }
    });
    window.addEventListener('focus', function(evt) {
        if (notiMove) { notiMove.close(); }
    });

    // Chat
    peerCom.addReceiveHandler('Message', function(msg) {
        let html = '';
        html += '<div class="received">';
        html += '<span class="person">Opponent</span>';
        html += '<span class="content"><span>' + msg + '</span></span>';
        html += '</div>';
        elMessages.innerHTML += html;
        elMessages.scrollTop = elMessages.scrollHeight;
        if (!document.hasFocus()) {
            if (storage.getItem('notiPush') === 'enabled') {
                let noti = notify.pushNotify('New Message', 'Opponent: ' + msg);
                window.setTimeout(noti.close.bind(noti), 5000);
            }
        }
        if (!elBody.classList.contains('chat')) {
            elBody.classList.add('unread');
        }
    });
}

main();

