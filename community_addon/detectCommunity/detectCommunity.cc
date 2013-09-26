#include <node.h>
#include <v8.h>

#include <string>
#include <fstream>
#include <map>
#include <vector>
#include <stdlib.h>

#include "detectCommunity.h"

#define BUFF_LEN 100

using namespace v8;

Local<Array> processResult(std::string filename) {
	//get output file name
	size_t pos;
	if((pos = filename.rfind(".txt")) != -1)
		filename.replace(pos, 4, ".tree");
	filename = "output/" + filename;

	//read result from file & process data
	std::map<std::string, std::vector<int> > data;
	std::ifstream fin(filename.c_str());
	char buff[BUFF_LEN], line[BUFF_LEN];
	while(fin.getline(line, BUFF_LEN-1)) {
		if(line[0] == '#')
			continue;

		int i, j;
		for(i = 0; line[i] != ':'; i++)
			buff[i] = line[i];
		buff[i] = '\0';
		std::string key(buff);
		do {
			i++;
		} while(line[i] && line[i] != '\"');
		for(i++, j = 0; line[i] != '\"'; i++)
			buff[j++] = line[i];
		buff[j] = '\0';
		int value = atoi(buff);

		//add item to data
		std::map<std::string, std::vector<int> >::iterator it = data.find(key);
		if(it == data.end()) {
			std::pair<std::map<std::string, std::vector<int> >::iterator, bool> insertPair = data.insert(std::map<std::string, std::vector<int> >::value_type(key, std::vector<int>()));
			it = insertPair.first;
			it->second.push_back(value);
		} else {
			it->second.push_back(value);
		}
	}

	//further processing (delete those single-node community)
	for(std::map<std::string, std::vector<int> >::iterator it = data.begin(); it != data.end(); ) {
		if(it->second.size() < 2)
			data.erase(it++);
		else
			it++;
	}

	//convert data to V8 format
	Local<Array> result = Array::New();
	int count = 0;
	for(std::map<std::string, std::vector<int> >::iterator it = data.begin(); it != data.end(); it++, count++) {
		std::vector<int> community = it->second;
		Local<Array> comm = Array::New();
		int i = 0;
		for(std::vector<int>::iterator it = community.begin(); it != community.end(); it++, i++) {
			comm->Set(Number::New(i), Number::New(*it));
		}
		Local<Object> commItem = Object::New();
		commItem->Set(String::NewSymbol("nodes"), comm);
		result->Set(Number::New(count), commItem);
	}

	return result;
}

Handle<Value> Method(const Arguments& args) {
	HandleScope scope;

	//read file name if it is given in args
	std::string* filename = new std::string("linklist.txt");
	if(args.Length() > 0)
		filename = new std::string(*String::Utf8Value(args[0]));

	//run detection algorithm
	char * name = new char[filename->size()];
	filename->copy(name, filename->size());
	name[filename->size()] = '\0';
	char * treemapArgs[5] = {"./Infomap", name, "output/", "-N", "10"};
	InfomapMain(5, treemapArgs);
	//process result
	Local<Array> result = processResult(*filename);

	return scope.Close(result);
}

void Init(Handle<Object> exports) {
	exports->Set(String::NewSymbol("run"),
		FunctionTemplate::New(Method)->GetFunction());
}

NODE_MODULE(detectCommunity, Init)
