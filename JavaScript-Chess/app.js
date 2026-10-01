const SYMBOLS = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const initialBoard = () => [
    [
        {type:"r",color:"b",moved:false},
        {type:"n",color:"b",moved:false},
        {type:"b",color:"b",moved:false},
        {type:"q",color:"b",moved:false},
        {type:"k",color:"b",moved:false},
        {type:"b",color:"b",moved:false},
        {type:"n",color:"b",moved:false},
        {type:"r",color:"b",moved:false}
    ],

    Array.from({length:8},
        () => ({type:"p",color:"b",moved:false})),
        Array(8).fill(null),
        Array(8).fill(null),
        Array(8).fill(null),
        Array(8).fill(null),
        Array.from({length:8}, () => ({type:"p", color:"w", moved:false})),
            [
                {type:"r",color:"w",moved:false},
                {type:"n",color:"w",moved:false},
                {type:"b",color:"w",moved:false},
                {type:"q",color:"w",moved:false},
                {type:"k",color:"w",moved:false},
                {type:"b",color:"w",moved:false},
                {type:"n",color:"w",moved:false},
                {type:"r",color:"w",moved:false},
            ]
];

const state = {
    board: initialBoard(),
    turn: "w",
    selected: null,
    legalMoves: [],
    history: [],
    enPassant: null,
    gameOver: false
};

const boardEl = document.querySelector("#board");
const statusEl = document.querySelector("#status");
const moveListEl = document.querySelector("#move-list");
const promotionModal = document.querySelector("#promotion-modal");
const promotionOptions = document.querySelector("#promotion-options");

document.querySelector("#new-game").addEventListener("click", newGame);
document.querySelector("#undo").addEventListener("click", undo);
document.querySelector("#save").addEventListener("click", saveGame);
document.querySelector("#load").addEventListener("click", loadGame);

function cloneBoard(board) {
    return board.map(row => row.map(piece => piece ? {...piece} : null));
}

function inside(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function opposite(color) {
    return color === "w" ? "b" : "w";
}

function squareName(r, c) {
    return FILES[c] + (8 - r);
}

function render() {
    boardEl.innerHTML = "";

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const button = document.createElement("button");
            button.className = `square ${(r + c) % 2 === 0 ? "light" : "dark"}`;

            if (state.selected && state.selected.r === r && state.selected.c === c) {

                button.classList.add("selected");
            }

            const move = state.legalMoves.find(m => m.r === r && m.c === c);
            if (move) button.classList.add(state.board[r][c] ? "capture" : "legal");

            if (c === 0) {
                const rank = document.createElement("span");
                rank.className = "coord rank";
                rank.textContent = 8-r;
                button.appendChild(rank);
            }

            if (r === 7) {
                const file = document.createElement("span");
                file.className = "coord file";
                file.textContent = FILES[c];
                button.appendChild(file);
            }

            const piece = state.board[r][c];

            if (piece) {
                const span = document.createElement("span");
                span.className = `piece ${piece.color === "w" ? "white" : "black"}`;
                span.textContent = SYMBOLS[piece.color][piece.type];
                button.appendChild(span);
            }

            button.addEventListener("click", () => handleSquareClick(r, c));
            boardEl.appendChild(button);
        }
    }    
    
    updatePanel();
}

function updatePanel() {

    const inCheck = isInCheck(state.board, state.turn);
    const legal = allLegalMoves(state.board, state.turn, state.enPassant);

    if (state.gameOver) {
        statusEl.textContent = "Game Over";
    } else if (legal.length === 0 && inCheck) {
        statusEl.textContent = `${state.turn === "w" ? "Black" : "White"} wins by checkmate`;
    } else if (legal.length === 0) {
        statusEl.textContent = "Draw by stalement";
    } else {
        statusEl.textContent = `${state.turn === "w" ? "White" : "Black"} to move${inCheck ?"-CHECK!" : ""}`;
    }

    document.querySelector("#white-card").classList.toggle("active", state.turn === "w" && !state.gameOver);
    document.querySelector("#black-card").classList.toggle("active", state.turn === "b" && !state.gameOver);
    document.querySelector("#white-status").textContent = state.turn === "w" ? "Your turn" : "Waiting";
    document.querySelector("#black-status").textContent = state.turn === "b" ? "Your turn" : "Waiting";

    moveListEl.innerHTML = "";
    state.history.forEach((move, i) => {
        const li = document.createElement("li");
        li.textContent = `${i + 1}. ${move.notation}`;
        moveListEl.appendChild(li);
    });
}

function handleSquareClick(r, c) {
    if (state.gameOver) return;

    const clicked = state.board[r][c];

    if (state.selected) {
        const move = state.legalMoves.find(m => m.r === r && m.c === c);
        if (move) {
            makeMove(state.selected.r, state.selected.c, r, c, move); 
            return;
        }
    }

    if (clicked && clicked.color === state.turn) {
        state.selected = {r, c};
        state.legalMoves = legalMovesForPiece(state.board, r, c, state.enPassant);
    } else {
        state.selected = null;
        state.legalMoves = [];
    }

    render();
}

function pseudoMoves(board, r, c, enPassant) {
    const piece = board[r][c];
    if (!piece) return [];

    const moves = [];

    const add = (nr, nc, extra = {}) => {
        if (!inside(nr, nc)) return;
        const target = board[nr][nc];
        if (!target) moves.push({r:nr,c:nc,...extra});
        else if (target.color !== piece.color && target.type !== "k") {
            moves.push({r:nr,c:nc,...extra});
        }
    };

    if (piece.type === "p") {
        const dir = piece.color === "w" ? -1 : 1;
        const start = piece.color === "w" ? 6 : 1;

        if (inside(r+dir,c) && !board[r + dir][c]) {
            moves.push({r:r + dir, c});
            if (r === start && !board[r + 2 * dir][c]) moves.push({r : r + 2 * dir, c, doublePawn : true});
        }

        for (const dc of [-1, 1]) {
            const nr = r + dir, nc = c + dc;

            if (!inside(nr, nc)) continue;
            const target = board[nr][nc];

            if (target && target.color !== piece.color && target.type !== "k") {
                moves.push({r : nr, c : nc});
            }

            if (enPassant && enPassant.r === nr && enPassant.c === nc) {
                moves.push({r : nr, c : nc, enPassant : true});
            }
        }
    }

    if (piece.type === "n") {
        [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([dr, dc]) => add(r + dr, c + dc));
    }

    if (["b","r","q"].includes(piece.type)) {
    const dirs = [];
    if (["b","q"].includes(piece.type)) dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
    if (["r","q"].includes(piece.type)) dirs.push([-1,0],[1,0],[0,-1],[0,1]);

    for (const [dr,dc] of dirs) {
        let nr = r+dr, nc = c+dc;
        while (inside(nr,nc)) {
        if (!board[nr][nc]) moves.push({r:nr,c:nc});
        else {
            if (board[nr][nc].color !== piece.color && board[nr][nc].type !== "k") {
            moves.push({r:nr,c:nc});
            }
            break;
        }
        nr += dr; nc += dc;
        }
    }
    }

    if (piece.type === "k") {
    for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
        if (dr || dc) add(r+dr,c+dc);
    }

    // Castling is only added here if the king/rook have not moved.
    if (!piece.moved && !isInCheck(board, piece.color)) {
        const enemy = opposite(piece.color);
        const row = piece.color === "w" ? 7 : 0;

        if (c === 4) {
        const rookK = board[row][7];
        if (rookK && rookK.type==="r" && !rookK.moved &&
            !board[row][5] && !board[row][6] &&
            !isSquareAttacked(board,row,5,enemy) &&
            !isSquareAttacked(board,row,6,enemy)) {
            moves.push({r:row,c:6,castle:"king"});
        }

        const rookQ = board[row][0];
        if (rookQ && rookQ.type==="r" && !rookQ.moved &&
            !board[row][1] && !board[row][2] && !board[row][3] &&
            !isSquareAttacked(board,row,3,enemy) &&
            !isSquareAttacked(board,row,2,enemy)) {
            moves.push({r:row,c:2,castle:"queen"});
        }
        }
    }
    }

    return moves;
    }

    function applyMove(board, sr, sc, tr, tc, move, enPassant) {
        const b = cloneBoard(board);
        const piece = b[sr][sc];
        b[tr][tc] = {...piece, moved : true};
        b[sr][sc] = null;

        if (move.enPassant) {
            b[sr][tc] = null;
        }

        if (move.castle === "king") {
            b[tr][5] = {...b[tr][7], moved : true};
            b[tr][7] = null;
        }

        if (move.castle === "queen") {
            b[tr][3] = {...b[tr][0], moved : true};
            b[tr][0] = null;
        }

        return b;
    }

    function findKing(board, color) {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (board[r][c] ?.type === "k" && board[r][c].color === color) return {r, c};
        }
        return null;
    }

    function isSquareAttacked(board, r, c, byColor) {
        for (let sr = 0; sr < 8; sr++) for (let sc = 0; sc < 8; sc++) {
            const p = board[sr][sc];
            if (!p || p.color !== byColor) continue;

            if (p.type === "p") {
                const dir = byColor === "w" ? -1 : 1;
                if (sr + dir === r && Math.abs(sc - c) === 1) return true;
                continue;
            }

            if (p.type === "k") {
                if (Math.abs(sr-r) <= 1 && Math.abs(sc - c) <= 1 && (sr !== r || sc !== c)) return true;
                continue;
            }

            if (["n", "b", "r", "q"].includes(p.type)) {
                const attacks = pseudoMoves(board, sr, sc, null);
                if (attacks.some(m => m.r === r && m.c === c)) return true;
            }
        }
        
        return false;
    }

    function isInCheck(board, color) {
        const king = findKing(board, color);
        return !king || isSquareAttacked(board, king.r, king.c, opposite(color));
    }

    function legalMovesForPiece(board, r, c, enPassant) {
        const piece = board[r][c];
        if (!piece) return [];

        return pseudoMoves(board, r, c, enPassant).filter(move => {
            const next = applyMove(board, r, c, move.r, move.c, move, enPassant);
            return !isInCheck(next, piece.color);
        });
    }

    function allLegalMoves(board, color, enPassant) {
        const result = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (board[r][c] ?.color === color) {
                for (const move of legalMovesForPiece(board, r, c, enPassant)) {
                    result.push({sr : r, sc : c,...move});
                }
            }
        }

        return result;
    }

    function makeMove(sr, sc, tr, tc, move) {
        const piece = state.board[sr][sc];

        state.history.push({
            board: cloneBoard(state.board),
            turn: state.turn,
            enPassant: state.enPassant,
            notation: createNotataion(piece, sr, sc, tr, tc, move)
        });

        state.board = applyMove(state.board, sr, sc, tr, tc, move, state.enPassant);

        state.enPassant = null;
        if (piece.type === "p" && Math.abs(tr - sr) === 2) {
            state.enPassant = {r :(sr + tr)/ 2, c : sc};
        }

        const movedPiece = state.board[tr][tc];
        if (movedPiece.type === "p" && (tr === 0 || tr === 7)) {
            showPromotion(tr, tc, movedPiece.color);
            return;
        }

        finishTurn();
    }

    function finishTurn() {
        state.turn = opposite(state.turn);
        state.selected = null;
        state.legalMoves = [];

        const legal = allLegalMoves(state.board, state.turn, state.enPassant);
        if (legal.length === 0) state.gameOver = true;

        render();
    }

    function createNotataion(piece, sr, sc, tr, tc, move) {
        if (move.castle === "king") return "O-O";
        if (move.castle === "queen") return "O-O-O";

        const capture = !!state.board[tr][tc] || move.enPassant;
        const name = piece.type === "p" ? "" : piece.type.toUpperCase()
        return `${name}${capture ? "x" : ""}${squareName(tr, tc)}`;
    }

    function showPromotion(r, c, color) {
        promotionModal.classList.remove("hidden");
        promotionOptions.innerHTML = "";

        for (const type of ["q", "r", "b", "n"]) {
            const button = document.createElement("button");
            button.textContent = SYMBOLS[color][type];
            button.addEventListener("click", () => {
                state.board[r][c].type = type;
                promotionModal.classList.add("hidden");
                finishTurn();
            });
            promotionOptions.appendChild(button);
        }
    }

    function newGame() {
        state.board = initialBoard();
        state.turn = "w";
        state.selected = null;
        state.legalMoves = [];
        state.history = [];
        state.enPassant = null;
        state.gameOver = false;

        // promotionModal.classList.add("hidden");
        render();
    }

    function undo() {
        const previous = state.history.pop();
        if (!previous) return;

        state.board = previous.board;
        state.turn = previous.turn;
        state.enPassant = previous.enPassant;
        state.selected = null;
        state.legalMoves = [];
        state.gameOver = false;
        render();
    }

    function saveGame() {

        const data = {
            board: state.board,
            turn: state.turn,
            history: state.history,
            enPassant: state.enPassant,
            gameOver: state.gameOver
        };

        localStorage.setItem("offlineChessSave", JSON.stringify(data));
        statusEl.textContent = "Game saved locally";
    }

    function loadGame() {
        const raw = localStorage.getItem("offlineChessSave");
        if (!raw) {
            statusEl.textContent = "NO saved game found";
            return;
        }

        const data = JSON.parse(raw);
        state.board = data.board;
        state.turn = data.turn;
        state.history = data.history || [];
        state.enPassant = data.enPassant || null;
        state.gameOver = !!data.gameOver;
        state.selected = null;
        state.legalMoves = [];
        render();
    }

    render();