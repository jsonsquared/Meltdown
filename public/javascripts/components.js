function loadComponents() {
    // handle movement: left, right, down
    Crafty.c("gridMovement", {
        gridMovement: function(keys, interval, movement) {
            var self = this
            var checkMovement = function(e) {
                if(typeof e == 'undefined') e = { keyCode: 999 }
                if(e.keyCode == keys.down || e.keyCode == keys.down_secondary || self.isDown(Crafty.keys[keys.down]) || self.isDown(Crafty.keys[keys.down_secondary])) {
                    socket.emit('move',{y:1})
                }
                if(e.keyCode == keys.left || e.keyCode == keys.left_secondary || self.isDown(Crafty.keys[keys.left]) || self.isDown(Crafty.keys[keys.left_secondary])) {
                    socket.emit('move',{x:-1})
                }
                if(e.keyCode == keys.right || e.keyCode == keys.right_secondary || self.isDown(Crafty.keys[keys.right]) || self.isDown(Crafty.keys[keys.right_secondary])) {
                    socket.emit('move',{x:1})
                }
            }

            this.gridMovementInterval = setInterval(checkMovement,interval,self)

            this.bind('KeyDown', function(e) {
                clearInterval(this.gridMovementInterval)
                checkMovement(e)
                this.gridMovementInterval = setInterval(checkMovement,interval,self)
            });

            return this;
        }
    });
}