'use strict';
// wget -O data.json --header "X-TBA-App-Id: frc5522:scouting-system:v01" http://www.thebluealliance.com/api/v2/teams/100

// api docs: http://www.thebluealliance.com/apidocs?

var http = require('http');
var teams = [];

var china_teams = [];
var teams_queue = [];

var ranking_queue = [];

function do_get_ranking() {
    if (ranking_queue.length === 0) { return; };
    var ranking = ranking_queue.shift();
    var target = {
        host : "www.thebluealliance.com",
        port : 80,
        path : "/api/v2/event/" + ranking.key + "/rankings",
        agent : false,
        headers : {
            "X-TBA-App-Id": "frc5522:scouting-system:v01"
        }
    };
    var header_printed = false;
    console.log(target);
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
                if (!header_printed) {
                    console.log(JSON.stringify(result[0]));
                    header_printed = true;
                }
                for (var i = 0; i < result.length; i++) {
                    if (result[i][1] === ranking.team.team_number.toString()) {
                        console.log(JSON.stringify(result[i]));
                    }
                }
                do_get_ranking();
            } catch (error) {
                console.log("server response is not a valid json : ");
            }
        })
    })
};
function get_ranking() {
    for (var i = 0; i < china_teams.length; i++) {
        var team = china_teams[i];
        for (var j = 0; j < team.events.length; j++) {
            var event = team.events[j];
            ranking_queue.push({
                key   : event.key,
                event : event,
                team  : team
            });
        }
    }
    console.log("===== start get ranking ======");
    do_get_ranking();
}

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

function on_all_teams_done() {
    console.log("final teams: ", teams.length);
    for (var i = 0; i < teams.length; i++) {
        var team = teams[i];
        if (team.country_name === "China") {
            china_teams.push(team);
            console.log(team.team_number, team.region, team.locality, team.key, team.rookie_year);
        }
    }
    teams_queue = china_teams.slice(0);
    console.log("Total china team : ", china_teams.length);
    do_get_team_events();
}

function do_get_teams(page) {
    var target = {
        host : "www.thebluealliance.com",
        port : 80,
        path : "/api/v2/teams/" + page,
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
                if (Array.isArray(result)) {
                    if (result.length > 0) {
                        teams = teams.concat(result);
                        console.log("page ", page, " has : ", result.length, "teams");
                        do_get_teams(page + 1);
                    } else {
                        on_all_teams_done();
                    }
                } else {
                    console.log("server response is not a valid json array : ");
                }
            } catch (error) {
                console.log("server response is not a valid json : ");
            }
        })
    })
};


do_get_teams(1);
