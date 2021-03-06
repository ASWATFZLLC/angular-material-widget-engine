angular
    .module('ngMdWidgetEngine', ['ngMaterial', 'ngMdIcons']);
// app
angular
    .module('ngMdWidgetEngine')
    .directive('mdWidgetEngineWidgetDragger', mdWidgetEngineWidgetTileDragger)
    .directive('mdWidgetEngineWidgetTile', mdWidgetEngineWidgetTileDirective)
    .directive('mdWidgetEngineColumn', mdWidgetEngineColumnDirective)
    .directive('mdWidgetEngine', mdWidgetEngineDirective);


// Every widget engine has X columns
function mdWidgetEngineColumnDirective(){
    return {
        scope: false,
        templateUrl: "/src/components/widgetEngine/templates/widgetEngineColumn.html",
        controller: function($scope, $element, $attrs, $transclude, $document, $timeout){
            var mouseMove = function(e){
                // console.log("mouse moving", e);
                $timeout(function(){
                    var newX = e.clientX;
                    var differenceXPercentage =  ((newX - $element[0].children[0].offsetLeft) / $scope.configuration.width) * 100;
                    if($scope.configuration.columns[$scope.columnIndex + 1])
                        $scope.configuration.columns[$scope.columnIndex + 1].size -= differenceXPercentage - $scope.column.size;
                    $scope.column.size = differenceXPercentage;
                });
                
            };

            var mouseUp = function(){
                // console.log("mouse up");
                $document.unbind('mouseup', mouseUp);
                $document.unbind('mousemove', mouseMove);
                $scope.callback("resize", $scope.configuration);
            };

            $scope.setupColumnResizing = function(e){
                event.preventDefault();
                // console.log("mouse down", e);
                $document.on('mouseup', mouseUp);
                $document.on('mousemove', mouseMove);
            };

            $scope.addNewColumn = function(){
                var newColumn = angular.copy($scope.configuration.columns[$scope.columnIndex]);
                newColumn.widgets = []; // reset the columns
                newColumn.size = '';
                $timeout(function(){
                    $scope.configuration.columns.splice($scope.columnIndex + 1, 0, newColumn);
                });
            };

            $scope.removeEmptyColumn = function(){
                var removedColumn = $scope.configuration.columns.splice($scope.columnIndex, 1);
                // check if the total width is less than 100% due to resizing of last column and deleting an empty column
                var totalWidth = 0;
                $scope.configuration.columns.forEach(function(c){
                    totalWidth+= c.size;
                });
                if(totalWidth < 100){
                    // increase the width of columns after the deleted one, equally
                    var currentDeletedColumn = $scope.columnIndex;
                    var totalColumns = $scope.configuration.columns.length;
                    var affectedColumns = totalColumns - currentDeletedColumn;
                    var distributeWidth = (100 - totalWidth) / affectedColumns;
                    for(var i=currentDeletedColumn-1; i<totalColumns; i++){
                        $scope.configuration.columns[i].size += distributeWidth;
                    }
                }
            };

            $element.on('dragenter', function(event){
                $element.addClass("md-widget-engine-column-dashed");
                event.stopPropagation();
            });

            $element.on('dragover', function(event){
                $element.addClass("md-widget-engine-column-dashed");
                event.stopPropagation();
                if(event.preventDefault) event.preventDefault();
            });

            $element.on('dragleave', function(event){
                $element.removeClass("md-widget-engine-column-dashed");
                event.stopPropagation();
            });

            $element.on('drop', function(event){

                // get the positions of swappers
                var draggerPosition = (event.dataTransfer.getData("Text") || event.dataTransfer.getData("text/plain")).split("::");
                if($scope.columnIndex == draggerPosition[0]){
                    $element.removeClass("md-widget-engine-column-dashed");
                    return;  // if dropping in the same column  
                }
                // get the elements
                var draggerElement = $scope.configuration.columns[draggerPosition[0]].widgets[draggerPosition[1]];
                // swap the elements
                var removedWidget = $scope.configuration.columns[draggerPosition[0]].widgets.splice(draggerPosition[1], 1)[0];
                $scope.configuration.columns[$scope.columnIndex].widgets.push(removedWidget);
                // assign configurations
                $element.removeClass("md-widget-engine-column-dashed");
                $document.find(".md-widget-engine-column-dashed").removeClass('md-widget-engine-column-dashed');
                $timeout(function(){
                    $scope.$apply();
                    $scope.callback("update", $scope.configuration);
                }, 150);
                // if source and destination are same, well then move on :P
            });

        },
        link: function($scope, iElm, iAttrs, controller) {}
    };
}

// Every widget column has X widget tiles
function mdWidgetEngineWidgetTileDirective(){
    return {
        scope: false,
        replace: true,
        templateUrl: "/src/components/widgetEngine/templates/widgetEngineWidgetTile.html",
        controller: mdWidgetEngineWidgetTileDirectiveController(),
        link: function($scope, iElm, iAttrs, controller) {}
    };
}

// Every widget can be dragged by a handler who is plays the role of a dragger
function mdWidgetEngineWidgetTileDragger(){
    return function($scope, $element, $attrs, $transclude){
        $element.attr('draggable', 'true');
        $element.on('dragstart dragend', function(event){
            if($scope.widget.sticky) return;
            event = event.originalEvent || event;
            event._initiatedByDragger = true; // this is to inform the parent widget that dragging is started by dragging the child element i.e. the dragger
        });
    };
}


// The main widget engine directive
function mdWidgetEngineDirective(){
    // Runs during compile
    return {
        scope: {
            configuration: "=configuration",
            callback: "=callback"
        },
        templateUrl: "/src/components/widgetEngine/templates/widgetEngine.html",
        controller: function($scope, $element, $attrs, $transclude, $timeout){
            $timeout(function(){
                $scope.configuration.width = $element[0].children[0].offsetWidth;
            });
        },
        link: function($scope, iElm, iAttrs, controller) {}
    };
}



function mdWidgetEngineWidgetTileDirectiveController(){
    var _obj = {};
    _obj._draggedTile = null;

    _obj.controller = function($scope, $element, $attrs, $transclude, $mdDialog, $timeout, $sce, $document){
        $scope.fullscreen = false;
        $scope.widget._internalSettings = {};
        $scope.widget._internalSettings.trustedURL = $sce.trustAsResourceUrl($scope.widget.content);
        $scope.toggleFullscreen = function(){
            $scope.fullscreen = !$scope.fullscreen;
        };

        $scope.toggleSticky = function(){
            $scope.widget.sticky = !$scope.widget.sticky;
        };

        $scope.removeWidget = function(e){
            var confirm = $mdDialog.confirm()
                          .title('Are you sure?')
                          .textContent('Remove the "' + $scope.widget.title + '" widget?')
                          .ariaLabel('Are you sure you want to remove the widget')
                          .targetEvent(e)
                          .ok('Yes')
                          .cancel('Cancel');

            $mdDialog.show(confirm).then(function(){
                $element.addClass('md-widget-engine-widget-remove');
                $timeout(function(){
                    var removedWidget = $scope.configuration.columns[$scope.columnIndex].widgets.splice($scope.widgetIndex, 1);
                }, 200);
            }, function(){});
        };

        // $element.attr("draggable", "true");

        $element.on('dragstart', function(event){
            // only drag when initiated by child
            event.stopPropagation();
            if(!event._initiatedByDragger || $scope.fullscreen){
                if(!(event.dataTransfer.types && event.dataTransfer.types.length)){
                    event.preventDefault();
                }
                event.stopPropagation();
                return;
            }
            // $scope.fullscreen = false; //incase, you know
            $element.addClass("md-widget-engine-widget-moving");
            var draggerPosition = $scope.columnIndex + "::" + $scope.widgetIndex;
            event.dataTransfer.setData("Text", draggerPosition);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.dropEffect = "move";
            event.dataTransfer.setDragImage($element[0], 20, 20);
            _obj._draggedTile = $element;
            // console.log($scope.columnIndex, $scope.widgetIndex);
        });

        $element.on('dragenter', function(event){
            event.stopPropagation();
            if($scope.widget.sticky) return false;
            if($element.hasClass('md-widget-engine-widget-moving')) return;
            $element.addClass("md-widget-engine-widget-dashed");
        });

        $element.on('dragover', function(event){
            event.stopPropagation();
            if($scope.widget.sticky) return false;
            if($element.hasClass('md-widget-engine-widget-moving')) return;
            $element.addClass("md-widget-engine-widget-dashed");
            if(event.preventDefault) event.preventDefault();
        });

        $element.on('dragleave', function(event){
            event.stopPropagation();
            if($scope.widget.sticky) return false;
            $element.removeClass("md-widget-engine-widget-dashed");
        });

        $element.on('dragend', function(event){
            event.stopPropagation();
            if($scope.widget.sticky) return false;
            event = event.originalEvent || event;
            $element.removeClass("md-widget-engine-widget-moving");
            
        });

        $element.on('drop', function(event){
            event.stopPropagation();
            if($scope.widget.sticky) return false;

            // get the positions of swappers
            var draggerPosition = (event.dataTransfer.getData("Text") || event.dataTransfer.getData("text/plain")).split("::");
            if($scope.columnIndex == draggerPosition[0] && $scope.widgetIndex == draggerPosition[1]) return; // no need to drop at the same place
            var dropeePosition = [$scope.columnIndex, $scope.widgetIndex];
            // get the elements
            var draggerElement = $scope.configuration.columns[draggerPosition[0]].widgets[draggerPosition[1]];
            var dropeeElement =  $scope.configuration.columns[dropeePosition[0]].widgets[dropeePosition[1]];
            // swap the elements
            $scope.configuration.columns[draggerPosition[0]].widgets[draggerPosition[1]] = dropeeElement;
            $scope.configuration.columns[dropeePosition[0]].widgets[dropeePosition[1]] = draggerElement;
            
            _obj._draggedTile.removeClass("md-widget-engine-widget-dashed");
            $element.removeClass("md-widget-engine-widget-dashed");

            setTimeout(function(){
                $scope.$apply();
                $scope.callback("update", $scope.configuration);
            }, 150);
            // if source and destination are same, well then move on :P
        });

    };

    return _obj.controller;
}



angular.module('ngMdWidgetEngine').run(['$templateCache', function($templateCache) {$templateCache.put('/src/components/widgetEngine/templates/widgetEngine.html','<div class="md-widget-engine-container" ng-if="configuration.columns">\n    <div class="md-widget-engine">\n        <div layout="row" flex style="height: 100%">\n            <md-widget-engine-column \n                ng-repeat="(columnIndex, column) in configuration.columns" \n                column="column" \n                style="background-color: {{column.background}}; width: {{column.size}}%; min-width: 15%;"\n            ></md-widget-engine-column>\n        </div>\n    </div>\n</div><!-- md-widget-engine-container -->');
$templateCache.put('/src/components/widgetEngine/templates/widgetEngineColumn.html','<div class="md-widget-engine-column" style="height:100%; position:relative">\n    \n    <span class="md-widget-engine-column-resizer" ng-mousedown="setupColumnResizing($event)" ng-show="configuration.columns.length-1 > columnIndex">\n    </span>\n    <div class="md-widget-engine-new-column-handler" ng-show="configuration.columns.length-1 > columnIndex">\n        <div ng-click="addNewColumn()" ng-show="column.widgets.length > 0 && configuration.columns.length < 6">\n            <md-tooltip md-direction="right">Add new column here</md-tooltip>\n            <ng-md-icon icon="add_circle" style="fill: black; font-weight: lighter" size="24" md-ink-ripple="#FFFFFF">\n        </div>\n        <div ng-click="removeEmptyColumn()" ng-show="column.widgets.length == 0">\n            <md-tooltip md-direction="left">Remove this column</md-tooltip>\n            <ng-md-icon icon="remove_circle" style="fill: black; font-weight: lighter" size="24" md-ink-ripple="#FFFFFF">\n        </div>\n    </div>\n\n    <div class="md-widget-engine-widget-tiles-container">\n        <md-widget-engine-widget-tile ng-repeat="(widgetIndex, widget) in column.widgets" widget="widget" widgetIndex="widgetIndex"></md-widget-engine-widget-tile>\n    </div>\n</div><!-- md-widget-engine-column -->');
$templateCache.put('/src/components/widgetEngine/templates/widgetEngineWidgetTile.html','<div class="md-widget-engine-widget-tile-container {{fullscreen ? \'md-widget-engine-widget-fullscreen\' : \'\'}}">\n    <div class="md-widget-engine-widget-tile md-whiteframe-2dp">\n\n        <div class="md-widget-engine-widget-tile-title-container">\n            <md-toolbar class="md-whiteframe-2dp">\n                <div class="md-toolbar-tools">\n                    <div class="md-widget-engine-widget-tile-title">\n                        <span style="cursor: pointer" md-widget-engine-widget-dragger>{{widget.title || \'Widget\'}}</span>\n                    </div>\n                    <span flex></span>\n                    <div class="md-widget-engine-widget-tile-controls-container" >\n                        <div class="md-widget-engine-widget-tile-control" ng-mouseup="removeWidget($event)">\n                            <span class="md-widget-engine-widget-close-control">\n                                <ng-md-icon icon="close" style="fill: lightwhite; font-weight: lighter" size="24">\n                                    <md-tooltip md-direction="bottom">Remove this widget</md-tooltip>\n                                </ng-md-icon>\n                            </span>\n                        </div>\n                        <div class="md-widget-engine-widget-tile-control" ng-click="toggleSticky()" ng-show="widget.stickyControl">\n                            <span class="md-widget-engine-widget-sticky-control">\n                                <ng-md-icon icon="lock_open" style="fill: lightwhite; font-weight: lighter" size="24" ng-if="!widget.sticky">\n                                    <md-tooltip md-direction="bottom">Make this widget sticky</md-tooltip>\n                                </ng-md-icon>\n                                <ng-md-icon icon="lock" style="fill: lightwhite; font-weight: lighter" size="24" ng-if="widget.sticky">\n                                    <md-tooltip md-direction="bottom">Make this widget non-sticky</md-tooltip>\n                                </ng-md-icon>\n                            </span>\n                        </div>\n                        <div class="md-widget-engine-widget-tile-control" ng-click="toggleFullscreen()">\n                            <span class="md-widget-engine-widget-fullscreen-control">\n                                <ng-md-icon icon="fullscreen" style="fill: lightwhite; font-weight: lighter" size="24">\n                                    <md-tooltip md-direction="bottom">Toggle fullscreen mode</md-tooltip>\n                                </ng-md-icon>\n                            </span>\n                        </div>\n                    </div>\n                </div><!-- md-toolbar-tools -->\n            </md-toolbar>\n        </div>\n\n        <div class="md-widget-engine-widget-tile-content-container">\n            <md-content>\n                <div class="md-widget-engine-widget-tile-content resize-vertical" style="min-height:{{widget.minHeight}}px; max-height:{{widget.maxHeight}}">\n                    <div ng-switch on="widget.type">\n                        <div ng-switch-when="include">\n                            <ng-include src="widget.content"></ng-include>\n                        </div><!-- ng-switch-when -->\n\n                        <div ng-switch-when="iframe">\n                            <iframe ng-src="{{widget._internalSettings.trustedURL}}" frameborder=0 style="border:0px; width:100%; height:auto"></iframe>\n                        </div><!-- ng-switch-when -->\n\n                    </div> <!-- ng-switch -->\n                </div>\n            </md-content>    \n        </div>\n\n    </div><!-- md-widget-engine-widget-tile -->\n</div><!-- md-widget-engine-widget-tile-container -->');}]);