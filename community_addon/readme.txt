The Community Detection Algorithm is compiled to an addon of node.js server. Addon is a file ending with .addon, which can be used in the same way as .js module on server.

This community detection addon should be compiled first, and the file structure should be like this:
---.
  |
   ---detectCommunity.cc
  |
   ---detectCommunity.h
  |
   ---binding.gyp
  |
   ---test.js
  |
   ---infomap
     |
      ---Infomap.cpp
     |
      ---infomap
     |
      ---io
     |
      ---utils
When compiling it, you should go into the directory, then type command:
  node-gyp configure
Now you should have got a folder named "build". Type command:
  node-gye build
Then you can find the compiled addon file in ./build/Release/
Note: The "build" folder contains the makefile needed to build the addon. If an error occurs when building the source code, you may probably need to check the makefile and change the parameters of g++ according to the error log. (Usually the parameter "-fno-exceptions" should be replaced by "-fexception".)

When you get the compiled addon file, load it in this way:
--------------------------
var addon = require('./build/Release/detectCommunity'); // The string should be replaced by the path of the detectCommunity.addon file

var result = addon.run('linklist.txt'); // linklist.txt is the input file name of the algorithm. It is composed by multiple lines, each of which has two numbers seperated by a space/tab, denoting a link between two nodes. The lines should be sorted by the first number of each line and the node number should start from 1. Only file name with the suffix ".txt" is accepted and other formats of data is not supported for now.
--------------------------
The result variable is json data, the format of which is:
[
	{
		nodes: [1,2,3,...],
	},
	{
		nodes: [11,12,13,...],
	},
]
Every array is a community.

You may want to use the addon in this way:
1. Process the data and get the linklist data.
2. Load addon to calculate the result.
3. save the result into the database.

You can run test.js to test if the addon module works well.
If you get error like "cannot get access to the output/", just create a directory named "output".