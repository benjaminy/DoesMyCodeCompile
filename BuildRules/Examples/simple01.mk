%.class: %.java
	$(JAVAC) $<

targets:
	echo "foo"

foo: foo.class bar.class
