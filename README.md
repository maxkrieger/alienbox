# alienbox
An open source menubar application for checking your reddit inbox.

Binaries and screenshots available at http://a9.io/alienbox

Icons within the interface provided by [icomoon](https://icomoon.io).

==========
Want to build it yourself? You'll need node, electron, and electron-packager. Edit `config.json` with your **web (explicit)** reddit application's public/secret keys. Make sure your application's `redirect uri` is `http://localhost:8123/auth` (a temporary express instance which is initialized every time the user wants to authorize). Install the dependencies (`npm install` is fastest), and then run `npm run build` and a binary should be packaged for you.
