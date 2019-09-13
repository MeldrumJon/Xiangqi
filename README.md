# Xiangqi

Online Xiangqi game, based on the JavaScript version of [XiangQi Wizard Light](https://github.com/xqbase/xqwlight). Translated into English. Aesthetic improvements. Added the ability to play against human players across the internet using [PeerJS](https://peerjs.com/).

## Aesthetics

Xiangqi pieces modified from [Wj654cj86's SVG Xiangqi pieces](https://commons.wikimedia.org/wiki/Category:Xiangqi_pieces).

Capture and move sounds created from [KaterinaGalasova's board game sounds](https://freesound.org/people/KaterinaGalasova/sounds/461931/).

Computer "thinking" gif created with [ajaxload.info](http://www.ajaxload.info/).

Wood texture based on [JCW's Wood texture at OpenGameArt.com](https://opengameart.org/content/wood-texture-tiles).

## License

This project's source code is licensed under [GNU General Public License v2.0](./LICENSE). Images and sounds in the `images` and `sounds` directories are licensed under the [Creative Commons 0 License](https://creativecommons.org/publicdomain/zero/1.0/). PeerJS is licensed under the [MIT license](https://tldrlegal.com/license/mit-license), and its source code is available [here](https://github.com/peers/peerjs).

## Testing a Peer-to-Peer Game Locally

1. Install [Node's](https://nodejs.org/en/) http-server package:
```
sudo npm install http-server -g
```
2. Run `http-server -c-1 [path]` where `[path]` points to this folder.
3. Open localhost:8080 in the browser.
