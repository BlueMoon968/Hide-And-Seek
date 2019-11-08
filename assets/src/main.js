//=================================================
// 
// HIDE AND SEEK - MAIN JS FILE
// AUTHOR: Luca Mastroianni - Blue Moon
//
// LICENSE: MIT
// FRAMEWORK: PHASER 3
//
//=================================================

const SCREEN_SIZE = {width: 160, height: 160};
const TILE_SIZE = 16;
const DARK_GREEN = 0x232b21;
const DARK_MID_GREEN = 0x255f40;
const GREEN = 0xc0ebd3;
const MID_GREEN = 0x3ca06a;

//=================================================
// 
// UTILITIES
//
//=================================================

function random_int(mm) {
	return Math.floor(mm * Math.random());
} 

//=================================================
// 
// PATHFIND
//
//=================================================

class Pathfinder {

	constructor(map) {
		this.finder = new EasyStar.js();
		this.create_grid(map);
		const acceptable_tiles = [0,1,2,3,4,5,6,7];
		this.finder.setAcceptableTiles(acceptable_tiles);
		for(var i = 0; i < acceptable_tiles.length; i++) {this.finder.setTileCost(acceptable_tiles[i], 1)}
	}

	create_grid(map) {
		this.grid = [];
	    for(var y = 0; y < map.height; y++){
	        var section = [];
	        for(var x = 0; x < map.width; x++){
	            section.push(map.getTileAt(x, y).index);
	        }
	        this.grid.push(section);
	    }
	    this.finder.setGrid(this.grid);
	}

	calculate(fromX, fromY, toX, toY, scene, mob, no_path_callback, complete_callback) {
		fromX = Math.floor(fromX / TILE_SIZE); 
		fromY = Math.floor(fromY / TILE_SIZE);
		this.finder.findPath(fromX, fromY, toX, toY, path => {
			if(!path) {return no_path_callback();}
			return scene.move_mob(path, mob, complete_callback);
		})
		return this.finder.calculate();
	}

	set_through() {
		const acceptable_tiles = [0,1,2,3,4,5,6,7,8,9,10];
		return this.finder.setAcceptableTiles(acceptable_tiles);
	}
}

//=================================================
// 
// MESSAGE WINDOW
//
//=================================================

class Message_Window extends Phaser.GameObjects.Container {

	constructor(scene,x,y) {
		if(scene.textures.get("message_box").key === "__MISSING") {
			const gr = scene.add.graphics();
			gr.fillStyle(DARK_GREEN,1.0);
			gr.fillRect(0,0,SCREEN_SIZE.width/1.2, 32);
			gr.generateTexture("message_box");
			gr.destroy();
		}
		const padding = 5;
		var base = scene.add.sprite(0, 0, "message_box");
		base.setOrigin(0,0).setDepth(0);
		var text = scene.add.dynamicBitmapText(padding,padding,"GameFont", "", 8);
		text.setTintFill(GREEN, GREEN, GREEN, GREEN);
		super(scene, x, y, [base, text]);
		scene.add.existing(this);
		var mask = scene.add.graphics(x,y);
		mask.visible = false;
		mask.clear();
		mask.fill(DARK_GREEN, 0);
		mask.fillRect(x, y, base.width, base.height);
		mask = this.createGeometryMask(mask);
		text.setMask(mask)
		this.base = base;
		this.text = text;
		this.padding = padding;
		this.clear();
		this.hide();
		this._callback = null;
	}

	show() {return this.visible = true;}

	hide() {return this.visible = false;}

	clear() {
		this.text_to_add = []; 
		this.last_time = 0;
		this.waiting_time = 30;
		this.wait_for_input = false;
		this.accumulator = [0,0];
	}

	is_busy() {
		return this.text_to_add.length > 0; 
	}

	update(time, dt) {
		if(!!this.wait_for_input) {return;}
		if(!this.is_busy()) {
			if(this.last_time > 0) {
				this.last_time = 0;
			}
			return;
		}
		else {
			if(!this.visible) {this.show();}
		}
		if(time - this.last_time < this.waiting_time / (this.accumulator[1] > 0 ? 3 : 1)) {return;}
		if(this.accumulator[1] > 0) {
			this.accumulator[1]--;
			this.text.y--; 
			this.last_time = time;
			return;
		}
		const char = this.text_to_add[0][0];
		this.text_to_add[0] = this.text_to_add[0].substring(1);
		this.text.text += char; 
		if(this.text.text.length % 3 === 0) {this.scene.play_letter_sound();}
		if(char === "\n") {
			this.accumulator[0] += 1;
			if(Math.floor(this.accumulator[0]) / 2 >= 2) {
				this.accumulator[0] -= 2;
				this.accumulator[1] = 16;
			}
		}
		if(this.text_to_add[0] === "") {
			this.wait_for_input = true;
		}
		this.last_time = time;
	}

	add_text(tt) {this.text_to_add.push(tt)}

	process_input(force_input = false) {
		this.wait_for_input = false; 
		if(!!force_input) {
			this.text.text = "";
			this.text_to_add.shift();
			if(!this.is_busy()) {
				this.text.text = "";
				this.text.y = this.padding;
				this.clear();
				this.hide();
				this.execute_callback();
			}
		}
		else {
			if(!!this.text_to_add[0] && this.text_to_add[0].length > 0) {
				for(var i = 0; i < this.text_to_add[0].length; i++) {
					const char = this.text_to_add[0][i];
					if(char === "\n") {this.accumulator[0]++}
				}
				this.text.y -= this.accumulator[1];
				if(this.accumulator[0] / 2 >= 2) {
					var break_count = Math.floor(this.accumulator[0] / 2) - 1; 
					this.text.y -= (TILE_SIZE * break_count);
				}
				this.text.text += this.text_to_add[0];
				this.text_to_add[0] = "";
				this.wait_for_input = true;
			}
			else {
				this.text.text = "";
				this.text.y = this.padding;
				this.text_to_add.shift();
				if(!this.is_busy()) {
					this.clear();
					this.hide();
					this.execute_callback();
				}
				else {this.accumulator = [0,0]};
			}
		}
		return;
	}

	execute_callback() {
		if(!!this._callback) {
			this._callback();
			this._callback = null;
		}
	}

	set_callback(callback) {
		return this._callback = callback;
	}
}

//=================================================
// 
// CHOICE WINDOW
//
//=================================================

class Choice_Window extends Phaser.GameObjects.Container {

	constructor(scene,x,y) {
		if(scene.textures.get("choice_box").key === "__MISSING") {
			const gr = scene.add.graphics();
			gr.fillStyle(DARK_GREEN,1.0);
			gr.fillRect(0,0,SCREEN_SIZE.width/2, 48);
			gr.generateTexture("choice_box");
			gr.destroy();
		}
		const padding = 5;
		var base = scene.add.sprite(0, 0, "choice_box");
		base.setOrigin(0,0).setDepth(0);
		var text = scene.add.dynamicBitmapText(padding + 10,padding,"GameFont", "", 8);
		text.setTintFill(GREEN, GREEN, GREEN, GREEN);
		var cursor = scene.add.sprite(padding + 1,text.y, "cursor");
		super(scene, x, y, [base, text, cursor]);
		scene.add.existing(this);
		this.base = base;
		this.text = text;
		this.cursor = cursor;
		this.padding = padding;
		this.clear();
		this.hide();
		this._callback = null;
	}

	show() {return this.visible = true;}

	hide() {return this.visible = false;}

	clear() {
		this.choices = []; 
		this.cursor.y = this.text.y + this.cursor.height / 2;
	}

	is_busy() {
		return this.choices.length > 0; 
	}

	update(time, dt) {
		if(!!this.wait_for_input) {return;}
		if(!this.is_busy()) {
			if(!!this.visible) {this.hide();}
		}
		else {
			if(!this.visible) {this.show();}
		}
	}

	add_choices(choices, callback) {
		this.choices = choices.slice();
		this.index = 0;
		this.cursor.y = this.text.y + this.cursor.height / 2;
		this._callback = callback.bind(this);
		for(var i = 0; i < this.choices.length; i++) {
			this.text.text += this.choices[i] + "\n\n";
		}
	}

	process_cursor_move(type) {
		this.scene.play_cursor();
		if(type === 0) {this.index = (this.index + 1) % this.choices.length;}
		else {this.index = this.index - 1 < 0 ? this.choices.length - 1 : this.index - 1;}
		this.cursor.y = this.text.y + (TILE_SIZE * this.index) + this.cursor.height / 2;
	}

	process_ok() {
		this.scene.play_confirm();
		this.clear();
		this.text.text = "";
		if(!!this._callback) {
			this._callback();
			this._callback = null;
		}
		this.index = -1;
		return;
	}
}

//=================================================
// 
// SCENE
//
//=================================================

class Scene extends Phaser.Scene {

	init() {
		this.texts = [];
	}

	create() {
		this.fade = this.add.graphics();
		this.fade.fillStyle(DARK_GREEN,1.0);
		this.fade.fillRect(0,0,SCREEN_SIZE.width, SCREEN_SIZE.height);
		this.fade.alpha = 0;
	}

	fade_screen(type, d, callback, complete_delay = 0) {
		if(!callback) {callback = function() {}}
		return this.tweens.add({
			targets: this.fade,
			alpha: type,
			duration: d,
			onComplete: callback,
			completeDelay: complete_delay
		})
	}

	add_text(text, x, y, size, color, font = "header") {
		var child = this.add.bitmapText(x, y, font, text, size);
		if(!!color) {child.setTintFill(color,color,color,color)}
		return this.texts.push(child);
	}

	get_text(id) {
		return this.texts[id];
	}

	get_last_text() {
		return this.texts[this.texts.length - 1];
	}

	remove(t) {
		this.texts = []; 
		return super.remove(t);
	}

	to_scene(key, data = {}) {
		return this.scene.start(key, data);
	}

	floor_all() {
		for(var i = 0; i < this.texts.length; i++) {
			const text = this.texts[i];
			if(!text) {continue;}
			text.x = Math.floor(text.x);
			text.y = Math.floor(text.y);
		}
	}

	play_cursor() {
		const sfx = this.sound.add("cursor");
		return sfx.play();
	}

	play_confirm() {
		const sfx = this.sound.add("confirm");
		return sfx.play();		
	}

	play_letter_sound() {
		const sfx = this.sound.add("letter_sound");
		return sfx.play({volume: 0.5});		
	}

	play_ebi_signal(vol = 1) {
		const sfx = this.sound.add("ebi_signal");
		return sfx.play({volume: vol});	
	}

	play_ebi_flee() {
		const sfx = this.sound.add("ebi_flee");
		return sfx.play({volume: 1});			
	}

	play_cut_tree() {
		const sfx = this.sound.add("cut_tree");
		return sfx.play({volume: 1});		
	}

	play_game_over() {
		const bgm = this.sound.add("game_over_music", {volume: 0.7, loop: true});
		bgm.play();
		return bgm;
	}

	play_game_won() {
		const bgm = this.sound.add("win_music", {volume: 0.7, loop: true});
		bgm.play();
		return bgm;
	}

	fade_out_music(target, d, vol = 0) {
		return this.tweens.add({
	        targets:  target,
	        volume:   vol,
	        duration: d
	    });
	}

	create_title_screen_animation() {
		//============================
		// CREATE MIDDLE SPRITE ANIMATION
		this.anims.create({
			key:"title_char_anim",
			frames: this.anims.generateFrameNumbers("title_screen_char", {start:0,end:2}),
			frameRate: 8,
			delay: 4,
			yoyo: true,
			duration: 5,
			repeat: -1
		});
	}

	create_mob_animations() {
		const ANIMATION_SPEED = 10;
        this.anims.create({
            key: 'player_left',
            frames: this.anims.generateFrameNumbers('player_sprite', { frames: [3,4,3,5]}),
            frameRate: ANIMATION_SPEED,
            repeat: -1
        });
        this.anims.create({
            key: 'player_right',
            frames: this.anims.generateFrameNumbers('player_sprite', { frames: [3,4,3,5] }),
            frameRate: ANIMATION_SPEED,
            repeat: -1
        });
        this.anims.create({
            key: 'player_up',
            frames: this.anims.generateFrameNumbers('player_sprite', { frames: [6,7,6,8]}),
            frameRate: ANIMATION_SPEED,
            repeat: -1
        });
        this.anims.create({
            key: 'player_down',
            frames: this.anims.generateFrameNumbers('player_sprite', { frames: [0,1,0,2] }),
            frameRate: ANIMATION_SPEED,
            repeat: -1
        });
        this.anims.create({
            key: 'ebi_left',
            frames: this.anims.generateFrameNumbers('ebi_sprite', { frames: [3,4,3,5]}),
            frameRate: ANIMATION_SPEED,
            repeat: -1
        });
        this.anims.create({
            key: 'ebi_right',
            frames: this.anims.generateFrameNumbers('ebi_sprite', { frames: [3,4,3,5] }),
            frameRate: ANIMATION_SPEED,
            repeat: -1
        });
        this.anims.create({
            key: 'ebi_up',
            frames: this.anims.generateFrameNumbers('ebi_sprite', { frames: [6,7,6,8]}),
            frameRate: ANIMATION_SPEED,
            repeat: -1
        });
        this.anims.create({
            key: 'ebi_down',
            frames: this.anims.generateFrameNumbers('ebi_sprite', { frames: [0,1,0,2] }),
            frameRate: ANIMATION_SPEED,
            repeat: -1
        });
	}

}

//=================================================
// 
// LOAD SCREEN
//
//=================================================

class Load_Screen extends Scene {

	init() {
		super.init();
		this.last_update = 0;
	}

	preload() {
		this.cameras.main.backgroundColor.setTo(34,120,74);
		this.load.bitmapFont('header', './assets/fonts/header.png', './assets/fonts/header.fnt');
		this.load.bitmapFont('GameFont', './assets/fonts/GameFont.png', './assets/fonts/GameFont.fnt');
		this.load.image("sheet", "./assets/images/sprs.png");
		this.load.image("title_screen_background", "./assets/images/title_screen.png");
		this.load.spritesheet("title_screen_char", "./assets/images/boy_sps.png", {frameWidth: 62, frameHeight: 78});
		this.load.spritesheet("player_sprite", "./assets/images/player_sprs.png", {frameWidth: 16, frameHeight: 16});
		this.load.spritesheet("ebi_sprite", "./assets/images/ebi_sprs.png", {frameWidth: 16, frameHeight: 16});
		this.load.image("cursor", "./assets/images/cursor.png");

		// AUDIO PRELOADING
		this.load.audio("title_music", "./assets/audio/mathgrant_-_18_-_After-Dinner_Jazz.mp3");
		this.load.audio("win_music", "./assets/audio/Komiku_-_11_-_WIN.mp3");
		this.load.audio("game_over_music", "./assets/audio/Audiobinger_-_Video_Game_Music_1.mp3");
		this.load.audio("cursor", "./assets/audio/cursor.wav");
		this.load.audio("confirm", "./assets/audio/confirm.wav");
		this.load.audio("letter_sound", "./assets/audio/letter_sound.wav");
		this.load.audio("ebi_signal", "./assets/audio/signal.wav");
		this.load.audio("ebi_flee", "./assets/audio/flee.wav");
		this.load.audio("cut_tree", "./assets/audio/cut_tree.wav")
	}

	create() {
		const colors = GREEN
		this.add_text("LOADING",SCREEN_SIZE.width / 5,SCREEN_SIZE.height / 3, 18, colors);
		this.add_text("",SCREEN_SIZE.width / 5,SCREEN_SIZE.height / 2, 16, colors);
		this.create_mob_animations();
		this.create_title_screen_animation();
		this.scene.add("title_screen", Title_Screen, false);
		this.to_scene("title_screen");
	}

	update(time, delta) {
		const load_text = this.get_text(0);
		if(time - this.last_update < 500) {return;}
		if(load_text.text.indexOf("...") > -1) {load_text.text = load_text.text.replace("...", "")}
		else {load_text.text += ".";}
		this.last_update = time;
	}
}

//=================================================
// 
// TITLE SCREEN
//
//=================================================

class Title_Screen extends Scene {

	create() {
		this.scene.remove("map_screen");
		this.add.image(0,0, "title_screen_background").setOrigin(0,0).setDepth(0);
		this.add_text("Hide and Seek", SCREEN_SIZE.width / 2, 10, 18, MID_GREEN); 
		const title = this.get_text(0);
		title.setOrigin(0,0);
		title.x -= title.width/2;
		this.create_main_text();
		this.create_keyboard_inputs();
		this.message_window = new Message_Window(this, 16, 80);
		this.floor_all();
		super.create();
		this.fade.alpha = 1;
		this.fade_screen(0, 1000);
	}

	create_main_text() {
		const title_sprite = this.add.sprite(SCREEN_SIZE.width / 2, 25, "title_screen_char"); 
		title_sprite.setOrigin(0,0);
		title_sprite.x -= title_sprite.width/2; 
		title_sprite.play("title_char_anim", {volume: 0.3, loop: true});
		this.title_music = this.sound.add("title_music", {volume: 0.7, loop: true})
		this.title_music.play();
		this.add_text("Start Game", SCREEN_SIZE.width / 2, 115, 8, DARK_MID_GREEN, "GameFont");
		var last_text = 1; 
		var tt = this.get_text(last_text);
		tt.setOrigin(0,0);
		tt.x -= tt.width / 2;
		this.add_text("Credits", SCREEN_SIZE.width / 2, 115 + tt.height + 5, 8, DARK_MID_GREEN, "GameFont");
		last_text++;
		var tt = this.get_text(last_text);
		tt.setOrigin(0,0);
		tt.x -= tt.width / 2;
		this.add_text("@2019 - BlueMoon", SCREEN_SIZE.width / 2, SCREEN_SIZE.height, 8, DARK_MID_GREEN, "GameFont"); 
		last_text++;
		tt = this.get_text(last_text);
		tt.setLetterSpacing(2);
		tt.setOrigin(0,0);
		tt.x -= tt.width / 2;
		tt.y -= tt.height + 5;

	}

	refresh_commands() {
		var tt = this.get_text(this.index + 1);
		const last_selection = this.index + 1 === 1 ? 2 : 1;
		tt.setTintFill(GREEN, GREEN, GREEN, GREEN);
		tt = this.get_text(last_selection);
		tt.setTintFill(DARK_MID_GREEN, DARK_MID_GREEN, DARK_MID_GREEN, DARK_MID_GREEN);
	}

	create_keyboard_inputs() {
		this.index = 0; 
		this.refresh_commands();
		const key_down = this.input.keyboard.addKey("down");
		const key_up = this.input.keyboard.addKey("up");
		const key_ok = this.input.keyboard.addKey("Z");
		key_down.on("down", event => {
			this.play_cursor();
			this.index = (this.index + 1) % 2; 
			this.refresh_commands();
		})
		key_up.on("down", event => {
			this.play_cursor();
			this.index = this.index - 1 < 0 ? 1 : this.index - 1; 
			this.refresh_commands();
		})
		const ok_trigger = (event) => {
			this.play_confirm();
			if(this.index === 0) {
				this.scene.add("map_screen", Map_Screen, false);
				this.message_window.add_text("Generating Game\n\nMap...");
				this.message_window.add_text("Map Generated!\n\nPress \"Z\"!");
				MAP_GENERATOR.process_map();
				MAP_GENERATOR.on("process_end", () => {
					this.message_window.process_input(true);
					key_ok.on("down", event => {
						this.play_confirm();
						if(!!this.message_window.visible) {this.message_window.process_input();}
						if(this.message_window.is_busy()) {return;}
						this.fade_out_music(this.title_music, 500);
						this.fade_screen(1, 1000, () => {
							key_ok.destroy();
							this.scene.stop();
							this.to_scene("map_screen");
						}, 300);
					});
				})
				key_down.destroy();
				key_up.destroy();
			}
			else if(this.index === 1) {
				key_down.enabled = false;
				key_up.enabled = false;
				this.message_window.add_text("This game is powered\n\nby Phaser JS for\n\nProcjam 2019.")
				this.message_window.add_text("\n- Graphics");
				this.message_window.add_text("Chicmonster's 2D Pack\n\nby Tess 2D some\n\ncustom addons made\n\nby me.");
				this.message_window.add_text("\n- Audio and SFX");
				this.message_window.add_text("SFX developed using\n\nthe BFXR tool.\n\nBGM by \"Komiku,\"\n\n\"Mathgrant\" and\n\n\"Audiobinger\"");
				this.message_window.add_text("\n- Font");
				this.message_window.add_text("3DVenture font from\n\n\"memesbruh03\" and\n\nearthbound-beginnings\n\nby \"Mark Sensen\".")
				this.message_window.add_text("You can find the\n\nsource code of the\n\ngame on github!")
				this.message_window.add_text("\nEnjoy!");
				const credit_bind = (event) => {
					if(!!this.message_window.visible) {this.message_window.process_input();}
					if(!this.message_window.is_busy() && !this.message_window.visible) {
						key_ok.off("down", credit_bind);
						key_ok.once("down", ok_trigger);
						key_down.enabled = true;
						key_up.enabled = true;
						return;
					}
				}
				key_ok.on("down", credit_bind);
			}
		}
		key_ok.once("down", ok_trigger);
	}

	update(time, dt) {
		this.message_window.update(time, dt);
		MAP_GENERATOR.update_process();
	}
}

//=================================================
// 
// MAP SCREEN
//
//=================================================

class Map_Screen extends Scene {

	create() {
		this.scene.remove("title_screen");
		// GENERATE MAP
		this.create_game_objects();
		super.create();
		this.message_window = new Message_Window(this, 16, SCREEN_SIZE.height - 40);
		this.choice_window = new Choice_Window(this, 40,  SCREEN_SIZE.height / 4);
		// DEFINE INPUTS
		this.start_game_inputs()
		// INIT GAME
		this.fade.alpha = 1; 
		this.fade_screen(0, 1000, () => {
			const check_tutorial = localStorage.getItem("HideAndSeek_Tutorial");
			if(!check_tutorial) {
				this.message_window.add_text("Welcome to Hide and\n\nSeek! Do you like to\n\nread the tutorial?");
				this.message_window.set_callback(() => {
					this.choice_window.add_choices(["Yes", "No", "Never"], function() {
						if(this.index === 0) {
							this.scene.message_window.add_text("Kaku's sister (Ebi)\n\nis hiding somewhere\n\nin the wood, inside\n\nthe trees.");
							this.scene.message_window.add_text("If you need to make\n\na path you can cut\n\nthe trees using \"Z\"\n\nkey.");
							this.scene.message_window.add_text("However, if you cut\n\nthe tree where Ebi's\n\nhiding she'll ran\n\naway and you lose!");
							this.scene.message_window.add_text("You can inspect a\n\ntree using the \"X\"\n\nkey, but if you\n\ncheck too many times\n\nyou give the chance\n\nto Ebi to run away.");
							this.scene.message_window.add_text("So, choose wisely\n\nyour actions.\n\nSometimes you will\n\nhear a sound: higher\n\nis the volume nearer\n\nis Ebi!");
							this.scene.message_window.add_text("If you're lucky\n\nenough, you may\n\nfind a sign that\n\ngives some\n\ninformation, but...\n\nare they correct? ;)");
							this.scene.message_window.add_text("Good Luck!");
							this.scene.message_window.set_callback(this.scene.start_game());
							return;
						}
						else if(this.index === 1) {return this.scene.start_game()}
						else if(this.index === 2) {
							localStorage.setItem("HideAndSeek_Tutorial", true);
							return this.scene.start_game();
						}
					})
				})
			}
			else {return this.start_game()}
		});
	}

	start_game() {
		const tm = MAP_GENERATOR.tilemap;
		var count = 0;
		var colliders_coords = [];
		for(var y = 0; y < tm.length; y++) {
			for(var x = 0; x < tm[y].length; x++) {
				const tile = tm[y][x];
				if(this.colliders.indexOf(tile) > -1 && tile !== 8) {
					if(x > 0 && y > 0 && x < 9 && y < 9) {colliders_coords.push([x, y])};
					count++;
				}
			}			
		}

		//==================================
		// BAD END: WRONG PLACE

		if(count <= 0) {
			this.move_to(4,4, "player", () => {
				this.player.anims.play("player_down");
				const bgm_game_over = this.play_game_over();
				this.message_window.add_text("\n...");
				this.message_window.add_text("I think I have\n\ntaken the wrong path.");
				this.message_window.add_text("Bad End:\n\nWrong Path.");
				this.message_window.set_callback(() => {
					this.process_game_over(bgm_game_over);
				})	
			})
			return;
		}
		else if(count <= 20) {
			const current_x = Math.floor(this.player.x / TILE_SIZE);
			if(current_x > 5) {this.player.anims.play("player_up");}
			else {this.player.anims.play("player_down");}
			this.player.anims.stop();
			this.message_window.add_text("\"Mmm... Looks like\n\nI've trapped her\n\nthis time!\"");
		}

		//====================
		// DEFINE EBI POSITION
		const ebi_position = colliders_coords[random_int(colliders_coords.length)];
		this.ebi.x = ebi_position[0] * TILE_SIZE;
		this.ebi.y = ebi_position[1] * TILE_SIZE;
	}

	process_game_over(bgm) {
		this.fade_out_music(bgm, 1800);
		this.fade_screen(1,2000, () => {
			this.scene.stop();
			this.scene.add("title_screen", Title_Screen, false);
			this.to_scene("title_screen");
			return;
		})	
	}

	process_game_won() {
		const happy_bgm = this.play_game_won();
		const dir = this.player.getData("direction");
		const ebi_anim = dir === 2 ? "ebi_up" : dir === 8 ? "ebi_down" : dir === 4 ? "ebi_right" : "ebi_left";
		const player_anim = dir === 2 ? "player_down" : dir === 8 ? "player_up" : dir === 4 ? "player_left" : "player_right";
		if(ebi_anim === "ebi_left") {this.ebi.flipX = true;}
		if(player_anim === "player_left") {this.player.flipX = true;}
		this.player.anims.play(player_anim, true);
		this.ebi.anims.play(ebi_anim, true);
		this.message_window.add_text("Yey! You have found\n\nEbi! Congratulations!");
		this.message_window.add_text("Happy End:\n\nFound You!");
		this.message_window.set_callback(() => {
			this.process_game_over(happy_bgm);
		})	
	}

	move_to(x, y, mob = "player", complete_callback = () => this.player.setData("can_move", true)) {
		this.player.setData("can_move", false);
		return this.pathfinder.calculate(this[mob].x, this[mob].y, x, y, this, mob, () => this.player.setData("can_move", true), complete_callback);
	}

	move_mob(path, mob, complete_callback) {
	    var tw = [];
	    for(var i = 0; i < path.length - 1; i++){
	        const dest_x = path[i+1].x;
	        const dest_y = path[i+1].y;
	        const current_ind = i;
	        tw.push({
	            targets: this[mob],
	            x: {value: dest_x * TILE_SIZE, duration: 200},
	            y: {value: dest_y * TILE_SIZE, duration: 200},
	            onUpdate: () => {
			    	const pos = path[current_ind + 1];
			    	const current_pos = {x: Math.floor(this[mob].x / TILE_SIZE), y: Math.floor(this[mob].y / TILE_SIZE)};
			    	if(pos.x !== current_pos.x) {
			    		if(pos.x > current_pos.x) {this[mob].anims.play(mob + "_right", true); this[mob].flipX = false}
			    		else {this[mob].anims.play(mob + "_left", true); this[mob].flipX = true}
			    		return;
			    	}
			    	else if(pos.y !== current_pos.y) {
			    		if(pos.y > current_pos.y) {this[mob].anims.play(mob + "_down", true); this[mob].flipX = false}
			    		else {this[mob].anims.play(mob + "_up", true); this[mob].flipX = false}
			    		return;
			    	}
	            }
	        });
	    }

	    const timeline = this.tweens.timeline({
	        tweens: tw,
	        onComplete: complete_callback
	    });
	}

	ebi_run_away() {
		this.player.setData("can_move", false);
		const ebi_coords = {x:Math.floor(this.ebi.x / TILE_SIZE), y: Math.floor(this.ebi.y / TILE_SIZE)}
		// DEFINE BAD END GAME 
		const end_callback = () => {
			this.ebi.visible = false; 
			this.player.anims.play("player_down", true);
			this.message_window.add_text("\n...");
			const bgm_game_over = this.play_game_over();
			const mess = !!this.player.getData("cut_ebi_tree") ? "\"I have cut the\n\ntree where she was\n\nhiding...\"" : "\"I have looked around\n\ntoo many times!\"";
			const ending_type = !!this.player.getData("cut_ebi_tree") ? "Bad End:\n\nWoodcutter." : "Bad End:\n\nYou can't find me.";
			this.message_window.add_text(mess);
			this.message_window.add_text(ending_type);
			this.message_window.set_callback(() => {
				this.process_game_over(bgm_game_over);
			})
		}
		this.pathfinder.set_through();
		this.ebi.visible = true;
		this.play_ebi_flee();
		if(ebi_coords.x < 3) {return this.move_to(0,ebi_coords.y, "ebi", end_callback);}
		else if(ebi_coords.x > 7) {return this.move_to(9,ebi_coords.y, "ebi", end_callback);}
		else if(ebi_coords.y < 3) {return this.move_to(ebi_coords.x, 0, "ebi", end_callback);}
		else if(ebi_coords.y > 7) {return this.move_to(ebi_coords.x, 9, "ebi", end_callback);}
		else {
			var flee_coords = {x:random_int(2), y:random_int(2)}
			if(flee_coords.x === 0)  {
				flee_coords.x = ebi_coords.x;
				flee_coords.y = random_int(2) === 0 ? 0 : 9;
				this.move_to(flee_coords.x,flee_coords.y, "ebi", end_callback);
				return;
			}
			else {
				flee_coords.y = ebi_coords.y;
				flee_coords.x = random_int(2) === 0 ? 0 : 9;
				this.move_to(flee_coords.x,flee_coords.y, "ebi", end_callback);
				return;				
			}
		}
	}

	get colliders() {
		return [8,9,10];
	}

	create_game_objects() {
		const map = this.make.tilemap({ data: MAP_GENERATOR.tilemap, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
		const tiles = map.addTilesetImage("sheet");
		this.layer = map.createStaticLayer(0, tiles, 0, 0);
		const colliders = this.colliders; 
		this.layer.setCollision(colliders);
		// CREATE PLAYER
		var start_coords = [0,0];
		for(var y = 0; y < MAP_GENERATOR.tilemap.length; y++) {
			for(var x = 0; x < MAP_GENERATOR.tilemap[y].length; x++) {
				const tile = MAP_GENERATOR.tilemap[y][x];
				if(colliders.indexOf(tile) > -1) {continue;}
				start_coords = [x,y];
				break; 
			}
			if(start_coords[0] !== 0 && start_coords[1] !== 0) {break;}
		}
		this.player = this.physics.add.sprite(start_coords[0] * TILE_SIZE,start_coords[1] * TILE_SIZE, "player_sprite", 0);
		this.player.setOrigin(0,0).setDepth(0);
		this.player.setData("can_move", true); // The player can move?
		this.player.setData("direction", 2); // Which direction the player is looking at?
		this.player.setData("cut_ebi_tree", false); // Has the player cut the tree where ebi is?
		this.player.setData("check_times", 0); // How many times the player has checked a tree?
		this.player.setData("sign_must_lie", random_int(2));
		//this.player.setData("wait_for_grid_movement", false);
		// EBI
		this.ebi = this.physics.add.sprite(0,0, "ebi_sprite", 0);
		this.ebi.setOrigin(0,0).setDepth(0);
		this.ebi.setData("check_tolerance", 7 + random_int(8));
		this.ebi.visible = false;
		// DEFINE PHYSICS
		this.physics.world.bounds.width = map.widthInPixels;
        this.physics.world.bounds.height = map.heightInPixels;
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.layer);
        // CAMERA SETTINGS
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player);
        this.cameras.main.roundPixels = true;
        // CREATE PATHFINDER
		this.pathfinder = new Pathfinder(map);
		this.map = map;
	}

	replace_tile(x,y, new_index) {
		const tile = this.layer.getTileAt(x,y)
		tile.index = new_index;
		tile.setCollision(false,false,false,false,true);
		this.pathfinder.create_grid(this.map);
		return this.layer.updateVBOData();
	}

	update_player_animations() {
		const mapper = this.key_mapper; 
		if(mapper["up"].isDown) {this.player.anims.play("player_up", true); this.player.setData("direction", 8);}
		else if(mapper["down"].isDown) {this.player.anims.play("player_down", true); this.player.setData("direction", 2);}
		else if(mapper["left"].isDown) {this.player.anims.play("player_left", true); this.player.setData("direction", 4);}
		else if(mapper["right"].isDown) {this.player.anims.play("player_right", true); this.player.setData("direction", 6);}
		else {this.player.anims.stop()}	
	}

	start_game_inputs() {
		this.key_mapper = {
			action: this.input.keyboard.addKey("Z"),
			check: this.input.keyboard.addKey("X"),
			down: this.input.keyboard.addKey("down"),
			up: this.input.keyboard.addKey("up"),
			left: this.input.keyboard.addKey("left"),
			right: this.input.keyboard.addKey("right")
		}

		this.key_mapper["action"].on("down", event => {
			if(!!this.message_window.visible) {
				this.play_confirm();
				return this.message_window.process_input();
			}
			else if(!!this.choice_window.is_busy()) {return this.choice_window.process_ok();}
			else {return this.action_event();}
		})
		this.key_mapper["check"].on("down", event => {
			if(!this.can_move()) {return;}
			return this.check_event();
		})
		this.key_mapper["down"].on("down", event => {
			if(!!this.choice_window.is_busy()) {return this.choice_window.process_cursor_move(0);}
		})
		this.key_mapper["up"].on("down", event => {
			if(!!this.choice_window.is_busy()) {return this.choice_window.process_cursor_move(1);}
		})
	}

	get sign_strings() {
		return ["I'm on the\n\nleft-top!", "I'm on the\n\nright-top!", "I'm on the\n\nleft-bottom!", "I'm on the\n\nright-bottom!"]
	}

	action_event() {
		this.player.setData("can_move", false);
		const dir = this.player.getData("direction"); 
		const ebi_coords = {x:Math.floor(this.ebi.x / TILE_SIZE), y: Math.floor(this.ebi.y / TILE_SIZE)};
		var x;
		var y; 
		if(dir === 2) {x = Math.floor(this.player.x / TILE_SIZE); y = Math.floor(this.player.y / TILE_SIZE) + 1;}
		else if(dir === 8) {x = Math.floor(this.player.x / TILE_SIZE); y = Math.floor(this.player.y / TILE_SIZE) - 1;}
		else if(dir === 4) {x = Math.floor(this.player.x / TILE_SIZE) - 1; y = Math.floor(this.player.y / TILE_SIZE);}
		else if(dir === 6) {x = Math.floor(this.player.x / TILE_SIZE) + 1; y = Math.floor(this.player.y / TILE_SIZE);}
		var tile = this.layer.getTileAt(x,y); 
		if(!tile) {return this.player.setData("can_move", true);}
		tile = tile.index;
		if(tile === 8) {
			const must_lie = this.player.getData("sign_must_lie");
			var half_pos;
			if(ebi_coords.x < 5 && ebi_coords.y < 5) {half_pos = 0;}
			else if(ebi_coords.x >= 5 && ebi_coords.y < 5) {half_pos = 1;} 
			else if(ebi_coords.x < 5 && ebi_coords.y >= 5) {half_pos = 2;}
			else if(ebi_coords.x >= 5 && ebi_coords.y >= 5) {half_pos = 3;}
			if(!!must_lie && !this.player.getData("sign_lie")) {
				const lie_pos = [0,1,2,3].map(el => el !== half_pos);
				this.player.setData("sign_lie", lie_pos[random_int(lie_pos.length)]);
			}
			half_pos = !!must_lie ? this.player.getData("sign_lie") : half_pos;
			this.play_confirm();
			this.message_window.add_text(this.sign_strings[half_pos]);
			this.message_window.set_callback(() => this.player.setData("can_move", true));
			return;
		}
		else if([9,10].indexOf(tile) < 0) {return this.player.setData("can_move", true);}
		this.play_cut_tree();
		this.replace_tile(x, y, 4);
		if(x === ebi_coords.x && y === ebi_coords.y) {
			this.player.setData("cut_ebi_tree", true); 
			return this.ebi_run_away();
		}
		return this.player.setData("can_move", true);
	}

	check_event() {
		this.player.setData("can_move", false);
		const dir = this.player.getData("direction"); 
		const ebi_coords = {x:Math.floor(this.ebi.x / TILE_SIZE), y: Math.floor(this.ebi.y / TILE_SIZE)};
		var x;
		var y; 
		if(dir === 2) {x = Math.floor(this.player.x / TILE_SIZE); y = Math.floor(this.player.y / TILE_SIZE) + 1;}
		else if(dir === 8) {x = Math.floor(this.player.x / TILE_SIZE); y = Math.floor(this.player.y / TILE_SIZE) - 1;}
		else if(dir === 4) {x = Math.floor(this.player.x / TILE_SIZE) - 1; y = Math.floor(this.player.y / TILE_SIZE);}
		else if(dir === 6) {x = Math.floor(this.player.x / TILE_SIZE) + 1; y = Math.floor(this.player.y / TILE_SIZE);}
		var tile = this.layer.getTileAt(x,y); 
		if(!tile) {return this.player.setData("can_move", true);}
		tile = tile.index;
		if([9,10].indexOf(tile) < 0) {return this.player.setData("can_move", true);}
		this.message_window.add_text("Mmm...");
		this.message_window.set_callback(() => {
			this.player.setData("can_move", false);
			if(x === ebi_coords.x && y === ebi_coords.y) {		
				setTimeout(() => {
					this.play_cut_tree();
					this.replace_tile(x, y, 4);
					this.ebi.visible = true;
					this.process_game_won()
				}, 200);
				return;
			}
			var count = this.player.getData("check_times");
			this.player.setData("check_times", count + 1);
			count = this.player.getData("check_times");
			const max_count = this.ebi.getData("check_tolerance");
			if(count >= max_count) {
				return this.ebi_run_away();
			}
			return this.player.setData("can_move", true);
		})
		return;
	}

	can_move() {
		return (!this.message_window.visible && !this.choice_window.visible && this.fade.alpha === 0 && !!this.player.getData("can_move"))
	}

	update_player_movement(time, dt) {
		this.player.body.setVelocity(0);
		if(!this.can_move()) {return;}
		const mapper = this.key_mapper; 
		if(mapper["up"].isDown) {
			this.player.body.setVelocityY(-60); 
			this.player.flipX = false; 
		}
		else if(mapper["down"].isDown) {
			this.player.body.setVelocityY(60); 
			this.player.flipX = false; 
		}
		if(mapper["left"].isDown) {
			this.player.body.setVelocityX(-60); 
			this.player.flipX = true; 
		}
		else if(mapper["right"].isDown) {
			this.player.body.setVelocityX(60); 
			this.player.flipX = false; 
		}
		this.update_player_animations();
	}

	update(time, dt) {
		if(typeof this.last_time === "undefined") {this.last_time = 0;}
		if(time - this.last_time > 20000 + random_int(10000)) {
			if(!!this.can_move()) {this.play_distance_sound();} 
			this.last_time = time;
		}
		this.message_window.update(time, dt);
		this.choice_window.update(time, dt);
		this.update_player_movement(time, dt);
	}

	play_distance_sound() {
		const pc = {x:Math.floor(this.player.x / TILE_SIZE), y:Math.floor(this.player.y/TILE_SIZE)};
		const ec = {x:Math.floor(this.ebi.x / TILE_SIZE), y:Math.floor(this.ebi.y/TILE_SIZE)};
		var dist = Math.floor(Phaser.Math.Distance.Between(pc.x, pc.y, ec.x, ec.y));
		dist = dist <= 0 ? 1 : dist; 
		const vol = 1 / dist < 0.1 ? 0.2 : 1 / dist; 
		this.play_ebi_signal(vol);
	}
}

//=================================================
// 
// MAP GENERATOR
//
//=================================================

class Map_Generator {
	constructor() {
		this.width = this.height = SCREEN_SIZE.width / TILE_SIZE;
		this._generator = new ConvChain(Uint8Array.from([[0]]));
		this._samplePattern = null;
		this.generated_pattern = null;
		this.is_generating = false;
		this._eventHandler = {};
	}

	generate_sample() {
		this._samplePattern = null;
		var sample = [];
		for(var y = 0; y < this.height; y++) {
			sample[y] = [];
			for(var x = 0; x < this.width; x++) {
				sample[y][x] = random_int(2);
			}			
		}
		return this._samplePattern = Uint8Array.from(sample);
	}

	process_map() {
		this.generate_sample();
		this._generator.setSample(this._samplePattern);
		const size = [this.width, this.height];
		const receptor = random_int(3) + 2;
		const temperature = Math.random() + 1;
		const iterations = random_int(3) + 1;
		this.generated_pattern = this._generator.generate(size,receptor, temperature, iterations);
		this.is_generating = true;
	}

	update_process(time) {
		if(!this.is_generating) {return;}
		if(!this.generated_pattern) {return;}
		this.generate_tilemap();
		this.is_generating = false;
	}

	on(event, callback) {
		if(!!this._eventHandler[event]) {return callback()}
		return this._eventHandler[event] = callback;
	}

	callEvent(event) {
		if(!this._eventHandler[event]) {
			return this._eventHandler[event] = true;
		}
		return this._eventHandler[event]();
	}

	generate_tilemap() {
		this.tilemap = [];
		for (var y = 0; y < this.height; y++) {
			this.tilemap[y] = this.tilemap[y] || [];
		    for (var x = 0; x < this.width; x++) {
		        if(typeof this.tilemap[y][x] !== "undefined") {continue;}
		        const patt = this.generated_pattern[x + y * this.width] || 0;
		        if(patt === 0) {
		        	var tile = random_int(8);
		        	const rand = random_int(100);
		        	if(rand > 99) {tile = 8}
		        	this.tilemap[y][x] = tile
		        }
		        else {
	        		const tiles = [9,10];
	        		const tile = tiles[random_int(tiles.length)];
	        		this.tilemap[y][x] = tile
		        }
		    }
		}
		this.generated_pattern = null;
		this.callEvent("process_end");
		return;
	}

	// DEBUG METHODS 

	force_void_tilemap() {
		this.tilemap = [];
		for(var y = 0; y < this.height; y++) {
			this.tilemap[y] = [];
			for(var x = 0; x < this.width; x++) {
				this.tilemap[y][x] = 0;
			}			
		}
	}

}

const MAP_GENERATOR = new Map_Generator();

//=================================================
// 
// GAME CLASS
//
//=================================================

class Game {
	constructor() {
		this.parse_config();
		this.game = new Phaser.Game(this.config); 
		console.log("Hide And Seek: Initialized! Yey!")
	}

	parse_config() {
		return this.config = {
			type: Phaser.AUTO,
			width: SCREEN_SIZE.width,
			height: SCREEN_SIZE.height,
			parent: "GameContainer",
			zoom:3,
			render: {
				pixelArt: true
			},
			physics: {
				default: "arcade",
				arcade: {
					gravity:{y:0}
				}
			},
			scene: [Load_Screen]
		}
	}
}


const GAME = new Game();