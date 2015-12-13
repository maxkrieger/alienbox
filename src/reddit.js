var Snoocore = require("snoocore");
var remote = require("remote");
var shell = remote.require("shell");
var events = require("events");
var express = require("express");
var persist = require("node-persist");

exports.ready = new events.EventEmitter();

persist.initSync({
	dir: process.resourcesPath + "/persist"
});

var config = require("../config.json");

var reddit = new Snoocore({
	userAgent: "alienbox client",
	oauth: {
		type: "explicit",
		mobile: true,
		duration: "permanent",
		key: config.key,
		secret: config.secret,
		redirectUri: config.redirectUri,
		scope: ["identity", "privatemessages"]
	}
});
reddit.on("access_token_expired", function(responseError) {
	var tokens = persist.getItem("tokens");
	if (tokens.refresh !== "") {
		reddit.refresh(tokens.refresh).then(function(refresh) {
			var tokens = {
				token: reddit.getAccessToken(),
				refresh: reddit.getRefreshToken()
			};
			persist.setItem("tokens", tokens);
		});
	}
});

exports.authenticate = function(fn) {
	var state = Math.random();
	var authUrl = reddit.getAuthUrl(state);
	shell.openExternal(authUrl);
	servWait(function(query) {
		if (query.state == state) {
			reddit.auth(query.code).then(function() {
				var tokens = {
					token: reddit.getAccessToken(),
					refresh: reddit.getRefreshToken()
				};
				persist.setItem("tokens", tokens);
				signIn(tokens);
				fn(true);
			});
		} else {
			fn(false);
		}
	});
};

exports.checkAuth = function(fn) {
	var tokens = persist.getItem("tokens");
	if (tokens !== undefined && tokens.token !== "" && tokens.refresh !== "") {
		signIn(tokens);
		fn(true);
	} else {
		fn(false);
	}
};

var signIn = function(tokens) {
	reddit.setAccessToken(tokens.token);
	reddit.setRefreshToken(tokens.refresh);
};

var servWait = function(fn) {
	var app = express();
	var server = app.listen(8123);
	app.get("/auth", function(req, res) {
		fn(req.query);
		res.send("<span style='font-family: Verdana, Sans-Serif;'>Authentication Complete. Please close this window.</span>");
		app = null;
	});
};

exports.getMe = function(fn) {
	reddit("/api/v1/me").get().then(function(val) {
		fn({
			name: val.name,
			karma: {
				link: val.link_karma,
				comment: val.comment_karma
			},
			mail: val.has_mail
		});
	});
};

exports.getMail = function(start, lim, fn) {
	reddit("/message/inbox").get({
		limit: lim,
		count: start
	}).then(function(mail) {
		var filtered = filterMail(mail);
		fn(filtered);
	});
};

var filterMail = function(mail) {
	return mail.data.children.map(function(item) {
		item = item.data;
		if (item.body.length > 300) item.body = item.body.substring(0, 300) + "...";
		var newitem = {
			body: item.body,
			unread: item.new,
			context: "https://reddit.com" + item.context,
			subreddit: "/r/" + item.subreddit,
			author: item.author,
			date: item.created_utc
		};
		if (!item.was_comment) newitem.subreddit = item.subject;
		if (newitem.context === "https://reddit.com") newitem.context = "https://www.reddit.com/message/messages/" + item.id;
		return newitem;
	});
};

exports.readAll = function(fn) {
	reddit("/api/read_all_messages").post().then(fn);
};

exports.signOut = function() {
	reddit.deauth();
	persist.setItem("tokens", {
		token: "",
		refresh: ""
	});
};

setTimeout(function() {
	exports.ready.emit("ready");
}, 500);
