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
var YELLOW               = 'yellow';
var BLUE                 = 'blue'
var PINK                 = 'pink'

var socket = 0;
var side = 0;
var game = {
    drawEngine:'DOM',
    colors:{
        1:'yellow',
        2:'blue',
        3:'pink'
    },
    size_x:72,
    size_y:30,
    spriteWidth:16,
    spriteHeight:16,
    me:0,
    DOM_players:{},
    DOM_board:[],
    players:{},
    board:[],
    movementSpeed:100
}

if(window.location.hash !== '#dev') {
    console = { log:function(m) { /* om nom nom */ } }
}

for(var x = 0; x<game.size_x; x++) {
   game.DOM_board[x] = [];
   for(var y = 0; y<game.size_y; y++) {
       game.DOM_board[x][y] = 0
   }
}

function float_message(text) {
    $('<div class="scoremodal">' + text + '</div>').css({
          left:$('#container').width()/2 - 250 - 18,
          fontSize:120
    }).appendTo('#container').
        animate({top:100, opacity: 1, fontSize:90}, 1000,'linear', function() {
            setTimeout(function(which) {
                $(which).fadeOut(function() {
                    $(which).remove()
                });
            },1000,this)
        }
    )

}

function rand(from,to) {
    return Math.round(Math.random() * (to - from) + from);
}

function shakeScene() {
    Crafty.audio.play('meltdown')
    $stage = $('#container');
    var left = $stage.position().left;
    var top = $stage.position().top;

    for(var shakes = 0; shakes < 50; shakes ++) {
        setTimeout(function() {
            $stage.css({
                left:rand(left-shakes/2,left+shakes/2),
                top:rand(top-shakes/2,top+shakes/2)
            })
        },20*shakes)
    }
    setTimeout(function() {
        $stage.css({
            top:top,
            left:left
        })
    },20*shakes);

}

function setup_socket_events() {
    socket.on('connect',function() {

        socket.emit('register',{
            name:'meltdown',
            side:side
        });

        // which player am i?
        socket.on('youare',function(data) {
            // console.log(data)
            game.me = data
        });

        // put players where they belong, including you
        socket.on('players',function(data) {
            game.players = data;
            render.players();
        });

        // prepare the board
        socket.on('board',function(data) {
            game.board = data;
            render.board();
        });

        // land a piece (used for sound effects)
        socket.on('land', function() {
            Crafty.audio.play('land')
        });

        // add a new board piece
        socket.on('add_board_piece', function(data) {
            game.board[data.x][data.y] = data.piece
            render.piece(data);
        });

        socket.on('remove_piece',function(data) {
            game.board[data.x][data.y] = 0;
            if(typeof game.DOM_board[data.x][data.y] == 'object') {

                setTimeout(function(d,y) {
                    game.DOM_board[d.x][d.y].tween({
                        alpha:0
                    },70)
                },0,data);
                setTimeout(function(d) {
                    game.DOM_board[d.x][d.y].destroy();
                    //game.DOM_board[d.x][d.y] = 0;
                },1000,data)
            }
        });

        socket.on('score_update', function(data) {
          console.log('updated score: ' + data.score + ' for side ' + data.side)
          if(data.side == BAD) {
            console.log(add_commas(data.score))
            $('#badscore.hud').html(add_commas(data.score));
          } else {
            console.log(add_commas(data.score))
            $('#goodscore.hud').html(add_commas(data.score));
          }
        });

        socket.on('score_diff', function(data) {
          console.log('score diff of ' + data.diff)
          score_diff = (data.diff > 0 ? '+': '') + data.diff;
          if(data.side == side) {
              $('<div class="scoremodal">' + score_diff + '</div>').css({
                  left:$('#container').width()/2 - 250 - 18,
                  fontSize:210
              }).appendTo('#container').
                animate({top:100, opacity: 1, fontSize:90}, Math.abs(data.diff)*100,'linear', function() {
                    $(this).fadeOut(function() {
                        $(this).remove()
                    });
                })
            }
        });

        socket.on('audio_explode',function(x) {
            Crafty.audio.play('explode')
        });

        socket.on('audio_implode',function(x) {
            Crafty.audio.play('implode')
        });

        socket.on('meltdown',function() {
            shakeScene();
        });

        socket.on('put',function(data) {
            game.players[data.p].x = data.x;
            game.players[data.p].y = data.y;
        });

        // socket.on('remove_column',function(x) {
        //     console.log('remove_column')
        //     for(var row = 0; row < game.size_y; row++) {
        //         console.log(game.DOM_board[x][row]);
        //         if(typeof game.DOM_board[x][row] == 'object') {
        //             game.DOM_board[x][y].tween({
        //                 alpha:0,
        //                 y:game.DOM_board[x][y]._y-10
        //             },40)
        //             game.board[x][row] = 0;
        //             //game.DOM_board[x][row].destroy();
        //             //game.DOM_board[x][row] = 0;
        //         }
        //     }
        // });

        socket.on('drop_player',function(player) {
            game.DOM_players[player].destroy();
            game.DOM_players[player] = 0
        })

    });
}

function join_game() {

    $('#choosegood, #choosebad').fadeOut();

    $('#goodguy, #badguy, #goodscore, #badscore').show().fadeOut(0).fadeIn(500);
    if(side==GOOD) {
        $('#goodhand').show().fadeOut(0).fadeIn(500);
    } else {
        $('#badhand').show().fadeOut(0).fadeIn(500);
    }

    setTimeout(function() { float_message('Use arrow keys<br> to move') }, 1000);
    setTimeout(function() { float_message('Stack matching colors'); }, 4000);

    // start the game once the animations hand finish
    setTimeout(function() {
        //load takes an array of assets and a callback when complete
        Crafty.load(["/images/sprite.png"], function () {
            game.mainScene = Crafty.scene("main"); //when everything is loaded, run the main scene
        });

    },500)
}

$(function() {

    $('#choosegood').live('click',function() {
        side = GOOD;
        join_game();
    })

    $('#choosebad').live('click',function() {
        side = BAD;
        join_game();
    })

    Crafty.sprite(16, "/images/sprites.png", {
        '1': [0, 0],
        '2': [1, 0],
        '3': [2, 0],
        '4': [0, 1],
        '5': [1, 1],
        '6': [2, 1],
        '7': [0, 2],
        '8': [1, 2],
        '9': [2, 2]
    });

    Crafty.audio.add('land','audio/land.ogg');
    Crafty.audio.add('implode','audio/cleared.ogg');
    Crafty.audio.add('explode','audio/echo.ogg');
    Crafty.audio.add('meltdown','audio/radiation.ogg');
    Crafty.audio.add('music','audio/music.ogg');
    Crafty.audio.settings('music',{volume:.6});

    side = rand(0,1);
    if(side==GOOD) { $('#badhand').hide() } else { $('#goodhand').hide() }

    // dev tools
    $(document).keydown(function(e) {
        if(e.keyCode==49) game.players[game.me].piece.color('pink')
        if(e.keyCode==50) game.players[game.me].piece.color('cyan')
        if(e.keyCode==51) game.players[game.me].piece.color('yellow')
    })

    loadComponents();

    //start crafty
    Crafty.init(game.size_x * game.spriteWidth, game.size_y * game.spriteHeight);

    Crafty.scene("loading", function () {

       //black background with some loading text
        Crafty.background("#000");
        Crafty.e("2D, DOM, Text").attr({ w: 100, h: 20, x: 150, y: 120 })
            .text("Loading")
            .css({ "text-align": "center" });
    });

    //automatically play the loading scene
    Crafty.scene("loading");

    Crafty.scene("main", function () {

        Crafty.background('url(/images/grid.png)')

        socket = io.connect(document.location.hostname);
        socket.on('news', function (data) {
            console.log(data);
            socket.emit('my other event', { my: 'data' });
        });

        setup_socket_events();

        var chrome = $.browser.chrome = /chrome/.test(navigator.userAgent.toLowerCase());
        if(chrome) {
            Crafty.audio.play('music',10)
        }

        keyboardInput = Crafty.e('gridMovement, Keyboard').gridMovement({
            up:   'W',
            down: 'S',
            left: 'A',
            right:'D',
            up_secondary:'UP_ARROW',
            down_secondary:'DOWN_ARROW',
            left_secondary:'LEFT_ARROW',
            right_secondary:'RIGHT_ARROW'
            },
        game.movementSpeed,game.spriteWidth)

    });

    fitToScreen();
    $(window).resize(fitToScreen)

});

function fitToScreen() {
    // position elements
    var $stage = $('#cr-stage');
    $('#container').css({
        top:0,
        left:$(window).width()/2 - $('#container').width()/2,
        height:$('#container').height()+60
    })

    $('#badguy').css({
        left:$stage.position().left + $stage.width() - $('#badguy').width() - 4
    })
    $('#goodguy').css({
        left:$stage.position().left + 4
    });
    $('#badhand').css({
        left:$stage.position().left + $stage.width() - $('#badguy').width() - 150
    });
    $('#goodhand').css({
        left:$stage.position().left + 150
    });

    $('#node_vote').css({
        left:$('#container').width()/2 - $('#node_vote').width()/2 +10
    })

}

function add_commas(nStr) {
  nStr += '';
  x = nStr.split('.');
  x1 = x[0];
  x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }
  return x1 + x2;
}
