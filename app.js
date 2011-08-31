var express = require('express');
var app = module.exports = express.createServer();
var io = require('socket.io'), io = io.listen(app);
require('nko')('lVPBSrY5xGfGLbvo');
io.set('log level',1)
var redis_client = require("redis-node").createClient();
redis_client.select(5);

var port_to_use = 3000;

var OFF                  = 0;
var PLAYER_GOOD_YELLOW   = 1;
var PLAYER_GOOD_BLUE     = 2;
var PLAYER_GOOD_PINK     = 3;
var PLAYER_BAD_YELLOW    = 4;
var PLAYER_BAD_BLUE      = 5;
var PLAYER_BAD_PINK      = 6;
var COMPUTER_YELLOW      = 7;
var COMPUTER_BLUE        = 8;
var COMPUTER_PINK        = 9;
var BAD                  = 0;
var GOOD                 = 1;
var INIT_PIECE_X         = 33;
var INIT_PIECE_Y         = 0;

var FALLSPEED            = 250;
var SINGLE_SCORE         = 2;
var CHAIN_SCORE          = 6;
var MELTDOWN_SCORE       = -25

// Game specifics
var game = {
  total_players: 0,
  players: {},
  board:[],
  good_score: 0,
  bad_score: 0,
  size_y: 30,
  size_x: 72,
  DOM:[]
};

create_board(game.size_x, game.size_y);

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: false, showStack: false}));

});

app.configure('production', function(){
  app.use(express.errorHandler());
  port_to_use = 80;
});

// Routes
app.get('/', function(req, res){
  res.render('index', {
    title: 'MELTDOWN'
  });
});

app.get('/scoreboard/reset', function(req, res){
  redis_client.flushdb();
  res.send('ok');
});


// Socket.io
io.sockets.on('connection', function (socket) {

    socket.on('disconnect', function(data) {
      delete game.players[socket.id];
      game.total_players--;
    });

    socket.emit('youare', socket.id);
    retrieve_score(GOOD);
    retrieve_score(BAD);

    socket.on('register', function(data) {
      console.log('join')
        game.players[socket.id] = {
            id: socket.id,
            name: data.name,
            side: data.side,
            piece: data.side == GOOD ? rand(1,3) : rand(4,6),
            x: INIT_PIECE_X,
            y: INIT_PIECE_Y
        };
        game.total_players++;
        socket.emit('board', game.board);
        socket.broadcast.emit('players', game.players);
    });

    socket.on('move', function(data) {
        movePlayer(socket.id,data)
    });

});

var game_interval = setInterval(function() {

    // iterate over all players
    for(var p in game.players) {
        // are they at the bottom of the board?
        if(p in game.players) {
          movePlayer(p,{y:1})
        }
    }
},FALLSPEED)

var game_firehose = setInterval(function() {
  if(game.total_players > 0) {
    io.sockets.emit('players', game.players);
  }
}, 150);

function movePlayer(p,dir) {
    // console.log(dir)
    if('x' in dir) {

        try {

            var left = game.board[game.players[p].x-1][game.players[p].y];
            var right = game.board[game.players[p].x+1][game.players[p].y];
            if(dir.x<0 && left==0) game.players[p].x += dir.x;
            if(dir.x>0 && right==0) game.players[p].x += dir.x;

        } catch(e) {

            var left = 9;
            var right = 9;

            if(game.players[p].x < game.size_x/2) {
                game.players[p].x = 0;
                var right = game.board[game.players[p].x+1][game.players[p].y];

            } else {
                game.players[p].x = game.size_x-1;
                var left = game.board[game.players[p].x-1][game.players[p].y];
            }

            if(dir.x<0 && left==0) game.players[p].x += dir.x;
            if(dir.x>0 && right==0) game.players[p].x += dir.x;

        }
    }
    if('y' in dir) {
        var below = game.board[game.players[p].x][game.players[p].y+1];
        if (game.players[p].y >= game.size_y-1 ) {
            game.board[game.players[p].x][game.size_y-1] = game.players[p].piece;
            // search for adjacents only add the player piece if we aren't killing a chain
            add_player_piece(p);
            //update score : single placement
            if(check_adjacents(game.players[p].x, game.players[p].y)) increment_score(game.players[p].side, SINGLE_SCORE);

            if(find_chain(game.players[p].x, game.players[p].y)) {
              //update score : full chain
              increment_score(game.players[p].side, CHAIN_SCORE);
            }

            // setup a new piece
            reset_player_piece(p);
        } else if(game.players[p].y <= 0 && below != 0) {
            console.log('TOPPED OUT!');
            io.sockets.emit('meltdown');
            remove_column(game.players[p].x);
            increment_score(game.players[p].side, MELTDOWN_SCORE);
        } else {
            // check the block below
            if(below==0) {
                // if there is nothing in the way, move down
                game.players[p].y++;
            } else {
                // if there is something in the way, stop
                game.board[game.players[p].x][game.players[p].y] = game.players[p].piece
                add_player_piece(p);

                //update score : single placement
                if(check_adjacents(game.players[p].x, game.players[p].y)) increment_score(game.players[p].side, SINGLE_SCORE);

                if(find_chain(game.players[p].x, game.players[p].y, game.players[p].piece)) {
                  //update score : full chain
                  increment_score(game.players[p].side, CHAIN_SCORE);
                }

                // setup a new piece
                reset_player_piece(p);
            }
        }
    }
}

function piece_is_similar(a,b) {
    var ret = false;
    if(a==b) { ret = true }

    if(a==1) { if(b==4 || b==7) { ret = true }}
    if(a==2) { if(b==5 || b==8) { ret = true }}
    if(a==3) { if(b==6 || b==9) { ret = true }}

    if(a==4) { if(b==1 || b==7) { ret = true }}
    if(a==5) { if(b==2 || b==8) { ret = true }}
    if(a==6) { if(b==3 || b==9) { ret = true }}

    if(a==7) { if(b==1 || b==7) { ret = true }}
    if(a==8) { if(b==2 || b==8) { ret = true }}
    if(a==9) { if(b==3 || b==9) { ret = true }}

    return ret;
}

function find_chain(x, y, piece) {
  //console.log('finding chains for ' + x + ',' + y)
  // check below
  if(piece_is_similar(game.board[x][y], game.board[x][y+1])) {
    //console.log('found 1 below : ' + game.board[x][y] + ',' +game.board[x][y+1])
    if(piece_is_similar(game.board[x][y+1],game.board[x][y+2])) {
      //console.log('found 2 below')
      if(piece_is_similar(game.board[x][y+2], game.board[x][y+3])) {
        console.log('found 3 below -- KILL TOWER!')
        console.log('piece: ' + piece)
        remove_piece(x,y+1);
        remove_piece(x,y+2);
        remove_piece(x,y+3);
        remove_piece(x,y);

        if(piece > 3) { //were you bad??
          console.log('found 3 below -- EXPLODE')
          add_piece(x,y+4,'random');
          add_piece(x,y+3,'random');
          add_piece(x,y+2,'random');

          add_piece(x+1,y+3,'random');
          add_piece(x-1,y+3,'random');

          io.sockets.emit('audio_explode');
          console.log('sending explode')
        } else {
          console.log('found 3 below -- IMPLODE')
          remove_piece(x,y+4)
          remove_piece(x,y+3)
          remove_piece(x,y+2)

          remove_piece(x+1,y+2);
          remove_piece(x-1,y+2);
          io.sockets.emit('audio_implode');

        }

        return true;
      }
    }
  }

  // check above
  if(piece_is_similar(game.board[x][y],game.board[x][y-1])) {
    //console.log('found 1 above')
    if(piece_is_similar(game.board[x][y-1], game.board[x][y-2])) {
      //console.log('found 2 above')
      if(piece_is_similar(game.board[x][y-2], game.board[x][y-3])) {
        console.log('found 3 above -- KILL')
        remove_piece(x,y-1);
        remove_piece(x,y-2);
        remove_piece(x,y-3);
        remove_piece(x,y);

        if(piece > 3) { //were you bad??
          console.log('found 3 above -- EXPLODE')
          add_piece(x,y, 'random');
          add_piece(x,y-1, 'random');
          add_piece(x,y-2, 'random');

          add_piece(x+1,y-1, 'random');
          add_piece(x-1,y-1, 'random');

          io.sockets.emit('audio_explode')
        } else {
          //console.log('found 3 above -- KILL')
          remove_piece(x,y);
          remove_piece(x,y-1);
          remove_piece(x,y-2);

          remove_piece(x+1,y-1);
          remove_piece(x-1,y-1);
          io.sockets.emit('audio_implode');
        }

        return true;
      }
    }
  }

  if(x < (game.size_x - 1)) {
  // check right
    if(piece_is_similar(game.board[x][y], game.board[x+1][y])) {
      //console.log('found 1 to the right')
      if(x < (game.size_x - 2)) {
        if(piece_is_similar(game.board[x+1][y], game.board[x+2][y])) {
          //console.log('found 2 to the right')
          if(x < (game.size_x - 3)) {
            if(piece_is_similar(game.board[x+2][y], game.board[x+3][y])) {
              //console.log('found 3 to the right -- KILL')
              remove_piece(x,y);
              remove_piece(x+1,y);
              remove_piece(x+2,y);
              remove_piece(x+3,y);

              if(piece > 3) { //were you bad??
                console.log('found 3 to the right -- EXPLODE')
                add_piece(x+4,y, 'random');
                add_piece(x+3,y, 'random');
                add_piece(x+2,y, 'random');

                add_piece(x+3,y-1, 'random');
                add_piece(x+3,y+1, 'random');

                io.sockets.emit('audio_explode')
              } else {
                //console.log('found 3 to the right -- KILL')
                remove_piece(x+3,y);
                remove_piece(x+4,y);
                remove_piece(x+2,y);

                remove_piece(x+3,y-1);
                remove_piece(x+3,y+1);
                io.sockets.emit('audio_implode');
              }

              return true;
            }
          }
        }
      }
    }
  }

  if(x > 0) {
    // check left
    if(piece_is_similar(game.board[x][y], game.board[x-1][y])) {
      //console.log('found 1 to the left')
      if(x > 1) {
        if(piece_is_similar(game.board[x-1][y], game.board[x-2][y])) {
          //console.log('found 2 to the left')
          if(x > 2) {
            if(piece_is_similar(game.board[x-2][y], game.board[x-3][y])) {
              remove_piece(x,y);
              remove_piece(x-1,y);
              remove_piece(x-2,y);
              remove_piece(x-3,y);

              if(piece > 3) { //were you bad??
                //console.log('found 3 to the left -- ADD')
                add_piece(x-4,y, 'random');
                add_piece(x-3,y, 'random');
                add_piece(x-2,y, 'random');

                add_piece(x-3,y-1, 'random');
                add_piece(x-3,y+1, 'random');

                io.sockets.emit('audio_explode')
              } else {
                //console.log('found 3 to the left -- KILL')
                remove_piece(x-3,y);
                remove_piece(x-4,y);
                remove_piece(x-2,y);

                remove_piece(x-3,y-1);
                remove_piece(x-3,y+1);
                io.sockets.emit('audio_implode');
              }
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

function check_adjacents(x, y) {
  console.log('checking for '+ x + ', ' + y)
  //check right
  if(71 < (game.size_x - 1)) {
    if(piece_is_similar(game.board[x][y], game.board[x+1][y])) {
      return true;
    }
  }

  if(x > 0) {
    //check left
    if(piece_is_similar(game.board[x][y], game.board[x-1][y])) {
      return true;
    }
  }

  if(y > 0) {
    //check up
    if(piece_is_similar(game.board[x][y], game.board[x][y-1])) {
      return true;
    }
  }

  if(y < (game.size_y - 1)) {
    //check down
    if(piece_is_similar(game.board[x][y], game.board[x][y+1])) {
      return true;
    }
  }
  return false;
}

function retrieve_score(side) {
  var s = side;
  redis_client.hget("scoreboard", "side" + side, function(err, score) {
    console.log('Grabbed most recent score, it is ' + score);
    io.sockets.emit('score_update', {score:score, side:s})
  });
}

function increment_score(side, amount) {
  var s = side;
  redis_client.hincrby("scoreboard", "side" + side, amount, function(err, score) {
    console.log('Updated score to ' + score);
    io.sockets.emit('score_update', {score:score, side:s})
  });
  io.sockets.emit('score_diff', {diff:amount,side:s});
}

function reset_player_piece(p) {
    game.players[p].x = rand(15,game.size_x-15);//INIT_PIECE_X;
    game.players[p].y = INIT_PIECE_Y;
    game.players[p].piece = game.players[p].side == GOOD ? rand(1,3) : rand(4,6);

    // really only need to send this to one user..
    io.sockets.emit('land',{player:p})
}

function add_player_piece(p) {
  io.sockets.emit('add_board_piece', {
    x: game.players[p].x,
    y: game.players[p].y,
    piece: game.players[p].piece
  });
}

function remove_piece(x,y) {
  if(x >= 0 && x < game.size_x && y >= 0 && y < game.size_y) {
    console.log('Removing piece @ ' + x + ', ' + y)
    game.board[x][y] = 0;
    io.sockets.emit('remove_piece',{x:x, y:y});
  }
}

function add_piece(x,y, piece) {
  if(x >= 0 && x < game.size_x && y >= 0 && y < game.size_y) {
    console.log('Adding piece @ ' + x + ', ' + y)
    game.board[x][y] = piece != 'random' ? piece : rand(7,9);
    io.sockets.emit('add_board_piece',{x:x, y:y, piece: game.board[x][y]});
  }
}

function remove_column(x) {
    for(var y = 0; y < game.size_y; y++) {
        game.board[x][y] = 0;
    }
    io.sockets.emit('remove_column',x)
}

function convertToBoardPiece(v) {
    return Math.abs(v) * 10;
}

function rand(from,to) {
//  return Math.floor(Math.random() * max + min);
    return Math.round(Math.random() * (to - from) + from);
}

function create_board(size_x, size_y) {
  console.log('creating board')

  for(var x = 0; x < size_x; x++) {
    game.board[x] = [];
    for(var y = 0; y < size_y; y++) {
      game.board[x][y] = OFF;
    }
  }

  // add some computahhhs
  for(var i = 1; i <= 3000; i++) {
    var y = rand(Math.round((game.size_y-1) / 3 * 2), size_y-1);
    var x = rand(0, size_x-1);

    // times 10 equal computahh piece
   game.board[x][y] = rand(7,9)
  }
}

app.listen(port_to_use);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
