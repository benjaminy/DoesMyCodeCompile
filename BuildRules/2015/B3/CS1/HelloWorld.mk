visible_compile: hello_world.java
	javac $<

visible_test: visible_compile
	java hello_world
