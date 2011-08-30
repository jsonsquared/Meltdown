function loadComponents() {
    // handle movement: left, right, down
    Crafty.c("gridMovement", {
        gridMovement: function(keys, interval, movement) {
            var self = this
            var checkMovement = function() {
                if(!self.attr('locked')) {
                    if(self.isDown(Crafty.keys[keys.down]) || self.isDown(Crafty.keys[keys.down_secondary])) {
                        socket.emit('move',{y:1})
                    }
                    if(self.isDown(Crafty.keys[keys.left]) || self.isDown(Crafty.keys[keys.left_secondary])) {
                        socket.emit('move',{x:-1})
                    }
                    if(self.isDown(Crafty.keys[keys.right]) || self.isDown(Crafty.keys[keys.right_secondary])) {
                        socket.emit('move',{x:1})
                    }
                }
            }

            this.gridMovementInterval = setInterval(checkMovement,interval,self)

            this.bind('KeyPress', function(e) {
                clearInterval(this.gridMovementInterval)
                checkMovement()
                this.gridMovementInterval = setInterval(checkMovement,interval,self)
            });

            return this;
        }
    });
}