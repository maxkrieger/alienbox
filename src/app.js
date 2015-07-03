var remote = require("remote");
var shell = remote.require("shell");
var ipc = require("ipc");
var Vue = require("vue");
var marked = require("marked");
var moment = require("moment");
var reddit = require("./reddit");
var persist = require("node-persist");

persist.initSync({dir: process.resourcesPath + "/persist"});

var auth = new Vue({
	el: "#authgate",
	data: {
		authenticated: false,
		error: "Please sign in."
	},
	methods: {
		quit: function() {
			ipc.send("quit");
		},
		authenticate: function(force) {
			var _this = this;
			token.tokenizing = true;
			_this.authenticated = true;
			token.pulse();
			if (!force) {
				reddit.authenticate(function(success) {
					if (success) {
						token.signIn();
					}
				});
			} else {
				token.signIn();
			}
		}
	}
});

var token = new Vue({
	el: "#tokengate",
	data: {
		tokenizing: false,
		loadstring: ""
	},
	methods: {
		retryAuth: function() {
			this.tokenizing = false;
			auth.authenticated = false;
		},
		pulse: function() {
			this.loadstring += ".";
			if (this.loadstring.length > 3) this.loadstring = "";
			if (this.tokenizing) setTimeout(this.pulse, 500);
		},
		signIn: function() {
			this.tokenizing = false;
			main.show();
			main.beginLoop();
		}
	}
});

var main = new Vue({
	el: "#main",
	data: {
		ready: false,
		prefpane: false,
		user: {
			name: "...",
			karma: {
				link: "...",
				comment: "..."
			}
		},
		mail: [],
		newmail: false,
		loading: false,
		morestatus: "Load More",
		interval: 2,
		firstcheck: true,
		windowopen: false,
		complete: false,
		loop: {}
	},
	methods: {
		show: function(force) {
			var _this = this;
			if (!(!this.firstcheck && this.windowopen) || force) {
				_this.ready = true;
				if (this.firstcheck) {
					this.firstcheck = false;
				}
				_this.getUsername();
				_this.getMail();
			}
		},
		openProfile: function() {
			shell.openExternal("https://reddit.com/u/" + this.user.name);
		},
		getUsername: function() {
			var _this = this;
			reddit.getMe(function(user) {
				_this.err = false;
				_this.user = user;
				if (user.mail) {
					ipc.send("unread");
					_this.newmail = true;
				}
				if (!user.mail) {
					ipc.send("inbox");
					_this.newmail = false;
				}
			});
		},
		getMail: function() {
			var _this = this;
			this.loading = true;
			reddit.getMail(0, 10, function(mail) {
				_this.mail = mail;
				_this.loading = false;
			});
		},
		getMoreMail: function() {
			this.morestatus = "Loading...";
			var _this = this;
			reddit.getMail(0, this.mail.length + 10, function(mail) {
				_this.mail = mail;
				_this.morestatus = "Load More";
			});
		},
		ctx: function(index) {
			this.mail[index].unread = false;
			var url = this.mail[index].context;
			shell.openExternal(url);
		},
		togglePrefs: function() {
			this.prefpane = !this.prefpane;
		},
		updateInterval: function() {
			this.complete = true;
			clearInterval(this.loop);
			this.beginLoop();
			persist.setItem("interval", this.interval);
			var _this = this;
			setTimeout(function() {
				_this.complete = false;
			}, 750);
		},
		signOut: function() {
			reddit.signOut();
			clearInterval(this.loop);
			auth.authenticated = false;
			this.prefpane = false;
			this.ready = false;
		},
		quit: function() {
			ipc.send("quit");
		},
		beginLoop: function() {
			var _this = this;
			this.loop = setInterval(function() {
				_this.show();
			}, this.interval * 60000);
		}
	},
	filters: {
		marked: marked,
		time: function(value) {
			var date = new Date(0);
			date.setUTCSeconds(value);
			return moment(date).fromNow();
		},
	}
});

ipc.on("hide", function() {
	main.windowopen = false;
	if (main.ready) {
		reddit.readAll();
		main.show();
		main.prefpane = false;
	}
});

ipc.on("show", function() {
	main.windowopen = true;
});

if (persist.getItem("interval") !== undefined) {
	main.interval = persist.getItem("interval");
}

reddit.ready.on("ready", function() {
	reddit.checkAuth(function(success) {
		if (success) {
			auth.authenticate(true);
		}
	});
});
