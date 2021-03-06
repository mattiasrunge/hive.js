SRC = $(shell git ls-files \*.js)
DEFAULT_FLAGS := --reporter spec --ui tdd --recursive test --harmony
DEPS := deps

all: test lint style

deps:
	export XDG_CACHE_HOME=./node_modules
	npm --cache ./node_modules/.npm-cache install

test: $(DEPS)
	./node_modules/.bin/mocha $(DEFAULT_FLAGS)

lint: $(DEPS)
	./node_modules/.bin/jshint --verbose $(SRC)

style: $(DEPS)
	./node_modules/.bin/jscs -e --verbose $(SRC)

reg: test lint style

configure: $(DEPS)



.PHONY: all deps test lint style reg
