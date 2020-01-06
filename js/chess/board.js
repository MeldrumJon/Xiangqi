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

const RESULT_UNKNOWN = 0;
const RESULT_WIN = 1;
const RESULT_DRAW = 2;
const RESULT_LOSS = 3;

const BOARD_WIDTH = 521;
const BOARD_HEIGHT = 577;
const SQUARE_SIZE = 57;
const SQUARE_LEFT = (BOARD_WIDTH - SQUARE_SIZE * 9) >> 1;
const SQUARE_TOP = (BOARD_HEIGHT - SQUARE_SIZE * 10) >> 1;
const THINKING_SIZE = 32;
const THINKING_LEFT = (BOARD_WIDTH - THINKING_SIZE) >> 1;
const THINKING_TOP = (BOARD_HEIGHT - THINKING_SIZE) >> 1;
const MAX_STEP = 8;
const PIECE_NAME = [
  "oo", null, null, null, null, null, null, null,
  "rk", "ra", "rb", "rn", "rr", "rc", "rp", null,
  "bk", "ba", "bb", "bn", "br", "bc", "bp", null,
];

function SQ_X(sq) {
  return SQUARE_LEFT + (FILE_X(sq) - 3) * SQUARE_SIZE;
}

function SQ_Y(sq) {
  return SQUARE_TOP + (RANK_Y(sq) - 3) * SQUARE_SIZE;
}

function MOVE_PX(src, dst, step) {
  return Math.floor((src * step + dst * (MAX_STEP - step)) / MAX_STEP + .5) + "px";
}

const STARTUP_FEN = [
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w",
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKAB1R w",
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/R1BAKAB1R w",
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/9/1C5C1/9/RN2K2NR w",
];

export default class Board extends EventTarget {
    constructor(element, computer, online, handicap) {
      super();
      this.online = online;
      this.computer = computer;

      this.pos = new Position();
      this.pos.fromFen(STARTUP_FEN[handicap]);
      this.animated = true;
      this.search = null;
      this.imgSquares = [];
      this.sqSelected = 0;
      this.mvLast = 0;
      this.millis = 0;
      this.result = RESULT_UNKNOWN;
      this.busy = false;
      this.gameover = false;
    
      var style = element.style;
      style.position = "relative";
      style.width = BOARD_WIDTH + "px";
      style.height = BOARD_HEIGHT + "px";
      style.backgroundImage = "url(" + RESOURCES + "board.svg)";
      var this_ = this;
      for (var sq = 0; sq < 256; sq ++) {
        if (!IN_BOARD(sq)) {
          this.imgSquares.push(null);
          continue;
        }
        var img = document.createElement("img");
        img.setAttribute('draggable', true);
        img.setAttribute('width', SQUARE_SIZE);
        img.setAttribute('height', SQUARE_SIZE);
        var style = img.style;
        style.position = "absolute";
        style.left = SQ_X(sq) + 'px';
        style.top = SQ_Y(sq) + 'px';
        style.width = SQUARE_SIZE + 'px';
        style.height = SQUARE_SIZE + 'px';
        style.zIndex = 0;
        img.onmousedown = function(sq_) {
          return function(evt) {
            this_.clickSquare(sq_);
          }
        } (sq);
        img.ondragstart = function(evt) {
          this.style.opacity = 0;
        }
        img.ondragend = function(evt) {
          this.style.opacity = 1;
        }
        img.ondragover = function (evt) {
          evt.preventDefault();
        }
        img.ondrop = function (sq_) {
          return function(evt) {
            evt.preventDefault();
            var saveAnimate = this_.animated; // Disable animation when dragging and dropping.
            this_.animated = false;
            this_.clickSquare(sq_);
            this_.animated = saveAnimate;
          }
        } (sq);
        element.appendChild(img);
        this.imgSquares.push(img);
      }
    
      this.thinking = new Image(43, 11);
      this.thinking.alt = "Thinking...";
      this.thinking.src = RESOURCES + 'thinking.gif';
      this.thinking.style.position = 'absolute';
      this.thinking.style.left = THINKING_LEFT + "px";
      this.thinking.style.top = THINKING_TOP + "px";
      this.thinking.style.display = 'none';
      element.appendChild(this.thinking);
    
      this.dummy = document.createElement("div");
      this.dummy.style.position = "absolute";
      element.appendChild(this.dummy);
    
      this.flushBoard();
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
    
      var sqSrc = this.flipped(SRC(mv));
      var xSrc = SQ_X(sqSrc);
      var ySrc = SQ_Y(sqSrc);
      var sqDst = this.flipped(DST(mv));
      var xDst = SQ_X(sqDst);
      var yDst = SQ_Y(sqDst);
      var style = this.imgSquares[sqSrc].style;
      style.zIndex = 256;
      var step = MAX_STEP - 1;
      var this_ = this;
      var timer = setInterval(function() {
        if (step == 0) {
          clearInterval(timer);
          style.left = xSrc + "px";
          style.top = ySrc + "px";
          style.zIndex = 0;
          this_.postAddMove(mv, computerMove);
        } else {
          style.left = MOVE_PX(xSrc, xDst, step);
          style.top = MOVE_PX(ySrc, yDst, step);
          step --;
        }
      }, 16);
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
        if (!this.animated || sqMate == 0) {
          this.postMate(computerMove);
          return;
        }
        sqMate = this.flipped(sqMate);
        var style = this.imgSquares[sqMate].style;
        style.zIndex = 256;
        var xMate = SQ_X(sqMate);
        var step = MAX_STEP;
        var this_ = this;
        var timer = setInterval(function() {
          if (step == 0) {
            clearInterval(timer);
            style.left = xMate + "px";
            style.zIndex = 0;
            this_.imgSquares[sqMate].src = RESOURCES +
                (this_.pos.sdPlayer == 0 ? "r" : "b") + "km.svg";
            this_.postMate(computerMove);
          } else {
            style.left = (xMate + ((step & 1) == 0 ? step : -step) * 2) + "px";
            step --;
          }
        }, 50);
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
        this.postAddMove2();
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
          this.postAddMove2();
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
          this.postAddMove2();
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
    
      this.postAddMove2();
      this.response();
    }
    
    postAddMove2() {
      if (typeof this.onAddMove == "function") {
        this.onAddMove();
      }
    }
    
    postMate(computerMove) {
      let gameoverDetails = {
        checkmate: true,
        message: computerMove ? "You lose, but keep up the good work!" : "Congratulations on your victory!"
      };
      this.dispatchEvent(new CustomEvent('gameover', { detail: gameoverDetails }));
      this.postAddMove2();
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
      var this_ = this;
      setTimeout(function() {
        this_.addMove(this_.search.searchMain(LIMIT_DEPTH, this_.millis), true);
        this_.thinking.style.display = "none";
      }, 250);
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
