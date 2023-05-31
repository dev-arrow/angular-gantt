gantt.factory('Column', [ 'dateFunctions', function (df) {
    // Used to display the Gantt grid and header.
    // The columns are generated by the column generator.

    var calcDbyP = function(column, maxDateValue, currentPosition) {
        return Math.round(maxDateValue/column.width * currentPosition / (maxDateValue / column.subScale)) * (maxDateValue / column.subScale);
    };

    var calcPbyD = function(column, date, maxDateValue, currentDateValue, a, b) {
        var factor;

        if (date - column.date > 0 && a !== b) {
            factor = 1;
        } else {
            factor = Math.round(currentDateValue/maxDateValue * column.subScale) / column.subScale;
        }

        return Math.round( (column.left + column.width * factor) * 10) / 10;
    };

    var Column = function(date, left, width, subScale) {
        var self = this;
        self.date = date;
        self.left = left;
        self.width = width;
        self.subScale = subScale;

        self.clone = function() {
            return new Column(self.date, self.left, self.width, self.subScale);
        };

        self.equals = function(other) {
            return self.date === other.date;
        };
    };

    var MonthColumn = function(date, left, width, subScale) {
        var column = new Column(date, left, width, subScale);
        column.daysInMonth = df.getDaysInMonth(column.date);

        column.clone = function() {
            return new Column(column.date, column.left, column.width, column.subScale);
        };

        column.getDateByPosition = function(position) {
            if (position < 0) position = 0;
            if (position > column.width) position = column.width;

            var res = df.clone(column.date);
            res.setDate(1 + calcDbyP(column, column.daysInMonth, position));
            return res;
        };

        column.getPositionByDate = function(date) {
            return calcPbyD(column, date, column.daysInMonth, date.getDate(), date.getMonth(), column.date.getMonth());
        };

        return column;
    };

    var WeekColumn = function(date, left, width, subScale, firstDayOfWeek) {
        var column = new Column(date, left, width, subScale);
        column.week = df.getWeek(date);
        column.firstDayOfWeek = firstDayOfWeek;
        column.daysInWeek = 7;

        column.clone = function() {
            var copy = new Column(column.date, column.left, column.width, column.subScale);
            copy.week = column.week;
            return copy;
        };

        // Adjusts the day so that the specified first day of week is index = 0
        var firstDayIs0 = function(day) {
            return ((column.daysInWeek - column.firstDayOfWeek) + day) % column.daysInWeek;
        };

        // Adjusts the day so that Sunday= 0, Monday = 1, ...
        var firstDayIsSunday = function(day) {
            return (column.firstDayOfWeek + day) % column.daysInWeek;
        };

        column.getDateByPosition = function(position) {
            if (position < 0) position = 0;
            if (position > column.width) position = column.width;

            var res = df.clone(column.date);
            var day = Math.round(calcDbyP(column, column.daysInWeek, position));

            // If day === 7, then jump forward to next week
            var direction = day !== 7 && day < column.firstDayOfWeek ? -1: 1; // -1: <<<<< | 1: >>>>>

            df.setToDayOfWeek(res, day !== 7 ? firstDayIsSunday(day): firstDayIsSunday(day) + 7, false, direction);
            return res;
        };

        column.getPositionByDate = function(date) {
            return calcPbyD(column, date, column.daysInWeek, firstDayIs0(date.getDay()), df.getWeek(date), df.getWeek(column.date));
        };

        return column;
    };

    var DayColumn = function(date, left, width, subScale, isWeekend, workHours, showNonWorkHours) {
        var column = new Column(date, left, width, subScale);
        column.isWeekend = isWeekend;
        
        var startHour = 0;
        var endHour = 24;

        if(arguments.length == 7 && !showNonWorkHours && workHours.length > 1){
            startHour = workHours[0];
            endHour = workHours[workHours.length-1] + 1;
        }

        column.clone = function() {
            var copy = new Column(column.date, column.left, column.width, column.subScale);
            copy.isWeekend = column.isWeekend;
            return copy;
        };

        column.getDateByPosition = function(position) {
            if (position < 0) position = 0;
            if (position > column.width) position = column.width;

            var res = df.clone(column.date);
            res.setHours(startHour + calcDbyP(column, (endHour-startHour), position));
            return res;
        };

        column.getPositionByDate = function(date) {
            var maxDateValue = endHour-startHour;
            var currentDateValue = date.getHours()-startHour;
            if (currentDateValue < 0) return column.left;
            else if (currentDateValue > maxDateValue) return column.left + column.width;
            else return calcPbyD(column, date, maxDateValue, currentDateValue, date.getDate(), column.date.getDate());
        };

        return column;
    };

    var HourColumn = function(date, left, width, subScale, isWeekend, isWorkHour) {
        var column = new Column(date, left, width, subScale);
        column.isWeekend = isWeekend;
        column.isWorkHour = isWorkHour;

        column.clone = function() {
            var copy = new Column(column.date, column.left, column.width, column.subScale);
            copy.isWeekend = column.isWeekend;
            copy.isWorkHour = column.isWorkHour;
            return copy;
        };

        column.getDateByPosition = function(position) {
            if (position < 0) position = 0;
            if (position > column.width) position = column.width;

            var res = df.clone(column.date);
            res.setMinutes(calcDbyP(column, 60, position));
            return res;
        };

        column.getPositionByDate = function(date) {
            return calcPbyD(column, date, 60, date.getMinutes(), date.getHours(), column.date.getHours());
        };

        return column;
    };

    return {
        Hour: HourColumn,
        Day: DayColumn,
        Week: WeekColumn,
        Month: MonthColumn
    };
}]);