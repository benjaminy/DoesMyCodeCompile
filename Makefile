FILES_TO_SERVE=index.html dmcc.js dmcc.css

all: $(addprefix Deploy/, $(FILES_TO_SERVE)) Deploy/build_rules.json

Deploy/build_rules.json: Source/process_build_rules.py
	cd Source && ./process_build_rules.py > ../$@.tmp && mv ../$@.tmp ../$@

Deploy/%: Source/%
	cp $< $@

run_server_old: all
	cd Deploy && php -S localhost:8081

run_server: all
	cd Deploy && node ../Source/dmcc_server.js

clean:
	rm -f $(addprefix Deploy/, $(FILES_TO_SERVE))
	rm -f Deploy/build_rules.json
