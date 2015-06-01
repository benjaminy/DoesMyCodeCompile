# DoesMyCodeCompile
A Web App for Students to Check/Test their Code

To make a project, add a Makefile with a .mk filename extension
somewhere in the BuildRules directory.  The directory and file names on
the path to the Makefile (including the Makefile itself) will be
translated into searchable tags for the project.  If there is at least
one _ (underscore) in a name, the string before the underscore will be
treated as the tag type/kind/class.  The string after the first
underscore will be the tag value; subsequent underscores will be
replaced by spaces.  If there is no underscore, the entire string is the
tag value and it will have no type/kind/class.

