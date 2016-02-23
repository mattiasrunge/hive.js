SRC = $(shell git ls-files \*.js)
DEFAULT_FLAGS := --reporter spec --ui tdd --recursive test --harmony
DEPS := deps

all: test lint coverage

deps:
	for i in 1 2 3 4 5; do npm --cache ./node_modules/.npm-cache install && break; done

test: $(DEPS)
	./node_modules/.bin/mocha --max-old-space-size=8192 $(DEFAULT_FLAGS)

lint: $(DEPS)
	./node_modules/.bin/jshint --verbose $(SRC)

style: $(DEPS)
	./node_modules/.bin/jscs -e --verbose $(SRC)

reg: test lint style

configure: $(DEPS)



.PHONY: all deps test lint style reg
