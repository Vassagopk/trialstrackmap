angular.module("trialsTrackmap")
    .filter("improveSorter", function (improveTimes) {

        // Less than 0: Sort "a" to be a lower index than "b"
        // Zero: "a" and "b" should be considered equal, and no sorting performed.
        // Greater than 0: Sort "b" to be a lower index than "a".

        function checkImprove(a, b, sortType, mode, bike) {
            // a has no data b got higher
            if (!(sortType in a.improve[mode][bike])
                && sortType in b.improve[mode][bike]) {
                return -1;
                // b has no data a get higher
            } else if (!(sortType in b.improve[mode][bike])
                && sortType in a.improve[mode][bike]) {
                return 1;
            } else if (!(sortType in a.improve[mode][bike]
                && sortType in b.improve[mode][bike])) {
                return 0;
            }

            return null;
        }

        function sortArray(x, y) {
            if (x < y) {
                return -1;
            } else if (x > y) {
                return 1;
            } else {
                return 0;
            }
        }

        return function (array, sortDirection, sortType) {
            if (array) {

                array = array.filter(function (track) {
                    // exclude special tracks
                    if ("leaked" in track && track.leaked
                        || "only_event" in track && track.only_event) {
                        return false;
                    } else {
                        return true;
                    }
                });

                if( sortDirection && sortType) {

                    var error = improveTimes.error,
                        tailOfSortedArray = [],
                        mode = improveTimes.getMode(),
                        bike = improveTimes.getBike();

                    // filter all entries with data and empty seperate in extra array
                    array = array.filter(function (track) {
                        var _return_ = true;

                        switch (sortType) {
                            case "myRank":
                                _return_ = "improve" in track
                                    && track.improve[mode][bike].myRank !== error;
                                break;
                            case "differenceTime":
                            case "differenceTimeMyGoal":
                            case "differenceTimeWR":
                                _return_ = "improve" in track
                                    && sortType in track.improve[mode][bike]
                                    && track.improve[mode][bike][sortType] !== "";
                                break;
                        }

                        if (!_return_) {
                            tailOfSortedArray.push(track);
                        }

                        return _return_;
                    });

                    // compare entries with data
                    array.sort(function (a, b) {
                        var x, y, _return_;

                        switch (sortType) {
                            case "catIndex":
                                x = a.catIndex;
                                y = b.catIndex;
                                break;
                            case "id":
                                x = a.id;
                                y = b.id;
                                break;
                            case "tier":
                                x = a.tier;
                                y = b.tier;
                                break;
                            case "trackName":
                                x = a.i18n;
                                y = b.i18n;
                                break;
                            case "myRank":
                                _return_ = checkImprove(a, b, sortType, mode, bike);
                                if (_return_ !== null) {
                                    return _return_;
                                }

                                x = a.improve[mode][bike][sortType];
                                y = b.improve[mode][bike][sortType];

                                if (x === error
                                    || x === error
                                    && y !== error) {
                                    return -1;
                                } else if (x !== error
                                    && y === error) {
                                    return 1;
                                } else if (x === error
                                    && y === error) {
                                    return 0;
                                }

                                x = parseInt(a.improve[mode][bike][sortType]);
                                y = parseInt(b.improve[mode][bike][sortType]);
                                break;
                            case "differenceTime":
                            case "differenceTimeMyGoal":
                            case "differenceTimeWR":
                                _return_ = checkImprove(a, b, sortType, mode, bike);
                                if (_return_ !== null) {
                                    return _return_;
                                }

                                // both have not data
                                if(!(sortType in a.improve[mode][bike])
                                || a.improve[mode][bike][sortType] === ""
                                || !(sortType in b.improve[mode][bike])
                                || b.improve[mode][bike][sortType] === ""
                                ) {
                                    return -1;
                                }

                                if (!("time" in a.improve[mode][bike][sortType]
                                    && "time" in b.improve[mode][bike][sortType])) {
                                    return 0;
                                    // compare each other
                                } else {
                                    x = a.improve[mode][bike][sortType].time;
                                    y = b.improve[mode][bike][sortType].time;
                                }
                                break;
                        }

                        return sortArray(x, y);
                    });

                    if (sortDirection === "asc") {
                        array.reverse();
                    }

                    // add empty at the end
                    array = array.concat(tailOfSortedArray);
                }
            }

            return array;
        }
    })