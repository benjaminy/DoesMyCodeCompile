tags:
	echo "20x6"
	echo "Super"
	echo "cls:AI"

targets:
	echo "compile"

compile: a.java b.java blah
	javac $<

blah: c.java
