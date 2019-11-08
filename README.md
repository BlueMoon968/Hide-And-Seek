# Hide-And-Seek
A small procedural game powered by Phaser 3 JS, developed for Procjam 2019.

# Notes
Phaser 3 is an amazing framework for developing HTML5 Games, but It still needs a lot of improvements.
Specifically, I have noticed that:

1. Switching scenes speeds up animation framerate. This is probably a problem related to the Clock object of each single scene when they're awaken. As workaround, I have removed the scenes that needs to be recalled at the start of a new one and re-create them when the game needs to call them. It's not an elegant, but It works.

2. Dynamic Layer's are broken on setting collision. So, I had to create a workaround for making the tiles of the Static Layer replaceable.

# Credits and Tools

## Framework and Libraries
- Phaser 3 -> https://phaser.io/phaser3
- Easystar JS -> https://easystarjs.com/
- Convchain -> https://github.com/kchapelier/convchain

## Audio - BGM and SFX
- BFXR (SFX Generator) -> https://www.bfxr.net/
- Komiku (BGM) -> https://freemusicarchive.org/music/Komiku
- Audiobinger (BGM) -> https://freemusicarchive.org/music/Audiobinger
- Mathgrant (BGM) -> https://freemusicarchive.org/music/mathgrant

## Graphics
- Procjam 2016 Chicmonster's 2D Pack by Tess.

## Fonts
- 3DVenture -> https://www.dafont.com/it/3dventure.font
- Earthbound Beginnings -> https://fontstruct.com/fontstructions/show/1658727/earthbound-beginnings-1
