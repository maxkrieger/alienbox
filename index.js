var menubar = require("menubar");
var ipc = require("ipc");

var litestring = ""; //for darkmode

var mb = menubar({
	dir: __dirname + "/src",
	preloadWindow: true,
	icon: __dirname + "/icons/inbox.png",
	width: 300,
	height: 200
});

mb.on("show", function() {
	mb.window.webContents.send("show");
});

mb.on("hide", function() {
	mb.window.webContents.send("hide");
});

mb.on("after-create-window", function() {
	mb.window.webContents.on("will-navigate", function(e) {
		e.preventDefault();
	});
});

ipc.on("unread", function() {
	mb.tray.setImage(__dirname + "/icons/unread.png");
});

ipc.on("inbox", function() {
	mb.tray.setImage(__dirname + "/icons/inbox" + litestring + ".png");
});

ipc.on("darkmode", function(e, mode, force) {
	if (mode) litestring = "-lite";
	else litestring = "";
	if (force) mb.tray.setImage(__dirname + "/icons/inbox" + litestring + ".png");
});

ipc.on("quit", function() {
	mb.app.quit();
});
