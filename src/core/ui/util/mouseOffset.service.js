(function(){
    'use strict';
    angular.module('gantt').service('ganttMouseOffset', [ function() {
        // Mouse offset support for lesser browsers (read IE 8)

        return {
            toMouseEvent: function(evt) {
                if (evt.touches !== undefined) {
                    return evt.touches[0];
                } else if (evt.originalEvent && evt.originalEvent.touches) {
                    alert("touch");
                    return evt.originalEvent.touches[0];
                }
                return evt;
            },
            getOffset: function(evt) {
                if (evt.offsetX && evt.offsetY) {
                    return { x: evt.offsetX, y: evt.offsetY };
                }
                if (evt.layerX && evt.layerY) {
                    return { x: evt.layerX, y: evt.layerY };
                }
                return this.getOffsetForElement(evt.target, evt);
            },
            getOffsetForElement: function(el, evt) {
                var bb = el.getBoundingClientRect();
                return { x: evt.clientX - bb.left, y: evt.clientY - bb.top };
            }
        };
    }]);
}());
