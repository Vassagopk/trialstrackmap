angular.module("trialsTrackmap")
    .service("improveTimes", function (localStorageService, myJson, security, WRTimes, $filter, $timeout) {
        var identifier = "times",
            mode = "",
            bike = "",
            error = "?!?",
            empty = "??????",
            times = {},
            scope,
            pattern = {
                "myRank-android-normal": 0,
                "myTime-android-normal": 1,
                "myRank-android-donkey": 2,
                "myTime-android-donkey": 3,
                "myRank-android-crazy": 4,
                "myTime-android-crazy": 5,
                "myRank-ios-normal": 6,
                "myTime-ios-normal": 7,
                "myRank-ios-donkey": 8,
                "myTime-ios-donkey": 9,
                "myRank-ios-crazy": 10,
                "myTime-ios-crazy": 11,
                "myGoal-android-normal": 12,
                "myGoal-android-donkey": 13,
                "myGoal-android-crazy": 14,
                "myGoal-ios-normal": 15,
                "myGoal-ios-donkey": 16,
                "myGoal-ios-crazy": 17
            },
            modes = {
                "android": "Android",
                "ios": "iOS"
            },
            bikes = {
                "normal": "Normal",
                "donkey": "Donkey",
                "crazy": "Crazy"
            },
            modeKeys = Object.keys(modes),
            bikesKeys = Object.keys(bikes),
            emptyEntry = Array(Object.keys(pattern).length).join(",").split(",");
        /*
         my rank: 122 // android normal
         my time: 0:00.000 // android normal
         my rank: 122 // android donkey
         my time: 0:00.000 // android donkey
         my rank: 122 // android crazy
         my time: 0:00.000 // android crazy
         my rank: 124 // ios normal
         my time: 0:00.000 // ios normal
         my rank: 124 // ios donkey
         my time: 0:00.000 // ios donkey
         my rank: 124 // ios crazy
         my time: 0:00.000 // ios crazy
         {
         "1": "122|000000|122|000000|122|000000|124|000000|124|000000|124|000000"
         }
         */
        function pad(num, size) {
            var s = num + "";
            while (s.length < size) s = "0" + s;
            return s;
        }

        function convertTime(_time_, showZero) {
            function insertAt(string, inseration, position) {
                return [string.slice(0, position), inseration, string.slice(position)].join("");
            }

            // check and make 22000 -> 022000
            // check and make 2200 -> 002200
            // check and make 220 -> 000220
            // check and make 22 -> 000022
            var time = "" + pad(_time_, 6);

            // insert 022000 -> 0:22000
            time = insertAt(time, ":", 1);
            // insert 0:22000 -> 0:22.000
            time = insertAt(time, ".", 4);
            return time;
        }

        function isNaN(obj) {
            return obj !== obj;
        }

        function clearTime(_time_) {
            if (typeof _time_ !== "string") {
                _time_ = "" + _time_;
            }
            // 0 -> 0
            // 0:22.000 -> 22000
            // 022000 -> 22000
            // 002200 -> 2200
            var time = _time_
                .replace(/(:)/g, "")
                .replace(/(\.)/g, "")
                .replace(/^0*/, "");

            time = parseInt(time, 10);

            if (isNaN(time)) {
                time = 0;
            }

            return time;
        }

        function getAll() {
            times = localStorageService.get(identifier);

            //var json = JSON.stringify(times);
            //json = json.replace(/(\|\d{5,6})(\|\d{5,6})/g, "$1")
            //localStorageService.set(identifier, JSON.parse(json));

            if (times == null) {
                times = {};
            }
        }

        // init
        getAll();

        var thisScope = {
            fileName: "trialsFrontierImproveData",
            fileMimeType: "application/json",
            fileExtension: "json",
            //fileMimeType: "text/plain",
            //fileExtension: "txt",
            autoExportLsKey: "autoExport",
            error: error,
            setScope: function (_scope_) {
                scope = _scope_;
                return this;
            },
            setMode: function (_mode_) {
                mode = _mode_;
            },
            getMode: function () {
                return mode;
            },
            getModes: function (asKeys) {
                return !asKeys ? modes : modeKeys;
            },
            setBike: function (_bike_) {
                bike = _bike_;
            },
            getBike: function () {
                return bike;
            },
            getBikes: function (asKeys) {
                return !asKeys ? bikes : bikesKeys;
            },
            getPattern: function () {
                return pattern;
            },
            getAll: function (force) {
                if (force) {
                    getAll();
                }

                return times;
            },
            getOne: function (trackId, trackData) {
                var data = this.getOneByType("all", trackId),
                    keys = Object.keys(pattern),
                    initData = {};

                if (!trackData) {
                    alert($filter("translate")("page.timesTable.error.missingData"));
                    console.error($filter("translate")("page.timesTable.error.missingData"));
                    return false;
                }

                //if (!("times" in trackData)) {
                //    console.warn("track has no times", trackData);
                //}

                modeKeys.forEach(function (_mode_) {
                    initData[_mode_] = {};
                    bikesKeys.forEach(function (_bike_) {
                        initData[_mode_][_bike_] = {};

                        // set myRank and myTime
                        keys.forEach(function (key, index) {
                            // skip wrong mode
                            if (key.indexOf(_mode_) === -1) {
                                return;
                            }
                            // skip wrong bike
                            if (key.indexOf(_bike_) === -1) {
                                return;
                            }

                            var clearKey = key.replace(/(-\w.*)/g, "");

                            if (data === error || data[index] === "" || !data[index]) {
                                initData[_mode_][_bike_][clearKey] = (clearKey === "myRank") ? error : "";
                            } else {
                                initData[_mode_][_bike_][clearKey] = data[index];
                            }
                        });

                        if (!("times" in trackData)) {
                            initData[_mode_][_bike_].differenceTime = "";
                            initData[_mode_][_bike_].differenceTimeWR = "";
                            return;
                        }

                        // difference myTime to worldRecord
                        if (initData[_mode_][_bike_].myTime !== error
                            && trackData.times.worldRecord
                            && trackData.times.worldRecord[_mode_][_bike_].time !== error) {
                            initData[_mode_][_bike_].differenceTime = thisScope.compareTime(initData[_mode_][_bike_].myTime, trackData.times.worldRecord[_mode_][_bike_].time);
                        }

                        // difference myGoal to myTime
                        if (initData[_mode_][_bike_].myTime !== error
                            && initData[_mode_][_bike_].myGoal !== error) {
                            initData[_mode_][_bike_].differenceTimeMyGoal = thisScope.compareTime(initData[_mode_][_bike_].myTime, initData[_mode_][_bike_].myGoal);
                        }

                        // difference worldRecord to platinumTime
                        if (trackData.times.worldRecord
                            && trackData.times.platinum
                            && trackData.times.worldRecord[_mode_][_bike_].time !== error) {
                            initData[_mode_][_bike_].differenceTimeWR = thisScope.compareTime(trackData.times.worldRecord[_mode_][_bike_].time, trackData.times.platinum.time);
                        }
                    });
                });

                // lost records
                //if(initData.android.donkey.myRank === "1" && initData.android.donkey.myTime !== ""){
                //    WRTimes.resave(trackId, 13, initData.android.donkey.myTime);
                //}

                return initData;
            },

            getOneByType: function (type, trackId) {
                if (!(trackId in times)) {
                    return error;
                }

                var data = times[trackId].split("|");

                if (type !== "all") {
                    var value = data[pattern[type]] || empty;

                    if (type !== "myRank") {
                        value = convertTime(value);
                    }

                    return value;
                } else {
                    return data || emptyEntry;
                }
            },

            getImproveOfTrack: function (trackId, type) {
                var mode = this.getMode(),
                    bike = this.getBike(),
                    trackTimes = (trackId in times) ? times[trackId] : "",
                    arrTimes = trackTimes.split("|"),
                    dataIndex = pattern[type + "-" + mode + "-" + bike];
                return arrTimes[dataIndex] || null;
            },

            update: function (_type_, trackId, value) {
                var data = this.getOneByType("all", trackId),
                    type = _type_ + "-" + mode + "-" + bike;

                // first entry
                if (data === error) {
                    data = angular.extend([], emptyEntry);
                    // migrate old to new pattern
                } else if (data.length < Object.keys(pattern).length) {
                    var empty = angular.extend([], emptyEntry);
                    empty.forEach(function (value, index) {
                        if (index in data) {
                            empty[index] = data[index];
                        }
                    });
                    data = empty;
                }

                // parse to valid times
                var _value_ = clearTime(value);
                data[pattern[type]] = _value_ !== 0 ? _value_ : "";

                // save
                times[trackId] = data.join("|");
                localStorageService.set(identifier, times);
                this.getAll(true);

                // autoexport
                if(localStorageService.get(this.autoExportLsKey)) {
                    var data = this.getEmptyData(scope);
                    myJson.save(data, null, null, true);
                }

                if (scope && "track" in scope) {
                    scope.track.improve = this.getOne(trackId, scope.track);
                    $timeout(function () {
                        scope.$apply();
                    }, 0);
                }
            },
            compareTime: function (first, second) {
                if (!first
                    || first == error
                    || first.indexOf("?") >= 0
                    || !second
                    || second == error
                    || second.indexOf("?") >= 0
                ) {
                    return "";
                }

                var firstTime = clearTime(first),
                    secondTime = clearTime(second),
                    isBetter = firstTime > secondTime,
                    calcedTime = firstTime - secondTime;

                return {
                    prefix: isBetter ? "+" : "-",
                    time: !isBetter ? calcedTime * -1 : calcedTime
                };
            },
            convertTime: function (_time_, showZero) {
                if (_time_ === error || !_time_ && !showZero) {
                    _time_ = empty;
                }
                return convertTime(_time_);
            },
            clearTime: clearTime,

            importData: function (_data_) {
                if (!_data_) {
                    return;
                }

                var times = _data_.times,
                    otherData = ["selectedMode", "selectedBike", "minRank", "minDiff", "selectedSort", "selectedSortType", "showMyGoal"];
                localStorageService.set(identifier, times);
                this.getAll(true);
                // apply data from export to scope
                if (scope && "data" in scope && "tracks" in scope.data) {

                    otherData.forEach(function (_var_) {
                        if (_var_ in _data_ && _data_[_var_] !== null) {
                            scope[_var_] = _data_[_var_];
                            localStorageService.set(_var_, _data_[_var_]);
                        }
                    });

                    scope.data.tracks.forEach(function (track) {
                        var trackId = track.id;
                        // improve time
                        track.improve = thisScope.getOne(trackId, track);
                    });

                    $timeout(function () {
                        scope.$apply();
                    }, 0);
                    return true;
                }
                return false;
            },
            getEmptyData: function(scope){
                var times = this.getAll();
                return {
                    date: (new Date()).getTime(),
                    dateEdit: (new Date()).getTime(),
                    selectedMode: scope.selectedMode,
                    selectedBike: scope.selectedBike,
                    selectedSort: scope.selectedSort,
                    selectedSortType: scope.selectedSortType,
                    minRank: scope.minRank,
                    minDiff: scope.minDiff,
                    showMyGoal: scope.showMyGoal,
                    times: times
                };
            }
        };

        thisScope.WRTimes = WRTimes.extend("improveTimes", thisScope);

        return thisScope;
    })