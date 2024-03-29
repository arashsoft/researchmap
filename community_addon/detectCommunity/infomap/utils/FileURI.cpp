/* ------------------------------------------------------------------------

 Infomap software package for multi-level network clustering

 * Copyright (c) 2013
 * For license and authors, see README.txt or http://www.mapequation.org

------------------------------------------------------------------------ */

#include "FileURI.h"
#include <stdexcept>
#include "../io/convert.h"

FileURI::FileURI()
:	m_filename(""),
 	m_requireExtension(false),
	m_directory(""),
	m_name(""),
	m_extension("")
{
}

FileURI::FileURI(const char* filename, bool requireExtension)
:	m_filename(filename),
 	m_requireExtension(requireExtension)
{
	analyzeFilename();
}

FileURI::FileURI(const string& filename, bool requireExtension)
:	m_filename(filename),
 	m_requireExtension(requireExtension)
{
	analyzeFilename();
}

FileURI::FileURI(const FileURI& other)
:	m_filename(other.m_filename),
 	m_requireExtension(other.m_requireExtension),
	m_directory(other.m_directory),
	m_name(other.m_name),
	m_extension(other.m_extension)
{
}



FileURI& FileURI::operator =(const FileURI& other)
{
	m_filename = other.m_filename;
	m_requireExtension = other.m_requireExtension;
	m_directory = other.m_directory;
	m_name = other.m_name;
	m_extension = other.m_extension;
	return *this;
}


void FileURI::analyzeFilename()
{
	string name = m_filename;
	size_t pos = m_filename.find_last_of("/");
	if (pos != string::npos)
	{
		if (pos == m_filename.length()) // File could not end with slash
			throw std::invalid_argument(getErrorMessage());
		m_directory = m_filename.substr(0, pos + 1); // Include the last slash in the directory
		name = m_filename.substr(pos + 1); // No slash in the name
	}
	else
	{
		m_directory = "";
	}

	pos = name.find_last_of(".");
	if (pos == string::npos || pos == 0 || pos == name.length() - 1)
	{
		if (pos != string::npos || m_requireExtension)
			throw std::invalid_argument(getErrorMessage());
		m_name = name;
		m_extension = "";
	}
	else
	{
		m_name = name.substr(0, pos);
		m_extension = name.substr(pos + 1);
	}
}

string FileURI::getErrorMessage()
{
	return io::Str() << "Filename '" << m_filename << "' must match the pattern \"[dir/]name" <<
			(m_requireExtension ? ".extension\"" : "[.extension]\"");
}
