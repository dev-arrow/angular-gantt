'use strict';
gantt.factory('GanttColumn', [ 'moment', function(moment) {
    // Used to display the Gantt grid and header.
    // The columns are generated by the column generator.
    var Column = function(date, endDate, left, width, calendar, timeFramesWorkingMode, timeFramesNonWorkingMode, columnMagnetValue, columnMagnetUnit) {
        var self = this;

        self.date = date;
        self.endDate = endDate;
        self.left = left;
        self.width = width;
        self.calendar = calendar;
        self.duration = self.endDate.diff(self.date, 'milliseconds');
        self.timeFramesWorkingMode = timeFramesWorkingMode;
        self.timeFramesNonWorkingMode = timeFramesNonWorkingMode;
        self.timeFrames = [];
        self.visibleTimeFrames = [];
        self.daysTimeFrames = {};
        self.cropped = false;
        self.columnMagnetValue = columnMagnetValue;
        self.columnMagnetUnit = columnMagnetUnit;

        if (self.calendar !== undefined && (self.timeFramesNonWorkingMode !== 'hidden' || self.timeFramesWorkingMode !== 'hidden')) {
            var buildPushTimeFrames = function(timeFrames, startDate, endDate) {
                return function(timeFrame) {
                    var start = timeFrame.start;
                    if (start === undefined) {
                        start = startDate;
                    }

                    var end = timeFrame.end;
                    if (end === undefined) {
                        end = endDate;
                    }

                    if (start < self.date) {
                        start = self.date;
                    }

                    if (end > self.endDate) {
                        end = self.endDate;
                    }

                    timeFrame = timeFrame.clone();

                    timeFrame.start = moment(start);
                    timeFrame.end = moment(end);

                    timeFrames.push(timeFrame);
                };
            };

            var cDate = moment(self.date).startOf('day');
            while (cDate < self.endDate) {
                var timeFrames = self.calendar.getTimeFrames(cDate);
                var nextCDate = moment.min(moment(cDate).add(1, 'day'), moment(self.endDate));
                timeFrames = self.calendar.solve(timeFrames, cDate, nextCDate);
                var cTimeFrames = [];
                angular.forEach(timeFrames, buildPushTimeFrames(cTimeFrames, cDate, nextCDate));
                cDate = nextCDate;
                self.timeFrames = self.timeFrames.concat(cTimeFrames);

                var year = cDate.year();
                if (self.daysTimeFrames[year] === undefined) {
                    self.daysTimeFrames[year] = {dayOfYear: cTimeFrames};
                } else {
                    self.daysTimeFrames[year][cDate.dayOfYear()] = cTimeFrames;
                }
            }

            angular.forEach(self.timeFrames, function(timeFrame) {
                var positionDuration = timeFrame.start.diff(self.date, 'milliseconds');
                var position = positionDuration / self.duration * self.width;

                var timeFrameDuration = timeFrame.end.diff(timeFrame.start, 'milliseconds');
                var timeFramePosition = timeFrameDuration / self.duration * self.width;

                var hidden = false;
                if (timeFrame.working && self.timeFramesWorkingMode !== 'visible') {
                    hidden = true;
                } else if (!timeFrame.working && self.timeFramesNonWorkingMode !== 'visible') {
                    hidden = true;
                }

                if (!hidden) {
                    self.visibleTimeFrames.push(timeFrame);
                }

                timeFrame.hidden = hidden;
                timeFrame.left = position;
                timeFrame.width = timeFramePosition;
            });

            if (self.timeFramesNonWorkingMode === 'cropped' || self.timeFramesWorkingMode === 'cropped') {
                var timeFramesWidth = 0;
                angular.forEach(self.timeFrames, function(timeFrame) {
                    if (!timeFrame.working && self.timeFramesNonWorkingMode !== 'cropped' ||
                        timeFrame.working && self.timeFramesWorkingMode !== 'cropped') {
                        timeFramesWidth += timeFrame.width;
                    }
                });

                if (timeFramesWidth !== self.width) {
                    var croppedRatio = self.width / timeFramesWidth;
                    var croppedWidth = 0;

                    var allCropped = true;

                    angular.forEach(self.timeFrames, function(timeFrame) {
                        if (!timeFrame.working && self.timeFramesNonWorkingMode !== 'cropped' ||
                            timeFrame.working && self.timeFramesWorkingMode !== 'cropped') {
                            timeFrame.left = (timeFrame.left - croppedWidth) * croppedRatio;
                            timeFrame.width = timeFrame.width * croppedRatio;
                            timeFrame.cropped = false;
                            allCropped = false;
                        } else {
                            croppedWidth += timeFrame.width;
                            timeFrame.left = undefined;
                            timeFrame.width = 0;
                            timeFrame.cropped = true;
                        }
                    });

                    self.cropped = allCropped;
                }
            }
        }

        self.clone = function() {
            return new Column(self.date.clone(), self.endDate.clone(), self.left, self.width, self.calendar);
        };

        self.containsDate = function(date) {
            return moment(date) > self.date && moment(date) <= self.endDate;
        };

        self.equals = function(other) {
            return self.date === other.date;
        };

        self.getMagnetDate = function(date) {
            if (self.columnMagnetValue > 0 && self.columnMagnetUnit !== undefined) {
                date = date.clone();
                var value = date.get(self.columnMagnetUnit);
                var magnetValue = Math.round(value/self.columnMagnetValue) * self.columnMagnetValue;
                date.startOf(self.columnMagnetUnit);
                date.set(self.columnMagnetUnit, magnetValue);
                return date;
            }
            return date;
        };

        var getDateByPositionUsingTimeFrames = function(timeFrames, position) {
            for (var i=0; i < timeFrames.length; i++) {
                // TODO: performance optimization could be done.
                var timeFrame = timeFrames[i];
                if (!timeFrame.cropped && position >= timeFrame.left && position <= timeFrame.left + timeFrame.width) {
                    var positionDuration = timeFrame.getDuration() / timeFrame.width * (position - timeFrame.left);
                    var date = moment(timeFrame.start).add(positionDuration, 'milliseconds');
                    return date;
                }
            }
        };

        self.getDateByPosition = function(position, magnet) {
            var positionDuration;
            var date;

            if (position < 0) {
                position = 0;
            }
            if (position > self.width) {
                position = self.width;
            }

            if (self.timeFramesNonWorkingMode === 'cropped' || self.timeFramesWorkingMode === 'cropped') {
                date = getDateByPositionUsingTimeFrames(self.timeFrames, position);
            }

            if (date === undefined) {
                positionDuration = self.duration / self.width * position;
                date = moment(self.date).add(positionDuration, 'milliseconds');
            }


            if (magnet) {
                return self.getMagnetDate(date);
            }

            return date;
        };

        var getDayTimeFrame = function(date) {
            var dtf = self.daysTimeFrames[date.year()];
            if (dtf === undefined) {
                return [];
            }
            dtf = dtf[date.dayOfYear()];
            if (dtf === undefined) {
                return [];
            }
            return dtf;
        };

        self.getPositionByDate = function(date) {
            var positionDuration;
            var position;

            if (self.timeFramesNonWorkingMode === 'cropped' || self.timeFramesWorkingMode === 'cropped') {
                var croppedDate = date;
                var timeFrames = getDayTimeFrame(croppedDate);
                for (var i=0; i < timeFrames.length; i++) {
                    var timeFrame = timeFrames[i];
                    if (croppedDate >= timeFrame.start && croppedDate <= timeFrame.end) {
                        if (timeFrame.cropped) {
                            if (timeFrames.length > i+1) {
                                croppedDate = timeFrames[i+1].start;
                            } else {
                                croppedDate = timeFrame.end;
                            }
                        } else {
                            positionDuration = croppedDate.diff(timeFrame.start, 'milliseconds');
                            position = positionDuration / timeFrame.getDuration() * timeFrame.width;
                            return self.left + timeFrame.left + position;
                        }
                    }
                }
            }

            positionDuration = date.diff(self.date, 'milliseconds');
            position = positionDuration / self.duration * self.width;

            if (position < 0) {
                position = 0;
            }

            if (position > self.width) {
                position = self.width;
            }

            return self.left + position;
        };
    };
    return Column;
}]);
