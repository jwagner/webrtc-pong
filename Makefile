a:
	./node_modules/.bin/bfresh "sleep 1;make public/pong.js;echo"

public/pong.js: src/pong.coffee
	browserify -d -t coffeeify $< > $@
