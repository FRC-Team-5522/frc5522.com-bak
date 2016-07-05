'use strict';
// wget -O data.json --header "X-TBA-App-Id: frc5522:scouting-system:v01" http://www.thebluealliance.com/api/v2/teams/100

// api docs: http://www.thebluealliance.com/apidocs?

var http = require('http');

var event_to_get = [
    "2016arc",
    "2016cars",
    "2016carv",
    "2016cur",
    "2016gal",
    "2016hop",
    "2016new",
    "2016tes"
];

var predict = {};
var all_teams = {};
var teams = [];
var matches = [];

function do_get_team_events() {
    if (teams_queue.length === 0) {
        get_ranking();
        return;
    }
    var team = teams_queue.shift();
    var target = {
        host : "www.thebluealliance.com",
        port : 80,
        path : "/api/v2/team/" + team.key + "/2016/events",
        agent : false,
        headers : {
            "X-TBA-App-Id": "frc5522:scouting-system:v01"
        }
    };
    http.get(target, function (res) {
        var body = "";
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            body = body + chunk;
        });
        res.on('end', () => {
            var result;
            try {
                result = JSON.parse(body);
                console.log("team ", team.team_number, "=", result);
                team.events = result;
            } catch (error) {
                console.log("server response is not a valid json : ", body);
            }
            do_get_team_events();
        })
    })
}

/*
  team = {
     win : [];
     lose : [];
  }
*/

function do_calc_team_score(event) {
    predict[event] = [];
    var scores = {};
    matches.sort(function (a, b) {
        if  (a.match_number < b.match_number) {
            return -1;
        } else {
            return 1;
        }
    })
    for (var i = 0; i < matches.length; i++) {
        var m = matches[i];
        var s_red  = m.alliances.red.score;
        var s_blue = m.alliances.blue.score;
        if (s_red < 0 || s_blue < 0) { continue; };

        var t = m.alliances.red.teams;
        for (var j = 0; j < t.length; j++) {
            var key = t[j];
            if (!scores[key]) {
                scores[key] = {
                    win  : [],
                    lose : [],
                    tie  : []
                };
            }
            if (s_red === s_blue ) {
                scores[key].tie.push(s_red);
            } else if (s_red > s_blue ) {
                scores[key].win.push(s_red);
            } else if (s_red < s_blue ) {
                scores[key].lose.push(s_red);
            } 
        }
        var t = m.alliances.blue.teams;
        for (var j = 0; j < t.length; j++) {
            var key = t[j];
            if (!scores[key]) {
                scores[key] = {
                    win  : [],
                    lose : [],
                    tie  : []
                };
            }
            if (s_red === s_blue ) {
                scores[key].tie.push(s_blue);
            } else if (s_red > s_blue ) {
                scores[key].lose.push(s_blue);
            } else if (s_red < s_blue ) {
                scores[key].win.push(s_blue);
            } 
        }
    }
    for (var key in scores) {
        function sort(a, b) {
            if (a === b) {      return 0;
            } else if (a > b) { return 1;
            } else if (a < b) { return -1;
            }
        }
        var s = scores[key];
        s.win.sort(sort);
        s.lose.sort(sort);
        s.tie.sort(sort);
            if (key === 'frc330') {
                debugger;
            }

        var win  = s.win.splice(-3, 3);
        var lose = s.lose.splice(0, 3);
        var win_sum = 0;
        for (var i = 0; i < win.length; i++) {
            win_sum = win_sum + win[i];
        }
        var lose_sum = 0;
        for (var i = 0; i < lose.length; i++) {
            lose_sum = lose_sum + lose[i];
        }
        var win_avg = 0;
        var lose_avg = 0;
        if (win.length > 0) {
            win_avg = Math.round(win_sum / win.length);
        }
        if (lose.length > 0) {
            lose_avg = Math.round(lose_sum / lose.length);
        } else {
            lose_avg = win_avg;
        }
        if (key === 'frc330') {
            debugger;
        }
        scores[key].score =  win_avg * 2 + lose_avg * 3;
        predict[event].push({
            team : key,
            event : event,
            score : scores[key].score
        })
        all_teams[key] = scores[key].score;
    }
    predict[event].sort(function (a, b) {
            if (a.score === b.score) {      return 0;
            } else if (a.score < b.score) { return 1;
            } else if (a.score > b.score) { return -1;
            }
    })
    do_get_teams();
}


function do_get_event_matches(event) {
    var target = {
        host : "www.thebluealliance.com",
        port : 80,
        path : "/api/v2/event/" + event + "/matches",
        agent : false,
        headers : {
            "X-TBA-App-Id": "frc5522:scouting-system:v01"
        }
    };
    http.get(target, function (res) {
        var body = "";
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            body = body + chunk;
        });
        res.on('end', () => {
            try {
                matches = JSON.parse(body);
            } catch (error) {
                console.log("server response is not a valid json : ");
            }
            do_calc_team_score(event);
        })
    })
};

function now() {
    var date = new Date();
    var d = date.getDate()
    var h = date.getHours()
    var m = date.getMinutes()
    return (d + "-" + h + "-" + m);
}
function do_get_teams() {
    var event = event_to_get.shift();
    teams = [];
    matches = [];
    if (!event) {
        var max = 0;
        var min = 100000;
        for (var key in all_teams) {
            if (all_teams[key] > max) {
                max = all_teams[key];
            }
            if (all_teams[key] < min) {
                min = all_teams[key];
            }
        }
        var all_teams_std = {};
        for (var key in all_teams) {
            all_teams_std[key] = Math.round(((all_teams[key] - min)
                                             / (max - min) * 100));
        }
        var fs = require('fs');
        var time = now();
        for (event in predict) {
            var file = './predict/' + event + "-" + time + '.txt';
            var list = predict[event];
            for (var i = 0; i < list.length; i++) {
                var team = predict[event][i];
                var line = i + "\t" + team.team + "\t" + team.score + "\n";
                // fs.appendFileSync(file, line)
            }
        };
        var keys = [];
        var key;
        for (key in all_teams) {
            keys.push(key);
        }
        keys.sort(function (a, b) {
            a = all_teams[a];
            b = all_teams[b];

            if (a === b) {      return 0;
            } else if (a < b) { return 1;
            } else if (a > b) { return -1;
            }
        })
        var file = "./predict/all-teams-by-sgp.txt"
        fs.writeFileSync(file, '');
        line = "last update: " + (new Date()).toString();
        fs.appendFileSync(file, line)
        var line = "\n\norder\tteam\tscore\tstd\n"
        fs.appendFileSync(file, line)
        for (var i = 0; i < keys.length; i++) {
            var score = all_teams[keys[i]];
            var score_std = all_teams_std[keys[i]];
            var key = "[" + keys[i].substring(3) + "]";
            line = i + "\t" + key + "\t"
                + score + "\t" + score_std + "\n";
            fs.appendFileSync(file, line)
        }
        line = "last update: " + (new Date()).toString();
        fs.appendFileSync(file, line)
        var data = fs.readFileSync(file);
        file = "./predict/all-teams-by-sgp--" + now() + ".txt";
        fs.writeFileSync(file, data);
        
        return;
    };
    console.log("get event : ", event);
    var target = {
        host : "www.thebluealliance.com",
        port : 80,
        path : "/api/v2/event/" + event + "/teams",
        agent : false,
        headers : {
            "X-TBA-App-Id": "frc5522:scouting-system:v01"
        }
    };
    http.get(target, function (res) {
        var body = "";
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            body = body + chunk;
        });
        res.on('end', () => {
            try {
                teams = JSON.parse(body);
                do_get_event_matches(event);
            } catch (error) {
                console.log("server response is not a valid json : ");
            }
        })
    })
};


do_get_teams();
