/*
board.js - Source Code for XiangQi Wizard Light, Part IV

XiangQi Wizard Light - a Chinese Chess Program for JavaScript
Designed by Morning Yellow, Version: 1.0, Last Modified: Sep. 2012
Copyright (C) 2004-2012 www.xqbase.com

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along
with this program; if not, write to the Free Software Foundation, Inc.,
51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

const RESOURCES = 'res/';

const THINKING_WIDTH = 43;
const THINKING_HEIGHT = 11;

const ROWS = 9;
const COLS = 8;
const RIVER = 4;

const RESULT_UNKNOWN = 0;
const RESULT_WIN = 1;
const RESULT_DRAW = 2;
const RESULT_LOSS = 3;

const ANIM_STEP = 8;
const MAX_STEPS = 16;

const PIECE_NAME = [
  "oo", null, null, null, null, null, null, null,
  "rk", "ra", "rb", "rn", "rr", "rc", "rp", null,
  "bk", "ba", "bb", "bn", "br", "bc", "bp", null,
];
const STARTUP_FEN = [
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w",
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKAB1R w",
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/R1BAKAB1R w",
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/9/1C5C1/9/RN2K2NR w",
];

function SQ_X(sq) {
  return (FILE_X(sq) - 3);
}

function SQ_Y(sq) {
  return (RANK_Y(sq) - 3);
}

function MOVE_PX(src, dst, step) {
  return Math.floor((src * step + dst * (MAX_STEP - step)) / MAX_STEP + .5) + "px";
}

export default class Board extends EventTarget {
    constructor(element, computer, online, handicap) {
      super();
      this.element = element

      this.computer = computer;
      this.online = online;

      this.pos = new Position();
      this.pos.fromFen(STARTUP_FEN[handicap]);

      this.animated = false;
      this.search = null;
      this.sqSelected = 0;
      this.mvLast = 0;
      this.millis = 0;
      this.result = RESULT_UNKNOWN;
      this.busy = false;
      this.gameover = false;
    

      this.element.style.position = "relative";

      // Table
      this.table = document.createElement('table');
      this.table.style.position = 'absolute';
      this.table.style.tableLayout = 'fixed';
      this.table.style.borderCollapse = 'collapse';
      this.table.style.borderSpacing = '0';
      this.cells = [];
      for (let j = 0; j < ROWS; ++j) {
          let row = document.createElement('tr');
          for (let i = 0; i < COLS; ++i) {
              let cell = document.createElement('td');
              let border = '1px solid #000';
              if (j !== RIVER) {
                  cell.style.border = border;
              }
              else if (i === 0) {
                  cell.style.borderLeft = border;
              }
              else if (i === COLS-1) {
                  cell.style.borderRight = border;
              }
              if ((j === 0 && i === 3) || (j === 1 && i === 4)
                      || (j === ROWS-1 && i === 4) || (j === ROWS-2 && i === 3)) {
                  cell.classList.add('diagtb');
              }
              else if ((j === 1 && i === 3) || (j === 0 && i === 4)
                      || (j === ROWS-1 && i === 3) || (j === ROWS-2 && i === 4)) {
                  cell.classList.add('diagbt');
              }
              row.append(cell);
              this.cells.push(cell);
          }
          this.table.append(row);
      }
      this.element.append(this.table);
    

      // Pieces
      let pieceMouseDown = function(evt) {
          this.clickSquare(evt.target.XiSqr);
      }.bind(this);
      let pieceDragStart = function(evt) {
          evt.target.style.opacity = 0;
          this.clickSquare(evt.target.XiSqr);
      }.bind(this);
      let pieceDragEnd = function(evt) {
          evt.target.style.opacity = 1;
      };
      let pieceDragOver = function(evt) {
          evt.preventDefault();
      };
      let pieceDrop = function (evt) {
          evt.preventDefault();
          let saveAnimate = this.animated;
          this.animated = false;
          this.clickSquare(evt.target.XiSqr);
          this.animated = saveAnimate;
      }.bind(this);

      this.imgSquares = [];
      let elImgs = document.createElement('div');
      for (let sq = 0; sq < 256; sq++) {
        if (!IN_BOARD(sq)) {
          this.imgSquares.push(null);
          continue;
        }
        let img = document.createElement("img");
        img.XiSqr = sq;
        img.setAttribute('draggable', true);
        img.style.position = "absolute";
        img.addEventListener('mousedown', pieceMouseDown);
        img.addEventListener('dragstart', pieceDragStart);
        img.addEventListener('dragend', pieceDragEnd);
        img.addEventListener('dragover', pieceDragOver);
        img.addEventListener('drop', pieceDrop);
        elImgs.appendChild(img);
        this.imgSquares.push(img);
      }
      element.appendChild(elImgs);
    
      this.thinking = new Image(43, 11);
      this.thinking.alt = "Thinking...";
      this.thinking.src = RESOURCES + 'thinking.gif';
      this.thinking.style.position = 'absolute';
      this.thinking.style.opacity = '0.5';
      this.thinking.style.display = 'none';
      element.appendChild(this.thinking);
    
      this.flushBoard();
      this.resize();
    }

    resize() {
        let width = this.element.clientWidth;
        let height = this.element.clientHeight;

        // Thinking
        this.thinking.style.left = ~~((width - THINKING_WIDTH)/2) + "px";
        this.thinking.style.top = ~~((height - THINKING_HEIGHT)/2) + "px";

        // Table
        let cWidth = ~~(width/(COLS+1) - 1); // -1 account for border
        let cHeight = ~~(height/(ROWS+1) - 1); // -1 account for border
        let cWidthStr = cWidth + 'px';
        let cHeightStr = cHeight + 'px';
        for (let i = 0, len = this.cells.length; i < len; ++i) {
            let cell = this.cells[i];
            cell.style.width = cWidthStr;
            cell.style.height = cHeightStr;
        }
        let tOffTop = ~~((height - this.table.clientHeight)/2); 
        let tOffLeft = ~~((width - this.table.clientWidth)/2); 
        this.table.style.top = tOffTop + 'px';
        this.table.style.left = tOffLeft + 'px';

        cWidth = (this.table.clientWidth-1)/(COLS); // Use actual table cell width/height
        cHeight = (this.table.clientHeight-1)/(ROWS);

        // Points
        let pSize = ~~(cHeight);
        pSize = (pSize & 1) ? pSize : pSize - 1; // force odd
        let pSizeStr = pSize + 'px';
        let pOffTop = tOffTop - ~~(pSize/2);
        let pOffLeft = tOffLeft - ~~(pSize/2);
        for (let i = 0, len = this.imgSquares.length; i < len; ++i) {
            let img = this.imgSquares[i];
            if (!img) { continue; }
            let sq = img.XiSqr;
            img.style.width = pSizeStr;
            img.style.height = pSizeStr;
            img.style.top = (pOffTop + cHeight*SQ_Y(sq)) + 'px';
            img.style.left = (pOffLeft + cWidth*SQ_X(sq)) + 'px';
        }
    }
    
    
    setSearch(hashLevel) {
      this.search = (hashLevel == 0) ? null : new Search(this.pos, hashLevel);
      console.log(this.search);
    }
    
    flipped(sq) {
      return (this.computer == 0) ? SQUARE_FLIP(sq) : sq;
    }
    
    computerMove() {
      return this.pos.sdPlayer == this.computer;
    }
    
    computerLastMove() {
      return 1 - this.pos.sdPlayer == this.computer;
    }
    
    addMove(mv, computerMove) {
      if (!this.pos.legalMove(mv) || !this.pos.makeMove(mv)) {
        return;
      }
      this.busy = true;
    
      if (!this.animated) {
        this.postAddMove(mv, computerMove);
        return;
      }
    
      let srcStyle = this.imgSquares[this.flipped(SRC(mv))].style;
      let dstStyle = this.imgSquares[this.flipped(DST(mv))].style;
      let srcX = parseInt(srcStyle.left, 10);
      let srcY = parseInt(srcStyle.top, 10);
      let dstX = parseInt(dstStyle.left, 10);
      let dstY = parseInt(dstStyle.top, 10);
      let a = dstX - srcX;
      let b = dstY - srcY;
      let dist = Math.sqrt(a*a + b*b);
      let steps = ~~(dist/ANIM_STEP);
      if (steps > MAX_STEPS) { steps = MAX_STEPS; }

      srcStyle.zIndex = 256;
      let anim = function() {
          if (steps === 0) {
              this.postAddMove(mv, computerMove);
              srcStyle.left = srcX + 'px';
              srcStyle.top = srcY + 'px';
              srcStyle.zIndex = 0;
          }
          else {
              let goalX = parseInt(dstStyle.left, 10);
              let goalY = parseInt(dstStyle.top, 10);
              let atX = parseInt(srcStyle.left, 10);
              let atY = parseInt(srcStyle.top, 10);
              let stepX = (goalX - atX)/steps;
              let stepY = (goalY - atY)/steps;
              srcStyle.left = (atX + stepX) + 'px';
              srcStyle.top = (atY + stepY) + 'px';
              --steps;
              requestAnimationFrame(anim);
          }
      }.bind(this);
      requestAnimationFrame(anim);
    }
    
    postAddMove(mv, computerMove) {
      if (this.mvLast > 0) {
        this.drawSquare(SRC(this.mvLast), false);
        this.drawSquare(DST(this.mvLast), false);
      }
      this.drawSquare(SRC(mv), true);
      this.drawSquare(DST(mv), true);
      this.sqSelected = 0;
      this.mvLast = mv;
    

      let moveDetails = {
        move: mv,
        isComputer: computerMove,
        check: false,
        capture: false
      };
    
      if (this.pos.isMate()) {
        this.result = computerMove ? RESULT_LOSS : RESULT_WIN;
        this.gameover = true;
    
        var pc = SIDE_TAG(this.pos.sdPlayer) + PIECE_KING;
        var sqMate = 0;
        for (var sq = 0; sq < 256; sq ++) {
          if (this.pos.squares[sq] == pc) {
            sqMate = sq;
            break;
          }
        }

        if (computerMove || this.computer == -1) {
          moveDetails.check = true;
        }
        this.dispatchEvent(new CustomEvent('move', { detail: moveDetails }));
        // dispatchEvent 'gameover' is in postMate()

        // Choose to animate king
        if (sqMate == 0) {
          this.postMate(computerMove);
          return;
        }
        else if (!this.animated) {
          sqMate = this.flipped(sqMate);
          this.imgSquares[sqMate].src = RESOURCES + 
              (this.pos.sdPlayer == 0 ? "r" : "b") + "km.svg";
          this.postMate(computerMove);
          return;
        }
        sqMate = this.flipped(sqMate);
        let style = this.imgSquares[sqMate].style;
        let x = parseInt(style.left, 10);
        let steps = ANIM_STEP-1;

        style.zIndex = 256;
        let anim = function() {
            if (steps === 0) {
                style.left = x + 'px';
                style.zIndex = 0;
                this.imgSquares[sqMate].src = RESOURCES + 
                    (this.pos.sdPlayer == 0 ? "r" : "b") + "km.svg";
                setTimeout(this.postMate(computerMove), 250);
            }
            else {
                style.left = (x + ((steps & 1) == 0 ? steps : -steps) * 2) + "px";
                --steps;
                requestAnimationFrame(anim);
            }
        }.bind(this);
        requestAnimationFrame(anim);
        return;
      }
    
      var vlRep = this.pos.repStatus(3);
      if (vlRep > 0) {
        let msg;
        vlRep = this.pos.repValue(vlRep);
        if (vlRep > -WIN_VALUE && vlRep < WIN_VALUE) {
          this.result = RESULT_DRAW;
          msg = "Draw from repetition!";
        } else if (computerMove == (vlRep < 0)) {
          this.result = RESULT_LOSS;
          msg = "You lose, but please don't give up!";
        } else {
          this.result = RESULT_WIN;
          msg = "Congratulations on your win!";
        }
        let gameoverDetails = {
          checkmate: false,
          message: msg
        };
        this.dispatchEvent(new CustomEvent('move', { detail: moveDetails }));
        this.dispatchEvent(new CustomEvent('gameover', { detail: gameoverDetails }));
        this.busy = false;
        return;
      }
    
      if (this.pos.captured()) {
        var hasMaterial = false;
        for (var sq = 0; sq < 256; sq ++) {
          if (IN_BOARD(sq) && (this.pos.squares[sq] & 7) > 2) {
            hasMaterial = true;
            break;
          }
        }
        if (!hasMaterial) {
          this.result = RESULT_DRAW;
          let gameoverDetails = {
            checkmate: false,
            message: "Draw! Neither side has any offensive pieces."
          };
          this.dispatchEvent(new CustomEvent('move', { detail: moveDetails }));
          this.dispatchEvent(new CustomEvent('gameover', { detail: gameoverDetails }));
          this.busy = false;
          return;
        }
      } else if (this.pos.pcList.length > 100) {
        var captured = false;
        for (var i = 2; i <= 100; i ++) {
          if (this.pos.pcList[this.pos.pcList.length - i] > 0) {
            captured = true;
            break;
          }
        }
        if (!captured) {
          this.result = RESULT_DRAW;
          let gameoverDetails = {
            checkmate: false,
            message: "Draw!"
          };
          this.dispatchEvent(new CustomEvent('move', { detail: moveDetails }));
          this.dispatchEvent(new CustomEvent('gameover', { detail: gameoverDetails }));
          this.busy = false;
          return;
        }
      }
    
      if (this.pos.inCheck() && (computerMove || this.computer == -1)) {
        moveDetails.check = true;
      } 
      else {
        if (this.pos.captured()) {
          moveDetails.capture = true;
        }
      }

      this.dispatchEvent(new CustomEvent('move', { detail: moveDetails }));
    
      this.response();
    }
    
    postMate(computerMove) {
      let gameoverDetails = {
        checkmate: true,
        message: computerMove ? "You lose, but keep up the good work!" : "Congratulations on your victory!"
      };
      this.dispatchEvent(new CustomEvent('gameover', { detail: gameoverDetails }));
      this.busy = false;
    }
    
    response() {
      if (!this.computerMove()) { // player's move
          this.busy = false;
          return;
      }
      else if (this.online) { // online game, opponent's move
          this.busy = true;
          return;
      }
      else if (this.search == null) { // local game
        this.busy = false;
        return;
      }
      // Computer game, computer's move
      this.busy = true; // Should have already happened, but stay busy until computer makes a move
      this.thinking.style.display = "inline-block";
      let think = function() {
        this.addMove(this.search.searchMain(LIMIT_DEPTH, this.millis), true);
        this.thinking.style.display = "none";
      }.bind(this);
      setTimeout(think, 250);
    }
    
    clickSquare(sq_) {
      if (this.busy || this.result != RESULT_UNKNOWN) {
        return;
      }
      var sq = this.flipped(sq_);
      var pc = this.pos.squares[sq];
      if ((pc & SIDE_TAG(this.pos.sdPlayer)) != 0) {
        if (this.mvLast != 0) {
          this.drawSquare(SRC(this.mvLast), false);
          this.drawSquare(DST(this.mvLast), false);
        }
        if (this.sqSelected) {
          this.drawSquare(this.sqSelected, false);
        }
        this.drawSquare(sq, true);
        this.sqSelected = sq;
      } else if (this.sqSelected > 0) {
        this.addMove(MOVE(this.sqSelected, sq), false);
      }
    }
    
    drawSquare(sq, selected) {
      var img = this.imgSquares[this.flipped(sq)];
      var name = PIECE_NAME[this.pos.squares[sq]];
      if (name === 'oo') {
        img.src = RESOURCES + name + ".gif";
      }
      else {
        img.src = RESOURCES + name + ".svg";
      }
      img.style.backgroundImage = selected ? "url(" + RESOURCES + "oos.svg)" : "";
    }
    
    flushBoard() {
      this.mvLast = this.pos.mvList[this.pos.mvList.length - 1];
      for (var sq = 0; sq < 256; sq ++) {
        if (IN_BOARD(sq)) {
          this.drawSquare(sq, sq == SRC(this.mvLast) || sq == DST(this.mvLast));
        }
      }
    }
    
    restart(fen) {
      if (this.busy) {
        return;
      }
      this.result = RESULT_UNKNOWN;
      this.pos.fromFen(fen);
      this.flushBoard();
      this.response();
    }
    
    retract() {
      if (this.busy) {
        return;
      }
      this.result = RESULT_UNKNOWN;
      if (this.pos.mvList.length > 1) {
        this.pos.undoMakeMove();
      }
      if (this.pos.mvList.length > 1 && this.computerMove()) {
          console.log(this.computer, this.computerMove());
        this.pos.undoMakeMove();
      }
      this.flushBoard();
      this.response();
    }
}
