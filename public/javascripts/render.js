var render = {
    players:function() {
        for(var p in game.players) {

            // move the hand
            if(p==game.me && game.players[p].y<2) {
                if(side==GOOD) {
                    if(game.players[p].piece == PLAYER_GOOD_YELLOW) var handcolor = 'yellow';
                    if(game.players[p].piece == PLAYER_GOOD_BLUE) var handcolor = 'blue';
                    if(game.players[p].piece == PLAYER_GOOD_PINK) var handcolor = 'pink';
                    $('#goodhand').css({
                        zIndex:200,
                        backgroundImage:'url(images/goodhand_' + handcolor + '.png)'
                    })
                    .stop()
                    .animate({
                        left:game.players[p].x*game.spriteWidth-110
                    },100)

                } else {
                    if(game.players[p].piece == PLAYER_BAD_YELLOW) var handcolor = 'yellow';
                    if(game.players[p].piece == PLAYER_BAD_BLUE) var handcolor = 'blue';
                    if(game.players[p].piece == PLAYER_BAD_PINK) var handcolor = 'pink';
                    $('#badhand').css({
                        zIndex:200,
                        backgroundImage:'url(images/badhand_' + handcolor + '.png)'
                    })
                    .stop()
                    .animate({
                        zIndex:200,
                        left:game.players[p].x*game.spriteWidth-30
                    },100)
                }

            }

            if(typeof game.DOM_players[p] == 'undefined') {
                game.DOM_players[p] = Crafty.e('2D, ' + game.drawEngine)
            }

            game.DOM_players[p]
            .attr({
                x:game.players[p].x * game.spriteWidth,
                y:game.players[p].y * game.spriteHeight,
                _alpha:p==game.me ? 1 : .3
            })
            .removeComponent('1')
            .removeComponent('2')
            .removeComponent('3')
            .removeComponent('-1')
            .removeComponent('-2')
            .removeComponent('-3')
            .addComponent(game.players[p].piece+ '')
        }


    },

    board:function() {

        for(var x = 0; x < game.size_x; x++) {
            for(var y = 0; y < game.size_y; y++) {
                if(typeof game.DOM_board[x][y]  == 'object') {
                    game.DOM_board[x][y].destroy()
                    game.DOM_board[x][y] = 0;
                }
            }
        }

        for(var x = 0; x < game.size_x; x++) {
            for(var y = 0; y < game.size_y; y++) {
                if(game.board[x][y]) {
                    game.DOM_board[x][y] =
                        Crafty.e('2D, Color, Tween, ' + game.drawEngine)
                        .attr({
                            x:x * game.spriteWidth,
                            y:y * game.spriteHeight
                        })
                        .addComponent(game.board[x][y] + '')
                    console.log('created dom piece ' + x + ', ' + y)
                }
            }
        }

    },

    piece:function(piece) {
        console.log('drawing piece')
        console.log(piece.x + ', ' + piece.y + ' = ' + piece.piece)
        // if there is already a piece here, kill it first
        if(typeof game.DOM_board[piece.x][piece.y]  == 'object') {
            game.DOM_board[piece.x][piece.y].destroy();
            game.DOM_board[piece.x][piece.y] = 0;
        }

        game.DOM_board[piece.x][piece.y] = Crafty.e('2D, Color, Tween, ' + game.drawEngine)
            .attr({
                x:piece.x * game.spriteWidth,
                y:piece.y * game.spriteHeight,
                alpha:1
            })
            .addComponent(piece.piece + '')
            //.tween({alpha:1},20)

            //flicker(game.DOM_board[piece.x][piece.y])

    }
}

function flicker(piece) {
    setTimeout(function(piece) {
        piece.tween({alpha:0},30)
    },50,piece)
    setTimeout(function(piece) {
        piece.tween({alpha:1},30)
    },350,piece)

}